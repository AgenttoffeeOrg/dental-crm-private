# 🚀 MARKETING AUDIT & BENCHMARKING MODULE

## COMPLETE IMPLEMENTATION TASK LIST

**Version:** 1.0  
**Total Tasks:** 247 tasks across 4 phases  
**Estimated Time:** 160-200 hours  
**Quality Standard:** World-class, production-ready  
**Approach:** Non-breaking, feature-flagged, fully tested

---

## 📊 TASK SUMMARY BY PHASE

```
PHASE 0: Setup & Infrastructure          22 tasks    (8-10 hours)
PHASE 1: Core MVP                       128 tasks   (65-80 hours)
PHASE 2: Professional Features           52 tasks   (40-50 hours)
PHASE 3: Enterprise Features             45 tasks   (50-60 hours)
─────────────────────────────────────────────────────────────────
TOTAL:                                  247 tasks  (163-200 hours)
```

---

# PHASE 0: SETUP & INFRASTRUCTURE (Week 0)

## 🏗️ PROJECT SETUP (8 tasks, 2 hours)

### ✅ Task 0.1: Create Feature Branch
- **Action:** `git checkout -b feature/marketing-audit-module`
- **Deliverable:** Clean branch from main
- **Time:** 5 min
- **Owner:** Tech Lead

### ✅ Task 0.2: Add Feature Flag to Environment
- **Action:** Add to `.env.local` and `.env.example`
```env
NEXT_PUBLIC_ENABLE_MARKETING_AUDIT=false
MARKETING_AUDIT_PHASE=1  # 1|2|3
```
- **Deliverable:** Environment variables ready
- **Time:** 10 min
- **Owner:** Tech Lead

### ✅ Task 0.3: Create Feature Flag Hook
- **File:** `src/lib/hooks/use-feature-flags.ts`
- **Code:**
```typescript
export function useFeatureFlags() {
  return {
    marketingAudit: {
      enabled: process.env.NEXT_PUBLIC_ENABLE_MARKETING_AUDIT === 'true',
      phase: parseInt(process.env.MARKETING_AUDIT_PHASE || '1', 10),
    },
  };
}
```
- **Deliverable:** Reusable feature flag hook
- **Time:** 15 min
- **Test:** Feature flag returns correct values
- **Owner:** Frontend Engineer

### ✅ Task 0.4: Create Module Directory Structure
- **Action:** Create folders
```
src/
├── app/
│   └── marketing-audit/
│       ├── page.tsx
│       ├── loading.tsx
│       ├── error.tsx
│       ├── layout.tsx
│       └── [tab]/
│           └── page.tsx
├── components/
│   └── marketing-audit/
│       ├── dashboard/
│       ├── technical-seo/
│       ├── local-presence/
│       ├── content-authority/
│       ├── analytics-hygiene/
│       ├── conversion-ux/
│       ├── competitors/
│       └── shared/
└── lib/
    └── marketing-audit/
        ├── connectors/
        ├── scoring/
        ├── types/
        └── utils/
```
- **Deliverable:** Clean folder structure
- **Time:** 10 min
- **Owner:** Tech Lead

### ✅ Task 0.5: Setup Google Cloud Project
- **Action:** 
  1. Go to console.cloud.google.com
  2. Create new project: "Dental-CRM-Audit"
  3. Enable APIs:
     - PageSpeed Insights API
     - Google Search Console API
     - Google Analytics Data API v1
     - Places API
     - Mobile-Friendly Test API
  4. Create API key (with restrictions)
  5. Create OAuth 2.0 credentials
- **Deliverable:** API key + OAuth credentials
- **Time:** 30 min
- **Owner:** DevOps Lead

### ✅ Task 0.6: Add API Keys to Environment
- **File:** `.env.local`
```env
# Google APIs
GOOGLE_API_KEY=your_key_here
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_secret

# Phase 2 (BrightLocal)
BRIGHTLOCAL_API_KEY=
BRIGHTLOCAL_USER_ID=

# Phase 3 (Semrush)
SEMRUSH_API_KEY=
```
- **Deliverable:** Secure API key storage
- **Time:** 10 min
- **Security:** Never commit keys to git
- **Owner:** DevOps Lead

### ✅ Task 0.7: Install Required Dependencies
- **Action:** Add to `package.json`
```bash
npm install --save googleapis @google-cloud/pagespeed-insights
npm install --save-dev @types/google.analytics
```
- **Deliverable:** Dependencies installed
- **Time:** 10 min
- **Owner:** Tech Lead

### ✅ Task 0.8: Create TypeScript Type Definitions
- **File:** `src/lib/marketing-audit/types/index.ts`
- **Content:** Copy from MARKETING_AUDIT_JSON_EXAMPLES.md
- **Deliverable:** Full TypeScript interfaces
- **Time:** 30 min
- **Owner:** Frontend Engineer

---

## 🗄️ DATABASE SETUP (14 tasks, 6-8 hours)

### ✅ Task 0.9: Create Database Migration File
- **File:** `supabase/migrations/20250116_marketing_audit_tables.sql`
- **Time:** 10 min
- **Owner:** Backend Engineer

### ✅ Task 0.10: Define marketing_audit_runs Table
- **SQL:**
```sql
CREATE TABLE marketing_audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  
  -- Scores
  composite_score DECIMAL(5,2) CHECK (composite_score BETWEEN 0 AND 100),
  technical_score DECIMAL(5,2) CHECK (technical_score BETWEEN 0 AND 100),
  local_score DECIMAL(5,2) CHECK (local_score BETWEEN 0 AND 100),
  content_score DECIMAL(5,2) CHECK (content_score BETWEEN 0 AND 100),
  analytics_score DECIMAL(5,2) CHECK (analytics_score BETWEEN 0 AND 100),
  conversion_score DECIMAL(5,2) CHECK (conversion_score BETWEEN 0 AND 100),
  
  -- Metadata
  run_type TEXT DEFAULT 'manual' CHECK (run_type IN ('manual', 'scheduled', 'triggered')),
  phase INTEGER DEFAULT 1 CHECK (phase IN (1, 2, 3)),
  peer_group_id UUID REFERENCES audit_peer_groups(id) ON DELETE SET NULL,
  percentile_rank DECIMAL(5,2) CHECK (percentile_rank BETWEEN 0 AND 100),
  
  -- Error tracking
  error_message TEXT,
  error_details JSONB,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Meta
  api_calls JSONB DEFAULT '{}'::jsonb,
  api_costs_usd DECIMAL(8,4) DEFAULT 0,
  
  -- Audit
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Multi-tenancy
  tenant_id UUID NOT NULL,
  
  CONSTRAINT fk_practice FOREIGN KEY (practice_id) 
    REFERENCES practices(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_audit_runs_practice ON marketing_audit_runs(practice_id);
CREATE INDEX idx_audit_runs_tenant ON marketing_audit_runs(tenant_id);
CREATE INDEX idx_audit_runs_status ON marketing_audit_runs(status);
CREATE INDEX idx_audit_runs_started_at ON marketing_audit_runs(started_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_audit_runs_updated_at
  BEFORE UPDATE ON marketing_audit_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```
- **Deliverable:** Table with proper constraints
- **Time:** 45 min
- **Owner:** Backend Engineer

### ✅ Task 0.11: Define audit_metrics Table (Time-Series)
- **SQL:**
```sql
CREATE TABLE audit_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES marketing_audit_runs(id) ON DELETE CASCADE,
  
  category TEXT NOT NULL CHECK (category IN (
    'technical', 'local', 'content', 'analytics', 'conversion'
  )),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10,4),
  metric_unit TEXT, -- 'seconds', 'milliseconds', 'count', 'percent', 'rating'
  
  source TEXT NOT NULL CHECK (source IN (
    'psi', 'gsc', 'ga4', 'places_api', 'mobile_friendly',
    'brightlocal', 'semrush', 'manual', 'calculated'
  )),
  raw_data JSONB, -- Full API response for evidence
  evidence_url TEXT, -- Link to source (e.g., GSC report URL)
  
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL
);

-- Indexes
CREATE INDEX idx_metrics_run ON audit_metrics(run_id);
CREATE INDEX idx_metrics_category ON audit_metrics(category);
CREATE INDEX idx_metrics_metric_name ON audit_metrics(metric_name);
CREATE INDEX idx_metrics_collected_at ON audit_metrics(collected_at DESC);

-- Composite index for trending queries
CREATE INDEX idx_metrics_trending ON audit_metrics(
  metric_name, collected_at DESC
) WHERE category IS NOT NULL;
```
- **Deliverable:** Time-series metrics table
- **Time:** 30 min
- **Owner:** Backend Engineer

### ✅ Task 0.12: Define audit_recommendations Table
- **SQL:**
```sql
CREATE TABLE audit_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES marketing_audit_runs(id) ON DELETE CASCADE,
  
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  impact TEXT NOT NULL CHECK (impact IN ('high', 'medium', 'low')),
  effort TEXT NOT NULL CHECK (effort IN ('high', 'medium', 'low')),
  confidence TEXT DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  
  estimated_hours DECIMAL(4,1),
  priority_score INTEGER DEFAULT 50 CHECK (priority_score BETWEEN 0 AND 100),
  
  current_value DECIMAL(10,2),
  target_value DECIMAL(10,2),
  
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'dismissed', 'archived'
  )),
  
  -- CRM Integration
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  
  -- Evidence
  evidence_metric_ids UUID[], -- Array of audit_metrics.id
  action_steps JSONB DEFAULT '[]'::jsonb, -- Array of strings
  
  -- Tracking
  completed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  dismissed_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL
);

-- Indexes
CREATE INDEX idx_recommendations_run ON audit_recommendations(run_id);
CREATE INDEX idx_recommendations_status ON audit_recommendations(status);
CREATE INDEX idx_recommendations_priority ON audit_recommendations(priority_score DESC);
CREATE INDEX idx_recommendations_task ON audit_recommendations(task_id) WHERE task_id IS NOT NULL;
```
- **Deliverable:** Recommendations with CRM links
- **Time:** 30 min
- **Owner:** Backend Engineer

### ✅ Task 0.13: Define audit_competitors Table
- **SQL:**
```sql
CREATE TABLE audit_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES marketing_audit_runs(id) ON DELETE CASCADE,
  
  competitor_name TEXT NOT NULL,
  competitor_domain TEXT,
  competitor_place_id TEXT, -- Google Place ID
  competitor_address TEXT,
  
  -- Scores
  composite_score DECIMAL(5,2),
  technical_score DECIMAL(5,2),
  local_score DECIMAL(5,2),
  content_score DECIMAL(5,2),
  analytics_score DECIMAL(5,2),
  conversion_score DECIMAL(5,2),
  
  -- Key metrics for comparison
  metrics JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "reviews_count": 487,
  --   "avg_rating": 4.9,
  --   "referring_domains": 142,
  --   "indexed_pages": 218
  -- }
  
  rank INTEGER, -- 1, 2, 3... in peer group
  distance_miles DECIMAL(4,1),
  
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL,
  
  UNIQUE (run_id, competitor_place_id)
);

-- Indexes
CREATE INDEX idx_competitors_run ON audit_competitors(run_id);
CREATE INDEX idx_competitors_rank ON audit_competitors(rank);
```
- **Deliverable:** Competitor benchmarking data
- **Time:** 20 min
- **Owner:** Backend Engineer

### ✅ Task 0.14: Define audit_peer_groups Table
- **SQL:**
```sql
CREATE TABLE audit_peer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Auto-discovery criteria
  auto_discover BOOLEAN DEFAULT true,
  category TEXT, -- 'dentist', 'orthodontist', 'cosmetic_dentist'
  radius_miles INTEGER DEFAULT 5,
  center_lat DECIMAL(10,7),
  center_lng DECIMAL(10,7),
  max_competitors INTEGER DEFAULT 20,
  
  -- Manual members (place_ids)
  manual_competitor_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  excluded_competitor_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL,
  
  UNIQUE (practice_id, name)
);

-- Indexes
CREATE INDEX idx_peer_groups_practice ON audit_peer_groups(practice_id);
CREATE INDEX idx_peer_groups_default ON audit_peer_groups(practice_id, is_default) 
  WHERE is_default = true;
```
- **Deliverable:** Peer group configuration
- **Time:** 20 min
- **Owner:** Backend Engineer

### ✅ Task 0.15: Define audit_schedules Table
- **SQL:**
```sql
CREATE TABLE audit_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly')),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  time_of_day TIME DEFAULT '09:00:00',
  timezone TEXT DEFAULT 'UTC',
  
  enabled BOOLEAN DEFAULT true,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  last_run_id UUID REFERENCES marketing_audit_runs(id),
  
  -- Notification settings
  notify_on_completion BOOLEAN DEFAULT true,
  notify_on_regression BOOLEAN DEFAULT true,
  regression_threshold DECIMAL(4,1) DEFAULT 5.0, -- Alert if score drops >5 points
  notification_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL,
  
  UNIQUE (practice_id) -- One schedule per practice for now
);

-- Indexes
CREATE INDEX idx_schedules_next_run ON audit_schedules(next_run_at) 
  WHERE enabled = true;
```
- **Deliverable:** Scheduled audit configuration
- **Time:** 20 min
- **Owner:** Backend Engineer

### ✅ Task 0.16: Define api_credentials Table (OAuth Tokens)
- **SQL:**
```sql
CREATE TABLE api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  
  provider TEXT NOT NULL CHECK (provider IN (
    'google', 'brightlocal', 'semrush', 'ahrefs', 'moz'
  )),
  
  -- Encrypted tokens (use Supabase Vault in production)
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  
  scopes TEXT[],
  
  -- OAuth state
  authorization_url TEXT,
  state TEXT,
  code_verifier TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  last_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL,
  
  UNIQUE (practice_id, provider)
);

-- Indexes
CREATE INDEX idx_credentials_practice ON api_credentials(practice_id);
CREATE INDEX idx_credentials_expires ON api_credentials(expires_at) 
  WHERE status = 'active';
```
- **Deliverable:** Secure OAuth token storage
- **Time:** 25 min
- **Security:** Implement encryption in application layer
- **Owner:** Backend Engineer

### ✅ Task 0.17: Define audit_alerts Table
- **SQL:**
```sql
CREATE TABLE audit_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES marketing_audit_runs(id) ON DELETE CASCADE,
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'regression', 'achievement', 'warning', 'critical', 'info'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  
  title TEXT NOT NULL,
  description TEXT,
  
  metric_name TEXT,
  previous_value DECIMAL(10,2),
  current_value DECIMAL(10,2),
  delta DECIMAL(10,2),
  
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES app_users(id),
  
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  
  tenant_id UUID NOT NULL
);

-- Indexes
CREATE INDEX idx_alerts_practice ON audit_alerts(practice_id);
CREATE INDEX idx_alerts_unacknowledged ON audit_alerts(practice_id, triggered_at DESC) 
  WHERE acknowledged = false;
```
- **Deliverable:** Alert tracking system
- **Time:** 20 min
- **Owner:** Backend Engineer

### ✅ Task 0.18: Create RLS Policies for All Tables
- **SQL:**
```sql
-- Enable RLS
ALTER TABLE marketing_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_peer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_alerts ENABLE ROW LEVEL SECURITY;

-- Read policies (tenant isolation)
CREATE POLICY audit_runs_read ON marketing_audit_runs
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY audit_metrics_read ON audit_metrics
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY audit_recommendations_read ON audit_recommendations
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY audit_competitors_read ON audit_competitors
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY audit_peer_groups_read ON audit_peer_groups
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY audit_schedules_read ON audit_schedules
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY api_credentials_read ON api_credentials
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY audit_alerts_read ON audit_alerts
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Write policies (authenticated users)
CREATE POLICY audit_runs_write ON marketing_audit_runs
  FOR ALL USING (
    tenant_id = current_setting('app.current_tenant_id')::UUID AND
    auth.uid() IN (SELECT id FROM app_users WHERE tenant_id = current_setting('app.current_tenant_id')::UUID)
  );

-- Similar write policies for other tables...
```
- **Deliverable:** Complete RLS protection
- **Time:** 45 min
- **Test:** Verify no cross-tenant data leakage
- **Owner:** Security Engineer

### ✅ Task 0.19: Create Helper Functions
- **SQL:**
```sql
-- Function to calculate composite score
CREATE OR REPLACE FUNCTION calculate_composite_score(
  technical DECIMAL,
  local DECIMAL,
  content DECIMAL,
  analytics DECIMAL,
  conversion DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN (
    (technical * 0.25) +
    (local * 0.30) +
    (content * 0.20) +
    (analytics * 0.15) +
    (conversion * 0.10)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate priority score
CREATE OR REPLACE FUNCTION calculate_priority_score(
  impact TEXT,
  effort TEXT,
  confidence TEXT
) RETURNS INTEGER AS $$
DECLARE
  impact_score INTEGER;
  effort_score INTEGER;
  confidence_mult DECIMAL;
BEGIN
  impact_score := CASE impact
    WHEN 'high' THEN 90
    WHEN 'medium' THEN 60
    WHEN 'low' THEN 30
  END;
  
  effort_score := CASE effort
    WHEN 'low' THEN 100
    WHEN 'medium' THEN 60
    WHEN 'high' THEN 30
  END;
  
  confidence_mult := CASE confidence
    WHEN 'high' THEN 1.0
    WHEN 'medium' THEN 0.8
    WHEN 'low' THEN 0.6
  END;
  
  RETURN ((impact_score + effort_score) / 2 * confidence_mult)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- View for latest audit per practice
CREATE OR REPLACE VIEW latest_audit_runs AS
SELECT DISTINCT ON (practice_id)
  *
FROM marketing_audit_runs
WHERE status = 'completed'
ORDER BY practice_id, completed_at DESC;
```
- **Deliverable:** Reusable database functions
- **Time:** 30 min
- **Owner:** Backend Engineer

### ✅ Task 0.20: Run Migration in Supabase
- **Action:**
  1. Copy all SQL to Supabase SQL Editor
  2. Run migration
  3. Verify all tables created
  4. Test RLS policies with sample data
- **Deliverable:** Live database schema
- **Time:** 30 min
- **Test:** Insert/query test data
- **Owner:** DevOps Lead

### ✅ Task 0.21: Create Database Seeding Script
- **File:** `supabase/seed/marketing_audit_demo_data.sql`
- **Content:** Insert sample audit runs for testing
- **Deliverable:** Demo data for UI development
- **Time:** 30 min
- **Owner:** Backend Engineer

### ✅ Task 0.22: Document Database Schema
- **File:** `docs/marketing-audit-database-schema.md`
- **Content:** ER diagram, table descriptions, relationships
- **Deliverable:** Schema documentation
- **Time:** 45 min
- **Owner:** Technical Writer

---

# PHASE 1: CORE MVP (Weeks 1-3)

## 🔌 API CONNECTORS (22 tasks, 12-15 hours)

### ✅ Task 1.1: Create Base API Connector Class
- **File:** `src/lib/marketing-audit/connectors/base-connector.ts`
- **Code:**
```typescript
export abstract class BaseAPIConnector {
  protected apiKey: string;
  protected rateLimiter: RateLimiter;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.rateLimiter = new RateLimiter();
  }
  
  protected async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.rateLimiter.throttle(this.constructor.name);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        throw new APIError(
          `${this.constructor.name} error: ${response.statusText}`,
          response.status,
          await response.text()
        );
      }
      
      return await response.json();
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;
        
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }
  
  protected abstract handleError(error: any): void;
}
```
- **Deliverable:** Reusable base connector
- **Time:** 1 hour
- **Test:** Rate limiting, retry logic
- **Owner:** Backend Engineer

### ✅ Task 1.2: Create Rate Limiter
- **File:** `src/lib/marketing-audit/utils/rate-limiter.ts`
- **Code:**
```typescript
import Redis from 'ioredis';

export class RateLimiter {
  private redis: Redis;
  private limits = {
    PSIConnector: { requests: 25000, per: 'day' },
    GSCConnector: { requests: 1200, per: 'minute' },
    GA4Connector: { requests: 25000, per: 'day' },
    PlacesConnector: { requests: 1000, per: 'day' },
  };
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }
  
  async throttle(connectorName: string): Promise<void> {
    const limit = this.limits[connectorName];
    if (!limit) return;
    
    const key = `rate_limit:${connectorName}:${this.getPeriod(limit.per)}`;
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, this.getTTL(limit.per));
    }
    
    if (current > limit.requests) {
      throw new RateLimitError(
        `Rate limit exceeded for ${connectorName}`,
        this.getResetTime(limit.per)
      );
    }
  }
  
  private getPeriod(per: string): string {
    const now = new Date();
    if (per === 'minute') return now.toISOString().slice(0, 16);
    if (per === 'hour') return now.toISOString().slice(0, 13);
    if (per === 'day') return now.toISOString().slice(0, 10);
    return now.toISOString();
  }
  
  private getTTL(per: string): number {
    if (per === 'minute') return 60;
    if (per === 'hour') return 3600;
    if (per === 'day') return 86400;
    return 3600;
  }
  
  private getResetTime(per: string): Date {
    const now = new Date();
    if (per === 'minute') {
      now.setMinutes(now.getMinutes() + 1, 0, 0);
    } else if (per === 'hour') {
      now.setHours(now.getHours() + 1, 0, 0, 0);
    } else if (per === 'day') {
      now.setDate(now.getDate() + 1);
      now.setHours(0, 0, 0, 0);
    }
    return now;
  }
}
```
- **Deliverable:** Redis-backed rate limiter
- **Time:** 1.5 hours
- **Test:** Rate limit enforcement
- **Dependency:** Redis (add to infra)
- **Owner:** Backend Engineer

### ✅ Task 1.3: Create PageSpeed Insights Connector
- **File:** `src/lib/marketing-audit/connectors/psi-connector.ts`
- **Code:**
```typescript
import { BaseAPIConnector } from './base-connector';
import type { PSIResponse, CoreWebVitals, LighthouseScores } from '../types';

export class PSIConnector extends BaseAPIConnector {
  private readonly baseUrl = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
  
  async runAudit(url: string, strategy: 'mobile' | 'desktop' = 'mobile'): Promise<PSIResponse> {
    const params = new URLSearchParams({
      url,
      key: this.apiKey,
      strategy,
      category: ['performance', 'accessibility', 'best-practices', 'seo'].join(','),
    });
    
    return this.retryWithBackoff(async () => {
      const response = await this.makeRequest<PSIResponse>(
        `${this.baseUrl}?${params.toString()}`
      );
      
      return response;
    });
  }
  
  extractCoreWebVitals(response: PSIResponse): CoreWebVitals {
    const audits = response.lighthouseResult?.audits;
    
    return {
      lcp: audits?.['largest-contentful-paint']?.numericValue / 1000 || 0,
      fid: audits?.['max-potential-fid']?.numericValue || 0,
      cls: audits?.['cumulative-layout-shift']?.numericValue || 0,
      assessment: this.assessCWV(
        audits?.['largest-contentful-paint']?.numericValue / 1000,
        audits?.['max-potential-fid']?.numericValue,
        audits?.['cumulative-layout-shift']?.numericValue
      ),
    };
  }
  
  extractLighthouseScores(response: PSIResponse): LighthouseScores {
    const categories = response.lighthouseResult?.categories;
    
    return {
      performance: Math.round((categories?.performance?.score || 0) * 100),
      accessibility: Math.round((categories?.accessibility?.score || 0) * 100),
      bestPractices: Math.round((categories?.['best-practices']?.score || 0) * 100),
      seo: Math.round((categories?.seo?.score || 0) * 100),
    };
  }
  
  private assessCWV(lcp: number, fid: number, cls: number): 'good' | 'needs_improvement' | 'poor' {
    const lcpGood = lcp <= 2.5;
    const fidGood = fid <= 100;
    const clsGood = cls <= 0.1;
    
    const goodCount = [lcpGood, fidGood, clsGood].filter(Boolean).length;
    
    if (goodCount === 3) return 'good';
    if (goodCount >= 2) return 'needs_improvement';
    return 'poor';
  }
  
  protected handleError(error: any): void {
    console.error('[PSI Connector Error]', error);
    // Log to monitoring service
  }
}
```
- **Deliverable:** Working PSI connector
- **Time:** 2 hours
- **Test:** Run audit on 3 test domains
- **Owner:** Backend Engineer

### ✅ Task 1.4: Create Google Search Console Connector
- **File:** `src/lib/marketing-audit/connectors/gsc-connector.ts`
- **Time:** 2 hours
- **Owner:** Backend Engineer
- **Note:** Implement OAuth flow, query analytics, index coverage

### ✅ Task 1.5: Create GA4 Data API Connector
- **File:** `src/lib/marketing-audit/connectors/ga4-connector.ts`
- **Time:** 2 hours
- **Owner:** Backend Engineer
- **Note:** OAuth flow, run reports, extract metrics

### ✅ Task 1.6: Create Places API Connector
- **File:** `src/lib/marketing-audit/connectors/places-connector.ts`
- **Time:** 1.5 hours
- **Owner:** Backend Engineer
- **Note:** Place Details, Nearby Search for competitors

### ✅ Task 1.7: Create Mobile-Friendly Test Connector
- **File:** `src/lib/marketing-audit/connectors/mobile-friendly-connector.ts`
- **Time:** 30 min
- **Owner:** Backend Engineer

### ✅ Task 1.8: Create OAuth Flow Handler
- **File:** `src/lib/marketing-audit/utils/oauth-handler.ts`
- **Code:**
```typescript
export class OAuthHandler {
  async initiateGoogleOAuth(
    scopes: string[],
    redirectUri: string
  ): Promise<{ authUrl: string; state: string }> {
    const state = generateSecureRandom();
    const codeVerifier = generatePKCEVerifier();
    const codeChallenge = await generatePKCEChallenge(codeVerifier);
    
    // Store state and codeVerifier in session or database
    await this.storeOAuthState(state, codeVerifier);
    
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent',
    });
    
    return {
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      state,
    };
  }
  
  async handleCallback(
    code: string,
    state: string,
    redirectUri: string
  ): Promise<OAuthTokens> {
    // Verify state
    const storedState = await this.getOAuthState(state);
    if (!storedState) {
      throw new Error('Invalid OAuth state');
    }
    
    // Exchange code for tokens
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: storedState.codeVerifier,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Token exchange failed');
    }
    
    const tokens = await response.json();
    
    // Store tokens securely
    await this.storeTokens(tokens);
    
    return tokens;
  }
  
  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    
    return await response.json();
  }
  
  private async storeOAuthState(state: string, codeVerifier: string): Promise<void> {
    // Store in Redis with 10 min expiry
    await redis.setex(
      `oauth_state:${state}`,
      600,
      JSON.stringify({ codeVerifier })
    );
  }
  
  private async getOAuthState(state: string): Promise<{ codeVerifier: string } | null> {
    const data = await redis.get(`oauth_state:${state}`);
    return data ? JSON.parse(data) : null;
  }
  
  private async storeTokens(tokens: OAuthTokens): Promise<void> {
    // Store in api_credentials table (encrypted)
    // Implementation depends on encryption method
  }
}
```
- **Deliverable:** Secure OAuth flow
- **Time:** 2 hours
- **Test:** Complete OAuth flow end-to-end
- **Security:** PKCE, state validation
- **Owner:** Security Engineer

### ✅ Task 1.9-1.22: Additional Connector Tasks
- Create error handling for all connectors (30 min each × 5 = 2.5 hours)
- Write unit tests for each connector (45 min each × 5 = 3.75 hours)
- Create connector factory pattern (1 hour)
- Document API usage and limits (2 hours)

---

## 🧮 SCORING ENGINE (18 tasks, 10-12 hours)

### ✅ Task 1.23: Create Base Scorer Class
- **File:** `src/lib/marketing-audit/scoring/base-scorer.ts`
- **Code:**
```typescript
export abstract class BaseScorer {
  protected weights: Record<string, number>;
  
  constructor(weights?: Record<string, number>) {
    this.weights = weights || this.getDefaultWeights();
  }
  
  abstract calculateScore(metrics: any): number;
  abstract getDefaultWeights(): Record<string, number>;
  abstract generateRecommendations(metrics: any, score: number): Recommendation[];
  
  protected normalize(value: number, min: number, max: number): number {
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  }
  
  protected inverseNormalize(value: number, min: number, max: number): number {
    return Math.max(0, Math.min(100, ((max - value) / (max - min)) * 100));
  }
}
```
- **Deliverable:** Reusable scoring base
- **Time:** 30 min
- **Owner:** Backend Engineer

### ✅ Task 1.24: Create Technical SEO Scorer
- **File:** `src/lib/marketing-audit/scoring/technical-scorer.ts`
- **Code:**
```typescript
export class TechnicalScorer extends BaseScorer {
  calculateScore(metrics: TechnicalMetrics): number {
    let score = 0;
    
    // Core Web Vitals (40 points)
    if (metrics.core_web_vitals.lcp <= 2.5) score += 15;
    else if (metrics.core_web_vitals.lcp <= 4.0) score += 8;
    
    if (metrics.core_web_vitals.fid <= 100) score += 10;
    else if (metrics.core_web_vitals.fid <= 300) score += 5;
    
    if (metrics.core_web_vitals.cls <= 0.1) score += 15;
    else if (metrics.core_web_vitals.cls <= 0.25) score += 8;
    
    // Lighthouse Performance (20 points)
    score += (metrics.lighthouse.performance / 100) * 20;
    
    // Mobile-Friendly (15 points)
    score += metrics.mobile_friendly ? 15 : 0;
    
    // HTTPS (10 points)
    score += metrics.https ? 10 : 0;
    
    // Sitemap (5 points)
    score += metrics.has_sitemap ? 5 : 0;
    
    // Index Coverage (10 points)
    const coverageRatio = metrics.indexation.indexed_pages / metrics.indexation.submitted_pages;
    score += coverageRatio * 10;
    
    return Math.min(score, 100);
  }
  
  getDefaultWeights(): Record<string, number> {
    return {
      cwv: 0.40,
      lighthouse: 0.20,
      mobile: 0.15,
      https: 0.10,
      sitemap: 0.05,
      indexation: 0.10,
    };
  }
  
  generateRecommendations(metrics: TechnicalMetrics, score: number): Recommendation[] {
    const recs: Recommendation[] = [];
    
    // LCP recommendation
    if (metrics.core_web_vitals.lcp > 2.5) {
      recs.push({
        category: 'technical_seo',
        title: 'Improve Largest Contentful Paint (LCP)',
        description: `Your LCP is ${metrics.core_web_vitals.lcp.toFixed(2)}s. Target is ≤2.5s. This affects perceived loading performance.`,
        impact: metrics.core_web_vitals.lcp > 4.0 ? 'high' : 'medium',
        effort: 'medium',
        confidence: 'high',
        estimated_hours: 4,
        current_value: metrics.core_web_vitals.lcp,
        target_value: 2.5,
        action_steps: [
          'Optimize and compress hero images',
          'Implement lazy loading for below-fold images',
          'Use a CDN for static assets',
          'Minimize render-blocking resources',
          'Preload critical resources',
        ],
        evidence: [
          {
            metric: 'lcp',
            source: 'psi',
            value: metrics.core_web_vitals.lcp,
          },
        ],
      });
    }
    
    // Index coverage recommendation
    if (metrics.indexation.errors > 0) {
      recs.push({
        category: 'technical_seo',
        title: `Fix ${metrics.indexation.errors} Index Coverage Errors`,
        description: `Google Search Console reports ${metrics.indexation.errors} pages with indexation errors. These pages are not appearing in search results.`,
        impact: 'high',
        effort: 'low',
        confidence: 'high',
        estimated_hours: 2,
        current_value: metrics.indexation.indexed_pages,
        target_value: metrics.indexation.submitted_pages,
        action_steps: [
          'Review error report in Google Search Console',
          'Fix redirect chains (simplify to single 301)',
          'Address soft 404 pages (add real content or remove)',
          'Resolve crawl errors and blocked resources',
          'Submit sitemap after fixes and verify indexation',
        ],
        evidence: [
          {
            metric: 'gsc_coverage_errors',
            source: 'gsc',
            value: metrics.indexation.errors,
            url: 'https://search.google.com/search-console',
          },
        ],
      });
    }
    
    // Accessibility recommendation
    if (metrics.lighthouse.accessibility < 90) {
      recs.push({
        category: 'technical_seo',
        title: 'Improve Accessibility Score',
        description: `Your accessibility score is ${metrics.lighthouse.accessibility}/100. Target is ≥95 for WCAG 2.1 AA compliance.`,
        impact: 'medium',
        effort: 'medium',
        confidence: 'high',
        estimated_hours: 6,
        current_value: metrics.lighthouse.accessibility,
        target_value: 95,
        action_steps: [
          'Add ARIA labels to all interactive elements',
          'Ensure sufficient color contrast (4.5:1 for text)',
          'Implement keyboard navigation for all features',
          'Add alt text to all images',
          'Test with screen readers',
        ],
        evidence: [
          {
            metric: 'lighthouse_accessibility',
            source: 'psi',
            value: metrics.lighthouse.accessibility,
          },
        ],
      });
    }
    
    // Sort by priority
    return recs.sort((a, b) => this.calculatePriority(b) - this.calculatePriority(a));
  }
  
  private calculatePriority(rec: Recommendation): number {
    const impactScore = rec.impact === 'high' ? 90 : rec.impact === 'medium' ? 60 : 30;
    const effortScore = rec.effort === 'low' ? 100 : rec.effort === 'medium' ? 60 : 30;
    const confidenceMultiplier = rec.confidence === 'high' ? 1.0 : rec.confidence === 'medium' ? 0.8 : 0.6;
    
    return ((impactScore + effortScore) / 2) * confidenceMultiplier;
  }
}
```
- **Deliverable:** Complete technical scoring
- **Time:** 2 hours
- **Test:** Score 10 different sites, verify accuracy
- **Owner:** Backend Engineer

### ✅ Task 1.25-1.28: Create Other Scorers
- **Local Presence Scorer** (2 hours)
- **Content & Authority Scorer** (simplified for Phase 1) (1.5 hours)
- **Analytics Hygiene Scorer** (1.5 hours)
- **Conversion UX Scorer** (1 hour)

### ✅ Task 1.29: Create Composite Score Calculator
- **File:** `src/lib/marketing-audit/scoring/composite-scorer.ts`
- **Time:** 1 hour
- **Owner:** Backend Engineer

### ✅ Task 1.30: Create Percentile Ranker
- **File:** `src/lib/marketing-audit/scoring/percentile-ranker.ts`
- **Code:**
```typescript
export class PercentileRanker {
  calculatePercentile(yourScore: number, peerScores: number[]): number {
    if (peerScores.length === 0) return 50;
    
    const sorted = [...peerScores].sort((a, b) => a - b);
    const index = sorted.findIndex(score => score >= yourScore);
    
    if (index === -1) return 100; // Better than all
    if (index === 0) return 0; // Worse than all
    
    return (index / sorted.length) * 100;
  }
  
  calculateRank(yourScore: number, peerScores: number[]): number {
    const sorted = [...peerScores, yourScore].sort((a, b) => b - a);
    return sorted.indexOf(yourScore) + 1;
  }
  
  calculateGapToMedian(yourScore: number, peerScores: number[]): number {
    const median = this.calculateMedian(peerScores);
    return yourScore - median;
  }
  
  calculateGapToTop3(yourScore: number, peerScores: number[]): number {
    const top3 = [...peerScores].sort((a, b) => b - a).slice(0, 3);
    const top3Avg = top3.reduce((sum, score) => sum + score, 0) / top3.length;
    return yourScore - top3Avg;
  }
  
  private calculateMedian(scores: number[]): number {
    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }
}
```
- **Deliverable:** Benchmarking calculations
- **Time:** 1 hour
- **Owner:** Backend Engineer

### ✅ Task 1.31-1.40: Scorer Testing & Documentation
- Write unit tests for each scorer (45 min × 5 = 3.75 hours)
- Create scoring documentation (2 hours)
- Create score interpretation guide (1 hour)

---

## 🎨 FRONTEND UI COMPONENTS (48 tasks, 25-30 hours)

### ✅ Task 1.41: Create Main Audit Page Layout
- **File:** `src/app/marketing-audit/page.tsx`
- **Code:**
```typescript
'use client';

import { useFeatureFlags } from '@/lib/hooks/use-feature-flags';
import { redirect } from 'next/navigation';
import { AuditDashboard } from '@/components/marketing-audit/dashboard/audit-dashboard';

export default function MarketingAuditPage() {
  const { marketingAudit } = useFeatureFlags();
  
  if (!marketingAudit.enabled) {
    redirect('/dashboard');
  }
  
  return (
    <div className="h-full">
      <AuditDashboard />
    </div>
  );
}
```
- **Deliverable:** Feature-flagged page
- **Time:** 30 min
- **Owner:** Frontend Engineer

### ✅ Task 1.42: Add Audit Tab to Sidebar Navigation
- **File:** `src/components/layout/dashboard-layout.tsx`
- **Code:**
```typescript
// Add to navigation items
const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Contacts', href: '/contacts', icon: UsersIcon },
  { name: 'Deals', href: '/deals', icon: BriefcaseIcon },
  { name: 'Pipeline', href: '/pipeline', icon: ViewColumnsIcon },
  { name: 'Tasks', href: '/tasks', icon: CheckCircleIcon },
  // NEW: Marketing Audit (conditional)
  ...(featureFlags.marketingAudit.enabled ? [{
    name: 'Marketing Audit',
    href: '/marketing-audit',
    icon: ChartBarIcon,
    badge: 'New',
    badgeColor: 'bg-purple-500',
  }] : []),
  { name: 'Settings', href: '/settings', icon: CogIcon },
];
```
- **Deliverable:** New sidebar item
- **Time:** 15 min
- **Test:** Feature flag on/off
- **Owner:** Frontend Engineer

### ✅ Task 1.43: Create Audit Dashboard Overview Component
- **File:** `src/components/marketing-audit/dashboard/audit-dashboard.tsx`
- **Code:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/lib/supabase-client';
import { CompositeScoreCard } from './composite-score-card';
import { SubScoresGrid } from './sub-scores-grid';
import { RecommendationsPanel } from './recommendations-panel';
import { QuickActionsBar } from './quick-actions-bar';
import { AuditHistoryChart } from './audit-history-chart';
import { LoadingState } from './loading-state';
import { EmptyState } from './empty-state';

export function AuditDashboard() {
  const supabase = useSupabaseClient();
  const [latestAudit, setLatestAudit] = useState<AuditRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningAudit, setRunningAudit] = useState(false);
  
  useEffect(() => {
    fetchLatestAudit();
  }, []);
  
  async function fetchLatestAudit() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketing_audit_runs')
        .select('*')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        setLatestAudit(data);
      }
    } catch (error) {
      console.error('Failed to fetch audit:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleRunAudit() {
    setRunningAudit(true);
    try {
      const response = await fetch('/api/marketing-audit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Audit failed');
      
      const newAudit = await response.json();
      setLatestAudit(newAudit);
    } catch (error) {
      console.error('Audit failed:', error);
    } finally {
      setRunningAudit(false);
    }
  }
  
  if (loading) {
    return <LoadingState />;
  }
  
  if (!latestAudit) {
    return (
      <EmptyState
        title="No audits yet"
        description="Run your first marketing audit to see your practice's online presence health score."
        onRunAudit={handleRunAudit}
        loading={runningAudit}
      />
    );
  }
  
  return (
    <div className="space-y-6 p-6">
      <QuickActionsBar
        onRunAudit={handleRunAudit}
        onSchedule={() => {/* TODO */}}
        onExport={() => {/* TODO */}}
        lastRunAt={latestAudit.completed_at}
        loading={runningAudit}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CompositeScoreCard audit={latestAudit} />
        </div>
        <div>
          <AuditHistoryChart practiceId={latestAudit.practice_id} />
        </div>
      </div>
      
      <SubScoresGrid audit={latestAudit} />
      
      <RecommendationsPanel
        recommendations={latestAudit.recommendations}
        onCreateTask={(rec) => {/* Open slide-over */}}
        onDismiss={(id) => {/* Update status */}}
      />
    </div>
  );
}
```
- **Deliverable:** Main dashboard component
- **Time:** 3 hours
- **Owner:** Frontend Engineer

### ✅ Task 1.44: Create Composite Score Card
- **File:** `src/components/marketing-audit/dashboard/composite-score-card.tsx`
- **Code:**
```typescript
'use client';

import { CircularProgress } from '@/components/ui/circular-progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

interface CompositeScoreCardProps {
  audit: AuditRun;
}

export function CompositeScoreCard({ audit }: CompositeScoreCardProps) {
  const score = audit.composite_score;
  const previousScore = 75.2; // TODO: Fetch from previous audit
  const delta = score - previousScore;
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getScoreLabel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (score >= 60) return { label: 'Good', color: 'bg-yellow-100 text-yellow-800' };
    if (score >= 40) return { label: 'Needs Work', color: 'bg-orange-100 text-orange-800' };
    return { label: 'Poor', color: 'bg-red-100 text-red-800' };
  };
  
  const scoreLabel = getScoreLabel(score);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Marketing Health Score
        </h2>
        <Badge className={scoreLabel.color}>
          {scoreLabel.label}
        </Badge>
      </div>
      
      <div className="flex items-center gap-8">
        <div className="flex-shrink-0">
          <CircularProgress
            value={score}
            size={160}
            strokeWidth={12}
            className={getScoreColor(score)}
          >
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
                {score.toFixed(1)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                out of 100
              </div>
            </div>
          </CircularProgress>
        </div>
        
        <div className="flex-1 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {delta > 0 ? (
                <TrendingUpIcon className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDownIcon className="w-5 h-5 text-red-600" />
              )}
              <span className={`text-sm font-medium ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {delta > 0 ? '+' : ''}{delta.toFixed(1)} points
              </span>
              <span className="text-sm text-gray-500">vs last audit</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Percentile Rank
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {audit.percentile_rank?.toFixed(1) || '—'}th
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                vs {audit.peer_count || 0} peers
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                Rank #{audit.your_rank || '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Gap to top 3 avg
              </span>
              <span className={`font-medium ${audit.gap_to_top_3_avg < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {audit.gap_to_top_3_avg > 0 ? '+' : ''}{audit.gap_to_top_3_avg?.toFixed(1) || '—'} pts
              </span>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Last audited: {new Date(audit.completed_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```
- **Deliverable:** Beautiful score card
- **Time:** 2 hours
- **Design:** Purple gradient theme
- **Owner:** Frontend Engineer

### ✅ Task 1.45: Create Sub-Scores Grid
- **File:** `src/components/marketing-audit/dashboard/sub-scores-grid.tsx`
- **Time:** 2 hours
- **Design:** 5 cards in grid, each showing score + mini bar chart
- **Owner:** Frontend Engineer

### ✅ Task 1.46: Create Recommendations Panel
- **File:** `src/components/marketing-audit/dashboard/recommendations-panel.tsx`
- **Time:** 2.5 hours
- **Features:** Priority sorting, Create Task button, Dismiss button
- **Owner:** Frontend Engineer

### ✅ Task 1.47: Create Empty State Component
- **File:** `src/components/marketing-audit/dashboard/empty-state.tsx`
- **Design:** Beautiful illustration + "Run First Audit" CTA
- **Time:** 1 hour
- **Owner:** Frontend Engineer

### ✅ Task 1.48: Create Loading State Component
- **File:** `src/components/marketing-audit/dashboard/loading-state.tsx`
- **Design:** Skeleton screens for all dashboard components
- **Time:** 1 hour
- **Owner:** Frontend Engineer

### ✅ Task 1.49-1.60: Deep-Dive Tab Components
- **Technical SEO Tab** (3 hours)
  - Core Web Vitals visualization
  - Lighthouse scores breakdown
  - Indexation status
  - Evidence cards with PSI screenshots
  
- **Local Presence Tab** (3 hours)
  - Reviews metrics
  - GBP completeness (Phase 2)
  - NAP consistency (Phase 2)
  - Citations report (Phase 2)
  
- **Content & Authority Tab** (2 hours)
  - Simplified for Phase 1 (just indexed pages + organic traffic)
  - Backlinks section (Phase 3)
  
- **Analytics Hygiene Tab** (2 hours)
  - GA4 setup checklist
  - GSC connection status
  - UTM usage metrics
  - Consent banner check
  
- **Conversion UX Tab** (1.5 hours)
  - Heuristic checklist
  - CTA analysis
  - Mobile UX score
  
- **Competitors Tab** (3 hours)
  - Comparison table
  - Score comparison charts
  - Gap analysis

### ✅ Task 1.61-1.70: Shared UI Components
- **Evidence Card** (1 hour)
- **Recommendation Card** (1.5 hours)
- **Metric Gauge** (1 hour)
- **Trend Sparkline** (1 hour)
- **Score Badge** (30 min)
- **Priority Badge** (30 min)
- **Alert Banner** (1 hour)
- **Quick Actions Bar** (1.5 hours)
- **Audit History Chart** (2 hours)
- **Tab Navigation** (1 hour)

### ✅ Task 1.71-1.88: Mobile Responsiveness
- Make all components responsive (2 hours per major component = 10 hours total)
- Test on iPhone, iPad, Android
- Adjust layouts for small screens

---

## 🔗 API ROUTES (20 tasks, 10-12 hours)

### ✅ Task 1.89: Create Main Audit Orchestrator API
- **File:** `src/app/api/marketing-audit/run/route.ts`
- **Code:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { AuditOrchestrator } from '@/lib/marketing-audit/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get current user and practice
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: practice } = await supabase
      .from('practices')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .single();
    
    if (!practice || !practice.domain) {
      return NextResponse.json(
        { error: 'Practice domain not configured' },
        { status: 400 }
      );
    }
    
    // Create audit run record
    const { data: auditRun, error: createError } = await supabase
      .from('marketing_audit_runs')
      .insert({
        practice_id: practice.id,
        domain: practice.domain,
        status: 'running',
        run_type: 'manual',
        created_by: user.id,
        tenant_id: user.tenant_id,
      })
      .select()
      .single();
    
    if (createError) throw createError;
    
    // Run audit asynchronously (don't await)
    const orchestrator = new AuditOrchestrator(supabase);
    orchestrator.runAudit(auditRun.id, practice).catch(async (error) => {
      console.error('[Audit Failed]', error);
      await supabase
        .from('marketing_audit_runs')
        .update({
          status: 'failed',
          error_message: error.message,
          error_details: { stack: error.stack },
        })
        .eq('id', auditRun.id);
    });
    
    return NextResponse.json({
      audit_id: auditRun.id,
      status: 'running',
      message: 'Audit started. This will take 2-3 minutes.',
    });
  } catch (error) {
    console.error('[Audit API Error]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```
- **Deliverable:** Audit trigger endpoint
- **Time:** 2 hours
- **Owner:** Backend Engineer

### ✅ Task 1.90: Create Audit Orchestrator
- **File:** `src/lib/marketing-audit/orchestrator.ts`
- **Code:**
```typescript
export class AuditOrchestrator {
  private supabase: SupabaseClient;
  private connectors: {
    psi: PSIConnector;
    gsc: GSCConnector;
    ga4: GA4Connector;
    places: PlacesConnector;
    mobileFriendly: MobileFriendlyConnector;
  };
  private scorers: {
    technical: TechnicalScorer;
    local: LocalScorer;
    content: ContentScorer;
    analytics: AnalyticsScorer;
    conversion: ConversionScorer;
    composite: CompositeScorer;
  };
  
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.initializeConnectors();
    this.initializeScorers();
  }
  
  async runAudit(auditId: string, practice: Practice): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Step 1: Collect all metrics
      const metrics = await this.collectMetrics(practice);
      
      // Step 2: Calculate scores
      const scores = await this.calculateScores(metrics);
      
      // Step 3: Generate recommendations
      const recommendations = await this.generateRecommendations(metrics, scores);
      
      // Step 4: Discover and analyze competitors
      const competitors = await this.analyzeCompetitors(practice);
      
      // Step 5: Calculate benchmarking
      const benchmarking = await this.calculateBenchmarking(
        scores.composite,
        competitors
      );
      
      // Step 6: Create alerts if needed
      const alerts = await this.checkForAlerts(auditId, practice.id, scores);
      
      // Step 7: Save everything
      await this.saveAuditResults(auditId, {
        scores,
        metrics,
        recommendations,
        competitors,
        benchmarking,
        alerts,
      });
      
      // Step 8: Update audit run status
      const duration = Math.round((Date.now() - startTime) / 1000);
      await this.supabase
        .from('marketing_audit_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_seconds: duration,
          ...scores,
          ...benchmarking,
        })
        .eq('id', auditId);
      
      // Step 9: Send notification if enabled
      await this.sendCompletionNotification(auditId, practice);
      
    } catch (error) {
      console.error('[Audit Orchestrator Error]', error);
      throw error;
    }
  }
  
  private async collectMetrics(practice: Practice): Promise<AllMetrics> {
    const domain = practice.domain;
    
    // Run all API calls in parallel (where possible)
    const [
      psiMobileData,
      psiDesktopData,
      gscData,
      ga4Data,
      placesData,
      mobileFriendlyData,
    ] = await Promise.all([
      this.connectors.psi.runAudit(domain, 'mobile'),
      this.connectors.psi.runAudit(domain, 'desktop'),
      this.connectors.gsc.getAnalytics(domain),
      this.connectors.ga4.getMetrics(practice.ga4_property_id),
      this.connectors.places.getPlaceDetails(practice.place_id),
      this.connectors.mobileFriendly.test(domain),
    ]);
    
    // Transform API responses into metrics
    return {
      technical: this.extractTechnicalMetrics(
        psiMobileData,
        psiDesktopData,
        gscData,
        mobileFriendlyData
      ),
      local: this.extractLocalMetrics(placesData),
      content: this.extractContentMetrics(gscData),
      analytics: this.extractAnalyticsMetrics(ga4Data, gscData),
      conversion: this.extractConversionMetrics(domain),
    };
  }
  
  private async calculateScores(metrics: AllMetrics): Promise<Scores> {
    return {
      technical: this.scorers.technical.calculateScore(metrics.technical),
      local: this.scorers.local.calculateScore(metrics.local),
      content: this.scorers.content.calculateScore(metrics.content),
      analytics: this.scorers.analytics.calculateScore(metrics.analytics),
      conversion: this.scorers.conversion.calculateScore(metrics.conversion),
      composite: this.scorers.composite.calculateCompositeScore({
        technical: this.scorers.technical.calculateScore(metrics.technical),
        local: this.scorers.local.calculateScore(metrics.local),
        content: this.scorers.content.calculateScore(metrics.content),
        analytics: this.scorers.analytics.calculateScore(metrics.analytics),
        conversion: this.scorers.conversion.calculateScore(metrics.conversion),
      }),
    };
  }
  
  private async generateRecommendations(
    metrics: AllMetrics,
    scores: Scores
  ): Promise<Recommendation[]> {
    const allRecs: Recommendation[] = [];
    
    // Generate recommendations from each scorer
    allRecs.push(...this.scorers.technical.generateRecommendations(metrics.technical, scores.technical));
    allRecs.push(...this.scorers.local.generateRecommendations(metrics.local, scores.local));
    allRecs.push(...this.scorers.content.generateRecommendations(metrics.content, scores.content));
    allRecs.push(...this.scorers.analytics.generateRecommendations(metrics.analytics, scores.analytics));
    allRecs.push(...this.scorers.conversion.generateRecommendations(metrics.conversion, scores.conversion));
    
    // Calculate priority scores
    allRecs.forEach(rec => {
      rec.priority_score = this.calculatePriorityScore(rec);
    });
    
    // Sort by priority and return top 20
    return allRecs
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 20);
  }
  
  private async analyzeCompetitors(practice: Practice): Promise<Competitor[]> {
    // Use Places API Nearby Search
    const nearbyPlaces = await this.connectors.places.nearbySearch(
      practice.lat,
      practice.lng,
      practice.radius_miles || 5,
      practice.category || 'dentist'
    );
    
    // Filter out self and get details for each
    const competitors = nearbyPlaces
      .filter(place => place.place_id !== practice.place_id)
      .slice(0, 20);
    
    // Calculate simplified scores for competitors (Phase 1: just reviews)
    return competitors.map(comp => ({
      name: comp.name,
      domain: comp.website,
      place_id: comp.place_id,
      composite_score: this.estimateCompetitorScore(comp),
      local_score: this.estimateLocalScore(comp),
      metrics: {
        reviews_count: comp.user_ratings_total,
        avg_rating: comp.rating,
      },
    }));
  }
  
  private estimateCompetitorScore(place: any): number {
    // Simplified scoring for competitors (Phase 1)
    // In Phase 3, we'd run full audits for top competitors
    const reviewScore = Math.min((place.user_ratings_total / 200) * 40, 40);
    const ratingScore = ((place.rating - 3) / 2) * 60;
    return Math.max(0, Math.min(100, reviewScore + ratingScore));
  }
  
  private async calculateBenchmarking(
    yourScore: number,
    competitors: Competitor[]
  ): Promise<BenchmarkData> {
    const competitorScores = competitors.map(c => c.composite_score);
    const ranker = new PercentileRanker();
    
    return {
      peer_count: competitors.length,
      your_rank: ranker.calculateRank(yourScore, competitorScores),
      percentile: ranker.calculatePercentile(yourScore, competitorScores),
      gap_to_median: ranker.calculateGapToMedian(yourScore, competitorScores),
      gap_to_top_3_avg: ranker.calculateGapToTop3(yourScore, competitorScores),
    };
  }
  
  private async checkForAlerts(
    auditId: string,
    practiceId: string,
    currentScores: Scores
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    // Get previous audit
    const { data: previousAudit } = await this.supabase
      .from('marketing_audit_runs')
      .select('*')
      .eq('practice_id', practiceId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!previousAudit) return alerts;
    
    // Check for regressions (>5 point drop)
    const categories = [
      { key: 'technical', label: 'Technical SEO' },
      { key: 'local', label: 'Local Presence' },
      { key: 'content', label: 'Content & Authority' },
      { key: 'analytics', label: 'Analytics Hygiene' },
      { key: 'conversion', label: 'Conversion UX' },
    ];
    
    for (const category of categories) {
      const currentScore = currentScores[category.key];
      const previousScore = previousAudit[`${category.key}_score`];
      const delta = currentScore - previousScore;
      
      if (delta < -5) {
        alerts.push({
          type: 'regression',
          severity: delta < -10 ? 'error' : 'warning',
          title: `${category.label} Score Dropped`,
          description: `Down ${Math.abs(delta).toFixed(1)} points from ${previousScore.toFixed(1)} to ${currentScore.toFixed(1)} since last audit.`,
          metric_name: `${category.key}_score`,
          previous_value: previousScore,
          current_value: currentScore,
          delta,
        });
      }
    }
    
    return alerts;
  }
  
  private async saveAuditResults(
    auditId: string,
    results: any
  ): Promise<void> {
    // Save metrics
    await this.saveMetrics(auditId, results.metrics);
    
    // Save recommendations
    await this.saveRecommendations(auditId, results.recommendations);
    
    // Save competitors
    await this.saveCompetitors(auditId, results.competitors);
    
    // Save alerts
    await this.saveAlerts(auditId, results.alerts);
  }
  
  // ... more helper methods
}
```
- **Deliverable:** Complete orchestration logic
- **Time:** 4 hours
- **Owner:** Backend Engineer

### ✅ Task 1.91-1.100: Additional API Routes
- **GET /api/marketing-audit/latest** - Get latest audit (30 min)
- **GET /api/marketing-audit/history** - Get audit history (30 min)
- **GET /api/marketing-audit/[id]** - Get specific audit (30 min)
- **POST /api/marketing-audit/[id]/recommendations/[recId]/create-task** - Create task from rec (1 hour)
- **PATCH /api/marketing-audit/[id]/recommendations/[recId]/dismiss** - Dismiss rec (30 min)
- **GET /api/marketing-audit/competitors** - Get competitor analysis (30 min)
- **POST /api/marketing-audit/oauth/google/initiate** - Start OAuth (1 hour)
- **GET /api/marketing-audit/oauth/google/callback** - OAuth callback (1 hour)
- **POST /api/marketing-audit/schedule** - Create schedule (1 hour)
- **GET /api/marketing-audit/alerts** - Get unacknowledged alerts (30 min)

---

## 🧪 TESTING (20 tasks, 8-10 hours)

### ✅ Task 1.101-1.120: Testing Tasks
- Write unit tests for all scorers (1 hour each × 5 = 5 hours)
- Write integration tests for orchestrator (2 hours)
- Write E2E tests for audit flow (2 hours)
- Test OAuth flows (1 hour)
- Test rate limiting (30 min)
- Test error handling (1 hour)
- Test RLS policies (1 hour)
- Test mobile responsiveness (1 hour)
- Load testing (audit 10 sites simultaneously) (1 hour)
- Accessibility testing (WCAG 2.1 AA) (1 hour)

---

## 📚 DOCUMENTATION (10 tasks, 4-5 hours)

### ✅ Task 1.121-1.130: Documentation Tasks
- User guide: "How to run your first audit" (1 hour)
- User guide: "Understanding your score" (1 hour)
- User guide: "Acting on recommendations" (30 min)
- Admin guide: "Setting up API credentials" (1 hour)
- Developer docs: "Audit architecture" (1 hour)
- Developer docs: "Adding new connectors" (30 min)
- Developer docs: "Adding new scorers" (30 min)
- API documentation (all endpoints) (1 hour)
- Troubleshooting guide (30 min)
- Video tutorial script (30 min)

---

# PHASE 2: PROFESSIONAL FEATURES (Weeks 4-5)

## 🏢 BRIGHTLOCAL INTEGRATION (20 tasks, 15-18 hours)

### ✅ Task 2.1-2.20: BrightLocal Tasks
- Create BrightLocal connector (2 hours)
- Implement GBP completeness audit (2 hours)
- Implement citation tracking (2 hours)
- Implement NAP consistency checker (1.5 hours)
- Implement local pack rankings (1.5 hours)
- Update local scorer with new metrics (2 hours)
- Create GBP Insights tab UI (3 hours)
- Create Citation Report UI (2 hours)
- Add GBP recommendations (1.5 hours)
- Test all BrightLocal features (2 hours)

---

## ⏰ SCHEDULED AUDITS (16 tasks, 10-12 hours)

### ✅ Task 2.21-2.36: Scheduling Tasks
- Create cron job runner (2 hours)
- Implement schedule creation UI (2 hours)
- Implement schedule management UI (1.5 hours)
- Create email notification system (2 hours)
- Create alert system for regressions (1.5 hours)
- Implement next_run_at calculation (1 hour)
- Test scheduling logic (1 hour)
- Test email notifications (1 hour)

---

## 📈 TRENDING & HISTORY (16 tasks, 15-18 hours)

### ✅ Task 2.37-2.52: Trending Tasks
- Create historical data queries (2 hours)
- Implement trend calculation (1.5 hours)
- Create sparkline component (1.5 hours)
- Create full trend chart (2 hours)
- Implement week-over-week comparison (1.5 hours)
- Implement month-over-month comparison (1.5 hours)
- Create trend report page (3 hours)
- Add export to CSV/PDF (2 hours)
- Test trending calculations (1 hour)

---

# PHASE 3: ENTERPRISE FEATURES (Weeks 6-7)

## 🔗 SEMRUSH INTEGRATION (25 tasks, 20-25 hours)

### ✅ Task 3.1-3.25: Semrush Tasks
- Create Semrush connector (2 hours)
- Implement backlinks API (2 hours)
- Implement referring domains API (1.5 hours)
- Implement organic keywords API (1.5 hours)
- Implement toxic backlinks detection (1.5 hours)
- Update content scorer with backlink data (2 hours)
- Create Backlinks Report tab UI (4 hours)
- Create Keywords Rankings tab UI (3 hours)
- Create competitor keyword gap analysis (3 hours)
- Add advanced recommendations (2 hours)
- Test all Semrush features (2 hours)

---

## 📤 EXPORT & SHARING (12 tasks, 15-18 hours)

### ✅ Task 3.26-3.37: Export Tasks
- Implement PDF export with jsPDF (4 hours)
- Design PDF template (white-label) (3 hours)
- Implement shareable links (2 hours)
- Implement role-based access to shares (2 hours)
- Create export UI (2 hours)
- Test PDF generation (1 hour)
- Test shareable links (1 hour)

---

## 🎯 ADVANCED ATTRIBUTION (8 tasks, 10-12 hours)

### ✅ Task 3.38-3.45: Attribution Tasks
- Map marketing sources to deals (3 hours)
- Calculate ROI from audit improvements (2 hours)
- Create attribution report UI (3 hours)
- Add "Track Impact" feature to recommendations (2 hours)
- Test attribution tracking (1 hour)

---

# NON-REGRESSION CHECKLIST

## ✅ CRITICAL: Existing Features MUST Work

### Test Suite (Run before every merge to main)

```bash
# 1. Core CRM Features
✓ Dashboard loads without errors
✓ Contacts list loads and is filterable
✓ Contact creation works (slide-over opens)
✓ Contact editing works
✓ Contact deletion works

✓ Deals list loads and is filterable
✓ Deal creation works (slide-over opens)
✓ Deal editing works
✓ Deal deletion works
✓ Saved views work

✓ Pipeline board loads
✓ Pipeline drag-and-drop works
✓ Pipeline stage creation works
✓ Pipeline settings work

✓ Tasks list loads
✓ Task creation works (slide-over opens)
✓ Task completion works
✓ Task filtering works

✓ Settings page loads
✓ All settings tabs work
✓ Settings save correctly

# 2. With Feature Flag OFF
✓ Marketing Audit tab NOT visible in sidebar
✓ /marketing-audit route redirects to /dashboard
✓ No console errors
✓ No database queries to audit tables
✓ Page load time unchanged (< ±10%)

# 3. With Feature Flag ON
✓ Marketing Audit tab visible in sidebar
✓ Marketing Audit tab has "New" badge
✓ /marketing-audit route works
✓ Other tabs still work normally
✓ No conflicts in navigation
✓ No console errors

# 4. Database Integrity
✓ RLS policies enforced (no cross-tenant data)
✓ No foreign key violations
✓ All migrations reversible
✓ Existing tables unchanged
✓ Existing queries unchanged

# 5. Performance
✓ Dashboard loads in < 2 seconds
✓ No N+1 query issues
✓ API responses < 500ms (95th percentile)
✓ No memory leaks
✓ No blocking operations

# 6. Mobile & Accessibility
✓ All pages responsive on mobile
✓ Touch interactions work
✓ Keyboard navigation works
✓ Screen reader compatible
✓ WCAG 2.1 AA compliance

# 7. Security
✓ No SQL injection vulnerabilities
✓ No XSS vulnerabilities
✓ API keys not exposed in client
✓ OAuth tokens encrypted
✓ CORS properly configured
```

---

# ROLLBACK PLAN

## If Something Goes Wrong

### Phase 1 Rollback:
```bash
# 1. Disable feature flag
NEXT_PUBLIC_ENABLE_MARKETING_AUDIT=false

# 2. Revert database migration
supabase db reset --db-url <prod-url>
psql -f supabase/migrations/rollback/20250116_marketing_audit_tables_rollback.sql

# 3. Revert code (if needed)
git revert <commit-hash>
git push origin main

# 4. Verify core CRM works
npm run test:e2e:baseline
```

### Partial Rollback (Keep DB, Disable UI):
```bash
# Just disable feature flag
NEXT_PUBLIC_ENABLE_MARKETING_AUDIT=false

# Data preserved, UI hidden
# Can re-enable later without data loss
```

---

# TASK OWNERSHIP MATRIX

| Category | Tasks | Owner | Est. Hours |
|----------|-------|-------|------------|
| **Setup & Infrastructure** | 22 | Tech Lead + DevOps | 8-10 |
| **API Connectors** | 22 | Backend Engineer | 12-15 |
| **Scoring Engine** | 18 | Backend Engineer | 10-12 |
| **Frontend UI** | 48 | Frontend Engineer | 25-30 |
| **API Routes** | 20 | Backend Engineer | 10-12 |
| **Testing** | 20 | QA Engineer | 8-10 |
| **Documentation** | 10 | Technical Writer | 4-5 |
| **Phase 2 Features** | 52 | Full Team | 40-50 |
| **Phase 3 Features** | 45 | Full Team | 50-60 |

---

# SUCCESS CRITERIA

## Phase 1 MVP Launch Criteria:

✅ **Functionality:**
- [ ] Can run audit on any domain with one click
- [ ] All 5 sub-scores calculated correctly
- [ ] Composite score matches formula
- [ ] Top 10 recommendations shown
- [ ] Can create task from recommendation
- [ ] Competitor benchmark table accurate
- [ ] Mobile responsive on iPhone, iPad, Android
- [ ] No console errors in production
- [ ] Feature flag works (on/off)

✅ **Performance:**
- [ ] Audit completes in < 3 minutes
- [ ] Dashboard loads in < 2 seconds
- [ ] API responses < 500ms (95th percentile)
- [ ] No blocking operations on main thread
- [ ] Handles 10 concurrent audits

✅ **Quality:**
- [ ] All unit tests pass (>80% coverage)
- [ ] All E2E tests pass
- [ ] No linter errors
- [ ] No TypeScript errors
- [ ] WCAG 2.1 AA compliant
- [ ] Works in Chrome, Firefox, Safari, Edge

✅ **Non-Breaking:**
- [ ] All existing CRM features work
- [ ] No performance degradation
- [ ] No console errors in existing pages
- [ ] RLS policies enforced
- [ ] No cross-tenant data leakage

✅ **Documentation:**
- [ ] User guide complete
- [ ] Admin guide complete
- [ ] API docs complete
- [ ] Code commented
- [ ] README updated

---

**TOTAL ESTIMATED TIME:**
- Phase 0: 8-10 hours
- Phase 1: 65-80 hours
- Phase 2: 40-50 hours
- Phase 3: 50-60 hours
- **GRAND TOTAL: 163-200 hours (20-25 days of work)**

**TEAM SIZE:** 2-3 engineers (1 backend, 1 frontend, 1 part-time QA)

**TIMELINE:** 6-8 weeks for complete build

---

**This task list is production-ready and can be executed immediately. Every task has clear deliverables, time estimates, and ownership. Follow the sequence for guaranteed success.** 🚀

