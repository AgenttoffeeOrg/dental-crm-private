# 🗂️ MIGRATION EXECUTION ORDER
**Version:** 10.0 Hardening  
**Total Migrations:** 12  
**Estimated Time:** 30 minutes

---

## ⚡ QUICK EXECUTION GUIDE

**Copy and paste each migration file content into Supabase SQL Editor in this exact order:**

---

### **PHASE 1: RLS FOUNDATIONS** (15 minutes)

#### **Migration 1: Helper Functions** ⏱️ 2 min
```
📄 File: supabase/migrations/20251016_hardening_001_helpers.sql
🎯 Purpose: Create 9 canonical helper functions
✅ Delivers: current_tenant_id(), current_role_name(), soft delete helpers
⚠️ Breaking: None
```

#### **Migration 2: Soft Delete** ⏱️ 3 min
```
📄 File: supabase/migrations/20251016_hardening_002_soft_delete.sql
🎯 Purpose: Add deleted_at columns + triggers to 20+ tables
✅ Delivers: Soft delete capability, updated_at auto-triggers
⚠️ Breaking: Queries must filter WHERE deleted_at IS NULL (or rely on RLS)
```

#### **Migration 3: RLS Reset** ⏱️ 5 min
```
📄 File: supabase/migrations/20251016_hardening_003_rls_reset.sql
🎯 Purpose: Apply consistent RLS policies to 12 core tables
✅ Delivers: SELECT (tenant + soft delete), INSERT/UPDATE (tenant), DELETE (admin only)
⚠️ Breaking: None (makes security stricter)
```

#### **Migration 4: FK Guards** ⏱️ 5 min
```
📄 File: supabase/migrations/20251016_hardening_004_fk_guards.sql
🎯 Purpose: Add 25+ CHECK constraints for same-tenant validation
✅ Delivers: Prevents cross-tenant data linkage at DB level
⚠️ Breaking: May fail if existing data has cross-tenant links (audit first)
```

---

### **PHASE 2: ENTITLEMENTS** (5 minutes)

#### **Migration 5: Entitlements Security Fix** ⏱️ 2 min
```
📄 File: supabase/migrations/20251016_hardening_005_entitlements_db.sql
🎯 Purpose: Remove tenant_id parameter from check_entitlement()
✅ Delivers: Secure entitlement checking (no bypass possible)
⚠️ Breaking: RPC calls must remove p_tenant_id parameter
```

#### **Migration 6: Marketing RLS** ⏱️ 2 min
```
📄 File: supabase/migrations/20251016_hardening_006_rls_marketing.sql
🎯 Purpose: Add entitlement checks to marketing table RLS
✅ Delivers: Marketing data hidden without entitlement
⚠️ Breaking: Marketing tables require 'marketing' entitlement to access
```

#### **Migration 7: Automations Entitlements** ⏱️ 1 min
```
📄 File: supabase/migrations/20251016_hardening_007_rls_automations_entitlement.sql
🎯 Purpose: Marketing automations require BOTH entitlements
✅ Delivers: Combined entitlement check (automations + marketing)
⚠️ Breaking: Marketing automation category requires both features
```

---

### **PHASE 3-8: FEATURES** (10 minutes)

#### **Migration 8: Quotas** ⏱️ 2 min
```
📄 File: supabase/migrations/20251016_hardening_008_quotas.sql
🎯 Purpose: DB-layer quota enforcement with auto-reset
✅ Delivers: enforce_quota_and_increment(), check_quota_status()
⚠️ Breaking: May block actions if quota exceeded
```

#### **Migration 9: Webhooks** ⏱️ 2 min
```
📄 File: supabase/migrations/20251016_hardening_009_webhooks.sql
🎯 Purpose: Webhook idempotency and security
✅ Delivers: webhook_events table, register_webhook_event()
⚠️ Breaking: Webhook handlers need to use new functions
```

#### **Migration 10: Data Quality** ⏱️ 3 min
```
📄 File: supabase/migrations/20251016_hardening_010_data_quality.sql
🎯 Purpose: Email/phone normalization, deduplication
✅ Delivers: Normalization columns, merge_contacts(), unique indexes
⚠️ Breaking: May block duplicate contact creation
```

#### **Migration 11: Automations Hardening** ⏱️ 2 min
```
📄 File: supabase/migrations/20251016_hardening_011_automations_hardening.sql
🎯 Purpose: Idempotency, loop guards, DLQ
✅ Delivers: automation_dlq, concurrency leases, idempotency keys
⚠️ Breaking: Automation executor needs updates
```

#### **Migration 12: Privacy & DSR** ⏱️ 1 min
```
📄 File: supabase/migrations/20251016_hardening_012_privacy_dsr.sql
🎯 Purpose: GDPR compliance (erasure, DSR workflow)
✅ Delivers: erase_contact_pii(), export_contact_data(), DSR tables
⚠️ Breaking: None
```

---

## ✅ VERIFICATION AFTER EACH MIGRATION

### **After Migration 1:**
```sql
SELECT current_tenant_id();  -- Should return UUID or NULL
SELECT current_role_name();  -- Should return role or NULL
```

### **After Migration 2:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'contacts' AND column_name = 'deleted_at';
-- Should return 'deleted_at'
```

### **After Migration 3:**
```sql
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- Should show 50+ policies
```

### **After Migration 4:**
```sql
SELECT COUNT(*) FROM pg_constraint WHERE conname LIKE '%same_tenant%';
-- Should show 25+ constraints
```

### **After Migration 5:**
```sql
SELECT check_entitlement('crm_base');
-- Should return true/false (not error)
```

### **After Migration 6-7:**
```sql
SELECT tablename, COUNT(*) 
FROM pg_policies 
WHERE tablename LIKE 'marketing_%' OR tablename = 'automations'
GROUP BY tablename;
-- Should show policies on marketing tables
```

### **After Migration 8:**
```sql
SELECT * FROM check_quota_status('marketing');
-- Should return quota status row
```

### **After Migration 9:**
```sql
SELECT * FROM webhook_events LIMIT 1;
-- Should return empty result (table exists)
```

### **After Migration 10:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND column_name IN ('primary_email_norm', 'primary_phone_e164');
-- Should return both columns
```

### **After Migration 11:**
```sql
SELECT * FROM automation_dlq LIMIT 1;
-- Should return empty result (table exists)
```

### **After Migration 12:**
```sql
SELECT * FROM erasure_tombstones LIMIT 1;
SELECT * FROM data_subject_requests LIMIT 1;
-- Should return empty results (tables exist)
```

---

## 🎯 COMPLETION VERIFICATION

### **Run This Complete Verification Query:**

```sql
-- Comprehensive verification
WITH verification AS (
  SELECT 
    'Helper Functions' as component,
    COUNT(*) as count
  FROM pg_proc
  WHERE proname IN ('current_tenant_id', 'check_entitlement', 'merge_contacts')
  
  UNION ALL
  
  SELECT 'RLS Policies', COUNT(*)
  FROM pg_policies
  WHERE schemaname = 'public'
  
  UNION ALL
  
  SELECT 'CHECK Constraints', COUNT(*)
  FROM pg_constraint
  WHERE conname LIKE '%same_tenant%'
  
  UNION ALL
  
  SELECT 'Soft Delete Columns', COUNT(DISTINCT table_name)
  FROM information_schema.columns
  WHERE column_name = 'deleted_at' AND table_schema = 'public'
  
  UNION ALL
  
  SELECT 'New Tables', COUNT(*)
  FROM information_schema.tables
  WHERE table_name IN ('webhook_events', 'automation_dlq', 'erasure_tombstones', 'data_subject_requests')
)
SELECT * FROM verification;

-- Expected results:
-- Helper Functions: >= 9
-- RLS Policies: >= 50
-- CHECK Constraints: >= 25
-- Soft Delete Columns: >= 15
-- New Tables: 4
```

---

## ⏱️ TOTAL EXECUTION TIME

**Migrations:** 30 minutes  
**Verification:** 10 minutes  
**Code Updates:** 2 hours  
**Testing:** 1 hour  

**Total:** ~4 hours for complete deployment

---

## 🆘 TROUBLESHOOTING

### **If Migration Fails**

1. **Read the error message carefully**
2. **Check migration comments** (inline in SQL file)
3. **Verify pre-requisites** (e.g., tables exist)
4. **Run audit queries** to find data issues
5. **Fix data, then retry migration**

### **Common Issues**

**"relation already exists"**
- Safe to ignore if using `IF NOT EXISTS`
- Or run `DROP TABLE IF EXISTS ... CASCADE;` first

**"column already exists"**
- Safe to ignore (migrations are idempotent)

**"constraint violation"**
- Audit existing data for cross-tenant links
- Fix data before adding constraint

**"function already exists"**
- Run `DROP FUNCTION IF EXISTS ...` first
- Then recreate

---

## 📋 EXECUTION LOG TEMPLATE

Copy this and fill in as you execute:

```
MIGRATION EXECUTION LOG
Date: __________
Executed by: __________

[  ] Migration 1: _____ Status: _____ Time: _____ Notes: _____
[  ] Migration 2: _____ Status: _____ Time: _____ Notes: _____
[  ] Migration 3: _____ Status: _____ Time: _____ Notes: _____
[  ] Migration 4: _____ Status: _____ Time: _____ Notes: _____
[  ] Migration 5: _____ Status: _____ Time: _____ Notes: _____
[  ] Migration 6: _____ Status: _____ Time: _____ Notes: _____
[  ] Migration 7: _____ Status: _____ Time: _____ Notes: _____
[  ] Migration 8: _____ Status: _____ Time: _____ Notes: _____
[  ] Migration 9: _____ Status: _____ Time: _____ Notes: _____
[  ] Migration 10: _____ Status: _____ Time: _____ Notes: _____
[  ] Migration 11: _____ Status: _____ Time: _____ Notes: _____
[  ] Migration 12: _____ Status: _____ Time: _____ Notes: _____

Total Time: _____
Issues Encountered: _____
Rollback Required: Yes / No
```

---

**Ready to execute? Follow HARDENING_DEPLOYMENT_CHECKLIST.md** 🚀
