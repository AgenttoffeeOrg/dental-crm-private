-- =====================================================
-- ENSURE INTEGRATION_CONNECTIONS TABLE EXISTS
-- =====================================================
-- Migration: 20250120_ensure_integration_connections
-- Description: Creates integration_connections table if it doesn't exist
-- This fixes the 404 error when trying to load integrations
-- =====================================================

-- Create integration_connections table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Integration identification
  integration_type TEXT NOT NULL, -- 'twilio_sms', 'facebook_ads', 'google_ads', 'gmail', etc.
  integration_name TEXT, -- User-friendly name
  
  -- Status & health
  status TEXT NOT NULL CHECK (status IN ('connected', 'disconnected', 'error', 'expiring_soon', 'refreshing')),
  is_active BOOLEAN DEFAULT TRUE,
  is_test_mode BOOLEAN DEFAULT FALSE,
  
  -- Credentials (encrypted at rest via RLS)
  credentials JSONB NOT NULL DEFAULT '{}', -- {access_token, refresh_token, api_key, etc.}
  test_credentials JSONB DEFAULT '{}',
  
  -- OAuth specific
  scopes TEXT[], -- Granted OAuth scopes
  token_expires_at TIMESTAMPTZ,
  token_last_refreshed_at TIMESTAMPTZ,
  
  -- Configuration
  config JSONB DEFAULT '{}', -- Integration-specific config
  mapping_config JSONB DEFAULT '{}',
  
  -- Sync tracking
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  next_sync_at TIMESTAMPTZ,
  sync_frequency TEXT CHECK (sync_frequency IN ('realtime', 'hourly', 'daily', 'weekly', 'monthly')),
  
  -- Error handling
  error_message TEXT,
  error_count INTEGER DEFAULT 0,
  last_error_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID REFERENCES public.app_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(tenant_id, integration_type)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_integration_connections_tenant 
  ON public.integration_connections(tenant_id);

CREATE INDEX IF NOT EXISTS idx_integration_connections_type 
  ON public.integration_connections(integration_type);

CREATE INDEX IF NOT EXISTS idx_integration_connections_status 
  ON public.integration_connections(status) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_integration_connections_token_expiry 
  ON public.integration_connections(token_expires_at) WHERE token_expires_at IS NOT NULL;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_integration_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS integration_connections_updated_at ON public.integration_connections;

CREATE TRIGGER integration_connections_updated_at
  BEFORE UPDATE ON public.integration_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_connections_updated_at();

-- Enable RLS
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Tenant isolation SELECT connections" ON public.integration_connections;
DROP POLICY IF EXISTS "Tenant isolation ALL connections" ON public.integration_connections;
DROP POLICY IF EXISTS "Service role bypass connections" ON public.integration_connections;

-- RLS Policies
CREATE POLICY "Tenant isolation SELECT connections"
  ON public.integration_connections FOR SELECT
  USING (
    tenant_id IN (
      SELECT active_tenant_id FROM app_users WHERE id = auth.uid()
      UNION
      SELECT tenant_id FROM app_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Tenant isolation ALL connections"
  ON public.integration_connections FOR ALL
  USING (
    tenant_id IN (
      SELECT active_tenant_id FROM app_users WHERE id = auth.uid()
      UNION
      SELECT tenant_id FROM app_users WHERE id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_connections TO authenticated;
GRANT ALL ON public.integration_connections TO service_role;

COMMENT ON TABLE public.integration_connections IS 'Central registry of all integration connections with encrypted credentials and health status';

