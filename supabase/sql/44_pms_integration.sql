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

CREATE INDEX idx_pms_integrations_tenant ON pms_integrations(tenant_id);
CREATE INDEX idx_pms_integrations_active ON pms_integrations(tenant_id, is_active);

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

CREATE INDEX idx_pms_sync_logs_integration ON pms_sync_logs(integration_id);
CREATE INDEX idx_pms_sync_logs_tenant_type ON pms_sync_logs(tenant_id, sync_type);
CREATE INDEX idx_pms_sync_logs_created ON pms_sync_logs(created_at DESC);

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

CREATE INDEX idx_pms_patient_mappings_contact ON pms_patient_mappings(crm_contact_id);
CREATE INDEX idx_pms_patient_mappings_pms_id ON pms_patient_mappings(pms_patient_id, pms_provider);
CREATE INDEX idx_pms_patient_mappings_tenant ON pms_patient_mappings(tenant_id);

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

CREATE INDEX idx_treatment_plans_tenant ON treatment_plans(tenant_id);
CREATE INDEX idx_treatment_plans_contact ON treatment_plans(crm_contact_id);
CREATE INDEX idx_treatment_plans_deal ON treatment_plans(crm_deal_id);
CREATE INDEX idx_treatment_plans_pms_id ON treatment_plans(pms_treatment_id, integration_id);
CREATE INDEX idx_treatment_plans_status ON treatment_plans(tenant_id, status);
CREATE INDEX idx_treatment_plans_type ON treatment_plans(tenant_id, treatment_type);

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

CREATE INDEX idx_treatment_payments_treatment ON treatment_payments(treatment_plan_id);
CREATE INDEX idx_treatment_payments_deal ON treatment_payments(crm_deal_id);
CREATE INDEX idx_treatment_payments_contact ON treatment_payments(crm_contact_id);
CREATE INDEX idx_treatment_payments_date ON treatment_payments(payment_date DESC);

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
CREATE OR REPLACE VIEW treatment_type_analytics AS
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
CREATE OR REPLACE VIEW actual_ltv_by_source AS
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
CREATE OR REPLACE VIEW revenue_accuracy_metrics AS
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
CREATE OR REPLACE VIEW pms_integration_health AS
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
CREATE TRIGGER trigger_update_contact_ltv
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
CREATE TRIGGER trigger_update_deal_actual_revenue
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


