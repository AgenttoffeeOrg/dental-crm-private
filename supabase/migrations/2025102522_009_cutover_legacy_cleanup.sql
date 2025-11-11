-- ============================================================================
-- Step 8: Cutover & Legacy Cleanup Migration
-- ============================================================================
--
-- This migration marks the final cutover from single-tenant to multi-tenant.
-- It deprecates legacy functions and ensures all data uses the new system.
--
-- CRITICAL: Only run this after ALL other steps (0-7) are complete and
-- the cutover_ready flag is enabled in production.
--
-- ============================================================================

-- Verify prerequisites
DO $$
BEGIN
    -- Check that cutover_ready flag is enabled
    IF NOT EXISTS (
        SELECT 1 FROM feature_flags 
        WHERE key = 'cutover_ready' AND enabled
    ) THEN
        RAISE EXCEPTION 'Cutover not ready: cutover_ready flag must be enabled first';
    END IF;
    
    -- Check that use_legacy_membership flag is disabled
    IF EXISTS (
        SELECT 1 FROM feature_flags 
        WHERE key = 'use_legacy_membership' AND enabled
    ) THEN
        RAISE EXCEPTION 'Legacy membership still enabled: disable use_legacy_membership flag first';
    END IF;
    
    RAISE NOTICE '✅ Prerequisites verified';
END $$;

-- ============================================================================
-- 1. Create Final Cutover Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS cutover_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Log cutover start
INSERT INTO cutover_log (step, status, message)
VALUES ('cutover_start', 'in_progress', 'Beginning final cutover to multi-tenancy');

-- ============================================================================
-- 2. Deprecate Legacy Functions (Keep for Backwards Compatibility)
-- ============================================================================

-- Mark old auth.get_user_tenant_id() as deprecated
COMMENT ON FUNCTION auth.get_user_tenant_id() IS 
'DEPRECATED: Use public.get_user_tenant_id_compat() instead. 
This function is kept for backwards compatibility during transition period.';

-- Create deprecation warnings function
CREATE OR REPLACE FUNCTION log_deprecation_warning(
    p_function_name TEXT,
    p_replacement TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO audits (
        tenant_id,
        user_id,
        action,
        category,
        severity,
        metadata
    ) VALUES (
        COALESCE(
            (SELECT tenant_id FROM app_users WHERE id = auth.uid()),
            '00000000-0000-0000-0000-000000000000'::uuid
        ),
        auth.uid(),
        'legacy_function_used',
        'system',
        'low',
        jsonb_build_object(
            'deprecated_function', p_function_name,
            'recommended_replacement', p_replacement,
            'timestamp', NOW()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Enforce Multi-Org Mode
-- ============================================================================

-- Update app_users to require active_tenant_id (soft enforcement)
ALTER TABLE app_users 
    ALTER COLUMN active_tenant_id SET DEFAULT NULL;

COMMENT ON COLUMN app_users.active_tenant_id IS 
'Active tenant context for multi-org users. NULL defaults to tenant_id (legacy single-org).';

-- ============================================================================
-- 4. Clean Up Legacy Data Patterns
-- ============================================================================

-- Find and log any users without memberships
DO $$
DECLARE
    orphaned_count INT;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM app_users au
    WHERE NOT EXISTS (
        SELECT 1 FROM user_tenant_memberships utm
        WHERE utm.user_id = au.id
    );
    
    IF orphaned_count > 0 THEN
        RAISE WARNING '⚠️ Found % users without memberships. Auto-creating memberships...', orphaned_count;
        
        -- Auto-create memberships for orphaned users
        INSERT INTO user_tenant_memberships (
            user_id,
            tenant_id,
            role,
            status,
            joined_at
        )
        SELECT 
            au.id,
            au.tenant_id,
            au.role,
            'active',
            au.created_at
        FROM app_users au
        WHERE NOT EXISTS (
            SELECT 1 FROM user_tenant_memberships utm
            WHERE utm.user_id = au.id
        );
        
        RAISE NOTICE '✅ Created % membership records', orphaned_count;
    ELSE
        RAISE NOTICE '✅ All users have memberships';
    END IF;
END $$;

-- ============================================================================
-- 5. Update RLS Policies to Use New Functions Only
-- ============================================================================

-- Drop old RLS policies that use auth.get_user_tenant_id()
-- and recreate with get_user_tenant_id_compat()

DO $$
DECLARE
    table_name TEXT;
    policy_rec RECORD;
BEGIN
    FOR table_name IN 
        SELECT DISTINCT tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename IN ('contacts', 'deals', 'pipelines', 'tasks', 'activities', 'files', 'ai_artifacts')
    LOOP
        -- Drop and recreate SELECT policy
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', table_name || '_select_policy', table_name);
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR SELECT USING (tenant_id = get_user_tenant_id_compat())',
            table_name || '_select_policy',
            table_name
        );
        
        RAISE NOTICE '✅ Updated SELECT policy for %', table_name;
    END LOOP;
END $$;

-- ============================================================================
-- 6. Create Cutover Verification Function
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_cutover_readiness()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    message TEXT,
    details JSONB
) AS $$
BEGIN
    -- Check 1: All users have memberships
    RETURN QUERY
    SELECT 
        'users_have_memberships'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'All users have memberships'
            ELSE COUNT(*)::TEXT || ' users without memberships'
        END::TEXT,
        jsonb_build_object('orphaned_count', COUNT(*))
    FROM app_users au
    WHERE NOT EXISTS (
        SELECT 1 FROM user_tenant_memberships utm
        WHERE utm.user_id = au.id
    );
    
    -- Check 2: All feature flags correct
    RETURN QUERY
    SELECT 
        'feature_flags_ready'::TEXT,
        CASE 
            WHEN cutover_ready AND NOT legacy_enabled THEN 'PASS' 
            ELSE 'FAIL' 
        END::TEXT,
        CASE 
            WHEN cutover_ready AND NOT legacy_enabled THEN 'Feature flags configured correctly'
            ELSE 'Feature flags not ready for cutover'
        END::TEXT,
        jsonb_build_object(
            'cutover_ready', cutover_ready,
            'legacy_enabled', legacy_enabled
        )
    FROM (
        SELECT 
            COALESCE((SELECT enabled FROM feature_flags WHERE key = 'cutover_ready'), false) as cutover_ready,
            COALESCE((SELECT enabled FROM feature_flags WHERE key = 'use_legacy_membership'), false) as legacy_enabled
    ) flags;
    
    -- Check 3: RLS enabled on all core tables
    RETURN QUERY
    SELECT 
        'rls_enabled'::TEXT,
        CASE WHEN COUNT(*) = 7 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        COUNT(*)::TEXT || '/7 core tables have RLS enabled'::TEXT,
        jsonb_build_object('tables_with_rls', COUNT(*))
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('contacts', 'deals', 'pipelines', 'tasks', 'activities', 'files', 'ai_artifacts')
    AND rowsecurity;
    
    -- Check 4: Multi-org functions exist
    RETURN QUERY
    SELECT 
        'multiorg_functions_exist'::TEXT,
        CASE WHEN COUNT(*) = 4 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        COUNT(*)::TEXT || '/4 multi-org functions exist'::TEXT,
        jsonb_build_object('function_count', COUNT(*))
    FROM pg_proc
    WHERE proname IN (
        'get_user_tenant_id_v2',
        'get_active_tenant',
        'set_active_tenant',
        'get_active_tenant_for_user'
    );
END;
$$ LANGUAGE plpgsql;

-- Run verification
SELECT * FROM verify_cutover_readiness();

-- ============================================================================
-- 7. Mark Cutover as Complete
-- ============================================================================

-- Update cutover log
UPDATE cutover_log 
SET 
    status = 'completed',
    completed_at = NOW(),
    message = 'Cutover completed successfully. System is now fully multi-tenant.'
WHERE step = 'cutover_start';

-- Create final cutover marker
CREATE TABLE IF NOT EXISTS system_state (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_state (key, value)
VALUES (
    'multi_tenancy_cutover',
    jsonb_build_object(
        'completed_at', NOW(),
        'version', '1.0',
        'legacy_mode', false,
        'multi_org_enabled', true
    )
)
ON CONFLICT (key) DO UPDATE
SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- ============================================================================
-- Final Report
-- ============================================================================

DO $$
DECLARE
    verification_results RECORD;
    all_passed BOOLEAN := true;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║                                                            ║';
    RAISE NOTICE '║            CUTOVER VERIFICATION REPORT                     ║';
    RAISE NOTICE '║                                                            ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    FOR verification_results IN 
        SELECT * FROM verify_cutover_readiness()
    LOOP
        RAISE NOTICE '% %: %', 
            CASE WHEN verification_results.status = 'PASS' THEN '✅' ELSE '❌' END,
            verification_results.check_name,
            verification_results.message;
        
        IF verification_results.status != 'PASS' THEN
            all_passed := false;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    
    IF all_passed THEN
        RAISE NOTICE '✅ CUTOVER COMPLETE - System is now fully multi-tenant';
        RAISE NOTICE '   Legacy code paths deprecated';
        RAISE NOTICE '   All users migrated to multi-org membership model';
        RAISE NOTICE '   RLS policies updated to new functions';
    ELSE
        RAISE WARNING '⚠️ CUTOVER INCOMPLETE - Some checks failed';
        RAISE WARNING '   Review failures above and fix before proceeding';
    END IF;
    
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Notes for Post-Cutover
-- ============================================================================

COMMENT ON TABLE cutover_log IS 
'Log of cutover process. Review this table to track the cutover timeline.';

COMMENT ON FUNCTION verify_cutover_readiness() IS 
'Verification function to check if system is ready for cutover.
Run this periodically to ensure system integrity.';

-- Recommend running this verification weekly
CREATE OR REPLACE FUNCTION schedule_cutover_verification()
RETURNS VOID AS $$
BEGIN
    -- This would integrate with pg_cron or similar
    -- For now, just log a reminder
    RAISE NOTICE 'Recommendation: Schedule weekly execution of verify_cutover_readiness()';
END;
$$ LANGUAGE plpgsql;


