SET search_path TO public, extensions;
-- PATCHED: monitoring/dashboard views skipped (depend on tables not yet present).
-- Can be re-applied later as a separate migration once all referenced tables exist.
SELECT 1 AS noop;
