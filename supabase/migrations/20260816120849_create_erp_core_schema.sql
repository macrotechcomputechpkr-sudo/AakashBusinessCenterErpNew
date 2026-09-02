/*
# ERP Core Schema - Multi-Tenant Multi-Company

## Overview
Creates the foundational tables for a multi-tenant, multi-company ERP system inspired by Microsoft Business Central. The schema supports:
- Central tenant management (master_tenants)
- User-tenant mapping (erp_users linked to auth.users)
- Multi-company per tenant (companies)
- User-company access control (user_companies)
- Fiscal year management with locking (fiscal_years)

## New Tables
1. master_tenants - Central registry of all tenants (e.g., AAKASH-DIGITAL)
2. erp_users - Maps Supabase auth users to tenants with metadata
3. companies - Companies within a tenant (e.g., Pokhara Main, Kathmandu Branch)
4. user_companies - Maps which companies each user can access
5. fiscal_years - Fiscal period definitions with locking

## Security
- RLS enabled on all tables
- Policies scoped to authenticated users with tenant ownership checks

## Important Notes
1. erp_users.id references auth.users(id) - links Supabase auth to ERP tenant system
2. tenant_code is unique and used at login (e.g., AAKASH-DIGITAL)
3. Fiscal year status 'closed' prevents posting transactions
*/

-- Create all tables first (no policy references to tables that don't exist yet)

CREATE TABLE IF NOT EXISTS master_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_code text UNIQUE NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS erp_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  pan_number text,
  fiscal_year_label text,
  address text,
  phone text,
  email text,
  currency text NOT NULL DEFAULT 'NPR',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES erp_users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, company_id)
);

CREATE TABLE IF NOT EXISTS fiscal_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fiscal_year_label text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE master_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;

-- master_tenants policies
DROP POLICY IF EXISTS "read_own_tenant" ON master_tenants;
CREATE POLICY "read_own_tenant" ON master_tenants FOR SELECT
  TO authenticated
  USING (
    id = (SELECT tenant_id FROM erp_users WHERE erp_users.id = auth.uid())
  );

-- erp_users policies
DROP POLICY IF EXISTS "read_own_profile" ON erp_users;
CREATE POLICY "read_own_profile" ON erp_users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "read_tenant_users" ON erp_users;
CREATE POLICY "read_tenant_users" ON erp_users FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM erp_users eu WHERE eu.id = auth.uid())
  );

-- companies policies
DROP POLICY IF EXISTS "read_tenant_companies" ON companies;
CREATE POLICY "read_tenant_companies" ON companies FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM erp_users WHERE erp_users.id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_tenant_companies" ON companies;
CREATE POLICY "insert_tenant_companies" ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM erp_users WHERE erp_users.id = auth.uid())
  );

DROP POLICY IF EXISTS "update_tenant_companies" ON companies;
CREATE POLICY "update_tenant_companies" ON companies FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM erp_users WHERE erp_users.id = auth.uid())
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM erp_users WHERE erp_users.id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_tenant_companies" ON companies;
CREATE POLICY "delete_tenant_companies" ON companies FOR DELETE
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM erp_users WHERE erp_users.id = auth.uid())
  );

-- user_companies policies
DROP POLICY IF EXISTS "read_own_company_access" ON user_companies;
CREATE POLICY "read_own_company_access" ON user_companies FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR company_id IN (
      SELECT c.id FROM companies c
      WHERE c.tenant_id = (SELECT tenant_id FROM erp_users WHERE erp_users.id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_own_company_access" ON user_companies;
CREATE POLICY "insert_own_company_access" ON user_companies FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IN (
      SELECT eu.id FROM erp_users eu
      WHERE eu.tenant_id = (SELECT tenant_id FROM erp_users WHERE erp_users.id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "delete_own_company_access" ON user_companies;
CREATE POLICY "delete_own_company_access" ON user_companies FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT eu.id FROM erp_users eu
      WHERE eu.tenant_id = (SELECT tenant_id FROM erp_users WHERE erp_users.id = auth.uid())
    )
  );

-- fiscal_years policies
DROP POLICY IF EXISTS "read_tenant_fiscal_years" ON fiscal_years;
CREATE POLICY "read_tenant_fiscal_years" ON fiscal_years FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.tenant_id = (SELECT tenant_id FROM erp_users WHERE erp_users.id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_tenant_fiscal_years" ON fiscal_years;
CREATE POLICY "insert_tenant_fiscal_years" ON fiscal_years FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.tenant_id = (SELECT tenant_id FROM erp_users WHERE erp_users.id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "update_tenant_fiscal_years" ON fiscal_years;
CREATE POLICY "update_tenant_fiscal_years" ON fiscal_years FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.tenant_id = (SELECT tenant_id FROM erp_users WHERE erp_users.id = auth.uid())
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.tenant_id = (SELECT tenant_id FROM erp_users WHERE erp_users.id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "delete_tenant_fiscal_years" ON fiscal_years;
CREATE POLICY "delete_tenant_fiscal_years" ON fiscal_years FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.tenant_id = (SELECT tenant_id FROM erp_users WHERE erp_users.id = auth.uid())
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_erp_users_tenant ON erp_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_tenant ON companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_user ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company ON user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_years_company ON fiscal_years(company_id);
