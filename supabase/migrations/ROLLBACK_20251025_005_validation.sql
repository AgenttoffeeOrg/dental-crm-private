-- =====================================================
-- ROLLBACK: Step 4 - Organization Validation & Email Verification
-- Purpose: Remove validation lifecycle and email verification
-- Safety: Reverts to pre-Step-4 state
-- =====================================================
--
-- WHEN TO USE THIS:
-- - Issues with validation workflow
-- - Email verification causing problems
-- - Need to disable all gating temporarily
-- - Scheduler functions causing issues
--
-- WHAT THIS DOES:
-- 1. Drops scheduler functions
-- 2. Drops helper functions
-- 3. Drops email_verification_tokens table
-- 4. Drops org_validation_events table
-- 5. Removes validation columns from tenants
-- 6. Removes verification columns from app_users
--
-- DATA LOSS:
-- - All validation events (audit trail)
-- - All verification tokens
-- - Validation status history
-- - Reminder history
--
-- DATA PRESERVED:
-- - All users (app_users)
-- - All organizations (tenants)
-- - Core CRM data unchanged
--
-- RECOVERY TIME: ~2 minutes
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

DROP FUNCTION IF EXISTS public.process_org_validation_reminders();
DROP FUNCTION IF EXISTS public.process_email_verification_reminders();
DROP FUNCTION IF EXISTS public.expire_unvalidated_orgs();
DROP FUNCTION IF EXISTS public.cleanup_expired_tokens();
DROP FUNCTION IF EXISTS public.send_org_validation_reminder(UUID);

DO $$ BEGIN RAISE NOTICE '✅ Dropped scheduler functions'; END $$;

-- =====================================================
-- STEP 2: DROP EMAIL VERIFICATION FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS public.user_email_verified(UUID);
DROP FUNCTION IF EXISTS public.generate_verification_token(UUID, TEXT);
DROP FUNCTION IF EXISTS public.verify_email_with_token(TEXT);
DROP FUNCTION IF EXISTS public.resend_verification_email(UUID);

DO $$ BEGIN RAISE NOTICE '✅ Dropped email verification functions'; END $$;

-- =====================================================
-- STEP 3: DROP ORGANIZATION VALIDATION FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS public.org_needs_validation(UUID);
DROP FUNCTION IF EXISTS public.org_is_restricted(UUID);
DROP FUNCTION IF EXISTS public.org_days_until_expiry(UUID);
DROP FUNCTION IF EXISTS public.validate_organization(UUID, UUID);
DROP FUNCTION IF EXISTS public.start_grace_period(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.expire_organization(UUID);

DO $$ BEGIN RAISE NOTICE '✅ Dropped org validation functions'; END $$;

-- =====================================================
-- STEP 4: DROP TABLES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Dropping tables...';
  RAISE NOTICE '';
END $$;

DROP TABLE IF EXISTS email_verification_tokens CASCADE;
DROP TABLE IF EXISTS org_validation_events CASCADE;

DO $$ BEGIN RAISE NOTICE '✅ Dropped verification and validation tables'; END $$;

-- =====================================================
-- STEP 5: REMOVE COLUMNS FROM APP_USERS
-- =====================================================

ALTER TABLE app_users DROP COLUMN IF EXISTS email_verified;
ALTER TABLE app_users DROP COLUMN IF EXISTS email_verified_at;
ALTER TABLE app_users DROP COLUMN IF EXISTS verification_grace_ends_at;

DROP INDEX IF EXISTS idx_app_users_email_verified;

DO $$ BEGIN RAISE NOTICE '✅ Removed verification columns from app_users'; END $$;

-- =====================================================
-- STEP 6: REMOVE COLUMNS FROM TENANTS
-- =====================================================

ALTER TABLE tenants DROP COLUMN IF EXISTS validation_status;
ALTER TABLE tenants DROP COLUMN IF EXISTS validation_email;
ALTER TABLE tenants DROP COLUMN IF EXISTS validated_at;
ALTER TABLE tenants DROP COLUMN IF EXISTS grace_period_ends_at;
ALTER TABLE tenants DROP COLUMN IF EXISTS last_reminder_sent_at;
ALTER TABLE tenants DROP COLUMN IF EXISTS reminder_count;

DROP INDEX IF EXISTS idx_tenants_validation_status;
DROP INDEX IF EXISTS idx_tenants_grace_period;

DO $$ BEGIN RAISE NOTICE '✅ Removed validation columns from tenants'; END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  email_verification_tokens_exists BOOLEAN;
  org_validation_events_exists BOOLEAN;
  app_users_email_verified_exists BOOLEAN;
  tenants_validation_status_exists BOOLEAN;
  function_count INTEGER;
BEGIN
  -- Check tables
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'email_verification_tokens'
  ) INTO email_verification_tokens_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'org_validation_events'
  ) INTO org_validation_events_exists;
  
  -- Check columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_users' AND column_name = 'email_verified'
  ) INTO app_users_email_verified_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'validation_status'
  ) INTO tenants_validation_status_exists;
  
  -- Count remaining functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN (
    'process_org_validation_reminders', 'process_email_verification_reminders',
    'expire_unvalidated_orgs', 'cleanup_expired_tokens', 'send_org_validation_reminder',
    'user_email_verified', 'generate_verification_token', 'verify_email_with_token',
    'resend_verification_email', 'org_needs_validation', 'org_is_restricted',
    'org_days_until_expiry', 'validate_organization', 'start_grace_period',
    'expire_organization'
  );
  
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'ROLLBACK VERIFICATION';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'email_verification_tokens exists: %', email_verification_tokens_exists;
  RAISE NOTICE 'org_validation_events exists: %', org_validation_events_exists;
  RAISE NOTICE 'app_users.email_verified exists: %', app_users_email_verified_exists;
  RAISE NOTICE 'tenants.validation_status exists: %', tenants_validation_status_exists;
  RAISE NOTICE 'Remaining functions: %', function_count;
  RAISE NOTICE '';
  
  IF NOT email_verification_tokens_exists AND NOT org_validation_events_exists
     AND NOT app_users_email_verified_exists AND NOT tenants_validation_status_exists
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
  RAISE NOTICE '✅ 15 functions dropped';
  RAISE NOTICE '✅ 2 tables dropped (email_verification_tokens, org_validation_events)';
  RAISE NOTICE '✅ 3 columns removed from app_users';
  RAISE NOTICE '✅ 6 columns removed from tenants';
  RAISE NOTICE '✅ All indexes dropped';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT STEPS:';
  RAISE NOTICE '1. Verify app works without validation';
  RAISE NOTICE '2. Test user signup and invite flows';
  RAISE NOTICE '3. All users and orgs preserved';
  RAISE NOTICE '4. Can re-run Step 4 migrations to restore validation';
  RAISE NOTICE '';
  RAISE NOTICE '💾 DATA PRESERVED:';
  RAISE NOTICE '   - All app_users';
  RAISE NOTICE '   - All tenants';
  RAISE NOTICE '   - All core CRM data';
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  DATA LOST:';
  RAISE NOTICE '   - Validation event history';
  RAISE NOTICE '   - Verification tokens';
  RAISE NOTICE '   - Reminder history';
END $$;



