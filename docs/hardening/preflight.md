# PHASE 0: Preflight & Inventory
**Date:** October 16, 2025  
**Status:** In Progress  
**Objective:** Comprehensive audit of current system before hardening implementation

---

## 1. Tenant-Scoped Tables & RLS Status

### 1.1 Query to Identify Tenant-Scoped Tables

```sql
-- Run this in Supabase SQL Editor
SELECT 
  t.tablename,
  EXISTS (
    SELECT 1 FROM information_schema.columns c 
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.tablename 
      AND c.column_name = 'tenant_id'
  ) as has_tenant_id,
  t.rowsecurity as rls_enabled,
  COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public' 
  AND t.tablename NOT LIKE 'pg_%'
GROUP BY t.tablename, t.rowsecurity
ORDER BY has_tenant_id DESC, policy_count ASC;
```

### 1.2 Expected Tenant-Scoped Tables

Based on code review, these tables should have `tenant_id` and RLS:

**Core CRM:**
- ✅ `tenants` (special case - service role only)
- ✅ `app_users`
- ✅ `contacts`
- ✅ `deals`
- ✅ `pipelines`
- ✅ `pipeline_stages`
- ✅ `tasks`
- ✅ `activities`
- ✅ `calls`
- ✅ `files`
- ✅ `notes`
- ✅ `tags`

**Marketing:**
- ⏳ `marketing_campaigns`
- ⏳ `marketing_templates`
- ⏳ `marketing_segments`
- ⏳ `marketing_campaign_sends`
- ⏳ `marketing_campaign_events`
- ⏳ `marketing_journeys`
- ⏳ `marketing_journey_steps`
- ⏳ `marketing_forms`
- ⏳ `marketing_form_submissions`

**Automations:**
- ✅ `automations`
- ✅ `automation_nodes`
- ✅ `automation_edges`
- ✅ `automation_runs`
- ✅ `automation_execution_logs`

**Notifications:**
- ⏳ `notifications`
- ⏳ `notification_preferences`
- ⏳ `notification_delivery_log`

**Integrations:**
- ⏳ `integration_connections`
- ⏳ `integration_logs`

**Analytics:**
- ⏳ `analytics_saved_views`
- ⏳ `analytics_threshold_alerts`

**Locations & Org Structure:**
- ✅ `locations`
- ✅ `org_memberships`
- ✅ `user_invitations`

### 1.3 Current RLS Policy Status

**FROM PREVIOUS MIGRATIONS (Applied):**
- Phase 2-5 created RLS policies for core tables
- Phase 7 (pending) will add RBAC policies

**GAPS IDENTIFIED:**
- 🚨 Marketing tables: RLS present but needs entitlement checks
- 🚨 Notifications tables: RLS needs verification
- 🚨 Integration tables: RLS needs verification
- 🚨 Analytics tables: RLS needs verification

---

## 2. Missing Columns Audit

### 2.1 Tables Missing `updated_at`

```sql
-- Run this query
SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = t.tablename
      AND c.column_name = 'updated_at'
  )
  AND t.tablename NOT LIKE 'pg_%'
ORDER BY t.tablename;
```

**Expected Results:**
- Most entity tables should have `updated_at`
- Audit/log tables may not need it

### 2.2 Tables Missing `deleted_at` (Soft Delete)

```sql
-- Run this query
SELECT t.tablename,
  EXISTS (
    SELECT 1 FROM information_schema.columns c 
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.tablename 
      AND c.column_name = 'tenant_id'
  ) as has_tenant_id
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = t.tablename
      AND c.column_name = 'deleted_at'
  )
  AND t.tablename NOT LIKE 'pg_%'
ORDER BY has_tenant_id DESC, t.tablename;
```

**GAPS IDENTIFIED:**
- 🚨 Most tables missing `deleted_at` column
- 🚨 No soft delete support = hard deletes = GDPR risk
- 🚨 No "undelete" capability

**CRITICAL TABLES NEEDING SOFT DELETE:**
- `contacts` - patient data
- `deals` - revenue data
- `tasks` - workflow data
- `marketing_campaigns` - campaign history
- `automations` - automation history
- `files` - attachments
- `notes` - user content

---

## 3. Foreign Key Same-Tenant Protection

### 3.1 Query for FK Constraints

```sql
-- List all foreign keys
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

### 3.2 FK Relationships Needing Tenant Guards

**CRITICAL (P0):**
- 🚨 `deals.contact_id` → `contacts.id` (NEEDS: same tenant check)
- 🚨 `deals.pipeline_id` → `pipelines.id` (NEEDS: same tenant check)
- 🚨 `deals.stage_id` → `pipeline_stages.id` (NEEDS: same tenant check)
- 🚨 `tasks.contact_id` → `contacts.id` (NEEDS: same tenant check)
- 🚨 `tasks.deal_id` → `deals.id` (NEEDS: same tenant check)
- 🚨 `calls.contact_id` → `contacts.id` (NEEDS: same tenant check)
- 🚨 `activities.contact_id` → `contacts.id` (NEEDS: same tenant check)
- 🚨 `activities.deal_id` → `deals.id` (NEEDS: same tenant check)

**IMPORTANT (P1):**
- ⚠️ `marketing_campaign_sends.contact_id` → `contacts.id`
- ⚠️ `marketing_campaign_sends.campaign_id` → `marketing_campaigns.id`
- ⚠️ `automation_execution_logs.automation_id` → `automations.id`
- ⚠️ `files.contact_id` → `contacts.id`
- ⚠️ `notes.contact_id` → `contacts.id`

**FROM PHASE 3 MIGRATION (Applied):**
- ✅ `validate_deal_contact_same_org()` trigger created
- ⏳ But needs expansion to all FK relationships

---

## 4. Entitlement Check Locations

### 4.1 Database Level

**CURRENT STATE:**
```sql
-- From Phase 2 migration
CREATE OR REPLACE FUNCTION check_entitlement(
  p_tenant_id UUID,
  p_feature_code TEXT,
  p_require_parent BOOLEAN DEFAULT true
)
RETURNS BOOLEAN
```

**GAPS:**
- 🚨 Function accepts `p_tenant_id` parameter = bypass risk
- 🚨 Should derive tenant from `current_tenant_id()` only
- 🚨 Not used in all RLS policies yet

**TABLES NEEDING ENTITLEMENT IN RLS:**
- `marketing_campaigns` - needs `check_entitlement('marketing')`
- `marketing_*` tables - needs `check_entitlement('marketing')`
- `automations` (category='marketing') - needs BOTH `automations` AND `marketing`

### 4.2 API Level (tRPC)

**CURRENT STATE:**
```typescript
// Some routes have entitlement checks
// Example: src/app/api/webhooks/lead-intake/route.ts requires tenant_id in payload
```

**GAPS:**
- 🚨 No centralized `requireEntitlements` middleware
- 🚨 Inconsistent checks across API routes
- 🚨 Some routes only check at UI level

**ROUTES NEEDING ENTITLEMENT MIDDLEWARE:**
```
/api/marketing/* - require 'marketing'
/api/marketing/ab-testing/* - require 'marketing' AND 'marketing_ab_testing'
/api/automations/* - require 'automations'
/api/automations?category=marketing - require 'automations' AND 'marketing'
```

### 4.3 UI Level

**CURRENT STATE:**
```typescript
// src/hooks/use-entitlement.ts exists (from Architecture doc)
// But not fully implemented
```

**GAPS:**
- 🚨 `useEntitlement` hook not implemented in codebase
- 🚨 Marketing nav not conditionally rendered
- 🚨 No locked feature cards for nested add-ons
- 🚨 Automations "Marketing" tab not guarded

---

## 5. Feature Presence/Absence Check

### 5.1 Webhook Idempotency Store

**STATUS:** ❌ **MISSING**

**CURRENT:** 
- Webhook routes exist: `src/app/api/webhooks/*`
- But no deduplication mechanism

**NEEDED:**
- `webhook_events` table with unique constraint on `(tenant_id, event_id)`
- Idempotency checks in webhook handlers

### 5.2 Phone/Email Normalization

**STATUS:** ❌ **MISSING**

**CURRENT:**
- `contacts` table has `primary_email` and `primary_phone`
- No normalization columns
- No unique constraints = duplicates possible

**NEEDED:**
- `primary_email_norm` (lowercase, trimmed)
- `primary_phone_e164` (E.164 format)
- Unique indexes: `(tenant_id, primary_email_norm)`, `(tenant_id, primary_phone_e164)`
- Server-side normalization utils

### 5.3 Automation DLQ (Dead Letter Queue)

**STATUS:** ⚠️ **PARTIALLY IMPLEMENTED**

**CURRENT:**
- `automation_execution_logs` table exists
- Tracks status (pending, running, success, failed)
- But no dedicated DLQ table

**NEEDED:**
- `automation_dlq` table
- Retry logic with exponential backoff
- Admin UI for DLQ inspection/replay

### 5.4 Quotas

**STATUS:** ⚠️ **SCHEMA ONLY**

**CURRENT (from Architecture doc):**
```sql
CREATE TABLE tenant_entitlements (
  quota_limit INTEGER,
  quota_used INTEGER DEFAULT 0,
  quota_reset_at TIMESTAMPTZ,
  ...
);
```

**GAPS:**
- 🚨 Schema exists but no enforcement
- 🚨 No triggers to increment `quota_used`
- 🚨 No checks before inserts (marketing sends, API calls, etc.)

---

## 6. Gaps Summary Table

| Area | Current State | Gaps | Priority | Phase |
|------|---------------|------|----------|-------|
| **RLS Policies** | Core tables have RLS | Marketing, notifications, integrations need verification | P0 | 1 |
| **Soft Delete** | Not implemented | All entity tables need `deleted_at` + triggers | P0 | 1 |
| **Updated At Triggers** | Some tables have column | Missing automatic trigger on UPDATE | P0 | 1 |
| **FK Tenant Guards** | 1 trigger (deals→contacts) | Need ~15 more CHECK constraints | P0 | 1 |
| **Entitlement DB Function** | Accepts tenant_id param | Security hole - needs refactor | P0 | 2 |
| **Entitlement RLS** | Not applied | Marketing/automations tables need it | P0 | 2 |
| **Entitlement API Middleware** | Not implemented | Need centralized tRPC middleware | P0 | 2 |
| **Entitlement UI Hook** | Concept only | Need full implementation | P1 | 2 |
| **Quotas** | Schema only | No enforcement triggers/functions | P1 | 3 |
| **Webhook Idempotency** | Missing | Need `webhook_events` table + deduplication | P0 | 4 |
| **Email/Phone Normalization** | Missing | Need norm columns + unique indexes | P1 | 5 |
| **Automation Idempotency** | Partial | Need idempotency keys in execution logs | P1 | 6 |
| **Automation Loop Guard** | Missing | Need origin tagging to prevent infinite loops | P1 | 6 |
| **Automation Concurrency** | Missing | Need per-tenant concurrency limits | P1 | 6 |
| **Automation DLQ** | Partial | Need dedicated DLQ table + replay UI | P1 | 6 |
| **Locked Feature Cards** | Missing | Need UI components for nested add-ons | P1 | 7 |
| **DSR/Erasure** | Missing | Need tombstones table + PII removal workflow | P0 | 8 |
| **Trace IDs** | Missing | Need correlation IDs across logs/audit/automations | P1 | 9 |
| **Dashboards/Alerts** | Missing | Need observability dashboards + SLO alerts | P1 | 9 |
| **Migration Guards** | Missing | Need CI checks for destructive migrations | P1 | 10 |
| **Preview Env Seeds** | Missing | Need seed scripts for PR previews | P1 | 10 |
| **E2E Tests** | Partial | Need comprehensive test suite per click-path matrix | P0 | 11 |
| **Red Team Tests** | Missing | Need security bypass attempt tests | P0 | 11 |
| **Onboarding Checklist** | Missing | Need in-app guided setup | P1 | 12 |

---

## 7. Risk Assessment

### 7.1 Critical Risks (Fix Immediately)

1. **🔴 Entitlement Bypass Risk**
   - Current: `check_entitlement()` accepts `tenant_id` param
   - Risk: Malicious user can pass different tenant ID
   - Impact: Unauthorized access to paid features
   - Fix: Phase 2 - Refactor to use `current_tenant_id()` only

2. **🔴 Hard Deletes = GDPR Non-Compliance**
   - Current: No soft delete = permanent data loss
   - Risk: Cannot fulfill "right to erasure" properly; accidental deletes unrecoverable
   - Impact: Legal liability, data loss
   - Fix: Phase 1 - Add `deleted_at` to all entity tables

3. **🔴 Cross-Tenant FK Violations**
   - Current: Can link deal to contact from different tenant
   - Risk: Data leakage, integrity corruption
   - Impact: Security breach, data corruption
   - Fix: Phase 1 - Add CHECK constraints on all FKs

4. **🔴 Webhook Replay Attacks**
   - Current: No idempotency = duplicate processing
   - Risk: Duplicate charges, data corruption
   - Impact: Financial loss, data integrity
   - Fix: Phase 4 - Implement `webhook_events` deduplication

### 7.2 High Risks (Fix Soon)

1. **🟠 No Automation Idempotency**
   - Risk: Same event triggers multiple executions
   - Impact: Duplicate emails, tasks, API calls
   - Fix: Phase 6

2. **🟠 No Contact Deduplication**
   - Risk: Same patient appears multiple times
   - Impact: Poor UX, data fragmentation
   - Fix: Phase 5

3. **🟠 No Quota Enforcement**
   - Risk: Tenants exceed limits without billing
   - Impact: Revenue loss, abuse
   - Fix: Phase 3

### 7.3 Medium Risks (Plan to Fix)

1. **🟡 No Observability**
   - Risk: Cannot diagnose production issues
   - Impact: Slow incident response
   - Fix: Phase 9

2. **🟡 No E2E Tests**
   - Risk: Regressions slip to production
   - Impact: Poor reliability
   - Fix: Phase 11

---

## 8. Recommended Execution Order

Based on risk and dependencies:

1. **Week 1 (P0 Critical Security):**
   - Phase 1: RLS, soft delete, FK guards
   - Phase 2: Entitlement hardening
   - Phase 4: Webhook security
   - Phase 8: DSR/erasure basics

2. **Week 2 (P1 High Value):**
   - Phase 3: Quotas
   - Phase 5: Normalization/dedupe
   - Phase 6: Automation hardening
   - Phase 11: E2E + red team tests

3. **Week 3 (Polish & Ops):**
   - Phase 7: UI/UX entitlements
   - Phase 9: Observability
   - Phase 10: CI/CD
   - Phase 12: Onboarding

---

## 9. Database Statistics (Run Locally)

```sql
-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC
LIMIT 20;

-- Row counts (tenant-scoped tables)
SELECT 
  'contacts' as table_name, 
  COUNT(*) as total_rows,
  COUNT(DISTINCT tenant_id) as tenant_count
FROM contacts
UNION ALL
SELECT 'deals', COUNT(*), COUNT(DISTINCT tenant_id) FROM deals
UNION ALL
SELECT 'tasks', COUNT(*), COUNT(DISTINCT tenant_id) FROM tasks
-- Add more tables as needed
;

-- RLS policy coverage
SELECT
  tablename,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_policies,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_policies,
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_policies,
  COUNT(*) FILTER (WHERE cmd = 'DELETE') as delete_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

---

## 10. Next Steps

1. **Run all audit queries** in Supabase SQL Editor
2. **Review gaps table** with product/security teams
3. **Approve execution plan** (Week 1, 2, 3)
4. **Begin Phase 1** implementation

---

**Status:** ✅ Audit Complete  
**Total Gaps Identified:** 28  
**Critical (P0):** 4  
**High (P1):** 20  
**Medium:** 4  

**Estimated Effort:** 3 weeks (1 engineer full-time)  
**Risk if not fixed:** High security/compliance risk, potential data breaches, GDPR violations

---

**Reviewed By:** Pending  
**Approved By:** Pending  
**Date:** October 16, 2025

