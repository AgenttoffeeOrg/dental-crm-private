-- ================================================================
-- A2: RLS FUNCTIONAL TESTS
-- ================================================================
-- Purpose: Verify tenant isolation works correctly
-- Test Plan:
--   1. Create two test tenants (T1, T2)
--   2. Create users (U1 for T1, U2 for T2)
--   3. Create data in each tenant
--   4. Verify U1 cannot see/modify T2 data and vice versa
-- ================================================================

-- SETUP: Create test tenants and users
-- Note: Run this as service_role or in a transaction that gets rolled back

BEGIN;

-- Create test tenants
INSERT INTO tenants (id, name, slug, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Test Tenant One', 'test-tenant-1', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Test Tenant Two', 'test-tenant-2', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test users
-- Note: In production, these would be created via auth.users
-- For testing, we'll create app_users directly
INSERT INTO app_users (id, tenant_id, email, role, full_name, created_at, updated_at)
VALUES 
  ('10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'user1@tenant1.test', 'admin', 'User One', NOW(), NOW()),
  ('20000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'user2@tenant2.test', 'admin', 'User Two', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- TEST 1: Contacts Isolation
-- ================================================================

-- Create contacts for each tenant
INSERT INTO contacts (tenant_id, full_name, primary_email, lifecycle_stage, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Contact from Tenant 1', 'contact1@tenant1.test', 'lead', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Contact from Tenant 2', 'contact2@tenant2.test', 'lead', NOW(), NOW());

-- Verify: As service_role, we can see both
SELECT 'Service Role - Should see BOTH contacts' AS test_name, COUNT(*) AS count, 2 AS expected
FROM contacts
WHERE tenant_id IN ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-000000000002'::uuid);

-- Simulate RLS: Set session variable to tenant 1
SET LOCAL jwt.claims.sub = '10000000-0000-0000-0000-000000000001';

-- Verify: As tenant 1 user, should only see tenant 1 contacts
-- Note: This requires proper RLS setup with auth context
SELECT 
  'Tenant 1 User - Should see ONLY Tenant 1 contacts' AS test_name,
  COUNT(*) AS actual_count,
  1 AS expected_count,
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM contacts
WHERE full_name LIKE '%Tenant%';

-- ================================================================
-- TEST 2: Deals Isolation
-- ================================================================

-- Create deals for each tenant (with valid pipeline references)
-- First, create test pipelines
INSERT INTO pipelines (id, tenant_id, name, description, created_at, updated_at)
VALUES
  ('11111111-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'T1 Pipeline', 'Tenant 1', NOW(), NOW()),
  ('22222222-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'T2 Pipeline', 'Tenant 2', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create pipeline stages
INSERT INTO pipeline_stages (pipeline_id, name, "position", probability, created_at, updated_at)
VALUES
  ('11111111-0000-0000-0000-000000000001'::uuid, 'New', 0, 10, NOW(), NOW()),
  ('22222222-0000-0000-0000-000000000002'::uuid, 'New', 0, 10, NOW(), NOW());

-- Create deals
INSERT INTO deals (tenant_id, title, pipeline_id, stage_id, value, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Deal from Tenant 1',
  '11111111-0000-0000-0000-000000000001'::uuid,
  ps.id,
  1000.00,
  NOW(),
  NOW()
FROM pipeline_stages ps
WHERE ps.pipeline_id = '11111111-0000-0000-0000-000000000001'::uuid
LIMIT 1;

INSERT INTO deals (tenant_id, title, pipeline_id, stage_id, value, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Deal from Tenant 2',
  '22222222-0000-0000-0000-000000000002'::uuid,
  ps.id,
  2000.00,
  NOW(),
  NOW()
FROM pipeline_stages ps
WHERE ps.pipeline_id = '22222222-0000-0000-0000-000000000002'::uuid
LIMIT 1;

-- Verify isolation
SELECT 
  'Service Role - Should see BOTH deals' AS test_name,
  COUNT(*) AS actual_count,
  2 AS expected_count
FROM deals
WHERE title LIKE 'Deal from Tenant%';

-- ================================================================
-- TEST 3: Cross-Tenant Mutation Attempts
-- ================================================================

-- Attempt to update tenant 2 data as tenant 1 user (should affect 0 rows)
-- Note: This test requires executing within proper auth context

-- Test query (to be run with tenant 1 auth context):
-- UPDATE contacts 
-- SET full_name = 'HACKED' 
-- WHERE tenant_id = '00000000-0000-0000-0000-000000000002'::uuid;
-- Expected: 0 rows affected

-- ================================================================
-- TEST 4: Marketing Tables Isolation (if entitled)
-- ================================================================

-- Create marketing campaigns
INSERT INTO marketing_campaigns (tenant_id, name, type, status, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'T1 Campaign', 'email', 'draft', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'T2 Campaign', 'email', 'draft', NOW(), NOW())
ON CONFLICT DO NOTHING;

SELECT 
  'Service Role - Should see BOTH campaigns' AS test_name,
  COUNT(*) AS actual_count,
  2 AS expected_count
FROM marketing_campaigns
WHERE name LIKE 'T_ Campaign';

-- ================================================================
-- TEST 5: Automations Isolation
-- ================================================================

-- Create automations
INSERT INTO automations (tenant_id, name, category, trigger_type, is_active, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'T1 Automation', 'deal', 'deal_created', true, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'T2 Automation', 'deal', 'deal_created', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

SELECT 
  'Service Role - Should see BOTH automations' AS test_name,
  COUNT(*) AS actual_count,
  2 AS expected_count
FROM automations
WHERE name LIKE 'T_ Automation';

-- ================================================================
-- CLEANUP
-- ================================================================

ROLLBACK;

-- ================================================================
-- EXPECTED RESULTS:
-- - Service role can see all data across tenants
-- - Tenant 1 user (via RLS) can ONLY see/modify tenant 1 data
-- - Tenant 2 user (via RLS) can ONLY see/modify tenant 2 data
-- - Cross-tenant UPDATE/DELETE attempts affect 0 rows
-- - All counts match expected values
-- ================================================================

-- ================================================================
-- MANUAL TEST INSTRUCTIONS:
-- ================================================================
-- 1. Run this script as service_role to set up test data
-- 2. Use Supabase client with user1@tenant1.test auth to query:
--    - SELECT * FROM contacts; (should see only T1)
--    - SELECT * FROM deals; (should see only T1)
-- 3. Attempt cross-tenant mutation:
--    - UPDATE contacts SET full_name='HACK' WHERE tenant_id='T2-UUID';
--    - Should return 0 rows affected
-- 4. Repeat with user2@tenant2.test (should see only T2 data)
-- ================================================================

