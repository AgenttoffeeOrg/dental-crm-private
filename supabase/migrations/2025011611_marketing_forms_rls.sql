-- =====================================================
-- MARKETING FORMS - ROW LEVEL SECURITY POLICIES
-- =====================================================
-- Migration: 20250116_marketing_forms_rls
-- Description: RLS policies for marketing_forms and related tables
-- Version: 1.0
-- Date: January 16, 2025
-- =====================================================

-- Enable RLS on marketing_forms table
ALTER TABLE public.marketing_forms ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can view their own forms
DROP POLICY IF EXISTS "Tenants can view their own forms" ON public.marketing_forms;
CREATE POLICY "Tenants can view their own forms" ON public.marketing_forms
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Policy: Tenants can create forms
DROP POLICY IF EXISTS "Tenants can create forms" ON public.marketing_forms;
CREATE POLICY "Tenants can create forms" ON public.marketing_forms
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Policy: Tenants can update their own forms
DROP POLICY IF EXISTS "Tenants can update their own forms" ON public.marketing_forms;
CREATE POLICY "Tenants can update their own forms" ON public.marketing_forms
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Policy: Tenants can delete (archive) their own forms
DROP POLICY IF EXISTS "Tenants can delete their own forms" ON public.marketing_forms;
CREATE POLICY "Tenants can delete their own forms" ON public.marketing_forms
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- FORM SUBMISSIONS RLS
-- =====================================================

-- Enable RLS on marketing_form_submissions table
ALTER TABLE public.marketing_form_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can view their own submissions
DROP POLICY IF EXISTS "Tenants can view their own submissions" ON public.marketing_form_submissions;
CREATE POLICY "Tenants can view their own submissions" ON public.marketing_form_submissions
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Policy: Allow public form submissions (no auth required for submitting)
-- This is needed for public forms embedded on websites
DROP POLICY IF EXISTS "Allow public form submissions" ON public.marketing_form_submissions;
CREATE POLICY "Allow public form submissions" ON public.marketing_form_submissions
  FOR INSERT
  WITH CHECK (true);

-- Policy: Tenants can update their own submissions
DROP POLICY IF EXISTS "Tenants can update their own submissions" ON public.marketing_form_submissions;
CREATE POLICY "Tenants can update their own submissions" ON public.marketing_form_submissions
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- LANDING PAGES RLS (if table exists)
-- =====================================================

-- Enable RLS on marketing_landing_pages if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'marketing_landing_pages'
  ) THEN
    ALTER TABLE public.marketing_landing_pages ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Tenants can view their own landing pages" ON public.marketing_landing_pages;
CREATE POLICY "Tenants can view their own landing pages" ON public.marketing_landing_pages
      FOR SELECT
      USING (
        tenant_id IN (
          SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS "Tenants can create landing pages" ON public.marketing_landing_pages;
CREATE POLICY "Tenants can create landing pages" ON public.marketing_landing_pages
      FOR INSERT
      WITH CHECK (
        tenant_id IN (
          SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS "Tenants can update their own landing pages" ON public.marketing_landing_pages;
CREATE POLICY "Tenants can update their own landing pages" ON public.marketing_landing_pages
      FOR UPDATE
      USING (
        tenant_id IN (
          SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS "Tenants can delete their own landing pages" ON public.marketing_landing_pages;
CREATE POLICY "Tenants can delete their own landing pages" ON public.marketing_landing_pages
      FOR DELETE
      USING (
        tenant_id IN (
          SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant basic permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_forms TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.marketing_form_submissions TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Add indexes for faster RLS policy checks
CREATE INDEX IF NOT EXISTS idx_marketing_forms_tenant_id ON public.marketing_forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_forms_status ON public.marketing_forms(status);
CREATE INDEX IF NOT EXISTS idx_marketing_forms_slug ON public.marketing_forms(public_url_slug) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_marketing_forms_created_at ON public.marketing_forms(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_form_submissions_tenant_id ON public.marketing_form_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON public.marketing_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_contact_id ON public.marketing_form_submissions(contact_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_is_spam ON public.marketing_form_submissions(is_spam);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON public.marketing_form_submissions(submitted_at DESC);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON POLICY "Tenants can view their own forms" ON public.marketing_forms IS 
  'Users can only view forms belonging to their tenant';

COMMENT ON POLICY "Tenants can create forms" ON public.marketing_forms IS 
  'Users can create forms for their tenant';

COMMENT ON POLICY "Tenants can update their own forms" ON public.marketing_forms IS 
  'Users can only update forms belonging to their tenant';

COMMENT ON POLICY "Tenants can delete their own forms" ON public.marketing_forms IS 
  'Users can only delete (soft delete/archive) forms belonging to their tenant';

COMMENT ON POLICY "Allow public form submissions" ON public.marketing_form_submissions IS 
  'Public form submissions allowed for embedded forms on websites - no authentication required';

COMMENT ON POLICY "Tenants can view their own submissions" ON public.marketing_form_submissions IS 
  'Users can only view form submissions belonging to their tenant';

