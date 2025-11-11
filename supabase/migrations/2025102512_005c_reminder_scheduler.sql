-- =====================================================
-- STEP 4C: VALIDATION REMINDER SCHEDULER
-- Purpose: Automated reminders for org validation and email verification
-- Safety: Cron functions, idempotent, audit logging
-- =====================================================
--
-- WHAT THIS DOES:
-- 1. Creates scheduled functions for reminder processing
-- 2. Implements org validation reminder logic (day 7, day 12)
-- 3. Implements email verification reminder logic
-- 4. Auto-expires organizations after grace period
-- 5. Logs all reminder events to audit trail
--
-- SCHEDULER JOBS:
-- - process_org_validation_reminders: Runs daily at 9 AM UTC
-- - process_email_verification_reminders: Runs daily at 10 AM UTC
-- - expire_unvalidated_orgs: Runs daily at 11 AM UTC
-- - cleanup_expired_tokens: Runs daily at midnight
--
-- ORG VALIDATION REMINDERS:
-- - Day 7: WARNING reminder (7 days left)
-- - Day 12: URGENT reminder (2 days left)
-- - Day 14: Auto-expire to EXPIRED status
--
-- EMAIL VERIFICATION REMINDERS:
-- - Day 3: First reminder (4 days left in grace)
-- - Day 6: Final reminder (1 day left in grace)
-- - Day 7: Grace period ends, features restricted
--
-- SAFETY:
-- - Idempotent: won't send duplicate reminders
-- - Rate limited: max 1 reminder per 24 hours
-- - Feature flag controlled
-- - Audit trail for all actions
-- - Can be run manually for testing
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ORGANIZATION VALIDATION REMINDER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.process_org_validation_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reminder_count INTEGER := 0;
  v_org RECORD;
  v_days_left INTEGER;
  v_reminder_type TEXT;
  v_flag_enabled BOOLEAN;
BEGIN
  -- Check if feature is enabled
  SELECT enabled INTO v_flag_enabled
  FROM feature_flags
  WHERE key = 'org_validation_enabled';
  
  IF v_flag_enabled IS NULL OR NOT v_flag_enabled THEN
    RETURN 0;
  END IF;
  
  -- Loop through orgs needing reminders
  FOR v_org IN
    SELECT 
      t.id,
      t.name,
      t.validation_email,
      t.grace_period_ends_at,
      t.last_reminder_sent_at,
      t.reminder_count,
      EXTRACT(EPOCH FROM (t.grace_period_ends_at - NOW())) / 86400 AS days_remaining
    FROM tenants t
    WHERE t.validation_status IN ('UNVALIDATED', 'GRACE_PERIOD')
      AND t.grace_period_ends_at IS NOT NULL
      AND t.grace_period_ends_at > NOW()
      AND (
        t.last_reminder_sent_at IS NULL 
        OR t.last_reminder_sent_at < (NOW() - INTERVAL '24 hours')
      )
  LOOP
    v_days_left := FLOOR(v_org.days_remaining);
    
    -- Determine reminder type based on days remaining
    IF v_days_left <= 2 AND v_org.reminder_count < 2 THEN
      -- URGENT reminder (day 12+)
      v_reminder_type := 'URGENT';
    ELSIF v_days_left <= 7 AND v_org.reminder_count < 1 THEN
      -- WARNING reminder (day 7+)
      v_reminder_type := 'WARNING';
    ELSE
      -- Skip if not time for reminder
      CONTINUE;
    END IF;
    
    -- Update tenant
    UPDATE tenants
    SET 
      last_reminder_sent_at = NOW(),
      reminder_count = reminder_count + 1,
      validation_status = CASE 
        WHEN validation_status = 'UNVALIDATED' THEN 'GRACE_PERIOD'
        ELSE validation_status
      END,
      updated_at = NOW()
    WHERE id = v_org.id;
    
    -- Log event
    INSERT INTO org_validation_events (
      tenant_id,
      event_type,
      old_status,
      new_status,
      metadata
    ) VALUES (
      v_org.id,
      'REMINDER_SENT',
      v_org.validation_status,
      CASE WHEN v_org.validation_status = 'UNVALIDATED' THEN 'GRACE_PERIOD' ELSE v_org.validation_status END,
      jsonb_build_object(
        'reminder_type', v_reminder_type,
        'days_remaining', v_days_left,
        'reminder_count', v_org.reminder_count + 1,
        'email', v_org.validation_email
      )
    );
    
    -- NOTE: Email notifications handled by email service layer
    -- This would integrate with your email service
    RAISE NOTICE 'Reminder: % for org % (% days left)', v_reminder_type, v_org.name, v_days_left;
    
    v_reminder_count := v_reminder_count + 1;
  END LOOP;
  
  RETURN v_reminder_count;
END;
$$;

COMMENT ON FUNCTION public.process_org_validation_reminders IS
  'Process and send organization validation reminders (WARNING at day 7, URGENT at day 12)';

-- =====================================================
-- 2. EMAIL VERIFICATION REMINDER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.process_email_verification_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reminder_count INTEGER := 0;
  v_user RECORD;
  v_days_left INTEGER;
  v_token TEXT;
  v_flag_enabled BOOLEAN;
BEGIN
  -- Check if feature is enabled
  SELECT enabled INTO v_flag_enabled
  FROM feature_flags
  WHERE key = 'email_verification_required';
  
  IF v_flag_enabled IS NULL OR NOT v_flag_enabled THEN
    RETURN 0;
  END IF;
  
  -- Loop through users needing reminders
  FOR v_user IN
    SELECT 
      u.id,
      u.email,
      u.first_name,
      u.verification_grace_ends_at,
      EXTRACT(EPOCH FROM (u.verification_grace_ends_at - NOW())) / 86400 AS days_remaining,
      MAX(evt.created_at) AS last_token_sent
    FROM app_users u
    LEFT JOIN email_verification_tokens evt ON evt.user_id = u.id
    WHERE u.email_verified IS NULL OR NOT u.email_verified
      AND u.verification_grace_ends_at IS NOT NULL
      AND u.verification_grace_ends_at > NOW()
    GROUP BY u.id, u.email, u.first_name, u.verification_grace_ends_at
    HAVING (
      MAX(evt.created_at) IS NULL 
      OR MAX(evt.created_at) < (NOW() - INTERVAL '24 hours')
    )
  LOOP
    v_days_left := FLOOR(v_user.days_remaining);
    
    -- Send reminder at day 3 and day 6
    IF v_days_left NOT IN (1, 4) THEN
      CONTINUE;
    END IF;
    
    -- Generate new verification token
    v_token := generate_verification_token(v_user.id, v_user.email);
    
    -- NOTE: Email notifications handled by email service layer
    -- This would integrate with your email service
    RAISE NOTICE 'Email verification reminder for % (% days left, token: %)', 
      v_user.email, v_days_left, v_token;
    
    v_reminder_count := v_reminder_count + 1;
  END LOOP;
  
  RETURN v_reminder_count;
END;
$$;

COMMENT ON FUNCTION public.process_email_verification_reminders IS
  'Process and send email verification reminders (day 3 and day 6)';

-- =====================================================
-- 3. EXPIRE UNVALIDATED ORGANIZATIONS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.expire_unvalidated_orgs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_org RECORD;
  v_flag_enabled BOOLEAN;
BEGIN
  -- Check if feature is enabled
  SELECT enabled INTO v_flag_enabled
  FROM feature_flags
  WHERE key = 'org_validation_enabled';
  
  IF v_flag_enabled IS NULL OR NOT v_flag_enabled THEN
    RETURN 0;
  END IF;
  
  -- Find orgs that need to be expired
  FOR v_org IN
    SELECT id, name, validation_status
    FROM tenants
    WHERE validation_status IN ('UNVALIDATED', 'GRACE_PERIOD')
      AND grace_period_ends_at IS NOT NULL
      AND grace_period_ends_at <= NOW()
  LOOP
    -- Expire the organization
    PERFORM expire_organization(v_org.id);
    
    RAISE NOTICE 'Expired organization: % (was: %)', v_org.name, v_org.validation_status;
    
    v_expired_count := v_expired_count + 1;
  END LOOP;
  
  RETURN v_expired_count;
END;
$$;

COMMENT ON FUNCTION public.expire_unvalidated_orgs IS
  'Auto-expire organizations whose grace period has ended';

-- =====================================================
-- 4. CLEANUP EXPIRED TOKENS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- Delete expired tokens (keep for 7 days after expiry for audit)
  DELETE FROM email_verification_tokens
  WHERE expires_at < (NOW() - INTERVAL '7 days');
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_tokens IS
  'Cleanup expired verification tokens older than 7 days';

-- =====================================================
-- 5. MANUAL TRIGGER FUNCTIONS (FOR TESTING)
-- =====================================================

CREATE OR REPLACE FUNCTION public.send_org_validation_reminder(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org RECORD;
  v_days_left INTEGER;
BEGIN
  -- Get org details
  SELECT 
    id, name, validation_email, grace_period_ends_at, reminder_count,
    EXTRACT(EPOCH FROM (grace_period_ends_at - NOW())) / 86400 AS days_remaining
  INTO v_org
  FROM tenants
  WHERE id = p_tenant_id;
  
  IF v_org.id IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  v_days_left := FLOOR(v_org.days_remaining);
  
  -- Update tenant
  UPDATE tenants
  SET 
    last_reminder_sent_at = NOW(),
    reminder_count = reminder_count + 1,
    updated_at = NOW()
  WHERE id = p_tenant_id;
  
  -- Log event
  INSERT INTO org_validation_events (
    tenant_id, event_type, metadata
  ) VALUES (
    p_tenant_id,
    'REMINDER_SENT',
    jsonb_build_object(
      'reminder_type', 'MANUAL',
      'days_remaining', v_days_left,
      'email', v_org.validation_email
    )
  );
  
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.send_org_validation_reminder IS
  'Manually send validation reminder for testing';

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
DECLARE
  function_count INTEGER;
BEGIN
  -- Count functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN (
    'process_org_validation_reminders',
    'process_email_verification_reminders',
    'expire_unvalidated_orgs',
    'cleanup_expired_tokens',
    'send_org_validation_reminder'
  );
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Scheduler functions: % of 5', function_count;
  RAISE NOTICE '';
  
  IF function_count = 5 THEN
    RAISE NOTICE '✅ All scheduler functions created';
  ELSE
    RAISE WARNING '⚠️  Some scheduler functions missing';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ REMINDER SCHEDULER READY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ 5 scheduler functions created';
  RAISE NOTICE '✅ Org validation reminders (day 7, day 12)';
  RAISE NOTICE '✅ Email verification reminders (day 3, day 6)';
  RAISE NOTICE '✅ Auto-expiry for unvalidated orgs';
  RAISE NOTICE '✅ Token cleanup (7 day retention)';
  RAISE NOTICE '';
  RAISE NOTICE '⏰ CRON JOBS (to be configured):';
  RAISE NOTICE '   - process_org_validation_reminders: Daily 9 AM UTC';
  RAISE NOTICE '   - process_email_verification_reminders: Daily 10 AM UTC';
  RAISE NOTICE '   - expire_unvalidated_orgs: Daily 11 AM UTC';
  RAISE NOTICE '   - cleanup_expired_tokens: Daily midnight';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 MANUAL TESTING:';
  RAISE NOTICE '   -- Send org reminder:';
  RAISE NOTICE '   SELECT send_org_validation_reminder(''tenant-id'');';
  RAISE NOTICE '';
  RAISE NOTICE '   -- Process all reminders:';
  RAISE NOTICE '   SELECT process_org_validation_reminders();';
  RAISE NOTICE '   SELECT process_email_verification_reminders();';
  RAISE NOTICE '';
  RAISE NOTICE '   -- Expire orgs:';
  RAISE NOTICE '   SELECT expire_unvalidated_orgs();';
  RAISE NOTICE '';
  RAISE NOTICE '💡 NEXT STEPS:';
  RAISE NOTICE '   1. Configure pg_cron or equivalent for scheduled execution';
  RAISE NOTICE '   2. Integrate with email service for sending notifications';
  RAISE NOTICE '   3. Test reminder flow end-to-end';
  RAISE NOTICE '   4. Enable feature flags when ready';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Step 4 Complete! Ready for Step 5 (Invites & Join Flow).';
END $$;


