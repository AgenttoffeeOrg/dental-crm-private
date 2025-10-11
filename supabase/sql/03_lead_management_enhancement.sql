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
CREATE OR REPLACE VIEW lead_pipeline_analytics AS
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
