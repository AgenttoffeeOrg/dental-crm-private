# 🔧 FIX: SETUP SCRIPT - TENANTS INVALID COLUMNS

**Date:** Friday, October 17, 2025  
**Error:** `column "subscription_tier" of relation "tenants" does not exist`  
**Script:** `scripts/setup_super_test_user.sql`  
**Status:** ✅ **FIXED**

---

## 🔍 **ROOT CAUSE**

The script was trying to insert `subscription_status` and `subscription_tier` into the `tenants` table, but these columns don't exist. Subscriptions are now stored in a separate `subscriptions` table (created in migration 005).

**Invalid columns:**
- `subscription_status` ❌ (doesn't exist in tenants)
- `subscription_tier` ❌ (doesn't exist in tenants)

---

## ✅ **SOLUTION**

Removed the invalid columns from both location INSERT statements:

### **Before (❌ Error):**
```sql
INSERT INTO tenants (
  name,
  is_multi_location,
  dental_group_id,
  location_name,
  website_url,
  billing_email,
  subscription_status,  -- ❌ Doesn't exist
  subscription_tier,    -- ❌ Doesn't exist
  currency_code,
  locale,
  created_at,
  updated_at
)
```

### **After (✅ Fixed):**
```sql
INSERT INTO tenants (
  name,
  is_multi_location,
  dental_group_id,
  location_name,
  website_url,
  billing_email,
  currency_code,        -- ✅ Valid
  locale,               -- ✅ Valid
  created_at,
  updated_at
)
```

---

## ✅ **WHAT WAS FIXED**

| Location | Status |
|----------|--------|
| Location 2 (North Branch) | ✅ Fixed |
| Location 3 (West Branch) | ✅ Fixed |

**Note:** Subscription details are created separately in the subscriptions table (step 5 of the script).

---

## ✅ **SCRIPT IS NOW FIXED**

The setup script will now:
- ✅ Create locations with only valid tenant columns
- ✅ Create subscription separately in subscriptions table
- ✅ Complete successfully

---

## 🚀 **READY TO RE-RUN**

Script is fixed and ready to run!


