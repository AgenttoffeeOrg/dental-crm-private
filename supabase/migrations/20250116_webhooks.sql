/**
 * Marketing Audit - Webhooks Table
 * 
 * Store webhook endpoints for event notifications.
 */

CREATE TABLE IF NOT EXISTS public.marketing_audit_webhooks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL, -- Array of event names
  secret text NOT NULL, -- For HMAC signature
  active boolean DEFAULT true,
  last_triggered_at timestamp with time zone,
  last_success_at timestamp with time zone,
  last_error text,
  total_deliveries integer DEFAULT 0,
  failed_deliveries integer DEFAULT 0,
  created_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_webhooks_tenant ON public.marketing_audit_webhooks(tenant_id);
CREATE INDEX idx_webhooks_active ON public.marketing_audit_webhooks(active) WHERE active = true;

-- Enable RLS
ALTER TABLE public.marketing_audit_webhooks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage webhooks for their tenant
CREATE POLICY "Users can view own webhooks"
  ON public.marketing_audit_webhooks
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create own webhooks"
  ON public.marketing_audit_webhooks
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own webhooks"
  ON public.marketing_audit_webhooks
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own webhooks"
  ON public.marketing_audit_webhooks
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Table for webhook delivery logs
CREATE TABLE IF NOT EXISTS public.marketing_audit_webhook_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id uuid REFERENCES public.marketing_audit_webhooks(id) ON DELETE CASCADE NOT NULL,
  event text NOT NULL,
  payload jsonb NOT NULL,
  response_code integer,
  response_body text,
  success boolean DEFAULT false,
  attempt_number integer DEFAULT 1,
  delivered_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Index for cleanup
CREATE INDEX idx_webhook_logs_delivered ON public.marketing_audit_webhook_logs(delivered_at);

-- Enable RLS
ALTER TABLE public.marketing_audit_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view logs for their webhooks
CREATE POLICY "Users can view own webhook logs"
  ON public.marketing_audit_webhook_logs
  FOR SELECT
  USING (
    webhook_id IN (
      SELECT id FROM public.marketing_audit_webhooks
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
      )
    )
  );

-- Function: Cleanup old webhook logs (keep only 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.marketing_audit_webhook_logs
  WHERE delivered_at < now() - interval '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_old_webhook_logs() TO service_role;

