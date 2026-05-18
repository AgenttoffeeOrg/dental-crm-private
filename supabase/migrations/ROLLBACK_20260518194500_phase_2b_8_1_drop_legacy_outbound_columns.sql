-- =====================================================================
-- ROLLBACK COMPANION — runs only if the forward migration has been
-- applied and needs to be reverted.
-- =====================================================================
-- Recreates the dropped columns with their original types, nullable
-- constraints, and defaults (captured live during 2b.8 pre-flight §2.1).
-- Data is NOT restored — these were credential columns and the data was
-- destroyed on the forward run; any rollback recovery requires a
-- separate DB backup restore.
--
-- Also recreates the `email_logs` table from the original migration
-- (`dental-crm/supabase/migrations/20251014_email_logs.sql`), including
-- the indexes, RLS policies, and updated_at trigger.
--
-- All originally `text`/`integer` nullable, no default — except
-- `smtp_encryption` which had `DEFAULT 'tls'::text`.
-- =====================================================================

BEGIN;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS default_email_from_address text,
  ADD COLUMN IF NOT EXISTS default_email_from_name text,
  ADD COLUMN IF NOT EXISTS default_email_reply_to text,
  -- email, email_main, email_support were never dropped by the forward
  -- migration (see §2.1 PRESERVED set); nothing to restore here.
  ADD COLUMN IF NOT EXISTS sms_api_key text,
  ADD COLUMN IF NOT EXISTS sms_api_secret text,
  ADD COLUMN IF NOT EXISTS sms_from_number text,
  -- sms_phone_number was never dropped; nothing to restore.
  ADD COLUMN IF NOT EXISTS sms_provider text,
  ADD COLUMN IF NOT EXISTS smtp_encryption text DEFAULT 'tls',
  ADD COLUMN IF NOT EXISTS smtp_host text,
  ADD COLUMN IF NOT EXISTS smtp_password text,
  ADD COLUMN IF NOT EXISTS smtp_port integer,
  ADD COLUMN IF NOT EXISTS smtp_username text,
  ADD COLUMN IF NOT EXISTS whatsapp_api_key text,
  ADD COLUMN IF NOT EXISTS whatsapp_api_secret text;
  -- whatsapp_phone_number was never dropped; nothing to restore.

-- Recreate email_logs (verbatim from 20251014_email_logs.sql):
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,

  email_type VARCHAR(50) NOT NULL,
  to_email VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'pending',

  provider VARCHAR(50) DEFAULT 'resend',
  provider_message_id VARCHAR(255),

  error_message TEXT,
  error_code VARCHAR(100),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  queued_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_id ON public.email_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON public.email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON public.email_logs(to_email);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email logs"
  ON public.email_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view tenant email logs"
  ON public.email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE app_users.id = auth.uid()
      AND app_users.tenant_id = email_logs.tenant_id
      AND app_users.role IN ('admin', 'super_admin', 'owner')
    )
  );

CREATE POLICY "System can insert email logs"
  ON public.email_logs
  FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_email_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_logs_updated_at();

COMMENT ON TABLE public.email_logs IS 'Tracks all emails sent through the system for debugging, audit, and deliverability monitoring';
COMMENT ON COLUMN public.email_logs.status IS 'Current status of the email: pending, queued, sending, sent, failed, bounced, opened, clicked';
COMMENT ON COLUMN public.email_logs.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN public.email_logs.metadata IS 'Additional email metadata (template variables, campaign info, etc.)';

COMMIT;
