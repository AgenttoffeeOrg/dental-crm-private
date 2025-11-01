# 🔧 Fix User Account: toffeehegde@gmail.com

## Problem
User is getting "Account Setup Error" when trying to log in. This happens when:
- User exists in `auth.users` but not in `app_users`
- Or there's a constraint violation when trying to create `app_users` record
- The auto-repair process is failing

## Solution Options

### Option 1: Delete User Completely (Recommended for Fresh Start)

**Use this if:** You want to delete the user and sign up again fresh.

1. **Open Supabase SQL Editor:**
   - Go to https://supabase.com
   - Select your project
   - Click **SQL Editor** → **New query**

2. **Run the cleanup script:**
   - Open `DELETE_USER_toffeehegde.sql` 
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Run **Step 1** first (to see current state)
   - Review the output
   - Then run **Step 2** (to delete the user)
   - Finally run **Step 3** (to verify deletion)

3. **Sign up again:**
   - Go to `/sign-up`
   - Use `toffeehegde@gmail.com`
   - Complete the sign-up flow
   - Should work correctly now!

---

### Option 2: Manually Fix the Account

**Use this if:** You want to keep the user but fix the account setup issue.

Run this in Supabase SQL Editor:

```sql
-- Check if user exists but app_user is missing
DO $$
DECLARE
    user_id uuid;
    user_email text := 'toffeehegde@gmail.com';
BEGIN
    -- Get user ID
    SELECT id INTO user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF user_id IS NULL THEN
        RAISE NOTICE 'User not found: %', user_email;
        RETURN;
    END IF;
    
    -- Check if app_user exists
    IF NOT EXISTS (SELECT 1 FROM app_users WHERE id = user_id) THEN
        -- Create app_user record
        INSERT INTO app_users (id, full_name, role)
        VALUES (
            user_id,
            COALESCE(
                (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = user_id),
                SPLIT_PART(user_email, '@', 1)
            ),
            'owner'
        );
        
        RAISE NOTICE '✅ Created app_user record for: %', user_email;
    ELSE
        RAISE NOTICE '✅ app_user already exists for: %', user_email;
    END IF;
END $$;
```

Then try logging in again.

---

## Why This Happened

The error occurs because:
1. **Incomplete sign-up:** The old sign-up flow tried to create a tenant, but something failed
2. **Database constraint:** The auto-repair is trying to create `app_users` but hitting a constraint
3. **Migration issue:** The database schema might have had `tenant_id` as NOT NULL when user was created

With our new changes:
- Users can sign up without tenants
- `app_users.tenant_id` is nullable
- Auto-repair creates users without `tenant_id`
- Should work correctly now!

---

## Quick Check

Run this to see what's wrong:

```sql
SELECT 
    au.email,
    au.id as auth_user_id,
    app.id as app_user_id,
    app.tenant_id,
    app.active_tenant_id,
    (SELECT COUNT(*) FROM user_tenant_memberships WHERE user_id = au.id) as memberships
FROM auth.users au
LEFT JOIN app_users app ON app.id = au.id
WHERE au.email = 'toffeehegde@gmail.com';
```

If `app_user_id` is NULL, that's the problem!

