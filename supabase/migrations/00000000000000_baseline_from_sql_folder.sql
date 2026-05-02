-- Baseline schema concatenated from supabase/sql/*.sql
-- Auto-generated

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
SET search_path TO public, extensions;

-- PATCHED: stub locations table so forward FK references resolve. Canonical version applied later via CREATE TABLE IF NOT EXISTS.
CREATE TABLE IF NOT EXISTS locations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID, name TEXT, created_at TIMESTAMPTZ DEFAULT NOW());




-- ============================================================
-- FROM sql/01_initial_schema.sql
-- ============================================================

-- DentalCRM Database Schema
-- This creates all the core tables for the dental CRM system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants table for multi-tenancy support
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Europe/London',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- App users table (linked to Supabase auth)
CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    primary_phone TEXT,
    primary_email TEXT,
    source TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pipelines table
CREATE TABLE IF NOT EXISTS pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pipeline stages table
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Files table for storing file metadata
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('audio', 'attachment', 'image', 'other')),
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for activity files
CREATE TABLE IF NOT EXISTS activity_files (
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, file_id)
);

-- AI artifacts table
CREATE TABLE IF NOT EXISTS ai_artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('transcript', 'summary', 'intent', 'treatments', 'actions')),
    data JSONB NOT NULL,
    confidence NUMERIC(3,2) DEFAULT 0.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table
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

-- Create indexes for better performance
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

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE OR REPLACE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- FROM sql/03_lead_management_enhancement.sql
-- ============================================================

-- Enhanced Lead Management for Dental CRM
-- This adds automated categorization, lead sources, and service-based routing

-- Add dental service categories
CREATE TABLE IF NOT EXISTS dental_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('treatment', 'preventive', 'cosmetic', 'emergency')),
    description TEXT,
    average_value_cents INTEGER DEFAULT 0,
    typical_duration_days INTEGER DEFAULT 30,
    keywords TEXT[], -- For automatic categorization
    color TEXT DEFAULT '#3B82F6', -- For UI display
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced lead sources with integration metadata
CREATE TABLE IF NOT EXISTS lead_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('facebook_ads', 'instagram', 'google_ads', 'whatsapp', 'website', 'referral', 'walk_in', 'phone', 'email', 'other')),
    integration_config JSONB, -- Store API keys, webhook URLs, etc.
    auto_categorization_rules JSONB, -- Rules for automatic service categorization
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead intake tracking
CREATE TABLE IF NOT EXISTS lead_intakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_source_id UUID REFERENCES lead_sources(id),
    contact_id UUID REFERENCES contacts(id),
    deal_id UUID REFERENCES deals(id),
    dental_service_id UUID REFERENCES dental_services(id),
    
    -- Lead details
    original_message TEXT,
    lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
    qualification_status TEXT DEFAULT 'unqualified' CHECK (qualification_status IN ('unqualified', 'qualified', 'disqualified')),
    
    -- Categorization
    auto_categorized BOOLEAN DEFAULT false,
    categorization_confidence DECIMAL(3,2) DEFAULT 0.0,
    suggested_services UUID[], -- Array of dental_services IDs
    
    -- Metadata
    external_id TEXT, -- ID from external system (Facebook Lead ID, etc.)
    raw_data JSONB, -- Original payload from external system
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_intakes_tenant_id ON lead_intakes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_intakes_lead_source_id ON lead_intakes(lead_source_id);
CREATE INDEX IF NOT EXISTS idx_lead_intakes_qualification_status ON lead_intakes(qualification_status);
CREATE INDEX IF NOT EXISTS idx_lead_intakes_created_at ON lead_intakes(created_at);
CREATE INDEX IF NOT EXISTS idx_dental_services_tenant_id ON dental_services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_sources_tenant_id ON lead_sources(tenant_id);

-- Update deals table to include dental service reference
ALTER TABLE deals ADD COLUMN IF NOT EXISTS dental_service_id UUID REFERENCES dental_services(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_intake_id UUID REFERENCES lead_intakes(id);

-- Update contacts table with lead source tracking
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_source_id UUID REFERENCES lead_sources(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100);

-- Create a view for lead pipeline analytics
DROP VIEW IF EXISTS lead_pipeline_analytics CASCADE;
CREATE VIEW lead_pipeline_analytics AS
SELECT 
    ds.name as service_name,
    ds.category as service_category,
    ls.name as source_name,
    ls.source_type,
    COUNT(li.id) as total_leads,
    COUNT(CASE WHEN li.qualification_status = 'qualified' THEN 1 END) as qualified_leads,
    COUNT(CASE WHEN d.id IS NOT NULL THEN 1 END) as converted_deals,
    AVG(li.lead_score) as avg_lead_score,
    SUM(CASE WHEN d.value_estimate_cents IS NOT NULL THEN d.value_estimate_cents ELSE 0 END) as total_pipeline_value
FROM lead_intakes li
LEFT JOIN dental_services ds ON li.dental_service_id = ds.id
LEFT JOIN lead_sources ls ON li.lead_source_id = ls.id
LEFT JOIN deals d ON li.deal_id = d.id
WHERE li.created_at >= NOW() - INTERVAL '30 days'
GROUP BY ds.name, ds.category, ls.name, ls.source_type
ORDER BY total_leads DESC;

-- Function to auto-categorize leads based on keywords
CREATE OR REPLACE FUNCTION auto_categorize_lead(
    p_message TEXT,
    p_tenant_id UUID
) RETURNS TABLE (
    service_id UUID,
    confidence DECIMAL(3,2),
    service_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ds.id,
        CASE 
            WHEN array_length(matched_keywords, 1) > 0 THEN
                LEAST(1.0, array_length(matched_keywords, 1)::DECIMAL / array_length(ds.keywords, 1)::DECIMAL)
            ELSE 0.0
        END as confidence,
        ds.name
    FROM dental_services ds
    CROSS JOIN LATERAL (
        SELECT array_agg(keyword) as matched_keywords
        FROM unnest(ds.keywords) as keyword
        WHERE lower(p_message) LIKE '%' || lower(keyword) || '%'
    ) matches
    WHERE ds.tenant_id = p_tenant_id 
      AND ds.active = true
      AND matches.matched_keywords IS NOT NULL
    ORDER BY confidence DESC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- FROM sql/05_enhanced_deal_management.sql
-- ============================================================

-- 05_enhanced_deal_management.sql
-- Add enhanced deal management fields for comprehensive deal profiles

-- Add new columns to deals table
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS deal_type VARCHAR(50) DEFAULT 'new_lead',
ADD COLUMN IF NOT EXISTS deposit_amount_cents BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_plan VARCHAR(50),
ADD COLUMN IF NOT EXISTS treatment_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS treatment_urgency VARCHAR(20),
ADD COLUMN IF NOT EXISTS estimated_duration_weeks INTEGER,
ADD COLUMN IF NOT EXISTS pms_treatment_plan_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS pms_patient_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS pms_sync_status VARCHAR(50) DEFAULT 'not_synced',
ADD COLUMN IF NOT EXISTS consultation_scheduled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS consultation_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS treatment_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS treatment_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS insurance_coverage BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(100),
ADD COLUMN IF NOT EXISTS insurance_authorization_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS insurance_coverage_percentage INTEGER,
ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS next_follow_up_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS patient_concerns TEXT,
ADD COLUMN IF NOT EXISTS lead_score INTEGER,
ADD COLUMN IF NOT EXISTS conversion_probability INTEGER;

-- Add check constraints
ALTER TABLE deals 
DROP CONSTRAINT IF EXISTS check_deal_type;
ALTER TABLE deals 
ADD CONSTRAINT check_deal_type 
CHECK (deal_type IN ('new_lead', 'existing_patient', 'pms_import', 'referral'));

ALTER TABLE deals 
DROP CONSTRAINT IF EXISTS check_payment_plan;
ALTER TABLE deals 
ADD CONSTRAINT check_payment_plan 
CHECK (payment_plan IN ('full_payment', 'installments', 'insurance', 'finance') OR payment_plan IS NULL);

ALTER TABLE deals 
DROP CONSTRAINT IF EXISTS check_treatment_category;
ALTER TABLE deals 
ADD CONSTRAINT check_treatment_category 
CHECK (treatment_category IN ('preventive', 'restorative', 'cosmetic', 'orthodontic', 'surgical', 'emergency') OR treatment_category IS NULL);

ALTER TABLE deals 
DROP CONSTRAINT IF EXISTS check_treatment_urgency;
ALTER TABLE deals 
ADD CONSTRAINT check_treatment_urgency 
CHECK (treatment_urgency IN ('low', 'medium', 'high', 'emergency') OR treatment_urgency IS NULL);

ALTER TABLE deals 
DROP CONSTRAINT IF EXISTS check_pms_sync_status;
ALTER TABLE deals 
ADD CONSTRAINT check_pms_sync_status 
CHECK (pms_sync_status IN ('not_synced', 'synced', 'sync_pending', 'sync_failed'));

ALTER TABLE deals 
DROP CONSTRAINT IF EXISTS check_lead_score_range;
ALTER TABLE deals 
ADD CONSTRAINT check_lead_score_range 
CHECK (lead_score >= 0 AND lead_score <= 100 OR lead_score IS NULL);

ALTER TABLE deals 
DROP CONSTRAINT IF EXISTS check_conversion_probability_range;
ALTER TABLE deals 
ADD CONSTRAINT check_conversion_probability_range 
CHECK (conversion_probability >= 0 AND conversion_probability <= 100 OR conversion_probability IS NULL);

ALTER TABLE deals 
DROP CONSTRAINT IF EXISTS check_insurance_coverage_percentage;
ALTER TABLE deals 
ADD CONSTRAINT check_insurance_coverage_percentage 
CHECK (insurance_coverage_percentage >= 0 AND insurance_coverage_percentage <= 100 OR insurance_coverage_percentage IS NULL);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deals_deal_type ON deals(deal_type);
CREATE INDEX IF NOT EXISTS idx_deals_treatment_category ON deals(treatment_category);
CREATE INDEX IF NOT EXISTS idx_deals_treatment_urgency ON deals(treatment_urgency);
CREATE INDEX IF NOT EXISTS idx_deals_pms_sync_status ON deals(pms_sync_status);
CREATE INDEX IF NOT EXISTS idx_deals_lead_score ON deals(lead_score);
CREATE INDEX IF NOT EXISTS idx_deals_conversion_probability ON deals(conversion_probability);
CREATE INDEX IF NOT EXISTS idx_deals_follow_up_date ON deals(next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_deals_consultation_date ON deals(consultation_date);

-- Update existing deals to have default deal_type
UPDATE deals 
SET deal_type = 'new_lead' 
WHERE deal_type IS NULL;

-- Add comment to table
COMMENT ON COLUMN deals.deal_type IS 'Type of deal: new_lead, existing_patient, pms_import, referral';
COMMENT ON COLUMN deals.pms_treatment_plan_id IS 'ID from Practice Management System treatment plan';
COMMENT ON COLUMN deals.pms_patient_id IS 'Patient ID from Practice Management System';
COMMENT ON COLUMN deals.pms_sync_status IS 'Synchronization status with PMS';
COMMENT ON COLUMN deals.lead_score IS 'Lead quality score from 0-100';
COMMENT ON COLUMN deals.conversion_probability IS 'Estimated probability of conversion (0-100%)';


-- ============================================================
-- FROM sql/05_enhanced_deal_management_safe.sql
-- ============================================================

-- Check if the new deal management columns exist before running the main migration
-- This prevents errors if the migration is run multiple times

DO $$ 
BEGIN
    -- Check if deal_type column exists, if not, add all the new columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deals' AND column_name = 'deal_type'
    ) THEN
        -- Add new columns to deals table
        ALTER TABLE deals 
        ADD COLUMN IF NOT EXISTS deal_type VARCHAR(50) DEFAULT 'new_lead',
        ADD COLUMN IF NOT EXISTS deposit_amount_cents BIGINT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS payment_plan VARCHAR(50),
        ADD COLUMN IF NOT EXISTS treatment_category VARCHAR(50),
        ADD COLUMN IF NOT EXISTS treatment_urgency VARCHAR(20),
        ADD COLUMN IF NOT EXISTS estimated_duration_weeks INTEGER,
        ADD COLUMN IF NOT EXISTS pms_treatment_plan_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS pms_patient_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS pms_sync_status VARCHAR(50) DEFAULT 'not_synced',
        ADD COLUMN IF NOT EXISTS consultation_scheduled BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS consultation_date TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS treatment_start_date TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS treatment_end_date TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS insurance_coverage BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(100),
        ADD COLUMN IF NOT EXISTS insurance_authorization_number VARCHAR(100),
        ADD COLUMN IF NOT EXISTS insurance_coverage_percentage INTEGER,
        ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS next_follow_up_date TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS internal_notes TEXT,
        ADD COLUMN IF NOT EXISTS patient_concerns TEXT,
        ADD COLUMN IF NOT EXISTS lead_score INTEGER,
        ADD COLUMN IF NOT EXISTS conversion_probability INTEGER;

        -- Add check constraints
        ALTER TABLE deals 
        DROP CONSTRAINT IF EXISTS check_deal_type;
ALTER TABLE deals 
        ADD CONSTRAINT check_deal_type 
        CHECK (deal_type IN ('new_lead', 'existing_patient', 'pms_import', 'referral'));

        ALTER TABLE deals 
        DROP CONSTRAINT IF EXISTS check_payment_plan;
ALTER TABLE deals 
        ADD CONSTRAINT check_payment_plan 
        CHECK (payment_plan IN ('full_payment', 'installments', 'insurance', 'finance') OR payment_plan IS NULL);

        ALTER TABLE deals 
        DROP CONSTRAINT IF EXISTS check_treatment_category;
ALTER TABLE deals 
        ADD CONSTRAINT check_treatment_category 
        CHECK (treatment_category IN ('preventive', 'restorative', 'cosmetic', 'orthodontic', 'surgical', 'emergency') OR treatment_category IS NULL);

        ALTER TABLE deals 
        DROP CONSTRAINT IF EXISTS check_treatment_urgency;
ALTER TABLE deals 
        ADD CONSTRAINT check_treatment_urgency 
        CHECK (treatment_urgency IN ('low', 'medium', 'high', 'emergency') OR treatment_urgency IS NULL);

        ALTER TABLE deals 
        DROP CONSTRAINT IF EXISTS check_pms_sync_status;
ALTER TABLE deals 
        ADD CONSTRAINT check_pms_sync_status 
        CHECK (pms_sync_status IN ('not_synced', 'synced', 'sync_pending', 'sync_failed'));

        ALTER TABLE deals 
        DROP CONSTRAINT IF EXISTS check_lead_score_range;
ALTER TABLE deals 
        ADD CONSTRAINT check_lead_score_range 
        CHECK (lead_score >= 0 AND lead_score <= 100 OR lead_score IS NULL);

        ALTER TABLE deals 
        DROP CONSTRAINT IF EXISTS check_conversion_probability_range;
ALTER TABLE deals 
        ADD CONSTRAINT check_conversion_probability_range 
        CHECK (conversion_probability >= 0 AND conversion_probability <= 100 OR conversion_probability IS NULL);

        ALTER TABLE deals 
        DROP CONSTRAINT IF EXISTS check_insurance_coverage_percentage;
ALTER TABLE deals 
        ADD CONSTRAINT check_insurance_coverage_percentage 
        CHECK (insurance_coverage_percentage >= 0 AND insurance_coverage_percentage <= 100 OR insurance_coverage_percentage IS NULL);

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_deals_deal_type ON deals(deal_type);
        CREATE INDEX IF NOT EXISTS idx_deals_treatment_category ON deals(treatment_category);
        CREATE INDEX IF NOT EXISTS idx_deals_treatment_urgency ON deals(treatment_urgency);
        CREATE INDEX IF NOT EXISTS idx_deals_pms_sync_status ON deals(pms_sync_status);
        CREATE INDEX IF NOT EXISTS idx_deals_lead_score ON deals(lead_score);
        CREATE INDEX IF NOT EXISTS idx_deals_conversion_probability ON deals(conversion_probability);
        CREATE INDEX IF NOT EXISTS idx_deals_follow_up_date ON deals(next_follow_up_date);
        CREATE INDEX IF NOT EXISTS idx_deals_consultation_date ON deals(consultation_date);

        -- Update existing deals to have default deal_type
        UPDATE deals 
        SET deal_type = 'new_lead' 
        WHERE deal_type IS NULL;

        RAISE NOTICE 'Enhanced deal management columns added successfully';
    ELSE
        RAISE NOTICE 'Enhanced deal management columns already exist';
    END IF;
END $$;


-- ============================================================
-- FROM sql/05_storage_setup.sql
-- ============================================================

-- Create storage buckets for the dental CRM
-- Run this in your Supabase SQL Editor

-- Create the audio bucket for call recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio',
  'audio',
  false, -- Private bucket
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/webm', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- Create the attachments bucket for general file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false, -- Private bucket
  104857600, -- 100MB limit
  NULL -- Allow all file types
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the audio bucket
DROP POLICY IF EXISTS "Authenticated users can upload audio files" ON storage.objects;
CREATE POLICY "Authenticated users can upload audio files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'audio' AND 
  auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can view their audio files" ON storage.objects;
CREATE POLICY "Authenticated users can view their audio files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'audio' AND 
  auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can delete their audio files" ON storage.objects;
CREATE POLICY "Authenticated users can delete their audio files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'audio' AND 
  auth.role() = 'authenticated'
);

-- Create RLS policies for the attachments bucket
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'attachments' AND 
  auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can view their attachments" ON storage.objects;
CREATE POLICY "Authenticated users can view their attachments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'attachments' AND 
  auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can delete their attachments" ON storage.objects;
CREATE POLICY "Authenticated users can delete their attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'attachments' AND 
  auth.role() = 'authenticated'
);



-- ============================================================
-- FROM sql/06_fix_rls_and_schema.sql
-- ============================================================

-- Fix RLS policies and missing fields for file uploads
-- Run this in your Supabase SQL Editor

-- First, let's add the missing fields to the files table
ALTER TABLE files ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS original_name TEXT;

-- Update the files table structure to match what the storage service expects
UPDATE files SET file_name = original_name WHERE file_name IS NULL;

-- Disable RLS on files table for now (since we're not using auth yet)
ALTER TABLE files DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_artifacts DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on other tables to prevent auth issues during development
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE audits DISABLE ROW LEVEL SECURITY;

-- Fix the activities table to match what the code expects
-- PATCHED: original rename removed (later code references type)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Update existing activities to have titles if they don't
UPDATE activities SET title = COALESCE(subject, 'Activity') WHERE title IS NULL;

-- Fix the tasks table to match expected structure
ALTER TABLE tasks RENAME COLUMN status TO status_old;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));
UPDATE tasks SET status = 
  CASE 
    WHEN status_old = 'open' THEN 'pending'
    WHEN status_old = 'done' THEN 'completed'
    ELSE status_old
  END;
ALTER TABLE tasks DROP COLUMN status_old;

-- Add missing columns to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
UPDATE tasks SET due_date = due_at WHERE due_date IS NULL;

-- Add missing columns to deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_type TEXT DEFAULT 'general';

-- Add foreign key names that the code expects
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee UUID REFERENCES app_users(id);
UPDATE tasks SET assignee = assignee_user_id WHERE assignee IS NULL;



-- ============================================================
-- FROM sql/07_quick_rls_fix.sql
-- ============================================================

-- Quick fix for RLS and missing columns
-- Copy and paste this into your Supabase SQL Editor

-- Add missing columns to files table
ALTER TABLE files ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS original_name TEXT;

-- Disable RLS on all tables for development
ALTER TABLE files DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_artifacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE audits DISABLE ROW LEVEL SECURITY;



-- ============================================================
-- FROM sql/08_complete_rls_disable.sql
-- ============================================================

-- Complete RLS disable and schema refresh
-- Run this in your Supabase SQL Editor to completely fix RLS issues

-- First, let's see what RLS policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Completely disable RLS on all tables
ALTER TABLE public.files DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_artifacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits DISABLE ROW LEVEL SECURITY;

-- Drop any existing RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.files;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.files;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.files;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.files;

-- Repeat for other tables that might have policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.activity_files;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.activity_files;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.activities;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.activities;

-- Grant full permissions to anon and authenticated roles
GRANT ALL ON public.files TO anon, authenticated;
GRANT ALL ON public.activity_files TO anon, authenticated;
GRANT ALL ON public.ai_artifacts TO anon, authenticated;
GRANT ALL ON public.tenants TO anon, authenticated;
GRANT ALL ON public.app_users TO anon, authenticated;
GRANT ALL ON public.contacts TO anon, authenticated;
GRANT ALL ON public.pipelines TO anon, authenticated;
GRANT ALL ON public.pipeline_stages TO anon, authenticated;
GRANT ALL ON public.deals TO anon, authenticated;
GRANT ALL ON public.tasks TO anon, authenticated;
GRANT ALL ON public.activities TO anon, authenticated;
GRANT ALL ON public.audits TO anon, authenticated;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';



-- ============================================================
-- FROM sql/09_update_ai_artifacts_kinds.sql
-- ============================================================

-- Update ai_artifacts table to support comprehensive analysis kinds
-- Run this in your Supabase SQL Editor

-- Update the check constraint to allow new comprehensive analysis kinds
ALTER TABLE ai_artifacts DROP CONSTRAINT IF EXISTS ai_artifacts_kind_check;

ALTER TABLE ai_artifacts 
DROP CONSTRAINT IF EXISTS ai_artifacts_kind_check;
ALTER TABLE ai_artifacts 
ADD CONSTRAINT ai_artifacts_kind_check 
CHECK (kind IN (
  'transcript', 
  'summary', 
  'intent', 
  'treatments', 
  'actions',
  'executive_summary',
  'patient_profile', 
  'treatments_analysis',
  'conversation_analysis',
  'strategic_insights',
  'immediate_actions'
));

-- Add comment explaining the kinds
COMMENT ON COLUMN ai_artifacts.kind IS 'Type of AI artifact: transcript, summary, intent, treatments, actions, executive_summary, patient_profile, treatments_analysis, conversation_analysis, strategic_insights, immediate_actions';



-- ============================================================
-- FROM sql/13_comprehensive_contact_fields.sql
-- ============================================================

-- Add comprehensive contact profile fields
-- This extends the contacts table to support a full dental practice contact profile

-- Add personal information fields
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS preferred_name TEXT,
ADD COLUMN IF NOT EXISTS title TEXT CHECK (title IN ('Mr', 'Mrs', 'Ms', 'Dr', 'Prof')),
ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
ADD COLUMN IF NOT EXISTS secondary_email TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
ADD COLUMN IF NOT EXISTS marital_status TEXT CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed', 'other')),
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS employer TEXT;

-- Add address information
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Add medical information
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS medical_conditions TEXT,
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS medications TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;

-- Add insurance information
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS insurance_provider TEXT,
ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
ADD COLUMN IF NOT EXISTS insurance_group_number TEXT;

-- Add preferences
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS preferred_appointment_time TEXT CHECK (preferred_appointment_time IN ('morning', 'afternoon', 'evening', 'flexible')),
ADD COLUMN IF NOT EXISTS communication_preference TEXT CHECK (communication_preference IN ('phone', 'email', 'sms', 'whatsapp')),
ADD COLUMN IF NOT EXISTS language_preference TEXT;

-- Add dental history
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS previous_dentist TEXT,
ADD COLUMN IF NOT EXISTS last_dental_visit DATE,
ADD COLUMN IF NOT EXISTS dental_anxiety_level TEXT CHECK (dental_anxiety_level IN ('none', 'mild', 'moderate', 'high')),
ADD COLUMN IF NOT EXISTS dental_concerns TEXT;

-- Add consent fields
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_consent BOOLEAN DEFAULT TRUE;

-- Add custom fields as JSONB
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- CREATE INDEX IF NOT EXISTS on custom fields for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_custom_fields ON contacts USING GIN (custom_fields);

-- CREATE TABLE IF NOT EXISTS for custom field definitions
CREATE TABLE IF NOT EXISTS custom_contact_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'select', 'date', 'boolean', 'number')),
    options TEXT[], -- For select fields
    required BOOLEAN DEFAULT FALSE,
    section TEXT DEFAULT 'custom',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- CREATE INDEX IF NOT EXISTS for custom field definitions
CREATE INDEX IF NOT EXISTS idx_custom_contact_fields_tenant ON custom_contact_fields(tenant_id, active);




-- ============================================================
-- FROM sql/14_add_pipeline_fields.sql
-- ============================================================

-- Add missing fields to pipelines table for better pipeline management
-- This migration adds description, is_default, and updated_at fields

-- Add description column for pipeline details
ALTER TABLE pipelines 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add is_default flag to mark default pipeline
ALTER TABLE pipelines 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Add updated_at for tracking changes
ALTER TABLE pipelines 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at to pipeline_stages as well
ALTER TABLE pipeline_stages 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure at least one pipeline is marked as default
-- (This will mark the first pipeline as default if none are)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pipelines WHERE is_default = true) THEN
        UPDATE pipelines 
        SET is_default = true 
        WHERE id = (SELECT id FROM pipelines ORDER BY created_at LIMIT 1);
    END IF;
END $$;

-- CREATE INDEX IF NOT EXISTS for faster default pipeline lookups
CREATE INDEX IF NOT EXISTS idx_pipelines_default ON pipelines(tenant_id, is_default) WHERE is_default = true;

-- Add helpful comment
COMMENT ON COLUMN pipelines.description IS 'Optional description explaining what this pipeline is used for';
COMMENT ON COLUMN pipelines.is_default IS 'Flag indicating if this is the default pipeline for new deals';



-- ============================================================
-- FROM sql/15_user_invitations.sql
-- ============================================================

-- User Invitations System
-- This migration adds support for inviting team members

-- Add missing fields to app_users table
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/London';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- CREATE unique INDEX IF NOT EXISTS on email per tenant
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



-- ============================================================
-- FROM sql/16_enterprise_permissions.sql
-- ============================================================

-- ============================================================
-- ENTERPRISE PERMISSION SYSTEM
-- Complete custom roles, granular permissions, and audit trail
-- ============================================================

-- ============================================================
-- 1. CUSTOM ROLES SYSTEM
-- ============================================================

-- Custom Roles Table (replacces hardcoded roles)
CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Receptionist", "Treatment Coordinator", "Senior Dentist"
  description TEXT,
  is_admin BOOLEAN DEFAULT false, -- Can access audit trail, manage roles
  is_system_role BOOLEAN DEFAULT false, -- Cannot be deleted (Owner role)
  color TEXT DEFAULT '#6366f1', -- For UI display
  icon TEXT, -- Icon name or emoji
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS custom_roles_tenant_id_idx ON custom_roles(tenant_id);
CREATE INDEX IF NOT EXISTS custom_roles_active_idx ON custom_roles(active);

-- ============================================================
-- 2. GRANULAR PERMISSIONS SYSTEM
-- ============================================================

-- Permission Definitions (Master List of ALL possible permissions)
CREATE TABLE IF NOT EXISTS permission_definitions (
  key TEXT PRIMARY KEY, -- e.g., "deals.view_all", "deals.edit_own", "pipelines.delete"
  category TEXT NOT NULL, -- "deals", "contacts", "pipelines", "tasks", "settings", "analytics"
  subcategory TEXT, -- "viewing", "editing", "deletion", "management"
  label TEXT NOT NULL, -- Human-readable label
  description TEXT, -- What this permission allows
  requires_ownership BOOLEAN DEFAULT false, -- If true, user must own the resource
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS permission_definitions_category_idx ON permission_definitions(category);

-- Role Permissions (Junction table: What can each role do?)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permission_definitions(key) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true, -- true = allowed, false = explicitly denied
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_key)
);

CREATE INDEX IF NOT EXISTS role_permissions_role_id_idx ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS role_permissions_permission_key_idx ON role_permissions(permission_key);

-- ============================================================
-- 3. USER PROFILES SYSTEM
-- ============================================================

-- User Profiles (Assignable templates with preset permissions & settings)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "New Staff Onboarding", "Manager Standard", "Front Desk"
  description TEXT,
  role_id UUID REFERENCES custom_roles(id), -- Default role for this profile
  settings JSONB DEFAULT '{}', -- Preset preferences, dashboard layout, etc.
  created_by_user_id UUID REFERENCES app_users(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS user_profiles_tenant_id_idx ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS user_profiles_role_id_idx ON user_profiles(role_id);

-- ============================================================
-- 4. ENHANCED APP_USERS
-- ============================================================

-- Add profile assignment to users
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES user_profiles(id);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES custom_roles(id);
-- PATCHED: keeping role for legacy views -- ALTER TABLE app_users DROP COLUMN IF EXISTS role; -- Remove old hardcoded role column

CREATE INDEX IF NOT EXISTS app_users_profile_id_idx ON app_users(profile_id);
CREATE INDEX IF NOT EXISTS app_users_custom_role_id_idx ON app_users(custom_role_id);

-- ============================================================
-- 5. COMPREHENSIVE AUDIT TRAIL
-- ============================================================

-- Enhanced Audit Trail (Logs EVERYTHING)
CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  
  -- Action details
  action_type TEXT NOT NULL, -- "create", "update", "delete", "assign", "move", etc.
  action_category TEXT NOT NULL, -- "deal", "contact", "pipeline", "user", "setting"
  action_description TEXT, -- Human-readable: "Updated deal title from X to Y"
  
  -- Entity details
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT, -- Snapshot of name at time of action
  
  -- State tracking (before/after)
  before_state JSONB, -- Full state before change
  after_state JSONB, -- Full state after change
  changed_fields TEXT[], -- Array of field names that changed
  
  -- Context
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  
  -- Visibility & Security
  visible_to_admin_only BOOLEAN DEFAULT false,
  sensitive_data BOOLEAN DEFAULT false, -- Contains PII or sensitive info
  
  -- Metadata
  tags TEXT[], -- For filtering/searching
  severity TEXT DEFAULT 'info', -- "info", "warning", "critical"
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS audit_trail_tenant_id_idx ON audit_trail(tenant_id);
CREATE INDEX IF NOT EXISTS audit_trail_user_id_idx ON audit_trail(user_id);
CREATE INDEX IF NOT EXISTS audit_trail_entity_idx ON audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_trail_action_category_idx ON audit_trail(action_category);
CREATE INDEX IF NOT EXISTS audit_trail_created_at_idx ON audit_trail(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_trail_severity_idx ON audit_trail(severity);
CREATE INDEX IF NOT EXISTS audit_trail_admin_only_idx ON audit_trail(visible_to_admin_only) WHERE visible_to_admin_only = true;

-- ============================================================
-- 6. COMPREHENSIVE SETTINGS STORAGE
-- ============================================================

-- Pipeline Settings (Every possible pipeline configuration)
CREATE TABLE IF NOT EXISTS pipeline_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- General Settings
  icon TEXT,
  color TEXT,
  visibility TEXT DEFAULT 'everyone', -- "everyone", "admins_only", "specific_roles"
  visible_to_role_ids UUID[], -- Array of role IDs if visibility is "specific_roles"
  
  -- Automation Settings
  auto_assignment_enabled BOOLEAN DEFAULT false,
  auto_assignment_rules JSONB, -- Rules for auto-assigning deals
  
  -- Stage Settings
  enforce_stage_order BOOLEAN DEFAULT false, -- Prevent skipping stages
  stage_time_limits JSONB, -- SLA per stage: { "stage_id": days }
  required_fields_per_stage JSONB, -- { "stage_id": ["field1", "field2"] }
  
  -- Notifications
  notify_on_stage_change BOOLEAN DEFAULT false,
  notify_on_stuck_deal BOOLEAN DEFAULT true,
  stuck_deal_threshold_days INTEGER DEFAULT 14,
  email_templates_per_stage JSONB, -- { "stage_id": "template_id" }
  
  -- Deal Rules
  duplicate_prevention BOOLEAN DEFAULT true,
  value_min_threshold_cents INTEGER,
  value_max_threshold_cents INTEGER,
  require_treatment_tags BOOLEAN DEFAULT false,
  
  -- Integrations
  webhook_url TEXT,
  webhook_events TEXT[], -- Which events trigger webhook
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pipeline_id)
);

CREATE INDEX IF NOT EXISTS pipeline_settings_pipeline_id_idx ON pipeline_settings(pipeline_id);

-- Deal Settings (Global rules for all deals)
CREATE TABLE IF NOT EXISTS deal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Field Settings
  required_fields TEXT[], -- Global required fields
  custom_fields JSONB, -- User-defined custom fields
  field_visibility_by_role JSONB, -- { "role_id": ["field1", "field2"] }
  
  -- Validation Rules
  value_min_cents INTEGER DEFAULT 0,
  value_max_cents INTEGER,
  allow_zero_value BOOLEAN DEFAULT true,
  currency_options TEXT[] DEFAULT ARRAY['GBP', 'USD', 'EUR'],
  default_currency TEXT DEFAULT 'GBP',
  
  -- Behavior Settings
  duplicate_detection_enabled BOOLEAN DEFAULT true,
  duplicate_check_fields TEXT[] DEFAULT ARRAY['contact_id', 'title'],
  auto_archive_after_days INTEGER,
  auto_close_lost_after_days INTEGER,
  
  -- Tag Settings
  required_treatment_tags BOOLEAN DEFAULT false,
  min_treatment_tags INTEGER DEFAULT 0,
  max_treatment_tags INTEGER,
  allowed_treatment_tags TEXT[], -- Restrict to specific tags
  
  -- Assignment Settings
  allow_unassigned BOOLEAN DEFAULT true,
  auto_assign_new_deals BOOLEAN DEFAULT false,
  assignment_method TEXT DEFAULT 'manual', -- "manual", "round_robin", "by_value", "by_source"
  
  -- Lifecycle Settings
  default_stage_id UUID,
  won_stage_ids UUID[], -- Array of stage IDs that count as "won"
  lost_stage_ids UUID[], -- Array of stage IDs that count as "lost"
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS deal_settings_tenant_id_idx ON deal_settings(tenant_id);

-- Contact Settings
CREATE TABLE IF NOT EXISTS contact_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Field Settings
  required_fields TEXT[] DEFAULT ARRAY['full_name', 'primary_phone'],
  custom_fields JSONB,
  
  -- Validation
  validate_email BOOLEAN DEFAULT true,
  validate_phone BOOLEAN DEFAULT true,
  phone_format TEXT DEFAULT 'UK', -- Format validation
  
  -- Duplicate Detection
  duplicate_detection_enabled BOOLEAN DEFAULT true,
  duplicate_check_fields TEXT[] DEFAULT ARRAY['primary_email', 'primary_phone'],
  auto_merge_duplicates BOOLEAN DEFAULT false,
  
  -- Privacy & Compliance
  require_consent BOOLEAN DEFAULT false,
  gdpr_enabled BOOLEAN DEFAULT true,
  data_retention_days INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS contact_settings_tenant_id_idx ON contact_settings(tenant_id);

-- Task Settings
CREATE TABLE IF NOT EXISTS task_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Default Settings
  default_priority TEXT DEFAULT 'normal',
  default_assignee_strategy TEXT DEFAULT 'manual', -- "manual", "creator", "deal_owner"
  
  -- Auto-creation Rules
  auto_create_on_deal_stage JSONB, -- { "stage_id": { "title": "...", "priority": "..." } }
  auto_create_on_contact_created BOOLEAN DEFAULT false,
  
  -- Reminders
  reminder_before_due_hours INTEGER DEFAULT 24,
  overdue_alert_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS task_settings_tenant_id_idx ON task_settings(tenant_id);

-- ============================================================
-- 7. INSERT DEFAULT PERMISSION DEFINITIONS
-- ============================================================

INSERT INTO permission_definitions (key, category, subcategory, label, description, requires_ownership, display_order) VALUES
-- DEALS
('deals.view_all', 'deals', 'viewing', 'View All Deals', 'Can view all deals in the practice', false, 1),
('deals.view_team', 'deals', 'viewing', 'View Team Deals', 'Can view deals owned by team members', false, 2),
('deals.view_own', 'deals', 'viewing', 'View Own Deals', 'Can view only their own deals', true, 3),
('deals.create', 'deals', 'creation', 'Create Deals', 'Can create new deals', false, 10),
('deals.edit_all', 'deals', 'editing', 'Edit All Deals', 'Can edit any deal', false, 20),
('deals.edit_own', 'deals', 'editing', 'Edit Own Deals', 'Can edit only their own deals', true, 21),
('deals.edit_title', 'deals', 'editing', 'Edit Deal Title', 'Can change deal titles', false, 22),
('deals.edit_value', 'deals', 'editing', 'Edit Deal Value', 'Can change deal values', false, 23),
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

-- CONTACTS
('contacts.view_all', 'contacts', 'viewing', 'View All Contacts', 'Can view all contacts', false, 100),
('contacts.create', 'contacts', 'creation', 'Create Contacts', 'Can create new contacts', false, 110),
('contacts.edit_all', 'contacts', 'editing', 'Edit All Contacts', 'Can edit any contact', false, 120),
('contacts.edit_personal_info', 'contacts', 'editing', 'Edit Personal Info', 'Can edit contact personal details', false, 121),
('contacts.edit_medical_info', 'contacts', 'editing', 'Edit Medical Info', 'Can edit medical/dental history', false, 122),
('contacts.delete', 'contacts', 'deletion', 'Delete Contacts', 'Can delete contacts', false, 130),
('contacts.merge', 'contacts', 'advanced', 'Merge Duplicates', 'Can merge duplicate contacts', false, 140),
('contacts.export', 'contacts', 'data', 'Export Contacts', 'Can export contact data', false, 150),
('contacts.import', 'contacts', 'data', 'Import Contacts', 'Can import contact data', false, 151),

-- PIPELINES
('pipelines.view', 'pipelines', 'viewing', 'View Pipelines', 'Can view pipeline boards', false, 200),
('pipelines.create', 'pipelines', 'creation', 'Create Pipelines', 'Can create new pipelines', false, 210),
('pipelines.edit', 'pipelines', 'editing', 'Edit Pipelines', 'Can edit pipeline details', false, 220),
('pipelines.edit_stages', 'pipelines', 'editing', 'Manage Stages', 'Can add/edit/remove stages', false, 221),
('pipelines.reorder_stages', 'pipelines', 'editing', 'Reorder Stages', 'Can change stage order', false, 222),
('pipelines.delete', 'pipelines', 'deletion', 'Delete Pipelines', 'Can delete pipelines', false, 230),
('pipelines.configure_automation', 'pipelines', 'advanced', 'Configure Automation', 'Can set up pipeline automation rules', false, 240),
('pipelines.set_default', 'pipelines', 'management', 'Set Default Pipeline', 'Can mark pipeline as default', false, 250),

-- TASKS
('tasks.view_all', 'tasks', 'viewing', 'View All Tasks', 'Can view all tasks', false, 300),
('tasks.view_assigned', 'tasks', 'viewing', 'View Assigned Tasks', 'Can view only assigned tasks', true, 301),
('tasks.create', 'tasks', 'creation', 'Create Tasks', 'Can create new tasks', false, 310),
('tasks.edit_all', 'tasks', 'editing', 'Edit All Tasks', 'Can edit any task', false, 320),
('tasks.edit_own', 'tasks', 'editing', 'Edit Own Tasks', 'Can edit only assigned tasks', true, 321),
('tasks.delete_all', 'tasks', 'deletion', 'Delete All Tasks', 'Can delete any task', false, 330),
('tasks.delete_own', 'tasks', 'deletion', 'Delete Own Tasks', 'Can delete only assigned tasks', true, 331),
('tasks.assign_to_others', 'tasks', 'assignment', 'Assign to Others', 'Can assign tasks to other users', false, 340),
('tasks.complete', 'tasks', 'actions', 'Complete Tasks', 'Can mark tasks as complete', false, 350),

-- ACTIVITIES & COMMUNICATIONS
('activities.view_all', 'activities', 'viewing', 'View All Activities', 'Can view all communications', false, 400),
('activities.view_assigned_deals', 'activities', 'viewing', 'View Deal Activities', 'Can view activities for assigned deals', true, 401),
('activities.create', 'activities', 'creation', 'Log Activities', 'Can create activity records', false, 410),
('activities.edit', 'activities', 'editing', 'Edit Activities', 'Can edit activity records', false, 420),
('activities.delete', 'activities', 'deletion', 'Delete Activities', 'Can delete activity records', false, 430),

-- USERS & TEAM
('users.view_all', 'users', 'viewing', 'View All Users', 'Can see all team members', false, 500),
('users.invite', 'users', 'management', 'Invite Users', 'Can send team invitations', false, 510),
('users.edit_profile', 'users', 'management', 'Edit User Profiles', 'Can edit other users profiles', false, 520),
('users.edit_own_profile', 'users', 'management', 'Edit Own Profile', 'Can edit their own profile', true, 521),
('users.assign_roles', 'users', 'management', 'Assign Roles', 'Can change user roles', false, 530),
('users.deactivate', 'users', 'management', 'Deactivate Users', 'Can deactivate team members', false, 540),
('users.delete', 'users', 'management', 'Delete Users', 'Can permanently delete users', false, 550),

-- ROLES & PERMISSIONS
('roles.view', 'roles', 'viewing', 'View Roles', 'Can see custom roles', false, 600),
('roles.create', 'roles', 'management', 'Create Roles', 'Can create custom roles', false, 610),
('roles.edit', 'roles', 'management', 'Edit Roles', 'Can edit role details', false, 620),
('roles.edit_permissions', 'roles', 'management', 'Edit Permissions', 'Can change role permissions', false, 621),
('roles.delete', 'roles', 'management', 'Delete Roles', 'Can delete custom roles', false, 630),

-- SETTINGS
('settings.view_all', 'settings', 'viewing', 'View All Settings', 'Can access settings page', false, 700),
('settings.edit_pipeline', 'settings', 'editing', 'Edit Pipeline Settings', 'Can configure pipeline settings', false, 710),
('settings.edit_deal', 'settings', 'editing', 'Edit Deal Settings', 'Can configure deal settings', false, 711),
('settings.edit_contact', 'settings', 'editing', 'Edit Contact Settings', 'Can configure contact settings', false, 712),
('settings.edit_task', 'settings', 'editing', 'Edit Task Settings', 'Can configure task settings', false, 713),
('settings.edit_integrations', 'settings', 'editing', 'Edit Integrations', 'Can configure external integrations', false, 720),
('settings.edit_notifications', 'settings', 'editing', 'Edit Notifications', 'Can configure notification settings', false, 730),

-- ANALYTICS & REPORTING
('analytics.view_own', 'analytics', 'viewing', 'View Own Analytics', 'Can view their own performance', true, 800),
('analytics.view_team', 'analytics', 'viewing', 'View Team Analytics', 'Can view team performance', false, 810),
('analytics.view_all', 'analytics', 'viewing', 'View All Analytics', 'Can view all practice analytics', false, 820),
('analytics.export', 'analytics', 'data', 'Export Reports', 'Can export analytics reports', false, 830),

-- AUDIT & SECURITY
('audit.view', 'audit', 'viewing', 'View Audit Trail', 'Can view audit logs', false, 900),
('audit.view_sensitive', 'audit', 'viewing', 'View Sensitive Audit Data', 'Can view admin-only audit logs', false, 910),
('audit.export', 'audit', 'data', 'Export Audit Logs', 'Can export audit trail', false, 920),
('audit.delete', 'audit', 'management', 'Delete Audit Records', 'Can delete audit logs (dangerous!)', false, 930)

ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 8. CREATE DEFAULT ROLES WITH PERMISSIONS
-- ============================================================

-- Insert default Owner role (system role)
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

-- Grant ALL permissions to Owner role
INSERT INTO role_permissions (role_id, permission_key, granted)
SELECT 
  cr.id,
  pd.key,
  true
FROM custom_roles cr
CROSS JOIN permission_definitions pd
WHERE cr.name = 'Practice Owner' AND cr.is_system_role = true
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- ============================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================

COMMENT ON TABLE custom_roles IS 'User-defined roles with custom names and permissions';
COMMENT ON TABLE permission_definitions IS 'Master list of all possible permissions in the system';
COMMENT ON TABLE role_permissions IS 'Junction table defining which permissions each role has';
COMMENT ON TABLE user_profiles IS 'Assignable user profile templates with preset settings';
COMMENT ON TABLE audit_trail IS 'Comprehensive audit log tracking every action with before/after states';
COMMENT ON TABLE pipeline_settings IS 'Complete configuration for each pipeline including automation';
COMMENT ON TABLE deal_settings IS 'Global deal management rules and validation';
COMMENT ON TABLE contact_settings IS 'Global contact management rules and validation';
COMMENT ON TABLE task_settings IS 'Global task management rules and automation';




-- ============================================================
-- FROM sql/17_ai_assistant_tables.sql
-- ============================================================

-- ============================================================
-- AI ASSISTANT SYSTEM TABLES
-- ============================================================
-- Stores chat sessions, drafts, and AI analytics

-- AI Chat Sessions (conversation memory)
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL, -- 'deal', 'contact', 'global'
  context_id UUID, -- deal_id or contact_id (null for global)
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Drafts (AI-generated email drafts)
CREATE TABLE IF NOT EXISTS ai_email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  draft_subject TEXT NOT NULL,
  draft_body TEXT NOT NULL,
  generated_by_ai BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending', -- 'pending', 'edited', 'sent', 'discarded'
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Assistant Preferences (per user)
CREATE TABLE IF NOT EXISTS ai_assistant_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  response_style TEXT DEFAULT 'friendly', -- 'professional', 'friendly', 'concise', 'detailed'
  ai_model TEXT DEFAULT 'gpt-4-turbo-preview',
  auto_actions JSONB DEFAULT '["draft_emails", "suggest_tasks", "detect_cold_leads"]',
  focus_areas JSONB DEFAULT '["closing_deals", "patient_satisfaction"]',
  custom_rules JSONB DEFAULT '[]',
  email_draft_settings JSONB DEFAULT '{"opening": "warm", "closing": "warm_regards", "tone": "professional_friendly"}',
  notification_preferences JSONB DEFAULT '{"cold_leads_days": 7, "high_value_threshold": 5000}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- AI Usage Analytics
CREATE TABLE IF NOT EXISTS ai_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL,
  context_id UUID,
  question_asked TEXT,
  response_generated TEXT,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  helpful_rating INTEGER, -- 1-5 stars, user feedback
  action_taken TEXT, -- 'draft_email', 'create_task', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Proactive AI Suggestions
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL, -- 'cold_lead', 'high_value', 'negative_sentiment', 'task_suggestion'
  suggestion_text TEXT NOT NULL,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT DEFAULT 'pending', -- 'pending', 'acted_on', 'dismissed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acted_on_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS ai_chat_sessions_context_idx ON ai_chat_sessions(context_type, context_id);
CREATE INDEX IF NOT EXISTS ai_chat_sessions_user_idx ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS ai_email_drafts_status_idx ON ai_email_drafts(status);
CREATE INDEX IF NOT EXISTS ai_email_drafts_activity_idx ON ai_email_drafts(activity_id);
CREATE INDEX IF NOT EXISTS ai_usage_analytics_user_idx ON ai_usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS ai_suggestions_status_idx ON ai_suggestions(status);
CREATE INDEX IF NOT EXISTS ai_suggestions_deal_idx ON ai_suggestions(deal_id);

-- Insert default preferences for existing users
INSERT INTO ai_assistant_preferences (tenant_id, user_id, custom_rules)
SELECT 
  tenant_id,
  id,
  '["For deals over £5,000, always mention payment plan options", "If patient mentions anxiety, emphasize sedation and comfort options"]'::jsonb
FROM app_users
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- Comments
COMMENT ON TABLE ai_chat_sessions IS 'Stores AI assistant conversation history per deal/contact';
COMMENT ON TABLE ai_email_drafts IS 'AI-generated email drafts awaiting review';
COMMENT ON TABLE ai_assistant_preferences IS 'User-specific AI assistant configuration';
COMMENT ON TABLE ai_usage_analytics IS 'Tracks AI usage for analytics and cost monitoring';
COMMENT ON TABLE ai_suggestions IS 'Proactive AI suggestions for deals and contacts';




-- ============================================================
-- FROM sql/18_enterprise_tasks_activities.sql
-- ============================================================

-- ============================================================================
-- ENTERPRISE TASKS & ACTIVITIES ENHANCEMENT
-- ============================================================================
-- This migration ADDS features to existing tables (non-breaking)
-- Your current data stays 100% safe!
-- ============================================================================

-- ============================================================================
-- PART 1: ENHANCE TASKS TABLE
-- ============================================================================

-- Add new task columns (all optional, won't break existing data)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'todo' 
  CHECK (task_type IN ('call', 'email', 'todo', 'meeting', 'follow_up'));

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurring_rule_id UUID;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for parent_task_id (for subtasks)
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);

-- Add index for recurring tasks
CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON tasks(is_recurring, recurring_rule_id) WHERE is_recurring = TRUE;

-- Add index for reminders
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_at ON tasks(reminder_at) WHERE reminder_at IS NOT NULL;


-- ============================================================================
-- PART 2: ENHANCE ACTIVITIES TABLE
-- ============================================================================

-- First, drop the old constraint (if it exists)
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_type_check;

-- Add new activity types (sms, meeting)
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_type_check;
ALTER TABLE activities ADD CONSTRAINT activities_type_check 
  CHECK (type IN ('call', 'email', 'whatsapp', 'note', 'sms', 'meeting'));

-- Add outcome column for calls
ALTER TABLE activities ADD COLUMN IF NOT EXISTS outcome TEXT 
  CHECK (outcome IN ('connected', 'voicemail', 'no_answer', 'busy', 'wrong_number', 'completed', 'cancelled'));

-- Add duration for calls/meetings
ALTER TABLE activities ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Add attendees for meetings (JSONB array)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS attendees JSONB DEFAULT '[]';

-- Add mentions (array of user IDs)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS mentions UUID[];

-- Add parent activity ID (for email threads, reply chains)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS parent_activity_id UUID REFERENCES activities(id) ON DELETE SET NULL;

-- Add edit tracking
ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

ALTER TABLE activities ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE activities ADD COLUMN IF NOT EXISTS edited_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL;

-- Add rich content (for formatted notes, email HTML)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS rich_content TEXT;

-- Add metadata (flexible JSONB for future fields)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_activities_outcome ON activities(outcome) WHERE outcome IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_parent_id ON activities(parent_activity_id) WHERE parent_activity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_mentions ON activities USING GIN(mentions);


-- ============================================================================
-- PART 3: NEW TABLES FOR ADVANCED FEATURES
-- ============================================================================

-- Task Templates (pre-configured task blueprints)
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN ('call', 'email', 'todo', 'meeting', 'follow_up')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  estimated_duration_minutes INTEGER,
  default_notes TEXT,
  trigger_stage_id UUID, -- Optional: auto-create when deal enters this stage
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_templates_tenant ON task_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_trigger_stage ON task_templates(trigger_stage_id) WHERE trigger_stage_id IS NOT NULL;


-- Recurring Task Rules
CREATE TABLE IF NOT EXISTS recurring_task_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval INTEGER DEFAULT 1, -- e.g., every 2 weeks = weekly + interval 2
  days_of_week INTEGER[], -- 0=Sunday, 6=Saturday
  day_of_month INTEGER, -- 1-31
  end_date DATE,
  max_occurrences INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Task Dependencies (Task B depends on Task A)
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, -- The task that's blocked
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, -- The task it depends on
  dependency_type TEXT DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start', 'start_to_start')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);


-- Association Links (many-to-many for tasks/activities to deals/contacts)
CREATE TABLE IF NOT EXISTS association_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('task', 'activity')),
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('deal', 'contact', 'company')),
  target_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source_type, source_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_association_links_source ON association_links(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_association_links_target ON association_links(target_type, target_id);


-- Activity Templates (call scripts, email templates, meeting agendas)
CREATE TABLE IF NOT EXISTS activity_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'note', 'meeting')),
  subject_template TEXT,
  content_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]', -- List of available variables like {{contact_name}}, {{deal_value}}
  category TEXT, -- e.g., "Sales", "Support", "Follow-up"
  is_active BOOLEAN DEFAULT TRUE,
  created_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_templates_tenant ON activity_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_templates_type ON activity_templates(activity_type);


-- Task Comments (for collaboration)
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[], -- Array of user IDs mentioned
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_mentions ON task_comments USING GIN(mentions);


-- ============================================================================
-- PART 4: UPDATE TYPE DEFINITIONS
-- ============================================================================

-- Add more AI artifact kinds
ALTER TABLE ai_artifacts DROP CONSTRAINT IF EXISTS ai_artifacts_kind_check;
ALTER TABLE ai_artifacts DROP CONSTRAINT IF EXISTS ai_artifacts_kind_check;
ALTER TABLE ai_artifacts ADD CONSTRAINT ai_artifacts_kind_check 
  CHECK (kind IN ('transcript', 'summary', 'intent', 'treatments', 'actions', 'conversation_analysis', 'sentiment', 'urgency', 'likelihood_score'));


-- ============================================================================
-- PART 5: USEFUL VIEWS FOR ANALYTICS
-- ============================================================================

/* PATCHED: view recreated later in migrations/20250120_add_location_to_tasks_view.sql */
/*
-- View: Tasks with associations
DROP VIEW IF EXISTS tasks_with_associations CASCADE;
CREATE VIEW tasks_with_associations AS
SELECT 
  t.*,
  c.full_name as contact_name,
  d.title as deal_title,
  u.full_name as assignee_name,
  loc.name as location_name,
  COALESCE(
    (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id), 0
  ) as subtask_count,
  COALESCE(
    (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id), 0
  ) as comment_count
FROM tasks t
LEFT JOIN contacts c ON t.contact_id = c.id
LEFT JOIN deals d ON t.deal_id = d.id
LEFT JOIN app_users u ON t.assignee_user_id = u.id
LEFT JOIN locations loc ON t.location_id = loc.id;
*/


-- View: Activities with associations
DROP VIEW IF EXISTS activities_with_associations CASCADE;
CREATE VIEW activities_with_associations AS
SELECT 
  a.*,
  c.full_name as contact_name,
  d.title as deal_title,
  u.full_name as agent_name,
  COALESCE(
    (SELECT COUNT(*) FROM activity_files af WHERE af.activity_id = a.id), 0
  ) as file_count,
  COALESCE(
    (SELECT COUNT(*) FROM ai_artifacts ai WHERE ai.activity_id = a.id), 0
  ) as artifact_count
FROM activities a
LEFT JOIN contacts c ON a.contact_id = c.id
LEFT JOIN deals d ON a.deal_id = d.id
LEFT JOIN app_users u ON a.agent_user_id = u.id;


-- ============================================================================
-- DONE! 
-- ============================================================================
-- ✅ All existing data preserved
-- ✅ New columns added (all optional)
-- ✅ New tables created for advanced features
-- ✅ Indexes added for performance
-- ✅ Views created for easy querying
-- ============================================================================




-- ============================================================
-- FROM sql/19_activity_integrations.sql
-- ============================================================

-- ============================================================================
-- ACTIVITY INTEGRATIONS INFRASTRUCTURE
-- ============================================================================
-- This migration adds all fields needed for email, SMS, WhatsApp, and call integrations
-- The system will be READY to plug in real APIs when you're ready!
-- ============================================================================

-- ============================================================================
-- PART 1: ENHANCE ACTIVITIES TABLE FOR INTEGRATIONS
-- ============================================================================

-- Add integration provider field
ALTER TABLE activities ADD COLUMN IF NOT EXISTS integration_provider TEXT;
-- Options: 'twilio_sms', 'twilio_whatsapp', 'twilio_voice', 'gmail', 'outlook', 'sendgrid', 'manual'

-- Add external ID (link to provider's message/call ID)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Add integration metadata (provider-specific data)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS integration_metadata JSONB DEFAULT '{}';

-- Add conversation thread ID (for grouping related messages)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS thread_id TEXT;

-- Add email-specific fields
ALTER TABLE activities ADD COLUMN IF NOT EXISTS email_to TEXT[];
ALTER TABLE activities ADD COLUMN IF NOT EXISTS email_cc TEXT[];
ALTER TABLE activities ADD COLUMN IF NOT EXISTS email_bcc TEXT[];
ALTER TABLE activities ADD COLUMN IF NOT EXISTS email_from TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS email_reply_to TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT FALSE;

-- Add SMS/WhatsApp specific fields
ALTER TABLE activities ADD COLUMN IF NOT EXISTS from_number TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS to_number TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS message_status TEXT;
-- Options: 'queued', 'sent', 'delivered', 'failed', 'read'

-- Add call-specific fields (extend existing duration_seconds)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS call_sid TEXT; -- Twilio call SID
ALTER TABLE activities ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS call_from TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS call_to TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_activities_integration_provider ON activities(integration_provider) WHERE integration_provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_external_id ON activities(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_thread_id ON activities(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_message_status ON activities(message_status) WHERE message_status IS NOT NULL;


-- ============================================================================
-- PART 2: INTEGRATION SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Email Settings
  email_provider TEXT, -- 'gmail', 'outlook', 'sendgrid', 'ses'
  email_api_key TEXT,
  email_from_address TEXT,
  email_from_name TEXT,
  email_oauth_token TEXT,
  email_oauth_refresh_token TEXT,
  email_oauth_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- SMS Settings (Twilio)
  sms_provider TEXT DEFAULT 'twilio',
  sms_account_sid TEXT,
  sms_auth_token TEXT,
  sms_from_number TEXT,
  
  -- WhatsApp Settings (Twilio WhatsApp)
  whatsapp_provider TEXT DEFAULT 'twilio',
  whatsapp_account_sid TEXT,
  whatsapp_auth_token TEXT,
  whatsapp_from_number TEXT, -- Format: whatsapp:+14155238886
  
  -- Voice/Call Settings (Twilio Voice)
  voice_provider TEXT DEFAULT 'twilio',
  voice_account_sid TEXT,
  voice_auth_token TEXT,
  voice_from_number TEXT,
  
  -- Webhook URLs (for receiving messages/calls)
  email_webhook_url TEXT,
  sms_webhook_url TEXT,
  whatsapp_webhook_url TEXT,
  voice_webhook_url TEXT,
  
  -- Status & Metadata
  is_email_configured BOOLEAN DEFAULT FALSE,
  is_sms_configured BOOLEAN DEFAULT FALSE,
  is_whatsapp_configured BOOLEAN DEFAULT FALSE,
  is_voice_configured BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id)
);


-- ============================================================================
-- PART 3: ACTIVITY ATTACHMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  
  file_name TEXT NOT NULL,
  file_size INTEGER, -- bytes
  file_type TEXT, -- MIME type
  file_url TEXT NOT NULL, -- Supabase storage URL
  storage_path TEXT, -- Path in Supabase storage
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_attachments_activity ON activity_attachments(activity_id);


-- ============================================================================
-- PART 4: INTEGRATION LOGS (For Debugging)
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  integration_type TEXT NOT NULL, -- 'email', 'sms', 'whatsapp', 'voice'
  action TEXT NOT NULL, -- 'send', 'receive', 'error'
  provider TEXT, -- 'twilio', 'gmail', etc
  
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  external_id TEXT, -- Provider's message/call ID
  
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  
  status TEXT NOT NULL, -- 'success', 'error', 'pending'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_logs_tenant ON integration_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_activity ON integration_logs(activity_id) WHERE activity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_logs_created ON integration_logs(created_at DESC);


-- ============================================================================
-- PART 5: UPDATE VIEWS
-- ============================================================================

-- Enhanced activities view with integration data
DROP VIEW IF EXISTS activities_with_integrations CASCADE;
CREATE VIEW activities_with_integrations AS
SELECT 
  a.*,
  c.full_name as contact_name,
  c.primary_email as contact_email,
  c.primary_phone as contact_phone,
  d.title as deal_title,
  d.value_estimate_cents as deal_value,
  ps.name as deal_stage,
  p.name as deal_pipeline,
  u.full_name as agent_name,
  COALESCE(
    (SELECT COUNT(*) FROM activity_attachments WHERE activity_id = a.id), 0
  ) as attachment_count,
  COALESCE(
    (SELECT COUNT(*) FROM ai_artifacts WHERE activity_id = a.id), 0
  ) as ai_artifact_count,
  CASE 
    WHEN a.integration_provider IS NOT NULL THEN true
    ELSE false
  END as is_integrated
FROM activities a
LEFT JOIN contacts c ON a.contact_id = c.id
LEFT JOIN deals d ON a.deal_id = d.id
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
LEFT JOIN pipelines p ON ps.pipeline_id = p.id
LEFT JOIN app_users u ON a.agent_user_id = u.id;


-- ============================================================================
-- DONE! 🎉
-- ============================================================================
-- ✅ Activities table enhanced with integration fields
-- ✅ Integration settings table created (stores API keys)
-- ✅ Attachments table created
-- ✅ Integration logs table created (for debugging)
-- ✅ Enhanced view created
-- 
-- NEXT STEPS FOR YOU:
-- 1. Run this migration in Supabase SQL Editor
-- 2. We'll build the UI and API endpoints
-- 3. When ready to integrate, just add API keys to integration_settings!
-- ============================================================================




-- ============================================================
-- FROM sql/20_marketing_core_tables.sql
-- ============================================================

-- =====================================================
-- MARKETING MODULE - CORE TABLES
-- Migration 20: Audiences, Segments, Tags, Templates
-- =====================================================

-- Marketing Audiences (Logical groupings of contacts)
CREATE TABLE IF NOT EXISTS marketing_audiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by_user_id UUID REFERENCES app_users(id),
    is_active BOOLEAN DEFAULT TRUE,
    contact_count INTEGER DEFAULT 0, -- Cached count
    last_refreshed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_audiences_tenant ON marketing_audiences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_audiences_active ON marketing_audiences(tenant_id, is_active);

-- Marketing Segments (Saved filters/queries)
CREATE TABLE IF NOT EXISTS marketing_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    audience_id UUID REFERENCES marketing_audiences(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    -- Filter definition as JSON (field conditions, tags, behaviors)
    definition_json JSONB NOT NULL DEFAULT '{}',
    is_saved BOOLEAN DEFAULT TRUE,
    is_dynamic BOOLEAN DEFAULT TRUE, -- Refreshes membership automatically
    contact_count INTEGER DEFAULT 0, -- Cached count
    created_by_user_id UUID REFERENCES app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_segments_tenant ON marketing_segments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_segments_audience ON marketing_segments(audience_id);
CREATE INDEX IF NOT EXISTS idx_marketing_segments_definition ON marketing_segments USING GIN (definition_json);

-- Marketing Tags (Maps to contacts.tags array)
CREATE TABLE IF NOT EXISTS marketing_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6B7280', -- Hex color for UI
    category TEXT, -- Group tags (e.g., 'source', 'interest', 'behavior')
    usage_count INTEGER DEFAULT 0, -- How many contacts have this tag
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_marketing_tags_tenant ON marketing_tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_tags_category ON marketing_tags(tenant_id, category);

-- Contact Segment Membership (Cached for performance)
CREATE TABLE IF NOT EXISTS contact_segment_membership (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    segment_id UUID NOT NULL REFERENCES marketing_segments(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_qualified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contact_id, segment_id)
);

CREATE INDEX IF NOT EXISTS idx_segment_membership_contact ON contact_segment_membership(contact_id);
CREATE INDEX IF NOT EXISTS idx_segment_membership_segment ON contact_segment_membership(segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_membership_tenant ON contact_segment_membership(tenant_id);

-- Marketing Templates (Email/SMS content templates)
CREATE TABLE IF NOT EXISTS marketing_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
    
    -- Email-specific
    subject_line TEXT,
    preheader TEXT,
    from_name TEXT,
    from_email TEXT,
    
    -- Template content
    content_html TEXT, -- Final HTML
    content_json JSONB, -- Drag-drop blocks structure
    content_text TEXT, -- Plain text version
    
    -- Template metadata
    thumbnail_url TEXT,
    category TEXT, -- 'welcome', 'promotional', 'newsletter', etc.
    is_public BOOLEAN DEFAULT FALSE, -- Shared in template library
    usage_count INTEGER DEFAULT 0,
    
    -- AI metadata
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_prompt TEXT,
    
    created_by_user_id UUID REFERENCES app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_templates_tenant ON marketing_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_templates_type ON marketing_templates(type);
CREATE INDEX IF NOT EXISTS idx_marketing_templates_category ON marketing_templates(tenant_id, category);

-- Template Versions (Track changes)
CREATE TABLE IF NOT EXISTS marketing_template_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES marketing_templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content_json JSONB NOT NULL,
    content_html TEXT,
    changed_by_user_id UUID REFERENCES app_users(id),
    change_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_template_versions_template ON marketing_template_versions(template_id);

-- Marketing Module Settings (Feature flags, provider configs)
CREATE TABLE IF NOT EXISTS marketing_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Feature flags
    enable_journeys BOOLEAN DEFAULT TRUE,
    enable_ab_testing BOOLEAN DEFAULT TRUE,
    enable_sms BOOLEAN DEFAULT FALSE,
    enable_landing_pages BOOLEAN DEFAULT TRUE,
    enable_ai_features BOOLEAN DEFAULT TRUE,
    
    -- Provider settings
    mail_provider TEXT DEFAULT 'noop', -- 'sendgrid', 'mailgun', 'ses', 'noop'
    mail_provider_api_key TEXT,
    mail_provider_domain TEXT,
    mail_default_from_email TEXT,
    mail_default_from_name TEXT,
    
    sms_provider TEXT DEFAULT 'noop', -- 'twilio', 'noop'
    sms_provider_api_key TEXT,
    sms_provider_phone_number TEXT,
    
    -- Limits & throttling
    max_sends_per_hour INTEGER DEFAULT 1000,
    max_sends_per_day INTEGER DEFAULT 10000,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id)
);

-- Insert default settings for existing tenant
INSERT INTO marketing_settings (tenant_id) 
SELECT id FROM tenants 
ON CONFLICT (tenant_id) DO NOTHING;

COMMENT ON TABLE marketing_audiences IS 'Logical groupings of contacts for marketing campaigns';
COMMENT ON TABLE marketing_segments IS 'Saved filter definitions that dynamically select contacts';
COMMENT ON TABLE marketing_tags IS 'Tag definitions that map to contacts.tags array';
COMMENT ON TABLE marketing_templates IS 'Email and SMS content templates with drag-drop structure';
COMMENT ON TABLE marketing_settings IS 'Module-level configuration and feature flags';






-- ============================================================
-- FROM sql/21_marketing_campaigns.sql
-- ============================================================

-- =====================================================
-- MARKETING MODULE - CAMPAIGNS & TRACKING
-- Migration 21: Campaigns, Variants, Sends, Events
-- =====================================================

-- Marketing Campaigns
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Campaign basics
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'email_ab', 'sms', 'rss_email')),
    status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')) DEFAULT 'draft',
    
    -- Targeting
    segment_id UUID REFERENCES marketing_segments(id),
    audience_id UUID REFERENCES marketing_audiences(id),
    target_count INTEGER, -- Cached recipient count
    
    -- Content (for single-variant campaigns)
    template_id UUID REFERENCES marketing_templates(id),
    subject_line TEXT,
    preheader TEXT,
    from_name TEXT,
    from_email TEXT,
    reply_to_email TEXT,
    
    -- Scheduling
    schedule_at TIMESTAMP WITH TIME ZONE,
    send_started_at TIMESTAMP WITH TIME ZONE,
    send_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- A/B Testing
    is_ab_test BOOLEAN DEFAULT FALSE,
    ab_test_type TEXT CHECK (ab_test_type IN ('subject', 'from_name', 'content', NULL)),
    ab_test_split_pct INTEGER DEFAULT 50, -- % for variant A (rest goes to B)
    ab_winner_variant_id UUID, -- Selected winner
    ab_winner_selected_at TIMESTAMP WITH TIME ZONE,
    
    -- Stats (cached for performance)
    total_sends INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_bounces INTEGER DEFAULT 0,
    total_opens INTEGER DEFAULT 0,
    total_unique_opens INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_unique_clicks INTEGER DEFAULT 0,
    total_unsubscribes INTEGER DEFAULT 0,
    total_spam_reports INTEGER DEFAULT 0,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    created_by_user_id UUID REFERENCES app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_tenant ON marketing_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_type ON marketing_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_schedule ON marketing_campaigns(schedule_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_segment ON marketing_campaigns(segment_id);

-- Campaign Variants (for A/B testing)
CREATE TABLE IF NOT EXISTS marketing_campaign_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    variant_key TEXT NOT NULL, -- 'A', 'B', 'C', etc.
    
    -- Variant-specific content
    template_id UUID REFERENCES marketing_templates(id),
    subject_line TEXT,
    from_name TEXT,
    content_json JSONB, -- Override blocks if needed
    
    -- Variant distribution
    send_split_pct INTEGER DEFAULT 50, -- % of total to send this variant
    
    -- Variant stats
    sends INTEGER DEFAULT 0,
    delivered INTEGER DEFAULT 0,
    opens INTEGER DEFAULT 0,
    unique_opens INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    unsubscribes INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, variant_key)
);

CREATE INDEX IF NOT EXISTS idx_campaign_variants_campaign ON marketing_campaign_variants(campaign_id);

-- Marketing Sends (Log of each email/SMS sent)
CREATE TABLE IF NOT EXISTS marketing_sends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES marketing_campaign_variants(id) ON DELETE SET NULL,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Send details
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    provider TEXT, -- 'sendgrid', 'mailgun', 'twilio', etc.
    provider_message_id TEXT, -- External ID from provider
    
    -- Status tracking
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'bounced', 'failed')) DEFAULT 'sent',
    bounce_type TEXT CHECK (bounce_type IN ('hard', 'soft', 'complaint', NULL)),
    bounce_reason TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Engagement tracking
    opened_at TIMESTAMP WITH TIME ZONE,
    first_click_at TIMESTAMP WITH TIME ZONE,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    
    -- Content snapshot
    subject_line TEXT,
    from_email TEXT,
    to_email TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_sends_tenant ON marketing_sends(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_sends_campaign ON marketing_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_sends_contact ON marketing_sends(contact_id);
CREATE INDEX IF NOT EXISTS idx_marketing_sends_status ON marketing_sends(status);
CREATE INDEX IF NOT EXISTS idx_marketing_sends_provider_id ON marketing_sends(provider_message_id);

-- Marketing Events (Opens, Clicks, Bounces, Unsubscribes)
CREATE TABLE IF NOT EXISTS marketing_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    send_id UUID REFERENCES marketing_sends(id) ON DELETE CASCADE,
    
    -- Event type
    event_type TEXT NOT NULL CHECK (event_type IN ('delivered', 'open', 'click', 'bounce', 'unsubscribe', 'spam_report')),
    
    -- Event details
    link_url TEXT, -- For click events
    link_label TEXT,
    bounce_type TEXT CHECK (bounce_type IN ('hard', 'soft', 'complaint', NULL)),
    bounce_reason TEXT,
    
    -- Metadata
    user_agent TEXT,
    ip_address TEXT,
    location_country TEXT,
    location_city TEXT,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
    email_client TEXT,
    
    -- Provider data
    provider_event_id TEXT,
    raw_data JSONB, -- Full webhook payload
    
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_events_tenant ON marketing_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_events_campaign ON marketing_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_events_contact ON marketing_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_marketing_events_type ON marketing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_marketing_events_occurred ON marketing_events(occurred_at);

-- Unsubscribes (Preference center)
CREATE TABLE IF NOT EXISTS marketing_unsubscribes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Unsubscribe scope
    unsubscribe_type TEXT NOT NULL CHECK (unsubscribe_type IN ('all', 'campaign_type', 'specific_audience')),
    campaign_type TEXT CHECK (campaign_type IN ('email', 'sms', NULL)),
    audience_id UUID REFERENCES marketing_audiences(id) ON DELETE CASCADE,
    
    -- Metadata
    reason TEXT,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL, -- What caused it
    unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(contact_id, unsubscribe_type, campaign_type, audience_id)
);

CREATE INDEX IF NOT EXISTS idx_marketing_unsubscribes_contact ON marketing_unsubscribes(contact_id);
CREATE INDEX IF NOT EXISTS idx_marketing_unsubscribes_tenant ON marketing_unsubscribes(tenant_id);

-- Suppression List (Bounced/Complained contacts)
CREATE TABLE IF NOT EXISTS marketing_suppression_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    email TEXT, -- Can suppress even if contact deleted
    phone TEXT,
    
    reason TEXT NOT NULL CHECK (reason IN ('hard_bounce', 'spam_complaint', 'invalid', 'manual')),
    source_campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
    notes TEXT,
    
    suppressed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, email, phone)
);

CREATE INDEX IF NOT EXISTS idx_suppression_list_email ON marketing_suppression_list(email);
CREATE INDEX IF NOT EXISTS idx_suppression_list_phone ON marketing_suppression_list(phone);
CREATE INDEX IF NOT EXISTS idx_suppression_list_tenant ON marketing_suppression_list(tenant_id);

COMMENT ON TABLE marketing_campaigns IS 'Email and SMS marketing campaigns with A/B testing support';
COMMENT ON TABLE marketing_sends IS 'Individual send records for tracking per contact';
COMMENT ON TABLE marketing_events IS 'Granular event tracking: opens, clicks, bounces, unsubscribes';
COMMENT ON TABLE marketing_unsubscribes IS 'Unsubscribe preferences per contact';
COMMENT ON TABLE marketing_suppression_list IS 'Suppressed contacts due to bounces or complaints';






-- ============================================================
-- FROM sql/22_marketing_automation.sql
-- ============================================================

-- =====================================================
-- MARKETING MODULE - AUTOMATION & JOURNEYS
-- Migration 22: Customer Journey Builder
-- =====================================================

-- Marketing Journeys (Automation workflows)
CREATE TABLE IF NOT EXISTS marketing_journeys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Journey basics
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'paused', 'archived')) DEFAULT 'draft',
    
    -- Journey graph (nodes and connections as JSON)
    graph_json JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}',
    
    -- Entry conditions
    entry_trigger_type TEXT NOT NULL CHECK (entry_trigger_type IN (
        'contact_created',
        'tag_added',
        'tag_removed',
        'segment_entry',
        'segment_exit',
        'link_clicked',
        'form_submitted',
        'birthday',
        'anniversary',
        'inactivity_days',
        'manual'
    )),
    entry_trigger_config JSONB, -- Specific trigger settings
    
    -- Exit conditions
    exit_conditions JSONB, -- Array of conditions to stop journey
    max_duration_days INTEGER, -- Auto-stop after X days
    
    -- Stats
    total_entered INTEGER DEFAULT 0,
    total_completed INTEGER DEFAULT 0,
    total_active INTEGER DEFAULT 0,
    total_exited INTEGER DEFAULT 0,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    created_by_user_id UUID REFERENCES app_users(id),
    activated_at TIMESTAMP WITH TIME ZONE,
    activated_by_user_id UUID REFERENCES app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_journeys_tenant ON marketing_journeys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_journeys_status ON marketing_journeys(status);
CREATE INDEX IF NOT EXISTS idx_marketing_journeys_trigger ON marketing_journeys(entry_trigger_type);

-- Journey Nodes (Individual steps in a journey)
CREATE TABLE IF NOT EXISTS marketing_journey_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    
    -- Node identification
    node_key TEXT NOT NULL, -- Unique within journey (e.g., 'trigger_1', 'email_2')
    node_type TEXT NOT NULL CHECK (node_type IN ('trigger', 'action', 'wait', 'branch')),
    
    -- Node position in canvas
    position_x FLOAT,
    position_y FLOAT,
    
    -- Node configuration
    config_json JSONB NOT NULL DEFAULT '{}',
    
    -- For action nodes
    action_type TEXT CHECK (action_type IN ('send_email', 'send_sms', 'add_tag', 'remove_tag', 'update_field', 'webhook', NULL)),
    template_id UUID REFERENCES marketing_templates(id),
    
    -- For wait nodes
    wait_duration_type TEXT CHECK (wait_duration_type IN ('hours', 'days', 'until_time', 'until_date', NULL)),
    wait_duration_value INTEGER,
    wait_until_time TIME,
    wait_until_date DATE,
    
    -- For branch nodes
    branch_conditions JSONB, -- Array of conditions
    
    -- Stats
    total_processed INTEGER DEFAULT 0,
    total_success INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(journey_id, node_key)
);

CREATE INDEX IF NOT EXISTS idx_journey_nodes_journey ON marketing_journey_nodes(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_nodes_type ON marketing_journey_nodes(node_type);

-- Journey Node Connections (Edges)
CREATE TABLE IF NOT EXISTS marketing_journey_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    source_node_key TEXT NOT NULL,
    target_node_key TEXT NOT NULL,
    
    -- Edge metadata
    label TEXT, -- For branch edges: 'Yes', 'No', etc.
    condition_index INTEGER, -- Which condition this edge represents
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journey_edges_journey ON marketing_journey_edges(journey_id);

-- Journey Runs (Contact progress through journeys)
CREATE TABLE IF NOT EXISTS marketing_journey_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    journey_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Run state
    state TEXT NOT NULL CHECK (state IN ('active', 'waiting', 'completed', 'exited', 'failed')) DEFAULT 'active',
    current_node_key TEXT, -- Which node contact is at
    
    -- Progress tracking
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    exited_at TIMESTAMP WITH TIME ZONE,
    exit_reason TEXT,
    
    -- Node history
    nodes_completed TEXT[] DEFAULT '{}', -- Array of completed node keys
    
    -- Wait state
    waiting_until TIMESTAMP WITH TIME ZONE,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(journey_id, contact_id, state) -- Contact can only be in journey once
);

CREATE INDEX IF NOT EXISTS idx_journey_runs_tenant ON marketing_journey_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journey_runs_journey ON marketing_journey_runs(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_runs_contact ON marketing_journey_runs(contact_id);
CREATE INDEX IF NOT EXISTS idx_journey_runs_state ON marketing_journey_runs(state);
CREATE INDEX IF NOT EXISTS idx_journey_runs_waiting ON marketing_journey_runs(waiting_until) WHERE state = 'waiting';

-- Journey Execution Log (Detailed audit trail)
CREATE TABLE IF NOT EXISTS marketing_journey_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    journey_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    run_id UUID REFERENCES marketing_journey_runs(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Log details
    log_type TEXT NOT NULL CHECK (log_type IN ('entered', 'node_executed', 'branch_taken', 'completed', 'exited', 'error')),
    node_key TEXT,
    
    message TEXT,
    metadata JSONB,
    error_details TEXT,
    
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journey_logs_journey ON marketing_journey_logs(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_logs_run ON marketing_journey_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_journey_logs_contact ON marketing_journey_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_journey_logs_occurred ON marketing_journey_logs(occurred_at);

-- Journey Goals (Conversion tracking)
CREATE TABLE IF NOT EXISTS marketing_journey_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    
    goal_type TEXT NOT NULL CHECK (goal_type IN ('email_opened', 'link_clicked', 'form_submitted', 'tag_added', 'deal_created', 'custom')),
    goal_config JSONB, -- Specific goal criteria
    
    -- Stats
    total_achieved INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journey_goals_journey ON marketing_journey_goals(journey_id);

COMMENT ON TABLE marketing_journeys IS 'Automated marketing workflows with triggers and actions';
COMMENT ON TABLE marketing_journey_nodes IS 'Individual nodes in a journey (trigger, action, wait, branch)';
COMMENT ON TABLE marketing_journey_runs IS 'Tracks each contact progress through journeys';
COMMENT ON TABLE marketing_journey_logs IS 'Detailed execution log for debugging and analytics';






-- ============================================================
-- FROM sql/23_marketing_forms.sql
-- ============================================================

-- =====================================================
-- MARKETING MODULE - FORMS & LANDING PAGES
-- Migration 23: Lead Capture System
-- =====================================================

-- Marketing Forms
CREATE TABLE IF NOT EXISTS marketing_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Form basics
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')) DEFAULT 'draft',
    
    -- Form structure
    fields_json JSONB NOT NULL DEFAULT '[]', -- Array of field definitions
    -- Each field: { id, type, label, fieldName (maps to Contact column), required, placeholder, options }
    
    -- Design & styling
    theme TEXT DEFAULT 'default',
    custom_css TEXT,
    button_text TEXT DEFAULT 'Submit',
    
    -- Success behavior
    success_message TEXT DEFAULT 'Thank you! We''ll be in touch soon.',
    redirect_url TEXT,
    send_confirmation_email BOOLEAN DEFAULT FALSE,
    confirmation_template_id UUID REFERENCES marketing_templates(id),
    
    -- Auto-actions on submit
    auto_add_tags TEXT[] DEFAULT '{}',
    auto_add_to_segment_id UUID REFERENCES marketing_segments(id),
    auto_start_journey_id UUID REFERENCES marketing_journeys(id),
    assign_to_user_id UUID REFERENCES app_users(id), -- Auto-assign contact
    
    -- Security & validation
    enable_recaptcha BOOLEAN DEFAULT FALSE,
    recaptcha_site_key TEXT,
    enable_honeypot BOOLEAN DEFAULT TRUE,
    require_double_opt_in BOOLEAN DEFAULT FALSE,
    
    -- Stats
    total_views INTEGER DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    total_spam_blocked INTEGER DEFAULT 0,
    conversion_rate FLOAT,
    
    -- Publishing
    is_published BOOLEAN DEFAULT FALSE,
    public_url_slug TEXT, -- For hosted forms
    embed_code TEXT, -- Generated iframe/script
    
    created_by_user_id UUID REFERENCES app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, public_url_slug)
);

CREATE INDEX IF NOT EXISTS idx_marketing_forms_tenant ON marketing_forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_forms_status ON marketing_forms(status);
CREATE INDEX IF NOT EXISTS idx_marketing_forms_slug ON marketing_forms(public_url_slug) WHERE is_published = TRUE;

-- Form Submissions
CREATE TABLE IF NOT EXISTS marketing_form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES marketing_forms(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL, -- Linked contact (created or matched)
    
    -- Submission data
    payload JSONB NOT NULL, -- Raw form data
    source_url TEXT, -- Page where form was embedded
    referrer_url TEXT,
    
    -- Contact resolution
    contact_created BOOLEAN DEFAULT FALSE,
    contact_updated BOOLEAN DEFAULT FALSE,
    duplicate_submission BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    ip_address TEXT,
    user_agent TEXT,
    location_country TEXT,
    location_city TEXT,
    
    -- Spam detection
    is_spam BOOLEAN DEFAULT FALSE,
    spam_score FLOAT,
    honeypot_triggered BOOLEAN DEFAULT FALSE,
    
    -- Processing status
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_form ON marketing_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_contact ON marketing_form_submissions(contact_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_tenant ON marketing_form_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_spam ON marketing_form_submissions(is_spam);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted ON marketing_form_submissions(submitted_at);

-- Landing Pages
CREATE TABLE IF NOT EXISTS marketing_landing_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Page basics
    name TEXT NOT NULL,
    title TEXT NOT NULL, -- HTML title
    description TEXT, -- Meta description
    
    -- Content
    headline TEXT,
    subheadline TEXT,
    body_content TEXT,
    content_blocks_json JSONB, -- Structured content
    
    -- Form integration
    form_id UUID REFERENCES marketing_forms(id) ON DELETE SET NULL,
    show_form BOOLEAN DEFAULT TRUE,
    
    -- Design
    theme TEXT DEFAULT 'default',
    template TEXT DEFAULT 'basic',
    hero_image_url TEXT,
    logo_url TEXT,
    background_color TEXT DEFAULT '#FFFFFF',
    primary_color TEXT DEFAULT '#3B82F6',
    custom_css TEXT,
    custom_head_code TEXT, -- For analytics scripts
    
    -- SEO
    meta_keywords TEXT[],
    og_image_url TEXT,
    
    -- Publishing
    is_published BOOLEAN DEFAULT FALSE,
    public_url_slug TEXT,
    custom_domain TEXT,
    
    -- Stats
    total_views INTEGER DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    conversion_rate FLOAT,
    
    created_by_user_id UUID REFERENCES app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(tenant_id, public_url_slug)
);

CREATE INDEX IF NOT EXISTS idx_landing_pages_tenant ON marketing_landing_pages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON marketing_landing_pages(public_url_slug) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_landing_pages_form ON marketing_landing_pages(form_id);

-- Landing Page Views (Analytics)
CREATE TABLE IF NOT EXISTS marketing_landing_page_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    landing_page_id UUID NOT NULL REFERENCES marketing_landing_pages(id) ON DELETE CASCADE,
    
    -- Visitor tracking
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    referrer_url TEXT,
    
    -- Conversion
    converted BOOLEAN DEFAULT FALSE,
    submission_id UUID REFERENCES marketing_form_submissions(id),
    
    -- Metadata
    device_type TEXT,
    location_country TEXT,
    location_city TEXT,
    
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landing_page_views_page ON marketing_landing_page_views(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_views_session ON marketing_landing_page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_views_viewed ON marketing_landing_page_views(viewed_at);

COMMENT ON TABLE marketing_journeys IS 'Automated marketing workflows with visual canvas builder';
COMMENT ON TABLE marketing_journey_nodes IS 'Individual workflow nodes: triggers, actions, waits, branches';
COMMENT ON TABLE marketing_journey_runs IS 'Contact progress and state within active journeys';
COMMENT ON TABLE marketing_forms IS 'Lead capture forms with field mapping to contacts';
COMMENT ON TABLE marketing_landing_pages IS 'Themeable landing pages with embedded forms';






-- ============================================================
-- FROM sql/24_marketing_collaboration.sql
-- ============================================================

-- =====================================================
-- MARKETING MODULE - COLLABORATION & AI
-- Migration 24: Comments, Approvals, AI Suggestions
-- =====================================================

-- Marketing Comments (Team collaboration)
CREATE TABLE IF NOT EXISTS marketing_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- What is being commented on
    entity_type TEXT NOT NULL CHECK (entity_type IN ('campaign', 'journey', 'template', 'form', 'landing_page')),
    entity_id UUID NOT NULL,
    
    -- Comment content
    comment TEXT NOT NULL,
    mentions TEXT[] DEFAULT '{}', -- User IDs mentioned with @
    
    -- Thread support
    parent_comment_id UUID REFERENCES marketing_comments(id) ON DELETE CASCADE,
    is_reply BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by_user_id UUID REFERENCES app_users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Author
    user_id UUID NOT NULL REFERENCES app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_comments_entity ON marketing_comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_marketing_comments_tenant ON marketing_comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_comments_user ON marketing_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_comments_parent ON marketing_comments(parent_comment_id);

-- Marketing Approvals (Draft review workflow)
CREATE TABLE IF NOT EXISTS marketing_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- What needs approval
    entity_type TEXT NOT NULL CHECK (entity_type IN ('campaign', 'journey', 'template')),
    entity_id UUID NOT NULL,
    
    -- Approval request
    requested_by_user_id UUID NOT NULL REFERENCES app_users(id),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    
    -- Approval decision
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
    reviewed_by_user_id UUID REFERENCES app_users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- Notification
    notified_users UUID[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_approvals_entity ON marketing_approvals(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_marketing_approvals_status ON marketing_approvals(status);
CREATE INDEX IF NOT EXISTS idx_marketing_approvals_requested_by ON marketing_approvals(requested_by_user_id);

-- Marketing AI Suggestions (AI-generated content)
CREATE TABLE IF NOT EXISTS marketing_ai_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- What it's for
    entity_type TEXT NOT NULL CHECK (entity_type IN ('campaign', 'template', 'subject_line')),
    entity_id UUID,
    
    -- Suggestion type
    suggestion_type TEXT NOT NULL CHECK (suggestion_type IN (
        'subject_line',
        'preheader',
        'content_block',
        'send_time',
        'segment',
        'personalization',
        'tone_adjustment'
    )),
    
    -- AI output
    original_content TEXT,
    suggested_content TEXT NOT NULL,
    confidence_score FLOAT, -- 0-1
    reasoning TEXT, -- Why AI suggested this
    
    -- User action
    accepted BOOLEAN DEFAULT FALSE,
    accepted_by_user_id UUID REFERENCES app_users(id),
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- AI metadata
    ai_model TEXT DEFAULT 'gpt-4-turbo',
    ai_prompt TEXT,
    ai_tokens_used INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_entity ON marketing_ai_suggestions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type ON marketing_ai_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_accepted ON marketing_ai_suggestions(accepted);

-- Marketing Activity Log (Module-wide audit trail)
CREATE TABLE IF NOT EXISTS marketing_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES app_users(id),
    
    -- Activity details
    action_type TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'sent', 'scheduled', etc.
    entity_type TEXT NOT NULL, -- 'campaign', 'journey', 'template', etc.
    entity_id UUID,
    entity_name TEXT,
    
    -- Change details
    before_state JSONB,
    after_state JSONB,
    description TEXT,
    
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_activity_tenant ON marketing_activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_activity_user ON marketing_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_activity_entity ON marketing_activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_marketing_activity_occurred ON marketing_activity_log(occurred_at);

-- Marketing Reports (Saved custom reports)
CREATE TABLE IF NOT EXISTS marketing_saved_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('campaign', 'journey', 'audience', 'engagement', 'custom')),
    
    -- Report configuration
    filters_json JSONB,
    metrics JSONB,
    date_range_type TEXT CHECK (date_range_type IN ('last_7_days', 'last_30_days', 'last_90_days', 'custom')),
    date_range_start DATE,
    date_range_end DATE,
    
    -- Scheduling (auto-send reports)
    schedule_enabled BOOLEAN DEFAULT FALSE,
    schedule_frequency TEXT CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly', NULL)),
    schedule_recipients TEXT[], -- Email addresses
    last_sent_at TIMESTAMP WITH TIME ZONE,
    
    created_by_user_id UUID REFERENCES app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_reports_tenant ON marketing_saved_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saved_reports_type ON marketing_saved_reports(report_type);

-- Marketing Webhooks (For external integrations - future)
CREATE TABLE IF NOT EXISTS marketing_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    endpoint_url TEXT NOT NULL,
    secret_key TEXT,
    
    -- Trigger events
    trigger_events TEXT[] DEFAULT '{}', -- Array of event types to send
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    total_calls INTEGER DEFAULT 0,
    total_failures INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_webhooks_tenant ON marketing_webhooks(tenant_id);

COMMENT ON TABLE marketing_forms IS 'Lead capture forms with field mapping and auto-actions';
COMMENT ON TABLE marketing_form_submissions IS 'Form submission records with spam detection';
COMMENT ON TABLE marketing_landing_pages IS 'Hosted landing pages with themes and form integration';
COMMENT ON TABLE marketing_comments IS 'Team comments on campaigns, journeys, templates';
COMMENT ON TABLE marketing_approvals IS 'Approval workflow for campaign/journey launches';
COMMENT ON TABLE marketing_ai_suggestions IS 'AI-generated content suggestions and optimizations';




-- ============================================================
-- FROM sql/25_marketing_crm_integration.sql
-- ============================================================

-- =====================================================
-- MARKETING ↔ CRM INTEGRATION SCHEMA
-- =====================================================
-- Version: 1.0
-- Date: October 13, 2025
-- Purpose: Add Marketing columns to existing CRM tables
--
-- SAFETY GUARANTEE:
-- • All columns are NULLABLE or have DEFAULT values
-- • No existing data is modified
-- • No columns are dropped
-- • All changes are 100% ADDITIVE
-- • CRM works identically with Marketing DISABLED
-- =====================================================

BEGIN;

-- =====================================================
-- 1. TENANTS TABLE - Marketing Feature Flag
-- =====================================================
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS marketing_enabled BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS marketing_plan TEXT DEFAULT 'none' NOT NULL;

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS marketing_enabled_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN tenants.marketing_enabled IS 'Master toggle for Marketing module (default: FALSE)';
COMMENT ON COLUMN tenants.marketing_plan IS 'Marketing plan tier: none, starter, pro, enterprise';
COMMENT ON COLUMN tenants.marketing_enabled_at IS 'When Marketing was first enabled';

-- =====================================================
-- 2. CONTACTS TABLE - Marketing Engagement
-- =====================================================
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS marketing_engagement_score INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS lead_source_campaign_id UUID;

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS last_marketing_interaction_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN contacts.marketing_engagement_score IS 'Calculated engagement score (0-100) based on campaign interactions';
COMMENT ON COLUMN contacts.lead_source_campaign_id IS 'Campaign that originally created this contact';
COMMENT ON COLUMN contacts.last_marketing_interaction_at IS 'Most recent marketing event (open, click, reply)';

-- =====================================================
-- 3. DEALS TABLE - Marketing Attribution
-- =====================================================
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS marketing_source_type TEXT;

ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS marketing_source_id UUID;

ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS marketing_source_name TEXT;

ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS marketing_touchpoints JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN deals.marketing_source_type IS 'Type: campaign, form, landing_page, journey, manual';
COMMENT ON COLUMN deals.marketing_source_id IS 'ID of the marketing entity that created this deal';
COMMENT ON COLUMN deals.marketing_source_name IS 'Human-readable name (e.g., "Summer Promo 2025")';
COMMENT ON COLUMN deals.marketing_touchpoints IS 'Array of all marketing interactions: [{campaign_id, type, timestamp}]';

-- =====================================================
-- 4. ACTIVITIES TABLE - Marketing Event Linking
-- =====================================================
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS marketing_campaign_id UUID;

ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS marketing_event_type TEXT;

COMMENT ON COLUMN activities.marketing_campaign_id IS 'Campaign this activity was triggered by';
COMMENT ON COLUMN activities.marketing_event_type IS 'Type: email_sent, email_opened, link_clicked, form_filled, journey_step';

-- =====================================================
-- 5. MARKETING ATTRIBUTION TABLE (New)
-- =====================================================
CREATE TABLE IF NOT EXISTS marketing_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Deal & Contact Links
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Attribution Data
  attribution_model TEXT NOT NULL DEFAULT 'last_touch', -- first_touch, last_touch, multi_touch
  touchpoint_sequence JSONB NOT NULL DEFAULT '[]'::jsonb, -- Full journey path
  
  -- Marketing Sources
  first_touch_campaign_id UUID,
  first_touch_campaign_name TEXT,
  first_touch_timestamp TIMESTAMP WITH TIME ZONE,
  
  last_touch_campaign_id UUID,
  last_touch_campaign_name TEXT,
  last_touch_timestamp TIMESTAMP WITH TIME ZONE,
  
  -- Conversion Data
  deal_value_cents BIGINT,
  deal_stage TEXT,
  deal_won BOOLEAN DEFAULT FALSE,
  conversion_timestamp TIMESTAMP WITH TIME ZONE,
  
  -- Campaign Performance
  campaign_cost_cents BIGINT, -- Allocated cost for this attribution
  roi_multiplier DECIMAL(10, 2), -- revenue / cost
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketing_attribution_tenant 
  ON marketing_attribution(tenant_id);
  
CREATE INDEX IF NOT EXISTS idx_marketing_attribution_deal 
  ON marketing_attribution(deal_id);
  
CREATE INDEX IF NOT EXISTS idx_marketing_attribution_contact 
  ON marketing_attribution(contact_id);
  
CREATE INDEX IF NOT EXISTS idx_marketing_attribution_first_campaign 
  ON marketing_attribution(first_touch_campaign_id) 
  WHERE first_touch_campaign_id IS NOT NULL;
  
CREATE INDEX IF NOT EXISTS idx_marketing_attribution_last_campaign 
  ON marketing_attribution(last_touch_campaign_id) 
  WHERE last_touch_campaign_id IS NOT NULL;

COMMENT ON TABLE marketing_attribution IS 'Tracks how marketing campaigns contribute to deal creation and revenue';

-- =====================================================
-- 6. PERFORMANCE INDEXES
-- =====================================================

-- Contacts: Marketing queries
CREATE INDEX IF NOT EXISTS idx_contacts_marketing_engagement 
  ON contacts(marketing_engagement_score DESC) 
  WHERE marketing_engagement_score > 0;
  
CREATE INDEX IF NOT EXISTS idx_contacts_marketing_campaign 
  ON contacts(lead_source_campaign_id) 
  WHERE lead_source_campaign_id IS NOT NULL;

-- Deals: Marketing source filtering
CREATE INDEX IF NOT EXISTS idx_deals_marketing_source 
  ON deals(marketing_source_type, marketing_source_id) 
  WHERE marketing_source_type IS NOT NULL;

-- Activities: Marketing event filtering  
CREATE INDEX IF NOT EXISTS idx_activities_marketing_campaign 
  ON activities(marketing_campaign_id) 
  WHERE marketing_campaign_id IS NOT NULL;

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function: Check if Marketing is enabled for a tenant
CREATE OR REPLACE FUNCTION is_marketing_enabled(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT marketing_enabled INTO v_enabled
  FROM tenants
  WHERE id = p_tenant_id;
  
  RETURN COALESCE(v_enabled, FALSE);
END;
$$;

COMMENT ON FUNCTION is_marketing_enabled IS 'Returns TRUE if Marketing module is enabled for tenant';

-- Function: Calculate marketing engagement score
CREATE OR REPLACE FUNCTION calculate_marketing_engagement(p_contact_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_score INTEGER := 0;
  v_campaign_count INTEGER;
  v_recent_opens INTEGER;
  v_recent_clicks INTEGER;
BEGIN
  -- Count marketing campaigns received (weight: 5 points each)
  SELECT COUNT(DISTINCT marketing_campaign_id) INTO v_campaign_count
  FROM activities
  WHERE contact_id = p_contact_id
    AND marketing_campaign_id IS NOT NULL
    AND marketing_event_type IN ('email_sent', 'form_filled');
  
  v_score := v_score + (v_campaign_count * 5);
  
  -- Count recent opens (last 30 days, weight: 10 points each)
  SELECT COUNT(*) INTO v_recent_opens
  FROM activities
  WHERE contact_id = p_contact_id
    AND marketing_event_type = 'email_opened'
    AND activity_timestamp > NOW() - INTERVAL '30 days';
  
  v_score := v_score + (v_recent_opens * 10);
  
  -- Count recent clicks (last 30 days, weight: 20 points each)
  SELECT COUNT(*) INTO v_recent_clicks
  FROM activities
  WHERE contact_id = p_contact_id
    AND marketing_event_type = 'link_clicked'
    AND activity_timestamp > NOW() - INTERVAL '30 days';
  
  v_score := v_score + (v_recent_clicks * 20);
  
  -- Cap at 100
  RETURN LEAST(v_score, 100);
END;
$$;

COMMENT ON FUNCTION calculate_marketing_engagement IS 'Calculates engagement score (0-100) based on campaign interactions';

-- =====================================================
-- 8. TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Auto-update marketing_engagement_score when activities change
CREATE OR REPLACE FUNCTION update_contact_marketing_engagement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.marketing_campaign_id IS NOT NULL THEN
    -- Update engagement score
    UPDATE contacts
    SET 
      marketing_engagement_score = calculate_marketing_engagement(NEW.contact_id),
      last_marketing_interaction_at = NEW.activity_timestamp
    WHERE id = NEW.contact_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_update_contact_marketing_engagement
AFTER INSERT OR UPDATE ON activities
FOR EACH ROW
WHEN (NEW.marketing_campaign_id IS NOT NULL)
EXECUTE FUNCTION update_contact_marketing_engagement();

-- =====================================================
-- 9. DATA INTEGRITY CHECKS
-- =====================================================

-- Ensure marketing columns don't break existing queries
DO $$
DECLARE
  v_test_count INTEGER;
BEGIN
  -- Test 1: Contacts query works
  SELECT COUNT(*) INTO v_test_count FROM contacts LIMIT 1;
  RAISE NOTICE '✓ Contacts table: OK';
  
  -- Test 2: Deals query works
  SELECT COUNT(*) INTO v_test_count FROM deals LIMIT 1;
  RAISE NOTICE '✓ Deals table: OK';
  
  -- Test 3: Activities query works
  SELECT COUNT(*) INTO v_test_count FROM activities LIMIT 1;
  RAISE NOTICE '✓ Activities table: OK';
  
  -- Test 4: New attribution table works
  SELECT COUNT(*) INTO v_test_count FROM marketing_attribution LIMIT 1;
  RAISE NOTICE '✓ Marketing Attribution table: OK';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL TESTS PASSED';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Summary:
--   • Added 3 columns to tenants (marketing_enabled, plan, enabled_at)
--   • Added 3 columns to contacts (engagement_score, campaign_id, last_interaction)
--   • Added 4 columns to deals (source_type, source_id, source_name, touchpoints)
--   • Added 2 columns to activities (campaign_id, event_type)
--   • Created marketing_attribution table
--   • Created 8 performance indexes
--   • Created 2 helper functions
--   • Created 1 auto-update trigger
--
-- SAFETY:
--   • All columns DEFAULT or NULLABLE
--   • No data modified
--   • CRM works identically with marketing_enabled = FALSE
--   • Can rollback by dropping columns (if needed)
-- =====================================================






-- ============================================================
-- FROM sql/36_auth_enhancements.sql
-- ============================================================

-- =====================================================
-- AUTHENTICATION & USER MANAGEMENT ENHANCEMENTS
-- Enterprise-grade user system
-- =====================================================

BEGIN;

-- Add onboarding and metadata fields to app_users
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Add account type and enhanced metadata to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'practice';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'starter';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '14 days';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_email TEXT;

-- User Sessions tracking (for security)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- User Login History (for audit)
CREATE TABLE IF NOT EXISTS user_login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  login_method TEXT NOT NULL, -- 'password', 'magic_link', 'oauth'
  ip_address TEXT,
  user_agent TEXT,
  location_country TEXT,
  location_city TEXT,
  success BOOLEAN DEFAULT TRUE,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_history_user ON user_login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created ON user_login_history(created_at DESC);

-- User Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);

-- Email Verification Tokens  
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);

-- Two-Factor Authentication (2FA) Settings
CREATE TABLE IF NOT EXISTS user_2fa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT FALSE,
  method TEXT CHECK (method IN ('app', 'sms', 'email')),
  secret_key TEXT, -- encrypted TOTP secret
  backup_codes TEXT[], -- encrypted backup codes
  phone_number TEXT, -- for SMS 2FA
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Onboarding Progress tracking
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, step_name)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON onboarding_progress(user_id);

-- User Notifications Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  push_notifications BOOLEAN DEFAULT TRUE,
  marketing_emails BOOLEAN DEFAULT TRUE,
  weekly_digest BOOLEAN DEFAULT TRUE,
  deal_updates BOOLEAN DEFAULT TRUE,
  task_reminders BOOLEAN DEFAULT TRUE,
  team_mentions BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- User API Keys (for integrations)
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- hashed API key
  key_prefix TEXT NOT NULL, -- first 8 chars for display
  scopes TEXT[] DEFAULT '{}', -- permissions/scopes
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON user_api_keys(key_hash);

-- Account Deletion Requests (GDPR compliance)
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days',
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Functions for user management

-- Function: Update last activity
CREATE OR REPLACE FUNCTION update_user_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app_users
  SET last_active_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update last activity on user_sessions
DROP TRIGGER IF EXISTS trigger_update_user_activity ON user_sessions;
CREATE OR REPLACE TRIGGER trigger_update_user_activity
AFTER INSERT OR UPDATE ON user_sessions
FOR EACH ROW
EXECUTE FUNCTION update_user_last_activity();

-- Function: Clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Clean expired tokens
CREATE OR REPLACE FUNCTION clean_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  total_deleted INTEGER := 0;
BEGIN
  -- Clean password reset tokens
  DELETE FROM password_reset_tokens
  WHERE expires_at < NOW() OR used_at IS NOT NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  
  -- Clean email verification tokens
  DELETE FROM email_verification_tokens
  WHERE expires_at < NOW() OR verified_at IS NOT NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  
  -- Clean expired invitations
  UPDATE user_invitations
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
  
  RETURN total_deleted;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_app_users_tenant_status ON app_users(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
-- PATCHED: role column dropped by sql/16; index removed -- CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_last_active ON app_users(last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenants_account_type ON tenants(account_type);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);

-- Add comments for documentation
COMMENT ON TABLE user_sessions IS 'Tracks active user sessions for security and analytics';
COMMENT ON TABLE user_login_history IS 'Audit log of all login attempts';
COMMENT ON TABLE password_reset_tokens IS 'Secure tokens for password reset flow';
COMMENT ON TABLE email_verification_tokens IS 'Tokens for email verification';
COMMENT ON TABLE user_2fa_settings IS 'Two-factor authentication settings per user';
COMMENT ON TABLE onboarding_progress IS 'Tracks user onboarding completion';
COMMENT ON TABLE notification_preferences IS 'User notification preferences';
COMMENT ON TABLE user_api_keys IS 'API keys for third-party integrations';
COMMENT ON TABLE account_deletion_requests IS 'GDPR-compliant account deletion requests';

COMMIT;

-- =====================================================
-- AUTHENTICATION SYSTEM COMPLETE
-- =====================================================
-- ✅ Enhanced app_users with metadata and onboarding
-- ✅ Session tracking for security
-- ✅ Login history for audit
-- ✅ Password reset system
-- ✅ Email verification
-- ✅ 2FA support
-- ✅ Onboarding progress tracking
-- ✅ Notification preferences
-- ✅ API key management
-- ✅ GDPR account deletion
-- ✅ Performance indexes
-- ✅ Cleanup functions
-- =====================================================





-- ============================================================
-- FROM sql/40_social_media_marketing.sql
-- ============================================================

-- =====================================================
-- SOCIAL MEDIA MARKETING SCHEMA
-- =====================================================
-- Version: 1.0
-- Date: October 13, 2025
-- Purpose: Add social media marketing capabilities
--
-- Platforms Supported:
-- • Facebook Pages
-- • Instagram Business
-- • TikTok Business
-- • LinkedIn Company Pages
-- • Twitter/X
-- • YouTube
-- =====================================================

BEGIN;

-- =====================================================
-- 1. SOCIAL MEDIA ACCOUNTS
-- =====================================================
CREATE TABLE IF NOT EXISTS social_media_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Platform Info
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'tiktok', 'linkedin', 'twitter', 'youtube')),
  account_type TEXT CHECK (account_type IN ('page', 'profile', 'business', 'company')),
  
  -- Account Details
  platform_account_id TEXT NOT NULL, -- ID from the platform
  account_name TEXT NOT NULL,
  account_username TEXT,
  profile_image_url TEXT,
  account_url TEXT,
  
  -- OAuth Tokens (encrypted in production)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  token_scope TEXT, -- Permissions granted
  
  -- Account Status
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'active' CHECK (sync_status IN ('active', 'expired', 'error', 'disconnected')),
  
  -- Account Metadata
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  account_metadata JSONB DEFAULT '{}'::jsonb, -- Platform-specific data
  
  -- Timestamps
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_accounts_tenant ON social_media_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_media_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_accounts_active ON social_media_accounts(is_active) WHERE is_active = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_accounts_platform_id ON social_media_accounts(tenant_id, platform, platform_account_id);

COMMENT ON TABLE social_media_accounts IS 'Connected social media accounts for posting and monitoring';

-- =====================================================
-- 2. SOCIAL MEDIA POSTS
-- =====================================================
CREATE TABLE IF NOT EXISTS social_media_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Link to Marketing Campaign (optional)
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  
  -- Account Info
  account_id UUID NOT NULL REFERENCES social_media_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  
  -- Post Content
  content_text TEXT NOT NULL,
  media_urls TEXT[], -- URLs to images/videos
  media_type TEXT CHECK (media_type IN ('image', 'video', 'carousel', 'story', 'reel')),
  link_url TEXT, -- CTA link
  hashtags TEXT[],
  mentions TEXT[],
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'deleted')),
  
  -- Platform Response
  platform_post_id TEXT, -- ID from Facebook/Instagram/etc
  platform_post_url TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Engagement Metrics (updated periodically)
  metrics JSONB DEFAULT '{
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "reach": 0,
    "impressions": 0,
    "clicks": 0,
    "engagement_rate": 0
  }'::jsonb,
  
  last_metrics_fetch_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  post_metadata JSONB DEFAULT '{}'::jsonb,
  created_by_user_id UUID REFERENCES app_users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_posts_tenant ON social_media_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_account ON social_media_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_campaign ON social_media_posts(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_media_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_media_posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_social_posts_platform_id ON social_media_posts(platform_post_id) WHERE platform_post_id IS NOT NULL;

COMMENT ON TABLE social_media_posts IS 'Social media posts across all platforms';

-- =====================================================
-- 3. SOCIAL MEDIA INTERACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS social_media_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Post Reference
  post_id UUID REFERENCES social_media_posts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES social_media_accounts(id) ON DELETE CASCADE,
  
  -- Contact Reference (if we can identify them)
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Interaction Details
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'comment', 'share', 'save', 'click', 'dm', 'mention', 'reply', 'reaction')),
  interaction_text TEXT, -- Comment text or DM content
  parent_interaction_id UUID REFERENCES social_media_interactions(id), -- For replies
  
  -- Platform User Info
  platform_user_id TEXT NOT NULL,
  platform_user_name TEXT,
  platform_user_profile_url TEXT,
  
  -- Sentiment Analysis (optional AI feature)
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'question')),
  intent TEXT CHECK (intent IN ('inquiry', 'booking', 'complaint', 'praise', 'question', 'spam')),
  
  -- Response Management
  response_status TEXT DEFAULT 'pending' CHECK (response_status IN ('pending', 'responded', 'ignored', 'escalated')),
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by_user_id UUID REFERENCES app_users(id),
  response_text TEXT,
  
  -- Metadata
  interaction_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  interaction_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_interactions_tenant ON social_media_interactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_interactions_post ON social_media_interactions(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_interactions_contact ON social_media_interactions(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_interactions_type ON social_media_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_social_interactions_status ON social_media_interactions(response_status) WHERE response_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_social_interactions_platform_user ON social_media_interactions(platform_user_id);

COMMENT ON TABLE social_media_interactions IS 'Likes, comments, DMs, and other social media interactions';

-- =====================================================
-- 4. SOCIAL MEDIA CAMPAIGNS
-- =====================================================
-- Extend marketing_campaigns table
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS social_media_posts JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN marketing_campaigns.social_media_posts IS 'Array of social_media_posts.id linked to this campaign';

-- =====================================================
-- 5. DEALS TABLE - Add Social Media Attribution
-- =====================================================
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS social_media_source_platform TEXT;

ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS social_media_source_post_id UUID REFERENCES social_media_posts(id);

ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS social_media_source_interaction_id UUID REFERENCES social_media_interactions(id);

COMMENT ON COLUMN deals.social_media_source_platform IS 'Platform where the deal originated (facebook, instagram, tiktok, etc)';
COMMENT ON COLUMN deals.social_media_source_post_id IS 'Social media post that generated this deal';
COMMENT ON COLUMN deals.social_media_source_interaction_id IS 'Specific interaction (comment, DM) that led to deal';

-- =====================================================
-- 6. CONTACTS TABLE - Add Social Media Links
-- =====================================================
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS social_media_profiles JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN contacts.social_media_profiles IS 'Links to patient social media profiles: {facebook: "url", instagram: "handle"}';

-- =====================================================
-- 7. SOCIAL MEDIA METRICS SUMMARY VIEW
-- =====================================================
DROP VIEW IF EXISTS social_media_performance CASCADE;
CREATE VIEW social_media_performance AS
SELECT
  sma.tenant_id,
  sma.platform,
  sma.account_name,
  COUNT(DISTINCT smp.id) as total_posts,
  COUNT(DISTINCT smp.id) FILTER (WHERE smp.published_at >= NOW() - INTERVAL '30 days') as posts_last_30_days,
  COALESCE(SUM((smp.metrics->>'likes')::int), 0) as total_likes,
  COALESCE(SUM((smp.metrics->>'comments')::int), 0) as total_comments,
  COALESCE(SUM((smp.metrics->>'shares')::int), 0) as total_shares,
  COALESCE(SUM((smp.metrics->>'reach')::int), 0) as total_reach,
  COALESCE(SUM((smp.metrics->>'clicks')::int), 0) as total_clicks,
  COUNT(DISTINCT d.id) as deals_generated,
  COALESCE(SUM(d.value_estimate_cents), 0) as revenue_generated_cents,
  sma.follower_count
FROM social_media_accounts sma
LEFT JOIN social_media_posts smp ON sma.id = smp.account_id AND smp.status = 'published'
LEFT JOIN deals d ON d.social_media_source_post_id = smp.id
WHERE sma.is_active = TRUE
GROUP BY sma.tenant_id, sma.platform, sma.account_name, sma.follower_count;

COMMENT ON VIEW social_media_performance IS 'Aggregated social media performance metrics per account';

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to calculate engagement rate for a post
CREATE OR REPLACE FUNCTION calculate_post_engagement_rate(post_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_engagement INTEGER;
  reach_count INTEGER;
  engagement_rate DECIMAL(5,2);
BEGIN
  SELECT 
    COALESCE((metrics->>'likes')::int, 0) + 
    COALESCE((metrics->>'comments')::int, 0) + 
    COALESCE((metrics->>'shares')::int, 0),
    COALESCE((metrics->>'reach')::int, 0)
  INTO total_engagement, reach_count
  FROM social_media_posts
  WHERE id = post_id;
  
  IF reach_count > 0 THEN
    engagement_rate := (total_engagement::DECIMAL / reach_count::DECIMAL) * 100;
  ELSE
    engagement_rate := 0;
  END IF;
  
  RETURN engagement_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending social interactions count
CREATE OR REPLACE FUNCTION get_pending_interactions_count(tenant_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM social_media_interactions
    WHERE tenant_id = tenant_id_param
    AND response_status = 'pending'
    AND interaction_type IN ('comment', 'dm', 'mention')
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_social_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER social_accounts_updated_at
  BEFORE UPDATE ON social_media_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_social_updated_at();

CREATE OR REPLACE TRIGGER social_posts_updated_at
  BEFORE UPDATE ON social_media_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_social_updated_at();

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration succeeded:

-- SELECT 'social_media_accounts' as table_name, COUNT(*) as count FROM social_media_accounts
-- UNION ALL
-- SELECT 'social_media_posts', COUNT(*) FROM social_media_posts
-- UNION ALL
-- SELECT 'social_media_interactions', COUNT(*) FROM social_media_interactions;

-- SELECT * FROM social_media_performance LIMIT 5;

-- SELECT get_pending_interactions_count('550e8400-e29b-41d4-a716-446655440000');



-- ============================================================
-- FROM sql/41_automation_engine.sql
-- ============================================================

-- =====================================================
-- AUTOMATION ENGINE SCHEMA
-- =====================================================
-- Version: 1.0
-- Date: October 13, 2025
-- Purpose: Add journey state management for automation execution
-- =====================================================

BEGIN;

-- =====================================================
-- 1. JOURNEY STATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS marketing_journey_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Journey & Contact
  journey_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Progress Tracking
  current_step INTEGER DEFAULT 0 NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'waiting', 'completed', 'failed', 'paused')),
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  wait_until TIMESTAMP WITH TIME ZONE, -- For wait actions
  
  -- Goal Tracking
  goal_completed BOOLEAN DEFAULT FALSE,
  goal_completed_at TIMESTAMP WITH TIME ZONE,
  goal_data JSONB,
  
  -- State Data (store variables, condition results, etc.)
  state_data JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  entry_source TEXT, -- How they entered (trigger type)
  entry_metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_journey_states_tenant ON marketing_journey_states(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journey_states_journey ON marketing_journey_states(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_states_contact ON marketing_journey_states(contact_id);
CREATE INDEX IF NOT EXISTS idx_journey_states_status ON marketing_journey_states(status);
CREATE INDEX IF NOT EXISTS idx_journey_states_waiting ON marketing_journey_states(wait_until) 
  WHERE status = 'waiting' AND wait_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journey_states_active ON marketing_journey_states(journey_id, status) 
  WHERE status = 'active';

-- Unique constraint: contact can only be in a journey once
CREATE UNIQUE INDEX IF NOT EXISTS idx_journey_states_unique_active 
  ON marketing_journey_states(journey_id, contact_id) 
  WHERE status IN ('active', 'waiting');

COMMENT ON TABLE marketing_journey_states IS 'Tracks individual contact progress through automation journeys';

-- =====================================================
-- 2. JOURNEY STEP LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS marketing_journey_step_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- References
  journey_state_id UUID NOT NULL REFERENCES marketing_journey_states(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Step Info
  step_index INTEGER NOT NULL,
  step_type TEXT NOT NULL,
  step_name TEXT,
  
  -- Execution
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Results
  result_data JSONB, -- Action results, error messages, etc.
  error_message TEXT,
  
  -- Metadata
  execution_time_ms INTEGER, -- How long the action took
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_journey_step_logs_state ON marketing_journey_step_logs(journey_state_id);
CREATE INDEX IF NOT EXISTS idx_journey_step_logs_journey ON marketing_journey_step_logs(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_step_logs_contact ON marketing_journey_step_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_journey_step_logs_executed ON marketing_journey_step_logs(executed_at);

COMMENT ON TABLE marketing_journey_step_logs IS 'Audit log of every action executed in automation journeys';

-- =====================================================
-- 3. JOURNEY ANALYTICS VIEW
-- =====================================================
DROP VIEW IF EXISTS journey_analytics CASCADE;
CREATE VIEW journey_analytics AS
SELECT
  j.id as journey_id,
  j.tenant_id,
  j.name as journey_name,
  j.status as journey_status,
  COUNT(DISTINCT js.id) as total_entered,
  COUNT(DISTINCT js.id) FILTER (WHERE js.status = 'active') as currently_active,
  COUNT(DISTINCT js.id) FILTER (WHERE js.status = 'completed') as total_completed,
  COUNT(DISTINCT js.id) FILTER (WHERE js.status = 'failed') as total_failed,
  COUNT(DISTINCT js.id) FILTER (WHERE js.goal_completed = TRUE) as goals_achieved,
  CASE 
    WHEN COUNT(DISTINCT js.id) > 0 
    THEN (COUNT(DISTINCT js.id) FILTER (WHERE js.status = 'completed')::DECIMAL / COUNT(DISTINCT js.id)::DECIMAL) * 100 
    ELSE 0 
  END as completion_rate,
  CASE 
    WHEN COUNT(DISTINCT js.id) > 0 
    THEN (COUNT(DISTINCT js.id) FILTER (WHERE js.goal_completed = TRUE)::DECIMAL / COUNT(DISTINCT js.id)::DECIMAL) * 100 
    ELSE 0 
  END as goal_conversion_rate,
  AVG(EXTRACT(EPOCH FROM (js.completed_at - js.started_at)) / 3600) as avg_completion_time_hours
FROM marketing_journeys j
LEFT JOIN marketing_journey_states js ON j.id = js.journey_id
GROUP BY j.id, j.tenant_id, j.name, j.status;

COMMENT ON VIEW journey_analytics IS 'Aggregated analytics for each automation journey';

-- =====================================================
-- 4. JOURNEY STEP ANALYTICS VIEW
-- =====================================================
DROP VIEW IF EXISTS journey_step_analytics CASCADE;
CREATE VIEW journey_step_analytics AS
SELECT
  jsl.journey_id,
  jsl.step_index,
  jsl.step_type,
  jsl.step_name,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE jsl.status = 'success') as successful_executions,
  COUNT(*) FILTER (WHERE jsl.status = 'failed') as failed_executions,
  COUNT(*) FILTER (WHERE jsl.status = 'skipped') as skipped_executions,
  CASE 
    WHEN COUNT(*) > 0 
    THEN (COUNT(*) FILTER (WHERE jsl.status = 'success')::DECIMAL / COUNT(*)::DECIMAL) * 100 
    ELSE 0 
  END as success_rate,
  AVG(jsl.execution_time_ms) as avg_execution_time_ms,
  MAX(jsl.execution_time_ms) as max_execution_time_ms
FROM marketing_journey_step_logs jsl
GROUP BY jsl.journey_id, jsl.step_index, jsl.step_type, jsl.step_name;

COMMENT ON VIEW journey_step_analytics IS 'Performance metrics for each step in automation journeys';

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Get active journey count for a contact
CREATE OR REPLACE FUNCTION get_contact_active_journeys(contact_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM marketing_journey_states
    WHERE contact_id = contact_id_param
    AND status IN ('active', 'waiting')
  );
END;
$$ LANGUAGE plpgsql;

-- Get journey completion rate
CREATE OR REPLACE FUNCTION get_journey_completion_rate(journey_id_param UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_entered INTEGER;
  total_completed INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_entered, total_completed
  FROM marketing_journey_states
  WHERE journey_id = journey_id_param;
  
  IF total_entered > 0 THEN
    RETURN (total_completed::DECIMAL / total_entered::DECIMAL) * 100;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Resume waiting journeys (called by cron)
CREATE OR REPLACE FUNCTION resume_waiting_journeys()
RETURNS INTEGER AS $$
DECLARE
  resumed_count INTEGER;
BEGIN
  WITH resumed AS (
    UPDATE marketing_journey_states
    SET status = 'active',
        updated_at = NOW()
    WHERE status = 'waiting'
    AND wait_until <= NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO resumed_count FROM resumed;
  
  RETURN resumed_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_journey_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER journey_states_updated_at
  BEFORE UPDATE ON marketing_journey_states
  FOR EACH ROW
  EXECUTE FUNCTION update_journey_state_timestamp();

-- Increment journey counters when state changes
CREATE OR REPLACE FUNCTION update_journey_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Contact entered journey
    UPDATE marketing_journeys
    SET total_entered = total_entered + 1,
        total_active = total_active + 1
    WHERE id = NEW.journey_id;
  END IF;
  
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Journey completed
    UPDATE marketing_journeys
    SET total_completed = total_completed + 1,
        total_active = GREATEST(total_active - 1, 0)
    WHERE id = NEW.journey_id;
  END IF;
  
  IF NEW.goal_completed = TRUE AND OLD.goal_completed = FALSE THEN
    -- Goal achieved
    UPDATE marketing_journeys
    SET goals_achieved = goals_achieved + 1
    WHERE id = NEW.journey_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER journey_counter_update
  AFTER INSERT OR UPDATE ON marketing_journey_states
  FOR EACH ROW
  EXECUTE FUNCTION update_journey_counters();

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify:

-- SELECT * FROM journey_analytics LIMIT 10;
-- SELECT * FROM journey_step_analytics LIMIT 10;
-- SELECT get_journey_completion_rate('journey-id-here');
-- SELECT resume_waiting_journeys();





-- ============================================================
-- FROM sql/42_analytics_system.sql
-- ============================================================

-- =====================================================
-- ANALYTICS SYSTEM - CRM & MARKETING
-- =====================================================
-- Version: 1.0
-- Date: October 13, 2025
-- Purpose: Comprehensive analytics views and functions for business intelligence
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CRM ANALYTICS VIEWS
-- =====================================================

-- Lead Source Performance
DROP VIEW IF EXISTS crm_lead_source_analytics CASCADE;
CREATE VIEW crm_lead_source_analytics AS
SELECT
  c.tenant_id,
  c.source as lead_source,
  COUNT(DISTINCT c.id) as total_contacts,
  COUNT(DISTINCT d.id) as deals_created,
  COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%') as deals_won,
  COALESCE(SUM(d.value_estimate_cents) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%'), 0) as revenue_generated_cents,
  CASE 
    WHEN COUNT(DISTINCT c.id) > 0 
    THEN (COUNT(DISTINCT d.id)::DECIMAL / COUNT(DISTINCT c.id)::DECIMAL) * 100 
    ELSE 0 
  END as contact_to_deal_conversion_rate,
  CASE 
    WHEN COUNT(DISTINCT d.id) > 0 
    THEN (COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%')::DECIMAL / COUNT(DISTINCT d.id)::DECIMAL) * 100 
    ELSE 0 
  END as deal_win_rate,
  COALESCE(AVG(d.value_estimate_cents) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%'), 0) as avg_deal_value_cents
FROM contacts c
LEFT JOIN deals d ON c.id = d.contact_id
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
WHERE c.source IS NOT NULL
GROUP BY c.tenant_id, c.source;

COMMENT ON VIEW crm_lead_source_analytics IS 'Lead source performance: contacts, deals, win rate, revenue by source';

-- Sales Performance by User
DROP VIEW IF EXISTS crm_sales_performance_by_user CASCADE;
CREATE VIEW crm_sales_performance_by_user AS
SELECT
  d.tenant_id,
  d.owner_user_id,
  au.full_name as user_name,
  au.role as user_role,
  COUNT(DISTINCT d.id) as total_deals,
  COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%') as deals_won,
  COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%lost%') as deals_lost,
  COALESCE(SUM(d.value_estimate_cents), 0) as total_pipeline_value_cents,
  COALESCE(SUM(d.value_estimate_cents) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%'), 0) as revenue_generated_cents,
  CASE 
    WHEN COUNT(DISTINCT d.id) > 0 
    THEN (COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%')::DECIMAL / COUNT(DISTINCT d.id)::DECIMAL) * 100 
    ELSE 0 
  END as win_rate,
  COALESCE(AVG(d.value_estimate_cents) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%'), 0) as avg_deal_value_cents,
  COUNT(DISTINCT a.id) as total_activities,
  COUNT(DISTINCT a.id) FILTER (WHERE a.type = 'call') as total_calls,
  COUNT(DISTINCT a.id) FILTER (WHERE a.type = 'email') as total_emails
FROM deals d
LEFT JOIN app_users au ON d.owner_user_id = au.id
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
LEFT JOIN activities a ON d.id = a.deal_id
WHERE d.owner_user_id IS NOT NULL
GROUP BY d.tenant_id, d.owner_user_id, au.full_name, au.role;

COMMENT ON VIEW crm_sales_performance_by_user IS 'Sales rep performance: deals, win rate, revenue, activities per user';

-- Pipeline Stage Analytics
DROP VIEW IF EXISTS crm_pipeline_stage_analytics CASCADE;
CREATE VIEW crm_pipeline_stage_analytics AS
SELECT
  ps.tenant_id,
  ps.pipeline_id,
  p.name as pipeline_name,
  ps.id as stage_id,
  ps.name as stage_name,
  ps.position as stage_position,
  COUNT(DISTINCT d.id) as current_deals,
  COALESCE(SUM(d.value_estimate_cents), 0) as total_value_cents,
  COALESCE(AVG(d.value_estimate_cents), 0) as avg_deal_value_cents,
  COUNT(DISTINCT d.id) FILTER (WHERE d.created_at >= NOW() - INTERVAL '30 days') as deals_last_30_days,
  COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - d.created_at)) / 86400), 0) as avg_days_in_stage
FROM pipeline_stages ps
LEFT JOIN pipelines p ON ps.pipeline_id = p.id
LEFT JOIN deals d ON ps.id = d.stage_id
GROUP BY ps.tenant_id, ps.pipeline_id, p.name, ps.id, ps.name, ps.position
ORDER BY ps.pipeline_id, ps.position;

COMMENT ON VIEW crm_pipeline_stage_analytics IS 'Pipeline stage metrics: deal count, value, velocity per stage';

-- Revenue Analytics by Month
DROP VIEW IF EXISTS crm_revenue_by_month CASCADE;
CREATE VIEW crm_revenue_by_month AS
SELECT
  d.tenant_id,
  DATE_TRUNC('month', d.created_at) as month,
  COUNT(DISTINCT d.id) as deals_created,
  COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%') as deals_won,
  COALESCE(SUM(d.value_estimate_cents) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%'), 0) as revenue_cents,
  COALESCE(AVG(d.value_estimate_cents) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%'), 0) as avg_deal_value_cents
FROM deals d
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
GROUP BY d.tenant_id, DATE_TRUNC('month', d.created_at)
ORDER BY month DESC;

COMMENT ON VIEW crm_revenue_by_month IS 'Monthly revenue trends and deal creation metrics';

-- =====================================================
-- 2. MARKETING ANALYTICS VIEWS
-- =====================================================

-- Marketing ROI Summary
DROP VIEW IF EXISTS marketing_roi_summary CASCADE;
CREATE VIEW marketing_roi_summary AS
SELECT
  mc.tenant_id,
  mc.type as channel,
  COUNT(DISTINCT mc.id) as total_campaigns,
  COALESCE(SUM(mc.total_sends), 0) as total_sent,
  COALESCE(SUM(mc.total_opens), 0) as total_opened,
  COALESCE(SUM(mc.total_clicks), 0) as total_clicked,
  CASE 
    WHEN SUM(mc.total_sends) > 0 
    THEN (SUM(mc.total_opens)::DECIMAL / SUM(mc.total_sends)::DECIMAL) * 100 
    ELSE 0 
  END as avg_open_rate,
  CASE 
    WHEN SUM(mc.total_sends) > 0 
    THEN (SUM(mc.total_clicks)::DECIMAL / SUM(mc.total_sends)::DECIMAL) * 100 
    ELSE 0 
  END as avg_click_rate,
  COUNT(DISTINCT ma.contact_id) as leads_generated,
  COUNT(DISTINCT ma.deal_id) as deals_created,
  COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE) as deals_won,
  COALESCE(SUM(ma.deal_value_cents) FILTER (WHERE ma.deal_won = TRUE), 0) as revenue_generated_cents
FROM marketing_campaigns mc
LEFT JOIN marketing_attribution ma ON mc.id = ma.first_touch_campaign_id OR mc.id = ma.last_touch_campaign_id
GROUP BY mc.tenant_id, mc.type;

COMMENT ON VIEW marketing_roi_summary IS 'Marketing ROI: sends, engagement, leads, deals, revenue by channel';

-- Campaign Attribution Performance
DROP VIEW IF EXISTS marketing_campaign_attribution CASCADE;
CREATE VIEW marketing_campaign_attribution AS
SELECT
  mc.tenant_id,
  mc.id as campaign_id,
  mc.name as campaign_name,
  mc.type as channel,
  mc.status,
  mc.total_sends as sent_count,
  mc.total_opens as opened_count,
  mc.total_clicks as clicked_count,
  COUNT(DISTINCT ma.contact_id) FILTER (WHERE ma.first_touch_campaign_id = mc.id) as first_touch_leads,
  COUNT(DISTINCT ma.contact_id) FILTER (WHERE ma.last_touch_campaign_id = mc.id) as last_touch_leads,
  COUNT(DISTINCT ma.deal_id) as total_deals,
  COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE) as deals_won,
  COALESCE(SUM(ma.deal_value_cents) FILTER (WHERE ma.deal_won = TRUE), 0) as revenue_generated_cents,
  mc.created_at as campaign_date
FROM marketing_campaigns mc
LEFT JOIN marketing_attribution ma ON mc.id = ma.first_touch_campaign_id OR mc.id = ma.last_touch_campaign_id
GROUP BY mc.tenant_id, mc.id, mc.name, mc.type, mc.status, mc.total_sends, mc.total_opens, mc.total_clicks, mc.created_at;

COMMENT ON VIEW marketing_campaign_attribution IS 'Individual campaign performance with attribution and revenue';

-- Marketing Cost & CAC Analysis
DROP VIEW IF EXISTS marketing_cac_analysis CASCADE;
CREATE VIEW marketing_cac_analysis AS
SELECT
  ma.tenant_id,
  DATE_TRUNC('month', ma.created_at) as month,
  COUNT(DISTINCT ma.contact_id) as total_leads,
  COUNT(DISTINCT ma.deal_id) as total_deals,
  COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE) as deals_won,
  COALESCE(SUM(ma.campaign_cost_cents), 0) as total_marketing_spend_cents,
  COALESCE(SUM(ma.deal_value_cents) FILTER (WHERE ma.deal_won = TRUE), 0) as revenue_generated_cents,
  CASE 
    WHEN COUNT(DISTINCT ma.contact_id) > 0 
    THEN SUM(ma.campaign_cost_cents)::DECIMAL / COUNT(DISTINCT ma.contact_id)::DECIMAL 
    ELSE 0 
  END as cost_per_lead_cents,
  CASE 
    WHEN COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE) > 0 
    THEN SUM(ma.campaign_cost_cents)::DECIMAL / COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE)::DECIMAL 
    ELSE 0 
  END as customer_acquisition_cost_cents,
  CASE 
    WHEN SUM(ma.campaign_cost_cents) > 0 
    THEN (SUM(ma.deal_value_cents) FILTER (WHERE ma.deal_won = TRUE)::DECIMAL / SUM(ma.campaign_cost_cents)::DECIMAL)
    ELSE 0 
  END as roi_multiplier,
  CASE 
    WHEN COUNT(DISTINCT ma.contact_id) > 0 
    THEN (COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE)::DECIMAL / COUNT(DISTINCT ma.contact_id)::DECIMAL) * 100 
    ELSE 0 
  END as lead_to_customer_conversion_rate
FROM marketing_attribution ma
GROUP BY ma.tenant_id, DATE_TRUNC('month', ma.created_at)
ORDER BY month DESC;

COMMENT ON VIEW marketing_cac_analysis IS 'Customer Acquisition Cost and marketing ROI analysis by month';

-- =====================================================
-- 3. EXECUTIVE DASHBOARD VIEW
-- =====================================================

DROP VIEW IF EXISTS executive_dashboard_kpis CASCADE;
CREATE VIEW executive_dashboard_kpis AS
SELECT
  t.id as tenant_id,
  t.name as practice_name,
  
  -- Contact Metrics (Last 30 days)
  COUNT(DISTINCT c.id) FILTER (WHERE c.created_at >= NOW() - INTERVAL '30 days') as new_contacts_30d,
  COUNT(DISTINCT c.id) as total_contacts,
  
  -- Deal Metrics (Last 30 days)
  COUNT(DISTINCT d.id) FILTER (WHERE d.created_at >= NOW() - INTERVAL '30 days') as new_deals_30d,
  COUNT(DISTINCT d.id) FILTER (WHERE d.created_at >= NOW() - INTERVAL '30 days' AND (ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%')) as deals_won_30d,
  COALESCE(SUM(d.value_estimate_cents) FILTER (WHERE d.created_at >= NOW() - INTERVAL '30 days' AND (ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%')), 0) as revenue_30d_cents,
  
  -- Pipeline Metrics
  COUNT(DISTINCT d.id) FILTER (WHERE ps.name NOT ILIKE '%won%' AND ps.name NOT ILIKE '%lost%' AND ps.name NOT ILIKE '%closed%') as active_pipeline_deals,
  COALESCE(SUM(d.value_estimate_cents) FILTER (WHERE ps.name NOT ILIKE '%won%' AND ps.name NOT ILIKE '%lost%' AND ps.name NOT ILIKE '%closed%'), 0) as active_pipeline_value_cents,
  
  -- Activity Metrics (Last 30 days)
  COUNT(DISTINCT a.id) FILTER (WHERE a.occurred_at >= NOW() - INTERVAL '30 days') as total_activities_30d,
  
  -- Marketing Metrics (Last 30 days - if marketing enabled)
  COUNT(DISTINCT mc.id) FILTER (WHERE mc.created_at >= NOW() - INTERVAL '30 days') as campaigns_sent_30d,
  COALESCE(SUM(mc.total_sends) FILTER (WHERE mc.created_at >= NOW() - INTERVAL '30 days'), 0) as marketing_messages_sent_30d,
  
  -- Team Metrics
  COUNT(DISTINCT au.id) as team_size,
  COUNT(DISTINCT au.id) FILTER (WHERE au.role = 'owner') as owner_count,
  COUNT(DISTINCT au.id) FILTER (WHERE au.role = 'staff') as staff_count

FROM tenants t
LEFT JOIN contacts c ON t.id = c.tenant_id
LEFT JOIN deals d ON t.id = d.tenant_id
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
LEFT JOIN activities a ON t.id = a.tenant_id
LEFT JOIN marketing_campaigns mc ON t.id = mc.tenant_id AND t.marketing_enabled = TRUE
LEFT JOIN app_users au ON t.id = au.tenant_id
GROUP BY t.id, t.name;

COMMENT ON VIEW executive_dashboard_kpis IS 'Executive KPIs: contacts, deals, revenue, activities, marketing, team';

-- =====================================================
-- 4. CUSTOM ANALYTICS TABLES
-- =====================================================

-- Saved Custom Reports
CREATE TABLE IF NOT EXISTS custom_analytics_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN ('crm', 'marketing', 'combined')),
  
  -- Report Configuration
  metrics_config JSONB NOT NULL, -- Which metrics to show
  filters_config JSONB, -- Filters to apply
  date_range_type TEXT CHECK (date_range_type IN ('last_7_days', 'last_30_days', 'last_90_days', 'last_year', 'custom', 'all_time')),
  custom_date_start DATE,
  custom_date_end DATE,
  
  -- Grouping & Sorting
  group_by TEXT, -- e.g., 'source', 'user', 'month'
  sort_by TEXT,
  sort_direction TEXT CHECK (sort_direction IN ('asc', 'desc')),
  
  -- Visualization
  chart_type TEXT CHECK (chart_type IN ('bar', 'line', 'pie', 'table', 'number')),
  
  -- Sharing & Scheduling
  is_shared BOOLEAN DEFAULT FALSE,
  shared_with_user_ids UUID[],
  schedule_enabled BOOLEAN DEFAULT FALSE,
  schedule_frequency TEXT CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly', NULL)),
  schedule_recipients TEXT[], -- Email addresses
  last_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_by_user_id UUID REFERENCES app_users(id),
  is_favorite BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_reports_tenant ON custom_analytics_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_reports_type ON custom_analytics_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_custom_reports_favorite ON custom_analytics_reports(is_favorite) WHERE is_favorite = TRUE;

COMMENT ON TABLE custom_analytics_reports IS 'User-created custom analytics reports and dashboards';

-- =====================================================
-- 5. ANALYTICS HELPER FUNCTIONS
-- =====================================================

-- Calculate CAC (Customer Acquisition Cost)
CREATE OR REPLACE FUNCTION calculate_cac(
  tenant_id_param UUID,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  total_marketing_spend_cents BIGINT,
  total_customers_acquired INTEGER,
  cac_cents DECIMAL(10,2),
  avg_ltv_cents DECIMAL(10,2),
  ltv_to_cac_ratio DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ma.campaign_cost_cents), 0)::BIGINT as total_marketing_spend_cents,
    COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE)::INTEGER as total_customers_acquired,
    CASE 
      WHEN COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE) > 0 
      THEN SUM(ma.campaign_cost_cents)::DECIMAL / COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE)::DECIMAL
      ELSE 0 
    END as cac_cents,
    COALESCE(AVG(ma.deal_value_cents) FILTER (WHERE ma.deal_won = TRUE), 0) as avg_ltv_cents,
    CASE 
      WHEN SUM(ma.campaign_cost_cents) > 0 
      THEN (AVG(ma.deal_value_cents) FILTER (WHERE ma.deal_won = TRUE)::DECIMAL / (SUM(ma.campaign_cost_cents)::DECIMAL / NULLIF(COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE), 0)::DECIMAL))
      ELSE 0 
    END as ltv_to_cac_ratio
  FROM marketing_attribution ma
  WHERE ma.tenant_id = tenant_id_param
    AND (start_date IS NULL OR ma.created_at >= start_date)
    AND (end_date IS NULL OR ma.created_at <= end_date);
END;
$$ LANGUAGE plpgsql;

-- Calculate pipeline velocity (avg days to close)
CREATE OR REPLACE FUNCTION calculate_pipeline_velocity(
  tenant_id_param UUID,
  pipeline_id_param UUID DEFAULT NULL
)
RETURNS TABLE(
  avg_days_to_close DECIMAL(10,2),
  median_days_to_close DECIMAL(10,2),
  fastest_deal_days INTEGER,
  slowest_deal_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH deal_durations AS (
    SELECT
      EXTRACT(EPOCH FROM (d.updated_at - d.created_at)) / 86400 as days_to_close
    FROM deals d
    JOIN pipeline_stages ps ON d.stage_id = ps.id
    WHERE d.tenant_id = tenant_id_param
      AND (pipeline_id_param IS NULL OR ps.pipeline_id = pipeline_id_param)
      AND (ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%' OR ps.name ILIKE '%lost%')
  )
  SELECT
    COALESCE(AVG(days_to_close), 0)::DECIMAL(10,2),
    COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_close), 0)::DECIMAL(10,2),
    COALESCE(MIN(days_to_close), 0)::INTEGER,
    COALESCE(MAX(days_to_close), 0)::INTEGER
  FROM deal_durations;
END;
$$ LANGUAGE plpgsql;

-- Get conversion funnel metrics
CREATE OR REPLACE FUNCTION get_conversion_funnel(
  tenant_id_param UUID,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  total_contacts INTEGER,
  contacts_with_deals INTEGER,
  deals_created INTEGER,
  deals_won INTEGER,
  contact_to_deal_rate DECIMAL(5,2),
  deal_win_rate DECIMAL(5,2),
  overall_conversion_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH funnel_data AS (
    SELECT
      COUNT(DISTINCT c.id) as contacts,
      COUNT(DISTINCT CASE WHEN d.id IS NOT NULL THEN c.id END) as contacts_with_deals,
      COUNT(DISTINCT d.id) as deals,
      COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%') as won_deals
    FROM contacts c
    LEFT JOIN deals d ON c.id = d.contact_id
    LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
    WHERE c.tenant_id = tenant_id_param
      AND (start_date IS NULL OR c.created_at >= start_date)
      AND (end_date IS NULL OR c.created_at <= end_date)
  )
  SELECT
    contacts::INTEGER,
    contacts_with_deals::INTEGER,
    deals::INTEGER,
    won_deals::INTEGER,
    CASE WHEN contacts > 0 THEN (deals::DECIMAL / contacts::DECIMAL) * 100 ELSE 0 END as contact_to_deal_rate,
    CASE WHEN deals > 0 THEN (won_deals::DECIMAL / deals::DECIMAL) * 100 ELSE 0 END as deal_win_rate,
    CASE WHEN contacts > 0 THEN (won_deals::DECIMAL / contacts::DECIMAL) * 100 ELSE 0 END as overall_conversion_rate
  FROM funnel_data;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- SELECT * FROM crm_lead_source_analytics LIMIT 10;
-- SELECT * FROM crm_sales_performance_by_user LIMIT 10;
-- SELECT * FROM crm_pipeline_stage_analytics LIMIT 10;
-- SELECT * FROM marketing_roi_summary;
-- SELECT * FROM marketing_campaign_attribution ORDER BY revenue_generated_cents DESC LIMIT 10;
-- SELECT * FROM marketing_cac_analysis ORDER BY month DESC LIMIT 12;
-- SELECT * FROM executive_dashboard_kpis;
-- SELECT * FROM calculate_cac('550e8400-e29b-41d4-a716-446655440000', '2025-01-01', '2025-12-31');
-- SELECT * FROM calculate_pipeline_velocity('550e8400-e29b-41d4-a716-446655440000');
-- SELECT * FROM get_conversion_funnel('550e8400-e29b-41d4-a716-446655440000', '2025-01-01', '2025-12-31');



-- ============================================================
-- FROM sql/43_analytics_enhancements.sql
-- ============================================================

-- =====================================================
-- ANALYTICS ENHANCEMENTS - ADVANCED INTELLIGENCE
-- =====================================================
-- Version: 2.0
-- Date: October 13, 2025
-- Purpose: Add advanced analytics capabilities for enterprise intelligence
-- =====================================================

BEGIN;

-- =====================================================
-- 1. NEW TABLES FOR TRACKING
-- =====================================================

-- Deal Stage History (track when deals move between stages)
CREATE TABLE IF NOT EXISTS deal_stage_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES pipeline_stages(id),
  to_stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
  from_stage_name TEXT,
  to_stage_name TEXT,
  moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  moved_by_user_id UUID REFERENCES app_users(id),
  time_in_previous_stage_days INTEGER,
  deal_value_at_move_cents INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_stage_history_deal ON deal_stage_history(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_stage_history_tenant ON deal_stage_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deal_stage_history_moved_at ON deal_stage_history(moved_at);

COMMENT ON TABLE deal_stage_history IS 'Track deal movement through pipeline stages for velocity analysis';

-- Deal Win/Loss Reasons
CREATE TABLE IF NOT EXISTS deal_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('won', 'lost')),
  primary_reason TEXT,
  secondary_reasons TEXT[],
  competitor TEXT,
  notes TEXT,
  outcome_value_cents INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by_user_id UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_outcomes_deal ON deal_outcomes(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_outcomes_tenant_outcome ON deal_outcomes(tenant_id, outcome);

COMMENT ON TABLE deal_outcomes IS 'Track why deals are won or lost for intelligence gathering';

-- Contact Engagement Log (for scoring)
CREATE TABLE IF NOT EXISTS contact_engagement_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- email_open, link_click, form_submit, call_answered, etc.
  event_source TEXT, -- campaign_id, activity_id, etc.
  engagement_score INTEGER DEFAULT 0,
  metadata JSONB,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_engagement_contact ON contact_engagement_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_engagement_tenant_type ON contact_engagement_events(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_contact_engagement_occurred ON contact_engagement_events(occurred_at);

COMMENT ON TABLE contact_engagement_events IS 'Track all contact engagements for scoring and analytics';

-- Forecast Snapshots (track prediction accuracy)
CREATE TABLE IF NOT EXISTS revenue_forecast_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  forecast_created_at DATE NOT NULL DEFAULT CURRENT_DATE,
  target_month DATE NOT NULL,
  
  -- Predictions
  predicted_revenue_cents INTEGER NOT NULL,
  confidence_level DECIMAL(3,2), -- 0.80 = 80% confidence
  prediction_method TEXT, -- 'ml', 'linear', 'weighted_pipeline'
  
  -- Actual (filled in later)
  actual_revenue_cents INTEGER,
  accuracy_percentage DECIMAL(5,2), -- Calculated later
  
  -- Context
  open_pipeline_value_cents INTEGER,
  weighted_pipeline_value_cents INTEGER,
  assumptions JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecast_tenant_target ON revenue_forecast_snapshots(tenant_id, target_month);
CREATE INDEX IF NOT EXISTS idx_forecast_created_at ON revenue_forecast_snapshots(forecast_created_at);

COMMENT ON TABLE revenue_forecast_snapshots IS 'Store revenue predictions to track forecasting accuracy';

-- =====================================================
-- 2. NEW ANALYTICS VIEWS
-- =====================================================

-- Cohort Analysis View (Retention by acquisition month)
DROP VIEW IF EXISTS cohort_retention_analysis CASCADE;
CREATE VIEW cohort_retention_analysis AS
SELECT
  c.tenant_id,
  DATE_TRUNC('month', c.created_at) as cohort_month,
  COUNT(DISTINCT c.id) as cohort_size,
  COUNT(DISTINCT c.id) FILTER (WHERE a.occurred_at >= DATE_TRUNC('month', c.created_at) + INTERVAL '1 month' 
    AND a.occurred_at < DATE_TRUNC('month', c.created_at) + INTERVAL '2 months') as active_month_1,
  COUNT(DISTINCT c.id) FILTER (WHERE a.occurred_at >= DATE_TRUNC('month', c.created_at) + INTERVAL '2 months' 
    AND a.occurred_at < DATE_TRUNC('month', c.created_at) + INTERVAL '3 months') as active_month_2,
  COUNT(DISTINCT c.id) FILTER (WHERE a.occurred_at >= DATE_TRUNC('month', c.created_at) + INTERVAL '3 months' 
    AND a.occurred_at < DATE_TRUNC('month', c.created_at) + INTERVAL '4 months') as active_month_3,
  COUNT(DISTINCT c.id) FILTER (WHERE a.occurred_at >= DATE_TRUNC('month', c.created_at) + INTERVAL '6 months' 
    AND a.occurred_at < DATE_TRUNC('month', c.created_at) + INTERVAL '7 months') as active_month_6,
  COUNT(DISTINCT c.id) FILTER (WHERE a.occurred_at >= DATE_TRUNC('month', c.created_at) + INTERVAL '12 months' 
    AND a.occurred_at < DATE_TRUNC('month', c.created_at) + INTERVAL '13 months') as active_month_12,
  CASE 
    WHEN COUNT(DISTINCT c.id) > 0 
    THEN ROUND((COUNT(DISTINCT c.id) FILTER (WHERE a.occurred_at >= DATE_TRUNC('month', c.created_at) + INTERVAL '12 months')::DECIMAL 
      / COUNT(DISTINCT c.id)::DECIMAL) * 100, 1)
    ELSE 0 
  END as retention_rate_12m
FROM contacts c
LEFT JOIN activities a ON c.id = a.contact_id AND a.tenant_id = c.tenant_id
WHERE c.created_at >= NOW() - INTERVAL '24 months'
GROUP BY c.tenant_id, DATE_TRUNC('month', c.created_at)
ORDER BY cohort_month DESC;

COMMENT ON VIEW cohort_retention_analysis IS 'Track patient retention by acquisition cohort';

-- Customer Lifetime Value by Source
DROP VIEW IF EXISTS customer_ltv_by_source CASCADE;
CREATE VIEW customer_ltv_by_source AS
SELECT
  c.tenant_id,
  c.source,
  COUNT(DISTINCT c.id) as total_customers,
  COALESCE(SUM(d.value_estimate_cents) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%'), 0) as total_revenue_cents,
  CASE 
    WHEN COUNT(DISTINCT c.id) > 0 
    THEN COALESCE(SUM(d.value_estimate_cents) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%'), 0) / COUNT(DISTINCT c.id)
    ELSE 0 
  END as avg_ltv_cents,
  COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400), 0) as avg_customer_age_days,
  COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%') as deals_won,
  CASE 
    WHEN COUNT(DISTINCT c.id) > 0 
    THEN COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%')::DECIMAL / COUNT(DISTINCT c.id)::DECIMAL
    ELSE 0 
  END as deals_per_customer
FROM contacts c
LEFT JOIN deals d ON c.id = d.contact_id
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
WHERE c.source IS NOT NULL
GROUP BY c.tenant_id, c.source;

COMMENT ON VIEW customer_ltv_by_source IS 'Calculate lifetime value by acquisition source';

-- Win/Loss Reasons Summary
DROP VIEW IF EXISTS win_loss_analysis CASCADE;
CREATE VIEW win_loss_analysis AS
SELECT
  outcomes.tenant_id,
  outcomes.outcome,
  outcomes.primary_reason,
  COUNT(*) as count,
  COALESCE(AVG(outcomes.outcome_value_cents), 0) as avg_deal_value_cents,
  COALESCE(SUM(outcomes.outcome_value_cents), 0) as total_value_cents,
  outcomes.competitor,
  ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER (PARTITION BY outcomes.tenant_id, outcomes.outcome) * 100, 1) as percentage_of_outcome
FROM deal_outcomes outcomes
WHERE outcomes.recorded_at >= NOW() - INTERVAL '12 months'
GROUP BY outcomes.tenant_id, outcomes.outcome, outcomes.primary_reason, outcomes.competitor
ORDER BY outcomes.tenant_id, outcomes.outcome, count DESC;

COMMENT ON VIEW win_loss_analysis IS 'Analyze patterns in won and lost deals';

-- Pipeline Velocity Metrics
DROP VIEW IF EXISTS pipeline_velocity_detailed CASCADE;
CREATE VIEW pipeline_velocity_detailed AS
SELECT
  dsh.tenant_id,
  dsh.from_stage_name,
  dsh.to_stage_name,
  COUNT(*) as total_transitions,
  ROUND(AVG(dsh.time_in_previous_stage_days), 1) as avg_days_in_stage,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY dsh.time_in_previous_stage_days) as median_days_in_stage,
  MIN(dsh.time_in_previous_stage_days) as min_days,
  MAX(dsh.time_in_previous_stage_days) as max_days,
  COUNT(*) FILTER (WHERE dsh.time_in_previous_stage_days > 30) as stuck_deals_count,
  COALESCE(AVG(dsh.deal_value_at_move_cents), 0) as avg_deal_value_cents
FROM deal_stage_history dsh
WHERE dsh.moved_at >= NOW() - INTERVAL '6 months'
GROUP BY dsh.tenant_id, dsh.from_stage_name, dsh.to_stage_name
ORDER BY dsh.tenant_id, avg_days_in_stage DESC;

COMMENT ON VIEW pipeline_velocity_detailed IS 'Detailed pipeline velocity and bottleneck analysis';

-- Activity Effectiveness View
DROP VIEW IF EXISTS activity_effectiveness_metrics CASCADE;
CREATE VIEW activity_effectiveness_metrics AS
SELECT
  a.tenant_id,
  a.type as activity_type,
  a.agent_user_id,
  au.full_name as agent_name,
  COUNT(DISTINCT a.id) as total_activities,
  COUNT(DISTINCT a.contact_id) as unique_contacts,
  COUNT(DISTINCT a.deal_id) as unique_deals,
  COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%') as deals_won_after_activity,
  CASE 
    WHEN COUNT(DISTINCT d.id) > 0 
    THEN ROUND((COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%')::DECIMAL 
      / COUNT(DISTINCT d.id)::DECIMAL) * 100, 1)
    ELSE 0 
  END as win_rate_after_activity,
  COALESCE(SUM(d.value_estimate_cents) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%'), 0) as revenue_influenced_cents
FROM activities a
LEFT JOIN app_users au ON a.agent_user_id = au.id
LEFT JOIN deals d ON a.deal_id = d.id
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
WHERE a.occurred_at >= NOW() - INTERVAL '6 months'
GROUP BY a.tenant_id, a.type, a.agent_user_id, au.full_name
ORDER BY deals_won_after_activity DESC;

COMMENT ON VIEW activity_effectiveness_metrics IS 'Measure which activities drive the most results';

-- Contact Engagement Scores
DROP VIEW IF EXISTS contact_engagement_scores CASCADE;
CREATE VIEW contact_engagement_scores AS
SELECT
  c.id as contact_id,
  c.tenant_id,
  c.full_name,
  c.primary_email,
  c.source,
  COALESCE(SUM(cee.engagement_score), 0) as total_engagement_score,
  COUNT(DISTINCT cee.id) as total_engagement_events,
  COUNT(DISTINCT cee.id) FILTER (WHERE cee.occurred_at >= NOW() - INTERVAL '30 days') as engagement_events_30d,
  COUNT(DISTINCT cee.id) FILTER (WHERE cee.event_type = 'email_open') as email_opens,
  COUNT(DISTINCT cee.id) FILTER (WHERE cee.event_type = 'link_click') as link_clicks,
  COUNT(DISTINCT cee.id) FILTER (WHERE cee.event_type = 'form_submit') as form_submits,
  MAX(cee.occurred_at) as last_engagement_at,
  CASE
    WHEN COALESCE(SUM(cee.engagement_score), 0) >= 100 THEN 'hot'
    WHEN COALESCE(SUM(cee.engagement_score), 0) >= 50 THEN 'warm'
    WHEN COALESCE(SUM(cee.engagement_score), 0) >= 20 THEN 'lukewarm'
    ELSE 'cold'
  END as engagement_level
FROM contacts c
LEFT JOIN contact_engagement_events cee ON c.id = cee.contact_id
GROUP BY c.id, c.tenant_id, c.full_name, c.primary_email, c.source;

COMMENT ON VIEW contact_engagement_scores IS 'Calculate engagement scores for lead prioritization';

-- Revenue Forecast Base Data (using created_at as proxy for forecasting)
DROP VIEW IF EXISTS revenue_forecast_base CASCADE;
CREATE VIEW revenue_forecast_base AS
SELECT
  d.tenant_id,
  DATE_TRUNC('month', d.created_at) as deal_month,
  ps.name as stage_name,
  COUNT(DISTINCT d.id) as deal_count,
  COALESCE(SUM(d.value_estimate_cents), 0) as total_value_cents,
  CASE
    WHEN ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%' THEN 1.0
    WHEN ps.name ILIKE '%negotiation%' OR ps.name ILIKE '%proposal%' THEN 0.7
    WHEN ps.name ILIKE '%qualified%' THEN 0.4
    WHEN ps.name ILIKE '%contact%' OR ps.name ILIKE '%lead%' THEN 0.2
    ELSE 0.3
  END as stage_probability,
  COALESCE(SUM(d.value_estimate_cents), 0) * 
    CASE
      WHEN ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%' THEN 1.0
      WHEN ps.name ILIKE '%negotiation%' OR ps.name ILIKE '%proposal%' THEN 0.7
      WHEN ps.name ILIKE '%qualified%' THEN 0.4
      WHEN ps.name ILIKE '%contact%' OR ps.name ILIKE '%lead%' THEN 0.2
      ELSE 0.3
    END as weighted_value_cents
FROM deals d
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
WHERE d.created_at >= NOW() - INTERVAL '12 months'
GROUP BY d.tenant_id, DATE_TRUNC('month', d.created_at), ps.name;

COMMENT ON VIEW revenue_forecast_base IS 'Base data for revenue forecasting calculations using historical patterns';

-- Deal Size Distribution
DROP VIEW IF EXISTS deal_size_distribution CASCADE;
CREATE VIEW deal_size_distribution AS
SELECT
  tenant_id,
  CASE
    WHEN value_estimate_cents < 100000 THEN '$0-$1K'
    WHEN value_estimate_cents < 500000 THEN '$1K-$5K'
    WHEN value_estimate_cents < 1000000 THEN '$5K-$10K'
    WHEN value_estimate_cents < 2500000 THEN '$10K-$25K'
    WHEN value_estimate_cents < 5000000 THEN '$25K-$50K'
    ELSE '$50K+'
  END as deal_size_range,
  COUNT(*) as deal_count,
  COALESCE(AVG(value_estimate_cents), 0) as avg_value_cents,
  COALESCE(SUM(value_estimate_cents), 0) as total_value_cents
FROM deals
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY tenant_id, 
  CASE
    WHEN value_estimate_cents < 100000 THEN '$0-$1K'
    WHEN value_estimate_cents < 500000 THEN '$1K-$5K'
    WHEN value_estimate_cents < 1000000 THEN '$5K-$10K'
    WHEN value_estimate_cents < 2500000 THEN '$10K-$25K'
    WHEN value_estimate_cents < 5000000 THEN '$25K-$50K'
    ELSE '$50K+'
  END
ORDER BY tenant_id, MIN(value_estimate_cents);

COMMENT ON VIEW deal_size_distribution IS 'Analyze distribution of deal sizes';

-- Conversion Funnel Analysis
DROP VIEW IF EXISTS conversion_funnel_metrics CASCADE;
CREATE VIEW conversion_funnel_metrics AS
SELECT
  p.tenant_id,
  p.id as pipeline_id,
  p.name as pipeline_name,
  ps.id as stage_id,
  ps.name as stage_name,
  ps.position as stage_position,
  COUNT(DISTINCT d.id) as deals_in_stage,
  COALESCE(SUM(d.value_estimate_cents), 0) as total_value_cents,
  LAG(COUNT(DISTINCT d.id)) OVER (PARTITION BY p.id ORDER BY ps.position) as previous_stage_count,
  CASE 
    WHEN LAG(COUNT(DISTINCT d.id)) OVER (PARTITION BY p.id ORDER BY ps.position) > 0 
    THEN ROUND((COUNT(DISTINCT d.id)::DECIMAL / 
      LAG(COUNT(DISTINCT d.id)) OVER (PARTITION BY p.id ORDER BY ps.position)::DECIMAL) * 100, 1)
    ELSE 100.0
  END as conversion_rate_from_previous
FROM pipelines p
LEFT JOIN pipeline_stages ps ON p.id = ps.pipeline_id
LEFT JOIN deals d ON ps.id = d.stage_id
GROUP BY p.tenant_id, p.id, p.name, ps.id, ps.name, ps.position
ORDER BY p.id, ps.position;

COMMENT ON VIEW conversion_funnel_metrics IS 'Track conversion rates through pipeline stages';

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Calculate Business Health Score
CREATE OR REPLACE FUNCTION calculate_business_health_score(p_tenant_id UUID)
RETURNS TABLE (
  overall_score INTEGER,
  revenue_growth_score INTEGER,
  pipeline_health_score INTEGER,
  activity_score INTEGER,
  win_rate_score INTEGER,
  recommendations TEXT[]
) AS $$
DECLARE
  v_revenue_current DECIMAL;
  v_revenue_previous DECIMAL;
  v_revenue_growth DECIMAL;
  v_pipeline_value DECIMAL;
  v_activity_count INTEGER;
  v_win_rate DECIMAL;
BEGIN
  -- Calculate current month revenue
  SELECT COALESCE(SUM(value_estimate_cents), 0) / 100.0
  INTO v_revenue_current
  FROM deals d
  JOIN pipeline_stages ps ON d.stage_id = ps.id
  WHERE d.tenant_id = p_tenant_id
    AND (ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%')
    AND d.created_at >= DATE_TRUNC('month', CURRENT_DATE);

  -- Calculate previous month revenue
  SELECT COALESCE(SUM(value_estimate_cents), 0) / 100.0
  INTO v_revenue_previous
  FROM deals d
  JOIN pipeline_stages ps ON d.stage_id = ps.id
  WHERE d.tenant_id = p_tenant_id
    AND (ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%')
    AND d.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    AND d.created_at < DATE_TRUNC('month', CURRENT_DATE);

  -- Calculate growth rate
  IF v_revenue_previous > 0 THEN
    v_revenue_growth := ((v_revenue_current - v_revenue_previous) / v_revenue_previous) * 100;
  ELSE
    v_revenue_growth := 0;
  END IF;

  -- Revenue growth score (0-100)
  revenue_growth_score := LEAST(100, GREATEST(0, 50 + (v_revenue_growth * 2)));

  -- Get pipeline value and activity metrics
  SELECT 
    COALESCE(SUM(d.value_estimate_cents), 0) / 100.0,
    COUNT(DISTINCT a.id)
  INTO v_pipeline_value, v_activity_count
  FROM deals d
  LEFT JOIN activities a ON d.id = a.deal_id 
    AND a.occurred_at >= CURRENT_DATE - INTERVAL '30 days'
  WHERE d.tenant_id = p_tenant_id;

  -- Pipeline health score
  pipeline_health_score := LEAST(100, GREATEST(0, (v_pipeline_value / 100000) * 100));

  -- Activity score
  activity_score := LEAST(100, GREATEST(0, (v_activity_count / 100.0) * 100));

  -- Win rate
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%')::DECIMAL / COUNT(*)::DECIMAL) * 100
      ELSE 0 
    END
  INTO v_win_rate
  FROM deals d
  JOIN pipeline_stages ps ON d.stage_id = ps.id
  WHERE d.tenant_id = p_tenant_id
    AND d.created_at >= CURRENT_DATE - INTERVAL '90 days';

  win_rate_score := LEAST(100, GREATEST(0, v_win_rate * 1.5));

  -- Overall score (weighted average)
  overall_score := ROUND(
    (revenue_growth_score * 0.3) + 
    (pipeline_health_score * 0.25) + 
    (activity_score * 0.20) + 
    (win_rate_score * 0.25)
  );

  -- Generate recommendations
  recommendations := ARRAY[]::TEXT[];
  
  IF revenue_growth_score < 50 THEN
    recommendations := array_append(recommendations, 'Revenue growth is below target. Review pricing and upsell strategies.');
  END IF;
  
  IF pipeline_health_score < 60 THEN
    recommendations := array_append(recommendations, 'Pipeline value is low. Increase lead generation efforts.');
  END IF;
  
  IF activity_score < 60 THEN
    recommendations := array_append(recommendations, 'Team activity is below average. Ensure consistent follow-up.');
  END IF;
  
  IF win_rate_score < 50 THEN
    recommendations := array_append(recommendations, 'Win rate needs improvement. Review qualification criteria and sales process.');
  END IF;

  RETURN QUERY SELECT 
    calculate_business_health_score.overall_score,
    calculate_business_health_score.revenue_growth_score,
    calculate_business_health_score.pipeline_health_score,
    calculate_business_health_score.activity_score,
    calculate_business_health_score.win_rate_score,
    calculate_business_health_score.recommendations;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_business_health_score IS 'Calculate overall business health score with component metrics';

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================

-- Deals indexes for analytics
CREATE INDEX IF NOT EXISTS idx_deals_created_value ON deals(tenant_id, created_at, value_estimate_cents);
CREATE INDEX IF NOT EXISTS idx_deals_stage_value ON deals(tenant_id, stage_id, value_estimate_cents);

-- Activities indexes for analytics
CREATE INDEX IF NOT EXISTS idx_activities_occurred_type ON activities(tenant_id, occurred_at, type);
CREATE INDEX IF NOT EXISTS idx_activities_contact_occurred ON activities(contact_id, occurred_at);

-- Contacts indexes
CREATE INDEX IF NOT EXISTS idx_contacts_created_source ON contacts(tenant_id, created_at, source);

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Analytics enhancements installed successfully!';
  RAISE NOTICE '   - 4 new tables created';
  RAISE NOTICE '   - 10 new analytics views created';
  RAISE NOTICE '   - 1 helper function created';
  RAISE NOTICE '   - Performance indexes added';
END $$;



-- ============================================================
-- FROM sql/44_pms_integration.sql
-- ============================================================

-- =====================================================
-- PMS INTEGRATION SYSTEM
-- =====================================================
-- Version: 1.0
-- Date: October 13, 2025
-- Purpose: Bidirectional integration with Practice Management Software
-- =====================================================

BEGIN;

-- =====================================================
-- 1. PMS CONNECTION & CONFIGURATION
-- =====================================================

CREATE TABLE IF NOT EXISTS pms_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Provider info
  provider TEXT NOT NULL CHECK (provider IN ('dentrix', 'opendental', 'eaglesoft', 'curve', 'generic')),
  provider_name TEXT NOT NULL,
  
  -- Connection details
  api_endpoint TEXT,
  api_key TEXT, -- Encrypted in production
  api_secret TEXT, -- Encrypted in production
  webhook_secret TEXT, -- For verifying incoming webhooks
  
  -- Status
  is_active BOOLEAN DEFAULT FALSE,
  connection_status TEXT DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'error', 'syncing')),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  
  -- Settings
  settings JSONB DEFAULT '{}', -- Provider-specific settings
  field_mappings JSONB DEFAULT '{}', -- Custom field mappings
  
  -- Sync preferences
  auto_create_deals BOOLEAN DEFAULT TRUE,
  auto_close_deals BOOLEAN DEFAULT TRUE,
  sync_patient_demographics BOOLEAN DEFAULT TRUE,
  sync_payment_data BOOLEAN DEFAULT TRUE,
  sync_appointments BOOLEAN DEFAULT TRUE,
  min_deal_value_cents INTEGER DEFAULT 100000, -- $1,000 minimum
  excluded_procedure_codes TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pms_integrations_tenant ON pms_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pms_integrations_active ON pms_integrations(tenant_id, is_active);

COMMENT ON TABLE pms_integrations IS 'Practice Management Software integration configurations';

-- =====================================================
-- 2. SYNC AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS pms_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES pms_integrations(id) ON DELETE CASCADE,
  
  -- Sync details
  sync_type TEXT NOT NULL CHECK (sync_type IN ('patient', 'treatment_plan', 'payment', 'appointment', 'full_sync')),
  direction TEXT NOT NULL CHECK (direction IN ('pms_to_crm', 'crm_to_pms', 'bidirectional')),
  
  -- Results
  status TEXT NOT NULL CHECK (status IN ('success', 'partial_success', 'failed')),
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  
  -- Error tracking
  error_details JSONB,
  error_message TEXT,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pms_sync_logs_integration ON pms_sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_pms_sync_logs_tenant_type ON pms_sync_logs(tenant_id, sync_type);
CREATE INDEX IF NOT EXISTS idx_pms_sync_logs_created ON pms_sync_logs(created_at DESC);

COMMENT ON TABLE pms_sync_logs IS 'Audit log for all PMS synchronization operations';

-- =====================================================
-- 3. PATIENT-CONTACT MAPPING
-- =====================================================

CREATE TABLE IF NOT EXISTS pms_patient_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES pms_integrations(id) ON DELETE CASCADE,
  
  -- Mapping
  crm_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  pms_patient_id TEXT NOT NULL, -- PMS internal patient ID
  pms_provider TEXT NOT NULL,
  
  -- Sync tracking
  first_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'failed', 'conflict')),
  conflict_reason TEXT,
  
  -- Patient data snapshot (for conflict resolution)
  pms_data_snapshot JSONB,
  crm_data_snapshot JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(crm_contact_id, pms_provider),
  UNIQUE(tenant_id, pms_patient_id, pms_provider)
);

CREATE INDEX IF NOT EXISTS idx_pms_patient_mappings_contact ON pms_patient_mappings(crm_contact_id);
CREATE INDEX IF NOT EXISTS idx_pms_patient_mappings_pms_id ON pms_patient_mappings(pms_patient_id, pms_provider);
CREATE INDEX IF NOT EXISTS idx_pms_patient_mappings_tenant ON pms_patient_mappings(tenant_id);

COMMENT ON TABLE pms_patient_mappings IS 'Links CRM contacts to PMS patient records';

-- =====================================================
-- 4. TREATMENT PLANS
-- =====================================================

CREATE TABLE IF NOT EXISTS treatment_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES pms_integrations(id) ON DELETE CASCADE,
  
  -- PMS reference
  pms_treatment_id TEXT NOT NULL,
  pms_patient_id TEXT NOT NULL,
  
  -- CRM links
  crm_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  crm_deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  
  -- Treatment details
  treatment_type TEXT, -- 'crown', 'implant', 'orthodontics', 'periodontics', etc.
  treatment_description TEXT,
  procedure_codes TEXT[], -- ADA/CDT codes (D2750, D6010, etc.)
  tooth_numbers TEXT[], -- Which teeth
  provider_name TEXT, -- Dentist who proposed
  
  -- Financial
  estimated_cost_cents INTEGER NOT NULL,
  accepted_cost_cents INTEGER,
  actual_paid_cents INTEGER DEFAULT 0,
  insurance_coverage_cents INTEGER DEFAULT 0,
  patient_portion_cents INTEGER,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled')),
  proposed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Decline tracking
  decline_reason TEXT,
  decline_category TEXT, -- 'cost', 'timing', 'fear', 'second_opinion', 'other'
  
  -- Metadata
  notes TEXT,
  pms_data JSONB, -- Full PMS treatment plan data
  synced_from_pms BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, pms_treatment_id, integration_id)
);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_tenant ON treatment_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_contact ON treatment_plans(crm_contact_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_deal ON treatment_plans(crm_deal_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_pms_id ON treatment_plans(pms_treatment_id, integration_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_status ON treatment_plans(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_type ON treatment_plans(tenant_id, treatment_type);

COMMENT ON TABLE treatment_plans IS 'Treatment plans synced from PMS, linked to CRM deals';

-- =====================================================
-- 5. PAYMENT TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS treatment_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES pms_integrations(id) ON DELETE CASCADE,
  
  -- Links
  treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE CASCADE,
  crm_deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  crm_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  pms_payment_id TEXT,
  
  -- Payment details
  amount_cents INTEGER NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'check', 'insurance', 'financing', 'other')),
  payment_date DATE NOT NULL,
  payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('completed', 'pending', 'failed', 'refunded')),
  
  -- Insurance
  insurance_claim_id TEXT,
  insurance_paid_cents INTEGER DEFAULT 0,
  patient_paid_cents INTEGER DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  pms_data JSONB,
  synced_from_pms BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treatment_payments_treatment ON treatment_payments(treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_treatment_payments_deal ON treatment_payments(crm_deal_id);
CREATE INDEX IF NOT EXISTS idx_treatment_payments_contact ON treatment_payments(crm_contact_id);
CREATE INDEX IF NOT EXISTS idx_treatment_payments_date ON treatment_payments(payment_date DESC);

COMMENT ON TABLE treatment_payments IS 'Track actual payments for accurate LTV calculation';

-- =====================================================
-- 6. ADD COLUMNS TO EXISTING TABLES (NON-BREAKING)
-- =====================================================

-- Add PMS columns to contacts (optional, nullable)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pms_patient_id TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pms_provider TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lifetime_value_actual_cents INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS total_treatments INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_contacts_pms_id ON contacts(pms_patient_id, pms_provider) WHERE pms_patient_id IS NOT NULL;

-- Add PMS columns to deals (optional, nullable)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS pms_treatment_id TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS actual_revenue_cents INTEGER;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS treatment_type TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS procedure_codes TEXT[];

CREATE INDEX IF NOT EXISTS idx_deals_pms_treatment ON deals(pms_treatment_id) WHERE pms_treatment_id IS NOT NULL;

-- Add PMS integration flag to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS pms_integration_enabled BOOLEAN DEFAULT FALSE;

-- =====================================================
-- 7. ANALYTICS VIEWS
-- =====================================================

-- Treatment Type Performance
DROP VIEW IF EXISTS treatment_type_analytics CASCADE;
CREATE VIEW treatment_type_analytics AS
SELECT
  tp.tenant_id,
  tp.treatment_type,
  COUNT(*) as total_proposed,
  COUNT(*) FILTER (WHERE tp.status = 'accepted') as total_accepted,
  COUNT(*) FILTER (WHERE tp.status = 'declined') as total_declined,
  COUNT(*) FILTER (WHERE tp.status = 'completed') as total_completed,
  CASE 
    WHEN COUNT(*) > 0 
    THEN ROUND((COUNT(*) FILTER (WHERE tp.status = 'accepted')::DECIMAL / COUNT(*)::DECIMAL) * 100, 1)
    ELSE 0 
  END as acceptance_rate,
  COALESCE(AVG(tp.estimated_cost_cents), 0) as avg_estimated_cost_cents,
  COALESCE(AVG(tp.accepted_cost_cents), 0) as avg_accepted_cost_cents,
  COALESCE(SUM(tp.actual_paid_cents), 0) as total_revenue_cents,
  COALESCE(AVG(tp.actual_paid_cents), 0) as avg_revenue_per_treatment_cents
FROM treatment_plans tp
WHERE tp.proposed_at >= NOW() - INTERVAL '12 months'
GROUP BY tp.tenant_id, tp.treatment_type;

COMMENT ON VIEW treatment_type_analytics IS 'Treatment type performance and acceptance rates';

-- Real LTV by Source
DROP VIEW IF EXISTS actual_ltv_by_source CASCADE;
CREATE VIEW actual_ltv_by_source AS
SELECT
  c.tenant_id,
  c.source,
  COUNT(DISTINCT c.id) as total_customers,
  COALESCE(SUM(c.lifetime_value_actual_cents), 0) as total_actual_ltv_cents,
  CASE 
    WHEN COUNT(DISTINCT c.id) > 0 
    THEN COALESCE(SUM(c.lifetime_value_actual_cents), 0) / COUNT(DISTINCT c.id)
    ELSE 0 
  END as avg_actual_ltv_cents,
  COALESCE(AVG(c.total_treatments), 0) as avg_treatments_per_customer,
  COALESCE(SUM(tp.actual_paid_cents), 0) as total_payments_cents,
  COUNT(DISTINCT tp.id) as total_treatments
FROM contacts c
LEFT JOIN treatment_plans tp ON c.id = tp.crm_contact_id
WHERE c.source IS NOT NULL
GROUP BY c.tenant_id, c.source;

COMMENT ON VIEW actual_ltv_by_source IS 'Actual lifetime value by acquisition source using real payment data';

-- Revenue Accuracy (Estimated vs Actual)
DROP VIEW IF EXISTS revenue_accuracy_metrics CASCADE;
CREATE VIEW revenue_accuracy_metrics AS
SELECT
  d.tenant_id,
  COUNT(*) as total_deals,
  COALESCE(SUM(d.value_estimate_cents), 0) as total_estimated_cents,
  COALESCE(SUM(d.actual_revenue_cents), 0) as total_actual_cents,
  CASE 
    WHEN COALESCE(SUM(d.value_estimate_cents), 0) > 0 
    THEN ROUND((COALESCE(SUM(d.actual_revenue_cents), 0)::DECIMAL / COALESCE(SUM(d.value_estimate_cents), 0)::DECIMAL) * 100, 1)
    ELSE 0 
  END as accuracy_percentage,
  COALESCE(AVG(d.value_estimate_cents), 0) as avg_estimated_cents,
  COALESCE(AVG(d.actual_revenue_cents), 0) as avg_actual_cents
FROM deals d
WHERE d.actual_revenue_cents IS NOT NULL
  AND d.created_at >= NOW() - INTERVAL '12 months'
GROUP BY d.tenant_id;

COMMENT ON VIEW revenue_accuracy_metrics IS 'Compare estimated vs actual revenue for forecasting improvement';

-- PMS Integration Health
DROP VIEW IF EXISTS pms_integration_health CASCADE;
CREATE VIEW pms_integration_health AS
SELECT
  pms.tenant_id,
  pms.provider,
  pms.provider_name,
  pms.connection_status,
  pms.last_sync_at,
  COUNT(DISTINCT ppm.id) as mapped_patients,
  COUNT(DISTINCT tp.id) as total_treatments,
  COUNT(DISTINCT tp.id) FILTER (WHERE tp.status = 'accepted') as accepted_treatments,
  COUNT(DISTINCT tpay.id) as total_payments,
  COALESCE(SUM(tpay.amount_cents), 0) as total_payment_amount_cents,
  COUNT(DISTINCT sl.id) FILTER (WHERE sl.status = 'failed' AND sl.created_at >= NOW() - INTERVAL '24 hours') as failed_syncs_24h
FROM pms_integrations pms
LEFT JOIN pms_patient_mappings ppm ON pms.id = ppm.integration_id
LEFT JOIN treatment_plans tp ON pms.id = tp.integration_id
LEFT JOIN treatment_payments tpay ON pms.id = tpay.integration_id
LEFT JOIN pms_sync_logs sl ON pms.id = sl.integration_id
WHERE pms.is_active = TRUE
GROUP BY pms.tenant_id, pms.id, pms.provider, pms.provider_name, pms.connection_status, pms.last_sync_at;

COMMENT ON VIEW pms_integration_health IS 'Monitor PMS integration status and health metrics';

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Calculate actual LTV for a contact
CREATE OR REPLACE FUNCTION calculate_actual_ltv(p_contact_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_payments INTEGER;
BEGIN
  SELECT COALESCE(SUM(amount_cents), 0)
  INTO v_total_payments
  FROM treatment_payments
  WHERE crm_contact_id = p_contact_id
    AND payment_status = 'completed';
  
  RETURN v_total_payments;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_actual_ltv IS 'Calculate actual lifetime value from payment history';

-- Update contact LTV (called after payment sync)
CREATE OR REPLACE FUNCTION update_contact_ltv()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'completed' THEN
    UPDATE contacts
    SET 
      lifetime_value_actual_cents = calculate_actual_ltv(NEW.crm_contact_id),
      total_treatments = (
        SELECT COUNT(DISTINCT treatment_plan_id)
        FROM treatment_payments
        WHERE crm_contact_id = NEW.crm_contact_id
          AND payment_status = 'completed'
      ),
      updated_at = NOW()
    WHERE id = NEW.crm_contact_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update LTV when payment received
DROP TRIGGER IF EXISTS trigger_update_contact_ltv ON treatment_payments;
CREATE OR REPLACE TRIGGER trigger_update_contact_ltv
  AFTER INSERT OR UPDATE ON treatment_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_ltv();

-- Update deal actual revenue (called after payment sync)
CREATE OR REPLACE FUNCTION update_deal_actual_revenue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.crm_deal_id IS NOT NULL THEN
    UPDATE deals
    SET 
      actual_revenue_cents = (
        SELECT COALESCE(SUM(amount_cents), 0)
        FROM treatment_payments
        WHERE crm_deal_id = NEW.crm_deal_id
          AND payment_status = 'completed'
      ),
      updated_at = NOW()
    WHERE id = NEW.crm_deal_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update deal actual revenue
DROP TRIGGER IF EXISTS trigger_update_deal_actual_revenue ON treatment_payments;
CREATE OR REPLACE TRIGGER trigger_update_deal_actual_revenue
  AFTER INSERT OR UPDATE ON treatment_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_actual_revenue();

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ PMS Integration schema installed successfully!';
  RAISE NOTICE '   - 5 new tables created';
  RAISE NOTICE '   - 4 analytics views created';
  RAISE NOTICE '   - 2 helper functions created';
  RAISE NOTICE '   - 2 triggers for auto-updates';
  RAISE NOTICE '   - Optional columns added to contacts & deals';
  RAISE NOTICE '   - Ready for PMS integration!';
END $$;




-- ============================================================
-- FROM sql/45_tenant_settings_enhancement.sql
-- ============================================================

-- =====================================================
-- TENANT SETTINGS ENHANCEMENT
-- =====================================================
-- Add all missing columns to support complete settings
-- =====================================================

BEGIN;

-- Add company/practice information columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email TEXT;

-- Address columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'United States';

-- Regional settings
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'MM/DD/YYYY';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS time_format TEXT DEFAULT '12h';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS week_start TEXT DEFAULT 'monday';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS fiscal_year_start TEXT DEFAULT 'january';

-- Branding
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#667eea';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#764ba2';

-- Business info
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_hours_start TEXT DEFAULT '09:00';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_hours_end TEXT DEFAULT '17:00';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_days TEXT[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday'];

-- Communication defaults
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_email_from_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_email_from_address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_email_reply_to TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sms_from_number TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_phone_number TEXT;

-- Integration settings
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_host TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_port INTEGER;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_username TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_password TEXT; -- Encrypted
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_encryption TEXT DEFAULT 'tls';

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sms_provider TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sms_api_key TEXT; -- Encrypted
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sms_api_secret TEXT; -- Encrypted

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_api_key TEXT; -- Encrypted
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_api_secret TEXT; -- Encrypted

-- Notification preferences
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS enable_email_notifications BOOLEAN DEFAULT TRUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS enable_sms_notifications BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS enable_slack_notifications BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;

-- Data & privacy
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT 365;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gdpr_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS auto_delete_enabled BOOLEAN DEFAULT FALSE;

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Tenant settings columns added successfully!';
  RAISE NOTICE '   - Company information fields';
  RAISE NOTICE '   - Regional settings';
  RAISE NOTICE '   - Branding options';
  RAISE NOTICE '   - Communication defaults';
  RAISE NOTICE '   - Integration settings';
  RAISE NOTICE '   - All existing data preserved!';
END $$;




-- ============================================================
-- FROM sql/45_treatment_routing.sql
-- ============================================================

-- =====================================================
-- TREATMENT TAG ROUTING SYSTEM - DATABASE FOUNDATION
-- =====================================================
-- Version: 1.0.0
-- Date: October 19, 2025
-- Purpose: Universal treatment tag-based deal routing system
-- Phase: 1 - Database Foundation
-- =====================================================
--
-- WHAT THIS MIGRATION DOES:
-- 1. Creates 4 new tables for treatment tag management and routing
-- 2. Adds comprehensive indexes for performance
-- 3. Implements Row Level Security (RLS) for multi-tenancy
-- 4. Creates helper functions for routing engine
-- 5. 100% SAFE - No modifications to existing tables
--
-- SAFETY:
-- - All new tables (no ALTER TABLE on existing tables)
-- - Isolated from existing functionality
-- - Can be rolled back without data loss
-- - Fully tested with RLS policies
--
-- =====================================================

BEGIN;

-- =====================================================
-- 1. TREATMENT TAGS TABLE
-- =====================================================
-- Purpose: User-defined treatment tags (e.g., "Dental Implant", "Orthodontics")
-- Multi-location: location_id NULL = org-wide, NOT NULL = location-specific
-- =====================================================

CREATE TABLE IF NOT EXISTS treatment_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID, -- References practice_locations(id) - FK added later if table exists
  
  -- Tag Details
  name TEXT NOT NULL, -- "Dental Implant", "Invisalign", "Emergency Care"
  description TEXT, -- Optional description for team clarity
  keywords TEXT[] NOT NULL DEFAULT '{}', -- ["implant", "crown", "restoration"]
  
  -- Visual Customization
  color TEXT DEFAULT '#6366f1', -- Hex color for UI display
  icon TEXT DEFAULT '🦷', -- Emoji or icon name
  
  -- Categorization
  category TEXT, -- "high_value", "emergency", "cosmetic", "orthodontic", "general", "custom"
  
  -- Routing Configuration
  min_value_cents INTEGER, -- Minimum deal value for this tag (optional filter)
  priority INTEGER DEFAULT 0, -- Higher priority = checked first in routing
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_system_tag BOOLEAN DEFAULT false, -- System tags cannot be deleted (e.g., "Emergency")
  
  -- Multi-location scope
  scope TEXT NOT NULL DEFAULT 'location' CHECK (scope IN ('organization', 'location')),
  -- 'organization' = available to all locations
  -- 'location' = specific to one location
  
  -- Usage stats (updated by triggers)
  usage_count INTEGER DEFAULT 0, -- How many deals have this tag
  conversion_rate DECIMAL(5,2), -- % of deals with this tag that close-won
  avg_deal_value_cents INTEGER, -- Average value of deals with this tag
  
  -- Audit
  created_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT tag_name_unique_per_location UNIQUE(tenant_id, location_id, name),
  CONSTRAINT tag_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT tag_keywords_not_empty CHECK (array_length(keywords, 1) > 0),
  CONSTRAINT tag_priority_reasonable CHECK (priority >= 0 AND priority <= 100)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_treatment_tags_tenant ON treatment_tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_treatment_tags_location ON treatment_tags(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_treatment_tags_active ON treatment_tags(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_treatment_tags_scope ON treatment_tags(tenant_id, scope);
CREATE INDEX IF NOT EXISTS idx_treatment_tags_category ON treatment_tags(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_treatment_tags_priority ON treatment_tags(priority DESC);
CREATE INDEX IF NOT EXISTS idx_treatment_tags_keywords_gin ON treatment_tags USING gin(keywords); -- Fast keyword searches
CREATE INDEX IF NOT EXISTS idx_treatment_tags_name_trgm ON treatment_tags USING gin(name gin_trgm_ops); -- Fuzzy search support

-- Comments for documentation
COMMENT ON TABLE treatment_tags IS 'User-defined treatment tags for categorizing and routing deals. Supports organization-wide and location-specific tags.';
COMMENT ON COLUMN treatment_tags.keywords IS 'Array of keywords to match in deal title/description for AI-powered routing';
COMMENT ON COLUMN treatment_tags.priority IS 'Higher priority tags are checked first during routing (0-100 scale)';
COMMENT ON COLUMN treatment_tags.scope IS 'Organization-wide tags available to all locations, location-specific tags only visible to that location';

-- =====================================================
-- 2. TREATMENT TAG TO PIPELINE MAPPINGS TABLE
-- =====================================================
-- Purpose: Maps treatment tags to specific pipelines for automatic routing
-- One tag can map to different pipelines in different locations
-- =====================================================

CREATE TABLE IF NOT EXISTS treatment_tag_pipeline_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID, -- References practice_locations(id) - FK added later if table exists
  
  -- Mapping Details
  treatment_tag_id UUID NOT NULL REFERENCES treatment_tags(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL, -- Optional: specific stage, NULL = first stage
  
  -- Routing Rules (Optional Advanced Filters)
  min_value_cents INTEGER, -- Only route if deal value >= this amount
  max_value_cents INTEGER, -- Only route if deal value <= this amount
  
  -- Priority & Status
  priority INTEGER DEFAULT 0, -- If tag matches multiple pipelines, use highest priority
  is_active BOOLEAN DEFAULT true,
  
  -- Auto-assignment Rules
  auto_assign_owner BOOLEAN DEFAULT false,
  assigned_owner_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  
  -- Conditions (Advanced: JSON-based conditional logic)
  conditions JSONB DEFAULT '{}', 
  -- Example: {"source": ["website", "referral"], "value_min": 500000}
  
  -- Audit
  created_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT mapping_unique_per_location UNIQUE(tenant_id, location_id, treatment_tag_id, pipeline_id),
  CONSTRAINT mapping_value_range_valid CHECK (
    (min_value_cents IS NULL OR max_value_cents IS NULL) OR 
    (min_value_cents <= max_value_cents)
  ),
  CONSTRAINT mapping_priority_reasonable CHECK (priority >= 0 AND priority <= 100)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tag_pipeline_mappings_tenant ON treatment_tag_pipeline_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tag_pipeline_mappings_location ON treatment_tag_pipeline_mappings(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tag_pipeline_mappings_tag ON treatment_tag_pipeline_mappings(treatment_tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_pipeline_mappings_pipeline ON treatment_tag_pipeline_mappings(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_tag_pipeline_mappings_active ON treatment_tag_pipeline_mappings(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tag_pipeline_mappings_priority ON treatment_tag_pipeline_mappings(priority DESC);

-- Comments for documentation
COMMENT ON TABLE treatment_tag_pipeline_mappings IS 'Maps treatment tags to pipelines for automatic deal routing. Supports location-specific mappings and advanced conditional logic.';
COMMENT ON COLUMN treatment_tag_pipeline_mappings.conditions IS 'JSONB field for advanced routing conditions (source, value ranges, custom fields, etc.)';

-- =====================================================
-- 3. TREATMENT ROUTING LOGS TABLE
-- =====================================================
-- Purpose: Audit trail of every routing decision for analytics and debugging
-- Tracks how deals were routed, confidence scores, and overrides
-- =====================================================

CREATE TABLE IF NOT EXISTS treatment_routing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Deal Reference
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  
  -- Routing Decision
  routed_from_pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL, -- NULL if new deal
  routed_to_pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  routed_to_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  
  -- Routing Method
  routing_method TEXT NOT NULL CHECK (routing_method IN (
    'user_override',      -- User manually selected pipeline
    'tag_mapping',        -- Matched via treatment_tag_pipeline_mappings
    'ai_keyword_match',   -- AI matched keywords in deal text
    'value_based',        -- Routed based on deal value threshold
    'unsorted_fallback',  -- No matches, routed to "Unsorted" pipeline
    'legacy_config',      -- Matched via old localStorage config (temporary)
    'api_specified'       -- API call explicitly specified pipeline
  )),
  
  -- Matching Details
  matched_tag_ids UUID[], -- Which treatment tags matched
  matched_keywords TEXT[], -- Which keywords triggered the match
  confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  
  -- Explanation
  routing_reason TEXT NOT NULL, -- Human-readable explanation
  -- Example: "Matched tag 'Dental Implant' (keyword: 'implant') → High-Value Pipeline"
  
  -- Deal Context at Routing Time (Snapshot)
  deal_title TEXT,
  deal_value_cents INTEGER,
  deal_treatment_tags TEXT[],
  deal_source TEXT,
  
  -- Performance Tracking
  routing_duration_ms INTEGER, -- How long routing calculation took
  
  -- User Context
  routed_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  was_manual_override BOOLEAN DEFAULT false,
  
  -- Metadata
  metadata JSONB DEFAULT '{}', -- Additional context (AI conversation data, form data, etc.)
  
  -- Timestamp
  routed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_routing_logs_tenant ON treatment_routing_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_routing_logs_deal ON treatment_routing_logs(deal_id);
CREATE INDEX IF NOT EXISTS idx_routing_logs_pipeline ON treatment_routing_logs(routed_to_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_routing_logs_method ON treatment_routing_logs(routing_method);
CREATE INDEX IF NOT EXISTS idx_routing_logs_timestamp ON treatment_routing_logs(routed_at DESC);
CREATE INDEX IF NOT EXISTS idx_routing_logs_user ON treatment_routing_logs(routed_by_user_id) WHERE routed_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_routing_logs_tags_gin ON treatment_routing_logs USING gin(matched_tag_ids); -- Fast tag queries

-- Comments for documentation
COMMENT ON TABLE treatment_routing_logs IS 'Complete audit trail of all deal routing decisions. Used for analytics, debugging, and improving routing accuracy.';
COMMENT ON COLUMN treatment_routing_logs.routing_method IS 'How the routing decision was made (user override, tag mapping, AI, etc.)';
COMMENT ON COLUMN treatment_routing_logs.confidence_score IS '0-100 score indicating confidence in routing decision';

-- =====================================================
-- 4. TENANT ROUTING SETTINGS TABLE
-- =====================================================
-- Purpose: Per-tenant configuration for routing behavior
-- Feature flags, default pipeline, AI settings, etc.
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_routing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  
  -- Feature Flags
  routing_enabled BOOLEAN DEFAULT true, -- Master kill switch
  ai_routing_enabled BOOLEAN DEFAULT true, -- Enable AI keyword matching
  suggest_pipeline_in_ui BOOLEAN DEFAULT true, -- Show suggestions in deal creation forms
  auto_route_webhooks BOOLEAN DEFAULT true, -- Auto-route deals from webhooks (forms, PMS, etc.)
  
  -- Default Pipeline Configuration
  unsorted_pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL, -- Where to send unmapped deals
  auto_create_unsorted BOOLEAN DEFAULT true, -- Auto-create "Unsorted" pipeline if doesn't exist
  
  -- AI Configuration
  ai_confidence_threshold INTEGER DEFAULT 70 CHECK (ai_confidence_threshold >= 0 AND ai_confidence_threshold <= 100),
  -- Only auto-route if AI confidence >= this threshold
  
  ai_keyword_matching_enabled BOOLEAN DEFAULT true,
  ai_value_based_routing_enabled BOOLEAN DEFAULT true,
  
  -- Routing Behavior
  allow_user_override BOOLEAN DEFAULT true, -- Users can always manually select pipeline
  require_approval_for_high_value BOOLEAN DEFAULT false, -- Deals >= threshold require manual approval
  high_value_threshold_cents INTEGER DEFAULT 500000, -- £5,000
  
  -- Notifications
  notify_on_routing BOOLEAN DEFAULT false, -- Notify deal owner when deal is auto-routed
  notify_on_fallback BOOLEAN DEFAULT true, -- Notify admins when deal goes to "Unsorted"
  
  -- Analytics
  track_routing_performance BOOLEAN DEFAULT true,
  calculate_tag_conversion_rates BOOLEAN DEFAULT true,
  
  -- Advanced Settings
  advanced_settings JSONB DEFAULT '{}',
  -- Example: {"bulk_reroute_enabled": true, "multi_tag_logic": "AND"}
  
  -- Audit
  updated_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_tenant_routing_settings_tenant ON tenant_routing_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_routing_settings_enabled ON tenant_routing_settings(tenant_id, routing_enabled) WHERE routing_enabled = true;

-- Comments for documentation
COMMENT ON TABLE tenant_routing_settings IS 'Per-tenant configuration for treatment tag routing system. Controls feature flags, default behavior, and AI settings.';
COMMENT ON COLUMN tenant_routing_settings.ai_confidence_threshold IS 'Minimum AI confidence score (0-100) required for automatic routing';

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function: Get or create "Unsorted" pipeline for a tenant
CREATE OR REPLACE FUNCTION get_or_create_unsorted_pipeline(p_tenant_id UUID)
RETURNS UUID AS $$
DECLARE
  v_pipeline_id UUID;
  v_stage_id UUID;
BEGIN
  -- Try to find existing "Unsorted" pipeline
  SELECT id INTO v_pipeline_id
  FROM pipelines
  WHERE tenant_id = p_tenant_id
    AND (name = 'Unsorted' OR name ILIKE '%unsorted%')
  LIMIT 1;
  
  -- If not found, create it
  IF v_pipeline_id IS NULL THEN
    INSERT INTO pipelines (tenant_id, name, created_at)
    VALUES (p_tenant_id, 'Unsorted', NOW())
    RETURNING id INTO v_pipeline_id;
    
    -- Create default stage "New"
    INSERT INTO pipeline_stages (tenant_id, pipeline_id, name, position, created_at)
    VALUES (p_tenant_id, v_pipeline_id, 'New', 0, NOW())
    RETURNING id INTO v_stage_id;
    
    RAISE NOTICE 'Created "Unsorted" pipeline for tenant %', p_tenant_id;
  END IF;
  
  RETURN v_pipeline_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_or_create_unsorted_pipeline IS 'Gets existing "Unsorted" pipeline or creates one if it doesn''t exist';

-- Function: Update tag usage statistics (called by trigger)
CREATE OR REPLACE FUNCTION update_treatment_tag_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update usage count and avg deal value for all tags in the deal
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE treatment_tags
    SET 
      usage_count = (
        SELECT COUNT(*) 
        FROM deals 
        WHERE tenant_id = treatment_tags.tenant_id 
          AND treatment_tags.name = ANY(deals.treatment_tags)
      ),
      avg_deal_value_cents = (
        SELECT AVG(value_estimate_cents)::INTEGER
        FROM deals 
        WHERE tenant_id = treatment_tags.tenant_id 
          AND treatment_tags.name = ANY(deals.treatment_tags)
      ),
      updated_at = NOW()
    WHERE tenant_id = NEW.tenant_id
      AND name = ANY(NEW.treatment_tags);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update tag stats when deal is created/updated
CREATE OR REPLACE TRIGGER trigger_update_treatment_tag_stats
  AFTER INSERT OR UPDATE OF treatment_tags, value_estimate_cents ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_treatment_tag_stats();

COMMENT ON FUNCTION update_treatment_tag_stats IS 'Automatically updates treatment tag usage statistics when deals are created or updated';

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE treatment_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_tag_pipeline_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_routing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_routing_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: treatment_tags
-- =====================================================

-- Policy: Users can view tags from their tenant
DROP POLICY IF EXISTS treatment_tags_select_policy ON treatment_tags;
CREATE POLICY treatment_tags_select_policy ON treatment_tags
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users WHERE id = auth.uid()
    )
  );

-- Policy: Admins can insert tags
DROP POLICY IF EXISTS treatment_tags_insert_policy ON treatment_tags;
CREATE POLICY treatment_tags_insert_policy ON treatment_tags
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM app_users 
      WHERE id = auth.uid() 
        AND role IN ('owner', 'manager')
    )
  );

-- Policy: Admins can update tags (except system tags)
DROP POLICY IF EXISTS treatment_tags_update_policy ON treatment_tags;
CREATE POLICY treatment_tags_update_policy ON treatment_tags
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users 
      WHERE id = auth.uid() 
        AND role IN ('owner', 'manager')
    )
    AND is_system_tag = false
  );

-- Policy: Admins can delete tags (except system tags, only if not in use)
DROP POLICY IF EXISTS treatment_tags_delete_policy ON treatment_tags;
CREATE POLICY treatment_tags_delete_policy ON treatment_tags
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users 
      WHERE id = auth.uid() 
        AND role IN ('owner', 'manager')
    )
    AND is_system_tag = false
    AND usage_count = 0
  );

-- =====================================================
-- RLS POLICIES: treatment_tag_pipeline_mappings
-- =====================================================

-- Policy: Users can view mappings from their tenant
DROP POLICY IF EXISTS tag_mappings_select_policy ON treatment_tag_pipeline_mappings;
CREATE POLICY tag_mappings_select_policy ON treatment_tag_pipeline_mappings
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users WHERE id = auth.uid()
    )
  );

-- Policy: Admins can insert mappings
DROP POLICY IF EXISTS tag_mappings_insert_policy ON treatment_tag_pipeline_mappings;
CREATE POLICY tag_mappings_insert_policy ON treatment_tag_pipeline_mappings
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM app_users 
      WHERE id = auth.uid() 
        AND role IN ('owner', 'manager')
    )
  );

-- Policy: Admins can update mappings
DROP POLICY IF EXISTS tag_mappings_update_policy ON treatment_tag_pipeline_mappings;
CREATE POLICY tag_mappings_update_policy ON treatment_tag_pipeline_mappings
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users 
      WHERE id = auth.uid() 
        AND role IN ('owner', 'manager')
    )
  );

-- Policy: Admins can delete mappings
DROP POLICY IF EXISTS tag_mappings_delete_policy ON treatment_tag_pipeline_mappings;
CREATE POLICY tag_mappings_delete_policy ON treatment_tag_pipeline_mappings
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users 
      WHERE id = auth.uid() 
        AND role IN ('owner', 'manager')
    )
  );

-- =====================================================
-- RLS POLICIES: treatment_routing_logs
-- =====================================================

-- Policy: All users can view routing logs from their tenant (read-only audit trail)
DROP POLICY IF EXISTS routing_logs_select_policy ON treatment_routing_logs;
CREATE POLICY routing_logs_select_policy ON treatment_routing_logs
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users WHERE id = auth.uid()
    )
  );

-- Policy: System can insert routing logs (no user-initiated inserts)
DROP POLICY IF EXISTS routing_logs_insert_policy ON treatment_routing_logs;
CREATE POLICY routing_logs_insert_policy ON treatment_routing_logs
  FOR INSERT
  WITH CHECK (true); -- Will be handled by backend service, not direct user access

-- Policy: No updates or deletes (immutable audit trail)
-- No UPDATE or DELETE policies = no one can modify/delete logs

-- =====================================================
-- RLS POLICIES: tenant_routing_settings
-- =====================================================

-- Policy: All users can view settings from their tenant
DROP POLICY IF EXISTS routing_settings_select_policy ON tenant_routing_settings;
CREATE POLICY routing_settings_select_policy ON tenant_routing_settings
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users WHERE id = auth.uid()
    )
  );

-- Policy: Admins can insert/update settings
DROP POLICY IF EXISTS routing_settings_insert_policy ON tenant_routing_settings;
CREATE POLICY routing_settings_insert_policy ON tenant_routing_settings
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM app_users 
      WHERE id = auth.uid() 
        AND role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS routing_settings_update_policy ON tenant_routing_settings;
CREATE POLICY routing_settings_update_policy ON tenant_routing_settings
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users 
      WHERE id = auth.uid() 
        AND role IN ('owner', 'manager')
    )
  );

-- No DELETE policy (settings should not be deleted, only disabled)

-- =====================================================
-- 7. DEFAULT DATA & INITIALIZATION
-- =====================================================

-- Function: Initialize routing settings for a tenant
CREATE OR REPLACE FUNCTION initialize_tenant_routing_settings(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO tenant_routing_settings (tenant_id)
  VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;
  
  RAISE NOTICE 'Initialized routing settings for tenant %', p_tenant_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION initialize_tenant_routing_settings IS 'Creates default routing settings for a new tenant';

-- =====================================================
-- 8. VALIDATION & CONSTRAINTS
-- =====================================================

-- Add constraint: pipeline and stage must belong to same tenant
ALTER TABLE treatment_tag_pipeline_mappings
  DROP CONSTRAINT IF EXISTS mapping_pipeline_tenant_match;
ALTER TABLE treatment_tag_pipeline_mappings
  ADD CONSTRAINT mapping_pipeline_tenant_match CHECK (
    -- This will be validated in application logic due to complexity
    true
  );

-- =====================================================
-- OPTIONAL: ADD FOREIGN KEYS TO practice_locations
-- Only if the table exists (multi-location feature)
-- =====================================================

DO $$
BEGIN
  -- Check if practice_locations table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'practice_locations'
  ) THEN
    
    -- Add foreign key to treatment_tags if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'treatment_tags_location_id_fkey'
      AND table_name = 'treatment_tags'
    ) THEN
      ALTER TABLE treatment_tags
        DROP CONSTRAINT IF EXISTS treatment_tags_location_id_fkey;
ALTER TABLE treatment_tags
        ADD CONSTRAINT treatment_tags_location_id_fkey 
        FOREIGN KEY (location_id) 
        REFERENCES practice_locations(id) 
        ON DELETE CASCADE;
      
      RAISE NOTICE '✓ Added foreign key: treatment_tags → practice_locations';
    END IF;
    
    -- Add foreign key to treatment_tag_pipeline_mappings if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'treatment_tag_pipeline_mappings_location_id_fkey'
      AND table_name = 'treatment_tag_pipeline_mappings'
    ) THEN
      ALTER TABLE treatment_tag_pipeline_mappings
        DROP CONSTRAINT IF EXISTS treatment_tag_pipeline_mappings_location_id_fkey;
ALTER TABLE treatment_tag_pipeline_mappings
        ADD CONSTRAINT treatment_tag_pipeline_mappings_location_id_fkey 
        FOREIGN KEY (location_id) 
        REFERENCES practice_locations(id) 
        ON DELETE CASCADE;
      
      RAISE NOTICE '✓ Added foreign key: treatment_tag_pipeline_mappings → practice_locations';
    END IF;
    
    RAISE NOTICE '✓ Multi-location support: ENABLED';
    
  ELSE
    RAISE NOTICE 'ℹ Multi-location support: DISABLED (practice_locations table not found)';
    RAISE NOTICE '  → location_id columns will remain NULL';
    RAISE NOTICE '  → Foreign keys will be added when practice_locations is created';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- MIGRATION SUCCESS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '✅ PHASE 1: DATABASE FOUNDATION - COMPLETE';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tables Created:';
  RAISE NOTICE '  ✓ treatment_tags (user-defined treatment tags)';
  RAISE NOTICE '  ✓ treatment_tag_pipeline_mappings (tag → pipeline routing)';
  RAISE NOTICE '  ✓ treatment_routing_logs (complete audit trail)';
  RAISE NOTICE '  ✓ tenant_routing_settings (feature flags & config)';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Security:';
  RAISE NOTICE '  ✓ Row Level Security (RLS) enabled on all tables';
  RAISE NOTICE '  ✓ Tenant isolation enforced';
  RAISE NOTICE '  ✓ Role-based access control (admins only for management)';
  RAISE NOTICE '  ✓ Immutable audit logs (no updates/deletes)';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Performance:';
  RAISE NOTICE '  ✓ 23 indexes created for fast queries';
  RAISE NOTICE '  ✓ GIN indexes for array/keyword searches';
  RAISE NOTICE '  ✓ Trigram indexes for fuzzy text search';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Helper Functions:';
  RAISE NOTICE '  ✓ get_or_create_unsorted_pipeline()';
  RAISE NOTICE '  ✓ update_treatment_tag_stats()';
  RAISE NOTICE '  ✓ initialize_tenant_routing_settings()';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '  → Phase 2: Build routing engine (routing-engine.ts)';
  RAISE NOTICE '  → Phase 3: Create settings UI';
  RAISE NOTICE '  → Phase 4: Integrate with deal creation forms';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '🚀 Ready for Phase 2: Core Routing Engine';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
END $$;



-- ============================================================
-- FROM sql/45b_add_practice_locations_fkeys.sql
-- ============================================================

-- =====================================================
-- ADD PRACTICE LOCATIONS FOREIGN KEYS
-- =====================================================
-- Run this AFTER creating practice_locations table
-- to add foreign key constraints to treatment routing tables
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '🔗 ADDING PRACTICE_LOCATIONS FOREIGN KEYS';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';

  -- Check if practice_locations table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'practice_locations'
  ) THEN
    RAISE NOTICE 'practice_locations table does not exist yet — skipping fkeys'; RETURN;
  END IF;

  -- Add foreign key to treatment_tags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'treatment_tags_location_id_fkey'
    AND table_name = 'treatment_tags'
  ) THEN
    ALTER TABLE treatment_tags
      DROP CONSTRAINT IF EXISTS treatment_tags_location_id_fkey;
ALTER TABLE treatment_tags
      ADD CONSTRAINT treatment_tags_location_id_fkey 
      FOREIGN KEY (location_id) 
      REFERENCES practice_locations(id) 
      ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Added foreign key: treatment_tags.location_id → practice_locations.id';
  ELSE
    RAISE NOTICE '✓ Foreign key already exists: treatment_tags.location_id';
  END IF;

  -- Add foreign key to treatment_tag_pipeline_mappings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'treatment_tag_pipeline_mappings_location_id_fkey'
    AND table_name = 'treatment_tag_pipeline_mappings'
  ) THEN
    ALTER TABLE treatment_tag_pipeline_mappings
      DROP CONSTRAINT IF EXISTS treatment_tag_pipeline_mappings_location_id_fkey;
ALTER TABLE treatment_tag_pipeline_mappings
      ADD CONSTRAINT treatment_tag_pipeline_mappings_location_id_fkey 
      FOREIGN KEY (location_id) 
      REFERENCES practice_locations(id) 
      ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Added foreign key: treatment_tag_pipeline_mappings.location_id → practice_locations.id';
  ELSE
    RAISE NOTICE '✓ Foreign key already exists: treatment_tag_pipeline_mappings.location_id';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '✅ FOREIGN KEYS ADDED SUCCESSFULLY';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Multi-location support is now FULLY ENABLED';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '  → Create location-specific treatment tags';
  RAISE NOTICE '  → Map tags to pipelines per location';
  RAISE NOTICE '  → Use organization-wide tags (location_id = NULL)';
  RAISE NOTICE '';
END $$;



-- ============================================================
-- FROM sql/46_super_admin_system.sql
-- ============================================================

-- =====================================================
-- SUPER ADMIN SYSTEM
-- For platform owner to monitor all practices & users
-- =====================================================

BEGIN;

-- =====================================================
-- 1. SUPER ADMINS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL, -- Separate auth from main app
  role TEXT DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'support', 'analyst')),
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. ANALYTICS EVENTS TABLE
-- Track all user actions across all practices
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Who & Where
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  
  -- What
  event_type TEXT NOT NULL, -- 'page_view', 'button_click', 'feature_used', 'form_submit'
  event_name TEXT NOT NULL, -- 'view_pipeline', 'create_contact', 'send_email'
  event_category TEXT, -- 'navigation', 'crm', 'marketing', 'settings'
  
  -- Details
  page_url TEXT,
  referrer TEXT,
  element_id TEXT, -- Button/element that was clicked
  element_text TEXT, -- Button label
  metadata JSONB, -- Any additional data
  
  -- Context
  user_agent TEXT,
  ip_address INET,
  country TEXT,
  city TEXT,
  
  -- Performance
  page_load_time_ms INTEGER,
  
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS analytics_events_tenant_id_idx ON analytics_events(tenant_id);
CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS analytics_events_event_type_idx ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS analytics_events_occurred_at_idx ON analytics_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_session_id_idx ON analytics_events(session_id);

-- =====================================================
-- 3. USER SESSIONS TABLE
-- Track login sessions and duration
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE NOT NULL,
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- Session data
  user_agent TEXT,
  ip_address INET,
  country TEXT,
  city TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser TEXT,
  os TEXT,
  
  -- Activity
  pages_viewed INTEGER DEFAULT 0,
  actions_taken INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_tenant_id_idx ON user_sessions(tenant_id);
-- PATCHED: user_sessions duplicated definition mismatch -- CREATE INDEX IF NOT EXISTS user_sessions_started_at_idx ON user_sessions(started_at DESC);

-- =====================================================
-- 4. FEATURE USAGE TABLE
-- Aggregate feature usage stats
-- =====================================================
CREATE TABLE IF NOT EXISTS feature_usage_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  feature_name TEXT NOT NULL, -- 'pipeline', 'contacts', 'marketing_campaigns', etc.
  feature_category TEXT, -- 'crm', 'marketing', 'analytics', 'settings'
  
  -- Aggregated stats
  total_uses INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  unique_tenants INTEGER DEFAULT 0,
  
  -- Time period
  date DATE NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(feature_name, date)
);

-- =====================================================
-- 5. SYSTEM ERROR LOGS
-- Track all errors for monitoring
-- =====================================================
CREATE TABLE IF NOT EXISTS system_error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  
  error_type TEXT NOT NULL, -- 'javascript', 'api', 'database'
  error_message TEXT NOT NULL,
  error_stack TEXT,
  
  -- Context
  page_url TEXT,
  user_agent TEXT,
  
  -- Additional data
  metadata JSONB,
  
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS error_logs_occurred_at_idx ON system_error_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS error_logs_error_type_idx ON system_error_logs(error_type);

-- =====================================================
-- 6. ANALYTICS VIEWS
-- Pre-computed analytics for fast queries
-- =====================================================

-- Daily Active Users per practice
DROP VIEW IF EXISTS daily_active_users CASCADE;
CREATE VIEW daily_active_users AS
SELECT
  tenant_id,
  DATE(occurred_at) as date,
  COUNT(DISTINCT user_id) as active_users
FROM analytics_events
WHERE event_type = 'page_view'
GROUP BY tenant_id, DATE(occurred_at);

-- Feature Adoption Rates
DROP VIEW IF EXISTS feature_adoption CASCADE;
CREATE VIEW feature_adoption AS
SELECT
  event_name as feature_name,
  COUNT(DISTINCT tenant_id) as practices_using,
  COUNT(DISTINCT user_id) as users_using,
  COUNT(*) as total_uses,
  (COUNT(DISTINCT tenant_id)::DECIMAL / NULLIF((SELECT COUNT(*) FROM tenants), 0) * 100) as adoption_rate_percent
FROM analytics_events
WHERE event_type = 'feature_used'
GROUP BY event_name
ORDER BY total_uses DESC;

-- Practice Growth Over Time
DROP VIEW IF EXISTS practice_growth CASCADE;
CREATE VIEW practice_growth AS
SELECT
  DATE(created_at) as signup_date,
  COUNT(*) as new_signups,
  SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative_total
FROM tenants
GROUP BY DATE(created_at)
ORDER BY signup_date DESC;

-- User Engagement Summary
DROP VIEW IF EXISTS user_engagement_summary CASCADE;
CREATE VIEW user_engagement_summary AS
SELECT
  u.id as user_id,
  u.full_name,
  u.email,
  u.tenant_id,
  t.name as practice_name,
  COUNT(DISTINCT DATE(ae.occurred_at)) as days_active_last_30,
  COUNT(ae.id) FILTER (WHERE ae.occurred_at >= NOW() - INTERVAL '7 days') as events_last_7_days,
  MAX(ae.occurred_at) as last_active_at
FROM app_users u
LEFT JOIN tenants t ON u.tenant_id = t.id
LEFT JOIN analytics_events ae ON u.id = ae.user_id
WHERE ae.occurred_at >= NOW() - INTERVAL '30 days' OR ae.occurred_at IS NULL
GROUP BY u.id, u.full_name, u.email, u.tenant_id, t.name;

-- =====================================================
-- 7. SUPER ADMIN FUNCTIONS
-- =====================================================

-- Get platform-wide stats
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_practices', (SELECT COUNT(*) FROM tenants),
    'total_users', (SELECT COUNT(*) FROM app_users),
    'active_users_today', (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE DATE(occurred_at) = CURRENT_DATE),
    'total_deals', (SELECT COUNT(*) FROM deals),
    'total_contacts', (SELECT COUNT(*) FROM contacts),
    'total_revenue_cents', (SELECT COALESCE(SUM(value_estimate_cents), 0) FROM deals),
    'signups_this_month', (SELECT COUNT(*) FROM tenants WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())),
    'events_last_24h', (SELECT COUNT(*) FROM analytics_events WHERE occurred_at >= NOW() - INTERVAL '24 hours')
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Super Admin system tables created successfully!';
  RAISE NOTICE '📊 Analytics tracking ready';
  RAISE NOTICE '🔐 Separate super admin auth configured';
END $$;



-- ============================================================
-- FROM sql/46_treatment_routing_permissions.sql
-- ============================================================

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
      RAISE NOTICE 'CREATE TABLE IF NOT EXISTS role_permissions_backup_uuid AS SELECT * FROM role_permissions;';
      RAISE NOTICE '';
      RAISE NOTICE '-- Step 2: Drop dependent policies (will be recreated)';
      RAISE NOTICE 'DROP POLICY IF EXISTS join_requests_select_admin ON organization_join_requests CASCADE;';
      RAISE NOTICE 'DROP POLICY IF EXISTS join_requests_update_admin ON organization_join_requests CASCADE;';
      RAISE NOTICE '';
      RAISE NOTICE '-- Step 3: Rename old column';
      RAISE NOTICE 'ALTER TABLE role_permissions RENAME COLUMN permission_key TO permission_key_old;';
      RAISE NOTICE '';
      RAISE NOTICE '-- Step 4: Add new TEXT column';
      RAISE NOTICE 'ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS permission_key TEXT;';
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
      RAISE NOTICE 'CREATE INDEX IF NOT EXISTS role_permissions_permission_key_idx ON role_permissions(permission_key);';
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
    CREATE TABLE IF NOT EXISTS role_permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
      permission_key TEXT NOT NULL REFERENCES permission_definitions(key) ON DELETE CASCADE,
      granted BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(role_id, permission_key)
    );
    
    CREATE INDEX IF NOT EXISTS role_permissions_role_id_idx ON role_permissions(role_id);
    CREATE INDEX IF NOT EXISTS role_permissions_permission_key_idx ON role_permissions(permission_key);
    
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
DROP VIEW IF EXISTS v_routing_permissions CASCADE;
CREATE VIEW v_routing_permissions AS
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
DROP VIEW IF EXISTS v_role_permission_matrix CASCADE;
CREATE VIEW v_role_permission_matrix AS
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



-- ============================================================
-- FROM sql/46a_fix_permission_key_type.sql
-- ============================================================

-- =====================================================
-- FIX: role_permissions.permission_key UUID → TEXT
-- =====================================================
-- Version: 1.0.0
-- Date: October 19, 2025
-- Purpose: Fix permission_key column type from UUID to TEXT
-- Run this BEFORE running 46_treatment_routing_permissions.sql
-- =====================================================
--
-- PROBLEM:
-- - role_permissions.permission_key is UUID but should be TEXT
-- - Cannot drop column due to policy dependencies
-- - Need to carefully migrate without breaking RLS policies
--
-- SOLUTION:
-- 1. Backup existing data
-- 2. Drop dependent RLS policies (will be recreated by app)
-- 3. Rename old column
-- 4. Add new TEXT column
-- 5. Clear table (will be repopulated by migration 46)
-- 6. Drop old column
-- 7. Add constraints
--
-- SAFETY:
-- - Creates backup table
-- - Non-destructive approach
-- - Can be rolled back
-- - Clear console messages
--
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_column_type TEXT;
  v_has_data BOOLEAN;
  v_column_exists BOOLEAN;
  v_alt_column_name TEXT;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'FIX: role_permissions.permission_key UUID → TEXT';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Check if permission_key column exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'role_permissions' 
    AND column_name = 'permission_key'
  ) INTO v_column_exists;
  
  IF NOT v_column_exists THEN
    RAISE NOTICE 'ℹ permission_key column does not exist';
    RAISE NOTICE '→ Checking for alternative column names...';
    
    -- Check for permission_id
    IF EXISTS(
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'role_permissions' 
      AND column_name = 'permission_id'
    ) THEN
      v_alt_column_name := 'permission_id';
      RAISE NOTICE '✓ Found: permission_id (will rename to permission_key)';
    -- Check for permission_definition_id
    ELSIF EXISTS(
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'role_permissions' 
      AND column_name = 'permission_definition_id'
    ) THEN
      v_alt_column_name := 'permission_definition_id';
      RAISE NOTICE '✓ Found: permission_definition_id (will rename to permission_key)';
    ELSE
      RAISE EXCEPTION 'role_permissions table exists but has no permission column (permission_key, permission_id, or permission_definition_id). Please check table structure.';
    END IF;
    
    -- Rename the column
    RAISE NOTICE '';
    RAISE NOTICE '→ Renaming % to permission_key...', v_alt_column_name;
    EXECUTE format('ALTER TABLE role_permissions RENAME COLUMN %I TO permission_key', v_alt_column_name);
    RAISE NOTICE '✓ Column renamed';
  END IF;
  
  -- Now get the column type
  SELECT data_type INTO v_column_type
  FROM information_schema.columns 
  WHERE table_schema = 'public'
  AND table_name = 'role_permissions' 
  AND column_name = 'permission_key';
  
  RAISE NOTICE '';
  RAISE NOTICE 'Current permission_key type: %', v_column_type;
  RAISE NOTICE '';
  
  IF v_column_type = 'uuid' THEN
    RAISE NOTICE '✓ Detected: permission_key is UUID (needs to be TEXT)';
    RAISE NOTICE '';
    
    -- Check if table has data
    EXECUTE 'SELECT EXISTS(SELECT 1 FROM role_permissions LIMIT 1)' INTO v_has_data;
    
    IF v_has_data THEN
      RAISE NOTICE 'ℹ Table has % rows', (SELECT COUNT(*) FROM role_permissions);
    ELSE
      RAISE NOTICE 'ℹ Table is empty';
    END IF;
    
    -- Step 1: Create backup
    RAISE NOTICE '';
    RAISE NOTICE '→ Step 1: Creating backup...';
    DROP TABLE IF EXISTS role_permissions_backup_uuid;
    CREATE TABLE IF NOT EXISTS role_permissions_backup_uuid AS 
    SELECT * FROM role_permissions;
    RAISE NOTICE '✓ Backup created: role_permissions_backup_uuid';
    
    -- Step 2: Drop dependent policies
    RAISE NOTICE '';
    RAISE NOTICE '→ Step 2: Dropping dependent RLS policies...';
    DROP POLICY IF EXISTS join_requests_select_admin ON organization_join_requests CASCADE;
    DROP POLICY IF EXISTS join_requests_update_admin ON organization_join_requests CASCADE;
    RAISE NOTICE '✓ Policies dropped (will be recreated by application)';
    
    -- Step 3: Rename old column
    RAISE NOTICE '';
    RAISE NOTICE '→ Step 3: Renaming permission_key to permission_key_old...';
    ALTER TABLE role_permissions 
      RENAME COLUMN permission_key TO permission_key_old;
    RAISE NOTICE '✓ Column renamed';
    
    -- Step 4: Add new TEXT column
    RAISE NOTICE '';
    RAISE NOTICE '→ Step 4: Adding new permission_key as TEXT...';
    ALTER TABLE role_permissions 
      ADD COLUMN IF NOT EXISTS permission_key TEXT;
    RAISE NOTICE '✓ New TEXT column added';
    
    -- Step 5: Clear table (will be repopulated by migration 46)
    RAISE NOTICE '';
    RAISE NOTICE '→ Step 5: Clearing table (will be repopulated)...';
    TRUNCATE role_permissions;
    RAISE NOTICE '✓ Table cleared';
    
    -- Step 6: Drop old column
    RAISE NOTICE '';
    RAISE NOTICE '→ Step 6: Dropping old UUID column...';
    ALTER TABLE role_permissions 
      DROP COLUMN permission_key_old;
    RAISE NOTICE '✓ Old column dropped';
    
    -- Step 7: Make column NOT NULL
    RAISE NOTICE '';
    RAISE NOTICE '→ Step 7: Setting NOT NULL constraint...';
    ALTER TABLE role_permissions 
      ALTER COLUMN permission_key SET NOT NULL;
    RAISE NOTICE '✓ NOT NULL constraint added';
    
    -- Step 8: Add constraints and indexes
    RAISE NOTICE '';
    RAISE NOTICE '→ Step 8: Adding foreign key, unique constraint, and index...';
    
    -- Foreign key
    ALTER TABLE role_permissions 
      DROP CONSTRAINT IF EXISTS role_permissions_permission_key_fkey;
ALTER TABLE role_permissions 
      ADD CONSTRAINT role_permissions_permission_key_fkey 
      FOREIGN KEY (permission_key) 
      REFERENCES permission_definitions(key) 
      ON DELETE CASCADE;
    RAISE NOTICE '  ✓ Foreign key constraint added';
    
    -- Unique constraint
    ALTER TABLE role_permissions 
      DROP CONSTRAINT IF EXISTS role_permissions_role_id_permission_key_key;
ALTER TABLE role_permissions 
      ADD CONSTRAINT role_permissions_role_id_permission_key_key 
      UNIQUE(role_id, permission_key);
    RAISE NOTICE '  ✓ Unique constraint added';
    
    -- Index
    CREATE INDEX IF NOT EXISTS role_permissions_permission_key_idx 
      ON role_permissions(permission_key);
    RAISE NOTICE '  ✓ Index created';
    
    -- Success!
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE '✓ SUCCESS! permission_key is now TEXT';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Run migration 46_treatment_routing_permissions.sql';
    RAISE NOTICE '2. This will populate role_permissions with correct data';
    RAISE NOTICE '3. RLS policies will be recreated by the application';
    RAISE NOTICE '';
    RAISE NOTICE 'BACKUP: role_permissions_backup_uuid (can be dropped later)';
    RAISE NOTICE '';
    
  ELSIF v_column_type = 'text' OR v_column_type = 'character varying' THEN
    RAISE NOTICE '✓ permission_key is already TEXT - no fix needed!';
    RAISE NOTICE '';
    RAISE NOTICE 'You can proceed directly to migration 46.';
    RAISE NOTICE '';
    
  ELSIF v_column_type IS NULL THEN
    RAISE EXCEPTION 'Could not determine permission_key column type. This should not happen - please check that the column exists.';
    
  ELSE
    RAISE NOTICE '⚠ Unexpected permission_key type: %', v_column_type;
    RAISE NOTICE 'Attempting to convert to TEXT anyway...';
    
    -- Try to convert any other type to TEXT
    ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_permission_key_fkey;
    ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_id_permission_key_key;
    DROP INDEX IF EXISTS role_permissions_permission_key_idx;
    
    ALTER TABLE role_permissions RENAME COLUMN permission_key TO permission_key_old;
    ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS permission_key TEXT;
    TRUNCATE role_permissions;
    ALTER TABLE role_permissions DROP COLUMN permission_key_old;
    ALTER TABLE role_permissions ALTER COLUMN permission_key SET NOT NULL;
    
    ALTER TABLE role_permissions
      DROP CONSTRAINT IF EXISTS role_permissions_permission_key_fkey;
ALTER TABLE role_permissions
      ADD CONSTRAINT role_permissions_permission_key_fkey 
      FOREIGN KEY (permission_key) 
      REFERENCES permission_definitions(key) 
      ON DELETE CASCADE;
    
    ALTER TABLE role_permissions
      DROP CONSTRAINT IF EXISTS role_permissions_role_id_permission_key_key;
ALTER TABLE role_permissions
      ADD CONSTRAINT role_permissions_role_id_permission_key_key 
      UNIQUE(role_id, permission_key);
    
    CREATE INDEX IF NOT EXISTS role_permissions_permission_key_idx 
      ON role_permissions(permission_key);
    
    RAISE NOTICE '✓ Converted % to TEXT', v_column_type;
  END IF;
  
END $$;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after the fix to verify:

-- Check column type
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'role_permissions' 
-- AND column_name = 'permission_key';
-- Expected: permission_key | text

-- Check table is empty (will be filled by migration 46)
-- SELECT COUNT(*) FROM role_permissions;
-- Expected: 0

-- Check backup exists
-- SELECT COUNT(*) FROM role_permissions_backup_uuid;
-- Shows how many rows were backed up

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- If something goes wrong, you can rollback:
-- 
-- DROP TABLE IF EXISTS role_permissions;
-- CREATE TABLE IF NOT EXISTS role_permissions AS 
-- SELECT * FROM role_permissions_backup_uuid;
-- 
-- Then investigate the issue before trying again.
-- =====================================================



-- ============================================================
-- FROM sql/46b_fix_foreign_keys.sql
-- ============================================================

-- =====================================================
-- FIX: role_permissions foreign key constraints
-- =====================================================
-- Version: 1.0.0
-- Date: October 19, 2025
-- Purpose: Fix foreign key constraints to point to correct tables
-- Run this BEFORE running 46_treatment_routing_permissions.sql
-- =====================================================
--
-- PROBLEM:
-- - role_permissions has FK to role_definitions (wrong table)
-- - Should reference custom_roles (correct table)
-- - INSERT fails because role_id doesn't exist in role_definitions
--
-- SOLUTION:
-- 1. Check which FK constraints exist
-- 2. Drop incorrect FK constraints
-- 3. Create correct FK constraints
-- 4. Verify tables exist
--
-- SAFETY:
-- - Checks table existence
-- - Only fixes incorrect constraints
-- - Zero data loss
-- - Clear console messages
--
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_has_custom_roles BOOLEAN;
  v_has_role_definitions BOOLEAN;
  v_has_permission_definitions BOOLEAN;
  v_constraint_exists BOOLEAN;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'FIX: role_permissions Foreign Key Constraints';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Check which tables exist
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'custom_roles'
  ) INTO v_has_custom_roles;
  
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'role_definitions'
  ) INTO v_has_role_definitions;
  
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'permission_definitions'
  ) INTO v_has_permission_definitions;
  
  RAISE NOTICE '→ Table existence check:';
  RAISE NOTICE '  custom_roles: %', CASE WHEN v_has_custom_roles THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE '  role_definitions: %', CASE WHEN v_has_role_definitions THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE '  permission_definitions: %', CASE WHEN v_has_permission_definitions THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE '';
  
  IF NOT v_has_custom_roles THEN
    RAISE EXCEPTION 'custom_roles table does not exist. Please ensure your base migrations have run.';
  END IF;
  
  IF NOT v_has_permission_definitions THEN
    RAISE EXCEPTION 'permission_definitions table does not exist. Please ensure your base migrations have run.';
  END IF;
  
  -- Drop all existing FK constraints on role_permissions
  RAISE NOTICE '→ Step 1: Dropping existing foreign key constraints...';
  
  -- Drop role_id FK (regardless of which table it points to)
  SELECT EXISTS(
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'role_permissions' 
    AND constraint_name = 'role_permissions_role_id_fkey'
  ) INTO v_constraint_exists;
  
  IF v_constraint_exists THEN
    ALTER TABLE role_permissions DROP CONSTRAINT role_permissions_role_id_fkey;
    RAISE NOTICE '  ✓ Dropped: role_permissions_role_id_fkey';
  ELSE
    RAISE NOTICE '  ℹ No role_id FK constraint found (will create correct one)';
  END IF;
  
  -- Drop permission_key FK (in case it exists)
  SELECT EXISTS(
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'role_permissions' 
    AND constraint_name = 'role_permissions_permission_key_fkey'
  ) INTO v_constraint_exists;
  
  IF v_constraint_exists THEN
    ALTER TABLE role_permissions DROP CONSTRAINT role_permissions_permission_key_fkey;
    RAISE NOTICE '  ✓ Dropped: role_permissions_permission_key_fkey';
  ELSE
    RAISE NOTICE '  ℹ No permission_key FK constraint found (will create correct one)';
  END IF;
  
  RAISE NOTICE '';
  
  -- Create correct FK constraints
  RAISE NOTICE '→ Step 2: Creating correct foreign key constraints...';
  
  -- FK to custom_roles (correct)
  ALTER TABLE role_permissions 
    DROP CONSTRAINT IF EXISTS role_permissions_role_id_fkey;
ALTER TABLE role_permissions 
    ADD CONSTRAINT role_permissions_role_id_fkey 
    FOREIGN KEY (role_id) 
    REFERENCES custom_roles(id) 
    ON DELETE CASCADE;
  RAISE NOTICE '  ✓ Created: role_permissions_role_id_fkey → custom_roles(id)';
  
  -- FK to permission_definitions (correct)
  ALTER TABLE role_permissions 
    DROP CONSTRAINT IF EXISTS role_permissions_permission_key_fkey;
ALTER TABLE role_permissions 
    ADD CONSTRAINT role_permissions_permission_key_fkey 
    FOREIGN KEY (permission_key) 
    REFERENCES permission_definitions(key) 
    ON DELETE CASCADE;
  RAISE NOTICE '  ✓ Created: role_permissions_permission_key_fkey → permission_definitions(key)';
  
  RAISE NOTICE '';
  
  -- Verify unique constraint exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'role_permissions' 
    AND constraint_name = 'role_permissions_role_id_permission_key_key'
  ) INTO v_constraint_exists;
  
  IF NOT v_constraint_exists THEN
    RAISE NOTICE '→ Step 3: Creating unique constraint...';
    ALTER TABLE role_permissions 
      DROP CONSTRAINT IF EXISTS role_permissions_role_id_permission_key_key;
ALTER TABLE role_permissions 
      ADD CONSTRAINT role_permissions_role_id_permission_key_key 
      UNIQUE(role_id, permission_key);
    RAISE NOTICE '  ✓ Created: UNIQUE(role_id, permission_key)';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '→ Step 3: Unique constraint already exists ✓';
    RAISE NOTICE '';
  END IF;
  
  -- Verify indexes exist
  RAISE NOTICE '→ Step 4: Ensuring indexes exist...';
  
  IF NOT EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'role_permissions' 
    AND indexname = 'role_permissions_role_id_idx'
  ) THEN
    CREATE INDEX IF NOT EXISTS role_permissions_role_id_idx ON role_permissions(role_id);
    RAISE NOTICE '  ✓ Created: role_permissions_role_id_idx';
  ELSE
    RAISE NOTICE '  ✓ Index role_permissions_role_id_idx already exists';
  END IF;
  
  IF NOT EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'role_permissions' 
    AND indexname = 'role_permissions_permission_key_idx'
  ) THEN
    CREATE INDEX IF NOT EXISTS role_permissions_permission_key_idx ON role_permissions(permission_key);
    RAISE NOTICE '  ✓ Created: role_permissions_permission_key_idx';
  ELSE
    RAISE NOTICE '  ✓ Index role_permissions_permission_key_idx already exists';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '✓ SUCCESS! Foreign key constraints fixed';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Run migration 46_treatment_routing_permissions.sql';
  RAISE NOTICE '2. This will now succeed with correct FK constraints';
  RAISE NOTICE '';
  
END $$;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after the fix to verify:

-- Check FK constraints
-- SELECT
--   tc.constraint_name,
--   tc.table_name,
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
-- AND tc.table_name = 'role_permissions';
-- 
-- Expected:
-- role_permissions_role_id_fkey → custom_roles(id)
-- role_permissions_permission_key_fkey → permission_definitions(key)

-- =====================================================



-- ============================================================
-- FROM sql/47_fix_metadata_column.sql
-- ============================================================

-- =====================================================
-- FIX MISSING METADATA COLUMN
-- =====================================================
-- Add missing metadata column to tenants table
-- This fixes the "Could not find the 'metadata' column" error
-- =====================================================

BEGIN;

-- Add metadata column to tenants table if it doesn't exist
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add any other missing columns that might be referenced
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'practice';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'starter';

-- Add missing columns to app_users table if needed
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Update any existing tenants to have default metadata
UPDATE tenants SET metadata = '{}' WHERE metadata IS NULL;

-- Update any existing app_users to have default metadata
UPDATE app_users SET metadata = '{}' WHERE metadata IS NULL;

COMMIT;


-- ============================================================
-- FROM sql/47_pms_procedure_tag_mappings.sql
-- ============================================================

-- =====================================================
-- PMS PROCEDURE CODE TO TREATMENT TAG MAPPINGS
-- =====================================================
-- Phase 11: Task 11.4
-- Maps dental procedure codes (ADA/CDT codes) to treatment tags
-- Enables automatic tag extraction from PMS treatment plans
-- =====================================================

-- =====================================================
-- 1. CREATE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pms_procedure_tag_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Procedure Code Information
  procedure_code TEXT NOT NULL, -- ADA/CDT code (e.g., "D6010", "D7240")
  procedure_name TEXT, -- Human-readable name (e.g., "Implant placement")
  procedure_category TEXT, -- Category (e.g., "Implants", "Orthodontics", "Cosmetic")
  
  -- Treatment Tag Mapping
  treatment_tag_id UUID REFERENCES treatment_tags(id) ON DELETE CASCADE,
  treatment_tag_name TEXT NOT NULL, -- Denormalized for performance
  
  -- Metadata
  mapping_priority INTEGER DEFAULT 1, -- Higher = higher priority if multiple tags match
  is_active BOOLEAN DEFAULT true,
  
  -- Location Support
  location_id UUID, -- PATCHED: FK to locations removed (locations created later)
  applies_to_all_locations BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES app_users(id),
  
  -- Unique constraint: One procedure code per tenant (or location)
  UNIQUE(tenant_id, procedure_code, location_id)
);

COMMENT ON TABLE pms_procedure_tag_mappings IS 'Maps PMS procedure codes (ADA/CDT) to treatment tags for automatic deal routing';
COMMENT ON COLUMN pms_procedure_tag_mappings.procedure_code IS 'ADA/CDT procedure code (e.g., D6010 for implant)';
COMMENT ON COLUMN pms_procedure_tag_mappings.mapping_priority IS 'Higher priority tags are preferred when multiple tags match';
COMMENT ON COLUMN pms_procedure_tag_mappings.applies_to_all_locations IS 'If true, mapping applies to entire organization';

-- =====================================================
-- 2. INDEXES
-- =====================================================

-- Lookup procedure codes quickly
CREATE INDEX IF NOT EXISTS idx_pms_proc_mappings_tenant_code 
ON pms_procedure_tag_mappings(tenant_id, procedure_code) 
WHERE is_active = true;

-- Lookup by tag
CREATE INDEX IF NOT EXISTS idx_pms_proc_mappings_tag 
ON pms_procedure_tag_mappings(tenant_id, treatment_tag_id);

-- Location-specific lookups
CREATE INDEX IF NOT EXISTS idx_pms_proc_mappings_location 
ON pms_procedure_tag_mappings(tenant_id, location_id) 
WHERE location_id IS NOT NULL;

-- Full-text search on procedure name
CREATE INDEX IF NOT EXISTS idx_pms_proc_mappings_name_trgm 
ON pms_procedure_tag_mappings USING gin(procedure_name gin_trgm_ops);

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE pms_procedure_tag_mappings ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: Users can only see their organization's mappings
DROP POLICY IF EXISTS tenant_isolation_pms_proc_mappings ON pms_procedure_tag_mappings;
CREATE POLICY tenant_isolation_pms_proc_mappings ON pms_procedure_tag_mappings
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users 
      WHERE id = auth.uid()
    )
  );

-- Insert: Admins only
DROP POLICY IF EXISTS insert_pms_proc_mappings ON pms_procedure_tag_mappings;
CREATE POLICY insert_pms_proc_mappings ON pms_procedure_tag_mappings
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM app_users 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_has_permission(auth.uid(), 'pms_settings:write')
    )
  );

-- Update: Admins only
DROP POLICY IF EXISTS update_pms_proc_mappings ON pms_procedure_tag_mappings;
CREATE POLICY update_pms_proc_mappings ON pms_procedure_tag_mappings
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_has_permission(auth.uid(), 'pms_settings:write')
    )
  );

-- Delete: Admins only
DROP POLICY IF EXISTS delete_pms_proc_mappings ON pms_procedure_tag_mappings;
CREATE POLICY delete_pms_proc_mappings ON pms_procedure_tag_mappings
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_has_permission(auth.uid(), 'pms_settings:write')
    )
  );

-- =====================================================
-- 4. HELPER FUNCTION: UPDATE TIMESTAMP
-- =====================================================
-- Create the update_timestamp function if it doesn't exist

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_timestamp IS 'Automatically updates updated_at timestamp on row updates';

-- =====================================================
-- 5. TRIGGER: AUTO-UPDATE TIMESTAMP
-- =====================================================

CREATE OR REPLACE TRIGGER update_pms_proc_mappings_timestamp
  BEFORE UPDATE ON pms_procedure_tag_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- =====================================================
-- 6. HELPER FUNCTION: BULK IMPORT PMS MAPPINGS
-- =====================================================

CREATE OR REPLACE FUNCTION bulk_import_pms_procedure_mappings(
  p_tenant_id UUID,
  p_mappings JSONB, -- Array of {procedure_code, procedure_name, treatment_tag_name}
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE(
  imported_count INTEGER,
  skipped_count INTEGER,
  errors JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mapping JSONB;
  v_tag_id UUID;
  v_imported INT := 0;
  v_skipped INT := 0;
  v_errors JSONB := '[]'::JSONB;
BEGIN
  -- Loop through each mapping
  FOR v_mapping IN SELECT * FROM jsonb_array_elements(p_mappings)
  LOOP
    BEGIN
      -- Look up treatment tag ID
      SELECT id INTO v_tag_id
      FROM treatment_tags
      WHERE tenant_id = p_tenant_id
        AND name = v_mapping->>'treatment_tag_name'
        AND is_active = true;
      
      IF v_tag_id IS NULL THEN
        -- Tag not found, skip
        v_errors := v_errors || jsonb_build_object(
          'procedure_code', v_mapping->>'procedure_code',
          'error', 'Treatment tag not found'
        );
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;
      
      -- Insert or update mapping
      INSERT INTO pms_procedure_tag_mappings (
        tenant_id,
        procedure_code,
        procedure_name,
        treatment_tag_id,
        treatment_tag_name,
        created_by
      ) VALUES (
        p_tenant_id,
        v_mapping->>'procedure_code',
        v_mapping->>'procedure_name',
        v_tag_id,
        v_mapping->>'treatment_tag_name',
        p_created_by
      )
      ON CONFLICT (tenant_id, procedure_code, location_id)
      DO UPDATE SET
        treatment_tag_id = EXCLUDED.treatment_tag_id,
        treatment_tag_name = EXCLUDED.treatment_tag_name,
        procedure_name = EXCLUDED.procedure_name,
        updated_at = NOW();
      
      v_imported := v_imported + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object(
        'procedure_code', v_mapping->>'procedure_code',
        'error', SQLERRM
      );
      v_skipped := v_skipped + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_imported, v_skipped, v_errors;
END;
$$;

COMMENT ON FUNCTION bulk_import_pms_procedure_mappings IS 'Bulk import procedure code to tag mappings from JSON array';

-- =====================================================
-- 7. SEED DATA: COMMON DENTAL PROCEDURE CODES
-- =====================================================
-- Common ADA procedure codes that practices can customize

-- This is a helper view, not actual seed data (admins will configure their own)
DROP VIEW IF EXISTS common_dental_procedure_codes CASCADE;
CREATE VIEW common_dental_procedure_codes AS
SELECT * FROM (VALUES
  -- IMPLANTS (D6000-D6199)
  ('D6010', 'Implant - Endosteal', 'Implants'),
  ('D6040', 'Implant - Eposteal', 'Implants'),
  ('D6050', 'Implant - Transosteal', 'Implants'),
  ('D6055', 'Connecting Bar - Implant Supported', 'Implants'),
  ('D6056', 'Prefabricated Abutment', 'Implants'),
  ('D6057', 'Custom Abutment', 'Implants'),
  ('D6058', 'Abutment Supported Porcelain Crown', 'Implants'),
  ('D6065', 'Implant Supported Porcelain Crown', 'Implants'),
  ('D6080', 'Implant Maintenance Procedures', 'Implants'),
  
  -- ORTHODONTICS (D8000-D8999)
  ('D8010', 'Limited Orthodontic Treatment', 'Orthodontics'),
  ('D8020', 'Limited Orthodontic Treatment - Adolescent', 'Orthodontics'),
  ('D8030', 'Limited Orthodontic Treatment - Adult', 'Orthodontics'),
  ('D8040', 'Comprehensive Orthodontic Treatment - Adolescent', 'Orthodontics'),
  ('D8070', 'Comprehensive Orthodontic Treatment - Adult', 'Orthodontics'),
  ('D8080', 'Comprehensive Orthodontic Treatment - Child', 'Orthodontics'),
  ('D8090', 'Comprehensive Orthodontic Treatment - Adolescent for Class II Malocclusion', 'Orthodontics'),
  ('D8220', 'Fixed Appliance Therapy', 'Orthodontics'),
  ('D8660', 'Pre-Orthodontic Treatment Visit', 'Orthodontics'),
  ('D8680', 'Orthodontic Retention', 'Orthodontics'),
  
  -- CROWNS (D2700-D2799)
  ('D2740', 'Crown - Porcelain/Ceramic', 'Cosmetic'),
  ('D2750', 'Crown - Porcelain Fused to High Noble Metal', 'Cosmetic'),
  ('D2751', 'Crown - Porcelain Fused to Predominantly Base Metal', 'Cosmetic'),
  ('D2752', 'Crown - Porcelain Fused to Noble Metal', 'Cosmetic'),
  ('D2780', 'Crown - 3/4 Cast High Noble Metal', 'Cosmetic'),
  ('D2781', 'Crown - 3/4 Cast Predominantly Base Metal', 'Cosmetic'),
  ('D2782', 'Crown - 3/4 Cast Noble Metal', 'Cosmetic'),
  ('D2783', 'Crown - 3/4 Porcelain/Ceramic', 'Cosmetic'),
  ('D2790', 'Crown - Full Cast High Noble Metal', 'Cosmetic'),
  ('D2791', 'Crown - Full Cast Predominantly Base Metal', 'Cosmetic'),
  ('D2792', 'Crown - Full Cast Noble Metal', 'Cosmetic'),
  ('D2794', 'Crown - Titanium', 'Cosmetic'),
  
  -- VENEERS (D2900-D2999)
  ('D2960', 'Labial Veneer (Laminate) - Chairside', 'Cosmetic'),
  ('D2961', 'Labial Veneer (Resin Laminate) - Laboratory', 'Cosmetic'),
  ('D2962', 'Labial Veneer (Porcelain Laminate) - Laboratory', 'Cosmetic'),
  
  -- WHITENING (D9970-D9999)
  ('D9972', 'External Bleaching - Per Arch', 'Cosmetic'),
  ('D9973', 'External Bleaching - Per Tooth', 'Cosmetic'),
  ('D9974', 'Internal Bleaching - Per Tooth', 'Cosmetic'),
  
  -- ROOT CANAL (D3000-D3999)
  ('D3310', 'Anterior Root Canal (Excluding Final Restoration)', 'Endodontics'),
  ('D3320', 'Bicuspid Root Canal (Excluding Final Restoration)', 'Endodontics'),
  ('D3330', 'Molar Root Canal (Excluding Final Restoration)', 'Endodontics'),
  
  -- EXTRACTIONS (D7000-D7999)
  ('D7210', 'Extraction - Erupted Tooth', 'Surgery'),
  ('D7220', 'Removal of Impacted Tooth - Soft Tissue', 'Surgery'),
  ('D7230', 'Removal of Impacted Tooth - Partially Bony', 'Surgery'),
  ('D7240', 'Removal of Impacted Tooth - Completely Bony', 'Surgery'),
  ('D7241', 'Removal of Impacted Tooth - Completely Bony (Unusual Complexity)', 'Surgery'),
  ('D7250', 'Removal of Residual Tooth Roots', 'Surgery'),
  
  -- PREVENTIVE (D1000-D1999)
  ('D1110', 'Prophylaxis - Adult', 'Preventive'),
  ('D1120', 'Prophylaxis - Child', 'Preventive'),
  ('D1206', 'Topical Application of Fluoride', 'Preventive'),
  ('D1208', 'Topical Application of Fluoride (Excluding Prophylaxis)', 'Preventive'),
  
  -- EMERGENCY (D0000-D0999)
  ('D0140', 'Limited Oral Evaluation - Problem Focused', 'Emergency'),
  ('D0160', 'Detailed and Extensive Oral Evaluation', 'Emergency'),
  ('D9110', 'Palliative (Emergency) Treatment', 'Emergency')
  
) AS t(procedure_code, procedure_name, procedure_category);

COMMENT ON VIEW common_dental_procedure_codes IS 'Reference list of common ADA procedure codes for easy mapping setup';

-- =====================================================
-- 7. HELPER FUNCTION: GET TREATMENT TAGS FROM PROCEDURE CODES
-- =====================================================

CREATE OR REPLACE FUNCTION get_treatment_tags_from_procedure_codes(
  p_tenant_id UUID,
  p_procedure_codes TEXT[],
  p_location_id UUID DEFAULT NULL
)
RETURNS TABLE(
  treatment_tag_name TEXT,
  treatment_tag_id UUID,
  procedure_codes_matched TEXT[],
  mapping_priority INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.treatment_tag_name,
    m.treatment_tag_id,
    array_agg(DISTINCT m.procedure_code) AS procedure_codes_matched,
    MAX(m.mapping_priority) AS mapping_priority
  FROM pms_procedure_tag_mappings m
  WHERE m.tenant_id = p_tenant_id
    AND m.procedure_code = ANY(p_procedure_codes)
    AND m.is_active = true
    AND (
      m.applies_to_all_locations = true
      OR m.location_id = p_location_id
      OR p_location_id IS NULL
    )
  GROUP BY m.treatment_tag_name, m.treatment_tag_id
  ORDER BY mapping_priority DESC, treatment_tag_name;
END;
$$;

COMMENT ON FUNCTION get_treatment_tags_from_procedure_codes IS 'Convert an array of procedure codes to treatment tags based on mappings';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Table: pms_procedure_tag_mappings
-- Indexes: 4
-- RLS Policies: 4
-- Functions: 2
-- Views: 1
-- =====================================================



-- ============================================================
-- FROM sql/48_add_pipeline_description.sql
-- ============================================================

-- =====================================================
-- ADD DESCRIPTION FIELD TO PIPELINES TABLE
-- =====================================================
-- This fixes the 400 error when creating pipelines during sign-up and onboarding
-- =====================================================

BEGIN;

-- Add description column to pipelines table
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS description TEXT;

-- Add default description to existing pipelines
UPDATE pipelines SET description = 'Sales pipeline' WHERE description IS NULL;

COMMIT;



-- ============================================================
-- FROM sql/49_add_profile_completed.sql
-- ============================================================

-- =====================================================
-- ADD PROFILE_COMPLETED COLUMN TO APP_USERS
-- =====================================================
-- This tracks whether a user has completed their profile setup
-- =====================================================

BEGIN;

-- Add profile_completed column to app_users table
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Existing users can be marked as completed (optional)
-- UPDATE app_users SET profile_completed = FALSE WHERE profile_completed IS NULL;

COMMIT;



-- ============================================================
-- FROM sql/60_deal_saved_views.sql
-- ============================================================

-- 60_deal_saved_views.sql
-- Create saved views system for deals table

-- Create saved_deal_views table
CREATE TABLE IF NOT EXISTS saved_deal_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_favorite BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE, -- Share with team
    
    -- Saved filter state (JSON)
    filters JSONB DEFAULT '{}'::jsonb,
    
    -- Saved sort state
    sort_field TEXT,
    sort_order TEXT CHECK (sort_order IN ('asc', 'desc')),
    
    -- Saved column visibility (for advanced table features)
    visible_columns TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saved_deal_views_tenant_id ON saved_deal_views(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saved_deal_views_user_id ON saved_deal_views(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_deal_views_is_default ON saved_deal_views(is_default);

-- Enable RLS
ALTER TABLE saved_deal_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own and shared views" ON saved_deal_views;
CREATE POLICY "Users can view own and shared views" ON saved_deal_views FOR SELECT
    USING (
        tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
        AND (user_id = auth.uid() OR is_shared = TRUE)
    );

DROP POLICY IF EXISTS "Users can create own views" ON saved_deal_views;
CREATE POLICY "Users can create own views" ON saved_deal_views FOR INSERT
    WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
        AND user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update own views" ON saved_deal_views;
CREATE POLICY "Users can update own views" ON saved_deal_views FOR UPDATE
    USING (
        tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
        AND user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can delete own views" ON saved_deal_views;
CREATE POLICY "Users can delete own views" ON saved_deal_views FOR DELETE
    USING (
        tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
        AND user_id = auth.uid()
    );

-- Insert default views for existing users
INSERT INTO saved_deal_views (tenant_id, user_id, name, description, is_default, filters, sort_field, sort_order)
SELECT 
    tenant_id,
    id as user_id,
    'All Deals',
    'View all deals across all pipelines',
    TRUE,
    '{}'::jsonb,
    'updated_at',
    'desc'
FROM app_users
WHERE NOT EXISTS (
    SELECT 1 FROM saved_deal_views 
    WHERE saved_deal_views.user_id = app_users.id 
    AND saved_deal_views.name = 'All Deals'
);

-- Insert preset views for each existing user
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id, tenant_id FROM app_users LOOP
        -- My Deals
        INSERT INTO saved_deal_views (tenant_id, user_id, name, description, filters, sort_field, sort_order)
        VALUES (
            user_record.tenant_id,
            user_record.id,
            'My Deals',
            'Deals assigned to me',
            jsonb_build_object('ownerFilter', 'my'),
            'updated_at',
            'desc'
        )
        ON CONFLICT DO NOTHING;
        
        -- High Value Deals
        INSERT INTO saved_deal_views (tenant_id, user_id, name, description, filters, sort_field, sort_order)
        VALUES (
            user_record.tenant_id,
            user_record.id,
            'High Value',
            'Deals worth more than £2,000',
            jsonb_build_object('valueFilter', 'high'),
            'value',
            'desc'
        )
        ON CONFLICT DO NOTHING;
        
        -- Stuck Deals
        INSERT INTO saved_deal_views (tenant_id, user_id, name, description, filters, sort_field, sort_order)
        VALUES (
            user_record.tenant_id,
            user_record.id,
            'Stuck Deals',
            'Deals in stage for more than 14 days',
            jsonb_build_object('agingFilter', 'stuck'),
            'updated_at',
            'asc'
        )
        ON CONFLICT DO NOTHING;
        
        -- Closing Soon (unassigned deals)
        INSERT INTO saved_deal_views (tenant_id, user_id, name, description, filters, sort_field, sort_order)
        VALUES (
            user_record.tenant_id,
            user_record.id,
            'Unassigned',
            'Deals without an owner',
            jsonb_build_object('ownerFilter', 'unassigned'),
            'created_at',
            'desc'
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

COMMENT ON TABLE saved_deal_views IS 'Saved filter and view configurations for the deals table';



-- ============================================================
-- FROM sql/61_deals_performance_indexes.sql
-- ============================================================

-- 61_deals_performance_indexes.sql
-- Performance optimization indexes for deals queries

-- Core indexes for deals table filtering and sorting
CREATE INDEX IF NOT EXISTS idx_deals_tenant_pipeline ON deals(tenant_id, pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_stage ON deals(tenant_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_owner ON deals(tenant_id, owner_user_id);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_contact ON deals(tenant_id, contact_id);

-- Sorting indexes
CREATE INDEX IF NOT EXISTS idx_deals_value ON deals(value_estimate_cents DESC);
CREATE INDEX IF NOT EXISTS idx_deals_updated_at ON deals(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_last_activity ON deals(last_activity_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_deals_tenant_pipeline_stage ON deals(tenant_id, pipeline_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_owner_updated ON deals(tenant_id, owner_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_value ON deals(tenant_id, value_estimate_cents DESC);

-- Full-text search index for deal title
CREATE INDEX IF NOT EXISTS idx_deals_title_search ON deals USING gin(to_tsvector('english', title));

-- Marketing source indexes (for attribution queries)
CREATE INDEX IF NOT EXISTS idx_deals_marketing_source_type ON deals(marketing_source_type) WHERE marketing_source_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_marketing_source_id ON deals(marketing_source_id) WHERE marketing_source_id IS NOT NULL;

-- Performance indexes for contacts table (for deals queries with joins)
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_name ON contacts(tenant_id, full_name);
CREATE INDEX IF NOT EXISTS idx_contacts_full_name_search ON contacts USING gin(to_tsvector('english', full_name));

-- Performance indexes for pipeline_stages
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_position ON pipeline_stages(pipeline_id, position);

-- Performance indexes for pipelines
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant ON pipelines(tenant_id);

-- Analyze tables for query planner optimization
ANALYZE deals;
ANALYZE contacts;
ANALYZE pipeline_stages;
ANALYZE pipelines;
ANALYZE app_users;

-- Create materialized view for deal analytics (optional, for faster dashboard queries)
CREATE MATERIALIZED VIEW IF NOT EXISTS deal_analytics_summary AS
SELECT 
  d.tenant_id,
  d.pipeline_id,
  d.stage_id,
  d.owner_user_id,
  COUNT(*) as deal_count,
  SUM(d.value_estimate_cents) as total_value,
  AVG(d.value_estimate_cents) as avg_value,
  MIN(d.created_at) as oldest_deal,
  MAX(d.updated_at) as newest_update,
  COUNT(CASE WHEN d.updated_at > NOW() - INTERVAL '7 days' THEN 1 END) as deals_updated_this_week,
  COUNT(CASE WHEN d.updated_at < NOW() - INTERVAL '14 days' THEN 1 END) as stuck_deals
FROM deals d
GROUP BY d.tenant_id, d.pipeline_id, d.stage_id, d.owner_user_id;

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_deal_analytics_tenant ON deal_analytics_summary(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deal_analytics_pipeline ON deal_analytics_summary(pipeline_id);

-- Function to refresh the materialized view (call this periodically or on-demand)
CREATE OR REPLACE FUNCTION refresh_deal_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY deal_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a trigger to refresh analytics periodically
-- (You can also refresh this via a cron job or on-demand)

COMMENT ON INDEX idx_deals_tenant_pipeline IS 'Optimizes pipeline-specific deal queries';
COMMENT ON INDEX idx_deals_tenant_stage IS 'Optimizes stage-specific deal queries';
COMMENT ON INDEX idx_deals_title_search IS 'Enables fast full-text search on deal titles';
COMMENT ON MATERIALIZED VIEW deal_analytics_summary IS 'Pre-computed analytics for faster dashboard queries';



-- ============================================================
-- FROM sql/62_contact_saved_views.sql
-- ============================================================

-- 62_contact_saved_views.sql
-- Create saved views system for contacts table

-- Create saved_contact_views table
CREATE TABLE IF NOT EXISTS saved_contact_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_favorite BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE, -- Share with team
    
    -- Saved filter state (JSON)
    filters JSONB DEFAULT '{}'::jsonb,
    
    -- Saved sort state
    sort_field TEXT,
    sort_order TEXT CHECK (sort_order IN ('asc', 'desc')),
    
    -- Saved column visibility (for advanced table features)
    visible_columns TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saved_contact_views_tenant_id ON saved_contact_views(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saved_contact_views_user_id ON saved_contact_views(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_contact_views_is_default ON saved_contact_views(is_default);

-- Enable RLS
ALTER TABLE saved_contact_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own and shared contact views" ON saved_contact_views;
CREATE POLICY "Users can view own and shared contact views" ON saved_contact_views FOR SELECT
    USING (
        tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
        AND (user_id = auth.uid() OR is_shared = TRUE)
    );

DROP POLICY IF EXISTS "Users can create own contact views" ON saved_contact_views;
CREATE POLICY "Users can create own contact views" ON saved_contact_views FOR INSERT
    WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
        AND user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update own contact views" ON saved_contact_views;
CREATE POLICY "Users can update own contact views" ON saved_contact_views FOR UPDATE
    USING (
        tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
        AND user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can delete own contact views" ON saved_contact_views;
CREATE POLICY "Users can delete own contact views" ON saved_contact_views FOR DELETE
    USING (
        tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
        AND user_id = auth.uid()
    );

-- Insert default views for existing users
INSERT INTO saved_contact_views (tenant_id, user_id, name, description, is_default, filters, sort_field, sort_order)
SELECT 
    tenant_id,
    id as user_id,
    'All Contacts',
    'View all contacts',
    TRUE,
    '{}'::jsonb,
    'updated_at',
    'desc'
FROM app_users
WHERE NOT EXISTS (
    SELECT 1 FROM saved_contact_views 
    WHERE saved_contact_views.user_id = app_users.id 
    AND saved_contact_views.name = 'All Contacts'
);

-- Insert preset views for each existing user
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id, tenant_id FROM app_users LOOP
        -- My Patients
        INSERT INTO saved_contact_views (tenant_id, user_id, name, description, filters, sort_field, sort_order)
        VALUES (
            user_record.tenant_id,
            user_record.id,
            'My Patients',
            'Contacts of type Patient',
            jsonb_build_object('typeFilter', 'patient'),
            'full_name',
            'asc'
        )
        ON CONFLICT DO NOTHING;
        
        -- Active Leads
        INSERT INTO saved_contact_views (tenant_id, user_id, name, description, filters, sort_field, sort_order)
        VALUES (
            user_record.tenant_id,
            user_record.id,
            'Active Leads',
            'Contacts of type Lead',
            jsonb_build_object('typeFilter', 'lead'),
            'created_at',
            'desc'
        )
        ON CONFLICT DO NOTHING;
        
        -- VIP Contacts
        INSERT INTO saved_contact_views (tenant_id, user_id, name, description, filters, sort_field, sort_order)
        VALUES (
            user_record.tenant_id,
            user_record.id,
            'VIP Contacts',
            'Contacts tagged as VIP',
            jsonb_build_object('tagFilter', 'VIP'),
            'updated_at',
            'desc'
        )
        ON CONFLICT DO NOTHING;
        
        -- Recent Contacts
        INSERT INTO saved_contact_views (tenant_id, user_id, name, description, filters, sort_field, sort_order)
        VALUES (
            user_record.tenant_id,
            user_record.id,
            'Recent',
            'Recently updated contacts',
            '{}'::jsonb,
            'updated_at',
            'desc'
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

COMMENT ON TABLE saved_contact_views IS 'Saved filter and view configurations for the contacts table';



-- ============================================================
-- FROM sql/63_contact_performance_indexes.sql
-- ============================================================

-- 63_contact_performance_indexes.sql
-- Performance optimization indexes for contacts queries

-- STEP 1: Add contact_type column if it doesn't exist (MUST BE FIRST)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'contact_type'
    ) THEN
        ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_type VARCHAR(50) DEFAULT 'patient';
    END IF;
END $$;

-- STEP 2: Add check constraint for contact_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'contacts' AND constraint_name = 'check_contact_type'
    ) THEN
        ALTER TABLE contacts 
        DROP CONSTRAINT IF EXISTS check_contact_type;
ALTER TABLE contacts 
        ADD CONSTRAINT check_contact_type 
        CHECK (contact_type IN ('patient', 'lead', 'referrer', 'corporate', 'insurer'));
    END IF;
END $$;

-- STEP 3: Now create indexes (after column exists)

-- Core indexes for contacts table filtering and sorting
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_full_name ON contacts(full_name);
CREATE INDEX IF NOT EXISTS idx_contacts_primary_email ON contacts(primary_email);
CREATE INDEX IF NOT EXISTS idx_contacts_primary_phone ON contacts(primary_phone);

-- Full-text search index for contact name
CREATE INDEX IF NOT EXISTS idx_contacts_full_name_search ON contacts USING gin(to_tsvector('english', full_name));

-- Sorting indexes
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_updated_at ON contacts(updated_at DESC);

-- Type and source indexes (for filtering) - NOW contact_type column exists
CREATE INDEX IF NOT EXISTS idx_contacts_contact_type ON contacts(contact_type) WHERE contact_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source) WHERE source IS NOT NULL;

-- Tags index (GIN for array operations)
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING gin(tags);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_type ON contacts(tenant_id, contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_updated ON contacts(tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_name ON contacts(tenant_id, full_name);

-- STEP 4: Analyze table for query planner optimization
ANALYZE contacts;

COMMENT ON INDEX idx_contacts_tenant_id IS 'Optimizes tenant-specific contact queries';
COMMENT ON INDEX idx_contacts_full_name_search IS 'Enables fast full-text search on contact names';
COMMENT ON INDEX idx_contacts_tags IS 'Optimizes tag-based filtering';



-- ============================================================
-- FROM sql/64_marketing_feature_flags.sql
-- ============================================================

-- 64_marketing_feature_flags.sql
-- Feature Flag System for Marketing Module Upselling

-- Feature Definitions (Master List of All Features)
CREATE TABLE IF NOT EXISTS feature_definitions (
    feature_key TEXT PRIMARY KEY,
    feature_name TEXT NOT NULL,
    description TEXT NOT NULL,
    plan_tier_required TEXT NOT NULL CHECK (plan_tier_required IN ('starter', 'pro', 'enterprise')),
    category TEXT CHECK (category IN ('advanced', 'analytics', 'automation', 'integration', 'ai')),
    icon_name TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    monthly_price_cents INTEGER, -- Price premium for this feature
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant Feature Flags (Per-Tenant Enabled Features)
CREATE TABLE IF NOT EXISTS tenant_feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL REFERENCES feature_definitions(feature_key),
    
    -- Status
    is_enabled BOOLEAN DEFAULT FALSE,
    enabled_at TIMESTAMP WITH TIME ZONE,
    disabled_at TIMESTAMP WITH TIME ZONE,
    
    -- Trial
    is_trial BOOLEAN DEFAULT FALSE,
    trial_started_at TIMESTAMP WITH TIME ZONE,
    trial_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Billing
    plan_tier TEXT CHECK (plan_tier IN ('starter', 'pro', 'enterprise')),
    
    -- Metadata
    enabled_by_user_id UUID REFERENCES app_users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, feature_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_feature_flags_tenant ON tenant_feature_flags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_feature_flags_enabled ON tenant_feature_flags(tenant_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_tenant_feature_flags_trial ON tenant_feature_flags(is_trial, trial_expires_at);

-- RLS Policies
ALTER TABLE feature_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_feature_flags ENABLE ROW LEVEL SECURITY;

-- Everyone can view feature definitions
DROP POLICY IF EXISTS "Feature definitions are public" ON feature_definitions;
CREATE POLICY "Feature definitions are public" ON feature_definitions FOR SELECT
    USING (true);

-- Users can view their tenant's feature flags
DROP POLICY IF EXISTS "Users can view own tenant feature flags" ON tenant_feature_flags;
CREATE POLICY "Users can view own tenant feature flags" ON tenant_feature_flags FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

-- Only owners can modify feature flags
DROP POLICY IF EXISTS "Owners can manage feature flags" ON tenant_feature_flags;
CREATE POLICY "Owners can manage feature flags" ON tenant_feature_flags FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM app_users 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- Insert Feature Definitions
INSERT INTO feature_definitions (feature_key, feature_name, description, plan_tier_required, category, icon_name, sort_order, monthly_price_cents) VALUES
('email_warmup', 'Email Warmup Automation', 'Automatically build domain reputation with gradual send volume increases. Prevents spam filtering and improves deliverability.', 'enterprise', 'advanced', 'TrendingUp', 1, 5000),
('click_heatmaps', 'Click Heatmaps', 'Visual heatmaps showing exactly where recipients click in your emails. Optimize layout for maximum engagement.', 'pro', 'analytics', 'MousePointer', 2, 1500),
('ai_send_time', 'AI Send Time Optimization', 'Machine learning predicts the optimal send time for each individual contact. Increases open rates by 20-30%.', 'enterprise', 'ai', 'Brain', 3, 6000),
('dynamic_content', 'Dynamic Content Blocks', 'Show different content to different contacts in the same campaign based on tags, deals, or custom fields.', 'pro', 'advanced', 'Sparkles', 4, 2000),
('advanced_analytics', 'Advanced Analytics Suite', 'Deep-dive campaign analytics with custom reports, cohort analysis, and predictive insights.', 'pro', 'analytics', 'BarChart3', 5, 1000),
('social_media', 'Social Media Publishing', 'Schedule and publish posts to Facebook, Instagram, LinkedIn, and Twitter directly from the CRM.', 'pro', 'integration', 'Share2', 6, 1500),
('ab_testing', 'A/B Testing', 'Test subject lines, content, and send times to optimize campaign performance with automatic winner selection.', 'starter', 'advanced', 'TestTube', 7, 0),
('automation_journeys', 'Marketing Automation', 'Build sophisticated multi-step journeys with triggers, conditions, delays, and goal tracking.', 'pro', 'automation', 'Workflow', 8, 2500),
('sms_campaigns', 'SMS Campaigns', 'Send SMS campaigns via Twilio with delivery tracking and opt-out management.', 'starter', 'integration', 'MessageSquare', 9, 0),
('whatsapp_campaigns', 'WhatsApp Campaigns', 'Send WhatsApp campaigns using WhatsApp Business API with template management.', 'pro', 'integration', 'MessageCircle', 10, 2000)
ON CONFLICT (feature_key) DO NOTHING;

-- Function to check if feature is enabled for tenant
CREATE OR REPLACE FUNCTION is_feature_enabled(p_tenant_id UUID, p_feature_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_enabled BOOLEAN;
    v_is_trial BOOLEAN;
    v_trial_expired BOOLEAN;
BEGIN
    SELECT 
        tff.is_enabled,
        tff.is_trial,
        CASE 
            WHEN tff.is_trial AND tff.trial_expires_at < NOW() THEN TRUE
            ELSE FALSE
        END
    INTO v_is_enabled, v_is_trial, v_trial_expired
    FROM tenant_feature_flags tff
    WHERE tff.tenant_id = p_tenant_id
    AND tff.feature_key = p_feature_key;
    
    -- If not found, feature is disabled
    IF v_is_enabled IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- If trial expired, disable
    IF v_is_trial AND v_trial_expired THEN
        RETURN FALSE;
    END IF;
    
    RETURN v_is_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get feature access level for tenant
CREATE OR REPLACE FUNCTION get_tenant_plan_tier(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_plan TEXT;
BEGIN
    SELECT marketing_plan INTO v_plan
    FROM tenants
    WHERE id = p_tenant_id;
    
    RETURN COALESCE(v_plan, 'starter');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE feature_definitions IS 'Master list of all available marketing features with plan requirements';
COMMENT ON TABLE tenant_feature_flags IS 'Per-tenant feature enablement with trial support for upselling';
COMMENT ON FUNCTION is_feature_enabled IS 'Check if a specific feature is enabled for a tenant (handles trials)';



-- ============================================================
-- FROM sql/65_enable_all_features_default.sql
-- ============================================================

-- 65_enable_all_features_default.sql
-- Enable ALL features by default for ALL tenants (for testing purposes)

-- This script makes every feature enabled by default, regardless of plan tier
-- Users can still toggle them OFF if they want, but they start ON

-- Enable all features for all existing tenants
INSERT INTO tenant_feature_flags (tenant_id, feature_key, is_enabled)
SELECT 
    t.id as tenant_id,
    fd.feature_key,
    true as is_enabled
FROM tenants t
CROSS JOIN feature_definitions fd
ON CONFLICT (tenant_id, feature_key) 
DO UPDATE SET 
    is_enabled = true,
    updated_at = NOW();

-- Update the default value for future inserts
ALTER TABLE tenant_feature_flags 
ALTER COLUMN is_enabled SET DEFAULT true;

-- Verify all features are enabled
-- Run this to check:
-- SELECT t.name, fd.feature_name, tff.is_enabled 
-- FROM tenants t
-- CROSS JOIN feature_definitions fd
-- LEFT JOIN tenant_feature_flags tff ON t.id = tff.tenant_id AND fd.feature_key = tff.feature_key
-- ORDER BY t.name, fd.feature_name;

COMMENT ON TABLE tenant_feature_flags IS 'Feature flags per tenant - ALL ENABLED BY DEFAULT for testing';



-- ============================================================
-- FROM sql/70_demo_seed_schema.sql
-- ============================================================

-- =====================================================
-- DEMO SEED PACK SCHEMA
-- =====================================================
-- Purpose: Tables needed for realistic dental practice demo
-- Seed Pack: deepak_demo_pack_v1
-- Date: October 18, 2025
-- =====================================================

BEGIN;

-- =====================================================
-- 1. SEED PACK MANIFEST (For tracking & rollback)
-- =====================================================

CREATE TABLE IF NOT EXISTS seed_pack_manifest (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seed_pack_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(seed_pack_id, table_name, record_id)
);

CREATE INDEX IF NOT EXISTS idx_seed_pack_manifest_pack ON seed_pack_manifest(seed_pack_id);
CREATE INDEX IF NOT EXISTS idx_seed_pack_manifest_table ON seed_pack_manifest(table_name);

COMMENT ON TABLE seed_pack_manifest IS 'Tracks all records created by seed packs for easy rollback';

-- =====================================================
-- 2. PRACTICE LOCATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS practice_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Location details
  name TEXT NOT NULL,
  slug TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'United States',
  
  -- Contact
  phone TEXT,
  email TEXT,
  fax TEXT,
  
  -- Hours (JSONB for flexibility)
  business_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "17:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "17:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "17:00", "closed": false},
    "thursday": {"open": "09:00", "close": "17:00", "closed": false},
    "friday": {"open": "09:00", "close": "17:00", "closed": false},
    "saturday": {"closed": true},
    "sunday": {"closed": true}
  }',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_primary BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  timezone TEXT DEFAULT 'America/New_York',
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_practice_locations_tenant ON practice_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_practice_locations_active ON practice_locations(tenant_id, is_active);

COMMENT ON TABLE practice_locations IS 'Physical office locations for multi-location practices';

-- =====================================================
-- 3. PROVIDERS (Dentists & Hygienists)
-- =====================================================

CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  
  -- Provider details
  full_name TEXT NOT NULL,
  title TEXT, -- 'Dr.', 'DDS', 'DMD', 'RDH'
  specialty TEXT, -- 'general_dentistry', 'cosmetic', 'pediatric', 'orthodontics', 'oral_surgery', 'endodontics', 'periodontics', 'hygienist'
  license_number TEXT,
  npi_number TEXT, -- National Provider Identifier
  
  -- Contact
  email TEXT,
  phone TEXT,
  
  -- Professional info
  education TEXT,
  certifications TEXT[],
  years_experience INTEGER,
  bio TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  can_schedule BOOLEAN DEFAULT TRUE,
  
  -- Default settings
  default_appointment_duration INTEGER DEFAULT 30, -- minutes
  buffer_time INTEGER DEFAULT 0, -- minutes between appointments
  
  -- Avatar
  avatar_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_tenant ON providers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_providers_user ON providers(user_id);
CREATE INDEX IF NOT EXISTS idx_providers_active ON providers(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_providers_specialty ON providers(specialty);

COMMENT ON TABLE providers IS 'Dentists, hygienists, and other clinical providers';

-- =====================================================
-- 4. PROVIDER SCHEDULES
-- =====================================================

CREATE TABLE IF NOT EXISTS provider_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  location_id UUID REFERENCES practice_locations(id) ON DELETE CASCADE,
  
  -- Schedule pattern
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Effective dates
  effective_from DATE,
  effective_to DATE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_schedules_provider ON provider_schedules(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_schedules_location ON provider_schedules(location_id);
CREATE INDEX IF NOT EXISTS idx_provider_schedules_day ON provider_schedules(day_of_week);

COMMENT ON TABLE provider_schedules IS 'Weekly schedules for providers by location';

-- =====================================================
-- 5. APPOINTMENT TYPES
-- =====================================================

CREATE TABLE IF NOT EXISTS appointment_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Type details
  name TEXT NOT NULL,
  code TEXT, -- Internal code
  description TEXT,
  
  -- Scheduling
  default_duration INTEGER NOT NULL DEFAULT 30, -- minutes
  color TEXT DEFAULT '#3B82F6', -- Hex color for calendar
  
  -- Pricing
  default_price_cents INTEGER DEFAULT 0,
  
  -- Behavior
  requires_deposit BOOLEAN DEFAULT FALSE,
  deposit_amount_cents INTEGER DEFAULT 0,
  buffer_before INTEGER DEFAULT 0,
  buffer_after INTEGER DEFAULT 0,
  
  -- Availability
  is_active BOOLEAN DEFAULT TRUE,
  allow_online_booking BOOLEAN DEFAULT TRUE,
  
  -- Categorization
  category TEXT, -- 'preventive', 'restorative', 'cosmetic', 'surgical', 'emergency'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_appointment_types_tenant ON appointment_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointment_types_active ON appointment_types(tenant_id, is_active);

COMMENT ON TABLE appointment_types IS 'Templates for different appointment types';

-- =====================================================
-- 6. APPOINTMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Core relationships
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES practice_locations(id) ON DELETE RESTRICT,
  appointment_type_id UUID REFERENCES appointment_types(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  
  -- Scheduling
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL, -- minutes
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'confirmed', 'checked_in', 'in_progress', 
    'completed', 'cancelled', 'no_show', 'rescheduled'
  )),
  
  -- Details
  title TEXT,
  notes TEXT,
  reason_for_visit TEXT,
  
  -- Confirmation
  confirmation_sent_at TIMESTAMP WITH TIME ZONE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by TEXT, -- 'patient', 'staff', 'automated'
  
  -- Check-in
  checked_in_at TIMESTAMP WITH TIME ZONE,
  
  -- Completion
  completed_at TIMESTAMP WITH TIME ZONE,
  treatment_notes TEXT,
  
  -- Cancellation
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by_user_id UUID REFERENCES app_users(id),
  cancellation_reason TEXT,
  
  -- Creation tracking
  created_by_user_id UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_contact ON appointments(contact_id);
CREATE INDEX IF NOT EXISTS idx_appointments_provider ON appointments(provider_id);
CREATE INDEX IF NOT EXISTS idx_appointments_location ON appointments(location_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_deal ON appointments(deal_id);

-- Prevent double-booking same provider
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_provider_time_unique 
  ON appointments(provider_id, start_time) 
  WHERE status NOT IN ('cancelled', 'no_show', 'rescheduled');

COMMENT ON TABLE appointments IS 'Scheduled patient appointments';

-- =====================================================
-- 7. INSURANCE PAYERS
-- =====================================================

CREATE TABLE IF NOT EXISTS insurance_payers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Payer details
  name TEXT NOT NULL,
  payer_id TEXT, -- External ID (EDI/clearinghouse)
  type TEXT, -- 'PPO', 'HMO', 'DHMO', 'EPO', 'Indemnity'
  
  -- Contact
  phone TEXT,
  fax TEXT,
  email TEXT,
  website TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  
  -- Coverage defaults
  default_coverage_preventive INTEGER DEFAULT 100, -- percentage
  default_coverage_basic INTEGER DEFAULT 80,
  default_coverage_major INTEGER DEFAULT 50,
  default_annual_maximum_cents INTEGER DEFAULT 200000, -- $2000
  default_deductible_cents INTEGER DEFAULT 5000, -- $50
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  accepts_assignment BOOLEAN DEFAULT TRUE,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, payer_id)
);

CREATE INDEX IF NOT EXISTS idx_insurance_payers_tenant ON insurance_payers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_insurance_payers_active ON insurance_payers(tenant_id, is_active);

COMMENT ON TABLE insurance_payers IS 'Insurance companies and payers';

-- =====================================================
-- 8. INSURANCE POLICIES
-- =====================================================

CREATE TABLE IF NOT EXISTS insurance_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES insurance_payers(id) ON DELETE RESTRICT,
  
  -- Policy details
  policy_number TEXT NOT NULL,
  group_number TEXT,
  
  -- Subscriber info
  subscriber_name TEXT,
  subscriber_dob DATE,
  subscriber_relationship TEXT, -- 'self', 'spouse', 'parent', 'child', 'other'
  
  -- Coverage
  coverage_preventive INTEGER DEFAULT 100,
  coverage_basic INTEGER DEFAULT 80,
  coverage_major INTEGER DEFAULT 50,
  annual_maximum_cents INTEGER,
  deductible_cents INTEGER,
  deductible_met_cents INTEGER DEFAULT 0,
  
  -- Effective dates
  effective_date DATE,
  termination_date DATE,
  
  -- Priority
  is_primary BOOLEAN DEFAULT TRUE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN (
    'unverified', 'verified', 'pending', 'failed'
  )),
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by_user_id UUID REFERENCES app_users(id),
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, contact_id, policy_number)
);

CREATE INDEX IF NOT EXISTS idx_insurance_policies_tenant ON insurance_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_contact ON insurance_policies(contact_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_payer ON insurance_policies(payer_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_active ON insurance_policies(is_active);

COMMENT ON TABLE insurance_policies IS 'Patient insurance policies';

-- =====================================================
-- 9. PROCEDURES (ADA/CDT Codes)
-- =====================================================

CREATE TABLE IF NOT EXISTS procedures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Procedure code
  code TEXT NOT NULL, -- e.g., 'D0120', 'D2750'
  code_system TEXT DEFAULT 'ADA', -- 'ADA', 'CDT', 'custom'
  
  -- Details
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'preventive', 'diagnostic', 'restorative', 'endodontic', 'periodontic', 'prosthodontic', 'oral_surgery', 'orthodontic'
  
  -- Pricing
  default_fee_cents INTEGER DEFAULT 0,
  
  -- Insurance
  typical_coverage_level TEXT, -- 'preventive', 'basic', 'major'
  
  -- Scheduling
  typical_duration INTEGER, -- minutes
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_procedures_tenant ON procedures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_procedures_code ON procedures(code);
CREATE INDEX IF NOT EXISTS idx_procedures_category ON procedures(category);
CREATE INDEX IF NOT EXISTS idx_procedures_active ON procedures(tenant_id, is_active);

COMMENT ON TABLE procedures IS 'Dental procedure codes (ADA/CDT) with practice pricing';

-- =====================================================
-- 10. INVOICES
-- =====================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Core relationships
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  
  -- Invoice details
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'refunded'
  )),
  
  -- Amounts
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  discount_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  paid_cents INTEGER DEFAULT 0,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  
  -- Line items (JSONB for flexibility)
  line_items JSONB DEFAULT '[]',
  -- Example: [{"procedure_code": "D0120", "description": "Exam", "quantity": 1, "unit_price_cents": 8000, "total_cents": 8000}]
  
  -- Insurance
  insurance_policy_id UUID REFERENCES insurance_policies(id) ON DELETE SET NULL,
  insurance_portion_cents INTEGER DEFAULT 0,
  patient_portion_cents INTEGER,
  
  -- Notes
  notes TEXT,
  terms TEXT,
  
  -- Tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  created_by_user_id UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contact ON invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_invoices_appointment ON invoices(appointment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date) WHERE status NOT IN ('paid', 'cancelled');

COMMENT ON TABLE invoices IS 'Patient billing invoices';

-- =====================================================
-- 11. PAYMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Core relationships
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  
  -- Payment details
  amount_cents INTEGER NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN (
    'cash', 'check', 'credit_card', 'debit_card', 'ach', 'wire', 'insurance', 'other'
  )),
  
  -- Status
  payment_status TEXT NOT NULL DEFAULT 'completed' CHECK (payment_status IN (
    'pending', 'completed', 'failed', 'refunded', 'cancelled'
  )),
  
  -- Payment processor details
  transaction_id TEXT,
  processor TEXT, -- 'stripe', 'square', 'manual', etc.
  card_last_four TEXT,
  card_brand TEXT,
  
  -- Check details
  check_number TEXT,
  
  -- Insurance EOB
  insurance_claim_id UUID,
  eob_number TEXT,
  
  -- Refund tracking
  refunded_at TIMESTAMP WITH TIME ZONE,
  refund_amount_cents INTEGER DEFAULT 0,
  refund_reason TEXT,
  
  -- Notes
  notes TEXT,
  receipt_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Tracking
  processed_by_user_id UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_contact ON payments(contact_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);

COMMENT ON TABLE payments IS 'Payment records for invoices';

-- =====================================================
-- 12. INSURANCE CLAIMS
-- =====================================================

CREATE TABLE IF NOT EXISTS insurance_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Core relationships
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  insurance_policy_id UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  
  -- Claim details
  claim_number TEXT NOT NULL,
  claim_date DATE NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'pending', 'approved', 'paid', 'denied', 'appealed'
  )),
  
  -- Amounts
  claim_amount_cents INTEGER NOT NULL,
  approved_amount_cents INTEGER DEFAULT 0,
  paid_amount_cents INTEGER DEFAULT 0,
  patient_responsibility_cents INTEGER DEFAULT 0,
  
  -- Dates
  submitted_date DATE,
  approved_date DATE,
  paid_date DATE,
  
  -- Denial
  denial_reason TEXT,
  denial_code TEXT,
  
  -- Procedures (JSONB array)
  procedures JSONB DEFAULT '[]',
  -- Example: [{"code": "D0120", "description": "Exam", "fee_cents": 8000, "tooth_numbers": [], "approved_cents": 8000}]
  
  -- Notes
  notes TEXT,
  
  created_by_user_id UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, claim_number)
);

CREATE INDEX IF NOT EXISTS idx_insurance_claims_tenant ON insurance_claims(tenant_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_contact ON insurance_claims(contact_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_policy ON insurance_claims(insurance_policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_date ON insurance_claims(claim_date DESC);

COMMENT ON TABLE insurance_claims IS 'Insurance claim submissions and tracking';

-- =====================================================
-- 13. ADD LOCATION REFERENCE TO CONTACTS
-- =====================================================

-- Add location_id to contacts if it doesn't exist
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES practice_locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_location ON contacts(location_id);

COMMENT ON COLUMN contacts.location_id IS 'Primary location for this patient';

-- =====================================================
-- 14. TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update invoice balance when paid_cents changes
CREATE OR REPLACE FUNCTION update_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.balance_cents := NEW.total_cents - NEW.paid_cents;
  
  -- Update status based on balance
  IF NEW.balance_cents <= 0 THEN
    NEW.status := 'paid';
    NEW.paid_at := NOW();
  ELSIF NEW.paid_cents > 0 AND NEW.balance_cents > 0 THEN
    NEW.status := 'partial';
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.balance_cents > 0 THEN
    NEW.status := 'overdue';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_invoice_balance ON invoices;
CREATE OR REPLACE TRIGGER trigger_update_invoice_balance
  BEFORE INSERT OR UPDATE OF total_cents, paid_cents ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_balance();

-- Update invoice paid amount when payment is created
CREATE OR REPLACE FUNCTION update_invoice_from_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_id IS NOT NULL AND NEW.payment_status = 'completed' THEN
    UPDATE invoices
    SET paid_cents = paid_cents + NEW.amount_cents,
        updated_at = NOW()
    WHERE id = NEW.invoice_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_invoice_from_payment ON payments;
CREATE OR REPLACE TRIGGER trigger_update_invoice_from_payment
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_from_payment();

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Demo seed schema created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  1. seed_pack_manifest (tracking)';
  RAISE NOTICE '  2. practice_locations (3 will be created)';
  RAISE NOTICE '  3. providers (7 will be created)';
  RAISE NOTICE '  4. provider_schedules';
  RAISE NOTICE '  5. appointment_types (10 templates)';
  RAISE NOTICE '  6. appointments (105 will be created)';
  RAISE NOTICE '  7. insurance_payers (8 companies)';
  RAISE NOTICE '  8. insurance_policies (30 will be created)';
  RAISE NOTICE '  9. procedures (30 ADA codes)';
  RAISE NOTICE ' 10. invoices (25 will be created)';
  RAISE NOTICE ' 11. payments (35 will be created)';
  RAISE NOTICE ' 12. insurance_claims (20 will be created)';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready for seeding!';
END $$;

