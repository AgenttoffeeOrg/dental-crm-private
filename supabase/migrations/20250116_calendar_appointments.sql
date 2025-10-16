-- =====================================================
-- CALENDAR & APPOINTMENTS SYSTEM
-- Migration: Complete appointment scheduling infrastructure
-- =====================================================

-- =====================================================
-- 1. PROVIDERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Provider details
    user_id UUID REFERENCES app_users(id) ON DELETE SET NULL, -- Optional link to user
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specialty TEXT, -- 'General Dentist', 'Orthodontist', 'Hygienist', etc.
    
    -- Display
    calendar_color TEXT DEFAULT '#3B82F6', -- Hex color
    avatar_url TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_providers_tenant ON providers(tenant_id);
CREATE INDEX idx_providers_user ON providers(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_providers_active ON providers(is_active) WHERE is_active = true;

-- =====================================================
-- 2. OPERATORIES (Rooms/Chairs/Resources)
-- =====================================================

CREATE TABLE IF NOT EXISTS operatories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    
    -- Operatory details
    name TEXT NOT NULL, -- 'Op 1', 'Hygiene Room A', etc.
    operatory_number INTEGER,
    equipment_type TEXT, -- 'Standard', 'Surgical', 'Hygiene', 'Imaging'
    
    -- Display
    color TEXT DEFAULT '#10B981',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_operatories_tenant ON operatories(tenant_id);
CREATE INDEX idx_operatories_location ON operatories(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX idx_operatories_active ON operatories(is_active) WHERE is_active = true;

-- =====================================================
-- 3. APPOINTMENT TYPES
-- =====================================================

CREATE TABLE IF NOT EXISTS appointment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Type details
    name TEXT NOT NULL, -- 'Consultation', 'Hygiene', 'Implant Surgery', etc.
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    
    -- Display
    color TEXT DEFAULT '#8B5CF6',
    icon TEXT, -- Icon name
    
    -- Defaults
    default_provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
    requires_operatory BOOLEAN DEFAULT true,
    
    -- Booking rules
    buffer_before_minutes INTEGER DEFAULT 0,
    buffer_after_minutes INTEGER DEFAULT 0,
    allow_online_booking BOOLEAN DEFAULT true,
    min_notice_hours INTEGER DEFAULT 24, -- Min advance booking time
    max_advance_days INTEGER DEFAULT 90, -- Max advance booking
    
    -- Reminders
    reminder_config JSONB DEFAULT '{"email_48h": true, "email_24h": true, "sms_2h": true}'::jsonb,
    
    -- Forms
    intake_form_id UUID, -- Pre-appointment form
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_appointment_types_tenant ON appointment_types(tenant_id);
CREATE INDEX idx_appointment_types_active ON appointment_types(is_active) WHERE is_active = true;

-- =====================================================
-- 4. APPOINTMENTS TABLE (Main)
-- =====================================================

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Relationships
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
    operatory_id UUID REFERENCES operatories(id) ON DELETE SET NULL,
    appointment_type_id UUID REFERENCES appointment_types(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    
    -- Appointment details
    title TEXT NOT NULL,
    description TEXT,
    
    -- Time
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    timezone TEXT DEFAULT 'Europe/London',
    
    -- Status
    status TEXT NOT NULL CHECK (status IN (
        'requested',
        'confirmed',
        'arrived',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
        'rescheduled'
    )) DEFAULT 'requested',
    
    -- Lifecycle timestamps
    confirmed_at TIMESTAMP WITH TIME ZONE,
    arrived_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    
    -- Video conferencing
    video_link TEXT, -- Zoom, Teams, Meet URL
    video_provider TEXT, -- 'zoom', 'teams', 'meet'
    video_meeting_id TEXT,
    
    -- External calendar sync
    google_event_id TEXT,
    outlook_event_id TEXT,
    external_sync_status TEXT CHECK (external_sync_status IN ('synced', 'pending', 'failed', 'not_synced')),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    
    -- Recurring
    is_recurring BOOLEAN DEFAULT false,
    recurring_rule TEXT, -- RRULE format
    parent_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    recurring_instance_date DATE, -- For recurring instances
    
    -- Reminders
    reminder_config JSONB, -- Override default reminders
    reminders_sent JSONB DEFAULT '[]'::jsonb, -- Array of sent reminder timestamps
    
    -- Notes & attachments
    notes TEXT,
    internal_notes TEXT, -- Staff-only notes
    
    -- Metadata
    source TEXT, -- 'manual', 'online_booking', 'import', 'sync'
    booking_url TEXT, -- If from online booking
    metadata JSONB,
    
    -- Audit
    created_by_user_id UUID REFERENCES app_users(id),
    updated_by_user_id UUID REFERENCES app_users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX idx_appointments_contact ON appointments(contact_id);
CREATE INDEX idx_appointments_deal ON appointments(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX idx_appointments_provider ON appointments(provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX idx_appointments_operatory ON appointments(operatory_id) WHERE operatory_id IS NOT NULL;
CREATE INDEX idx_appointments_type ON appointments(appointment_type_id) WHERE appointment_type_id IS NOT NULL;
CREATE INDEX idx_appointments_location ON appointments(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_start ON appointments(start_at);
CREATE INDEX idx_appointments_date_range ON appointments(tenant_id, start_at, end_at);
CREATE INDEX idx_appointments_provider_date ON appointments(provider_id, start_at) WHERE provider_id IS NOT NULL;
CREATE INDEX idx_appointments_google_event ON appointments(google_event_id) WHERE google_event_id IS NOT NULL;
CREATE INDEX idx_appointments_outlook_event ON appointments(outlook_event_id) WHERE outlook_event_id IS NOT NULL;
CREATE INDEX idx_appointments_recurring ON appointments(parent_appointment_id) WHERE parent_appointment_id IS NOT NULL;

-- =====================================================
-- 5. AVAILABILITY RULES
-- =====================================================

CREATE TABLE IF NOT EXISTS availability_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Scope (provider or location)
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    
    -- Day of week (0 = Sunday, 6 = Saturday)
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    
    -- Time range
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Breaks
    break_start TIME,
    break_end TIME,
    
    -- Capacity
    is_available BOOLEAN DEFAULT true,
    max_appointments_per_slot INTEGER DEFAULT 1,
    slot_duration_minutes INTEGER DEFAULT 30,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK (start_time < end_time),
    CHECK (provider_id IS NOT NULL OR location_id IS NOT NULL)
);

CREATE INDEX idx_availability_rules_tenant ON availability_rules(tenant_id);
CREATE INDEX idx_availability_rules_provider ON availability_rules(provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX idx_availability_rules_location ON availability_rules(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX idx_availability_rules_day ON availability_rules(day_of_week);

-- =====================================================
-- 6. PROVIDER TIME OFF (Vacations, Holidays, Blocks)
-- =====================================================

CREATE TABLE IF NOT EXISTS provider_time_off (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    
    -- Time off details
    title TEXT NOT NULL, -- 'Vacation', 'Conference', 'Sick Leave'
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT false,
    
    -- Type
    time_off_type TEXT CHECK (time_off_type IN ('vacation', 'sick', 'holiday', 'block', 'other')),
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_provider_time_off_tenant ON provider_time_off(tenant_id);
CREATE INDEX idx_provider_time_off_provider ON provider_time_off(provider_id);
CREATE INDEX idx_provider_time_off_dates ON provider_time_off(start_at, end_at);

-- =====================================================
-- 7. APPOINTMENT REMINDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS appointment_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    
    -- Reminder details
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('email', 'sms', 'whatsapp', 'push')),
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Content
    subject TEXT,
    message TEXT,
    
    -- Status
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_appointment_reminders_appointment ON appointment_reminders(appointment_id);
CREATE INDEX idx_appointment_reminders_scheduled ON appointment_reminders(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_appointment_reminders_status ON appointment_reminders(status);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE operatories ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;

-- Providers policies
CREATE POLICY "Users can view their tenant's providers"
    ON providers FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage providers"
    ON providers FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ))
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Operatories policies
CREATE POLICY "Users can view operatories"
    ON operatories FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage operatories"
    ON operatories FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ))
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Appointment types policies
CREATE POLICY "Users can view appointment types"
    ON appointment_types FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage appointment types"
    ON appointment_types FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ))
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Appointments policies
CREATE POLICY "Users can view appointments"
    ON appointments FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY "Users can create appointments"
    ON appointments FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY "Users can update appointments"
    ON appointments FOR UPDATE
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY "Admins can delete appointments"
    ON appointments FOR DELETE
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Similar policies for availability_rules, provider_time_off, appointment_reminders
CREATE POLICY "Users can view availability rules" ON availability_rules FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage availability rules" ON availability_rules FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid() AND role IN ('owner', 'admin')))
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Users can view time off" ON provider_time_off FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY "Users can manage time off" ON provider_time_off FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()))
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY "Users can view reminders" ON appointment_reminders FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY "System can manage reminders" ON appointment_reminders FOR ALL
    USING (true) WITH CHECK (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get appointments for date range
CREATE OR REPLACE FUNCTION get_appointments_for_range(
    p_tenant_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_provider_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    contact_name TEXT,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    provider_name TEXT,
    operatory_name TEXT,
    status TEXT,
    color TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        c.full_name as contact_name,
        a.start_at,
        a.end_at,
        p.name as provider_name,
        o.name as operatory_name,
        a.status,
        COALESCE(at.color, '#6B7280') as color
    FROM appointments a
    LEFT JOIN contacts c ON c.id = a.contact_id
    LEFT JOIN providers p ON p.id = a.provider_id
    LEFT JOIN operatories o ON o.id = a.operatory_id
    LEFT JOIN appointment_types at ON at.id = a.appointment_type_id
    WHERE a.tenant_id = p_tenant_id
    AND a.start_at >= p_start_date
    AND a.end_at <= p_end_date
    AND (p_provider_id IS NULL OR a.provider_id = p_provider_id)
    AND (p_status IS NULL OR a.status = p_status)
    ORDER BY a.start_at;
END;
$$;

COMMENT ON TABLE providers IS 'Healthcare providers (dentists, hygienists, specialists)';
COMMENT ON TABLE operatories IS 'Treatment rooms/chairs/operatories with equipment';
COMMENT ON TABLE appointment_types IS 'Appointment templates (Consultation, Hygiene, Surgery, etc.)';
COMMENT ON TABLE appointments IS 'All scheduled appointments with full lifecycle tracking';
COMMENT ON TABLE availability_rules IS 'Provider and location working hours';
COMMENT ON TABLE provider_time_off IS 'Vacations, holidays, and time blocks';
COMMENT ON TABLE appointment_reminders IS 'Automated reminder queue (email/SMS/WhatsApp)';

