# 🏗️ ADMIN-TELEMETRY PLATFORM - ARCHITECTURE

**Version:** 1.0  
**Date:** October 18, 2025  
**Status:** Design Approved → Ready for Implementation

---

## 🎯 ARCHITECTURE PRINCIPLES

### Prime Directive Compliance:
1. ✅ **Standalone service** - Own repo, DB, deployment
2. ✅ **Zero CRM coupling** - CRM runs unaffected if telemetry is down
3. ✅ **Non-intrusive** - Prefer passive observation (Mode A/B)
4. ✅ **Backward compatible** - No breaking changes to CRM
5. ✅ **Read-only posture** - Never write to CRM database

---

## 📐 HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    DENTAL-CRM (Existing)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Next.js App │  │  Supabase DB │  │  Middleware  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          │ (Mode A)         │ (Mode B)         │ (Mode C - Optional)
          │ HTTP Logs        │ Read-Only        │ Optional Emit
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              ADMIN-TELEMETRY PLATFORM (New)                 │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │                 INGESTION LAYER                    │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │    │
│  │  │ HTTP Ingest  │  │  DB Poller   │  │ Webhook │ │    │
│  │  │   API        │  │  (CDC Sim)   │  │Receiver │ │    │
│  │  └──────┬───────┘  └──────┬───────┘  └────┬────┘ │    │
│  └─────────┼──────────────────┼───────────────┼──────┘    │
│            │                  │               │            │
│            ▼                  ▼               ▼            │
│  ┌────────────────────────────────────────────────────┐    │
│  │              MESSAGE QUEUE (Redis)                 │    │
│  │         events_raw │ db_changes │ http_logs        │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                   │
│                         ▼                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │                PROCESSOR LAYER                     │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │    │
│  │  │Sessionizer  │  │  Modeler     │  │Aggregator│ │    │
│  │  │(Group events)│  │ (Normalize)  │  │(Daily)   │ │    │
│  │  └──────┬───────┘  └──────┬───────┘  └────┬────┘ │    │
│  └─────────┼──────────────────┼───────────────┼──────┘    │
│            │                  │               │            │
│            ▼                  ▼               ▼            │
│  ┌────────────────────────────────────────────────────┐    │
│  │            TELEMETRY DATABASE (Postgres)           │    │
│  │  events_raw → events_modeled → aggregates         │    │
│  │  sessions → funnels → cohorts → retention         │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                   │
│                         ▼                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │              IDENTITY MAPPER SERVICE               │    │
│  │      (Read-Only Joins to CRM: app_users, tenants) │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                   │
│                         ▼                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │                  ADMIN UI (Next.js)                │    │
│  │  Dashboards │ Org Profiles │ Funnels │ Exports    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🧩 COMPONENT ARCHITECTURE

### 1. **INGESTION LAYER**

#### 1.1 HTTP Ingest API

**Tech Stack:**
- **Runtime:** Node.js (Express) or Bun
- **Port:** 3001
- **Protocol:** HTTPS + Batch endpoint

**Endpoints:**

```typescript
POST /ingest/http
{
  "batch": [
    {
      "event_id": "uuid",
      "timestamp": "ISO8601",
      "source": "middleware",
      "user_id": "uuid?",
      "org_id": "uuid?",
      "session_id": "uuid?",
      "event_type": "http_request",
      "event_name": "api_call",
      "properties": {
        "method": "POST",
        "path": "/api/contacts",
        "status": 200,
        "duration_ms": 45,
        "user_agent": "Mozilla/5.0..."
      }
    }
  ]
}
```

**Features:**
- ✅ Batch ingestion (up to 100 events)
- ✅ Async processing (immediate 202 Accepted)
- ✅ Schema validation (Zod)
- ✅ Idempotency (event_id deduplication)
- ✅ Rate limiting (1000 req/min per source)

**SLA:**
- **Latency:** p95 < 50ms
- **Throughput:** 10,000 events/sec
- **Availability:** 99.9%

---

#### 1.2 DB Poller (CDC Simulator)

**Tech Stack:**
- **Runtime:** Node.js worker
- **Schedule:** Every 5 minutes (cron)
- **Method:** Poll CRM read replica

**Queries:**

```sql
-- Signups (last 10 minutes)
SELECT id, created_at, name, 'org_signed_up' as event_type
FROM tenants
WHERE created_at >= NOW() - INTERVAL '10 minutes';

-- User Activations
SELECT id, tenant_id, created_at, 'user_activated' as event_type
FROM app_users
WHERE created_at >= NOW() - INTERVAL '10 minutes';

-- Feature Usage (Deal Creation)
SELECT id, tenant_id, owner_id, created_at, 'deal_created' as event_type
FROM deals
WHERE created_at >= NOW() - INTERVAL '10 minutes';
```

**Features:**
- ✅ Watermark tracking (last processed timestamp)
- ✅ Resumable (survives restarts)
- ✅ Read-only queries
- ✅ Connection pooling (max 2 connections)

**SLA:**
- **Latency:** 5-minute delay max
- **Accuracy:** 100% (no missed records)

---

#### 1.3 Webhook Receiver (Optional)

**For:** CRM to optionally push events (if Mode C enabled)

**Endpoint:**
```
POST /ingest/webhook
Authorization: Bearer <secret>
```

---

### 2. **MESSAGE QUEUE**

**Tech Stack:**
- **Provider:** Redis Streams
- **Alternative:** RabbitMQ, Kafka (if scale > 1M events/day)

**Streams:**
- `events_raw` - Raw events from all sources
- `db_changes` - DB polling results
- `http_logs` - Network-level logs

**Features:**
- ✅ Persistence (AOF enabled)
- ✅ Consumer groups (multiple workers)
- ✅ Dead letter queue (failed processing)

---

### 3. **PROCESSOR LAYER**

#### 3.1 Sessionizer

**Purpose:** Group events into sessions

**Logic:**
```typescript
// Session = events within 30min of each other
const SESSION_TIMEOUT_MS = 30 * 60 * 1000

function sessionize(events: Event[]): Session[] {
  // Sort by timestamp
  // If gap > 30min, start new session
  // Assign session_id to all events in session
}
```

**Output:**
- Updates `events_raw.session_id`
- Creates `sessions` table entries

---

#### 3.2 Modeler

**Purpose:** Normalize raw events into structured models

**Transformations:**

```sql
-- events_raw → events_modeled_pageviews
INSERT INTO events_modeled_pageviews
SELECT 
  id,
  user_id,
  org_id,
  session_id,
  (properties->>'path')::TEXT as page_path,
  (properties->>'referrer')::TEXT as referrer,
  occurred_at
FROM events_raw
WHERE event_type = 'http_request' AND (properties->>'method') = 'GET';

-- events_raw → events_modeled_feature_usage
INSERT INTO events_modeled_feature_usage
SELECT
  id,
  user_id,
  org_id,
  event_name as feature_key,
  (properties->>'action')::TEXT as action,
  occurred_at
FROM events_raw
WHERE event_type = 'feature_used';
```

---

#### 3.3 Aggregator

**Purpose:** Pre-compute daily metrics

**Schedule:** Runs daily at 2 AM UTC

**Computations:**

```sql
-- Daily Active Users
INSERT INTO dau_by_org (org_id, date, active_users)
SELECT 
  org_id,
  DATE(occurred_at) as date,
  COUNT(DISTINCT user_id) as active_users
FROM events_modeled_pageviews
WHERE DATE(occurred_at) = CURRENT_DATE - 1
GROUP BY org_id, DATE(occurred_at);

-- Feature Adoption
INSERT INTO feature_adoption_daily (feature_key, date, unique_users, total_uses)
SELECT
  feature_key,
  DATE(occurred_at),
  COUNT(DISTINCT user_id),
  COUNT(*)
FROM events_modeled_feature_usage
WHERE DATE(occurred_at) = CURRENT_DATE - 1
GROUP BY feature_key, DATE(occurred_at);
```

---

### 4. **TELEMETRY DATABASE**

**Tech Stack:**
- **Provider:** PostgreSQL 15+
- **Size:** Separate instance (not CRM DB)
- **Backups:** Daily snapshots, 30-day retention

**Schema:** (See Deliverable #3 for full ERD)

```sql
-- Core Tables
events_raw             -- All ingested events
sessions               -- User sessions
orgs                   -- Shadow copy of tenants (cached)
users                  -- Shadow copy of app_users (cached)

-- Modeled Tables
events_modeled_pageviews
events_modeled_feature_usage
events_modeled_api_calls
events_modeled_errors

-- Aggregates
dau_by_org             -- Daily active users
wau_by_org             -- Weekly active users
mau_by_org             -- Monthly active users
feature_adoption_daily

-- Analytics
funnels                -- Funnel definitions
funnel_results         -- Computed funnel conversions
cohorts                -- Cohort definitions
cohort_membership      -- User→Cohort mapping
retention_daily        -- N-day retention curves

-- Monitoring
latency_p95_by_route   -- API performance
errors_by_class        -- Error tracking
```

**Indexes:** (Critical for query performance)

```sql
CREATE INDEX idx_events_raw_occurred_at ON events_raw(occurred_at DESC);
CREATE INDEX idx_events_raw_user_id ON events_raw(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_events_raw_org_id ON events_raw(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_events_raw_session_id ON events_raw(session_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);
```

**Partitioning:** (For large-scale)

```sql
-- Partition events_raw by month
CREATE TABLE events_raw_2025_10 PARTITION OF events_raw
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
```

---

### 5. **IDENTITY MAPPER SERVICE**

**Purpose:** Join telemetry data with CRM identities (read-only)

**Tech Stack:**
- **Runtime:** Node.js + GraphQL (optional)
- **Cache:** Redis (1-hour TTL)

**API:**

```graphql
query GetUser($userId: UUID!) {
  user(id: $userId) {
    id
    email
    fullName
    role
    org {
      id
      name
      plan
    }
  }
}
```

**Implementation:**

```typescript
// Cache-aside pattern
async function getUser(userId: string) {
  // Check cache
  const cached = await redis.get(`user:${userId}`)
  if (cached) return JSON.parse(cached)
  
  // Query CRM DB (read-only)
  const user = await crmDb.query(`
    SELECT 
      u.id, u.email, u.full_name, u.role,
      t.id as org_id, t.name as org_name
    FROM app_users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.id = $1
  `, [userId])
  
  // Cache for 1 hour
  await redis.setex(`user:${userId}`, 3600, JSON.stringify(user))
  
  return user
}
```

**SLA:**
- **Latency:** p95 < 20ms (with cache)
- **Cache Hit Rate:** > 95%
- **Fallback:** Returns partial data if CRM DB unavailable

---

### 6. **ADMIN UI**

**Tech Stack:**
- **Framework:** Next.js 14 (App Router)
- **UI:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **Tables:** TanStack Table

**Pages:**

#### 6.1 Global Dashboard (`/dashboard`)

**Metrics:**
- Total Orgs, Total Users
- Signups (last 30 days) - Line chart
- DAU/WAU/MAU - Line chart with 3 series
- Top Features - Bar chart (top 10)
- Top Paths - Sankey diagram
- Error Rate - Line chart
- Latency p95 - Line chart by route

#### 6.2 Org Profile (`/orgs/[id]`)

**Sections:**
- **Overview:** Plan, seats, created date, last active
- **Usage Score:** 0-100 (based on feature adoption)
- **Feature Usage:** Last 30 days - Heatmap
- **User List:** Sortable table
- **Sessions:** Last 100 sessions - Timeline
- **Funnels:** Conversion rates
- **Cohort Placement:** Which cohorts this org belongs to
- **Recent Errors:** Last 50 errors

#### 6.3 User Profile (`/users/[id]`)

**Sections:**
- **Identity:** Email, name, role, org
- **Activity:** Last 7 days - Bar chart (events per day)
- **Sessions:** Last 20 sessions - Table
- **Feature Usage:** Top 10 features used
- **Last Actions:** Last 50 events - Timeline

#### 6.4 Funnel Explorer (`/funnels`)

**Features:**
- Create funnel (select steps)
- Compute conversion rate
- Breakdown by org, plan, cohort
- Time-series view (trend over time)

#### 6.5 Path Explorer (`/paths`)

**Features:**
- Start page selector
- Sankey diagram (page flow)
- Drop-off analysis

#### 6.6 Cohort Builder (`/cohorts`)

**Features:**
- Define cohort (SQL-like filters)
- View membership (user list)
- Compare cohorts (retention, feature usage)

#### 6.7 Retention Analysis (`/retention`)

**Features:**
- N-day retention curves
- Cohort comparison
- Breakdown by acquisition source

#### 6.8 Exports (`/exports`)

**Features:**
- Export any chart to CSV/JSON
- Scheduled exports (email daily/weekly)

---

## 🔄 DATA FLOW

### Flow 1: HTTP Request Tracking (Mode A)

```
1. User visits /contacts in CRM
   ↓
2. Next.js middleware logs request
   POST https://telemetry/ingest/http
   {
     "event_type": "http_request",
     "path": "/contacts",
     "method": "GET",
     "user_id": "uuid",
     "org_id": "uuid",
     "status": 200,
     "duration_ms": 45
   }
   ↓
3. Ingestion API validates & queues
   → Redis stream: events_raw
   ↓
4. Processor: Sessionizer
   → Groups into session
   → Updates events_raw.session_id
   ↓
5. Processor: Modeler
   → Creates events_modeled_pageviews entry
   ↓
6. Processor: Aggregator (daily)
   → Updates dau_by_org
   ↓
7. Admin UI queries:
   SELECT active_users FROM dau_by_org WHERE org_id = ? AND date = ?
```

---

### Flow 2: Database Change Tracking (Mode B)

```
1. User signs up in CRM
   → INSERT INTO tenants (id, name, created_at)
   ↓
2. DB Poller (every 5 min)
   → SELECT * FROM tenants WHERE created_at >= last_watermark
   → Finds new tenant
   ↓
3. Poller emits event:
   POST https://telemetry/ingest/http
   {
     "event_type": "lifecycle",
     "event_name": "org_signed_up",
     "org_id": "uuid",
     "occurred_at": "ISO8601"
   }
   ↓
4. Ingestion API queues
   → Redis: events_raw
   ↓
5. Processor: Modeler
   → Creates entry in orgs table (shadow copy)
   → Creates entry in funnel: signup_funnel
   ↓
6. Admin UI:
   → Dashboard shows new signup in chart
```

---

### Flow 3: Identity Resolution

```
1. Admin UI loads Org Profile
   GET /orgs/abc-123
   ↓
2. Admin API queries:
   SELECT * FROM orgs WHERE id = 'abc-123'
   (Returns: limited telemetry data)
   ↓
3. Admin API calls Identity Mapper:
   GET /identity/org/abc-123
   ↓
4. Identity Mapper:
   a. Check Redis cache
   b. If miss, query CRM DB (read-only):
      SELECT name, plan, created_at FROM tenants WHERE id = 'abc-123'
   c. Cache result (1 hour TTL)
   d. Return enriched data
   ↓
5. Admin UI merges:
   telemetry data (sessions, events) + CRM data (name, plan)
   → Displays full org profile
```

---

## 🔐 SECURITY & PRIVACY

### Authentication

**Admin UI:**
- **Method:** Separate auth (not CRM auth)
- **Provider:** Supabase Auth (separate project) or Auth0
- **Users:** Platform admins only (not tenant users)
- **MFA:** Required for all admins

**API:**
- **Method:** API keys (rotatable)
- **Scopes:** `ingest:write`, `analytics:read`

---

### Data Privacy

**PII Minimization:**
```sql
-- Store hashed emails for joins
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email_hash TEXT, -- SHA256(email)
  role TEXT,
  org_id UUID
);

-- Never store: passwords, payment info, health data
```

**Retention:**
```sql
-- Auto-delete old raw events (90 days)
DELETE FROM events_raw WHERE occurred_at < NOW() - INTERVAL '90 days';

-- Keep aggregates longer (2 years)
DELETE FROM dau_by_org WHERE date < NOW() - INTERVAL '2 years';
```

**Consent:**
- All tracking is first-party (no 3rd-party cookies)
- Admin-only (not exposed to end users)
- Can be disabled per org (if needed)

---

### Compliance

**GDPR:**
- Right to access: Export all telemetry for a user_id
- Right to deletion: Anonymize user_id in events_raw
- Data portability: CSV export

**SOC 2:**
- Audit logs: All admin actions logged
- Access controls: RBAC for admin users
- Encryption: At rest (DB) and in transit (HTTPS)

---

## 📊 SLAs & NON-FUNCTIONAL REQUIREMENTS

### Performance

| Metric | Target | Monitoring |
|--------|--------|------------|
| **Ingestion latency** | p95 < 50ms | Prometheus |
| **Event processing lag** | < 5 minutes | Queue depth |
| **Admin UI page load** | p95 < 2s | Real User Monitoring |
| **Database query time** | p95 < 200ms | pg_stat_statements |
| **Cache hit rate** | > 95% | Redis INFO |

### Scalability

| Resource | Current | 6 Months | 1 Year |
|----------|---------|----------|--------|
| **Orgs** | 100 | 500 | 1,000 |
| **Users** | 1,000 | 5,000 | 10,000 |
| **Events/day** | 100k | 1M | 5M |
| **DB size** | 10 GB | 50 GB | 200 GB |
| **API req/min** | 1k | 10k | 50k |

**Scaling Plan:**
- **0-1M events/day:** Single server + Redis
- **1M-10M events/day:** Horizontal scaling (3+ workers)
- **10M+ events/day:** Kafka + Clickhouse (OLAP)

### Availability

| Component | Target | Failure Mode |
|-----------|--------|--------------|
| **Ingestion API** | 99.9% | Queue overflow → Drop oldest |
| **Processor** | 99% | Catch up when back online |
| **Admin UI** | 99% | Read-only from cache |
| **Telemetry DB** | 99.9% | Failover to replica |

**Disaster Recovery:**
- **RTO:** 1 hour (Recovery Time Objective)
- **RPO:** 15 minutes (Recovery Point Objective)
- **Backup:** Daily snapshots to S3, 30-day retention

---

## 🛠️ TECHNOLOGY STACK

### Backend

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Ingestion API** | Node.js + Express | Fast, async I/O, TypeScript support |
| **Processor** | Node.js workers | Can reuse code, good for ETL |
| **Database** | PostgreSQL 15 | JSONB, partitioning, mature |
| **Cache** | Redis 7 | Fast, Streams for queue |
| **Queue** | Redis Streams | Simple, persistent, good for < 1M/day |

**Alternatives Considered:**
- **Ingestion:** Bun (faster but less mature)
- **Queue:** Kafka (overkill for current scale)
- **Database:** Clickhouse (OLAP, better for 10M+ events/day)

### Frontend

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **UI** | Tailwind CSS + shadcn/ui |
| **Charts** | Recharts (React wrapper for D3) |
| **Tables** | TanStack Table v8 |
| **State** | React Query (server state) |

### Infrastructure

| Component | Provider | Notes |
|-----------|----------|-------|
| **Hosting** | Vercel (UI) + Railway (API) | Easy deploy, auto-scaling |
| **Database** | Supabase (Postgres) | Managed, backups included |
| **Cache/Queue** | Upstash Redis | Serverless, pay-per-request |
| **Monitoring** | Betterstack | Uptime + logs |
| **Errors** | Sentry | Error tracking |

---

## 📦 DEPLOYMENT ARCHITECTURE

### Development

```
localhost:3001 - Ingestion API
localhost:3002 - Admin UI
localhost:5432 - PostgreSQL (Docker)
localhost:6379 - Redis (Docker)
```

### Production

```
┌─────────────────────────────────────────┐
│         Vercel (Admin UI)              │
│         admin-telemetry.vercel.app      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    Railway (Ingestion API + Workers)   │
│    telemetry-api.up.railway.app         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Supabase (Telemetry DB)               │
│  telemetry-prod.supabase.co             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Upstash Redis (Queue + Cache)         │
└─────────────────────────────────────────┘
```

---

## 🚀 ROLLOUT PLAN

### Phase 1: MVP (Weeks 1-2)
- ✅ Ingestion API (HTTP endpoint)
- ✅ DB Poller (Mode B: signups, activations)
- ✅ Basic processor (sessionization)
- ✅ Telemetry DB (events_raw, sessions, orgs, users)
- ✅ Admin UI (dashboard only: DAU/WAU/MAU, signups)

**Success Criteria:**
- Can track signups from CRM
- Can compute DAU/WAU/MAU
- Dashboard shows last 30 days

---

### Phase 2: Enrichment (Weeks 3-4)
- ✅ Mode A connector (if middleware ready)
- ✅ Identity mapper (cached joins)
- ✅ Org profiles (feature usage, sessions)
- ✅ User profiles (activity timeline)
- ✅ Feature adoption dashboard

**Success Criteria:**
- Can see org-level feature usage
- Can drill into individual users
- Identity mapper working (> 95% cache hit rate)

---

### Phase 3: Analytics (Weeks 5-6)
- ✅ Funnels (builder + computation)
- ✅ Cohorts (definitions + membership)
- ✅ Retention curves (N-day)
- ✅ Path analysis (Sankey diagrams)
- ✅ Error tracking

**Success Criteria:**
- Can define & compute custom funnels
- Can see 4-week retention curves
- Can track most common paths

---

### Phase 4: Polish (Weeks 7-8)
- ✅ Exports (CSV/JSON)
- ✅ Scheduled reports (email digests)
- ✅ Alerts (anomaly detection)
- ✅ Performance optimizations
- ✅ Documentation

**Success Criteria:**
- All charts exportable
- Daily digest email working
- Admin actions audited
- Complete runbooks

---

## 🧪 TESTING STRATEGY

### Unit Tests
- Each processor function (sessionize, model, aggregate)
- Identity mapper cache logic
- Event validation schemas

### Integration Tests
- End-to-end: Ingest → Process → Query
- Mode A: Mock HTTP logs → Verify processed
- Mode B: Mock DB changes → Verify detected

### Load Tests
- Ingestion API: 10,000 req/sec
- Processor: 1M events/day
- Admin UI: 100 concurrent users

### Acceptance Tests
- Pilot org: Track for 4 weeks
- Verify: Signup, DAU/WAU/MAU, feature usage, retention
- Compare to expected values

---

## 📋 MONITORING & OBSERVABILITY

### Metrics (Prometheus)

```
# Ingestion
telemetry_events_ingested_total{source}
telemetry_ingestion_latency_seconds{quantile}
telemetry_ingestion_errors_total{type}

# Processing
telemetry_processor_lag_seconds
telemetry_events_processed_total{processor}
telemetry_processor_errors_total{processor}

# Database
telemetry_db_query_duration_seconds{query}
telemetry_db_connections_active

# Cache
telemetry_cache_hit_rate
telemetry_cache_size_bytes
```

### Logs (Structured JSON)

```json
{
  "level": "info",
  "service": "ingestion-api",
  "message": "Batch ingested",
  "event_count": 50,
  "source": "middleware",
  "duration_ms": 23,
  "timestamp": "2025-10-18T12:00:00Z"
}
```

### Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| **Ingestion down** | No events for 5 min | 🔴 Critical |
| **Processor lag** | Lag > 30 min | 🟠 Warning |
| **DB disk full** | > 90% used | 🔴 Critical |
| **Cache hit rate low** | < 80% | 🟡 Info |
| **Error spike** | Errors > 100/min | 🟠 Warning |

---

## 📖 RUNBOOKS

### Runbook 1: Backfill Historical Data

```bash
# 1. Export CRM data
pg_dump --table=tenants --data-only crm_db > tenants.sql

# 2. Transform to events
node scripts/transform-to-events.js tenants.sql > events.jsonl

# 3. Batch ingest
split -l 1000 events.jsonl batch_
for file in batch_*; do
  curl -X POST https://telemetry/ingest/http -d @$file
done

# 4. Trigger reprocessing
psql telemetry_db -c "SELECT reprocess_events('2023-01-01', '2025-10-18');"
```

---

### Runbook 2: Handle Connector Outage

**Scenario:** DB Poller fails for 2 hours

**Steps:**
1. Check watermark: `SELECT last_processed_at FROM poller_state;`
2. Resume from watermark (automatic on restart)
3. Verify gap filled: `SELECT COUNT(*) FROM events_raw WHERE source='db_poller' AND occurred_at BETWEEN ? AND ?`

**Prevention:** Dead letter queue + alerting

---

### Runbook 3: Schema Evolution

**Scenario:** Add new event property

**Steps:**
1. Update ingestion schema (backward compatible)
2. Deploy ingestion API (handles both old & new)
3. Update processor to use new property
4. Backfill old events (if needed)

---

## ✅ ACCEPTANCE CRITERIA (Revisited)

From requirements:

- [x] ✅ **Platform deploys independently** → Yes: Separate repo, DB, hosting
- [x] ✅ **CRM unaffected if telemetry down** → Yes: Async, no blocking calls
- [x] ✅ **Existing tracking integrated cleanly** → Yes: Mode A+B replace SDK
- [ ] 🔲 **Pilot tenant tracked** → Build Phase 1-3
- [x] ✅ **Identity joins accurate** → Yes: Cached, read-only
- [ ] 🔲 **All charts exportable** → Build Phase 4
- [ ] 🔲 **Admin actions audited** → Build Phase 4

---

## 🎯 NEXT DELIVERABLE

**#3: Telemetry DB Migrations + ERD**

Will include:
- Complete SQL schema
- Entity-Relationship Diagram
- Migration scripts (up/down)
- Sample queries for each KPI

---

**END OF ARCHITECTURE DOC**

**Status:** ✅ Ready for implementation

**Approvals Required:**
- [ ] Technical Lead
- [ ] Security Review
- [ ] Privacy/Legal Review

