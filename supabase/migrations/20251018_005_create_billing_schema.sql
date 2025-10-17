-- =====================================================
-- Migration: Create Billing Schema
-- Purpose: Plans, subscriptions, seat management, entitlements
-- Safety: New tables, no impact on existing functionality
-- Billing: Org-centric (one subscription per org or dental group)
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE PLANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS plans (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Plan identity
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Tier classification
  tier TEXT NOT NULL,
  
  -- Seat limits
  default_seat_limit INTEGER NOT NULL,
  max_seat_limit INTEGER, -- NULL = unlimited (enterprise)
  
  -- Pricing (in smallest currency unit, e.g., pence)
  price_amount INTEGER, -- NULL = custom pricing (enterprise)
  price_currency TEXT DEFAULT 'GBP' NOT NULL,
  billing_interval TEXT NOT NULL, -- 'monthly' | 'yearly'
  
  -- Stripe integration
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE NOT NULL,
  
  -- Metadata
  features JSONB DEFAULT '[]'::JSONB NOT NULL, -- Array of feature descriptions
  settings JSONB DEFAULT '{}'::JSONB NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT check_plans_tier 
    CHECK (tier IN ('solo', 'tier1', 'tier2', 'tier3', 'enterprise')),
  
  CONSTRAINT check_plans_billing_interval 
    CHECK (billing_interval IN ('monthly', 'yearly')),
  
  CONSTRAINT check_plans_currency 
    CHECK (price_currency ~ '^[A-Z]{3}$'),
  
  CONSTRAINT check_plans_seat_limits
    CHECK (
      default_seat_limit > 0 
      AND (max_seat_limit IS NULL OR max_seat_limit >= default_seat_limit)
    )
);

COMMENT ON TABLE plans IS 
  'Subscription plans with seat limits and features';

COMMENT ON COLUMN plans.tier IS 
  'Plan tier: solo | tier1 | tier2 | tier3 | enterprise';

COMMENT ON COLUMN plans.default_seat_limit IS 
  'Included seats in base price';

COMMENT ON COLUMN plans.max_seat_limit IS 
  'Maximum seats allowed (NULL = unlimited for enterprise)';

COMMENT ON COLUMN plans.price_amount IS 
  'Price in smallest currency unit (e.g., pence). NULL = custom pricing.';

-- =====================================================
-- 2. CREATE PLAN_ENTITLEMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS plan_entitlements (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Plan reference
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  
  -- Entitlement key (matches feature flag or permission)
  key TEXT NOT NULL,
  
  -- Limit value (NULL = unlimited/boolean TRUE)
  limit_value INTEGER,
  
  -- Metadata
  description TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Unique constraint
  CONSTRAINT unique_plan_entitlement UNIQUE (plan_id, key)
);

COMMENT ON TABLE plan_entitlements IS 
  'Feature entitlements per plan (e.g., roles.custom, marketing.automation)';

COMMENT ON COLUMN plan_entitlements.key IS 
  'Feature key (e.g., "multi_location", "custom_roles", "api_access")';

COMMENT ON COLUMN plan_entitlements.limit_value IS 
  'Numeric limit (NULL = unlimited). For boolean features, NULL = enabled.';

-- =====================================================
-- 3. CREATE SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Subscriber (organization or dental group)
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  dental_group_id UUID REFERENCES dental_groups(id) ON DELETE CASCADE,
  
  -- Plan reference
  plan_id UUID NOT NULL REFERENCES plans(id),
  
  -- Status
  status TEXT DEFAULT 'trialing' NOT NULL,
  
  -- Billing period
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  
  -- Seat management
  seat_limit INTEGER NOT NULL,
  active_seats INTEGER DEFAULT 0 NOT NULL,
  
  -- Stripe integration
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  
  -- Trial
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT FALSE NOT NULL,
  canceled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Metadata
  settings JSONB DEFAULT '{}'::JSONB NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT check_subscription_status 
    CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  
  CONSTRAINT check_subscription_owner
    CHECK (
      (tenant_id IS NOT NULL AND dental_group_id IS NULL)
      OR
      (tenant_id IS NULL AND dental_group_id IS NOT NULL)
    ),
  
  CONSTRAINT check_subscription_seats
    CHECK (active_seats >= 0 AND active_seats <= seat_limit)
);

COMMENT ON TABLE subscriptions IS 
  'Active subscriptions (one per tenant or dental_group)';

COMMENT ON COLUMN subscriptions.tenant_id IS 
  'Single-location subscription (mutually exclusive with dental_group_id)';

COMMENT ON COLUMN subscriptions.dental_group_id IS 
  'Multi-location subscription (consolidated billing for all locations)';

COMMENT ON COLUMN subscriptions.seat_limit IS 
  'Total seats allowed (from plan + purchased add-ons)';

COMMENT ON COLUMN subscriptions.active_seats IS 
  'Currently occupied seats (cached for performance)';

-- =====================================================
-- 4. CREATE INVOICES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS invoices (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  dental_group_id UUID REFERENCES dental_groups(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Invoice details
  invoice_number TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL, -- In smallest currency unit
  currency TEXT DEFAULT 'GBP' NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'draft' NOT NULL,
  
  -- Dates
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- Stripe integration
  stripe_invoice_id TEXT UNIQUE,
  stripe_hosted_url TEXT,
  stripe_pdf_url TEXT,
  
  -- Line items (detailed breakdown)
  line_items JSONB DEFAULT '[]'::JSONB NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT check_invoice_status 
    CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  
  CONSTRAINT check_invoice_owner
    CHECK (
      (tenant_id IS NOT NULL AND dental_group_id IS NULL)
      OR
      (tenant_id IS NULL AND dental_group_id IS NOT NULL)
    )
);

COMMENT ON TABLE invoices IS 
  'Invoices for subscriptions and one-time charges';

-- =====================================================
-- 5. CREATE USAGE_EVENTS TABLE (for add-ons)
-- =====================================================

CREATE TABLE IF NOT EXISTS usage_events (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Event type
  key TEXT NOT NULL, -- 'ai_minutes', 'sms_sent', 'api_calls'
  quantity DECIMAL(10, 2) NOT NULL,
  
  -- Context
  user_id UUID REFERENCES app_users(id),
  metadata JSONB DEFAULT '{}'::JSONB NOT NULL,
  
  -- Timestamp
  occurred_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Billing
  billed_in_invoice_id UUID REFERENCES invoices(id),
  
  -- Constraints
  CONSTRAINT check_usage_quantity CHECK (quantity >= 0)
);

COMMENT ON TABLE usage_events IS 
  'Usage-based billing events (AI minutes, SMS, API calls)';

-- Partition by month for performance
-- CREATE TABLE usage_events_y2025m01 PARTITION OF usage_events
--   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- =====================================================
-- 6. CREATE INDEXES
-- =====================================================

-- Plans
CREATE INDEX IF NOT EXISTS idx_plans_tier ON plans(tier) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_plans_featured ON plans(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_plans_stripe_product ON plans(stripe_product_id);

-- Plan entitlements
CREATE INDEX IF NOT EXISTS idx_plan_entitlements_plan ON plan_entitlements(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_entitlements_key ON plan_entitlements(key);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_group ON subscriptions(dental_group_id) WHERE dental_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_group ON invoices(dental_group_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Usage events
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant ON usage_events(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_key ON usage_events(key, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_unbilled ON usage_events(billed_in_invoice_id) 
  WHERE billed_in_invoice_id IS NULL;

-- =====================================================
-- 7. CREATE UPDATED_AT TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_billing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_updated_at();

CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_updated_at();

CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_updated_at();

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Plans and entitlements are public (readable by all)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_select_all ON plans FOR SELECT USING (is_active = TRUE);
CREATE POLICY plan_entitlements_select_all ON plan_entitlements FOR SELECT USING (TRUE);

-- Subscriptions: tenant-scoped
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_select_tenant ON subscriptions
  FOR SELECT
  USING (
    tenant_id IN (SELECT unnest(public.get_accessible_tenants()))
    OR
    dental_group_id IN (
      SELECT DISTINCT t.dental_group_id
      FROM tenants t
      WHERE t.id = ANY(public.get_accessible_tenants())
        AND t.dental_group_id IS NOT NULL
    )
  );

-- Invoices: tenant-scoped
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_select_tenant ON invoices
  FOR SELECT
  USING (
    tenant_id IN (SELECT unnest(public.get_accessible_tenants()))
    OR
    dental_group_id IN (
      SELECT DISTINCT t.dental_group_id
      FROM tenants t
      WHERE t.id = ANY(public.get_accessible_tenants())
        AND t.dental_group_id IS NOT NULL
    )
  );

-- Usage events: tenant-scoped
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY usage_events_select_tenant ON usage_events
  FOR SELECT
  USING (tenant_id = ANY(public.get_accessible_tenants()));

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 005 complete: Billing schema created';
  RAISE NOTICE '💳 Tables: plans, subscriptions, invoices, usage_events';
  RAISE NOTICE '🎫 Seat-based billing with entitlements';
  RAISE NOTICE '🔒 RLS: Tenant-scoped, plans are public';
END $$;

