-- =====================================================
-- HARDENING PHASE 5: Data Quality - Email/Phone Normalization
-- Date: October 16, 2025
-- Purpose: Add normalization columns, deduplication, merge support
-- =====================================================

-- =====================================================
-- 1. ADD NORMALIZATION COLUMNS TO CONTACTS
-- =====================================================

-- Add normalized email column (lowercase, trimmed)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS primary_email_norm TEXT;

-- Add normalized phone column (E.164 format)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS primary_phone_e164 TEXT;

-- Add duplicate tracking
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false;

DO $$
BEGIN
  RAISE NOTICE '✅ Added normalization columns to contacts';
END $$;

-- =====================================================
-- 2. CREATE UNIQUE INDEXES (Enforce uniqueness per tenant)
-- =====================================================

-- Unique email per tenant (when not deleted)
CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_email_norm
  ON contacts(tenant_id, primary_email_norm)
  WHERE primary_email_norm IS NOT NULL 
    AND deleted_at IS NULL 
    AND merged_into_id IS NULL;

-- Unique phone per tenant (when not deleted)
CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_phone_e164
  ON contacts(tenant_id, primary_phone_e164)
  WHERE primary_phone_e164 IS NOT NULL 
    AND deleted_at IS NULL 
    AND merged_into_id IS NULL;

-- Index for searching duplicates
CREATE INDEX IF NOT EXISTS idx_contacts_is_duplicate ON contacts(tenant_id, is_duplicate) WHERE is_duplicate = true;
CREATE INDEX IF NOT EXISTS idx_contacts_merged_into ON contacts(merged_into_id) WHERE merged_into_id IS NOT NULL;

DO $$
BEGIN
  RAISE NOTICE '✅ Created unique indexes for normalized fields';
END $$;

-- =====================================================
-- 3. EMAIL NORMALIZATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION normalize_email(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_email IS NULL OR p_email = '' THEN
    RETURN NULL;
  END IF;
  
  -- Lowercase and trim
  RETURN LOWER(TRIM(p_email));
END;
$$;

COMMENT ON FUNCTION normalize_email(TEXT) IS 
  'Normalizes email to lowercase and trimmed format for deduplication.';

-- =====================================================
-- 4. PHONE NORMALIZATION FUNCTION (Basic E.164 attempt)
-- =====================================================

CREATE OR REPLACE FUNCTION normalize_phone(p_phone TEXT, p_default_country TEXT DEFAULT 'GB')
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_phone TEXT;
BEGIN
  IF p_phone IS NULL OR p_phone = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove all non-digit characters
  v_phone := REGEXP_REPLACE(p_phone, '[^0-9+]', '', 'g');
  
  -- If starts with +, assume it's already in international format
  IF v_phone LIKE '+%' THEN
    RETURN v_phone;
  END IF;
  
  -- If starts with 00, convert to +
  IF v_phone LIKE '00%' THEN
    RETURN '+' || SUBSTRING(v_phone FROM 3);
  END IF;
  
  -- UK-specific: If starts with 0, replace with +44
  IF p_default_country = 'GB' AND v_phone LIKE '0%' THEN
    RETURN '+44' || SUBSTRING(v_phone FROM 2);
  END IF;
  
  -- US-specific: If 10 digits, add +1
  IF p_default_country = 'US' AND LENGTH(v_phone) = 10 THEN
    RETURN '+1' || v_phone;
  END IF;
  
  -- Otherwise, return as-is with + prefix if not present
  IF NOT v_phone LIKE '+%' THEN
    -- Try to add default country code
    IF p_default_country = 'GB' THEN
      RETURN '+44' || v_phone;
    ELSIF p_default_country = 'US' THEN
      RETURN '+1' || v_phone;
    ELSE
      RETURN '+' || v_phone; -- Generic fallback
    END IF;
  END IF;
  
  RETURN v_phone;
END;
$$;

COMMENT ON FUNCTION normalize_phone(TEXT, TEXT) IS 
  'Attempts to normalize phone to E.164 format.
   Note: This is a basic implementation. For production, consider using libphonenumber.
   Default country: GB (United Kingdom).';

-- =====================================================
-- 5. TRIGGER TO AUTO-NORMALIZE ON INSERT/UPDATE
-- =====================================================

CREATE OR REPLACE FUNCTION contacts_normalize_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Normalize email
  IF NEW.primary_email IS NOT NULL THEN
    NEW.primary_email_norm := normalize_email(NEW.primary_email);
  ELSE
    NEW.primary_email_norm := NULL;
  END IF;
  
  -- Normalize phone
  IF NEW.primary_phone IS NOT NULL THEN
    -- Get tenant's default country if available
    -- For now, default to GB
    NEW.primary_phone_e164 := normalize_phone(NEW.primary_phone, 'GB');
  ELSE
    NEW.primary_phone_e164 := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_contacts_normalize ON contacts;
CREATE TRIGGER trig_contacts_normalize
  BEFORE INSERT OR UPDATE OF primary_email, primary_phone ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION contacts_normalize_fields();

DO $$
BEGIN
  RAISE NOTICE '✅ Created auto-normalization trigger on contacts';
END $$;

-- =====================================================
-- 6. BACKFILL EXISTING DATA (Handle duplicates gracefully)
-- =====================================================

-- Normalize existing contacts one by one, skip duplicates
DO $$
DECLARE
  v_contact RECORD;
  v_normalized_email TEXT;
  v_normalized_phone TEXT;
  v_duplicate_count INTEGER := 0;
  v_success_count INTEGER := 0;
BEGIN
  FOR v_contact IN 
    SELECT id, primary_email, primary_phone
    FROM contacts
    WHERE (primary_email_norm IS NULL AND primary_email IS NOT NULL)
       OR (primary_phone_e164 IS NULL AND primary_phone IS NOT NULL)
  LOOP
    BEGIN
      -- Normalize
      v_normalized_email := normalize_email(v_contact.primary_email);
      v_normalized_phone := normalize_phone(v_contact.primary_phone, 'GB');
      
      -- Try to update (will fail if duplicate exists)
      UPDATE contacts
      SET primary_email_norm = v_normalized_email,
          primary_phone_e164 = v_normalized_phone
      WHERE id = v_contact.id;
      
      v_success_count := v_success_count + 1;
      
    EXCEPTION
      WHEN unique_violation THEN
        -- Duplicate found - mark this contact as potential duplicate
        UPDATE contacts
        SET is_duplicate = true
        WHERE id = v_contact.id;
        
        v_duplicate_count := v_duplicate_count + 1;
        
        RAISE NOTICE 'Duplicate found: contact % has duplicate email/phone', v_contact.id;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Backfilled normalization: % successful, % duplicates marked', v_success_count, v_duplicate_count;
  
  IF v_duplicate_count > 0 THEN
    RAISE NOTICE 'ℹ️  Found % potential duplicates. Use find_duplicate_contacts() and merge_contacts() to resolve.', v_duplicate_count;
  END IF;
END $$;

-- =====================================================
-- 7. DUPLICATE DETECTION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION find_duplicate_contacts(
  p_tenant_id UUID,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_exclude_contact_id UUID DEFAULT NULL
)
RETURNS TABLE (
  contact_id UUID,
  full_name TEXT,
  primary_email TEXT,
  primary_phone TEXT,
  match_reason TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as contact_id,
    c.full_name,
    c.primary_email,
    c.primary_phone,
    CASE 
      WHEN c.primary_email_norm = normalize_email(p_email) THEN 'email_match'
      WHEN c.primary_phone_e164 = normalize_phone(p_phone, 'GB') THEN 'phone_match'
      ELSE 'unknown'
    END as match_reason,
    c.created_at
  FROM contacts c
  WHERE c.tenant_id = p_tenant_id
    AND c.deleted_at IS NULL
    AND c.merged_into_id IS NULL
    AND c.id != COALESCE(p_exclude_contact_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
      (p_email IS NOT NULL AND c.primary_email_norm = normalize_email(p_email))
      OR
      (p_phone IS NOT NULL AND c.primary_phone_e164 = normalize_phone(p_phone, 'GB'))
    )
  ORDER BY c.created_at ASC;
END;
$$;

COMMENT ON FUNCTION find_duplicate_contacts IS 
  'Finds potential duplicate contacts by normalized email or phone.
   Returns matches within the same tenant, excluding deleted and merged records.';

DO $$
BEGIN
  RAISE NOTICE '✅ Created find_duplicate_contacts() function';
END $$;

-- =====================================================
-- 8. MERGE CONTACTS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION merge_contacts(
  p_source_contact_id UUID,
  p_target_contact_id UUID,
  p_merged_by_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_source contacts;
  v_target contacts;
  v_tenant_id UUID := current_tenant_id();
  v_result JSONB;
  v_deals_moved INTEGER := 0;
  v_tasks_moved INTEGER := 0;
  v_activities_moved INTEGER := 0;
  v_calls_moved INTEGER := 0;
  v_files_moved INTEGER := 0;
  v_notes_moved INTEGER := 0;
BEGIN
  -- Validate both contacts exist and belong to same tenant
  SELECT * INTO v_source FROM contacts WHERE id = p_source_contact_id AND tenant_id = v_tenant_id;
  SELECT * INTO v_target FROM contacts WHERE id = p_target_contact_id AND tenant_id = v_tenant_id;
  
  IF v_source IS NULL THEN
    RAISE EXCEPTION 'Source contact % not found', p_source_contact_id;
  END IF;
  
  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Target contact % not found', p_target_contact_id;
  END IF;
  
  IF v_source.id = v_target.id THEN
    RAISE EXCEPTION 'Cannot merge contact with itself';
  END IF;
  
  -- Move all related records to target contact
  
  -- 1. Deals
  UPDATE deals SET contact_id = p_target_contact_id 
  WHERE contact_id = p_source_contact_id AND tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_deals_moved = ROW_COUNT;
  
  -- 2. Tasks
  UPDATE tasks SET contact_id = p_target_contact_id 
  WHERE contact_id = p_source_contact_id AND tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_tasks_moved = ROW_COUNT;
  
  -- 3. Activities
  UPDATE activities SET contact_id = p_target_contact_id 
  WHERE contact_id = p_source_contact_id AND tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_activities_moved = ROW_COUNT;
  
  -- 4. Calls
  UPDATE calls SET contact_id = p_target_contact_id 
  WHERE contact_id = p_source_contact_id AND tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_calls_moved = ROW_COUNT;
  
  -- 5. Files
  UPDATE files SET contact_id = p_target_contact_id 
  WHERE contact_id = p_source_contact_id AND tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_files_moved = ROW_COUNT;
  
  -- 6. Notes
  UPDATE notes SET contact_id = p_target_contact_id 
  WHERE contact_id = p_source_contact_id AND tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_notes_moved = ROW_COUNT;
  
  -- 7. Marketing campaign sends (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaign_sends') THEN
    EXECUTE format('UPDATE marketing_campaign_sends SET contact_id = $1 WHERE contact_id = $2 AND tenant_id = $3')
      USING p_target_contact_id, p_source_contact_id, v_tenant_id;
  END IF;
  
  -- Mark source as duplicate and merged
  UPDATE contacts
  SET is_duplicate = true,
      merged_into_id = p_target_contact_id,
      deleted_at = NOW(),
      updated_at = NOW()
  WHERE id = p_source_contact_id;
  
  -- Log audit event
  PERFORM log_audit_event(
    'merged',
    'contact',
    p_source_contact_id,
    jsonb_build_object(
      'source_contact_id', p_source_contact_id,
      'target_contact_id', p_target_contact_id,
      'merged_by_user_id', p_merged_by_user_id,
      'records_moved', jsonb_build_object(
        'deals', v_deals_moved,
        'tasks', v_tasks_moved,
        'activities', v_activities_moved,
        'calls', v_calls_moved,
        'files', v_files_moved,
        'notes', v_notes_moved
      )
    )
  );
  
  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'source_contact_id', p_source_contact_id,
    'target_contact_id', p_target_contact_id,
    'records_moved', jsonb_build_object(
      'deals', v_deals_moved,
      'tasks', v_tasks_moved,
      'activities', v_activities_moved,
      'calls', v_calls_moved,
      'files', v_files_moved,
      'notes', v_notes_moved
    )
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION merge_contacts IS 
  'Merges source contact into target contact.
   Moves all related records (deals, tasks, activities, calls, files, notes).
   Marks source as duplicate and soft-deletes it.
   Logs audit event for traceability.';

DO $$
BEGIN
  RAISE NOTICE '✅ Created merge_contacts() function';
END $$;

-- =====================================================
-- 9. UNMERGE CONTACTS FUNCTION (Recovery)
-- =====================================================

CREATE OR REPLACE FUNCTION unmerge_contact(p_contact_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
BEGIN
  -- Unmark as duplicate and restore
  UPDATE contacts
  SET is_duplicate = false,
      merged_into_id = NULL,
      deleted_at = NULL,
      updated_at = NOW()
  WHERE id = p_contact_id
    AND tenant_id = v_tenant_id
    AND is_duplicate = true;
  
  IF FOUND THEN
    -- Log audit event
    PERFORM log_audit_event('unmerged', 'contact', p_contact_id, jsonb_build_object('unmerged_at', NOW()));
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

COMMENT ON FUNCTION unmerge_contact IS 
  'Unmerges a previously merged contact (restores it).
   Does NOT move records back - they stay with the target contact.
   This is a recovery function in case merge was accidental.';

DO $$
BEGIN
  RAISE NOTICE '✅ Created unmerge_contact() function';
END $$;

-- =====================================================
-- 10. VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_normalized_count INTEGER;
  v_duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_normalized_count
  FROM contacts
  WHERE primary_email_norm IS NOT NULL OR primary_phone_e164 IS NOT NULL;
  
  SELECT COUNT(*) INTO v_duplicate_count
  FROM contacts
  WHERE is_duplicate = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== DATA QUALITY VERIFICATION ===';
  RAISE NOTICE 'Contacts with normalized fields: %', v_normalized_count;
  RAISE NOTICE 'Marked as duplicates: %', v_duplicate_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  - normalize_email() - Email normalization';
  RAISE NOTICE '  - normalize_phone() - Phone normalization';
  RAISE NOTICE '  - find_duplicate_contacts() - Duplicate detection';
  RAISE NOTICE '  - merge_contacts() - Merge workflow';
  RAISE NOTICE '  - unmerge_contact() - Recovery';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ HARDENING PHASE 5 COMPLETE: Data quality & deduplication';
  RAISE NOTICE '   - Added primary_email_norm, primary_phone_e164 columns';
  RAISE NOTICE '   - Created unique indexes (per tenant)';
  RAISE NOTICE '   - Auto-normalization trigger on INSERT/UPDATE';
  RAISE NOTICE '   - Backfilled existing contacts';
  RAISE NOTICE '   - find_duplicate_contacts() - Detection';
  RAISE NOTICE '   - merge_contacts() - Merge workflow with audit';
  RAISE NOTICE '   - unmerge_contact() - Recovery';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SECURITY: Duplicate contacts blocked at DB level';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  APPLICATION CHANGES NEEDED:';
  RAISE NOTICE '   1. On contact create/update: Check find_duplicate_contacts()';
  RAISE NOTICE '   2. If duplicates found: Show merge UI (409 Conflict)';
  RAISE NOTICE '   3. Catch unique constraint violation → suggest merge';
  RAISE NOTICE '   4. Implement merge UI calling merge_contacts()';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NOTE: Phone normalization is basic. Consider libphonenumber for production.';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Next: Run Phase 6 migrations (Automations hardening)';
END $$;

