-- =====================================================
-- CHECK DEALS DATA
-- =====================================================
-- This script checks if you have any deals in your database
-- and verifies their structure

-- 1. Check total number of deals
SELECT 
  'Total Deals' AS check_name,
  COUNT(*) AS count,
  COUNT(DISTINCT tenant_id) AS unique_tenants,
  COUNT(DISTINCT location_id) AS unique_locations
FROM deals;

-- 2. Check deals per tenant
SELECT 
  'Deals per Tenant' AS check_name,
  t.name AS tenant_name,
  COUNT(d.id) AS deal_count,
  COUNT(CASE WHEN d.location_id IS NULL THEN 1 END) AS deals_without_location
FROM tenants t
LEFT JOIN deals d ON t.id = d.tenant_id
GROUP BY t.id, t.name
ORDER BY deal_count DESC;

-- 3. Check if deals have required fields
SELECT 
  'Deals Data Quality' AS check_name,
  COUNT(*) AS total_deals,
  COUNT(CASE WHEN contact_id IS NULL THEN 1 END) AS missing_contact,
  COUNT(CASE WHEN pipeline_id IS NULL THEN 1 END) AS missing_pipeline,
  COUNT(CASE WHEN stage_id IS NULL THEN 1 END) AS missing_stage,
  COUNT(CASE WHEN location_id IS NULL THEN 1 END) AS missing_location,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) AS missing_tenant
FROM deals;

-- 4. Sample of recent deals
SELECT 
  'Recent Deals Sample' AS check_name,
  d.id,
  d.title,
  d.tenant_id,
  d.location_id,
  d.contact_id,
  d.pipeline_id,
  d.stage_id,
  d.created_at
FROM deals d
ORDER BY d.created_at DESC
LIMIT 5;

-- 5. Check your active tenant's deals
SELECT 
  'Your Active Tenant Deals' AS check_name,
  d.id,
  d.title,
  d.location_id,
  c.full_name AS contact_name,
  p.name AS pipeline_name,
  ps.name AS stage_name
FROM deals d
LEFT JOIN contacts c ON d.contact_id = c.id
LEFT JOIN pipelines p ON d.pipeline_id = p.id
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
WHERE d.tenant_id = (
  SELECT active_tenant_id 
  FROM app_users 
  WHERE id = auth.uid()
)
ORDER BY d.created_at DESC
LIMIT 10;

-- 6. Check RLS policy compliance
SELECT 
  'RLS Check' AS check_name,
  COUNT(*) AS deals_accessible_via_rls,
  (
    SELECT COUNT(*) 
    FROM deals 
    WHERE tenant_id = (SELECT active_tenant_id FROM app_users WHERE id = auth.uid())
  ) AS total_tenant_deals
FROM deals d
WHERE d.tenant_id = public.get_current_user_tenant_id()
  AND EXISTS (
    SELECT 1 
    FROM user_tenant_memberships utm
    WHERE utm.user_id = auth.uid()
      AND utm.tenant_id = d.tenant_id
      AND utm.status = 'active'
  );

