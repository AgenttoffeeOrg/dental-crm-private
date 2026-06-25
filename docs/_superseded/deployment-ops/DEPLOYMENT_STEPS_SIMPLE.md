# 🚀 HARDENING DEPLOYMENT: Step-by-Step Guide
**Version:** 10.0 Hardening  
**Time Required:** ~4 hours total  
**Your Current Step:** 👉 **STEP 1**

---

## ✅ **STEP 1: BACKUP YOUR DATABASE** (5 minutes)

**What to do:**

1. **Go to Supabase Dashboard:**
   - Open: https://supabase.com/dashboard
   - Select your project
   - Click "Database" in left sidebar

2. **Create Manual Backup:**
   - Click "Backups" tab
   - Click "Create backup now"
   - Wait for backup to complete
   - Note the backup timestamp

3. **Tag Current Git State:**
   ```bash
   git tag v9.5-before-hardening
   ```

4. **Write down current stats:**
   - Number of contacts: _____
   - Number of deals: _____
   - Number of users: _____

**Why:** Safety first! If anything goes wrong, you can restore.

**When done, come back and say:** "Step 1 done"

---

## ⏳ **STEP 2: RUN FIRST MIGRATION** (2 minutes)

**What to do:**

1. **Open file:**
   ```bash
   supabase/migrations/20251016_hardening_001_helpers.sql
   ```

2. **Copy entire file content**

3. **Go to Supabase SQL Editor:**
   - Supabase Dashboard → "SQL Editor"
   - Click "+ New query"
   - Paste the migration content
   - Click "Run" (bottom right)

4. **Wait for success message** (should see green checkmark)

5. **Verify it worked:**
   - Run this query:
   ```sql
   SELECT current_tenant_id();
   ```
   - Should return your tenant UUID (not error)

**When done, say:** "Step 2 done"

---

## ⏳ **STEP 3: RUN SECOND MIGRATION** (3 minutes)

**File:** `supabase/migrations/20251016_hardening_002_soft_delete.sql`

1. Copy entire file content
2. New query in Supabase SQL Editor
3. Paste and run
4. Verify:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'contacts' AND column_name = 'deleted_at';
   ```
   Should return: 'deleted_at'

**When done, say:** "Step 3 done"

---

## ⏳ **STEP 4: RUN THIRD MIGRATION** (5 minutes)

**File:** `supabase/migrations/20251016_hardening_003_rls_reset.sql`

1. Copy entire file content
2. New query in Supabase SQL Editor
3. Paste and run
4. Verify:
   ```sql
   SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
   ```
   Should return: 50+ policies

**When done, say:** "Step 4 done"

---

## ⏳ **STEP 5: RUN FOURTH MIGRATION** (5 minutes)

**File:** `supabase/migrations/20251016_hardening_004_fk_guards.sql`

⚠️ **IMPORTANT:** This one might fail if you have cross-tenant data links!

1. Copy entire file content
2. New query in Supabase SQL Editor  
3. Paste and run

**If it fails with constraint violation:**
- Don't panic!
- Copy the error message
- Come back and say: "Step 5 error: [paste error]"
- I'll help you fix the data

**If it succeeds:**
4. Verify:
   ```sql
   SELECT COUNT(*) FROM pg_constraint WHERE conname LIKE '%same_tenant%';
   ```
   Should return: 20+ constraints

**When done, say:** "Step 5 done"

---

## ⏳ **STEPS 6-12: Remaining Migrations**

*I'll provide these one at a time after you complete the first 4.*

---

## ⏳ **STEP 13: Update Application Code**

*I'll guide you through this after migrations are complete.*

---

## ⏳ **STEP 14: Test Everything**

*I'll provide test commands when code is updated.*

---

## ⏳ **STEP 15: Deploy to Production**

*Final step after everything is tested.*

---

## 🆘 **IF ANYTHING GOES WRONG**

**Stop immediately and tell me:**
- Which step you're on
- The error message (copy/paste)
- What you were trying to do

I'll help you fix it before continuing.

---

## 📊 **YOUR PROGRESS**

```
[✅] Step 0: Read this guide
[  ] Step 1: Backup database ← YOU ARE HERE
[  ] Step 2: Migration 1 (helpers)
[  ] Step 3: Migration 2 (soft delete)
[  ] Step 4: Migration 3 (RLS)
[  ] Step 5: Migration 4 (FK guards)
[  ] Step 6-12: Remaining migrations
[  ] Step 13: Update code
[  ] Step 14: Test
[  ] Step 15: Deploy

Total: 15 steps
Estimated time: 4 hours
```

---

## 🎯 **READY?**

**Start with STEP 1: Backup your database**

When you've created the backup, come back and say: **"Step 1 done"**

Then I'll guide you through Step 2! 🚀

