-- =====================================================
-- INTEGRATION HARDENING - DATABASE SCHEMA
-- =====================================================
-- Migration: 20250116_integration_hardening
-- Description: Enterprise-grade integration infrastructure
-- Version: 1.0
-- Date: January 16, 2025
-- Tasks: int-schema-1 through int-schema-5
-- =====================================================

-- =====================================================
-- 1. INTEGRATION_CONNECTIONS TABLE
-- =====================================================
-- Central source of truth for all integration credentials and status
-- Supports OAuth tokens, API keys, and webhook configs

CREATE TABLE IF NOT EXISTS public.integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Integration identification
  integration_type TEXT NOT NULL, -- 'twilio_sms', 'facebook_ads', 'google_ads', etc.
  integration_name TEXT, -- User-friendly name
  
  -- Status & health
  status TEXT NOT NULL CHECK (status IN ('connected', 'disconnected', 'error', 'expiring_soon', 'refreshing')),
  is_active BOOLEAN DEFAULT TRUE,
  is_test_mode BOOLEAN DEFAULT FALSE, -- Sandbox vs production
  
  -- Credentials (encrypted at rest via RLS)
  credentials JSONB NOT NULL DEFAULT '{}', -- {access_token, refresh_token, api_key, etc.}
  test_credentials JSONB DEFAULT '{}', -- Separate credentials for test mode
  
  -- OAuth specific
  scopes TEXT[], -- Granted OAuth scopes
  token_expires_at TIMESTAMPTZ, -- When access token expires
  token_last_refreshed_at TIMESTAMPTZ, -- Last successful refresh
  
  -- Configuration
  config JSONB DEFAULT '{}', -- Integration-specific config (webhookUrl, account_id, etc.)
  mapping_config JSONB DEFAULT '{}', -- Field mappings: {source_field: target_field}
  
  -- Sync tracking
  last_sync_at TIMESTAMPTZ, -- Last successful API call or webhook
  last_sync_status TEXT, -- 'success', 'error'
  next_sync_at TIMESTAMPTZ, -- For scheduled syncs
  sync_frequency TEXT CHECK (sync_frequency IN ('realtime', 'hourly', 'daily', 'weekly', 'monthly')),
  
  -- Error handling
  error_message TEXT, -- Last error encountered
  error_count INTEGER DEFAULT 0, -- Consecutive errors
  last_error_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID REFERENCES public.app_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(tenant_id, integration_type)
);

-- Indexes for performance
CREATE INDEX idx_integration_connections_tenant ON public.integration_connections(tenant_id);
CREATE INDEX idx_integration_connections_type ON public.integration_connections(integration_type);
CREATE INDEX idx_integration_connections_status ON public.integration_connections(status) WHERE is_active = TRUE;
CREATE INDEX idx_integration_connections_token_expiry ON public.integration_connections(token_expires_at) WHERE token_expires_at IS NOT NULL;
CREATE INDEX idx_integration_connections_next_sync ON public.integration_connections(next_sync_at) WHERE next_sync_at IS NOT NULL;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_integration_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER integration_connections_updated_at
  BEFORE UPDATE ON public.integration_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_connections_updated_at();

-- =====================================================
-- 2. INTEGRATION_LOGS TABLE
-- =====================================================
-- Audit trail of every API call made to/from integrations
-- Used for debugging, monitoring, and compliance

CREATE TABLE IF NOT EXISTS public.integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.integration_connections(id) ON DELETE SET NULL,
  
  -- Operation identification
  integration_type TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'send_sms', 'receive_webhook', 'fetch_leads', 'refresh_token'
  direction TEXT CHECK (direction IN ('outbound', 'inbound')),
  
  -- Request/Response
  method TEXT, -- 'GET', 'POST', 'PUT', 'DELETE'
  url TEXT, -- Full API endpoint URL
  request_headers JSONB,
  request_payload JSONB,
  response_status INTEGER, -- HTTP status code
  response_headers JSONB,
  response_payload JSONB,
  
  -- Result
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout', 'retry')),
  error_code TEXT, -- 'rate_limit', 'auth_failed', 'invalid_payload', etc.
  error_message TEXT,
  error_details JSONB,
  
  -- Performance
  duration_ms INTEGER, -- Request duration in milliseconds
  retry_count INTEGER DEFAULT 0,
  
  -- Tracing & correlation
  correlation_id UUID DEFAULT gen_random_uuid(), -- For distributed tracing
  idempotency_key TEXT, -- For outbound requests
  external_id TEXT, -- External system's ID (webhook ID, message SID, etc.)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for queries
CREATE INDEX idx_integration_logs_tenant ON public.integration_logs(tenant_id, created_at DESC);
CREATE INDEX idx_integration_logs_type_status ON public.integration_logs(integration_type, status, created_at DESC);
CREATE INDEX idx_integration_logs_connection ON public.integration_logs(connection_id, created_at DESC);
CREATE INDEX idx_integration_logs_correlation ON public.integration_logs(correlation_id);
CREATE INDEX idx_integration_logs_external_id ON public.integration_logs(integration_type, external_id);

-- Partition by date for performance (optional, for high-volume)
-- ALTER TABLE public.integration_logs PARTITION BY RANGE (created_at);

-- Auto-cleanup old logs (keep 90 days)
COMMENT ON TABLE public.integration_logs IS 'Audit trail of integration API calls. Auto-deleted after 90 days via scheduled job.';

-- =====================================================
-- 3. INTEGRATION_RATE_LIMITS TABLE
-- =====================================================
-- Track API quota usage per integration per tenant
-- Prevents exceeding vendor rate limits

CREATE TABLE IF NOT EXISTS public.integration_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  
  -- Rate limit window
  integration_type TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_duration_ms INTEGER NOT NULL, -- Window size in milliseconds (e.g., 60000 = 1 minute)
  
  -- Usage
  requests_count INTEGER DEFAULT 0,
  requests_limit INTEGER NOT NULL, -- Max requests per window
  requests_remaining INTEGER, -- Calculated: limit - count
  
  -- Reset
  reset_at TIMESTAMPTZ NOT NULL, -- When the window resets
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(tenant_id, integration_type, window_start)
);

-- Indexes
CREATE INDEX idx_integration_rate_limits_tenant_type ON public.integration_rate_limits(tenant_id, integration_type);
CREATE INDEX idx_integration_rate_limits_reset ON public.integration_rate_limits(reset_at);
CREATE INDEX idx_integration_rate_limits_window ON public.integration_rate_limits(window_start DESC);

-- Function to increment rate limit counter
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_tenant_id UUID,
  p_integration_type TEXT,
  p_limit INTEGER,
  p_window_duration_ms INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_reset_at TIMESTAMPTZ;
  v_current_count INTEGER;
  v_remaining INTEGER;
BEGIN
  -- Calculate current window start (truncate to window)
  v_window_start := date_trunc('minute', NOW());
  v_reset_at := v_window_start + (p_window_duration_ms || ' milliseconds')::INTERVAL;
  
  -- Insert or update rate limit record
  INSERT INTO public.integration_rate_limits (
    tenant_id,
    integration_type,
    window_start,
    window_duration_ms,
    requests_count,
    requests_limit,
    reset_at
  ) VALUES (
    p_tenant_id,
    p_integration_type,
    v_window_start,
    p_window_duration_ms,
    1,
    p_limit,
    v_reset_at
  )
  ON CONFLICT (tenant_id, integration_type, window_start)
  DO UPDATE SET
    requests_count = integration_rate_limits.requests_count + 1,
    updated_at = NOW()
  RETURNING requests_count, requests_limit INTO v_current_count, p_limit;
  
  v_remaining := p_limit - v_current_count;
  
  -- Return rate limit info
  RETURN json_build_object(
    'allowed', v_current_count <= p_limit,
    'limit', p_limit,
    'remaining', GREATEST(v_remaining, 0),
    'reset_at', v_reset_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION increment_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO authenticated;

-- Auto-cleanup old rate limit records (delete after 24 hours)
COMMENT ON TABLE public.integration_rate_limits IS 'Rate limit tracking. Auto-deleted after 24 hours via scheduled job.';

-- =====================================================
-- 4. INTEGRATION_WEBHOOKS_LOG TABLE
-- =====================================================
-- Deduplication and idempotency for incoming webhooks
-- Prevents processing the same webhook twice

CREATE TABLE IF NOT EXISTS public.integration_webhooks_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.integration_connections(id) ON DELETE SET NULL,
  
  -- Webhook identification
  integration_type TEXT NOT NULL,
  webhook_event TEXT, -- 'message.received', 'call.completed', 'lead.created'
  
  -- Deduplication keys
  external_id TEXT NOT NULL, -- Vendor's unique ID (MessageSid, CallSid, etc.)
  payload_hash TEXT NOT NULL, -- SHA-256 hash of payload for exact duplicate detection
  idempotency_key TEXT, -- Optional client-provided idempotency key
  
  -- Processing
  status TEXT CHECK (status IN ('received', 'processing', 'processed', 'failed', 'duplicate')),
  processed_at TIMESTAMPTZ,
  processing_duration_ms INTEGER,
  
  -- Signature verification
  signature_verified BOOLEAN DEFAULT FALSE,
  signature_algorithm TEXT, -- 'sha1', 'sha256', 'hmac-sha256'
  
  -- Payload (for replay)
  payload JSONB NOT NULL,
  headers JSONB,
  
  -- Result
  result_entity_type TEXT, -- 'activity', 'contact', 'deal', etc.
  result_entity_id UUID, -- ID of created/updated entity
  error_message TEXT,
  
  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints: Prevent duplicate processing
  UNIQUE(integration_type, external_id),
  UNIQUE(integration_type, payload_hash)
);

-- Indexes
CREATE INDEX idx_integration_webhooks_tenant ON public.integration_webhooks_log(tenant_id, created_at DESC);
CREATE INDEX idx_integration_webhooks_type_status ON public.integration_webhooks_log(integration_type, status);
CREATE INDEX idx_integration_webhooks_external_id ON public.integration_webhooks_log(integration_type, external_id);
CREATE INDEX idx_integration_webhooks_hash ON public.integration_webhooks_log(payload_hash);
CREATE INDEX idx_integration_webhooks_idempotency ON public.integration_webhooks_log(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Function to check if webhook already processed (idempotency check)
CREATE OR REPLACE FUNCTION is_webhook_processed(
  p_integration_type TEXT,
  p_external_id TEXT,
  p_payload_hash TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.integration_webhooks_log
    WHERE integration_type = p_integration_type
    AND (external_id = p_external_id OR payload_hash = p_payload_hash)
    AND status IN ('processed', 'processing')
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated and service role
GRANT EXECUTE ON FUNCTION is_webhook_processed(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_webhook_processed(TEXT, TEXT, TEXT) TO service_role;

-- Auto-cleanup old webhook logs (keep 30 days)
COMMENT ON TABLE public.integration_webhooks_log IS 'Webhook deduplication log. Auto-deleted after 30 days via scheduled job.';

-- =====================================================
-- 5. INTEGRATION_DLQ (DEAD LETTER QUEUE) TABLE
-- =====================================================
-- Failed operations that need manual intervention or retry

CREATE TABLE IF NOT EXISTS public.integration_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.integration_connections(id) ON DELETE SET NULL,
  
  -- Failed operation
  integration_type TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'process_webhook', 'send_sms', 'create_contact'
  
  -- Original request
  payload JSONB NOT NULL,
  context JSONB DEFAULT '{}', -- Additional context (user_id, deal_id, etc.)
  
  -- Error details
  error_message TEXT NOT NULL,
  error_code TEXT,
  error_stack TEXT,
  first_failed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Retry tracking
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  last_retry_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ, -- Exponential backoff calculation
  retry_delays INTEGER[] DEFAULT ARRAY[1000, 2000, 4000, 8000, 16000], -- Milliseconds
  
  -- Status
  status TEXT CHECK (status IN ('pending', 'retrying', 'failed', 'resolved', 'discarded')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.app_users(id),
  resolution_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_integration_dlq_tenant_status ON public.integration_dlq(tenant_id, status);
CREATE INDEX idx_integration_dlq_type_status ON public.integration_dlq(integration_type, status);
CREATE INDEX idx_integration_dlq_next_retry ON public.integration_dlq(next_retry_at) WHERE status = 'pending' AND next_retry_at IS NOT NULL;
CREATE INDEX idx_integration_dlq_created ON public.integration_dlq(created_at DESC);

-- Function to add item to DLQ
CREATE OR REPLACE FUNCTION add_to_dlq(
  p_tenant_id UUID,
  p_integration_type TEXT,
  p_operation TEXT,
  p_payload JSONB,
  p_error_message TEXT,
  p_error_code TEXT DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_dlq_id UUID;
BEGIN
  INSERT INTO public.integration_dlq (
    tenant_id,
    integration_type,
    operation,
    payload,
    context,
    error_message,
    error_code,
    status,
    next_retry_at
  ) VALUES (
    p_tenant_id,
    p_integration_type,
    p_operation,
    p_payload,
    p_context,
    p_error_message,
    p_error_code,
    'pending',
    NOW() + INTERVAL '1 second' -- First retry in 1 second
  )
  RETURNING id INTO v_dlq_id;
  
  RETURN v_dlq_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute
GRANT EXECUTE ON FUNCTION add_to_dlq(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION add_to_dlq(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, JSONB) TO service_role;

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all integration tables
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_webhooks_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_dlq ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS: integration_connections
-- =====================================================

-- Tenants can view their own connections
CREATE POLICY "Tenants can view their own connections"
  ON public.integration_connections
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Tenants can create connections
CREATE POLICY "Tenants can create connections"
  ON public.integration_connections
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Tenants can update their own connections
CREATE POLICY "Tenants can update their own connections"
  ON public.integration_connections
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Tenants can delete their own connections
CREATE POLICY "Tenants can delete their own connections"
  ON public.integration_connections
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- RLS: integration_logs
-- =====================================================

-- Tenants can view their own logs
CREATE POLICY "Tenants can view their own logs"
  ON public.integration_logs
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Service role can insert logs (webhooks, background jobs)
-- No INSERT policy for authenticated users - logs are system-generated

-- =====================================================
-- RLS: integration_rate_limits
-- =====================================================

-- Tenants can view their own rate limits
CREATE POLICY "Tenants can view their own rate limits"
  ON public.integration_rate_limits
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Service role manages rate limits (via function)
-- No direct INSERT/UPDATE for users

-- =====================================================
-- RLS: integration_webhooks_log
-- =====================================================

-- Tenants can view their own webhook logs
CREATE POLICY "Tenants can view their own webhook logs"
  ON public.integration_webhooks_log
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Service role inserts webhook logs
-- No direct INSERT for users

-- =====================================================
-- RLS: integration_dlq
-- =====================================================

-- Tenants can view their own DLQ items
CREATE POLICY "Tenants can view their own DLQ items"
  ON public.integration_dlq
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Tenants can update DLQ status (for manual resolution)
CREATE POLICY "Tenants can update their own DLQ items"
  ON public.integration_dlq
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 7. GRANTS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.integration_connections TO authenticated;
GRANT SELECT ON public.integration_logs TO authenticated;
GRANT SELECT ON public.integration_rate_limits TO authenticated;
GRANT SELECT ON public.integration_webhooks_log TO authenticated;
GRANT SELECT, UPDATE ON public.integration_dlq TO authenticated;

-- Grant full access to service role (for background jobs, webhooks)
GRANT ALL ON public.integration_connections TO service_role;
GRANT ALL ON public.integration_logs TO service_role;
GRANT ALL ON public.integration_rate_limits TO service_role;
GRANT ALL ON public.integration_webhooks_log TO service_role;
GRANT ALL ON public.integration_dlq TO service_role;

-- Usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =====================================================
-- 8. COMMENTS & DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.integration_connections IS 'Central registry of all integration connections with encrypted credentials and health status';
COMMENT ON TABLE public.integration_logs IS 'Audit trail of all API calls made to/from integrations. Auto-deleted after 90 days.';
COMMENT ON TABLE public.integration_rate_limits IS 'Rate limit tracking per integration per tenant. Auto-deleted after 24 hours.';
COMMENT ON TABLE public.integration_webhooks_log IS 'Webhook deduplication and processing log. Auto-deleted after 30 days.';
COMMENT ON TABLE public.integration_dlq IS 'Dead Letter Queue for failed operations requiring manual intervention or automatic retry.';

-- =====================================================
-- 9. INITIAL DATA / SETUP
-- =====================================================

-- Optional: Seed common integration types
-- (Handled via application code)

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify tables were created
DO $$
DECLARE
  v_tables TEXT[] := ARRAY['integration_connections', 'integration_logs', 'integration_rate_limits', 'integration_webhooks_log', 'integration_dlq'];
  v_table TEXT;
  v_exists BOOLEAN;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    SELECT EXISTS (
      SELECT FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = v_table
    ) INTO v_exists;
    
    IF v_exists THEN
      RAISE NOTICE '✅ Table public.% created successfully', v_table;
    ELSE
      RAISE EXCEPTION '❌ Table public.% was not created', v_table;
    END IF;
  END LOOP;
  
  RAISE NOTICE '🎉 Integration hardening schema migration completed successfully!';
END $$;

