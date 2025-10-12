-- ============================================================
-- AI ASSISTANT SYSTEM TABLES
-- ============================================================
-- Stores chat sessions, drafts, and AI analytics

-- AI Chat Sessions (conversation memory)
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL, -- 'deal', 'contact', 'global'
  context_id UUID, -- deal_id or contact_id (null for global)
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Drafts (AI-generated email drafts)
CREATE TABLE IF NOT EXISTS ai_email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  draft_subject TEXT NOT NULL,
  draft_body TEXT NOT NULL,
  generated_by_ai BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending', -- 'pending', 'edited', 'sent', 'discarded'
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Assistant Preferences (per user)
CREATE TABLE IF NOT EXISTS ai_assistant_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  response_style TEXT DEFAULT 'friendly', -- 'professional', 'friendly', 'concise', 'detailed'
  ai_model TEXT DEFAULT 'gpt-4-turbo-preview',
  auto_actions JSONB DEFAULT '["draft_emails", "suggest_tasks", "detect_cold_leads"]',
  focus_areas JSONB DEFAULT '["closing_deals", "patient_satisfaction"]',
  custom_rules JSONB DEFAULT '[]',
  email_draft_settings JSONB DEFAULT '{"opening": "warm", "closing": "warm_regards", "tone": "professional_friendly"}',
  notification_preferences JSONB DEFAULT '{"cold_leads_days": 7, "high_value_threshold": 5000}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- AI Usage Analytics
CREATE TABLE IF NOT EXISTS ai_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL,
  context_id UUID,
  question_asked TEXT,
  response_generated TEXT,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  helpful_rating INTEGER, -- 1-5 stars, user feedback
  action_taken TEXT, -- 'draft_email', 'create_task', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Proactive AI Suggestions
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL, -- 'cold_lead', 'high_value', 'negative_sentiment', 'task_suggestion'
  suggestion_text TEXT NOT NULL,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT DEFAULT 'pending', -- 'pending', 'acted_on', 'dismissed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acted_on_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS ai_chat_sessions_context_idx ON ai_chat_sessions(context_type, context_id);
CREATE INDEX IF NOT EXISTS ai_chat_sessions_user_idx ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS ai_email_drafts_status_idx ON ai_email_drafts(status);
CREATE INDEX IF NOT EXISTS ai_email_drafts_activity_idx ON ai_email_drafts(activity_id);
CREATE INDEX IF NOT EXISTS ai_usage_analytics_user_idx ON ai_usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS ai_suggestions_status_idx ON ai_suggestions(status);
CREATE INDEX IF NOT EXISTS ai_suggestions_deal_idx ON ai_suggestions(deal_id);

-- Insert default preferences for existing users
INSERT INTO ai_assistant_preferences (tenant_id, user_id, custom_rules)
SELECT 
  tenant_id,
  id,
  '["For deals over £5,000, always mention payment plan options", "If patient mentions anxiety, emphasize sedation and comfort options"]'::jsonb
FROM app_users
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- Comments
COMMENT ON TABLE ai_chat_sessions IS 'Stores AI assistant conversation history per deal/contact';
COMMENT ON TABLE ai_email_drafts IS 'AI-generated email drafts awaiting review';
COMMENT ON TABLE ai_assistant_preferences IS 'User-specific AI assistant configuration';
COMMENT ON TABLE ai_usage_analytics IS 'Tracks AI usage for analytics and cost monitoring';
COMMENT ON TABLE ai_suggestions IS 'Proactive AI suggestions for deals and contacts';

