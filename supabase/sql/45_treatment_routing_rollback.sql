-- =====================================================
-- ROLLBACK SCRIPT FOR TREATMENT ROUTING SYSTEM
-- =====================================================
-- Version: 1.0.0
-- Date: October 19, 2025
-- Purpose: Safely rollback Phase 1 database migration
-- =====================================================
--
-- WARNING: This script will:
-- 1. Drop all 4 treatment routing tables
-- 2. Remove all helper functions
-- 3. Remove all triggers
-- 4. This is IRREVERSIBLE - all routing data will be lost
--
-- WHEN TO USE:
-- - If you need to completely remove the routing system
-- - If migration failed and needs to be re-run
-- - For testing/development rollback scenarios
--
-- SAFE TO RUN:
-- - Does NOT affect existing deals, contacts, pipelines
-- - Does NOT affect any core CRM functionality
-- - Only removes routing-specific tables and functions
--
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DROP TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS trigger_update_treatment_tag_stats ON deals;

-- =====================================================
-- 2. DROP FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS get_or_create_unsorted_pipeline(UUID);
DROP FUNCTION IF EXISTS update_treatment_tag_stats();
DROP FUNCTION IF EXISTS initialize_tenant_routing_settings(UUID);

-- =====================================================
-- 3. DROP TABLES (IN REVERSE ORDER OF DEPENDENCIES)
-- =====================================================

-- Drop tables with foreign keys first
DROP TABLE IF EXISTS treatment_routing_logs CASCADE;
DROP TABLE IF EXISTS treatment_tag_pipeline_mappings CASCADE;
DROP TABLE IF EXISTS tenant_routing_settings CASCADE;
DROP TABLE IF EXISTS treatment_tags CASCADE;

-- =====================================================
-- 4. CLEANUP EXTENSIONS (if solely used by routing system)
-- =====================================================

-- Note: pg_trgm extension may be used by other parts of the system
-- Only uncomment if you're certain it's not used elsewhere
-- DROP EXTENSION IF EXISTS pg_trgm;

COMMIT;

-- =====================================================
-- ROLLBACK SUCCESS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '✅ TREATMENT ROUTING SYSTEM - ROLLBACK COMPLETE';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  Removed:';
  RAISE NOTICE '  ✓ treatment_tags table';
  RAISE NOTICE '  ✓ treatment_tag_pipeline_mappings table';
  RAISE NOTICE '  ✓ treatment_routing_logs table';
  RAISE NOTICE '  ✓ tenant_routing_settings table';
  RAISE NOTICE '  ✓ 3 helper functions';
  RAISE NOTICE '  ✓ 1 trigger';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Core CRM functionality intact:';
  RAISE NOTICE '  ✓ Deals table untouched';
  RAISE NOTICE '  ✓ Pipelines table untouched';
  RAISE NOTICE '  ✓ Contacts table untouched';
  RAISE NOTICE '  ✓ All existing data preserved';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Data Loss:';
  RAISE NOTICE '  • All treatment tags deleted';
  RAISE NOTICE '  • All pipeline mappings deleted';
  RAISE NOTICE '  • All routing logs deleted';
  RAISE NOTICE '  • Routing settings deleted';
  RAISE NOTICE '';
  RAISE NOTICE 'System rolled back to pre-routing state.';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
END $$;

