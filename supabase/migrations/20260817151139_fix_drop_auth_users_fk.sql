/*
# Fix: Drop foreign key from erp_users to auth.users

## Problem
erp_users.id has a foreign key constraint referencing auth.users(id).
This cross-schema FK from a public table to auth.users breaks GoTrue's
internal PostgREST schema resolution, causing "Database error querying schema"
on every sign-in attempt.

## Fix
Drop the FK constraint. The erp_users.id column still stores the auth user UUID,
just without the formal constraint. The relationship is enforced at the
application level (we look up erp_users by auth.uid() after sign-in).
*/

ALTER TABLE erp_users DROP CONSTRAINT IF EXISTS erp_users_id_fkey;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
