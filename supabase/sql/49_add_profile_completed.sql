-- =====================================================
-- ADD PROFILE_COMPLETED COLUMN TO APP_USERS
-- =====================================================
-- This tracks whether a user has completed their profile setup
-- =====================================================

BEGIN;

-- Add profile_completed column to app_users table
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Existing users can be marked as completed (optional)
-- UPDATE app_users SET profile_completed = FALSE WHERE profile_completed IS NULL;

COMMIT;

