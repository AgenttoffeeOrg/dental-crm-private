-- ================================================================
-- APPLY ALL MIGRATIONS - Continues on errors
-- ================================================================

-- This script applies all migrations and continues even if some objects exist

DO $$ 
DECLARE
  migration_sql text;
BEGIN
  -- We'll execute each CREATE statement individually
  -- and catch errors for existing objects
  
  RAISE NOTICE 'Starting migration application...';
  RAISE NOTICE 'Note: "already exists" errors are normal and will be skipped';
  
END $$;

-- Apply migrations individually with error handling
-- Run each migration file separately to isolate errors

\set ON_ERROR_STOP off




