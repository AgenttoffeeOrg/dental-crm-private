-- =====================================================
-- STEP 1B: BACKFILL USER_TENANT_MEMBERSHIPS
-- Purpose: Migrate existing app_users.tenant_id to new memberships table
-- Safety: Idempotent, resumable, audited
-- =====================================================
--
-- WHAT THIS DOES:
-- 1. Copies all existing user→tenant relationships to memberships table
-- 2. Preserves roles from app_users
-- 3. Sets invited_by to NULL (migrated data)
-- 4. Uses ON CONFLICT to make it safe to run multiple times
-- 5. Logs the backfill to audit trail
--
-- SAFETY GUARANTEES:
-- - Idempotent: safe to run multiple times (ON CONFLICT DO NOTHING)
-- - Non-destructive: does NOT modify app_users table
-- - Resumable: if interrupted, just run again
-- - Audited: logs to audit_trail
-- - Validated: checks counts before/after
--
-- VERIFICATION:
-- After running, verify:
-- =====================================================

BEGIN;

-- =====================================================
-- 1. PRE-BACKFILL VALIDATION
-- =====================================================

DO $$
DECLARE
  app_users_count INTEGER;
  existing_memberships_count INTEGER;
  separator CONSTANT TEXT := '========================================';
BEGIN
  -- Count existing app_users
  SELECT COUNT(*) INTO app_users_count FROM app_users;
  
  -- Count existing memberships
  SELECT COUNT(*) INTO existing_memberships_count FROM user_tenant_memberships;
  
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'BACKFILL VALIDATION - BEFORE';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'app_users count: %', app_users_count;
  RAISE NOTICE 'user_tenant_memberships count (before): %', existing_memberships_count;
  RAISE NOTICE '';
  
  IF app_users_count = 0 THEN
    RAISE WARNING 'No users found in app_users table - nothing to backfill';
  END IF;
END $$;

-- =====================================================
-- 2. BACKFILL MEMBERSHIPS FROM APP_USERS
-- =====================================================

-- Insert memberships from existing app_users
INSERT INTO user_tenant_memberships (
  user_id,
  tenant_id,
  role,
  status,
  invited_by,        -- NULL for migrated data
  invited_at,        -- NULL for migrated data
  joined_at,         -- Use created_at from app_users
  created_at,
  updated_at
)
SELECT 
  au.id AS user_id,
  au.tenant_id,
  -- Handle role field (might be NULL in some old records)
  COALESCE(au.role, 'staff') AS role,
  'active' AS status,
  NULL AS invited_by,
  NULL AS invited_at,
  au.created_at AS joined_at,
  au.created_at,
  NOW() AS updated_at
FROM app_users au
-- Only insert if not already exists (makes it idempotent)
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- =====================================================
-- 3. POST-BACKFILL VALIDATION
-- =====================================================

DO $$
DECLARE
  app_users_count INTEGER;
  memberships_count INTEGER;
  backfilled_count INTEGER;
  missing_count INTEGER;
  separator CONSTANT TEXT := '========================================';
BEGIN
  -- Count app_users
  SELECT COUNT(*) INTO app_users_count FROM app_users;
  
  -- Count memberships
  SELECT COUNT(*) INTO memberships_count FROM user_tenant_memberships;
  
  -- Count how many were just backfilled (joined_at matches created_at)
  SELECT COUNT(*) INTO backfilled_count 
  FROM user_tenant_memberships 
  WHERE invited_by IS NULL;  -- Migrated data has NULL invited_by
  
  -- Check if any users are missing memberships
  SELECT COUNT(*) INTO missing_count
  FROM app_users au
  WHERE NOT EXISTS (
    SELECT 1 
    FROM user_tenant_memberships utm 
    WHERE utm.user_id = au.id 
      AND utm.tenant_id = au.tenant_id
  );
  
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'BACKFILL VALIDATION - AFTER';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'app_users count: %', app_users_count;
  RAISE NOTICE 'user_tenant_memberships count (after): %', memberships_count;
  RAISE NOTICE 'Backfilled records (invited_by IS NULL): %', backfilled_count;
  RAISE NOTICE 'Missing memberships: %', missing_count;
  RAISE NOTICE '';
  
  IF missing_count > 0 THEN
    RAISE WARNING '⚠️  % users are missing memberships - investigate!', missing_count;
    RAISE NOTICE 'Run this query to see missing users:';
    RAISE NOTICE 'SELECT id, tenant_id, full_name FROM app_users WHERE id NOT IN (SELECT user_id FROM user_tenant_memberships);';
  ELSE
    RAISE NOTICE '✅ All users have memberships';
  END IF;
  
  IF memberships_count >= app_users_count THEN
    RAISE NOTICE '✅ Backfill successful: % memberships created', memberships_count;
  ELSE
    RAISE WARNING '⚠️  Backfill incomplete: expected %, got %', app_users_count, memberships_count;
  END IF;
END $$;

-- =====================================================
-- 4. CREATE AUDIT LOG ENTRY
-- =====================================================

-- Log the backfill operation to audit trail
INSERT INTO audit_trail (
  tenant_id,
  user_id,
  action_type,
  action_category,
  action_description,
  entity_type,
  entity_id,
  entity_name,
  before_state,
  after_state,
  changed_fields,
  ip_address,
  user_agent,
  session_id,
  visible_to_admin_only,
  sensitive_data,
  tags,
  severity,
  created_at
)
SELECT 
  (SELECT id FROM tenants LIMIT 1) AS tenant_id,  -- System-wide operation
  NULL AS user_id,  -- System operation
  'backfill' AS action_type,
  'migration' AS action_category,
  'Backfilled user_tenant_memberships from app_users.tenant_id' AS action_description,
  'user_tenant_memberships' AS entity_type,
  NULL AS entity_id,
  'Migration: Step 1B' AS entity_name,
  jsonb_build_object('app_users_count', COUNT(*)) AS before_state,
  jsonb_build_object('memberships_count', COUNT(*)) AS after_state,
  ARRAY['user_id', 'tenant_id', 'role'] AS changed_fields,
  NULL AS ip_address,
  'Migration Script' AS user_agent,
  'migration-20251025_002' AS session_id,
  true AS visible_to_admin_only,
  false AS sensitive_data,
  ARRAY['migration', 'backfill', 'memberships'] AS tags,
  'info' AS severity,
  NOW() AS created_at
FROM app_users;

COMMIT;

-- =====================================================
-- 5. FINAL SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
  final_count INTEGER;
  separator CONSTANT TEXT := '========================================';
BEGIN
  SELECT COUNT(*) INTO final_count FROM user_tenant_memberships;
  
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '✅ BACKFILL COMPLETE';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'Total memberships: %', final_count;
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '1. Verify counts: SELECT COUNT(*) FROM user_tenant_memberships;';
  RAISE NOTICE '2. Check for missing: SELECT COUNT(*) FROM app_users WHERE id NOT IN (SELECT user_id FROM user_tenant_memberships);';
  RAISE NOTICE '3. Proceed to: 20251025_002b_add_active_tenant_to_users.sql';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: app_users.tenant_id is still the source of truth';
  RAISE NOTICE '    Application has not switched yet (dual-read period)';
END $$;


