-- =====================================================
-- PHASE 4 – AUTONOMOUS ENGAGEMENT & BOT READINESS
-- Adds campaign orchestration + bot conversation tables
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ENGAGEMENT CAMPAIGN TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS engagement_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'paused', 'archived')) DEFAULT 'draft',
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  schedule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  timezone TEXT DEFAULT 'UTC',
  created_by_user_id UUID REFERENCES app_users(id),
  updated_by_user_id UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_campaigns_tenant ON engagement_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_engagement_campaigns_status ON engagement_campaigns(status);

CREATE TABLE IF NOT EXISTS engagement_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES engagement_campaigns(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL CHECK (
    step_type IN (
      'send_email',
      'send_sms',
      'send_whatsapp',
      'wait',
      'ai_message',
      'notify_human',
      'webhook',
      'branch'
    )
  ),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  wait_duration_seconds INTEGER,
  ai_prompt TEXT,
  branch_conditions JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_engagement_steps_campaign ON engagement_steps(campaign_id);

CREATE TABLE IF NOT EXISTS engagement_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES engagement_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'waiting', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  current_step_order INTEGER DEFAULT 0,
  next_run_at TIMESTAMP WITH TIME ZONE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_enrollments_tenant ON engagement_enrollments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_engagement_enrollments_campaign ON engagement_enrollments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_engagement_enrollments_status ON engagement_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_engagement_enrollments_due ON engagement_enrollments(next_run_at) WHERE next_run_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS engagement_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES engagement_campaigns(id) ON DELETE SET NULL,
  enrollment_id UUID REFERENCES engagement_enrollments(id) ON DELETE SET NULL,
  step_id UUID REFERENCES engagement_steps(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_events_tenant ON engagement_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_engagement_events_type ON engagement_events(event_type);

-- =====================================================
-- 2. BOT CONVERSATION TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS bot_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('web', 'sms', 'whatsapp', 'voice', 'api')),
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'escalated', 'closed')) DEFAULT 'active',
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  automation_source UUID REFERENCES engagement_campaigns(id) ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES app_users(id),
  created_by_user_id UUID REFERENCES app_users(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_bot_sessions_tenant ON bot_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_status ON bot_sessions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_sessions_active_unique
  ON bot_sessions (tenant_id, contact_id, channel)
  WHERE status IN ('active', 'paused');

CREATE TABLE IF NOT EXISTS bot_turns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('patient', 'bot', 'human', 'system')),
  message TEXT NOT NULL,
  metadata JSONB,
  confidence_score NUMERIC(4,3),
  intent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_turns_session ON bot_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_bot_turns_role ON bot_turns(role);

CREATE TABLE IF NOT EXISTS bot_escalations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  requested_by TEXT NOT NULL CHECK (requested_by IN ('patient', 'bot', 'human')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'acknowledged', 'resolved', 'dismissed')) DEFAULT 'pending',
  assigned_user_id UUID REFERENCES app_users(id),
  resolved_by_user_id UUID REFERENCES app_users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_bot_escalations_session ON bot_escalations(session_id);
CREATE INDEX IF NOT EXISTS idx_bot_escalations_status ON bot_escalations(status);

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE engagement_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_escalations ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY IF NOT EXISTS "Service role manages engagement campaigns"
  ON engagement_campaigns
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role manages engagement steps"
  ON engagement_steps
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role manages engagement enrollments"
  ON engagement_enrollments
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role manages engagement events"
  ON engagement_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role manages bot sessions"
  ON bot_sessions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role manages bot turns"
  ON bot_turns
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role manages bot escalations"
  ON bot_escalations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Tenant member policies
CREATE POLICY IF NOT EXISTS "Tenant members read engagement campaigns"
  ON engagement_campaigns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM app_users au
      WHERE au.id = auth.uid()
        AND au.tenant_id = engagement_campaigns.tenant_id
    )
  );

CREATE POLICY IF NOT EXISTS "Tenant members modify engagement campaigns"
  ON engagement_campaigns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_users au
      WHERE au.id = auth.uid()
        AND au.tenant_id = engagement_campaigns.tenant_id
    )
  );

CREATE POLICY IF NOT EXISTS "Tenant members update engagement campaigns"
  ON engagement_campaigns
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM app_users au
      WHERE au.id = auth.uid()
        AND au.tenant_id = engagement_campaigns.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_users au
      WHERE au.id = auth.uid()
        AND au.tenant_id = engagement_campaigns.tenant_id
    )
  );

CREATE POLICY IF NOT EXISTS "Tenant members delete engagement campaigns"
  ON engagement_campaigns
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM app_users au
      WHERE au.id = auth.uid()
        AND au.tenant_id = engagement_campaigns.tenant_id
    )
  );

CREATE POLICY IF NOT EXISTS "Tenant members access engagement steps"
  ON engagement_steps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM app_users au
      WHERE au.id = auth.uid()
        AND au.tenant_id = engagement_steps.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_users au
      WHERE au.id = auth.uid()
        AND au.tenant_id = engagement_steps.tenant_id
    )
  );

CREATE POLICY IF NOT EXISTS "Tenant members access engagement enrollments"
  ON engagement_enrollments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM app_users au
      WHERE au.id = auth.uid()
        AND au.tenant_id = engagement_enrollments.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_users au
      WHERE au.id = auth.uid()
        AND au.tenant_id = engagement_enrollments.tenant_id
    )
  );

CREATE POLICY IF NOT EXISTS "Tenant members access engagement events"
  ON engagement_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM app_users au
      WHERE au.id = auth.uid()
        AND au.tenant_id = engagement_events.tenant_id
    )
  );

CREATE POLICY IF NOT EXISTS "Tenant members insert engagement events"
  ON engagement_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_users au
      WHERE au.id = auth.uid()
        AND au.tenant_id = engagement_events.tenant_id
    )
  );

CREATE POLICY IF NOT EXISTS "Tenant members access bot sessions"
  ON bot_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM app_users au
      WHERE au.id = auth.uid()
        AND au.tenant_id = bot_sessions.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_users au
      WHERE au.id = auth.uid()
        AND au.tenant_id = bot_sessions.tenant_id
    )
  );

CREATE POLICY IF NOT EXISTS "Tenant members access bot turns"
  ON bot_turns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM app_users au
      WHERE au.id = auth.uid()
        AND au.tenant_id = bot_turns.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_users au
      WHERE au.id = auth.uid()
        AND au.tenant_id = bot_turns.tenant_id
    )
  );

CREATE POLICY IF NOT EXISTS "Tenant members access bot escalations"
  ON bot_escalations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM app_users au
      WHERE au.id = auth.uid()
        AND au.tenant_id = bot_escalations.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_users au
      WHERE au.id = auth.uid()
        AND au.tenant_id = bot_escalations.tenant_id
    )
  );

COMMIT;


