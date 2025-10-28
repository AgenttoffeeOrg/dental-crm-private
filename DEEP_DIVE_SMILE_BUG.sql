-- =====================================================
-- DEEP DIVE: Check if "Smile" was created BEFORE the fix
-- =====================================================

-- 1. When was Smile created vs when was the migration applied?
SELECT 
  '1. SMILE CREATION TIMING' AS check_name,
  t.name,
  t.created_at AS smile_created,
  (SELECT created_at FROM user_tenant_memberships 
   WHERE tenant_id = t.id 
   AND user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
  ) AS membership_created
FROM tenants t
WHERE t.name = 'Smile';

-- 2. Check RAW membership record (see EXACTLY what's in the database)
SELECT 
  '2. RAW MEMBERSHIP DATA' AS check_name,
  utm.id AS membership_id,
  utm.user_id,
  utm.tenant_id,
  utm.role,
  utm.status,
  utm.all_locations,  -- THIS is the critical field
  utm.created_at,
  utm.updated_at
FROM user_tenant_memberships utm
WHERE utm.user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
  AND utm.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile');

-- 3. Check if UPDATE would actually change anything
SELECT 
  '3. WHAT WOULD UPDATE DO?' AS check_name,
  COUNT(*) AS records_that_would_be_updated
FROM user_tenant_memberships utm
WHERE utm.user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
  AND utm.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')
  AND utm.all_locations = FALSE;  -- Only FALSE records would be updated

-- =====================================================
-- NUCLEAR OPTION: FORCE UPDATE (uncomment to run)
-- =====================================================
-- DO $$
-- DECLARE
--   v_updated_count INTEGER;
-- BEGIN
--   UPDATE user_tenant_memberships
--   SET all_locations = TRUE,
--       updated_at = NOW()
--   WHERE user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
--     AND tenant_id = (SELECT id FROM tenants WHERE name = 'Smile');
--   
--   GET DIAGNOSTICS v_updated_count = ROW_COUNT;
--   
--   RAISE NOTICE '🔥 FORCED UPDATE: % row(s) updated', v_updated_count;
--   
--   IF v_updated_count = 0 THEN
--     RAISE NOTICE '⚠️ NO ROWS WERE UPDATED! This means:';
--     RAISE NOTICE '   - Either the WHERE clause didn''t match any rows';
--     RAISE NOTICE '   - OR all_locations was already TRUE';
--   ELSE
--     RAISE NOTICE '✅ Successfully set all_locations = TRUE for Deepak in Smile';
--   END IF;
-- END $$;

-- SELECT 'RUN THE VERIFICATION QUERY BELOW TO CONFIRM' AS next_step;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================
SELECT 
  '4. FINAL CHECK' AS check_name,
  utm.all_locations AS current_value,
  CASE 
    WHEN utm.all_locations = TRUE THEN '✅ all_locations is TRUE'
    ELSE '🚨 all_locations is STILL FALSE - there may be a database issue!'
  END AS status,
  public.user_has_location_access_rls(
    utm.user_id,
    utm.tenant_id,
    (SELECT id FROM locations WHERE tenant_id = utm.tenant_id LIMIT 1)
  ) AS rls_grants_access
FROM user_tenant_memberships utm
WHERE utm.user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
  AND utm.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile');

