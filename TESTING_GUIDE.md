# 🚀 TESTING GUIDE - See Everything in the App

**User:** deepakshegde@gmail.com  
**Status:** ✅ All features enabled  
**Date:** Friday, October 17, 2025

---

## ✅ **WHAT'S BEEN ENABLED**

| Feature | Status | What You'll See |
|---------|--------|-----------------|
| **Multi-location** | ✅ ON | Location switcher, 3 locations accessible |
| **Domain Discovery** | ✅ ON | Find existing orgs by domain |
| **Join Requests** | ✅ ON | Users can request to join |
| **Seat Enforcement** | ✅ ON | Seat limits enforced (yours: unlimited) |
| **Billing** | ✅ ON | Subscription management |
| **Email Sending** | ⚠️ Console | Emails logged to console (not sent) |

---

## 📋 **STEP-BY-STEP TESTING**

### **STEP 1: Verify Database Setup**

In Supabase SQL Editor, run:
```bash
# File: scripts/verify_test_user.sql
```

**Expected output:**
```
👤 USER INFO
  Email: deepakshegde@gmail.com
  Role: owner
  
🏢 DENTAL GROUP
  Name: Deepak Test Dental Group
  
📍 LOCATION 1: Main Office - Downtown
📍 LOCATION 2: North Branch  
📍 LOCATION 3: West Branch

💎 SUBSCRIPTION
  Status: active
  Seats: 9999 (Unlimited)
  Plan: Enterprise
  Valid until: 2026-10-17
  
👑 ADMIN STATUS: Tenant Admin
```

---

### **STEP 2: Start Dev Server**

```bash
cd /Users/deepak/auth-app/dental-crm
npm run dev
```

**Wait for:** `ready - started server on 0.0.0.0:3000`

---

### **STEP 3: Log In**

1. Open browser: http://localhost:3000
2. Log in with: **deepakshegde@gmail.com**
3. Enter your password

---

## 🎯 **FEATURES TO TEST**

### **1️⃣ Multi-Location Switcher**

**Where:** Top navigation bar or sidebar

**What to look for:**
- Location switcher dropdown
- Shows all 3 locations:
  - Main Office - Downtown
  - North Branch
  - West Branch
- Click to switch between locations
- Data changes based on selected location

**Test:**
```
✅ See location switcher
✅ Click dropdown
✅ See all 3 locations
✅ Switch to North Branch
✅ Switch to West Branch
✅ Switch back to Main Office
```

---

### **2️⃣ Team Management**

**Where:** Settings → Team or Team Management page

**What to look for:**
- Invite new users button
- Seat usage display: "1 of 9999 seats used"
- List of team members
- Assign roles and permissions
- Grant/revoke location access

**Test:**
```
✅ See unlimited seats (9999)
✅ Invite a test user
✅ Assign role to user
✅ Grant access to specific locations
```

---

### **3️⃣ Join Requests (Admin View)**

**Where:** Settings → Team → Pending Requests

**What to look for:**
- List of pending join requests
- Approve/Reject buttons
- Role assignment on approval
- Seat reservation check

**Test:**
```
✅ View pending requests section
✅ See approve/reject options
✅ Test approval flow (if requests exist)
```

---

### **4️⃣ Billing & Subscription**

**Where:** Settings → Billing or Subscription

**What to look for:**
- Current plan: Enterprise
- Seat usage: 1 / 9999
- Subscription status: Active
- Valid until: Oct 2026
- No payment required

**Test:**
```
✅ See Enterprise plan badge
✅ See unlimited seats
✅ See active status
✅ See expiration date
```

---

### **5️⃣ Organization Settings**

**Where:** Settings → Organization

**What to look for:**
- Organization name: Deepak Test Dental Group
- Location list (all 3)
- Primary email
- Billing email
- Domain verification options

**Test:**
```
✅ See dental group name
✅ See all 3 locations listed
✅ See contact information
```

---

### **6️⃣ Admin Permissions**

**As Owner/Admin, you should be able to:**
- ✅ Access all settings
- ✅ Invite/remove users
- ✅ Assign roles
- ✅ Manage locations
- ✅ View billing
- ✅ Update organization details
- ✅ Grant/revoke access
- ✅ Approve join requests

**Test:**
```
✅ Try accessing Settings
✅ Try Team Management
✅ Try Billing page
✅ Verify no "upgrade required" messages
```

---

### **7️⃣ Data Isolation (Multi-Location)**

**Test RLS is working:**

1. **Create test data in Main Office:**
   - Add a contact
   - Add a deal
   - Add a task

2. **Switch to North Branch:**
   - Should NOT see Main Office data
   - Empty state or different data

3. **Switch back to Main Office:**
   - Should see your data again

**Test:**
```
✅ Data in Location 1
✅ Switch to Location 2 → data isolated
✅ Switch back → data returns
```

---

## 🐛 **TROUBLESHOOTING**

### **❌ Don't see location switcher?**

1. Check feature flag is enabled:
   ```bash
   # File: src/lib/feature-flags.ts
   ENABLE_MULTI_LOCATION: true ✅
   ```

2. Restart dev server:
   ```bash
   # Ctrl+C to stop, then:
   npm run dev
   ```

3. Clear browser cache and reload

---

### **❌ Getting "access denied" errors?**

1. Verify you're logged in as: `deepakshegde@gmail.com`
2. Check database setup ran successfully
3. Run verification query again

---

### **❌ Features not showing up?**

Check `src/lib/feature-flags.ts` has:
```typescript
ENABLE_MULTI_LOCATION: true ✅
ENABLE_BILLING: true ✅
ENABLE_JOIN_REQUESTS: true ✅
```

---

## 📊 **WHAT YOU SHOULD SEE**

### **Main Dashboard:**
```
┌─────────────────────────────────────────┐
│ 🏢 Deepak Test Dental Group            │
│                                         │
│ 📍 Location: [Main Office ▼]           │  ← Location Switcher
│                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                         │
│ 📊 Dashboard Content                   │
│ 👥 Contacts                            │
│ 💼 Deals                               │
│ ✓ Tasks                                │
│                                         │
└─────────────────────────────────────────┘
```

### **Settings:**
```
┌─────────────────────────────────────────┐
│ ⚙️ Settings                             │
│                                         │
│ ├─ Organization                        │
│ ├─ Team (💎 1/9999 seats)             │  ← Unlimited seats
│ ├─ Billing (Enterprise - Active)      │  ← Your plan
│ ├─ Locations (3)                       │  ← All locations
│ └─ Permissions                         │
│                                         │
└─────────────────────────────────────────┘
```

---

## ✅ **SUCCESS CHECKLIST**

After testing, you should have verified:

- [ ] ✅ Logged in as deepakshegde@gmail.com
- [ ] ✅ See location switcher with 3 locations
- [ ] ✅ Can switch between locations
- [ ] ✅ See Enterprise plan with unlimited seats
- [ ] ✅ Have Owner/Admin permissions
- [ ] ✅ Can access all settings
- [ ] ✅ Can manage team
- [ ] ✅ See billing information
- [ ] ✅ Data is isolated per location
- [ ] ✅ All features are accessible

---

## 🎉 **YOU'RE ALL SET!**

You now have:
- ✅ Full admin access
- ✅ Multi-location setup (3 locations)
- ✅ Unlimited Enterprise subscription
- ✅ All features enabled
- ✅ Complete testing environment

**Go test everything and enjoy!** 🚀

---

## 📝 **NOTES**

- Emails will log to console (not actually sent)
- Stripe is in test mode (no real charges)
- You can add more locations anytime
- You can invite test users
- All data is isolated per location
- Subscription never expires (1 year validity)

**Happy testing!** ✨


