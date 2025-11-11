/**
 * Practice Branding Configuration Table
 * 
 * Store white-label branding settings for each practice.
 */

CREATE TABLE IF NOT EXISTS public.practice_branding (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id uuid REFERENCES public.practices(id) ON DELETE CASCADE NOT NULL UNIQUE,
  logo_url text,
  primary_color text DEFAULT '#8B5CF6' NOT NULL,
  secondary_color text DEFAULT '#3B82F6' NOT NULL,
  company_name text NOT NULL,
  tagline text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create index
CREATE INDEX idx_practice_branding_practice ON public.practice_branding(practice_id);

-- Enable RLS
ALTER TABLE public.practice_branding ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view branding for their practice
CREATE POLICY "Users can view own practice branding"
  ON public.practice_branding
  FOR SELECT
  USING (
    practice_id IN (
      SELECT id FROM public.practices
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can update branding for their practice
CREATE POLICY "Users can update own practice branding"
  ON public.practice_branding
  FOR UPDATE
  USING (
    practice_id IN (
      SELECT id FROM public.practices
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can insert branding for their practice
CREATE POLICY "Users can insert own practice branding"
  ON public.practice_branding
  FOR INSERT
  WITH CHECK (
    practice_id IN (
      SELECT id FROM public.practices
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
      )
    )
  );

-- Function: Get or create default branding
CREATE OR REPLACE FUNCTION get_or_create_practice_branding(p_practice_id uuid)
RETURNS public.practice_branding
LANGUAGE plpgsql
AS $$
DECLARE
  v_branding public.practice_branding;
  v_practice_name text;
BEGIN
  -- Check if branding exists
  SELECT * INTO v_branding
  FROM public.practice_branding
  WHERE practice_id = p_practice_id;
  
  IF FOUND THEN
    RETURN v_branding;
  END IF;
  
  -- Create default branding
  SELECT name INTO v_practice_name
  FROM public.practices
  WHERE id = p_practice_id;
  
  INSERT INTO public.practice_branding (practice_id, company_name)
  VALUES (p_practice_id, v_practice_name)
  RETURNING * INTO v_branding;
  
  RETURN v_branding;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_practice_branding TO authenticated;

