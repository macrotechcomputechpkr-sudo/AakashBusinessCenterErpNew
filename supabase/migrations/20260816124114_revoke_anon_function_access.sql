/*
# Revoke anon execute on SECURITY DEFINER functions

The security advisor flagged that anon can execute post_voucher, get_company_backup,
and user_has_company_access. Revoke anon execute on all three.
*/

REVOKE EXECUTE ON FUNCTION post_voucher(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION get_company_backup(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION user_has_company_access(uuid) FROM anon;
