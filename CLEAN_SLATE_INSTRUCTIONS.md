# 🧹 Clean Slate - Keep First User, Delete Everything Else

## 📋 What This Will Do

✅ **KEEP**: Your first/original user (the account you created at the very beginning)
❌ **DELETE**: All other test accounts, duplicate users, and their data
🎯 **RESULT**: Clean database with just your original account

---

## 🚀 Step-by-Step Instructions

### **Step 1: Open Supabase SQL Editor**

1. Go to https://supabase.com
2. Select your dental-crm project
3. Click **SQL Editor** in the left sidebar
4. Click **"New query"**

---

### **Step 2: Identify Your First User**

Copy and paste this query, then click **RUN**:

```sql
SELECT 
    '🛡️ THIS USER WILL BE KEPT' as status,
    au.email,
    au.created_at,
    au.email_confirmed_at,
    app.full_name,
    t.name as tenant_name
FROM auth.users au
LEFT JOIN app_users app ON app.id = au.id
LEFT JOIN tenants t ON t.id = app.tenant_id
ORDER BY au.created_at ASC
LIMIT 1;
```

**IMPORTANT**: 
- This shows you THE USER that will be preserved
- Make sure this is YOUR original account
- If it's not the right user, STOP and let me know

---

### **Step 3: See What Will Be Deleted**

Copy and paste this query, then click **RUN**:

```sql
SELECT 
    '❌ WILL BE DELETED' as status,
    au.email,
    au.created_at,
    au.email_confirmed_at,
    app.full_name,
    t.name as tenant_name
FROM auth.users au
LEFT JOIN app_users app ON app.id = au.id
LEFT JOIN tenants t ON t.id = app.tenant_id
WHERE au.id != (
    SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
)
ORDER BY au.created_at ASC;
```

**Review this list**:
- These are all the users that will be deleted
- Make sure you're okay with deleting them
- Common test emails: test@example.com, duplicate entries, etc.

---

### **Step 4: Execute Cleanup** ⚠️

**IMPORTANT**: Only do this after reviewing Steps 2 and 3!

Copy and paste this query, then click **RUN**:

```sql
DO $$
DECLARE
    first_user_id uuid;
    first_user_email text;
    first_user_tenant_id uuid;
    deleted_users int := 0;
    deleted_tenants int := 0;
BEGIN
    -- Get first user info
    SELECT id, email INTO first_user_id, first_user_email
    FROM auth.users 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Get first user's tenant ID
    SELECT tenant_id INTO first_user_tenant_id
    FROM app_users
    WHERE id = first_user_id;
    
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE '🛡️ PROTECTED USER: %', first_user_email;
    RAISE NOTICE '═══════════════════════════════════════';
    
    -- Delete all OTHER app_users
    DELETE FROM app_users 
    WHERE id != first_user_id;
    
    GET DIAGNOSTICS deleted_users = ROW_COUNT;
    RAISE NOTICE '✅ Deleted % other app_user(s)', deleted_users;
    
    -- Delete all OTHER tenants
    IF first_user_tenant_id IS NOT NULL THEN
        DELETE FROM tenants 
        WHERE id != first_user_tenant_id;
        
        GET DIAGNOSTICS deleted_tenants = ROW_COUNT;
        RAISE NOTICE '✅ Deleted % other tenant(s)', deleted_tenants;
    ELSE
        DELETE FROM tenants;
        GET DIAGNOSTICS deleted_tenants = ROW_COUNT;
        RAISE NOTICE '✅ Deleted % tenant(s)', deleted_tenants;
    END IF;
    
    -- Delete all OTHER auth users
    DELETE FROM auth.users 
    WHERE id != first_user_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ CLEANUP COMPLETE';
    RAISE NOTICE 'Your first user has been preserved: %', first_user_email;
    RAISE NOTICE 'All other users and data have been deleted';
    
END $$;
```

You should see output like:
```
🛡️ PROTECTED USER: your-email@example.com
✅ Deleted 2 other app_user(s)
✅ Deleted 1 other tenant(s)
✅ CLEANUP COMPLETE
```

---

### **Step 5: Verify Cleanup**

Copy and paste this query, then click **RUN**:

```sql
-- Check counts
SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM app_users) as total_app_users,
    (SELECT COUNT(*) FROM tenants) as total_tenants;

-- Show your remaining user
SELECT 
    '✅ YOUR USER' as status,
    au.email,
    au.created_at as account_created,
    au.email_confirmed_at as email_confirmed,
    app.full_name,
    app.role,
    t.name as practice_name
FROM auth.users au
LEFT JOIN app_users app ON app.id = au.id
LEFT JOIN tenants t ON t.id = app.tenant_id;
```

**Expected result**:
- total_users: 1
- total_app_users: 1 (or 0 if your first user wasn't complete)
- total_tenants: 1 (or 0 if no tenant)
- Shows your first user's details

---

### **Step 6: Clear Browser Data**

1. **In Chrome/Edge/Brave**:
   - Press `Cmd+Shift+Delete` (Mac) or `Ctrl+Shift+Delete` (Windows)
   - Select "Cookies and site data"
   - Click "Clear data"

2. **In Safari**:
   - Safari menu → Preferences → Privacy
   - Click "Manage Website Data"
   - Remove localhost entries
   - Click "Done"

3. **Close ALL browser tabs**
   - Make sure localhost:3000 is completely closed

---

### **Step 7: Test Fresh Signup**

1. Open a fresh browser window
2. Go to http://localhost:3000/sign-up
3. **Open browser console** (F12 or Cmd+Option+I)
4. Sign up with a **NEW email** (not your first user's email)
5. Watch the console logs:
   - Should see: `[SIGNUP] Account created successfully`
   - Should see: `[SIGNUP] Auth session: exists` or `null`

**If session is null**:
- Check your email for confirmation link
- Click the link
- Go to signin page
- Enter your password
- Should work!

**If session exists**:
- You'll be redirected to dashboard immediately
- Should work!

---

## 🎯 Quick Checklist

Before you start:
- [ ] Opened Supabase SQL Editor
- [ ] Ready to follow steps 1-7 in order

Step by step:
- [ ] **Step 1**: Ran query to see first user (verify it's correct!)
- [ ] **Step 2**: Ran query to see what will be deleted (review list!)
- [ ] **Step 3**: Ran cleanup query (only after reviewing!)
- [ ] **Step 4**: Verified cleanup (should show 1 user)
- [ ] **Step 5**: Cleared browser data
- [ ] **Step 6**: Closed all browser tabs
- [ ] **Step 7**: Tested fresh signup

---

## ⚠️ Safety Reminders

- ✅ Your **first user** (oldest created_at) will be preserved
- ✅ All **other users** will be deleted
- ✅ Review the lists in Steps 1-2 before executing Step 3
- ✅ This cannot be undone (but you can always create new test users)

---

## 📞 After Cleanup

**Your database will have**:
- 1 user (your first/original account)
- 1 tenant (your first user's practice)
- Clean slate for testing new signups

**You can now**:
- Test signup flow with fresh emails
- Invite team members to test
- See how the complete flow works
- Everything will be clean and fresh!

---

## 🐛 Troubleshooting

**"No users found in Step 1"**
- Your database is already empty
- Just start fresh with a signup

**"First user is not my account"**
- STOP! Don't run Step 3
- Let me know which email is yours
- We'll create a custom query

**"Cleanup completed but signup still fails"**
- Clear browser data again (Step 5)
- Try a completely different email
- Check browser console for specific error
- Share the console logs with me

---

## ✅ Expected Final State

After completing all steps:

```
Database:
✅ 1 auth user (your first user)
✅ 1 app_user (your first user's profile)
✅ 1 tenant (your practice)
✅ 0 test/duplicate users
✅ Clean slate for new signups

Browser:
✅ Cleared cookies and data
✅ No cached sessions
✅ Ready for fresh testing
```

**You're ready to test fresh signups!** 🚀

Go ahead and run through Steps 1-7. Let me know if you have any questions or if anything looks unexpected!


