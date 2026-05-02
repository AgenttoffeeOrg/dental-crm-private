SET search_path TO public, extensions;

-- Email Logs Table
-- Tracks all emails sent through the system for debugging and audit

DROP TABLE IF EXISTS email_logs CASCADE;
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Email details
  email_type VARCHAR(50) NOT NULL, -- 'verification', 'password_reset', 'invitation', 'notification', 'campaign'
  to_email VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'queued', 'sending', 'sent', 'failed', 'bounced', 'opened', 'clicked'
  
  -- Provider details
  provider VARCHAR(50) DEFAULT 'resend', -- 'resend', 'sendgrid', 'ses'
  provider_message_id VARCHAR(255),
  
  -- Error tracking
  error_message TEXT,
  error_code VARCHAR(100),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Timing
  queued_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_id ON email_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON email_logs(to_email);

-- RLS Policies
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own email logs
DROP POLICY IF EXISTS "Users can view their own email logs" ON email_logs;
CREATE POLICY "Users can view their own email logs" ON email_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all email logs in their tenant
DROP POLICY IF EXISTS "Admins can view tenant email logs" ON email_logs;
CREATE POLICY "Admins can view tenant email logs" ON email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.tenant_id = email_logs.tenant_id
      AND app_users.role IN ('admin', 'super_admin', 'owner')
    )
  );

-- System can insert email logs
DROP POLICY IF EXISTS "System can insert email logs" ON email_logs;
CREATE POLICY "System can insert email logs" ON email_logs
  FOR INSERT
  WITH CHECK (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_email_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_logs_updated_at();

-- Comments
COMMENT ON TABLE email_logs IS 'Tracks all emails sent through the system for debugging, audit, and deliverability monitoring';
COMMENT ON COLUMN email_logs.status IS 'Current status of the email: pending, queued, sending, sent, failed, bounced, opened, clicked';
COMMENT ON COLUMN email_logs.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN email_logs.metadata IS 'Additional email metadata (template variables, campaign info, etc.)';

