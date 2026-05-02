SET search_path TO public, extensions;

-- =====================================================
-- ORGANIZATION PROFILE ENHANCEMENT MIGRATION
-- =====================================================
-- Purpose: Add comprehensive organization profile fields to tenants table
-- Date: 2025-10-26
-- Phase: 2 (Organization Profile Hub)
--
-- This migration adds:
-- 1. Company Information (size, industry, founded date, description)
-- 2. Legal Details (legal name, tax ID, registration number)
-- 3. Contact Information (phone, email, website, support contacts)
-- 4. Business Settings (fiscal year, currency, business hours, GDPR)
-- 5. Organization Logo (logo_url for storage)
-- =====================================================

-- Add new columns to tenants table for enhanced organization profile
ALTER TABLE tenants
-- Company Information
ADD COLUMN IF NOT EXISTS company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')),
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS founded_date DATE,
ADD COLUMN IF NOT EXISTS company_description TEXT,

-- Legal Details
ADD COLUMN IF NOT EXISTS legal_name TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS registration_number TEXT,
ADD COLUMN IF NOT EXISTS legal_address_line1 TEXT,
ADD COLUMN IF NOT EXISTS legal_address_line2 TEXT,
ADD COLUMN IF NOT EXISTS legal_city TEXT,
ADD COLUMN IF NOT EXISTS legal_state TEXT,
ADD COLUMN IF NOT EXISTS legal_postal_code TEXT,
ADD COLUMN IF NOT EXISTS legal_country TEXT,

-- Contact Information
ADD COLUMN IF NOT EXISTS phone_main TEXT,
ADD COLUMN IF NOT EXISTS phone_support TEXT,
ADD COLUMN IF NOT EXISTS email_main TEXT,
ADD COLUMN IF NOT EXISTS email_support TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,

-- Business Settings
ADD COLUMN IF NOT EXISTS fiscal_year_start INTEGER CHECK (fiscal_year_start >= 1 AND fiscal_year_start <= 12) DEFAULT 1,
ADD COLUMN IF NOT EXISTS primary_currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS business_hours_json JSONB,
ADD COLUMN IF NOT EXISTS gdpr_compliant BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT 365,

-- Organization Logo
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS organization_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add comments for documentation
COMMENT ON COLUMN tenants.company_size IS 'Size of the organization by employee count';
COMMENT ON COLUMN tenants.industry IS 'Industry or sector (e.g., Healthcare, Dental, Medical)';
COMMENT ON COLUMN tenants.founded_date IS 'Date the organization was founded';
COMMENT ON COLUMN tenants.company_description IS 'Brief description of the organization';

COMMENT ON COLUMN tenants.legal_name IS 'Legal registered name of the organization';
COMMENT ON COLUMN tenants.tax_id IS 'Tax identification number (EIN, VAT, etc.)';
COMMENT ON COLUMN tenants.registration_number IS 'Business registration number';
COMMENT ON COLUMN tenants.legal_address_line1 IS 'Legal address line 1';
COMMENT ON COLUMN tenants.legal_address_line2 IS 'Legal address line 2 (suite, floor, etc.)';
COMMENT ON COLUMN tenants.legal_city IS 'Legal address city';
COMMENT ON COLUMN tenants.legal_state IS 'Legal address state/province';
COMMENT ON COLUMN tenants.legal_postal_code IS 'Legal address postal/ZIP code';
COMMENT ON COLUMN tenants.legal_country IS 'Legal address country';

COMMENT ON COLUMN tenants.phone_main IS 'Main organization phone number';
COMMENT ON COLUMN tenants.phone_support IS 'Support/helpdesk phone number';
COMMENT ON COLUMN tenants.email_main IS 'Main organization email';
COMMENT ON COLUMN tenants.email_support IS 'Support email address';
COMMENT ON COLUMN tenants.website IS 'Organization website URL';

COMMENT ON COLUMN tenants.fiscal_year_start IS 'Month when fiscal year starts (1-12)';
COMMENT ON COLUMN tenants.primary_currency IS 'Primary currency code (USD, EUR, GBP, etc.)';
COMMENT ON COLUMN tenants.business_hours_json IS 'Standard business hours in JSON format';
COMMENT ON COLUMN tenants.gdpr_compliant IS 'Whether organization follows GDPR compliance';
COMMENT ON COLUMN tenants.data_retention_days IS 'Default data retention period in days';

COMMENT ON COLUMN tenants.logo_url IS 'URL to organization logo in storage';
COMMENT ON COLUMN tenants.organization_updated_at IS 'Last time organization profile was updated';

-- Create a trigger to update organization_updated_at on changes
CREATE OR REPLACE FUNCTION update_organization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.organization_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_organization_updated_at ON tenants;
CREATE OR REPLACE TRIGGER set_organization_updated_at
BEFORE UPDATE ON tenants
FOR EACH ROW
EXECUTE FUNCTION update_organization_updated_at();

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_tenants_industry ON tenants(industry);
CREATE INDEX IF NOT EXISTS idx_tenants_company_size ON tenants(company_size);
CREATE INDEX IF NOT EXISTS idx_tenants_legal_name ON tenants(legal_name);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration was successful:
--
-- 1. Check new columns exist:
-- SELECT column_name, data_type, character_maximum_length
-- FROM information_schema.columns
-- WHERE table_name = 'tenants'
-- AND column_name IN ('company_size', 'industry', 'founded_date', 'legal_name', 'tax_id', 'logo_url')
-- ORDER BY column_name;
--
-- 2. Check trigger exists:
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_name = 'set_organization_updated_at';
--
-- 3. Check indexes exist:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'tenants'
-- AND indexname LIKE 'idx_tenants_%';
-- =====================================================

