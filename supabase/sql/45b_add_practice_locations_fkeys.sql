-- =====================================================
-- ADD PRACTICE LOCATIONS FOREIGN KEYS
-- =====================================================
-- Run this AFTER creating practice_locations table
-- to add foreign key constraints to treatment routing tables
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '🔗 ADDING PRACTICE_LOCATIONS FOREIGN KEYS';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';

  -- Check if practice_locations table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'practice_locations'
  ) THEN
    RAISE EXCEPTION 'practice_locations table does not exist. Please create it first.';
  END IF;

  -- Add foreign key to treatment_tags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'treatment_tags_location_id_fkey'
    AND table_name = 'treatment_tags'
  ) THEN
    ALTER TABLE treatment_tags
      ADD CONSTRAINT treatment_tags_location_id_fkey 
      FOREIGN KEY (location_id) 
      REFERENCES practice_locations(id) 
      ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Added foreign key: treatment_tags.location_id → practice_locations.id';
  ELSE
    RAISE NOTICE '✓ Foreign key already exists: treatment_tags.location_id';
  END IF;

  -- Add foreign key to treatment_tag_pipeline_mappings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'treatment_tag_pipeline_mappings_location_id_fkey'
    AND table_name = 'treatment_tag_pipeline_mappings'
  ) THEN
    ALTER TABLE treatment_tag_pipeline_mappings
      ADD CONSTRAINT treatment_tag_pipeline_mappings_location_id_fkey 
      FOREIGN KEY (location_id) 
      REFERENCES practice_locations(id) 
      ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Added foreign key: treatment_tag_pipeline_mappings.location_id → practice_locations.id';
  ELSE
    RAISE NOTICE '✓ Foreign key already exists: treatment_tag_pipeline_mappings.location_id';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '✅ FOREIGN KEYS ADDED SUCCESSFULLY';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Multi-location support is now FULLY ENABLED';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '  → Create location-specific treatment tags';
  RAISE NOTICE '  → Map tags to pipelines per location';
  RAISE NOTICE '  → Use organization-wide tags (location_id = NULL)';
  RAISE NOTICE '';
END $$;

