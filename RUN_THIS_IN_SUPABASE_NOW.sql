-- =====================================================
-- URGENT: FIX METADATA COLUMN ERROR
-- =====================================================
-- Run this in your Supabase SQL Editor to fix the sign-up error
-- =====================================================

BEGIN;

-- Add metadata column to tenants table if it doesn't exist
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add any other missing columns that might be referenced
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'practice';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'starter';

-- Add missing columns to app_users table if needed
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Update any existing tenants to have default metadata
UPDATE tenants SET metadata = '{}' WHERE metadata IS NULL;

-- Update any existing app_users to have default metadata
UPDATE app_users SET metadata = '{}' WHERE metadata IS NULL;

COMMIT;
