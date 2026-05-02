SET search_path TO public, extensions;

-- =====================================================
-- PHASE 4: DATA MIGRATION & RECONCILIATION
-- Fix misplaced data, reconcile cross-org records
-- =====================================================
-- Date: October 16, 2025
-- Priority: P0 - CRITICAL DATA FIX
--
-- This migration:
-- 1. Finds data in hardcoded tenant (550e8400...)
-- 2. Migrates to correct user's tenant
-- 3. Fixes broken contact→deal relationships
-- 4. Generates reconciliation report
-- 5. Quarantines unfixable records
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE RECONCILIATION TABLES
-- =====================================================

-- Track what we're fixing
DROP TABLE IF EXISTS data_reconciliation_log CASCADE;
CREATE TABLE data_reconciliation_log (
  id BIGSERIAL PRIMARY KEY,
  migration_batch TEXT DEFAULT 'phase_4_' || to_char(NOW(), 'YYYYMMDD_HH24MISS'),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('migrated', 'fixed_fk', 'quarantined', 'deleted', 'no_action')),
  from_tenant_id UUID,
  to_tenant_id UUID,
  issue_description TEXT,
  record_snapshot JSONB,
  fixed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_batch ON data_reconciliation_log(migration_batch);
CREATE INDEX IF NOT EXISTS idx_reconciliation_table ON data_reconciliation_log(table_name, action);

-- Quarantine for records we can't auto-fix
DROP TABLE IF EXISTS data_quarantine CASCADE;
CREATE TABLE data_quarantine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  issue TEXT NOT NULL,
  record_data JSONB NOT NULL,
  suggested_tenant_id UUID REFERENCES tenants(id),
  suggested_fix TEXT,
  requires_manual_review BOOLEAN DEFAULT true,
  reviewed_by UUID REFERENCES app_users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(table_name, record_id)
);

CREATE INDEX IF NOT EXISTS idx_quarantine_needs_review ON data_quarantine(created_at) WHERE requires_manual_review = true;

-- =====================================================
-- 2. AUDIT CURRENT STATE
-- =====================================================

-- Log current data distribution
DO $$
DECLARE
  hardcoded_tenant_id UUID := '550e8400-e29b-41d4-a716-446655440000';
  deals_in_hardcoded INTEGER;
  contacts_in_hardcoded INTEGER;
  tasks_in_hardcoded INTEGER;
  pipelines_in_hardcoded INTEGER;
BEGIN
  SELECT COUNT(*) INTO deals_in_hardcoded FROM deals WHERE tenant_id = hardcoded_tenant_id;
  SELECT COUNT(*) INTO contacts_in_hardcoded FROM contacts WHERE tenant_id = hardcoded_tenant_id;
  SELECT COUNT(*) INTO tasks_in_hardcoded FROM tasks WHERE tenant_id = hardcoded_tenant_id;
  SELECT COUNT(*) INTO pipelines_in_hardcoded FROM pipelines WHERE tenant_id = hardcoded_tenant_id;
  
  RAISE NOTICE '=== PRE-MIGRATION AUDIT ===';
  RAISE NOTICE 'Deals in hardcoded tenant: %', deals_in_hardcoded;
  RAISE NOTICE 'Contacts in hardcoded tenant: %', contacts_in_hardcoded;
  RAISE NOTICE 'Tasks in hardcoded tenant: %', tasks_in_hardcoded;
  RAISE NOTICE 'Pipelines in hardcoded tenant: %', pipelines_in_hardcoded;
END $$;

-- =====================================================
-- 3. MIGRATE DEALS TO CORRECT TENANT (Based on Owner)
-- =====================================================

-- Step 1: Migrate deals that have owner_user_id set
WITH migrated_deals AS (
  UPDATE deals d
  SET tenant_id = (
    SELECT au.tenant_id 
    FROM app_users au 
    WHERE au.id = d.owner_user_id
  )
  WHERE d.tenant_id = '550e8400-e29b-41d4-a716-446655440000'
    AND d.owner_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.id = d.owner_user_id 
      AND au.tenant_id != '550e8400-e29b-41d4-a716-446655440000'
    )
  RETURNING id, tenant_id, owner_user_id, title
)
INSERT INTO data_reconciliation_log (table_name, record_id, action, from_tenant_id, to_tenant_id, issue_description, record_snapshot)
SELECT 
  'deals',
  md.id,
  'migrated',
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  md.tenant_id,
  'Migrated to owner''s correct tenant',
  row_to_json(md)::JSONB
FROM migrated_deals md;

-- =====================================================
-- 4. FIX DEAL-CONTACT RELATIONSHIPS
-- =====================================================

-- Step 2: Fix deals where contact is in different org
-- Try to find matching contact in correct org by name/email
WITH fixed_contacts AS (
  UPDATE deals d
  SET contact_id = (
    -- Find contact in same org with matching name
    SELECT c.id 
    FROM contacts c
    WHERE c.tenant_id = d.tenant_id
      AND (
        c.full_name ILIKE (SELECT full_name FROM contacts WHERE id = d.contact_id)
        OR c.primary_email = (SELECT primary_email FROM contacts WHERE id = d.contact_id)
      )
    LIMIT 1
  )
  WHERE d.contact_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = d.contact_id AND c.tenant_id = d.tenant_id
    )
    AND EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.tenant_id = d.tenant_id
        AND (
          c.full_name ILIKE (SELECT full_name FROM contacts WHERE id = d.contact_id)
          OR c.primary_email = (SELECT primary_email FROM contacts WHERE id = d.contact_id)
        )
    )
  RETURNING id, contact_id, tenant_id
)
INSERT INTO data_reconciliation_log (table_name, record_id, action, to_tenant_id, issue_description)
SELECT 
  'deals',
  fc.id,
  'fixed_fk',
  fc.tenant_id,
  'Fixed contact_id to match contact in same org'
FROM fixed_contacts fc;

-- Step 3: Deals with contact in different org but no match - NULL the FK
WITH nulled_contacts AS (
  UPDATE deals d
  SET contact_id = NULL
  WHERE d.contact_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = d.contact_id AND c.tenant_id = d.tenant_id
    )
  RETURNING id, tenant_id
)
INSERT INTO data_reconciliation_log (table_name, record_id, action, to_tenant_id, issue_description)
SELECT 
  'deals',
  nc.id,
  'fixed_fk',
  nc.tenant_id,
  'Nulled contact_id (contact in different org, no match found)'
FROM nulled_contacts nc;

-- =====================================================
-- 5. MIGRATE CONTACTS TO CORRECT TENANT
-- =====================================================

-- Migrate contacts that have owner_user_id
WITH migrated_contacts AS (
  UPDATE contacts c
  SET tenant_id = (
    SELECT au.tenant_id 
    FROM app_users au 
    WHERE au.id = c.owner_user_id
  )
  WHERE c.tenant_id = '550e8400-e29b-41d4-a716-446655440000'
    AND c.owner_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.id = c.owner_user_id 
      AND au.tenant_id != '550e8400-e29b-41d4-a716-446655440000'
    )
  RETURNING id, tenant_id, owner_user_id, full_name
)
INSERT INTO data_reconciliation_log (table_name, record_id, action, from_tenant_id, to_tenant_id, issue_description, record_snapshot)
SELECT 
  'contacts',
  mc.id,
  'migrated',
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  mc.tenant_id,
  'Migrated to owner''s correct tenant',
  row_to_json(mc)::JSONB
FROM migrated_contacts mc;

-- =====================================================
-- 6. MIGRATE TASKS TO CORRECT TENANT
-- =====================================================

-- Migrate tasks based on associated deal or contact
WITH migrated_tasks AS (
  UPDATE tasks t
  SET tenant_id = COALESCE(
    (SELECT tenant_id FROM deals WHERE id = t.deal_id LIMIT 1),
    (SELECT tenant_id FROM contacts WHERE id = t.contact_id LIMIT 1),
    (SELECT tenant_id FROM app_users WHERE id = t.owner_user_id LIMIT 1)
  )
  WHERE t.tenant_id = '550e8400-e29b-41d4-a716-446655440000'
    AND (
      t.deal_id IS NOT NULL OR 
      t.contact_id IS NOT NULL OR 
      t.owner_user_id IS NOT NULL
    )
  RETURNING id, tenant_id, deal_id, contact_id
)
INSERT INTO data_reconciliation_log (table_name, record_id, action, from_tenant_id, to_tenant_id, issue_description, record_snapshot)
SELECT 
  'tasks',
  mt.id,
  'migrated',
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  mt.tenant_id,
  'Migrated to related record''s tenant',
  row_to_json(mt)::JSONB
FROM migrated_tasks mt;

-- =====================================================
-- 7. QUARANTINE UNFIXABLE RECORDS
-- =====================================================

-- Deals with no owner and no contact (cannot determine correct tenant)
INSERT INTO data_quarantine (table_name, record_id, issue, record_data, suggested_fix)
SELECT 
  'deals',
  d.id,
  'Cannot determine correct tenant - no owner and no contact',
  row_to_json(d)::JSONB,
  'Manually assign to correct tenant based on creation date or delete if test data'
FROM deals d
WHERE d.tenant_id = '550e8400-e29b-41d4-a716-446655440000'
  AND d.owner_user_id IS NULL
  AND d.contact_id IS NULL
ON CONFLICT (table_name, record_id) DO NOTHING;

-- Contacts with no owner (cannot determine correct tenant)
INSERT INTO data_quarantine (table_name, record_id, issue, record_data, suggested_fix)
SELECT 
  'contacts',
  c.id,
  'Cannot determine correct tenant - no owner',
  row_to_json(c)::JSONB,
  'Manually assign to correct tenant or delete if test data'
FROM contacts c
WHERE c.tenant_id = '550e8400-e29b-41d4-a716-446655440000'
  AND c.owner_user_id IS NULL
ON CONFLICT (table_name, record_id) DO NOTHING;

-- Tasks with no deal, contact, or owner
INSERT INTO data_quarantine (table_name, record_id, issue, record_data, suggested_fix)
SELECT 
  'tasks',
  t.id,
  'Cannot determine correct tenant - orphaned task',
  row_to_json(t)::JSONB,
  'Manually assign to correct tenant or delete if test data'
FROM tasks t
WHERE t.tenant_id = '550e8400-e29b-41d4-a716-446655440000'
  AND t.deal_id IS NULL
  AND t.contact_id IS NULL
  AND t.owner_user_id IS NULL
ON CONFLICT (table_name, record_id) DO NOTHING;

-- =====================================================
-- 8. GENERATE RECONCILIATION REPORT
-- =====================================================

-- Summary of actions taken
DO $$
DECLARE
  migrated_deals INTEGER;
  migrated_contacts INTEGER;
  migrated_tasks INTEGER;
  fixed_fks INTEGER;
  quarantined_records INTEGER;
  remaining_hardcoded_deals INTEGER;
  remaining_hardcoded_contacts INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_deals FROM data_reconciliation_log WHERE table_name = 'deals' AND action = 'migrated';
  SELECT COUNT(*) INTO migrated_contacts FROM data_reconciliation_log WHERE table_name = 'contacts' AND action = 'migrated';
  SELECT COUNT(*) INTO migrated_tasks FROM data_reconciliation_log WHERE table_name = 'tasks' AND action = 'migrated';
  SELECT COUNT(*) INTO fixed_fks FROM data_reconciliation_log WHERE action = 'fixed_fk';
  SELECT COUNT(*) INTO quarantined_records FROM data_quarantine;
  SELECT COUNT(*) INTO remaining_hardcoded_deals FROM deals WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';
  SELECT COUNT(*) INTO remaining_hardcoded_contacts FROM contacts WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';
  
  RAISE NOTICE '=== MIGRATION RECONCILIATION REPORT ===';
  RAISE NOTICE 'Deals migrated to correct tenant: %', migrated_deals;
  RAISE NOTICE 'Contacts migrated to correct tenant: %', migrated_contacts;
  RAISE NOTICE 'Tasks migrated to correct tenant: %', migrated_tasks;
  RAISE NOTICE 'Foreign keys fixed: %', fixed_fks;
  RAISE NOTICE 'Records quarantined for manual review: %', quarantined_records;
  RAISE NOTICE '---';
  RAISE NOTICE 'Remaining deals in hardcoded tenant: %', remaining_hardcoded_deals;
  RAISE NOTICE 'Remaining contacts in hardcoded tenant: %', remaining_hardcoded_contacts;
  RAISE NOTICE '======================================';
  
  IF remaining_hardcoded_deals > 0 OR remaining_hardcoded_contacts > 0 THEN
    RAISE NOTICE 'WARNING: Some records still in hardcoded tenant. Review data_quarantine table.';
  ELSE
    RAISE NOTICE 'SUCCESS: All records migrated out of hardcoded tenant!';
  END IF;
END $$;

-- =====================================================
-- 9. FIX SPECIFIC USER: deepakshegde@gmail.com
-- =====================================================

-- Find user's tenant_id
DO $$
DECLARE
  user_tenant_id UUID;
  user_id UUID;
  deals_migrated INTEGER;
  contacts_migrated INTEGER;
BEGIN
  -- Find user
  SELECT au.id, au.tenant_id INTO user_id, user_tenant_id
  FROM app_users au
  JOIN auth.users u ON au.id = u.id
  WHERE u.email = 'deepakshegde@gmail.com'
  LIMIT 1;
  
  IF user_id IS NULL THEN
    RAISE NOTICE 'User deepakshegde@gmail.com not found - skipping user-specific migration';
  ELSE
    RAISE NOTICE '=== FIXING USER: deepakshegde@gmail.com ===';
    RAISE NOTICE 'User ID: %', user_id;
    RAISE NOTICE 'Correct Tenant ID: %', user_tenant_id;
    
    -- Migrate deals owned by this user to their correct tenant
    WITH user_deals AS (
      UPDATE deals
      SET tenant_id = user_tenant_id
      WHERE owner_user_id = user_id
        AND tenant_id != user_tenant_id
      RETURNING id
    )
    SELECT COUNT(*) INTO deals_migrated FROM user_deals;
    
    -- Migrate contacts owned by this user to their correct tenant
    WITH user_contacts AS (
      UPDATE contacts
      SET tenant_id = user_tenant_id
      WHERE owner_user_id = user_id
        AND tenant_id != user_tenant_id
      RETURNING id
    )
    SELECT COUNT(*) INTO contacts_migrated FROM user_contacts;
    
    RAISE NOTICE 'Migrated % deals to user''s correct tenant', deals_migrated;
    RAISE NOTICE 'Migrated % contacts to user''s correct tenant', contacts_migrated;
    RAISE NOTICE '======================================';
  END IF;
END $$;

-- =====================================================
-- 10. VERIFY DATA INTEGRITY POST-MIGRATION
-- =====================================================

-- Check for cross-org deal-contact relationships
DO $$
DECLARE
  cross_org_deals INTEGER;
  orphaned_deals INTEGER;
BEGIN
  SELECT COUNT(*) INTO cross_org_deals
  FROM deals d
  JOIN contacts c ON d.contact_id = c.id
  WHERE d.tenant_id != c.tenant_id;
  
  SELECT COUNT(*) INTO orphaned_deals
  FROM deals d
  WHERE d.contact_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM contacts WHERE id = d.contact_id);
  
  RAISE NOTICE '=== POST-MIGRATION VERIFICATION ===';
  RAISE NOTICE 'Cross-org deal-contact pairs: % (should be 0)', cross_org_deals;
  RAISE NOTICE 'Orphaned deals (contact_id points to non-existent): % (should be 0)', orphaned_deals;
  
  IF cross_org_deals > 0 THEN
    RAISE WARNING 'Found % cross-org deal-contact relationships! Investigate data_reconciliation_log.', cross_org_deals;
  END IF;
  
  IF orphaned_deals > 0 THEN
    RAISE WARNING 'Found % orphaned deals! Run additional cleanup.', orphaned_deals;
  END IF;
END $$;

-- =====================================================
-- COMMIT & REPORT
-- =====================================================

COMMIT;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '✅ Phase 4 Migration Complete!';
  RAISE NOTICE 'Review data_reconciliation_log for details';
  RAISE NOTICE 'Review data_quarantine for records needing manual review';
END $$;

