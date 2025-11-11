-- Phase 1: Disable auto-tenant creation trigger
-- This is safe to run and reversible

BEGIN;


-- Log current state
DO $$
DECLARE
    v_trigger_exists boolean;
    v_trigger_enabled boolean;
BEGIN
    -- Check if trigger exists
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_auto_create_tenant_for_new_user'
    ) INTO v_trigger_exists;
    
    -- Check if trigger is enabled
    SELECT tgenabled != 'D'
    FROM pg_trigger 
    WHERE tgname = 'trigger_auto_create_tenant_for_new_user'
    INTO v_trigger_enabled;
    
    IF NOT v_trigger_exists THEN
        RAISE NOTICE 'ℹ️ Trigger trigger_auto_create_tenant_for_new_user does not exist';
    ELSIF NOT v_trigger_enabled THEN
        RAISE NOTICE '✓ Trigger already disabled';
    ELSE
        RAISE NOTICE '🔧 Trigger exists and is enabled - will disable it';
    END IF;
END $$;


-- Disable the trigger (safe, reversible operation)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_auto_create_tenant_for_new_user'
        AND tgenabled != 'D'
    ) THEN
        ALTER TABLE app_users DISABLE TRIGGER trigger_auto_create_tenant_for_new_user;
        RAISE NOTICE '✅ Successfully disabled auto-tenant trigger';
    END IF;
END $$;


-- Verify the change
DO $$
DECLARE
    v_status text;
BEGIN
    SELECT 
        CASE tgenabled 
            WHEN 'D' THEN 'DISABLED ✅'
            WHEN 'O' THEN 'ENABLED ❌ - Something went wrong!'
            ELSE 'UNKNOWN STATE ⚠️'
        END
    FROM pg_trigger 
    WHERE tgname = 'trigger_auto_create_tenant_for_new_user'
    INTO v_status;
    
    IF v_status IS NOT NULL THEN
        RAISE NOTICE 'Final trigger status: %', v_status;
    END IF;
END $$;


COMMIT;


-- To rollback if needed:
-- ALTER TABLE app_users ENABLE TRIGGER trigger_auto_create_tenant_for_new_user;







