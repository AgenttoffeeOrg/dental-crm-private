# ⚡ QUICK TEST EXECUTION CHECKLIST

**For rapid verification - use this for quick checks**

---

## 🚀 RAPID SMOKE TEST (5 Minutes)

### Step 1: Check Build ✅
```bash
# Verify no compilation errors
# Look at terminal - should see "✓ Ready"
```

### Step 2: Verify OrgSwitcher (30 seconds)
```
1. Go to http://localhost:3000/dashboard
2. Look for org dropdown in header
3. Click it - should show list of orgs
4. Switch org - page should reload with new data
```
**Expected:** ✅ Switcher visible, works, data changes

### Step 3: Verify LocationSwitcher (30 seconds)
```
1. While on dashboard/contacts
2. Look for location dropdown (near org switcher)
3. Click it - should show accessible locations
4. Switch location - data should filter
```
**Expected:** ✅ Switcher visible (if >1 location), filters data

### Step 4: Test Org Switch Impact (1 minute)
```
1. Go to /contacts
2. Count contacts (write down number)
3. Switch to different org
4. Count again - should be different number
5. Switch back - original count restored
```
**Expected:** ✅ Different data per org, no mixing

### Step 5: Test Location Filtering (1 minute)
```
1. Stay on /contacts
2. Note current contact count
3. Switch to different location
4. Count should change (fewer or different contacts)
5. Try "All Locations" if available - count increases
```
**Expected:** ✅ Contacts filtered by location

### Step 6: Check Console (30 seconds)
```
1. Open DevTools → Console
2. Look for any RED errors
3. Warnings are OK, errors are NOT OK
```
**Expected:** ✅ No errors (warnings acceptable)

### Step 7: Verify Export Security (1 minute)
```
1. Open DevTools → Console
2. Paste this (replace TENANT_ID with different org):
   
   fetch('/api/export/contacts?tenant_id=DIFFERENT_ORG_ID', {
     credentials: 'include'
   }).then(r => r.text()).then(d => console.log(d.substring(0, 200)))

3. Check output - should still be YOUR org's data
```
**Expected:** ✅ Ignores client-supplied tenant_id

---

## 📋 QUICK VERIFICATION MATRIX

| Test | Status | Evidence |
|------|--------|----------|
| Build compiles | ⬜ | Terminal shows "✓ Ready" |
| OrgSwitcher visible | ⬜ | Screenshot or visual confirmation |
| LocationSwitcher visible | ⬜ | Screenshot (if >1 location) |
| Org switch changes data | ⬜ | Different contact count |
| Location switch filters | ⬜ | Contact count changes |
| No console errors | ⬜ | DevTools console clean |
| Export is secure | ⬜ | Can't access other org data |

---

## 🎯 PASS/FAIL CRITERIA

**✅ PASS** = All 7 checks have ⬜→✅  
**❌ FAIL** = Any check shows issue

---

##  Database Quick Checks

### Check if switches are logged:
```sql
SELECT COUNT(*) FROM audits 
WHERE action IN ('user.tenant_switched', 'user.location_switched')
AND created_at > NOW() - INTERVAL '1 hour';
```
**Expected:** Count > 0 (shows auditing works)

### Check user's active context:
```sql
SELECT active_tenant_id, active_location_id 
FROM app_users 
WHERE email = 'your@email.com';
```
**Expected:** Both have valid UUIDs

---

## 🚨 COMMON ISSUES & FIXES

### Issue: OrgSwitcher not visible
**Fix:** User must have memberships in 2+ orgs

### Issue: LocationSwitcher not visible  
**Fix:** User must have access to 2+ locations in active org

### Issue: Switching doesn't change data
**Fix:** Check RLS policies are applied (run Migration #1)

### Issue: Console errors about tenant_id
**Fix:** Verify `active_tenant_id` is set in app_users table

---

**Use this for quick validation before detailed testing!**

