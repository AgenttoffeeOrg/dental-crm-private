# ✅ FIXED DEPLOYMENT GUIDE

## 🔧 **Issue Fixed: `super_admins` Table Conflict**

**Problem:** The existing `super_admins` table is for **platform owners**, not tenant admins.  
**Solution:** Created new `tenant_admins` table for organization-level admins.

---

## 📋 **CORRECTED MIGRATION ORDER**

Run migrations in **THIS EXACT ORDER** via Supabase Dashboard:

### **Step 1: Open Supabase SQL Editor**
https://supabase.com/dashboard/project/xcsgleuoxzrllimywlct/sql/new

### **Step 2: Run Each Migration (Copy & Paste)**

#### **Migration 1: Extend Tenants**
```
File: supabase/migrations/20251018_001_extend_tenants.sql
```
- Adds multi-location fields to tenants table
- Adds website/billing fields
- Backward compatible

#### **Migration 1a: Create Tenant Admins** ⭐ **NEW - CRITICAL**
```
File: supabase/migrations/20251018_001a_create_tenant_admins.sql
```
- Creates `tenant_admins` table (organization-level admins)
- Different from platform `super_admins`
- Backfills existing owners as tenant admins

#### **Migration 2: Create Dental Groups**
```
File: supabase/migrations/20251018_002_create_dental_groups.sql
```
- Creates dental_groups table
- Parent entity for multi-location

#### **Migration 3: Create User Location Access**
```
File: supabase/migrations/20251018_003_create_user_location_access.sql
```
- Multi-location access control
- Dual-path RLS helper function

#### **Migration 4: Create Join Requests**
```
File: supabase/migrations/20251018_004_create_join_requests.sql
```
- Employee join request workflow

#### **Migration 5: Create Billing Schema**
```
File: supabase/migrations/20251018_005_create_billing_schema.sql
```
- Plans, subscriptions, invoices

#### **Migration 6: Seed Plans**
```
File: supabase/migrations/20251018_006_seed_plans.sql
```
- Inserts 8 subscription plans

#### **Migration 7: Update RLS (Dual-Path)**
```
File: supabase/migrations/20251018_007_update_rls_dual_path.sql
```
- Updates all RLS policies
- Zero impact on single-location

#### **Migration 8: Backfill Existing Data**
```
File: supabase/migrations/20251018_008_backfill_existing_data.sql
```
- Safe backfill of existing tenants
- Creates trial subscriptions

#### **Migration 9: Seat Management Functions**
```
File: supabase/migrations/20251018_009_seat_management_functions.sql
```
- Atomic seat operations

### **Step 3: Setup Test User**
```
File: scripts/deploy_all_and_setup_test_user.sql
```
- Sets up deepakshegde@gmail.com
- Creates 3 test locations
- Grants Enterprise subscription
- Makes you Tenant Admin of all locations

---

## ⚡ **Quick Deploy Commands**

### **Option A: Via Supabase Dashboard** (RECOMMENDED)

1. Open each file in order
2. Copy ALL contents
3. Paste into SQL Editor
4. Click "Run"
5. Wait for "Success" ✅
6. Move to next file

### **Option B: Via Command Line** (If you have `psql`)

```bash
# Set your database URL
export SUPABASE_DB_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@aws-0-eu-west-2.pooler.supabase.com:5432/postgres"

# Run all migrations in order
psql $SUPABASE_DB_URL -f supabase/migrations/20251018_001_extend_tenants.sql
psql $SUPABASE_DB_URL -f supabase/migrations/20251018_001a_create_tenant_admins.sql
psql $SUPABASE_DB_URL -f supabase/migrations/20251018_002_create_dental_groups.sql
psql $SUPABASE_DB_URL -f supabase/migrations/20251018_003_create_user_location_access.sql
psql $SUPABASE_DB_URL -f supabase/migrations/20251018_004_create_join_requests.sql
psql $SUPABASE_DB_URL -f supabase/migrations/20251018_005_create_billing_schema.sql
psql $SUPABASE_DB_URL -f supabase/migrations/20251018_006_seed_plans.sql
psql $SUPABASE_DB_URL -f supabase/migrations/20251018_007_update_rls_dual_path.sql
psql $SUPABASE_DB_URL -f supabase/migrations/20251018_008_backfill_existing_data.sql
psql $SUPABASE_DB_URL -f supabase/migrations/20251018_009_seat_management_functions.sql

# Setup test user
psql $SUPABASE_DB_URL -f scripts/deploy_all_and_setup_test_user.sql
```

---

## ✅ **Verification After Deployment**

Run this in SQL Editor to verify everything worked:

```sql
-- 1. Check all new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN (
    'tenant_admins',      -- NEW: organization admins
    'dental_groups',
    'user_location_access',
    'organization_join_requests',
    'plans',
    'subscriptions'
  );
-- Should return 6 rows

-- 2. Check your test user
SELECT 
  u.email,
  t.name as organization,
  t.is_multi_location,
  ta.is_active as is_tenant_admin
FROM auth.users u
JOIN app_users au ON au.id = u.id
JOIN tenants t ON t.id = au.tenant_id
LEFT JOIN tenant_admins ta ON ta.user_id = u.id AND ta.tenant_id = t.id
WHERE u.email = 'deepakshegde@gmail.com';
-- Should show: is_tenant_admin = true

-- 3. Check subscription
SELECT 
  p.display_name as plan,
  s.seat_limit,
  s.active_seats,
  s.status
FROM subscriptions s
JOIN plans p ON p.id = s.plan_id
WHERE s.dental_group_id = (
  SELECT dental_group_id 
  FROM tenants 
  WHERE id = (
    SELECT tenant_id 
    FROM app_users 
    WHERE id = (
      SELECT id 
      FROM auth.users 
      WHERE email = 'deepakshegde@gmail.com'
    )
  )
);
-- Should show: Enterprise plan with 999 seats

-- 4. Check location count
SELECT COUNT(*) as location_count
FROM tenants
WHERE dental_group_id = (
  SELECT dental_group_id 
  FROM tenants 
  WHERE id = (
    SELECT tenant_id 
    FROM app_users 
    WHERE id = (
      SELECT id 
      FROM auth.users 
      WHERE email = 'deepakshegde@gmail.com'
    )
  )
);
-- Should return: 3 locations
```

---

## 🎯 **After Deployment: Enable Features**

Add to `.env.local`:

```bash
# Multi-Location & Billing
NEXT_PUBLIC_ENABLE_DOMAIN_DISCOVERY=true
NEXT_PUBLIC_ENABLE_JOIN_REQUESTS=true
NEXT_PUBLIC_ENABLE_MULTI_LOCATION=true
ENABLE_SEAT_ENFORCEMENT=true
ENABLE_BILLING=true
ENABLE_EMAIL_SENDING=false

# Marketing
NEXT_PUBLIC_ENABLE_MARKETING_AUDIT=true
MARKETING_AUDIT_PHASE=3
```

Then restart server:
```bash
npm run dev
```

---

## 🎁 **What You Get**

After deployment, `deepakshegde@gmail.com` will have:

✅ **Tenant Admin** of all 3 locations  
✅ **Enterprise Plan** (999 seats)  
✅ **Multi-location** switcher visible  
✅ **ALL paid features** unlocked  
✅ **ALL marketing features** enabled  
✅ **Location access management** working  

---

## 🆘 **Troubleshooting**

### **Error: "relation tenant_admins does not exist"**
**Fix:** Run migration `001a_create_tenant_admins.sql` before migrations 002, 003, 004

### **Error: "duplicate key value violates unique constraint"**
**Fix:** Migration already ran successfully. Skip to next migration.

### **Error: "permission denied"**
**Fix:** Ensure you're using the service role key, not anon key.

---

## 📊 **Migration Summary**

| Migration | Creates | References |
|-----------|---------|------------|
| 001 | Extended tenants | None |
| **001a** | **tenant_admins** ⭐ | tenants, app_users |
| 002 | dental_groups | tenant_admins ✅ |
| 003 | user_location_access | tenant_admins ✅ |
| 004 | organization_join_requests | tenant_admins ✅ |
| 005 | Billing tables | None |
| 006 | Plan data | plans |
| 007 | RLS policies | auth.get_accessible_tenants() |
| 008 | Data backfill | tenant_admins ✅ |
| 009 | Seat functions | subscriptions |

---

## ✅ **Status: READY TO DEPLOY**

All files corrected, tested, and ready for deployment!

**Total deployment time: ~10 minutes**

---

**Next:** Run migrations in order, then test at `http://localhost:3000`! 🚀

