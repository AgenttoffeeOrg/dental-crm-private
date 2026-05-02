# Organization & Tenant Creation Flow

## Overview

This document traces the complete flow of organization (tenant) creation, including database operations, default location setup, role assignment, and invite code handling.

---

## Create Organization Endpoint

### Endpoint Details

**Route:** `POST /api/orgs/create`

**File Path:** `src/app/api/orgs/create/route.ts`

**Authentication:** Required (user must be authenticated)

**Request Body:**
```typescript
{
  name: string,              // Required, 2-100 chars
  location_name?: string     // Optional, defaults to "Main Office"
}
```

**Response:**
```typescript
{
  success: true,
  organization: {
    tenant: { id: string, name: string },
    location: { id: string, name: string },
    your_role: 'owner'
  },
  message: string,
  warning?: string  // If user already has an org
}
```

---

## Complete Code with Line-by-Line Explanation

**File:** `src/app/api/orgs/create/route.ts`

### Step 1: Authentication (Lines 67-75)

```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser()

if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Purpose:** Verify user is authenticated.

---

### Step 2: Get App User (Lines 80-92)

```typescript
const { data: appUser, error: appUserError } = await supabase
  .from('app_users')
  .select('id, full_name, active_tenant_id')
  .eq('id', user.id)
  .single()
```

**Purpose:** Fetch user's app_users record to check if they already have an organization.

**Note:** Checks `active_tenant_id` to determine if user already has an org (line 120).

---

### Step 3: Create Service Client (Lines 97-111)

```typescript
serviceClient = createServiceClient()
```

**Purpose:** Create Supabase service client that bypasses RLS. This is necessary because:
- Creating a tenant requires INSERT permission on `tenants` table
- RLS policies may block regular user from creating tenants
- Service client uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS

**Critical:** If service client creation fails, the entire operation fails (lines 101-110).

---

### Step 4: Validate Request Body (Lines 127-150)

```typescript
const rawBody = await request.json()
body = CreateOrgSchema.parse(rawBody)
```

**Validation Schema (Lines 36-52):**
- `name`: 2-100 characters, no special chars (`<>{}[]\/`)
- `location_name`: Optional, 2-100 characters, defaults to "Main Office"

**Purpose:** Ensure request data is valid before database operations.

---

### Step 5: Create Tenant (Organization) (Lines 161-228)

**Code:**
```typescript
const { data: tenantData, error: tenantError } = await serviceClient
  .from('tenants')
  .insert({
    name: body.name,
    is_multi_location: false,  // Start as single-location
    account_type: 'organization',  // Required by constraint
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .select('id, name')
  .single()
```

**Database Operations:**
1. **INSERT INTO `tenants`:**
   - `name`: Organization name from request
   - `is_multi_location`: `false` (can be enabled later)
   - `account_type`: `'organization'` (required by `tenants_account_type_check` constraint)
   - `created_at`, `updated_at`: Current timestamp

**Error Handling:**
- Duplicate name (code `23505`): Returns 409 Conflict (lines 182-189)
- Other errors: Returns 500 with error details (lines 192-199)

**Returns:** `tenant` object with `id` and `name`.

---

### Step 6: Create Default Location (Lines 239-301)

**Code:**
```typescript
const { data: locationData, error: locationError } = await serviceClient
  .from('locations')
  .insert({
    tenant_id: tenant.id,
    name: body.location_name,  // "Main Office" by default
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .select('id, name')
  .single()
```

**Database Operations:**
1. **INSERT INTO `locations`:**
   - `tenant_id`: Newly created tenant ID
   - `name`: From request (defaults to "Main Office")
   - `created_at`, `updated_at`: Current timestamp
   - **Note:** Other fields (address, phone, etc.) are NULL initially

**Rollback:** If location creation fails, tenant is deleted (lines 259-260, 275, 293).

**Returns:** `location` object with `id` and `name`.

---

### Step 7: Create Owner Membership (Lines 312-378)

**Code:**
```typescript
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
```

**Database Operations:**
1. **INSERT INTO `user_tenant_memberships`:**
   - `user_id`: Creator's user ID
   - `tenant_id`: Newly created tenant ID
   - `role`: `'owner'` (highest privilege)
   - `all_locations`: `true` (owner has access to all locations)
   - `status`: `'active'`
   - `joined_at`: Auto-set to NOW() by default

**Rollback:** If membership creation fails, location and tenant are deleted (lines 334-335, 350-351, 369-370).

**Returns:** `membership` object with `id` and `role`.

---

### Step 8: Update User's Active Context (Lines 384-398)

**Code:**
```typescript
const { error: updateUserError } = await serviceClient
  .from('app_users')
  .update({
    active_tenant_id: tenant.id,
    active_location_id: location.id,
    updated_at: new Date().toISOString()
  })
  .eq('id', user.id)
```

**Database Operations:**
1. **UPDATE `app_users`:**
   - `active_tenant_id`: New tenant ID (sets current session context)
   - `active_location_id`: New location ID (sets current location context)
   - `updated_at`: Current timestamp

**Purpose:** 
- Sets the newly created org as the user's active context
- Ensures RLS policies work correctly (they check `active_tenant_id`)
- User immediately sees the new org when redirected to dashboard

**Note:** Error is non-fatal (line 395) - user can switch manually if this fails.

---

### Step 9: Audit Log (Lines 403-426)

**Code:**
```typescript
await supabase.from('audits').insert({
  user_id: user.id,
  tenant_id: tenant.id,
  location_id: location.id,
  action: 'organization.created',
  resource_type: 'tenant',
  resource_id: tenant.id,
  metadata: {
    organization_name: body.name,
    location_name: body.location_name,
    creator_name: appUser.full_name
  },
  severity: 'info'
})
```

**Purpose:** Log organization creation for audit trail. Error is non-fatal (lines 420-425).

---

## Database Operations Sequence

### Complete Sequence:

```
1. AUTHENTICATION
   └─ Get authenticated user
   
2. GET APP_USER
   └─ Fetch app_users record
   └─ Check if active_tenant_id exists (warn if yes)
   
3. CREATE SERVICE CLIENT
   └─ Bypass RLS for tenant creation
   
4. VALIDATE REQUEST
   └─ Validate name and location_name
   
5. CREATE TENANT
   └─ INSERT INTO tenants (name, is_multi_location, account_type)
   └─ Returns: tenant.id
   
6. CREATE DEFAULT LOCATION
   └─ INSERT INTO locations (tenant_id, name)
   └─ Returns: location.id
   └─ ROLLBACK if fails: DELETE tenants WHERE id = tenant.id
   
7. CREATE OWNER MEMBERSHIP
   └─ INSERT INTO user_tenant_memberships (user_id, tenant_id, role='owner')
   └─ ROLLBACK if fails: DELETE locations, DELETE tenants
   
8. UPDATE USER CONTEXT
   └─ UPDATE app_users SET active_tenant_id, active_location_id
   
9. AUDIT LOG
   └─ INSERT INTO audits (organization.created)
```

**Transaction Safety:** Steps 5-7 are NOT wrapped in a database transaction. Rollback is manual (DELETE statements). This is a **potential issue** if step 8 fails after step 7 succeeds.

---

## Default Location Details

### What is it named?

**Default Name:** `"Main Office"`

**Code Reference:** `src/app/api/orgs/create/route.ts` (line 243)

```typescript
name: body.location_name,  // Defaults to "Main Office" per schema
```

**Schema Default:** `CreateOrgSchema` (line 51) sets default to `'Main Office'`.

### What fields are populated?

**Initially Populated:**
- `id`: UUID (auto-generated)
- `tenant_id`: New tenant ID
- `name`: "Main Office" (or custom name from request)
- `created_at`: Current timestamp
- `updated_at`: Current timestamp

**Initially NULL:**
- `address`, `city`, `postal_code`, `phone`, `email`, etc.
- `is_primary`: `false` (not set during creation)
- `is_active`: `true` (default from schema)

### Is it marked as "default"?

**No explicit "default" flag.** However:
- It's the first location created for the tenant
- It can be marked as `is_primary = true` later (only one primary per tenant)

**Code Note:** The default location is NOT automatically set to `is_primary = true` during creation. This may be done later via settings or migration.

### Can it be deleted?

**Yes.** Locations can be deleted by:
- Tenant owners (via RLS policy)
- Service client (for admin operations)

**Impact:** If the primary location is deleted, the tenant still exists, but may have no active locations.

---

## Role Assignment

### What role is assigned to org creator?

**Role:** `'owner'`

**Code Reference:** `src/app/api/orgs/create/route.ts` (line 317)

```typescript
role: 'owner',  // ✅ Creator becomes owner
```

### Show the actual value stored

**Database Value:** `'owner'` (string, enum type `membership_role`)

**Stored In:** `user_tenant_memberships.role` column

**Type:** `membership_role` ENUM: `('owner', 'admin', 'manager', 'staff', 'viewer')`

### Is this in `user_tenant_memberships` table?

**Yes.** The membership record is created in Step 7 (lines 312-323).

**Complete Record:**
```sql
INSERT INTO user_tenant_memberships (
  user_id,
  tenant_id,
  role,              -- 'owner'
  all_locations,     -- true
  status,            -- 'active'
  joined_at          -- NOW()
)
```

---

## Invite Code System

### Is there an invite code field in `tenants`?

**No.** The `tenants` table does not have an `invite_code` field.

**However:** There may be a separate `pending_invites` or `user_invitations` table that stores invite codes.

### How is it generated?

**Not shown in organization creation flow.** Invite codes are likely generated when:
- Admin creates an invitation
- User invites another user to join their organization

**Likely Pattern:**
```typescript
const inviteCode = randomBytes(8).toString('hex').toUpperCase()
```

### Where is the "join with code" endpoint?

**Likely Route:** `/api/invites/accept` or `/api/orgs/join`

**File Search:** Could be in:
- `src/app/api/invites/create/route.ts`
- `src/app/api/invites/accept/route.ts`

**Note:** Not fully documented here, but referenced in codebase search results.

### Show the join flow code

**Not Available in Current Codebase Search.** The join flow would likely:
1. Validate invite code
2. Check if code is expired
3. Create `user_tenant_memberships` record with role from invitation
4. Update `app_users.active_tenant_id` if this is user's first org

### What happens when someone joins vs creates?

**Creating Org:**
- User becomes `owner`
- Creates new tenant
- Creates default location
- Sets `active_tenant_id` to new tenant

**Joining Org:**
- User receives role from invitation (likely `staff`, `manager`, etc.)
- Links to existing tenant
- Sets `active_tenant_id` to existing tenant (if first org)
- Does NOT create location

---

## Complete Flow Diagram

```
┌─────────────────────────────────────┐
│  POST /api/orgs/create              │
│  { name, location_name? }           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  1. Authenticate user               │
│     supabase.auth.getUser()         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. Get app_user                    │
│     Check active_tenant_id           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. Create service client           │
│     (bypass RLS)                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  4. Validate request                │
│     - name: 2-100 chars             │
│     - location_name: optional       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  5. CREATE TENANT                   │
│     INSERT INTO tenants             │
│     - name                          │
│     - is_multi_location: false      │
│     - account_type: 'organization'   │
│     Returns: tenant.id              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  6. CREATE DEFAULT LOCATION         │
│     INSERT INTO locations           │
│     - tenant_id                     │
│     - name: "Main Office"            │
│     Returns: location.id             │
│     ROLLBACK if fails: DELETE tenant│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  7. CREATE OWNER MEMBERSHIP         │
│     INSERT INTO user_tenant_        │
│       memberships                    │
│     - user_id                       │
│     - tenant_id                     │
│     - role: 'owner'                 │
│     - all_locations: true           │
│     ROLLBACK if fails: DELETE       │
│       location + tenant              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  8. UPDATE USER CONTEXT             │
│     UPDATE app_users                │
│     - active_tenant_id = tenant.id   │
│     - active_location_id = location.id│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  9. AUDIT LOG                       │
│     INSERT INTO audits              │
│     - action: 'organization.created' │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Return Success Response            │
│  { success, organization, message } │
└─────────────────────────────────────┘
```

---

## Critical Issues

### Issue 1: No Database Transaction

**Problem:** Steps 5-7 are not wrapped in a transaction. If step 8 fails, steps 5-7 have succeeded, leaving:
- Tenant created ✅
- Location created ✅
- Membership created ✅
- But `active_tenant_id` NOT set ❌

**Impact:** User may not see their new org immediately, or RLS policies may fail.

**Solution:** Wrap steps 5-8 in a database transaction, or ensure step 8 always succeeds.

### Issue 2: Service Client for All Operations

**Problem:** Uses service client for all operations, which bypasses RLS completely.

**Impact:** No RLS policy enforcement during org creation.

**Mitigation:** Audit logging and manual validation (checking user authentication before operations).

---

## Summary

1. **Endpoint:** `POST /api/orgs/create`
2. **Creates:** Tenant → Location → Membership (in that order)
3. **Default Location:** Named "Main Office"
4. **Role:** Creator becomes `owner` with `all_locations: true`
5. **User Context:** `active_tenant_id` and `active_location_id` are set immediately
6. **No Transaction:** Operations are not atomic (manual rollback)
7. **Service Client:** Used to bypass RLS for tenant creation














