-- =====================================================
-- FORM VERSIONING SYSTEM
-- =====================================================
-- Track all changes to forms for rollback and audit
-- =====================================================

-- Form Versions Table
CREATE TABLE IF NOT EXISTS public.form_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.marketing_forms(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  
  -- Snapshot of form at this version
  snapshot JSONB NOT NULL, -- Complete form data at this point in time
  
  -- Change tracking
  changed_by_user_id UUID REFERENCES public.app_users(id),
  change_summary TEXT, -- Brief description of changes
  changes JSONB, -- Detailed diff of what changed
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Multi-tenancy
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  UNIQUE(form_id, version_number)
);

-- Indexes
CREATE INDEX idx_form_versions_form_id ON public.form_versions(form_id);
CREATE INDEX idx_form_versions_created_at ON public.form_versions(created_at DESC);
CREATE INDEX idx_form_versions_tenant ON public.form_versions(tenant_id);

-- Enable RLS
ALTER TABLE public.form_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenants can view their own form versions" ON public.form_versions
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can create form versions" ON public.form_versions
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Function: Auto-create version on form update
CREATE OR REPLACE FUNCTION public.create_form_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM public.form_versions
  WHERE form_id = NEW.id;
  
  -- Create version snapshot
  INSERT INTO public.form_versions (
    form_id,
    version_number,
    snapshot,
    tenant_id,
    changed_by_user_id
  ) VALUES (
    NEW.id,
    next_version,
    to_jsonb(NEW),
    NEW.tenant_id,
    auth.uid()
  );
  
  RETURN NEW;
END;
$$;

-- Trigger: Create version on every form update
CREATE TRIGGER create_form_version_trigger
  AFTER UPDATE ON public.marketing_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.create_form_version();

-- Function: Rollback to previous version
CREATE OR REPLACE FUNCTION public.rollback_form_to_version(
  p_form_id UUID,
  p_version_number INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  version_snapshot JSONB;
BEGIN
  -- Get version snapshot
  SELECT snapshot INTO version_snapshot
  FROM public.form_versions
  WHERE form_id = p_form_id AND version_number = p_version_number;
  
  IF version_snapshot IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update form with snapshot data
  UPDATE public.marketing_forms
  SET
    name = version_snapshot->>'name',
    description = version_snapshot->>'description',
    fields_json = (version_snapshot->>'fields_json')::jsonb,
    theme = version_snapshot->>'theme',
    button_text = version_snapshot->>'button_text',
    success_message = version_snapshot->>'success_message',
    redirect_url = version_snapshot->>'redirect_url',
    updated_at = NOW()
  WHERE id = p_form_id;
  
  RETURN TRUE;
END;
$$;

-- Grant permissions
GRANT SELECT ON public.form_versions TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_form_to_version(UUID, INTEGER) TO authenticated;

-- Comments
COMMENT ON TABLE public.form_versions IS 'Version history for marketing forms - enables rollback and audit trail';
COMMENT ON FUNCTION public.create_form_version() IS 'Automatically creates a version snapshot whenever a form is updated';
COMMENT ON FUNCTION public.rollback_form_to_version(UUID, INTEGER) IS 'Restores a form to a specific version number';

