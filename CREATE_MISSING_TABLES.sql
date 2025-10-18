-- ================================================================
-- CREATE ONLY MISSING TABLES
-- ================================================================
-- Creates ONLY the 4 tables that are missing:
-- 1. billing_plans
-- 2. billing_subscriptions  
-- 3. join_requests
-- 4. marketing_audit_shares
-- ================================================================

BEGIN;

-- =====================================================
-- 1. BILLING_PLANS
-- =====================================================

CREATE TABLE IF NOT EXISTS billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  features JSONB DEFAULT '[]'::jsonb,
  limits JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_plans_slug ON billing_plans(slug);
CREATE INDEX IF NOT EXISTS idx_billing_plans_active ON billing_plans(is_active);

-- =====================================================
-- 2. BILLING_SUBSCRIPTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES billing_plans(id),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  seats_total INTEGER DEFAULT 1,
  seats_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_subs_tenant ON billing_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_subs_plan ON billing_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_billing_subs_stripe ON billing_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_subs_status ON billing_subscriptions(status);

-- =====================================================
-- 3. JOIN_REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  organization_id UUID,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  requested_role TEXT DEFAULT 'staff',
  status TEXT NOT NULL DEFAULT 'pending',
  token TEXT UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES app_users(id),
  rejected_by UUID REFERENCES app_users(id),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_join_requests_email ON join_requests(email);
CREATE INDEX IF NOT EXISTS idx_join_requests_tenant ON join_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_token ON join_requests(token);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON join_requests(status);

-- =====================================================
-- 4. MARKETING_AUDIT_SHARES
-- =====================================================

CREATE TABLE IF NOT EXISTS marketing_audit_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  audit_run_id UUID,
  share_token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES app_users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_shares_token ON marketing_audit_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_audit_shares_tenant ON marketing_audit_shares(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_shares_expires ON marketing_audit_shares(expires_at);

-- =====================================================
-- ENABLE RLS ON ALL NEW TABLES
-- =====================================================

ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_audit_shares ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES (with DROP IF EXISTS first)
-- =====================================================

-- billing_plans - public read
DROP POLICY IF EXISTS billing_plans_public_read ON billing_plans;
CREATE POLICY billing_plans_public_read ON billing_plans
  FOR SELECT USING (is_active = TRUE);

-- billing_subscriptions - tenant isolation
DROP POLICY IF EXISTS billing_subs_tenant_isolation ON billing_subscriptions;
CREATE POLICY billing_subs_tenant_isolation ON billing_subscriptions
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM app_users WHERE id = auth.uid()
  ));

-- join_requests - tenant isolation
DROP POLICY IF EXISTS join_requests_tenant_isolation ON join_requests;
CREATE POLICY join_requests_tenant_isolation ON join_requests
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- marketing_audit_shares - tenant isolation + public share
DROP POLICY IF EXISTS audit_shares_tenant_isolation ON marketing_audit_shares;
CREATE POLICY audit_shares_tenant_isolation ON marketing_audit_shares
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
    OR is_active = TRUE
  );

COMMIT;

SELECT 'All 4 missing tables created successfully!' as result;

