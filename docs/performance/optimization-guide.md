# Performance Optimization Guide

## Target Metrics

✅ **Lighthouse Score:** 90+ on all pages  
✅ **Bundle Size:** <180KB  
✅ **Time to Interactive (TTI):** <2s  
✅ **First Contentful Paint (FCP):** <1s  
✅ **API Response Time (p95):** <1s  
✅ **Audit Completion:** 2-3 minutes  

---

## 1. Bundle Size Optimization

### Current Status
**Main Bundle:** ~150KB  
**Marketing Audit Module:** ~80KB  
**Total:** ~230KB  

### Target
**Total:** <180KB

### Steps to Optimize

**1. Install Bundle Analyzer:**
```bash
npm install @next/bundle-analyzer --save-dev
```

**2. Analyze Current Bundle:**
```bash
ANALYZE=true npm run build
```

**3. Code Splitting:**
```typescript
// Before
import { HeavyComponent } from './heavy-component';

// After
const HeavyComponent = dynamic(() => import('./heavy-component'), {
  loading: () => <LoadingSkeleton />,
  ssr: false,
});
```

**4. Tree Shaking:**
```typescript
// Bad - imports entire library
import _ from 'lodash';

// Good - imports only what you need
import debounce from 'lodash/debounce';
```

**5. Optimize lucide-react:**
```typescript
// Bad
import * as Icons from 'lucide-react';

// Good
import { Search, User, Settings } from 'lucide-react';
```

---

## 2. Image Optimization

### WebP Conversion

All images should be WebP format for 25-35% size reduction.

**Automated:**
```bash
# Install sharp
npm install sharp

# Convert script
node scripts/convert-to-webp.js
```

**In Next.js:**
```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  quality={85}
  priority // For above-the-fold images
/>
```

---

## 3. Font Optimization

### Subsetting

Load only the characters you need:

```typescript
// next.config.ts
module.exports = {
  optimizeFonts: true,
};
```

### Font Display

```css
@font-face {
  font-family: 'Your Font';
  src: url('/fonts/font.woff2') format('woff2');
  font-display: swap; /* Prevents invisible text */
  unicode-range: U+0020-007F; /* Basic Latin only */
}
```

---

## 4. API Performance

### Caching Strategy

```typescript
// Cache API responses for 1 hour
const cachedData = await cacheManager.getOrCompute(
  CacheKeys.psiData(url, 'mobile'),
  async () => await psiConnector.runPageSpeedTest(url),
  3600000 // 1 hour
);
```

### Parallel Requests

```typescript
// Bad - Sequential (slow)
const psi = await connector.getPSI();
const gsc = await connector.getGSC();
const ga4 = await connector.getGA4();

// Good - Parallel (fast)
const [psi, gsc, ga4] = await Promise.all([
  connector.getPSI(),
  connector.getGSC(),
  connector.getGA4(),
]);
```

### Request Deduplication

```typescript
// Prevent duplicate in-flight requests
const requestCache = new Map();

async function fetchWithDedup(key, fetcher) {
  if (requestCache.has(key)) {
    return requestCache.get(key);
  }
  
  const promise = fetcher();
  requestCache.set(key, promise);
  
  try {
    const result = await promise;
    return result;
  } finally {
    requestCache.delete(key);
  }
}
```

---

## 5. Database Optimization

### Query Performance

**Add Missing Indexes:**
```sql
CREATE INDEX idx_audit_runs_practice_completed 
ON marketing_audit_runs(practice_id, completed_at DESC);

CREATE INDEX idx_recommendations_priority 
ON marketing_audit_recommendations(audit_run_id, priority_score DESC);
```

**Use EXPLAIN ANALYZE:**
```sql
EXPLAIN ANALYZE
SELECT * FROM marketing_audit_runs 
WHERE practice_id = 'xxx' 
ORDER BY completed_at DESC 
LIMIT 1;

-- Look for "Seq Scan" - should be "Index Scan"
```

**Connection Pooling:**
```typescript
// Supabase auto-handles, but for custom connections:
const pool = new Pool({
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000,
});
```

---

## 6. React Performance

### Memoization

```typescript
// Expensive calculations
const sortedData = useMemo(() => {
  return data.sort((a, b) => b.score - a.score);
}, [data]);

// Callback functions
const handleClick = useCallback(() => {
  doSomething(value);
}, [value]);

// Components
const MemoizedComponent = memo(ExpensiveComponent);
```

### Virtual Scrolling

For large lists (100+ items):

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={recommendations.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <RecommendationCard recommendation={recommendations[index]} />
    </div>
  )}
</FixedSizeList>
```

---

## 7. Network Optimization

### HTTP/2

Ensure HTTP/2 is enabled (automatic with Vercel/Railway).

### Compression

```typescript
// next.config.ts
module.exports = {
  compress: true, // Enables gzip compression
};
```

### Prefetching

```typescript
// Prefetch critical data
import { useEffect } from 'react';

useEffect(() => {
  // Prefetch likely next page
  router.prefetch('/marketing-audit/competitors');
}, []);
```

---

## 8. Monitoring Performance

### Real User Monitoring (RUM)

```typescript
// Track Core Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

### Custom Metrics

```typescript
performance.mark('audit-start');
// ... run audit ...
performance.mark('audit-end');
performance.measure('audit-duration', 'audit-start', 'audit-end');

const measure = performance.getEntriesByName('audit-duration')[0];
console.log(`Audit took ${measure.duration}ms`);
```

---

## 9. Caching Strategy

### Levels of Caching

**1. Browser Cache (Static Assets)**
```typescript
// next.config.ts
module.exports = {
  images: {
    minimumCacheTTL: 2592000, // 30 days
  },
};
```

**2. CDN Cache (API Responses)**
```typescript
// Vercel Edge Caching
export const revalidate = 3600; // 1 hour
```

**3. Application Cache (In-Memory)**
```typescript
// Use CacheManager
const data = await cacheManager.getOrCompute(key, fetcher, ttl);
```

**4. Database Cache (Redis)**
```typescript
// For expensive queries
const result = await redis.get(key);
if (!result) {
  result = await expensiveQuery();
  await redis.set(key, JSON.stringify(result), 'EX', 3600);
}
```

---

## 10. Lighthouse Optimization

### Run Lighthouse

```bash
# Install
npm install -g @lhci/cli

# Run
lhci autorun

# Or manual
npx lighthouse https://yourdomain.com/marketing-audit --view
```

### Fix Common Issues

**Performance:**
- Eliminate render-blocking resources
- Minimize main-thread work
- Reduce JavaScript execution time
- Properly size images
- Enable text compression

**Accessibility:**
- Color contrast ratios (4.5:1 minimum)
- ARIA labels on interactive elements
- Form labels associated
- Focus indicators visible

**Best Practices:**
- HTTPS everywhere
- No console errors
- Permissions policy set
- Images have aspect ratios

**SEO:**
- Meta descriptions present
- Title tags unique
- Crawlable links
- Valid structured data

---

## Performance Checklist

**Before Deployment:**
- [ ] Run bundle analyzer
- [ ] Optimize images to WebP
- [ ] Enable compression
- [ ] Add database indexes
- [ ] Implement caching
- [ ] Code split heavy components
- [ ] Lazy load routes
- [ ] Run Lighthouse audit
- [ ] Fix all performance issues
- [ ] Test on slow 3G network

**After Deployment:**
- [ ] Monitor Core Web Vitals
- [ ] Track API response times
- [ ] Watch database query times
- [ ] Monitor bundle size in CI
- [ ] Track Lighthouse scores
- [ ] Review user-reported slowness

---

**Target: All pages 90+ Lighthouse score!** 🎯

