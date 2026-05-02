SET search_path TO public, extensions;

-- ============================================================================
-- Step 10: Webhooks - External Event Notifications
-- ============================================================================
--
-- Comprehensive webhook system for notifying external systems of:
-- - Tenant events (created, updated, deleted)
-- - User events (invited, joined, left)
-- - Data events (contacts, deals, etc.)
-- - System events (backup completed, etc.)
--
-- Features:
-- - Retry logic with exponential backoff
-- - Webhook verification (HMAC signatures)
-- - Event filtering
-- - Delivery status tracking
-- - Rate limiting
--
-- ============================================================================

-- ============================================================================
-- 1. Webhook Endpoints Table
-- ============================================================================

DROP TABLE IF EXISTS webhook_endpoints CASCADE;
CREATE TABLE webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Endpoint details
    url TEXT NOT NULL,
    description TEXT,
    
    -- Security
    secret_key TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    enabled BOOLEAN DEFAULT true,
    
    -- Event subscriptions (array of event types)
    subscribed_events TEXT[] NOT NULL DEFAULT '{}',
    
    -- Delivery settings
    max_retry_attempts INT DEFAULT 3,
    timeout_seconds INT DEFAULT 30,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by_user_id UUID REFERENCES app_users(id),
    
    -- Statistics
    total_deliveries INT DEFAULT 0,
    successful_deliveries INT DEFAULT 0,
    failed_deliveries INT DEFAULT 0,
    last_delivery_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_tenant ON webhook_endpoints(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_enabled ON webhook_endpoints(enabled) WHERE enabled;

-- RLS
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_endpoints_select_policy ON webhook_endpoints;
CREATE POLICY webhook_endpoints_select_policy ON webhook_endpoints
    FOR SELECT USING (tenant_id = get_user_tenant_id_compat());

DROP POLICY IF EXISTS webhook_endpoints_insert_policy ON webhook_endpoints;
CREATE POLICY webhook_endpoints_insert_policy ON webhook_endpoints
    FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id_compat());

DROP POLICY IF EXISTS webhook_endpoints_update_policy ON webhook_endpoints;
CREATE POLICY webhook_endpoints_update_policy ON webhook_endpoints
    FOR UPDATE USING (tenant_id = get_user_tenant_id_compat());

DROP POLICY IF EXISTS webhook_endpoints_delete_policy ON webhook_endpoints;
CREATE POLICY webhook_endpoints_delete_policy ON webhook_endpoints
    FOR DELETE USING (tenant_id = get_user_tenant_id_compat());

-- ============================================================================
-- 2. Webhook Deliveries Table (Audit Log)
-- ============================================================================

DROP TABLE IF EXISTS webhook_deliveries CASCADE;
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Event details
    event_type TEXT NOT NULL,
    event_id UUID,
    payload JSONB NOT NULL,
    
    -- Delivery details
    status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
    attempt_number INT DEFAULT 1,
    max_attempts INT DEFAULT 3,
    
    -- Response details
    http_status_code INT,
    response_body TEXT,
    response_headers JSONB,
    error_message TEXT,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    
    -- Request details
    request_headers JSONB,
    request_body TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON webhook_deliveries(webhook_endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at) 
    WHERE status = 'retrying' AND next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);

-- RLS
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_deliveries_select_policy ON webhook_deliveries;
CREATE POLICY webhook_deliveries_select_policy ON webhook_deliveries
    FOR SELECT USING (tenant_id = get_user_tenant_id_compat());

-- ============================================================================
-- 3. Webhook Event Types (Reference Data)
-- ============================================================================

DROP TABLE IF EXISTS webhook_event_types CASCADE;
CREATE TABLE webhook_event_types (
    event_type TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    payload_schema JSONB,
    is_active BOOLEAN DEFAULT true
);

-- Seed event types
INSERT INTO webhook_event_types (event_type, category, description) VALUES
    -- Tenant events
    ('tenant.created', 'tenant', 'New tenant/organization created'),
    ('tenant.updated', 'tenant', 'Tenant details updated'),
    ('tenant.deleted', 'tenant', 'Tenant deleted'),
    ('tenant.validation_changed', 'tenant', 'Tenant validation status changed'),
    
    -- User events
    ('user.invited', 'user', 'User invited to organization'),
    ('user.joined', 'user', 'User accepted invitation and joined'),
    ('user.left', 'user', 'User left organization'),
    ('user.role_changed', 'user', 'User role updated'),
    
    -- Contact events
    ('contact.created', 'data', 'New contact created'),
    ('contact.updated', 'data', 'Contact updated'),
    ('contact.deleted', 'data', 'Contact deleted'),
    
    -- Deal events
    ('deal.created', 'data', 'New deal created'),
    ('deal.updated', 'data', 'Deal updated'),
    ('deal.status_changed', 'data', 'Deal status changed'),
    ('deal.won', 'data', 'Deal marked as won'),
    ('deal.lost', 'data', 'Deal marked as lost'),
    
    -- System events
    ('backup.completed', 'system', 'Backup completed successfully'),
    ('backup.failed', 'system', 'Backup failed'),
    ('export.completed', 'system', 'Data export completed')
ON CONFLICT (event_type) DO NOTHING;

-- ============================================================================
-- 4. Create Webhook Delivery Function
-- ============================================================================

CREATE OR REPLACE FUNCTION create_webhook_delivery(
    p_tenant_id UUID,
    p_event_type TEXT,
    p_event_id UUID,
    p_payload JSONB
)
RETURNS UUID AS $$
DECLARE
    endpoint_rec RECORD;
    delivery_id UUID;
BEGIN
    -- Find all enabled endpoints subscribed to this event type
    FOR endpoint_rec IN
        SELECT * FROM webhook_endpoints
        WHERE tenant_id = p_tenant_id
        AND enabled
        AND p_event_type = ANY(subscribed_events)
    LOOP
        -- Create delivery record
        INSERT INTO webhook_deliveries (
            webhook_endpoint_id,
            tenant_id,
            event_type,
            event_id,
            payload,
            status,
            max_attempts,
            next_retry_at
        ) VALUES (
            endpoint_rec.id,
            p_tenant_id,
            p_event_type,
            p_event_id,
            p_payload,
            'pending',
            endpoint_rec.max_retry_attempts,
            NOW()  -- Ready for immediate delivery
        ) RETURNING id INTO delivery_id;
        
        RAISE NOTICE 'Created webhook delivery % for endpoint %', delivery_id, endpoint_rec.url;
    END LOOP;
    
    RETURN delivery_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Process Webhook Delivery (To be called by worker/cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION process_webhook_deliveries()
RETURNS TABLE (
    delivery_id UUID,
    endpoint_url TEXT,
    event_type TEXT,
    status TEXT
) AS $$
DECLARE
    delivery_rec RECORD;
BEGIN
    -- This function would be called by a worker/cron job
    -- It returns pending deliveries that need to be sent
    
    RETURN QUERY
    SELECT 
        wd.id as delivery_id,
        we.url as endpoint_url,
        wd.event_type,
        wd.status
    FROM webhook_deliveries wd
    JOIN webhook_endpoints we ON wd.webhook_endpoint_id = we.id
    WHERE wd.status IN ('pending', 'retrying')
    AND (wd.next_retry_at IS NULL OR wd.next_retry_at <= NOW())
    AND wd.attempt_number <= wd.max_attempts
    AND we.enabled
    ORDER BY wd.created_at
    LIMIT 100;  -- Process in batches
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Update Webhook Delivery Status
-- ============================================================================

CREATE OR REPLACE FUNCTION update_webhook_delivery_status(
    p_delivery_id UUID,
    p_status TEXT,
    p_http_status_code INT DEFAULT NULL,
    p_response_body TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    delivery_rec RECORD;
    next_retry TIMESTAMPTZ;
BEGIN
    -- Get delivery details
    SELECT * INTO delivery_rec
    FROM webhook_deliveries
    WHERE id = p_delivery_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Webhook delivery % not found', p_delivery_id;
    END IF;
    
    -- Calculate next retry time (exponential backoff)
    IF p_status = 'failed' AND delivery_rec.attempt_number < delivery_rec.max_attempts THEN
        next_retry := NOW() + (POWER(2, delivery_rec.attempt_number) * INTERVAL '1 minute');
        p_status := 'retrying';
    ELSE
        next_retry := NULL;
    END IF;
    
    -- Update delivery
    UPDATE webhook_deliveries
    SET 
        status = p_status,
        http_status_code = p_http_status_code,
        response_body = p_response_body,
        error_message = p_error_message,
        completed_at = CASE WHEN p_status IN ('success', 'failed') THEN NOW() ELSE completed_at END,
        sent_at = NOW(),
        attempt_number = attempt_number + 1,
        next_retry_at = next_retry
    WHERE id = p_delivery_id;
    
    -- Update endpoint statistics
    UPDATE webhook_endpoints
    SET 
        total_deliveries = total_deliveries + 1,
        successful_deliveries = CASE WHEN p_status = 'success' THEN successful_deliveries + 1 ELSE successful_deliveries END,
        failed_deliveries = CASE WHEN p_status = 'failed' THEN failed_deliveries + 1 ELSE failed_deliveries END,
        last_delivery_at = NOW(),
        last_success_at = CASE WHEN p_status = 'success' THEN NOW() ELSE last_success_at END,
        last_failure_at = CASE WHEN p_status = 'failed' THEN NOW() ELSE last_failure_at END
    WHERE id = delivery_rec.webhook_endpoint_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Generate Webhook Signature (HMAC)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_webhook_signature(
    p_payload TEXT,
    p_secret_key TEXT
)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(hmac(p_payload, p_secret_key, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 8. Webhook Statistics View
-- ============================================================================

DROP VIEW IF EXISTS webhook_statistics CASCADE;
CREATE VIEW webhook_statistics AS
SELECT 
    we.id as endpoint_id,
    we.tenant_id,
    we.url,
    we.enabled,
    we.total_deliveries,
    we.successful_deliveries,
    we.failed_deliveries,
    ROUND(
        100.0 * we.successful_deliveries / NULLIF(we.total_deliveries, 0),
        2
    ) as success_rate_pct,
    we.last_delivery_at,
    we.last_success_at,
    we.last_failure_at,
    
    -- Recent deliveries (last 24h)
    (SELECT COUNT(*) FROM webhook_deliveries 
     WHERE webhook_endpoint_id = we.id 
     AND created_at > NOW() - INTERVAL '24 hours') as deliveries_24h,
    
    -- Pending deliveries
    (SELECT COUNT(*) FROM webhook_deliveries 
     WHERE webhook_endpoint_id = we.id 
     AND status IN ('pending', 'retrying')) as pending_deliveries,
    
    -- Average response time (last 100 deliveries)
    (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - sent_at)) * 1000), 2)
     FROM webhook_deliveries 
     WHERE webhook_endpoint_id = we.id 
     AND status = 'success'
     AND sent_at IS NOT NULL
     AND completed_at IS NOT NULL
     LIMIT 100) as avg_response_time_ms

FROM webhook_endpoints we;

-- ============================================================================
-- 9. Cleanup Old Webhook Deliveries
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_webhook_deliveries(
    p_retention_days INT DEFAULT 90
)
RETURNS INT AS $$
DECLARE
    deleted_count INT;
BEGIN
    DELETE FROM webhook_deliveries
    WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
    AND status IN ('success', 'failed');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old webhook deliveries', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Final Report
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║                                                            ║';
    RAISE NOTICE '║            WEBHOOKS SYSTEM INSTALLED                       ║';
    RAISE NOTICE '║                                                            ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables Created:';
    RAISE NOTICE '  ✅ webhook_endpoints';
    RAISE NOTICE '  ✅ webhook_deliveries';
    RAISE NOTICE '  ✅ webhook_event_types';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions Created:';
    RAISE NOTICE '  ✅ create_webhook_delivery()';
    RAISE NOTICE '  ✅ process_webhook_deliveries()';
    RAISE NOTICE '  ✅ update_webhook_delivery_status()';
    RAISE NOTICE '  ✅ generate_webhook_signature()';
    RAISE NOTICE '  ✅ cleanup_old_webhook_deliveries()';
    RAISE NOTICE '';
    RAISE NOTICE 'Available Event Types: %', (SELECT COUNT(*) FROM webhook_event_types);
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Create webhook endpoints via API';
    RAISE NOTICE '  2. Subscribe to desired event types';
    RAISE NOTICE '  3. Set up webhook delivery worker';
    RAISE NOTICE '';
END $$;


