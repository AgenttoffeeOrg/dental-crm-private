SET search_path TO public, extensions;

-- =====================================================
-- Migration: Seed Default Plans
-- Purpose: Populate plans table with default subscription tiers
-- Safety: Idempotent - uses ON CONFLICT DO UPDATE
-- Source: src/config/billing.ts PlanTiers
-- =====================================================

BEGIN;

-- =====================================================
-- 1. SEED SOLO PLAN (Free)
-- =====================================================

INSERT INTO plans (
  name,
  display_name,
  description,
  tier,
  default_seat_limit,
  max_seat_limit,
  price_amount,
  price_currency,
  billing_interval,
  is_active,
  is_featured,
  features
) VALUES (
  'solo_free',
  'Solo',
  'For individual practitioners',
  'solo',
  2, -- min 2 seats
  2, -- max 2 seats
  0, -- Free
  'GBP',
  'monthly',
  TRUE,
  FALSE,
  '[
    "Basic CRM features",
    "Up to 2 users",
    "Contact management",
    "Basic pipeline",
    "Email support"
  ]'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  default_seat_limit = EXCLUDED.default_seat_limit,
  max_seat_limit = EXCLUDED.max_seat_limit,
  price_amount = EXCLUDED.price_amount,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- 2. SEED TIER 1 - STARTER (Monthly)
-- =====================================================

INSERT INTO plans (
  name,
  display_name,
  description,
  tier,
  default_seat_limit,
  max_seat_limit,
  price_amount,
  price_currency,
  billing_interval,
  is_active,
  is_featured,
  features
) VALUES (
  'starter_monthly',
  'Starter',
  'For small practices',
  'tier1',
  5, -- 5 default seats
  5, -- max 5 seats
  4900, -- £49/month
  'GBP',
  'monthly',
  TRUE,
  FALSE,
  '[
    "All Solo features",
    "Up to 5 users",
    "Advanced pipeline",
    "Basic marketing",
    "Calendar integration",
    "Priority support"
  ]'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  default_seat_limit = EXCLUDED.default_seat_limit,
  max_seat_limit = EXCLUDED.max_seat_limit,
  price_amount = EXCLUDED.price_amount,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- 3. SEED TIER 1 - STARTER (Yearly)
-- =====================================================

INSERT INTO plans (
  name,
  display_name,
  description,
  tier,
  default_seat_limit,
  max_seat_limit,
  price_amount,
  price_currency,
  billing_interval,
  is_active,
  is_featured,
  features
) VALUES (
  'starter_yearly',
  'Starter (Annual)',
  'For small practices - save 2 months!',
  'tier1',
  5,
  5,
  49900, -- £499/year (2 months free)
  'GBP',
  'yearly',
  TRUE,
  TRUE, -- Featured for savings
  '[
    "All Solo features",
    "Up to 5 users",
    "Advanced pipeline",
    "Basic marketing",
    "Calendar integration",
    "Priority support",
    "💰 Save 2 months with annual billing"
  ]'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  default_seat_limit = EXCLUDED.default_seat_limit,
  max_seat_limit = EXCLUDED.max_seat_limit,
  price_amount = EXCLUDED.price_amount,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- 4. SEED TIER 2 - PROFESSIONAL (Monthly)
-- =====================================================

INSERT INTO plans (
  name,
  display_name,
  description,
  tier,
  default_seat_limit,
  max_seat_limit,
  price_amount,
  price_currency,
  billing_interval,
  is_active,
  is_featured,
  features
) VALUES (
  'professional_monthly',
  'Professional',
  'For growing practices',
  'tier2',
  10, -- 10 default seats
  15, -- can expand to 15
  9900, -- £99/month
  'GBP',
  'monthly',
  TRUE,
  TRUE, -- Featured as popular choice
  '[
    "All Starter features",
    "Up to 15 users",
    "Advanced marketing",
    "Automation workflows",
    "Custom roles",
    "API access",
    "Phone support"
  ]'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  default_seat_limit = EXCLUDED.default_seat_limit,
  max_seat_limit = EXCLUDED.max_seat_limit,
  price_amount = EXCLUDED.price_amount,
  features = EXCLUDED.features,
  is_featured = EXCLUDED.is_featured,
  updated_at = NOW();

-- =====================================================
-- 5. SEED TIER 2 - PROFESSIONAL (Yearly)
-- =====================================================

INSERT INTO plans (
  name,
  display_name,
  description,
  tier,
  default_seat_limit,
  max_seat_limit,
  price_amount,
  price_currency,
  billing_interval,
  is_active,
  is_featured,
  features
) VALUES (
  'professional_yearly',
  'Professional (Annual)',
  'For growing practices - best value!',
  'tier2',
  10,
  15,
  99900, -- £999/year
  'GBP',
  'yearly',
  TRUE,
  TRUE,
  '[
    "All Starter features",
    "Up to 15 users",
    "Advanced marketing",
    "Automation workflows",
    "Custom roles",
    "API access",
    "Phone support",
    "💰 Save 2 months with annual billing"
  ]'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  default_seat_limit = EXCLUDED.default_seat_limit,
  max_seat_limit = EXCLUDED.max_seat_limit,
  price_amount = EXCLUDED.price_amount,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- 6. SEED TIER 3 - BUSINESS (Monthly)
-- =====================================================

INSERT INTO plans (
  name,
  display_name,
  description,
  tier,
  default_seat_limit,
  max_seat_limit,
  price_amount,
  price_currency,
  billing_interval,
  is_active,
  is_featured,
  features
) VALUES (
  'business_monthly',
  'Business',
  'For established practices & multi-location groups',
  'tier3',
  20, -- 20 default seats
  30, -- can expand to 30
  19900, -- £199/month
  'GBP',
  'monthly',
  TRUE,
  FALSE,
  '[
    "All Professional features",
    "Up to 30 users",
    "Multi-location support",
    "Advanced analytics",
    "Custom integrations",
    "Dedicated support",
    "Onboarding assistance"
  ]'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  default_seat_limit = EXCLUDED.default_seat_limit,
  max_seat_limit = EXCLUDED.max_seat_limit,
  price_amount = EXCLUDED.price_amount,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- 7. SEED TIER 3 - BUSINESS (Yearly)
-- =====================================================

INSERT INTO plans (
  name,
  display_name,
  description,
  tier,
  default_seat_limit,
  max_seat_limit,
  price_amount,
  price_currency,
  billing_interval,
  is_active,
  is_featured,
  features
) VALUES (
  'business_yearly',
  'Business (Annual)',
  'For established practices - enterprise features',
  'tier3',
  20,
  30,
  199900, -- £1999/year
  'GBP',
  'yearly',
  TRUE,
  FALSE,
  '[
    "All Professional features",
    "Up to 30 users",
    "Multi-location support",
    "Advanced analytics",
    "Custom integrations",
    "Dedicated support",
    "Onboarding assistance",
    "💰 Save 2 months with annual billing"
  ]'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  default_seat_limit = EXCLUDED.default_seat_limit,
  max_seat_limit = EXCLUDED.max_seat_limit,
  price_amount = EXCLUDED.price_amount,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- 8. SEED ENTERPRISE PLAN (Custom Pricing)
-- =====================================================

INSERT INTO plans (
  name,
  display_name,
  description,
  tier,
  default_seat_limit,
  max_seat_limit,
  price_amount,
  price_currency,
  billing_interval,
  is_active,
  is_featured,
  features
) VALUES (
  'enterprise_custom',
  'Enterprise',
  'For large organizations with custom needs',
  'enterprise',
  50, -- Starting at 50 seats
  NULL, -- Unlimited
  NULL, -- Custom pricing
  'GBP',
  'monthly',
  TRUE,
  FALSE,
  '[
    "All Business features",
    "Unlimited users",
    "Unlimited locations",
    "White-label options",
    "Custom SLA",
    "Dedicated account manager",
    "Custom development",
    "Advanced security & compliance",
    "Custom contracts & pricing"
  ]'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  default_seat_limit = EXCLUDED.default_seat_limit,
  max_seat_limit = EXCLUDED.max_seat_limit,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- 9. SEED PLAN ENTITLEMENTS
-- =====================================================

-- Solo entitlements
INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'basic_crm', NULL, 'Basic CRM features'
FROM plans WHERE name = 'solo_free'
ON CONFLICT (plan_id, key) DO NOTHING;

-- Tier1+ entitlements
INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'advanced_pipeline', NULL, 'Advanced pipeline features'
FROM plans WHERE tier IN ('tier1', 'tier2', 'tier3', 'enterprise')
ON CONFLICT (plan_id, key) DO NOTHING;

INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'basic_marketing', NULL, 'Basic marketing tools'
FROM plans WHERE tier IN ('tier1', 'tier2', 'tier3', 'enterprise')
ON CONFLICT (plan_id, key) DO NOTHING;

-- Tier2+ entitlements
INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'custom_roles', NULL, 'Create custom roles with granular permissions'
FROM plans WHERE tier IN ('tier2', 'tier3', 'enterprise')
ON CONFLICT (plan_id, key) DO NOTHING;

INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'advanced_marketing', NULL, 'Advanced marketing automation'
FROM plans WHERE tier IN ('tier2', 'tier3', 'enterprise')
ON CONFLICT (plan_id, key) DO NOTHING;

INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'api_access', NULL, 'REST API access'
FROM plans WHERE tier IN ('tier2', 'tier3', 'enterprise')
ON CONFLICT (plan_id, key) DO NOTHING;

-- Tier3+ entitlements (multi-location)
INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'multi_location', NULL, 'Multi-location support'
FROM plans WHERE tier IN ('tier3', 'enterprise')
ON CONFLICT (plan_id, key) DO NOTHING;

INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'advanced_analytics', NULL, 'Advanced analytics and reporting'
FROM plans WHERE tier IN ('tier3', 'enterprise')
ON CONFLICT (plan_id, key) DO NOTHING;

-- Enterprise entitlements
INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'white_label', NULL, 'White-label branding'
FROM plans WHERE tier = 'enterprise'
ON CONFLICT (plan_id, key) DO NOTHING;

INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'custom_sla', NULL, 'Custom SLA guarantees'
FROM plans WHERE tier = 'enterprise'
ON CONFLICT (plan_id, key) DO NOTHING;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
  plan_count INTEGER;
  entitlement_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO plan_count FROM plans;
  SELECT COUNT(*) INTO entitlement_count FROM plan_entitlements;
  
  RAISE NOTICE '✅ Migration 006 complete: Plans seeded';
  RAISE NOTICE '📋 Total plans: %', plan_count;
  RAISE NOTICE '🎫 Total entitlements: %', entitlement_count;
  RAISE NOTICE '💳 Price range: Free (Solo) to Custom (Enterprise)';
END $$;

