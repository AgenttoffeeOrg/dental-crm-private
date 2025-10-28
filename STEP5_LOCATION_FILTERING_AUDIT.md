# STEP 5 AUDIT: Location-Aware Filtering

## 🔍 AUDIT SUMMARY

**Date:** October 27, 2025  
**Scope:** Contacts, Deals, Tasks, Activities - List/Export Endpoints  
**Status:** ❌ **CRITICAL GAPS FOUND**

---

## ❌ ISSUE 1: Using Legacy `tenant_id` Instead of `active_tenant_id`

### Affected Files:
1. `/api/contacts` (GET, POST, PATCH)
2. `/api/contacts/[id]` (GET, PATCH, DELETE)
3. `/api/export/contacts` (GET)

### Problem:
All contact APIs are reading `appUser.tenant_id` instead of `appUser.active_tenant_id`:

```typescript
// ❌ WRONG (line 47-48 in /api/contacts/route.ts)
const { data: appUser } = await supabase
  .from('app_users')
  .select('tenant_id')  // ❌ Should be 'active_tenant_id'
  .eq('id', user.id)
  .single()
```

```typescript
// ❌ WRONG (line 78 in /api/contacts/route.ts)
.eq('tenant_id', appUser.tenant_id)  // ❌ Should be 'active_tenant_id'
```

### Impact:
- **Data Leakage Risk:** User might see contacts from wrong organization
- **Violates Architecture:** Active context not respected
- **Breaks Org Switching:** Switching organizations won't change visible contacts

---

## ❌ ISSUE 2: NO Location Filtering

### Affected Endpoints:
1. `GET /api/contacts` - Lists ALL contacts in tenant (no location filter)
2. `GET /api/export/contacts` - Exports ALL contacts in tenant (no location filter)
3. `GET /api/deals` - (needs audit)
4. `GET /api/tasks` - (needs audit)

### Problem:
Queries return ALL data for the tenant without checking user's location access:

```typescript
// ❌ INCOMPLETE (line 75-78 in /api/contacts/route.ts)
let dbQuery = supabase
  .from('contacts')
  .select('*', { count: 'exact' })
  .eq('tenant_id', appUser.tenant_id)  // Only filters by tenant!
  // ❌ MISSING: Location access check
```

### What's Missing:
```typescript
// ✅ SHOULD BE:
let dbQuery = supabase
  .from('contacts')
  .select('*', { count: 'exact' })
  .eq('tenant_id', appUser.active_tenant_id)

// Add location filtering based on user's access
if (appUser.active_location_id) {
  // Check if user has all_locations access
  const { data: membership } = await supabase
    .from('user_tenant_memberships')
    .select('all_locations')
    .eq('user_id', user.id)
    .eq('tenant_id', appUser.active_tenant_id)
    .single()

  if (!membership?.all_locations) {
    // User has limited location access - filter
    const { data: accessibleLocations } = await supabase.rpc(
      'get_user_accessible_locations',
      { p_user_id: user.id, p_tenant_id: appUser.active_tenant_id }
    )
    
    const locationIds = accessibleLocations.map(l => l.id)
    dbQuery = dbQuery.in('location_id', locationIds)
  }
}
```

---

## ❌ ISSUE 3: Export API Accepts Client-Supplied `tenant_id`

### File: `/api/export/contacts/route.ts`

### Problem:
```typescript
// ❌ SECURITY RISK (lines 6-11)
const searchParams = request.nextUrl.searchParams
const tenantId = searchParams.get('tenant_id')  // ❌ Client can pass ANY tenant_id!

if (!tenantId) {
  return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
}
```

### Impact:
- **CRITICAL SECURITY VULNERABILITY:** User can export data from ANY tenant by passing different `tenant_id` in query string
- **No Authentication:** Export endpoint doesn't verify user has access to that tenant
- **RLS Bypassed:** Uses `createServiceClient()` which bypasses RLS

### Should Be:
```typescript
// ✅ SECURE VERSION
const supabase = await createServerSupabaseClient()  // Not service client!
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

const { data: appUser } = await supabase
  .from('app_users')
  .select('active_tenant_id, active_location_id')
  .eq('id', user.id)
  .single()

// Use active_tenant_id from app_users, NOT from query params
```

---

## ❌ ISSUE 4: Client Components Use `orgId` from Context

### File: `src/components/contacts/contacts-list.tsx`

### Problem:
```typescript
// Line 75-78
const { data: contactsData, error: contactsError } = await supabase
  .from('contacts')
  .select('*')
  .eq('tenant_id', orgId)  // ✅ Filters by tenant (good)
  // ❌ MISSING: Location filtering (bad)
```

### What's Missing:
Client component doesn't have any location awareness. Should:
1. Get `activeLocationId` from context
2. Check if user has `all_locations` access
3. Filter by accessible locations if needed

---

## 📊 DEALS & TASKS AUDIT

### Deals Export Endpoint
**File:** `/api/export/deals/route.ts`
- **Tenant Filtering:** ❌ **ACCEPTS CLIENT-SUPPLIED TENANT_ID** (Same vulnerability as contacts!)
- **Location Filtering:** ❌ Exports ALL deals
- **Security:** ❌ **CRITICAL VULNERABILITY - Can export any tenant's deals**
- **Fix Priority:** 🔴 **CRITICAL - FIX IMMEDIATELY**

### Tasks/Activities
- **Status:** ⚠️ No dedicated `/api/tasks` or `/api/activities` endpoints found
- **Note:** These might be accessed through other endpoints (e.g., `/api/contacts/[id]` or database views)
- **Action:** Verify where tasks/activities are fetched from

---

## 📊 DETAILED FINDINGS BY ENDPOINT

### 1. GET /api/contacts
- **Tenant Filtering:** ❌ Uses legacy `tenant_id`
- **Location Filtering:** ❌ None
- **Security:** ⚠️ Tenant derived from user (good) but wrong field
- **Fix Priority:** 🔴 HIGH

### 2. POST /api/contacts
- **Tenant Filtering:** ❌ Uses legacy `tenant_id`
- **Location Assignment:** ❌ No `location_id` assigned to new contacts
- **Security:** ⚠️ Contact created without location context
- **Fix Priority:** 🔴 HIGH

### 3. PATCH /api/contacts (bulk)
- **Tenant Filtering:** ❌ Uses legacy `tenant_id`
- **Location Filtering:** ❌ Can modify contacts from any location
- **Security:** ❌ No check if user has access to those contacts' locations
- **Fix Priority:** 🔴 CRITICAL

### 4. GET /api/export/contacts
- **Tenant Filtering:** ❌ **ACCEPTS CLIENT-SUPPLIED TENANT_ID**
- **Location Filtering:** ❌ Exports ALL contacts
- **Security:** ❌ **CRITICAL VULNERABILITY - Can export any tenant's data**
- **Fix Priority:** 🔴 **CRITICAL - FIX IMMEDIATELY**

### 5. GET /api/contacts/[id]
- **Tenant Filtering:** ❌ Uses legacy `tenant_id`
- **Location Filtering:** ❌ Can view contact from any location
- **Security:** ⚠️ Should check user has access to contact's location
- **Fix Priority:** 🟡 MEDIUM

---

## ✅ REQUIRED FIXES

### Fix 1: Update All APIs to Use `active_tenant_id`
**Affected Files:** All `/api/contacts/*` files

```typescript
// Change from:
.select('tenant_id')

// To:
.select('active_tenant_id, active_location_id')

// And use:
.eq('tenant_id', appUser.active_tenant_id)
```

### Fix 2: Add Location Filtering to List Endpoints
**Affected:** GET `/api/contacts`, GET `/api/deals`, GET `/api/tasks`

**Implementation:**
1. Get user's `all_locations` flag from `user_tenant_memberships`
2. If `false`, call `get_user_accessible_locations()` RPC
3. Filter results with `.in('location_id', locationIds)`

### Fix 3: Add Location Access Check to Single-Item Endpoints
**Affected:** GET `/api/contacts/[id]`, PATCH `/api/contacts/[id]`

**Implementation:**
1. After fetching item, check `item.location_id`
2. Call `user_has_location_access_rls(user.id, active_tenant_id, location_id)`
3. Return 403 if no access

### Fix 4: Assign `location_id` on Create
**Affected:** POST `/api/contacts`, POST `/api/deals`, POST `/api/tasks`

**Implementation:**
```typescript
const contactData = {
  ...validation.data,
  tenant_id: appUser.active_tenant_id,
  location_id: appUser.active_location_id,  // NEW
  created_by: user.id,
}
```

### Fix 5: **CRITICAL** - Secure Export Endpoint
**Affected:** GET `/api/export/contacts`

**Implementation:**
1. Remove client-supplied `tenant_id` param
2. Use `createServerSupabaseClient()` instead of service client
3. Get tenant + location from `active_tenant_id` / `active_location_id`
4. Apply location filtering based on user's access
5. Add audit log entry for export action

---

## 📝 NEXT STEPS

1. ✅ Complete audit of `/api/deals` endpoints
2. ✅ Complete audit of `/api/tasks` endpoints
3. ✅ Complete audit of `/api/activities` endpoints
4. 🔧 Create migration script to fix all APIs
5. 🧪 Create integration tests for location filtering
6. 📊 Create SQL tests to verify RLS + API alignment

---

## 🚨 SECURITY RISK ASSESSMENT

| Issue | Severity | Impact | Exploitability |
|-------|----------|--------|----------------|
| Export accepts client `tenant_id` | CRITICAL | Data breach | Easy |
| No location filtering in lists | HIGH | Wrong data shown | Medium |
| Using legacy `tenant_id` | HIGH | Context leakage | Medium |
| Bulk ops without location check | HIGH | Unauthorized modifications | Medium |
| No `location_id` on create | MEDIUM | Data disorganization | Low |

---

**Audited by:** AI Assistant  
**Approved by:** [Pending]  
**Next Review:** After fixes implemented

