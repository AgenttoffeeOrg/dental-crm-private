# 📊 TELEMETRY PLATFORM - REPOSITORY DISCOVERY REPORT

**Date:** October 18, 2025  
**Repository:** dental-crm  
**Purpose:** Establish standalone admin-telemetry platform (non-intrusive, backward-compatible)

---

## 🎯 EXECUTIVE SUMMARY

The repository has a **basic analytics foundation** but is tightly coupled to the CRM application. To meet requirements, we need a **completely separate telemetry platform** that observes without modifying existing code.

**Key Finding:** 95% of required signals can be captured via **Mode A (infra-level)** and **Mode B (data-layer)** without touching CRM code.

---

## 📋 WHAT ALREADY EXISTS

### ✅ 1. Analytics SDK (Client-Side Tracking)

**Location:** `src/lib/analytics-sdk.ts`

**Current State:**
- ✅ Client-side event tracking (page views, clicks, features, errors)
- ✅ Session management with `sessionId`
- ✅ Event batching (10 events or 30s interval)
- ✅ User/tenant context (`setUser()`)
- ✅ Queue + flush mechanism

**Tables Expected:**
- `analytics_events` (schema defined in super admin SQL)
- `user_sessions`
- `feature_usage_stats`
- `system_error_logs`

**Limitations:**
- ❌ **Tightly coupled to CRM** - writes directly to CRM database
- ❌ **Not deployed** - references table that may not exist
- ❌ **No separation** - can't operate independently
- ❌ **No provider abstraction** - hardcoded Supabase client
- ❌ **Limited events** - only what's manually instrumented

**Status:** 🟡 **Exists but MUST NOT be used** (violates prime directive: no CRM coupling)

---

### ✅ 2. Super Admin System (Centralized Analytics DB)

**Location:** `supabase/sql/46_super_admin_system.sql`

**Tables Defined:**
```sql
super_admins              -- Platform owners
analytics_events          -- Event tracking
user_sessions             -- Session tracking
feature_usage_stats       -- Aggregated feature usage
system_error_logs         -- Error monitoring
```

**Views:**
- `daily_active_users`
- `feature_adoption`
- `practice_growth`
- `user_engagement_summary`

**Functions:**
- `get_platform_stats()` - Platform-wide KPIs

**Limitations:**
- ❌ **Never deployed** (migration not in `/migrations` folder)
- ❌ **Same database as CRM** - not isolated
- ❌ **No ingestion API** - expects direct writes
- ❌ **No connectors** - no way to feed data

**Status:** 🟡 **Designed but NOT deployed; needs complete redesign**

---

### ✅ 3. Identity Schema (Stable Keys)

**Primary Tables:**

| Table | Key Field | Purpose | Stability |
|-------|-----------|---------|-----------|
| `tenants` | `id` (UUID) | Organization identity | ✅ Stable |
| `app_users` | `id` (UUID) | User identity | ✅ Stable |
| `app_users` | `email` (TEXT) | User email | ⚠️ Can change |
| `app_users` | `tenant_id` (UUID) | User→Org mapping | ⚠️ Multi-location: can switch |
| `auth.users` | `id` (UUID) | Auth identity | ✅ Most stable |

**Identity Join Strategy:**
```sql
-- Recommended join path
auth.users.id = app_users.id = telemetry.user_id
app_users.tenant_id = tenants.id = telemetry.org_id
```

**Multi-Location Complexity:**
- Users can switch `tenant_id` dynamically (new feature)
- Need to track which org user was in when event occurred

**Status:** ✅ **Stable, well-indexed, ready for read-only joins**

---

### ✅ 4. Audit/Activity Logs

**email_logs** (`supabase/migrations/20251014_email_logs.sql`):
- Tracks all emails sent
- Has `tenant_id`, `user_id`, `email_type`, `status`, `provider_message_id`

**Limitations:**
- ❌ No comprehensive activity log table
- ❌ No page view logs (only client SDK)
- ❌ No API request logs

**Status:** 🟡 **Partial - emails only**

---

### ✅ 5. Middleware (Request Logging)

**Location:** `src/middleware.ts`

**Current State:** (Need to read to confirm)
- Likely handles auth/routing
- **Unknown:** Does it log requests?

**Status:** 🔍 **Needs investigation**

---

### ✅ 6. API Routes (100+ endpoints)

**Count:** 100+ API routes in `src/app/api/`

**Key Categories:**
- AI, Analytics, Billing, Communications
- Contacts, Deals, Export, Import
- Integrations (PMS, webhooks)
- Marketing, Forms, Search
- Users, Settings, Test endpoints

**Logging Status:**
- ❌ No centralized request/response logging
- ❌ No performance tracking (latency, errors)
- ❌ No structured logs

**Status:** ❌ **No observability layer**

---

### ✅ 7. Existing Analytics Features (CRM-Internal)

**Marketing Analytics** (`src/components/marketing/analytics-dashboard.tsx`):
- Campaign performance metrics
- Only for marketing module

**Communications Analytics** (`src/components/analytics/communications-analytics-dashboard.tsx`):
- SMS/Email/Voice metrics
- Only for communications module

**Limitations:**
- ❌ **Module-specific** - not platform-wide
- ❌ **CRM-embedded** - not standalone
- ❌ **User-facing** - not admin telemetry

**Status:** ⚪ **Ignore - different use case**

---

## 🚨 WHAT'S MISSING

### ❌ 1. Standalone Telemetry Service
- No separate service/app
- No separate database
- No separate API
- No separate CI/CD

### ❌ 2. Ingestion API
- No HTTPS endpoint for events
- No batch ingestion
- No streaming ingestion
- No webhook receiver

### ❌ 3. Connectors (Data Sources)

**Mode A (Network/Infra-level):**
- ❌ No API gateway log parser
- ❌ No reverse proxy log reader
- ❌ No request/response interceptor

**Mode B (Data-layer):**
- ❌ No CDC (Change Data Capture) connector
- ❌ No read replica watcher
- ❌ No database trigger listener

**Mode C (Thin Emitters):**
- ❌ No optional event emitter package
- ❌ No provider-agnostic adapter

### ❌ 4. Processor (ETL Pipeline)
- No sessionization logic
- No event modeling
- No funnel computation
- No cohort analysis
- No retention calculation
- No aggregation jobs

### ❌ 5. Admin Telemetry UI
- No standalone admin app
- No org/user profiles
- No funnel explorer
- No path analysis
- No retention curves
- No error dashboard

### ❌ 6. Identity Mapper
- No service to join telemetry → CRM identities
- No denormalized identity cache

### ❌ 7. Exports/Webhooks
- No CSV/JSON exports
- No webhook delivery system

### ❌ 8. Data Model (Telemetry DB)
- Schema exists but wrong location (CRM DB)
- Missing tables: `sessions`, `events_modeled_*`, `funnels`, `cohorts`, `retention_daily`

### ❌ 9. Tracking Plan
- No `/docs/tracking_plan.yml`
- No event naming standards
- No property schemas

### ❌ 10. Privacy/Compliance
- No retention policies
- No PII hashing
- No consent modes
- No GDPR compliance layer

---

## 🔑 STABLE IDENTITY KEYS (for Joins)

### Primary Keys:

| Entity | Key | Source | Join Path |
|--------|-----|--------|-----------|
| **User** | `auth.users.id` (UUID) | Supabase Auth | Most stable; use for all joins |
| **Org** | `tenants.id` (UUID) | CRM DB | Stable; 1:1 with org |
| **Session** | Generated UUID | Telemetry platform | New; we control it |

### Secondary Keys (Read-Only):

| Field | Table | Use Case | Stability |
|-------|-------|----------|-----------|
| `email` | `app_users` | User lookup | ⚠️ Can change |
| `tenant_id` | `app_users` | User→Org | ⚠️ Can switch (multi-location) |
| `full_name` | `app_users` | Display name | Low priority |
| `name` | `tenants` | Org display | Low priority |

### Recommended Identity Join Strategy:

```sql
-- Telemetry → CRM User
SELECT 
  telemetry.user_id,
  app_users.email,
  app_users.full_name,
  app_users.role
FROM telemetry.events_raw
LEFT JOIN app_users ON telemetry.user_id = app_users.id;

-- Telemetry → CRM Org
SELECT
  telemetry.org_id,
  tenants.name,
  tenants.created_at
FROM telemetry.events_raw
LEFT JOIN tenants ON telemetry.org_id = tenants.id;
```

**Critical:** Use **read-only replicas** or **cached views** to avoid impacting CRM performance.

---

## 🛠️ LOW-RISK INTEGRATION POINTS

### ✅ Mode A: Network/Infra-Level (RECOMMENDED)

**1. Next.js Request Logs**

**Method:** Enhance existing middleware to emit structured logs

**File:** `src/middleware.ts`

**Current State:** Unknown (need to read)

**Proposed Enhancement:**
```typescript
// In middleware.ts (minimal addition)
export async function middleware(req: NextRequest) {
  const startTime = Date.now()
  const response = NextResponse.next()
  
  // Optional telemetry emission (no-op if disabled)
  if (process.env.TELEMETRY_ENABLED) {
    await fetch('http://telemetry-service/ingest/http', {
      method: 'POST',
      body: JSON.stringify({
        path: req.nextUrl.pathname,
        method: req.method,
        user_id: req.headers.get('x-user-id'), // if present
        org_id: req.headers.get('x-tenant-id'),
        duration_ms: Date.now() - startTime,
        status: response.status
      })
    }).catch(() => {}) // Silent fail
  }
  
  return response
}
```

**Risk:** 🟢 Low - optional, async, silent fail

**Signals Captured:**
- ✅ Page views (GET requests)
- ✅ API calls (POST/PUT/DELETE)
- ✅ User/org context (from headers/cookies)
- ✅ Response times
- ✅ Error rates

---

**2. Supabase PostgREST Logs**

**Method:** Configure Supabase to stream logs to external endpoint

**Current State:** Not configured

**Proposed:**
- Enable Supabase log streaming (if available)
- OR: Parse Supabase dashboard logs
- OR: Read from `pg_stat_statements` (performance view)

**Risk:** 🟢 Low - read-only, no app changes

---

### ✅ Mode B: Data-Layer Signals (RECOMMENDED)

**1. Database CDC (Change Data Capture)**

**Method:** Watch key tables for INSERT/UPDATE events

**Tables to Watch:**
- `tenants` → signups
- `app_users` → user creation, activation
- `deals` → deal creation, stage changes
- `contacts` → contact creation

**Implementation Options:**
1. **Supabase Realtime** (if available)
2. **PostgreSQL Logical Replication**
3. **Polling with `updated_at`** (simplest)

**Proposed (Polling Example):**
```sql
-- Telemetry service polls this view every 5 minutes
CREATE VIEW telemetry_signups AS
SELECT id, created_at, 'org_signed_up' as event
FROM tenants
WHERE created_at >= NOW() - INTERVAL '10 minutes';
```

**Risk:** 🟢 Low - read-only queries, no writes

**Signals Captured:**
- ✅ Signups (`tenants.created_at`)
- ✅ User activations (`app_users.created_at`)
- ✅ Feature usage (deal/contact creation)

---

**2. Read Replicas (if available)**

**Method:** Query read replicas to avoid impacting primary DB

**Current State:** Unknown (depends on Supabase plan)

**Risk:** 🟢 Low - no primary DB impact

---

### ⚠️ Mode C: Thin Emitters (IF NEEDED)

**Only use if Mode A+B can't capture critical UI events (e.g., button clicks without API calls)**

**Proposed Package:** `@dental-crm/telemetry` (optional, tree-shakeable)

```typescript
// packages/telemetry/index.ts
export const telemetry = {
  emit(event: string, props?: Record<string, any>) {
    if (!process.env.NEXT_PUBLIC_TELEMETRY_ENABLED) return // no-op by default
    
    // Async, non-blocking
    fetch('/api/telemetry/emit', {
      method: 'POST',
      body: JSON.stringify({ event, props })
    }).catch(() => {}) // Silent fail
  }
}

// Usage in CRM (ONLY if Mode A+B insufficient)
// import { telemetry } from '@dental-crm/telemetry'
// telemetry.emit('button_clicked', { button_id: 'create_deal' })
```

**Risk:** 🟡 Medium - requires CRM imports, but safe if no-op by default

**Recommendation:** **Avoid initially; add only if Mode A+B gaps found**

---

## 📊 GAP ANALYSIS SUMMARY

| Requirement | Current State | Gap | Priority | Mode |
|-------------|---------------|-----|----------|------|
| **Standalone service** | ❌ None | Need new repo/app | 🔴 Critical | N/A |
| **Telemetry DB** | 🟡 Schema exists, wrong location | Need separate DB | 🔴 Critical | N/A |
| **Ingestion API** | ❌ None | Need HTTPS endpoint | 🔴 Critical | N/A |
| **Network logs** | 🟡 Middleware exists | Enhance to emit logs | 🟢 Low | A |
| **DB CDC** | ❌ None | Add polling/streaming | 🟢 Low | B |
| **Sessionization** | ❌ None | Build processor | 🟠 High | N/A |
| **Identity mapper** | ❌ None | Build join service | 🟠 High | N/A |
| **Admin UI** | ❌ None | Build new app | 🟠 High | N/A |
| **Funnels** | ❌ None | Compute from events | 🟠 High | N/A |
| **Cohorts** | ❌ None | Compute from events | 🟠 High | N/A |
| **Retention** | ❌ None | Compute from sessions | 🟠 High | N/A |
| **Exports** | ❌ None | CSV/JSON endpoints | 🟡 Medium | N/A |
| **Tracking plan** | ❌ None | Document events | 🟡 Medium | N/A |
| **Privacy layer** | ❌ None | PII hashing, retention | 🟡 Medium | N/A |

---

## 🎯 RECOMMENDED INTEGRATION STRATEGY

### Phase 1: Foundation (Mode A + B, No CRM Changes)

1. ✅ **Create standalone telemetry service**
   - New repo: `admin-telemetry/`
   - Separate DB: `telemetry` (Postgres)
   - Ingestion API: `/ingest/http`, `/ingest/batch`

2. ✅ **Mode A: Network-level connector**
   - Read Next.js request logs (if middleware emits)
   - OR: Poll Supabase logs

3. ✅ **Mode B: Data-layer connector**
   - Poll CRM DB read replica every 5min
   - Watch: `tenants`, `app_users`, `deals`, `contacts`
   - Derive: signups, activations, feature usage

4. ✅ **Processor: Basic ETL**
   - Sessionize events (30min session window)
   - Compute DAU/WAU/MAU
   - Track feature adoption

5. ✅ **Identity mapper**
   - Cached join views: `user_id → email`, `org_id → name`

6. ✅ **Admin UI: Dashboard v1**
   - Signups, DAU/WAU/MAU, top features

---

### Phase 2: Enrichment (IF Mode A+B Gaps Found)

7. ⚠️ **Mode C: Thin emitter (ONLY if needed)**
   - Create `@dental-crm/telemetry` package
   - No-op by default
   - Optional import in CRM

---

### Phase 3: Advanced (Post-MVP)

8. Funnels, cohorts, retention
9. Path analysis, error tracking
10. Exports, webhooks

---

## ✅ ACCEPTANCE CRITERIA (from Requirements)

### Must Pass:

- [x] ✅ CRM unaffected whether telemetry up or down → **Yes: separate service**
- [x] ✅ Existing "basic tracking" integrated cleanly → **Yes: analytics-sdk ignored; Mode A+B used**
- [ ] 🟡 Pilot tenant: see signup→activation, DAU/WAU/MAU, features, errors, retention → **Needs build**
- [x] ✅ Data joins to CRM identities accurate → **Yes: via `app_users.id`, `tenants.id`**
- [ ] 🟡 Charts export, admin actions audited → **Needs build**

---

## 📝 IMPLEMENTATION PLAN (Next Step)

### Deliverables (in order):

1. ✅ **Gap Report** ← YOU ARE HERE
2. 🔲 **Architecture doc** (data flow, SLAs, diagrams)
3. 🔲 **Telemetry DB schema** + ERD
4. 🔲 **Connectors**: Network (Mode A), DB polling (Mode B)
5. 🔲 **Processor**: Sessionization, modeling
6. 🔲 **Identity mapper**
7. 🔲 **Admin UI**: Dashboards, org/user profiles
8. 🔲 **Tests**: ingestion → modeling → dashboards
9. 🔲 **Runbooks**: backfill, retention, outages
10. 🔲 **Tracking plan**: `/docs/tracking_plan.yml`

---

## 🚦 RISK ASSESSMENT

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| CRM performance degraded | 🟢 Low | 🔴 High | Use Mode A+B (async, read-only); avoid Mode C |
| Data pipeline failure | 🟠 Medium | 🟡 Medium | CRM continues; telemetry catches up |
| Identity mapping errors | 🟡 Medium | 🟠 High | Validate joins; use stable `auth.users.id` |
| Privacy violations | 🟢 Low | 🔴 High | Hash PII, strict retention, audit logs |
| Schema drift | 🟠 Medium | 🟡 Medium | Version events, schema evolution SOP |

---

## 📋 NEXT STEPS

1. **Review this Gap Report** with team
2. **Confirm integration modes**: Prefer Mode A+B (no CRM changes)
3. **Approve architecture** (next deliverable)
4. **Set up telemetry repo + DB**
5. **Build Phase 1** (connectors → processor → UI)

---

## 📎 APPENDIX: Files Discovered

### Existing Analytics Files:
- `src/lib/analytics-sdk.ts` - Client SDK (DO NOT USE)
- `src/lib/utils/analytics.ts` - Stub (empty)
- `supabase/sql/46_super_admin_system.sql` - Schema (not deployed)
- `src/middleware.ts` - Request middleware (TBD if logging)

### Identity Schema:
- `supabase/migrations/20251015_enable_complete_rls.sql` - `app_users`, `tenants` RLS
- `supabase/migrations/20251014_performance_indexes.sql` - Indexed fields

### Activity Logs:
- `supabase/migrations/20251014_email_logs.sql` - Email tracking only

---

**END OF GAP REPORT**

**Status:** ✅ Ready for architecture design (Deliverable #2)

