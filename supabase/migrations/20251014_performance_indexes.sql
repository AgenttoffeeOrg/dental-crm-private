-- Performance Optimization Indexes
-- Add indexes for frequently queried columns

-- App Users
CREATE INDEX IF NOT EXISTS idx_app_users_tenant_id ON app_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);

-- Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_full_name_trgm ON contacts USING gin(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contacts_company_trgm ON contacts USING gin(company gin_trgm_ops);

-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Deals
CREATE INDEX IF NOT EXISTS idx_deals_tenant_id ON deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline_id ON deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner_id ON deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_updated_at ON deals(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close_date ON deals(expected_close_date);

-- Pipelines
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant_id ON pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_is_active ON pipelines(is_active);

-- Stages
CREATE INDEX IF NOT EXISTS idx_stages_pipeline_id ON stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_stages_order ON stages(display_order);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deal_id ON tasks(deal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_contact_id ON tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Email Templates
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_id ON email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email_templates(is_active);

-- Campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_id ON campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);

-- Forms
CREATE INDEX IF NOT EXISTS idx_forms_tenant_id ON forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_forms_is_active ON forms(is_active);

-- Form Submissions
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions(created_at DESC);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_deals_tenant_pipeline ON deals(tenant_id, pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_status ON deals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_status ON contacts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assignee_id, status);

-- Comments
COMMENT ON INDEX idx_contacts_full_name_trgm IS 'Trigram index for fuzzy text search on contact names';
COMMENT ON INDEX idx_deals_tenant_pipeline IS 'Composite index for pipeline board queries';

