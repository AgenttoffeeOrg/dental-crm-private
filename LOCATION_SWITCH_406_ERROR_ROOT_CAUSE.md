# CRITICAL FIX REQUIRED - 406 Errors After Location Switch

## **ROOT CAUSE IDENTIFIED** ⚠️

When users switch locations:
1. ✅ `/api/locations/switch` updates `app_users.tenant_id` in database
2. ✅ Page reloads via `window.location.reload()`
3. ❌ **BUT**: `useAuth()` hook's `appUser` state still has OLD tenant_id
4. ❌ All queries use `appUser?.tenant_id` which points to old location
5. ❌ Supabase RLS rejects queries (406 error) because user no longer has access to old tenant

---

## **AFFECTED COMPONENTS**

### All components using `appUser?.tenant_id`:
- ✅ `DealsTable` (line 211)
- ✅ `Pipeline components`
- ✅ `Contacts components`
- ✅ `Tasks components`  
- ✅ `All data fetching`

---

## **WHY `window.location.reload()` DOESN'T WORK**

The `LocationSwitcher` component does:
```typescript
router.refresh()
window.location.reload()
```

**Problem**: The reload happens, but `useAuth()` hook doesn't re-fetch `appUser` data immediately. There's a race condition where:
1. Page reloads
2. Components mount
3. Start fetching with OLD `appUser.tenant_id`
4. Supabase rejects (406)
5. THEN auth refreshes (too late)

---

## **THE SOLUTION**

### Option 1: Force Auth Refresh Before Reload (RECOMMENDED)
Update `LocationSwitcher` to refresh auth state:

```typescript
const switchLocation = async (locationId: string) => {
  // ... switch API call ...
  
  // Force auth to refetch user data
  await router.refresh()
  
  // Small delay to let server update propagate
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Then reload
  window.location.href = window.location.href
}
```

### Option 2: Update useAuth to Refresh on Mount
Make `useAuth` refetch `appUser` on every mount:

```typescript
useEffect(() => {
  refreshUser() // Always refetch on mount
}, [])
```

### Option 3: Use Server-Side tenant_id (BEST LONG-TERM)
Instead of using client-side `appUser.tenant_id`, fetch from server:

```typescript
// In each component
const { orgId } = useTenantContext() // Fetches from server
```

---

## **RECOMMENDED FIX (IMMEDIATE)**

1. Update `LocationSwitcher` to ensure auth refresh
2. Add loading state during switch
3. Show spinner while refreshing
4. Prevent user interaction during switch

---

## **FILES TO FIX**

1. `src/components/multi-location/location-switcher.tsx` - Add auth refresh
2. `src/lib/auth.tsx` - Ensure refreshUser is called after page load
3. All data-fetching components - Consider using `useTenantContext()` instead of `appUser.tenant_id`

---

**STATUS**: Ready to implement fix

