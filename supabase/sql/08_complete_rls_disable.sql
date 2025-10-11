-- Complete RLS disable and schema refresh
-- Run this in your Supabase SQL Editor to completely fix RLS issues

-- First, let's see what RLS policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Completely disable RLS on all tables
ALTER TABLE public.files DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_artifacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits DISABLE ROW LEVEL SECURITY;

-- Drop any existing RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.files;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.files;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.files;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.files;

-- Repeat for other tables that might have policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.activity_files;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.activity_files;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.activities;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.activities;

-- Grant full permissions to anon and authenticated roles
GRANT ALL ON public.files TO anon, authenticated;
GRANT ALL ON public.activity_files TO anon, authenticated;
GRANT ALL ON public.ai_artifacts TO anon, authenticated;
GRANT ALL ON public.tenants TO anon, authenticated;
GRANT ALL ON public.app_users TO anon, authenticated;
GRANT ALL ON public.contacts TO anon, authenticated;
GRANT ALL ON public.pipelines TO anon, authenticated;
GRANT ALL ON public.pipeline_stages TO anon, authenticated;
GRANT ALL ON public.deals TO anon, authenticated;
GRANT ALL ON public.tasks TO anon, authenticated;
GRANT ALL ON public.activities TO anon, authenticated;
GRANT ALL ON public.audits TO anon, authenticated;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

