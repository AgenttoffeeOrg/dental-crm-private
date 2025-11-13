# Pre-Migration Impact Analysis - Executive Summary

**Date:** January 2025  
**Risk Assessment:** 💀 **CRITICAL - DO NOT RUN MIGRATIONS**

---

## 🚨 STOP - DO NOT RUN THESE MIGRATIONS YET

Your planned migrations have **critical issues** that will cause:

1. **Schema inconsistency** confusion
2. **Application crashes** if code isn't updated
3. **Migration failures** if columns already exist
4. **Typo** that would corrupt the activities table

---

## Critical Findings

### 1. Schema Inconsistency 💀 CRITICAL

**You have TWO different schemas in your migrations:**

**Old Schema:**

```sql
CREATE TABLE locations (
  address TEXT,
  phone TEXT,
)
```

**New Schema:**

```sql
CREATE TABLE locations (
  address_line1 TEXT,
  phone_number TEXT,
)
```

**Both schemas exist in different migration files.**

**Impact:** Unknown current state. Migrations may fail or be completely wrong.

**Action Required:** Run `DIAGNOSTIC_SCHEMA_CHECK.sql` FIRST to determine which schema is active.

---

### 2. Column Rename Will Break Code 💀 CRITICAL

**If you run:** `ALTER TABLE locations RENAME COLUMN address TO address_line1`

**These files will break:**

#### File: `src/app/api/onboarding/save-progress/route.ts`

**Lines: 212, 216**

**Current:**

```typescript
if (fieldData.address_line1 !== undefined) locationUpdate.address = fieldData.address_line1 || null;
if (fieldData.phone_number !== undefined) locationUpdate.phone = fieldData.phone_number || null;
```

**Problem:** Code assigns to `locationUpdate.address` - column no longer exists after rename

**Impact:** Onboarding flow will completely break

---

#### File: `src/components/onboarding/steps/first-location-step.tsx`

**Lines: 65, 81, 91, 102, 120, 130**

**Current:**

```typescript
// Line 65 - SELECT statement
.select('name, address, city, postal_code, phone')

// Line 81 - Access
if (location.address && (!existingStepData.address_line1 || existingStepData.address_line1 === '')) {
  updateFieldValue('address_line1', location.address)
}
```

**Problem:**

1. SQL SELECT returns `address` column that no longer exists
2. JavaScript reads `location.address` property that won't exist

**Impact:** Wizard completely breaks, users cannot complete onboarding

---

#### File: `src/lib/hooks/use-locations.ts`

**Line: 8**

**Current:**

```typescript
export interface Location {
  id: string;
  tenant_id: string;
  name: string;
  address?: string; // ❌ Wrong after migration
  is_primary?: boolean;
}
```

**Problem:** TypeScript interface expects `address`, database will have `address_line1`

**Impact:** Type errors across entire application

---

### 3. Unnecessary Column Additions 🟢 LOW

**These columns already exist:**

```sql
ALTER TABLE deals ADD COLUMN location_id
ALTER TABLE tasks ADD COLUMN location_id
ALTER TABLE activities ADD COLUMN location_id
```

**Status:** ✅ Already added by `supabase/migrations/20251025_phase1_critical_fixes.sql`

**Impact:** Migration will fail if not using `ADD COLUMN IF NOT EXISTS`

---

### 4. Critical Typo 💀 CRITICAL

**Planned migration:**

```sql
ALTER TABLE activities ADD COLUMN location_id UUID REFERENCES activities(id)
                                                            ^^^^^^^^^^^^
```

**WRONG:** References `activities(id)` (circular reference)

**Correct:**

```sql
ALTER TABLE activities ADD COLUMN location_id UUID REFERENCES locations(id)
```

**Impact:** Foreign key constraint would be completely wrong (if migration even succeeds)

---

## Files Requiring Updates

### Before Running Migrations, Update These Files:

| File                                                      | Lines   | Required Change                                                                 | Risk if Missed    |
| --------------------------------------------------------- | ------- | ------------------------------------------------------------------------------- | ----------------- |
| `src/lib/hooks/use-locations.ts`                          | 8       | Change `address?: string` to `address_line1?: string`                           | App crashes       |
| `src/app/api/onboarding/save-progress/route.ts`           | 212     | Change `locationUpdate.address` to `locationUpdate.address_line1`               | Onboarding breaks |
| `src/app/api/onboarding/save-progress/route.ts`           | 216     | Change `locationUpdate.phone` to `locationUpdate.phone_number`                  | Onboarding breaks |
| `src/components/onboarding/steps/first-location-step.tsx` | 65      | Change `.select('name, address, ...')` to `.select('name, address_line1, ...')` | Wizard breaks     |
| `src/components/onboarding/steps/first-location-step.tsx` | 81, 120 | Change `location.address` to `location.address_line1`                           | Wizard breaks     |
| `src/components/onboarding/steps/first-location-step.tsx` | 91, 130 | Change `location.phone` to `location.phone_number`                              | Wizard breaks     |

---

## Migration Readiness Checklist

**Before you can safely run these migrations:**

- [ ] **Run diagnostic:** Execute `DIAGNOSTIC_SCHEMA_CHECK.sql` to determine current schema
- [ ] **Resolve inconsistency:** Decide which schema is canonical
- [ ] **Update TypeScript:** Fix all 6 breaking code locations
- [ ] **Fix typo:** Correct `activities(id)` → `locations(id)`
- [ ] **Make idempotent:** Add `IF NOT EXISTS` checks
- [ ] **Test:** Run migrations in staging first
- [ ] **Verify:** Confirm no broken queries after migration

---

## Recommended Action Plan

### Phase 1: Diagnosis (Required First)

```bash
# Run this SQL file in your Supabase SQL editor
DIAGNOSTIC_SCHEMA_CHECK.sql
```

**Determine:**

1. Does `locations.address` exist?
2. Does `locations.address_line1` exist?
3. Does `locations.phone` exist?
4. Does `locations.phone_number` exist?

**Scenarios:**

**A. Only old columns exist** → Safe to migrate, update code first  
**B. Only new columns exist** → Migrations wrong, don't run  
**C. Both exist** → Database corruption, cleanup needed  
**D. Neither exist** → Locations table missing or renamed

### Phase 2: Fix Code (If Schema A)

Update the 6 files listed above before running migrations.

### Phase 3: Create Safe Migrations

**Instead of simple renames, use:**

```sql
-- Safe, idempotent migration
DO $$
BEGIN
  -- Only rename if old column exists and new doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'address'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'address_line1'
  ) THEN
    ALTER TABLE locations RENAME COLUMN address TO address_line1;
    RAISE NOTICE 'Renamed address to address_line1';
  ELSE
    RAISE NOTICE 'address column already migrated or missing';
  END IF;

  -- Same for phone
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'phone'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE locations RENAME COLUMN phone TO phone_number;
    RAISE NOTICE 'Renamed phone to phone_number';
  ELSE
    RAISE NOTICE 'phone column already migrated or missing';
  END IF;
END $$;
```

### Phase 4: Skip Unnecessary Adds

**For deals, tasks, activities:**

```sql
-- Already exists, skip
-- ALTER TABLE deals ADD COLUMN location_id ... (skip)
-- ALTER TABLE tasks ADD COLUMN location_id ... (skip)
-- ALTER TABLE activities ADD COLUMN location_id ... (skip - but fix typo if running)
```

---

## Summary

### Current State

❌ **Unknown:** Which schema is active in your database  
❌ **Will break:** 6 TypeScript files if migrations run  
❌ **Typo:** Wrong foreign key reference in planned migration  
❌ **Redundant:** Trying to add columns that already exist

### Required Actions

1. ✅ **Diagnose first** - Run `DIAGNOSTIC_SCHEMA_CHECK.sql`
2. ✅ **Fix code** - Update 6 TypeScript files
3. ✅ **Fix typo** - Correct activities reference
4. ✅ **Make safe** - Use idempotent migration pattern
5. ✅ **Test** - Run in staging environment

### Estimated Time

- Diagnosis: 5 minutes
- Fix code: 30 minutes
- Create safe migrations: 15 minutes
- Testing: 30 minutes

**Total: ~2 hours of work**

---

## Next Steps

**DO NOT RUN YOUR MIGRATIONS YET.**

**Instead:**

1. Open Supabase SQL Editor
2. Run `DIAGNOSTIC_SCHEMA_CHECK.sql`
3. Report back the findings
4. Wait for updated migration script
5. Update TypeScript code first
6. Then run safe migrations

**Only proceed after completing all steps above.**
