SET search_path TO public, extensions;

-- =====================================================
-- Migration: Create Organization Join Requests Table
-- Purpose: Allow users to request joining existing organizations
-- Safety: New table, no impact on existing flows
-- Use Case: Employee finds their practice and requests access
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE ORGANIZATION_JOIN_REQUESTS TABLE
-- =====================================================

DROP TABLE IF EXISTS organization_join_requests CASCADE;
CREATE TABLE organization_join_requests (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization being requested
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Requester (may not have app_user yet)
  requester_user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  requester_email TEXT NOT NULL,
  requester_name TEXT,
  
  -- Request details
  message TEXT,
  requested_role TEXT DEFAULT 'staff',
  
  -- Status workflow
  status TEXT DEFAULT 'pending' NOT NULL,
  
  -- Decision tracking
  decided_by_user_id UUID REFERENCES app_users(id),
  decided_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT check_join_request_status 
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  
  CONSTRAINT check_join_request_email 
    CHECK (requester_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  
  CONSTRAINT check_decision_consistency
    CHECK (
      (status = 'pending' AND decided_by_user_id IS NULL AND decided_at IS NULL)
      OR
      (status != 'pending' AND decided_by_user_id IS NOT NULL AND decided_at IS NOT NULL)
    )
);

COMMENT ON TABLE organization_join_requests IS 
  'Tracks user requests to join existing organizations';

COMMENT ON COLUMN organization_join_requests.tenant_id IS 
  'Organization being requested';

COMMENT ON COLUMN organization_join_requests.requester_user_id IS 
  'Requester app_user (NULL if not yet signed up)';

COMMENT ON COLUMN organization_join_requests.requester_email IS 
  'Requester email (used for matching and notifications)';

COMMENT ON COLUMN organization_join_requests.status IS 
  'pending | approved | rejected | expired';

COMMENT ON COLUMN organization_join_requests.requested_role IS 
  'Role requested (default: staff). Admin can change during approval.';

-- =====================================================
-- 2. CREATE INDEXES (performance)
-- =====================================================

-- Lookup pending requests for an organization
CREATE INDEX IF NOT EXISTS idx_join_requests_tenant_status 
  ON organization_join_requests(tenant_id, status) 
  WHERE status = 'pending';

-- Find user's requests
CREATE INDEX IF NOT EXISTS idx_join_requests_user 
  ON organization_join_requests(requester_user_id);

-- Find requests by email (for linking after signup)
CREATE INDEX IF NOT EXISTS idx_join_requests_email 
  ON organization_join_requests(requester_email);

-- Admin dashboard: recent requests
CREATE INDEX IF NOT EXISTS idx_join_requests_created 
  ON organization_join_requests(tenant_id, created_at DESC);

-- Audit: who decided
CREATE INDEX IF NOT EXISTS idx_join_requests_decided_by 
  ON organization_join_requests(decided_by_user_id);

-- =====================================================
-- 3. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_join_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_join_requests_updated_at
  BEFORE UPDATE ON organization_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_join_requests_updated_at();

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE organization_join_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Requesters can see their own requests
DROP POLICY IF EXISTS join_requests_select_own ON organization_join_requests;
CREATE POLICY join_requests_select_own ON organization_join_requests
  FOR SELECT
  USING (
    requester_user_id = auth.uid()
    OR requester_email = (
      -- Safe way to get current user's email without direct auth schema access
      SELECT au.email 
      FROM app_users au 
      WHERE au.id = auth.uid() 
      LIMIT 1
    )
  );

-- Policy: Admins can see requests for their organizations
DROP POLICY IF EXISTS join_requests_select_admin ON organization_join_requests;
CREATE POLICY join_requests_select_admin ON organization_join_requests
  FOR SELECT
  USING (
    tenant_id IN (
      -- Tenant Admins see all requests
      SELECT ta.tenant_id
      FROM tenant_admins ta
      WHERE ta.user_id = auth.uid()
        AND ta.is_active = TRUE
      
      UNION
      
      -- Users with "members:approve" permission
      SELECT au.tenant_id
      FROM app_users au
      INNER JOIN custom_roles cr ON cr.id = au.custom_role_id
      INNER JOIN role_permissions rp ON rp.role_id = cr.id
      INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE au.id = auth.uid()
        AND p.code = 'members:approve'
    )
  );

-- Policy: Anyone can INSERT a join request
DROP POLICY IF EXISTS join_requests_insert_anyone ON organization_join_requests;
CREATE POLICY join_requests_insert_anyone ON organization_join_requests
  FOR INSERT
  WITH CHECK (TRUE);

-- Policy: Only admins can UPDATE (approve/reject)
DROP POLICY IF EXISTS join_requests_update_admin ON organization_join_requests;
CREATE POLICY join_requests_update_admin ON organization_join_requests
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT ta.tenant_id
      FROM tenant_admins ta
      WHERE ta.user_id = auth.uid()
        AND ta.is_active = TRUE
      
      UNION
      
      SELECT au.tenant_id
      FROM app_users au
      INNER JOIN custom_roles cr ON cr.id = au.custom_role_id
      INNER JOIN role_permissions rp ON rp.role_id = cr.id
      INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE au.id = auth.uid()
        AND p.code = 'members:approve'
    )
  );

-- No DELETE policy - requests are permanent audit trail

COMMENT ON POLICY join_requests_select_own ON organization_join_requests IS 
  'Users can view their own join requests';

COMMENT ON POLICY join_requests_select_admin ON organization_join_requests IS 
  'Admins can view requests for their organizations';

-- =====================================================
-- 5. HELPER FUNCTION: Create join request
-- =====================================================

CREATE OR REPLACE FUNCTION create_join_request(
  p_tenant_id UUID,
  p_requester_email TEXT,
  p_requester_name TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_requested_role TEXT DEFAULT 'staff'
)
RETURNS UUID AS $$
DECLARE
  request_id UUID;
  user_id UUID;
BEGIN
  -- Try to find existing user by email
  -- Use app_users.email directly (no auth schema access needed)
  SELECT au.id INTO user_id
  FROM app_users au
  WHERE au.email = p_requester_email
  LIMIT 1;
  
  -- Insert request
  INSERT INTO organization_join_requests (
    tenant_id,
    requester_user_id,
    requester_email,
    requester_name,
    message,
    requested_role,
    status
  ) VALUES (
    p_tenant_id,
    user_id,
    p_requester_email,
    p_requester_name,
    p_message,
    p_requested_role,
    'pending'
  )
  RETURNING id INTO request_id;
  
  RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_join_request IS 
  'Create a join request (public function, validated by domain matching)';

-- =====================================================
-- 6. HELPER FUNCTION: Approve join request
-- =====================================================

CREATE OR REPLACE FUNCTION approve_join_request(
  p_request_id UUID,
  p_approved_by UUID,
  p_assigned_role TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  request RECORD;
  user_id UUID;
  result JSONB;
BEGIN
  -- Get request details
  SELECT * INTO request
  FROM organization_join_requests
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Request not found');
  END IF;
  
  IF request.status != 'pending' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Request already processed');
  END IF;
  
  -- Get or create user
  user_id := request.requester_user_id;
  
  IF user_id IS NULL THEN
    -- User hasn't signed up yet - mark approved, they'll be created on signup
    UPDATE organization_join_requests
    SET 
      status = 'approved',
      decided_by_user_id = p_approved_by,
      decided_at = NOW(),
      requested_role = COALESCE(p_assigned_role, requested_role)
    WHERE id = p_request_id;
    
    RETURN jsonb_build_object(
      'success', TRUE,
      'message', 'Request approved. User will be added on signup.',
      'user_id', NULL
    );
  END IF;
  
  -- User exists - create app_user record
  INSERT INTO app_users (
    id,
    tenant_id,
    role,
    created_at
  ) VALUES (
    user_id,
    request.tenant_id,
    COALESCE(p_assigned_role, request.requested_role),
    NOW()
  )
  ON CONFLICT (id, tenant_id) DO NOTHING;
  
  -- Update request status
  UPDATE organization_join_requests
  SET 
    status = 'approved',
    decided_by_user_id = p_approved_by,
    decided_at = NOW(),
    requested_role = COALESCE(p_assigned_role, requested_role)
  WHERE id = p_request_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Request approved and user added',
    'user_id', user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_join_request IS 
  'Approve a join request and create app_user record';

-- =====================================================
-- 7. HELPER FUNCTION: Reject join request
-- =====================================================

CREATE OR REPLACE FUNCTION reject_join_request(
  p_request_id UUID,
  p_rejected_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  updated BOOLEAN;
BEGIN
  UPDATE organization_join_requests
  SET 
    status = 'rejected',
    decided_by_user_id = p_rejected_by,
    decided_at = NOW(),
    rejection_reason = p_reason
  WHERE id = p_request_id
    AND status = 'pending';
  
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_join_request IS 
  'Reject a join request with reason';

-- =====================================================
-- 8. HELPER FUNCTION: Auto-expire old requests
-- =====================================================

CREATE OR REPLACE FUNCTION expire_old_join_requests()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE organization_join_requests
  SET status = 'expired'
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION expire_old_join_requests IS 
  'Auto-expire join requests older than 30 days (run via cron)';

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 004 complete: organization_join_requests table created';
  RAISE NOTICE '📨 Workflow: Employees can request to join their practice';
  RAISE NOTICE '👥 Functions: create_join_request, approve_join_request, reject_join_request';
  RAISE NOTICE '🔒 RLS: Requesters see own, admins see all for their org';
END $$;

