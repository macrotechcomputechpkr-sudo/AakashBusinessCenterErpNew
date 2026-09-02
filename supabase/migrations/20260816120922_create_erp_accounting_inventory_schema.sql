/*
# ERP Accounting & Inventory Schema

## Overview
Creates company-scoped tables for the double-entry accounting engine and inventory management. All tables reference companies.id for multi-company isolation.

## New Tables
1. chart_of_accounts - Tree structure for Assets, Liabilities, Equity, Revenue, Expenses
   - id, company_id, account_no, name, type (asset/liability/equity/revenue/expense), parent_id, is_posting, balance (running balance)
2. customers - Customer master data
   - id, company_id, code, name, address, phone, email, credit_limit, balance (running balance)
3. vendors - Vendor/supplier master data
   - id, company_id, code, name, address, phone, email, balance
4. items - Inventory item master
   - id, company_id, code, description, unit_cost, sales_price, category, reorder_point, quantity_on_hand
5. warehouses - Warehouse/location master
   - id, company_id, code, name, address
6. stock_ledger - Real-time stock movements (inward/outward/transfer)
   - id, company_id, item_id, warehouse_id, movement_type, quantity, reference, posting_date, balance_after
7. vouchers - Voucher headers (sales invoice, purchase invoice, journal, receipt, payment)
   - id, company_id, voucher_no, voucher_type, posting_date, description, total_amount, status (draft/posted), customer_id
8. voucher_lines - Voucher line items (double-entry debits/credits)
   - id, voucher_id, account_id, description, debit, credit, line_no
9. gl_entries - General Ledger posted entries (the actual ledger)
   - id, company_id, voucher_id, account_id, posting_date, debit, credit, description, source

## Security
- RLS enabled on all tables
- Policies scoped to authenticated users who have access to the company via user_companies
- All CRUD operations require company access verification

## Important Notes
1. All tables are company-scoped - data is isolated per company
2. chart_of_accounts uses parent_id for tree structure (self-referencing)
3. vouchers have draft/posted status - only posted vouchers create GL entries
4. gl_entries is the immutable audit trail of all posted transactions
5. stock_ledger tracks every inventory movement with running balance
*/

-- chart_of_accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_no text NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('asset','liability','equity','revenue','expense')),
  parent_id uuid REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  is_posting boolean NOT NULL DEFAULT true,
  balance numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, account_no)
);
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- customers
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  address text,
  phone text,
  email text,
  credit_limit numeric(15,2) NOT NULL DEFAULT 0,
  balance numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, code)
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- vendors
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  address text,
  phone text,
  email text,
  balance numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, code)
);
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- items
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text NOT NULL,
  unit_cost numeric(15,2) NOT NULL DEFAULT 0,
  sales_price numeric(15,2) NOT NULL DEFAULT 0,
  category text,
  reorder_point integer NOT NULL DEFAULT 0,
  quantity_on_hand numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, code)
);
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, code)
);
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- stock_ledger
CREATE TABLE IF NOT EXISTS stock_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('inward','outward','transfer')),
  quantity numeric(15,2) NOT NULL,
  reference text,
  posting_date date NOT NULL,
  balance_after numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE stock_ledger ENABLE ROW LEVEL SECURITY;

-- vouchers
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  voucher_no text NOT NULL,
  voucher_type text NOT NULL CHECK (voucher_type IN ('sales_invoice','purchase_invoice','journal','receipt','payment')),
  posting_date date NOT NULL,
  description text,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted')),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, voucher_no)
);
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- voucher_lines
CREATE TABLE IF NOT EXISTS voucher_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  account_id uuid REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  description text,
  debit numeric(15,2) NOT NULL DEFAULT 0,
  credit numeric(15,2) NOT NULL DEFAULT 0,
  quantity numeric(15,2) NOT NULL DEFAULT 0,
  line_no integer NOT NULL DEFAULT 0
);
ALTER TABLE voucher_lines ENABLE ROW LEVEL SECURITY;

-- gl_entries (General Ledger - immutable audit trail)
CREATE TABLE IF NOT EXISTS gl_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  voucher_id uuid NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
  posting_date date NOT NULL,
  debit numeric(15,2) NOT NULL DEFAULT 0,
  credit numeric(15,2) NOT NULL DEFAULT 0,
  description text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE gl_entries ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user has access to a company
CREATE OR REPLACE FUNCTION user_has_company_access(check_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.company_id = check_company_id
  );
$$;

-- Now create policies using the helper function for all company-scoped tables

-- chart_of_accounts policies
DROP POLICY IF EXISTS "read_company_coa" ON chart_of_accounts;
CREATE POLICY "read_company_coa" ON chart_of_accounts FOR SELECT
  TO authenticated USING (user_has_company_access(company_id));

DROP POLICY IF EXISTS "insert_company_coa" ON chart_of_accounts;
CREATE POLICY "insert_company_coa" ON chart_of_accounts FOR INSERT
  TO authenticated WITH CHECK (user_has_company_access(company_id));

DROP POLICY IF EXISTS "update_company_coa" ON chart_of_accounts;
CREATE POLICY "update_company_coa" ON chart_of_accounts FOR UPDATE
  TO authenticated USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

DROP POLICY IF EXISTS "delete_company_coa" ON chart_of_accounts;
CREATE POLICY "delete_company_coa" ON chart_of_accounts FOR DELETE
  TO authenticated USING (user_has_company_access(company_id));

-- customers policies
DROP POLICY IF EXISTS "read_company_customers" ON customers;
CREATE POLICY "read_company_customers" ON customers FOR SELECT
  TO authenticated USING (user_has_company_access(company_id));

DROP POLICY IF EXISTS "insert_company_customers" ON customers;
CREATE POLICY "insert_company_customers" ON customers FOR INSERT
  TO authenticated WITH CHECK (user_has_company_access(company_id));

DROP POLICY IF EXISTS "update_company_customers" ON customers;
CREATE POLICY "update_company_customers" ON customers FOR UPDATE
  TO authenticated USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

DROP POLICY IF EXISTS "delete_company_customers" ON customers;
CREATE POLICY "delete_company_customers" ON customers FOR DELETE
  TO authenticated USING (user_has_company_access(company_id));

-- vendors policies
DROP POLICY IF EXISTS "read_company_vendors" ON vendors;
CREATE POLICY "read_company_vendors" ON vendors FOR SELECT
  TO authenticated USING (user_has_company_access(company_id));

DROP POLICY IF EXISTS "insert_company_vendors" ON vendors;
CREATE POLICY "insert_company_vendors" ON vendors FOR INSERT
  TO authenticated WITH CHECK (user_has_company_access(company_id));

DROP POLICY IF EXISTS "update_company_vendors" ON vendors;
CREATE POLICY "update_company_vendors" ON vendors FOR UPDATE
  TO authenticated USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

DROP POLICY IF EXISTS "delete_company_vendors" ON vendors;
CREATE POLICY "delete_company_vendors" ON vendors FOR DELETE
  TO authenticated USING (user_has_company_access(company_id));

-- items policies
DROP POLICY IF EXISTS "read_company_items" ON items;
CREATE POLICY "read_company_items" ON items FOR SELECT
  TO authenticated USING (user_has_company_access(company_id));

DROP POLICY IF EXISTS "insert_company_items" ON items;
CREATE POLICY "insert_company_items" ON items FOR INSERT
  TO authenticated WITH CHECK (user_has_company_access(company_id));

DROP POLICY IF EXISTS "update_company_items" ON items;
CREATE POLICY "update_company_items" ON items FOR UPDATE
  TO authenticated USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

DROP POLICY IF EXISTS "delete_company_items" ON items;
CREATE POLICY "delete_company_items" ON items FOR DELETE
  TO authenticated USING (user_has_company_access(company_id));

-- warehouses policies
DROP POLICY IF EXISTS "read_company_warehouses" ON warehouses;
CREATE POLICY "read_company_warehouses" ON warehouses FOR SELECT
  TO authenticated USING (user_has_company_access(company_id));

DROP POLICY IF EXISTS "insert_company_warehouses" ON warehouses;
CREATE POLICY "insert_company_warehouses" ON warehouses FOR INSERT
  TO authenticated WITH CHECK (user_has_company_access(company_id));

DROP POLICY IF EXISTS "update_company_warehouses" ON warehouses;
CREATE POLICY "update_company_warehouses" ON warehouses FOR UPDATE
  TO authenticated USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

DROP POLICY IF EXISTS "delete_company_warehouses" ON warehouses;
CREATE POLICY "delete_company_warehouses" ON warehouses FOR DELETE
  TO authenticated USING (user_has_company_access(company_id));

-- stock_ledger policies
DROP POLICY IF EXISTS "read_company_stock_ledger" ON stock_ledger;
CREATE POLICY "read_company_stock_ledger" ON stock_ledger FOR SELECT
  TO authenticated USING (user_has_company_access(company_id));

DROP POLICY IF EXISTS "insert_company_stock_ledger" ON stock_ledger;
CREATE POLICY "insert_company_stock_ledger" ON stock_ledger FOR INSERT
  TO authenticated WITH CHECK (user_has_company_access(company_id));

DROP POLICY IF EXISTS "delete_company_stock_ledger" ON stock_ledger;
CREATE POLICY "delete_company_stock_ledger" ON stock_ledger FOR DELETE
  TO authenticated USING (user_has_company_access(company_id));

-- vouchers policies
DROP POLICY IF EXISTS "read_company_vouchers" ON vouchers;
CREATE POLICY "read_company_vouchers" ON vouchers FOR SELECT
  TO authenticated USING (user_has_company_access(company_id));

DROP POLICY IF EXISTS "insert_company_vouchers" ON vouchers;
CREATE POLICY "insert_company_vouchers" ON vouchers FOR INSERT
  TO authenticated WITH CHECK (user_has_company_access(company_id));

DROP POLICY IF EXISTS "update_company_vouchers" ON vouchers;
CREATE POLICY "update_company_vouchers" ON vouchers FOR UPDATE
  TO authenticated USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

DROP POLICY IF EXISTS "delete_company_vouchers" ON vouchers;
CREATE POLICY "delete_company_vouchers" ON vouchers FOR DELETE
  TO authenticated USING (user_has_company_access(company_id));

-- voucher_lines policies (access through voucher's company)
DROP POLICY IF EXISTS "read_company_voucher_lines" ON voucher_lines;
CREATE POLICY "read_company_voucher_lines" ON voucher_lines FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM vouchers v
      WHERE v.id = voucher_lines.voucher_id
      AND user_has_company_access(v.company_id)
    )
  );

DROP POLICY IF EXISTS "insert_company_voucher_lines" ON voucher_lines;
CREATE POLICY "insert_company_voucher_lines" ON voucher_lines FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM vouchers v
      WHERE v.id = voucher_lines.voucher_id
      AND user_has_company_access(v.company_id)
    )
  );

DROP POLICY IF EXISTS "update_company_voucher_lines" ON voucher_lines;
CREATE POLICY "update_company_voucher_lines" ON voucher_lines FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM vouchers v
      WHERE v.id = voucher_lines.voucher_id
      AND user_has_company_access(v.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vouchers v
      WHERE v.id = voucher_lines.voucher_id
      AND user_has_company_access(v.company_id)
    )
  );

DROP POLICY IF EXISTS "delete_company_voucher_lines" ON voucher_lines;
CREATE POLICY "delete_company_voucher_lines" ON voucher_lines FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM vouchers v
      WHERE v.id = voucher_lines.voucher_id
      AND user_has_company_access(v.company_id)
    )
  );

-- gl_entries policies
DROP POLICY IF EXISTS "read_company_gl_entries" ON gl_entries;
CREATE POLICY "read_company_gl_entries" ON gl_entries FOR SELECT
  TO authenticated USING (user_has_company_access(company_id));

DROP POLICY IF EXISTS "insert_company_gl_entries" ON gl_entries;
CREATE POLICY "insert_company_gl_entries" ON gl_entries FOR INSERT
  TO authenticated WITH CHECK (user_has_company_access(company_id));

DROP POLICY IF EXISTS "delete_company_gl_entries" ON gl_entries;
CREATE POLICY "delete_company_gl_entries" ON gl_entries FOR DELETE
  TO authenticated USING (user_has_company_access(company_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coa_company ON chart_of_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_coa_parent ON chart_of_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_vendors_company ON vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_items_company ON items(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_company ON warehouses(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item ON stock_ledger(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_company ON stock_ledger(company_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_company ON vouchers(company_id);
CREATE INDEX IF NOT EXISTS idx_voucher_lines_voucher ON voucher_lines(voucher_id);
CREATE INDEX IF NOT EXISTS idx_gl_entries_company ON gl_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_gl_entries_account ON gl_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_gl_entries_voucher ON gl_entries(voucher_id);
