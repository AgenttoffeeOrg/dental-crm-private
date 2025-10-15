-- Function to increment form submission count
-- Used when a non-spam form submission is received

CREATE OR REPLACE FUNCTION public.increment_form_submissions(form_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.marketing_forms
  SET 
    total_submissions = total_submissions + 1,
    conversion_rate = CASE 
      WHEN total_views > 0 
      THEN ((total_submissions + 1)::float / total_views::float) * 100
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = form_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_form_submissions(uuid) TO authenticated;

