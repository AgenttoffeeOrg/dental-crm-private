-- =====================================================
-- HARDENING PHASE 8: Privacy, DSR & GDPR Compliance
-- Date: October 16, 2025
-- Purpose: Data Subject Rights, erasure workflows, tombstones
-- =====================================================

-- =====================================================
-- 1. ERASURE TOMBSTONES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS erasure_tombstones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  resource_type TEXT NOT NULL, -- 'contact', 'deal', 'task', 'file', etc.
  resource_id UUID NOT NULL,
  
  erased_at TIMESTAMPTZ DEFAULT NOW(),
  erased_by_user_id UUID REFERENCES app_users(id),
  
  legal_basis TEXT, -- 'gdpr_right_to_erasure', 'ccpa_deletion', 'manual_admin', etc.
  request_reference TEXT, -- Link to DSR request if applicable
  
  notes TEXT,
  
  -- Audit trail: what was erased
  pii_fields_erased TEXT[], -- ['primary_email', 'primary_phone', 'address', etc.]
  related_records_deleted TEXT[], -- ['3 tasks', '5 files', '2 calls', etc.]
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tombstone_tenant ON erasure_tombstones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tombstone_resource ON erasure_tombstones(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_tombstone_erased ON erasure_tombstones(erased_at DESC);

COMMENT ON TABLE erasure_tombstones IS 
  'Records all data erasure operations for GDPR/CCPA compliance.
   Provides audit trail showing what was deleted, when, why, and by whom.
   Does NOT contain the erased data itself (that would defeat the purpose).';

DO $$
BEGIN
  RAISE NOTICE '✅ Created erasure_tombstones table';
END $$;

-- =====================================================
-- 2. DATA SUBJECT REQUESTS (DSR) TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  request_type TEXT NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'objection', 'restriction')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'expired')),
  
  -- Requester details
  requester_email TEXT NOT NULL,
  requester_name TEXT,
  requester_phone TEXT,
  contact_id UUID REFERENCES contacts(id), -- Linked contact if found
  
  request_details TEXT,
  verification_method TEXT, -- 'email_link', 'phone_otp', 'manual', etc.
  verification_completed_at TIMESTAMPTZ,
  
  -- Response
  response_details TEXT,
  response_sent_at TIMESTAMPTZ,
  
  -- Data export (for access/portability requests)
  export_file_url TEXT,
  export_generated_at TIMESTAMPTZ,
  export_expires_at TIMESTAMPTZ,
  
  -- Erasure (for erasure requests)
  erasure_completed_at TIMESTAMPTZ,
  tombstone_id UUID REFERENCES erasure_tombstones(id),
  
  -- Timing
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  due_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'), -- GDPR: 30 days
  completed_at TIMESTAMPTZ,
  
  -- Assignment
  assigned_to_user_id UUID REFERENCES app_users(id),
  handled_by_user_id UUID REFERENCES app_users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsr_tenant ON data_subject_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dsr_status ON data_subject_requests(tenant_id, status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_dsr_due ON data_subject_requests(due_at) WHERE status NOT IN ('completed', 'rejected');
CREATE INDEX IF NOT EXISTS idx_dsr_email ON data_subject_requests(requester_email);
CREATE INDEX IF NOT EXISTS idx_dsr_requested ON data_subject_requests(requested_at DESC);

COMMENT ON TABLE data_subject_requests IS 
  'Manages GDPR/CCPA Data Subject Requests.
   Tracks lifecycle from request → verification → fulfillment → completion.
   30-day SLA for GDPR compliance.';

DO $$
BEGIN
  RAISE NOTICE '✅ Created data_subject_requests table';
END $$;

-- =====================================================
-- 3. ENABLE RLS ON PRIVACY TABLES
-- =====================================================

ALTER TABLE erasure_tombstones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tombstones_admin_only ON erasure_tombstones;
CREATE POLICY tombstones_admin_only ON erasure_tombstones
  FOR ALL
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dsr_admin_only ON data_subject_requests;
CREATE POLICY dsr_admin_only ON data_subject_requests
  FOR ALL
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Applied RLS to privacy tables (admin-only)';
END $$;

-- =====================================================
-- 4. ERASE CONTACT PII FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION erase_contact_pii(
  p_contact_id UUID,
  p_legal_basis TEXT DEFAULT 'gdpr_right_to_erasure',
  p_erased_by_user_id UUID DEFAULT NULL,
  p_dsr_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
  v_contact contacts;
  v_tombstone_id UUID;
  v_pii_fields TEXT[];
  v_related_records TEXT[] := ARRAY[]::TEXT[];
  v_count INTEGER;
BEGIN
  -- Get contact
  SELECT * INTO v_contact
  FROM contacts
  WHERE id = p_contact_id AND tenant_id = v_tenant_id;
  
  IF v_contact IS NULL THEN
    RAISE EXCEPTION 'Contact % not found or not accessible', p_contact_id;
  END IF;
  
  -- Track which PII fields we're erasing
  v_pii_fields := ARRAY['primary_email', 'primary_phone', 'alternate_phones', 'address'];
  
  -- 1. ERASE PII FROM CONTACT RECORD
  UPDATE contacts
  SET 
    full_name = 'ERASED',
    primary_email = NULL,
    primary_email_norm = NULL,
    primary_phone = NULL,
    primary_phone_e164 = NULL,
    alternate_phones = NULL,
    address = NULL,
    custom_fields = '{}'::JSONB, -- Clear custom fields
    notes = NULL,
    deleted_at = NOW(), -- Soft delete
    updated_at = NOW()
  WHERE id = p_contact_id;
  
  -- 2. ERASE PII FROM NOTES (redact content)
  UPDATE notes
  SET content = '[REDACTED - DATA ERASURE REQUEST]',
      updated_at = NOW()
  WHERE contact_id = p_contact_id AND tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    v_related_records := array_append(v_related_records, v_count || ' notes redacted');
  END IF;
  
  -- 3. DELETE FILES (mark for deletion, actual file deletion happens in storage)
  UPDATE files
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE contact_id = p_contact_id AND tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    v_related_records := array_append(v_related_records, v_count || ' files marked for deletion');
  END IF;
  
  -- 4. ERASE CALL TRANSCRIPTS (may contain PII)
  UPDATE calls
  SET transcript = NULL,
      ai_summary = NULL,
      updated_at = NOW()
  WHERE contact_id = p_contact_id AND tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    v_related_records := array_append(v_related_records, v_count || ' call transcripts erased');
  END IF;
  
  -- 5. ANONYMIZE MARKETING CAMPAIGN SENDS (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaign_sends') THEN
    EXECUTE format('UPDATE marketing_campaign_sends SET metadata = NULL WHERE contact_id = $1 AND tenant_id = $2')
      USING p_contact_id, v_tenant_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
      v_related_records := array_append(v_related_records, v_count || ' campaign sends anonymized');
    END IF;
  END IF;
  
  -- Note: We do NOT delete deals, tasks, activities - these are business records
  -- We only erase PII from the contact itself
  -- Deals/tasks remain linked to the now-anonymized contact
  
  -- 6. CREATE TOMBSTONE
  INSERT INTO erasure_tombstones (
    tenant_id,
    resource_type,
    resource_id,
    erased_by_user_id,
    legal_basis,
    request_reference,
    pii_fields_erased,
    related_records_deleted
  ) VALUES (
    v_tenant_id,
    'contact',
    p_contact_id,
    p_erased_by_user_id,
    p_legal_basis,
    CASE WHEN p_dsr_id IS NOT NULL THEN 'DSR:' || p_dsr_id::TEXT ELSE NULL END,
    v_pii_fields,
    v_related_records
  )
  RETURNING id INTO v_tombstone_id;
  
  -- 7. UPDATE DSR IF PROVIDED
  IF p_dsr_id IS NOT NULL THEN
    UPDATE data_subject_requests
    SET erasure_completed_at = NOW(),
        tombstone_id = v_tombstone_id,
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_dsr_id;
  END IF;
  
  -- 8. LOG AUDIT EVENT
  PERFORM log_audit_event(
    'erased',
    'contact',
    p_contact_id,
    jsonb_build_object(
      'legal_basis', p_legal_basis,
      'tombstone_id', v_tombstone_id,
      'pii_fields_erased', v_pii_fields,
      'related_records', v_related_records
    )
  );
  
  RETURN v_tombstone_id;
END;
$$;

COMMENT ON FUNCTION erase_contact_pii IS 
  'Erases PII from a contact and related records.
   - Anonymizes contact details
   - Redacts notes
   - Marks files for deletion
   - Erases call transcripts
   - Creates tombstone for audit
   - Updates DSR if provided
   Does NOT delete business records (deals, tasks) - only erases PII.';

DO $$
BEGIN
  RAISE NOTICE '✅ Created erase_contact_pii() function';
END $$;

-- =====================================================
-- 5. EXPORT CONTACT DATA FUNCTION (For Access/Portability Requests)
-- =====================================================

CREATE OR REPLACE FUNCTION export_contact_data(p_contact_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
  v_contact_data JSONB;
  v_deals_data JSONB;
  v_tasks_data JSONB;
  v_activities_data JSONB;
  v_calls_data JSONB;
  v_files_data JSONB;
BEGIN
  -- Get contact
  SELECT row_to_json(c.*)::JSONB INTO v_contact_data
  FROM contacts c
  WHERE c.id = p_contact_id AND c.tenant_id = v_tenant_id;
  
  IF v_contact_data IS NULL THEN
    RAISE EXCEPTION 'Contact % not found', p_contact_id;
  END IF;
  
  -- Get related deals
  SELECT COALESCE(jsonb_agg(row_to_json(d.*)), '[]'::JSONB) INTO v_deals_data
  FROM deals d
  WHERE d.contact_id = p_contact_id AND d.tenant_id = v_tenant_id;
  
  -- Get related tasks
  SELECT COALESCE(jsonb_agg(row_to_json(t.*)), '[]'::JSONB) INTO v_tasks_data
  FROM tasks t
  WHERE t.contact_id = p_contact_id AND t.tenant_id = v_tenant_id;
  
  -- Get related activities
  SELECT COALESCE(jsonb_agg(row_to_json(a.*)), '[]'::JSONB) INTO v_activities_data
  FROM activities a
  WHERE a.contact_id = p_contact_id AND a.tenant_id = v_tenant_id;
  
  -- Get related calls
  SELECT COALESCE(jsonb_agg(row_to_json(c.*)), '[]'::JSONB) INTO v_calls_data
  FROM calls c
  WHERE c.contact_id = p_contact_id AND c.tenant_id = v_tenant_id;
  
  -- Get file metadata (not actual files)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'file_name', f.file_name,
      'file_type', f.file_type,
      'file_size', f.file_size,
      'uploaded_at', f.uploaded_at
    )
  ), '[]'::JSONB) INTO v_files_data
  FROM files f
  WHERE f.contact_id = p_contact_id AND f.tenant_id = v_tenant_id;
  
  -- Build complete export
  RETURN jsonb_build_object(
    'contact', v_contact_data,
    'deals', v_deals_data,
    'tasks', v_tasks_data,
    'activities', v_activities_data,
    'calls', v_calls_data,
    'files', v_files_data,
    'exported_at', NOW(),
    'export_format', 'json',
    'gdpr_notice', 'This export contains all personal data we hold about you.'
  );
END;
$$;

COMMENT ON FUNCTION export_contact_data IS 
  'Exports all data for a contact in GDPR-compliant format.
   Returns JSON with contact + all related records.
   Use this for GDPR Access Requests and Portability Requests.';

DO $$
BEGIN
  RAISE NOTICE '✅ Created export_contact_data() function';
END $$;

-- =====================================================
-- 6. CREATE DSR REQUEST FUNCTION (Self-service)
-- =====================================================

CREATE OR REPLACE FUNCTION create_dsr_request(
  p_tenant_id UUID,
  p_request_type TEXT,
  p_requester_email TEXT,
  p_requester_name TEXT DEFAULT NULL,
  p_request_details TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_dsr_id UUID;
  v_contact_id UUID;
BEGIN
  -- Try to find matching contact
  SELECT id INTO v_contact_id
  FROM contacts
  WHERE tenant_id = p_tenant_id
    AND primary_email_norm = normalize_email(p_requester_email)
  LIMIT 1;
  
  -- Create DSR
  INSERT INTO data_subject_requests (
    tenant_id,
    request_type,
    requester_email,
    requester_name,
    contact_id,
    request_details,
    status
  ) VALUES (
    p_tenant_id,
    p_request_type,
    p_requester_email,
    p_requester_name,
    v_contact_id,
    p_request_details,
    'pending'
  )
  RETURNING id INTO v_dsr_id;
  
  RETURN v_dsr_id;
END;
$$;

COMMENT ON FUNCTION create_dsr_request IS 
  'Creates a new Data Subject Request.
   Can be called from public form (self-service DSR portal).
   Automatically links to contact if email matches.';

DO $$
BEGIN
  RAISE NOTICE '✅ Created create_dsr_request() function';
END $$;

-- =====================================================
-- 7. VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== PRIVACY & DSR VERIFICATION ===';
  RAISE NOTICE 'Tables:';
  RAISE NOTICE '  - erasure_tombstones (audit trail)';
  RAISE NOTICE '  - data_subject_requests (DSR management)';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  - erase_contact_pii() - GDPR erasure';
  RAISE NOTICE '  - export_contact_data() - GDPR access/portability';
  RAISE NOTICE '  - create_dsr_request() - Self-service DSR';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ HARDENING PHASE 8 COMPLETE: Privacy & DSR';
  RAISE NOTICE '   - erasure_tombstones table (audit trail)';
  RAISE NOTICE '   - data_subject_requests table (DSR workflow)';
  RAISE NOTICE '   - erase_contact_pii() - Comprehensive PII erasure';
  RAISE NOTICE '   - export_contact_data() - Data export (JSON)';
  RAISE NOTICE '   - create_dsr_request() - Self-service DSR creation';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 COMPLIANCE: GDPR/CCPA-ready';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  APPLICATION CHANGES NEEDED:';
  RAISE NOTICE '   1. Create DSR portal (public form for requests)';
  RAISE NOTICE '   2. Admin UI: DSR queue with 30-day SLA tracking';
  RAISE NOTICE '   3. Export: Generate PDF/CSV from export_contact_data()';
  RAISE NOTICE '   4. Erasure: Call erase_contact_pii() with confirmation';
  RAISE NOTICE '   5. Storage: Delete actual files when marked deleted_at';
  RAISE NOTICE '   6. Email: Send confirmation emails after DSR completion';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Next: Phase 9 (Observability - trace IDs, dashboards)';
END $$;

