# 🔧 IMMEDIATE FIXES - CRITICAL ERRORS

**Date:** January 20, 2025  
**Status:** 🚨 FIXING NOW

---

## 🚨 **ERRORS IDENTIFIED**

### **1. Missing `integration_connections` Table (404)**
**Error:** `Failed to load resource: the server responded with a status of 404`  
**Location:** `/api/integrations/gmail/oauth/initiate`  
**Root Cause:** Table doesn't exist in production  
**Fix:** Apply migration `2025011609_integration_hardening.sql`

### **2. Authentication Errors (401)**
**Error:** `/api/system/feature-flags:1 Failed to load resource: the server responded with a status of 401`  
**Root Cause:** `getApiRequestContext` not properly handling auth  
**Fix:** Ensure cookies/session are passed correctly

### **3. Query Syntax Errors (400)**
**Errors:**
- `deals?select=id%2Ctitle%2Cvalue_estimate_cents%2Cupdated_at%2Cstatus%2Cstage%3Apipeline_stages%28name%29` → 400
- `contact_psych_profiles?select=dominant_trait%2Cupdated_at%2Csnapshot` → 400
- `activities?select=id%2Cactivity_type%2Coccurred_at%2Cchannel%2Csummary%2Cdescription` → 400

**Root Cause:** 
- Nested select syntax `stage:pipeline_stages(name)` may be incorrect
- Tables may not exist
- Columns may not exist

**Fix:** 
- Verify table existence
- Fix query syntax
- Add error handling

---

## ✅ **FIXES TO APPLY**

### **Fix 1: Ensure `integration_connections` Table Exists**

Create migration to ensure table exists:

```sql
-- supabase/migrations/20250120_ensure_integration_connections.sql

-- Ensure integration_connections table exists
CREATE TABLE IF NOT EXISTS public.integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL,
  integration_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('connected', 'disconnected', 'error', 'expiring_soon', 'refreshing')),
  is_active BOOLEAN DEFAULT TRUE,
  credentials JSONB NOT NULL DEFAULT '{}',
  scopes TEXT[],
  token_expires_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, integration_type)
);

CREATE INDEX IF NOT EXISTS idx_integration_connections_tenant 
  ON public.integration_connections(tenant_id);
```

### **Fix 2: Fix Auth Context**

Update `getApiRequestContext` to handle cookies properly:

```typescript
// Ensure cookies are read correctly from request
// Add better error messages
```

### **Fix 3: Fix Query Syntax**

Add error handling and verify table existence before querying:

```typescript
// Wrap queries in try-catch
// Check table existence first
// Provide fallbacks
```

---

## 🎯 **PRIORITY ORDER**

1. **CRITICAL:** Fix `integration_connections` table (blocks OAuth)
2. **HIGH:** Fix auth errors (blocks feature flags)
3. **MEDIUM:** Fix query syntax errors (blocks data loading)

---

## 📝 **NEXT STEPS**

1. Apply migration for `integration_connections`
2. Test OAuth flow
3. Fix auth context
4. Fix query syntax
5. Test end-to-end

