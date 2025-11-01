# 🏗️ ARCHITECTURE CHANGE: REMOVE AUTO-TENANT CREATION

## 📋 EXECUTIVE SUMMARY

**Goal:** Change the sign-up flow so solo users can sign up WITHOUT automatically creating an organization. Users should only get a tenant when they explicitly create one.

**Impact Level:** 🟡 **MODERATE** - Changes core sign-up logic but should not break existing users or features.

---

## 🎯 WHAT WILL CHANGE

### 1. **Sign-Up Flow** (`src/app/(auth)/sign-up/page.tsx`)

**Current Behavior:**
- User signs up → Tenant automatically created → App user created with `tenant_id` → Default pipeline created
- **Lines 177-254**: Tenant creation, app user with tenant_id, pipeline creation

**New Behavior:**
- User signs up → Only app user created (NO tenant_id) → User can browse dashboard → When they try to create data, `OrgRequiredModal` appears
- **Remove**: Tenant creation logic (lines 177-193)
- **Remove**: `tenant_id` from app_users insert (line 227)
- **Remove**: Default pipeline creation (lines 240-254)

**Code Changes:**
```typescript
// REMOVE THIS ENTIRE SECTION:
// Step 2: Create tenant (lines 177-193)
// Step 3: app_users insert with tenant_id (line 227)
// Step 4: Create default pipeline (lines 240-254)

// KEEP ONLY:
// Step 1: Auth signup
// Step 3: app_users insert WITHOUT tenant_id
```

---

### 2. **Database Trigger** (`supabase/migrations/20251027_003_auto_create_tenant_for_users.sql`)

**Current Behavior:**
- Trigger `trigger_auto_create_tenant_for_new_user` fires on `app_users` INSERT
- Automatically creates tenant, location, and membership if `active_tenant_id IS NULL`

**New Behavior:**
- **DISABLE/DROP** the trigger completely
- Users will remain without tenants until they explicitly create one

**Migration Needed:**
```sql
DROP TRIGGER IF EXISTS trigger_auto_create_tenant_for_new_user ON app_users;
DROP FUNCTION IF EXISTS public.auto_create_tenant_for_new_user();
```

---

### 3. **Database Schema**

**Current State:**
- `app_users.tenant_id` is legacy field (should already be nullable)
- `app_users.active_tenant_id` is nullable (already correct)
- No schema changes needed ✅

**Verification:**
- Check that `app_users.tenant_id` allows NULL (it should based on migrations)
- Confirm `app_users.active_tenant_id` is nullable

---

### 4. **RLS Policies** (Already Correct ✅)

**Current Behavior:**
- `get_current_user_tenant_id()` returns:
  1. `active_tenant_id` (if exists and has valid membership)
  2. First membership from `user_tenant_memberships`
  3. **NULL** (if no memberships)

**Impact:**
- ✅ RLS policies already handle NULL gracefully
- ✅ Queries with `tenant_id = get_current_user_tenant_id()` return empty results when NULL
- ✅ This is **CORRECT BEHAVIOR** - users without orgs should see no data

**No Changes Needed** ✅

---

### 5. **Frontend Components**

#### A. **Org Guard System** (Already Works ✅)

**Current Behavior:**
- `useOrgGuard()` checks `appUser?.active_tenant_id`
- Shows `OrgRequiredModal` if `active_tenant_id` is NULL
- This is **EXACTLY** what we want!

**Files:**
- `src/lib/hooks/use-org-guard.ts` ✅ No changes needed
- `src/components/guards/org-required-modal.tsx` ✅ No changes needed

---

#### B. **Dashboard** (`src/app/dashboard/page.tsx`)

**Current Behavior:**
- May show errors if queries return empty arrays
- May show "No data" states

**Expected Behavior:**
- Dashboard should show empty states gracefully
- RLS will block data access → queries return empty arrays → UI shows "Create organization to get started"

**Potential Issues:**
- Need to verify dashboard doesn't crash on empty data
- Should test with user who has no tenant

**Risk:** 🟡 **LOW** - Most dashboards handle empty states

---

#### C. **Tenant Context Service** (`src/lib/services/tenant-context.ts`)

**Current Behavior:**
- Returns `null` if `active_tenant_id` is NULL (line 65-67)
- Components using this will get `null`

**Impact:**
- ✅ Returns `null` gracefully
- Components should check for null before rendering

**Risk:** 🟡 **LOW** - Should be handled with null checks

---

### 6. **Org Creation Flow** (`/api/orgs/create`)

**Current Behavior:**
- Creates tenant, location, membership, and sets `active_tenant_id`
- Works perfectly ✅

**After Changes:**
- Will work **BETTER** because it's now the ONLY way to create an org
- Users will be explicitly prompted to create one

**No Changes Needed** ✅

---

## ❌ WHAT WILL **NOT** CHANGE

1. ✅ **Existing Users**: Users who already have tenants will continue to work normally
2. ✅ **RLS Policies**: Already handle NULL correctly
3. ✅ **Multi-Org Support**: Unchanged - users can still belong to multiple orgs
4. ✅ **Invitation Flow**: Unchanged - invited users still get tenants via invitations
5. ✅ **Org Switcher**: Unchanged - works with memberships
6. ✅ **Database Schema**: No table structure changes needed

---

## 🔍 POTENTIAL RISKS & MITIGATIONS

### Risk 1: **Dashboard Crashes on Empty Data** 🟡 LOW

**Scenario:** Dashboard component tries to access properties on `null` tenant context.

**Mitigation:**
- Test dashboard with user having no tenant
- Add null checks in dashboard components
- Show friendly "Create organization" prompt

**Files to Check:**
- `src/app/dashboard/page.tsx`
- Components that use `getTenantContext()`

---

### Risk 2: **Queries Fail with NULL tenant_id** 🟢 VERY LOW

**Scenario:** Some queries might not handle NULL tenant_id correctly.

**Mitigation:**
- RLS policies already return empty results for NULL
- Queries should handle empty arrays gracefully

**Status:** ✅ Already handled by RLS

---

### Risk 3: **Legacy Code Uses tenant_id** 🟡 LOW

**Scenario:** Some old code might still use `app_users.tenant_id` (legacy field).

**Mitigation:**
- Search codebase for `app_users.tenant_id` references
- Replace with `active_tenant_id` or membership checks

**Status:** ✅ Should check, but likely minimal impact

---

### Risk 4: **Sign-Up Rollback Issues** 🟢 VERY LOW

**Scenario:** If sign-up fails after auth user creation, cleanup might be affected.

**Mitigation:**
- Auth user cleanup is handled by Supabase
- No tenant to cleanup if we're not creating one
- Actually **SIMPLER** now!

---

## 📊 TESTING CHECKLIST

### ✅ Must Test:

1. **New User Sign-Up**
   - [ ] User can sign up without tenant creation
   - [ ] User can log in and see dashboard
   - [ ] User sees appropriate empty states

2. **Org Creation Flow**
   - [ ] User can create organization via `/api/orgs/create`
   - [ ] Tenant, location, membership created correctly
   - [ ] `active_tenant_id` set correctly
   - [ ] User can now access data

3. **Org Required Modal**
   - [ ] Modal appears when user tries to create contact/deal without org
   - [ ] User can create org from modal
   - [ ] User can join org from modal (if invited)

4. **Existing Users**
   - [ ] Users with existing tenants still work
   - [ ] Data access unchanged
   - [ ] Multi-org switching works

5. **RLS Policies**
   - [ ] Users without tenant see no data (correct)
   - [ ] Users with tenant see their data (correct)
   - [ ] No unauthorized access possible

---

## 🚀 DEPLOYMENT PLAN

### Phase 1: **Database Migration** (Backwards Compatible)

1. Drop auto-create trigger (idempotent)
2. Verify existing users unaffected
3. Test with test user having no tenant

### Phase 2: **Frontend Changes** (Low Risk)

1. Update sign-up page to remove tenant creation
2. Test sign-up flow
3. Test org creation flow

### Phase 3: **Verification**

1. Test complete sign-up → dashboard → create org flow
2. Test existing users still work
3. Test multi-org scenarios

---

## 📈 ARCHITECTURE IMPACT

### Before:
```
Sign-Up → Auto-Create Tenant → User Has Org → Can Create Data
```

### After:
```
Sign-Up → No Tenant → User Browses → Tries to Create Data → 
  OrgRequiredModal → User Creates Org → Now Has Org → Can Create Data
```

### Database State:

**Before (Solo User Sign-Up):**
```
app_users: { id, tenant_id: "abc", active_tenant_id: "abc" }
tenants: { id: "abc", name: "John's Practice" }
user_tenant_memberships: { user_id, tenant_id: "abc", role: "owner" }
```

**After (Solo User Sign-Up):**
```
app_users: { id, tenant_id: NULL, active_tenant_id: NULL }
tenants: (none)
user_tenant_memberships: (none)
```

**After (User Creates Org):**
```
app_users: { id, tenant_id: NULL, active_tenant_id: "xyz" }
tenants: { id: "xyz", name: "My Practice" }
user_tenant_memberships: { user_id, tenant_id: "xyz", role: "owner" }
```

---

## ✅ CONCLUSION

**Overall Impact:** 🟡 **MODERATE** - Changes core sign-up logic but architecture is sound.

**Breaking Changes:** 🟢 **NONE** - Existing users unaffected.

**Risk Level:** 🟡 **LOW** - Well-tested guard system already in place.

**Architecture Changes:** 🟢 **MINIMAL** - Removing auto-creation aligns with correct membership-based architecture.

---

## 📝 FILES TO MODIFY

1. ✅ `src/app/(auth)/sign-up/page.tsx` - Remove tenant creation
2. ✅ `supabase/migrations/YYYYMMDD_disable_auto_tenant_creation.sql` - Drop trigger
3. 🔍 `src/app/dashboard/page.tsx` - Verify empty state handling (may need updates)
4. 🔍 `src/lib/services/tenant-context.ts` - Verify null handling (should be fine)

---

## 🎯 SUCCESS CRITERIA

✅ Solo users can sign up without tenant
✅ Solo users can browse dashboard (read-only)
✅ Solo users see `OrgRequiredModal` when trying to create data
✅ Solo users can create org successfully
✅ Existing users continue to work normally
✅ No data leaks or security issues
✅ Multi-org support still works

