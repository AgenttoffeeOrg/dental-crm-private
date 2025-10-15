# Marketing Audit Module - Database Schema Documentation

## Overview

The Marketing Audit & Benchmarking module uses 8 dedicated tables with complete row-level security (RLS) and multi-tenant isolation. All tables are prefixed with `marketing_audit_` or `audit_` to avoid conflicts with existing CRM tables.

---

## Entity Relationship Diagram

```
┌─────────────────────┐
│  practices          │ (existing table)
│  ├─ id (PK)         │
│  ├─ domain          │
│  └─ tenant_id       │
└───────┬─────────────┘
        │
        │ 1:N
        ▼
┌─────────────────────────────────┐
│  marketing_audit_runs           │
│  ├─ id (PK)                     │
│  ├─ practice_id (FK)            │
│  ├─ composite_score             │
│  ├─ technical_score             │
│  ├─ local_score                 │
│  ├─ content_score               │
│  ├─ analytics_score             │
│  ├─ conversion_score            │
│  └─ peer_group_id (FK)          │
└───────┬──────────────┬──────────┘
        │              │
   1:N  │              │ 1:N
        ▼              ▼
┌─────────────┐  ┌─────────────────┐
│audit_metrics│  │audit_            │
│├─ id (PK)   │  │recommendations  │
│├─ run_id(FK)│  │├─ id (PK)       │
│├─ category  │  │├─ run_id (FK)   │
│└─ value     │  │└─ task_id (FK)  │
└─────────────┘  └─────────────────┘
        │              │
   1:N  │         1:N  │
        ▼              ▼
┌─────────────────┐  ┌─────────────┐
│audit_competitors│  │tasks        │
│├─ id (PK)       │  │(existing)   │
│├─ run_id (FK)   │  └─────────────┘
│└─ scores        │
└─────────────────┘

┌─────────────────┐  ┌─────────────────┐
│audit_peer_groups│  │audit_schedules  │
│├─ id (PK)       │  │├─ id (PK)       │
│└─ practice_id   │  │└─ practice_id   │
└─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐
│api_credentials  │  │audit_alerts     │
│├─ id (PK)       │  │├─ id (PK)       │
│└─ practice_id   │  │├─ run_id (FK)   │
└─────────────────┘  │└─ practice_id   │
                     └─────────────────┘
```

---

## Table Descriptions

### 1. `marketing_audit_runs`

**Purpose:** Main table storing audit run records with all scores and metadata.

**Key Fields:**
- `id` (UUID, PK) - Unique audit run identifier
- `practice_id` (UUID, FK) - Links to practices table
- `domain` (TEXT) - Website domain audited
- `status` (ENUM) - pending|running|completed|failed|cancelled
- `composite_score` (DECIMAL) - Overall score 0-100
- `technical_score` (DECIMAL) - Technical SEO score 0-100
- `local_score` (DECIMAL) - Local presence score 0-100
- `content_score` (DECIMAL) - Content & authority score 0-100
- `analytics_score` (DECIMAL) - Analytics hygiene score 0-100
- `conversion_score` (DECIMAL) - Conversion UX score 0-100
- `peer_group_id` (UUID, FK) - Links to audit_peer_groups
- `percentile_rank` (DECIMAL) - Percentile vs peers
- `tenant_id` (UUID) - Multi-tenancy isolation

**Indexes:**
- `idx_audit_runs_practice` - On practice_id
- `idx_audit_runs_tenant` - On tenant_id
- `idx_audit_runs_status` - On status
- `idx_audit_runs_started_at` - On started_at DESC

---

### 2. `audit_metrics`

**Purpose:** Time-series metrics collected during audits for trending and evidence.

**Key Fields:**
- `id` (UUID, PK) - Unique metric identifier
- `run_id` (UUID, FK) - Links to marketing_audit_runs
- `category` (ENUM) - technical|local|content|analytics|conversion
- `metric_name` (TEXT) - e.g., 'lcp', 'reviews_count'
- `metric_value` (DECIMAL) - Numeric value
- `metric_unit` (TEXT) - seconds|milliseconds|count|percent|rating
- `source` (ENUM) - psi|gsc|ga4|places_api|brightlocal|semrush
- `raw_data` (JSONB) - Full API response for evidence
- `collected_at` (TIMESTAMPTZ) - Time-series timestamp

**Indexes:**
- `idx_metrics_run` - On run_id
- `idx_metrics_category` - On category
- `idx_metrics_metric_name` - On metric_name
- `idx_metrics_trending` - On (metric_name, collected_at DESC)

---

### 3. `audit_recommendations`

**Purpose:** Actionable recommendations generated from audit findings.

**Key Fields:**
- `id` (UUID, PK) - Unique recommendation identifier
- `run_id` (UUID, FK) - Links to marketing_audit_runs
- `category` (TEXT) - Recommendation category
- `title` (TEXT) - Recommendation title
- `description` (TEXT) - Detailed explanation
- `impact` (ENUM) - high|medium|low
- `effort` (ENUM) - high|medium|low
- `confidence` (ENUM) - high|medium|low
- `priority_score` (INTEGER) - 0-100 calculated priority
- `status` (ENUM) - pending|in_progress|completed|dismissed
- `task_id` (UUID, FK) - Links to CRM tasks table
- `deal_id` (UUID, FK) - Links to CRM deals table
- `action_steps` (JSONB) - Array of step-by-step actions

**Indexes:**
- `idx_recommendations_run` - On run_id
- `idx_recommendations_status` - On status
- `idx_recommendations_priority` - On priority_score DESC
- `idx_recommendations_task` - On task_id (where not null)

---

### 4. `audit_competitors`

**Purpose:** Competitor data for benchmarking analysis.

**Key Fields:**
- `id` (UUID, PK) - Unique competitor record
- `run_id` (UUID, FK) - Links to marketing_audit_runs
- `competitor_name` (TEXT) - Business name
- `competitor_place_id` (TEXT) - Google Place ID
- `composite_score` (DECIMAL) - Estimated competitor score
- `metrics` (JSONB) - Key metrics (reviews, rating, backlinks, etc.)
- `rank` (INTEGER) - Rank in peer group (1, 2, 3...)
- `distance_miles` (DECIMAL) - Distance from practice

**Indexes:**
- `idx_competitors_run` - On run_id
- `idx_competitors_rank` - On rank

**Unique Constraint:**
- (run_id, competitor_place_id) - No duplicates per audit

---

### 5. `audit_peer_groups`

**Purpose:** Peer group configurations for benchmarking.

**Key Fields:**
- `id` (UUID, PK) - Unique peer group identifier
- `practice_id` (UUID, FK) - Links to practices table
- `name` (TEXT) - Peer group name
- `auto_discover` (BOOLEAN) - Auto-discover competitors?
- `category` (TEXT) - Business category (e.g., 'dentist')
- `radius_miles` (INTEGER) - Search radius for competitors
- `center_lat`, `center_lng` (DECIMAL) - Geographic center
- `manual_competitor_ids` (TEXT[]) - Manually added place IDs
- `is_default` (BOOLEAN) - Is this the default peer group?

**Indexes:**
- `idx_peer_groups_practice` - On practice_id
- `idx_peer_groups_default` - On (practice_id, is_default)

**Unique Constraint:**
- (practice_id, name) - One name per practice

---

### 6. `audit_schedules`

**Purpose:** Scheduled audit configurations.

**Key Fields:**
- `id` (UUID, PK) - Unique schedule identifier
- `practice_id` (UUID, FK) - Links to practices table
- `frequency` (ENUM) - daily|weekly|biweekly|monthly|quarterly
- `day_of_week` (INTEGER) - 0-6 (0=Sunday)
- `day_of_month` (INTEGER) - 1-31
- `time_of_day` (TIME) - HH:mm:ss
- `timezone` (TEXT) - Timezone for scheduling
- `enabled` (BOOLEAN) - Is schedule active?
- `next_run_at` (TIMESTAMPTZ) - Next scheduled run
- `notify_on_regression` (BOOLEAN) - Send alerts for regressions?
- `regression_threshold` (DECIMAL) - Alert if score drops >X points

**Indexes:**
- `idx_schedules_next_run` - On next_run_at (where enabled = true)
- `idx_schedules_practice` - On practice_id

**Unique Constraint:**
- practice_id - One schedule per practice

---

### 7. `api_credentials`

**Purpose:** OAuth credentials for external APIs (encrypted).

**Key Fields:**
- `id` (UUID, PK) - Unique credential identifier
- `practice_id` (UUID, FK) - Links to practices table
- `provider` (ENUM) - google|brightlocal|semrush|ahrefs|moz
- `access_token` (TEXT) - Encrypted OAuth access token
- `refresh_token` (TEXT) - Encrypted OAuth refresh token
- `expires_at` (TIMESTAMPTZ) - Token expiration time
- `scopes` (TEXT[]) - OAuth scopes granted
- `status` (ENUM) - active|expired|revoked|error

**Indexes:**
- `idx_credentials_practice` - On practice_id
- `idx_credentials_expires` - On expires_at (where active)

**Unique Constraint:**
- (practice_id, provider) - One credential per provider per practice

**Security Note:** Tokens should be encrypted using Supabase Vault in production.

---

### 8. `audit_alerts`

**Purpose:** Alert notifications for regressions and critical issues.

**Key Fields:**
- `id` (UUID, PK) - Unique alert identifier
- `run_id` (UUID, FK) - Links to marketing_audit_runs
- `practice_id` (UUID, FK) - Links to practices table
- `alert_type` (ENUM) - regression|achievement|warning|critical|info
- `severity` (ENUM) - info|warning|error|critical
- `title` (TEXT) - Alert title
- `description` (TEXT) - Alert details
- `metric_name` (TEXT) - Which metric triggered alert
- `previous_value`, `current_value`, `delta` (DECIMAL) - Value changes
- `acknowledged` (BOOLEAN) - Has user acknowledged?
- `notification_sent` (BOOLEAN) - Was email sent?

**Indexes:**
- `idx_alerts_practice` - On practice_id
- `idx_alerts_unacknowledged` - On (practice_id, triggered_at DESC) where not acknowledged

---

## Row Level Security (RLS)

All tables have RLS enabled with the following policies:

### Read Policy
```sql
tenant_id = current_setting('app.current_tenant_id', true)::UUID
```
Users can only read data for their tenant.

### Write Policy
```sql
tenant_id = current_setting('app.current_tenant_id', true)::UUID
```
Users can only write data for their tenant.

---

## Helper Functions

### `calculate_composite_score(technical, local, content, analytics, conversion)`
Calculates weighted composite score:
- Technical SEO: 25%
- Local Presence: 30%
- Content & Authority: 20%
- Analytics Hygiene: 15%
- Conversion UX: 10%

### `calculate_priority_score(impact, effort, confidence)`
Calculates recommendation priority:
- Impact: high=90, medium=60, low=30
- Effort: low=100, medium=60, high=30
- Confidence: high=1.0, medium=0.8, low=0.6
- Formula: ((impact + effort) / 2) * confidence

### `update_updated_at_column()`
Trigger function to automatically update `updated_at` timestamp.

---

## Views

### `latest_audit_runs`
Returns the most recent completed audit for each practice.

```sql
SELECT DISTINCT ON (practice_id) *
FROM marketing_audit_runs
WHERE status = 'completed'
ORDER BY practice_id, completed_at DESC;
```

---

## Migration Files

- **Main Migration:** `supabase/migrations/20250116_marketing_audit_tables.sql`
- **Seed Data:** `supabase/seed/marketing_audit_demo_data.sql`

---

## Rollback Script

To rollback this migration:

```sql
-- Drop all tables (in reverse dependency order)
DROP VIEW IF EXISTS latest_audit_runs;
DROP TABLE IF EXISTS audit_alerts CASCADE;
DROP TABLE IF EXISTS api_credentials CASCADE;
DROP TABLE IF EXISTS audit_schedules CASCADE;
DROP TABLE IF EXISTS audit_peer_groups CASCADE;
DROP TABLE IF EXISTS audit_competitors CASCADE;
DROP TABLE IF EXISTS audit_recommendations CASCADE;
DROP TABLE IF EXISTS audit_metrics CASCADE;
DROP TABLE IF EXISTS marketing_audit_runs CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_composite_score;
DROP FUNCTION IF EXISTS calculate_priority_score;
DROP FUNCTION IF EXISTS update_updated_at_column;
```

---

## Storage Requirements

Estimated storage per practice per year:
- Audit runs: ~52 records (weekly) × 1KB = 52KB
- Metrics: ~52 audits × 50 metrics × 0.5KB = 1.3MB
- Recommendations: ~52 audits × 10 recs × 1KB = 520KB
- Competitors: ~52 audits × 20 competitors × 0.5KB = 520KB
- **Total: ~2.4MB per practice per year**

For 1,000 practices: ~2.4GB per year

---

**Schema Version:** 1.0  
**Last Updated:** January 16, 2025  
**Status:** Production Ready

