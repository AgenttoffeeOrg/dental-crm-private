# Marketing Audit Module - Technical Architecture

## Developer Documentation

---

## System Overview

The Marketing Audit module is a sophisticated diagnostics and benchmarking system that analyzes a dental practice's online marketing presence and provides actionable recommendations.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐        │
│  │ Dashboard    │  │ Deep Dives   │  │ Competitors    │        │
│  │ Overview     │  │ (6 tabs)     │  │ Benchmark      │        │
│  └──────────────┘  └──────────────┘  └────────────────┘        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/JSON
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API ROUTES (Next.js)                          │
│  ┌───────────────────────────────────────────────────┐          │
│  │ POST /api/marketing-audit/run                     │          │
│  │ GET  /api/marketing-audit/latest                  │          │
│  │ GET  /api/marketing-audit/history                 │          │
│  │ POST /oauth/google/initiate                       │          │
│  └───────────────────────────────────────────────────┘          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AUDIT ORCHESTRATOR                            │
│  ┌────────────────────────────────────────┐                     │
│  │ 1. Collect Metrics (Parallel)          │                     │
│  │ 2. Calculate Scores (Sequential)       │                     │
│  │ 3. Generate Recommendations            │                     │
│  │ 4. Analyze Competitors                 │                     │
│  │ 5. Calculate Benchmarking              │                     │
│  │ 6. Check for Alerts                    │                     │
│  │ 7. Save to Database                    │                     │
│  └────────────────────────────────────────┘                     │
└─────────────────────────┬─────────┬──────────────────────────────┘
                          │         │
            ┌─────────────┘         └─────────────┐
            ▼                                     ▼
┌─────────────────────┐                 ┌──────────────────┐
│  CONNECTOR LAYER    │                 │  SCORING ENGINE  │
│  ┌────────────────┐ │                 │  ┌─────────────┐ │
│  │ PSI Connector  │ │                 │  │ Technical   │ │
│  │ GSC Connector  │ │                 │  │ Local       │ │
│  │ GA4 Connector  │ │                 │  │ Content     │ │
│  │ Places Conn.   │ │                 │  │ Analytics   │ │
│  │ Mobile Test    │ │                 │  │ Conversion  │ │
│  └────────────────┘ │                 │  │ Composite   │ │
│        ↓ Rate Limit │                 │  │ Percentile  │ │
│        ↓ Retry      │                 │  └─────────────┘ │
│        ↓ OAuth      │                 └──────────────────┘
└────────┬────────────┘
         │
         ▼
┌──────────────────────────┐           ┌──────────────────┐
│  EXTERNAL APIS           │           │  DATABASE        │
│  • PageSpeed Insights    │           │  • audit_runs    │
│  • Search Console        │           │  • metrics       │
│  • Google Analytics 4    │           │  • recommendations│
│  • Google Places         │           │  • competitors   │
│  • Mobile-Friendly Test  │           │  • alerts        │
│  • BrightLocal (Phase 2) │           │  • (+ 3 more)    │
│  • Semrush (Phase 3)     │           │  All with RLS    │
└──────────────────────────┘           └──────────────────┘
```

---

## Directory Structure

```
src/
├── app/
│   ├── marketing-audit/
│   │   ├── page.tsx                  # Main audit page
│   │   ├── loading.tsx               # Loading state
│   │   ├── error.tsx                 # Error boundary
│   │   └── [tab]/page.tsx            # Deep-dive tabs (future)
│   └── api/
│       └── marketing-audit/
│           ├── run/route.ts          # Trigger audit
│           ├── latest/route.ts       # Get latest audit
│           ├── history/route.ts      # Audit history
│           ├── [id]/route.ts         # Specific audit
│           ├── oauth/                # OAuth flow
│           ├── alerts/               # Alert management
│           └── competitors/          # Competitor data
│
├── components/
│   └── marketing-audit/
│       ├── dashboard/                # Dashboard components
│       │   ├── audit-dashboard.tsx
│       │   ├── composite-score-card.tsx
│       │   ├── sub-scores-grid.tsx
│       │   └── recommendations-panel.tsx
│       ├── technical-seo/            # Technical deep-dive
│       ├── local-presence/           # Local SEO deep-dive
│       ├── content-authority/        # Content deep-dive
│       ├── analytics-hygiene/        # Analytics deep-dive
│       ├── conversion-ux/            # Conversion deep-dive
│       ├── competitors/              # Competitor analysis
│       └── shared/                   # Shared components
│
└── lib/
    └── marketing-audit/
        ├── connectors/               # API connectors
        │   ├── base-connector.ts     # Abstract base
        │   ├── psi-connector.ts      # PageSpeed
        │   ├── gsc-connector.ts      # Search Console
        │   ├── ga4-connector.ts      # Analytics
        │   ├── places-connector.ts   # Places/Reviews
        │   └── factory.ts            # Factory pattern
        ├── scoring/                  # Scoring engines
        │   ├── base-scorer.ts        # Abstract base
        │   ├── technical-scorer.ts
        │   ├── local-scorer.ts
        │   ├── content-scorer.ts
        │   ├── analytics-scorer.ts
        │   ├── conversion-scorer.ts
        │   ├── composite-scorer.ts
        │   └── percentile-ranker.ts
        ├── utils/                    # Utilities
        │   ├── rate-limiter.ts       # API rate limiting
        │   ├── oauth-handler.ts      # OAuth 2.0 + PKCE
        │   └── errors.ts             # Custom errors
        ├── types/                    # TypeScript types
        │   └── index.ts
        └── orchestrator.ts           # Main coordinator
```

---

## Data Flow

### Audit Execution Flow:

```
1. User clicks "Run Audit"
   ↓
2. POST /api/marketing-audit/run
   ↓
3. Create audit_run record (status: 'pending')
   ↓
4. Return audit_id to client immediately
   ↓
5. Orchestrator.runAudit() (async, don't await)
   ↓
6. Collect metrics (parallel API calls):
   - PSI: runAudit() → Core Web Vitals, Lighthouse
   - GSC: getAnalytics(), getIndexCoverage()
   - GA4: getMetrics() → traffic, events, UTM
   - Places: getPlaceDetails() → reviews, rating
   - Places: nearbySearch() → competitors
   - Mobile: test() → mobile-friendly status
   ↓
7. Calculate scores (sequential):
   - technical = TechnicalScorer.calculateScore()
   - local = LocalScorer.calculateScore()
   - content = ContentScorer.calculateScore()
   - analytics = AnalyticsScorer.calculateScore()
   - conversion = ConversionScorer.calculateScore()
   - composite = CompositeScorer.calculateCompositeScore()
   ↓
8. Generate recommendations:
   - Each scorer generates recommendations
   - Calculate priority scores
   - Sort by priority, return top 20
   ↓
9. Analyze competitors:
   - Score each competitor (simplified)
   - Calculate percentile rank
   - Calculate gaps (median, top 3)
   ↓
10. Check for alerts:
    - Compare vs previous audit
    - Detect regressions (>5 point drops)
    - Create alert records
    ↓
11. Save everything to database:
    - Update audit_run with scores
    - Insert metrics (time-series)
    - Insert recommendations
    - Insert competitors
    - Insert alerts
    ↓
12. Update status to 'completed'
    ↓
13. Send notification (if enabled)
    ↓
14. Real-time subscription notifies frontend
    ↓
15. Dashboard updates automatically
```

**Total time:** 60-180 seconds depending on API response times

---

## Design Patterns

### 1. Factory Pattern (Connectors)
```typescript
const factory = new ConnectorFactory(apiKey);
const connectors = factory.createPhase1Connectors(oauthToken);
```

**Why:** Centralizes connector creation, manages credentials

### 2. Strategy Pattern (Scorers)
```typescript
class TechnicalScorer extends BaseScorer {
  calculateScore(metrics) { /* implementation */ }
}
```

**Why:** Each scoring algorithm is independent, easy to test and modify

### 3. Orchestrator Pattern (Workflow)
```typescript
class AuditOrchestrator {
  async runAudit() {
    // Coordinates entire workflow
  }
}
```

**Why:** Single source of truth for audit workflow, easier to maintain

### 4. Repository Pattern (Data Access)
All database access through Supabase client with RLS

**Why:** Security (RLS), consistency, easy to mock for testing

---

## Error Handling Strategy

### Retry Logic:
- Exponential backoff: 1s, 2s, 4s
- Max 3 retries
- Don't retry on client errors (4xx except 429)

### Graceful Degradation:
- If GSC fails → continue with partial data
- If GA4 fails → score based on available metrics
- If Places fails → skip competitor analysis

### Error Propagation:
```
Connector Error → Caught by Orchestrator → 
Logged → Audit marked as 'failed' → 
User notified with helpful message
```

---

## Performance Optimizations

### Parallel API Calls:
```typescript
const [psi, gsc, ga4, places] = await Promise.all([
  connectors.psi.runAudit(),
  connectors.gsc.getAnalytics(),
  connectors.ga4.getMetrics(),
  connectors.places.getPlaceDetails(),
]);
```

### Caching Strategy:
- Competitor data: 24 hours (doesn't change often)
- API responses: 1 hour (for retry scenarios)
- Scores: Never (always calculate fresh)

### Database Indexes:
- audit_runs: practice_id, status, completed_at
- metrics: run_id, metric_name, collected_at
- recommendations: run_id, priority_score

---

## Security Architecture

### Multi-Tenancy:
- Every table has `tenant_id`
- RLS policies enforce isolation
- No cross-tenant data leakage possible

### API Security:
- All routes check authentication
- RLS policies double-check authorization
- OAuth tokens encrypted (Supabase Vault in production)
- API keys never exposed to client

### PKCE Flow:
```
1. Generate code_verifier (random)
2. Hash to create code_challenge (SHA-256)
3. Send challenge to Google (not verifier)
4. Google returns code
5. Exchange code + verifier for tokens
6. Prevents MITM attacks
```

---

## Testing Strategy

### Unit Tests:
- Each scorer independently tested
- Each connector mocked and tested
- Edge cases covered

### Integration Tests:
- Orchestrator with mocked APIs
- OAuth flow end-to-end
- Database operations

### E2E Tests:
- Complete audit flow (with real APIs in staging)
- Dashboard interactions
- Task creation from recommendations

---

## Extending the System

### Adding a New Metric:

1. Add to appropriate MetricCategory in `types/index.ts`
2. Update connector to fetch the metric
3. Update scorer to include metric in calculation
4. Add recommendation template if threshold not met
5. Update UI to display metric

### Adding a New API Connector:

1. Create connector class extending `BaseAPIConnector`
2. Implement required methods
3. Add to `ConnectorFactory`
4. Update `Orchestrator.collectMetrics()`
5. Add corresponding metrics to database
6. Update UI to display new data

### Adding a New Scorer:

1. Create scorer class extending `BaseScorer`
2. Implement `calculateScore()` and `generateRecommendations()`
3. Add to `Orchestrator.calculateScores()`
4. Update `CompositeScorer` weights if needed
5. Create UI tab for deep-dive

---

## Database Schema

### Core Tables:
- `marketing_audit_runs` - Main audit records
- `audit_metrics` - Time-series metrics
- `audit_recommendations` - Action items
- `audit_competitors` - Competitor data
- `audit_peer_groups` - Benchmarking config
- `audit_schedules` - Automated audits
- `api_credentials` - OAuth tokens
- `audit_alerts` - Notifications

All tables have:
- RLS enabled
- Tenant isolation
- Proper indexes
- Foreign keys with cascading deletes

---

## API Quotas & Rate Limits

Enforced by `RateLimiter` class:

```typescript
{
  PSIConnector: { requests: 25000, per: 'day' },
  GSCConnector: { requests: 1200, per: 'minute' },
  GA4Connector: { requests: 25000, per: 'day' },
  PlacesConnector: { requests: 1000, per: 'day' },
}
```

**Implementation:** In-memory for MVP, Redis for production

---

## Feature Flags

### Environment Variables:
```env
NEXT_PUBLIC_ENABLE_MARKETING_AUDIT=true|false
MARKETING_AUDIT_PHASE=1|2|3
```

### Usage:
```typescript
const { marketingAudit } = useFeatureFlags();

if (marketingAudit.enabled && marketingAudit.phase >= 2) {
  // Show Phase 2 features
}
```

**Why:** Safe rollout, easy rollback, A/B testing

---

## Monitoring & Observability

### Logging:
- All API calls logged with timing
- Errors logged with stack traces
- Audit completion logged with metrics

### Metrics to Track:
- Audit success rate (target: >95%)
- Average audit duration (target: <180s)
- API error rates (target: <5%)
- User engagement (audits per practice per month)

### Alerts:
- API quota exceeded
- High error rate (>10%)
- Slow audits (>5 minutes)
- Database connection issues

---

## Deployment

### Environment Setup:
1. Set all environment variables
2. Run database migration
3. Enable feature flag
4. Test with one practice
5. Roll out to all users

### Rollback Plan:
1. Disable feature flag (instant)
2. Or revert database migration if needed
3. No data loss (tables remain)
4. Can re-enable anytime

---

## Performance Targets

- **Audit Duration:** <3 minutes (95th percentile)
- **Dashboard Load:** <2 seconds
- **API Response:** <500ms (95th percentile)
- **Database Queries:** <100ms each

---

## Code Quality Standards

- ✅ TypeScript strict mode
- ✅ ESLint + Prettier
- ✅ 80%+ test coverage
- ✅ All functions documented
- ✅ Error handling everywhere
- ✅ No console.log in production

---

**For more details, see:**
- `adding-connectors.md` - How to add new APIs
- `adding-scorers.md` - How to customize scoring
- `../api/endpoints.md` - API reference

---

*Version 1.0 - January 16, 2025*

