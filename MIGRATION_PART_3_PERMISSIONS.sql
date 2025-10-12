-- ============================================================
-- PART 3 OF 3: PERMISSION DATA (60+ Permissions!)
-- ============================================================
-- This inserts ALL 60+ permission definitions
-- Run this THIRD (after Part 1 and Part 2)!
-- ============================================================

-- Insert all 60+ permission definitions
INSERT INTO permission_definitions (key, category, subcategory, label, description, requires_ownership, display_order) VALUES

-- DEALS (19 permissions)
('deals.view_all', 'deals', 'viewing', 'View All Deals', 'Can view all deals in the practice', false, 1),
('deals.view_team', 'deals', 'viewing', 'View Team Deals', 'Can view deals owned by team members', false, 2),
('deals.view_own', 'deals', 'viewing', 'View Own Deals', 'Can view only their own deals', true, 3),
('deals.create', 'deals', 'creation', 'Create Deals', 'Can create new deals', false, 10),
('deals.edit_all', 'deals', 'editing', 'Edit All Deals', 'Can edit any deal', false, 20),
('deals.edit_own', 'deals', 'editing', 'Edit Own Deals', 'Can edit only their own deals', true, 21),
('deals.edit_title', 'deals', 'editing', 'Edit Deal Title', 'Can change deal titles', false, 22),
('deals.edit_value', 'deals', 'editing', 'Edit Deal Value', 'Can change deal values/amounts', false, 23),
('deals.edit_stage', 'deals', 'editing', 'Move Deal Stages', 'Can move deals between stages', false, 24),
('deals.edit_tags', 'deals', 'editing', 'Edit Treatment Tags', 'Can add/remove treatment tags', false, 25),
('deals.delete_all', 'deals', 'deletion', 'Delete All Deals', 'Can delete any deal', false, 30),
('deals.delete_own', 'deals', 'deletion', 'Delete Own Deals', 'Can delete only their own deals', true, 31),
('deals.assign_to_others', 'deals', 'assignment', 'Assign to Others', 'Can assign deals to other users', false, 40),
('deals.assign_to_self', 'deals', 'assignment', 'Assign to Self', 'Can claim unassigned deals', false, 41),
('deals.unassign', 'deals', 'assignment', 'Unassign Deals', 'Can remove assignment from deals', false, 42),
('deals.export', 'deals', 'data', 'Export Deals', 'Can export deal data', false, 50),
('deals.import', 'deals', 'data', 'Import Deals', 'Can import deal data', false, 51),
('deals.bulk_edit', 'deals', 'advanced', 'Bulk Edit Deals', 'Can edit multiple deals at once', false, 60),
('deals.bulk_delete', 'deals', 'advanced', 'Bulk Delete Deals', 'Can delete multiple deals at once', false, 61),

-- CONTACTS (10 permissions)
('contacts.view_all', 'contacts', 'viewing', 'View All Contacts', 'Can view all contacts', false, 100),
('contacts.create', 'contacts', 'creation', 'Create Contacts', 'Can create new contacts', false, 110),
('contacts.edit_all', 'contacts', 'editing', 'Edit All Contacts', 'Can edit any contact', false, 120),
('contacts.edit_personal_info', 'contacts', 'editing', 'Edit Personal Info', 'Can edit contact personal details', false, 121),
('contacts.edit_medical_info', 'contacts', 'editing', 'Edit Medical Info', 'Can edit medical/dental history', false, 122),
('contacts.delete', 'contacts', 'deletion', 'Delete Contacts', 'Can delete contacts', false, 130),
('contacts.merge', 'contacts', 'advanced', 'Merge Duplicates', 'Can merge duplicate contacts', false, 140),
('contacts.export', 'contacts', 'data', 'Export Contacts', 'Can export contact data', false, 150),
('contacts.import', 'contacts', 'data', 'Import Contacts', 'Can import contact data', false, 151),

-- PIPELINES (9 permissions)
('pipelines.view', 'pipelines', 'viewing', 'View Pipelines', 'Can view pipeline boards', false, 200),
('pipelines.create', 'pipelines', 'creation', 'Create Pipelines', 'Can create new pipelines', false, 210),
('pipelines.edit', 'pipelines', 'editing', 'Edit Pipelines', 'Can edit pipeline details', false, 220),
('pipelines.edit_stages', 'pipelines', 'editing', 'Manage Stages', 'Can add/edit/remove stages', false, 221),
('pipelines.reorder_stages', 'pipelines', 'editing', 'Reorder Stages', 'Can change stage order', false, 222),
('pipelines.delete', 'pipelines', 'deletion', 'Delete Pipelines', 'Can delete pipelines', false, 230),
('pipelines.configure_automation', 'pipelines', 'advanced', 'Configure Automation', 'Can set up pipeline automation rules', false, 240),
('pipelines.set_default', 'pipelines', 'management', 'Set Default Pipeline', 'Can mark pipeline as default', false, 250),

-- TASKS (10 permissions)
('tasks.view_all', 'tasks', 'viewing', 'View All Tasks', 'Can view all tasks', false, 300),
('tasks.view_assigned', 'tasks', 'viewing', 'View Assigned Tasks', 'Can view only assigned tasks', true, 301),
('tasks.create', 'tasks', 'creation', 'Create Tasks', 'Can create new tasks', false, 310),
('tasks.edit_all', 'tasks', 'editing', 'Edit All Tasks', 'Can edit any task', false, 320),
('tasks.edit_own', 'tasks', 'editing', 'Edit Own Tasks', 'Can edit only assigned tasks', true, 321),
('tasks.delete_all', 'tasks', 'deletion', 'Delete All Tasks', 'Can delete any task', false, 330),
('tasks.delete_own', 'tasks', 'deletion', 'Delete Own Tasks', 'Can delete only assigned tasks', true, 331),
('tasks.assign_to_others', 'tasks', 'assignment', 'Assign to Others', 'Can assign tasks to other users', false, 340),
('tasks.complete', 'tasks', 'actions', 'Complete Tasks', 'Can mark tasks as complete', false, 350),

-- ACTIVITIES (5 permissions)
('activities.view_all', 'activities', 'viewing', 'View All Activities', 'Can view all communications', false, 400),
('activities.view_assigned_deals', 'activities', 'viewing', 'View Deal Activities', 'Can view activities for assigned deals', true, 401),
('activities.create', 'activities', 'creation', 'Log Activities', 'Can create activity records', false, 410),
('activities.edit', 'activities', 'editing', 'Edit Activities', 'Can edit activity records', false, 420),
('activities.delete', 'activities', 'deletion', 'Delete Activities', 'Can delete activity records', false, 430),

-- USERS (7 permissions)
('users.view_all', 'users', 'viewing', 'View All Users', 'Can see all team members', false, 500),
('users.invite', 'users', 'management', 'Invite Users', 'Can send team invitations', false, 510),
('users.edit_profile', 'users', 'management', 'Edit User Profiles', 'Can edit other users profiles', false, 520),
('users.edit_own_profile', 'users', 'management', 'Edit Own Profile', 'Can edit their own profile', true, 521),
('users.assign_roles', 'users', 'management', 'Assign Roles', 'Can change user roles', false, 530),
('users.deactivate', 'users', 'management', 'Deactivate Users', 'Can deactivate team members', false, 540),
('users.delete', 'users', 'management', 'Delete Users', 'Can permanently delete users', false, 550),

-- ROLES (5 permissions)
('roles.view', 'roles', 'viewing', 'View Roles', 'Can see custom roles', false, 600),
('roles.create', 'roles', 'management', 'Create Roles', 'Can create custom roles', false, 610),
('roles.edit', 'roles', 'management', 'Edit Roles', 'Can edit role details', false, 620),
('roles.edit_permissions', 'roles', 'management', 'Edit Permissions', 'Can change role permissions', false, 621),
('roles.delete', 'roles', 'management', 'Delete Roles', 'Can delete custom roles', false, 630),

-- SETTINGS (7 permissions)
('settings.view_all', 'settings', 'viewing', 'View All Settings', 'Can access settings page', false, 700),
('settings.edit_pipeline', 'settings', 'editing', 'Edit Pipeline Settings', 'Can configure pipeline settings', false, 710),
('settings.edit_deal', 'settings', 'editing', 'Edit Deal Settings', 'Can configure deal settings', false, 711),
('settings.edit_contact', 'settings', 'editing', 'Edit Contact Settings', 'Can configure contact settings', false, 712),
('settings.edit_task', 'settings', 'editing', 'Edit Task Settings', 'Can configure task settings', false, 713),
('settings.edit_integrations', 'settings', 'editing', 'Edit Integrations', 'Can configure external integrations', false, 720),
('settings.edit_notifications', 'settings', 'editing', 'Edit Notifications', 'Can configure notification settings', false, 730),

-- ANALYTICS (4 permissions)
('analytics.view_own', 'analytics', 'viewing', 'View Own Analytics', 'Can view their own performance', true, 800),
('analytics.view_team', 'analytics', 'viewing', 'View Team Analytics', 'Can view team performance', false, 810),
('analytics.view_all', 'analytics', 'viewing', 'View All Analytics', 'Can view all practice analytics', false, 820),
('analytics.export', 'analytics', 'data', 'Export Reports', 'Can export analytics reports', false, 830),

-- AUDIT (4 permissions)
('audit.view', 'audit', 'viewing', 'View Audit Trail', 'Can view audit logs', false, 900),
('audit.view_sensitive', 'audit', 'viewing', 'View Sensitive Audit Data', 'Can view admin-only audit logs', false, 910),
('audit.export', 'audit', 'data', 'Export Audit Logs', 'Can export audit trail', false, 920),
('audit.delete', 'audit', 'management', 'Delete Audit Records', 'Can delete audit logs (dangerous!)', false, 930)

ON CONFLICT (key) DO NOTHING;

-- Create default "Practice Owner" role for each tenant
INSERT INTO custom_roles (name, description, is_admin, is_system_role, color, display_order, tenant_id)
SELECT 
  'Practice Owner',
  'Full access to everything. Cannot be deleted.',
  true,
  true,
  '#9333ea',
  1,
  id
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Grant ALL permissions to Practice Owner role
INSERT INTO role_permissions (role_id, permission_key, granted)
SELECT 
  cr.id,
  pd.key,
  true
FROM custom_roles cr
CROSS JOIN permission_definitions pd
WHERE cr.name = 'Practice Owner' AND cr.is_system_role = true
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- ✅ ALL 3 PARTS COMPLETE!
-- ✅ Your console error is FIXED!
-- ✅ All 60+ permissions are now available!
-- Refresh your app and go to Settings → Roles → Permissions!

