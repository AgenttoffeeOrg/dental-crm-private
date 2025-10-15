-- 60_deal_saved_views.sql
-- Create saved views system for deals table

-- Create saved_deal_views table
CREATE TABLE IF NOT EXISTS saved_deal_views (
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
CREATE INDEX IF NOT EXISTS idx_saved_deal_views_tenant_id ON saved_deal_views(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saved_deal_views_user_id ON saved_deal_views(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_deal_views_is_default ON saved_deal_views(is_default);

-- Enable RLS
ALTER TABLE saved_deal_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own and shared views"
    ON saved_deal_views FOR SELECT
    USING (
        tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
        AND (user_id = auth.uid() OR is_shared = TRUE)
    );

CREATE POLICY "Users can create own views"
    ON saved_deal_views FOR INSERT
    WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update own views"
    ON saved_deal_views FOR UPDATE
    USING (
        tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can delete own views"
    ON saved_deal_views FOR DELETE
    USING (
        tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
        AND user_id = auth.uid()
    );

-- Insert default views for existing users
INSERT INTO saved_deal_views (tenant_id, user_id, name, description, is_default, filters, sort_field, sort_order)
SELECT 
    tenant_id,
    id as user_id,
    'All Deals',
    'View all deals across all pipelines',
    TRUE,
    '{}'::jsonb,
    'updated_at',
    'desc'
FROM app_users
WHERE NOT EXISTS (
    SELECT 1 FROM saved_deal_views 
    WHERE saved_deal_views.user_id = app_users.id 
    AND saved_deal_views.name = 'All Deals'
);

-- Insert preset views for each existing user
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id, tenant_id FROM app_users LOOP
        -- My Deals
        INSERT INTO saved_deal_views (tenant_id, user_id, name, description, filters, sort_field, sort_order)
        VALUES (
            user_record.tenant_id,
            user_record.id,
            'My Deals',
            'Deals assigned to me',
            jsonb_build_object('ownerFilter', 'my'),
            'updated_at',
            'desc'
        )
        ON CONFLICT DO NOTHING;
        
        -- High Value Deals
        INSERT INTO saved_deal_views (tenant_id, user_id, name, description, filters, sort_field, sort_order)
        VALUES (
            user_record.tenant_id,
            user_record.id,
            'High Value',
            'Deals worth more than £2,000',
            jsonb_build_object('valueFilter', 'high'),
            'value',
            'desc'
        )
        ON CONFLICT DO NOTHING;
        
        -- Stuck Deals
        INSERT INTO saved_deal_views (tenant_id, user_id, name, description, filters, sort_field, sort_order)
        VALUES (
            user_record.tenant_id,
            user_record.id,
            'Stuck Deals',
            'Deals in stage for more than 14 days',
            jsonb_build_object('agingFilter', 'stuck'),
            'updated_at',
            'asc'
        )
        ON CONFLICT DO NOTHING;
        
        -- Closing Soon (unassigned deals)
        INSERT INTO saved_deal_views (tenant_id, user_id, name, description, filters, sort_field, sort_order)
        VALUES (
            user_record.tenant_id,
            user_record.id,
            'Unassigned',
            'Deals without an owner',
            jsonb_build_object('ownerFilter', 'unassigned'),
            'created_at',
            'desc'
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

COMMENT ON TABLE saved_deal_views IS 'Saved filter and view configurations for the deals table';

