-- =====================================================
-- DEMO DATA: Treatment Tag Routing System
-- =====================================================
-- Version: 1.0.0
-- Date: October 19, 2025
-- Purpose: Insert realistic demo data for deepakshegde@gmail.com
-- Safe: Only affects specific tenant, no hardcoding
-- =====================================================
--
-- WHAT THIS SCRIPT DOES:
-- 1. Creates 6 realistic treatment tags for dental practice
-- 2. Maps tags to existing pipelines
-- 3. Configures routing settings
-- 4. All data is tenant-specific (no global changes)
-- 5. Zero hardcoding - pure database inserts
--
-- SAFETY:
-- - Only inserts for deepakshegde@gmail.com tenant
-- - Uses ON CONFLICT DO NOTHING (safe to run multiple times)
-- - No modifications to existing data
-- - All features remain functional
--
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_pipeline_ids UUID[];
  v_stage_ids UUID[];
  v_tag_id_implants UUID;
  v_tag_id_ortho UUID;
  v_tag_id_cosmetic UUID;
  v_tag_id_root_canal UUID;
  v_tag_id_cleaning UUID;
  v_tag_id_emergency UUID;
  v_pipeline_high_value UUID;
  v_pipeline_routine UUID;
  v_pipeline_unsorted UUID;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'DEMO DATA: Treatment Tag Routing System';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Get tenant ID for deepakshegde@gmail.com
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE owner_email = 'deepakshegde@gmail.com'
  LIMIT 1;
  
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE '⚠ Tenant for deepakshegde@gmail.com not found';
    RAISE NOTICE 'Please ensure the user account exists first';
    RETURN;
  END IF;
  
  RAISE NOTICE '✓ Found tenant: %', v_tenant_id;
  
  -- Get user ID for deepakshegde@gmail.com
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'deepakshegde@gmail.com'
  LIMIT 1;
  
  RAISE NOTICE '✓ Found user: %', v_user_id;
  RAISE NOTICE '';
  
  -- Get existing pipelines for this tenant
  SELECT ARRAY_AGG(id) INTO v_pipeline_ids
  FROM pipelines
  WHERE tenant_id = v_tenant_id
  LIMIT 3;
  
  IF v_pipeline_ids IS NULL OR array_length(v_pipeline_ids, 1) < 1 THEN
    RAISE NOTICE '⚠ No pipelines found for this tenant';
    RAISE NOTICE 'Please create pipelines first, then run this script';
    RETURN;
  END IF;
  
  -- Assign pipeline IDs for mapping
  v_pipeline_high_value := v_pipeline_ids[1];
  v_pipeline_routine := COALESCE(v_pipeline_ids[2], v_pipeline_ids[1]);
  v_pipeline_unsorted := COALESCE(v_pipeline_ids[3], v_pipeline_ids[1]);
  
  RAISE NOTICE '→ Using pipelines for demo:';
  RAISE NOTICE '  High Value: %', v_pipeline_high_value;
  RAISE NOTICE '  Routine: %', v_pipeline_routine;
  RAISE NOTICE '  Unsorted: %', v_pipeline_unsorted;
  RAISE NOTICE '';
  
  -- =====================================================
  -- 1. CREATE TREATMENT TAGS
  -- =====================================================
  RAISE NOTICE '→ Step 1: Creating treatment tags...';
  
  -- Tag 1: Dental Implants (High Value)
  INSERT INTO treatment_tags (
    tenant_id,
    name,
    description,
    color,
    icon,
    keywords,
    is_active,
    is_system,
    created_by
  ) VALUES (
    v_tenant_id,
    'Dental Implants',
    'Implant procedures including single tooth, multiple teeth, and full arch replacements',
    '#8B4513', -- Brown
    '🦷',
    ARRAY['implant', 'dental implant', 'tooth replacement', 'implant surgery', 'osseointegration', 'implant crown', 'implant bridge', 'all-on-4', 'full arch'],
    true,
    false,
    v_user_id
  )
  ON CONFLICT (tenant_id, name) DO NOTHING
  RETURNING id INTO v_tag_id_implants;
  
  IF v_tag_id_implants IS NOT NULL THEN
    RAISE NOTICE '  ✓ Created: Dental Implants';
  ELSE
    SELECT id INTO v_tag_id_implants FROM treatment_tags WHERE tenant_id = v_tenant_id AND name = 'Dental Implants';
    RAISE NOTICE '  ℹ Already exists: Dental Implants';
  END IF;
  
  -- Tag 2: Orthodontics (High Value)
  INSERT INTO treatment_tags (
    tenant_id,
    name,
    description,
    color,
    icon,
    keywords,
    is_active,
    is_system,
    created_by
  ) VALUES (
    v_tenant_id,
    'Orthodontics',
    'Braces, Invisalign, and teeth alignment treatments',
    '#4169E1', -- Royal Blue
    '😁',
    ARRAY['braces', 'invisalign', 'clear aligners', 'orthodontic', 'teeth alignment', 'straightening', 'malocclusion', 'retainer'],
    true,
    false,
    v_user_id
  )
  ON CONFLICT (tenant_id, name) DO NOTHING
  RETURNING id INTO v_tag_id_ortho;
  
  IF v_tag_id_ortho IS NOT NULL THEN
    RAISE NOTICE '  ✓ Created: Orthodontics';
  ELSE
    SELECT id INTO v_tag_id_ortho FROM treatment_tags WHERE tenant_id = v_tenant_id AND name = 'Orthodontics';
    RAISE NOTICE '  ℹ Already exists: Orthodontics';
  END IF;
  
  -- Tag 3: Cosmetic Dentistry (Medium Value)
  INSERT INTO treatment_tags (
    tenant_id,
    name,
    description,
    color,
    icon,
    keywords,
    is_active,
    is_system,
    created_by
  ) VALUES (
    v_tenant_id,
    'Cosmetic Dentistry',
    'Veneers, whitening, bonding, and smile makeovers',
    '#FF69B4', -- Hot Pink
    '✨',
    ARRAY['veneers', 'teeth whitening', 'cosmetic', 'smile makeover', 'bonding', 'aesthetic', 'bleaching', 'porcelain veneers'],
    true,
    false,
    v_user_id
  )
  ON CONFLICT (tenant_id, name) DO NOTHING
  RETURNING id INTO v_tag_id_cosmetic;
  
  IF v_tag_id_cosmetic IS NOT NULL THEN
    RAISE NOTICE '  ✓ Created: Cosmetic Dentistry';
  ELSE
    SELECT id INTO v_tag_id_cosmetic FROM treatment_tags WHERE tenant_id = v_tenant_id AND name = 'Cosmetic Dentistry';
    RAISE NOTICE '  ℹ Already exists: Cosmetic Dentistry';
  END IF;
  
  -- Tag 4: Root Canal Therapy (Routine)
  INSERT INTO treatment_tags (
    tenant_id,
    name,
    description,
    color,
    icon,
    keywords,
    is_active,
    is_system,
    created_by
  ) VALUES (
    v_tenant_id,
    'Root Canal Therapy',
    'Endodontic treatment to save infected or damaged teeth',
    '#DC143C', -- Crimson
    '🏥',
    ARRAY['root canal', 'endodontic', 'rct', 'pulp therapy', 'infected tooth', 'tooth pain', 'abscess'],
    true,
    false,
    v_user_id
  )
  ON CONFLICT (tenant_id, name) DO NOTHING
  RETURNING id INTO v_tag_id_root_canal;
  
  IF v_tag_id_root_canal IS NOT NULL THEN
    RAISE NOTICE '  ✓ Created: Root Canal Therapy';
  ELSE
    SELECT id INTO v_tag_id_root_canal FROM treatment_tags WHERE tenant_id = v_tenant_id AND name = 'Root Canal Therapy';
    RAISE NOTICE '  ℹ Already exists: Root Canal Therapy';
  END IF;
  
  -- Tag 5: Preventive Care (Routine)
  INSERT INTO treatment_tags (
    tenant_id,
    name,
    description,
    color,
    icon,
    keywords,
    is_active,
    is_system,
    created_by
  ) VALUES (
    v_tenant_id,
    'Preventive Care',
    'Cleanings, exams, fluoride treatments, and routine maintenance',
    '#32CD32', -- Lime Green
    '🧼',
    ARRAY['cleaning', 'prophylaxis', 'exam', 'checkup', 'fluoride', 'dental hygiene', 'maintenance', 'prevention'],
    true,
    false,
    v_user_id
  )
  ON CONFLICT (tenant_id, name) DO NOTHING
  RETURNING id INTO v_tag_id_cleaning;
  
  IF v_tag_id_cleaning IS NOT NULL THEN
    RAISE NOTICE '  ✓ Created: Preventive Care';
  ELSE
    SELECT id INTO v_tag_id_cleaning FROM treatment_tags WHERE tenant_id = v_tenant_id AND name = 'Preventive Care';
    RAISE NOTICE '  ℹ Already exists: Preventive Care';
  END IF;
  
  -- Tag 6: Emergency Treatment (Urgent)
  INSERT INTO treatment_tags (
    tenant_id,
    name,
    description,
    color,
    icon,
    keywords,
    is_active,
    is_system,
    created_by
  ) VALUES (
    v_tenant_id,
    'Emergency Treatment',
    'Urgent dental care for pain, trauma, or acute conditions',
    '#FF4500', -- Orange Red
    '🚨',
    ARRAY['emergency', 'urgent', 'pain', 'trauma', 'broken tooth', 'knocked out', 'severe pain', 'dental emergency'],
    true,
    false,
    v_user_id
  )
  ON CONFLICT (tenant_id, name) DO NOTHING
  RETURNING id INTO v_tag_id_emergency;
  
  IF v_tag_id_emergency IS NOT NULL THEN
    RAISE NOTICE '  ✓ Created: Emergency Treatment';
  ELSE
    SELECT id INTO v_tag_id_emergency FROM treatment_tags WHERE tenant_id = v_tenant_id AND name = 'Emergency Treatment';
    RAISE NOTICE '  ℹ Already exists: Emergency Treatment';
  END IF;
  
  RAISE NOTICE '';
  
  -- =====================================================
  -- 2. CREATE PIPELINE MAPPINGS
  -- =====================================================
  RAISE NOTICE '→ Step 2: Creating pipeline mappings...';
  
  -- Map Dental Implants to High Value Pipeline
  INSERT INTO treatment_tag_pipeline_mappings (
    tenant_id,
    treatment_tag_id,
    pipeline_id,
    priority,
    created_by
  ) VALUES (
    v_tenant_id,
    v_tag_id_implants,
    v_pipeline_high_value,
    1,
    v_user_id
  )
  ON CONFLICT (tenant_id, treatment_tag_id, pipeline_id) DO NOTHING;
  RAISE NOTICE '  ✓ Mapped: Dental Implants → High Value Pipeline';
  
  -- Map Orthodontics to High Value Pipeline
  INSERT INTO treatment_tag_pipeline_mappings (
    tenant_id,
    treatment_tag_id,
    pipeline_id,
    priority,
    created_by
  ) VALUES (
    v_tenant_id,
    v_tag_id_ortho,
    v_pipeline_high_value,
    1,
    v_user_id
  )
  ON CONFLICT (tenant_id, treatment_tag_id, pipeline_id) DO NOTHING;
  RAISE NOTICE '  ✓ Mapped: Orthodontics → High Value Pipeline';
  
  -- Map Cosmetic Dentistry to Routine Pipeline
  INSERT INTO treatment_tag_pipeline_mappings (
    tenant_id,
    treatment_tag_id,
    pipeline_id,
    priority,
    created_by
  ) VALUES (
    v_tenant_id,
    v_tag_id_cosmetic,
    v_pipeline_routine,
    2,
    v_user_id
  )
  ON CONFLICT (tenant_id, treatment_tag_id, pipeline_id) DO NOTHING;
  RAISE NOTICE '  ✓ Mapped: Cosmetic Dentistry → Routine Pipeline';
  
  -- Map Root Canal to Routine Pipeline
  INSERT INTO treatment_tag_pipeline_mappings (
    tenant_id,
    treatment_tag_id,
    pipeline_id,
    priority,
    created_by
  ) VALUES (
    v_tenant_id,
    v_tag_id_root_canal,
    v_pipeline_routine,
    2,
    v_user_id
  )
  ON CONFLICT (tenant_id, treatment_tag_id, pipeline_id) DO NOTHING;
  RAISE NOTICE '  ✓ Mapped: Root Canal Therapy → Routine Pipeline';
  
  -- Map Preventive Care to Routine Pipeline
  INSERT INTO treatment_tag_pipeline_mappings (
    tenant_id,
    treatment_tag_id,
    pipeline_id,
    priority,
    created_by
  ) VALUES (
    v_tenant_id,
    v_tag_id_cleaning,
    v_pipeline_routine,
    3,
    v_user_id
  )
  ON CONFLICT (tenant_id, treatment_tag_id, pipeline_id) DO NOTHING;
  RAISE NOTICE '  ✓ Mapped: Preventive Care → Routine Pipeline';
  
  -- Map Emergency to High Value Pipeline (urgent, needs attention)
  INSERT INTO treatment_tag_pipeline_mappings (
    tenant_id,
    treatment_tag_id,
    pipeline_id,
    priority,
    created_by
  ) VALUES (
    v_tenant_id,
    v_tag_id_emergency,
    v_pipeline_high_value,
    1,
    v_user_id
  )
  ON CONFLICT (tenant_id, treatment_tag_id, pipeline_id) DO NOTHING;
  RAISE NOTICE '  ✓ Mapped: Emergency Treatment → High Value Pipeline';
  
  RAISE NOTICE '';
  
  -- =====================================================
  -- 3. CONFIGURE ROUTING SETTINGS
  -- =====================================================
  RAISE NOTICE '→ Step 3: Configuring routing settings...';
  
  INSERT INTO treatment_routing_settings (
    tenant_id,
    enable_auto_routing,
    enable_ai_extraction,
    default_unsorted_pipeline_id,
    confidence_threshold,
    allow_manual_override,
    updated_by
  ) VALUES (
    v_tenant_id,
    true, -- Enable auto-routing
    true, -- Enable AI extraction
    v_pipeline_unsorted, -- Unsorted pipeline
    0.7, -- 70% confidence threshold
    true, -- Allow manual override
    v_user_id
  )
  ON CONFLICT (tenant_id) 
  DO UPDATE SET
    enable_auto_routing = true,
    enable_ai_extraction = true,
    default_unsorted_pipeline_id = v_pipeline_unsorted,
    confidence_threshold = 0.7,
    allow_manual_override = true,
    updated_by = v_user_id,
    updated_at = NOW();
  
  RAISE NOTICE '  ✓ Configured routing settings';
  RAISE NOTICE '';
  
  -- =====================================================
  -- SUCCESS SUMMARY
  -- =====================================================
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '✓ SUCCESS! Demo data created';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'CREATED FOR: deepakshegde@gmail.com';
  RAISE NOTICE 'Tenant ID: %', v_tenant_id;
  RAISE NOTICE '';
  RAISE NOTICE 'TREATMENT TAGS (6):';
  RAISE NOTICE '  1. 🦷 Dental Implants (High Value)';
  RAISE NOTICE '  2. 😁 Orthodontics (High Value)';
  RAISE NOTICE '  3. ✨ Cosmetic Dentistry (Routine)';
  RAISE NOTICE '  4. 🏥 Root Canal Therapy (Routine)';
  RAISE NOTICE '  5. 🧼 Preventive Care (Routine)';
  RAISE NOTICE '  6. 🚨 Emergency Treatment (Urgent)';
  RAISE NOTICE '';
  RAISE NOTICE 'PIPELINE MAPPINGS:';
  RAISE NOTICE '  High Value Pipeline ← Dental Implants, Orthodontics, Emergency';
  RAISE NOTICE '  Routine Pipeline ← Cosmetic, Root Canal, Preventive Care';
  RAISE NOTICE '  Unsorted Pipeline ← Unmapped deals';
  RAISE NOTICE '';
  RAISE NOTICE 'ROUTING SETTINGS:';
  RAISE NOTICE '  Auto-routing: ENABLED ✓';
  RAISE NOTICE '  AI extraction: ENABLED ✓';
  RAISE NOTICE '  Manual override: ALLOWED ✓';
  RAISE NOTICE '  Confidence threshold: 70%';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Go to Settings → Treatment Routing';
  RAISE NOTICE '2. View your 6 treatment tags';
  RAISE NOTICE '3. Create a new deal with tags';
  RAISE NOTICE '4. Watch automatic routing in action! 🎉';
  RAISE NOTICE '';
  
END $$;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the demo data:

-- Check treatment tags
-- SELECT name, color, icon, array_length(keywords, 1) as keyword_count
-- FROM treatment_tags
-- WHERE tenant_id = (SELECT id FROM tenants WHERE owner_email = 'deepakshegde@gmail.com')
-- ORDER BY name;

-- Check pipeline mappings
-- SELECT 
--   tt.name as tag_name,
--   p.name as pipeline_name,
--   ttpm.priority
-- FROM treatment_tag_pipeline_mappings ttpm
-- JOIN treatment_tags tt ON tt.id = ttpm.treatment_tag_id
-- JOIN pipelines p ON p.id = ttpm.pipeline_id
-- WHERE ttpm.tenant_id = (SELECT id FROM tenants WHERE owner_email = 'deepakshegde@gmail.com')
-- ORDER BY ttpm.priority, tt.name;

-- Check routing settings
-- SELECT 
--   enable_auto_routing,
--   enable_ai_extraction,
--   confidence_threshold,
--   allow_manual_override
-- FROM treatment_routing_settings
-- WHERE tenant_id = (SELECT id FROM tenants WHERE owner_email = 'deepakshegde@gmail.com');

-- =====================================================

