# 📝 WHAT TO PASTE IN SUPABASE

## ✅ YOU NEED TO RUN 6 SQL MIGRATIONS

**These create all Marketing tables and integrate with CRM.**

---

## 🚀 STEP-BY-STEP INSTRUCTIONS

### **1. Open Supabase Dashboard**
- Go to: https://app.supabase.com
- Select your project
- Navigate to: **SQL Editor** (left sidebar)

---

### **2. Run Migration Files in Order**

**Run each file in this EXACT order:**

#### **Migration 1: Core Marketing Tables**
```
File: supabase/sql/20_marketing_core_tables.sql
Purpose: Creates audiences, segments, tags, templates, campaigns
```

1. Open the file in your code editor
2. Copy ALL contents
3. Paste into Supabase SQL Editor
4. Click **"RUN"**
5. Wait for success message

---

#### **Migration 2: Campaign System**
```
File: supabase/sql/21_marketing_campaigns.sql
Purpose: Creates campaign variants, sends, events, bounces
```

1. Copy ALL contents
2. Paste into Supabase SQL Editor
3. Click **"RUN"**
4. Wait for success message

---

#### **Migration 3: Automation & Journeys**
```
File: supabase/sql/22_marketing_automation.sql
Purpose: Creates journey builder tables
```

1. Copy ALL contents
2. Paste into Supabase SQL Editor
3. Click **"RUN"**
4. Wait for success message

---

#### **Migration 4: Forms & Landing Pages**
```
File: supabase/sql/23_marketing_forms.sql
Purpose: Creates forms, submissions, landing pages
```

1. Copy ALL contents
2. Paste into Supabase SQL Editor
3. Click **"RUN"**
4. Wait for success message

---

#### **Migration 5: Collaboration**
```
File: supabase/sql/24_marketing_collaboration.sql
Purpose: Creates comments and collaboration features
```

1. Copy ALL contents
2. Paste into Supabase SQL Editor
3. Click **"RUN"**
4. Wait for success message

---

#### **Migration 6: CRM Integration** ⭐ **MOST IMPORTANT**
```
File: supabase/sql/25_marketing_crm_integration.sql
Purpose: Adds Marketing columns to CRM tables, creates attribution
```

1. Copy ALL contents
2. Paste into Supabase SQL Editor
3. Click **"RUN"**
4. **Wait for: "✅ ALL TESTS PASSED"** ← Important!

---

## ✅ VERIFICATION

After running all migrations, verify in Supabase:

1. Go to **Table Editor**
2. Check these tables exist:
   - `marketing_audiences`
   - `marketing_campaigns`
   - `marketing_templates`
   - `marketing_journeys`
   - `marketing_forms`
   - `marketing_attribution`

3. Check existing tables have new columns:
   - `tenants`: Should have `marketing_enabled` column
   - `contacts`: Should have `marketing_engagement_score` column
   - `deals`: Should have `marketing_source_type` column
   - `activities`: Should have `marketing_campaign_id` column

**If all exist:** ✅ **You're done!**

---

## 🧪 TEST CRM STILL WORKS

**After migrations, test:**
- [ ] Open your app: `http://localhost:3000`
- [ ] Go to Contacts - should load
- [ ] Go to Pipeline - should load
- [ ] Create a contact - should work
- [ ] Create a deal - should work

**Expected:** Everything works identically!

**Marketing is DISABLED by default**, so you won't see new features yet.

---

## 🔥 ENABLE MARKETING (When Ready)

After testing CRM, enable Marketing:

1. Go to Supabase **SQL Editor**
2. Run this command:

```sql
-- Replace 'your-tenant-id-here' with actual tenant ID
UPDATE tenants 
SET 
  marketing_enabled = TRUE,
  marketing_plan = 'pro',
  marketing_enabled_at = NOW()
WHERE id = 'your-tenant-id-here';
```

3. Click **"RUN"**

**Result:** Marketing features appear in your app!

---

## 🎯 WHAT TO SEE AFTER ENABLING

**Refresh your app and check:**
- ✅ Marketing link in left sidebar navigation
- ✅ Purple badges on deals from Marketing
- ✅ Marketing Source filter in pipeline
- ✅ Marketing tab in contact details
- ✅ Export to Audience button (when you select contacts)

---

## 🆘 IF SOMETHING BREAKS

**Rollback instantly:**

```sql
-- Disable Marketing (keeps data)
UPDATE tenants SET marketing_enabled = FALSE;
```

**Or restore to before integration:**
```bash
cd /Users/deepak/auth-app/dental-crm
./RESTORE_BEFORE_MARKETING.sh
```

---

## 📋 QUICK CHECKLIST

- [ ] Run migration 1 (20_marketing_core_tables.sql)
- [ ] Run migration 2 (21_marketing_campaigns.sql)
- [ ] Run migration 3 (22_marketing_automation.sql)
- [ ] Run migration 4 (23_marketing_forms.sql)
- [ ] Run migration 5 (24_marketing_collaboration.sql)
- [ ] Run migration 6 (25_marketing_crm_integration.sql) ⭐
- [ ] Verify "✅ ALL TESTS PASSED" appears
- [ ] Test CRM still works
- [ ] Enable Marketing (when ready)
- [ ] Test Marketing features

---

## 🎉 THAT'S IT!

**Total time:** ~5 minutes  
**Risk:** Very low (everything is additive)  
**Rollback:** Instant (just disable flag)

**You're ready to go!** 🚀

---

**Need help?** Read `QUICK_START.md` for full instructions.




