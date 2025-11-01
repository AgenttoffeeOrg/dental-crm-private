# Checkpoint: Onboarding Wizard Schema Fixes

**Date:** November 1, 2025  
**Commit:** `e08b659`  
**Tag:** `checkpoint-onboarding-schema-fix-20251101-214622`

## Summary

Fixed critical schema mismatch issue that was preventing the onboarding wizard from loading existing organization and location data for users like `toffeehegde@gmail.com`.

## Root Cause Identified

The database schema uses:
- `address` (not `address_line1`)
- `phone` (not `phone_number`)

But the code was querying:
- `address_line1` ❌
- `phone_number` ❌

This caused silent failures - the queries returned no data even though data existed in the database.

## Fixes Applied

### 1. FirstLocationStep Component (`src/components/onboarding/steps/first-location-step.tsx`)
- ✅ Changed queries to use correct DB columns: `address`, `phone`
- ✅ Added mapping: DB `address` → form field `address_line1`
- ✅ Added mapping: DB `phone` → form field `phone_number`
- ✅ Fixed `useEffect` to wait for `currentStepId` before loading data
- ✅ Added fallback to load first location if `active_location_id` not set

### 2. Save Progress API (`src/app/api/onboarding/save-progress/route.ts`)
- ✅ Added mapping: form field `address_line1` → DB column `address`
- ✅ Added mapping: form field `phone_number` → DB column `phone`
- ✅ Ensures data saves to correct database columns

### 3. useTenant Hook (`src/lib/hooks/use-tenant.ts`)
- ✅ Fixed to check `active_tenant_id` first (multi-org support)
- ✅ Falls back to `tenant_id` if `active_tenant_id` is null
- ✅ Fixes locations page loading infinitely

### 4. LocationsSettingsTab (`src/components/settings/locations-settings-tab.tsx`)
- ✅ Fixed `useEffect` dependencies using `useCallback`
- ✅ Added proper loading state handling

### 5. CompanyInfoStep (`src/components/onboarding/steps/company-info-step.tsx`)
- ✅ Fixed to wait for `currentStepId` before loading data
- ✅ Enhanced to load more organization fields (logo, industry, etc.)
- ✅ Always pre-fills from DB data (source of truth)

## Files Changed

1. `src/components/onboarding/steps/first-location-step.tsx` - Schema mapping fix
2. `src/components/onboarding/steps/company-info-step.tsx` - Timing and data loading fix
3. `src/app/api/onboarding/save-progress/route.ts` - Schema mapping fix
4. `src/lib/hooks/use-tenant.ts` - active_tenant_id priority fix
5. `src/components/settings/locations-settings-tab.tsx` - useEffect dependencies fix

## How to Restore This Checkpoint

```bash
# Option 1: Reset to this commit
git reset --hard e08b659

# Option 2: Checkout the tag
git checkout checkpoint-onboarding-schema-fix-20251101-214622

# Option 3: View what changed
git diff e08b659~1 e08b659
```

## Testing Instructions

1. Run `CHECK_USER_toffeehegde_SIMPLE.sql` in Supabase SQL editor to verify user data
2. Log in as `toffeehegde@gmail.com`
3. Open onboarding wizard from dashboard
4. Navigate to "Organization Setup" step - should auto-fill organization data
5. Navigate to "Location Setup" step - should auto-fill location data
6. Verify Settings > Locations page loads correctly

## Expected Behavior

- ✅ Onboarding wizard auto-detects existing organization
- ✅ Onboarding wizard auto-detects existing location
- ✅ Forms pre-fill with database data
- ✅ Settings > Locations page loads without infinite spinner
- ✅ Data saves correctly to database

## Architecture Documentation

- `ARCHITECTURE_ANALYSIS.md` - Complete system architecture analysis
- `CHECK_USER_toffeehegde_SIMPLE.sql` - Diagnostic SQL script

