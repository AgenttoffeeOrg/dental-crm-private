# 🔧 PHASE 6: REMOVE HARDCODED TENANT IDs - EXECUTION PLAN

**Date:** October 16, 2025  
**Status:** IN PROGRESS  
**Files to Fix:** 103 files  
**Hardcoded IDs to Remove:** 124 occurrences  

---

## ✅ **COMPLETED:**
- Phase 1-5: Database migrations (RLS, data migration, integrity)
- Created `useTenantContext()` hook

---

## 🎯 **PHASE 6 STRATEGY:**

### **Priority 1: Critical User-Facing Components (10 files)**
These directly affect the user's reported issue:

1. **`src/components/deals/deal-detail-view.tsx`** - Deal detail without tenant filter
2. **`src/components/deals/deal-detail-view-modal.tsx`** - Modal without tenant filter
3. **`src/components/deals/deal-profile-dialog.tsx`** - Dialog with hardcoded ID
4. **`src/components/pipeline/pipeline-board.tsx`** - Pipeline view
5. **`src/components/deals/deals-table.tsx`** - Main deals list
6. **`src/components/contacts/contacts-list-enterprise.tsx`** - Contacts list
7. **`src/app/dashboard/page.tsx`** - Dashboard stats
8. **`src/app/pipeline/page.tsx`** - Pipeline page
9. **`src/app/deals/page.tsx`** - Deals page
10. **`src/app/contacts/page.tsx`** - Contacts page

### **Priority 2: API Routes (15 files)**
Backend endpoints that need tenant filtering:

11. **`src/app/api/deals/route.ts`** - Deals API
12. **`src/app/api/contacts/route.ts`** - Contacts API
13. **`src/app/api/pipeline/route.ts`** - Pipeline API
14. **`src/app/api/tasks/route.ts`** - Tasks API
15-25. Other API routes

### **Priority 3: Hooks & Utilities (20 files)**
Data fetching hooks:

26. **`src/hooks/use-deals.ts`**
27. **`src/hooks/use-contacts.ts`**
28. **`src/hooks/use-pipeline.ts`**
29-45. Other hooks

### **Priority 4: Remaining Components (58 files)**
All other components with hardcoded IDs

---

## 🔨 **PATTERN TO APPLY:**

### **BEFORE (WRONG):**
```typescript
function Component({ tenantId = '550e8400-e29b-41d4-a716-446655440000' }) {
  const { data } = await supabase
    .from('deals')
    .select('*')
    .eq('id', dealId)
}
```

### **AFTER (CORRECT):**
```typescript
import { useTenantContext } from '@/lib/hooks/use-tenant-context'

function Component() {
  const { orgId, isLoading } = useTenantContext()
  
  if (isLoading) return <LoadingState />
  if (!orgId) return <div>Not authenticated</div>
  
  const { data } = await supabase
    .from('deals')
    .select('*')
    .eq('tenant_id', orgId)  // ✅ ALWAYS filter by tenant
    .eq('id', dealId)
}
```

---

## 📊 **EXECUTION PHASES:**

### **Phase 6A: Critical Fixes (2 hours)** ⏳ IN PROGRESS
- Fix 10 critical user-facing components
- Test each fix
- Commit incrementally

### **Phase 6B: API Routes (2 hours)**
- Fix 15 API endpoints
- Add tenant filtering to all queries
- Test with Postman/curl

### **Phase 6C: Hooks & Utils (2 hours)**
- Fix 20 data hooks
- Ensure all use useTenantContext()
- Test data fetching

### **Phase 6D: Remaining Components (2 hours)**
- Fix 58 remaining files
- Batch fixes by module
- Full regression test

---

## 🧪 **TESTING STRATEGY:**

After each priority group:
1. ✅ Linter checks (no errors)
2. ✅ TypeScript compilation
3. ✅ Manual testing (login, navigate, verify data)
4. ✅ Check browser console (no errors)
5. ✅ Git commit with clear message

---

## 📝 **TRACKING:**

**Files Fixed:** 0 / 103  
**Critical Fixed:** 0 / 10  
**API Routes Fixed:** 0 / 15  
**Hooks Fixed:** 0 / 20  
**Other Fixed:** 0 / 58  

**Progress:** 0%

---

**Starting Phase 6A now...**

