-- User Invitations System
-- This migration adds support for inviting team members

-- Add missing fields to app_users table
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/London';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create unique index on email per tenant
CREATE UNIQUE INDEX IF NOT EXISTS app_users_tenant_email_idx ON app_users(tenant_id, email);

-- User Invitations Table
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff', 'viewer')),
  invited_by_user_id UUID REFERENCES app_users(id),
  invitation_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS user_invitations_tenant_id_idx ON user_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS user_invitations_email_idx ON user_invitations(email);
CREATE INDEX IF NOT EXISTS user_invitations_token_idx ON user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS user_invitations_status_idx ON user_invitations(status);

-- User Activity Log (for tracking who did what)
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'deal_created', 'deal_updated', 'deal_assigned', 'stage_changed', etc.
  entity_type TEXT, -- 'deal', 'contact', 'task', 'pipeline', etc.
  entity_id UUID,
  details JSONB, -- Additional context about the action
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for activity log
CREATE INDEX IF NOT EXISTS user_activity_log_tenant_id_idx ON user_activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS user_activity_log_user_id_idx ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS user_activity_log_entity_idx ON user_activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS user_activity_log_created_at_idx ON user_activity_log(created_at DESC);

-- User Preferences Table (for storing user-specific settings)
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS user_preferences_tenant_id_idx ON user_preferences(tenant_id);

-- Add comments
COMMENT ON TABLE user_invitations IS 'Stores pending and accepted user invitations';
COMMENT ON TABLE user_activity_log IS 'Tracks all user actions for audit and activity feed';
COMMENT ON TABLE user_preferences IS 'Stores user-specific preferences and settings';

-- Grant permissions (adjust based on your RLS setup)
-- Note: You may need to adjust these based on your specific security requirements

