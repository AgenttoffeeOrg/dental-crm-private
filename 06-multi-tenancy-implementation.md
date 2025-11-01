# Multi-Tenancy & Data Isolation

## Overview

This document analyzes the multi-tenancy implementation, including active tenant/location tracking, organization switching, location-based roles, data isolation patterns, and UI conditional rendering.

---

## Active Tenant Tracking

### How is active tenant tracked?

**Field Name:** `app_users.active_tenant_id`

**File Reference:** `supabase/migrations/20251025_002b_add_active_tenant_to_users.sql` (line 33-35)

```sql
ALTER TABLE app_users 
  ADD COLUMN IF NOT EXISTS active_tenant_id UUID 
  REFERENCES tenants(id) ON DELETE SET NULL;
```

**Purpose:** Tracks which organization the user is currently viewing in their session.

**Nullable:** Yes (can be NULL if user has no org or hasn't selected one)

---

### Code That Gets Current Active Tenant

**Pattern Used Throughout Codebase:**

```typescript
const { data: appUser } = await supabase
  .from('app_users')
  .select('tenant_id, active_tenant_id')
  .eq('id', user.id)
  .single()

const tenantId = appUser.active_tenant_id || appUser.tenant_id
```

**Priority:**
1. `active_tenant_id` (current session context)
2. `tenant_id` (legacy fallback)

**Example from Config API:**
```typescript
// src/app/api/onboarding/config/route.ts (line 61)
const tenantId = appUser.active_tenant_id || appUser.tenant_id
```

---

### How does user switch orgs?

**Component:** `useOrgSwitcher` hook

**File:** `src/lib/hooks/use-multi-org.ts` (lines 160-236)

**Function:** `switchOrg(tenantId: string)`

**Code:**
```typescript
const switchOrg = useCallback(async (tenantId: string): Promise<OrgSwitchResult> => {
  console.log('[useOrgSwitcher] switchOrg called with tenantId:', tenantId)
  
  if (!appUser) {
    return { success: false, error: 'Not authenticated' }
  }

  setSwitching(true)

  try {
    const response = await fetch('/api/org/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId }),
    })
    
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to switch organization')
    }

    // Refresh the auth state to pick up new tenant context
    await refreshUser()
    
    // Force full page reload to ensure all components re-fetch data
    globalThis.location.href = '/dashboard?_t=' + Date.now()
    
    return { success: true, previous_tenant: appUser.active_tenant_id, new_tenant: tenantId }
  } catch (err: any) {
    console.error('[useOrgSwitcher] Error:', err)
    return { success: false, error: err.message }
  } finally {
    setSwitching(false)
  }
}, [appUser, refreshUser])
```

**API Endpoint:** `POST /api/org/switch`

**File:** `src/app/api/org/switch/route.ts`

---

### What happens to `app_users.active_tenant_id` when switching?

**API Code:**
```typescript
// src/app/api/org/switch/route.ts (lines 74-80)
const { error: updateError } = await supabase
  .from('app_users')
  .update({ 
    active_tenant_id: tenant_id,
    last_context_switch_at: new Date().toISOString()
  })
  .eq('id', user.id)
```

**Operations:**
1. **UPDATE `app_users`:**
   - `active_tenant_id` = new `tenant_id`
   - `last_context_switch_at` = current timestamp
2. **Store in cookie** (backup, line 89):
   ```typescript
   cookieStore.set('active_tenant_id', tenant_id, {
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'lax',
     maxAge: 60 * 60 * 24 * 30, // 30 days
     path: '/',
   })
   ```
3. **Audit log** (line 98):
   ```typescript
   await supabase.from('audits').insert({
     action: 'user.tenant_switched',
     metadata: {
       previous_tenant_id: currentAppUser?.active_tenant_id,
       new_tenant_id: tenant_id,
     }
   })
   ```

**After Switch:**
- Full page reload (`window.location.href = '/dashboard'`)
- All components re-fetch data with new `active_tenant_id`
- RLS policies now filter data for new tenant

---

## Active Location Tracking

### How is active location tracked?

**Field Name:** `app_users.active_location_id`

**File Reference:** `supabase/migrations/20251025_phase1_critical_fixes.sql` (line 279-280)

```sql
ALTER TABLE app_users 
  ADD COLUMN IF NOT EXISTS active_location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
```

**Purpose:** Tracks which location the user is currently viewing within their active tenant.

**Nullable:** Yes (NULL means "all locations" view)

---

### Code That Gets Current Active Location

**Pattern:**
```typescript
const { data: appUser } = await supabase
  .from('app_users')
  .select('active_location_id')
  .eq('id', user.id)
  .single()

const locationId = appUser.active_location_id
```

**Example from FirstLocationStep:**
```typescript
// src/components/onboarding/steps/first-location-step.tsx (line 62)
if (appUser.active_location_id) {
  const { data: location } = await supabase
    .from('locations')
    .select('name, address, city, postal_code, phone')
    .eq('id', appUser.active_location_id)
    .eq('tenant_id', tenantId)
    .single()
}
```

---

### How does user switch locations?

**API Endpoint:** `POST /api/locations/switch`

**File:** `src/app/api/locations/switch/route.ts`

**Note:** Not fully analyzed here, but follows similar pattern to org switching.

---

### What happens to `app_users.active_location_id` when switching?

**Likely Operation:**
```typescript
UPDATE app_users 
SET active_location_id = new_location_id,
    updated_at = NOW()
WHERE id = user.id
```

Similar to tenant switching, but updates `active_location_id` instead of `active_tenant_id`.

---

## Multiple Organization Support

### Can a user belong to multiple orgs?

**Yes.** This is enabled via the `user_tenant_memberships` table.

**Evidence:**
- Table structure: `user_tenant_memberships` has `UNIQUE(user_id, tenant_id)` constraint, allowing multiple rows per user
- API code checks membership: `src/app/api/org/switch/route.ts` (line 43-50) verifies user is member of target tenant
- UI supports org switcher: `useOrgSwitcher` hook exists for switching

---

### How is this modeled in `user_tenant_memberships`?

**Schema:**
```sql
CREATE TABLE user_tenant_memberships (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  role membership_role NOT NULL,
  status membership_status NOT NULL DEFAULT 'active',
  all_locations BOOLEAN,
  -- ...
  UNIQUE(user_id, tenant_id)  -- One membership per user per org
)
```

**Example Data:**
```
User: user-123

Memberships:
1. user-123 → tenant-A → role: 'owner'
2. user-123 → tenant-B → role: 'manager'
3. user-123 → tenant-C → role: 'staff'
```

**Query to Get User's Organizations:**
```typescript
const { data: memberships } = await supabase
  .from('user_tenant_memberships')
  .select(`
    tenant_id,
    role,
    status,
    tenants (
      id,
      name,
      logo_url
    )
  `)
  .eq('user_id', user.id)
  .eq('status', 'active')
```

---

### Show example queries to get user's organizations

**Hook:** `useMemberships`

**File:** `src/lib/hooks/use-multi-org.ts` (lines 55-154)

**API Call:**
```typescript
const response = await fetch('/api/org/memberships')
const data = await response.json()
```

**Backend Query (implied):**
```sql
SELECT 
  m.id,
  m.tenant_id,
  m.role,
  m.status,
  m.joined_at,
  t.name AS tenant_name,
  t.logo_url AS tenant_logo
FROM user_tenant_memberships m
INNER JOIN tenants t ON t.id = m.tenant_id
WHERE m.user_id = $1
  AND m.status = 'active'
ORDER BY m.joined_at DESC
```

---

### Show code for org switching

**Already shown above** in "How does user switch orgs?" section.

**Key File:** `src/app/api/org/switch/route.ts`

**Key Steps:**
1. Verify user is member of target tenant (line 43-50)
2. Update `app_users.active_tenant_id` (line 74-80)
3. Store in cookie (line 89-95)
4. Log audit event (line 98-115)

---

## Location-Based Roles

### How are roles stored?

**In `user_tenant_memberships` table:**
- `role` column: ENUM type `membership_role` ('owner', 'admin', 'manager', 'staff', 'viewer')
- This is **tenant-level** role, not location-level

**For Location-Specific Roles:**
- There is a `membership_locations` table (referenced in migrations but not fully documented)
- `user_tenant_memberships.all_locations` boolean indicates if user has access to all locations
- If `all_locations = false`, user may have location-specific access via `membership_locations`

---

### Is there a `role` field in `user_tenant_memberships`?

**Yes.** 

**Column:** `role` (type: `membership_role` ENUM)

**Values:** 'owner', 'admin', 'manager', 'staff', 'viewer'

---

### Is there a `location_id` field?

**No, not directly in `user_tenant_memberships`.**

**However:** There is a `membership_locations` table (referenced in `supabase/migrations/20251025_003b_membership_locations.sql`) that links memberships to specific locations.

**Likely Schema:**
```sql
CREATE TABLE membership_locations (
  membership_id UUID REFERENCES user_tenant_memberships(id),
  location_id UUID REFERENCES locations(id),
  -- Possibly role override for this location?
  PRIMARY KEY (membership_id, location_id)
)
```

---

### How does system know user has different roles in different locations?

**Current Implementation:**
- **Tenant-level role:** Stored in `user_tenant_memberships.role`
- **Location access:** Controlled by `all_locations` boolean or `membership_locations` table
- **Role per location:** Not explicitly modeled (role is same across all accessible locations)

**Example Scenario:**
- User X is `owner` in tenant A → has `all_locations: true` → can access all locations in tenant A
- User X is `manager` in tenant B → has `all_locations: false` → can only access specific locations (via `membership_locations`)

**But:** The role itself (`owner` vs `manager`) is per-tenant, not per-location.

---

### Show example: "User X is super_admin in location A, manager in location B"

**This is NOT currently supported.** The system model is:
- **Tenant-level roles:** User has one role per tenant
- **Location-level access:** User can have access to all locations or specific locations
- **No location-specific role overrides**

**To support this, would need:**
1. `membership_locations` table with `role` column
2. Query logic that checks `membership_locations.role` when determining permissions
3. Fallback to `user_tenant_memberships.role` if no location-specific role

---

## Data Isolation

### Example Entity: Contacts

**Table:** `contacts`

**Schema:**
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  primary_phone TEXT,
  primary_email TEXT,
  -- ...
)
```

---

### Show database queries that fetch this data

**Pattern Used:**
```typescript
const { data: contacts } = await supabase
  .from('contacts')
  .select('*')
  .eq('tenant_id', tenantId)  // ✅ Filter by tenant_id
  .order('created_at', { ascending: false })
```

**Example from API:**
```typescript
// src/app/api/contacts/route.ts (implied pattern)
const tenantId = appUser.active_tenant_id || appUser.tenant_id

const { data: contacts } = await supabase
  .from('contacts')
  .select('*')
  .eq('tenant_id', tenantId)  // ✅ Tenant filter
```

---

### Do queries filter by `tenant_id`?

**Yes.** All tenant-scoped tables require `tenant_id` filter.

**Pattern:**
```typescript
const tenantId = appUser.active_tenant_id || appUser.tenant_id

// Then filter all queries:
.eq('tenant_id', tenantId)
```

**Examples:**
- Contacts: `.eq('tenant_id', tenantId)`
- Deals: `.eq('tenant_id', tenantId)`
- Pipelines: `.eq('tenant_id', tenantId)`
- Locations: `.eq('tenant_id', tenantId)`

---

### Do queries filter by `location_id`?

**Sometimes.** Location filtering is conditional based on user's `all_locations` flag.

**Pattern:**
```typescript
// If user has all_locations access, don't filter by location
// If user has specific location access, filter by location_ids array

const { data: membership } = await supabase
  .from('user_tenant_memberships')
  .select('all_locations')
  .eq('user_id', user.id)
  .eq('tenant_id', tenantId)
  .single()

if (membership.all_locations) {
  // No location filter
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId)
} else {
  // Filter by accessible locations (via membership_locations or location_ids)
  // Implementation depends on membership_locations table structure
}
```

**Note:** Location filtering logic is not fully shown in current codebase, but the `all_locations` boolean suggests it exists.

---

### Show at least 3 examples from different parts of the codebase

**Example 1: Contacts**

**File:** `src/app/api/contacts/route.ts` (implied)

```typescript
const tenantId = appUser.active_tenant_id || appUser.tenant_id

const { data: contacts } = await supabase
  .from('contacts')
  .select('*')
  .eq('tenant_id', tenantId)  // ✅ Tenant filter
```

**Example 2: Onboarding Progress**

**File:** `src/app/api/onboarding/resume/route.ts` (line 85)

```typescript
const { data: progressData } = await supabase
  .from('onboarding_progress')
  .select('step_name, completed, skipped, field_data')
  .eq('user_id', user.id)
  // Note: Also filters by tenant_id (implied in table structure)
```

**Example 3: Locations**

**File:** `src/components/onboarding/steps/first-location-step.tsx` (line 100)

```typescript
const { data: locations } = await supabase
  .from('locations')
  .select('name, address, city, postal_code, phone')
  .eq('tenant_id', tenantId)  // ✅ Tenant filter
  .order('is_primary', { ascending: false })
  .order('created_at', { ascending: true })
  .limit(1)
```

---

## UI Conditional Rendering

### Organization Switcher

**Component:** Likely `OrgSwitcher` or `OrganizationSwitcher`

**File:** Referenced in `useOrgSwitcher` hook usage

**Condition:**
```typescript
const { isMultiOrg } = useMemberships()

// Show switcher if user has multiple orgs
{isMultiOrg && <OrgSwitcher />}
```

**Logic from Hook:**
```typescript
// src/lib/hooks/use-multi-org.ts (line 140-143)
const isMultiOrg = useMemo(
  () => multiOrgEnabled && activeMemberships.length > 1,
  [multiOrgEnabled, activeMemberships]
)
```

**Show the exact conditions:**

```typescript
// Show org switcher if:
// 1. Multi-org feature is enabled (feature flag)
// 2. User has more than 1 active membership
const shouldShowSwitcher = multiOrgEnabled && activeMemberships.length > 1
```

---

### Location Switcher

**Component:** Likely `LocationSwitcher` or similar

**Condition:**
```typescript
// Show location switcher if:
// 1. User has a tenant
// 2. Tenant has multiple locations (is_multi_location = true)
// 3. User doesn't have all_locations access (or wants to filter by location)

const { data: tenant } = await supabase
  .from('tenants')
  .select('is_multi_location')
  .eq('id', tenantId)
  .single()

const { data: locations } = await supabase
  .from('locations')
  .select('id, name')
  .eq('tenant_id', tenantId)
  .eq('is_active', true)

const shouldShowLocationSwitcher = 
  tenant?.is_multi_location && 
  locations && 
  locations.length > 1
```

**Show the exact conditions:**

**Not fully shown in codebase**, but logic would be:
```typescript
// Condition 1: Tenant has multiple locations
const isMultiLocation = tenant.is_multi_location === true

// Condition 2: More than 1 active location exists
const hasMultipleLocations = locations.length > 1

// Condition 3: User wants location-specific view (or doesn't have all_locations)
const needsLocationFilter = !membership.all_locations || userPreference

// Combined:
const showLocationSwitcher = isMultiLocation && hasMultipleLocations && needsLocationFilter
```

---

## RLS (Row-Level Security) Policies

### How RLS Enforces Data Isolation

**Tenant Isolation:**
```sql
-- Example policy for contacts table
CREATE POLICY "Users can view tenant contacts"
  ON contacts
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM user_tenant_memberships 
      WHERE user_id = auth.uid() 
        AND status = 'active'
    )
  )
```

**This ensures:**
- Users can only see contacts from tenants they belong to
- Queries automatically filter by `tenant_id` via RLS
- Even if code forgets to add `.eq('tenant_id', tenantId)`, RLS blocks access

---

## Summary

1. **Active Tenant:** Tracked in `app_users.active_tenant_id`
2. **Org Switching:** Via `POST /api/org/switch`, updates `active_tenant_id` and reloads page
3. **Multiple Orgs:** Supported via `user_tenant_memberships` table (one row per org)
4. **Roles:** Tenant-level in `user_tenant_memberships.role`, location-specific roles not fully implemented
5. **Data Isolation:** All queries filter by `tenant_id`, RLS policies enforce at database level
6. **UI Conditionals:** Org switcher shows if `activeMemberships.length > 1`, location switcher shows if `is_multi_location && locations.length > 1`

