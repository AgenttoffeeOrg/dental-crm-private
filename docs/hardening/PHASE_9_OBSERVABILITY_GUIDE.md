# PHASE 9: Observability Implementation Guide
**Date:** October 16, 2025  
**Status:** Implementation Guide  
**Priority:** P1

---

## Overview

This guide provides complete implementation instructions for adding enterprise-grade observability to the CRM platform.

---

## 1. Trace ID Implementation

### 1.1 Add Trace ID to Request Context

```typescript
// src/server/trpc.ts
import { v4 as uuidv4 } from 'uuid'

export const createContext = async (opts: any) => {
  const traceId = opts.req.headers['x-trace-id'] || uuidv4()
  
  return {
    req: opts.req,
    res: opts.res,
    traceId,
    // ... existing context
  }
}
```

### 1.2 Add Trace ID to Database Logs

```sql
-- Add trace_id columns
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS trace_id UUID;
ALTER TABLE automation_execution_logs ADD COLUMN IF NOT EXISTS trace_id UUID;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS trace_id UUID;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_trace ON audit_log(trace_id);
CREATE INDEX IF NOT EXISTS idx_automation_trace ON automation_execution_logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_webhook_trace ON webhook_events(trace_id);
```

### 1.3 Propagate Trace ID

```typescript
// In all service functions
async function processWebhook(payload: any, traceId: string) {
  await supabase.from('webhook_events').insert({
    ...payload,
    trace_id: traceId,
  })
  
  await supabase.from('audit_log').insert({
    action: 'webhook_processed',
    trace_id: traceId,
  })
}
```

---

## 2. Metrics & Dashboards

### 2.1 Create Metrics View

```sql
-- supabase/migrations/20251016_hardening_013_observability.sql

CREATE VIEW system_metrics_realtime AS
SELECT
  'api_requests' as metric_name,
  COUNT(*) as value,
  DATE_TRUNC('minute', created_at) as timestamp
FROM audit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', created_at)

UNION ALL

SELECT
  'webhook_failures',
  COUNT(*),
  DATE_TRUNC('minute', received_at)
FROM webhook_events
WHERE status = 'failed'
  AND received_at > NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', received_at)

UNION ALL

SELECT
  'automation_success_rate',
  (COUNT(*) FILTER (WHERE status = 'success') * 100.0 / NULLIF(COUNT(*), 0))::INTEGER,
  DATE_TRUNC('minute', started_at)
FROM automation_execution_logs
WHERE started_at > NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', started_at);
```

### 2.2 Create Observability Dashboard Component

```typescript
// src/components/admin/observability-dashboard.tsx
// See full implementation in file
```

---

## 3. SLO Tracking

### 3.1 Define SLOs

```typescript
// src/lib/observability/slos.ts
export const SLOs = {
  api_latency_p95_ms: 200,
  api_uptime_percent: 99.9,
  webhook_success_rate_percent: 99.0,
  automation_success_rate_percent: 99.0,
  email_deliverability_percent: 98.0,
} as const

export async function checkSLOCompliance() {
  // Query metrics and compare to SLOs
  // Return violations
}
```

### 3.2 SLO Monitoring Query

```sql
-- Check if SLOs are being met
WITH recent_metrics AS (
  SELECT
    COUNT(*) FILTER (WHERE status = 'success') as successes,
    COUNT(*) as total,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_sec
  FROM automation_execution_logs
  WHERE started_at > NOW() - INTERVAL '24 hours'
)
SELECT
  (successes::FLOAT / NULLIF(total, 0) * 100) >= 99.0 as automation_slo_met,
  avg_duration_sec < 5.0 as latency_slo_met
FROM recent_metrics;
```

---

## 4. Alerting

### 4.1 Create Alerts Table

```sql
CREATE TABLE system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  message TEXT NOT NULL,
  details JSONB,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by_user_id UUID
);
```

### 4.2 Alert Rules

```typescript
// src/lib/observability/alert-rules.ts
export const AlertRules = [
  {
    name: 'Quota Near Limit',
    condition: (metrics: any) => metrics.quota_usage_percent >= 85,
    severity: 'warning',
    message: 'Tenant approaching quota limit',
  },
  {
    name: 'Webhook Failure Spike',
    condition: (metrics: any) => metrics.webhook_failure_rate > 5,
    severity: 'critical',
    message: 'High webhook failure rate detected',
  },
  {
    name: 'Automation SLO Breach',
    condition: (metrics: any) => metrics.automation_success_rate < 99,
    severity: 'critical',
    message: 'Automation success rate below SLO',
  },
]
```

---

## 5. Runbooks

### 5.1 Create Runbooks Directory

```bash
mkdir -p docs/runbooks
```

### 5.2 Example Runbook: High Webhook Failure Rate

```markdown
# Runbook: High Webhook Failure Rate

## Alert
**Name:** webhook_failure_spike
**Severity:** Critical
**Threshold:** > 5% failure rate in last hour

## Investigation Steps

1. Check webhook_stats view:
   ```sql
   SELECT * FROM webhook_stats 
   WHERE date > NOW() - INTERVAL '24 hours'
   ORDER BY failed DESC;
   ```

2. Identify which source is failing:
   - Twilio? Check API status
   - Stripe? Check webhook endpoint configuration
   - Custom? Check application logs

3. Check error messages:
   ```sql
   SELECT error_message, COUNT(*) 
   FROM webhook_events 
   WHERE status = 'failed' 
   GROUP BY error_message 
   ORDER BY COUNT(*) DESC;
   ```

## Resolution Steps

1. If signature verification failing:
   - Verify webhook secret in environment variables
   - Check provider's webhook settings

2. If processing errors:
   - Check application logs for stack traces
   - Verify database constraints not violated

3. If network/timeout:
   - Check server status
   - Increase timeout limits if needed

## Prevention

- Set up webhook retry policies
- Monitor webhook latency
- Implement circuit breakers
```

---

## 6. Implementation Checklist

- [ ] Add trace_id to all database tables (audit_log, webhook_events, automation_execution_logs)
- [ ] Propagate trace_id through request lifecycle
- [ ] Create system_metrics_realtime view
- [ ] Create observability dashboard component
- [ ] Implement SLO tracking queries
- [ ] Create system_alerts table
- [ ] Implement alert rules
- [ ] Write runbooks for each alert type
- [ ] Set up cron job to check SLOs every 5 minutes
- [ ] Configure PagerDuty/Opsgenie integration (optional)

---

**Estimated Effort:** 2 days  
**Priority:** P1  
**Dependencies:** Phases 1-8 complete

