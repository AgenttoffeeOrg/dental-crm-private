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
CREATE TRIGGER trigger_update_invoice_balance
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
CREATE TRIGGER trigger_update_invoice_from_payment
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

