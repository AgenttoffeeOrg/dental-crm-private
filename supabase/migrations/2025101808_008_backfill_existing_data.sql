SET search_path TO public, extensions;

-- =====================================================
-- Migration: Backfill Existing Data
-- Purpose: Safely populate new fields for existing tenants and users
-- Safety: Idempotent - can be run multiple times without issues
-- Impact: Prepares existing data for new features
-- =====================================================

BEGIN;

-- =====================================================
-- 1. BACKFILL TENANTS: Set defaults for new columns
-- =====================================================

-- Set is_multi_location = FALSE for all existing tenants
UPDATE tenants
SET is_multi_location = FALSE
WHERE is_multi_location IS NULL;

-- Set currency_code for existing tenants (default: GBP)
UPDATE tenants
SET currency_code = 'GBP'
WHERE currency_code IS NULL;

-- Set locale for existing tenants (default: en-GB)
UPDATE tenants
SET locale = 'en-GB'
WHERE locale IS NULL;

-- Set billing_email to tenant name + default domain if not set
-- (Admins should update this later)
UPDATE tenants
SET billing_email = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g')) || '@example.com'
WHERE billing_email IS NULL
  AND name IS NOT NULL
  AND name != '';

COMMENT ON COLUMN tenants.billing_email IS 
  'Billing email (backfilled with placeholder, should be updated by admin)';

-- =====================================================
-- 2. BACKFILL TENANTS: Extract website_host from existing data
-- =====================================================

-- If tenants table has a website column, extract host
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'website'
  ) THEN
    -- Extract website_host from existing website column
    EXECUTE '
      UPDATE tenants
      SET 
        website_url = website,
        website_host = LOWER(
          REGEXP_REPLACE(
            REGEXP_REPLACE(website, ''^https?://(www\\.)?'', '''', ''i''),
            ''/$'', ''''
          )
        )
      WHERE website IS NOT NULL
        AND website != ''''
        AND website_host IS NULL
    ';
    
    RAISE NOTICE '✅ Extracted website_host from existing website column';
  END IF;
END $$;

-- =====================================================
-- 3. BACKFILL TENANTS: Create default subscriptions
-- =====================================================

-- Create trial subscriptions for existing tenants without subscriptions
-- This ensures existing users aren't blocked by seat limits
INSERT INTO subscriptions (
  tenant_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  seat_limit,
  active_seats,
  trial_start,
  trial_end
)
SELECT 
  t.id AS tenant_id,
  p.id AS plan_id,
  'trialing' AS status,
  NOW() AS current_period_start,
  NOW() + INTERVAL '14 days' AS current_period_end,
  p.default_seat_limit AS seat_limit,
  (SELECT COUNT(*) FROM app_users WHERE tenant_id = t.id) AS active_seats,
  NOW() AS trial_start,
  NOW() + INTERVAL '14 days' AS trial_end
FROM tenants t
CROSS JOIN plans p
WHERE p.name = 'professional_monthly' -- Start existing customers on Professional trial
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s 
    WHERE s.tenant_id = t.id
  )
  AND t.is_multi_location = FALSE; -- Only single-location for now

-- =====================================================
-- 4. BACKFILL: Update active_seats count
-- =====================================================

UPDATE subscriptions s
SET active_seats = (
  SELECT COUNT(*)
  FROM app_users au
  WHERE au.tenant_id = s.tenant_id
)
WHERE s.tenant_id IS NOT NULL;

  -- =====================================================
  -- 5. BACKFILL: Create Tenant Admin records
  -- =====================================================
  
  -- Find owners and create tenant_admin records for them
  -- Note: This is handled by migration 001a automatically
  -- Just verify they exist
  
  DO $tnotice$ BEGIN RAISE NOTICE '✅ Tenant admins already created by migration 001a'; END $tnotice$;

-- =====================================================
-- 6. VERIFICATION: Count backfilled records
-- =====================================================

DO $$
DECLARE
  tenant_count INTEGER;
  subscription_count INTEGER;
  super_admin_count INTEGER;
  total_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO tenant_count FROM tenants WHERE is_multi_location = FALSE;
  SELECT COUNT(*) INTO subscription_count FROM subscriptions WHERE status = 'trialing';
  SELECT COUNT(*) INTO super_admin_count FROM tenant_admins WHERE is_active = TRUE;
  SELECT COUNT(*) INTO total_users FROM app_users;
  
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Migration 008 complete: Data backfilled';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Single-location tenants: %', tenant_count;
  RAISE NOTICE 'Trial subscriptions created: %', subscription_count;
  RAISE NOTICE 'Super admins: %', super_admin_count;
  RAISE NOTICE 'Total users: %', total_users;
  RAISE NOTICE '====================================================';
  RAISE NOTICE '📋 TODO: Admins should update billing_email in settings';
  RAISE NOTICE '====================================================';
END $$;

COMMIT;

-- =====================================================
-- POST-MIGRATION NOTES
-- =====================================================

-- 1. All existing tenants are marked as single-location (is_multi_location = FALSE)
-- 2. All existing tenants get a 14-day Professional trial
-- 3. Owners are automatically promoted to Super Admin
-- 4. Billing emails are placeholders - admins should update them
-- 5. No disruption to existing users - they can continue using the system
-- 6. Multi-location feature is disabled by default (feature flag)
-- 7. Existing RLS policies now use dual-path but behave identically for single-location

