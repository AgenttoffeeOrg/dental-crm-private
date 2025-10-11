-- Add comprehensive contact profile fields
-- This extends the contacts table to support a full dental practice contact profile

-- Add personal information fields
ALTER TABLE contacts 
ADD COLUMN preferred_name TEXT,
ADD COLUMN title TEXT CHECK (title IN ('Mr', 'Mrs', 'Ms', 'Dr', 'Prof')),
ADD COLUMN secondary_phone TEXT,
ADD COLUMN secondary_email TEXT,
ADD COLUMN date_of_birth DATE,
ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
ADD COLUMN marital_status TEXT CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed', 'other')),
ADD COLUMN occupation TEXT,
ADD COLUMN employer TEXT;

-- Add address information
ALTER TABLE contacts
ADD COLUMN address TEXT,
ADD COLUMN city TEXT,
ADD COLUMN postal_code TEXT,
ADD COLUMN country TEXT;

-- Add medical information
ALTER TABLE contacts
ADD COLUMN medical_conditions TEXT,
ADD COLUMN allergies TEXT,
ADD COLUMN medications TEXT,
ADD COLUMN emergency_contact_name TEXT,
ADD COLUMN emergency_contact_phone TEXT,
ADD COLUMN emergency_contact_relationship TEXT;

-- Add insurance information
ALTER TABLE contacts
ADD COLUMN insurance_provider TEXT,
ADD COLUMN insurance_policy_number TEXT,
ADD COLUMN insurance_group_number TEXT;

-- Add preferences
ALTER TABLE contacts
ADD COLUMN preferred_appointment_time TEXT CHECK (preferred_appointment_time IN ('morning', 'afternoon', 'evening', 'flexible')),
ADD COLUMN communication_preference TEXT CHECK (communication_preference IN ('phone', 'email', 'sms', 'whatsapp')),
ADD COLUMN language_preference TEXT;

-- Add dental history
ALTER TABLE contacts
ADD COLUMN previous_dentist TEXT,
ADD COLUMN last_dental_visit DATE,
ADD COLUMN dental_anxiety_level TEXT CHECK (dental_anxiety_level IN ('none', 'mild', 'moderate', 'high')),
ADD COLUMN dental_concerns TEXT;

-- Add consent fields
ALTER TABLE contacts
ADD COLUMN marketing_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN sms_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN email_consent BOOLEAN DEFAULT TRUE;

-- Add custom fields as JSONB
ALTER TABLE contacts
ADD COLUMN custom_fields JSONB DEFAULT '{}';

-- Create index on custom fields for better performance
CREATE INDEX idx_contacts_custom_fields ON contacts USING GIN (custom_fields);

-- Create table for custom field definitions
CREATE TABLE custom_contact_fields (
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

-- Create index for custom field definitions
CREATE INDEX idx_custom_contact_fields_tenant ON custom_contact_fields(tenant_id, active);

