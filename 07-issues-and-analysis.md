# Issues, Race Conditions & Root Cause Analysis

## Overview

This document identifies all issues, race conditions, data source conflicts, and root causes found during the architecture audit. It includes a detailed trace of the `toffeehegde@gmail.com` case and answers critical questions.

---

## Race Conditions Identified

### 1. Wizard Initialization

**Issue:** Is config guaranteed to load before steps mount?

**Answer:** **No.**

**Code Analysis:**
```typescript
// src/contexts/wizard-context.tsx (line 98-100)
useEffect(() => {
  initializeWizard()
}, [])

// initializeWizard() is async but steps array starts empty
const [steps, setSteps] = useState<WizardStep[]>([])

// Component may render before steps are loaded
const currentStepId = steps[currentStep - 1]?.stepId || ''
```

**Problem:**
- `steps` array is empty initially
- Components that use `currentStepId` may render before `steps` is populated
- Optional chaining (`?.`) handles this, but `currentStepId` will be empty string initially

**Impact:** Low - handled with optional chaining, but could cause flicker or empty state

**Fix:** Show loading state until `steps.length > 0`

---

**Issue:** Is `steps` array guaranteed before `currentStepId` is accessed?

**Answer:** **No.**

**Code:**
```typescript
const currentStepId = steps[currentStep - 1]?.stepId || ''
```

**Problem:** If `steps` is empty, `currentStepId = ''`

**Mitigation:** Components check `if (!currentStepData) return <Error />`

**Fix:** Ensure `steps` is loaded before rendering step components

---

### 2. useEffect Dependencies

**Issue:** List all step components with empty dependency arrays `[]`

**Found:**

1. **PersonalInfoStep** (line 38):
   ```typescript
   useEffect(() => {
     loadExistingProfile()
   }, [])  // ❌ Empty array
   ```

2. **Other steps** use `[currentStepId]` - ✅ Better

**Problem:** 
- `loadExistingProfile()` runs only once on mount
- If step is navigated away and back, data won't reload
- Should re-run when step becomes active

**Should they have `[currentStepId]` instead?**

**Yes.** Pattern should be:
```typescript
useEffect(() => {
  if (currentStepId === 'profile_setup') {
    loadExistingProfile()
  }
}, [currentStepId])  // ✅ Re-run when step changes
```

**Examples of Good Pattern:**
- **CompanyInfoStep** (line 44): Uses `[currentStepId]` ✅
- **FirstLocationStep** (line 32): Uses `[currentStepId]` ✅

---

### 3. Async Operations

**Issue:** Are multiple async calls happening in parallel?

**Yes, in wizard initialization:**
```typescript
// Config API call
const configResponse = await fetch('/api/onboarding/config')
// ... process config

// Resume API call (sequential, not parallel)
const resumeResponse = await fetch('/api/onboarding/resume')
```

**Current:** Sequential (await each call) - ✅ Safe

**Could they overwrite each other?**

**Possible scenario:**
1. User navigates away from wizard
2. Another component calls `saveStepData` while initialization is running
3. `formData` state updates could conflict

**Mitigation:** `loading` state prevents interaction during initialization

**Fix:** Add cancellation token or check `loading` before state updates

---

## Data Source Conflicts

### 1. Multiple Data Sources

**List all sources where wizard data can come from:**

1. **Database Tables:**
   - `app_users` (profile data: full_name, professional_title, phone, bio)
   - `tenants` (org data: name, description, specialty)
   - `locations` (location data: name, address, city, phone)

2. **API Responses:**
   - `GET /api/onboarding/config` (step configuration)
   - `GET /api/onboarding/resume` (saved progress)

3. **Saved Progress:**
   - `onboarding_progress` table (field_data JSONB)
   - `app_users.onboarding_current_step` (current step ID)
   - `app_users.onboarding_skipped_steps` (skipped step IDs)

4. **Component State:**
   - `formData` in WizardProvider context
   - Local component state (e.g., `uploading`, `photoUrl`)

---

### 2. Precedence Issues

**Issue:** If database has `org.name = "ABC Dental"` and saved progress has `org.name = ""`, which wins?

**Current Logic:**

**File:** `src/components/onboarding/steps/company-info-step.tsx` (line 86)

```typescript
if (tenant.name && (!existingStepData.name || existingStepData.name === '')) {
  updateFieldValue('name', tenant.name)
}
```

**Condition Analysis:**
- `tenant.name`: Database value exists (e.g., "ABC Dental")
- `existingStepData.name`: From saved progress (e.g., "")
- Condition: `tenant.name && (!existingStepData.name || existingStepData.name === '')`
- Evaluation: `"ABC Dental" && (!"" || "" === "")` = `"ABC Dental" && (true || true)` = `true`
- **Result:** DB data IS pre-filled ✅

**However:** The condition is confusing. Better logic:
```typescript
if (tenant.name && !existingStepData?.name?.trim()) {
  updateFieldValue('name', tenant.name)
}
```

**Answer:** **Database wins** (if saved progress has empty string or missing value).

**Show the actual code that decides:**

**CompanyInfoStep** (line 86):
```typescript
if (tenant.name && (!existingStepData.name || existingStepData.name === '')) {
  updateFieldValue('name', tenant.name)
}
```

**FirstLocationStep** (line 77):
```typescript
if (location.name && (!existingStepData.name || existingStepData.name === '')) {
  updateFieldValue('name', location.name)
}
```

**Pattern:** DB data pre-fills if formData is empty or missing.

---

### 3. Empty String vs Undefined

**Issue:** How is empty data stored in saved progress?

**Storage:**
```typescript
// When saving
fieldData: { name: '' }  // Empty string
// OR
fieldData: { name: undefined }  // Undefined (omitted)
```

**How does `!stepData.name` behave for each?**

**Test Cases:**
1. `{ name: '' }` → `!stepData.name` = `!''` = `true`
2. `{ name: undefined }` → `!stepData.name` = `!undefined` = `true`
3. `{ }` (missing) → `!stepData.name` = `!undefined` = `true`

**All evaluate to `true`**, so condition `!existingStepData.name` works for all three cases.

**Issue:** What if saved progress has `{ name: '   ' }` (whitespace)?

**Current logic:** `existingStepData.name === ''` is `false`, so DB data is NOT pre-filled ❌

**Fix:** Use `.trim()` check:
```typescript
if (tenant.name && !existingStepData?.name?.trim()) {
  updateFieldValue('name', tenant.name)
}
```

---

## The toffeehegde@gmail.com Case

**Scenario:** User has org in database ✅, has location in database ✅, but opens wizard and sees empty forms ❌

**Step-by-step trace:**

### 1. User opens wizard

**Action:** Navigates to `/onboarding` or clicks "Complete Setup"

**State:** 
- `app_users.active_tenant_id` = `tenant-abc` ✅
- `tenants.name` = "ABC Dental" ✅
- `locations.name` = "Main Office" ✅

---

### 2. `initializeWizard()` runs

**File:** `src/contexts/wizard-context.tsx` (line 102)

**What happens:**
```typescript
setLoading(true)
// Calls GET /api/onboarding/config
// Calls GET /api/onboarding/resume
setLoading(false)
```

**State after initialization:**
- `steps` = `[{ stepId: 'email_verification' }, { stepId: 'profile_setup' }, { stepId: 'organization_setup' }, { stepId: 'location_setup' }]`
- `formData` = `{}` (from resume API, if no saved progress)
- `currentStep` = `1` (or resume step index)

---

### 3. Config API called

**File:** `src/app/api/onboarding/config/route.ts`

**What returns based on DB state:**

**User has tenant:**
```typescript
const tenantId = appUser.active_tenant_id || appUser.tenant_id  // = "tenant-abc"
```

**Response:**
```json
{
  "accountType": "organization",
  "tenantId": "tenant-abc",
  "hasOrganization": true,
  "steps": [
    { "stepId": "email_verification", ... },
    { "stepId": "profile_setup", ... },
    { "stepId": "organization_setup", ... },  // ✅ Included because tenantId exists
    { "stepId": "location_setup", ... }        // ✅ Included because tenantId exists
  ],
  "totalSteps": 4
}
```

**State after config:**
- `steps` = `[4 steps]` ✅
- `accountType` = `'organization'` ✅

---

### 4. Resume API called

**File:** `src/app/api/onboarding/resume/route.ts`

**What returns:**

**If user has saved progress:**
```json
{
  "canResume": true,
  "resumeFromStep": "organization_setup",
  "savedData": {
    "organization_setup": {
      "name": ""  // ❌ Empty string from previous save
    }
  },
  "completedSteps": ["email_verification", "profile_setup"],
  "skippedSteps": []
}
```

**If user has NO saved progress:**
```json
{
  "canResume": false,
  "resumeFromStep": "email_verification",
  "savedData": {},
  "completedSteps": [],
  "skippedSteps": []
}
```

**State after resume:**
- `formData` = `{ organization_setup: { name: '' } }` (if saved progress exists) ❌
- OR `formData` = `{}` (if no saved progress) ✅

---

### 5. Wizard sets state

**File:** `src/contexts/wizard-context.tsx` (line 131)

```typescript
setFormData(resumeData.savedData || {})  // = { organization_setup: { name: '' } }
```

**State:**
- `formData['organization_setup']` = `{ name: '' }` ❌ (empty string)

---

### 6. Organization step mounts

**File:** `src/components/onboarding/steps/company-info-step.tsx`

**What happens:**
```typescript
const stepData = formData[currentStepId] || {}  // = { name: '' }
```

**State:**
- `stepData.name` = `''` (empty string)

---

### 7. `loadExistingData()` runs

**File:** `src/components/onboarding/steps/company-info-step.tsx` (line 52)

**What queries:**
```typescript
const { data: tenant } = await supabase
  .from('tenants')
  .select('name, description, specialty, ...')
  .eq('id', tenantId)
  .single()
```

**Returns:**
```typescript
tenant = { name: 'ABC Dental', description: '...', ... }  // ✅ DB has data
```

---

### 8. `currentStepId` value

**At this point:**
```typescript
currentStepId = 'organization_setup'  // ✅ Correct
```

---

### 9. `updateFieldValue('name', 'ABC Dental')` called

**Condition check (line 86):**
```typescript
if (tenant.name && (!existingStepData.name || existingStepData.name === '')) {
  updateFieldValue('name', tenant.name)
}
```

**Evaluation:**
- `tenant.name` = `'ABC Dental'` ✅
- `existingStepData.name` = `''` (from saved progress) ✅
- Condition: `'ABC Dental' && (!'' || '' === '')` = `'ABC Dental' && (true || true)` = `true` ✅
- **Should call:** `updateFieldValue('name', 'ABC Dental')` ✅

**What happens:**
```typescript
setFormData(prev => ({
  ...prev,
  ['organization_setup']: {
    ...prev['organization_setup'],
    name: 'ABC Dental'  // ✅ Should update
  }
}))
```

**State after update:**
- `formData['organization_setup'].name` = `'ABC Dental'` ✅

---

### 10. Form shows

**What value:**
```typescript
<Input
  value={stepData.name || ''}  // = 'ABC Dental' (from formData)
/>
```

**Should display:** "ABC Dental" ✅

---

## Identify the Exact Point Where Data Gets Lost

**Analysis of trace above:**

**The logic SHOULD work:**
1. DB has `name = 'ABC Dental'` ✅
2. Saved progress has `name = ''` ❌
3. Condition checks `!existingStepData.name || existingStepData.name === ''` ✅
4. Should pre-fill from DB ✅

**BUT:** There may be a **timing issue**:

**Race condition:**
1. Component mounts with `formData['organization_setup'] = { name: '' }`
2. Input renders with `value={stepData.name}` = `''`
3. `useEffect` runs `loadExistingData()` (async)
4. User may see empty input before `updateFieldValue` runs
5. If user starts typing, their input overwrites DB data

**OR:** The `useEffect` dependency might be wrong:

**Current:**
```typescript
useEffect(() => {
  if (currentStepId === 'organization_setup') {
    loadExistingData()
  }
}, [currentStepId])  // ✅ Good dependency
```

**BUT:** `formData` is not in dependency array, so if `formData` changes after mount, `loadExistingData` won't re-run.

**Issue:** If `formData` is set AFTER component mounts, the pre-fill logic runs with stale `formData`.

**Timeline:**
```
T0: Component mounts, formData = {}
T1: useEffect runs, checks formData['organization_setup'] = {} (empty)
T2: Query DB, gets tenant.name = 'ABC Dental'
T3: Check condition: !{} || {} === '' → should pre-fill
T4: Resume API completes, sets formData['organization_setup'] = { name: '' }
T5: Component re-renders with formData['organization_setup'] = { name: '' }
T6: Input shows empty string
```

**Root Cause:** `loadExistingData()` runs BEFORE `formData` is set from Resume API.

**Fix:** Add `formData` to dependency array, or run pre-fill logic after both config and resume APIs complete.

---

## Gaps & Issues Found

### Checklist

- [x] **Orphaned `app_users` state**
  - Signup creates `auth.users` but `app_users` creation may fail
  - Leaves orphaned auth user

- [x] **Race conditions**
  - Wizard initialization: steps may be empty when components render
  - Data loading: `loadExistingData()` may run before `formData` is set from Resume API

- [x] **Data source conflicts**
  - Database vs saved progress precedence logic is confusing
  - Empty string vs undefined handling inconsistent

- [x] **Missing null checks**
  - `currentStepId` can be empty string if `steps` is empty
  - Components should check `currentStepData` before rendering

- [x] **Incorrect useEffect dependencies**
  - `PersonalInfoStep` uses `[]` instead of `[currentStepId]`
  - Missing `formData` dependency in some hooks

- [x] **Field name mismatches**
  - Database: `locations.address` → Form: `address_line1`
  - Database: `locations.phone` → Form: `phone_number`
  - Manual mapping required, error-prone

- [x] **No database transaction**
  - Org creation (tenant → location → membership) not atomic
  - Manual rollback via DELETE statements

- [x] **tenant_id constraint violation**
  - Signup creates `app_users` without `tenant_id`
  - Database schema requires `tenant_id NOT NULL`
  - May fail unless trigger or migration fixes this

- [x] **Service client used for all operations**
  - Bypasses RLS completely during org creation
  - No policy enforcement

---

## Questions Answered

### 1. Is `app_users` created at signup or only after org creation?

**Answer:** Created at signup (immediately after `auth.users` is created).

**Code:** `src/app/(auth)/sign-up/page.tsx` (line 168-176)

**However:** `tenant_id` is NOT set during signup, which may violate NOT NULL constraint unless:
- Database migration makes `tenant_id` nullable, OR
- Trigger auto-creates tenant (migration `20251027_003_auto_create_tenant_for_users.sql`)

---

### 2. What is wizard's purpose - enrichment, confirmation, or required?

**Answer:** **Enrichment and confirmation.**

**Evidence:**
- Steps are marked `isSkippable: true` (except email and profile)
- User can complete signup and create org without wizard
- Wizard pre-fills from database (confirmation)
- Wizard collects additional data (enrichment)

**Not required:** User can skip to dashboard and create org manually.

---

### 3. Is wizard progress saved/resumable? Where exactly?

**Answer:** **Yes, saved and resumable.**

**Where stored:**
1. **`onboarding_progress` table:**
   - `field_data` JSONB: All form field values
   - `completed`: Boolean flag
   - `skipped`: Boolean flag

2. **`app_users` table:**
   - `onboarding_current_step`: Current step ID
   - `onboarding_skipped_steps`: Array of skipped step IDs
   - `onboarding_started_at`: Timestamp

**Resume logic:** `GET /api/onboarding/resume` loads saved progress and determines resume step.

---

### 4. Where are invite codes stored?

**Answer:** **Not in `tenants` table.**

**Likely tables:**
- `pending_invites` (referenced in codebase)
- `user_invitations` (referenced in migrations)

**Not fully documented** in current codebase analysis.

---

### 5. What fields are "personal" vs "organizational"?

**Personal (stored in `app_users`):**
- `full_name`
- `professional_title`
- `phone_mobile`
- `phone_office`
- `bio`
- `profile_photo_url`
- `timezone`

**Organizational (stored in `tenants`):**
- `name` (organization name)
- `description`
- `specialty`
- `website_url`
- `logo_url`
- `industry`
- `company_size`

**Location (stored in `locations`):**
- `name` (location name)
- `address`
- `city`
- `postal_code`
- `phone`

---

### 6. Can users skip wizard?

**Answer:** **Yes, partially.**

**Skippable steps:**
- `organization_setup`: `isSkippable: true`
- `location_setup`: `isSkippable: true`

**Required steps:**
- `email_verification`: `isSkippable: false`
- `profile_setup`: `isSkippable: false`

**User can:**
- Skip org and location steps
- Complete email and profile only
- Create org later from settings

---

### 7. What data does wizard collect that wasn't in signup/org creation?

**Signup collects:**
- `full_name`
- `email`
- `password`

**Org creation collects:**
- `name` (organization)
- `location_name` (default location)

**Wizard collects additional:**
- `professional_title`
- `phone_mobile`, `phone_office`
- `bio`
- `profile_photo_url`
- `description` (organization)
- `specialty` (organization)
- `logo_url` (organization)
- `address`, `city`, `postal_code`, `phone` (location)
- Legal details, business settings (sub-steps)

**Purpose:** Enrichment and confirmation of existing data.

---

## Root Cause Summary

### Primary Issues

1. **Data Loading Race Condition**
   - `loadExistingData()` runs before Resume API completes
   - `formData` from Resume API overwrites DB pre-filled data
   - **Fix:** Wait for both config and resume APIs before loading data, or add `formData` to dependency array

2. **Empty String vs Missing Value**
   - Saved progress with empty strings prevents DB pre-fill
   - Condition logic is confusing
   - **Fix:** Use `.trim()` check and clearer logic

3. **useEffect Dependencies**
   - Some steps use `[]` instead of `[currentStepId]`
   - Missing `formData` dependency
   - **Fix:** Use `[currentStepId]` and add conditional checks

4. **Field Name Mismatches**
   - Database columns don't match form field names
   - Manual mapping required
   - **Fix:** Standardize field names or create mapping utility

5. **tenant_id Constraint**
   - Signup creates `app_users` without `tenant_id`
   - Database requires `tenant_id NOT NULL`
   - **Fix:** Make `tenant_id` nullable OR ensure trigger creates tenant

---

## Recommendations

### High Priority

1. **Fix data loading race condition:**
   - Wait for both config and resume APIs before calling `loadExistingData()`
   - Or add `formData` to dependency array with debounce

2. **Fix useEffect dependencies:**
   - Change `PersonalInfoStep` to use `[currentStepId]`
   - Add conditional check: `if (currentStepId === 'profile_setup')`

3. **Fix empty string handling:**
   - Use `.trim()` check instead of `=== ''`
   - Clearer condition logic

4. **Fix tenant_id constraint:**
   - Make `tenant_id` nullable in schema, OR
   - Ensure auto-tenant trigger runs during signup

### Medium Priority

5. **Standardize field names:**
   - Create mapping utility for DB → form field names
   - Or rename database columns to match form fields

6. **Add database transaction:**
   - Wrap org creation (tenant → location → membership) in transaction
   - Ensure atomicity

7. **Improve error handling:**
   - Better error messages for constraint violations
   - Retry logic for transient failures

### Low Priority

8. **Add loading states:**
   - Show loading until `steps.length > 0`
   - Prevent interaction during initialization

9. **Add cancellation tokens:**
   - Cancel async operations when component unmounts
   - Prevent state updates after unmount

---

## Conclusion

The architecture is **solid** but has **several race conditions and data precedence issues** that can cause the "empty forms" problem. The primary issue is **timing** - data loading runs before saved progress is loaded, causing conflicts. Fixing the useEffect dependencies and adding proper synchronization will resolve most issues.














