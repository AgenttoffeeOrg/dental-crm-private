-- =====================================================
-- HARDENING PHASE 4: Webhook Security & Idempotency
-- Date: October 16, 2025
-- Purpose: Prevent replay attacks, ensure idempotency
-- =====================================================

-- =====================================================
-- 1. WEBHOOK EVENTS TABLE (Idempotency Store)
-- =====================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY, -- External event ID from provider (e.g., Twilio, Stripe)
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  source TEXT NOT NULL, -- 'twilio', 'stripe', 'google', 'custom', etc.
  event_type TEXT NOT NULL, -- 'call.completed', 'payment.succeeded', etc.
  
  signature TEXT, -- Webhook signature from provider
  signature_verified BOOLEAN DEFAULT false,
  
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'duplicate')),
  
  payload JSONB NOT NULL,
  result JSONB, -- Store processing result
  error_message TEXT,
  
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant ON webhook_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source, event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received ON webhook_events(received_at DESC);

-- Unique constraint to prevent duplicates (idempotency)
-- Note: Primary key on 'id' already enforces uniqueness

COMMENT ON TABLE webhook_events IS 
  'Stores all incoming webhook events for idempotency and audit.
   Primary key on id (provider event ID) prevents duplicate processing.';

RAISE NOTICE '✅ Created webhook_events table';

-- =====================================================
-- 2. ENABLE RLS ON WEBHOOK_EVENTS
-- =====================================================

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_events_select ON webhook_events;
DROP POLICY IF EXISTS webhook_events_insert ON webhook_events;
DROP POLICY IF EXISTS webhook_events_service ON webhook_events;

CREATE POLICY webhook_events_select ON webhook_events
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY webhook_events_insert ON webhook_events
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY webhook_events_service ON webhook_events
  FOR ALL
  USING (auth.role() = 'service_role');

RAISE NOTICE '✅ Applied RLS to webhook_events';

-- =====================================================
-- 3. WEBHOOK PROCESSING FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION register_webhook_event(
  p_event_id TEXT,
  p_tenant_id UUID,
  p_source TEXT,
  p_event_type TEXT,
  p_signature TEXT,
  p_payload JSONB
)
RETURNS TABLE (
  is_new BOOLEAN,
  event_record webhook_events
)
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_existing webhook_events;
  v_new webhook_events;
BEGIN
  -- Try to find existing event
  SELECT * INTO v_existing
  FROM webhook_events
  WHERE id = p_event_id;

  IF FOUND THEN
    -- Event already exists - this is a duplicate/replay
    UPDATE webhook_events
    SET retry_count = retry_count + 1,
        status = 'duplicate',
        updated_at = NOW()
    WHERE id = p_event_id
    RETURNING * INTO v_existing;

    RETURN QUERY SELECT false, v_existing;
  ELSE
    -- New event - insert it
    INSERT INTO webhook_events (
      id,
      tenant_id,
      source,
      event_type,
      signature,
      signature_verified,
      payload,
      status
    ) VALUES (
      p_event_id,
      p_tenant_id,
      p_source,
      p_event_type,
      p_signature,
      false, -- Signature verification happens in application layer
      p_payload,
      'pending'
    )
    RETURNING * INTO v_new;

    RETURN QUERY SELECT true, v_new;
  END IF;
END;
$$;

COMMENT ON FUNCTION register_webhook_event IS 
  'Registers a webhook event with idempotency check.
   Returns is_new=true if this is the first time we''ve seen this event.
   Returns is_new=false if this is a duplicate/replay (safe to ignore).';

RAISE NOTICE '✅ Created register_webhook_event() function';

-- =====================================================
-- 4. MARK WEBHOOK AS PROCESSED
-- =====================================================

CREATE OR REPLACE FUNCTION mark_webhook_processed(
  p_event_id TEXT,
  p_status TEXT,
  p_result JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
BEGIN
  UPDATE webhook_events
  SET status = p_status,
      processed_at = NOW(),
      result = p_result,
      error_message = p_error_message,
      updated_at = NOW()
  WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Webhook event % not found', p_event_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION mark_webhook_processed IS 
  'Marks a webhook event as processed (completed or failed).
   Call this after successfully processing the webhook payload.';

RAISE NOTICE '✅ Created mark_webhook_processed() function';

-- =====================================================
-- 5. CLEANUP OLD WEBHOOK EVENTS (Retention Policy)
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_webhook_events(p_days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_events
  WHERE received_at < NOW() - (p_days_to_keep || ' days')::INTERVAL
    AND status IN ('completed', 'duplicate');
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % old webhook events (older than % days)', v_deleted_count, p_days_to_keep;
  
  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_webhook_events IS 
  'Deletes old webhook events to prevent table bloat.
   Only deletes completed/duplicate events, keeps failed events for investigation.
   Default retention: 90 days.
   Run this periodically via cron job or pg_cron.';

RAISE NOTICE '✅ Created cleanup_old_webhook_events() function';

-- =====================================================
-- 6. WEBHOOK STATS VIEW
-- =====================================================

CREATE OR REPLACE VIEW webhook_stats AS
SELECT
  source,
  event_type,
  tenant_id,
  DATE_TRUNC('day', received_at) as date,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'duplicate') as duplicates,
  AVG(EXTRACT(EPOCH FROM (processed_at - received_at))) as avg_processing_seconds
FROM webhook_events
WHERE received_at > NOW() - INTERVAL '30 days'
GROUP BY source, event_type, tenant_id, DATE_TRUNC('day', received_at)
ORDER BY date DESC, total_events DESC;

COMMENT ON VIEW webhook_stats IS 
  'Aggregated webhook statistics for the last 30 days.
   Useful for monitoring webhook health and performance.';

RAISE NOTICE '✅ Created webhook_stats view';

-- =====================================================
-- 7. VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'webhook_events'
  ) INTO v_table_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== WEBHOOK SYSTEM VERIFICATION ===';
  RAISE NOTICE 'Table created: %', v_table_exists;
  RAISE NOTICE '';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  - register_webhook_event() - Idempotency check';
  RAISE NOTICE '  - mark_webhook_processed() - Mark as done';
  RAISE NOTICE '  - cleanup_old_webhook_events() - Retention';
  RAISE NOTICE '';
  RAISE NOTICE 'View:';
  RAISE NOTICE '  - webhook_stats - Monitoring';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- USAGE EXAMPLE (In webhook handler)
-- =====================================================

/*
-- Example webhook handler code (TypeScript):

export async function POST(request: Request) {
  const body = await request.json()
  const signature = request.headers.get('x-webhook-signature')
  
  // 1. Verify signature (provider-specific)
  if (!verifySignature(body, signature)) {
    return new Response('Invalid signature', { status: 401 })
  }
  
  // 2. Register event (idempotency check)
  const { data, error } = await supabase.rpc('register_webhook_event', {
    p_event_id: body.event_id,
    p_tenant_id: body.tenant_id,
    p_source: 'twilio',
    p_event_type: 'call.completed',
    p_signature: signature,
    p_payload: body
  })
  
  if (error) {
    return new Response('Error', { status: 500 })
  }
  
  const { is_new } = data[0]
  
  if (!is_new) {
    // Duplicate event - already processed
    return new Response('OK (duplicate)', { status: 200 })
  }
  
  // 3. Process event
  try {
    await processCallCompleted(body)
    
    // 4. Mark as completed
    await supabase.rpc('mark_webhook_processed', {
      p_event_id: body.event_id,
      p_status: 'completed',
      p_result: { success: true }
    })
    
    return new Response('OK', { status: 200 })
  } catch (err) {
    await supabase.rpc('mark_webhook_processed', {
      p_event_id: body.event_id,
      p_status: 'failed',
      p_error_message: err.message
    })
    
    return new Response('Processing failed', { status: 500 })
  }
}
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ HARDENING PHASE 4 COMPLETE: Webhook security';
  RAISE NOTICE '   - webhook_events table (idempotency store)';
  RAISE NOTICE '   - register_webhook_event() - Duplicate detection';
  RAISE NOTICE '   - mark_webhook_processed() - Status tracking';
  RAISE NOTICE '   - cleanup_old_webhook_events() - Retention policy';
  RAISE NOTICE '   - webhook_stats view - Monitoring';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SECURITY: Replay attacks prevented via PK constraint';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  APPLICATION CHANGES NEEDED:';
  RAISE NOTICE '   1. Update webhook handlers to use register_webhook_event()';
  RAISE NOTICE '   2. Verify signatures BEFORE registering events';
  RAISE NOTICE '   3. Call mark_webhook_processed() after processing';
  RAISE NOTICE '   4. Schedule cleanup_old_webhook_events() via cron';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Next: Run Phase 5 migrations (Data quality)';
END $$;

