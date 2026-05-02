SET search_path TO public, extensions;

-- =====================================================
-- FIX: Remove Old Broken RLS Policies on Deals Table
-- =====================================================
-- Problem: Multiple conflicting RLS policies are blocking access
-- Solution: Keep only the correct policies that use get_accessible_tenants()
-- =====================================================

-- 1. Drop OLD broken policies that use deprecated functions
DROP POLICY IF EXISTS "Tenant isolation SELECT deals" ON deals;
DROP POLICY IF EXISTS "Tenant isolation INSERT deals" ON deals;
DROP POLICY IF EXISTS "Tenant isolation UPDATE deals" ON deals;
DROP POLICY IF EXISTS "Tenant isolation DELETE deals" ON deals;

-- 2. Drop policies using old app_users.tenant_id column
DROP POLICY IF EXISTS "Users access own tenant deals" ON deals;

-- 3. Drop policies using old current_tenant_id() function
DROP POLICY IF EXISTS "deals_select" ON deals;
DROP POLICY IF EXISTS "deals_insert" ON deals;
DROP POLICY IF EXISTS "deals_update" ON deals;
DROP POLICY IF EXISTS "deals_delete" ON deals;

-- 4. Drop policies using get_user_org_id() (deprecated)
-- (Already covered above)

-- 5. Drop old policies using get_current_user_tenant_id() with location checks
-- (These are actually good but we'll consolidate to one master policy)
DROP POLICY IF EXISTS "Users can view deals in their tenant and locations" ON deals;
DROP POLICY IF EXISTS "Users can create deals in their tenant and locations" ON deals;
DROP POLICY IF EXISTS "Users can update deals in their tenant and locations" ON deals;
DROP POLICY IF EXISTS "Users can delete deals in their tenant and locations" ON deals;

-- 6. Keep service_role bypass policies (these are fine)
-- "deals_service_role" - KEEP
-- "Service role bypass deals" - KEEP (duplicate but harmless)
-- "Service role full access to deals" - KEEP (duplicate but harmless)

-- 7. Keep the CORRECT master policy
-- "deals_tenant_isolation" - KEEP (this uses get_accessible_tenants())

-- 8. Update get_user_org_id() to be a compatibility wrapper
-- Many tables still use this, so we'll make it call get_accessible_tenants()
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  accessible_tenants UUID[];
BEGIN
  -- Get all accessible tenants
  accessible_tenants := get_accessible_tenants();
  
  -- Return the first one (for single-tenant operations)
  -- This matches the old behavior but uses the new logic
  IF accessible_tenants IS NULL OR array_length(accessible_tenants, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN accessible_tenants[1];
END;
$$;

COMMENT ON FUNCTION get_user_org_id IS 
  'Legacy compatibility wrapper. Returns first accessible tenant. Use get_accessible_tenants() for multi-tenant operations.';

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Cleaned up old RLS policies on deals table';
  RAISE NOTICE '✅ Updated get_user_org_id() to use get_accessible_tenants()';
  RAISE NOTICE '✅ Keeping only: deals_tenant_isolation + service_role policies';
END $$;

