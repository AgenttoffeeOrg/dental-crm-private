# Migration Explanation

## What Migration Means

There are **TWO different types of migrations**:

### 1. **Database Migration** (What You Already Did ✅)

**File:** `20250120_ensure_integration_connections.sql`

**What It Does:**
- Creates the `integration_connections` table
- Sets up indexes and RLS policies
- Creates the database structure needed for integrations

**Status:** ✅ **You've already done this!**

---

### 2. **Data Migration** (Only Needed If You Have Existing Connections)

**File:** `src/lib/integrations/migration-helper.ts`

**What It Does:**
- Converts OLD individual service connections → NEW unified provider connections
- Only needed if you had integrations connected BEFORE we built the unified OAuth system

**Example Scenario:**

**BEFORE (Old System):**
- User connected Gmail separately → 1 connection row
- User connected Analytics separately → 1 connection row  
- User connected Ads separately → 1 connection row
- **Total: 3 separate connections**

**AFTER (New Unified System):**
- User connects Google once → All 3 services activated automatically
- **Total: 1 provider connection, 3 service rows**

**The Migration Helper:**
- Finds all Google connections (Gmail, Analytics, Ads)
- Groups them by provider
- Finds the connection with the most scopes
- Creates connections for all other services in that provider group
- Shares scopes across all services

---

## Do You Need Data Migration?

### **NO - If:**
- ✅ You just created the `integration_connections` table
- ✅ You don't have any existing integrations connected yet
- ✅ This is a fresh start

**Action:** Skip the data migration. Just start using the new unified OAuth system!

### **YES - If:**
- ❌ You had integrations connected before today
- ❌ You have existing rows in `integration_connections` table
- ❌ You want to convert old individual connections to unified provider connections

**Action:** Call `/api/integrations/migrate` endpoint

---

## How to Check If You Need Migration

Run this query in your database:

```sql
SELECT COUNT(*) as connection_count
FROM integration_connections
WHERE tenant_id = 'your-tenant-id';
```

**If count = 0:** No migration needed ✅  
**If count > 0:** You might want to migrate (optional)

---

## Summary

- ✅ **Database Migration:** You've already done this (created the table)
- ⏭️ **Data Migration:** Only needed if you have existing connections to convert
- 🎯 **For New Users:** Just start using the unified OAuth - no migration needed!

The unified OAuth system works perfectly for new connections. Migration is only for converting old individual connections to the new unified system.

