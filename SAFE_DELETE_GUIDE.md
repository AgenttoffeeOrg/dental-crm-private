# Safe User Deletion Guide - Keep First User

## 🛡️ SAFEST METHOD - Supabase Dashboard (Recommended)

### Step 1: View Your Users
1. Go to https://supabase.com
2. Select your project
3. Go to **Authentication** → **Users**
4. You'll see a list of all users sorted by creation date

### Step 2: Identify First User
- The **first user** in the list (oldest created_at) is your main user
- This is typically YOUR account that you want to keep
- **DO NOT DELETE THIS ONE!**

### Step 3: Delete Only Test Accounts
- Look for any TEST emails (like test@example.com, etc.)
- For each test user:
  - Click the **3-dot menu** (⋮) next to their email
  - Click **"Delete user"**
  - Confirm deletion
- Your first/main user remains untouched ✅

---

## 📋 ALTERNATIVE - SQL Method (More Control)

### Step 1: See All Your Users

Run this in Supabase SQL Editor:

```sql
SELECT 
    ROW_NUMBER() OVER (ORDER BY au.created_at ASC) as "#",
    au.email,
    au.created_at,
    au.email_confirmed_at as confirmed,
    CASE 
        WHEN app.id IS NULL THEN '❌ Incomplete'
        ELSE '✅ Complete'
    END as status
FROM auth.users au
LEFT JOIN app_users app ON app.id = au.id
ORDER BY au.created_at ASC;
```

**Example output:**
```
#  | email                    | created_at  | confirmed | status
---|--------------------------|-------------|-----------|----------
1  | admin@company.com        | 2024-10-01  | 2024-10-01| ✅ Complete
2  | test@example.com         | 2024-10-14  | null      | ❌ Incomplete
3  | deepaksheg@gmail.com     | 2024-10-14  | null      | ❌ Incomplete
```

### Step 2: Delete ONLY Specific Test User

**To delete user #2 (test@example.com)**:

```sql
DO $$
DECLARE
    user_email text := 'test@example.com'; -- ← CHANGE THIS
    user_id uuid;
    first_user_email text;
BEGIN
    -- Get first user (to protect)
    SELECT email INTO first_user_email 
    FROM auth.users 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Safety check
    IF user_email = first_user_email THEN
        RAISE EXCEPTION 'CANNOT DELETE FIRST USER: %', user_email;
    END IF;
    
    -- Get user ID
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;
    
    IF user_id IS NOT NULL THEN
        -- Delete app_user
        DELETE FROM app_users WHERE id = user_id;
        
        -- Delete auth user
        DELETE FROM auth.users WHERE id = user_id;
        
        RAISE NOTICE '✅ Deleted: %', user_email;
    ELSE
        RAISE NOTICE '❌ User not found: %', user_email;
    END IF;
END $$;
```

**Important**: 
- Change `'test@example.com'` to the actual email you want to delete
- Run this once for each test user
- Your first user is automatically protected!

### Step 3: Clean Up Orphaned Data

After deleting test users, run:

```sql
-- Delete orphaned tenants
DELETE FROM tenants 
WHERE id NOT IN (
    SELECT DISTINCT tenant_id FROM app_users WHERE tenant_id IS NOT NULL
);
```

---

## 🎯 FOR YOUR SPECIFIC CASE

Based on the error, you have `deepaksheg@gmail.com` causing issues.

### Safest Approach:

1. **Check if this is your first/main user**:
   ```sql
   SELECT 
       email,
       created_at,
       ROW_NUMBER() OVER (ORDER BY created_at ASC) as user_number
   FROM auth.users
   ORDER BY created_at ASC;
   ```

2. **If it's NOT the first user** (user_number > 1), delete it:
   ```sql
   DO $$
   DECLARE
       user_email text := 'deepaksheg@gmail.com';
       user_id uuid;
       first_user_id uuid;
   BEGIN
       -- Get first user ID
       SELECT id INTO first_user_id 
       FROM auth.users 
       ORDER BY created_at ASC 
       LIMIT 1;
       
       -- Get target user ID
       SELECT id INTO user_id FROM auth.users WHERE email = user_email;
       
       -- Safety check
       IF user_id = first_user_id THEN
           RAISE EXCEPTION 'This is the first user! Cannot delete.';
       END IF;
       
       -- Safe to delete
       DELETE FROM app_users WHERE id = user_id;
       DELETE FROM auth.users WHERE id = user_id;
       
       RAISE NOTICE '✅ Deleted: %', user_email;
   END $$;
   ```

3. **If it IS the first user** (user_number = 1):
   - **DON'T DELETE IT!**
   - Instead, just try to sign in with it
   - Or use the password reset flow

---

## 🚫 WHAT NOT TO DO

**Don't run these unless you want to delete EVERYTHING:**

❌ `DELETE FROM auth.users;` - Deletes ALL users
❌ `DELETE FROM app_users;` - Deletes ALL app users
❌ `TRUNCATE` commands - Deletes ALL data

---

## ✅ SAFE RULES

1. **Always check FIRST** who you're deleting
2. **Never delete** the first user (oldest created_at)
3. **Delete one at a time** - don't batch delete
4. **Test emails only** - delete test@example.com, not real users
5. **Use Supabase Dashboard** if unsure - it's the safest

---

## 🔍 VERIFY AFTER DELETION

Run this to see what's left:

```sql
SELECT 
    au.email,
    au.created_at,
    CASE 
        WHEN app.id IS NULL THEN '❌ Incomplete'
        ELSE '✅ Complete'
    END as status
FROM auth.users au
LEFT JOIN app_users app ON app.id = au.id
ORDER BY au.created_at ASC;
```

Should show only your real user(s), all with "✅ Complete" status.

---

## 📞 TL;DR - SIMPLEST METHOD

**For Beginners** - Use Supabase Dashboard:
1. Go to Authentication → Users
2. Find test accounts (NOT your first/main account)
3. Click trash icon to delete
4. Done! ✅

**For SQL Users** - Safe deletion:
1. Run STEP 1 query to see users
2. Identify which email to delete (not the first one!)
3. Run STEP 2 query with that specific email
4. Run STEP 3 to clean up
5. Run verification query

**Your first user will always be protected!** 🛡️


