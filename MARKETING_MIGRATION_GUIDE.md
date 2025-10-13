# 🚀 Marketing Integration Migration Guide

## Overview
This guide explains how to safely run the Marketing ↔ CRM integration database migration.

**Migration File:** `supabase/sql/25_marketing_crm_integration.sql`

---

## ✅ What This Migration Does

### **Tables Modified (Additive Only):**
1. **tenants** - Adds 3 columns:
   - `marketing_enabled` (BOOLEAN, DEFAULT FALSE)
   - `marketing_plan` (TEXT, DEFAULT 'none')
   - `marketing_enabled_at` (TIMESTAMP NULL)

2. **contacts** - Adds 3 columns:
   - `marketing_engagement_score` (INTEGER, DEFAULT 0)
   - `lead_source_campaign_id` (UUID NULL)
   - `last_marketing_interaction_at` (TIMESTAMP NULL)

3. **deals** - Adds 4 columns:
   - `marketing_source_type` (TEXT NULL)
   - `marketing_source_id` (UUID NULL)
   - `marketing_source_name` (TEXT NULL)
   - `marketing_touchpoints` (JSONB, DEFAULT '[]')

4. **activities** - Adds 2 columns:
   - `marketing_campaign_id` (UUID NULL)
   - `marketing_event_type` (TEXT NULL)

### **New Tables Created:**
1. **marketing_attribution** - Tracks campaign attribution and ROI

### **Also Creates:**
- 8 performance indexes
- 2 helper functions (`is_marketing_enabled`, `calculate_marketing_engagement`)
- 1 auto-update trigger for engagement scores

---

## 🛡️ SAFETY GUARANTEES

✅ **All changes are additive** - No columns dropped, no data modified  
✅ **All new columns are NULLABLE or have DEFAULT values**  
✅ **Marketing is DISABLED by default** (`marketing_enabled = FALSE`)  
✅ **CRM works identically before and after migration**  
✅ **Zero impact on existing queries**  
✅ **Fully reversible**

---

## 📝 How to Run

### **Option 1: Supabase Dashboard (Recommended)**
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase/sql/25_marketing_crm_integration.sql`
4. Paste into the SQL Editor
5. Click **Run**
6. Wait for "✅ ALL TESTS PASSED" message

### **Option 2: Supabase CLI**
```bash
cd /Users/deepak/auth-app/dental-crm
supabase db push
```

### **Option 3: Manual psql**
```bash
psql -U postgres -h your-db-host -d your-db-name -f supabase/sql/25_marketing_crm_integration.sql
```

---

## ✅ Verification

After running the migration, verify:

```sql
-- 1. Check tenants table has new columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
  AND column_name LIKE 'marketing%';

-- Expected: 3 rows (marketing_enabled, marketing_plan, marketing_enabled_at)

-- 2. Verify Marketing is DISABLED by default
SELECT id, marketing_enabled 
FROM tenants;

-- Expected: All rows show FALSE

-- 3. Check marketing_attribution table exists
SELECT COUNT(*) FROM marketing_attribution;

-- Expected: 0 (table exists but empty)
```

---

## 🧪 Test CRM Still Works

**After migration, test these:**
- [ ] Open Contacts page - loads correctly
- [ ] Create new contact - works
- [ ] Open Deals pipeline - loads correctly
- [ ] Create new deal - works
- [ ] Move deal between stages - works
- [ ] Log activity - works
- [ ] Create task - works
- [ ] Open Settings - loads correctly

**All should work IDENTICALLY to before migration!**

---

## 🔄 Rollback (If Needed)

If something goes wrong, rollback with:

```sql
BEGIN;

-- Drop new table
DROP TABLE IF EXISTS marketing_attribution CASCADE;

-- Drop new columns from tenants
ALTER TABLE tenants DROP COLUMN IF EXISTS marketing_enabled;
ALTER TABLE tenants DROP COLUMN IF EXISTS marketing_plan;
ALTER TABLE tenants DROP COLUMN IF EXISTS marketing_enabled_at;

-- Drop new columns from contacts
ALTER TABLE contacts DROP COLUMN IF EXISTS marketing_engagement_score;
ALTER TABLE contacts DROP COLUMN IF EXISTS lead_source_campaign_id;
ALTER TABLE contacts DROP COLUMN IF EXISTS last_marketing_interaction_at;

-- Drop new columns from deals
ALTER TABLE deals DROP COLUMN IF EXISTS marketing_source_type;
ALTER TABLE deals DROP COLUMN IF EXISTS marketing_source_id;
ALTER TABLE deals DROP COLUMN IF EXISTS marketing_source_name;
ALTER TABLE deals DROP COLUMN IF EXISTS marketing_touchpoints;

-- Drop new columns from activities
ALTER TABLE activities DROP COLUMN IF EXISTS marketing_campaign_id;
ALTER TABLE activities DROP COLUMN IF EXISTS marketing_event_type;

-- Drop functions
DROP FUNCTION IF EXISTS is_marketing_enabled(UUID);
DROP FUNCTION IF EXISTS calculate_marketing_engagement(UUID);
DROP FUNCTION IF EXISTS update_contact_marketing_engagement();

COMMIT;
```

---

## 📊 Migration Status

**Status:** Ready to run  
**Risk:** Very Low (100% additive, fully reversible)  
**Estimated Time:** < 1 minute  
**Downtime:** None (CRM stays online)

---

## ❓ FAQ

**Q: Will this affect my existing CRM data?**  
A: No. All changes are additive. No existing data is modified.

**Q: Will Marketing features appear immediately?**  
A: No. Marketing is DISABLED by default. You must manually enable it in Settings.

**Q: Can I run this on production?**  
A: Yes. It's safe for production. All changes are non-destructive.

**Q: What if I don't want Marketing?**  
A: Just don't enable it. The columns exist but are empty/default. Zero impact.

---

## 🎯 Next Steps

After migration:
1. ✅ Run this migration
2. 🔥 Deploy Phase 2 code (Feature Flags system)
3. 🎨 Add UI components (conditional, only when enabled)
4. 🧪 Test everything
5. 🚀 Enable Marketing when ready

**The CRM will work perfectly at every step!**

---

**Ready? Run the migration and let's build Phase 2!** 🚀

