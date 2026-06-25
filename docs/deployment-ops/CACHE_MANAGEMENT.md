# Cache Management Guide

## Why Cache Issues Happen

Browser caching issues in web applications typically occur due to:

1. **Aggressive Browser Caching**: Browsers cache static assets and API responses to improve performance
2. **Missing Cache-Control Headers**: Without proper headers, browsers decide caching policies themselves
3. **Service Workers**: Can aggressively cache resources for offline support
4. **Development Mode Issues**: Hot Module Replacement (HMR) and build artifacts can get cached
5. **No Cache Invalidation**: Old data stays cached even when new content is available

## What We Fixed

### 1. Removed Unused Service Worker ✅
- **Issue**: A service worker file existed but wasn't registered, causing confusion
- **Fix**: Deleted `/public/service-worker.js`
- **Impact**: No more ghost service worker references

### 2. Environment-Aware Caching ✅
- **Issue**: Static assets cached aggressively even in development
- **Fix**: Updated `next.config.ts` with environment-specific caching:
  - **Development**: `no-cache, no-store, must-revalidate` - forces fresh data
  - **Production**: `public, max-age=31536000, immutable` - optimal performance
  
### 3. API Route Cache Headers ✅
- **Issue**: API responses had no cache control, browsers cached them unpredictably
- **Fix**: Added comprehensive cache headers to all API routes:
  ```typescript
  {
    source: '/api/:path*',
    headers: [
      { 
        key: 'Cache-Control', 
        value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
      },
      { key: 'Pragma', value: 'no-cache' },
      { key: 'Expires', value: '0' },
    ],
  }
  ```

### 4. Cache Management Utilities ✅
Created new tools for managing cache programmatically:
- `src/lib/cache-manager.ts` - Client-side cache control
- `src/lib/api-cache-headers.ts` - Server-side response headers
- `src/components/dev/cache-control-panel.tsx` - Visual cache control (dev only)

### 5. Development Cache Control Panel ✅
- **Visual Tool**: Floating button in bottom-right corner (dev mode only)
- **Features**:
  - View cache status and sizes
  - Clear all caches with one click
  - Clear localStorage/sessionStorage individually
  - Cache health recommendations
  - Auto-warning if cache not cleared in 24 hours

## How to Use

### In Development

#### Method 1: Cache Control Panel (Easiest)
1. Look for the orange database icon in the bottom-right corner
2. Click it to open the Cache Control Panel
3. Click "Clear All & Reload" to clear everything

#### Method 2: Browser Hard Reload
- **Mac**: `Cmd + Shift + R`
- **Windows/Linux**: `Ctrl + Shift + R`

#### Method 3: Programmatically
```typescript
import { CacheManager } from '@/lib/cache-manager'

// Clear all caches
await CacheManager.clearAllCaches()

// Clear specific storage
CacheManager.clearLocalStorage()
CacheManager.clearSessionStorage()

// Get cache status
const status = await CacheManager.getCacheStatus()
console.log(status)
```

### In Production

Production uses optimized caching:
- Static assets cached for 1 year (with hash-based cache busting)
- API routes never cached
- Pages revalidated on each visit
- Proper ETags for conditional requests

## Best Practices

### For API Routes

Use the cache headers utility for consistent behavior:

```typescript
// src/app/api/your-route/route.ts
import { createNoCacheResponse } from '@/lib/api-cache-headers'

export async function GET(request: Request) {
  const data = await fetchYourData()
  
  // Automatically adds no-cache headers
  return createNoCacheResponse(data)
}
```

Or use different cache strategies:

```typescript
import { createCachedResponse, CacheStrategy } from '@/lib/api-cache-headers'

export async function GET(request: Request) {
  const staticData = await fetchStaticData()
  
  // Cache for 5 minutes
  return createCachedResponse(staticData, 'MEDIUM')
}
```

### For Data Fetching

Always use proper revalidation in Server Components:

```typescript
// Revalidate every request (no cache)
export const revalidate = 0

// Or use tags for on-demand revalidation
export const tags = ['contacts']
```

### For Client Components

Use React Query or SWR with proper cache invalidation:

```typescript
import { useQuery } from '@tanstack/react-query'

const { data } = useQuery({
  queryKey: ['contacts'],
  queryFn: fetchContacts,
  staleTime: 0, // Consider data stale immediately
  refetchOnMount: true, // Refetch when component mounts
  refetchOnWindowFocus: true, // Refetch when window regains focus
})
```

## Cache Strategies Reference

| Strategy | Max Age | Use Case | Example |
|----------|---------|----------|---------|
| **NO_CACHE** | 0 | User data, real-time updates | Contact lists, deals |
| **SHORT** | 30s | Frequently changing data | Search results, aggregations |
| **MEDIUM** | 5min | Semi-static data | Dropdown options, settings |
| **LONG** | 1hr | Static configuration | App config, constants |
| **PUBLIC** | 1 day | Public static assets | Documentation, images |

## Troubleshooting

### Still seeing stale data?

1. **Check if service worker is registered**:
   ```javascript
   // Open browser console
   navigator.serviceWorker.getRegistrations().then(console.log)
   ```
   Should return empty array `[]`

2. **Clear browser cache manually**:
   - Chrome: DevTools → Network tab → Disable cache checkbox
   - Or: Settings → Privacy → Clear browsing data

3. **Check cache headers**:
   ```javascript
   // In browser console
   fetch('/api/your-endpoint')
     .then(r => console.log(r.headers.get('cache-control')))
   ```
   Should show: `no-store, no-cache, must-revalidate...`

4. **Use Cache Control Panel**:
   - Click the orange database icon (bottom-right)
   - View recommendations
   - Click "Clear All & Reload"

### Development mode cache issues?

1. Ensure you're running: `npm run dev`
2. Check `NODE_ENV`: should be `development`
3. Restart the dev server: `Ctrl+C` then `npm run dev`
4. Clear cache using the Cache Control Panel

### API responses being cached?

Check your API route:

```typescript
// ❌ Bad - no cache headers
export async function GET() {
  return NextResponse.json(data)
}

// ✅ Good - explicit no-cache headers
import { createNoCacheResponse } from '@/lib/api-cache-headers'

export async function GET() {
  return createNoCacheResponse(data)
}
```

## Files Changed

- `next.config.ts` - Added environment-aware caching headers
- `src/lib/cache-manager.ts` - Client-side cache management utility
- `src/lib/api-cache-headers.ts` - Server-side cache headers utility
- `src/components/dev/cache-control-panel.tsx` - Development cache control UI
- `src/app/layout.tsx` - Added Cache Control Panel component
- `public/service-worker.js` - Deleted (was unused)
- `public/manifest.json` - Updated to prevent service worker registration

## Prevention

Going forward, to prevent cache issues:

1. **Always use `createNoCacheResponse()` for dynamic API routes**
2. **Test in incognito/private mode** to verify cache behavior
3. **Use the Cache Control Panel** during development
4. **Monitor cache health** with the panel's recommendations
5. **Set proper `revalidate` values** on Server Components

## Quick Reference

```bash
# Clear cache and restart dev server
npm run dev

# In browser console:
# Clear all caches
await CacheManager.clearAllCaches()

# Get cache status
await CacheManager.getCacheStatus()

# Hard reload
# Mac: Cmd + Shift + R
# Windows: Ctrl + Shift + R
```

## Additional Resources

- [Next.js Caching Documentation](https://nextjs.org/docs/app/building-your-application/caching)
- [MDN Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
- [Web.dev Caching Best Practices](https://web.dev/http-cache/)

