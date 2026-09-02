/*
# Fix RLS Policy Recursion on erp_users

## Problem
The `read_tenant_users` policy on `erp_users` references `erp_users` in a subquery,
causing infinite recursion. Postgres detects this and throws an error which surfaces
as "Database error querying schema" in the frontend.

## Fix
1. Create a SECURITY DEFINER function `get_user_tenant_id()` that safely returns
   the tenant_id for a given user without triggering RLS.
2. Replace the self-referencing subquery in `read_tenant_users` with this function.
3. Also fix the same pattern in `master_tenants` and `companies` policies.

## Security
- `get_user_tenant_id` is SECURITY DEFINER so it bypasses RLS to read the user's
  tenant_id. It only returns a uuid, no sensitive data.
- EXECUTE is revoked from anon to prevent unauthenticated calls.
*/

CREATE OR REPLACE FUNCTION get_user_tenant_id(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM erp_users WHERE id = user_uuid;
$$;

REVOKE EXECUTE ON FUNCTION get_user_tenant_id(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION get_user_tenant_id(uuid) TO authenticated;

-- Fix erp_users: read_tenant_users policy (was self-referencing, causing recursion)
DROP POLICY IF EXISTS "read_tenant_users" ON erp_users;
CREATE POLICY "read_tenant_users" ON erp_users FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
  );

-- Fix master_tenants: use helper function instead of subquery on erp_users
DROP POLICY IF EXISTS "read_own_tenant" ON master_tenants;
CREATE POLICY "read_own_tenant" ON master_tenants FOR SELECT
  TO authenticated
  USING (
    id = get_user_tenant_id(auth.uid())
  );

-- Fix companies: use helper function
DROP POLICY IF EXISTS "read_tenant_companies" ON companies;
CREATE POLICY "read_tenant_companies" ON companies FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
  );

DROP POLICY IF EXISTS "insert_tenant_companies" ON companies;
CREATE POLICY "insert_tenant_companies" ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
  );

DROP POLICY IF EXISTS "update_tenant_companies" ON companies;
CREATE POLICY "update_tenant_companies" ON companies FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
  )
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
  );

DROP POLICY IF EXISTS "delete_tenant_companies" ON companies;
CREATE POLICY "delete_tenant_companies" ON companies FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
  );
