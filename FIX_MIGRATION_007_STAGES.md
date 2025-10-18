# 🔧 FIX: MIGRATION 007 - MISSING TABLES

**Date:** Friday, October 17, 2025  
**Error:** `ERROR: 42P01: relation "stages" does not exist`  
**Migration:** 007_update_rls_dual_path.sql  
**Status:** ✅ **FIXED - ALL TABLE CHECKS ADDED**

---

## 🔍 **ROOT CAUSE**

Migration 007 was trying to update RLS policies on tables that may not exist in every database:
- `contacts`
- `deals`
- `activities`
- `pipelines`
- `stages` ← Error occurred here
- `app_users`
- `user_invitations`
- `custom_roles`

The migration assumed all these tables exist, but only some might be deployed.

---

## ✅ **SOLUTION IMPLEMENTED**

Wrapped all table policy updates in conditional checks:

### **Before (❌ Error):**
```sql
-- Assumes table exists
DROP POLICY IF EXISTS stages_tenant_isolation ON stages;
CREATE POLICY stages_tenant_isolation ON stages
  FOR ALL
  USING (tenant_id = ANY(public.get_accessible_tenants()));
```

### **After (✅ Fixed):**
```sql
-- Checks if table exists first
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stages') THEN
    EXECUTE 'DROP POLICY IF EXISTS stages_tenant_isolation ON stages';
    EXECUTE 'CREATE POLICY stages_tenant_isolation ON stages
      FOR ALL
      USING (tenant_id = ANY(public.get_accessible_tenants()))';
    RAISE NOTICE '✅ Updated RLS: stages';
  ELSE
    RAISE NOTICE 'ℹ️  Table stages does not exist, skipping';
  END IF;
END $$;
```

---

## 📊 **TABLES FIXED**

| # | Table | Status |
|---|-------|--------|
| 1 | `contacts` | ✅ Wrapped in conditional check |
| 2 | `deals` | ✅ Wrapped in conditional check |
| 3 | `activities` | ✅ Wrapped in conditional check |
| 4 | `pipelines` | ✅ Wrapped in conditional check |
| 5 | `stages` | ✅ Wrapped in conditional check |
| 6 | `app_users` | ✅ Wrapped in conditional check |
| 7 | `user_invitations` | ✅ Wrapped in conditional check |
| 8 | `custom_roles` | ✅ Wrapped in conditional check |

**Total:** 8 sections fixed

---

## 🎯 **BEHAVIOR**

### **If Table Exists:**
```
✅ Updated RLS: [table_name]
```
- Policy is dropped and recreated with dual-path support

### **If Table Doesn't Exist:**
```
ℹ️  Table [table_name] does not exist, skipping
```
- No error, migration continues

---

## ✅ **WHAT THIS MEANS**

Migration 007 will now:
- ✅ Update RLS policies on tables that exist
- ✅ Gracefully skip tables that don't exist
- ✅ Complete successfully regardless of which tables are deployed
- ✅ Show clear messages about what was updated vs skipped

---

## 🚀 **YOU CAN NOW RE-RUN MIGRATION 007**

```bash
# Open Supabase SQL Editor
# Copy/paste: supabase/migrations/20251018_007_update_rls_dual_path.sql
# Click "Run"
# Should complete successfully ✅
```

**Expected output:**
```
ℹ️  Table contacts does not exist, skipping
ℹ️  Table deals does not exist, skipping
...
✅ Updated RLS: app_users
✅ Updated RLS: custom_roles
...
✅ Migration 007 complete
```

---

## 📋 **REMAINING MIGRATIONS**

After migration 007 completes:

| # | Migration | Status |
|---|-----------|--------|
| 8 | `008_backfill_existing_data.sql` | ⏸️ NEXT |
| 9 | `009_seat_management_functions.sql` | ⏸️ PENDING |

**Only 2 more migrations left!** 🎉

---

## 🎯 **SUMMARY**

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   ✅  MIGRATION 007: FIXED                      │
│   ✅  8 TABLES: CONDITIONAL CHECKS ADDED        │
│   ✅  GRACEFUL SKIP: FOR MISSING TABLES         │
│   ✅  READY TO RUN                              │
│                                                 │
│   🚀  CONTINUE DEPLOYMENT                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Migration 007 is fixed and ready to run.** ✓  
**Will skip tables that don't exist.** ✓  
**Only 2 migrations left after this!** ✓



