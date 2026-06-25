# Migration Fix: Permission Denied for Schema Auth

## Problem
When attempting to run migration `20251027_001_strict_rls_auth_function.sql`, encountered error:
```
ERROR: 42501: permission denied for schema auth
```

## Root Cause
The migration was attempting to create a function in the `auth` schema:
```sql
CREATE OR REPLACE FUNCTION auth.get_user_tenant_id() ...
```

However, only Supabase superuser has write access to the `auth` schema. Regular database users cannot create functions there.

## Solution
Changed the function to be created in the `public` schema instead:
```sql
CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id() ...
```

## Changes Made
1. **Function creation** (line 30):
   - Changed from: `auth.get_user_tenant_id()`
   - Changed to: `public.get_current_user_tenant_id()`

2. **All RLS policy references** (throughout file):
   - Updated all policies to use `public.get_current_user_tenant_id()`
   - Total replacements: Multiple occurrences across 7 tables

3. **Comments and documentation**:
   - Updated all references in comments to reflect new function name

## Why This Works
- The function is now in the `public` schema (which we have permission to create functions in)
- The function can still call `auth.uid()` (which already exists in the `auth` schema)
- RLS policies can reference functions in the `public` schema without issues
- Functionally identical to the original design

## Migration Status
✅ **READY TO RUN**

The migration file has been fixed and is now ready to execute without permission errors.

## Next Steps
Run the migration:
```bash
supabase db push
```

Or via SQL editor in Supabase dashboard.

---
**Fixed:** October 27, 2025  
**File:** `supabase/migrations/20251027_001_strict_rls_auth_function.sql`

