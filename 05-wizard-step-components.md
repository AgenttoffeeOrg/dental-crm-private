# Onboarding Wizard - Step Components & Data Loading

## Overview

This document analyzes all onboarding wizard step components, their data loading logic, useEffect hooks, form data structures, and data flow sequences.

---

## List of All Step Components

### Step Components Found

**Directory:** `src/components/onboarding/steps/`

1. `personal-info-step.tsx` - Personal information (Step 2)
2. `email-verification-step.tsx` - Email verification (Step 1)
3. `company-info-step.tsx` - Organization setup (Step 3)
4. `first-location-step.tsx` - Location setup (Step 4)
5. `contact-info-step.tsx` - Contact information (sub-step)
6. `legal-details-step.tsx` - Legal details (sub-step)
7. `business-settings-step.tsx` - Business settings (sub-step)
8. `communication-settings-step.tsx` - Communication settings
9. `security-settings-step.tsx` - Security settings
10. `work-preferences-step.tsx` - Work preferences

**Note:** Steps 1-4 are the main wizard steps. Others are sub-steps or legacy steps.

---

## Component Analysis

### 1. PersonalInfoStep

**File Path:** `src/components/onboarding/steps/personal-info-step.tsx`

**Purpose:** Collects user's personal information (full name, professional title, phone, bio, profile photo).

**Data Loading:**

**Function:** `loadExistingProfile()` (line 42)

**Code:**
```typescript
const loadExistingProfile = async () => {
  try {
    const supabase = createClient()
    
    // First, get user's app_user record (name from signup)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: appUser } = await supabase
        .from('app_users')
        .select('full_name, professional_title, phone_mobile, phone_office, bio, profile_photo_url')
        .eq('id', user.id)
        .single()

      if (appUser) {
        // Pre-fill with data from signup (name) and existing profile data
        if (appUser.full_name && !stepData.full_name) {
          updateFieldValue('full_name', appUser.full_name)
        }
        if (appUser.professional_title && !stepData.professional_title) {
          updateFieldValue('professional_title', appUser.professional_title)
        }
        // ... (more fields)
      }
    }

    // Also try loading from /api/user/profile if it exists
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        // Pre-fill if not already set
      }
    } catch (apiError) {
      // API endpoint might not exist - that's okay
    }
  } catch (error) {
    console.error('Error loading profile:', error)
  }
}
```

**Database Queries:**
1. Query `app_users` table: `full_name`, `professional_title`, `phone_mobile`, `phone_office`, `bio`, `profile_photo_url`
2. Optional: `GET /api/user/profile` (if endpoint exists)

**API Calls:**
- `GET /api/user/profile` (optional, may not exist)

**useEffect Hooks:**

**Hook 1 (Line 38):**
```typescript
useEffect(() => {
  loadExistingProfile()
}, [])
```

**Dependency Array:** `[]` (empty) - Runs once on mount

**When it runs:** Component mount

**Issue:** Should it depend on `currentStepId`? Currently runs even if this step isn't active.

**currentStepId Usage:**

**How component gets `currentStepId`:**
```typescript
const { updateFieldValue, formData, currentStepId, currentStepData } = useWizard()
```

From context via `useWizard()` hook.

**Form Data Structure:**

**Access Pattern:**
```typescript
const stepData = formData[currentStepId] || {}
```

**Structure:**
```typescript
formData['profile_setup'] = {
  full_name: string,
  professional_title: string,
  phone_mobile: string,
  phone_office: string,
  bio: string,
  profile_photo_url: string
}
```

**Update Logic:**

**Function:** `updateFieldValue` from context (line 156 in wizard-context.tsx)

**How it's called:**
```typescript
updateFieldValue('full_name', appUser.full_name)
```

**Parameters:**
- `fieldName`: String (e.g., 'full_name')
- `value`: Any (string, number, etc.)

**What it does:**
```typescript
setFormData(prev => ({
  ...prev,
  [currentStepId]: {
    ...prev[currentStepId],
    [fieldName]: value
  }
}))
```

**Pre-fill Logic:**

**Where does name/email come from?**
- **Name:** From `app_users.full_name` (set during signup)
- **Email:** Not shown in this step (handled in email verification step)
- **Other fields:** From `app_users` table columns

---

### 2. CompanyInfoStep

**File Path:** `src/components/onboarding/steps/company-info-step.tsx`

**Purpose:** Collects organization information (name, description, specialty, logo).

**Data Loading:**

**Function:** `loadExistingData()` (line 52)

**Code:**
```typescript
const loadExistingData = async () => {
  try {
    setLoading(true)
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get tenant_id (use active_tenant_id first, fallback to tenant_id)
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id, active_tenant_id')
      .eq('id', user.id)
      .single()

    if (!appUser) return

    const tenantId = appUser.active_tenant_id || appUser.tenant_id
    setHasTenant(!!tenantId)

    if (tenantId) {
      // Load existing tenant/organization data
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name, description, specialty, website_url, logo_url, industry, company_size, founded_date')
        .eq('id', tenantId)
        .single()

      if (tenant) {
        // ✅ FIX: Always pre-fill from DB data (DB is source of truth)
        const existingStepData = formData['organization_setup'] || {}
        
        // Force pre-fill from DB (DB data takes precedence over saved empty values)
        if (tenant.name && (!existingStepData.name || existingStepData.name === '')) {
          updateFieldValue('name', tenant.name)
        }
        if (tenant.description && (!existingStepData.description || existingStepData.description === '')) {
          updateFieldValue('description', tenant.description)
        }
        // ... (more fields)
      }
    }
  } catch (error) {
    console.error('Error loading organization data:', error)
  } finally {
    setLoading(false)
  }
}
```

**Database Queries:**
1. Query `app_users`: `tenant_id`, `active_tenant_id`
2. Query `tenants`: `name`, `description`, `specialty`, `website_url`, `logo_url`, etc.

**API Calls:** None

**useEffect Hooks:**

**Hook 1 (Line 44):**
```typescript
useEffect(() => {
  if (currentStepId === 'organization_setup') {
    loadExistingData()
  }
}, [currentStepId])
```

**Dependency Array:** `[currentStepId]` - Runs when step becomes active

**When it runs:** When `currentStepId` changes to 'organization_setup'

**Improvement:** This is better than empty array - only loads when step is active.

**currentStepId Usage:**

**From context:**
```typescript
const { updateFieldValue, formData, currentStepId } = useWizard()
```

**Conditional loading:**
```typescript
if (currentStepId === 'organization_setup') {
  loadExistingData()
}
```

**Form Data Structure:**

```typescript
formData['organization_setup'] = {
  name: string,
  description: string,
  specialty: string,
  logo_url: string,
  // ... (more fields)
}
```

**Update Logic:**

Same as PersonalInfoStep - uses `updateFieldValue` from context.

**Pre-fill Logic:**

**Where does org name come from?**
- From `tenants.name` column (database)
- Only pre-fills if formData doesn't already have a non-empty value (line 86)
- **Issue:** The condition `!existingStepData.name || existingStepData.name === ''` may cause issues if saved progress has empty string

**Critical Fix Comment (Line 81):**
```typescript
// ✅ FIX: Always pre-fill from DB data (DB is source of truth)
// Only skip if formData already has a non-empty value (user edited it)
```

This suggests there was a bug where empty saved progress overwrote DB data.

---

### 3. FirstLocationStep

**File Path:** `src/components/onboarding/steps/first-location-step.tsx`

**Purpose:** Collects location information (name, address, city, postal code, phone).

**Data Loading:**

**Function:** `loadExistingData()` (line 40)

**Code:**
```typescript
const loadExistingData = async () => {
  try {
    setLoading(true)
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get tenant_id (use active_tenant_id first, fallback to tenant_id)
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id, active_tenant_id, active_location_id')
      .eq('id', user.id)
      .single()

    if (!appUser) return

    const tenantId = appUser.active_tenant_id || appUser.tenant_id
    setHasTenant(!!tenantId)

    if (tenantId) {
      // ✅ FIRST: Try to load location by active_location_id if set
      if (appUser.active_location_id) {
        const { data: location } = await supabase
          .from('locations')
          .select('name, address, city, postal_code, phone')
          .eq('id', appUser.active_location_id)
          .eq('tenant_id', tenantId) // Security: ensure location belongs to tenant
          .single()

        if (location) {
          // Pre-fill from location data
          // Map database columns (address, phone) to form field names (address_line1, phone_number)
          if (location.name && (!existingStepData.name || existingStepData.name === '')) {
            updateFieldValue('name', location.name)
          }
          if (location.address && (!existingStepData.address_line1 || existingStepData.address_line1 === '')) {
            updateFieldValue('address_line1', location.address)
          }
          // ... (more fields)
          return // Found location, exit early
        }
      }

      // ✅ FALLBACK: If no active_location_id or location not found, 
      // load the first/default location for this tenant
      const { data: locations } = await supabase
        .from('locations')
        .select('name, address, city, postal_code, phone')
        .eq('tenant_id', tenantId)
        .order('is_primary', { ascending: false }) // Primary location first
        .order('created_at', { ascending: true }) // Then oldest (likely default)
        .limit(1)

      if (locations && locations.length > 0) {
        const location = locations[0]
        // Pre-fill from location data
      }
    }
  } catch (error) {
    console.error('Error loading location data:', error)
  } finally {
    setLoading(false)
  }
}
```

**Database Queries:**
1. Query `app_users`: `tenant_id`, `active_tenant_id`, `active_location_id`
2. Query `locations` by `active_location_id` (if set)
3. Fallback: Query `locations` by `tenant_id`, order by `is_primary` DESC, `created_at` ASC, limit 1

**API Calls:** None

**useEffect Hooks:**

**Hook 1 (Line 32):**
```typescript
useEffect(() => {
  if (currentStepId === 'location_setup') {
    loadExistingData()
  }
}, [currentStepId])
```

**Dependency Array:** `[currentStepId]` - Runs when step becomes active

**currentStepId Usage:**

Same pattern as CompanyInfoStep - conditional loading based on `currentStepId === 'location_setup'`.

**Form Data Structure:**

```typescript
formData['location_setup'] = {
  name: string,
  address_line1: string,  // Maps to locations.address
  city: string,
  postal_code: string,
  phone_number: string,  // Maps to locations.phone
}
```

**Field Mapping:**

**Database → Form:**
- `locations.address` → `formData['location_setup'].address_line1`
- `locations.phone` → `formData['location_setup'].phone_number`

**Update Logic:**

Same as other steps - uses `updateFieldValue`.

**Pre-fill Logic:**

**Where does default location come from?**
1. **First:** Try `app_users.active_location_id` (if set)
2. **Fallback:** Query `locations` table, get first location for tenant (ordered by `is_primary` DESC, then `created_at` ASC)

**Critical Fix Comment (Line 71):**
```typescript
// ✅ FIX: Always pre-fill from DB data (DB is source of truth)
// Map database columns (address, phone) to form field names (address_line1, phone_number)
```

This suggests there was a bug with field name mismatches.

---

## Data Flow Sequence (Organization Step Example)

**Step-by-step sequence:**

```
1. Wizard opens
   └─ WizardProvider.initializeWizard() runs
   └─ Calls GET /api/onboarding/config
   └─ Calls GET /api/onboarding/resume

2. Config API called
   └─ Returns: { steps: [...], accountType: 'organization', tenantId: '...' }
   └─ setSteps(configData.steps)
   └─ Steps array now contains 'organization_setup' step

3. Resume API called
   └─ Returns: { savedData: {...}, completedSteps: [...], resumeFromStep: 'organization_setup' }
   └─ setFormData(resumeData.savedData)
   └─ If resumeFromStep === 'organization_setup', setCurrentStep(3)

4. Organization step component mounts
   └─ CompanyInfoStep renders
   └─ currentStepId = 'organization_setup'

5. useEffect runs
   └─ Dependency: [currentStepId]
   └─ Condition: currentStepId === 'organization_setup' → TRUE
   └─ Calls loadExistingData()

6. loadExistingData runs
   └─ Query app_users: SELECT tenant_id, active_tenant_id WHERE id = user.id
   └─ Gets tenantId = appUser.active_tenant_id || appUser.tenant_id

7. Data from where?
   └─ Query tenants: SELECT name, description, specialty WHERE id = tenantId
   └─ Gets: { name: 'ABC Dental', description: '...', specialty: '...' }

8. Pre-fill logic
   └─ Check: existingStepData = formData['organization_setup'] || {}
   └─ If tenant.name exists AND (existingStepData.name is empty or missing)
   └─ Call: updateFieldValue('name', tenant.name)
   └─ Updates: formData['organization_setup']['name'] = 'ABC Dental'

9. Form shows
   └─ Input value: stepData.name (from formData['organization_setup'].name)
   └─ Displays: "ABC Dental"
```

---

## Pre-fill Logic Analysis

### Profile Step: Where does name/email come from?

**Name:** From `app_users.full_name` (set during signup)

**Email:** Not in personal info step. Email comes from `auth.users.email` (handled in email verification step).

**Code:** `src/components/onboarding/steps/personal-info-step.tsx` (line 49-76)

---

### Organization Step: Where does org name come from?

**Source:** `tenants.name` column (database)

**Query:** `SELECT name FROM tenants WHERE id = tenantId`

**Pre-fill condition:**
```typescript
if (tenant.name && (!existingStepData.name || existingStepData.name === '')) {
  updateFieldValue('name', tenant.name)
}
```

**Issue:** If saved progress has `name: ''` (empty string), condition `existingStepData.name === ''` is true, so DB data is NOT pre-filled.

**Code:** `src/components/onboarding/steps/company-info-step.tsx` (line 86)

---

### Location Step: Where does default location come from?

**Priority 1:** `app_users.active_location_id` (if set)

**Priority 2:** First location for tenant (ordered by `is_primary` DESC, `created_at` ASC)

**Query:**
```typescript
SELECT name, address, city, postal_code, phone
FROM locations
WHERE tenant_id = tenantId
ORDER BY is_primary DESC, created_at ASC
LIMIT 1
```

**Code:** `src/components/onboarding/steps/first-location-step.tsx` (lines 100-106)

---

## Critical Issues

### Issue 1: Empty Dependency Arrays

**Problem:** Some components use `useEffect(() => {...}, [])` which runs only on mount, even if step isn't active.

**Example:** `PersonalInfoStep` (line 38)

**Fix:** Use `[currentStepId]` dependency and check `currentStepId === 'profile_setup'`

**Better Pattern:**
```typescript
useEffect(() => {
  if (currentStepId === 'profile_setup') {
    loadExistingProfile()
  }
}, [currentStepId])
```

---

### Issue 2: Empty String vs Undefined

**Problem:** Pre-fill condition checks `existingStepData.name === ''`, which means if saved progress has empty string, DB data is NOT pre-filled.

**Example:** `CompanyInfoStep` (line 86)

**Current Logic:**
```typescript
if (tenant.name && (!existingStepData.name || existingStepData.name === '')) {
  updateFieldValue('name', tenant.name)
}
```

**Issue:** If `formData['organization_setup'] = { name: '' }` (empty string from saved progress), the condition `existingStepData.name === ''` is true, so `!existingStepData.name || existingStepData.name === ''` evaluates to `false || true = true`, which should work. But the logic may be confusing.

**Better Logic:**
```typescript
if (tenant.name && !existingStepData?.name?.trim()) {
  updateFieldValue('name', tenant.name)
}
```

---

### Issue 3: Field Name Mismatches

**Problem:** Database columns don't match form field names.

**Example:**
- Database: `locations.address` → Form: `address_line1`
- Database: `locations.phone` → Form: `phone_number`

**Code:** `FirstLocationStep` (lines 81, 91) has explicit mapping comments.

**Impact:** Data loading must manually map fields, which is error-prone.

---

## Summary

1. **Step Components:** 10 components found, main steps are 1-4
2. **Data Loading:** Each step loads from database (`app_users`, `tenants`, `locations`)
3. **useEffect Dependencies:** Some use empty `[]`, should use `[currentStepId]`
4. **Form Data Structure:** `formData[stepId][fieldName] = value`
5. **Pre-fill Logic:** Checks if formData is empty before pre-filling from DB
6. **Issues:** Empty string handling, field name mismatches, dependency arrays










