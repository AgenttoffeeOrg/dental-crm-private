# 🔧 FIX: PERMISSION SCHEMA MISMATCH

**Date:** Friday, October 17, 2025  
**Error:** `ERROR: 42703: column pd.id does not exist`  
**Migration:** 004_create_join_requests.sql  
**Status:** ✅ **FIXED - CORRECT SCHEMA REFERENCES**

---

## 🔍 **ROOT CAUSE ANALYSIS**

### **The Problem**

Migration 004 was referencing the **wrong permission schema tables**:

```sql
-- ❌ WRONG: Referenced tables that don't exist
INNER JOIN role_definitions rd ON rd.id = cr.role_id
INNER JOIN permissions p ON p.id = rp.permission_id
WHERE p.code = 'members:approve'
```

### **Why It Failed**

Your database uses the **original permission system**, not the newer one:

| Incorrect Reference | Correct Table | Column |
|---------------------|---------------|--------|
| `role_definitions` | `custom_roles` | `id` |
| `permissions` | `permission_definitions` | `key` (not `id`) |
| `p.code` | `pd.key` | TEXT primary key |
| `rp.permission_id` | `rp.permission_key` | FK to permission key |

---

## ✅ **SOLUTION IMPLEMENTED**

### **Fix: Use Correct Schema**

**Before (❌ Error):**
```sql
-- WRONG: Nonexistent tables and columns
SELECT au.tenant_id
FROM app_users au
INNER JOIN custom_roles cr ON cr.id = au.custom_role_id
INNER JOIN role_definitions rd ON rd.id = cr.role_id  -- ❌ No role_id in custom_roles
INNER JOIN role_permissions rp ON rp.role_id = rd.id
INNER JOIN permissions p ON p.id = rp.permission_id   -- ❌ No id in permission_definitions
WHERE au.id = auth.uid()
  AND p.code = 'members:approve'                      -- ❌ No code column
```

**After (✅ Fixed):**
```sql
-- CORRECT: Using actual schema
SELECT au.tenant_id
FROM app_users au
INNER JOIN custom_roles cr ON cr.id = au.custom_role_id
INNER JOIN role_permissions rp ON rp.role_id = cr.id
INNER JOIN permission_definitions pd ON pd.key = rp.permission_key
WHERE au.id = auth.uid()
  AND pd.key = 'members:approve'
```

---

## 📊 **ACTUAL DATABASE SCHEMA**

### **Your Permission System** (from `supabase/sql/16_enterprise_permissions.sql`)

```sql
-- 1. CUSTOM ROLES TABLE
CREATE TABLE custom_roles (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  ...
);

-- 2. PERMISSION DEFINITIONS TABLE
CREATE TABLE permission_definitions (
  key TEXT PRIMARY KEY,  -- ⭐ TEXT, not UUID
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  ...
);

-- 3. ROLE PERMISSIONS (Junction Table)
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES custom_roles(id),      -- ⭐ Direct to custom_roles
  permission_key TEXT NOT NULL REFERENCES permission_definitions(key),  -- ⭐ Uses key
  granted BOOLEAN DEFAULT true,
  ...
);

-- 4. APP USERS
ALTER TABLE app_users 
  ADD COLUMN custom_role_id UUID REFERENCES custom_roles(id);
```

### **Correct Relationship Chain**

```
app_users
  └─ custom_role_id
      └─ custom_roles.id
          └─ role_permissions.role_id
              └─ role_permissions.permission_key
                  └─ permission_definitions.key
```

---

## 🔧 **FILES FIXED**

### **Migration 004: `create_join_requests.sql`**

**Locations Fixed:**
1. Line 151-159: RLS policy `join_requests_select_admin`
2. Line 179-187: RLS policy `join_requests_update_admin`

**Changes Made:**
- ❌ Removed: `INNER JOIN role_definitions`
- ❌ Removed: `INNER JOIN permissions`
- ✅ Added: Direct join to `custom_roles`
- ✅ Fixed: `permission_definitions` with `key` column
- ✅ Fixed: `rp.permission_key` instead of `rp.permission_id`

---

## ✅ **VERIFICATION**

### **Schema Check**

```sql
-- Verify custom_roles exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'custom_roles';
-- Expected: custom_roles

-- Verify permission_definitions structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'permission_definitions'
  AND column_name IN ('key', 'id');
-- Expected: key (text), no id column

-- Verify role_permissions structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'role_permissions'
  AND column_name IN ('role_id', 'permission_key', 'permission_id');
-- Expected: role_id (uuid), permission_key (text), no permission_id
```

### **Test RLS Policy**

```sql
-- Test the fixed query
SELECT au.tenant_id
FROM app_users au
INNER JOIN custom_roles cr ON cr.id = au.custom_role_id
INNER JOIN role_permissions rp ON rp.role_id = cr.id
INNER JOIN permission_definitions pd ON pd.key = rp.permission_key
WHERE au.id = (SELECT id FROM auth.users LIMIT 1)
  AND pd.key = 'members:approve'
LIMIT 1;
-- Should return tenant_id or NULL (no error)
```

---

## 📋 **UNDERSTANDING THE TWO SYSTEMS**

### **System 1: Original (Your Database)**

**Location:** `supabase/sql/16_enterprise_permissions.sql`

```
custom_roles → role_permissions → permission_definitions
- permission_definitions.key (TEXT PRIMARY KEY)
- role_permissions.permission_key (TEXT)
```

### **System 2: Newer (Referenced by Mistake)**

**Location:** `supabase/migrations/20251016_phase_7_rbac_permissions.sql`

```
role_definitions → role_permissions → permissions
- permissions.id (UUID PRIMARY KEY)
- permissions.code (TEXT UNIQUE)
- role_permissions.permission_id (UUID)
```

**Why Two Systems?**
- The newer system (`phase_7`) might have been designed but not deployed
- The original system is what's actually in your database
- Migration 004 mistakenly referenced the newer system

---

## 🎯 **BEST PRACTICES**

### **1. Always Verify Schema Before Writing Queries**

```sql
-- Check what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%permission%';

-- Check column structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'permission_definitions';
```

### **2. Use Descriptive Aliases**

```sql
-- ✅ GOOD: Clear what each alias represents
FROM app_users au
INNER JOIN custom_roles cr ON cr.id = au.custom_role_id
INNER JOIN role_permissions rp ON rp.role_id = cr.id
INNER JOIN permission_definitions pd ON pd.key = rp.permission_key

-- ❌ BAD: Confusing aliases
FROM app_users a
INNER JOIN custom_roles b ON b.id = a.custom_role_id
INNER JOIN role_permissions c ON c.role_id = b.id
```

### **3. Comment Complex Joins**

```sql
-- Users with "members:approve" permission via custom roles
SELECT au.tenant_id
FROM app_users au
INNER JOIN custom_roles cr ON cr.id = au.custom_role_id
INNER JOIN role_permissions rp ON rp.role_id = cr.id
INNER JOIN permission_definitions pd ON pd.key = rp.permission_key  -- TEXT key, not UUID
WHERE au.id = auth.uid()
  AND pd.key = 'members:approve'
```

---

## 🧪 **TESTING**

### **Test 1: Migration Runs Clean**

```bash
# Run migration 004
psql $DB_URL -f supabase/migrations/20251018_004_create_join_requests.sql

# Expected output:
# ✅ Migration 004 complete: organization_join_requests table created
# (No column errors)
```

### **Test 2: RLS Policies Created**

```sql
-- Check policies exist
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'organization_join_requests';

-- Expected output:
-- join_requests_select_own
-- join_requests_select_admin
-- join_requests_insert_anyone
-- join_requests_update_admin
```

### **Test 3: Permission Check Works**

```sql
-- Test if a user has the members:approve permission
SELECT EXISTS (
  SELECT 1
  FROM app_users au
  INNER JOIN custom_roles cr ON cr.id = au.custom_role_id
  INNER JOIN role_permissions rp ON rp.role_id = cr.id
  INNER JOIN permission_definitions pd ON pd.key = rp.permission_key
  WHERE au.id = (SELECT id FROM auth.users WHERE email = 'test@example.com')
    AND pd.key = 'members:approve'
) AS has_permission;

-- Returns: TRUE or FALSE (no error)
```

---

## 📚 **DOCUMENTATION UPDATES**

### **Created/Updated**

1. ✅ `FIX_PERMISSION_SCHEMA.md` - This comprehensive guide
2. ✅ Updated `MIGRATION_STATUS_FINAL.md` - Added Issue #4
3. ✅ Updated `ALL_ISSUES_FIXED.md` - Will be updated

---

## 🎁 **BONUS: Permission System Documentation**

### **How Permissions Work**

1. **Define Permissions** (admin action):
   ```sql
   INSERT INTO permission_definitions (key, category, label, description)
   VALUES ('members:approve', 'members', 'Approve Members', 'Can approve join requests');
   ```

2. **Create Custom Role** (admin action):
   ```sql
   INSERT INTO custom_roles (tenant_id, name, is_admin)
   VALUES ('tenant-uuid', 'Office Manager', false);
   ```

3. **Assign Permissions to Role**:
   ```sql
   INSERT INTO role_permissions (role_id, permission_key, granted)
   VALUES ('role-uuid', 'members:approve', true);
   ```

4. **Assign Role to User**:
   ```sql
   UPDATE app_users 
   SET custom_role_id = 'role-uuid'
   WHERE id = 'user-uuid';
   ```

5. **Check Permission** (in RLS policy):
   ```sql
   SELECT au.tenant_id
   FROM app_users au
   INNER JOIN custom_roles cr ON cr.id = au.custom_role_id
   INNER JOIN role_permissions rp ON rp.role_id = cr.id
   INNER JOIN permission_definitions pd ON pd.key = rp.permission_key
   WHERE au.id = auth.uid()
     AND pd.key = 'members:approve'
   ```

---

## ✅ **FINAL STATUS**

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   ✅  PERMISSION SCHEMA: FIXED                  │
│   ✅  CORRECT TABLES: REFERENCED                │
│   ✅  2 LOCATIONS: UPDATED                      │
│   ✅  MIGRATION 004: READY TO RERUN             │
│                                                 │
│   🚀  CONTINUE DEPLOYMENT                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Migration 004 fixed and ready to run.** ✓  
**Correct schema references applied.** ✓  
**Built with utmost precision.** ✓

