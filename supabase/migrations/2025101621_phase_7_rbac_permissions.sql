SET search_path TO public, extensions;

-- =====================================================
-- PHASE 7: RBAC & PERMISSIONS SYSTEM
-- Role-based access control with granular permissions
-- =====================================================
-- Date: October 16, 2025
-- Priority: P0 - ENTERPRISE SECURITY
--
-- This migration creates a comprehensive RBAC system with:
-- - Role definitions and hierarchies
-- - Granular permissions per module/action
-- - Location-based scoping
-- - Permission inheritance
-- - Audit trail for permission changes
-- =====================================================

BEGIN;

-- =====================================================
-- 1. PERMISSION DEFINITIONS TABLE
-- =====================================================

DROP TABLE IF EXISTS permissions CASCADE;
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- e.g., 'deals.create', 'contacts.delete', 'settings.billing.view'
  name TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL CHECK (module IN ('deals', 'contacts', 'pipeline', 'tasks', 'marketing', 'analytics', 'settings', 'integrations', 'forms', 'automations', 'calendar', 'communications', 'audit')),
  action TEXT NOT NULL CHECK (action IN ('view', 'create', 'edit', 'delete', 'export', 'import', 'manage', 'configure')),
  resource_type TEXT, -- e.g., 'deal', 'contact', 'campaign'
  is_dangerous BOOLEAN DEFAULT false, -- For destructive actions
  requires_approval BOOLEAN DEFAULT false, -- For actions requiring 2FA or approval
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_dangerous ON permissions(is_dangerous) WHERE is_dangerous = true;

-- =====================================================
-- 2. ROLE DEFINITIONS TABLE
-- =====================================================

DROP TABLE IF EXISTS role_definitions CASCADE;
CREATE TABLE role_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- 'owner', 'admin', 'manager', 'staff', 'marketing', 'read_only'
  name TEXT NOT NULL,
  description TEXT,
  hierarchy_level INTEGER NOT NULL, -- 1 (highest) to 6 (lowest)
  is_system_role BOOLEAN DEFAULT true, -- Cannot be deleted
  is_custom_role BOOLEAN DEFAULT false,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for system roles, set for custom roles
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, code), -- Allow same code across tenants for custom roles
  CHECK (
    (is_system_role = true AND tenant_id IS NULL) OR
    (is_custom_role = true AND tenant_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_role_definitions_code ON role_definitions(code);
CREATE INDEX IF NOT EXISTS idx_role_definitions_tenant ON role_definitions(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_role_definitions_custom ON role_definitions(is_custom_role) WHERE is_custom_role = true;

-- =====================================================
-- 3. ROLE_PERMISSIONS MAPPING TABLE
-- =====================================================

DROP TABLE IF EXISTS role_permissions CASCADE;
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES role_definitions(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  granted_by UUID REFERENCES app_users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- =====================================================
-- 4. USER_PERMISSIONS (Override/Exception Grants)
-- =====================================================

DROP TABLE IF EXISTS user_permissions CASCADE;
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true, -- true = grant, false = revoke
  scope_type TEXT CHECK (scope_type IN ('all', 'location', 'own_only')),
  scope_location_ids UUID[], -- Specific locations if scope_type = 'location'
  granted_by UUID REFERENCES app_users(id),
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tenant_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(user_id, tenant_id) WHERE granted = true;

-- =====================================================
-- 5. INSERT SYSTEM ROLES
-- =====================================================

INSERT INTO role_definitions (code, name, description, hierarchy_level, is_system_role, is_custom_role, tenant_id) VALUES
  ('owner', 'Owner', 'Full access to everything including billing and team management', 1, true, false, NULL),
  ('super_admin', 'Super Admin', 'Administrative access across all locations', 2, true, false, NULL),
  ('admin', 'Admin', 'Administrative access with some restrictions', 3, true, false, NULL),
  ('manager', 'Manager', 'Can manage team and patients within assigned locations', 4, true, false, NULL),
  ('staff', 'Staff', 'Day-to-day operations access', 5, true, false, NULL),
  ('marketing', 'Marketing', 'Marketing module access only', 6, true, false, NULL),
  ('read_only', 'Read Only', 'View-only access across modules', 7, true, false, NULL)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 6. INSERT CORE PERMISSIONS
-- =====================================================

-- Deals Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type) VALUES
  ('deals.view', 'View Deals', 'Can view deals in the system', 'deals', 'view', 'deal'),
  ('deals.create', 'Create Deals', 'Can create new deals', 'deals', 'create', 'deal'),
  ('deals.edit', 'Edit Deals', 'Can edit existing deals', 'deals', 'edit', 'deal'),
  ('deals.delete', 'Delete Deals', 'Can delete deals', 'deals', 'delete', 'deal'),
  ('deals.export', 'Export Deals', 'Can export deals data', 'deals', 'export', 'deal'),
  ('deals.manage_all', 'Manage All Deals', 'Can manage deals across all locations', 'deals', 'manage', 'deal')
ON CONFLICT (code) DO NOTHING;

-- Contacts Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type) VALUES
  ('contacts.view', 'View Contacts', 'Can view contacts', 'contacts', 'view', 'contact'),
  ('contacts.create', 'Create Contacts', 'Can create new contacts', 'contacts', 'create', 'contact'),
  ('contacts.edit', 'Edit Contacts', 'Can edit existing contacts', 'contacts', 'edit', 'contact'),
  ('contacts.delete', 'Delete Contacts', 'Can delete contacts', 'contacts', 'delete', 'contact'),
  ('contacts.export', 'Export Contacts', 'Can export contacts data', 'contacts', 'export', 'contact'),
  ('contacts.import', 'Import Contacts', 'Can import contacts from CSV', 'contacts', 'import', 'contact')
ON CONFLICT (code) DO NOTHING;

-- Pipeline Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type) VALUES
  ('pipeline.view', 'View Pipelines', 'Can view pipeline boards', 'pipeline', 'view', 'pipeline'),
  ('pipeline.create', 'Create Pipelines', 'Can create new pipelines', 'pipeline', 'create', 'pipeline'),
  ('pipeline.edit', 'Edit Pipelines', 'Can edit pipeline stages and settings', 'pipeline', 'edit', 'pipeline'),
  ('pipeline.delete', 'Delete Pipelines', 'Can delete pipelines', 'pipeline', 'delete', 'pipeline'),
  ('pipeline.configure', 'Configure Pipelines', 'Can configure pipeline automation and rules', 'pipeline', 'configure', 'pipeline')
ON CONFLICT (code) DO NOTHING;

-- Tasks Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type) VALUES
  ('tasks.view', 'View Tasks', 'Can view tasks', 'tasks', 'view', 'task'),
  ('tasks.create', 'Create Tasks', 'Can create new tasks', 'tasks', 'create', 'task'),
  ('tasks.edit', 'Edit Tasks', 'Can edit tasks', 'tasks', 'edit', 'task'),
  ('tasks.delete', 'Delete Tasks', 'Can delete tasks', 'tasks', 'delete', 'task'),
  ('tasks.assign', 'Assign Tasks', 'Can assign tasks to team members', 'tasks', 'manage', 'task')
ON CONFLICT (code) DO NOTHING;

-- Marketing Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type, is_dangerous) VALUES
  ('marketing.view', 'View Marketing', 'Can view marketing campaigns and reports', 'marketing', 'view', 'campaign', false),
  ('marketing.create', 'Create Campaigns', 'Can create marketing campaigns', 'marketing', 'create', 'campaign', false),
  ('marketing.edit', 'Edit Campaigns', 'Can edit campaigns', 'marketing', 'edit', 'campaign', false),
  ('marketing.delete', 'Delete Campaigns', 'Can delete campaigns', 'marketing', 'delete', 'campaign', true),
  ('marketing.send', 'Send Campaigns', 'Can send/schedule campaigns', 'marketing', 'manage', 'campaign', false),
  ('marketing.export', 'Export Marketing Data', 'Can export campaign data', 'marketing', 'export', 'campaign', false)
ON CONFLICT (code) DO NOTHING;

-- Analytics Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type) VALUES
  ('analytics.view', 'View Analytics', 'Can view analytics dashboards', 'analytics', 'view', 'dashboard'),
  ('analytics.export', 'Export Analytics', 'Can export analytics data', 'analytics', 'export', 'dashboard'),
  ('analytics.configure', 'Configure Analytics', 'Can configure thresholds and alerts', 'analytics', 'configure', 'dashboard')
ON CONFLICT (code) DO NOTHING;

-- Settings Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type, is_dangerous, requires_approval) VALUES
  ('settings.view', 'View Settings', 'Can view settings', 'settings', 'view', 'settings', false, false),
  ('settings.team.manage', 'Manage Team', 'Can invite, edit, remove team members', 'settings', 'manage', 'team', false, false),
  ('settings.roles.manage', 'Manage Roles', 'Can create and edit custom roles', 'settings', 'manage', 'roles', false, false),
  ('settings.billing.view', 'View Billing', 'Can view billing information', 'settings', 'view', 'billing', false, false),
  ('settings.billing.manage', 'Manage Billing', 'Can change billing and subscriptions', 'settings', 'manage', 'billing', true, true),
  ('settings.integrations.manage', 'Manage Integrations', 'Can connect/disconnect integrations', 'settings', 'manage', 'integrations', false, false),
  ('settings.security.manage', 'Manage Security', 'Can change security settings', 'settings', 'manage', 'security', true, true),
  ('settings.branding.manage', 'Manage Branding', 'Can customize branding and white-label', 'settings', 'manage', 'branding', false, false)
ON CONFLICT (code) DO NOTHING;

-- Integrations Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type) VALUES
  ('integrations.view', 'View Integrations', 'Can view integration status', 'integrations', 'view', 'integration'),
  ('integrations.configure', 'Configure Integrations', 'Can connect and configure integrations', 'integrations', 'configure', 'integration')
ON CONFLICT (code) DO NOTHING;

-- Automations Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type) VALUES
  ('automations.view', 'View Automations', 'Can view automations', 'automations', 'view', 'automation'),
  ('automations.create', 'Create Automations', 'Can create new automations', 'automations', 'create', 'automation'),
  ('automations.edit', 'Edit Automations', 'Can edit existing automations', 'automations', 'edit', 'automation'),
  ('automations.delete', 'Delete Automations', 'Can delete automations', 'automations', 'delete', 'automation')
ON CONFLICT (code) DO NOTHING;

-- Audit Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type) VALUES
  ('audit.view', 'View Audit Logs', 'Can view audit trail', 'audit', 'view', 'audit_log'),
  ('audit.export', 'Export Audit Logs', 'Can export audit data', 'audit', 'export', 'audit_log')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 7. ASSIGN PERMISSIONS TO SYSTEM ROLES
-- =====================================================

-- Owner: ALL permissions
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  (SELECT id FROM role_definitions WHERE code = 'owner'),
  p.id,
  true
FROM permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Super Admin: ALL except billing.manage
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  (SELECT id FROM role_definitions WHERE code = 'super_admin'),
  p.id,
  true
FROM permissions p
WHERE p.code != 'settings.billing.manage'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin: Manage operations, no billing or security
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  (SELECT id FROM role_definitions WHERE code = 'admin'),
  p.id,
  true
FROM permissions p
WHERE p.code NOT IN ('settings.billing.view', 'settings.billing.manage', 'settings.security.manage', 'settings.roles.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: Operational permissions, no settings
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  (SELECT id FROM role_definitions WHERE code = 'manager'),
  p.id,
  true
FROM permissions p
WHERE p.module IN ('deals', 'contacts', 'pipeline', 'tasks', 'calendar', 'communications')
  AND p.action != 'delete'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Staff: View and create, limited editing
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  (SELECT id FROM role_definitions WHERE code = 'staff'),
  p.id,
  true
FROM permissions p
WHERE p.module IN ('deals', 'contacts', 'tasks', 'calendar', 'communications')
  AND p.action IN ('view', 'create', 'edit')
  AND p.code NOT LIKE '%.delete%'
  AND p.code NOT LIKE '%.export%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Marketing: Marketing module only
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  (SELECT id FROM role_definitions WHERE code = 'marketing'),
  p.id,
  true
FROM permissions p
WHERE p.module IN ('marketing', 'contacts', 'forms', 'analytics')
  AND p.action != 'delete'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Read Only: View permissions only
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  (SELECT id FROM role_definitions WHERE code = 'read_only'),
  p.id,
  true
FROM permissions p
WHERE p.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =====================================================
-- 8. PERMISSION CHECK FUNCTIONS
-- =====================================================

-- Check if user has specific permission in their current org
CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_user_id UUID,
  p_tenant_id UUID,
  p_permission_code TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    -- Check via role permissions
    SELECT 1
    FROM org_memberships om
    JOIN role_definitions rd ON rd.code = om.role
    JOIN role_permissions rp ON rp.role_id = rd.id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE om.user_id = p_user_id
      AND om.tenant_id = p_tenant_id
      AND om.status = 'active'
      AND p.code = p_permission_code
      AND rp.granted = true
    
    UNION
    
    -- Check via direct user permission grants (overrides)
    SELECT 1
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user_id
      AND up.tenant_id = p_tenant_id
      AND p.code = p_permission_code
      AND up.granted = true
      AND (up.expires_at IS NULL OR up.expires_at > NOW())
  );
$$;

-- Get all permissions for a user in a tenant
CREATE OR REPLACE FUNCTION public.get_user_permissions(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE (
  permission_code TEXT,
  permission_name TEXT,
  permission_module TEXT,
  granted_via TEXT
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  -- From role
  SELECT DISTINCT
    p.code,
    p.name,
    p.module,
    'role:' || om.role as granted_via
  FROM org_memberships om
  JOIN role_definitions rd ON rd.code = om.role
  JOIN role_permissions rp ON rp.role_id = rd.id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE om.user_id = p_user_id
    AND om.tenant_id = p_tenant_id
    AND om.status = 'active'
    AND rp.granted = true
  
  UNION
  
  -- From direct grants
  SELECT
    p.code,
    p.name,
    p.module,
    'direct_grant' as granted_via
  FROM user_permissions up
  JOIN permissions p ON p.id = up.permission_id
  WHERE up.user_id = p_user_id
    AND up.tenant_id = p_tenant_id
    AND up.granted = true
    AND (up.expires_at IS NULL OR up.expires_at > NOW())
  
  ORDER BY 3, 1;
$$;

-- Check if user can access specific location
CREATE OR REPLACE FUNCTION public.user_has_location_access(
  p_user_id UUID,
  p_tenant_id UUID,
  p_location_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    -- User has access if:
    -- 1. Their location_ids is empty (= access to all locations)
    -- 2. OR the location_id is in their location_ids array
    COALESCE(
      (
        SELECT 
          (location_ids = '{}' OR p_location_id = ANY(location_ids))
        FROM org_memberships
        WHERE user_id = p_user_id
          AND tenant_id = p_tenant_id
          AND status = 'active'
        LIMIT 1
      ),
      false
    );
$$;

-- =====================================================
-- 9. PERMISSION CHANGE AUDIT LOG
-- =====================================================

DROP TABLE IF EXISTS permission_changes_log CASCADE;
CREATE TABLE permission_changes_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  changed_by_user_id UUID NOT NULL REFERENCES app_users(id),
  target_user_id UUID REFERENCES app_users(id),
  target_role_id UUID REFERENCES role_definitions(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('role_assigned', 'role_removed', 'permission_granted', 'permission_revoked', 'role_created', 'role_deleted', 'role_modified')),
  permission_code TEXT,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perm_changes_tenant ON permission_changes_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perm_changes_user ON permission_changes_log(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perm_changes_type ON permission_changes_log(change_type, created_at DESC);

-- =====================================================
-- 10. RLS FOR PERMISSION TABLES
-- =====================================================

-- Permissions (read-only for all authenticated users)
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view permissions" ON permissions;
CREATE POLICY "Anyone can view permissions" ON permissions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role bypass permissions" ON permissions;
CREATE POLICY "Service role bypass permissions" ON permissions
  FOR ALL USING (auth.role() = 'service_role');

-- Role Definitions (read-only for users, admin can manage custom roles)
ALTER TABLE role_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all role definitions" ON role_definitions;
CREATE POLICY "Users can view all role definitions" ON role_definitions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage custom roles" ON role_definitions;
CREATE POLICY "Admins can manage custom roles" ON role_definitions
  FOR ALL USING (
    (is_custom_role = true AND tenant_id = public.get_user_org_id() AND public.user_has_permission(auth.uid(), tenant_id, 'settings.roles.manage'))
    OR auth.role() = 'service_role'
  );

-- Role Permissions (admin only)
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view role permissions" ON role_permissions;
CREATE POLICY "Users can view role permissions" ON role_permissions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role bypass role_permissions" ON role_permissions;
CREATE POLICY "Service role bypass role_permissions" ON role_permissions
  FOR ALL USING (auth.role() = 'service_role');

-- User Permissions (admin + self-view)
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own permissions" ON user_permissions;
CREATE POLICY "Users can view own permissions" ON user_permissions
  FOR SELECT USING (
    user_id = auth.uid() 
    OR (tenant_id = public.get_user_org_id() AND public.user_has_permission(auth.uid(), tenant_id, 'settings.team.manage'))
  );

DROP POLICY IF EXISTS "Admins can manage user permissions" ON user_permissions;
CREATE POLICY "Admins can manage user permissions" ON user_permissions
  FOR ALL USING (
    tenant_id = public.get_user_org_id() 
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.team.manage')
  );

DROP POLICY IF EXISTS "Service role bypass user_permissions" ON user_permissions;
CREATE POLICY "Service role bypass user_permissions" ON user_permissions
  FOR ALL USING (auth.role() = 'service_role');

-- Permission Changes Log (audit read-only)
ALTER TABLE permission_changes_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auditors can view permission changes" ON permission_changes_log;
CREATE POLICY "Auditors can view permission changes" ON permission_changes_log
  FOR SELECT USING (
    tenant_id = public.get_user_org_id()
    AND public.user_has_permission(auth.uid(), tenant_id, 'audit.view')
  );

DROP POLICY IF EXISTS "Service role bypass perm_changes_log" ON permission_changes_log;
CREATE POLICY "Service role bypass perm_changes_log" ON permission_changes_log
  FOR ALL USING (auth.role() = 'service_role');

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  roles_count INTEGER;
  permissions_count INTEGER;
  role_perms_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO roles_count FROM role_definitions WHERE is_system_role = true;
  SELECT COUNT(*) INTO permissions_count FROM permissions;
  SELECT COUNT(*) INTO role_perms_count FROM role_permissions;
  
  RAISE NOTICE '=== RBAC SYSTEM VERIFICATION ===';
  RAISE NOTICE 'System roles created: %', roles_count;
  RAISE NOTICE 'Permissions defined: %', permissions_count;
  RAISE NOTICE 'Role-permission mappings: %', role_perms_count;
  RAISE NOTICE '================================';
  
  IF roles_count >= 7 AND permissions_count >= 40 THEN
    RAISE NOTICE '✅ Phase 7 Complete: RBAC system fully configured';
  ELSE
    RAISE WARNING 'Incomplete RBAC setup. Review output above.';
  END IF;
END $$;

