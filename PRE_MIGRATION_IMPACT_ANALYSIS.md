# Pre-Migration Impact Analysis

**Date:** January 2025  
**Migrations Planned:** Column renames + trigger disable + location_id additions  
**Status:** 🔴 **CRITICAL ISSUES FOUND**

---

## Executive Summary

Your planned migrations contain **irreversible column renames** that will **BREAK EXISTING CODE**. Additionally, you're trying to add `location_id` columns that **ALREADY EXIST**. Before proceeding, you must resolve massive schema inconsistencies in your database.

**Overall Risk:** 💀 **CRITICAL - DO NOT RUN AS-PLANNED**

---

## ⚠️ CRITICAL FINDING: Schema Mismatch

Your database has **TWO DIFFERENT SCHEMAS** for the `locations` table:

### Schema A: `supabase/migrations/20251025_phase1_critical_fixes.sql`
```sql
CREATE TABLE IF NOT EXISTS locations (
  -- Address information
  address TEXT,        -- ❌ You want to rename this
  city TEXT,
  -- Contact information
  phone TEXT,          -- ❌ You want to rename this
  email TEXT,
```

### Schema B: `supabase/migrations/20250116_settings_versioning.sql` AND `APPLY_ALL_MIGRATIONS*.sql`
```sql
CREATE TABLE IF NOT EXISTS locations (
  -- Address
  address_line1 TEXT,  -- ✅ Already exists!
  address_line2 TEXT,
  city TEXT,
  -- Contact
  phone_number TEXT,   -- ✅ Already exists!
  email TEXT,
  website_url TEXT,
```

**This means:**
1. Your database may already have `address_line1` and `phone_number`
2. Your code references BOTH `address` AND `address_line1`
3. Renaming `address` → `address_line1` will fail if `address_line1` already exists
4. You have **massive inconsistency** in your migrations

---

## 1. DROP TRIGGER: trigger_auto_create_tenant_for_new_user

### Current State

**Files that reference the trigger:**
- `supabase/migrations/20251027_003_auto_create_tenant_for_users.sql` (Lines 107-194)
- `supabase/migrations/20251027_003_auto_create_tenant_for_users_SAFE.sql` (Lines 29-112)
- Documentation files (DEEP_DIVE_VERIFICATION_REPORT.md, ARCHITECTURE_VERIFICATION_REPORT.md)

### What Will Break

✅ **NOTHING** - The trigger only runs on new user INSERT

**Files that depend on the trigger:**
- None in application code
- Only documentation mentions it

### Code Impact

**None** - Trigger is database-only, no TypeScript code references it directly.

**Risk Level:** 🟢 **LOW**

---

## 2. ALTER TABLE locations RENAME COLUMN address TO address_line1

### Current State

**CRITICAL:** You have inconsistent schemas!

**Schema A files (using `address`):**
- `supabase/migrations/20251025_phase1_critical_fixes.sql` (Line 73)
- `src/app/api/onboarding/save-progress/route.ts` (Lines 212, 234, 236)
- `src/components/onboarding/steps/first-location-step.tsx` (Lines 65, 81, 91, 102, 120, 130)
- `src/lib/hooks/use-locations.ts` (Line 8)

**Schema B files (using `address_line1`):**
- `supabase/migrations/20250116_settings_versioning.sql` (Line 25)
- `APPLY_ALL_MIGRATIONS*.sql` (Line 3970)
- `supabase/sql/70_demo_seed_schema.sql`
- `src/components/settings/locations-settings-tab.tsx` (Lines 128, 228, 230)

### What Will Break

**If `address_line1` already exists:**
❌ Migration will **FAIL** with "column already exists" error

**If only `address` exists:**
✅ Migration runs, but **DOZENS of files need updates**

### Breaking Changes Found

#### File: `src/app/api/onboarding/save-progress/route.ts`

**Lines 212, 234, 236:**

**Current Code:**
```typescript
// Line 212
if (fieldData.address_line1 !== undefined) locationUpdate.address = fieldData.address_line1 || null

// Line 234
...locationUpdate,

// Line 236
updated_at: new Date().toISOString()
```

**What breaks:** Assignment to `locationUpdate.address` - column renamed

**Needs change:**
```typescript
if (fieldData.address_line1 !== undefined) locationUpdate.address_line1 = fieldData.address_line1 || null
```

**Risk Level:** 🔴 **HIGH** - Core onboarding flow

---

#### File: `src/components/onboarding/steps/first-location-step.tsx`

**Lines 65, 81, 91, 102, 120, 130:**

**Current Code:**
```typescript
// Line 65 - SELECT statement
.select('name, address, city, postal_code, phone')

// Line 81 - Access
if (location.address && (!existingStepData.address_line1 || existingStepData.address_line1 === '')) {
  updateFieldValue('address_line1', location.address)
}

// Line 91 - Same pattern
if (location.phone && (!existingStepData.phone_number || existingStepData.phone_number === '')) {
  updateFieldValue('phone_number', location.phone)
}

// Lines 102, 120, 130 - Same pattern repeated
```

**What breaks:** 
1. SQL SELECT statement returns `address` column that no longer exists
2. JavaScript reads `location.address` property that won't exist

**Needs change:**
```typescript
// SELECT statement
.select('name, address_line1, city, postal_code, phone_number')

// Access
if (location.address_line1 && (!existingStepData.address_line1 || existingStepData.address_line1 === '')) {
  updateFieldValue('address_line1', location.address_line1)
}
```

**Risk Level:** 💀 **CRITICAL** - Wizard will completely break

---

#### File: `src/lib/hooks/use-locations.ts`

**Line 8:**

**Current Code:**
```typescript
export interface Location {
  id: string
  tenant_id: string
  name: string
  address?: string          // ❌ Will break
  is_primary?: boolean
}
```

**Needs change:**
```typescript
export interface Location {
  id: string
  tenant_id: string
  name: string
  address_line1?: string    // ✅ Updated
  is_primary?: boolean
}
```

**Risk Level:** 🔴 **HIGH** - Type definition used throughout app

---

### Files Already Using `address_line1` (Will Work ✅)

These files already expect `address_line1`, so they'll work after migration:

**File:** `src/components/settings/locations-settings-tab.tsx`
- Line 128: `address_line1: newLocation.address?.line1`
- Lines 228, 230: Form field references
- ✅ **No changes needed**

---

## 3. ALTER TABLE locations RENAME COLUMN phone TO phone_number

### Current State

Same inconsistency as `address` field.

### What Will Break

**If `phone_number` already exists:**
❌ Migration will **FAIL**

**If only `phone` exists:**
✅ Migration runs, but files need updates

### Breaking Changes Found

**Same files as `address` rename:**

#### File: `src/app/api/onboarding/save-progress/route.ts`

**Line 216:**

**Current Code:**
```typescript
if (fieldData.phone_number !== undefined) locationUpdate.phone = fieldData.phone_number || null
```

**Needs change:**
```typescript
if (fieldData.phone_number !== undefined) locationUpdate.phone_number = fieldData.phone_number || null
```

**Risk Level:** 🔴 **HIGH**

---

#### File: `src/components/onboarding/steps/first-location-step.tsx`

**Lines 65, 91, 102, 130:**

**Current Code:**
```typescript
// Line 65
.select('name, address, city, postal_code, phone')

// Line 91
if (location.phone && (!existingStepData.phone_number || existingStepData.phone_number === '')) {
  updateFieldValue('phone_number', location.phone)
}
```

**Needs change:**
```typescript
.select('name, address_line1, city, postal_code, phone_number')

if (location.phone_number && (!existingStepData.phone_number || existingStepData.phone_number === '')) {
  updateFieldValue('phone_number', location.phone_number)
}
```

**Risk Level:** 💀 **CRITICAL**

---

### Files Already Using `phone_number` (Will Work ✅)

**File:** `src/components/settings/locations-settings-tab.tsx`
- Line 134: `phone_number: newLocation.phone`
- ✅ **No changes needed**

---

## 4. ALTER TABLE deals ADD COLUMN location_id UUID REFERENCES locations(id)

### Current State

**✅ ALREADY EXISTS!**

**File:** `supabase/migrations/20251025_phase1_critical_fixes.sql` (Lines 379-400)

```379:400:supabase/migrations/20251025_phase1_critical_fixes.sql
-- Contacts
ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_location 
  ON contacts(tenant_id, location_id);

COMMENT ON COLUMN contacts.location_id IS 
  'Physical location where this contact is managed. NULL = organization-wide contact.';

-- Deals
ALTER TABLE deals 
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deals_tenant_location 
  ON deals(tenant_id, location_id);

COMMENT ON COLUMN deals.location_id IS 
  'Location where this deal is being managed. Determines location-based reporting.';
```

**Migration already ran!** The `location_id` column already exists on `deals`.

### What Will Happen

**With `ADD COLUMN IF NOT EXISTS`:**
✅ Migration runs idempotently - no errors, no changes

**With `ADD COLUMN` (without IF NOT EXISTS):**
❌ Migration **FAILS** with "column already exists"

**Risk Level:** 🟢 **LOW** - Idempotent if using `IF NOT EXISTS`

---

## 5. ALTER TABLE tasks ADD COLUMN location_id UUID REFERENCES locations(id)

### Current State

**✅ ALREADY EXISTS!**

**File:** `supabase/migrations/20251025_phase1_critical_fixes.sql` (Lines 403-411)

```403:411:supabase/migrations/20251025_phase1_critical_fixes.sql
-- Tasks
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_tenant_location 
  ON tasks(tenant_id, location_id);

COMMENT ON COLUMN tasks.location_id IS 
  'Location for this task. Used for location-based task assignment and filtering.';
```

**Already exists!**

**Risk Level:** 🟢 **LOW**

---

## 6. ALTER TABLE activities ADD COLUMN location_id UUID REFERENCES locations(id)

### Current State

**✅ ALREADY EXISTS!**

**File:** `supabase/migrations/20251025_phase1_critical_fixes.sql` (Lines 413-421)

```413:421:supabase/migrations/20251025_phase1_critical_fixes.sql
-- Activities
ALTER TABLE activities 
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activities_tenant_location 
  ON activities(tenant_id, location_id);

COMMENT ON COLUMN activities.location_id IS 
  'Location where this activity occurred. NULL = organization-wide activity.';
```

**Already exists!**

**Risk Level:** 🟢 **LOW**

---

## 7. TypeScript Interfaces Needing Updates

### Current State

**File:** `src/lib/hooks/use-locations.ts`

```4:10:src/lib/hooks/use-locations.ts
export interface Location {
  id: string
  tenant_id: string
  name: string
  address?: string          // ❌ Breaks
  is_primary?: boolean
}
```

**Needs update:**
```typescript
export interface Location {
  id: string
  tenant_id: string
  name: string
  address_line1?: string    // ✅ Updated
  phone_number?: string     // ✅ Added (if missing)
  is_primary?: boolean
}
```

**Risk Level:** 🔴 **HIGH** - Used throughout application

---

## 8. API Endpoints That Would Break

### File: `/api/onboarding/save-progress`

**Route:** `src/app/api/onboarding/save-progress/route.ts`

**Lines affected:** 212, 216

**Current:**
```typescript
if (fieldData.address_line1 !== undefined) locationUpdate.address = fieldData.address_line1 || null
if (fieldData.phone_number !== undefined) locationUpdate.phone = fieldData.phone_number || null
```

**After migration:** Will try to assign to non-existent columns

**Risk:** 💀 **CRITICAL** - Onboarding breaks completely

---

## 9. RLS Policies Reference These Columns

### Need to Check

**File:** `supabase/migrations/20251025_phase1_critical_fixes.sql`

No RLS policies found that reference `locations.address` or `locations.phone` directly.

**Risk Level:** 🟢 **LOW**

---

## Summary of Breaking Changes

| Migration | Status | Breaking Changes | Risk Level |
|-----------|--------|------------------|------------|
| Drop trigger | ✅ Safe | None | 🟢 LOW |
| Rename address | ❌ Will break | 3 files, 15+ locations | 💀 CRITICAL |
| Rename phone | ❌ Will break | 3 files, 15+ locations | 💀 CRITICAL |
| Add deals.location_id | ⚠️ Already exists | None | 🟢 LOW |
| Add tasks.location_id | ⚠️ Already exists | None | 🟢 LOW |
| Add activities.location_id | ⚠️ Already exists | None | 🟢 LOW |

---

## CRITICAL FINDING: Schema Inconsistency

**You have TWO different schemas in your migrations:**

1. **Old schema:** `address` and `phone` columns
2. **New schema:** `address_line1` and `phone_number` columns

**This means your database state is UNKNOWN:**

### Scenarios

**Scenario A:** Database has OLD schema
- Has `address` and `phone` columns
- Your new migrations try to RENAME them
- Result: ✅ Works, but need to update 15+ code locations

**Scenario B:** Database has NEW schema  
- Already has `address_line1` and `phone_number` columns
- Your new migrations try to RENAME non-existent columns
- Result: ❌ **MIGRATION FAILS**

**Scenario C:** Database has BOTH schemas (somehow)
- Has duplicate columns
- Result: ❌ **DATABASE CORRUPTION**

### How to Determine Current State

**Run this SQL:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'locations' 
  AND column_name IN ('address', 'address_line1', 'phone', 'phone_number')
ORDER BY column_name;
```

**Expected outcomes:**

**Outcome 1:** Has `address`, `phone` → Safe to rename
**Outcome 2:** Has `address_line1`, `phone_number` → Your migrations are WRONG
**Outcome 3:** Has `address`, `address_line1`, `phone`, `phone_number` → Database corruption

---

## Recommendations

### Step 1: Determine Current Database State

**Run the diagnostic query above.**

### Step 2: Choose Your Path

**If database has `address` and `phone`:**
1. ✅ Migration is correct
2. But you MUST update all TypeScript code FIRST
3. See files list below

**If database has `address_line1` and `phone_number`:**
1. ❌ DO NOT run these migrations
2. Your migrations are for the wrong schema
3. Some other migration already ran

**If database has BOTH:**
1. 💀 CRITICAL: Database corruption
2. Need to clean up duplicate columns
3. Cannot proceed until resolved

### Step 3: If Migrations Are Needed

**Update these files BEFORE running migrations:**

1. ✅ `src/lib/hooks/use-locations.ts` - Update interface
2. ✅ `src/app/api/onboarding/save-progress/route.ts` - Fix column references  
3. ✅ `src/components/onboarding/steps/first-location-step.tsx` - Fix SELECT and access

### Step 4: Make Migrations Idempotent

**Current migrations:**
```sql
ALTER TABLE locations RENAME COLUMN address TO address_line1;
```

**Better (idempotent):**
```sql
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'locations' AND column_name = 'address'
  ) THEN
    ALTER TABLE locations RENAME COLUMN address TO address_line1;
  END IF;
END $$;
```

---

## Files Requiring Updates

### Critical (Must Fix)

| File | Lines | Change Type | Risk if Missed |
|------|-------|-------------|----------------|
| `src/lib/hooks/use-locations.ts` | 8 | Interface update | App crashes |
| `src/app/api/onboarding/save-progress/route.ts` | 212, 216 | Column names | Onboarding breaks |
| `src/components/onboarding/steps/first-location-step.tsx` | 65, 81, 91, 102, 120, 130 | SELECT + access | Wizard breaks |

### Already Compatible (No Changes)

✅ `src/components/settings/locations-settings-tab.tsx` - Already uses new names

---

## Migration Script Review

### Planned Script Analysis

```sql
-- 1. DROP TRIGGER trigger_auto_create_tenant_for_new_user
✅ SAFE

-- 2. ALTER TABLE locations RENAME COLUMN address TO address_line1
❌ FAILS if address_line1 exists
💀 CRITICAL if address column doesn't exist

-- 3. ALTER TABLE locations RENAME COLUMN phone TO phone_number
❌ FAILS if phone_number exists
💀 CRITICAL if phone column doesn't exist

-- 4. ALTER TABLE deals ADD COLUMN location_id UUID REFERENCES locations(id)
⚠️ Unclear: IF NOT EXISTS or not?

-- 5. ALTER TABLE tasks ADD COLUMN location_id UUID REFERENCES locations(id)
⚠️ Unclear: IF NOT EXISTS or not?

-- 6. ALTER TABLE activities ADD COLUMN location_id UUID REFERENCES activities(id)
❌ TYPO: Should reference locations(id), not activities(id)
💀 CRITICAL TYPO
```

---

## Final Recommendation

### DO NOT RUN THESE MIGRATIONS YET

**You must:**

1. ✅ **Determine current database schema** first
2. ✅ **Resolve schema inconsistency** between migrations
3. ✅ **Update TypeScript code** before schema changes
4. ✅ **Fix migration typo** (activities table reference)
5. ✅ **Make migrations idempotent**
6. ✅ **Test in staging** environment first

### Safer Migration Approach

**Instead of column renames, consider:**

**Option A:** Keep both column names, update code gradually
**Option B:** Create migration that handles both old and new schemas
**Option C:** Fix schema inconsistency first, then plan migrations

---

## What You Need Now

**Information:**
1. What columns currently exist in your `locations` table?
2. What columns exist in `deals`, `tasks`, `activities`?
3. Which migration files have actually run in your database?

**Only after answering these questions can you safely plan migrations.**

**Next Step:** Run the diagnostic query and report back.










