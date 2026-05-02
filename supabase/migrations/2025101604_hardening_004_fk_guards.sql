SET search_path TO public, extensions;
-- PATCHED: Original migration tried to add CHECK constraints with subqueries
-- which is not allowed in Postgres. Migration 2025101605_hardening_004_fk_guards_triggers.sql
-- supersedes this with proper trigger-based validation.
-- Body intentionally left empty.
SELECT 1 AS noop;
