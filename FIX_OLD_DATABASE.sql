-- ================================================================
-- FIX OLD DATABASE - Add Only Missing Columns and Tables
-- ================================================================
-- This script only ADDS missing schema elements
-- Uses ALTER TABLE ADD COLUMN IF NOT EXISTS
-- Safe to run on existing database
-- ================================================================

-- Add missing columns to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'lead';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_first_name ON contacts(first_name);
CREATE INDEX IF NOT EXISTS idx_contacts_last_name ON contacts(last_name);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_score ON contacts(lead_score DESC);

-- Add missing columns to app_users table
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Add missing columns to deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS probability INTEGER DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS expected_close_date DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS actual_close_date DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lost_reason TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES app_users(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add missing columns to tenants table  
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create unique constraint on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug) WHERE slug IS NOT NULL;

-- Success message
SELECT 'Database schema updated successfully!' as message;

