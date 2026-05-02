-- Initial CRM core schema extracted from supabase/sql/01_initial_schema.sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Europe/London',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    primary_phone TEXT,
    primary_email TEXT,
    source TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    value_estimate_cents INTEGER DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'GBP',
    treatment_tags TEXT[] DEFAULT '{}',
    owner_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    source TEXT,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assignee_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    due_at TIMESTAMP WITH TIME ZONE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    auto_created BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('call', 'email', 'whatsapp', 'note')),
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    agent_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    subject TEXT,
    snippet TEXT,
    raw JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('audio', 'attachment', 'image', 'other')),
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_files (
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, file_id)
);

CREATE TABLE IF NOT EXISTS ai_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('transcript', 'summary', 'intent', 'treatments', 'actions')),
    data JSONB NOT NULL,
    confidence NUMERIC(3,2) DEFAULT 0.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audits (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    before JSONB,
    after JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_users_tenant_id ON app_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(primary_email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(primary_phone);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id ON pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_position ON pipeline_stages(pipeline_id, position);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_id ON deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner_user_id ON deals(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_deals_last_activity_at ON deals(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_user_id ON tasks(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_activities_tenant_id ON activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_occurred_at ON activities(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_tenant_id ON files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_artifacts_activity_id ON ai_artifacts(activity_id);
CREATE INDEX IF NOT EXISTS idx_audits_tenant_id ON audits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audits_entity ON audits(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audits_created_at ON audits(created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE OR REPLACE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deals_updated_at ON deals;
CREATE OR REPLACE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE OR REPLACE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
