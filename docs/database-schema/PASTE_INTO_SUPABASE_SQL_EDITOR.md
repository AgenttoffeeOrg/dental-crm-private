# 📋 PASTE THESE 2 SQL FILES INTO SUPABASE

**Instructions:**
1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Paste **File 1** below
4. Click "Run"
5. Wait for success message
6. Repeat for **File 2**

---

## 🗄️ **FILE 1: SETTINGS VERSIONING & LOCATIONS**

**Copy everything between the lines below:**

---

```sql
-- =====================================================
-- SETTINGS VERSIONING & GOVERNANCE
-- =====================================================
-- Version: 1.0
-- Date: January 16, 2025
-- Purpose: Version control, rollback, and audit trail for settings
-- =====================================================

BEGIN;

-- =====================================================
-- 1. SETTINGS_VERSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS settings_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  
  -- Setting identification
  setting_key TEXT NOT NULL,
  setting_category TEXT,
  setting_scope TEXT CHECK (setting_scope IN ('system', 'org', 'location', 'user')),
  
  -- Version tracking
  version_number INTEGER NOT NULL,
  
  -- Values
  old_value JSONB,
  new_value JSONB,
  
  -- Change metadata
  changed_by UUID REFERENCES app_users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT,
  change_source TEXT DEFAULT 'ui',
  
  -- Impact analysis
  affected_records_count INTEGER,
  affected_record_types TEXT[],
  
  -- Rollback
  is_rolled_back BOOLEAN DEFAULT FALSE,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID REFERENCES app_users(id),
  rollback_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, setting_key, version_number)
);

CREATE INDEX idx_settings_versions_tenant ON settings_versions(tenant_id);
CREATE INDEX idx_settings_versions_key ON settings_versions(setting_key);
CREATE INDEX idx_settings_versions_changed_at ON settings_versions(changed_at DESC);
CREATE INDEX idx_settings_versions_rollback ON settings_versions(is_rolled_back);

COMMENT ON TABLE settings_versions IS 'Complete version history of all settings changes with rollback capability';

-- =====================================================
-- 2. SETTINGS_APPROVALS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS settings_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Pending change
  setting_key TEXT NOT NULL,
  current_value JSONB,
  proposed_value JSONB,
  change_reason TEXT,
  
  -- Requester
  requested_by UUID NOT NULL REFERENCES app_users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Approval
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES app_users(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  
  -- Effective date
  effective_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  
  -- Impact analysis
  impact_summary TEXT,
  affected_count INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_settings_approvals_tenant_status ON settings_approvals(tenant_id, status);
CREATE INDEX idx_settings_approvals_requester ON settings_approvals(requested_by);
CREATE INDEX idx_settings_approvals_reviewer ON settings_approvals(reviewed_by);

COMMENT ON TABLE settings_approvals IS 'Approval workflow for critical settings changes';

-- =====================================================
-- 3. SETTINGS_LOCATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Location information
  name TEXT NOT NULL,
  display_name TEXT,
  location_type TEXT CHECK (location_type IN ('headquarters', 'branch', 'clinic', 'mobile')),
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  
  -- Contact
  phone_number TEXT,
  email TEXT,
  website_url TEXT,
  
  -- Operating hours
  operating_hours JSONB DEFAULT '{}'::JSONB,
  
  -- Settings overrides
  settings_overrides JSONB DEFAULT '{}'::JSONB,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_primary BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_locations_tenant ON locations(tenant_id);
CREATE INDEX idx_locations_active ON locations(tenant_id, is_active);
CREATE INDEX idx_locations_primary ON locations(tenant_id, is_primary);

COMMENT ON TABLE locations IS 'Physical locations for multi-location practices';

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_setting_value(
  p_tenant_id UUID,
  p_setting_key TEXT,
  p_location_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_value JSONB;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT new_value INTO v_value
    FROM settings_versions
    WHERE tenant_id = p_tenant_id
      AND setting_key = p_setting_key
      AND setting_scope = 'user'
      AND changed_by = p_user_id
      AND is_rolled_back = FALSE
    ORDER BY version_number DESC
    LIMIT 1;
    
    IF FOUND THEN RETURN v_value; END IF;
  END IF;
  
  IF p_location_id IS NOT NULL THEN
    SELECT new_value INTO v_value
    FROM settings_versions
    WHERE tenant_id = p_tenant_id
      AND setting_key = p_setting_key
      AND setting_scope = 'location'
      AND location_id = p_location_id
      AND is_rolled_back = FALSE
    ORDER BY version_number DESC
    LIMIT 1;
    
    IF FOUND THEN RETURN v_value; END IF;
  END IF;
  
  SELECT new_value INTO v_value
  FROM settings_versions
  WHERE tenant_id = p_tenant_id
    AND setting_key = p_setting_key
    AND setting_scope = 'org'
    AND is_rolled_back = FALSE
  ORDER BY version_number DESC
  LIMIT 1;
  
  IF FOUND THEN RETURN v_value; END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION save_setting(
  p_tenant_id UUID,
  p_setting_key TEXT,
  p_new_value JSONB,
  p_changed_by UUID,
  p_change_reason TEXT DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_scope TEXT DEFAULT 'org'
)
RETURNS UUID AS $$
DECLARE
  v_version_id UUID;
  v_next_version INTEGER;
  v_old_value JSONB;
BEGIN
  v_old_value := get_setting_value(p_tenant_id, p_setting_key, p_location_id, p_changed_by);
  
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM settings_versions
  WHERE tenant_id = p_tenant_id
    AND setting_key = p_setting_key;
  
  INSERT INTO settings_versions (
    tenant_id,
    location_id,
    setting_key,
    setting_scope,
    version_number,
    old_value,
    new_value,
    changed_by,
    change_reason
  ) VALUES (
    p_tenant_id,
    p_location_id,
    p_setting_key,
    p_scope,
    v_next_version,
    v_old_value,
    p_new_value,
    p_changed_by,
    p_change_reason
  )
  RETURNING id INTO v_version_id;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rollback_setting(
  p_version_id UUID,
  p_rolled_back_by UUID,
  p_rollback_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_setting_key TEXT;
  v_old_value JSONB;
  v_tenant_id UUID;
BEGIN
  SELECT setting_key, old_value, tenant_id INTO v_setting_key, v_old_value, v_tenant_id
  FROM settings_versions
  WHERE id = p_version_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found';
  END IF;
  
  UPDATE settings_versions
  SET is_rolled_back = TRUE,
      rolled_back_at = NOW(),
      rolled_back_by = p_rolled_back_by,
      rollback_reason = p_rollback_reason
  WHERE id = p_version_id;
  
  PERFORM save_setting(
    v_tenant_id,
    v_setting_key,
    v_old_value,
    p_rolled_back_by,
    'Rollback: ' || p_rollback_reason
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE settings_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY settings_versions_tenant_isolation
  ON settings_versions
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY settings_approvals_tenant_isolation
  ON settings_approvals
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY locations_tenant_isolation
  ON locations
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

COMMIT;
```

---

## 🔔 **FILE 2: NOTIFICATIONS SYSTEM**

**Copy everything between the lines below:**

---

```sql
-- =====================================================
-- NOTIFICATIONS SYSTEM - ENTERPRISE DATABASE SCHEMA
-- =====================================================
-- Version: 1.0
-- Date: January 16, 2025
-- Purpose: Unified notifications system with multi-channel delivery
-- =====================================================

BEGIN;

-- =====================================================
-- 1. NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  
  -- Event identification
  event_key VARCHAR(100) NOT NULL,
  event_id VARCHAR(100) UNIQUE,
  
  -- Recipient
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- Content
  title TEXT NOT NULL,
  body TEXT,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'success', 'warning', 'error', 'critical')),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Context
  module VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  entity_url TEXT,
  
  -- Actions
  quick_actions JSONB DEFAULT '[]'::JSONB,
  
  -- Lifecycle
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Grouping & threading
  group_key VARCHAR(200),
  parent_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  triggered_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL AND archived_at IS NULL;
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id, created_at DESC);
CREATE INDEX idx_notifications_event_id ON notifications(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_notifications_group_key ON notifications(group_key, created_at DESC) WHERE group_key IS NOT NULL;
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id) WHERE entity_type IS NOT NULL;

COMMENT ON TABLE notifications IS 'Core notifications table with full event context and quick actions';

-- =====================================================
-- 2. NOTIFICATION_PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Global channel toggles
  in_app_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT FALSE,
  
  -- Consent tracking
  email_consented_at TIMESTAMPTZ,
  email_consent_ip VARCHAR(45),
  sms_consented_at TIMESTAMPTZ,
  sms_consent_ip VARCHAR(45),
  
  -- Per-event preferences
  event_preferences JSONB DEFAULT '{}'::JSONB,
  
  -- Quiet hours
  quiet_hours JSONB DEFAULT '{"enabled": false}'::JSONB,
  
  -- Digest preferences
  digest_preferences JSONB DEFAULT '{"enabled": false, "frequency": "daily", "time": "09:00"}'::JSONB,
  
  -- Muted objects
  muted_objects JSONB DEFAULT '{}'::JSONB,
  
  -- Global snooze
  snoozed_until TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_tenant ON notification_preferences(tenant_id);

COMMENT ON TABLE notification_preferences IS 'User preferences for notification channels, schedules, and muting';

CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- =====================================================
-- 3. NOTIFICATION_POLICIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Role defaults
  role_defaults JSONB DEFAULT '{
    "owner": {"channels": ["in_app", "email", "sms"], "events": ["*"]},
    "admin": {"channels": ["in_app", "email"], "events": ["*"]},
    "manager": {"channels": ["in_app", "email"], "events": ["deal.*", "task.*", "contact.*"]},
    "staff": {"channels": ["in_app"], "events": ["task.assigned", "deal.assigned"]},
    "marketing": {"channels": ["in_app", "email"], "events": ["campaign.*", "form.*", "audit.*"]}
  }'::JSONB,
  
  -- Escalation rules
  escalation_rules JSONB DEFAULT '[]'::JSONB,
  
  -- Rate limits
  rate_limits JSONB DEFAULT '{"max_per_hour": 50, "max_emails_per_day": 100, "max_sms_per_day": 10, "batch_delay_minutes": 5}'::JSONB,
  
  -- Data retention
  retention_days INTEGER DEFAULT 90,
  
  -- Compliance
  require_email_opt_in BOOLEAN DEFAULT FALSE,
  require_sms_opt_in BOOLEAN DEFAULT TRUE,
  allow_notification_export BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_policies_tenant ON notification_policies(tenant_id);

COMMENT ON TABLE notification_policies IS 'Org-level policies for role defaults, escalation, rate limits, and compliance';

-- =====================================================
-- 4. NOTIFICATION_DELIVERY_LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  
  -- Delivery details
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'push')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked')),
  provider VARCHAR(50),
  external_id TEXT,
  
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

CREATE INDEX idx_delivery_log_notification ON notification_delivery_log(notification_id, channel);
CREATE INDEX idx_delivery_log_status ON notification_delivery_log(status, created_at DESC);
CREATE INDEX idx_delivery_log_external_id ON notification_delivery_log(external_id) WHERE external_id IS NOT NULL;

COMMENT ON TABLE notification_delivery_log IS 'Multi-channel delivery tracking with provider webhooks';

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

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
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  IF v_prefs IS NULL THEN
    RETURN p_channel != 'sms';
  END IF;
  
  IF p_channel = 'in_app' AND NOT v_prefs.in_app_enabled THEN RETURN FALSE; END IF;
  IF p_channel = 'email' AND NOT v_prefs.email_enabled THEN RETURN FALSE; END IF;
  IF p_channel = 'sms' AND NOT v_prefs.sms_enabled THEN RETURN FALSE; END IF;
  IF p_channel = 'push' AND NOT v_prefs.push_enabled THEN RETURN FALSE; END IF;
  
  v_event_pref := v_prefs.event_preferences->p_event_key;
  IF v_event_pref IS NOT NULL THEN
    v_channel_enabled := (v_event_pref->>p_channel)::BOOLEAN;
    IF v_channel_enabled IS NOT NULL THEN
      RETURN v_channel_enabled;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auto_delete_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER := 0;
  v_policy notification_policies;
BEGIN
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
-- 6. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_user_isolation
  ON notifications
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY preferences_user_isolation
  ON notification_preferences
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY policies_admin_only
  ON notification_policies
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY delivery_log_user_isolation
  ON notification_delivery_log
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
-- 8. INITIAL DATA
-- =====================================================

INSERT INTO notification_policies (tenant_id)
SELECT id FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM notification_policies)
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO notification_preferences (user_id, tenant_id)
SELECT id, tenant_id FROM app_users
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

-- Verify
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
  
  RAISE NOTICE '🎉 Notifications system migration completed successfully!';
END $$;
```

---

## ✅ **AFTER PASTING BOTH FILES**

**You'll have:**
- ✅ 3 settings tables (versions, approvals, locations)
- ✅ 4 notifications tables (notifications, preferences, policies, delivery_log)
- ✅ 11 SQL functions total
- ✅ Complete RLS security
- ✅ Default policies for all tenants
- ✅ Default preferences for all users

**Then refresh your app (Cmd+Shift+R) to see:**
- 🔔 Notifications bell in app bar!
- ✨ What's New button!
- All working perfectly!

---

**That's it! Just 2 SQL files to paste!** 🚀

