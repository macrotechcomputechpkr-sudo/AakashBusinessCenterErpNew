/*
# Fix remaining RLS policies with subquery pattern

Updates user_companies and fiscal_years policies to use get_user_tenant_id()
helper function instead of subqueries on erp_users.
*/

-- Fix user_companies policies
DROP POLICY IF EXISTS "read_own_company_access" ON user_companies;
CREATE POLICY "read_own_company_access" ON user_companies FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR company_id IN (
      SELECT c.id FROM companies c
      WHERE c.tenant_id = get_user_tenant_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_own_company_access" ON user_companies;
CREATE POLICY "insert_own_company_access" ON user_companies FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IN (
      SELECT eu.id FROM erp_users eu
      WHERE eu.tenant_id = get_user_tenant_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "delete_own_company_access" ON user_companies;
CREATE POLICY "delete_own_company_access" ON user_companies FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT eu.id FROM erp_users eu
      WHERE eu.tenant_id = get_user_tenant_id(auth.uid())
    )
  );

-- Fix fiscal_years policies
DROP POLICY IF EXISTS "read_tenant_fiscal_years" ON fiscal_years;
CREATE POLICY "read_tenant_fiscal_years" ON fiscal_years FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.tenant_id = get_user_tenant_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_tenant_fiscal_years" ON fiscal_years;
CREATE POLICY "insert_tenant_fiscal_years" ON fiscal_years FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.tenant_id = get_user_tenant_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "update_tenant_fiscal_years" ON fiscal_years;
CREATE POLICY "update_tenant_fiscal_years" ON fiscal_years FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.tenant_id = get_user_tenant_id(auth.uid())
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.tenant_id = get_user_tenant_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "delete_tenant_fiscal_years" ON fiscal_years;
CREATE POLICY "delete_tenant_fiscal_years" ON fiscal_years FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.tenant_id = get_user_tenant_id(auth.uid())
    )
  );
