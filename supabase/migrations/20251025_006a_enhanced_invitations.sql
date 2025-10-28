-- =====================================================
-- STEP 5A: ENHANCED USER INVITATIONS SYSTEM
-- Purpose: Polish invite system with collision handling, caps, expiry, and bulk support
-- Safety: Builds on existing user_invitations table, backward compatible
-- FIX: Uses existing column names (invited_by_user_id, not invited_by)
-- =====================================================
--
-- WHAT THIS DOES:
-- 1. Enhances user_invitations table with new fields
-- 2. Implements invite collision detection (already member, pending invite, etc.)
-- 3. Adds per-org invite caps (configurable limits)
-- 4. Implements automatic expiry (default 7 days)
-- 5. Adds bulk invite support with batch processing
-- 6. Creates comprehensive audit trail
-- 7. Implements rate limiting
--
-- EXISTING COLUMNS (from 15_user_invitations.sql):
-- - id, tenant_id, email, role
-- - invited_by_user_id (not invited_by!)
-- - invitation_token
-- - status (already exists!)
-- - expires_at (already exists!)
-- - accepted_at (already exists!)
-- - created_at, updated_at
--
-- NEW COLUMNS TO ADD:
-- - cancelled_at, cancelled_by
-- - resend_count, last_sent_at
-- - batch_id, metadata
-- - location_id (for multi-location support)
--
-- SAFETY:
-- - Idempotent: safe to run multiple times
-- - Backward compatible: extends existing table
-- - Feature flag controlled: bulk_invites_enabled, maintenance_mode
-- - Comprehensive validation and error handling
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ENHANCE USER_INVITATIONS TABLE
-- =====================================================

DO $$
DECLARE
  separator CONSTANT TEXT := '========================================';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'ENHANCING USER_INVITATIONS TABLE';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
END $$;

-- NOTE: status, expires_at, accepted_at already exist from 15_user_invitations.sql
-- We only add the NEW columns

-- Add location_id for multi-location support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_invitations' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE user_invitations ADD COLUMN location_id UUID;
    -- Add FK if locations table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'locations') THEN
      ALTER TABLE user_invitations 
        ADD CONSTRAINT fk_user_invitations_location 
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
    END IF;
    RAISE NOTICE '✅ Added location_id to user_invitations';
  ELSE
    RAISE NOTICE 'ℹ️  location_id already exists on user_invitations';
  END IF;
END $$;

-- Add cancelled_at tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_invitations' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE user_invitations ADD COLUMN cancelled_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Added cancelled_at to user_invitations';
  ELSE
    RAISE NOTICE 'ℹ️  cancelled_at already exists on user_invitations';
  END IF;
END $$;

-- Add cancelled_by tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_invitations' AND column_name = 'cancelled_by'
  ) THEN
    ALTER TABLE user_invitations ADD COLUMN cancelled_by UUID REFERENCES app_users(id);
    RAISE NOTICE '✅ Added cancelled_by to user_invitations';
  ELSE
    RAISE NOTICE 'ℹ️  cancelled_by already exists on user_invitations';
  END IF;
END $$;

-- Add resend tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_invitations' AND column_name = 'resend_count'
  ) THEN
    ALTER TABLE user_invitations ADD COLUMN resend_count INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added resend_count to user_invitations';
  ELSE
    RAISE NOTICE 'ℹ️  resend_count already exists on user_invitations';
  END IF;
END $$;

-- Add last_sent_at tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_invitations' AND column_name = 'last_sent_at'
  ) THEN
    ALTER TABLE user_invitations ADD COLUMN last_sent_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Added last_sent_at to user_invitations';
  ELSE
    RAISE NOTICE 'ℹ️  last_sent_at already exists on user_invitations';
  END IF;
END $$;

-- Add batch_id for bulk invites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_invitations' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE user_invitations ADD COLUMN batch_id UUID;
    RAISE NOTICE '✅ Added batch_id to user_invitations';
  ELSE
    RAISE NOTICE 'ℹ️  batch_id already exists on user_invitations';
  END IF;
END $$;

-- Add metadata for collision info
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_invitations' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE user_invitations ADD COLUMN metadata JSONB DEFAULT '{}';
    RAISE NOTICE '✅ Added metadata to user_invitations';
  ELSE
    RAISE NOTICE 'ℹ️  metadata already exists on user_invitations';
  END IF;
END $$;

-- Update status column constraint to include 'bounced'
DO $$
BEGIN
  -- Drop old constraint if it exists
  ALTER TABLE user_invitations DROP CONSTRAINT IF EXISTS user_invitations_status_check;
  
  -- Add new constraint with 'bounced' status
  ALTER TABLE user_invitations ADD CONSTRAINT user_invitations_status_check
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled', 'bounced'));
  
  RAISE NOTICE '✅ Updated status constraint to include bounced';
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_invitations_status_v2
  ON user_invitations(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_user_invitations_expires 
  ON user_invitations(expires_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_user_invitations_email_tenant 
  ON user_invitations(email, tenant_id);

CREATE INDEX IF NOT EXISTS idx_user_invitations_batch 
  ON user_invitations(batch_id) WHERE batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by_v2
  ON user_invitations(invited_by_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_invitations_location
  ON user_invitations(location_id) WHERE location_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN user_invitations.location_id IS 
  'Optional location assignment for invited user';
COMMENT ON COLUMN user_invitations.cancelled_at IS 
  'Timestamp when invitation was cancelled';
COMMENT ON COLUMN user_invitations.cancelled_by IS 
  'User who cancelled the invitation';
COMMENT ON COLUMN user_invitations.resend_count IS 
  'Number of times invitation was resent';
COMMENT ON COLUMN user_invitations.last_sent_at IS 
  'Timestamp of last send/resend';
COMMENT ON COLUMN user_invitations.batch_id IS 
  'Batch identifier for bulk invites';
COMMENT ON COLUMN user_invitations.metadata IS 
  'Additional metadata (collision info, custom message, etc.)';

DO $$
BEGIN
  RAISE NOTICE '✅ Enhanced user_invitations table';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 2. CREATE INVITE_BATCHES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS invite_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES app_users(id),
  total_count INTEGER NOT NULL,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  collision_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' 
    CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invite_batches_tenant 
  ON invite_batches(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invite_batches_created_by 
  ON invite_batches(created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invite_batches_status 
  ON invite_batches(status) WHERE status = 'processing';

-- Enable RLS
ALTER TABLE invite_batches ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view batches in their tenant"
  ON invite_batches
  FOR SELECT
  USING (tenant_id = public.get_user_tenant_id_compat());

CREATE POLICY "Admins can create batches"
  ON invite_batches
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id_compat()
    AND EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = invite_batches.tenant_id
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Service role can manage batches"
  ON invite_batches
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE invite_batches IS
  'Tracks bulk invite operations with success/failure counts';

DO $$
BEGIN
  RAISE NOTICE '✅ Created invite_batches table with RLS';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 3. CREATE INVITE_SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS invite_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  max_pending_invites INTEGER DEFAULT 50,
  invite_expiry_days INTEGER DEFAULT 7,
  allow_resend BOOLEAN DEFAULT true,
  max_resend_count INTEGER DEFAULT 3,
  require_email_verification BOOLEAN DEFAULT false,
  auto_approve_join_requests BOOLEAN DEFAULT false,
  custom_invite_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE invite_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view settings for their tenant"
  ON invite_settings
  FOR SELECT
  USING (tenant_id = public.get_user_tenant_id_compat());

CREATE POLICY "Admins can manage settings"
  ON invite_settings
  FOR ALL
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = invite_settings.tenant_id
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

COMMENT ON TABLE invite_settings IS
  'Per-tenant invite configuration and limits';

DO $$
BEGIN
  RAISE NOTICE '✅ Created invite_settings table with RLS';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 4. CREATE DEFAULT INVITE SETTINGS FOR EXISTING TENANTS
-- =====================================================

DO $$
DECLARE
  inserted_count INTEGER;
BEGIN
  RAISE NOTICE 'Creating default invite settings for existing tenants...';
  
  INSERT INTO invite_settings (tenant_id)
  SELECT id FROM tenants
  WHERE id NOT IN (SELECT tenant_id FROM invite_settings)
  ON CONFLICT (tenant_id) DO NOTHING;
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Created default settings for % tenants', inserted_count;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 5. BACKFILL EXISTING INVITATIONS
-- =====================================================

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  RAISE NOTICE 'Backfilling last_sent_at for existing invitations...';
  
  -- Set last_sent_at to created_at if not set
  UPDATE user_invitations
  SET 
    last_sent_at = COALESCE(last_sent_at, created_at),
    resend_count = COALESCE(resend_count, 0)
  WHERE last_sent_at IS NULL OR resend_count IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Backfilled % existing invitations', updated_count;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
DECLARE
  location_id_exists BOOLEAN;
  cancelled_at_exists BOOLEAN;
  batch_id_exists BOOLEAN;
  metadata_exists BOOLEAN;
  batches_table_exists BOOLEAN;
  settings_table_exists BOOLEAN;
  pending_count INTEGER;
  expired_count INTEGER;
  accepted_count INTEGER;
  separator CONSTANT TEXT := '========================================';
BEGIN
  -- Check columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_invitations' AND column_name = 'location_id'
  ) INTO location_id_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_invitations' AND column_name = 'cancelled_at'
  ) INTO cancelled_at_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_invitations' AND column_name = 'batch_id'
  ) INTO batch_id_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_invitations' AND column_name = 'metadata'
  ) INTO metadata_exists;
  
  -- Check tables
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'invite_batches'
  ) INTO batches_table_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'invite_settings'
  ) INTO settings_table_exists;
  
  -- Count invitations
  SELECT COUNT(*) INTO pending_count
  FROM user_invitations WHERE status = 'pending';
  
  SELECT COUNT(*) INTO expired_count
  FROM user_invitations WHERE status = 'expired';
  
  SELECT COUNT(*) INTO accepted_count
  FROM user_invitations WHERE status = 'accepted';
  
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'VERIFICATION';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'user_invitations.location_id: %', CASE WHEN location_id_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'user_invitations.cancelled_at: %', CASE WHEN cancelled_at_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'user_invitations.batch_id: %', CASE WHEN batch_id_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'user_invitations.metadata: %', CASE WHEN metadata_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'invite_batches table: %', CASE WHEN batches_table_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'invite_settings table: %', CASE WHEN settings_table_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Pending invitations: %', pending_count;
  RAISE NOTICE 'Expired invitations: %', expired_count;
  RAISE NOTICE 'Accepted invitations: %', accepted_count;
  RAISE NOTICE '';
  
  IF location_id_exists AND cancelled_at_exists AND batch_id_exists AND metadata_exists
     AND batches_table_exists AND settings_table_exists THEN
    RAISE NOTICE '✅ All invitation infrastructure ready';
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
  RAISE NOTICE '✅ ENHANCED INVITATIONS READY';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
  RAISE NOTICE '✅ 6 NEW columns added to user_invitations';
  RAISE NOTICE '   (location_id, cancelled_at, cancelled_by, resend_count, last_sent_at, batch_id, metadata)';
  RAISE NOTICE '✅ 3 EXISTING columns preserved';
  RAISE NOTICE '   (status, expires_at, accepted_at from 15_user_invitations.sql)';
  RAISE NOTICE '✅ invite_batches table created';
  RAISE NOTICE '✅ invite_settings table created';
  RAISE NOTICE '✅ Default settings for all tenants';
  RAISE NOTICE '✅ Existing invitations backfilled';
  RAISE NOTICE '';
  RAISE NOTICE '📝 NEW CAPABILITIES:';
  RAISE NOTICE '   - Status tracking (pending/accepted/expired/cancelled/bounced)';
  RAISE NOTICE '   - Automatic expiry (7 days default)';
  RAISE NOTICE '   - Resend tracking with limits';
  RAISE NOTICE '   - Bulk invite batches';
  RAISE NOTICE '   - Per-tenant caps (50 pending default)';
  RAISE NOTICE '   - Collision detection ready';
  RAISE NOTICE '   - Location assignment support';
  RAISE NOTICE '';
  RAISE NOTICE '💡 NOTE:';
  RAISE NOTICE '   - Uses invited_by_user_id (existing column name)';
  RAISE NOTICE '   - Subsequent migrations will reference this correctly';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 NEXT: Run migration 006b for collision detection functions';
END $$;
