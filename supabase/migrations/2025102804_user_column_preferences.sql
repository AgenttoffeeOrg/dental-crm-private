SET search_path TO public, extensions;

-- ============================================================================
-- MIGRATION: User Column Preferences
-- Purpose: Store user-specific column visibility preferences for data tables
-- Author: Dental CRM
-- Date: 2025-10-28
-- ============================================================================

-- Create user_column_preferences table
DROP TABLE IF EXISTS public.user_column_preferences CASCADE;
CREATE TABLE public.user_column_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page VARCHAR(50) NOT NULL, -- e.g., 'deals', 'contacts', 'tasks', 'pipeline'
  visible_columns JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of column IDs that are visible
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one preference record per user per page
  UNIQUE(user_id, page)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_column_preferences_user_id 
  ON public.user_column_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_user_column_preferences_page 
  ON public.user_column_preferences(page);

CREATE INDEX IF NOT EXISTS idx_user_column_preferences_user_page 
  ON public.user_column_preferences(user_id, page);

-- Add comment
COMMENT ON TABLE public.user_column_preferences IS 
  'Stores user-specific column visibility preferences for data tables (deals, contacts, etc.)';

COMMENT ON COLUMN public.user_column_preferences.visible_columns IS 
  'JSONB array of column IDs that are visible for this user on this page. Example: ["deal", "contact", "pipeline", "value", "owner", "tags"]';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.user_column_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own preferences
DROP POLICY IF EXISTS "Users can view own column preferences" ON public.user_column_preferences;
CREATE POLICY "Users can view own column preferences" ON public.user_column_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
DROP POLICY IF EXISTS "Users can insert own column preferences" ON public.user_column_preferences;
CREATE POLICY "Users can insert own column preferences" ON public.user_column_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
DROP POLICY IF EXISTS "Users can update own column preferences" ON public.user_column_preferences;
CREATE POLICY "Users can update own column preferences" ON public.user_column_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own preferences
DROP POLICY IF EXISTS "Users can delete own column preferences" ON public.user_column_preferences;
CREATE POLICY "Users can delete own column preferences" ON public.user_column_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTION: Get or Create Default Column Preferences
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_or_create_column_preferences(
  p_user_id UUID,
  p_page VARCHAR(50),
  p_default_columns JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preferences JSONB;
BEGIN
  -- Try to get existing preferences
  SELECT visible_columns INTO v_preferences
  FROM public.user_column_preferences
  WHERE user_id = p_user_id AND page = p_page;

  -- If no preferences exist, create with defaults
  IF v_preferences IS NULL THEN
    INSERT INTO public.user_column_preferences (user_id, page, visible_columns)
    VALUES (p_user_id, p_page, p_default_columns)
    ON CONFLICT (user_id, page) 
    DO UPDATE SET visible_columns = p_default_columns
    RETURNING visible_columns INTO v_preferences;
  END IF;

  RETURN v_preferences;
END;
$$;

COMMENT ON FUNCTION public.get_or_create_column_preferences IS
  'Get user column preferences for a page, creating with defaults if they don''t exist';

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_user_column_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_update_user_column_preferences_updated_at
  BEFORE UPDATE ON public.user_column_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_column_preferences_updated_at();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on the table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_column_preferences TO authenticated;

-- Grant usage on sequence (for id generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on helper function
GRANT EXECUTE ON FUNCTION public.get_or_create_column_preferences TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify table was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_column_preferences'
  ) THEN
    RAISE NOTICE '✅ Table "user_column_preferences" created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create table "user_column_preferences"';
  END IF;
END $$;

-- Verify RLS is enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_column_preferences' 
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ RLS enabled on "user_column_preferences"';
  ELSE
    RAISE EXCEPTION '❌ RLS not enabled on "user_column_preferences"';
  END IF;
END $$;

-- Verify policies exist
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'user_column_preferences';

  IF v_policy_count >= 4 THEN
    RAISE NOTICE '✅ RLS policies created (% policies)', v_policy_count;
  ELSE
    RAISE EXCEPTION '❌ Expected at least 4 RLS policies, found %', v_policy_count;
  END IF;
END $$;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '🎉 Migration completed successfully!';
END $$;

