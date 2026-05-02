-- ============================================================================
-- ROLLBACK: Step 8 - Cutover & Legacy Cleanup
-- ============================================================================
--
-- This rollback script undoes the cutover if needed.
-- WARNING: This should only be used in emergency situations.
--
-- ============================================================================

-- Log rollback start
INSERT INTO cutover_log (step, status, message)
VALUES ('cutover_rollback', 'in_progress', 'Rolling back cutover to multi-tenancy');

-- ============================================================================
-- 1. Re-enable Legacy Mode
-- ============================================================================

UPDATE feature_flags
SET enabled
WHERE key = 'use_legacy_membership';

UPDATE feature_flags
SET NOT enabled
WHERE key = 'cutover_ready';

RAISE NOTICE '✅ Legacy mode re-enabled';

-- ============================================================================
-- 2. Remove Cutover Marker
-- ============================================================================

DELETE FROM system_state WHERE key = 'multi_tenancy_cutover';

RAISE NOTICE '✅ Cutover marker removed';

-- ============================================================================
-- 3. Drop Cutover-Specific Objects
-- ============================================================================

DROP FUNCTION IF EXISTS verify_cutover_readiness();
DROP FUNCTION IF EXISTS schedule_cutover_verification();
DROP FUNCTION IF EXISTS log_deprecation_warning(TEXT, TEXT);

RAISE NOTICE '✅ Cutover functions dropped';

-- ============================================================================
-- 4. Update Cutover Log
-- ============================================================================

UPDATE cutover_log 
SET 
    status = 'completed',
    completed_at = NOW(),
    message = 'Cutover rolled back. System reverted to legacy mode.'
WHERE step = 'cutover_rollback';

-- ============================================================================
-- Final Message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║                                                            ║';
    RAISE NOTICE '║            CUTOVER ROLLBACK COMPLETE                       ║';
    RAISE NOTICE '║                                                            ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  System has been rolled back to legacy mode';
    RAISE NOTICE '   - use_legacy_membership flag: ENABLED';
    RAISE NOTICE '   - cutover_ready flag: DISABLED';
    RAISE NOTICE '   - All data preserved';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Review cutover_log table for details';
    RAISE NOTICE '';
END $$;



