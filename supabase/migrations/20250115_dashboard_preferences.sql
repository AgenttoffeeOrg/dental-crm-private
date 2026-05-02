-- Dashboard Preferences Migration
-- Creates table for storing user dashboard customization preferences

-- Create user_dashboard_preferences table
CREATE TABLE IF NOT EXISTS user_dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- Widget visibility settings
  widget_visibility JSONB DEFAULT '{
    "revenue": true,
    "deals": true,
    "contacts": true,
    "tasks": true,
    "revenueChart": true,
    "dealsFunnel": true,
    "recentActivity": true,
    "upcomingTasks": true,
    "quickInsights": true,
    "priorities": true
  }'::jsonb,
  
  -- Widget order (array of widget IDs)
  widget_order JSONB DEFAULT '["priorities", "revenue", "deals", "contacts", "tasks", "revenueChart", "dealsFunnel", "quickInsights"]'::jsonb,
  
  -- Individual widget settings
  widget_settings JSONB DEFAULT '{}'::jsonb,
  
  -- Global preferences
  time_period_default TEXT DEFAULT 'month' CHECK (time_period_default IN ('today', 'week', 'month', 'quarter', 'year', 'custom')),
  auto_refresh_enabled BOOLEAN DEFAULT TRUE,
  auto_refresh_interval INTEGER DEFAULT 5, -- minutes
  theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one preference per user
  UNIQUE(user_id)
);

-- CREATE INDEX IF NOT EXISTS for faster lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_prefs_user_id 
  ON user_dashboard_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE user_dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own dashboard preferences" ON user_dashboard_preferences;
DROP POLICY IF EXISTS "Users can update own dashboard preferences" ON user_dashboard_preferences;
DROP POLICY IF EXISTS "Users can insert own dashboard preferences" ON user_dashboard_preferences;
DROP POLICY IF EXISTS "Users can delete own dashboard preferences" ON user_dashboard_preferences;

-- RLS Policies: Users can only manage their own preferences
DROP POLICY IF EXISTS "Users can view own dashboard preferences" ON user_dashboard_preferences;
CREATE POLICY "Users can view own dashboard preferences" ON user_dashboard_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own dashboard preferences" ON user_dashboard_preferences;
CREATE POLICY "Users can insert own dashboard preferences" ON user_dashboard_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own dashboard preferences" ON user_dashboard_preferences;
CREATE POLICY "Users can update own dashboard preferences" ON user_dashboard_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own dashboard preferences" ON user_dashboard_preferences;
CREATE POLICY "Users can delete own dashboard preferences" ON user_dashboard_preferences
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dashboard_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_dashboard_prefs_timestamp ON user_dashboard_preferences;
CREATE OR REPLACE TRIGGER update_dashboard_prefs_timestamp
  BEFORE UPDATE ON user_dashboard_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_prefs_updated_at();

-- Grant permissions
GRANT ALL ON user_dashboard_preferences TO authenticated;

COMMENT ON TABLE user_dashboard_preferences IS 'Stores user dashboard customization preferences including widget visibility, order, and settings';

