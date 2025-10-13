-- ============================================================================
-- ACTIVITY INTEGRATIONS INFRASTRUCTURE
-- ============================================================================
-- This migration adds all fields needed for email, SMS, WhatsApp, and call integrations
-- The system will be READY to plug in real APIs when you're ready!
-- ============================================================================

-- ============================================================================
-- PART 1: ENHANCE ACTIVITIES TABLE FOR INTEGRATIONS
-- ============================================================================

-- Add integration provider field
ALTER TABLE activities ADD COLUMN IF NOT EXISTS integration_provider TEXT;
-- Options: 'twilio_sms', 'twilio_whatsapp', 'twilio_voice', 'gmail', 'outlook', 'sendgrid', 'manual'

-- Add external ID (link to provider's message/call ID)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Add integration metadata (provider-specific data)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS integration_metadata JSONB DEFAULT '{}';

-- Add conversation thread ID (for grouping related messages)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS thread_id TEXT;

-- Add email-specific fields
ALTER TABLE activities ADD COLUMN IF NOT EXISTS email_to TEXT[];
ALTER TABLE activities ADD COLUMN IF NOT EXISTS email_cc TEXT[];
ALTER TABLE activities ADD COLUMN IF NOT EXISTS email_bcc TEXT[];
ALTER TABLE activities ADD COLUMN IF NOT EXISTS email_from TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS email_reply_to TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT FALSE;

-- Add SMS/WhatsApp specific fields
ALTER TABLE activities ADD COLUMN IF NOT EXISTS from_number TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS to_number TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS message_status TEXT;
-- Options: 'queued', 'sent', 'delivered', 'failed', 'read'

-- Add call-specific fields (extend existing duration_seconds)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS call_sid TEXT; -- Twilio call SID
ALTER TABLE activities ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS call_from TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS call_to TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_activities_integration_provider ON activities(integration_provider) WHERE integration_provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_external_id ON activities(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_thread_id ON activities(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_message_status ON activities(message_status) WHERE message_status IS NOT NULL;


-- ============================================================================
-- PART 2: INTEGRATION SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Email Settings
  email_provider TEXT, -- 'gmail', 'outlook', 'sendgrid', 'ses'
  email_api_key TEXT,
  email_from_address TEXT,
  email_from_name TEXT,
  email_oauth_token TEXT,
  email_oauth_refresh_token TEXT,
  email_oauth_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- SMS Settings (Twilio)
  sms_provider TEXT DEFAULT 'twilio',
  sms_account_sid TEXT,
  sms_auth_token TEXT,
  sms_from_number TEXT,
  
  -- WhatsApp Settings (Twilio WhatsApp)
  whatsapp_provider TEXT DEFAULT 'twilio',
  whatsapp_account_sid TEXT,
  whatsapp_auth_token TEXT,
  whatsapp_from_number TEXT, -- Format: whatsapp:+14155238886
  
  -- Voice/Call Settings (Twilio Voice)
  voice_provider TEXT DEFAULT 'twilio',
  voice_account_sid TEXT,
  voice_auth_token TEXT,
  voice_from_number TEXT,
  
  -- Webhook URLs (for receiving messages/calls)
  email_webhook_url TEXT,
  sms_webhook_url TEXT,
  whatsapp_webhook_url TEXT,
  voice_webhook_url TEXT,
  
  -- Status & Metadata
  is_email_configured BOOLEAN DEFAULT FALSE,
  is_sms_configured BOOLEAN DEFAULT FALSE,
  is_whatsapp_configured BOOLEAN DEFAULT FALSE,
  is_voice_configured BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id)
);


-- ============================================================================
-- PART 3: ACTIVITY ATTACHMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  
  file_name TEXT NOT NULL,
  file_size INTEGER, -- bytes
  file_type TEXT, -- MIME type
  file_url TEXT NOT NULL, -- Supabase storage URL
  storage_path TEXT, -- Path in Supabase storage
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_attachments_activity ON activity_attachments(activity_id);


-- ============================================================================
-- PART 4: INTEGRATION LOGS (For Debugging)
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  integration_type TEXT NOT NULL, -- 'email', 'sms', 'whatsapp', 'voice'
  action TEXT NOT NULL, -- 'send', 'receive', 'error'
  provider TEXT, -- 'twilio', 'gmail', etc
  
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  external_id TEXT, -- Provider's message/call ID
  
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  
  status TEXT NOT NULL, -- 'success', 'error', 'pending'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_integration_logs_tenant ON integration_logs(tenant_id);
CREATE INDEX idx_integration_logs_activity ON integration_logs(activity_id) WHERE activity_id IS NOT NULL;
CREATE INDEX idx_integration_logs_created ON integration_logs(created_at DESC);


-- ============================================================================
-- PART 5: UPDATE VIEWS
-- ============================================================================

-- Enhanced activities view with integration data
CREATE OR REPLACE VIEW activities_with_integrations AS
SELECT 
  a.*,
  c.full_name as contact_name,
  c.primary_email as contact_email,
  c.primary_phone as contact_phone,
  d.title as deal_title,
  d.value_estimate_cents as deal_value,
  ps.name as deal_stage,
  p.name as deal_pipeline,
  u.full_name as agent_name,
  COALESCE(
    (SELECT COUNT(*) FROM activity_attachments WHERE activity_id = a.id), 0
  ) as attachment_count,
  COALESCE(
    (SELECT COUNT(*) FROM ai_artifacts WHERE activity_id = a.id), 0
  ) as ai_artifact_count,
  CASE 
    WHEN a.integration_provider IS NOT NULL THEN true
    ELSE false
  END as is_integrated
FROM activities a
LEFT JOIN contacts c ON a.contact_id = c.id
LEFT JOIN deals d ON a.deal_id = d.id
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
LEFT JOIN pipelines p ON ps.pipeline_id = p.id
LEFT JOIN app_users u ON a.agent_user_id = u.id;


-- ============================================================================
-- DONE! 🎉
-- ============================================================================
-- ✅ Activities table enhanced with integration fields
-- ✅ Integration settings table created (stores API keys)
-- ✅ Attachments table created
-- ✅ Integration logs table created (for debugging)
-- ✅ Enhanced view created
-- 
-- NEXT STEPS FOR YOU:
-- 1. Run this migration in Supabase SQL Editor
-- 2. We'll build the UI and API endpoints
-- 3. When ready to integrate, just add API keys to integration_settings!
-- ============================================================================


