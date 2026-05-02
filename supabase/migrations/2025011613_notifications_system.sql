SET search_path TO public, extensions;

-- =====================================================
-- NOTIFICATIONS SYSTEM - ENTERPRISE DATABASE SCHEMA
-- =====================================================
-- Version: 1.0
-- Date: January 16, 2025
-- Purpose: Unified notifications system with multi-channel delivery
-- Research: NOTIFICATIONS_ENTERPRISE_RESEARCH_AND_DESIGN.md
-- =====================================================

BEGIN;

-- =====================================================
-- 1. NOTIFICATIONS TABLE
-- =====================================================
-- Core table storing all notification records

DROP TABLE IF EXISTS notifications CASCADE;
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  
  -- Event identification
  event_key VARCHAR(100) NOT NULL,
  event_id VARCHAR(100) UNIQUE,  -- For idempotency & deduplication
  
  -- Recipient
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- Content
  title TEXT NOT NULL,
  body TEXT,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'success', 'warning', 'error', 'critical')),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Context (source & deep-link)
  module VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  entity_url TEXT,  -- Deep-link: /deals/123, /tasks/456
  
  -- Actions
  quick_actions JSONB DEFAULT '[]'::JSONB,  -- [{action_key, label, type, url}]
  
  -- Lifecycle
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Grouping & threading
  group_key VARCHAR(200),  -- For grouping similar notifications
  parent_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  triggered_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_group_key ON notifications(group_key, created_at DESC) WHERE group_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id) WHERE entity_type IS NOT NULL;

COMMENT ON TABLE notifications IS 'Core notifications table with full event context and quick actions';

-- =====================================================
-- 2. NOTIFICATION_PREFERENCES TABLE
-- =====================================================
-- User-level preferences for notification delivery

DROP TABLE IF EXISTS notification_preferences CASCADE;
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Global channel toggles
  in_app_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT FALSE,
  
  -- Consent tracking (GDPR/CCPA)
  email_consented_at TIMESTAMPTZ,
  email_consent_ip VARCHAR(45),
  sms_consented_at TIMESTAMPTZ,
  sms_consent_ip VARCHAR(45),
  
  -- Per-event preferences
  -- Structure: { "deal.assigned": { "in_app": true, "email": true, "sms": false }, ... }
  event_preferences JSONB DEFAULT '{}'::JSONB,
  
  -- Quiet hours (Do Not Disturb)
  -- Structure: { "enabled": true, "timezone": "America/Los_Angeles", "start": "22:00", "end": "08:00", "days": ["monday", "tuesday", ...] }
  quiet_hours JSONB DEFAULT '{"enabled": false}'::JSONB,
  
  -- Digest preferences
  -- Structure: { "enabled": true, "frequency": "daily", "time": "09:00", "timezone": "America/Los_Angeles", "events": ["deal.won", ...] }
  digest_preferences JSONB DEFAULT '{"enabled": false, "frequency": "daily", "time": "09:00"}'::JSONB,
  
  -- Muted objects (e.g., specific deals/contacts user doesn't want notifications for)
  -- Structure: { "deal": ["uuid1", "uuid2"], "contact": ["uuid3"], ... }
  muted_objects JSONB DEFAULT '{}'::JSONB,
  
  -- Global snooze
  snoozed_until TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_tenant ON notification_preferences(tenant_id);

COMMENT ON TABLE notification_preferences IS 'User preferences for notification channels, schedules, and muting';

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_preferences_updated_at ON notification_preferences;
CREATE OR REPLACE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- =====================================================
-- 3. NOTIFICATION_POLICIES TABLE
-- =====================================================
-- Tenant/org-level policies for notification governance

DROP TABLE IF EXISTS notification_policies CASCADE;
CREATE TABLE notification_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Role defaults (applied to new users)
  -- Structure: { "owner": { "channels": ["in_app", "email", "sms"], "events": ["*"] }, "staff": { "channels": ["in_app"], "events": ["task.assigned", "deal.assigned"] }, ... }
  role_defaults JSONB DEFAULT '{
    "owner": {"channels": ["in_app", "email", "sms"], "events": ["*"]},
    "admin": {"channels": ["in_app", "email"], "events": ["*"]},
    "manager": {"channels": ["in_app", "email"], "events": ["deal.*", "task.*", "contact.*"]},
    "staff": {"channels": ["in_app"], "events": ["task.assigned", "deal.assigned"]},
    "marketing": {"channels": ["in_app", "email"], "events": ["campaign.*", "form.*", "audit.*"]}
  }'::JSONB,
  
  -- Escalation rules
  -- Structure: [{ "event_key": "task.overdue", "escalate_after_minutes": 60, "escalate_to_roles": ["manager"], "channels": ["email", "sms"] }, ...]
  escalation_rules JSONB DEFAULT '[]'::JSONB,
  
  -- Rate limits (anti-spam)
  -- Structure: { "max_per_hour": 50, "max_emails_per_day": 100, "max_sms_per_day": 10, "batch_delay_minutes": 5 }
  rate_limits JSONB DEFAULT '{"max_per_hour": 50, "max_emails_per_day": 100, "max_sms_per_day": 10, "batch_delay_minutes": 5}'::JSONB,
  
  -- Data retention
  retention_days INTEGER DEFAULT 90,  -- Auto-delete notifications older than this
  
  -- Compliance
  require_email_opt_in BOOLEAN DEFAULT FALSE,
  require_sms_opt_in BOOLEAN DEFAULT TRUE,
  allow_notification_export BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_policies_tenant ON notification_policies(tenant_id);

COMMENT ON TABLE notification_policies IS 'Org-level policies for role defaults, escalation, rate limits, and compliance';

-- =====================================================
-- 4. NOTIFICATION_DELIVERY_LOG TABLE
-- =====================================================
-- Delivery tracking for multi-channel notifications

DROP TABLE IF EXISTS notification_delivery_log CASCADE;
CREATE TABLE notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  
  -- Delivery details
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'push')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked')),
  provider VARCHAR(50),  -- 'sendgrid', 'twilio', 'firebase', etc.
  external_id TEXT,      -- Provider's message ID
  
  -- Result
  error_message TEXT,
  error_code VARCHAR(50),
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_log_notification ON notification_delivery_log(notification_id, channel);
CREATE INDEX IF NOT EXISTS idx_delivery_log_status ON notification_delivery_log(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_log_external_id ON notification_delivery_log(external_id) WHERE external_id IS NOT NULL;

COMMENT ON TABLE notification_delivery_log IS 'Multi-channel delivery tracking with provider webhooks';

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Get unread count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id
      AND read_at IS NULL
      AND archived_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (snoozed_until IS NULL OR snoozed_until <= NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE notifications
  SET read_at = NOW()
  WHERE id = p_notification_id
    AND user_id = p_user_id
    AND read_at IS NULL;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE notifications
  SET read_at = NOW()
  WHERE user_id = p_user_id
    AND read_at IS NULL
    AND archived_at IS NULL;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Archive notification
CREATE OR REPLACE FUNCTION archive_notification(p_notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE notifications
  SET archived_at = NOW()
  WHERE id = p_notification_id
    AND user_id = p_user_id
    AND archived_at IS NULL;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Snooze notification until a specific time
CREATE OR REPLACE FUNCTION snooze_notification(
  p_notification_id UUID,
  p_user_id UUID,
  p_until TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE notifications
  SET snoozed_until = p_until
  WHERE id = p_notification_id
    AND user_id = p_user_id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if event should be sent based on user preferences
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_event_key VARCHAR(100),
  p_channel VARCHAR(20)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_prefs notification_preferences;
  v_event_pref JSONB;
  v_channel_enabled BOOLEAN;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences, use defaults (all channels enabled except SMS)
  IF v_prefs IS NULL THEN
    RETURN p_channel != 'sms';
  END IF;
  
  -- Check global channel toggle
  IF p_channel = 'in_app' AND NOT v_prefs.in_app_enabled THEN RETURN FALSE; END IF;
  IF p_channel = 'email' AND NOT v_prefs.email_enabled THEN RETURN FALSE; END IF;
  IF p_channel = 'sms' AND NOT v_prefs.sms_enabled THEN RETURN FALSE; END IF;
  IF p_channel = 'push' AND NOT v_prefs.push_enabled THEN RETURN FALSE; END IF;
  
  -- Check event-specific preferences
  v_event_pref := v_prefs.event_preferences->p_event_key;
  IF v_event_pref IS NOT NULL THEN
    v_channel_enabled := (v_event_pref->>p_channel)::BOOLEAN;
    IF v_channel_enabled IS NOT NULL THEN
      RETURN v_channel_enabled;
    END IF;
  END IF;
  
  -- Default: allow
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-delete old notifications (scheduled job)
CREATE OR REPLACE FUNCTION auto_delete_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER := 0;
  v_policy notification_policies;
BEGIN
  -- Get policy for each tenant and delete old notifications
  FOR v_policy IN SELECT * FROM notification_policies LOOP
    DELETE FROM notifications
    WHERE tenant_id = v_policy.tenant_id
      AND created_at < NOW() - (v_policy.retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  END LOOP;
  
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Notifications: Users can only see their own
DROP POLICY IF EXISTS notifications_user_isolation ON notifications;
DROP POLICY IF EXISTS notifications_user_isolation ON notifications;
CREATE POLICY notifications_user_isolation ON notifications
  FOR ALL
  USING (user_id = auth.uid());

-- Preferences: Users can manage their own
DROP POLICY IF EXISTS preferences_user_isolation ON notification_preferences;
DROP POLICY IF EXISTS preferences_user_isolation ON notification_preferences;
CREATE POLICY preferences_user_isolation ON notification_preferences
  FOR ALL
  USING (user_id = auth.uid());

-- Policies: Only admins can view/edit
DROP POLICY IF EXISTS policies_admin_only ON notification_policies;
DROP POLICY IF EXISTS policies_admin_only ON notification_policies;
CREATE POLICY policies_admin_only ON notification_policies
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Delivery Log: Users can see logs for their notifications
DROP POLICY IF EXISTS delivery_log_user_isolation ON notification_delivery_log;
DROP POLICY IF EXISTS delivery_log_user_isolation ON notification_delivery_log;
CREATE POLICY delivery_log_user_isolation ON notification_delivery_log
  FOR SELECT
  USING (
    notification_id IN (
      SELECT id FROM notifications WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 7. GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;
GRANT SELECT ON notification_policies TO authenticated;
GRANT UPDATE ON notification_policies TO service_role;
GRANT SELECT ON notification_delivery_log TO authenticated;
GRANT INSERT ON notification_delivery_log TO service_role;

GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION archive_notification(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION snooze_notification(UUID, UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION should_send_notification(UUID, VARCHAR, VARCHAR) TO authenticated;

-- =====================================================
-- 8. INITIAL DATA / SEED
-- =====================================================

-- Create default policies for all existing tenants
INSERT INTO notification_policies (tenant_id)
SELECT id FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM notification_policies)
ON CONFLICT (tenant_id) DO NOTHING;

-- Create default preferences for all existing users
INSERT INTO notification_preferences (user_id, tenant_id)
SELECT id, tenant_id FROM app_users
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMIT;

-- Verify tables created
DO $$
DECLARE
  v_tables TEXT[] := ARRAY['notifications', 'notification_preferences', 'notification_policies', 'notification_delivery_log'];
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
  
  RAISE NOTICE '🎉 Notifications system schema migration completed successfully!';
  RAISE NOTICE '📋 4 tables created: notifications, notification_preferences, notification_policies, notification_delivery_log';
  RAISE NOTICE '🔧 8 helper functions created for common operations';
  RAISE NOTICE '🔒 RLS policies enabled for data isolation';
END $$;

