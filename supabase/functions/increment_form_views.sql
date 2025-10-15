-- Function to increment form view count
-- Called when someone views a form (either hosted or embedded)

CREATE OR REPLACE FUNCTION public.increment_form_views(form_id uuid DEFAULT NULL, form_slug text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF form_id IS NOT NULL THEN
    UPDATE public.marketing_forms
    SET 
      total_views = total_views + 1,
      conversion_rate = CASE 
        WHEN (total_views + 1) > 0 
        THEN (total_submissions::float / (total_views + 1)::float) * 100
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE id = form_id;
  ELSIF form_slug IS NOT NULL THEN
    UPDATE public.marketing_forms
    SET 
      total_views = total_views + 1,
      conversion_rate = CASE 
        WHEN (total_views + 1) > 0 
        THEN (total_submissions::float / (total_views + 1)::float) * 100
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE public_url_slug = form_slug;
  END IF;
END;
$$;

-- Grant execute permission to anonymous (for public forms)
GRANT EXECUTE ON FUNCTION public.increment_form_views(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_form_views(uuid, text) TO authenticated;

