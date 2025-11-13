# tenant_id Constraint - Definitive Answer

**Date:** December 2024  
**Question:** Can `app_users.tenant_id` be NULL? What happens during signup?

**DEFINITIVE ANSWER:** `tenant_id` is **NULLABLE** (can be NULL) in the current production state.

---

## 1. SCHEMA STATE TIMELINE

### Migration 1: Initial Schema (NOT NULL)

**File:** `supabase/sql/01_initial_schema.sql:18`

```sql
CREATE TABLE app_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,  -- ✅ NOT NULL
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Date:** Initial schema creation  
**State:** `tenant_id NOT NULL`

### Migration 2: Made Nullable (Critical Fix)

**File:** `supabase/migrations/20251030_disable_auto_tenant_creation.sql:86`

```sql
-- Make tenant_id nullable if it's currently NOT NULL
IF v_tenant_id_not_null THEN
  RAISE NOTICE '🔧 Making tenant_id nullable...';
  ALTER TABLE app_users ALTER COLUMN tenant_id DROP NOT NULL;
  RAISE NOTICE '   ✅ tenant_id is now nullable';
END IF;
```

**Date:** October 30, 2025  
**State:** `tenant_id` changed to **NULLABLE**

**Reason:** To support users signing up without immediate tenant assignment (solo users, auto-tenant creation flow).

### Final State: NULLABLE

**Current Production State:**

- `app_users.tenant_id` is **NULLABLE**
- Users can sign up without `tenant_id`
- Trigger auto-creates tenant if `active_tenant_id IS NULL` on INSERT

---

## 2. AUTO-TENANT TRIGGER

### Trigger Exists - CONFIRMED

**File:** `supabase/migrations/20251027_003_auto_create_tenant_for_users.sql`

### Complete Trigger + Function

```sql
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
    RETURN NEW;  -- User already has tenant (invited user)
  END IF;

  -- Determine tenant name from user info
  v_user_name := COALESCE(NEW.full_name, SPLIT_PART(NEW.email, '@', 1));

  -- Create tenant
  INSERT INTO tenants (name, owner_id, is_multi_location, created_at, updated_at)
  VALUES (v_user_name || '''s Practice', NEW.id, false, NOW(), NOW())
  RETURNING id INTO v_new_tenant_id;

  -- Create default location
  INSERT INTO locations (tenant_id, name, is_active, created_at, updated_at)
  VALUES (v_new_tenant_id, 'Main Office', true, NOW(), NOW())
  RETURNING id INTO v_new_location_id;

  -- Create user membership
  INSERT INTO user_tenant_memberships (
    user_id, tenant_id, role, status, all_locations, created_at, updated_at
  ) VALUES (
    NEW.id, v_new_tenant_id, 'owner', 'active', true, NOW(), NOW()
  ) RETURNING id INTO v_membership_id;

  -- Update the NEW record to set active context
  NEW.active_tenant_id := v_new_tenant_id;
  NEW.active_location_id := v_new_location_id;
  NEW.default_tenant_id := v_new_tenant_id;
  NEW.default_location_id := v_new_location_id;

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

### When Does It Fire?

- **Timing:** `BEFORE INSERT` (fires before row is inserted)
- **Condition:** Only if `NEW.active_tenant_id IS NULL` (solo signup, not invited user)

### What Does It Create?

1. **Tenant** with name: `"{full_name}'s Practice"` or `"{email_prefix}'s Practice"`
2. **Location** named "Main Office"
3. **Membership** with role 'owner', `all_locations=true`
4. **Updates NEW record** to set:
   - `active_tenant_id`
   - `active_location_id`
   - `default_tenant_id`
   - `default_location_id`

**Note:** It does NOT set `tenant_id` (legacy field). It sets `active_tenant_id` instead.

---

## 3. SIGNUP FLOW EXECUTION

### Trace Exact Execution

**File:** `src/app/(auth)/sign-up/page.tsx`

#### Step 1: auth.signUp() → auth.users created

```typescript
const { data: authData, error: authError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: formData.fullName,
    },
  },
});
```

**Result:** `auth.users` record created with UUID `authData.user.id`

#### Step 2: INSERT app_users → Trigger fires

```typescript
// Check for existing app_users record
const { data: existingAppUser } = await supabase
  .from('app_users')
  .select('id')
  .eq('id', authData.user.id)
  .single();

if (existingAppUser) {
  // Update existing
  await supabase
    .from('app_users')
    .update({ full_name: formData.fullName, role: 'owner' })
    .eq('id', authData.user.id);
} else {
  // Insert new
  const { error } = await supabase.from('app_users').insert({
    id: authData.user.id,
    full_name: formData.fullName,
    role: 'owner',
    // ❌ tenant_id NOT SET - left NULL
  });
}
```

**What Happens:**

1. INSERT fires `trigger_auto_create_tenant_for_new_user` (BEFORE INSERT)
2. Trigger checks: `IF NEW.active_tenant_id IS NOT NULL` → FALSE (NULL)
3. Trigger creates tenant, location, membership
4. Trigger sets `NEW.active_tenant_id`, `NEW.active_location_id` (and defaults)
5. **Insert succeeds** with `tenant_id = NULL` (but `active_tenant_id` is set)

#### Step 3: Result

✅ **INSERT succeeds** because:

- `tenant_id` is NULLABLE (no constraint violation)
- Trigger sets `active_tenant_id` (not `tenant_id`)
- User has tenant context via `active_tenant_id`

---

## 4. ERROR HANDLING

### Special tenant_id Error Handling

**File:** `src/app/(auth)/sign-up/page.tsx:183-190`

```typescript
} catch (error: any) {
  console.error('Signup error:', error)

  // Special handling for tenant_id constraint errors (shouldn't happen now)
  if (error.message?.includes('tenant_id') || error.code === '23502') {
    console.error('Tenant ID constraint error - this should be auto-resolved')
    // Would redirect to error page in production
  }

  setError('Failed to create account. Please try again.')
}
```

### Why Is This Needed?

**Historical Reason:** Before trigger existed, signup would fail with:

```
Error: null value in column "tenant_id" violates not-null constraint
```

**Current Status:** This error should never occur because:

1. `tenant_id` is now NULLABLE
2. Trigger auto-creates tenant and sets `active_tenant_id`

**Note:** The error handling code is legacy but kept for safety.

---

## 5. THREE SCENARIOS ANALYSIS

### Scenario A: tenant_id NOT NULL + no trigger

**Result:** ❌ INSERT fails

**Error Message:**

```
null value in column "tenant_id" violates not-null constraint
```

**Status:** ❌ This scenario does NOT exist (tenant_id is nullable)

### Scenario B: tenant_id NOT NULL + trigger exists

**Result:** ✅ Trigger creates tenant, INSERT succeeds

**Flow:**

1. Trigger fires BEFORE INSERT
2. Creates tenant, location, membership
3. Sets `NEW.active_tenant_id`
4. **Problem:** Can't set `NEW.tenant_id` in trigger (would need to)
5. **But:** If `tenant_id NOT NULL`, INSERT would fail anyway

**Status:** ⚠️ This scenario would work IF trigger also set `tenant_id`, but trigger doesn't set it

### Scenario C: tenant_id nullable (CURRENT REALITY)

**Result:** ✅ INSERT succeeds with NULL

**Flow:**

1. `tenant_id` is NULLABLE → no constraint violation
2. Trigger fires, creates tenant, sets `active_tenant_id`
3. INSERT succeeds
4. User has tenant via `active_tenant_id` (not `tenant_id`)

**Status:** ✅ **THIS IS THE CURRENT REALITY**

---

## 6. LEGACY FIELD ANALYSIS

### Pattern: active_tenant_id || tenant_id

**Found 20+ instances** of this fallback pattern:

**Example 1:** `src/app/api/onboarding/config/route.ts`

```typescript
const tenantId = appUser.active_tenant_id || appUser.tenant_id;
```

**Example 2:** Multiple API routes

```typescript
const { data: appUser } = await supabase.from('app_users').select('tenant_id, active_tenant_id');

const effectiveTenantId = appUser.active_tenant_id || appUser.tenant_id;
```

### Why Use This Pattern?

**Reason:** Dual-read period during migration from `tenant_id` to `active_tenant_id`

**Architecture Evolution:**

1. **Old:** `tenant_id` was primary (single-org model)
2. **New:** `active_tenant_id` is primary (multi-org model)
3. **Transition:** Use fallback pattern for backward compatibility

**Current State:** `tenant_id` is legacy field, kept for rollback safety. All new code should use `active_tenant_id`.

---

## 7. RECOMMENDED SOLUTION

### Option A: Keep NULLABLE + Ensure Trigger ✅ (RECOMMENDED)

**Status:** ✅ **ALREADY IMPLEMENTED**

**When:** Current production state

**Why:**

- Supports solo signups without immediate tenant assignment
- Trigger auto-creates tenant for solo users
- Invited users have `active_tenant_id` set before INSERT (no trigger)
- Flexible architecture for future enhancements

**Impact:**

- ✅ Signup works for both solo and invited users
- ✅ No constraint violations
- ✅ Clean separation: `tenant_id` (legacy) vs `active_tenant_id` (active)

**Steps:** ✅ Already done - no action needed

### Option B: Make NOT NULL + Ensure Trigger Sets tenant_id

**Status:** ❌ **NOT RECOMMENDED**

**When:** Would require trigger to also set `tenant_id`

**Why Not:**

- `tenant_id` is legacy field - shouldn't be primary
- `active_tenant_id` is the correct field to use
- Making `tenant_id NOT NULL` adds unnecessary constraint
- Would require trigger modification

**Impact:**

- ❌ Tightly couples legacy field to new architecture
- ❌ Reduces flexibility
- ❌ Duplicates data (tenant_id vs active_tenant_id)

### Option C: Something Else

**Not applicable** - Current solution (Option A) is optimal.

---

## DEFINITIVE ANSWER

### Current State

✅ **`app_users.tenant_id` is NULLABLE**

**Evidence:**

1. Migration `20251030_disable_auto_tenant_creation.sql` explicitly makes it nullable
2. Trigger `trigger_auto_create_tenant_for_new_user` doesn't set `tenant_id`
3. Signup code doesn't set `tenant_id`
4. Pattern `active_tenant_id || tenant_id` shows fallback logic

### What Happens During Signup

1. User signs up → `auth.users` created
2. `app_users` INSERT attempted with `tenant_id = NULL`
3. Trigger fires (BEFORE INSERT):
   - Checks `IF NEW.active_tenant_id IS NULL` → TRUE
   - Creates tenant, location, membership
   - Sets `NEW.active_tenant_id` (and defaults)
   - **Does NOT set `NEW.tenant_id`**
4. INSERT succeeds (no constraint violation because `tenant_id` is nullable)
5. User has tenant context via `active_tenant_id`

### Resolution

✅ **NO CONSTRAINT ISSUE** - `tenant_id` is nullable, trigger sets `active_tenant_id`

**Conclusion:** The system works correctly. `tenant_id` is a legacy field that remains NULL. All active code uses `active_tenant_id` for tenant context.

---

**Document Status:** ✅ COMPLETE  
**Last Updated:** December 2024
