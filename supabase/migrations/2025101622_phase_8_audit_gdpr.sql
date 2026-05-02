SET search_path TO public, extensions;

-- =====================================================
-- PHASE 8: ENHANCED AUDIT LOGS & GDPR COMPLIANCE
-- Comprehensive audit trail and data privacy controls
-- =====================================================
-- Date: October 16, 2025
-- Priority: P0 - COMPLIANCE & SECURITY
--
-- This migration creates:
-- - Enhanced audit logging for all operations
-- - GDPR data export/delete tools
-- - Access logging and monitoring
-- - Privacy controls and consent management
-- - Data retention policies
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ENHANCED AUDIT TRAIL TABLE
-- =====================================================

-- Check if audit_trail exists, enhance it
DO $$
BEGIN
  -- Add columns if they don't exist
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS correlation_id UUID;
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS session_id TEXT;
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS ip_address TEXT;
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS user_agent TEXT;
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS request_method TEXT;
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS request_path TEXT;
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS response_status INTEGER;
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS error_message TEXT;
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('info', 'warning', 'error', 'critical'));
EXCEPTION
  WHEN undefined_table THEN
    -- Create audit_trail if it doesn't exist
    DROP TABLE IF EXISTS audit_trail CASCADE;
CREATE TABLE audit_trail (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id UUID REFERENCES app_users(id),
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id UUID,
      old_values JSONB,
      new_values JSONB,
      correlation_id UUID,
      session_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      request_method TEXT,
      request_path TEXT,
      response_status INTEGER,
      duration_ms INTEGER,
      error_message TEXT,
      severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_audit_trail_tenant ON audit_trail(tenant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON audit_trail(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_trail_resource ON audit_trail(resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS idx_audit_trail_correlation ON audit_trail(correlation_id);
    CREATE INDEX IF NOT EXISTS idx_audit_trail_severity ON audit_trail(severity, created_at DESC) WHERE severity IN ('error', 'critical');
END $$;

-- =====================================================
-- 2. DATA ACCESS LOG (Who Viewed What)
-- =====================================================

DROP TABLE IF EXISTS data_access_log CASCADE;
CREATE TABLE data_access_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES app_users(id),
  accessed_table TEXT NOT NULL,
  accessed_record_id UUID,
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'list', 'search', 'export', 'print')),
  record_count INTEGER DEFAULT 1,
  filters_applied JSONB,
  accessed_from TEXT, -- Page/component that triggered access
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_access_tenant ON data_access_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_user ON data_access_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_table_record ON data_access_log(accessed_table, accessed_record_id);
CREATE INDEX IF NOT EXISTS idx_data_access_sensitive ON data_access_log(created_at DESC) WHERE accessed_table IN ('contacts', 'deals', 'billing');

-- =====================================================
-- 3. GDPR CONSENT MANAGEMENT
-- =====================================================

DROP TABLE IF EXISTS consent_records CASCADE;
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('marketing_email', 'marketing_sms', 'marketing_whatsapp', 'data_processing', 'data_sharing', 'cookies', 'analytics', 'third_party')),
  granted BOOLEAN NOT NULL,
  consent_method TEXT NOT NULL CHECK (consent_method IN ('explicit', 'implicit', 'legitimate_interest', 'contract', 'legal_obligation')),
  consent_source TEXT, -- Form URL, page, campaign, etc.
  consent_text TEXT, -- Exact text they consented to
  ip_address TEXT,
  user_agent TEXT,
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  withdrawal_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_contact ON consent_records(contact_id, consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_tenant ON consent_records(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_active ON consent_records(contact_id, consent_type) WHERE granted = true AND withdrawn_at IS NULL;

-- =====================================================
-- 4. GDPR DATA EXPORT REQUESTS
-- =====================================================

DROP TABLE IF EXISTS gdpr_export_requests CASCADE;
CREATE TABLE gdpr_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  requested_by_user_id UUID NOT NULL REFERENCES app_users(id),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('contact', 'user', 'tenant')),
  subject_id UUID NOT NULL,
  export_format TEXT NOT NULL CHECK (export_format IN ('json', 'csv', 'pdf')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  export_url TEXT, -- S3/Storage URL when ready
  file_size_bytes BIGINT,
  expires_at TIMESTAMP WITH TIME ZONE, -- Export links expire after 7 days
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_gdpr_exports_tenant ON gdpr_export_requests(tenant_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_gdpr_exports_user ON gdpr_export_requests(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_exports_status ON gdpr_export_requests(status, requested_at DESC) WHERE status IN ('pending', 'processing');

-- =====================================================
-- 5. GDPR DATA DELETION REQUESTS
-- =====================================================

DROP TABLE IF EXISTS gdpr_deletion_requests CASCADE;
CREATE TABLE gdpr_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  requested_by_user_id UUID NOT NULL REFERENCES app_users(id),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('contact', 'user')),
  subject_id UUID NOT NULL,
  deletion_scope TEXT NOT NULL CHECK (deletion_scope IN ('all_data', 'personal_data_only', 'anonymize')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled')),
  approved_by_user_id UUID REFERENCES app_users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  deletion_summary JSONB, -- { tables_affected: [...], records_deleted: N }
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_gdpr_deletions_tenant ON gdpr_deletion_requests(tenant_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_gdpr_deletions_status ON gdpr_deletion_requests(status, requested_at DESC) WHERE status IN ('pending', 'approved', 'processing');

-- =====================================================
-- 6. DATA RETENTION POLICIES
-- =====================================================

DROP TABLE IF EXISTS data_retention_policies CASCADE;
CREATE TABLE data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  retention_days INTEGER NOT NULL CHECK (retention_days > 0),
  applies_to_deleted BOOLEAN DEFAULT true, -- Soft-deleted records
  archive_before_delete BOOLEAN DEFAULT true,
  archive_location TEXT, -- e.g., 's3://backups/...'
  enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, table_name)
);

CREATE INDEX IF NOT EXISTS idx_retention_policies_tenant ON data_retention_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_retention_policies_enabled ON data_retention_policies(tenant_id) WHERE enabled = true;

-- =====================================================
-- 7. PRIVACY SETTINGS PER TENANT
-- =====================================================

DROP TABLE IF EXISTS privacy_settings CASCADE;
CREATE TABLE privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Data Processing
  data_processor_name TEXT, -- Legal entity name
  data_protection_officer_email TEXT,
  data_protection_officer_phone TEXT,
  
  -- GDPR Settings
  gdpr_enabled BOOLEAN DEFAULT true,
  ccpa_enabled BOOLEAN DEFAULT false,
  hipaa_enabled BOOLEAN DEFAULT false,
  
  -- Consent Requirements
  require_explicit_consent BOOLEAN DEFAULT true,
  double_opt_in_email BOOLEAN DEFAULT true,
  double_opt_in_sms BOOLEAN DEFAULT true,
  
  -- Data Handling
  anonymize_after_days INTEGER DEFAULT 2555, -- 7 years
  delete_unverified_contacts_after_days INTEGER DEFAULT 90,
  auto_delete_unsubscribed_after_days INTEGER DEFAULT 365,
  
  -- Export/Delete Requests
  auto_approve_exports BOOLEAN DEFAULT false,
  auto_approve_deletions BOOLEAN DEFAULT false,
  deletion_requires_2fa BOOLEAN DEFAULT true,
  
  -- Breach Notification
  breach_notification_email TEXT,
  breach_notification_required_within_hours INTEGER DEFAULT 72, -- GDPR requirement
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create default privacy settings for existing tenants
INSERT INTO privacy_settings (tenant_id)
SELECT id FROM tenants
WHERE NOT EXISTS (SELECT 1 FROM privacy_settings WHERE tenant_id = tenants.id)
ON CONFLICT (tenant_id) DO NOTHING;

-- =====================================================
-- 8. AUDIT HELPER FUNCTIONS
-- =====================================================

-- Log an audit event
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_tenant_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  audit_id BIGINT;
BEGIN
  INSERT INTO audit_trail (
    tenant_id,
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    metadata,
    correlation_id
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    p_metadata,
    gen_random_uuid()
  )
  RETURNING id INTO audit_id;
  
  RETURN audit_id::UUID;
END;
$$;

-- Log data access
CREATE OR REPLACE FUNCTION public.log_data_access(
  p_tenant_id UUID,
  p_user_id UUID,
  p_table TEXT,
  p_record_id UUID DEFAULT NULL,
  p_access_type TEXT DEFAULT 'view',
  p_record_count INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  INSERT INTO data_access_log (
    tenant_id,
    user_id,
    accessed_table,
    accessed_record_id,
    access_type,
    record_count
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_table,
    p_record_id,
    p_access_type,
    p_record_count
  );
$$;

-- =====================================================
-- 9. GDPR EXPORT FUNCTION
-- =====================================================

-- Generate GDPR export data for a contact
CREATE OR REPLACE FUNCTION public.generate_gdpr_export_for_contact(
  p_tenant_id UUID,
  p_contact_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  export_data JSONB;
  contact_data JSONB;
  deals_data JSONB;
  tasks_data JSONB;
  activities_data JSONB;
  consents_data JSONB;
  forms_data JSONB;
BEGIN
  -- Collect contact data
  SELECT row_to_json(c.*)::JSONB INTO contact_data
  FROM contacts c
  WHERE c.id = p_contact_id AND c.tenant_id = p_tenant_id;
  
  -- Collect deals
  SELECT COALESCE(json_agg(row_to_json(d.*)), '[]'::json)::JSONB INTO deals_data
  FROM deals d
  WHERE d.contact_id = p_contact_id AND d.tenant_id = p_tenant_id;
  
  -- Collect tasks
  SELECT COALESCE(json_agg(row_to_json(t.*)), '[]'::json)::JSONB INTO tasks_data
  FROM tasks t
  WHERE t.contact_id = p_contact_id AND t.tenant_id = p_tenant_id;
  
  -- Collect activities
  SELECT COALESCE(json_agg(row_to_json(a.*)), '[]'::json)::JSONB INTO activities_data
  FROM activities a
  WHERE a.contact_id = p_contact_id AND a.tenant_id = p_tenant_id;
  
  -- Collect consent records
  SELECT COALESCE(json_agg(row_to_json(cr.*)), '[]'::json)::JSONB INTO consents_data
  FROM consent_records cr
  WHERE cr.contact_id = p_contact_id AND cr.tenant_id = p_tenant_id;
  
  -- Collect form submissions
  SELECT COALESCE(json_agg(row_to_json(fs.*)), '[]'::json)::JSONB INTO forms_data
  FROM form_submissions fs
  WHERE fs.contact_id = p_contact_id AND fs.tenant_id = p_tenant_id;
  
  -- Build complete export
  export_data := jsonb_build_object(
    'export_generated_at', NOW(),
    'export_version', '1.0',
    'tenant_id', p_tenant_id,
    'contact', contact_data,
    'deals', deals_data,
    'tasks', tasks_data,
    'activities', activities_data,
    'consents', consents_data,
    'form_submissions', forms_data
  );
  
  RETURN export_data;
END;
$$;

-- =====================================================
-- 10. GDPR ANONYMIZATION FUNCTION
-- =====================================================

-- Anonymize contact data (GDPR "right to be forgotten")
CREATE OR REPLACE FUNCTION public.anonymize_contact_data(
  p_tenant_id UUID,
  p_contact_id UUID,
  p_requested_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_tables TEXT[] := ARRAY['contacts', 'deals', 'tasks', 'activities', 'form_submissions'];
  summary JSONB;
BEGIN
  -- Log the anonymization request
  INSERT INTO audit_trail (tenant_id, user_id, action, resource_type, resource_id, severity, metadata)
  VALUES (
    p_tenant_id,
    p_requested_by,
    'gdpr_anonymize',
    'contact',
    p_contact_id,
    'warning',
    jsonb_build_object('reason', 'GDPR right to be forgotten')
  );
  
  -- Anonymize contact
  UPDATE contacts
  SET 
    full_name = 'ANONYMIZED_' || id::TEXT,
    primary_email = NULL,
    primary_phone = NULL,
    secondary_phone = NULL,
    date_of_birth = NULL,
    address = NULL,
    city = NULL,
    postal_code = NULL,
    updated_at = NOW()
  WHERE id = p_contact_id AND tenant_id = p_tenant_id;
  
  -- Anonymize activities
  UPDATE activities
  SET
    subject = 'ANONYMIZED',
    snippet = NULL,
    transcript = NULL,
    updated_at = NOW()
  WHERE contact_id = p_contact_id AND tenant_id = p_tenant_id;
  
  -- Build summary
  summary := jsonb_build_object(
    'anonymized_at', NOW(),
    'contact_id', p_contact_id,
    'requested_by', p_requested_by,
    'affected_tables', affected_tables,
    'status', 'completed'
  );
  
  RETURN summary;
END;
$$;

-- =====================================================
-- 11. BREACH NOTIFICATION TABLE
-- =====================================================

DROP TABLE IF EXISTS security_breaches CASCADE;
CREATE TABLE security_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  breach_type TEXT NOT NULL CHECK (breach_type IN ('data_leak', 'unauthorized_access', 'data_loss', 'ransomware', 'phishing', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  detected_by UUID REFERENCES app_users(id),
  affected_record_count INTEGER,
  affected_data_types TEXT[], -- ['email', 'phone', 'medical_data']
  breach_description TEXT NOT NULL,
  containment_actions TEXT,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  notification_method TEXT,
  regulatory_reported_at TIMESTAMP WITH TIME ZONE,
  regulatory_body TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'false_alarm')),
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_breaches_tenant ON security_breaches(tenant_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_breaches_status ON security_breaches(status, detected_at DESC) WHERE status IN ('open', 'investigating');
CREATE INDEX IF NOT EXISTS idx_breaches_severity ON security_breaches(severity, detected_at DESC) WHERE severity IN ('high', 'critical');

-- =====================================================
-- 12. RLS FOR AUDIT & PRIVACY TABLES
-- =====================================================

-- Data Access Log
ALTER TABLE data_access_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auditors can view access logs" ON data_access_log;
CREATE POLICY "Auditors can view access logs" ON data_access_log
  FOR SELECT USING (
    tenant_id = public.get_user_org_id()
    AND public.user_has_permission(auth.uid(), tenant_id, 'audit.view')
  );

DROP POLICY IF EXISTS "Service role bypass access_log" ON data_access_log;
CREATE POLICY "Service role bypass access_log" ON data_access_log
  FOR ALL USING (auth.role() = 'service_role');

-- Consent Records
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tenant consents" ON consent_records;
CREATE POLICY "Users can view tenant consents" ON consent_records
  FOR SELECT USING (tenant_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Admins can manage consents" ON consent_records;
CREATE POLICY "Admins can manage consents" ON consent_records
  FOR ALL USING (
    tenant_id = public.get_user_org_id()
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.team.manage')
  );

DROP POLICY IF EXISTS "Service role bypass consents" ON consent_records;
CREATE POLICY "Service role bypass consents" ON consent_records
  FOR ALL USING (auth.role() = 'service_role');

-- GDPR Export Requests
ALTER TABLE gdpr_export_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own export requests" ON gdpr_export_requests;
CREATE POLICY "Users can view own export requests" ON gdpr_export_requests
  FOR SELECT USING (
    tenant_id = public.get_user_org_id()
    AND (requested_by_user_id = auth.uid() OR public.user_has_permission(auth.uid(), tenant_id, 'audit.view'))
  );

DROP POLICY IF EXISTS "Users can create export requests" ON gdpr_export_requests;
CREATE POLICY "Users can create export requests" ON gdpr_export_requests
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_org_id()
    AND requested_by_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Service role bypass gdpr_exports" ON gdpr_export_requests;
CREATE POLICY "Service role bypass gdpr_exports" ON gdpr_export_requests
  FOR ALL USING (auth.role() = 'service_role');

-- GDPR Deletion Requests
ALTER TABLE gdpr_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage deletion requests" ON gdpr_deletion_requests;
CREATE POLICY "Admins can manage deletion requests" ON gdpr_deletion_requests
  FOR ALL USING (
    tenant_id = public.get_user_org_id()
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.team.manage')
  );

DROP POLICY IF EXISTS "Service role bypass gdpr_deletions" ON gdpr_deletion_requests;
CREATE POLICY "Service role bypass gdpr_deletions" ON gdpr_deletion_requests
  FOR ALL USING (auth.role() = 'service_role');

-- Privacy Settings
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own privacy settings" ON privacy_settings;
CREATE POLICY "Users can view own privacy settings" ON privacy_settings
  FOR SELECT USING (tenant_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Admins can manage privacy settings" ON privacy_settings;
CREATE POLICY "Admins can manage privacy settings" ON privacy_settings
  FOR ALL USING (
    tenant_id = public.get_user_org_id()
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.security.manage')
  );

DROP POLICY IF EXISTS "Service role bypass privacy_settings" ON privacy_settings;
CREATE POLICY "Service role bypass privacy_settings" ON privacy_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Security Breaches
ALTER TABLE security_breaches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view security breaches" ON security_breaches;
CREATE POLICY "Admins can view security breaches" ON security_breaches
  FOR SELECT USING (
    tenant_id = public.get_user_org_id()
    AND public.user_has_permission(auth.uid(), tenant_id, 'audit.view')
  );

DROP POLICY IF EXISTS "Admins can manage breaches" ON security_breaches;
CREATE POLICY "Admins can manage breaches" ON security_breaches
  FOR ALL USING (
    tenant_id = public.get_user_org_id()
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.security.manage')
  );

DROP POLICY IF EXISTS "Service role bypass breaches" ON security_breaches;
CREATE POLICY "Service role bypass breaches" ON security_breaches
  FOR ALL USING (auth.role() = 'service_role');

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  consent_count INTEGER;
  export_requests_count INTEGER;
  privacy_settings_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO consent_count FROM consent_records;
  SELECT COUNT(*) INTO export_requests_count FROM gdpr_export_requests;
  SELECT COUNT(*) INTO privacy_settings_count FROM privacy_settings;
  
  RAISE NOTICE '=== AUDIT & GDPR VERIFICATION ===';
  RAISE NOTICE 'Consent records: %', consent_count;
  RAISE NOTICE 'GDPR export requests: %', export_requests_count;
  RAISE NOTICE 'Privacy settings (tenants): %', privacy_settings_count;
  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ Phase 8 Complete: Audit logging and GDPR compliance configured';
END $$;

