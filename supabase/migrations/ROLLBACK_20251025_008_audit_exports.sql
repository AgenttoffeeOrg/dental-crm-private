-- =====================================================
-- ROLLBACK: Step 7 - Audit Log Exports & Compliance
-- Purpose: Remove audit export system
-- Safety: Reverts to basic audit logging
-- =====================================================

BEGIN;

-- Drop functions
DROP FUNCTION IF EXISTS public.apply_audit_retention_policies();
DROP FUNCTION IF EXISTS public.get_audit_statistics(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.get_audit_export_status(UUID);
DROP FUNCTION IF EXISTS public.process_audit_export_request(UUID);
DROP FUNCTION IF EXISTS public.create_audit_export_request(UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID[], TEXT[], TEXT[], TEXT[], TEXT, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS public.generate_audit_json(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID[], TEXT[], TEXT[], TEXT[], TEXT);
DROP FUNCTION IF EXISTS public.generate_audit_csv(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID[], TEXT[], TEXT[], TEXT[], TEXT);
DROP FUNCTION IF EXISTS public.filter_audit_logs(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID[], TEXT[], TEXT[], TEXT[], TEXT, INTEGER, INTEGER);

-- Drop tables
DROP TABLE IF EXISTS audit_retention_policies CASCADE;
DROP TABLE IF EXISTS audit_export_requests CASCADE;

-- Remove columns from audits
ALTER TABLE audits DROP COLUMN IF EXISTS exported_at;
ALTER TABLE audits DROP COLUMN IF EXISTS export_batch_id;
ALTER TABLE audits DROP COLUMN IF EXISTS severity;
ALTER TABLE audits DROP COLUMN IF EXISTS category;
ALTER TABLE audits DROP COLUMN IF EXISTS tags;
ALTER TABLE audits DROP COLUMN IF EXISTS retention_until;

-- Drop indexes
DROP INDEX IF EXISTS idx_audits_exported;
DROP INDEX IF EXISTS idx_audits_export_batch;
DROP INDEX IF EXISTS idx_audits_severity;
DROP INDEX IF EXISTS idx_audits_category;
DROP INDEX IF EXISTS idx_audits_tags;
DROP INDEX IF EXISTS idx_audits_retention;
DROP INDEX IF EXISTS idx_audits_tenant_date;
DROP INDEX IF EXISTS idx_audits_user_date;

DO $$
BEGIN
  RAISE NOTICE '✅ Rollback complete - basic audit logging preserved';
END $$;

COMMIT;



