-- =====================================================
-- Migration: Create Dental Groups Table
-- Purpose: Parent entity for multi-location organizations
-- Safety: New table, no impact on existing data
-- Impact: Required for multi-location feature (5% of users)
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE DENTAL_GROUPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS dental_groups (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Group identity
  name TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  
  -- Contact information
  primary_email TEXT NOT NULL,
  phone TEXT,
  
  -- Website
  website_url TEXT,
  website_host TEXT UNIQUE,
  
  -- Billing (consolidated for all locations)
  billing_email TEXT NOT NULL,
  currency_code TEXT DEFAULT 'GBP' NOT NULL,
  locale TEXT DEFAULT 'en-GB' NOT NULL,
  
  -- Ownership (first Super Admin who creates the group)
  created_by_user_id UUID NOT NULL REFERENCES app_users(id),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Settings
  settings JSONB DEFAULT '{}'::JSONB NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT check_dg_currency_code CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT check_dg_locale CHECK (locale ~ '^[a-z]{2}-[A-Z]{2}$'),
  CONSTRAINT check_dg_primary_email CHECK (primary_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  CONSTRAINT check_dg_billing_email CHECK (billing_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

COMMENT ON TABLE dental_groups IS 'Parent entity for multi-location dental organizations';
COMMENT ON COLUMN dental_groups.name IS 'Internal name (e.g., "Smile Dental Group")';
COMMENT ON COLUMN dental_groups.display_name IS 'Public-facing name';
COMMENT ON COLUMN dental_groups.website_host IS 'Normalized domain (unique)';
COMMENT ON COLUMN dental_groups.billing_email IS 'Consolidated billing email for all locations';
COMMENT ON COLUMN dental_groups.created_by_user_id IS 'First Super Admin (group creator)';
COMMENT ON COLUMN dental_groups.settings IS 'Group-wide settings (features, preferences)';

-- =====================================================
-- 2. ADD FOREIGN KEY TO TENANTS TABLE
-- =====================================================

-- Now that dental_groups exists, add the foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_tenants_dental_group' 
      AND conrelid = 'tenants'::regclass
  ) THEN
    ALTER TABLE tenants 
      ADD CONSTRAINT fk_tenants_dental_group 
      FOREIGN KEY (dental_group_id) 
      REFERENCES dental_groups(id) 
      ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Added foreign key: fk_tenants_dental_group';
  ELSE
    RAISE NOTICE 'ℹ️  Foreign key fk_tenants_dental_group already exists, skipping';
  END IF;
END $$;

COMMENT ON CONSTRAINT fk_tenants_dental_group ON tenants IS 
  'Cascade delete: if group deleted, all locations become standalone';

-- =====================================================
-- 3. CREATE INDEXES (performance)
-- =====================================================

-- Index for website matching
CREATE INDEX IF NOT EXISTS idx_dental_groups_website_host 
  ON dental_groups(website_host) 
  WHERE website_host IS NOT NULL;

-- Index for creator lookup
CREATE INDEX IF NOT EXISTS idx_dental_groups_created_by 
  ON dental_groups(created_by_user_id);

-- Index for active groups
CREATE INDEX IF NOT EXISTS idx_dental_groups_active 
  ON dental_groups(is_active) 
  WHERE is_active = TRUE;

-- Full text search on name
CREATE INDEX IF NOT EXISTS idx_dental_groups_name_search 
  ON dental_groups USING gin(to_tsvector('english', name || ' ' || COALESCE(display_name, '')));

-- =====================================================
-- 4. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_dental_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_dental_groups_updated_at
  BEFORE UPDATE ON dental_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_dental_groups_updated_at();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE dental_groups ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see groups they belong to
-- (A user belongs to a group if they have access to ANY location in that group)
CREATE POLICY dental_groups_select_policy ON dental_groups
  FOR SELECT
  USING (
    id IN (
      -- Find all groups where user has access to at least one location
      SELECT DISTINCT t.dental_group_id
      FROM tenants t
      INNER JOIN app_users au ON au.tenant_id = t.id
      WHERE au.id = auth.uid()
        AND t.dental_group_id IS NOT NULL
    )
  );

-- Policy: Only group creator or Tenant Admins can update
CREATE POLICY dental_groups_update_policy ON dental_groups
  FOR UPDATE
  USING (
    -- Must be creator OR Tenant Admin of any location in the group
    created_by_user_id = auth.uid()
    OR
    id IN (
      SELECT DISTINCT t.dental_group_id
      FROM tenants t
      INNER JOIN app_users au ON au.tenant_id = t.id
      INNER JOIN tenant_admins ta ON ta.user_id = au.id AND ta.tenant_id = t.id
      WHERE au.id = auth.uid()
        AND t.dental_group_id IS NOT NULL
        AND ta.is_active = TRUE
    )
  );

-- Policy: Only Super Admins can create groups (via service role)
-- Service role bypasses RLS, so no INSERT policy needed for now

-- Policy: Only group creator can delete (extremely dangerous)
CREATE POLICY dental_groups_delete_policy ON dental_groups
  FOR DELETE
  USING (created_by_user_id = auth.uid());

COMMENT ON POLICY dental_groups_select_policy ON dental_groups IS 
  'Users can see groups they belong to (via location membership)';

-- =====================================================
-- 6. CREATE HELPER FUNCTION: Get user's dental groups
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_dental_groups(user_id UUID)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  location_count BIGINT,
  total_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dg.id AS group_id,
    dg.name AS group_name,
    COUNT(DISTINCT t.id) AS location_count,
    COUNT(DISTINCT au.id) AS total_users
  FROM dental_groups dg
  INNER JOIN tenants t ON t.dental_group_id = dg.id
  INNER JOIN app_users au ON au.tenant_id = t.id
  WHERE t.dental_group_id IN (
    -- User's groups
    SELECT DISTINCT t2.dental_group_id
    FROM tenants t2
    INNER JOIN app_users au2 ON au2.tenant_id = t2.id
    WHERE au2.id = user_id
      AND t2.dental_group_id IS NOT NULL
  )
  AND dg.is_active = TRUE
  GROUP BY dg.id, dg.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_dental_groups IS 
  'Get all dental groups a user belongs to, with location and user counts';

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 002 complete: dental_groups table created';
  RAISE NOTICE '🏢 Multi-location parent entity ready';
  RAISE NOTICE '🔒 RLS policies: Users see only their groups';
  RAISE NOTICE '⚡ Indexes: Optimized for group lookups';
END $$;

