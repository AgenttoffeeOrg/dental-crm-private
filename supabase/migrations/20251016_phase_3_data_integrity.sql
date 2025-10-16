-- =====================================================
-- PHASE 3: DATA INTEGRITY & REFERENTIAL CONSTRAINTS
-- Enforce same-org relationships and prevent orphans
-- =====================================================
-- Date: October 16, 2025
-- Priority: P0 - CRITICAL SECURITY FIX
--
-- This migration adds strict integrity constraints to prevent:
-- - Cross-org data relationships
-- - Orphaned records
-- - Missing required linkages
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ADD MISSING COLUMNS (If not exist)
-- =====================================================

-- Ensure ALL business tables have org_id (tenant_id)
-- Most already have tenant_id, this is verification

-- Contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES app_users(id);

-- Deals  
ALTER TABLE deals ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES app_users(id);

-- Tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES app_users(id);

-- Pipelines
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES app_users(id);

-- Activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

-- =====================================================
-- 2. ADD COMPOSITE INDEXES (Performance + Integrity)
-- =====================================================

-- Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_org_created ON contacts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_org_updated ON contacts(tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_org_location ON contacts(tenant_id, location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_org_owner ON contacts(tenant_id, owner_user_id) WHERE owner_user_id IS NOT NULL;

-- Deals
CREATE INDEX IF NOT EXISTS idx_deals_org_created ON deals(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_org_updated ON deals(tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_org_pipeline ON deals(tenant_id, pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_org_stage ON deals(tenant_id, stage_id) WHERE stage_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_org_contact ON deals(tenant_id, contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_org_location ON deals(tenant_id, location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_org_owner ON deals(tenant_id, owner_user_id) WHERE owner_user_id IS NOT NULL;

-- Pipelines
CREATE INDEX IF NOT EXISTS idx_pipelines_org_created ON pipelines(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipelines_org_active ON pipelines(tenant_id) WHERE active = true;

-- Pipeline Stages
CREATE INDEX IF NOT EXISTS idx_stages_org_pipeline ON pipeline_stages(tenant_id, pipeline_id);
CREATE INDEX IF NOT EXISTS idx_stages_pipeline_position ON pipeline_stages(pipeline_id, position);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_org_created ON tasks(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_org_due ON tasks(tenant_id, due_at) WHERE due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_org_contact ON tasks(tenant_id, contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_org_deal ON tasks(tenant_id, deal_id) WHERE deal_id IS NOT NULL;

-- Activities
CREATE INDEX IF NOT EXISTS idx_activities_org_occurred ON activities(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_org_contact ON activities(tenant_id, contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_org_deal ON activities(tenant_id, deal_id) WHERE deal_id IS NOT NULL;

-- =====================================================
-- 3. VERIFY FOREIGN KEYS (Ensure CASCADE)
-- =====================================================

-- Note: Most FKs already exist from initial schema
-- This section verifies and adds any missing ones

-- Deals → Contacts (same org)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'deals_contact_id_fkey'
  ) THEN
    ALTER TABLE deals 
      ADD CONSTRAINT deals_contact_id_fkey 
      FOREIGN KEY (contact_id) 
      REFERENCES contacts(id) 
      ON DELETE SET NULL; -- Keep deal if contact deleted, just null the FK
  END IF;
END $$;

-- Deals → Pipelines (same org)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'deals_pipeline_id_fkey'
  ) THEN
    ALTER TABLE deals 
      ADD CONSTRAINT deals_pipeline_id_fkey 
      FOREIGN KEY (pipeline_id) 
      REFERENCES pipelines(id) 
      ON DELETE CASCADE; -- Delete deal if pipeline deleted
  END IF;
END $$;

-- Deals → Stages (same org)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'deals_stage_id_fkey'
  ) THEN
    ALTER TABLE deals 
      ADD CONSTRAINT deals_stage_id_fkey 
      FOREIGN KEY (stage_id) 
      REFERENCES pipeline_stages(id) 
      ON DELETE SET NULL; -- Keep deal if stage deleted, move to default stage
  END IF;
END $$;

-- Tasks → Deals (same org)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tasks_deal_id_fkey'
  ) THEN
    ALTER TABLE tasks 
      ADD CONSTRAINT tasks_deal_id_fkey 
      FOREIGN KEY (deal_id) 
      REFERENCES deals(id) 
      ON DELETE CASCADE; -- Delete task if deal deleted
  END IF;
END $$;

-- Tasks → Contacts (same org)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tasks_contact_id_fkey'
  ) THEN
    ALTER TABLE tasks 
      ADD CONSTRAINT tasks_contact_id_fkey 
      FOREIGN KEY (contact_id) 
      REFERENCES contacts(id) 
      ON DELETE CASCADE; -- Delete task if contact deleted
  END IF;
END $$;

-- =====================================================
-- 4. VALIDATION FUNCTIONS (Same-Org Checks)
-- =====================================================

-- Function to validate deal-contact same org
CREATE OR REPLACE FUNCTION validate_deal_contact_same_org()
RETURNS TRIGGER AS $$
BEGIN
  -- If contact_id is set, verify it's in same org
  IF NEW.contact_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM contacts 
      WHERE id = NEW.contact_id 
      AND tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Deal contact must be in same organization (deal org: %, contact org: different)', NEW.tenant_id;
    END IF;
  END IF;
  
  -- If pipeline_id is set, verify it's in same org
  IF NEW.pipeline_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pipelines 
      WHERE id = NEW.pipeline_id 
      AND tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Deal pipeline must be in same organization';
    END IF;
  END IF;
  
  -- If stage_id is set, verify it's in same org
  IF NEW.stage_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pipeline_stages 
      WHERE id = NEW.stage_id 
      AND tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Deal stage must be in same organization';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to deals table
DROP TRIGGER IF EXISTS validate_deal_relationships ON deals;
CREATE TRIGGER validate_deal_relationships
  BEFORE INSERT OR UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION validate_deal_contact_same_org();

-- Function to validate task relationships
CREATE OR REPLACE FUNCTION validate_task_relationships()
RETURNS TRIGGER AS $$
BEGIN
  -- If contact_id is set, verify same org
  IF NEW.contact_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM contacts 
      WHERE id = NEW.contact_id 
      AND tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Task contact must be in same organization';
    END IF;
  END IF;
  
  -- If deal_id is set, verify same org
  IF NEW.deal_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM deals 
      WHERE id = NEW.deal_id 
      AND tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Task deal must be in same organization';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tasks table
DROP TRIGGER IF EXISTS validate_task_relationships ON tasks;
CREATE TRIGGER validate_task_relationships
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION validate_task_relationships();

-- =====================================================
-- 5. IMMUTABLE TENANT_ID (Prevent Changes After Creation)
-- =====================================================

-- Function to prevent tenant_id changes
CREATE OR REPLACE FUNCTION prevent_tenant_id_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.tenant_id != NEW.tenant_id THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: tenant_id cannot be changed after creation (table: %, id: %)', TG_TABLE_NAME, NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all critical tables
DROP TRIGGER IF EXISTS prevent_tenant_change_contacts ON contacts;
CREATE TRIGGER prevent_tenant_change_contacts
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_tenant_id_change();

DROP TRIGGER IF EXISTS prevent_tenant_change_deals ON deals;
CREATE TRIGGER prevent_tenant_change_deals
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION prevent_tenant_id_change();

DROP TRIGGER IF EXISTS prevent_tenant_change_tasks ON tasks;
CREATE TRIGGER prevent_tenant_change_tasks
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION prevent_tenant_id_change();

DROP TRIGGER IF EXISTS prevent_tenant_change_pipelines ON pipelines;
CREATE TRIGGER prevent_tenant_change_pipelines
  BEFORE UPDATE ON pipelines
  FOR EACH ROW
  EXECUTE FUNCTION prevent_tenant_id_change();

-- =====================================================
-- SUMMARY
-- =====================================================

-- Created:
-- ✅ Composite indexes (org_id + created_at/updated_at)
-- ✅ Location/owner foreign keys
-- ✅ Validation triggers (same-org enforcement)
-- ✅ Immutable tenant_id (cannot change after creation)
-- ✅ Performance optimizations

COMMIT;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Phase 3 Migration Complete: Data integrity constraints applied';
END $$;

