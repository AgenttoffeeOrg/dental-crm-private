SET search_path TO public, extensions;

-- =====================================================
-- Migration: Extend Tenants Table
-- Purpose: Add fields for domain discovery, billing, and multi-location support
-- Safety: Backward compatible - all new columns are nullable or have defaults
-- Impact: ZERO on existing queries - additive only
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DOMAIN & WEBSITE FIELDS (for org discovery)
-- =====================================================

-- Website URL as entered by user
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Normalized website host for matching (e.g., "smithdental.com")
-- UNIQUE to prevent duplicate organizations
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website_host TEXT UNIQUE;

COMMENT ON COLUMN tenants.website_url IS 'User-entered website URL';
COMMENT ON COLUMN tenants.website_host IS 'Normalized domain for matching (unique, lowercased, no www)';

-- =====================================================
-- 2. MULTI-LOCATION FLAG (determines code path)
-- =====================================================

-- FALSE = single location (95% of orgs, fast queries)
-- TRUE = multi-location group (5% of orgs, complex queries)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_multi_location BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN tenants.is_multi_location IS 'Feature flag: TRUE for multi-location dental groups, FALSE for single-location practices';

-- =====================================================
-- 3. PARENT GROUP RELATIONSHIP (for multi-location only)
-- =====================================================

-- References dental_groups table (created in next migration)
-- NULL for single-location practices
-- Populated for locations in a multi-location group
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS dental_group_id UUID;

-- Location name (for multi-location: "Downtown", "Uptown")
-- NULL for single-location (location name = tenant name)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS location_name TEXT;

COMMENT ON COLUMN tenants.dental_group_id IS 'Parent group ID (NULL for single-location practices)';
COMMENT ON COLUMN tenants.location_name IS 'Location name within group (NULL for single-location)';

-- =====================================================
-- 4. BILLING & CURRENCY
-- =====================================================

-- Billing email (for invoices)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_email TEXT;

-- Currency code (ISO 4217: GBP, USD, EUR)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'GBP' NOT NULL;

-- Locale (for formatting: en-GB, en-US, etc.)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en-GB' NOT NULL;

COMMENT ON COLUMN tenants.billing_email IS 'Email for billing/invoices';
COMMENT ON COLUMN tenants.currency_code IS 'ISO 4217 currency code';
COMMENT ON COLUMN tenants.locale IS 'Locale for number/date formatting';

-- =====================================================
-- 5. VERIFICATION (domain ownership)
-- =====================================================

-- When domain was verified
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Verification method: 'email' | 'dns' | 'html'
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS verification_method TEXT;

-- Which user verified the domain
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS verified_by_user_id UUID REFERENCES app_users(id);

COMMENT ON COLUMN tenants.verified_at IS 'Timestamp of domain verification';
COMMENT ON COLUMN tenants.verification_method IS 'How domain was verified (email, dns, html)';

-- =====================================================
-- 6. SUBDOMAIN SUPPORT (future feature)
-- =====================================================

-- Unique subdomain: practice.dentalcrm.com
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;

-- Custom domain: crm.practice.com
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

COMMENT ON COLUMN tenants.subdomain IS 'Unique subdomain slug';
COMMENT ON COLUMN tenants.custom_domain IS 'Optional custom domain';

-- =====================================================
-- 7. CREATE INDEXES (performance optimization)
-- =====================================================

-- Index for domain matching (frequently queried)
CREATE INDEX IF NOT EXISTS idx_tenants_website_host 
  ON tenants(website_host) 
  WHERE website_host IS NOT NULL;

-- Index for subdomain routing
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain 
  ON tenants(subdomain) 
  WHERE subdomain IS NOT NULL;

-- Index for custom domain routing
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain 
  ON tenants(custom_domain) 
  WHERE custom_domain IS NOT NULL;

-- Index for multi-location lookups
CREATE INDEX IF NOT EXISTS idx_tenants_dental_group 
  ON tenants(dental_group_id) 
  WHERE dental_group_id IS NOT NULL;

-- Index for verification status
CREATE INDEX IF NOT EXISTS idx_tenants_verified 
  ON tenants(verified_at) 
  WHERE verified_at IS NOT NULL;

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_tenants_is_multi_location 
  ON tenants(is_multi_location, dental_group_id);

-- =====================================================
-- 8. ADD CHECK CONSTRAINTS (data integrity)
-- =====================================================

DO $$
BEGIN
  -- Verification method must be valid
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_verification_method' 
      AND conrelid = 'tenants'::regclass
  ) THEN
    ALTER TABLE tenants DROP CONSTRAINT IF EXISTS check_verification_method;
ALTER TABLE tenants ADD CONSTRAINT check_verification_method 
      CHECK (verification_method IN ('email', 'dns', 'html') OR verification_method IS NULL);
    RAISE NOTICE '✅ Added constraint: check_verification_method';
  ELSE
    RAISE NOTICE 'ℹ️  Constraint check_verification_method already exists, skipping';
  END IF;

  -- Currency code format (3 uppercase letters)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_currency_code' 
      AND conrelid = 'tenants'::regclass
  ) THEN
    ALTER TABLE tenants DROP CONSTRAINT IF EXISTS check_currency_code;
ALTER TABLE tenants ADD CONSTRAINT check_currency_code 
      CHECK (currency_code ~ '^[A-Z]{3}$');
    RAISE NOTICE '✅ Added constraint: check_currency_code';
  ELSE
    RAISE NOTICE 'ℹ️  Constraint check_currency_code already exists, skipping';
  END IF;

  -- Locale format (xx-XX)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_locale' 
      AND conrelid = 'tenants'::regclass
  ) THEN
    ALTER TABLE tenants DROP CONSTRAINT IF EXISTS check_locale;
ALTER TABLE tenants ADD CONSTRAINT check_locale 
      CHECK (locale ~ '^[a-z]{2}-[A-Z]{2}$');
    RAISE NOTICE '✅ Added constraint: check_locale';
  ELSE
    RAISE NOTICE 'ℹ️  Constraint check_locale already exists, skipping';
  END IF;
END $$;

-- Multi-location logic: if is_multi_location=TRUE, must have dental_group_id
-- (will be enforced after dental_groups table exists)

-- =====================================================
-- 9. UPDATE EXISTING RLS POLICIES
-- =====================================================

-- Existing RLS policies remain unchanged
-- They still work because they filter by tenant.id
-- New columns don't affect existing SELECT/INSERT/UPDATE/DELETE

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 001 complete: Tenants table extended';
  RAISE NOTICE '📊 New fields: website_url, website_host, is_multi_location, billing_email';
  RAISE NOTICE '🔒 Backward compatible: All new columns nullable or have defaults';
  RAISE NOTICE '⚡ Performance: Indexes created for common query patterns';
END $$;

