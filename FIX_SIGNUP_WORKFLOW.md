# 🚨 URGENT: Fix Sign-Up Workflow

## The Problem

Sign-up is failing with this error:
```
null value in column "tenant_id" of relation "app_users" violates not-null constraint
```

**What's happening:**
1. ✅ Auth user gets created (`auth.users`)
2. ❌ `app_users` insert fails because `tenant_id` is `NOT NULL`
3. User tries again → sees "user already exists" (because auth user exists)
4. **Result:** Broken sign-up flow, orphaned auth users

---

## Root Cause

The database migration to make `tenant_id` nullable **hasn't been run yet**. The database still has the old constraint.

---

## Solution (3 Steps)

### Step 1: Run the Database Migration ⚡

**URGENT - Do this first!**

1. Open **Supabase SQL Editor**:
   - Go to https://supabase.com
   - Select your project
   - Click **SQL Editor** → **New query**

2. Run the migration:
   - Open `URGENT_FIX_SIGNUP.sql`
   - Copy the entire file
   - Paste into Supabase SQL Editor
   - Click **RUN**

**This will:**
- ✅ Make `app_users.tenant_id` nullable
- ✅ Fix composite primary key if needed
- ✅ Drop auto-create tenant trigger
- ✅ Verify the fix worked

---

### Step 2: Clean Up Orphaned Users 🧹

After the migration runs, clean up users that got stuck:

1. Run `DELETE_USER_toffeehegde.sql` **Step 1** (check status)
2. Review the output
3. Run **Step 2** (delete the user)
4. Run **Step 3** (verify deletion)

Or run this quick cleanup for all orphaned users:

```sql
-- Find orphaned users (auth.users exists but no app_users)
SELECT 
    au.email,
    au.id,
    au.created_at
FROM auth.users au
LEFT JOIN app_users app ON app.id = au.id
WHERE app.id IS NULL
ORDER BY au.created_at DESC;

-- If you want to delete ALL orphaned users (be careful!):
-- Uncomment the DO block below ONLY if you're sure

/*
DO $$
DECLARE
    orphaned_record RECORD;
    deleted_count int := 0;
BEGIN
    FOR orphaned_record IN 
        SELECT au.id, au.email
        FROM auth.users au
        LEFT JOIN app_users app ON app.id = au.id
        WHERE app.id IS NULL
    LOOP
        -- Delete from auth.users (cascades)
        DELETE FROM auth.users WHERE id = orphaned_record.id;
        deleted_count := deleted_count + 1;
        RAISE NOTICE 'Deleted orphaned user: %', orphaned_record.email;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Deleted % orphaned user(s)', deleted_count;
END $$;
*/
```

---

### Step 3: Test Sign-Up ✅

1. Go to `/sign-up`
2. Fill in the form
3. Click "Create account"
4. **Should work now!** ✅

---

## Verification

After running the migration, verify it worked:

```sql
-- Check tenant_id constraint
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'app_users'
  AND column_name = 'tenant_id';
```

**Expected:** `is_nullable` should be `YES`

---

## Why This Happened

1. We updated the code to NOT create tenants during sign-up ✅
2. But the database migration wasn't run yet ❌
3. Database still had `NOT NULL` constraint on `tenant_id` ❌
4. Code tried to insert `NULL` → database rejected it ❌

**Now:** Migration fixes the database, code matches database ✅

---

## Prevention

**Always run migrations before deploying code changes!**

For future changes:
1. Create migration file
2. Run in Supabase SQL Editor
3. Verify it worked
4. Then test the code

---

## Next Steps

1. ✅ Run `URGENT_FIX_SIGNUP.sql` in Supabase
2. ✅ Clean up `toffeehegde@gmail.com` (or any orphaned users)
3. ✅ Test sign-up flow
4. ✅ Verify new users can sign up without tenants
5. ✅ Verify users see `OrgRequiredModal` when trying to create data

---

**Status:** Ready to fix - just run the SQL migration!

