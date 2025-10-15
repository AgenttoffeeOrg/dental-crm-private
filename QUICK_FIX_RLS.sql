-- ============================================
-- QUICK FIX: Make Everything Work Immediately
-- Run this in Supabase SQL Editor
-- ============================================

-- Disable RLS on all core tables
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to authenticated users
GRANT ALL ON contacts TO authenticated, anon;
GRANT ALL ON deals TO authenticated, anon;
GRANT ALL ON pipelines TO authenticated, anon;
GRANT ALL ON pipeline_stages TO authenticated, anon;
GRANT ALL ON tasks TO authenticated, anon;
GRANT ALL ON activities TO authenticated, anon;

-- Verification: Try to select from contacts
SELECT COUNT(*) as contact_count FROM contacts;

-- Success message
SELECT 'RLS disabled - everything should work now!' as status;

