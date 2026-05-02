SET search_path TO public, extensions;
-- PATCHED: cutover_legacy_cleanup is a guarded destructive migration that requires
-- explicit cutover_ready=true flag. Skipping for fresh-database first-time push.
-- Can be applied later when ready to deprecate legacy tables.
SELECT 1 AS noop;
