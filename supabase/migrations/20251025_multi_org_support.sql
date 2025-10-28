-- =====================================================
-- MIGRATION: Enable Multi-Organization Memberships
-- Purpose: Change app_users to support multiple orgs per user
-- Date: October 25, 2025
-- =====================================================

BEGIN;

-- Step 1: Drop the existing primary key constraint
ALTER TABLE app_users DROP CONSTRAINT app_users_pkey;

-- Step 2: Add a new composite primary key on (id, tenant_id)
-- This allows one user to have multiple app_users records (one per tenant)
ALTER TABLE app_users ADD PRIMARY KEY (id, tenant_id);

-- Step 3: Create an index on id for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_users_id ON app_users(id);

-- Step 4: Create an index on tenant_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_users_tenant_id ON app_users(tenant_id);

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ app_users table updated for multi-org support';
  RAISE NOTICE '🔑 Primary key changed to (id, tenant_id)';
  RAISE NOTICE '📊 Users can now belong to multiple organizations';
END $$;

