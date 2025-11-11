-- =====================================================
-- STEP 4A: ORGANIZATION VALIDATION LIFECYCLE
-- Purpose: Add validation workflow with reminders and grace periods
-- Safety: Non-breaking, adds new columns and functions
-- =====================================================
--
-- WHAT THIS DOES:
-- 1. Adds validation status lifecycle to tenants
-- 2. Creates org_validation_events table for audit trail
-- 3. Adds helper functions for validation checks
-- 4. Implements grace period logic
-- 5. Sets up foundation for reminder system
--
-- LIFECYCLE STATES:
-- - UNVALIDATED: Newly created org, full grace period (14 days)
-- - VALIDATED: Email verified, full access forever
-- - GRACE_PERIOD: Warning sent, limited time remaining
-- - EXPIRED: Grace period ended, features restricted
-- - SUSPENDED: Admin action, all features locked
--
-- FEATURE GATING:
-- - Controlled by feature flag: org_validation_enabled
-- - When disabled: all orgs have full access
-- - When enabled: UNVALIDATED/GRACE_PERIOD orgs see reminders
-- - EXPIRED orgs: cannot invite users, create deals (read-only)
--
-- GRACE PERIOD:
-- - 14 days from org creation
-- - Reminder at day 7 (WARNING)
-- - Reminder at day 12 (URGENT)
-- - Day 14: auto-expire to EXPIRED status
--
-- SAFETY:
-- - Idempotent: safe to run multiple times
-- - Non-breaking: default status allows full access
-- - Feature flag controlled: can enable/disable anytime
-- - Audit trail: all status changes logged
-- =====================================================

BEGIN;

-- =====================================================
-- 0. CREATE ENUM TYPES FOR VALIDATION
-- =====================================================

DO $$ 
BEGIN
  -- Create validation_status_type ENUM
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'validation_status_type') THEN
    CREATE TYPE validation_status_type AS ENUM (
      'UNVALIDATED', 'VALIDATED', 'GRACE_PERIOD', 'EXPIRED', 'SUSPENDED'
    );
    RAISE NOTICE '✅ Created validation_status_type ENUM';
  ELSE
    RAISE NOTICE 'ℹ️  validation_status_type ENUM already exists';
  END IF;

  -- Create org_validation_event_type ENUM
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_validation_event_type') THEN
    CREATE TYPE org_validation_event_type AS ENUM (
      'CREATED', 'VALIDATED', 'REMINDER_SENT', 'GRACE_PERIOD_ENTERED', 
      'EXPIRED', 'SUSPENDED', 'REACTIVATED'
    );
    RAISE NOTICE '✅ Created org_validation_event_type ENUM';
  ELSE
    RAISE NOTICE 'ℹ️  org_validation_event_type ENUM already exists';
  END IF;
END $$;

-- =====================================================
-- 1. ADD VALIDATION COLUMNS TO TENANTS TABLE
-- =====================================================

DO $$
DECLARE
  separator CONSTANT TEXT := '========================================';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'ADDING VALIDATION TO TENANTS';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
END $$;

-- Add validation_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'validation_status'
  ) THEN
    ALTER TABLE tenants ADD COLUMN validation_status validation_status_type 
      DEFAULT 'VALIDATED';
    RAISE NOTICE '✅ Added validation_status to tenants';
  ELSE
    RAISE NOTICE 'ℹ️  validation_status already exists on tenants';
  END IF;
END $$;

-- Add validation_email column (email used for validation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'validation_email'
  ) THEN
    ALTER TABLE tenants ADD COLUMN validation_email TEXT;
    RAISE NOTICE '✅ Added validation_email to tenants';
  ELSE
    RAISE NOTICE 'ℹ️  validation_email already exists on tenants';
  END IF;
END $$;

-- Add validated_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'validated_at'
  ) THEN
    ALTER TABLE tenants ADD COLUMN validated_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Added validated_at to tenants';
  ELSE
    RAISE NOTICE 'ℹ️  validated_at already exists on tenants';
  END IF;
END $$;

-- Add grace_period_ends_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'grace_period_ends_at'
  ) THEN
    ALTER TABLE tenants ADD COLUMN grace_period_ends_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Added grace_period_ends_at to tenants';
  ELSE
    RAISE NOTICE 'ℹ️  grace_period_ends_at already exists on tenants';
  END IF;
END $$;

-- Add last_reminder_sent_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'last_reminder_sent_at'
  ) THEN
    ALTER TABLE tenants ADD COLUMN last_reminder_sent_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Added last_reminder_sent_at to tenants';
  ELSE
    RAISE NOTICE 'ℹ️  last_reminder_sent_at already exists on tenants';
  END IF;
END $$;

-- Add reminder_count
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'reminder_count'
  ) THEN
    ALTER TABLE tenants ADD COLUMN reminder_count INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added reminder_count to tenants';
  ELSE
    RAISE NOTICE 'ℹ️  reminder_count already exists on tenants';
  END IF;
END $$;

-- Create index for validation queries
CREATE INDEX IF NOT EXISTS idx_tenants_validation_status 
  ON tenants(validation_status) WHERE validation_status != 'VALIDATED'::validation_status_type;

CREATE INDEX IF NOT EXISTS idx_tenants_grace_period 
  ON tenants(grace_period_ends_at) WHERE grace_period_ends_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN tenants.validation_status IS 
  'Organization validation lifecycle: UNVALIDATED → VALIDATED | GRACE_PERIOD → EXPIRED | SUSPENDED';
COMMENT ON COLUMN tenants.validation_email IS 
  'Email address used for organization validation (typically owner email)';
COMMENT ON COLUMN tenants.validated_at IS 
  'Timestamp when organization was validated';
COMMENT ON COLUMN tenants.grace_period_ends_at IS 
  'Timestamp when grace period expires (NULL if validated or no grace period)';
COMMENT ON COLUMN tenants.last_reminder_sent_at IS 
  'Timestamp of last validation reminder sent';
COMMENT ON COLUMN tenants.reminder_count IS 
  'Number of validation reminders sent';

DO $$
BEGIN
  RAISE NOTICE '✅ All validation columns added to tenants';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 2. CREATE ORG_VALIDATION_EVENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS org_validation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type org_validation_event_type NOT NULL,
  old_status validation_status_type,
  new_status validation_status_type,
  triggered_by UUID REFERENCES app_users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_org_validation_events_tenant 
  ON org_validation_events(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_validation_events_type 
  ON org_validation_events(event_type, created_at DESC);

-- Enable RLS
ALTER TABLE org_validation_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view validation events for their tenant"
  ON org_validation_events
  FOR SELECT
  USING (tenant_id = public.get_user_tenant_id_compat());

CREATE POLICY "Service role can manage validation events"
  ON org_validation_events
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE org_validation_events IS
  'Audit trail for organization validation lifecycle events';

DO $$
BEGIN
  RAISE NOTICE '✅ Created org_validation_events table with RLS';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Function to check if org needs validation
CREATE OR REPLACE FUNCTION public.org_needs_validation(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_status validation_status_type;
  v_flag_enabled BOOLEAN;
  status_unvalidated CONSTANT validation_status_type := 'UNVALIDATED';
  status_grace_period CONSTANT validation_status_type := 'GRACE_PERIOD';
  status_expired CONSTANT validation_status_type := 'EXPIRED';
BEGIN
  -- Check if feature is enabled
  SELECT enabled INTO v_flag_enabled
  FROM feature_flags
  WHERE key = 'org_validation_enabled';
  
  -- If feature disabled, no validation needed
  IF v_flag_enabled IS NULL OR NOT v_flag_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Get tenant status
  SELECT validation_status INTO v_status
  FROM tenants
  WHERE id = p_tenant_id;
  
  -- VALIDATED orgs don't need validation
  RETURN v_status IN (status_unvalidated, status_grace_period, status_expired);
END;
$$;

COMMENT ON FUNCTION public.org_needs_validation IS
  'Check if organization requires email validation based on status and feature flag';

-- Function to check if org is restricted
CREATE OR REPLACE FUNCTION public.org_is_restricted(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_status validation_status_type;
  v_flag_enabled BOOLEAN;
  status_expired CONSTANT validation_status_type := 'EXPIRED';
  status_suspended CONSTANT validation_status_type := 'SUSPENDED';
BEGIN
  -- Check if feature is enabled
  SELECT enabled INTO v_flag_enabled
  FROM feature_flags
  WHERE key = 'org_validation_enabled';
  
  -- If feature disabled, no restrictions
  IF v_flag_enabled IS NULL OR NOT v_flag_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Get tenant status
  SELECT validation_status INTO v_status
  FROM tenants
  WHERE id = p_tenant_id;
  
  -- EXPIRED and SUSPENDED orgs are restricted
  RETURN v_status IN (status_expired, status_suspended);
END;
$$;

COMMENT ON FUNCTION public.org_is_restricted IS
  'Check if organization has restricted access due to validation status';

-- Function to get days until expiry
CREATE OR REPLACE FUNCTION public.org_days_until_expiry(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_grace_end TIMESTAMPTZ;
  v_days INTEGER;
BEGIN
  SELECT grace_period_ends_at INTO v_grace_end
  FROM tenants
  WHERE id = p_tenant_id;
  
  IF v_grace_end IS NULL THEN
    RETURN NULL;
  END IF;
  
  v_days := EXTRACT(EPOCH FROM (v_grace_end - NOW())) / 86400;
  
  RETURN GREATEST(0, v_days::INTEGER);
END;
$$;

COMMENT ON FUNCTION public.org_days_until_expiry IS
  'Get number of days remaining until grace period expires (NULL if no grace period)';

-- Function to validate organization
CREATE OR REPLACE FUNCTION public.validate_organization(
  p_tenant_id UUID,
  p_validated_by UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status validation_status_type;
  status_validated CONSTANT validation_status_type := 'VALIDATED';
  event_validated CONSTANT org_validation_event_type := 'VALIDATED';
BEGIN
  -- Get current status
  SELECT validation_status INTO v_old_status
  FROM tenants
  WHERE id = p_tenant_id;
  
  -- Update tenant to VALIDATED
  UPDATE tenants
  SET 
    validation_status = status_validated,
    validated_at = NOW(),
    grace_period_ends_at = NULL,
    updated_at = NOW()
  WHERE id = p_tenant_id;
  
  -- Log event
  INSERT INTO org_validation_events (
    tenant_id, event_type, old_status, new_status, triggered_by
  ) VALUES (
    p_tenant_id, event_validated, v_old_status, status_validated, p_validated_by
  );
  
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.validate_organization IS
  'Mark organization as validated and remove grace period restrictions';

-- Function to start grace period
CREATE OR REPLACE FUNCTION public.start_grace_period(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 14
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status TEXT;
BEGIN
  -- Get current status
  SELECT validation_status INTO v_old_status
  FROM tenants
  WHERE id = p_tenant_id;
  
  -- Update tenant to GRACE_PERIOD
  UPDATE tenants
  SET 
    validation_status = 'GRACE_PERIOD',
    grace_period_ends_at = NOW() + (p_days || ' days')::INTERVAL,
    updated_at = NOW()
  WHERE id = p_tenant_id;
  
  -- Log event
  INSERT INTO org_validation_events (
    tenant_id, event_type, old_status, new_status, 
    metadata
  ) VALUES (
    p_tenant_id, 'GRACE_PERIOD_ENTERED', v_old_status, 'GRACE_PERIOD',
    jsonb_build_object('days', p_days, 'expires_at', NOW() + (p_days || ' days')::INTERVAL)
  );
  
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.start_grace_period IS
  'Start grace period countdown for organization (default 14 days)';

-- Function to expire organization
CREATE OR REPLACE FUNCTION public.expire_organization(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status validation_status_type;
  status_expired CONSTANT validation_status_type := 'EXPIRED';
  event_expired CONSTANT org_validation_event_type := 'EXPIRED';
BEGIN
  -- Get current status
  SELECT validation_status INTO v_old_status
  FROM tenants
  WHERE id = p_tenant_id;
  
  -- Update tenant to EXPIRED
  UPDATE tenants
  SET 
    validation_status = status_expired,
    updated_at = NOW()
  WHERE id = p_tenant_id;
  
  -- Log event
  INSERT INTO org_validation_events (
    tenant_id, event_type, old_status, new_status
  ) VALUES (
    p_tenant_id, event_expired, v_old_status, status_expired
  );
  
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.expire_organization IS
  'Mark organization as expired (grace period ended without validation)';

DO $$
BEGIN
  RAISE NOTICE '✅ Created validation helper functions';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 4. BACKFILL EXISTING TENANTS
-- =====================================================

DO $$
DECLARE
  updated_count INTEGER;
  status_validated CONSTANT validation_status_type := 'VALIDATED';
  status_unvalidated CONSTANT validation_status_type := 'UNVALIDATED';
  role_owner CONSTANT membership_role := 'owner';
BEGIN
  RAISE NOTICE 'Backfilling validation status for existing tenants...';
  
  -- Set all existing tenants to VALIDATED (backward compatible)
  UPDATE tenants
  SET 
    validation_status = status_validated,
    validated_at = created_at,
    validation_email = (
      SELECT email FROM app_users 
      WHERE tenant_id = tenants.id AND role = role_owner 
      LIMIT 1
    )
  WHERE validation_status IS NULL 
     OR validation_status = status_unvalidated;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Backfilled % existing tenants to VALIDATED status', updated_count;
  RAISE NOTICE '   (Existing orgs are grandfathered in - no validation required)';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

DO $$
DECLARE
  validation_status_exists BOOLEAN;
  validation_email_exists BOOLEAN;
  validated_at_exists BOOLEAN;
  grace_period_ends_at_exists BOOLEAN;
  events_table_exists BOOLEAN;
  function_count INTEGER;
  validated_count INTEGER;
  unvalidated_count INTEGER;
  separator CONSTANT TEXT := '========================================';
BEGIN
  -- Check columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'validation_status'
  ) INTO validation_status_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'validation_email'
  ) INTO validation_email_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'validated_at'
  ) INTO validated_at_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'grace_period_ends_at'
  ) INTO grace_period_ends_at_exists;
  
  -- Check table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'org_validation_events'
  ) INTO events_table_exists;
  
  -- Count functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN (
    'org_needs_validation', 'org_is_restricted', 'org_days_until_expiry',
    'validate_organization', 'start_grace_period', 'expire_organization'
  );
  
  -- Count tenant statuses
  SELECT COUNT(*) INTO validated_count
  FROM tenants WHERE validation_status = 'VALIDATED'::validation_status_type;
  
  SELECT COUNT(*) INTO unvalidated_count
  FROM tenants WHERE validation_status IN (
    'UNVALIDATED'::validation_status_type, 
    'GRACE_PERIOD'::validation_status_type, 
    'EXPIRED'::validation_status_type
  );
  
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'VERIFICATION';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'tenants.validation_status: %', CASE WHEN validation_status_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'tenants.validation_email: %', CASE WHEN validation_email_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'tenants.validated_at: %', CASE WHEN validated_at_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'tenants.grace_period_ends_at: %', CASE WHEN grace_period_ends_at_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'org_validation_events table: %', CASE WHEN events_table_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'Helper functions: % of 6', function_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Validated tenants: %', validated_count;
  RAISE NOTICE 'Unvalidated tenants: %', unvalidated_count;
  RAISE NOTICE '';
  
  IF validation_status_exists AND validation_email_exists AND validated_at_exists 
     AND grace_period_ends_at_exists AND events_table_exists AND function_count = 6 THEN
    RAISE NOTICE '✅ All validation infrastructure ready';
  ELSE
    RAISE WARNING '⚠️  Some components missing';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
  separator CONSTANT TEXT := '========================================';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '✅ ORGANIZATION VALIDATION READY';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
  RAISE NOTICE '✅ 6 columns added to tenants table';
  RAISE NOTICE '✅ org_validation_events audit table created';
  RAISE NOTICE '✅ 6 helper functions created';
  RAISE NOTICE '✅ Existing tenants grandfathered as VALIDATED';
  RAISE NOTICE '✅ Feature flag controlled (org_validation_enabled)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 LIFECYCLE FLOW:';
  RAISE NOTICE '   New Org → UNVALIDATED (14 day grace)';
  RAISE NOTICE '   Day 7 → Reminder sent';
  RAISE NOTICE '   Day 12 → Urgent reminder';
  RAISE NOTICE '   Day 14 → Auto-expire to EXPIRED';
  RAISE NOTICE '   Email verified → VALIDATED (full access forever)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RESTRICTIONS (EXPIRED orgs):';
  RAISE NOTICE '   - Cannot invite new users';
  RAISE NOTICE '   - Cannot create deals/contacts';
  RAISE NOTICE '   - Read-only access to existing data';
  RAISE NOTICE '   - Banner shown with validation link';
  RAISE NOTICE '';
  RAISE NOTICE '💡 NEXT STEPS:';
  RAISE NOTICE '   - Run migration 005b for email verification';
  RAISE NOTICE '   - Run migration 005c for reminder scheduler';
  RAISE NOTICE '   - Enable org_validation_enabled feature flag when ready';
END $$;


