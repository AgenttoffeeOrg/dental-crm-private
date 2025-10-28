# 🚀 WORLD-CLASS ARCHITECTURE IMPLEMENTATION PLAN

## 📋 EXECUTION CHECKLIST

### ✅ PHASE 1: DATABASE (COMPLETED)
- [x] Migration #1: Strict RLS + Auth Function (`20251027_001_strict_rls_auth_function.sql`)
- [ ] **Migration #2: Location Access RPC** (`20251027_002_get_user_accessible_locations.sql`) **← YOU NEED TO RUN THIS!**

### 🔴 PHASE 2: CRITICAL SECURITY FIXES (PRIORITY 1)
- [ ] Fix `/api/export/contacts` - Remove client-supplied tenant_id vulnerability
- [ ] Fix `/api/export/deals` - Remove client-supplied tenant_id vulnerability  
- [ ] Add security scanning to prevent future vulnerabilities

### 🟡 PHASE 3: API CONTEXT FIXES (PRIORITY 2)
- [ ] Update `/api/contacts` GET - Use `active_tenant_id` + location filtering
- [ ] Update `/api/contacts` POST - Use `active_tenant_id` + assign `location_id`
- [ ] Update `/api/contacts` PATCH - Use `active_tenant_id` + verify location access
- [ ] Update `/api/contacts/[id]` GET - Use `active_tenant_id` + verify location
- [ ] Update `/api/contacts/[id]` PATCH - Use `active_tenant_id` + verify location
- [ ] Update `/api/contacts/[id]` DELETE - Use `active_tenant_id` + verify location
- [ ] Update `/api/tenant/context` - Return `active_tenant_id` instead of `tenant_id`

### 🟢 PHASE 4: AUDIT LOGGING (PRIORITY 3)
- [ ] Add audit log entry when user switches organization
- [ ] Add audit log entry when user switches location
- [ ] Verify audits table has `location_id` and `affected_location_ids` columns

### 🔵 PHASE 5: TESTING & VERIFICATION (PRIORITY 4)
- [ ] Test: Org switching changes visible contacts
- [ ] Test: Location switching filters data correctly
- [ ] Test: Export endpoints can't access other tenants
- [ ] Test: Users only see accessible locations
- [ ] Test: All_locations=true users see all locations
- [ ] Test: All_locations=false users see only assigned locations

### 🟣 PHASE 6: UI VERIFICATION (PRIORITY 5)
- [ ] Verify OrgSwitcher component renders and works
- [ ] Verify LocationSwitcher component renders and works
- [ ] Verify switching triggers data refresh
- [ ] Fix any UI build errors

### ⚡ PHASE 7: FINAL VALIDATION (PRIORITY 6)
- [ ] Complete smoke test: Create user, add to 2 orgs, switch between them
- [ ] Create architecture verification document with evidence
- [ ] Document all API changes
- [ ] Create production deployment checklist

---

## 🎯 YOUR ARCHITECTURE (TARGET STATE)

### Data Isolation Model:
```
User (user_id: U1)
  ├─ Membership in Org A
  │   ├─ active_tenant_id: A (when viewing Org A)
  │   ├─ Sees ONLY Org A data
  │   ├─ Location access: [L1, L3] (not L2)
  │   └─ active_location_id: L1
  │
  └─ Membership in Org B
      ├─ active_tenant_id: B (when viewing Org B)
      ├─ Sees ONLY Org B data
      ├─ Location access: ALL (all_locations=true)
      └─ active_location_id: LX
```

### Key Principles:
1. **ONE active org at a time** (`app_users.active_tenant_id`)
2. **ONE active location at a time** (`app_users.active_location_id`)
3. **Switching org = data changes immediately**
4. **Location filtering based on permissions**
5. **Zero cross-tenant visibility** (enforced by RLS)

---

## 🛠️ IMPLEMENTATION APPROACH

### Security First
- Fix export vulnerabilities IMMEDIATELY
- Never trust client-supplied tenant_id
- Always derive context from authenticated user

### Context Resolution
```typescript
// ✅ CORRECT PATTERN (what we're implementing)
const { data: appUser } = await supabase
  .from('app_users')
  .select('active_tenant_id, active_location_id')
  .eq('id', user.id)
  .single()

// Use active_tenant_id for ALL queries
.eq('tenant_id', appUser.active_tenant_id)
```

### Location Filtering
```typescript
// ✅ CORRECT PATTERN
// 1. Check if user has all_locations
const { data: membership } = await supabase
  .from('user_tenant_memberships')
  .select('all_locations')
  .eq('user_id', user.id)
  .eq('tenant_id', appUser.active_tenant_id)
  .single()

// 2. If NOT all_locations, get accessible locations
if (!membership.all_locations) {
  const { data: locations } = await supabase.rpc(
    'get_user_accessible_locations',
    { p_user_id: user.id, p_tenant_id: appUser.active_tenant_id }
  )
  
  // 3. Filter by accessible location IDs
  dbQuery = dbQuery.in('location_id', locations.map(l => l.id))
}
```

---

## 📊 PROGRESS TRACKING

**Total Tasks:** 35  
**Completed:** 10  
**In Progress:** 0  
**Remaining:** 25

**ETA:** 2-3 hours of focused work

---

## 🚨 BLOCKER: MIGRATION #2 REQUIRED

Before I can proceed with API fixes, you MUST run Migration #2!

### How to Run:
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `/supabase/migrations/20251027_002_get_user_accessible_locations.sql`
3. Paste and click "RUN"
4. Verify you see: `✅ get_user_accessible_locations function created successfully`

**This function is CRITICAL for location filtering to work!**

---

## 📝 NOTES

- All changes will be atomic (one commit per subtask)
- Every fix includes inline comments
- Security checks run before committing
- Tests created alongside fixes
- Documentation updated continuously

---

**Created:** October 27, 2025  
**Status:** Awaiting Migration #2  
**Next Action:** Run migration, then fix export vulnerabilities

