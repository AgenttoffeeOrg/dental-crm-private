/**
 * Marketing Audit - Share Links Table
 * 
 * Enables secure sharing of audit reports via expiring links.
 */

-- Create shares table
CREATE TABLE IF NOT EXISTS public.marketing_audit_shares (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id uuid REFERENCES public.marketing_audit_runs(id) ON DELETE CASCADE NOT NULL,
  share_token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  password_protected boolean DEFAULT false,
  access_count integer DEFAULT 0,
  last_accessed_at timestamp with time zone,
  created_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create index on share_token for fast lookups
CREATE INDEX idx_audit_shares_token ON public.marketing_audit_shares(share_token);

-- Create index on expires_at for cleanup jobs
CREATE INDEX idx_audit_shares_expires ON public.marketing_audit_shares(expires_at);

-- Enable RLS
ALTER TABLE public.marketing_audit_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create shares for their own audits
CREATE POLICY "Users can create shares for own audits"
  ON public.marketing_audit_shares
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.marketing_audit_runs ar
      JOIN public.app_users au ON ar.tenant_id = au.tenant_id
      WHERE ar.id = audit_id AND au.id = auth.uid()
    )
  );

-- Policy: Users can view shares they created
CREATE POLICY "Users can view own shares"
  ON public.marketing_audit_shares
  FOR SELECT
  USING (created_by = auth.uid());

-- Policy: Users can delete shares they created
CREATE POLICY "Users can delete own shares"
  ON public.marketing_audit_shares
  FOR DELETE
  USING (created_by = auth.uid());

-- Policy: Public can view non-expired shares (for shared links)
CREATE POLICY "Public can view valid shares"
  ON public.marketing_audit_shares
  FOR SELECT
  USING (
    expires_at > now()
    AND share_token IS NOT NULL
  );

-- Function: Cleanup expired shares (run nightly via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_audit_shares()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.marketing_audit_shares
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_audit_shares() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_audit_shares() TO service_role;

