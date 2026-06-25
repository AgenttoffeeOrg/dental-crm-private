# Architecture Analysis & Root Cause Analysis

## Current Architecture Flow

### 1. User Signup Flow
```
Sign Up → auth.users created → app_users created (NO tenant_id) → Dashboard (prompts to create org)
```

### 2. Organization Creation Flow  
```
Create Org → /api/orgs/create → Creates:
  - tenants (organization)
  - locations (default location)
  - user_tenant_memberships (owner role)
  - Updates app_users: active_tenant_id, active_location_id
```

### 3. Onboarding Wizard Initialization Flow
```
Wizard Opens → WizardProvider mounts → initializeWizard() runs:
  1. Fetches /api/onboarding/config (server-side, checks DB directly)
     - Config API checks: app_users.active_tenant_id || app_users.tenant_id
     - If tenant exists → includes organization_setup and location_setup steps
  2. Fetches /api/onboarding/resume (loads saved progress)
     - Returns saved formData, completedSteps, skippedSteps
     - Sets formData in wizard context
  
  Step Components Mount → useEffect runs → loadExistingData():
    - Queries DB directly for app_users (gets tenant_id)
    - Queries DB for tenants/locations
    - Calls updateFieldValue() to pre-fill formData
```

## CRITICAL ISSUES IDENTIFIED

### Issue #1: Race Condition in Data Loading
**Problem**: Step components' `loadExistingData()` runs with empty dependencies `[]`, meaning:
- It runs once on mount
- But `formData[currentStepId]` might be `undefined` when it first runs
- The `updateFieldValue` function uses `currentStepId` from wizard context
- If `currentStepId` isn't set yet, updates might go to wrong step

**Evidence**:
- `company-info-step.tsx` line 34: `const stepData = formData[currentStepId] || {}`
- `wizard-context.tsx` line 94: `const currentStepId = steps[currentStep - 1]?.stepId || ''`
- If `steps` array isn't loaded yet, `currentStepId` is empty string
- Then `updateFieldValue` updates `formData['']` instead of `formData['organization_setup']`

### Issue #2: Resume Data Overwrites DB Data
**Problem**: Wizard loads resume data AFTER config, which might contain empty/old data:
- Resume API returns saved `formData`
- This is set in wizard context BEFORE step components load
- Step components check `!stepData.name` before pre-filling
- But if resume data has `{ organization_setup: {} }`, `stepData.name` is `undefined` (should work)
- However, if resume data has `{ organization_setup: { name: '' } }`, `!stepData.name` is false, so it won't pre-fill

### Issue #3: Missing Dependency on currentStepId
**Problem**: Step components don't re-run when `currentStepId` changes:
- `useEffect(() => { loadExistingData() }, [])` - empty array
- If user navigates away and back, data won't reload
- If wizard initializes in wrong order, `currentStepId` might be wrong

### Issue #4: Data Source Confusion
**Problem**: Multiple sources of truth:
- Config API: Checks DB → determines which steps to show
- Resume API: Loads saved formData → might have stale data
- Step components: Query DB → might conflict with saved formData
- Wizard context: Manages formData state → might override DB data

## Root Cause for toffeehegde@gmail.com

**Most Likely Scenario**:
1. User has org and location in DB ✅
2. Config API detects tenant ✅
3. Wizard includes organization_setup and location_setup steps ✅
4. Resume API returns empty/null formData (or old empty data)
5. Step components mount
6. `currentStepId` might not be set yet (steps still loading)
7. `loadExistingData()` runs but `updateFieldValue('name', ...)` updates wrong key
8. OR `stepData` from resume has empty values, preventing pre-fill
9. User sees empty forms even though DB has data

## SOLUTION APPROACH

### Fix #1: Ensure currentStepId is Available
- Add check in `loadExistingData()` to wait for `currentStepId`
- Or pass `currentStepId` as prop to step components

### Fix #2: Force DB Data Override
- Change condition from `!stepData.name` to always check DB first
- Only use saved formData if DB has no data

### Fix #3: Re-run on Step Change
- Add `currentStepId` to useEffect dependencies
- Re-load data when step becomes active

### Fix #4: Unified Data Loading
- Config API should return existing data for pre-filling
- Step components should use config data first, then query DB if needed
- Resume data should only override if user explicitly saved changes

## Why Fixes Keep Breaking Things

1. **Incomplete Understanding**: We fix symptoms without understanding full data flow
2. **Multiple Data Sources**: Changes to one source (DB, resume, config) affect others
3. **Race Conditions**: Timing issues between async operations
4. **State Management**: Wizard context state conflicts with component state
5. **No Testing**: Changes aren't tested with existing users (like toffeehegde)

## Recommended Fix Strategy

1. **Single Source of Truth**: Config API should return existing DB data
2. **Explicit Step ID**: Pass `stepId` to components explicitly
3. **Force DB Override**: Always load DB data first, then merge with saved progress
4. **Better State Management**: Clear separation between DB data and user edits
5. **Comprehensive Testing**: Test with existing users who have data

