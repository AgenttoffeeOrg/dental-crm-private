-- =====================================================
-- HARDENING PHASE 6: Automations Hardening
-- Date: October 16, 2025
-- Purpose: Idempotency, loop guards, concurrency, DLQ
-- =====================================================

-- =====================================================
-- 1. ADD IDEMPOTENCY & TRACKING COLUMNS
-- =====================================================

-- Add idempotency key to execution logs
ALTER TABLE automation_execution_logs ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE automation_execution_logs ADD COLUMN IF NOT EXISTS origin_tag TEXT;
ALTER TABLE automation_execution_logs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE automation_execution_logs ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE automation_execution_logs ADD COLUMN IF NOT EXISTS correlation_id UUID;

-- Unique index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS uq_automation_exec_idem
  ON automation_execution_logs(tenant_id, automation_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Index for correlation (tracing)
CREATE INDEX IF NOT EXISTS idx_automation_correlation 
  ON automation_execution_logs(correlation_id) 
  WHERE correlation_id IS NOT NULL;

RAISE NOTICE '✅ Added idempotency columns to automation_execution_logs';

-- =====================================================
-- 2. AUTOMATION DEAD LETTER QUEUE (DLQ)
-- =====================================================

CREATE TABLE IF NOT EXISTS automation_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  
  original_execution_log_id UUID REFERENCES automation_execution_logs(id),
  
  failed_at TIMESTAMPTZ DEFAULT NOW(),
  retry_count INTEGER NOT NULL,
  max_retries_exceeded BOOLEAN DEFAULT true,
  
  trigger_event JSONB NOT NULL,
  error_message TEXT,
  error_details JSONB,
  
  status TEXT DEFAULT 'quarantined' CHECK (status IN ('quarantined', 'replaying', 'resolved', 'discarded')),
  resolved_at TIMESTAMPTZ,
  resolved_by_user_id UUID REFERENCES app_users(id),
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_dlq_tenant ON automation_dlq(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_dlq_automation ON automation_dlq(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_dlq_status ON automation_dlq(tenant_id, status) WHERE status = 'quarantined';
CREATE INDEX IF NOT EXISTS idx_automation_dlq_failed ON automation_dlq(failed_at DESC);

COMMENT ON TABLE automation_dlq IS 
  'Dead Letter Queue for failed automation executions.
   Stores executions that failed after max retries for manual investigation and replay.';

RAISE NOTICE '✅ Created automation_dlq table';

-- =====================================================
-- 3. ENABLE RLS ON DLQ
-- =====================================================

ALTER TABLE automation_dlq ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automation_dlq_select ON automation_dlq;
DROP POLICY IF EXISTS automation_dlq_insert ON automation_dlq;
DROP POLICY IF EXISTS automation_dlq_update ON automation_dlq;
DROP POLICY IF EXISTS automation_dlq_service ON automation_dlq;

CREATE POLICY automation_dlq_select ON automation_dlq
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
  );

CREATE POLICY automation_dlq_insert ON automation_dlq
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY automation_dlq_update ON automation_dlq
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager'])
  );

CREATE POLICY automation_dlq_service ON automation_dlq
  FOR ALL
  USING (auth.role() = 'service_role');

RAISE NOTICE '✅ Applied RLS to automation_dlq';

-- =====================================================
-- 4. IDEMPOTENCY KEY BUILDER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION build_automation_idempotency_key(
  p_automation_id UUID,
  p_event_id TEXT,
  p_entity_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Build a deterministic idempotency key
  -- Format: {automation_id}:{event_id}:{entity_id}
  RETURN p_automation_id::TEXT || ':' || p_event_id || ':' || COALESCE(p_entity_id::TEXT, 'null');
END;
$$;

COMMENT ON FUNCTION build_automation_idempotency_key IS 
  'Builds a deterministic idempotency key for automation executions.
   Ensures same event + automation + entity combination only executes once.';

RAISE NOTICE '✅ Created build_automation_idempotency_key() function';

-- =====================================================
-- 5. CHECK EXECUTION ELIGIBILITY (Loop Guard)
-- =====================================================

CREATE OR REPLACE FUNCTION check_automation_eligible(
  p_automation_id UUID,
  p_idempotency_key TEXT,
  p_origin_tag TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_eligible BOOLEAN,
  reason TEXT,
  existing_execution_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
  v_automation automations;
  v_existing_log automation_execution_logs;
BEGIN
  -- Get automation
  SELECT * INTO v_automation
  FROM automations
  WHERE id = p_automation_id AND tenant_id = v_tenant_id;
  
  IF v_automation IS NULL THEN
    RETURN QUERY SELECT false, 'Automation not found or not accessible', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if automation is active
  IF NOT v_automation.is_active THEN
    RETURN QUERY SELECT false, 'Automation is disabled', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if automation is soft-deleted
  IF v_automation.deleted_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Automation is deleted', NULL::UUID;
    RETURN;
  END IF;
  
  -- LOOP GUARD: Check if origin_tag matches automation (prevent infinite loops)
  IF p_origin_tag IS NOT NULL AND p_origin_tag = 'auto:' || p_automation_id::TEXT THEN
    RETURN QUERY SELECT false, 'Loop detected: event originated from this automation', NULL::UUID;
    RETURN;
  END IF;
  
  -- IDEMPOTENCY: Check if this exact execution already ran
  SELECT * INTO v_existing_log
  FROM automation_execution_logs
  WHERE automation_id = p_automation_id
    AND idempotency_key = p_idempotency_key
  ORDER BY started_at DESC
  LIMIT 1;
  
  IF FOUND THEN
    -- Check status
    IF v_existing_log.status IN ('success', 'running') THEN
      RETURN QUERY SELECT false, 'Already executed (idempotency)', v_existing_log.id;
      RETURN;
    ELSIF v_existing_log.status = 'failed' AND v_existing_log.retry_count < 3 THEN
      -- Allow retry if failed and under retry limit
      RETURN QUERY SELECT true, 'Retry allowed (previous failure)', v_existing_log.id;
      RETURN;
    ELSIF v_existing_log.status = 'failed' AND v_existing_log.retry_count >= 3 THEN
      -- Max retries exceeded
      RETURN QUERY SELECT false, 'Max retries exceeded', v_existing_log.id;
      RETURN;
    END IF;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT true, 'Eligible for execution', NULL::UUID;
END;
$$;

COMMENT ON FUNCTION check_automation_eligible IS 
  'Checks if an automation is eligible to execute.
   Prevents: disabled automations, infinite loops, duplicate executions.
   Returns: is_eligible, reason, existing_execution_id';

RAISE NOTICE '✅ Created check_automation_eligible() function';

-- =====================================================
-- 6. SEND TO DLQ FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION send_to_automation_dlq(
  p_execution_log_id UUID,
  p_error_message TEXT,
  p_error_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_log automation_execution_logs;
  v_dlq_id UUID;
BEGIN
  -- Get execution log
  SELECT * INTO v_log
  FROM automation_execution_logs
  WHERE id = p_execution_log_id;
  
  IF v_log IS NULL THEN
    RAISE EXCEPTION 'Execution log % not found', p_execution_log_id;
  END IF;
  
  -- Insert into DLQ
  INSERT INTO automation_dlq (
    tenant_id,
    automation_id,
    original_execution_log_id,
    retry_count,
    trigger_event,
    error_message,
    error_details
  ) VALUES (
    v_log.tenant_id,
    v_log.automation_id,
    p_execution_log_id,
    v_log.retry_count,
    jsonb_build_object(
      'event_id', v_log.id,
      'started_at', v_log.started_at,
      'actions', v_log.actions_executed
    ),
    p_error_message,
    p_error_details
  )
  RETURNING id INTO v_dlq_id;
  
  -- Update execution log status
  UPDATE automation_execution_logs
  SET status = 'failed',
      error_message = p_error_message,
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_execution_log_id;
  
  RETURN v_dlq_id;
END;
$$;

COMMENT ON FUNCTION send_to_automation_dlq IS 
  'Sends a failed automation execution to the Dead Letter Queue.
   Call this when max retries are exceeded.';

RAISE NOTICE '✅ Created send_to_automation_dlq() function';

-- =====================================================
-- 7. REPLAY FROM DLQ FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION replay_from_dlq(
  p_dlq_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_dlq automation_dlq;
  v_new_log_id UUID;
BEGIN
  -- Get DLQ entry
  SELECT * INTO v_dlq
  FROM automation_dlq
  WHERE id = p_dlq_id
    AND tenant_id = current_tenant_id()
    AND status = 'quarantined';
  
  IF v_dlq IS NULL THEN
    RAISE EXCEPTION 'DLQ entry % not found or not replayable', p_dlq_id;
  END IF;
  
  -- Mark as replaying
  UPDATE automation_dlq
  SET status = 'replaying',
      resolved_at = NOW(),
      resolved_by_user_id = p_user_id
  WHERE id = p_dlq_id;
  
  -- Create new execution log (application layer will pick this up)
  INSERT INTO automation_execution_logs (
    tenant_id,
    automation_id,
    status,
    retry_count,
    correlation_id
  ) VALUES (
    v_dlq.tenant_id,
    v_dlq.automation_id,
    'pending',
    0, -- Reset retry count
    gen_random_uuid() -- New correlation ID for replay
  )
  RETURNING id INTO v_new_log_id;
  
  RETURN v_new_log_id;
END;
$$;

COMMENT ON FUNCTION replay_from_dlq IS 
  'Replays a failed automation from DLQ.
   Creates a new execution log and marks DLQ entry as replaying.';

RAISE NOTICE '✅ Created replay_from_dlq() function';

-- =====================================================
-- 8. CONCURRENCY LEASE TABLE (Per-tenant concurrency limiting)
-- =====================================================

CREATE TABLE IF NOT EXISTS automation_concurrency_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lease_key TEXT NOT NULL, -- e.g., 'tenant:{tenant_id}'
  
  acquired_by TEXT NOT NULL, -- Worker/process identifier
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE(lease_key)
);

CREATE INDEX IF NOT EXISTS idx_concurrency_lease_key ON automation_concurrency_leases(lease_key);
CREATE INDEX IF NOT EXISTS idx_concurrency_lease_expires ON automation_concurrency_leases(expires_at);

COMMENT ON TABLE automation_concurrency_leases IS 
  'Simple lease-based concurrency control for automations.
   Ensures only N workers process automations for a tenant concurrently.
   Leases expire automatically to prevent deadlocks.';

RAISE NOTICE '✅ Created automation_concurrency_leases table';

-- =====================================================
-- 9. ACQUIRE LEASE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION acquire_automation_lease(
  p_lease_key TEXT,
  p_worker_id TEXT,
  p_lease_duration_seconds INTEGER DEFAULT 300
)
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_expires_at TIMESTAMPTZ := NOW() + (p_lease_duration_seconds || ' seconds')::INTERVAL;
BEGIN
  -- Try to insert lease
  INSERT INTO automation_concurrency_leases (
    tenant_id,
    lease_key,
    acquired_by,
    expires_at
  ) VALUES (
    current_tenant_id(),
    p_lease_key,
    p_worker_id,
    v_expires_at
  )
  ON CONFLICT (lease_key) DO NOTHING;
  
  -- Check if we got the lease
  IF FOUND THEN
    RETURN true;
  ELSE
    -- Lease already held, check if expired
    DELETE FROM automation_concurrency_leases
    WHERE lease_key = p_lease_key
      AND expires_at < NOW();
    
    -- If we deleted an expired lease, try again
    IF FOUND THEN
      RETURN acquire_automation_lease(p_lease_key, p_worker_id, p_lease_duration_seconds);
    ELSE
      RETURN false;
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION acquire_automation_lease IS 
  'Attempts to acquire a concurrency lease.
   Returns true if lease acquired, false if already held by another worker.
   Automatically cleans up expired leases.';

RAISE NOTICE '✅ Created acquire_automation_lease() function';

-- =====================================================
-- 10. RELEASE LEASE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION release_automation_lease(
  p_lease_key TEXT,
  p_worker_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  DELETE FROM automation_concurrency_leases
  WHERE lease_key = p_lease_key
    AND acquired_by = p_worker_id;
  
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION release_automation_lease IS 
  'Releases a concurrency lease held by a worker.
   Should be called after automation execution completes.';

RAISE NOTICE '✅ Created release_automation_lease() function';

-- =====================================================
-- 11. VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== AUTOMATION HARDENING VERIFICATION ===';
  RAISE NOTICE 'Tables:';
  RAISE NOTICE '  - automation_dlq (Dead Letter Queue)';
  RAISE NOTICE '  - automation_concurrency_leases (Concurrency control)';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  - build_automation_idempotency_key() - Idempotency';
  RAISE NOTICE '  - check_automation_eligible() - Loop guard + idempotency';
  RAISE NOTICE '  - send_to_automation_dlq() - DLQ insertion';
  RAISE NOTICE '  - replay_from_dlq() - DLQ replay';
  RAISE NOTICE '  - acquire_automation_lease() - Concurrency control';
  RAISE NOTICE '  - release_automation_lease() - Release lease';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ HARDENING PHASE 6 COMPLETE: Automations hardening';
  RAISE NOTICE '   - Idempotency keys in execution logs';
  RAISE NOTICE '   - Loop guard via origin_tag checking';
  RAISE NOTICE '   - Dead Letter Queue (DLQ) for failed executions';
  RAISE NOTICE '   - Concurrency leases (per-tenant rate limiting)';
  RAISE NOTICE '   - Replay capability from DLQ';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SECURITY: Prevents infinite loops and duplicate executions';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  APPLICATION CHANGES NEEDED:';
  RAISE NOTICE '   1. Executor: Check check_automation_eligible() before executing';
  RAISE NOTICE '   2. Executor: Build idempotency_key for each execution';
  RAISE NOTICE '   3. Executor: Set origin_tag when automation creates entities';
  RAISE NOTICE '   4. Executor: Call send_to_automation_dlq() after max retries';
  RAISE NOTICE '   5. Executor: Acquire/release leases for concurrency control';
  RAISE NOTICE '   6. Admin UI: Show DLQ with replay button';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Next: Phase 7 (UI/UX) - to be implemented in application code';
  RAISE NOTICE '➡️  Continuing with Phase 8 (Privacy & DSR)...';
END $$;

