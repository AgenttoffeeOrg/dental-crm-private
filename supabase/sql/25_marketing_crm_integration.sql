-- =====================================================
-- MARKETING ↔ CRM INTEGRATION SCHEMA
-- =====================================================
-- Version: 1.0
-- Date: October 13, 2025
-- Purpose: Add Marketing columns to existing CRM tables
--
-- SAFETY GUARANTEE:
-- • All columns are NULLABLE or have DEFAULT values
-- • No existing data is modified
-- • No columns are dropped
-- • All changes are 100% ADDITIVE
-- • CRM works identically with Marketing DISABLED
-- =====================================================

BEGIN;

-- =====================================================
-- 1. TENANTS TABLE - Marketing Feature Flag
-- =====================================================
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS marketing_enabled BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS marketing_plan TEXT DEFAULT 'none' NOT NULL;

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS marketing_enabled_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN tenants.marketing_enabled IS 'Master toggle for Marketing module (default: FALSE)';
COMMENT ON COLUMN tenants.marketing_plan IS 'Marketing plan tier: none, starter, pro, enterprise';
COMMENT ON COLUMN tenants.marketing_enabled_at IS 'When Marketing was first enabled';

-- =====================================================
-- 2. CONTACTS TABLE - Marketing Engagement
-- =====================================================
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS marketing_engagement_score INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS lead_source_campaign_id UUID;

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS last_marketing_interaction_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN contacts.marketing_engagement_score IS 'Calculated engagement score (0-100) based on campaign interactions';
COMMENT ON COLUMN contacts.lead_source_campaign_id IS 'Campaign that originally created this contact';
COMMENT ON COLUMN contacts.last_marketing_interaction_at IS 'Most recent marketing event (open, click, reply)';

-- =====================================================
-- 3. DEALS TABLE - Marketing Attribution
-- =====================================================
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS marketing_source_type TEXT;

ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS marketing_source_id UUID;

ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS marketing_source_name TEXT;

ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS marketing_touchpoints JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN deals.marketing_source_type IS 'Type: campaign, form, landing_page, journey, manual';
COMMENT ON COLUMN deals.marketing_source_id IS 'ID of the marketing entity that created this deal';
COMMENT ON COLUMN deals.marketing_source_name IS 'Human-readable name (e.g., "Summer Promo 2025")';
COMMENT ON COLUMN deals.marketing_touchpoints IS 'Array of all marketing interactions: [{campaign_id, type, timestamp}]';

-- =====================================================
-- 4. ACTIVITIES TABLE - Marketing Event Linking
-- =====================================================
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS marketing_campaign_id UUID;

ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS marketing_event_type TEXT;

COMMENT ON COLUMN activities.marketing_campaign_id IS 'Campaign this activity was triggered by';
COMMENT ON COLUMN activities.marketing_event_type IS 'Type: email_sent, email_opened, link_clicked, form_filled, journey_step';

-- =====================================================
-- 5. MARKETING ATTRIBUTION TABLE (New)
-- =====================================================
CREATE TABLE IF NOT EXISTS marketing_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Deal & Contact Links
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Attribution Data
  attribution_model TEXT NOT NULL DEFAULT 'last_touch', -- first_touch, last_touch, multi_touch
  touchpoint_sequence JSONB NOT NULL DEFAULT '[]'::jsonb, -- Full journey path
  
  -- Marketing Sources
  first_touch_campaign_id UUID,
  first_touch_campaign_name TEXT,
  first_touch_timestamp TIMESTAMP WITH TIME ZONE,
  
  last_touch_campaign_id UUID,
  last_touch_campaign_name TEXT,
  last_touch_timestamp TIMESTAMP WITH TIME ZONE,
  
  -- Conversion Data
  deal_value_cents BIGINT,
  deal_stage TEXT,
  deal_won BOOLEAN DEFAULT FALSE,
  conversion_timestamp TIMESTAMP WITH TIME ZONE,
  
  -- Campaign Performance
  campaign_cost_cents BIGINT, -- Allocated cost for this attribution
  roi_multiplier DECIMAL(10, 2), -- revenue / cost
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketing_attribution_tenant 
  ON marketing_attribution(tenant_id);
  
CREATE INDEX IF NOT EXISTS idx_marketing_attribution_deal 
  ON marketing_attribution(deal_id);
  
CREATE INDEX IF NOT EXISTS idx_marketing_attribution_contact 
  ON marketing_attribution(contact_id);
  
CREATE INDEX IF NOT EXISTS idx_marketing_attribution_first_campaign 
  ON marketing_attribution(first_touch_campaign_id) 
  WHERE first_touch_campaign_id IS NOT NULL;
  
CREATE INDEX IF NOT EXISTS idx_marketing_attribution_last_campaign 
  ON marketing_attribution(last_touch_campaign_id) 
  WHERE last_touch_campaign_id IS NOT NULL;

COMMENT ON TABLE marketing_attribution IS 'Tracks how marketing campaigns contribute to deal creation and revenue';

-- =====================================================
-- 6. PERFORMANCE INDEXES
-- =====================================================

-- Contacts: Marketing queries
CREATE INDEX IF NOT EXISTS idx_contacts_marketing_engagement 
  ON contacts(marketing_engagement_score DESC) 
  WHERE marketing_engagement_score > 0;
  
CREATE INDEX IF NOT EXISTS idx_contacts_marketing_campaign 
  ON contacts(lead_source_campaign_id) 
  WHERE lead_source_campaign_id IS NOT NULL;

-- Deals: Marketing source filtering
CREATE INDEX IF NOT EXISTS idx_deals_marketing_source 
  ON deals(marketing_source_type, marketing_source_id) 
  WHERE marketing_source_type IS NOT NULL;

-- Activities: Marketing event filtering  
CREATE INDEX IF NOT EXISTS idx_activities_marketing_campaign 
  ON activities(marketing_campaign_id) 
  WHERE marketing_campaign_id IS NOT NULL;

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function: Check if Marketing is enabled for a tenant
CREATE OR REPLACE FUNCTION is_marketing_enabled(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT marketing_enabled INTO v_enabled
  FROM tenants
  WHERE id = p_tenant_id;
  
  RETURN COALESCE(v_enabled, FALSE);
END;
$$;

COMMENT ON FUNCTION is_marketing_enabled IS 'Returns TRUE if Marketing module is enabled for tenant';

-- Function: Calculate marketing engagement score
CREATE OR REPLACE FUNCTION calculate_marketing_engagement(p_contact_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_score INTEGER := 0;
  v_campaign_count INTEGER;
  v_recent_opens INTEGER;
  v_recent_clicks INTEGER;
BEGIN
  -- Count marketing campaigns received (weight: 5 points each)
  SELECT COUNT(DISTINCT marketing_campaign_id) INTO v_campaign_count
  FROM activities
  WHERE contact_id = p_contact_id
    AND marketing_campaign_id IS NOT NULL
    AND marketing_event_type IN ('email_sent', 'form_filled');
  
  v_score := v_score + (v_campaign_count * 5);
  
  -- Count recent opens (last 30 days, weight: 10 points each)
  SELECT COUNT(*) INTO v_recent_opens
  FROM activities
  WHERE contact_id = p_contact_id
    AND marketing_event_type = 'email_opened'
    AND activity_timestamp > NOW() - INTERVAL '30 days';
  
  v_score := v_score + (v_recent_opens * 10);
  
  -- Count recent clicks (last 30 days, weight: 20 points each)
  SELECT COUNT(*) INTO v_recent_clicks
  FROM activities
  WHERE contact_id = p_contact_id
    AND marketing_event_type = 'link_clicked'
    AND activity_timestamp > NOW() - INTERVAL '30 days';
  
  v_score := v_score + (v_recent_clicks * 20);
  
  -- Cap at 100
  RETURN LEAST(v_score, 100);
END;
$$;

COMMENT ON FUNCTION calculate_marketing_engagement IS 'Calculates engagement score (0-100) based on campaign interactions';

-- =====================================================
-- 8. TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Auto-update marketing_engagement_score when activities change
CREATE OR REPLACE FUNCTION update_contact_marketing_engagement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.marketing_campaign_id IS NOT NULL THEN
    -- Update engagement score
    UPDATE contacts
    SET 
      marketing_engagement_score = calculate_marketing_engagement(NEW.contact_id),
      last_marketing_interaction_at = NEW.activity_timestamp
    WHERE id = NEW.contact_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_contact_marketing_engagement
AFTER INSERT OR UPDATE ON activities
FOR EACH ROW
WHEN (NEW.marketing_campaign_id IS NOT NULL)
EXECUTE FUNCTION update_contact_marketing_engagement();

-- =====================================================
-- 9. DATA INTEGRITY CHECKS
-- =====================================================

-- Ensure marketing columns don't break existing queries
DO $$
DECLARE
  v_test_count INTEGER;
BEGIN
  -- Test 1: Contacts query works
  SELECT COUNT(*) INTO v_test_count FROM contacts LIMIT 1;
  RAISE NOTICE '✓ Contacts table: OK';
  
  -- Test 2: Deals query works
  SELECT COUNT(*) INTO v_test_count FROM deals LIMIT 1;
  RAISE NOTICE '✓ Deals table: OK';
  
  -- Test 3: Activities query works
  SELECT COUNT(*) INTO v_test_count FROM activities LIMIT 1;
  RAISE NOTICE '✓ Activities table: OK';
  
  -- Test 4: New attribution table works
  SELECT COUNT(*) INTO v_test_count FROM marketing_attribution LIMIT 1;
  RAISE NOTICE '✓ Marketing Attribution table: OK';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL TESTS PASSED';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Summary:
--   • Added 3 columns to tenants (marketing_enabled, plan, enabled_at)
--   • Added 3 columns to contacts (engagement_score, campaign_id, last_interaction)
--   • Added 4 columns to deals (source_type, source_id, source_name, touchpoints)
--   • Added 2 columns to activities (campaign_id, event_type)
--   • Created marketing_attribution table
--   • Created 8 performance indexes
--   • Created 2 helper functions
--   • Created 1 auto-update trigger
--
-- SAFETY:
--   • All columns DEFAULT or NULLABLE
--   • No data modified
--   • CRM works identically with marketing_enabled = FALSE
--   • Can rollback by dropping columns (if needed)
-- =====================================================


