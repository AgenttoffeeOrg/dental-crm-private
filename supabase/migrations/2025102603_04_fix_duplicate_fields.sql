SET search_path TO public, extensions;

-- Migration: Fix duplicate fields in get_onboarding_config function
-- Date: 2025-10-26
-- Description: 
--   The original function was returning duplicate fields when both global (tenant_id IS NULL)
--   and tenant-specific configurations existed for the same field.
--   This migration fixes the function to properly deduplicate, preferring tenant-specific over global.

-- Drop the existing function
DROP FUNCTION IF EXISTS get_onboarding_config(UUID, TEXT);

-- Recreate with proper deduplication
CREATE OR REPLACE FUNCTION get_onboarding_config(
  p_tenant_id UUID,
  p_account_type TEXT
)
RETURNS TABLE (
  step_id TEXT,
  step_name TEXT,
  step_description TEXT,
  step_icon TEXT,
  step_order INTEGER,
  step_category TEXT,
  is_skippable BOOLEAN,
  fields JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH deduplicated_fields AS (
    -- Use DISTINCT ON to get only one row per (step_id, field_name) combination
    -- ORDER BY tenant_id DESC NULLS LAST ensures tenant-specific configs take precedence over global
    SELECT DISTINCT ON (f.step_id, f.field_name)
      f.step_id,
      f.field_name,
      f.is_required,
      f.display_order,
      f.help_text,
      f.validation_rules,
      f.tenant_id
    FROM onboarding_field_config f
    WHERE f.tenant_id = p_tenant_id OR f.tenant_id IS NULL
    ORDER BY f.step_id, f.field_name, f.tenant_id DESC NULLS LAST
  )
  SELECT 
    s.id as step_id,
    s.name as step_name,
    s.description as step_description,
    s.icon as step_icon,
    s.display_order as step_order,
    s.category as step_category,
    s.is_skippable,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'fieldName', df.field_name,
          'isRequired', df.is_required,
          'displayOrder', df.display_order,
          'helpText', df.help_text,
          'validationRules', df.validation_rules
        ) ORDER BY df.display_order
      ) FILTER (WHERE df.field_name IS NOT NULL),
      '[]'::jsonb
    ) as fields
  FROM onboarding_step_definitions s
  LEFT JOIN deduplicated_fields df ON df.step_id = s.id
  WHERE p_account_type = ANY(s.account_types)
  GROUP BY s.id, s.name, s.description, s.icon, s.display_order, s.category, s.is_skippable
  ORDER BY s.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_onboarding_config IS 
  'Returns onboarding configuration with deduplicated steps and fields for a given tenant and account type. Tenant-specific field configs override global defaults.';

