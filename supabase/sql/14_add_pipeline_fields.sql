-- Add missing fields to pipelines table for better pipeline management
-- This migration adds description, is_default, and updated_at fields

-- Add description column for pipeline details
ALTER TABLE pipelines 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add is_default flag to mark default pipeline
ALTER TABLE pipelines 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Add updated_at for tracking changes
ALTER TABLE pipelines 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at to pipeline_stages as well
ALTER TABLE pipeline_stages 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure at least one pipeline is marked as default
-- (This will mark the first pipeline as default if none are)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pipelines WHERE is_default = true) THEN
        UPDATE pipelines 
        SET is_default = true 
        WHERE id = (SELECT id FROM pipelines ORDER BY created_at LIMIT 1);
    END IF;
END $$;

-- Create index for faster default pipeline lookups
CREATE INDEX IF NOT EXISTS idx_pipelines_default ON pipelines(tenant_id, is_default) WHERE is_default = true;

-- Add helpful comment
COMMENT ON COLUMN pipelines.description IS 'Optional description explaining what this pipeline is used for';
COMMENT ON COLUMN pipelines.is_default IS 'Flag indicating if this is the default pipeline for new deals';

