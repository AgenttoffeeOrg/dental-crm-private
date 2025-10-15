-- 63_contact_performance_indexes.sql
-- Performance optimization indexes for contacts queries

-- STEP 1: Add contact_type column if it doesn't exist (MUST BE FIRST)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'contact_type'
    ) THEN
        ALTER TABLE contacts ADD COLUMN contact_type VARCHAR(50) DEFAULT 'patient';
    END IF;
END $$;

-- STEP 2: Add check constraint for contact_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'contacts' AND constraint_name = 'check_contact_type'
    ) THEN
        ALTER TABLE contacts 
        ADD CONSTRAINT check_contact_type 
        CHECK (contact_type IN ('patient', 'lead', 'referrer', 'corporate', 'insurer'));
    END IF;
END $$;

-- STEP 3: Now create indexes (after column exists)

-- Core indexes for contacts table filtering and sorting
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_full_name ON contacts(full_name);
CREATE INDEX IF NOT EXISTS idx_contacts_primary_email ON contacts(primary_email);
CREATE INDEX IF NOT EXISTS idx_contacts_primary_phone ON contacts(primary_phone);

-- Full-text search index for contact name
CREATE INDEX IF NOT EXISTS idx_contacts_full_name_search ON contacts USING gin(to_tsvector('english', full_name));

-- Sorting indexes
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_updated_at ON contacts(updated_at DESC);

-- Type and source indexes (for filtering) - NOW contact_type column exists
CREATE INDEX IF NOT EXISTS idx_contacts_contact_type ON contacts(contact_type) WHERE contact_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source) WHERE source IS NOT NULL;

-- Tags index (GIN for array operations)
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING gin(tags);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_type ON contacts(tenant_id, contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_updated ON contacts(tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_name ON contacts(tenant_id, full_name);

-- STEP 4: Analyze table for query planner optimization
ANALYZE contacts;

COMMENT ON INDEX idx_contacts_tenant_id IS 'Optimizes tenant-specific contact queries';
COMMENT ON INDEX idx_contacts_full_name_search IS 'Enables fast full-text search on contact names';
COMMENT ON INDEX idx_contacts_tags IS 'Optimizes tag-based filtering';

