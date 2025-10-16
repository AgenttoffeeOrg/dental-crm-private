-- =====================================================
-- HARDENING PHASE 1.1: Canonical Helper Functions
-- Date: October 16, 2025
-- Purpose: Create standard helpers for tenant isolation & consistency
-- =====================================================

-- =====================================================
-- 1. TENANT ID HELPERS
-- =====================================================

-- Drop existing helpers if they have different signatures
DROP FUNCTION IF EXISTS current_tenant_id();
DROP FUNCTION IF EXISTS current_role_name();

-- Canonical function to get current user's tenant_id
-- This replaces all variants (get_user_tenant_id, get_user_org_id, etc.)
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  -- First try org_memberships (multi-org support)
  SELECT COALESCE(
    (SELECT tenant_id FROM org_memberships 
     WHERE user_id = auth.uid() AND status = 'active' 
     ORDER BY last_accessed_at DESC LIMIT 1),
    -- Fallback to app_users
    (SELECT tenant_id FROM app_users WHERE id = auth.uid() LIMIT 1)
  );
$$;

COMMENT ON FUNCTION current_tenant_id() IS 
  'Returns the authenticated user''s current tenant_id. Uses org_memberships if available, falls back to app_users.';

-- =====================================================
-- 2. ROLE HELPERS
-- =====================================================

-- Get current user's role in their current tenant
CREATE OR REPLACE FUNCTION current_role_name()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM app_users WHERE id = auth.uid() LIMIT 1;
$$;

COMMENT ON FUNCTION current_role_name() IS 
  'Returns the authenticated user''s role (owner, admin, staff, etc.)';

-- Check if user has specific role
CREATE OR REPLACE FUNCTION user_has_role(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users 
    WHERE id = auth.uid() 
      AND role = ANY(required_roles)
  );
$$;

COMMENT ON FUNCTION user_has_role(TEXT[]) IS 
  'Returns true if user has any of the specified roles';

-- =====================================================
-- 3. UPDATED_AT TRIGGER
-- =====================================================

-- Universal trigger function to set updated_at on UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_updated_at() IS 
  'Trigger function to automatically set updated_at = NOW() on UPDATE operations';

-- =====================================================
-- 4. SOFT DELETE HELPERS
-- =====================================================

-- Helper to check if a row is not soft-deleted
CREATE OR REPLACE FUNCTION is_not_deleted(row_deleted_at TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT row_deleted_at IS NULL;
$$;

COMMENT ON FUNCTION is_not_deleted(TIMESTAMPTZ) IS 
  'Returns true if the row is not soft-deleted (deleted_at IS NULL)';

-- Soft delete function (for use in triggers or manually)
CREATE OR REPLACE FUNCTION soft_delete_cascade()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mark record as deleted instead of actually deleting
  NEW.deleted_at = NOW();
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION soft_delete_cascade() IS 
  'Trigger function to convert DELETE operations to soft deletes by setting deleted_at';

-- =====================================================
-- 5. TENANT VALIDATION HELPERS
-- =====================================================

-- Prevent tenant_id changes after creation
CREATE OR REPLACE FUNCTION prevent_tenant_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: Cannot change tenant_id after creation (table: %, id: %)', TG_TABLE_NAME, OLD.id
      USING ERRCODE = '23514'; -- check_violation
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION prevent_tenant_id_change() IS 
  'Trigger function to prevent tenant_id modifications after record creation';

-- Validate that a referenced record belongs to the same tenant
CREATE OR REPLACE FUNCTION validate_same_tenant(
  p_table_name TEXT,
  p_record_id UUID,
  p_expected_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_actual_tenant_id UUID;
BEGIN
  -- Dynamically query the referenced table
  EXECUTE format(
    'SELECT tenant_id FROM %I WHERE id = $1',
    p_table_name
  ) INTO v_actual_tenant_id USING p_record_id;

  RETURN v_actual_tenant_id = p_expected_tenant_id;
END;
$$;

COMMENT ON FUNCTION validate_same_tenant(TEXT, UUID, UUID) IS 
  'Validates that a referenced record belongs to the expected tenant. Used in FK validation triggers.';

-- =====================================================
-- 6. AUDIT LOGGING HELPER
-- =====================================================

-- Helper to log to audit_log (if table exists)
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_changes JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log if audit_log table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_log'
  ) THEN
    INSERT INTO audit_log (
      tenant_id,
      user_id,
      action,
      resource_type,
      resource_id,
      changes,
      ip_address,
      created_at
    ) VALUES (
      current_tenant_id(),
      auth.uid(),
      p_action,
      p_resource_type,
      p_resource_id,
      p_changes,
      inet_client_addr(),
      NOW()
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION log_audit_event(TEXT, TEXT, UUID, JSONB) IS 
  'Logs an audit event to the audit_log table (if it exists)';

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================

-- Verify all functions were created
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'current_tenant_id',
      'current_role_name',
      'user_has_role',
      'set_updated_at',
      'is_not_deleted',
      'soft_delete_cascade',
      'prevent_tenant_id_change',
      'validate_same_tenant',
      'log_audit_event'
    );

  RAISE NOTICE 'Created % helper functions', v_count;

  IF v_count < 9 THEN
    RAISE WARNING 'Expected 9 helper functions, but only created %', v_count;
  END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ HARDENING PHASE 1.1 COMPLETE: Helper functions created';
  RAISE NOTICE '   - current_tenant_id() - Get authenticated user''s tenant';
  RAISE NOTICE '   - current_role_name() - Get authenticated user''s role';
  RAISE NOTICE '   - user_has_role() - Check role membership';
  RAISE NOTICE '   - set_updated_at() - Auto-update timestamps';
  RAISE NOTICE '   - is_not_deleted() - Check soft delete status';
  RAISE NOTICE '   - soft_delete_cascade() - Soft delete trigger';
  RAISE NOTICE '   - prevent_tenant_id_change() - Prevent tenant_id changes';
  RAISE NOTICE '   - validate_same_tenant() - FK tenant validation';
  RAISE NOTICE '   - log_audit_event() - Audit logging';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Next: Run 20251016_hardening_002_soft_delete.sql';
END $$;

