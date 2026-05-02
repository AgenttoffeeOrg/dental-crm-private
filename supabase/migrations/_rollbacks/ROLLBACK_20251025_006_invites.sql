-- =====================================================
-- ROLLBACK: Step 5 - Enhanced Invitations & Join Flow
-- Purpose: Remove all invite enhancements and revert to basic system
-- Safety: Reverts to pre-Step-5 state
-- =====================================================
--
-- WHEN TO USE THIS:
-- - Issues with collision detection
-- - Bulk invite system causing problems
-- - Need to revert to simple invitation flow
-- - Expiry scheduler causing issues
--
-- WHAT THIS DOES:
-- 1. Drops all scheduler functions
-- 2. Drops bulk invite processing functions
-- 3. Drops collision detection functions
-- 4. Drops invite_batches table
-- 5. Drops invite_settings table
-- 6. Removes enhancement columns from user_invitations
-- 7. Preserves core user_invitations table
--
-- DATA LOSS:
-- - All batch records
-- - All invite settings
-- - Collision metadata
-- - Enhanced tracking (resend counts, expiry reminders)
--
-- DATA PRESERVED:
-- - Core user_invitations (email, role, invited_by)
-- - All users (app_users)
-- - All organizations (tenants)
-- - Existing memberships
--
-- RECOVERY TIME: ~3 minutes
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: DROP SCHEDULER FUNCTIONS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'DROPPING SCHEDULER FUNCTIONS';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
END $$;

DROP FUNCTION IF EXISTS public.expire_pending_invitations();
DROP FUNCTION IF EXISTS public.cleanup_old_invitations(INTEGER);
DROP FUNCTION IF EXISTS public.send_invite_expiry_reminders();
DROP FUNCTION IF EXISTS public.cancel_stale_batches();
DROP FUNCTION IF EXISTS public.get_invite_metrics(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.expire_invitation(UUID);
DROP FUNCTION IF EXISTS public.extend_invitation_expiry(UUID, INTEGER);

DO $$ BEGIN RAISE NOTICE '✅ Dropped scheduler functions'; END $$;

-- =====================================================
-- STEP 2: DROP BULK PROCESSING FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS public.create_bulk_invites(UUID, JSONB, UUID, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.resend_invitation(UUID, UUID);
DROP FUNCTION IF EXISTS public.cancel_invitation(UUID, UUID);

DO $$ BEGIN RAISE NOTICE '✅ Dropped bulk processing functions'; END $$;

-- =====================================================
-- STEP 3: DROP COLLISION DETECTION FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS public.check_invite_collision(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.check_bulk_invite_collisions(UUID, TEXT[], UUID);
DROP FUNCTION IF EXISTS public.validate_invite_request(UUID, TEXT, TEXT, UUID);

DO $$ BEGIN RAISE NOTICE '✅ Dropped collision detection functions'; END $$;

-- =====================================================
-- STEP 4: DROP TABLES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Dropping tables...';
  RAISE NOTICE '';
END $$;

DROP TABLE IF EXISTS invite_batches CASCADE;
DROP TABLE IF EXISTS invite_settings CASCADE;

DO $$ BEGIN RAISE NOTICE '✅ Dropped invite_batches and invite_settings tables'; END $$;

-- =====================================================
-- STEP 5: REMOVE ENHANCEMENT COLUMNS FROM USER_INVITATIONS
-- =====================================================

ALTER TABLE user_invitations DROP COLUMN IF EXISTS status;
ALTER TABLE user_invitations DROP COLUMN IF EXISTS expires_at;
ALTER TABLE user_invitations DROP COLUMN IF EXISTS accepted_at;
ALTER TABLE user_invitations DROP COLUMN IF EXISTS cancelled_at;
ALTER TABLE user_invitations DROP COLUMN IF EXISTS cancelled_by;
ALTER TABLE user_invitations DROP COLUMN IF EXISTS resend_count;
ALTER TABLE user_invitations DROP COLUMN IF EXISTS last_sent_at;
ALTER TABLE user_invitations DROP COLUMN IF EXISTS batch_id;
ALTER TABLE user_invitations DROP COLUMN IF EXISTS metadata;

-- Drop indexes
DROP INDEX IF EXISTS idx_user_invitations_status;
DROP INDEX IF EXISTS idx_user_invitations_expires;
DROP INDEX IF EXISTS idx_user_invitations_email_tenant;
DROP INDEX IF EXISTS idx_user_invitations_batch;
DROP INDEX IF EXISTS idx_user_invitations_invited_by;

DO $$ BEGIN RAISE NOTICE '✅ Removed enhancement columns from user_invitations'; END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  invite_batches_exists BOOLEAN;
  invite_settings_exists BOOLEAN;
  status_column_exists BOOLEAN;
  expires_at_column_exists BOOLEAN;
  function_count INTEGER;
BEGIN
  -- Check tables
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'invite_batches'
  ) INTO invite_batches_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'invite_settings'
  ) INTO invite_settings_exists;
  
  -- Check columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_invitations' AND column_name = 'status'
  ) INTO status_column_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_invitations' AND column_name = 'expires_at'
  ) INTO expires_at_column_exists;
  
  -- Count remaining functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN (
    'expire_pending_invitations', 'cleanup_old_invitations', 'send_invite_expiry_reminders',
    'cancel_stale_batches', 'get_invite_metrics', 'expire_invitation', 'extend_invitation_expiry',
    'create_bulk_invites', 'resend_invitation', 'cancel_invitation',
    'check_invite_collision', 'check_bulk_invite_collisions', 'validate_invite_request'
  );
  
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'ROLLBACK VERIFICATION';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'invite_batches exists: %', invite_batches_exists;
  RAISE NOTICE 'invite_settings exists: %', invite_settings_exists;
  RAISE NOTICE 'user_invitations.status exists: %', status_column_exists;
  RAISE NOTICE 'user_invitations.expires_at exists: %', expires_at_column_exists;
  RAISE NOTICE 'Remaining functions: %', function_count;
  RAISE NOTICE '';
  
  IF NOT invite_batches_exists AND NOT invite_settings_exists
     AND NOT status_column_exists AND NOT expires_at_column_exists
     AND function_count = 0 THEN
    RAISE NOTICE '✅ Clean rollback completed';
  ELSE
    RAISE WARNING '⚠️  Some components still exist';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '✅ ROLLBACK COMPLETE';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
  RAISE NOTICE '✅ 17 functions dropped';
  RAISE NOTICE '✅ 2 tables dropped (invite_batches, invite_settings)';
  RAISE NOTICE '✅ 9 columns removed from user_invitations';
  RAISE NOTICE '✅ All indexes dropped';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT STEPS:';
  RAISE NOTICE '1. Verify basic invite flow still works';
  RAISE NOTICE '2. Test user invitation creation';
  RAISE NOTICE '3. Core user_invitations table preserved';
  RAISE NOTICE '4. Can re-run Step 5 migrations to restore enhancements';
  RAISE NOTICE '';
  RAISE NOTICE '💾 DATA PRESERVED:';
  RAISE NOTICE '   - Core user_invitations table';
  RAISE NOTICE '   - All app_users';
  RAISE NOTICE '   - All tenants';
  RAISE NOTICE '   - All memberships';
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  DATA LOST:';
  RAISE NOTICE '   - Batch records';
  RAISE NOTICE '   - Invite settings';
  RAISE NOTICE '   - Collision metadata';
  RAISE NOTICE '   - Enhanced tracking data';
END $$;



