-- ============================================
-- COMPLETE FIX FOR CRM CRUD OPERATIONS
-- Run this in Supabase SQL Editor
-- ============================================

-- STEP 1: Check if you have a tenant and app_user record
-- Copy your auth user ID first
SELECT auth.uid() as your_user_id;

-- Check if you're in app_users table
SELECT id, tenant_id, full_name, role 
FROM app_users 
WHERE id = auth.uid();

-- If the above returns EMPTY, you need setup!
-- If it returns a row, check if tenant_id is NOT NULL

-- ============================================
-- OPTION A: PROPER FIX - Create Tenant & User
-- (Use this if you don't have a tenant)
-- ============================================

-- 1. Create a tenant (if you don't have one)
INSERT INTO tenants (id, name, timezone)
VALUES (
  gen_random_uuid(),
  'My Dental Practice',
  'Europe/London'
)
ON CONFLICT DO NOTHING
RETURNING id;

-- 2. Link your auth user to the tenant
-- REPLACE 'your-tenant-id-from-above' with the UUID from step 1
INSERT INTO app_users (id, tenant_id, full_name, role)
VALUES (
  auth.uid(),
  'your-tenant-id-from-above'::uuid,  -- REPLACE THIS!
  'Admin User',
  'owner'
)
ON CONFLICT (id) 
DO UPDATE SET 
  tenant_id = EXCLUDED.tenant_id,
  updated_at = NOW();

-- ============================================
-- OPTION B: QUICK FIX - Disable RLS Temporarily
-- (Use this to test quickly)
-- ============================================

ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;

GRANT ALL ON contacts TO authenticated, anon;
GRANT ALL ON deals TO authenticated, anon;
GRANT ALL ON pipelines TO authenticated, anon;
GRANT ALL ON pipeline_stages TO authenticated, anon;
GRANT ALL ON tasks TO authenticated, anon;
GRANT ALL ON activities TO authenticated, anon;

-- ============================================
-- VERIFICATION
-- ============================================

-- Test creating a contact
INSERT INTO contacts (tenant_id, full_name, primary_email)
VALUES (
  (SELECT tenant_id FROM app_users WHERE id = auth.uid()),
  'Test Contact',
  'test@example.com'
)
RETURNING id, full_name, created_at;

-- If this works, you're all set!
-- If it fails, use OPTION B (disable RLS)

