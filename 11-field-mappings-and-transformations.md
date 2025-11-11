# Field Mappings and Transformations - Complete Matrix

**Date:** December 2024  
**Purpose:** Document ALL field name mismatches between form fields and database columns

---

## EXECUTIVE SUMMARY

**Critical Finding:** There are **field name mismatches** between form fields and database columns that require manual mapping. This creates a risk of data loss if mappings are incorrect.

**Key Mismatches:**
- `address_line1` (form) → `address` (DB)
- `phone_number` (form) → `phone` (DB)

---

## 1. COMPLETE DATABASE COLUMN LIST

### TABLE: app_users

**Base Schema:** `supabase/sql/01_initial_schema.sql:16-22`  
**Enhancements:** Multiple migrations add columns

| # | Column | Type | Nullable | Default | Description |
|---|--------|------|----------|---------|-------------|
| 1 | `id` | UUID | NOT NULL | - | PK, FK to `auth.users(id)` |
| 2 | `tenant_id` | UUID | NULLABLE | NULL | Legacy field (FK to `tenants(id)`) |
| 3 | `active_tenant_id` | UUID | NULLABLE | NULL | Current session tenant |
| 4 | `active_location_id` | UUID | NULLABLE | NULL | Current session location |
| 5 | `default_tenant_id` | UUID | NULLABLE | NULL | Preferred default tenant |
| 6 | `default_location_id` | UUID | NULLABLE | NULL | Preferred default location |
| 7 | `full_name` | TEXT | NOT NULL | - | User's full name |
| 8 | `professional_title` | TEXT | NULLABLE | NULL | Job title |
| 9 | `phone_mobile` | TEXT | NULLABLE | NULL | Mobile phone |
| 10 | `phone_office` | TEXT | NULLABLE | NULL | Office phone |
| 11 | `bio` | TEXT | NULLABLE | NULL | Biography |
| 12 | `profile_photo_url` | TEXT | NULLABLE | NULL | Profile photo URL |
| 13 | `email` | TEXT | NULLABLE | NULL | Email address |
| 14 | `role` | TEXT | NOT NULL | - | Legacy role field |
| 15 | `status` | TEXT | NULLABLE | 'active' | Account status |
| 16 | `timezone` | TEXT | NULLABLE | 'Europe/London' | User timezone |
| 17 | `onboarding_completed` | BOOLEAN | NULLABLE | FALSE | Onboarding status |
| 18 | `onboarding_current_step` | TEXT | NULLABLE | NULL | Current onboarding step |
| 19 | `onboarding_started_at` | TIMESTAMPTZ | NULLABLE | NULL | When onboarding started |
| 20 | `onboarding_completed_at` | TIMESTAMPTZ | NULLABLE | NULL | When onboarding completed |
| 21 | `onboarding_flow_type` | TEXT | NULLABLE | NULL | 'solo' or 'organization' |
| 22 | `onboarding_skipped_steps` | TEXT[] | NULLABLE | NULL | Array of skipped step IDs |
| 23 | `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Record creation |
| 24 | `updated_at` | TIMESTAMPTZ | NULLABLE | NOW() | Last update |

**Total Columns:** 24+ (additional columns added in various migrations)

### TABLE: tenants

| # | Column | Type | Nullable | Default |
|---|--------|------|----------|---------|
| 1 | `id` | UUID | NOT NULL | `gen_random_uuid()` |
| 2 | `name` | TEXT | NOT NULL | - |
| 3 | `description` | TEXT | NULLABLE | NULL |
| 4 | `specialty` | TEXT | NULLABLE | NULL |
| 5 | `logo_url` | TEXT | NULLABLE | NULL |
| 6 | `website_url` | TEXT | NULLABLE | NULL |
| 7 | `industry` | TEXT | NULLABLE | NULL |
| 8 | `company_size` | TEXT | NULLABLE | NULL |
| 9 | `founded_date` | DATE | NULLABLE | NULL |
| 10 | `timezone` | TEXT | NOT NULL | 'Europe/London' |
| 11 | `account_type` | TEXT | NULLABLE | 'practice' |
| 12 | `is_multi_location` | BOOLEAN | NULLABLE | FALSE |
| 13 | `created_at` | TIMESTAMPTZ | NOT NULL | NOW() |
| 14 | `updated_at` | TIMESTAMPTZ | NULLABLE | NOW() |

### TABLE: locations

| # | Column | Type | Nullable | Default |
|---|--------|------|----------|---------|
| 1 | `id` | UUID | NOT NULL | `gen_random_uuid()` |
| 2 | `tenant_id` | UUID | NOT NULL | - |
| 3 | `name` | TEXT | NOT NULL | - |
| 4 | `display_name` | TEXT | NULLABLE | NULL |
| 5 | `address` | TEXT | NULLABLE | NULL |
| 6 | `city` | TEXT | NULLABLE | NULL |
| 7 | `postal_code` | TEXT | NULLABLE | NULL |
| 8 | `phone` | TEXT | NULLABLE | NULL |
| 9 | `email` | TEXT | NULLABLE | NULL |
| 10 | `is_active` | BOOLEAN | NOT NULL | TRUE |
| 11 | `is_primary` | BOOLEAN | NULLABLE | FALSE |
| 12 | `created_at` | TIMESTAMPTZ | NOT NULL | NOW() |
| 13 | `updated_at` | TIMESTAMPTZ | NULLABLE | NOW() |

**Note:** `address` and `phone` are key fields that don't match form field names.

### TABLE: user_tenant_memberships

| # | Column | Type | Nullable | Default |
|---|--------|------|----------|---------|
| 1 | `id` | UUID | NOT NULL | `gen_random_uuid()` |
| 2 | `user_id` | UUID | NOT NULL | - |
| 3 | `tenant_id` | UUID | NOT NULL | - |
| 4 | `role` | `membership_role` | NOT NULL | - |
| 5 | `status` | `membership_status` | NOT NULL | 'active' |
| 6 | `all_locations` | BOOLEAN | NULLABLE | NULL |
| 7 | `invited_by` | UUID | NULLABLE | NULL |
| 8 | `invited_at` | TIMESTAMPTZ | NULLABLE | NULL |
| 9 | `joined_at` | TIMESTAMPTZ | NOT NULL | NOW() |
| 10 | `created_at` | TIMESTAMPTZ | NOT NULL | NOW() |
| 11 | `updated_at` | TIMESTAMPTZ | NOT NULL | NOW() |

### TABLE: onboarding_progress

| # | Column | Type | Nullable | Default |
|---|--------|------|----------|---------|
| 1 | `id` | UUID | NOT NULL | `gen_random_uuid()` |
| 2 | `user_id` | UUID | NOT NULL | - |
| 3 | `tenant_id` | UUID | NOT NULL | - |
| 4 | `step_id` | TEXT | NOT NULL | - |
| 5 | `field_data` | JSONB | NULLABLE | '{}' |
| 6 | `completed` | BOOLEAN | NOT NULL | FALSE |
| 7 | `skipped` | BOOLEAN | NOT NULL | FALSE |
| 8 | `skipped_at` | TIMESTAMPTZ | NULLABLE | NULL |
| 9 | `validation_errors` | JSONB | NULLABLE | NULL |
| 10 | `created_at` | TIMESTAMPTZ | NOT NULL | NOW() |
| 11 | `updated_at` | TIMESTAMPTZ | NULLABLE | NOW() |

---

## 2. COMPLETE FORM FIELD LIST

### FILE: personal-info-step.tsx

**Form Fields (from `formData['profile_setup']`):**

1. `full_name`: string
2. `professional_title`: string
3. `phone_mobile`: string
4. `phone_office`: string
5. `bio`: string
6. `profile_photo_url`: string

### FILE: company-info-step.tsx

**Form Fields (from `formData['organization_setup']`):**

1. `name`: string
2. `description`: string
3. `specialty`: string
4. `logo_url`: string
5. `website_url`: string (if exists)
6. `industry`: string (if exists)
7. `company_size`: string (if exists)
8. `founded_date`: date (if exists)

### FILE: first-location-step.tsx

**Form Fields (from `formData['location_setup']`):**

1. `name`: string
2. `address_line1`: string ⚠️ **MISMATCH**
3. `city`: string
4. `postal_code`: string
5. `phone_number`: string ⚠️ **MISMATCH**

---

## 3. FIELD MAPPING MATRIX

| Step | Form Field | DB Table | DB Column | Match? | Notes |
|------|-----------|----------|-----------|--------|-------|
| profile | `full_name` | app_users | `full_name` | ✅ YES | Direct match |
| profile | `professional_title` | app_users | `professional_title` | ✅ YES | Direct match |
| profile | `phone_mobile` | app_users | `phone_mobile` | ✅ YES | Direct match |
| profile | `phone_office` | app_users | `phone_office` | ✅ YES | Direct match |
| profile | `bio` | app_users | `bio` | ✅ YES | Direct match |
| profile | `profile_photo_url` | app_users | `profile_photo_url` | ✅ YES | Direct match |
| organization | `name` | tenants | `name` | ✅ YES | Direct match |
| organization | `description` | tenants | `description` | ✅ YES | Direct match |
| organization | `specialty` | tenants | `specialty` | ✅ YES | Direct match |
| organization | `logo_url` | tenants | `logo_url` | ✅ YES | Direct match |
| location | `name` | locations | `name` | ✅ YES | Direct match |
| location | `address_line1` | locations | `address` | ❌ **NO** | Manual mapping required |
| location | `city` | locations | `city` | ✅ YES | Direct match |
| location | `postal_code` | locations | `postal_code` | ✅ YES | Direct match |
| location | `phone_number` | locations | `phone` | ❌ **NO** | Manual mapping required |

**Mismatches Found:** 2

---

## 4. MANUAL MAPPING CODE

### Location Step - Save Progress

**File:** `src/app/api/onboarding/save-progress/route.ts:211-216`

```typescript
const locationUpdate: any = {}
if (fieldData.name !== undefined) locationUpdate.name = fieldData.name || null
// Map form field 'address_line1' to database column 'address'
if (fieldData.address_line1 !== undefined) locationUpdate.address = fieldData.address_line1 || null
if (fieldData.city !== undefined) locationUpdate.city = fieldData.city || null
if (fieldData.postal_code !== undefined) locationUpdate.postal_code = fieldData.postal_code || null
// Map form field 'phone_number' to database column 'phone'
if (fieldData.phone_number !== undefined) locationUpdate.phone = fieldData.phone_number || null
```

### Location Step - Load Existing Data

**File:** `src/components/onboarding/steps/first-location-step.tsx:81-92`

```typescript
// Map 'address' (DB) to 'address_line1' (form field)
if (location.address && (!existingStepData.address_line1 || existingStepData.address_line1 === '')) {
  updateFieldValue('address_line1', location.address)
}
// Map 'phone' (DB) to 'phone_number' (form field)
if (location.phone && (!existingStepData.phone_number || existingStepData.phone_number === '')) {
  updateFieldValue('phone_number', location.phone)
}
```

---

## 5. DATA TRANSFORMATION FUNCTIONS

**Status:** ❌ **NOT FOUND** - No dedicated transformation functions found

**Current Approach:** Manual mapping in:
1. Step components (load data)
2. Save progress API (save data)

**Recommendation:** Create mapping layer for consistency.

---

## 6. API REQUEST/RESPONSE TRANSFORMATIONS

### Config API Response

**File:** `src/app/api/onboarding/config/route.ts`

**Returns:** Raw step configuration (no field transformation)

### Resume API Response

**File:** `src/app/api/onboarding/resume/route.ts`

**Returns:** `field_data` as stored in `onboarding_progress.field_data` (JSONB)

**Structure:**
```json
{
  "savedData": {
    "profile_setup": {
      "full_name": "...",
      "professional_title": "..."
    },
    "organization_setup": {
      "name": "...",
      "description": "..."
    },
    "location_setup": {
      "name": "...",
      "address_line1": "...",  // Form field name (not DB column)
      "phone_number": "..."    // Form field name (not DB column)
    }
  }
}
```

### Save API - What Structure Is Saved?

**File:** `src/app/api/onboarding/save-progress/route.ts`

**Saves to `onboarding_progress.field_data`:** Form field structure (NOT database structure)

**Example:**
```json
{
  "field_data": {
    "address_line1": "123 Main St",  // Form field name
    "phone_number": "555-1234"       // Form field name
  }
}
```

**Saves to database tables:** Mapped structure (address → `address`, phone_number → `phone`)

---

## 7. INCONSISTENCY RISK ANALYSIS

### Mismatches and Risk Levels

| Mismatch | Risk Level | Impact | Code Location |
|----------|-----------|--------|---------------|
| `address_line1` → `address` | 🟡 **MEDIUM** | Data loss if mapping missed | `save-progress/route.ts:212`, `first-location-step.tsx:81` |
| `phone_number` → `phone` | 🟡 **MEDIUM** | Data loss if mapping missed | `save-progress/route.ts:216`, `first-location-step.tsx:91` |

### Code That Could Break

**Scenario:** New developer adds location field without knowing mapping requirement

```typescript
// ❌ WRONG - Would save to wrong column
locationUpdate.address_line1 = fieldData.address_line1  // Column doesn't exist!

// ✅ CORRECT - Manual mapping
locationUpdate.address = fieldData.address_line1  // Maps to correct column
```

**Risk:** High - Easy to make mistake, no type safety or validation.

---

## 8. STANDARDIZATION OPTIONS

### Option A: Rename DB Columns ✅ (RECOMMENDED)

**SQL Changes:**

```sql
ALTER TABLE locations RENAME COLUMN address TO address_line1;
ALTER TABLE locations RENAME COLUMN phone TO phone_number;
```

**Impact:**
- ✅ Eliminates mapping code
- ✅ Type safety (no mismatches)
- ✅ Consistency with form fields
- ⚠️ Requires data migration for existing data
- ⚠️ Updates all queries using these columns

**Files to Update:** All queries referencing `locations.address` and `locations.phone`

### Option B: Rename Form Fields

**Changes:**
- `address_line1` → `address`
- `phone_number` → `phone`

**Impact:**
- ✅ Matches database
- ⚠️ Breaks existing saved progress (field_data JSON)
- ⚠️ Less descriptive field names

### Option C: Create Mapping Layer

**Proposed Implementation:**

```typescript
// src/lib/field-mappings.ts
export const FIELD_MAPPINGS = {
  location_setup: {
    address_line1: 'address',
    phone_number: 'phone'
  }
}

export function mapFormToDatabase(stepId: string, formData: Record<string, any>) {
  const mappings = FIELD_MAPPINGS[stepId] || {}
  const mapped: Record<string, any> = {}
  
  for (const [formField, dbColumn] of Object.entries(mappings)) {
    if (formData[formField] !== undefined) {
      mapped[dbColumn] = formData[formField]
    } else {
      mapped[formField] = formData[formField]  // Direct mapping if no mapping defined
    }
  }
  
  return mapped
}

export function mapDatabaseToForm(stepId: string, dbData: Record<string, any>) {
  const mappings = FIELD_MAPPINGS[stepId] || {}
  const mapped: Record<string, any> = {}
  
  for (const [formField, dbColumn] of Object.entries(mappings)) {
    if (dbData[dbColumn] !== undefined) {
      mapped[formField] = dbData[dbColumn]
    }
  }
  
  // Also include direct matches
  for (const [key, value] of Object.entries(dbData)) {
    if (!mapped[key]) {
      mapped[key] = value
    }
  }
  
  return mapped
}
```

**Usage:**
```typescript
// In save-progress API
const mapped = mapFormToDatabase('location_setup', fieldData)
// mapped.address = fieldData.address_line1
// mapped.phone = fieldData.phone_number

// In step component
const formData = mapDatabaseToForm('location_setup', location)
// formData.address_line1 = location.address
// formData.phone_number = location.phone
```

**Impact:**
- ✅ Centralized mapping logic
- ✅ Type safety possible with TypeScript
- ✅ Easy to add new mappings
- ⚠️ Adds abstraction layer
- ⚠️ Must remember to use mapping functions

---

## SUMMARY

### Current State

- ✅ Most fields match directly
- ❌ 2 field name mismatches require manual mapping
- ⚠️ No centralized mapping layer
- ⚠️ Risk of data loss if mapping code is missed

### Recommendations

1. **Short-term:** Document all mappings clearly
2. **Medium-term:** Create mapping layer (Option C)
3. **Long-term:** Rename database columns (Option A) for consistency

---

**Document Status:** ✅ COMPLETE  
**Last Updated:** December 2024










