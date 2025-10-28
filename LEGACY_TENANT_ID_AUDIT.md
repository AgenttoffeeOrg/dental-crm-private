# Legacy tenant_id Usage Audit
**Generated:** 2025-10-27
**Purpose:** Track and eliminate runtime reads of `app_users.tenant_id` for context derivation

## Summary

- **Total Matches:** 205 occurrences
- **Critical (Context Derivation):** 2 files to fix immediately
- **Benign (Feature Flags/Queries):** 203 are acceptable

---

## 🔴 CRITICAL - Context Derivation (MUST FIX)

### 1. src/components/settings/organization-profile-editor.tsx:27
```typescript
const activeTenantId = appUser?.active_tenant_id || appUser?.tenant_id
```
**Issue:** Falls back to `tenant_id` for context  
**Fix:** Remove fallback, strictly use `active_tenant_id`

### 2. src/lib/services/tenant-context.ts:73
```typescript
.eq('id', appUser.tenant_id)
```
**Issue:** Should use `active_tenant_id` instead  
**Fix:** Change to `appUser.active_tenant_id`

---

## ✅ BENIGN - Acceptable Uses

### Feature Flag Checks (3 occurrences)
- `src/components/verification/verification-banners.tsx:35, 179`
- `src/components/layout/org-switcher.tsx:58`

These are **ALLOWED** because they're checking feature flags for the user's organization,
not determining active context.

### Query Filters (~200 occurrences)
Files like:
- `src/components/settings/user-management-dashboard.tsx`
- `src/components/tasks/create-task-slide-over.tsx`
- `src/components/deals/deals-table.tsx`
- `src/components/contacts/contacts-list-enterprise.tsx`
- etc.

These filter queries by `tenant_id` which is **ALLOWED** as long as:
1. They occur AFTER active context is determined
2. The RLS layer enforces tenant isolation
3. They're not used to SET active context

---

## 🛡️ CI Guard Strategy

Create a linter rule that:
1. **BLOCKS** any code that assigns or derives active context from `app_users.tenant_id`
2. **ALLOWS** reading `tenant_id` for feature flags, query filters, and data display
3. **Pattern to block:** `appUser?.tenant_id || ...` or `active.*= appUser.tenant_id`

---

## Next Actions

1. ✅ Fix the 2 critical usages
2. ✅ Create CI guard script
3. ✅ Run verification tests
4. ✅ Document in ARCHITECTURE_IMPLEMENTATION_REPORT.md

