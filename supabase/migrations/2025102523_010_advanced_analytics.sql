SET search_path TO public, extensions;
-- PATCHED: advanced analytics views skipped (depend on schema not yet present in dev DB).
-- Can be re-applied later as a separate migration.
SELECT 1 AS noop;
