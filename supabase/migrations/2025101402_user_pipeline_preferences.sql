SET search_path TO public, extensions;

-- User Pipeline Preferences Table
-- Stores user-specific preferences for pipeline ordering and views

DROP TABLE IF EXISTS user_pipeline_preferences CASCADE;
CREATE TABLE user_pipeline_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- Pipeline ordering (array of pipeline IDs in user's preferred order)
  pipeline_order JSONB DEFAULT '[]'::jsonb,
  
  -- Last selected pipeline
  last_selected_pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
  
  -- Default view preference
  default_view VARCHAR(20) DEFAULT 'board' CHECK (default_view IN ('board', 'list', 'timeline')),
  
  -- View settings
  show_archived BOOLEAN DEFAULT false,
  compact_view BOOLEAN DEFAULT false,
  
  -- Column visibility (for list view)
  visible_columns JSONB DEFAULT '["name", "stage", "value", "owner", "updated_at"]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One preference row per user
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_pipeline_prefs_user_id ON user_pipeline_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pipeline_prefs_last_selected ON user_pipeline_preferences(last_selected_pipeline_id);

-- RLS Policies
ALTER TABLE user_pipeline_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
DROP POLICY IF EXISTS "Users can view their own pipeline preferences" ON user_pipeline_preferences;
CREATE POLICY "Users can view their own pipeline preferences" ON user_pipeline_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
DROP POLICY IF EXISTS "Users can insert their own pipeline preferences" ON user_pipeline_preferences;
CREATE POLICY "Users can insert their own pipeline preferences" ON user_pipeline_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
DROP POLICY IF EXISTS "Users can update their own pipeline preferences" ON user_pipeline_preferences;
CREATE POLICY "Users can update their own pipeline preferences" ON user_pipeline_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own preferences
DROP POLICY IF EXISTS "Users can delete their own pipeline preferences" ON user_pipeline_preferences;
CREATE POLICY "Users can delete their own pipeline preferences" ON user_pipeline_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_user_pipeline_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_user_pipeline_prefs_updated_at
  BEFORE UPDATE ON user_pipeline_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_pipeline_prefs_updated_at();

-- Comments
COMMENT ON TABLE user_pipeline_preferences IS 'Stores user-specific preferences for pipeline display, ordering, and views';
COMMENT ON COLUMN user_pipeline_preferences.pipeline_order IS 'Array of pipeline IDs in user''s preferred display order';
COMMENT ON COLUMN user_pipeline_preferences.default_view IS 'User''s preferred default view: board, list, or timeline';
COMMENT ON COLUMN user_pipeline_preferences.visible_columns IS 'Array of column names to show in list view';

