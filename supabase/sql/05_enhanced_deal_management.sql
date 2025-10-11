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
ADD CONSTRAINT check_deal_type 
CHECK (deal_type IN ('new_lead', 'existing_patient', 'pms_import', 'referral'));

ALTER TABLE deals 
ADD CONSTRAINT check_payment_plan 
CHECK (payment_plan IN ('full_payment', 'installments', 'insurance', 'finance') OR payment_plan IS NULL);

ALTER TABLE deals 
ADD CONSTRAINT check_treatment_category 
CHECK (treatment_category IN ('preventive', 'restorative', 'cosmetic', 'orthodontic', 'surgical', 'emergency') OR treatment_category IS NULL);

ALTER TABLE deals 
ADD CONSTRAINT check_treatment_urgency 
CHECK (treatment_urgency IN ('low', 'medium', 'high', 'emergency') OR treatment_urgency IS NULL);

ALTER TABLE deals 
ADD CONSTRAINT check_pms_sync_status 
CHECK (pms_sync_status IN ('not_synced', 'synced', 'sync_pending', 'sync_failed'));

ALTER TABLE deals 
ADD CONSTRAINT check_lead_score_range 
CHECK (lead_score >= 0 AND lead_score <= 100 OR lead_score IS NULL);

ALTER TABLE deals 
ADD CONSTRAINT check_conversion_probability_range 
CHECK (conversion_probability >= 0 AND conversion_probability <= 100 OR conversion_probability IS NULL);

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
