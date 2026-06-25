# 🔧 Fix for Duplicate Account Error

## Error You're Seeing
```
duplicate key value violates unique constraint "app_users_pkey"
```

## What This Means
You're trying to sign up with an email that already has an account in the database. This happened because:
1. A previous signup created the auth user
2. But something failed partway through (maybe email confirmation was required)
3. Now when you try again, the auth user already exists

## ✅ QUICK FIX - Delete Your Test Account

### Option 1: Use Supabase Dashboard (EASIEST)

1. **Go to Supabase Dashboard**:
   - Open https://supabase.com
   - Select your project
   - Go to **Authentication** → **Users**

2. **Find Your Test Email**:
   - Look for `deepaksheg@gmail.com` (or whatever email you used)
   - Click the **trash icon** to delete the user

3. **Clean Up Database**:
   - Go to **SQL Editor**
   - Run this query:
   ```sql
   -- Delete orphaned records for your email
   DELETE FROM app_users 
   WHERE id IN (
       SELECT id FROM auth.users WHERE email = 'deepaksheg@gmail.com'
   );
   
   -- Delete any orphaned tenants
   DELETE FROM tenants 
   WHERE id NOT IN (
       SELECT DISTINCT tenant_id FROM app_users WHERE tenant_id IS NOT NULL
   );
   ```

4. **Try Signup Again**:
   - Clear your browser data (Cmd+Shift+Delete)
   - Go to http://localhost:3000/sign-up
   - Should work now!

---

### Option 2: Use the SQL Cleanup Script

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste this:

```sql
-- Replace 'your-email@example.com' with your actual email
DO $$
DECLARE
    user_email text := 'deepaksheg@gmail.com'; -- CHANGE THIS
    user_id uuid;
    tenant_ids uuid[];
BEGIN
    -- Get user ID from email
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;
    
    IF user_id IS NOT NULL THEN
        -- Get associated tenant IDs
        SELECT ARRAY_AGG(tenant_id) INTO tenant_ids 
        FROM app_users WHERE id = user_id;
        
        -- Delete app_user
        DELETE FROM app_users WHERE id = user_id;
        
        -- Delete orphaned tenants
        IF tenant_ids IS NOT NULL THEN
            DELETE FROM tenants WHERE id = ANY(tenant_ids);
        END IF;
        
        -- Delete auth user
        DELETE FROM auth.users WHERE id = user_id;
        
        RAISE NOTICE 'Successfully deleted account: %', user_email;
    ELSE
        RAISE NOTICE 'User not found: %', user_email;
    END IF;
END $$;
```

3. Click **Run**
4. You should see: "Successfully deleted account: your-email@example.com"

---

### Option 3: Start Completely Fresh (For Testing Only)

If you want to delete ALL test data and start fresh:

```sql
-- WARNING: Deletes ALL users and data!
-- Only use this if you're testing and haven't added real data

-- Delete all app users
DELETE FROM app_users;

-- Delete all tenants
DELETE FROM tenants;

-- Delete all pipelines, deals, contacts, etc. (cascades)
-- These will be deleted automatically due to foreign key constraints
```

Then go to Supabase Dashboard → Authentication → Users and manually delete all users.

---

## 🔄 WHAT I FIXED IN THE CODE

The code now handles this better:

### Before:
```typescript
// Would crash if app_user already exists
INSERT INTO app_users (...)
```

### After:
```typescript
// Checks if app_user exists first
if (existingAppUser) {
    // Update existing record
    UPDATE app_users SET ...
} else {
    // Create new record
    INSERT INTO app_users (...)
}
```

So even if you have a partially-created account, the next signup attempt will complete it properly!

---

## 🧪 HOW TO TEST PROPERLY

1. **Clean State**:
   - Delete your test account (use Option 1 above)
   - Clear browser data (Cmd+Shift+Delete)
   - Close all browser tabs

2. **Fresh Signup**:
   - Go to http://localhost:3000/sign-up
   - **Open browser console** (F12) - this is important!
   - Fill out the form
   - Click "Sign up"
   - **Watch the console logs**

3. **What to Look For**:
   ```
   [SIGNUP] Account created successfully
   [SIGNUP] Auth session: exists  (or "null" if email confirmation required)
   ```

4. **If session is null**:
   - Check your email for confirmation link
   - Click the link
   - Go back to http://localhost:3000/sign-in
   - Your email should be pre-filled
   - Enter your password
   - Should work!

5. **If session exists**:
   - You'll be redirected to dashboard immediately
   - Should work!

---

## 🎯 ROOT CAUSE SUMMARY

**Problem**: Your Supabase is configured to require email confirmation before allowing signin.

**What happens**:
1. User signs up
2. Supabase creates auth user
3. BUT doesn't create a session (email not confirmed)
4. User tries to access dashboard
5. No session = redirect to signin
6. User tries to signup again
7. Auth user already exists = error!

**Solution**: 
1. Clean up duplicate accounts (use Option 1 above)
2. Code now handles existing users gracefully
3. Email confirmation flow is now properly managed

---

## 📞 STILL STUCK?

If you still get errors:

1. **Check the browser console** - what's the exact error?
2. **Check Supabase Dashboard** → Users - is your user there?
3. **Run this query** in Supabase SQL Editor:
   ```sql
   SELECT 
       au.email,
       au.email_confirmed_at,
       app.full_name,
       t.name as tenant_name
   FROM auth.users au
   LEFT JOIN app_users app ON app.id = au.id
   LEFT JOIN tenants t ON t.id = app.tenant_id
   WHERE au.email = 'your-email@example.com';
   ```
4. Share the output - it will show what's missing

---

## ✅ AFTER THE FIX

Once you've deleted the duplicate account:
- ✅ Signup should work smoothly
- ✅ If email confirmation is required, you'll get clear instructions
- ✅ The intelligent redirect system will guide you
- ✅ No more duplicate key errors!

**Go ahead and delete your test account using Option 1, then try signup again. It should work!** 🚀


