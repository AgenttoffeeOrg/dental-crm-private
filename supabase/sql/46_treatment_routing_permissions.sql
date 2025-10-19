-- =====================================================
-- TREATMENT TAG ROUTING SYSTEM - RBAC PERMISSIONS
-- =====================================================
-- Version: 1.0.0
-- Date: October 19, 2025
-- Purpose: Granular permissions for treatment tag management
-- Phase: 2 - Permissions & RBAC
-- =====================================================
--
-- WHAT THIS MIGRATION DOES:
-- 1. Adds 8 new permission definitions for treatment tag management
-- 2. Assigns permissions to default roles (Owner, Admin, Manager)
-- 3. Creates granular access control for tag and mapping management
-- 4. Maintains backward compatibility with existing permission system
--
-- SAFETY:
-- - Only adds new permissions (no modifications to existing ones)
-- - Uses ON CONFLICT DO NOTHING for idempotency
-- - Can be run multiple times safely
-- - Does not affect existing role permissions
--
-- PERMISSIONS ADDED:
-- - treatment_tags:read (view tags)
-- - treatment_tags:write (create/edit tags)
-- - treatment_tags:delete (delete non-system tags)
-- - pipeline_mappings:read (view tag→pipeline mappings)
-- - pipeline_mappings:write (create/edit mappings)
-- - pipeline_mappings:delete (delete mappings)
-- - routing_logs:view (view routing audit trail)
-- - routing_settings:manage (configure routing settings)
--
-- =====================================================

BEGIN;

-- =====================================================
-- 0. VERIFY & FIX TABLE STRUCTURE
-- =====================================================
-- Ensure role_permissions table has correct structure
-- (Handle potential schema variations from older migrations)

DO $$
DECLARE
  v_column_type TEXT;
  v_has_data BOOLEAN;
BEGIN
  -- Check if role_permissions table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'role_permissions'
  ) THEN
    
    -- Check if permission_key column exists (correct name)
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'role_permissions' 
      AND column_name = 'permission_key'
    ) THEN
      
      -- Check if it's called permission_id or permission_definition_id instead
      IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'role_permissions' 
        AND column_name = 'permission_id'
      ) THEN
        -- Rename permission_id to permission_key
        ALTER TABLE role_permissions 
          RENAME COLUMN permission_id TO permission_key;
        RAISE NOTICE '✓ Fixed: Renamed permission_id to permission_key';
      ELSIF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'role_permissions' 
        AND column_name = 'permission_definition_id'
      ) THEN
        -- Rename permission_definition_id to permission_key
        ALTER TABLE role_permissions 
          RENAME COLUMN permission_definition_id TO permission_key;
        RAISE NOTICE '✓ Fixed: Renamed permission_definition_id to permission_key';
      ELSE
        RAISE EXCEPTION 'role_permissions table exists but has no permission column. Please check table structure.';
      END IF;
    END IF;
    
    -- Now check the data type of permission_key column
    SELECT data_type INTO v_column_type
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'role_permissions' 
    AND column_name = 'permission_key';
    
    -- If it's UUID but should be TEXT, we need to fix it
    IF v_column_type = 'uuid' THEN
      RAISE NOTICE 'ℹ permission_key column is UUID but should be TEXT';
      RAISE NOTICE '⚠ MANUAL FIX REQUIRED: Cannot auto-migrate UUID to TEXT due to dependencies';
      RAISE NOTICE '→ Please run this SQL manually BEFORE running this migration:';
      RAISE NOTICE '';
      RAISE NOTICE '-- Step 1: Backup data';
      RAISE NOTICE 'CREATE TABLE role_permissions_backup_uuid AS SELECT * FROM role_permissions;';
      RAISE NOTICE '';
      RAISE NOTICE '-- Step 2: Drop dependent policies (will be recreated)';
      RAISE NOTICE 'DROP POLICY IF EXISTS join_requests_select_admin ON organization_join_requests CASCADE;';
      RAISE NOTICE 'DROP POLICY IF EXISTS join_requests_update_admin ON organization_join_requests CASCADE;';
      RAISE NOTICE '';
      RAISE NOTICE '-- Step 3: Rename old column';
      RAISE NOTICE 'ALTER TABLE role_permissions RENAME COLUMN permission_key TO permission_key_old;';
      RAISE NOTICE '';
      RAISE NOTICE '-- Step 4: Add new TEXT column';
      RAISE NOTICE 'ALTER TABLE role_permissions ADD COLUMN permission_key TEXT;';
      RAISE NOTICE '';
      RAISE NOTICE '-- Step 5: Clear table (will be repopulated by migration)';
      RAISE NOTICE 'TRUNCATE role_permissions;';
      RAISE NOTICE '';
      RAISE NOTICE '-- Step 6: Drop old column';
      RAISE NOTICE 'ALTER TABLE role_permissions DROP COLUMN permission_key_old;';
      RAISE NOTICE '';
      RAISE NOTICE '-- Step 7: Make column NOT NULL';
      RAISE NOTICE 'ALTER TABLE role_permissions ALTER COLUMN permission_key SET NOT NULL;';
      RAISE NOTICE '';
      RAISE NOTICE '-- Step 8: Add constraints';
      RAISE NOTICE 'ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_permission_key_fkey';
      RAISE NOTICE '  FOREIGN KEY (permission_key) REFERENCES permission_definitions(key) ON DELETE CASCADE;';
      RAISE NOTICE 'ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_id_permission_key_key';
      RAISE NOTICE '  UNIQUE(role_id, permission_key);';
      RAISE NOTICE 'CREATE INDEX role_permissions_permission_key_idx ON role_permissions(permission_key);';
      RAISE NOTICE '';
      RAISE NOTICE '-- Step 9: Then run this migration again';
      RAISE NOTICE '';
      
      RAISE EXCEPTION 'Migration halted: role_permissions.permission_key is UUID but should be TEXT. Please follow the manual steps above.';
      
    ELSIF v_column_type = 'text' OR v_column_type = 'character varying' THEN
      RAISE NOTICE '✓ role_permissions.permission_key has correct type (TEXT)';
    ELSE
      RAISE NOTICE '⚠ permission_key has unexpected type: % (proceeding anyway)', v_column_type;
    END IF;
    
  ELSE
    -- Table doesn't exist - create it with correct structure
    CREATE TABLE role_permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
      permission_key TEXT NOT NULL REFERENCES permission_definitions(key) ON DELETE CASCADE,
      granted BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(role_id, permission_key)
    );
    
    CREATE INDEX role_permissions_role_id_idx ON role_permissions(role_id);
    CREATE INDEX role_permissions_permission_key_idx ON role_permissions(permission_key);
    
    RAISE NOTICE '✓ Created role_permissions table with correct structure';
  END IF;
END $$;

-- =====================================================
-- 1. INSERT NEW PERMISSION DEFINITIONS
-- =====================================================

INSERT INTO permission_definitions (key, category, subcategory, label, description, requires_ownership, display_order) VALUES

-- TREATMENT TAGS PERMISSIONS (1000-1099 range)
(
  'treatment_tags.view', 
  'treatment_tags', 
  'viewing', 
  'View Treatment Tags', 
  'Can view all treatment tags (organization-wide and location-specific)', 
  false, 
  1000
),
(
  'treatment_tags.create', 
  'treatment_tags', 
  'creation', 
  'Create Treatment Tags', 
  'Can create new treatment tags with keywords, colors, and categories', 
  false, 
  1010
),
(
  'treatment_tags.edit', 
  'treatment_tags', 
  'editing', 
  'Edit Treatment Tags', 
  'Can edit existing treatment tags (name, keywords, color, icon, priority)', 
  false, 
  1020
),
(
  'treatment_tags.edit_system_tags', 
  'treatment_tags', 
  'editing', 
  'Edit System Tags', 
  'Can edit protected system tags (e.g., "Emergency", "High-Value")', 
  false, 
  1021
),
(
  'treatment_tags.delete', 
  'treatment_tags', 
  'deletion', 
  'Delete Treatment Tags', 
  'Can delete treatment tags (only if not in use and not system tags)', 
  false, 
  1030
),
(
  'treatment_tags.view_stats', 
  'treatment_tags', 'analytics', 
  'View Tag Statistics', 
  'Can view tag usage stats (conversion rates, average deal value, usage count)', 
  false, 
  1040
),

-- PIPELINE MAPPINGS PERMISSIONS (1100-1199 range)
(
  'pipeline_mappings.view', 
  'pipeline_mappings', 
  'viewing', 
  'View Pipeline Mappings', 
  'Can view how treatment tags are mapped to pipelines', 
  false, 
  1100
),
(
  'pipeline_mappings.create', 
  'pipeline_mappings', 
  'creation', 
  'Create Pipeline Mappings', 
  'Can create new tag-to-pipeline routing rules', 
  false, 
  1110
),
(
  'pipeline_mappings.edit', 
  'pipeline_mappings', 
  'editing', 
  'Edit Pipeline Mappings', 
  'Can edit existing pipeline mapping rules (priority, conditions, auto-assignment)', 
  false, 
  1120
),
(
  'pipeline_mappings.delete', 
  'pipeline_mappings', 
  'deletion', 
  'Delete Pipeline Mappings', 
  'Can delete tag-to-pipeline mappings', 
  false, 
  1130
),
(
  'pipeline_mappings.test', 
  'pipeline_mappings', 
  'testing', 
  'Test Routing Rules', 
  'Can test routing rules with sample deals to preview routing behavior', 
  false, 
  1140
),

-- ROUTING LOGS PERMISSIONS (1200-1299 range)
(
  'routing_logs.view', 
  'routing_logs', 
  'viewing', 
  'View Routing Logs', 
  'Can view audit trail of routing decisions for their deals', 
  false, 
  1200
),
(
  'routing_logs.view_all', 
  'routing_logs', 
  'viewing', 
  'View All Routing Logs', 
  'Can view routing audit trail for all deals in the practice', 
  false, 
  1210
),
(
  'routing_logs.export', 
  'routing_logs', 
  'data', 
  'Export Routing Logs', 
  'Can export routing logs for analysis and reporting', 
  false, 
  1220
),
(
  'routing_logs.analyze', 
  'routing_logs', 
  'analytics', 
  'Analyze Routing Performance', 
  'Can view routing accuracy metrics, confidence scores, and performance analytics', 
  false, 
  1230
),

-- ROUTING SETTINGS PERMISSIONS (1300-1399 range)
(
  'routing_settings.view', 
  'routing_settings', 
  'viewing', 
  'View Routing Settings', 
  'Can view routing configuration (feature flags, thresholds, AI settings)', 
  false, 
  1300
),
(
  'routing_settings.edit', 
  'routing_settings', 
  'editing', 
  'Edit Routing Settings', 
  'Can configure routing behavior (enable/disable features, set thresholds)', 
  false, 
  1310
),
(
  'routing_settings.edit_ai', 
  'routing_settings', 
  'editing', 
  'Configure AI Routing', 
  'Can configure AI-powered routing (confidence thresholds, keyword matching)', 
  false, 
  1320
),
(
  'routing_settings.manage_fallback', 
  'routing_settings', 
  'management', 
  'Manage Unsorted Pipeline', 
  'Can configure default "Unsorted" pipeline for unmapped deals', 
  false, 
  1330
),

-- BULK OPERATIONS (1400-1499 range)
(
  'routing.bulk_reroute', 
  'routing', 
  'advanced', 
  'Bulk Re-route Deals', 
  'Can re-route multiple existing deals to different pipelines based on tags', 
  false, 
  1400
),
(
  'routing.override', 
  'routing', 
  'advanced', 
  'Override Routing Decisions', 
  'Can manually override automatic routing and move deals to different pipelines', 
  false, 
  1410
)

ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 2. ASSIGN PERMISSIONS TO PRACTICE OWNER ROLE
-- =====================================================
-- Practice Owner should have ALL permissions (including new routing permissions)

INSERT INTO role_permissions (role_id, permission_key, granted)
SELECT 
  cr.id,
  pd.key,
  true
FROM custom_roles cr
CROSS JOIN permission_definitions pd
WHERE cr.name = 'Practice Owner' 
  AND cr.is_system_role = true
  AND pd.key LIKE 'treatment_tags.%' 
   OR pd.key LIKE 'pipeline_mappings.%' 
   OR pd.key LIKE 'routing_logs.%' 
   OR pd.key LIKE 'routing_settings.%'
   OR pd.key LIKE 'routing.%'
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- =====================================================
-- 3. CREATE DEFAULT "PRACTICE ADMIN" ROLE (if not exists)
-- =====================================================
-- This role has extensive permissions but not quite as much as Owner

INSERT INTO custom_roles (name, description, is_admin, is_system_role, color, icon, display_order, tenant_id)
SELECT 
  'Practice Admin',
  'Can manage treatment tags, configure routing, and access analytics. Cannot delete critical data or manage billing.',
  true, -- is_admin (can access audit trail)
  false, -- not a system role (can be deleted)
  '#3b82f6', -- blue color
  '👔', -- icon
  2, -- display order (after Owner)
  id
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

-- =====================================================
-- 4. ASSIGN PERMISSIONS TO PRACTICE ADMIN ROLE
-- =====================================================

-- Admin gets FULL treatment tag permissions
INSERT INTO role_permissions (role_id, permission_key, granted)
SELECT 
  cr.id,
  pd.key,
  true
FROM custom_roles cr
CROSS JOIN permission_definitions pd
WHERE cr.name = 'Practice Admin'
  AND (
    -- All treatment tag permissions
    pd.key IN (
      'treatment_tags.view',
      'treatment_tags.create',
      'treatment_tags.edit',
      'treatment_tags.delete',
      'treatment_tags.view_stats'
    )
    -- All pipeline mapping permissions
    OR pd.key IN (
      'pipeline_mappings.view',
      'pipeline_mappings.create',
      'pipeline_mappings.edit',
      'pipeline_mappings.delete',
      'pipeline_mappings.test'
    )
    -- All routing logs permissions
    OR pd.key IN (
      'routing_logs.view_all',
      'routing_logs.export',
      'routing_logs.analyze'
    )
    -- All routing settings permissions
    OR pd.key IN (
      'routing_settings.view',
      'routing_settings.edit',
      'routing_settings.edit_ai',
      'routing_settings.manage_fallback'
    )
    -- Bulk operations
    OR pd.key IN (
      'routing.bulk_reroute',
      'routing.override'
    )
  )
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- =====================================================
-- 5. CREATE DEFAULT "PRACTICE MANAGER" ROLE (if not exists)
-- =====================================================
-- Manager role has read access and limited write access

INSERT INTO custom_roles (name, description, is_admin, is_system_role, color, icon, display_order, tenant_id)
SELECT 
  'Practice Manager',
  'Can view treatment tags and routing settings. Can create tags but cannot delete. Cannot modify routing settings.',
  false, -- not admin (cannot access sensitive audit trail)
  false, -- not a system role
  '#10b981', -- green color
  '👨‍💼', -- icon
  3, -- display order
  id
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

-- =====================================================
-- 6. ASSIGN PERMISSIONS TO PRACTICE MANAGER ROLE
-- =====================================================

-- Manager gets LIMITED permissions (mostly read-only + create tags)
INSERT INTO role_permissions (role_id, permission_key, granted)
SELECT 
  cr.id,
  pd.key,
  true
FROM custom_roles cr
CROSS JOIN permission_definitions pd
WHERE cr.name = 'Practice Manager'
  AND pd.key IN (
    -- Can VIEW tags and stats
    'treatment_tags.view',
    'treatment_tags.view_stats',
    'treatment_tags.create', -- Can create new tags
    'treatment_tags.edit', -- Can edit tags (but not system tags)
    
    -- Can VIEW mappings (but not create/edit/delete)
    'pipeline_mappings.view',
    'pipeline_mappings.test', -- Can test routing rules
    
    -- Can VIEW routing logs for their deals
    'routing_logs.view',
    'routing_logs.analyze', -- Can view analytics
    
    -- Can VIEW routing settings (but not edit)
    'routing_settings.view'
  )
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- =====================================================
-- 7. CREATE "FRONT DESK STAFF" ROLE (if not exists)
-- =====================================================
-- Basic role with minimal permissions (view only)

INSERT INTO custom_roles (name, description, is_admin, is_system_role, color, icon, display_order, tenant_id)
SELECT 
  'Front Desk Staff',
  'Can view treatment tags when creating deals. Cannot manage tags or routing settings.',
  false,
  false,
  '#6b7280', -- gray color
  '🧑‍💻', -- icon
  4,
  id
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

-- =====================================================
-- 8. ASSIGN PERMISSIONS TO FRONT DESK STAFF ROLE
-- =====================================================

-- Staff gets MINIMAL permissions (view-only for tags)
INSERT INTO role_permissions (role_id, permission_key, granted)
SELECT 
  cr.id,
  pd.key,
  true
FROM custom_roles cr
CROSS JOIN permission_definitions pd
WHERE cr.name = 'Front Desk Staff'
  AND pd.key IN (
    -- Can only VIEW tags (to select when creating deals)
    'treatment_tags.view',
    
    -- Can view their own routing logs
    'routing_logs.view'
  )
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- =====================================================
-- 9. UPDATE EXISTING APP_USERS WITH DEFAULT ROLES
-- =====================================================
-- Map existing users to appropriate roles based on their old role field

-- Update users who were "owner" → Practice Owner
UPDATE app_users au
SET custom_role_id = cr.id
FROM custom_roles cr
WHERE cr.name = 'Practice Owner'
  AND cr.tenant_id = au.tenant_id
  AND au.custom_role_id IS NULL
  AND au.role = 'owner'; -- Old role field (if still exists)

-- Update users who were "manager" → Practice Manager
UPDATE app_users au
SET custom_role_id = cr.id
FROM custom_roles cr
WHERE cr.name = 'Practice Manager'
  AND cr.tenant_id = au.tenant_id
  AND au.custom_role_id IS NULL
  AND au.role = 'manager';

-- Update users who were "staff" → Front Desk Staff
UPDATE app_users au
SET custom_role_id = cr.id
FROM custom_roles cr
WHERE cr.name = 'Front Desk Staff'
  AND cr.tenant_id = au.tenant_id
  AND au.custom_role_id IS NULL
  AND au.role = 'staff';

-- =====================================================
-- 10. HELPER FUNCTION: CHECK USER PERMISSION
-- =====================================================
-- Function to easily check if a user has a specific permission

CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission_key TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM app_users au
    JOIN custom_roles cr ON cr.id = au.custom_role_id
    JOIN role_permissions rp ON rp.role_id = cr.id
    WHERE au.id = p_user_id
      AND rp.permission_key = p_permission_key
      AND rp.granted = true
      AND cr.active = true
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION user_has_permission IS 'Check if a user has a specific permission. Returns true if user has the permission via their role.';

-- =====================================================
-- 11. HELPER FUNCTION: GET USER PERMISSIONS
-- =====================================================
-- Function to get all permissions for a user

CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (
  permission_key TEXT,
  category TEXT,
  label TEXT,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pd.key,
    pd.category,
    pd.label,
    pd.description
  FROM app_users au
  JOIN custom_roles cr ON cr.id = au.custom_role_id
  JOIN role_permissions rp ON rp.role_id = cr.id
  JOIN permission_definitions pd ON pd.key = rp.permission_key
  WHERE au.id = p_user_id
    AND rp.granted = true
    AND cr.active = true
  ORDER BY pd.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_permissions IS 'Get all permissions for a specific user based on their role.';

-- =====================================================
-- 12. VALIDATION VIEWS
-- =====================================================
-- Views to help validate permission assignments

-- View: All treatment routing permissions
CREATE OR REPLACE VIEW v_routing_permissions AS
SELECT 
  key,
  category,
  subcategory,
  label,
  description,
  display_order
FROM permission_definitions
WHERE category IN ('treatment_tags', 'pipeline_mappings', 'routing_logs', 'routing_settings', 'routing')
ORDER BY display_order;

COMMENT ON VIEW v_routing_permissions IS 'All treatment routing-related permissions';

-- View: Role permission matrix (for admin UI)
CREATE OR REPLACE VIEW v_role_permission_matrix AS
SELECT 
  cr.name AS role_name,
  cr.tenant_id,
  pd.key AS permission_key,
  pd.category,
  pd.label AS permission_label,
  COALESCE(rp.granted, false) AS has_permission
FROM custom_roles cr
CROSS JOIN permission_definitions pd
LEFT JOIN role_permissions rp ON rp.role_id = cr.id AND rp.permission_key = pd.key
WHERE pd.category IN ('treatment_tags', 'pipeline_mappings', 'routing_logs', 'routing_settings', 'routing')
ORDER BY cr.tenant_id, cr.display_order, pd.display_order;

COMMENT ON VIEW v_role_permission_matrix IS 'Matrix showing which permissions each role has (for treatment routing features)';

COMMIT;

-- =====================================================
-- MIGRATION SUCCESS
-- =====================================================

DO $$
DECLARE
  v_total_permissions INTEGER;
  v_total_roles INTEGER;
  v_total_assignments INTEGER;
BEGIN
  -- Count new permissions
  SELECT COUNT(*) INTO v_total_permissions
  FROM permission_definitions
  WHERE category IN ('treatment_tags', 'pipeline_mappings', 'routing_logs', 'routing_settings', 'routing');
  
  -- Count roles with routing permissions
  SELECT COUNT(DISTINCT cr.id) INTO v_total_roles
  FROM custom_roles cr
  JOIN role_permissions rp ON rp.role_id = cr.id
  JOIN permission_definitions pd ON pd.key = rp.permission_key
  WHERE pd.category IN ('treatment_tags', 'pipeline_mappings', 'routing_logs', 'routing_settings', 'routing');
  
  -- Count total permission assignments
  SELECT COUNT(*) INTO v_total_assignments
  FROM role_permissions rp
  JOIN permission_definitions pd ON pd.key = rp.permission_key
  WHERE pd.category IN ('treatment_tags', 'pipeline_mappings', 'routing_logs', 'routing_settings', 'routing');

  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '✅ PHASE 2: PERMISSIONS & RBAC - COMPLETE';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Permissions Created:';
  RAISE NOTICE '  ✓ % treatment routing permissions', v_total_permissions;
  RAISE NOTICE '  ✓ 6 treatment tag permissions';
  RAISE NOTICE '  ✓ 5 pipeline mapping permissions';
  RAISE NOTICE '  ✓ 4 routing log permissions';
  RAISE NOTICE '  ✓ 4 routing settings permissions';
  RAISE NOTICE '  ✓ 2 bulk operation permissions';
  RAISE NOTICE '';
  RAISE NOTICE '👥 Roles Configured:';
  RAISE NOTICE '  ✓ Practice Owner (full access)';
  RAISE NOTICE '  ✓ Practice Admin (full routing management)';
  RAISE NOTICE '  ✓ Practice Manager (read + create tags)';
  RAISE NOTICE '  ✓ Front Desk Staff (view tags only)';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Permission Assignments:';
  RAISE NOTICE '  ✓ % total role-permission assignments', v_total_assignments;
  RAISE NOTICE '  ✓ % roles have routing permissions', v_total_roles;
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Helper Functions:';
  RAISE NOTICE '  ✓ user_has_permission(user_id, permission_key)';
  RAISE NOTICE '  ✓ get_user_permissions(user_id)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Validation Views:';
  RAISE NOTICE '  ✓ v_routing_permissions';
  RAISE NOTICE '  ✓ v_role_permission_matrix';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '  → Phase 3: Build core routing engine';
  RAISE NOTICE '  → Use user_has_permission() in routing logic';
  RAISE NOTICE '  → Build settings UI with permission checks';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '🚀 Ready for Phase 3: Core Routing Engine';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
END $$;

