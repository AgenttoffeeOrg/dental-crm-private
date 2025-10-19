-- =====================================================
-- PMS PROCEDURE CODE TO TREATMENT TAG MAPPINGS
-- =====================================================
-- Phase 11: Task 11.4
-- Maps dental procedure codes (ADA/CDT codes) to treatment tags
-- Enables automatic tag extraction from PMS treatment plans
-- =====================================================

-- =====================================================
-- 1. CREATE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pms_procedure_tag_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Procedure Code Information
  procedure_code TEXT NOT NULL, -- ADA/CDT code (e.g., "D6010", "D7240")
  procedure_name TEXT, -- Human-readable name (e.g., "Implant placement")
  procedure_category TEXT, -- Category (e.g., "Implants", "Orthodontics", "Cosmetic")
  
  -- Treatment Tag Mapping
  treatment_tag_id UUID REFERENCES treatment_tags(id) ON DELETE CASCADE,
  treatment_tag_name TEXT NOT NULL, -- Denormalized for performance
  
  -- Metadata
  mapping_priority INTEGER DEFAULT 1, -- Higher = higher priority if multiple tags match
  is_active BOOLEAN DEFAULT true,
  
  -- Location Support
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  applies_to_all_locations BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES app_users(id),
  
  -- Unique constraint: One procedure code per tenant (or location)
  UNIQUE(tenant_id, procedure_code, location_id)
);

COMMENT ON TABLE pms_procedure_tag_mappings IS 'Maps PMS procedure codes (ADA/CDT) to treatment tags for automatic deal routing';
COMMENT ON COLUMN pms_procedure_tag_mappings.procedure_code IS 'ADA/CDT procedure code (e.g., D6010 for implant)';
COMMENT ON COLUMN pms_procedure_tag_mappings.mapping_priority IS 'Higher priority tags are preferred when multiple tags match';
COMMENT ON COLUMN pms_procedure_tag_mappings.applies_to_all_locations IS 'If true, mapping applies to entire organization';

-- =====================================================
-- 2. INDEXES
-- =====================================================

-- Lookup procedure codes quickly
CREATE INDEX idx_pms_proc_mappings_tenant_code 
ON pms_procedure_tag_mappings(tenant_id, procedure_code) 
WHERE is_active = true;

-- Lookup by tag
CREATE INDEX idx_pms_proc_mappings_tag 
ON pms_procedure_tag_mappings(tenant_id, treatment_tag_id);

-- Location-specific lookups
CREATE INDEX idx_pms_proc_mappings_location 
ON pms_procedure_tag_mappings(tenant_id, location_id) 
WHERE location_id IS NOT NULL;

-- Full-text search on procedure name
CREATE INDEX idx_pms_proc_mappings_name_trgm 
ON pms_procedure_tag_mappings USING gin(procedure_name gin_trgm_ops);

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE pms_procedure_tag_mappings ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: Users can only see their organization's mappings
CREATE POLICY tenant_isolation_pms_proc_mappings ON pms_procedure_tag_mappings
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users 
      WHERE id = auth.uid()
    )
  );

-- Insert: Admins only
CREATE POLICY insert_pms_proc_mappings ON pms_procedure_tag_mappings
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM app_users 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_has_permission(auth.uid(), 'pms_settings:write')
    )
  );

-- Update: Admins only
CREATE POLICY update_pms_proc_mappings ON pms_procedure_tag_mappings
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_has_permission(auth.uid(), 'pms_settings:write')
    )
  );

-- Delete: Admins only
CREATE POLICY delete_pms_proc_mappings ON pms_procedure_tag_mappings
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_has_permission(auth.uid(), 'pms_settings:write')
    )
  );

-- =====================================================
-- 4. TRIGGER: AUTO-UPDATE TIMESTAMP
-- =====================================================

CREATE TRIGGER update_pms_proc_mappings_timestamp
  BEFORE UPDATE ON pms_procedure_tag_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- =====================================================
-- 5. HELPER FUNCTION: BULK IMPORT PMS MAPPINGS
-- =====================================================

CREATE OR REPLACE FUNCTION bulk_import_pms_procedure_mappings(
  p_tenant_id UUID,
  p_mappings JSONB, -- Array of {procedure_code, procedure_name, treatment_tag_name}
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE(
  imported_count INTEGER,
  skipped_count INTEGER,
  errors JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mapping JSONB;
  v_tag_id UUID;
  v_imported INT := 0;
  v_skipped INT := 0;
  v_errors JSONB := '[]'::JSONB;
BEGIN
  -- Loop through each mapping
  FOR v_mapping IN SELECT * FROM jsonb_array_elements(p_mappings)
  LOOP
    BEGIN
      -- Look up treatment tag ID
      SELECT id INTO v_tag_id
      FROM treatment_tags
      WHERE tenant_id = p_tenant_id
        AND name = v_mapping->>'treatment_tag_name'
        AND is_active = true;
      
      IF v_tag_id IS NULL THEN
        -- Tag not found, skip
        v_errors := v_errors || jsonb_build_object(
          'procedure_code', v_mapping->>'procedure_code',
          'error', 'Treatment tag not found'
        );
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;
      
      -- Insert or update mapping
      INSERT INTO pms_procedure_tag_mappings (
        tenant_id,
        procedure_code,
        procedure_name,
        treatment_tag_id,
        treatment_tag_name,
        created_by
      ) VALUES (
        p_tenant_id,
        v_mapping->>'procedure_code',
        v_mapping->>'procedure_name',
        v_tag_id,
        v_mapping->>'treatment_tag_name',
        p_created_by
      )
      ON CONFLICT (tenant_id, procedure_code, location_id)
      DO UPDATE SET
        treatment_tag_id = EXCLUDED.treatment_tag_id,
        treatment_tag_name = EXCLUDED.treatment_tag_name,
        procedure_name = EXCLUDED.procedure_name,
        updated_at = NOW();
      
      v_imported := v_imported + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object(
        'procedure_code', v_mapping->>'procedure_code',
        'error', SQLERRM
      );
      v_skipped := v_skipped + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_imported, v_skipped, v_errors;
END;
$$;

COMMENT ON FUNCTION bulk_import_pms_procedure_mappings IS 'Bulk import procedure code to tag mappings from JSON array';

-- =====================================================
-- 6. SEED DATA: COMMON DENTAL PROCEDURE CODES
-- =====================================================
-- Common ADA procedure codes that practices can customize

-- This is a helper view, not actual seed data (admins will configure their own)
CREATE OR REPLACE VIEW common_dental_procedure_codes AS
SELECT * FROM (VALUES
  -- IMPLANTS (D6000-D6199)
  ('D6010', 'Implant - Endosteal', 'Implants'),
  ('D6040', 'Implant - Eposteal', 'Implants'),
  ('D6050', 'Implant - Transosteal', 'Implants'),
  ('D6055', 'Connecting Bar - Implant Supported', 'Implants'),
  ('D6056', 'Prefabricated Abutment', 'Implants'),
  ('D6057', 'Custom Abutment', 'Implants'),
  ('D6058', 'Abutment Supported Porcelain Crown', 'Implants'),
  ('D6065', 'Implant Supported Porcelain Crown', 'Implants'),
  ('D6080', 'Implant Maintenance Procedures', 'Implants'),
  
  -- ORTHODONTICS (D8000-D8999)
  ('D8010', 'Limited Orthodontic Treatment', 'Orthodontics'),
  ('D8020', 'Limited Orthodontic Treatment - Adolescent', 'Orthodontics'),
  ('D8030', 'Limited Orthodontic Treatment - Adult', 'Orthodontics'),
  ('D8040', 'Comprehensive Orthodontic Treatment - Adolescent', 'Orthodontics'),
  ('D8070', 'Comprehensive Orthodontic Treatment - Adult', 'Orthodontics'),
  ('D8080', 'Comprehensive Orthodontic Treatment - Child', 'Orthodontics'),
  ('D8090', 'Comprehensive Orthodontic Treatment - Adolescent for Class II Malocclusion', 'Orthodontics'),
  ('D8220', 'Fixed Appliance Therapy', 'Orthodontics'),
  ('D8660', 'Pre-Orthodontic Treatment Visit', 'Orthodontics'),
  ('D8680', 'Orthodontic Retention', 'Orthodontics'),
  
  -- CROWNS (D2700-D2799)
  ('D2740', 'Crown - Porcelain/Ceramic', 'Cosmetic'),
  ('D2750', 'Crown - Porcelain Fused to High Noble Metal', 'Cosmetic'),
  ('D2751', 'Crown - Porcelain Fused to Predominantly Base Metal', 'Cosmetic'),
  ('D2752', 'Crown - Porcelain Fused to Noble Metal', 'Cosmetic'),
  ('D2780', 'Crown - 3/4 Cast High Noble Metal', 'Cosmetic'),
  ('D2781', 'Crown - 3/4 Cast Predominantly Base Metal', 'Cosmetic'),
  ('D2782', 'Crown - 3/4 Cast Noble Metal', 'Cosmetic'),
  ('D2783', 'Crown - 3/4 Porcelain/Ceramic', 'Cosmetic'),
  ('D2790', 'Crown - Full Cast High Noble Metal', 'Cosmetic'),
  ('D2791', 'Crown - Full Cast Predominantly Base Metal', 'Cosmetic'),
  ('D2792', 'Crown - Full Cast Noble Metal', 'Cosmetic'),
  ('D2794', 'Crown - Titanium', 'Cosmetic'),
  
  -- VENEERS (D2900-D2999)
  ('D2960', 'Labial Veneer (Laminate) - Chairside', 'Cosmetic'),
  ('D2961', 'Labial Veneer (Resin Laminate) - Laboratory', 'Cosmetic'),
  ('D2962', 'Labial Veneer (Porcelain Laminate) - Laboratory', 'Cosmetic'),
  
  -- WHITENING (D9970-D9999)
  ('D9972', 'External Bleaching - Per Arch', 'Cosmetic'),
  ('D9973', 'External Bleaching - Per Tooth', 'Cosmetic'),
  ('D9974', 'Internal Bleaching - Per Tooth', 'Cosmetic'),
  
  -- ROOT CANAL (D3000-D3999)
  ('D3310', 'Anterior Root Canal (Excluding Final Restoration)', 'Endodontics'),
  ('D3320', 'Bicuspid Root Canal (Excluding Final Restoration)', 'Endodontics'),
  ('D3330', 'Molar Root Canal (Excluding Final Restoration)', 'Endodontics'),
  
  -- EXTRACTIONS (D7000-D7999)
  ('D7210', 'Extraction - Erupted Tooth', 'Surgery'),
  ('D7220', 'Removal of Impacted Tooth - Soft Tissue', 'Surgery'),
  ('D7230', 'Removal of Impacted Tooth - Partially Bony', 'Surgery'),
  ('D7240', 'Removal of Impacted Tooth - Completely Bony', 'Surgery'),
  ('D7241', 'Removal of Impacted Tooth - Completely Bony (Unusual Complexity)', 'Surgery'),
  ('D7250', 'Removal of Residual Tooth Roots', 'Surgery'),
  
  -- PREVENTIVE (D1000-D1999)
  ('D1110', 'Prophylaxis - Adult', 'Preventive'),
  ('D1120', 'Prophylaxis - Child', 'Preventive'),
  ('D1206', 'Topical Application of Fluoride', 'Preventive'),
  ('D1208', 'Topical Application of Fluoride (Excluding Prophylaxis)', 'Preventive'),
  
  -- EMERGENCY (D0000-D0999)
  ('D0140', 'Limited Oral Evaluation - Problem Focused', 'Emergency'),
  ('D0160', 'Detailed and Extensive Oral Evaluation', 'Emergency'),
  ('D9110', 'Palliative (Emergency) Treatment', 'Emergency')
  
) AS t(procedure_code, procedure_name, procedure_category);

COMMENT ON VIEW common_dental_procedure_codes IS 'Reference list of common ADA procedure codes for easy mapping setup';

-- =====================================================
-- 7. HELPER FUNCTION: GET TREATMENT TAGS FROM PROCEDURE CODES
-- =====================================================

CREATE OR REPLACE FUNCTION get_treatment_tags_from_procedure_codes(
  p_tenant_id UUID,
  p_procedure_codes TEXT[],
  p_location_id UUID DEFAULT NULL
)
RETURNS TABLE(
  treatment_tag_name TEXT,
  treatment_tag_id UUID,
  procedure_codes_matched TEXT[],
  mapping_priority INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.treatment_tag_name,
    m.treatment_tag_id,
    array_agg(DISTINCT m.procedure_code) AS procedure_codes_matched,
    MAX(m.mapping_priority) AS mapping_priority
  FROM pms_procedure_tag_mappings m
  WHERE m.tenant_id = p_tenant_id
    AND m.procedure_code = ANY(p_procedure_codes)
    AND m.is_active = true
    AND (
      m.applies_to_all_locations = true
      OR m.location_id = p_location_id
      OR p_location_id IS NULL
    )
  GROUP BY m.treatment_tag_name, m.treatment_tag_id
  ORDER BY mapping_priority DESC, treatment_tag_name;
END;
$$;

COMMENT ON FUNCTION get_treatment_tags_from_procedure_codes IS 'Convert an array of procedure codes to treatment tags based on mappings';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Table: pms_procedure_tag_mappings
-- Indexes: 4
-- RLS Policies: 4
-- Functions: 2
-- Views: 1
-- =====================================================

