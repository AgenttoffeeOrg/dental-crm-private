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
        ADD COLUMN deal_type VARCHAR(50) DEFAULT 'new_lead',
        ADD COLUMN deposit_amount_cents BIGINT DEFAULT 0,
        ADD COLUMN payment_plan VARCHAR(50),
        ADD COLUMN treatment_category VARCHAR(50),
        ADD COLUMN treatment_urgency VARCHAR(20),
        ADD COLUMN estimated_duration_weeks INTEGER,
        ADD COLUMN pms_treatment_plan_id VARCHAR(100),
        ADD COLUMN pms_patient_id VARCHAR(100),
        ADD COLUMN pms_sync_status VARCHAR(50) DEFAULT 'not_synced',
        ADD COLUMN consultation_scheduled BOOLEAN DEFAULT FALSE,
        ADD COLUMN consultation_date TIMESTAMPTZ,
        ADD COLUMN treatment_start_date TIMESTAMPTZ,
        ADD COLUMN treatment_end_date TIMESTAMPTZ,
        ADD COLUMN insurance_coverage BOOLEAN DEFAULT FALSE,
        ADD COLUMN insurance_provider VARCHAR(100),
        ADD COLUMN insurance_authorization_number VARCHAR(100),
        ADD COLUMN insurance_coverage_percentage INTEGER,
        ADD COLUMN follow_up_required BOOLEAN DEFAULT TRUE,
        ADD COLUMN next_follow_up_date TIMESTAMPTZ,
        ADD COLUMN internal_notes TEXT,
        ADD COLUMN patient_concerns TEXT,
        ADD COLUMN lead_score INTEGER,
        ADD COLUMN conversion_probability INTEGER;

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
        CREATE INDEX idx_deals_deal_type ON deals(deal_type);
        CREATE INDEX idx_deals_treatment_category ON deals(treatment_category);
        CREATE INDEX idx_deals_treatment_urgency ON deals(treatment_urgency);
        CREATE INDEX idx_deals_pms_sync_status ON deals(pms_sync_status);
        CREATE INDEX idx_deals_lead_score ON deals(lead_score);
        CREATE INDEX idx_deals_conversion_probability ON deals(conversion_probability);
        CREATE INDEX idx_deals_follow_up_date ON deals(next_follow_up_date);
        CREATE INDEX idx_deals_consultation_date ON deals(consultation_date);

        -- Update existing deals to have default deal_type
        UPDATE deals 
        SET deal_type = 'new_lead' 
        WHERE deal_type IS NULL;

        RAISE NOTICE 'Enhanced deal management columns added successfully';
    ELSE
        RAISE NOTICE 'Enhanced deal management columns already exist';
    END IF;
END $$;
