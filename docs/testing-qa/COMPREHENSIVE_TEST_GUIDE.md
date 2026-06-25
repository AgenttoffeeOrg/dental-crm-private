# 🧪 COMPREHENSIVE TESTING & VERIFICATION GUIDE
## Multi-Org Architecture - Production Readiness Verification

**Date:** October 27, 2025  
**Status:** Build Errors Fixed ✅ - Ready for Testing  
**Purpose:** Systematic verification of world-class multi-org implementation

---

## 🎯 TESTING PHILOSOPHY

**"Quality and Perfection Over Speed"**

Each test must be:
- **Thorough** - Cover all edge cases
- **Repeatable** - Same results every time
- **Documented** - Record observations
- **Evidence-Based** - Screenshots/logs as proof

---

## ✅ PRE-FLIGHT CHECKLIST

Before starting tests, verify:
- [ ] Build errors resolved (no compilation errors)
- [ ] Server running on `localhost:3000`
- [ ] Database migrations applied (both migrations)
- [ ] At least 2 test organizations exist in database
- [ ] At least 2 locations per org (for location tests)
- [ ] Test user has memberships in both orgs

### Quick Verification:
```bash
# Check server is running
curl http://localhost:3000/api/tenant/context

# Expected: Should return 200 OK with tenant context JSON
```

---

## 📋 TEST SUITE 1: ORGANIZATION SWITCHING

**Test ID:** `TEST-ORG-001`  
**Priority:** 🔴 CRITICAL  
**Objective:** Verify switching organizations changes visible data immediately

### Prerequisites:
1. User must have memberships in **Organization A** and **Organization B**
2. Each org must have at least 1 contact
3. Contacts should have distinct names to differentiate

### Test Procedure:

#### Step 1: Login and Verify Initial State
```
1. Navigate to http://localhost:3000/sign-in
2. Login with test user credentials
3. Should land on /dashboard
4. Note which org is currently active (look for org name in UI)
```

#### Step 2: Navigate to Contacts Page
```
5. Click "Contacts" in sidebar
6. Record the number of contacts shown
7. Record names of first 3 contacts
8. Take screenshot: contacts-org-a-initial.png
```

#### Step 3: Switch Organization
```
9. Click on OrgSwitcher dropdown (should be in top nav/header)
10. Select "Organization B" from dropdown
11. Observe page behavior:
    - Should show loading state
    - Should auto-refresh data
    - URL should remain /contacts
```

#### Step 4: Verify Data Changed
```
12. Count contacts again
13. Verify contact names are DIFFERENT from Step 2
14. Take screenshot: contacts-org-b-switched.png
15. Compare screenshots - contacts should be completely different
```

#### Step 5: Switch Back
```
16. Click OrgSwitcher again
17. Select "Organization A"
18. Verify original contacts from Step 2 are back
19. Take screenshot: contacts-org-a-restored.png
```

### Expected Results:
✅ **PASS Criteria:**
- OrgSwitcher dropdown visible and functional
- Switching orgs triggers immediate data reload
- Contact lists are completely isolated between orgs
- No data "leakage" from previous org
- Page URL stays same (no redirect)
- Loading state shown during switch

❌ **FAIL Criteria:**
- Same contacts visible after switch
- Mix of contacts from both orgs
- Switch doesn't trigger reload
- Errors in console
- OrgSwitcher not visible

### Evidence to Collect:
- [ ] Screenshot: `contacts-org-a-initial.png`
- [ ] Screenshot: `contacts-org-b-switched.png`
- [ ] Screenshot: `contacts-org-a-restored.png`
- [ ] Browser console logs (copy any errors)
- [ ] Network tab: Verify `/api/org/switch` returns 200
- [ ] Network tab: Verify contacts API called after switch

---

## 📋 TEST SUITE 2: LOCATION SWITCHING

**Test ID:** `TEST-LOC-001`  
**Priority:** 🔴 CRITICAL  
**Objective:** Verify location switching filters data correctly

### Prerequisites:
1. Active organization must have **multiple locations** (at least Location A, B, C)
2. User must have access to **at least 2 locations** (not all)
3. Contacts must be distributed across locations
4. Each contact should have `location_id` assigned

### Test Procedure:

#### Step 1: Verify Initial Location
```
1. Ensure you're on Organization A (from previous test)
2. Navigate to /contacts
3. Look for LocationSwitcher dropdown (should be near OrgSwitcher)
4. Note which location is currently active
5. Record number of contacts visible
6. Check if "All Locations" option is available
```

#### Step 2: Switch to Location A
```
7. Open LocationSwitcher dropdown
8. Select "Location A"
9. Record contacts visible (count + names)
10. Take screenshot: contacts-location-a.png
```

#### Step 3: Switch to Location B
```
11. Open LocationSwitcher dropdown
12. Select "Location B"
13. Record contacts visible (count + names)
14. Take screenshot: contacts-location-b.png
15. Verify contacts are DIFFERENT from Location A
```

#### Step 4: Test Location C (If Accessible)
```
16. Try to select "Location C"
17. If NOT in dropdown: GOOD (means access control working)
18. If IN dropdown: Select it and verify data changes
```

#### Step 5: Test "All Locations" (If Available)
```
19. If "All Locations" visible: Select it
20. Verify count is sum of all location counts
21. If NOT visible: GOOD (means user doesn't have all_locations=true)
```

### Expected Results:
✅ **PASS Criteria:**
- LocationSwitcher visible (if user has >1 location access)
- Switching locations filters contacts immediately
- Only accessible locations shown in dropdown
- Data completely isolated by location
- "All Locations" only visible if user has all_locations=true

❌ **FAIL Criteria:**
- All contacts visible regardless of location
- Switching location has no effect
- Can see locations user shouldn't access
- Errors in console

### Evidence to Collect:
- [ ] Screenshot: `location-switcher-dropdown.png`
- [ ] Screenshot: `contacts-location-a.png`
- [ ] Screenshot: `contacts-location-b.png`
- [ ] Network tab: Verify `/api/locations/switch` returns 200
- [ ] Network tab: Verify contacts API filters by location

---

## 📋 TEST SUITE 3: EXPORT SECURITY

**Test ID:** `TEST-EXP-001`  
**Priority:** 🔴 CRITICAL  
**Objective:** Verify export endpoints can't access other tenants' data

### Prerequisites:
1. User logged into Organization A
2. Organization B exists with different data
3. Know Organization B's tenant_id (from database)

### Test Procedure:

#### Step 1: Legitimate Export
```
1. Navigate to /contacts in Organization A
2. Click "Export" button (if exists)
   OR manually trigger: GET /api/export/contacts
3. Save exported CSV file
4. Verify it contains only Org A contacts
5. Record number of rows in CSV
```

#### Step 2: Attempt Cross-Tenant Export (Manual API Call)
```
6. Open browser DevTools → Console
7. Get Organization B's tenant_id from database
8. Execute this in console:

   fetch('/api/export/contacts?tenant_id=<ORG_B_ID>', {
     method: 'GET',
     credentials: 'include'
   }).then(r => r.text()).then(console.log)

9. Examine response
```

### Expected Results:
✅ **PASS Criteria:**
- Export contains ONLY current org's data
- Supplying different `tenant_id` in query is IGNORED
- Still get Organization A's data (not B's)
- No way to access another org's data via export

❌ **FAIL Criteria:**
- Can export other org's data by changing query param
- Export contains mixed data from multiple orgs
- Error instead of silently using correct tenant_id

### Evidence to Collect:
- [ ] CSV export file from Org A
- [ ] Console output from cross-tenant attempt
- [ ] Network tab: Request/response headers
- [ ] Verify response contains Org A data only

---

## 📋 TEST SUITE 4: LOCATION ACCESS ISOLATION

**Test ID:** `TEST-LOC-002`  
**Priority:** 🟡 HIGH  
**Objective:** Verify users only see locations they have access to

### Prerequisites:
1. Organization has Locations A, B, C
2. Test user has access to A & C only (NOT B)
3. Each location has contacts

### Test Procedure:

#### Step 1: Verify Dropdown Contents
```
1. Login as test user with partial location access
2. Navigate to /contacts
3. Open LocationSwitcher dropdown
4. Record all locations visible in dropdown
5. Take screenshot: location-dropdown-limited.png
```

#### Step 2: Attempt Direct API Access
```
6. Get Location B's ID from database
7. Open DevTools → Console
8. Try to switch to Location B:

   fetch('/api/locations/switch', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ location_id: '<LOCATION_B_ID>' })
   }).then(r => r.json()).then(console.log)

9. Examine response
```

#### Step 3: Verify Contact Visibility
```
10. Navigate to /contacts
11. Try to see contacts from Location B
12. Should be IMPOSSIBLE if access control working
```

### Expected Results:
✅ **PASS Criteria:**
- LocationSwitcher shows ONLY accessible locations (A & C)
- Location B not in dropdown
- API call to switch to Location B returns 403 Forbidden
- Cannot see Location B contacts through any UI path

❌ **FAIL Criteria:**
- All locations visible in dropdown
- Can successfully switch to Location B
- Can see Location B contacts
- No access control enforced

### Evidence to Collect:
- [ ] Screenshot: `location-dropdown-limited.png`
- [ ] Console output from API attempt
- [ ] Network tab: Verify 403 response for unauthorized location

---

## 📋 TEST SUITE 5: UI COMPONENT VERIFICATION

**Test ID:** `TEST-UI-001`  
**Priority:** 🟢 MEDIUM  
**Objective:** Verify OrgSwitcher and LocationSwitcher render correctly

### Test Procedure:

#### Part A: OrgSwitcher Visibility
```
1. Login with user who has memberships in 2+ orgs
2. Navigate to /dashboard
3. Look for OrgSwitcher in header/top nav
4. Take screenshot: org-switcher-visible.png

Expected:
- Dropdown visible
- Shows current org name
- Click opens list of accessible orgs
```

#### Part B: LocationSwitcher Visibility
```
5. Ensure active org has multiple locations
6. User must have access to 2+ locations
7. Look for LocationSwitcher near OrgSwitcher
8. Take screenshot: location-switcher-visible.png

Expected:
- Dropdown visible if >1 location accessible
- Shows current location name
- Click opens list of accessible locations
```

#### Part C: Single-Org User
```
9. Logout
10. Login with user who has ONLY 1 org membership
11. Verify OrgSwitcher is HIDDEN
12. Take screenshot: org-switcher-hidden-single.png
```

#### Part D: Single-Location User
```
13. Login with user who has access to ONLY 1 location
14. Verify LocationSwitcher is HIDDEN
15. Take screenshot: location-switcher-hidden-single.png
```

### Expected Results:
✅ **PASS Criteria:**
- Both switchers visible for multi-org/multi-location users
- Both switchers functional (dropdowns work)
- OrgSwitcher hidden if user has only 1 org
- LocationSwitcher hidden if user has only 1 location access
- Clean UI, no broken styling

❌ **FAIL Criteria:**
- Components not rendering
- Dropdowns broken
- Always visible even for single-org users
- Styling issues

### Evidence to Collect:
- [ ] Screenshot: `org-switcher-visible.png`
- [ ] Screenshot: `location-switcher-visible.png`
- [ ] Screenshot: `org-switcher-hidden-single.png`
- [ ] Screenshot: `location-switcher-hidden-single.png`
- [ ] Browser console (check for React errors)

---

## 📋 TEST SUITE 6: COMPREHENSIVE SMOKE TEST

**Test ID:** `TEST-SMOKE-001`  
**Priority:** 🔴 CRITICAL  
**Objective:** End-to-end workflow validation

### Complete User Journey:

#### Scenario: Multi-Org, Multi-Location User
```
USER PROFILE:
- Has memberships in Org A and Org B
- In Org A: Access to Location A1, A2 (not A3)
- In Org B: Access to all locations (all_locations=true)
```

#### Journey Steps:
```
1. Login → Land on /dashboard (Org A active)
2. Navigate to /contacts
3. Verify contacts from Org A visible
4. Switch to Location A1
5. Verify contacts filtered to Location A1 only
6. Switch to Location A2
7. Verify contacts filtered to Location A2 only
8. Try to export contacts → Verify only A2 contacts exported
9. Switch to Org B via OrgSwitcher
10. Verify contacts list completely changes
11. Verify LocationSwitcher shows "All Locations" option
12. Select "All Locations"
13. Verify contacts from all Org B locations visible
14. Create new contact
15. Verify it's assigned to current location_id
16. Switch back to Org A
17. Verify new contact NOT visible (belongs to Org B)
18. Check browser DevTools for any errors
19. Verify no console warnings about tenant_id mismatches
```

### Expected Results:
✅ **PASS Criteria:**
- Complete workflow executes without errors
- Data properly isolated at every step
- Location filtering works consistently
- New contacts assigned to correct location
- Audit logs created for each switch (check database)

❌ **FAIL Criteria:**
- Any errors in console
- Data leakage between orgs or locations
- Incorrect data filtering
- Missing audit log entries

### Evidence to Collect:
- [ ] Full browser console log (export to file)
- [ ] Screenshots at each major step
- [ ] Database audit log query results
- [ ] Network tab HAR file (export full session)

---

## 📊 TEST RESULTS TEMPLATE

For each test suite, record:

```markdown
## Test Results: [TEST-ID]

**Tester:** [Your Name]
**Date:** [Date]
**Environment:** Development (localhost:3000)
**Browser:** [Chrome/Firefox/Safari] Version [X.X]

### Result: [PASS / FAIL]

### Observations:
- [Observation 1]
- [Observation 2]
- [Observation 3]

### Issues Found:
1. [Issue description]
   - Severity: [Critical/High/Medium/Low]
   - Steps to reproduce: [...]
   - Expected: [...]
   - Actual: [...]

### Evidence:
- Screenshots: [List files]
- Logs: [Attach or paste]
- Database queries: [Paste results]

### Notes:
[Any additional context]
```

---

## 🗄️ DATABASE VERIFICATION QUERIES

Run these in Supabase SQL Editor to verify backend state:

### Check Audit Logs for Switches
```sql
-- Should see entries for each org/location switch you tested
SELECT 
  created_at,
  action,
  user_id,
  tenant_id,
  location_id,
  metadata
FROM audits
WHERE action IN ('user.tenant_switched', 'user.location_switched')
ORDER BY created_at DESC
LIMIT 20;
```

### Verify User Context
```sql
-- Check user's active tenant and location
SELECT 
  id,
  email,
  active_tenant_id,
  active_location_id,
  last_context_switch_at
FROM app_users
WHERE email = '[YOUR_TEST_EMAIL]';
```

### Check Memberships
```sql
-- Verify user has correct org memberships
SELECT 
  utm.user_id,
  utm.tenant_id,
  t.name AS tenant_name,
  utm.all_locations,
  utm.status
FROM user_tenant_memberships utm
JOIN tenants t ON t.id = utm.tenant_id
WHERE utm.user_id = '[YOUR_USER_ID]';
```

### Check Location Access
```sql
-- Verify user's location permissions
SELECT 
  ml.membership_id,
  ml.location_id,
  l.name AS location_name,
  ml.is_active
FROM membership_locations ml
JOIN locations l ON l.id = ml.location_id
WHERE ml.membership_id IN (
  SELECT id FROM user_tenant_memberships
  WHERE user_id = '[YOUR_USER_ID]'
);
```

---

## ✅ FINAL CHECKLIST

After completing all tests:

- [ ] All 6 test suites executed
- [ ] Results documented for each test
- [ ] Screenshots collected and organized
- [ ] Database audit logs verified
- [ ] No critical issues found
- [ ] Any issues documented with reproduction steps
- [ ] Evidence files archived
- [ ] Test report compiled

---

## 🎯 SUCCESS CRITERIA

**PRODUCTION READY** if:
✅ All CRITICAL tests pass  
✅ All HIGH tests pass  
✅ No security vulnerabilities found  
✅ UI components render correctly  
✅ Data isolation verified  
✅ Audit logs complete  

---

**Document Version:** 1.0  
**Created:** October 27, 2025  
**Next Review:** After test execution

