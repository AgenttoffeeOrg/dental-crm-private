SET search_path TO public, extensions;

-- =====================================================
-- PHASE 1: USER PROFILE ENHANCEMENT
-- Migration: Add comprehensive user profile fields
-- Date: 2025-10-26
-- =====================================================

-- Add new columns to app_users table for enhanced profile
ALTER TABLE app_users 
  ADD COLUMN IF NOT EXISTS professional_title TEXT,
  ADD COLUMN IF NOT EXISTS phone_mobile TEXT,
  ADD COLUMN IF NOT EXISTS phone_office TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/London',
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'DD/MM/YYYY',
  ADD COLUMN IF NOT EXISTS time_format TEXT DEFAULT '24h',
  ADD COLUMN IF NOT EXISTS working_hours_json JSONB,
  ADD COLUMN IF NOT EXISTS email_signature TEXT,
  ADD COLUMN IF NOT EXISTS sms_signature TEXT,
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_updated_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster lookups by tenant
CREATE INDEX IF NOT EXISTS idx_app_users_tenant_id ON app_users(tenant_id);

-- Add index for profile photo URL lookups
CREATE INDEX IF NOT EXISTS idx_app_users_photo ON app_users(profile_photo_url) WHERE profile_photo_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN app_users.professional_title IS 'User job title or professional designation (e.g., Senior Dentist, Practice Manager)';
COMMENT ON COLUMN app_users.phone_mobile IS 'Personal mobile phone number';
COMMENT ON COLUMN app_users.phone_office IS 'Office/work phone number';
COMMENT ON COLUMN app_users.bio IS 'User biography or about me section';
COMMENT ON COLUMN app_users.profile_photo_url IS 'URL to profile photo in Supabase storage';
COMMENT ON COLUMN app_users.timezone IS 'User preferred timezone (IANA format)';
COMMENT ON COLUMN app_users.language IS 'User preferred language (ISO 639-1 code)';
COMMENT ON COLUMN app_users.date_format IS 'Preferred date format (e.g., DD/MM/YYYY, MM/DD/YYYY)';
COMMENT ON COLUMN app_users.time_format IS 'Preferred time format (12h or 24h)';
COMMENT ON COLUMN app_users.working_hours_json IS 'Working hours/availability in JSON format';
COMMENT ON COLUMN app_users.email_signature IS 'User email signature HTML/text';
COMMENT ON COLUMN app_users.sms_signature IS 'User SMS signature text';
COMMENT ON COLUMN app_users.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN app_users.profile_updated_at IS 'Last time profile was updated';

-- CREATE OR REPLACE TRIGGER to auto-update profile_updated_at
CREATE OR REPLACE FUNCTION update_app_users_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_app_users_profile_timestamp_trigger ON app_users;
CREATE OR REPLACE TRIGGER update_app_users_profile_timestamp_trigger
  BEFORE UPDATE ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION update_app_users_profile_timestamp();

-- Grant necessary permissions (adjust as needed for your RLS setup)
-- Users should be able to read their own profile
-- Users should be able to update their own profile
-- This will be enforced by RLS policies

COMMENT ON TABLE app_users IS 'Extended user profiles with personal preferences, work information, and communication settings';

-- Verification query
DO $$
BEGIN
  RAISE NOTICE '✅ User profile enhancement migration complete!';
  RAISE NOTICE 'New columns added:';
  RAISE NOTICE '  - professional_title, phone_mobile, phone_office';
  RAISE NOTICE '  - bio, profile_photo_url';
  RAISE NOTICE '  - timezone, language, date_format, time_format';
  RAISE NOTICE '  - working_hours_json';
  RAISE NOTICE '  - email_signature, sms_signature';
  RAISE NOTICE '  - two_factor_enabled, profile_updated_at';
  RAISE NOTICE 'Indexes created for performance';
  RAISE NOTICE 'Auto-update trigger created for profile_updated_at';
END $$;

