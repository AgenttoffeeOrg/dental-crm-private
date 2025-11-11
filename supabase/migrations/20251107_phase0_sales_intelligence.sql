-- =====================================================
-- PHASE 0 FOUNDATION: SALES INTELLIGENCE & CONTEXTUAL DATA
-- -----------------------------------------------------
-- Adds conversation/session primitives, psychological profiles,
-- sales script catalog + experimentation tables, conversion attribution,
-- receptionist feedback, and competitor intelligence.
--
-- Also backfills existing CRM records to ensure location scoping is populated.
-- Row-Level Security is enforced for every new table.
--
-- NOTE: This migration assumes prior hardening migrations
-- (updated_at / tenant protection triggers, auth.get_user_org_id()).
-- =====================================================

BEGIN;

-- =====================================================
-- 1. SALES SCRIPT LIBRARY & METRICS
-- =====================================================

CREATE TABLE IF NOT EXISTS sales_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  persona TEXT,
  stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE sales_scripts IS 'Tenant-scoped catalog of sales playbooks/scripts.';

CREATE INDEX IF NOT EXISTS idx_sales_scripts_tenant_active
  ON sales_scripts(tenant_id, is_active)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sales_script_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  script_id UUID NOT NULL REFERENCES sales_scripts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tone TEXT,
  target_persona TEXT,
  hypothesis TEXT,
  rollout_strategy TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(script_id, version_number)
);

COMMENT ON TABLE sales_script_versions IS 'Versioned content for sales scripts with hypothesis metadata.';

CREATE INDEX IF NOT EXISTS idx_sales_script_versions_tenant
  ON sales_script_versions(tenant_id, script_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sales_script_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','running','paused','completed','archived')),
  primary_metric TEXT DEFAULT 'conversion_rate',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sales_script_tests_tenant_status
  ON sales_script_tests(tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sales_script_metrics (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  script_version_id UUID NOT NULL REFERENCES sales_script_versions(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  usages INTEGER DEFAULT 0,
  successful_outcomes INTEGER DEFAULT 0,
  total_revenue_cents BIGINT DEFAULT 0,
  average_handle_seconds INTEGER DEFAULT 0,
  sentiment_shift NUMERIC(6,3),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sales_script_metrics IS 'Daily aggregates per script version (usage, outcomes, revenue).';

CREATE INDEX IF NOT EXISTS idx_sales_script_metrics_tenant_date
  ON sales_script_metrics(tenant_id, metric_date);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_script_metrics_version_date
  ON sales_script_metrics(script_version_id, metric_date);

-- Associate versions to tests (many-to-many)
CREATE TABLE IF NOT EXISTS sales_script_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES sales_script_tests(id) ON DELETE CASCADE,
  script_version_id UUID NOT NULL REFERENCES sales_script_versions(id) ON DELETE CASCADE,
  allocation_weight NUMERIC(5,2) DEFAULT 0 CHECK (allocation_weight >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(test_id, script_version_id)
);

-- =====================================================
-- 2. CONVERSATION SESSION PRIMITIVES
-- =====================================================

CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'unknown' CHECK (channel IN ('phone','sms','whatsapp','email','webchat','in_person','bot','unknown')),
  direction TEXT CHECK (direction IN ('inbound','outbound','mixed')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','archived','error')),
  active_stage TEXT,
  current_state TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  last_event_at TIMESTAMPTZ,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  assistant_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_tenant_status
  ON conversation_sessions(tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_contact
  ON conversation_sessions(contact_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  sender_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL DEFAULT 'transcript' CHECK (message_type IN ('transcript','note','agent','customer','system')),
  direction TEXT CHECK (direction IN ('inbound','outbound','system')),
  channel TEXT CHECK (channel IN ('phone','sms','whatsapp','email','webchat','bot','note')),
  content TEXT,
  content_json JSONB,
  sentiment TEXT CHECK (sentiment IN ('positive','neutral','negative')),
  intent JSONB,
  script_version_id UUID REFERENCES sales_script_versions(id) ON DELETE SET NULL,
  transcript_offset_ms INTEGER,
  provider_message_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_time
  ON conversation_messages(session_id, occurred_at)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS conversation_state_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  trigger_source TEXT CHECK (trigger_source IN ('automation','agent','ai','webhook','system')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC(5,4),
  script_version_id UUID REFERENCES sales_script_versions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conversation_state_events_session
  ON conversation_state_events(session_id, created_at);

CREATE TABLE IF NOT EXISTS conversation_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  from_state TEXT,
  to_state TEXT NOT NULL,
  event_id UUID REFERENCES conversation_state_events(id) ON DELETE SET NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conversation_state_transitions_session
  ON conversation_state_transitions(session_id, created_at);

CREATE TABLE IF NOT EXISTS receptionist_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  categories TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- =====================================================
-- 3. PSYCHOLOGICAL PROFILES
-- =====================================================

CREATE TABLE IF NOT EXISTS contact_psych_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  anxiety_level INTEGER CHECK (anxiety_level BETWEEN 0 AND 100),
  trust_score INTEGER CHECK (trust_score BETWEEN 0 AND 100),
  decision_style TEXT,
  communication_style TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_psych_profiles_contact
  ON contact_psych_profiles(contact_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS contact_psych_profile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES contact_psych_profiles(id) ON DELETE SET NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 4. CONVERSION ATTRIBUTION & FEEDBACK
-- =====================================================

CREATE TABLE IF NOT EXISTS conversion_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  session_id UUID REFERENCES conversation_sessions(id) ON DELETE SET NULL,
  script_version_id UUID REFERENCES sales_script_versions(id) ON DELETE SET NULL,
  attribution_model TEXT DEFAULT 'multi_touch',
  weight NUMERIC(6,4) DEFAULT 0,
  revenue_cents BIGINT DEFAULT 0,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conversion_attributions_tenant
  ON conversion_attributions(tenant_id, occurred_at)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversion_attributions_tuple
  ON conversion_attributions(tenant_id, contact_id, deal_id, activity_id, session_id, script_version_id, occurred_at);

-- =====================================================
-- 5. COMPETITOR INTELLIGENCE
-- =====================================================

CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT,
  primary_location TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_competitors_tenant_active
  ON competitors(tenant_id, is_active)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS competitor_price_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  treatment_code TEXT,
  treatment_name TEXT,
  price_cents BIGINT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_competitor_price_points_competitor
  ON competitor_price_points(competitor_id, collected_at)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS competitor_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  touchpoint_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  summary TEXT,
  link TEXT,
  captured_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_competitor_touchpoints_type
  ON competitor_touchpoints(tenant_id, touchpoint_type, occurred_at DESC)
  WHERE deleted_at IS NULL;

-- 6. RLS POLICIES
-- =====================================================

-- Helper macro to create standard tenant policies
-- (Inline exec loops keep style consistent with earlier migrations)
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT unnest(ARRAY[
    'sales_scripts',
    'sales_script_versions',
    'sales_script_tests',
    'sales_script_metrics',
    'sales_script_test_variants',
    'conversation_sessions',
    'conversation_messages',
    'conversation_state_events',
    'conversation_state_transitions',
    'receptionist_feedback',
    'contact_psych_profiles',
    'contact_psych_profile_history',
    'conversion_attributions',
    'competitors',
    'competitor_price_points',
    'competitor_touchpoints'
  ]) AS tbl LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', rec.tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation SELECT %1$I" ON %1$I', rec.tbl);
    EXECUTE format('CREATE POLICY "Tenant isolation SELECT %1$I" ON %1$I FOR SELECT USING (tenant_id = public.get_user_org_id())', rec.tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation INSERT %1$I" ON %1$I', rec.tbl);
    EXECUTE format('CREATE POLICY "Tenant isolation INSERT %1$I" ON %1$I FOR INSERT WITH CHECK (tenant_id = public.get_user_org_id())', rec.tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation UPDATE %1$I" ON %1$I', rec.tbl);
    EXECUTE format('CREATE POLICY "Tenant isolation UPDATE %1$I" ON %1$I FOR UPDATE USING (tenant_id = public.get_user_org_id()) WITH CHECK (tenant_id = public.get_user_org_id())', rec.tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation DELETE %1$I" ON %1$I', rec.tbl);
    EXECUTE format('CREATE POLICY "Tenant isolation DELETE %1$I" ON %1$I FOR DELETE USING (tenant_id = public.get_user_org_id())', rec.tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Service role bypass %1$I" ON %1$I', rec.tbl);
    EXECUTE format('CREATE POLICY "Service role bypass %1$I" ON %1$I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')', rec.tbl);
  END LOOP;
END $$;

-- contact_psych_profile_history needs insert WHEN parent profile exists with same tenant
DROP POLICY IF EXISTS "Tenant isolation INSERT contact_psych_profile_history" ON contact_psych_profile_history;
CREATE POLICY "Tenant isolation INSERT contact_psych_profile_history"
  ON contact_psych_profile_history
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_org_id()
    AND (
      profile_id IS NULL
      OR EXISTS (
        SELECT 1 FROM contact_psych_profiles cpp
        WHERE cpp.id = contact_psych_profile_history.profile_id
          AND cpp.tenant_id = public.get_user_org_id()
      )
    )
  );

-- =====================================================
-- 7. DATA BACKFILLS (LOCATION & RELATIONAL CONSISTENCY)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🔄 Backfilling tasks.location_id from deals/contact context...';
END $$;

UPDATE tasks t
SET location_id = COALESCE(
    d.location_id,
    (
      SELECT c.location_id
      FROM contacts c
      WHERE c.id = t.contact_id
      LIMIT 1
    ),
    t.location_id
  )
FROM deals d
WHERE t.deal_id = d.id
  AND t.location_id IS NULL;

UPDATE tasks t
SET location_id = COALESCE(c.location_id, t.location_id)
FROM contacts c
WHERE t.contact_id = c.id
  AND t.location_id IS NULL;

UPDATE deals d
SET location_id = COALESCE(
    d.location_id,
    c.location_id
  )
FROM contacts c
WHERE d.contact_id = c.id
  AND d.location_id IS NULL;

UPDATE activities a
SET location_id = COALESCE(
    a.location_id,
    d.location_id,
    (
      SELECT c.location_id
      FROM contacts c
      WHERE c.id = a.contact_id
      LIMIT 1
    )
  )
FROM deals d
WHERE a.deal_id = d.id
  AND a.location_id IS NULL;

DO $$
DECLARE
  v_tasks INTEGER;
  v_deals INTEGER;
  v_activities INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_tasks FROM tasks WHERE location_id IS NULL;
  SELECT COUNT(*) INTO v_deals FROM deals WHERE location_id IS NULL;
  SELECT COUNT(*) INTO v_activities FROM activities WHERE location_id IS NULL;

  RAISE NOTICE '✅ Backfill complete. Remaining tasks without location: %', v_tasks;
  RAISE NOTICE '✅ Remaining deals without location: %', v_deals;
  RAISE NOTICE '✅ Remaining activities without location: %', v_activities;
END $$;

-- =====================================================
-- 8. VERIFICATION LOGGING
-- =====================================================

DO $$
DECLARE
  v_table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'sales_scripts',
      'sales_script_versions',
      'sales_script_tests',
      'sales_script_metrics',
      'sales_script_test_variants',
      'conversation_sessions',
      'conversation_messages',
      'conversation_state_events',
      'conversation_state_transitions',
      'receptionist_feedback',
      'contact_psych_profiles',
      'contact_psych_profile_history',
      'conversion_attributions',
      'competitors',
      'competitor_price_points',
      'competitor_touchpoints'
    );

  RAISE NOTICE '✅ Created % new intelligence tables', v_table_count;
END $$;

COMMIT;

-- =====================================================
-- DOWN MIGRATION
-- =====================================================

-- Rollback strategy: drop dependent tables in reverse order of creation.

BEGIN;

DROP TABLE IF EXISTS competitor_touchpoints CASCADE;
DROP TABLE IF EXISTS competitor_price_points CASCADE;
DROP TABLE IF EXISTS competitors CASCADE;

DROP TABLE IF EXISTS conversion_attributions CASCADE;

DROP TABLE IF EXISTS contact_psych_profile_history CASCADE;
DROP TABLE IF EXISTS contact_psych_profiles CASCADE;

DROP TABLE IF EXISTS receptionist_feedback CASCADE;
DROP TABLE IF EXISTS conversation_state_transitions CASCADE;
DROP TABLE IF EXISTS conversation_state_events CASCADE;
DROP TABLE IF EXISTS conversation_messages CASCADE;
DROP TABLE IF EXISTS conversation_sessions CASCADE;

DROP TABLE IF EXISTS sales_script_test_variants CASCADE;
DROP TABLE IF EXISTS sales_script_metrics CASCADE;
DROP TABLE IF EXISTS sales_script_tests CASCADE;
DROP TABLE IF EXISTS sales_script_versions CASCADE;
DROP TABLE IF EXISTS sales_scripts CASCADE;

COMMIT;

