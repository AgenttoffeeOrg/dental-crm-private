-- =====================================================
-- PHASE 1: SCRIPT LIBRARY & RECOMMENDATION FOUNDATIONS
-- -----------------------------------------------------
-- Adds opinionated metadata to sales script tables,
-- introduces script usage + outcome tracking, and
-- seeds helper functions for analytics refresh.
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Enhance sales_scripts for slug/category access
-- -----------------------------------------------------

ALTER TABLE sales_scripts
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS marketing_hook TEXT;

UPDATE sales_scripts
SET slug = lower(regexp_replace(name, '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL;

ALTER TABLE sales_scripts
  ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sales_scripts_tenant_slug_key'
  ) THEN
    ALTER TABLE sales_scripts
      ADD CONSTRAINT sales_scripts_tenant_slug_key UNIQUE (tenant_id, slug);
  END IF;
END $$;

-- -----------------------------------------------------
-- 2. Enrich sales_script_versions with ranking metadata
-- -----------------------------------------------------

ALTER TABLE sales_script_versions
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS trigger_type TEXT,
  ADD COLUMN IF NOT EXISTS persona_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS variant_label TEXT,
  ADD COLUMN IF NOT EXISTS tone_descriptor TEXT,
  ADD COLUMN IF NOT EXISTS estimated_duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

UPDATE sales_script_versions
SET slug = lower(regexp_replace(coalesce(title, 'v' || version_number), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL;

ALTER TABLE sales_script_versions
  ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sales_script_versions_unique_slug'
  ) THEN
    ALTER TABLE sales_script_versions
      ADD CONSTRAINT sales_script_versions_unique_slug UNIQUE (tenant_id, slug);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_script_versions_trigger
  ON sales_script_versions(tenant_id, trigger_type)
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------
-- 3. Script usage + outcomes tables
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS sales_script_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  script_id UUID NOT NULL REFERENCES sales_scripts(id) ON DELETE CASCADE,
  script_version_id UUID NOT NULL REFERENCES sales_script_versions(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  trigger_type TEXT,
  persona_snapshot JSONB DEFAULT '{}'::jsonb,
  used_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  helpful BOOLEAN,
  helpful_recorded_at TIMESTAMPTZ,
  feedback TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_script_usages_tenant_version
  ON sales_script_usages(tenant_id, script_version_id, used_at DESC);

CREATE INDEX IF NOT EXISTS idx_script_usages_contact
  ON sales_script_usages(contact_id, used_at DESC);

CREATE INDEX IF NOT EXISTS idx_script_usages_deal
  ON sales_script_usages(deal_id, used_at DESC);

CREATE TABLE IF NOT EXISTS conversation_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  usage_id UUID REFERENCES sales_script_usages(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  outcome_type TEXT NOT NULL CHECK (outcome_type IN (
    'appointment_booked',
    'deal_won',
    'deal_lost',
    'follow_up',
    'not_helpful',
    'other'
  )),
  outcome_score INTEGER,
  notes TEXT,
  revenue_cents BIGINT DEFAULT 0,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_conversation_outcomes_tenant_type
  ON conversation_outcomes(tenant_id, outcome_type, occurred_at DESC);

-- -----------------------------------------------------
-- 4. Analytics helper functions + triggers
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION recompute_sales_script_version_stats(p_script_version_id UUID)
RETURNS VOID AS $$
DECLARE
  usage_summary RECORD;
BEGIN
  SELECT
    COUNT(*) AS total_usage,
    COUNT(*) FILTER (WHERE helpful IS TRUE) AS helpful_usage,
    MAX(used_at) AS last_used
  INTO usage_summary
  FROM sales_script_usages
  WHERE script_version_id = p_script_version_id;

  UPDATE sales_script_versions
  SET usage_count = COALESCE(usage_summary.total_usage, 0),
      helpful_count = COALESCE(usage_summary.helpful_usage, 0),
      success_rate = CASE
        WHEN COALESCE(usage_summary.total_usage, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(usage_summary.helpful_usage, 0)::NUMERIC / usage_summary.total_usage) * 100, 2)
      END,
      last_used_at = usage_summary.last_used,
      updated_at = NOW()
  WHERE id = p_script_version_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_refresh_sales_script_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_version UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_version := OLD.script_version_id;
  ELSE
    target_version := NEW.script_version_id;
  END IF;

  PERFORM recompute_sales_script_version_stats(target_version);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_sales_script_usage ON sales_script_usages;
CREATE TRIGGER trg_after_sales_script_usage
AFTER INSERT OR UPDATE OR DELETE ON sales_script_usages
FOR EACH ROW EXECUTE FUNCTION trg_refresh_sales_script_stats();

-- -----------------------------------------------------
-- 5. Row Level Security for new tables
-- -----------------------------------------------------

ALTER TABLE sales_script_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT sales_script_usages" ON sales_script_usages;
CREATE POLICY "Tenant isolation SELECT sales_script_usages"
  ON sales_script_usages
  FOR SELECT USING (tenant_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation INSERT sales_script_usages" ON sales_script_usages;
CREATE POLICY "Tenant isolation INSERT sales_script_usages"
  ON sales_script_usages
  FOR INSERT WITH CHECK (tenant_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation UPDATE sales_script_usages" ON sales_script_usages;
CREATE POLICY "Tenant isolation UPDATE sales_script_usages"
  ON sales_script_usages
  FOR UPDATE USING (tenant_id = public.get_user_org_id())
  WITH CHECK (tenant_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation DELETE sales_script_usages" ON sales_script_usages;
CREATE POLICY "Tenant isolation DELETE sales_script_usages"
  ON sales_script_usages
  FOR DELETE USING (tenant_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass sales_script_usages" ON sales_script_usages;
CREATE POLICY "Service role bypass sales_script_usages"
  ON sales_script_usages
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation SELECT conversation_outcomes" ON conversation_outcomes;
CREATE POLICY "Tenant isolation SELECT conversation_outcomes"
  ON conversation_outcomes
  FOR SELECT USING (tenant_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation INSERT conversation_outcomes" ON conversation_outcomes;
CREATE POLICY "Tenant isolation INSERT conversation_outcomes"
  ON conversation_outcomes
  FOR INSERT WITH CHECK (tenant_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation UPDATE conversation_outcomes" ON conversation_outcomes;
CREATE POLICY "Tenant isolation UPDATE conversation_outcomes"
  ON conversation_outcomes
  FOR UPDATE USING (tenant_id = public.get_user_org_id())
  WITH CHECK (tenant_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation DELETE conversation_outcomes" ON conversation_outcomes;
CREATE POLICY "Tenant isolation DELETE conversation_outcomes"
  ON conversation_outcomes
  FOR DELETE USING (tenant_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass conversation_outcomes" ON conversation_outcomes;
CREATE POLICY "Service role bypass conversation_outcomes"
  ON conversation_outcomes
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;

-- =====================================================
-- DOWN MIGRATION
-- =====================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_after_sales_script_usage ON sales_script_usages;
DROP FUNCTION IF EXISTS trg_refresh_sales_script_stats;
DROP FUNCTION IF EXISTS recompute_sales_script_version_stats;

DROP TABLE IF EXISTS conversation_outcomes CASCADE;
DROP TABLE IF EXISTS sales_script_usages CASCADE;

ALTER TABLE sales_script_versions
  DROP COLUMN IF EXISTS last_used_at,
  DROP COLUMN IF EXISTS success_rate,
  DROP COLUMN IF EXISTS helpful_count,
  DROP COLUMN IF EXISTS usage_count,
  DROP COLUMN IF EXISTS estimated_duration_seconds,
  DROP COLUMN IF EXISTS tone_descriptor,
  DROP COLUMN IF EXISTS variant_label,
  DROP COLUMN IF EXISTS persona_tags,
  DROP COLUMN IF EXISTS trigger_type,
  DROP COLUMN IF EXISTS slug;

ALTER TABLE sales_script_versions
  DROP CONSTRAINT IF EXISTS sales_script_versions_unique_slug;

ALTER TABLE sales_scripts
  DROP COLUMN IF EXISTS marketing_hook,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS slug;

ALTER TABLE sales_scripts
  DROP CONSTRAINT IF EXISTS sales_scripts_tenant_slug_key;

COMMIT;

