SET search_path TO public, extensions;

-- =====================================================
-- PHASE 1: ENHANCED ONBOARDING WIZARD - DATABASE SCHEMA
-- Migration 1 of 3: Update Account Type Enum
-- =====================================================
-- This migration updates the tenants table to use 'organization'
-- instead of 'practice' as the account type
-- =====================================================

BEGIN;

-- Step 1: Add new account_type values if they don't exist
-- This is done safely to handle existing data
DO $$ 
BEGIN
  -- Check if we need to modify the account_type column
  -- If it's a CHECK constraint, we'll need to drop and recreate it
  
  -- First, ensure the column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' 
    AND column_name = 'account_type'
  ) THEN
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'organization';
  END IF;

  -- Update any existing 'practice' values to 'organization'
  UPDATE tenants SET account_type = 'organization' WHERE account_type = 'practice';
  
  -- Update any NULL values to 'organization'
  UPDATE tenants SET account_type = 'organization' WHERE account_type IS NULL;

END $$;

-- Step 2: Add check constraint for valid account types
-- Drop existing constraint if it exists
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_account_type_check;

-- Add new constraint with updated values
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_account_type_check;
ALTER TABLE tenants ADD CONSTRAINT tenants_account_type_check 
  CHECK (account_type IN ('organization', 'solo'));

-- Step 3: Add comment for documentation
COMMENT ON COLUMN tenants.account_type IS 
  'Type of account: organization (for companies/practices with team) or solo (for individual users)';

-- Step 4: CREATE INDEX IF NOT EXISTS for better query performance
CREATE INDEX IF NOT EXISTS idx_tenants_account_type ON tenants(account_type);

-- Step 5: Log the migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20251026_01_update_account_type completed successfully';
  RAISE NOTICE '   - Updated account_type enum: practice → organization';
  RAISE NOTICE '   - Added constraint for organization/solo values';
  RAISE NOTICE '   - Created index on account_type';
END $$;

COMMIT;

