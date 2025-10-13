-- =====================================================
-- SOCIAL MEDIA MARKETING SCHEMA
-- =====================================================
-- Version: 1.0
-- Date: October 13, 2025
-- Purpose: Add social media marketing capabilities
--
-- Platforms Supported:
-- • Facebook Pages
-- • Instagram Business
-- • TikTok Business
-- • LinkedIn Company Pages
-- • Twitter/X
-- • YouTube
-- =====================================================

BEGIN;

-- =====================================================
-- 1. SOCIAL MEDIA ACCOUNTS
-- =====================================================
CREATE TABLE IF NOT EXISTS social_media_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Platform Info
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'tiktok', 'linkedin', 'twitter', 'youtube')),
  account_type TEXT CHECK (account_type IN ('page', 'profile', 'business', 'company')),
  
  -- Account Details
  platform_account_id TEXT NOT NULL, -- ID from the platform
  account_name TEXT NOT NULL,
  account_username TEXT,
  profile_image_url TEXT,
  account_url TEXT,
  
  -- OAuth Tokens (encrypted in production)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  token_scope TEXT, -- Permissions granted
  
  -- Account Status
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'active' CHECK (sync_status IN ('active', 'expired', 'error', 'disconnected')),
  
  -- Account Metadata
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  account_metadata JSONB DEFAULT '{}'::jsonb, -- Platform-specific data
  
  -- Timestamps
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_social_accounts_tenant ON social_media_accounts(tenant_id);
CREATE INDEX idx_social_accounts_platform ON social_media_accounts(platform);
CREATE INDEX idx_social_accounts_active ON social_media_accounts(is_active) WHERE is_active = TRUE;
CREATE UNIQUE INDEX idx_social_accounts_platform_id ON social_media_accounts(tenant_id, platform, platform_account_id);

COMMENT ON TABLE social_media_accounts IS 'Connected social media accounts for posting and monitoring';

-- =====================================================
-- 2. SOCIAL MEDIA POSTS
-- =====================================================
CREATE TABLE IF NOT EXISTS social_media_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Link to Marketing Campaign (optional)
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  
  -- Account Info
  account_id UUID NOT NULL REFERENCES social_media_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  
  -- Post Content
  content_text TEXT NOT NULL,
  media_urls TEXT[], -- URLs to images/videos
  media_type TEXT CHECK (media_type IN ('image', 'video', 'carousel', 'story', 'reel')),
  link_url TEXT, -- CTA link
  hashtags TEXT[],
  mentions TEXT[],
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'deleted')),
  
  -- Platform Response
  platform_post_id TEXT, -- ID from Facebook/Instagram/etc
  platform_post_url TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Engagement Metrics (updated periodically)
  metrics JSONB DEFAULT '{
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "reach": 0,
    "impressions": 0,
    "clicks": 0,
    "engagement_rate": 0
  }'::jsonb,
  
  last_metrics_fetch_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  post_metadata JSONB DEFAULT '{}'::jsonb,
  created_by_user_id UUID REFERENCES app_users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_social_posts_tenant ON social_media_posts(tenant_id);
CREATE INDEX idx_social_posts_account ON social_media_posts(account_id);
CREATE INDEX idx_social_posts_campaign ON social_media_posts(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_social_posts_status ON social_media_posts(status);
CREATE INDEX idx_social_posts_scheduled ON social_media_posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_social_posts_platform_id ON social_media_posts(platform_post_id) WHERE platform_post_id IS NOT NULL;

COMMENT ON TABLE social_media_posts IS 'Social media posts across all platforms';

-- =====================================================
-- 3. SOCIAL MEDIA INTERACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS social_media_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Post Reference
  post_id UUID REFERENCES social_media_posts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES social_media_accounts(id) ON DELETE CASCADE,
  
  -- Contact Reference (if we can identify them)
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Interaction Details
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'comment', 'share', 'save', 'click', 'dm', 'mention', 'reply', 'reaction')),
  interaction_text TEXT, -- Comment text or DM content
  parent_interaction_id UUID REFERENCES social_media_interactions(id), -- For replies
  
  -- Platform User Info
  platform_user_id TEXT NOT NULL,
  platform_user_name TEXT,
  platform_user_profile_url TEXT,
  
  -- Sentiment Analysis (optional AI feature)
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'question')),
  intent TEXT CHECK (intent IN ('inquiry', 'booking', 'complaint', 'praise', 'question', 'spam')),
  
  -- Response Management
  response_status TEXT DEFAULT 'pending' CHECK (response_status IN ('pending', 'responded', 'ignored', 'escalated')),
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by_user_id UUID REFERENCES app_users(id),
  response_text TEXT,
  
  -- Metadata
  interaction_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  interaction_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_social_interactions_tenant ON social_media_interactions(tenant_id);
CREATE INDEX idx_social_interactions_post ON social_media_interactions(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_social_interactions_contact ON social_media_interactions(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_social_interactions_type ON social_media_interactions(interaction_type);
CREATE INDEX idx_social_interactions_status ON social_media_interactions(response_status) WHERE response_status = 'pending';
CREATE INDEX idx_social_interactions_platform_user ON social_media_interactions(platform_user_id);

COMMENT ON TABLE social_media_interactions IS 'Likes, comments, DMs, and other social media interactions';

-- =====================================================
-- 4. SOCIAL MEDIA CAMPAIGNS
-- =====================================================
-- Extend marketing_campaigns table
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS social_media_posts JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN marketing_campaigns.social_media_posts IS 'Array of social_media_posts.id linked to this campaign';

-- =====================================================
-- 5. DEALS TABLE - Add Social Media Attribution
-- =====================================================
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS social_media_source_platform TEXT;

ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS social_media_source_post_id UUID REFERENCES social_media_posts(id);

ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS social_media_source_interaction_id UUID REFERENCES social_media_interactions(id);

COMMENT ON COLUMN deals.social_media_source_platform IS 'Platform where the deal originated (facebook, instagram, tiktok, etc)';
COMMENT ON COLUMN deals.social_media_source_post_id IS 'Social media post that generated this deal';
COMMENT ON COLUMN deals.social_media_source_interaction_id IS 'Specific interaction (comment, DM) that led to deal';

-- =====================================================
-- 6. CONTACTS TABLE - Add Social Media Links
-- =====================================================
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS social_media_profiles JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN contacts.social_media_profiles IS 'Links to patient social media profiles: {facebook: "url", instagram: "handle"}';

-- =====================================================
-- 7. SOCIAL MEDIA METRICS SUMMARY VIEW
-- =====================================================
CREATE OR REPLACE VIEW social_media_performance AS
SELECT
  sma.tenant_id,
  sma.platform,
  sma.account_name,
  COUNT(DISTINCT smp.id) as total_posts,
  COUNT(DISTINCT smp.id) FILTER (WHERE smp.published_at >= NOW() - INTERVAL '30 days') as posts_last_30_days,
  COALESCE(SUM((smp.metrics->>'likes')::int), 0) as total_likes,
  COALESCE(SUM((smp.metrics->>'comments')::int), 0) as total_comments,
  COALESCE(SUM((smp.metrics->>'shares')::int), 0) as total_shares,
  COALESCE(SUM((smp.metrics->>'reach')::int), 0) as total_reach,
  COALESCE(SUM((smp.metrics->>'clicks')::int), 0) as total_clicks,
  COUNT(DISTINCT d.id) as deals_generated,
  COALESCE(SUM(d.value_estimate_cents), 0) as revenue_generated_cents,
  sma.follower_count
FROM social_media_accounts sma
LEFT JOIN social_media_posts smp ON sma.id = smp.account_id AND smp.status = 'published'
LEFT JOIN deals d ON d.social_media_source_post_id = smp.id
WHERE sma.is_active = TRUE
GROUP BY sma.tenant_id, sma.platform, sma.account_name, sma.follower_count;

COMMENT ON VIEW social_media_performance IS 'Aggregated social media performance metrics per account';

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to calculate engagement rate for a post
CREATE OR REPLACE FUNCTION calculate_post_engagement_rate(post_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_engagement INTEGER;
  reach_count INTEGER;
  engagement_rate DECIMAL(5,2);
BEGIN
  SELECT 
    COALESCE((metrics->>'likes')::int, 0) + 
    COALESCE((metrics->>'comments')::int, 0) + 
    COALESCE((metrics->>'shares')::int, 0),
    COALESCE((metrics->>'reach')::int, 0)
  INTO total_engagement, reach_count
  FROM social_media_posts
  WHERE id = post_id;
  
  IF reach_count > 0 THEN
    engagement_rate := (total_engagement::DECIMAL / reach_count::DECIMAL) * 100;
  ELSE
    engagement_rate := 0;
  END IF;
  
  RETURN engagement_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending social interactions count
CREATE OR REPLACE FUNCTION get_pending_interactions_count(tenant_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM social_media_interactions
    WHERE tenant_id = tenant_id_param
    AND response_status = 'pending'
    AND interaction_type IN ('comment', 'dm', 'mention')
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_social_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER social_accounts_updated_at
  BEFORE UPDATE ON social_media_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_social_updated_at();

CREATE TRIGGER social_posts_updated_at
  BEFORE UPDATE ON social_media_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_social_updated_at();

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration succeeded:

-- SELECT 'social_media_accounts' as table_name, COUNT(*) as count FROM social_media_accounts
-- UNION ALL
-- SELECT 'social_media_posts', COUNT(*) FROM social_media_posts
-- UNION ALL
-- SELECT 'social_media_interactions', COUNT(*) FROM social_media_interactions;

-- SELECT * FROM social_media_performance LIMIT 5;

-- SELECT get_pending_interactions_count('550e8400-e29b-41d4-a716-446655440000');

