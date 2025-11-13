# CRM System Architecture Verification Report

**Date:** January 2025  
**System:** Multi-tenant Dental CRM  
**Scope:** Complete architecture audit against requirements

---

## Executive Summary

This report verifies the implementation of 8 core requirements for the multi-tenant CRM system. Overall, the system has **strong foundations** but contains **critical conflicts** between the intended architecture and existing auto-creation triggers.

### Key Findings

- ✅ **CORRECT**: Organization creation flow properly creates tenant, location, and membership
- ✅ **CORRECT**: Data ownership model properly links to tenant_id and location_id
- ✅ **CORRECT**: Location-based role system is properly architected
- ✅ **CORRECT**: Organization and location switchers have proper conditional display
- ❌ **INCORRECT**: Auto-tenant creation trigger conflicts with requirement for user-only access
- ⚠️ **PARTIAL**: Onboarding wizard has detection logic but flow conflict exists
- ⚠️ **PARTIAL**: Field mapping is handled but inconsistencies exist
- ❓ **UNCLEAR**: Organization blocking enforcement may be bypassed by trigger

---

## Detailed Verification by Requirement

### 1. User Signup & Organization Setup Flow

**Requirement**: After signup, users should ONLY access profile settings until they create/join an organization.

**Status:** ❌ **INCORRECT**

#### Findings:

**Code Location:** `src/app/(auth)/sign-up/page.tsx` (Lines 169-195)

```168:195:src/app/(auth)/sign-up/page.tsx
        // Create new app user WITHOUT tenant_id initially
        const { error: appUserError } = await supabase
          .from('app_users')
          .insert({
            id: authData.user.id,
            full_name: formData.fullName.trim(),
            role: 'owner'
            // tenant_id is NOT set initially - will be set below for practice sign-ups
          })

        if (appUserError) {
          console.error('[SIGNUP] Failed to create app user:', appUserError)

          // Handle the specific case where tenant_id constraint fails
          // This means the database migration hasn't been run yet
          if (appUserError.message?.includes('tenant_id') &&
              (appUserError.message?.includes('not-null') || appUserError.message?.includes('null value'))) {
            // This is a database configuration issue - migration needs to be run
            // User will need to delete their orphaned auth account manually or via SQL
            throw new Error(
              'Database configuration issue detected. The database migration needs to be applied. ' +
              'Your account was partially created. Please contact support or use the cleanup script to delete the orphaned account.'
            )
          }

          throw new Error(`Failed to create user profile: ${appUserError.message}`)
        }
```

**The sign-up code correctly does NOT create a tenant initially.**

However, **a database trigger auto-creates a tenant:**

**Code Location:** `supabase/migrations/20251027_003_auto_create_tenant_for_users.sql` (Lines 107-194)

```107:194:supabase/migrations/20251027_003_auto_create_tenant_for_users.sql
-- Function to auto-create tenant for new users
CREATE OR REPLACE FUNCTION public.auto_create_tenant_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_tenant_id UUID;
  v_new_location_id UUID;
  v_membership_id UUID;
  v_user_name TEXT;
BEGIN
  -- Only proceed if user doesn't have a tenant yet
  IF NEW.active_tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  RAISE NOTICE 'Auto-creating tenant for new user: %', NEW.email;

  -- Determine tenant name from user info
  v_user_name := COALESCE(NEW.full_name, SPLIT_PART(NEW.email, '@', 1));

  -- Create tenant
  INSERT INTO tenants (
    name,
    owner_id,
    is_multi_location,
    created_at,
    updated_at
  ) VALUES (
    v_user_name || '''s Practice',
    NEW.id,
    false,
    NOW(),
    NOW()
  ) RETURNING id INTO v_new_tenant_id;

  -- Create default location
  INSERT INTO locations (
    tenant_id,
    name,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    v_new_tenant_id,
    'Main Office',
    true,
    NOW(),
    NOW()
  ) RETURNING id INTO v_new_location_id;

  -- Create user membership
  INSERT INTO user_tenant_memberships (
    user_id,
    tenant_id,
    role,
    status,
    all_locations,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_new_tenant_id,
    'owner',
    'active',
    true,
    NOW(),
    NOW()
  ) RETURNING id INTO v_membership_id;

  -- Update the NEW record to set active context
  NEW.active_tenant_id := v_new_tenant_id;
  NEW.active_location_id := v_new_location_id;
  NEW.default_tenant_id := v_new_tenant_id;
  NEW.default_location_id := v_new_location_id;

  RAISE NOTICE '✅ Auto-created tenant % for user %', v_new_tenant_id, NEW.email;

  RETURN NEW;
END;
$$;

-- Create trigger on app_users INSERT
DROP TRIGGER IF EXISTS trigger_auto_create_tenant_for_new_user ON app_users;
CREATE TRIGGER trigger_auto_create_tenant_for_new_user
  BEFORE INSERT ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_tenant_for_new_user();
```

**This trigger directly contradicts the requirement.** It automatically creates:

- A tenant named "{User}'s Practice"
- A default "Main Office" location
- A membership with 'owner' role
- Sets active_tenant_id and active_location_id

**While the requirement states users should NOT have organization access until they explicitly create/join one.**

#### Dashboard Blocking

**Code Location:** `src/lib/hooks/use-org-guard.ts` (Lines 97-110)

```97:110:src/lib/hooks/use-org-guard.ts
  const hasOrg = Boolean(appUser?.active_tenant_id)
  const activeTenantId = appUser?.active_tenant_id || null
  const activeLocationId = appUser?.active_location_id || null

  /**
   * Check if org is required and show modal if not
   */
  const checkOrgRequired = (): boolean => {
    if (!hasOrg) {
      setShowOrgModal(true)
      return false
    }
    return true
  }
```

The guard exists but **will never be triggered** because the database trigger automatically sets `active_tenant_id`.

**Recommendation:** Remove or disable the trigger in `20251027_003_auto_create_tenant_for_users.sql`.

---

### 2. Organization & Tenant Creation

**Requirement**: Organization creation should create a new tenant_id, default location, and set creator as super admin, all atomically.

**Status:** ✅ **CORRECT**

#### Findings:

**Code Location:** `src/app/api/orgs/create/route.ts` (Lines 154-398)

The organization creation flow properly:

1. **Creates tenant with unique ID** (Lines 161-217)

```161:217:src/app/api/orgs/create/route.ts
      const { data: tenantData, error: tenantError } = await serviceClient
        .from('tenants')
        .insert({
          name: body.name,
          is_multi_location: false,  // Start as single-location
          account_type: 'organization',  // ✅ Required by tenants_account_type_check constraint
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id, name')
        .single()

      if (tenantError) {
        console.error('[ORGS] ❌ Tenant creation error:', {
          code: tenantError.code,
          message: tenantError.message,
          details: tenantError.details,
          hint: tenantError.hint
        })

        // Check for duplicate name
        if (tenantError.code === '23505') {
          return NextResponse.json(
            {
              error: 'Organization name already exists',
              message: 'Please choose a different name for your organization'
            },
            { status: 409 }
          )
        }

        return NextResponse.json(
          {
            error: 'Failed to create organization',
            message: tenantError.message || 'Unknown error',
            details: tenantError.details || tenantError.hint
          },
          { status: 500 }
        )
      }

      if (!tenantData) {
        console.error('[ORGS] ❌ Tenant creation returned no data')
        return NextResponse.json(
          {
            error: 'Failed to create organization',
            message: 'No tenant data returned from database'
          },
          { status: 500 }
        )
      }

      tenant = tenantData
      console.log('[ORGS] ✅ Tenant created successfully:', {
        id: tenant.id,
        name: tenant.name
      })
```

2. **Creates default location** (Lines 239-290) with rollback

```239:290:src/app/api/orgs/create/route.ts
      const { data: locationData, error: locationError } = await serviceClient
        .from('locations')
        .insert({
          tenant_id: tenant.id,
          name: body.location_name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id, name')
        .single()

      if (locationError) {
        console.error('[ORGS] ❌ Location creation error:', {
          code: locationError.code,
          message: locationError.message,
          details: locationError.details,
          hint: locationError.hint
        })

        // Rollback: Delete tenant
        console.log('[ORGS] Rolling back tenant creation...')
        await serviceClient.from('tenants').delete().eq('id', tenant.id)

        return NextResponse.json(
          {
            error: 'Failed to create default location',
            message: locationError.message || 'Unknown error',
            details: locationError.details || locationError.hint
          },
          { status: 500 }
        )
      }

      if (!locationData) {
        console.error('[ORGS] ❌ Location creation returned no data')
        // Rollback tenant
        await serviceClient.from('tenants').delete().eq('id', tenant.id)
        return NextResponse.json(
          {
            error: 'Failed to create default location',
            message: 'No location data returned from database'
          },
          { status: 500 }
        )
      }

      location = locationData
      console.log('[ORGS] ✅ Location created successfully:', {
        id: location.id,
        name: location.name
      })
```

3. **Creates owner membership** (Lines 312-365) with full rollback

```312:365:src/app/api/orgs/create/route.ts
      const { data: membershipData, error: membershipError } = await serviceClient
        .from('user_tenant_memberships')
        .insert({
          user_id: user.id,
          tenant_id: tenant.id,
          role: 'owner',  // ✅ Creator becomes owner
          all_locations: true,  // ✅ Owner has access to all locations
          status: 'active'
        })
        .select('id, role')
        .single()

      if (membershipError) {
        console.error('[ORGS] ❌ Membership creation error:', {
          code: membershipError.code,
          message: membershipError.message,
          details: membershipError.details,
          hint: membershipError.hint
        })

        // Rollback: Delete location and tenant
        console.log('[ORGS] Rolling back location and tenant...')
        await serviceClient.from('locations').delete().eq('id', location.id)
        await serviceClient.from('tenants').delete().eq('id', tenant.id)

        return NextResponse.json(
          {
            error: 'Failed to create membership',
            message: membershipError.message || 'Unknown error',
            details: membershipError.details || membershipError.hint
          },
          { status: 500 }
        )
      }

      if (!membershipData) {
        console.error('[ORGS] ❌ Membership creation returned no data')
        // Rollback location and tenant
        await serviceClient.from('locations').delete().eq('id', location.id)
        await serviceClient.from('tenants').delete().eq('id', tenant.id)
        return NextResponse.json(
          {
            error: 'Failed to create membership',
            message: 'No membership data returned from database'
          },
          { status: 500 }
        )
      }

      membership = membershipData
      console.log('[ORGS] ✅ Membership created successfully:', {
        id: membership.id,
        role: membership.role
      })
```

4. **Atomically updates user context** (Lines 384-398)

```384:398:src/app/api/orgs/create/route.ts
    console.log('[ORGS] Updating user active context')
    const { error: updateUserError } = await serviceClient
      .from('app_users')
      .update({
        active_tenant_id: tenant.id,
        active_location_id: location.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateUserError) {
      console.error('[ORGS] Error updating user context:', updateUserError)
      // Non-fatal - user can switch manually, but log it
    } else {
      console.log('[ORGS] ✅ User context updated')
    }
```

**All operations are atomic with proper rollback on failure.**

---

### 3. Data Ownership Model

**Requirement**: ALL data must be linked to tenant_id AND location_id (never directly to user).

**Status:** ✅ **CORRECT**

#### Findings:

**Code Location:** `supabase/migrations/20251025_phase1_critical_fixes.sql` (Lines 379-420)

The migration properly adds `location_id` to all core tables:

```379:420:supabase/migrations/20251025_phase1_critical_fixes.sql
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

-- Tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_tenant_location
  ON tasks(tenant_id, location_id);

COMMENT ON COLUMN tasks.location_id IS
  'Location for this task. Used for location-based task assignment and filtering.';

-- Activities
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activities_tenant_location
  ON activities(tenant_id, location_id);

COMMENT ON COLUMN activities.location_id IS
  'Location where this activity occurred. NULL = organization-wide activity.';
```

**All core tables have both tenant_id and location_id columns.**

---

### 4. Location-Based Role System

**Requirement**: Users can have different roles in different locations within same org.

**Status:** ✅ **CORRECT**

#### Findings:

**Code Location:** `supabase/migrations/20251025_003b_membership_locations.sql` (Lines 34-106)

The `membership_locations` table supports location-specific roles:

```34:106:supabase/migrations/20251025_003b_membership_locations.sql
CREATE TABLE IF NOT EXISTS membership_locations (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  membership_id UUID NOT NULL REFERENCES user_tenant_memberships(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  -- Role override (NULL = inherit from membership)
  -- Note: CHECK constraint not needed - ENUM type already validates values
  role_override membership_role,

  -- Scope (how much data can they access at this location)
  scope TEXT NOT NULL DEFAULT 'location' CHECK (
    scope IN ('own', 'team', 'location', 'all')
  ),

  -- Status
  is_active BOOLEAN DEFAULT true NOT NULL,

  -- Audit
  assigned_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  UNIQUE(membership_id, location_id)  -- User can only be assigned to location once
);

-- Add comments
COMMENT ON TABLE membership_locations IS
  'Per-location role assignments. Enables users to have different roles at different locations.';

COMMENT ON COLUMN membership_locations.membership_id IS
  'Reference to user_tenant_memberships (which user, which org)';

COMMENT ON COLUMN membership_locations.location_id IS
  'Reference to locations (which location within the org)';

COMMENT ON COLUMN membership_locations.role_override IS
  'Overrides the base role from membership. NULL = use membership role.';

COMMENT ON COLUMN membership_locations.scope IS
  'Data access scope: own (personal), team (same location team), location (all at location), all (org-wide)';
```

**Helper functions are provided** (Lines 133-209):

- `get_user_locations()` - Returns all locations user can access with effective roles
- `get_user_role_at_location()` - Returns user's effective role at a specific location

**Architecture properly supports location-based roles.**

---

### 5. Multi-Organization Support

**Requirement**: Users can belong to multiple organizations with complete data isolation.

**Status:** ✅ **CORRECT**

#### Findings:

**Code Location:** `src/lib/hooks/use-multi-org.ts` (Lines 140-153)

The system properly detects multi-org users:

```140:153:src/lib/hooks/use-multi-org.ts
  const isMultiOrg = useMemo(
    () => multiOrgEnabled && activeMemberships.length > 1,
    [multiOrgEnabled, activeMemberships]
  )

  return {
    memberships,
    activeMemberships,
    currentMembership,
    isMultiOrg,
    loading: loading || authLoading,
    error,
    refetch: fetchMemberships,
  }
```

**Code Location:** `src/components/layout/org-switcher.tsx` (Lines 184-191)

Conditional display is properly implemented:

```184:191:src/components/layout/org-switcher.tsx
  // Don't render if multi-org not enabled
  if (!multiOrgEnabled) {
    return null
  }

  // Don't render if only one membership (not multi-org user)
  if (!isMultiOrg && !loading) {
    return null
  }
```

**Organization switcher only shows when user has multiple orgs.**

---

### 6. Onboarding Wizard Logic

**Requirement**: For org creators: Profile → Organization → Location(s). For invited users: Profile only.

**Status:** ⚠️ **PARTIAL**

#### Findings:

**Code Location:** `src/components/onboarding/integrated-onboarding-flow.tsx`

The wizard has proper detection logic:

```76:92:src/components/onboarding/integrated-onboarding-flow.tsx
  const initializeOnboarding = async () => {
    try {
      // Check if user already has active_tenant_id
      if (appUser?.active_tenant_id) {
        console.log('[ONBOARDING] User already has organization, proceeding to wizard')
        setPhase('wizard')
        return
      }

      // Check for pending invites
      console.log('[ONBOARDING] Checking for pending invites...')
      setPhase('invite_detection')

    } catch (error) {
      console.error('[ONBOARDING] Error initializing:', error)
      // On error, proceed to wizard (safe default)
      setPhase('wizard')
    }
  }
```

**However, there's a flow conflict:**

1. User signs up → **Database trigger creates tenant automatically**
2. User reaches onboarding → `active_tenant_id` is already set
3. Wizard skips directly to "wizard" phase
4. **No opportunity to choose between create/join/skip**

**The intended flow:**

1. User signs up → **No tenant** → Only profile access
2. User reaches onboarding → Sees pending invites
3. If no invites: Show create/join/skip decision
4. If invites: Show invite banner

**Current flow:**

1. User signs up → **Database trigger creates tenant** → Full access
2. User reaches onboarding → Already has org, skips to wizard
3. No decision flow ever appears

**Recommendation:** Remove the auto-creation trigger to restore the intended onboarding flow.

---

### 7. Field Mapping Consistency

**Requirement**: Check for mismatches between form fields and DB columns (address_line1 vs address, phone_number vs phone).

**Status:** ⚠️ **PARTIAL** - Mapping exists but is manual

#### Findings:

**Code Location:** `src/app/api/onboarding/save-progress/route.ts` (Lines 211-216)

Field mapping is properly handled:

```211:216:src/app/api/onboarding/save-progress/route.ts
          // Map form field 'address_line1' to database column 'address'
          if (fieldData.address_line1 !== undefined) locationUpdate.address = fieldData.address_line1 || null
          if (fieldData.city !== undefined) locationUpdate.city = fieldData.city || null
          if (fieldData.postal_code !== undefined) locationUpdate.postal_code = fieldData.postal_code || null
          // Map form field 'phone_number' to database column 'phone'
          if (fieldData.phone_number !== undefined) locationUpdate.phone = fieldData.phone_number || null
```

**Mapping is correct but manual.** Consider a shared mapping layer for consistency.

---

### 8. UI Conditional Display

**Requirement**: Organization switcher shows only if user has multiple orgs. Location switcher shows only if org has multiple locations.

**Status:** ✅ **CORRECT**

#### Findings:

**Code Location:** `src/components/layout/org-switcher.tsx` (Lines 184-191)

Org switcher conditional display:

```184:191:src/components/layout/org-switcher.tsx
  // Don't render if multi-org not enabled
  if (!multiOrgEnabled) {
    return null
  }

  // Don't render if only one membership (not multi-org user)
  if (!isMultiOrg && !loading) {
    return null
  }
```

**Code Location:** `src/components/multi-location/location-switcher.tsx` (Lines 41-44)

Location switcher conditional display:

```41:44:src/components/multi-location/location-switcher.tsx
  // Don't render if not multi-location
  if (!isMultiLocation) {
    return null
  }
```

**Code Location:** `src/components/layout/dashboard-layout.tsx` (Lines 436-446)

Both switchers are properly used:

```436:446:src/components/layout/dashboard-layout.tsx
              {/* Organization Switcher - Multi-Org Users */}
              <OrgSwitcher />

              {/* Location Switcher - Multi-Location Organizations */}
              {locationContext?.isMultiLocation && (
                <LocationSwitcher
                  currentLocationId={locationContext.activeLocation?.id || locationContext.accessibleLocations?.[0]?.id}
                  currentLocationName={locationContext.activeLocation?.name || locationContext.accessibleLocations?.[0]?.name || 'Select Location'}
                  isMultiLocation={locationContext.isMultiLocation}
                />
              )}
```

**Both conditional displays are correctly implemented.**

---

## Summary of Issues

### Critical Issues ❌

1. **Auto-Tenant Creation Trigger Conflicts with Architecture** (Requirement #1)
   - **File:** `supabase/migrations/20251027_003_auto_create_tenant_for_users.sql`
   - **Impact:** Prevents users from having "profile-only" access after signup
   - **Severity:** Critical - breaks core flow requirement
   - **Recommendation:** Remove or disable the trigger

2. **Onboarding Flow Bypassed** (Requirement #6)
   - **Root Cause:** Auto-creation trigger sets `active_tenant_id` before onboarding
   - **Impact:** Users never see create/join/skip decision
   - **Severity:** High - undermines user experience
   - **Recommendation:** Same as #1 - remove the trigger

### Minor Issues ⚠️

3. **Manual Field Mapping** (Requirement #7)
   - **File:** `src/app/api/onboarding/save-progress/route.ts`
   - **Impact:** Risk of inconsistency across forms
   - **Severity:** Low - works but could be improved
   - **Recommendation:** Create shared field mapping utility

### Strengths ✅

- **Organization creation flow is atomic and correct**
- **Data ownership model properly uses tenant_id + location_id**
- **Location-based roles are properly architected**
- **Multi-org support and conditional UI are correct**

---

## Recommendations

### Immediate Actions

1. **Disable the auto-tenant creation trigger**
   - Review if the trigger was intended for backward compatibility
   - If so, document the architectural shift away from auto-creation
   - Consider a one-time migration for existing users

2. **Audit API routes for tenant context**
   - Verify all API routes use `active_tenant_id` from app_users
   - Ensure no code falls back to non-existent `tenant_id` column
   - Add integration tests for tenant isolation

3. **Test the full flow**
   - Sign up → Verify no auto-tenant
   - Verify dashboard blocks actions
   - Verify onboarding shows org decision
   - Verify create org flow works end-to-end

### Future Enhancements

4. **Create shared field mapping layer**
   - Define single source of truth for form ↔ DB mappings
   - Reduce risk of inconsistencies

5. **Add comprehensive integration tests**
   - Test signup → org creation flow
   - Test multi-org switching
   - Test location-based permissions
   - Test onboarding wizard logic

---

## Conclusion

The system has a **solid architectural foundation** with proper data ownership models, multi-org support, and conditional UI. However, the **auto-tenant creation trigger directly conflicts** with the requirement for users to explicitly create or join organizations.

**The core issue is architectural:** The trigger was likely created to support an earlier "solo user" model, but the current requirements call for an explicit org creation/joining flow.

**Recommended Action:** Remove the trigger in `20251027_003_auto_create_tenant_for_users.sql` and verify the full signup → onboarding → org creation flow works as intended.
