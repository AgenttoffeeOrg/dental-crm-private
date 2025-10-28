-- =====================================================
-- FIX: SET DEEPAK'S ACTIVE LOCATION TO MAIN BRANCH
-- =====================================================

UPDATE app_users
SET 
  active_location_id = '5cf3b7fa-6002-47db-8fe8-1fdc82bcbbc7'::UUID,  -- Smile Dental - Main Branch (is_primary = true)
  updated_at = NOW()
WHERE id = 'a0901598-6cc5-49bc-9234-db90b9af3444'::UUID;

-- Verify the fix
SELECT 
  '✅ VERIFICATION' AS status,
  id,
  email,
  active_tenant_id,
  active_location_id,
  (SELECT name FROM locations WHERE id = active_location_id) AS active_location_name
FROM app_users
WHERE id = 'a0901598-6cc5-49bc-9234-db90b9af3444'::UUID;

DO $$ BEGIN RAISE NOTICE '🎉 Active location set to Main Branch! Refresh your browser to see the Location Switcher!'; END $$;

