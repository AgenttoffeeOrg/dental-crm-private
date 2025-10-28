# 🔧 FIX: Invites API Error

## Problem
The `/api/invites/list` endpoint is returning:
```
permission denied for table users
```

## Root Cause
The RLS policy on `pending_invites` table has this clause:
```sql
invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
```

This queries the `auth.users` table directly, which users don't have permission to access.

## Solution
Run this SQL migration to drop the problematic policy:

```sql
-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view invites sent to them" ON pending_invites;
```

## How to Apply

1. **Open Supabase SQL Editor:**
   - Go to your Supabase project dashboard
   - Navigate to: **SQL Editor** (left sidebar)

2. **Run this SQL:**
   Copy and paste the entire contents of:
   ```
   supabase/migrations/20251028_fix_pending_invites_rls.sql
   ```
   
3. **Click "Run"**

4. **Verify Success:**
   You should see:
   ```
   ✅ Fixed pending_invites RLS policies
   ✅ Removed policy that queried auth.users table
   ✅ Invite validation still works via validate_invite_code() function
   ```

## Why This is Safe

The remaining RLS policies are sufficient:
- ✅ **"Admins can view tenant invites"** - Allows owners/admins to see all invites for their organization
- ✅ **"Admins can create invites"** - Allows owners/admins to create invites
- ✅ **"Admins can cancel invites"** - Allows owners/admins to cancel invites

Users checking their own invites use the `validate_invite_code()` function, which has `SECURITY DEFINER` and can safely query invites without needing direct SELECT access.

## Expected Result

After running this migration:
1. The `/api/invites/list` endpoint will work for owners/admins ✅
2. The "Team Invites" page will load without errors ✅
3. Invite validation (checking if a user has pending invites) will still work via the `validate_invite_code()` function ✅

---

**Once you've run this SQL, please refresh your browser at `localhost:3000` and the invites should load correctly!**

