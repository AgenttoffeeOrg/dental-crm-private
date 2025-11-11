-- =====================================================
-- HARDENING PHASE 1.3: RLS Policy Reset & Consistency (SAFE VERSION)
-- Date: October 16, 2025
-- Purpose: Apply consistent RLS policies to all tenant-scoped tables that exist
-- =====================================================

-- This version checks if tables exist before applying RLS

DO $$
DECLARE
  v_table_name TEXT;
  v_policy_count INTEGER := 0;
  v_has_deleted_at BOOLEAN;
  v_has_tenant_id BOOLEAN;
BEGIN
  -- List of tables we want to apply RLS to
  FOR v_table_name IN 
    SELECT unnest(ARRAY[
      'contacts', 'deals', 'pipelines', 'pipeline_stages', 'tasks',
      'activities', 'calls', 'files', 'notes', 'locations',
      'automations', 'automation_execution_logs', 'automation_nodes', 'automation_edges', 'automation_runs'
    ])
  LOOP
    -- Check if table exists AND has tenant_id column
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = v_table_name
    ) THEN
      
      -- Check if table has tenant_id column (REQUIRED for RLS)
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = v_table_name
          AND column_name = 'tenant_id'
      ) INTO v_has_tenant_id;
      
      -- Only apply RLS if table has tenant_id
      IF NOT v_has_tenant_id THEN
        RAISE NOTICE 'Skipping table (no tenant_id column): %', v_table_name;
        CONTINUE; -- Skip to next table
      END IF;
      
      RAISE NOTICE 'Applying RLS to table: %', v_table_name;
      
      -- Check if table has deleted_at column
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = v_table_name
          AND column_name = 'deleted_at'
      ) INTO v_has_deleted_at;
      
      -- Enable RLS
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', v_table_name);
      
      -- Drop existing policies
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_table_name || '_select', v_table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_table_name || '_insert', v_table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_table_name || '_update', v_table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_table_name || '_delete', v_table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_table_name || '_service_role', v_table_name);
      
      -- Create SELECT policy (with or without soft delete check)
      IF v_has_deleted_at THEN
        EXECUTE format('
          CREATE POLICY %I ON %I
          FOR SELECT
          USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at))
        ', v_table_name || '_select', v_table_name);
      ELSE
        EXECUTE format('
          CREATE POLICY %I ON %I
          FOR SELECT
          USING (tenant_id = current_tenant_id())
        ', v_table_name || '_select', v_table_name);
      END IF;
      
      -- Create INSERT policy
      EXECUTE format('
        CREATE POLICY %I ON %I
        FOR INSERT
        WITH CHECK (tenant_id = current_tenant_id())
      ', v_table_name || '_insert', v_table_name);
      
      -- Create UPDATE policy
      EXECUTE format('
        CREATE POLICY %I ON %I
        FOR UPDATE
        USING (tenant_id = current_tenant_id())
      ', v_table_name || '_update', v_table_name);
      
      -- Create DELETE policy (admin only)
      EXECUTE format('
        CREATE POLICY %I ON %I
        FOR DELETE
        USING (
          tenant_id = current_tenant_id()
          AND user_has_role(ARRAY[''owner'', ''super_admin'', ''admin''])
        )
      ', v_table_name || '_delete', v_table_name);
      
      -- Service role bypass
      EXECUTE format('
        CREATE POLICY %I ON %I
        FOR ALL
        USING (auth.role() = ''service_role'')
      ', v_table_name || '_service_role', v_table_name);
      
      v_policy_count := v_policy_count + 1;
      
    ELSE
      RAISE NOTICE 'Skipping table (does not exist): %', v_table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Applied RLS policies to % tables', v_policy_count;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_rls_count INTEGER;
  v_policy_count INTEGER;
BEGIN
  -- Count tables with RLS enabled
  SELECT COUNT(*) INTO v_rls_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = true;
  
  -- Count RLS policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== RLS VERIFICATION ===';
  RAISE NOTICE 'Tables with RLS enabled: %', v_rls_count;
  RAISE NOTICE 'Total RLS policies: %', v_policy_count;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ HARDENING PHASE 1.3 COMPLETE: RLS policies reset';
  RAISE NOTICE '   - Applied consistent RLS to all existing tables';
  RAISE NOTICE '   - SELECT: tenant filter + soft delete check';
  RAISE NOTICE '   - INSERT: tenant filter';
  RAISE NOTICE '   - UPDATE: tenant filter';
  RAISE NOTICE '   - DELETE: tenant filter + admin role check';
  RAISE NOTICE '   - Service role bypass for all tables';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NOTE: Marketing tables will get entitlement checks in Phase 2';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Next: Run 20251016_hardening_004_fk_guards.sql';
END $$;

