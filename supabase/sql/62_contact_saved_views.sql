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
CREATE POLICY "Users can view own and shared contact views"
    ON saved_contact_views FOR SELECT
    USING (
        tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
        AND (user_id = auth.uid() OR is_shared = TRUE)
    );

CREATE POLICY "Users can create own contact views"
    ON saved_contact_views FOR INSERT
    WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update own contact views"
    ON saved_contact_views FOR UPDATE
    USING (
        tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can delete own contact views"
    ON saved_contact_views FOR DELETE
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

