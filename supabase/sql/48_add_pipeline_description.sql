-- =====================================================
-- ADD DESCRIPTION FIELD TO PIPELINES TABLE
-- =====================================================
-- This fixes the 400 error when creating pipelines during sign-up and onboarding
-- =====================================================

BEGIN;

-- Add description column to pipelines table
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS description TEXT;

-- Add default description to existing pipelines
UPDATE pipelines SET description = 'Sales pipeline' WHERE description IS NULL;

COMMIT;

