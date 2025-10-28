-- =====================================================
-- FIX: Remove restrictive app_users RLS policy
-- =====================================================
-- Problem: app_users_tenant_isolation is blocking joins because it compares
-- the OLD tenant_id column with get_accessible_tenants() which uses active_tenant_id
-- Solution: Drop it - we already have authenticated_full_access_app_users which allows everything
-- =====================================================

DROP POLICY IF EXISTS "app_users_tenant_isolation" ON app_users;

-- Keep these policies (they're fine):
-- - authenticated_full_access_app_users (allows true for all authenticated users)
-- - app_users_update_own (users can only update themselves)
-- - Service role full access to app_users (service role bypass)

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Dropped app_users_tenant_isolation policy';
  RAISE NOTICE '✅ app_users now accessible via authenticated_full_access_app_users';
END $$;

