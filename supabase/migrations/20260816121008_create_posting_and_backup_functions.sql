/*
# ERP Posting Function & Backup View

## Overview
Creates a SECURITY DEFINER function to post vouchers (double-entry accounting) and a view for database backup/export.

## New Functions
1. post_voucher(voucher_uuid) - Posts a draft voucher:
   - Validates the voucher is in 'draft' status
   - Validates the fiscal year is open for the posting date
   - Validates debits = credits (balanced)
   - Creates GL entries for each voucher line
   - Updates account balances
   - For sales invoices: deducts inventory, creates stock_ledger entries, computes COGS
   - Updates customer balance
   - Sets voucher status to 'posted'

2. get_company_backup(company_uuid) - Returns all data for a company as JSON for backup/export

## Security
- post_voucher is SECURITY DEFINER so it can update multiple tables atomically
- Access is verified inside the function body via user_has_company_access
- get_company_backup is SECURITY DEFINER for data export

## Important Notes
1. The posting function is atomic - all or nothing
2. COGS is automatically calculated for sales invoice items
3. Customer balance is updated for sales invoices
4. Account balances are updated for all posted vouchers
*/

CREATE OR REPLACE FUNCTION post_voucher(v_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record vouchers%ROWTYPE;
  v_company_id uuid;
  v_fiscal_status text;
  v_total_debit numeric(15,2);
  v_total_credit numeric(15,2);
  v_line voucher_lines%ROWTYPE;
  v_item items%ROWTYPE;
  v_cogs numeric(15,2);
  v_cogs_account_id uuid;
  v_inventory_account_id uuid;
BEGIN
  -- Get the voucher
  SELECT * INTO v_record FROM vouchers WHERE id = v_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher not found';
  END IF;

  v_company_id := v_record.company_id;

  -- Verify user has access to this company
  IF NOT user_has_company_access(v_company_id) THEN
    RAISE EXCEPTION 'Access denied: you do not have access to this company';
  END IF;

  -- Check voucher is draft
  IF v_record.status != 'draft' THEN
    RAISE EXCEPTION 'Voucher is already posted';
  END IF;

  -- Check fiscal year is open
  SELECT status INTO v_fiscal_status FROM fiscal_years
  WHERE company_id = v_company_id
  AND v_record.posting_date BETWEEN start_date AND end_date
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No fiscal year found for posting date %', v_record.posting_date;
  END IF;

  IF v_fiscal_status = 'closed' THEN
    RAISE EXCEPTION 'Fiscal year is closed. Cannot post to a closed fiscal period.';
  END IF;

  -- Validate balanced entries
  SELECT
    COALESCE(SUM(debit), 0),
    COALESCE(SUM(credit), 0)
  INTO v_total_debit, v_total_credit
  FROM voucher_lines
  WHERE voucher_id = v_uuid;

  IF v_total_debit != v_total_credit THEN
    RAISE EXCEPTION 'Voucher is not balanced. Debits: %, Credits: %', v_total_debit, v_total_credit;
  END IF;

  IF v_total_debit = 0 THEN
    RAISE EXCEPTION 'Voucher has no entries';
  END IF;

  -- Create GL entries and update account balances
  FOR v_line IN SELECT * FROM voucher_lines WHERE voucher_id = v_uuid ORDER BY line_no LOOP
    -- Insert GL entry
    INSERT INTO gl_entries (company_id, voucher_id, account_id, posting_date, debit, credit, description, source)
    VALUES (v_company_id, v_uuid, v_line.account_id, v_record.posting_date, v_line.debit, v_line.credit, v_line.description, v_record.voucher_type);

    -- Update account balance
    UPDATE chart_of_accounts
    SET balance = balance + v_line.debit - v_line.credit
    WHERE id = v_line.account_id;

    -- Handle inventory for sales invoices
    IF v_record.voucher_type = 'sales_invoice' AND v_line.item_id IS NOT NULL AND v_line.quantity > 0 THEN
      SELECT * INTO v_item FROM items WHERE id = v_line.item_id;

      -- Deduct inventory
      UPDATE items SET quantity_on_hand = quantity_on_hand - v_line.quantity WHERE id = v_line.item_id;

      -- Create stock ledger entry
      INSERT INTO stock_ledger (company_id, item_id, movement_type, quantity, reference, posting_date, balance_after)
      VALUES (
        v_company_id,
        v_line.item_id,
        'outward',
        -v_line.quantity,
        v_record.voucher_no,
        v_record.posting_date,
        v_item.quantity_on_hand - v_line.quantity
      );

      -- Compute COGS
      v_cogs := v_item.unit_cost * v_line.quantity;

      -- Find COGS account (expense type)
      SELECT id INTO v_cogs_account_id FROM chart_of_accounts
      WHERE company_id = v_company_id AND type = 'expense'
      ORDER BY account_no LIMIT 1;

      -- Find inventory asset account
      SELECT id INTO v_inventory_account_id FROM chart_of_accounts
      WHERE company_id = v_company_id AND type = 'asset' AND account_no LIKE '15%'
      ORDER BY account_no LIMIT 1;

      IF v_cogs_account_id IS NOT NULL AND v_inventory_account_id IS NOT NULL THEN
        -- Debit COGS
        INSERT INTO gl_entries (company_id, voucher_id, account_id, posting_date, debit, credit, description, source)
        VALUES (v_company_id, v_uuid, v_cogs_account_id, v_record.posting_date, v_cogs, 0, 'COGS for ' || v_record.voucher_no, 'cogs');

        UPDATE chart_of_accounts SET balance = balance + v_cogs WHERE id = v_cogs_account_id;

        -- Credit Inventory
        INSERT INTO gl_entries (company_id, voucher_id, account_id, posting_date, debit, credit, description, source)
        VALUES (v_company_id, v_uuid, v_inventory_account_id, v_record.posting_date, 0, v_cogs, 'Inventory release for ' || v_record.voucher_no, 'cogs');

        UPDATE chart_of_accounts SET balance = balance - v_cogs WHERE id = v_inventory_account_id;
      END IF;
    END IF;

    -- Handle inventory for purchase invoices
    IF v_record.voucher_type = 'purchase_invoice' AND v_line.item_id IS NOT NULL AND v_line.quantity > 0 THEN
      SELECT * INTO v_item FROM items WHERE id = v_line.item_id;

      -- Add inventory
      UPDATE items SET quantity_on_hand = quantity_on_hand + v_line.quantity WHERE id = v_line.item_id;

      -- Create stock ledger entry
      INSERT INTO stock_ledger (company_id, item_id, movement_type, quantity, reference, posting_date, balance_after)
      VALUES (
        v_company_id,
        v_line.item_id,
        'inward',
        v_line.quantity,
        v_record.voucher_no,
        v_record.posting_date,
        v_item.quantity_on_hand + v_line.quantity
      );
    END IF;
  END LOOP;

  -- Update customer balance for sales invoices
  IF v_record.voucher_type = 'sales_invoice' AND v_record.customer_id IS NOT NULL THEN
    UPDATE customers SET balance = balance + v_record.total_amount WHERE id = v_record.customer_id;
  END IF;

  -- Update vendor balance for purchase invoices
  IF v_record.voucher_type = 'purchase_invoice' AND v_record.vendor_id IS NOT NULL THEN
    UPDATE vendors SET balance = balance + v_record.total_amount WHERE id = v_record.vendor_id;
  END IF;

  -- Mark voucher as posted
  UPDATE vouchers SET status = 'posted' WHERE id = v_uuid;

  RETURN json_build_object('success', true, 'voucher_no', v_record.voucher_no, 'message', 'Voucher posted successfully');
END;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION post_voucher(uuid) TO authenticated;

-- Backup function: returns all company data as JSON
CREATE OR REPLACE FUNCTION get_company_backup(c_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company companies%ROWTYPE;
  v_coa json;
  v_customers json;
  v_vendors json;
  v_items json;
  v_warehouses json;
  v_stock_ledger json;
  v_vouchers json;
  v_voucher_lines json;
  v_gl_entries json;
  v_fiscal_years json;
BEGIN
  -- Verify access
  IF NOT user_has_company_access(c_uuid) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO v_company FROM companies WHERE id = c_uuid;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]') INTO v_coa
  FROM (SELECT * FROM chart_of_accounts WHERE company_id = c_uuid ORDER BY account_no) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]') INTO v_customers
  FROM (SELECT * FROM customers WHERE company_id = c_uuid ORDER BY code) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]') INTO v_vendors
  FROM (SELECT * FROM vendors WHERE company_id = c_uuid ORDER BY code) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]') INTO v_items
  FROM (SELECT * FROM items WHERE company_id = c_uuid ORDER BY code) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]') INTO v_warehouses
  FROM (SELECT * FROM warehouses WHERE company_id = c_uuid ORDER BY code) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]') INTO v_stock_ledger
  FROM (SELECT * FROM stock_ledger WHERE company_id = c_uuid ORDER BY posting_date DESC) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]') INTO v_vouchers
  FROM (SELECT * FROM vouchers WHERE company_id = c_uuid ORDER BY posting_date DESC) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]') INTO v_voucher_lines
  FROM (SELECT vl.* FROM voucher_lines vl JOIN vouchers v ON vl.voucher_id = v.id WHERE v.company_id = c_uuid) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]') INTO v_gl_entries
  FROM (SELECT * FROM gl_entries WHERE company_id = c_uuid ORDER BY posting_date DESC) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]') INTO v_fiscal_years
  FROM (SELECT * FROM fiscal_years WHERE company_id = c_uuid ORDER BY start_date) t;

  RETURN json_build_object(
    'company', row_to_json(v_company),
    'chart_of_accounts', v_coa,
    'customers', v_customers,
    'vendors', v_vendors,
    'items', v_items,
    'warehouses', v_warehouses,
    'stock_ledger', v_stock_ledger,
    'vouchers', v_vouchers,
    'voucher_lines', v_voucher_lines,
    'gl_entries', v_gl_entries,
    'fiscal_years', v_fiscal_years,
    'exported_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_company_backup(uuid) TO authenticated;
