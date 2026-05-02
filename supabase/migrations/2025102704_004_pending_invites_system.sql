SET search_path TO public, extensions;

-- =============================================================================================================
-- MIGRATION: 20251027_004_pending_invites_system.sql
-- PURPOSE: Create comprehensive invite system for organization onboarding
-- FEATURES:
--   - Pending invites table with 6-char alphanumeric codes
--   - Role assignment at invite creation (NOT on accept)
--   - 7-day expiration with automatic cleanup
--   - RLS policies for security
--   - Helper functions for code generation and validation
-- =============================================================================================================

-- =====================================================================================================
-- 1. CREATE ENUM FOR INVITE STATUS
-- =====================================================================================================
DO $$ BEGIN
  CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
  RAISE NOTICE '✅ Created invite_status enum';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'ℹ️  invite_status enum already exists, skipping';
END $$;

-- =====================================================================================================
-- 2. CREATE pending_invites TABLE
-- =====================================================================================================
DROP TABLE IF EXISTS pending_invites CASCADE;
CREATE TABLE pending_invites (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  
  -- Invite Details
  invited_email TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- ✅ CRITICAL: Role is assigned BY INVITER, NOT on accept
  assigned_role TEXT NOT NULL CHECK (assigned_role IN ('owner', 'admin', 'manager', 'staff', 'viewer')),
  
  -- Inviter Info
  invited_by UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  personal_message TEXT, -- Optional message from inviter
  
  -- Status & Timestamps
  status invite_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  
  -- Acceptance Tracking
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE pending_invites IS 'Pending organization invitations with pre-assigned roles';
COMMENT ON COLUMN pending_invites.assigned_role IS 'Role assigned by inviter BEFORE sending invite (NO default)';
COMMENT ON COLUMN pending_invites.invite_code IS '6-character alphanumeric code (e.g., A3X7K9)';

DO $$ BEGIN RAISE NOTICE '✅ Created pending_invites table'; END $$;

-- =====================================================================================================
-- 3. CREATE INDEXES
-- =====================================================================================================
CREATE INDEX IF NOT EXISTS idx_pending_invites_email ON pending_invites(invited_email);
CREATE INDEX IF NOT EXISTS idx_pending_invites_code ON pending_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_pending_invites_tenant ON pending_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pending_invites_status ON pending_invites(status);
CREATE INDEX IF NOT EXISTS idx_pending_invites_expires ON pending_invites(expires_at) WHERE status = 'pending';

DO $$ BEGIN RAISE NOTICE '✅ Created indexes on pending_invites'; END $$;

-- =====================================================================================================
-- 4. HELPER FUNCTION: Generate Unique 6-Character Invite Code
-- =====================================================================================================
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_attempts INTEGER := 0;
  v_max_attempts INTEGER := 100;
BEGIN
  LOOP
    -- Generate 6-character alphanumeric code (uppercase)
    v_code := UPPER(
      SUBSTRING(MD5(gen_random_uuid()::TEXT) FROM 1 FOR 6)
    );
    
    -- Replace numbers with letters for readability (avoid 0/O, 1/I confusion)
    v_code := TRANSLATE(v_code, '0123456789', 'ABCDEFGHJK');
    
    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM pending_invites WHERE invite_code = v_code
    ) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
    
    v_attempts := v_attempts + 1;
    IF v_attempts >= v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique invite code after % attempts', v_max_attempts;
    END IF;
  END LOOP;
  
  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invite_code() TO service_role;

COMMENT ON FUNCTION generate_invite_code() IS 'Generates unique 6-character alphanumeric invite code';

DO $$ BEGIN RAISE NOTICE '✅ Created generate_invite_code() function'; END $$;

-- =====================================================================================================
-- 5. HELPER FUNCTION: Validate Invite Code
-- =====================================================================================================
CREATE OR REPLACE FUNCTION validate_invite_code(
  p_code TEXT,
  p_email TEXT
)
RETURNS TABLE (
  is_valid BOOLEAN,
  invite_id UUID,
  tenant_id UUID,
  tenant_name TEXT,
  assigned_role TEXT,
  invited_by_name TEXT,
  expires_at TIMESTAMPTZ,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  -- Find invite by code
  SELECT 
    pi.id,
    pi.invited_email,
    pi.tenant_id,
    pi.assigned_role,
    pi.status,
    pi.expires_at,
    pi.invited_by,
    t.name AS tenant_name,
    au.full_name AS invited_by_name
  INTO v_invite
  FROM pending_invites pi
  JOIN tenants t ON t.id = pi.tenant_id
  LEFT JOIN app_users au ON au.id = pi.invited_by
  WHERE pi.invite_code = UPPER(p_code);
  
  -- Check if invite exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ,
      'Invalid invite code'::TEXT;
    RETURN;
  END IF;
  
  -- Check if email matches
  IF LOWER(v_invite.invited_email) != LOWER(p_email) THEN
    RETURN QUERY SELECT 
      FALSE, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ,
      'This invite was sent to a different email address'::TEXT;
    RETURN;
  END IF;
  
  -- Check if already accepted
  IF v_invite.status = 'accepted' THEN
    RETURN QUERY SELECT 
      FALSE, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ,
      'This invite has already been accepted'::TEXT;
    RETURN;
  END IF;
  
  -- Check if expired
  IF v_invite.status = 'expired' OR v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT 
      FALSE, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ,
      'This invite has expired'::TEXT;
    RETURN;
  END IF;
  
  -- Check if cancelled
  IF v_invite.status = 'cancelled' THEN
    RETURN QUERY SELECT 
      FALSE, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ,
      'This invite has been cancelled'::TEXT;
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT 
    TRUE,
    v_invite.id,
    v_invite.tenant_id,
    v_invite.tenant_name,
    v_invite.assigned_role,
    v_invite.invited_by_name,
    v_invite.expires_at,
    NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_invite_code(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invite_code(TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION validate_invite_code(TEXT, TEXT) IS 'Validates invite code and returns invite details or error';

DO $$ BEGIN RAISE NOTICE '✅ Created validate_invite_code() function'; END $$;

-- =====================================================================================================
-- 6. TRIGGER: Auto-Expire Old Invites
-- =====================================================================================================
CREATE OR REPLACE FUNCTION expire_old_invites()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update expired invites
  UPDATE pending_invites
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
  
  RETURN NULL;
END;
$$;

-- CREATE OR REPLACE TRIGGER to run periodically (on any insert/update to pending_invites)
DROP TRIGGER IF EXISTS trg_expire_old_invites ON pending_invites;
CREATE OR REPLACE TRIGGER trg_expire_old_invites
AFTER INSERT OR UPDATE ON pending_invites
FOR EACH STATEMENT
EXECUTE FUNCTION expire_old_invites();

COMMENT ON FUNCTION expire_old_invites() IS 'Automatically marks expired invites';

DO $$ BEGIN RAISE NOTICE '✅ Created auto-expire trigger'; END $$;

-- =====================================================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================================
ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invites sent to their email
DROP POLICY IF EXISTS "Users can view invites sent to them" ON pending_invites;
DROP POLICY IF EXISTS "Users can view invites sent to them" ON pending_invites;
CREATE POLICY "Users can view invites sent to them" ON pending_invites
  FOR SELECT
  USING (
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policy: Tenant admins can view all invites for their tenant
DROP POLICY IF EXISTS "Admins can view tenant invites" ON pending_invites;
DROP POLICY IF EXISTS "Admins can view tenant invites" ON pending_invites;
CREATE POLICY "Admins can view tenant invites" ON pending_invites
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT utm.tenant_id 
      FROM user_tenant_memberships utm
      WHERE utm.user_id = auth.uid()
        AND utm.status = 'active'
        AND utm.role IN ('owner', 'admin')
    )
  );

-- Policy: Admins can create invites for their tenant
DROP POLICY IF EXISTS "Admins can create invites" ON pending_invites;
DROP POLICY IF EXISTS "Admins can create invites" ON pending_invites;
CREATE POLICY "Admins can create invites" ON pending_invites
  FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND tenant_id IN (
      SELECT utm.tenant_id 
      FROM user_tenant_memberships utm
      WHERE utm.user_id = auth.uid()
        AND utm.status = 'active'
        AND utm.role IN ('owner', 'admin')
    )
  );

-- Policy: Admins can cancel invites for their tenant
DROP POLICY IF EXISTS "Admins can cancel invites" ON pending_invites;
DROP POLICY IF EXISTS "Admins can cancel invites" ON pending_invites;
CREATE POLICY "Admins can cancel invites" ON pending_invites
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT utm.tenant_id 
      FROM user_tenant_memberships utm
      WHERE utm.user_id = auth.uid()
        AND utm.status = 'active'
        AND utm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    status IN ('cancelled', 'pending') -- Can only change to cancelled
  );

DO $$ BEGIN RAISE NOTICE '✅ Created RLS policies for pending_invites'; END $$;

-- =====================================================================================================
-- 8. VERIFICATION QUERIES
-- =====================================================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== PENDING INVITES SYSTEM VERIFICATION ===';
  RAISE NOTICE '';
  
  -- Test code generation
  DECLARE
    v_test_code TEXT;
  BEGIN
    v_test_code := generate_invite_code();
    RAISE NOTICE '✅ Test invite code generated: %', v_test_code;
    IF LENGTH(v_test_code) != 6 THEN
      RAISE EXCEPTION 'Invite code length is not 6 characters!';
    END IF;
  END;
  
  -- Verify table structure
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pending_invites') THEN
    RAISE NOTICE '✅ pending_invites table exists';
  ELSE
    RAISE EXCEPTION 'pending_invites table not found!';
  END IF;
  
  -- Verify RLS enabled
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'pending_invites' AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ RLS enabled on pending_invites';
  ELSE
    RAISE EXCEPTION 'RLS not enabled on pending_invites!';
  END IF;
  
  -- Count policies
  DECLARE
    v_policy_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE tablename = 'pending_invites';
    
    RAISE NOTICE '✅ % RLS policies created', v_policy_count;
    
    IF v_policy_count < 4 THEN
      RAISE WARNING 'Expected at least 4 RLS policies, found %', v_policy_count;
    END IF;
  END;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 PENDING INVITES SYSTEM MIGRATION COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Create API endpoints for invite management';
  RAISE NOTICE '2. Build invite detection UI components';
  RAISE NOTICE '3. Integrate with onboarding flow';
  RAISE NOTICE '';
END $$;

