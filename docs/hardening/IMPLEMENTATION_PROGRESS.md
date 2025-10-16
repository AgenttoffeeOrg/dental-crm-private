# Master Fix Implementation - Progress Report

**Date Started:** October 16, 2025  
**Status:** In Progress  
**Current Phase:** 1 (RLS Foundations)

---

## ✅ COMPLETED

### **PHASE 0: Preflight & Inventory** ✅
**Status:** Complete  
**Files Created:**
- `docs/hardening/preflight.md` - 28 gaps identified across 12 categories
- `docs/hardening/audit-queries.sql` - 12 comprehensive audit queries

**Key Findings:**
- 🔴 4 Critical (P0) risks identified
- 🟠 20 High (P1) risks identified
- 🟡 4 Medium risks identified
- **Total Estimated Effort:** 3 weeks (1 engineer full-time)

**Critical Risks:**
1. Entitlement bypass risk (accepts tenant_id param)
2. Hard deletes = GDPR non-compliance
3. Cross-tenant FK violations possible
4. Webhook replay attacks (no idempotency)

---

### **PHASE 1: RLS Foundations** 🔄 **IN PROGRESS**
**Status:** 75% Complete (3 of 4 migrations done)

#### **Migration 1: Helper Functions** ✅
**File:** `supabase/migrations/20251016_hardening_001_helpers.sql`

**Functions Created:**
- `current_tenant_id()` - Get authenticated user's tenant (replaces all variants)
- `current_role_name()` - Get user's role
- `user_has_role(TEXT[])` - Check role membership
- `set_updated_at()` - Auto-update timestamps trigger
- `is_not_deleted(TIMESTAMPTZ)` - Check soft delete status
- `soft_delete_cascade()` - Soft delete trigger
- `prevent_tenant_id_change()` - Prevent tenant_id modifications
- `validate_same_tenant()` - FK tenant validation
- `log_audit_event()` - Audit logging helper

**Impact:**
- Canonical functions replace all variants (get_user_org_id, get_user_tenant_id, etc.)
- Security: Functions use `SECURITY DEFINER` but derive tenant from auth context only
- Consistency: All future code uses same helpers

#### **Migration 2: Soft Delete & Triggers** ✅
**File:** `supabase/migrations/20251016_hardening_002_soft_delete.sql`

**Changes:**
- Added `deleted_at` column to 20+ entity tables
- Created partial indexes for query performance: `WHERE deleted_at IS NULL`
- Attached `set_updated_at()` triggers to all tables with `updated_at`
- Attached `prevent_tenant_id_change()` triggers to all tenant-scoped tables
- Created `soft_deleted_records` view for admin utilities

**Impact:**
- ✅ GDPR compliance: Can now "soft delete" and recover
- ✅ Audit trail: Deleted records preserved with timestamp
- ✅ Performance: Partial indexes optimize "not deleted" queries
- ⚠️ **BREAKING:** Application code must now filter `WHERE deleted_at IS NULL`

#### **Migration 3: RLS Policy Reset** ✅
**File:** `supabase/migrations/20251016_hardening_003_rls_reset.sql`

**Changes:**
- Applied consistent RLS to 12 core tables:
  - `contacts`, `deals`, `pipelines`, `pipeline_stages`, `tasks`
  - `activities`, `calls`, `files`, `notes`, `locations`
  - `automations`, `automation_execution_logs`
- **Policy Pattern:**
  - SELECT: `tenant_id = current_tenant_id() AND is_not_deleted(deleted_at)`
  - INSERT: `tenant_id = current_tenant_id()`
  - UPDATE: `tenant_id = current_tenant_id()`
  - DELETE: `tenant_id = current_tenant_id() AND user_has_role(ARRAY['owner','super_admin','admin'])`
  - Service role bypass for all tables

**Impact:**
- ✅ Consistent security model across all tables
- ✅ Soft delete automatically enforced at DB level
- ✅ Admin-only hard deletes
- ✅ Service role can bypass for admin operations

#### **Migration 4: FK Tenant Guards** ⏳ **NEXT**
**File:** `supabase/migrations/20251016_hardening_004_fk_guards.sql` (to be created)

**Planned Changes:**
- Add CHECK constraints to validate same-tenant relationships:
  - `deals.contact_id` → `contacts.id` (same tenant)
  - `deals.pipeline_id` → `pipelines.id` (same tenant)
  - `deals.stage_id` → `pipeline_stages.id` (same tenant)
  - `tasks.contact_id` → `contacts.id` (same tenant)
  - `tasks.deal_id` → `deals.id` (same tenant)
  - `calls.contact_id` → `contacts.id` (same tenant)
  - And 10+ more relationships

**Impact:**
- ✅ Prevents cross-tenant data linkage at DB level
- ✅ Data integrity guarantee
- ⚠️ May fail on existing data with incorrect linkages (needs audit first)

---

## ⏳ PENDING PHASES

### **PHASE 2: Entitlements Hardening** 🔜 **NEXT PRIORITY**
**Estimated:** 1 day

**Planned Changes:**
1. Refactor `check_entitlement()` to NOT accept `tenant_id` param (security fix)
2. Apply entitlement checks to marketing table RLS policies
3. Apply combined entitlement checks to automations (category='marketing')
4. Create tRPC middleware: `requireEntitlements(['marketing'])`
5. Implement UI hook: `useEntitlement('marketing')`

**Migrations:**
- `20251016_hardening_005_entitlements_db.sql`
- `20251016_hardening_006_rls_marketing.sql`
- `20251016_hardening_007_rls_automations_entitlement.sql`

**Code Changes:**
- `src/server/middleware/entitlements.ts`
- `src/hooks/use-entitlement.ts`
- Update all marketing routes with middleware

### **PHASE 3: Quotas & Billing Enforcement**
**Estimated:** 1 day

**Planned:**
- `enforce_quota_and_increment()` function
- Triggers on `marketing_campaign_sends`
- UI quota warnings (>= 85%)

### **PHASE 4: Webhooks Security**
**Estimated:** 1 day

**Planned:**
- `webhook_events` table
- Idempotency checks in webhook handlers
- Signature verification for all providers

### **PHASES 5-12**
**Estimated:** 2 weeks remaining

See `preflight.md` for full details.

---

## 📊 **CURRENT STATISTICS**

### **Migrations Created**
- Phase 0: 2 files (audit documentation + queries)
- Phase 1: 3 files (helpers, soft delete, RLS) = **1,200+ lines SQL**
- Total: 5 files

### **Functions Created**
- 9 helper functions
- All marked `SECURITY DEFINER` where needed
- All using `auth.uid()` and RLS context

### **Tables Modified**
- 20+ tables with `deleted_at` column added
- 12 tables with RLS policies reset
- 20+ tables with `updated_at` triggers attached
- 20+ tables with `prevent_tenant_id_change` triggers

### **Indexes Created**
- 6 partial indexes for soft delete queries

### **Views Created**
- `soft_deleted_records` - admin utility view

---

## 🎯 **NEXT STEPS**

### **Immediate (Today)**
1. ✅ Complete Phase 1 Migration 4 (FK guards)
2. ✅ Test Phase 1 migrations in staging
3. ✅ Begin Phase 2 (Entitlement hardening)

### **This Week**
1. Complete Phases 1-4 (Security critical)
2. Run red-team tests on RLS + entitlements
3. Begin Phase 5 (Data quality)

### **Next Week**
1. Complete Phases 5-8 (Features + compliance)
2. Begin Phase 9-10 (Ops + CI/CD)

### **Week 3**
1. Complete Phases 11-12 (Testing + polish)
2. Full E2E test suite
3. Production deployment

---

## ⚠️ **BREAKING CHANGES**

### **Application Code Updates Required**

#### **1. Soft Delete Filtering** (Phase 1.2)
**Before:**
```typescript
const { data } = await supabase.from('contacts').select('*')
```

**After:**
```typescript
const { data } = await supabase
  .from('contacts')
  .select('*')
  .is('deleted_at', null) // Filter out soft-deleted records
```

**OR** rely on RLS (which now automatically filters):
```typescript
// RLS now includes: AND is_not_deleted(deleted_at)
const { data } = await supabase.from('contacts').select('*')
// Soft-deleted records automatically excluded
```

#### **2. Delete Operations** (Phase 1.2)
**Before:**
```typescript
await supabase.from('contacts').delete().eq('id', contactId)
```

**After:**
```typescript
// Soft delete
await supabase
  .from('contacts')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', contactId)

// Hard delete (admin only, triggers role check in RLS)
await supabase.from('contacts').delete().eq('id', contactId)
```

#### **3. Tenant ID Retrieval** (Phase 1.1)
**Before:**
```typescript
const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000' // ❌ Hardcoded
const tenantId = appUser.tenant_id // ✅ But inconsistent
```

**After:**
```typescript
// Client-side
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
const { orgId } = useTenantContext()

// Server-side (Supabase functions/triggers)
-- Uses current_tenant_id() automatically in RLS policies
```

#### **4. Role Checks** (Phase 1.1)
**Before:**
```typescript
if (appUser.role === 'admin' || appUser.role === 'owner') { ... }
```

**After:**
```typescript
// Let RLS handle it, or use helper:
const { data } = await supabase.rpc('user_has_role', {
  required_roles: ['admin', 'owner']
})
```

---

## 🧪 **TESTING CHECKLIST**

### **Phase 1 Verification**

#### **Helper Functions**
- [ ] Run: `SELECT current_tenant_id();` as authenticated user → returns tenant UUID
- [ ] Run: `SELECT current_role_name();` → returns role string
- [ ] Run: `SELECT is_not_deleted(NULL);` → returns true
- [ ] Run: `SELECT is_not_deleted(NOW());` → returns false

#### **Soft Delete**
- [ ] Soft delete a contact → `deleted_at` set
- [ ] Query contacts → soft-deleted contact not returned (RLS filters it)
- [ ] As service role → soft-deleted contact IS returned
- [ ] Update `deleted_at` to NULL → "undelete" works

#### **RLS Policies**
- [ ] User A cannot see User B's contacts (different tenants)
- [ ] User cannot update another tenant's deal (UPDATE fails)
- [ ] Non-admin user cannot hard delete records (DELETE fails)
- [ ] Service role can access all records (bypass works)

#### **FK Guards** (after Migration 4)
- [ ] Try to create deal with contact_id from different tenant → fails with CHECK violation
- [ ] Try to update deal's contact_id to different tenant → fails

---

## 📁 **FILES CREATED**

### **Documentation**
```
docs/hardening/
├── preflight.md                        # Phase 0: Audit findings (28 gaps)
├── audit-queries.sql                   # Phase 0: Verification queries
└── IMPLEMENTATION_PROGRESS.md          # This file
```

### **Migrations**
```
supabase/migrations/
├── 20251016_hardening_001_helpers.sql         # Phase 1.1: Helper functions
├── 20251016_hardening_002_soft_delete.sql     # Phase 1.2: Soft delete & triggers
└── 20251016_hardening_003_rls_reset.sql       # Phase 1.3: RLS policy reset
```

### **Next Migrations (To Be Created)**
```
supabase/migrations/
├── 20251016_hardening_004_fk_guards.sql              # Phase 1.4: FK tenant guards
├── 20251016_hardening_005_entitlements_db.sql        # Phase 2.1: Entitlement refactor
├── 20251016_hardening_006_rls_marketing.sql          # Phase 2.2: Marketing RLS
├── 20251016_hardening_007_rls_automations_ent.sql    # Phase 2.3: Automations entitlement RLS
├── 20251016_hardening_008_quotas.sql                 # Phase 3: Quotas
├── 20251016_hardening_009_webhooks.sql               # Phase 4: Webhooks
└── ... (20+ more migrations for Phases 5-12)
```

---

## 💡 **LESSONS LEARNED**

1. **Consistency is Key:** Single `current_tenant_id()` function prevents drift
2. **Defense in Depth:** RLS + application checks + FK guards = layered security
3. **Soft Delete is Essential:** GDPR compliance + audit trail + recovery
4. **Breaking Changes:** Major refactors require application code updates
5. **Verification:** Every phase needs audit queries to verify success

---

## 🔄 **ROLLBACK PLAN**

If Phase 1 causes issues:

### **Option 1: Revert Migrations**
```sql
-- Revert in reverse order
DROP VIEW IF EXISTS soft_deleted_records;
-- DROP all policies created in 003
-- DROP all triggers created in 002
-- DROP all functions created in 001
```

### **Option 2: Git Revert**
```bash
git revert HEAD~3  # Revert last 3 commits
```

### **Option 3: Restore from Backup**
```bash
# Restore database from pre-hardening backup
# See backup timestamps in Supabase dashboard
```

---

## 📞 **CONTACT**

**Implementation Lead:** AI Assistant  
**Review Required:** Product, Engineering, Security, Legal  
**Approval Status:** Pending

---

**Last Updated:** October 16, 2025  
**Next Update:** After Phase 1 completion

