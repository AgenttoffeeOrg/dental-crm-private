-- =====================================================
-- HARDENING PHASE 1.2: Soft Delete & Updated At
-- Date: October 16, 2025
-- Purpose: Add deleted_at columns and updated_at triggers to all entity tables
-- =====================================================

-- =====================================================
-- 1. ADD deleted_at COLUMNS
-- =====================================================

-- Core CRM tables (only if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deals') THEN
    ALTER TABLE deals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pipelines') THEN
    ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pipeline_stages') THEN
    ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
    ALTER TABLE activities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calls') THEN
    ALTER TABLE calls ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'files') THEN
    ALTER TABLE files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;

  -- Marketing tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_campaigns') THEN
    ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_templates') THEN
    ALTER TABLE marketing_templates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_segments') THEN
    ALTER TABLE marketing_segments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_journeys') THEN
    ALTER TABLE marketing_journeys ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_forms') THEN
    ALTER TABLE marketing_forms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;

  -- Automation tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automations') THEN
    ALTER TABLE automations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Integration tables (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integration_connections') THEN
    ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Notification tables (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Location tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'locations') THEN
    ALTER TABLE locations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Custom fields, tags, etc.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_fields') THEN
    ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_sources') THEN
    ALTER TABLE lead_sources ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  
  RAISE NOTICE '✅ Added deleted_at columns to entity tables';
END $$;

-- =====================================================
-- 2. ADD INDEXES FOR SOFT DELETE QUERIES
-- =====================================================

-- Performance: Index for "not deleted" queries (most common case)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
    CREATE INDEX IF NOT EXISTS idx_contacts_not_deleted ON contacts(tenant_id, deleted_at) WHERE deleted_at IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deals') THEN
    CREATE INDEX IF NOT EXISTS idx_deals_not_deleted ON deals(tenant_id, deleted_at) WHERE deleted_at IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    CREATE INDEX IF NOT EXISTS idx_tasks_not_deleted ON tasks(tenant_id, deleted_at) WHERE deleted_at IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipelines') THEN
    CREATE INDEX IF NOT EXISTS idx_pipelines_not_deleted ON pipelines(tenant_id, deleted_at) WHERE deleted_at IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automations') THEN
    CREATE INDEX IF NOT EXISTS idx_automations_not_deleted ON automations(tenant_id, deleted_at) WHERE deleted_at IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaigns') THEN
    CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_not_deleted ON marketing_campaigns(tenant_id, deleted_at) WHERE deleted_at IS NULL;
  END IF;
  RAISE NOTICE '✅ Created partial indexes for soft delete queries';
END $$;

DO $$
BEGIN
  RAISE NOTICE '✅ Created partial indexes for soft delete queries';
END $$;

-- =====================================================
-- 3. ATTACH updated_at TRIGGERS
-- =====================================================

-- Automatically attach set_updated_at trigger to all tables that have updated_at column
DO $$
DECLARE
  r RECORD;
  v_trigger_name TEXT;
BEGIN
  FOR r IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t 
      ON t.table_name = c.table_name 
      AND t.table_schema = c.table_schema
    WHERE c.table_schema = 'public'
      AND c.column_name = 'updated_at'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name NOT LIKE 'pg_%'
      AND c.table_name NOT LIKE 'sql_%'
  LOOP
    v_trigger_name := r.table_name || '_set_updated_at';
    
    -- Drop existing trigger if it exists
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', v_trigger_name, r.table_name);
    
    -- Create trigger
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      v_trigger_name,
      r.table_name
    );
    
    RAISE NOTICE '  ✓ Attached updated_at trigger to %', r.table_name;
  END LOOP;
  
  RAISE NOTICE '✅ Attached updated_at triggers to all applicable tables';
END $$;

-- =====================================================
-- 4. ATTACH prevent_tenant_id_change TRIGGERS
-- =====================================================

-- Prevent tenant_id changes on all tenant-scoped tables
DO $$
DECLARE
  r RECORD;
  v_trigger_name TEXT;
BEGIN
  FOR r IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t 
      ON t.table_name = c.table_name 
      AND t.table_schema = c.table_schema
    WHERE c.table_schema = 'public'
      AND c.column_name = 'tenant_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name NOT LIKE 'pg_%'
      AND c.table_name NOT LIKE 'sql_%'
      AND c.table_name NOT IN ('tenants', 'audit_log') -- Exclude special tables
  LOOP
    v_trigger_name := r.table_name || '_prevent_tenant_change';
    
    -- Drop existing trigger if it exists
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', v_trigger_name, r.table_name);
    
    -- Create trigger
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION prevent_tenant_id_change()',
      v_trigger_name,
      r.table_name
    );
    
    RAISE NOTICE '  ✓ Attached prevent_tenant_change trigger to %', r.table_name;
  END LOOP;
  
  RAISE NOTICE '✅ Attached tenant_id protection triggers to all tenant-scoped tables';
END $$;

-- =====================================================
-- 5. CREATE SOFT DELETE VIEW (Optional Utility)
-- =====================================================

-- View to easily see all soft-deleted records across tables
CREATE OR REPLACE VIEW soft_deleted_records AS
SELECT 'contacts' as table_name, id, tenant_id, deleted_at, updated_at
FROM contacts WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'deals', id, tenant_id, deleted_at, updated_at
FROM deals WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'tasks', id, tenant_id, deleted_at, updated_at
FROM tasks WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'pipelines', id, tenant_id, deleted_at, updated_at
FROM pipelines WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'automations', id, tenant_id, deleted_at, updated_at
FROM automations WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'marketing_campaigns', id, tenant_id, deleted_at, updated_at
FROM marketing_campaigns WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;

COMMENT ON VIEW soft_deleted_records IS 
  'Utility view showing all soft-deleted records across entity tables. Useful for admin cleanup or recovery.';

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_deleted_count INTEGER;
  v_trigger_count INTEGER;
BEGIN
  -- Count tables with deleted_at column
  SELECT COUNT(DISTINCT table_name) INTO v_deleted_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'deleted_at';
  
  -- Count updated_at triggers
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
    AND action_statement LIKE '%set_updated_at%';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICATION ===';
  RAISE NOTICE 'Tables with deleted_at: %', v_deleted_count;
  RAISE NOTICE 'Tables with updated_at triggers: %', v_trigger_count;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ HARDENING PHASE 1.2 COMPLETE: Soft delete & triggers';
  RAISE NOTICE '   - Added deleted_at columns to all entity tables';
  RAISE NOTICE '   - Created partial indexes for query performance';
  RAISE NOTICE '   - Attached updated_at triggers automatically';
  RAISE NOTICE '   - Protected tenant_id from changes';
  RAISE NOTICE '   - Created soft_deleted_records view';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Update application code to:';
  RAISE NOTICE '   1. Filter WHERE deleted_at IS NULL in queries';
  RAISE NOTICE '   2. Use UPDATE SET deleted_at = NOW() instead of DELETE';
  RAISE NOTICE '   3. Implement "undelete" functionality if needed';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Next: Run 20251016_hardening_003_rls_reset.sql';
END $$;

