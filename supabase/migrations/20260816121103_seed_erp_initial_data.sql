/*
# ERP Seed Data - AAKASH-DIGITAL Tenant

## Overview
Seeds initial mock data for the ERP system:
- Tenant: AAKASH-DIGITAL
- 2 Demo Companies: Pokhara Main (PAN: 601234567) and Kathmandu Branch (PAN: 609876543)
- Fiscal Years: 2081/82 for both companies
- 5 Chart of Accounts entries per company
- 3 Customers per company
- 5 Inventory Items per company
- 1 Warehouse per company

## Important Notes
1. The demo user (admin@aakashdigital.com / password: Aakash@123) must be created via Supabase Auth first
2. This migration uses a DO block to conditionally insert data only if it doesn't already exist
3. The user_companies mapping links the demo user to both companies
4. Chart of Accounts follows standard accounting structure:
   - 1000 Assets (Cash, Accounts Receivable, Inventory)
   - 2000 Liabilities (Accounts Payable, VAT Payable)
   - 3000 Equity (Owner Capital, Retained Earnings)
   - 4000 Revenue (Sales Revenue)
   - 5000 Expenses (COGS, Rent Expense, Salary Expense)
*/

DO $$
DECLARE
  v_tenant_id uuid;
  v_company_pkr_id uuid;
  v_company_ktm_id uuid;
BEGIN
  -- Create or get tenant
  INSERT INTO master_tenants (tenant_code, name, status)
  VALUES ('AAKASH-DIGITAL', 'Aakash Digital Enterprise', 'active')
  ON CONFLICT (tenant_code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_tenant_id;

  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM master_tenants WHERE tenant_code = 'AAKASH-DIGITAL';
  END IF;

  -- Create Company 1: Pokhara Main
  INSERT INTO companies (tenant_id, name, pan_number, fiscal_year_label, address, phone, email, currency, status)
  VALUES (v_tenant_id, 'Aakash Digital - Pokhara Main', '601234567', '2081/82', 'Lakeside Road, Pokhara', '9801234567', 'pokhara@aakashdigital.com', 'NPR', 'active')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_company_pkr_id;

  IF v_company_pkr_id IS NULL THEN
    SELECT id INTO v_company_pkr_id FROM companies WHERE tenant_id = v_tenant_id AND pan_number = '601234567';
  END IF;

  -- Create Company 2: Kathmandu Branch
  INSERT INTO companies (tenant_id, name, pan_number, fiscal_year_label, address, phone, email, currency, status)
  VALUES (v_tenant_id, 'Aakash Trading - Kathmandu Branch', '609876543', '2081/82', 'New Road, Kathmandu', '9809876543', 'ktm@aakashdigital.com', 'NPR', 'active')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_company_ktm_id;

  IF v_company_ktm_id IS NULL THEN
    SELECT id INTO v_company_ktm_id FROM companies WHERE tenant_id = v_tenant_id AND pan_number = '609876543';
  END IF;

  -- Fiscal Years
  INSERT INTO fiscal_years (company_id, fiscal_year_label, start_date, end_date, status)
  VALUES (v_company_pkr_id, '2081/82', '2024-04-14', '2025-04-13', 'open')
  ON CONFLICT DO NOTHING;

  INSERT INTO fiscal_years (company_id, fiscal_year_label, start_date, end_date, status)
  VALUES (v_company_ktm_id, '2081/82', '2024-04-14', '2025-04-13', 'open')
  ON CONFLICT DO NOTHING;

  -- ===== Chart of Accounts for Pokhara Main =====
  INSERT INTO chart_of_accounts (company_id, account_no, name, type, is_posting, balance)
  VALUES
    (v_company_pkr_id, '1000', 'Current Assets', 'asset', false, 0),
    (v_company_pkr_id, '1010', 'Cash in Hand', 'asset', true, 500000),
    (v_company_pkr_id, '1020', 'Bank Account - NIC Asia', 'asset', true, 1200000),
    (v_company_pkr_id, '1100', 'Accounts Receivable', 'asset', true, 350000),
    (v_company_pkr_id, '1500', 'Inventory', 'asset', true, 450000)
  ON CONFLICT (company_id, account_no) DO NOTHING;

  INSERT INTO chart_of_accounts (company_id, account_no, name, type, is_posting, balance)
  VALUES
    (v_company_pkr_id, '2000', 'Current Liabilities', 'liability', false, 0),
    (v_company_pkr_id, '2010', 'Accounts Payable', 'liability', true, 180000),
    (v_company_pkr_id, '2020', 'VAT Payable (13%)', 'liability', true, 0)
  ON CONFLICT (company_id, account_no) DO NOTHING;

  INSERT INTO chart_of_accounts (company_id, account_no, name, type, is_posting, balance)
  VALUES
    (v_company_pkr_id, '3000', 'Equity', 'equity', false, 0),
    (v_company_pkr_id, '3010', 'Owner Capital', 'equity', true, 2000000),
    (v_company_pkr_id, '3020', 'Retained Earnings', 'equity', true, 320000)
  ON CONFLICT (company_id, account_no) DO NOTHING;

  INSERT INTO chart_of_accounts (company_id, account_no, name, type, is_posting, balance)
  VALUES
    (v_company_pkr_id, '4000', 'Revenue', 'revenue', false, 0),
    (v_company_pkr_id, '4010', 'Sales Revenue', 'revenue', true, 0),
    (v_company_pkr_id, '4020', 'Sales Returns', 'revenue', true, 0)
  ON CONFLICT (company_id, account_no) DO NOTHING;

  INSERT INTO chart_of_accounts (company_id, account_no, name, type, is_posting, balance)
  VALUES
    (v_company_pkr_id, '5000', 'Operating Expenses', 'expense', false, 0),
    (v_company_pkr_id, '5010', 'Cost of Goods Sold', 'expense', true, 0),
    (v_company_pkr_id, '5020', 'Rent Expense', 'expense', true, 0),
    (v_company_pkr_id, '5030', 'Salary Expense', 'expense', true, 0)
  ON CONFLICT (company_id, account_no) DO NOTHING;

  -- Set parent relationships for Pokhara
  UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE company_id = v_company_pkr_id AND account_no = '1000')
  WHERE company_id = v_company_pkr_id AND account_no IN ('1010','1020','1100','1500') AND parent_id IS NULL;

  UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE company_id = v_company_pkr_id AND account_no = '2000')
  WHERE company_id = v_company_pkr_id AND account_no IN ('2010','2020') AND parent_id IS NULL;

  UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE company_id = v_company_pkr_id AND account_no = '3000')
  WHERE company_id = v_company_pkr_id AND account_no IN ('3010','3020') AND parent_id IS NULL;

  UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE company_id = v_company_pkr_id AND account_no = '4000')
  WHERE company_id = v_company_pkr_id AND account_no IN ('4010','4020') AND parent_id IS NULL;

  UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE company_id = v_company_pkr_id AND account_no = '5000')
  WHERE company_id = v_company_pkr_id AND account_no IN ('5010','5020','5030') AND parent_id IS NULL;

  -- Customers for Pokhara Main
  INSERT INTO customers (company_id, code, name, address, phone, email, credit_limit, balance)
  VALUES
    (v_company_pkr_id, 'C001', 'Himalayan Trading Pvt. Ltd.', 'Lakeside-6, Pokhara', '9801111222', 'himalayan@gmail.com', 200000, 85000),
    (v_company_pkr_id, 'C002', 'Annapurna Electronics', 'Mahendrapul, Pokhara', '9803333444', 'annapurna@gmail.com', 150000, 45000),
    (v_company_pkr_id, 'C003', 'Gandaki Stationery', 'Chipledhunga, Pokhara', '9805555666', 'gandaki@gmail.com', 100000, 25000)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- Vendors for Pokhara Main
  INSERT INTO vendors (company_id, code, name, address, phone, email, balance)
  VALUES
    (v_company_pkr_id, 'V001', 'Kathmandu Suppliers Ltd.', 'New Road, Kathmandu', '01411111', 'ksl@gmail.com', 95000),
    (v_company_pkr_id, 'V002', 'Biratnagar Wholesale', 'Main Road, Biratnagar', '01211111', 'birat@gmail.com', 0)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- Items for Pokhara Main
  INSERT INTO items (company_id, code, description, unit_cost, sales_price, category, reorder_point, quantity_on_hand)
  VALUES
    (v_company_pkr_id, 'ITM001', 'A4 Paper Rim (500 sheets)', 350, 550, 'Stationery', 50, 200),
    (v_company_pkr_id, 'ITM002', 'Blue Ball Pen (Box of 50)', 400, 700, 'Stationery', 20, 80),
    (v_company_pkr_id, 'ITM003', 'USB Flash Drive 32GB', 650, 1100, 'Electronics', 30, 150),
    (v_company_pkr_id, 'ITM004', 'Wireless Mouse', 800, 1500, 'Electronics', 15, 60),
    (v_company_pkr_id, 'ITM005', 'Laptop Stand Adjustable', 1200, 2200, 'Accessories', 10, 40)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- Warehouse for Pokhara Main
  INSERT INTO warehouses (company_id, code, name, address)
  VALUES (v_company_pkr_id, 'WH01', 'Main Store - Pokhara', 'Lakeside Road, Pokhara')
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ===== Chart of Accounts for Kathmandu Branch =====
  INSERT INTO chart_of_accounts (company_id, account_no, name, type, is_posting, balance)
  VALUES
    (v_company_ktm_id, '1000', 'Current Assets', 'asset', false, 0),
    (v_company_ktm_id, '1010', 'Cash in Hand', 'asset', true, 300000),
    (v_company_ktm_id, '1020', 'Bank Account - Global IME', 'asset', true, 850000),
    (v_company_ktm_id, '1100', 'Accounts Receivable', 'asset', true, 220000),
    (v_company_ktm_id, '1500', 'Inventory', 'asset', true, 280000)
  ON CONFLICT (company_id, account_no) DO NOTHING;

  INSERT INTO chart_of_accounts (company_id, account_no, name, type, is_posting, balance)
  VALUES
    (v_company_ktm_id, '2000', 'Current Liabilities', 'liability', false, 0),
    (v_company_ktm_id, '2010', 'Accounts Payable', 'liability', true, 120000),
    (v_company_ktm_id, '2020', 'VAT Payable (13%)', 'liability', true, 0)
  ON CONFLICT (company_id, account_no) DO NOTHING;

  INSERT INTO chart_of_accounts (company_id, account_no, name, type, is_posting, balance)
  VALUES
    (v_company_ktm_id, '3000', 'Equity', 'equity', false, 0),
    (v_company_ktm_id, '3010', 'Owner Capital', 'equity', true, 1500000),
    (v_company_ktm_id, '3020', 'Retained Earnings', 'equity', true, 310000)
  ON CONFLICT (company_id, account_no) DO NOTHING;

  INSERT INTO chart_of_accounts (company_id, account_no, name, type, is_posting, balance)
  VALUES
    (v_company_ktm_id, '4000', 'Revenue', 'revenue', false, 0),
    (v_company_ktm_id, '4010', 'Sales Revenue', 'revenue', true, 0),
    (v_company_ktm_id, '4020', 'Sales Returns', 'revenue', true, 0)
  ON CONFLICT (company_id, account_no) DO NOTHING;

  INSERT INTO chart_of_accounts (company_id, account_no, name, type, is_posting, balance)
  VALUES
    (v_company_ktm_id, '5000', 'Operating Expenses', 'expense', false, 0),
    (v_company_ktm_id, '5010', 'Cost of Goods Sold', 'expense', true, 0),
    (v_company_ktm_id, '5020', 'Rent Expense', 'expense', true, 0),
    (v_company_ktm_id, '5030', 'Salary Expense', 'expense', true, 0)
  ON CONFLICT (company_id, account_no) DO NOTHING;

  -- Set parent relationships for Kathmandu
  UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE company_id = v_company_ktm_id AND account_no = '1000')
  WHERE company_id = v_company_ktm_id AND account_no IN ('1010','1020','1100','1500') AND parent_id IS NULL;

  UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE company_id = v_company_ktm_id AND account_no = '2000')
  WHERE company_id = v_company_ktm_id AND account_no IN ('2010','2020') AND parent_id IS NULL;

  UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE company_id = v_company_ktm_id AND account_no = '3000')
  WHERE company_id = v_company_ktm_id AND account_no IN ('3010','3020') AND parent_id IS NULL;

  UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE company_id = v_company_ktm_id AND account_no = '4000')
  WHERE company_id = v_company_ktm_id AND account_no IN ('4010','4020') AND parent_id IS NULL;

  UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE company_id = v_company_ktm_id AND account_no = '5000')
  WHERE company_id = v_company_ktm_id AND account_no IN ('5010','5020','5030') AND parent_id IS NULL;

  -- Customers for Kathmandu Branch
  INSERT INTO customers (company_id, code, name, address, phone, email, credit_limit, balance)
  VALUES
    (v_company_ktm_id, 'C001', 'New Road Traders', 'New Road, Kathmandu', '01422222', 'nrt@gmail.com', 250000, 120000),
    (v_company_ktm_id, 'C002', 'Kathmandu Mart', 'Bhaktapur Road, Kathmandu', '01433333', 'ktmmart@gmail.com', 180000, 65000),
    (v_company_ktm_id, 'C003', 'Thamel Electronics Hub', 'Thamel, Kathmandu', '01444444', 'thamel@gmail.com', 200000, 35000)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- Vendors for Kathmandu Branch
  INSERT INTO vendors (company_id, code, name, address, phone, email, balance)
  VALUES
    (v_company_ktm_id, 'V001', 'China Town Imports', 'Khasa, China Border', '01455555', 'cti@gmail.com', 75000),
    (v_company_ktm_id, 'V002', 'Birgunj Distributors', 'Main Road, Birgunj', '01511111', 'birgunj@gmail.com', 0)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- Items for Kathmandu Branch
  INSERT INTO items (company_id, code, description, unit_cost, sales_price, category, reorder_point, quantity_on_hand)
  VALUES
    (v_company_ktm_id, 'ITM001', 'A4 Paper Rim (500 sheets)', 320, 520, 'Stationery', 50, 300),
    (v_company_ktm_id, 'ITM002', 'Blue Ball Pen (Box of 50)', 380, 680, 'Stationery', 20, 120),
    (v_company_ktm_id, 'ITM003', 'USB Flash Drive 32GB', 600, 1050, 'Electronics', 30, 200),
    (v_company_ktm_id, 'ITM004', 'Wireless Mouse', 750, 1400, 'Electronics', 15, 80),
    (v_company_ktm_id, 'ITM005', 'Laptop Stand Adjustable', 1100, 2100, 'Accessories', 10, 50)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- Warehouse for Kathmandu Branch
  INSERT INTO warehouses (company_id, code, name, address)
  VALUES (v_company_ktm_id, 'WH01', 'Main Store - Kathmandu', 'New Road, Kathmandu')
  ON CONFLICT (company_id, code) DO NOTHING;

END $$;
