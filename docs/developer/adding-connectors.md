# Adding New API Connectors

## Developer Guide

This guide shows you how to add a new API connector to the Marketing Audit system.

---

## Quick Example: Adding a New Connector

Let's say you want to add a **Bing Webmaster Tools** connector.

### Step 1: Create Connector Class

```typescript
// src/lib/marketing-audit/connectors/bing-connector.ts

import { BaseAPIConnector } from './base-connector';

export interface BingWebmasterData {
  indexed_pages: number;
  crawl_errors: number;
  backlinks: number;
}

export class BingConnector extends BaseAPIConnector {
  constructor(apiKey: string) {
    super(apiKey, 'https://ssl.bing.com/webmaster/api.svc');
    this.validateConfig();
  }
  
  /**
   * Get site summary
   */
  async getSiteSummary(siteUrl: string): Promise<BingWebmasterData> {
    return this.retryWithBackoff(async () => {
      const response = await this.makeRequest<any>(
        `${this.baseUrl}/GetUrlInfo?siteUrl=${siteUrl}&apikey=${this.apiKey}`
      );
      
      return {
        indexed_pages: response.IndexedPages || 0,
        crawl_errors: response.CrawlErrors || 0,
        backlinks: response.Backlinks || 0,
      };
    });
  }
}
```

### Step 2: Add to Connector Factory

```typescript
// src/lib/marketing-audit/connectors/factory.ts

import { BingConnector } from './bing-connector';

export class ConnectorFactory {
  // ...existing code...
  
  createBingConnector(apiKey?: string): BingConnector {
    return new BingConnector(apiKey || process.env.BING_WEBMASTER_API_KEY || '');
  }
  
  // Update phase connectors
  createPhase1Connectors(googleAccessToken?: string, bingApiKey?: string) {
    return {
      // ...existing connectors...
      bing: bingApiKey ? this.createBingConnector(bingApiKey) : null,
    };
  }
}
```

### Step 3: Update Orchestrator

```typescript
// src/lib/marketing-audit/orchestrator.ts

private async collectMetrics(practice: any): Promise<AllMetrics> {
  const connectors = this.connectorFactory.createPhase1Connectors(
    practice.google_access_token,
    practice.bing_api_key
  );
  
  // Add Bing data collection
  let bingData = null;
  if (connectors.bing) {
    try {
      bingData = await connectors.bing.getSiteSummary(practice.domain);
    } catch (error) {
      console.error('[Orchestrator] Bing fetch failed:', error);
    }
  }
  
  // Use Bing data in metrics transformation
  // ...
}
```

### Step 4: Update Rate Limiter

```typescript
// src/lib/marketing-audit/utils/rate-limiter.ts

private limits = {
  // ...existing limits...
  BingConnector: { requests: 10000, per: 'day' as const },
};
```

### Step 5: Add Environment Variable

```env
# .env.example
BING_WEBMASTER_API_KEY=your_bing_api_key_here
```

### Step 6: Write Tests

```typescript
// src/lib/marketing-audit/__tests__/bing-connector.test.ts

import { BingConnector } from '../connectors/bing-connector';

describe('BingConnector', () => {
  it('should fetch site summary', async () => {
    const connector = new BingConnector('test-key');
    // Mock and test...
  });
});
```

### Step 7: Update Documentation

Add to API setup guide, list Bing as optional connector.

---

## Connector Interface

All connectors must:

1. **Extend BaseAPIConnector**
```typescript
export class MyConnector extends BaseAPIConnector {
  constructor(apiKey: string) {
    super(apiKey, baseUrl);
    this.validateConfig();
  }
}
```

2. **Use retry logic for all API calls**
```typescript
async fetchData(): Promise<Data> {
  return this.retryWithBackoff(async () => {
    return await this.makeRequest<Data>(url);
  });
}
```

3. **Handle errors gracefully**
```typescript
try {
  const data = await this.fetchData();
  return data;
} catch (error) {
  this.logError(error);
  return defaultValue; // Graceful degradation
}
```

4. **Respect rate limits**
```typescript
// Rate limiter called automatically in makeRequest()
// Just add limits to rate-limiter.ts
```

---

## Best Practices

### 1. **Graceful Degradation**
If your API fails, audit should continue with partial data.

```typescript
let newApiData = null;
try {
  newApiData = await connector.fetchData();
} catch (error) {
  console.error('API failed, continuing without this data');
}
```

### 2. **Type Safety**
Define TypeScript interfaces for all API responses.

```typescript
export interface APIResponse {
  field1: string;
  field2: number;
  // ...
}
```

### 3. **Error Logging**
Log all errors with context for debugging.

```typescript
this.logError(error, {
  siteUrl,
  attemptNumber,
  timestamp: new Date().toISOString(),
});
```

### 4. **Cost Tracking**
Track API costs in audit metadata.

```typescript
api_costs_usd += 0.017; // $0.017 per Places API call
```

---

## Checklist for New Connector

- [ ] Create connector class extending BaseAPIConnector
- [ ] Add to ConnectorFactory
- [ ] Update Orchestrator to use connector
- [ ] Add rate limit to RateLimiter
- [ ] Add environment variable
- [ ] Write unit tests
- [ ] Document in admin guides
- [ ] Add to cost tracking

---

**Questions?** Contact the development team or see `architecture.md` for system overview.

