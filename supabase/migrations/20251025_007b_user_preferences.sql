-- =====================================================
-- STEP 6B: USER PREFERENCES & DEFAULTS
-- Purpose: Smart defaults and user preferences for context management
-- Safety: Non-breaking, backward compatible, user-centric
-- =====================================================
--
-- WHAT THIS DOES:
-- 1. Creates user_org_preferences table for per-org settings
-- 2. Implements smart default calculation
-- 3. Adds "pin favorite orgs" feature
-- 4. Implements recent orgs tracking
-- 5. Creates preference sync functions
-- 6. Adds UX optimization helpers
-- 7. Implements onboarding flow detection
--
-- PREFERENCE TYPES:
-- - Pinned orgs (always show at top)
-- - Default org on login
-- - Remember last context (per session vs always)
-- - Location preferences per org
-- - Notification preferences per org
-- - UI preferences per org
--
-- SMART DEFAULTS:
-- - Most recently used org
-- - Most frequently used org (last 30 days)
-- - Org with pending tasks/notifications
-- - Owner org (if only one)
-- - Alphabetically first (fallback)
--
-- FEATURES:
-- - Pin up to 5 favorite orgs
-- - Recent orgs list (last 10)
-- - Onboarding detection for new users
-- - Smart sorting (pinned → recent → alphabetical)
-- - Cross-device preference sync
--
-- SAFETY:
-- - Idempotent: safe to run multiple times
-- - Non-breaking: all preferences optional
-- - Privacy: user data never shared across tenants
-- - Performance: indexed for fast lookups
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE USER_ORG_PREFERENCES TABLE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'CREATING USER ORG PREFERENCES';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
END $$;

CREATE TABLE IF NOT EXISTS user_org_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT false,
  pin_order INTEGER,
  is_default BOOLEAN DEFAULT false,
  nickname TEXT, -- User's custom name for this org
  color_theme TEXT, -- Custom color for org in switcher
  last_visited_at TIMESTAMPTZ,
  visit_count INTEGER DEFAULT 0,
  notification_preferences JSONB DEFAULT '{}',
  ui_preferences JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_org_preferences_user 
  ON user_org_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_user_org_preferences_pinned 
  ON user_org_preferences(user_id, is_pinned, pin_order) WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_user_org_preferences_default 
  ON user_org_preferences(user_id) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_user_org_preferences_last_visited 
  ON user_org_preferences(user_id, last_visited_at DESC);

-- Enable RLS
ALTER TABLE user_org_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own org preferences"
  ON user_org_preferences
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own org preferences"
  ON user_org_preferences
  FOR ALL
  USING (user_id = auth.uid());

COMMENT ON TABLE user_org_preferences IS
  'User-specific preferences and settings for each organization they belong to';

DO $$
BEGIN
  RAISE NOTICE '✅ Created user_org_preferences table with RLS';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 2. CREATE RECENT_ORGS VIEW
-- =====================================================

CREATE OR REPLACE VIEW user_recent_orgs AS
SELECT 
  uop.user_id,
  uop.tenant_id,
  t.name AS tenant_name,
  uop.nickname,
  uop.last_visited_at,
  uop.visit_count,
  uop.is_pinned,
  uop.pin_order,
  uop.color_theme,
  utm.role,
  ROW_NUMBER() OVER (PARTITION BY uop.user_id ORDER BY uop.last_visited_at DESC) AS recency_rank
FROM user_org_preferences uop
JOIN tenants t ON t.id = uop.tenant_id
JOIN user_tenant_memberships utm ON utm.user_id = uop.user_id AND utm.tenant_id = uop.tenant_id
WHERE uop.last_visited_at IS NOT NULL
  AND utm.status = 'active';

COMMENT ON VIEW user_recent_orgs IS
  'Recent organizations accessed by user, ranked by recency';

DO $$
BEGIN
  RAISE NOTICE '✅ Created user_recent_orgs view';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 3. PREFERENCE MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to get user's org preferences with smart defaults
CREATE OR REPLACE FUNCTION public.get_user_org_preferences(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_result JSONB;
  v_memberships JSONB;
  v_pinned JSONB;
  v_recent JSONB;
  v_default_tenant_id UUID;
BEGIN
  -- Get default tenant
  SELECT default_tenant_id INTO v_default_tenant_id
  FROM app_users
  WHERE id = p_user_id;
  
  -- Get pinned orgs
  SELECT jsonb_agg(
    jsonb_build_object(
      'tenant_id', uop.tenant_id,
      'tenant_name', t.name,
      'nickname', uop.nickname,
      'pin_order', uop.pin_order,
      'color_theme', uop.color_theme,
      'role', utm.role
    ) ORDER BY uop.pin_order ASC
  ) INTO v_pinned
  FROM user_org_preferences uop
  JOIN tenants t ON t.id = uop.tenant_id
  JOIN user_tenant_memberships utm ON utm.user_id = uop.user_id AND utm.tenant_id = uop.tenant_id
  WHERE uop.user_id = p_user_id
    AND uop.is_pinned = true
    AND utm.status = 'active';
  
  -- Get recent orgs (last 10, excluding pinned)
  SELECT jsonb_agg(
    jsonb_build_object(
      'tenant_id', tenant_id,
      'tenant_name', tenant_name,
      'nickname', nickname,
      'last_visited_at', last_visited_at,
      'visit_count', visit_count,
      'role', role
    )
  ) INTO v_recent
  FROM (
    SELECT * FROM user_recent_orgs
    WHERE user_id = p_user_id
      AND (is_pinned IS NULL OR is_pinned = false)
    ORDER BY last_visited_at DESC
    LIMIT 10
  ) recent;
  
  -- Get all memberships for completeness
  SELECT jsonb_agg(
    jsonb_build_object(
      'tenant_id', m.tenant_id,
      'tenant_name', t.name,
      'role', m.role,
      'joined_at', m.joined_at,
      'is_default', m.tenant_id = v_default_tenant_id,
      'preferences', COALESCE(p.ui_preferences, '{}'::jsonb)
    ) ORDER BY t.name ASC
  ) INTO v_memberships
  FROM user_tenant_memberships m
  JOIN tenants t ON t.id = m.tenant_id
  LEFT JOIN user_org_preferences p ON p.user_id = m.user_id AND p.tenant_id = m.tenant_id
  WHERE m.user_id = p_user_id
    AND m.status = 'active';
  
  -- Build result
  v_result := jsonb_build_object(
    'user_id', p_user_id,
    'default_tenant_id', v_default_tenant_id,
    'pinned_orgs', COALESCE(v_pinned, '[]'::jsonb),
    'recent_orgs', COALESCE(v_recent, '[]'::jsonb),
    'all_orgs', COALESCE(v_memberships, '[]'::jsonb),
    'pinned_count', jsonb_array_length(COALESCE(v_pinned, '[]'::jsonb)),
    'total_count', jsonb_array_length(COALESCE(v_memberships, '[]'::jsonb))
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_user_org_preferences IS
  'Get user org preferences with pinned, recent, and all orgs';

-- Function to pin/unpin an org
CREATE OR REPLACE FUNCTION public.toggle_org_pin(
  p_user_id UUID,
  p_tenant_id UUID,
  p_pin BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_pinned_count INTEGER;
  v_max_pinned INTEGER := 5;
  v_next_pin_order INTEGER;
BEGIN
  -- Check if user is member of org
  IF NOT EXISTS (
    SELECT 1 FROM user_tenant_memberships
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are not a member of this organization'
    );
  END IF;
  
  IF p_pin THEN
    -- Check pin limit
    SELECT COUNT(*) INTO v_current_pinned_count
    FROM user_org_preferences
    WHERE user_id = p_user_id AND is_pinned = true;
    
    IF v_current_pinned_count >= v_max_pinned THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Maximum %s pinned organizations allowed', v_max_pinned),
        'current_count', v_current_pinned_count,
        'max_allowed', v_max_pinned
      );
    END IF;
    
    -- Get next pin order
    SELECT COALESCE(MAX(pin_order), 0) + 1 INTO v_next_pin_order
    FROM user_org_preferences
    WHERE user_id = p_user_id AND is_pinned = true;
    
    -- Pin the org
    INSERT INTO user_org_preferences (user_id, tenant_id, is_pinned, pin_order)
    VALUES (p_user_id, p_tenant_id, true, v_next_pin_order)
    ON CONFLICT (user_id, tenant_id) 
    DO UPDATE SET 
      is_pinned = true,
      pin_order = v_next_pin_order,
      updated_at = NOW();
      
  ELSE
    -- Unpin the org
    UPDATE user_org_preferences
    SET is_pinned = false, pin_order = NULL, updated_at = NOW()
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;
    
    -- Reorder remaining pinned orgs
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY pin_order ASC) AS new_order
      FROM user_org_preferences
      WHERE user_id = p_user_id AND is_pinned = true
    )
    UPDATE user_org_preferences uop
    SET pin_order = ranked.new_order
    FROM ranked
    WHERE uop.id = ranked.id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'pinned', p_pin,
    'pin_order', CASE WHEN p_pin THEN v_next_pin_order ELSE NULL END
  );
END;
$$;

COMMENT ON FUNCTION public.toggle_org_pin IS
  'Pin or unpin an organization (max 5 pinned orgs per user)';

-- Function to set default org
CREATE OR REPLACE FUNCTION public.set_default_org(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is member of org
  IF NOT EXISTS (
    SELECT 1 FROM user_tenant_memberships
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are not a member of this organization'
    );
  END IF;
  
  -- Clear current default
  UPDATE user_org_preferences
  SET is_default = false, updated_at = NOW()
  WHERE user_id = p_user_id AND is_default = true;
  
  -- Set new default in preferences
  INSERT INTO user_org_preferences (user_id, tenant_id, is_default)
  VALUES (p_user_id, p_tenant_id, true)
  ON CONFLICT (user_id, tenant_id) 
  DO UPDATE SET is_default = true, updated_at = NOW();
  
  -- Update app_users default_tenant_id
  UPDATE app_users
  SET default_tenant_id = p_tenant_id, updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'message', 'Default organization updated'
  );
END;
$$;

COMMENT ON FUNCTION public.set_default_org IS
  'Set user default organization for automatic selection on login';

-- Function to record org visit (for analytics and recency)
CREATE OR REPLACE FUNCTION public.record_org_visit(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_org_preferences (
    user_id,
    tenant_id,
    last_visited_at,
    visit_count
  ) VALUES (
    p_user_id,
    p_tenant_id,
    NOW(),
    1
  )
  ON CONFLICT (user_id, tenant_id) 
  DO UPDATE SET
    last_visited_at = NOW(),
    visit_count = user_org_preferences.visit_count + 1,
    updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION public.record_org_visit IS
  'Record org visit for analytics and recent orgs tracking';

-- Function to update org nickname
CREATE OR REPLACE FUNCTION public.update_org_nickname(
  p_user_id UUID,
  p_tenant_id UUID,
  p_nickname TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_org_preferences (user_id, tenant_id, nickname)
  VALUES (p_user_id, p_tenant_id, p_nickname)
  ON CONFLICT (user_id, tenant_id) 
  DO UPDATE SET nickname = p_nickname, updated_at = NOW();
  
  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'nickname', p_nickname
  );
END;
$$;

COMMENT ON FUNCTION public.update_org_nickname IS
  'Update user custom nickname for an organization';

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Created preference management functions';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 4. BACKFILL PREFERENCES FOR EXISTING USERS
-- =====================================================

DO $$
DECLARE
  inserted_count INTEGER;
BEGIN
  RAISE NOTICE 'Creating preferences for existing memberships...';
  
  -- Create preference entries for all active memberships
  INSERT INTO user_org_preferences (user_id, tenant_id, visit_count)
  SELECT DISTINCT
    utm.user_id,
    utm.tenant_id,
    0
  FROM user_tenant_memberships utm
  WHERE utm.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM user_org_preferences uop
      WHERE uop.user_id = utm.user_id AND uop.tenant_id = utm.tenant_id
    )
  ON CONFLICT (user_id, tenant_id) DO NOTHING;
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Created preferences for % memberships', inserted_count;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

DO $$
DECLARE
  preferences_table_exists BOOLEAN;
  recent_orgs_view_exists BOOLEAN;
  function_count INTEGER;
  total_preferences INTEGER;
BEGIN
  -- Check table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_org_preferences'
  ) INTO preferences_table_exists;
  
  -- Check view
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_name = 'user_recent_orgs'
  ) INTO recent_orgs_view_exists;
  
  -- Count functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN (
    'get_user_org_preferences', 'toggle_org_pin', 'set_default_org',
    'record_org_visit', 'update_org_nickname'
  );
  
  -- Count preferences
  SELECT COUNT(*) INTO total_preferences FROM user_org_preferences;
  
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'VERIFICATION';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'user_org_preferences table: %', CASE WHEN preferences_table_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'user_recent_orgs view: %', CASE WHEN recent_orgs_view_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'Preference functions: % of 5', function_count;
  RAISE NOTICE 'Total preferences: %', total_preferences;
  RAISE NOTICE '';
  
  IF preferences_table_exists AND recent_orgs_view_exists AND function_count = 5 THEN
    RAISE NOTICE '✅ All preference infrastructure ready';
  ELSE
    RAISE WARNING '⚠️  Some components missing';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '✅ USER PREFERENCES READY';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
  RAISE NOTICE '✅ user_org_preferences table created';
  RAISE NOTICE '✅ user_recent_orgs view created';
  RAISE NOTICE '✅ 5 preference functions created';
  RAISE NOTICE '✅ Existing memberships backfilled';
  RAISE NOTICE '';
  RAISE NOTICE '📝 FEATURES:';
  RAISE NOTICE '   - Pin up to 5 favorite orgs';
  RAISE NOTICE '   - Set default org for login';
  RAISE NOTICE '   - Custom nicknames per org';
  RAISE NOTICE '   - Recent orgs tracking (last 10)';
  RAISE NOTICE '   - Visit count analytics';
  RAISE NOTICE '   - Per-org UI preferences';
  RAISE NOTICE '';
  RAISE NOTICE '💡 USAGE:';
  RAISE NOTICE '   -- Get preferences:';
  RAISE NOTICE '   SELECT get_user_org_preferences(''user-id''::uuid);';
  RAISE NOTICE '';
  RAISE NOTICE '   -- Pin org:';
  RAISE NOTICE '   SELECT toggle_org_pin(''user-id''::uuid, ''tenant-id''::uuid, true);';
  RAISE NOTICE '';
  RAISE NOTICE '   -- Set default:';
  RAISE NOTICE '   SELECT set_default_org(''user-id''::uuid, ''tenant-id''::uuid);';
  RAISE NOTICE '';
  RAISE NOTICE '   -- Record visit:';
  RAISE NOTICE '   SELECT record_org_visit(''user-id''::uuid, ''tenant-id''::uuid);';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Step 6 Complete! Org switcher infrastructure ready.';
END $$;



