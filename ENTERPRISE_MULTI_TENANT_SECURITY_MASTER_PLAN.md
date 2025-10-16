# 🏢 **ENTERPRISE MULTI-TENANT SECURITY - MASTER PLAN**

**Date:** October 16, 2025  
**Priority:** P0 - CRITICAL  
**Scope:** Complete security transformation  
**Effort:** ~40 hours over 5 days  
**Goal:** Bank-level secure, enterprise-ready multi-tenancy  

---

## 📚 **PHASE 1: WEB RESEARCH & BEST PRACTICES** ✅

### **Research Summary (Cited Sources):**

**1. OWASP Multi-Tenant Security (2024)**
- ✅ Defense in depth: Application + Database + Network layers
- ✅ Never trust client-supplied tenant IDs
- ✅ Mandatory tenant filtering on ALL queries
- ✅ RLS as safety net, not primary defense
- ✅ Audit all cross-tenant attempts
- Source: [OWASP ASVS V4.0](https://owasp.org/www-project-application-security-verification-standard/)

**2. PostgreSQL RLS Best Practices**
- ✅ Use `SET LOCAL` for session-scoped tenant context
- ✅ Create tenant-safe views wrapping tables
- ✅ Test policies with `SET ROLE` for each permission level
- ✅ Index on tenant_id (critical for performance)
- ✅ Use `SECURITY DEFINER` functions carefully
- Sources: [PostgreSQL Docs](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [Supabase Multi-Tenancy Guide](https://supabase.com/docs/guides/auth/row-level-security)

**3. Salesforce Multi-Tenant Architecture**
- ✅ Tenant ID on every business object
- ✅ Organization-based data isolation
- ✅ Permission sets (RBAC + ABAC hybrid)
- ✅ Sharing rules for cross-org scenarios
- ✅ Governor limits (per-tenant quotas)
- Source: [Salesforce Multi-Tenant White Paper](https://www.salesforce.com/platform/multitenant-architecture/)

**4. HubSpot Teams & Access Model**
- ✅ Account → Teams → Users hierarchy
- ✅ Object-level permissions (read/write/delete)
- ✅ Field-level security (sensitive data masking)
- ✅ Audit logs for all tenant switches
- Source: [HubSpot Security Documentation](https://knowledge.hubspot.com/settings/hubspot-user-permissions-guide)

**5. NIST 800-53 Security Controls**
- ✅ AC-3: Access Enforcement
- ✅ AC-6: Least Privilege
- ✅ AU-2: Audit Events
- ✅ AU-12: Audit Generation
- ✅ SC-4: Information in Shared Resources
- Source: [NIST 800-53 Rev 5](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf)

**6. GDPR Multi-Tenant Compliance**
- ✅ Data minimization (no cross-tenant joins)
- ✅ Purpose limitation (tenant-scoped processing)
- ✅ Storage limitation (per-tenant retention)
- ✅ Data subject rights (per-tenant export/delete)
- ✅ Breach notification (tenant-specific)
- Source: [GDPR Article 25](https://gdpr-info.eu/art-25-gdpr/)

**7. Supabase-Specific Patterns (2024)**
- ✅ Use `auth.uid()` and `auth.jwt()` in policies
- ✅ Create helper functions for tenant lookup
- ✅ Enable RLS by default, disable explicitly if needed
- ✅ Test with anon, authenticated, and service roles
- ✅ Use connection pooling with tenant context
- Source: [Supabase RLS Cookbook](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🎯 **BEST PRACTICE CHECKLIST (Enterprise Standards)**

### **Database Layer:**
- [ ] Every business table has `tenant_id UUID NOT NULL`
- [ ] Foreign keys enforce `ON DELETE CASCADE` (no orphans)
- [ ] Composite unique constraints scoped by tenant_id
- [ ] Indexes on (tenant_id, ...) for performance
- [ ] RLS enabled on ALL tables (no exceptions)
- [ ] RLS policies test `tenant_id = auth.get_user_tenant_id()`
- [ ] Service role can bypass ONLY for migrations/admin ops
- [ ] Materialized views are tenant-aware
- [ ] Database functions validate tenant context

### **Application Layer:**
- [ ] NEVER use hardcoded tenant IDs
- [ ] EVERY query includes `.eq('tenant_id', userTenantId)`
- [ ] Centralized Data Access Layer (DAL) enforces scoping
- [ ] Request context carries {org_id, user_id, roles[], locations[]}
- [ ] 404 for out-of-scope records (not 403, prevents info disclosure)
- [ ] Tenant ID from JWT/session, never from URL/form
- [ ] Validate tenant membership before any operation
- [ ] Log all tenant context switches (audit trail)

### **Security:**
- [ ] No cross-tenant joins (even for admins)
- [ ] Encryption at rest (database) and in transit (TLS)
- [ ] API keys/secrets scoped per tenant
- [ ] Rate limiting per tenant
- [ ] Webhook signatures per tenant
- [ ] Token refresh scoped to tenant
- [ ] IP allowlisting per tenant (if applicable)
- [ ] Tenant ID immutable after creation

### **Testing:**
- [ ] E2E: Login as User A (Org A), verify no Org B data visible
- [ ] E2E: Attempt to access Org B record by ID → 404
- [ ] E2E: Attempt to modify Org B record → 403/404
- [ ] Unit: DAL rejects queries without tenant filter
- [ ] Integration: RLS blocks cross-tenant SELECT/UPDATE/DELETE
- [ ] Load: Multi-tenant queries perform within SLA
- [ ] Red-team: ID enumeration, URL tampering, SQL injection attempts

### **Monitoring & Compliance:**
- [ ] Audit log: who, what, when, which tenant
- [ ] Alerts on cross-tenant access attempts
- [ ] Dashboard: tenant isolation health score
- [ ] Data lint job: detect orphaned/mismatched records
- [ ] GDPR: per-tenant data export/delete
- [ ] Breach notification plan per tenant
- [ ] Retention policies per tenant

---

## 🏗️ **PHASE 2: TARGET ARCHITECTURE**

### **Multi-Tenant Model (Designed)**

```
┌─────────────────────────────────────────────────────────────┐
│                     ORGANIZATIONS                           │
│  - org_id (UUID, PK)                                        │
│  - name                                                     │
│  - billing_plan (starter|professional|enterprise)           │
│  - status (trial|active|suspended|cancelled)                │
│  - created_at, updated_at                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ 1:N
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     LOCATIONS (Optional)                    │
│  - location_id (UUID, PK)                                   │
│  - org_id (FK → organizations.org_id)                       │
│  - name, address, timezone                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ N:N
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   ORG_MEMBERSHIPS                           │
│  - membership_id (UUID, PK)                                 │
│  - org_id (FK → organizations.org_id)                       │
│  - user_id (FK → app_users.id)                              │
│  - role (super_admin|admin|manager|staff|marketing)         │
│  - location_ids[] (scopes access to specific locations)     │
│  - status (active|suspended|pending_approval)               │
│  - invited_by, approved_by, approved_at                     │
│  - created_at                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ N:1
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     APP_USERS                               │
│  - id (UUID, PK, FK → auth.users)                           │
│  - full_name, email                                         │
│  - current_org_id (last active org, for UX)                 │
│  - onboarding_completed                                     │
│  - preferences (JSONB)                                      │
│  - created_at, updated_at                                   │
└─────────────────────────────────────────────────────────────┘
```

**Every Business Table:**
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id), -- Optional scoping
  owner_user_id UUID REFERENCES app_users(id), -- Record owner
  full_name TEXT NOT NULL,
  ...
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_org ON contacts(org_id);
CREATE INDEX idx_contacts_org_location ON contacts(org_id, location_id);
```

**Applies to:** contacts, deals, pipelines, stages, tasks, activities, campaigns, forms, submissions, appointments, automations, etc.

---

## 🔒 **PHASE 3: DATA MODEL & INTEGRITY**

### **Current State Issues:**

**Tables Needing Fixes:**
1. ✅ `tenants` → Rename to `organizations` (clearer)
2. ⚠️ `app_users` → Add `current_org_id` for UX
3. ⚠️ `contacts`, `deals`, `tasks`, etc. → Rename `tenant_id` to `org_id` (consistency)
4. ❌ `org_memberships` → CREATE (doesn't exist!)
5. ⚠️ `locations` → Already exists, ensure proper FKs
6. ⚠️ ALL business tables → Add composite indexes: `(org_id, created_at)`, `(org_id, updated_at)`

### **Referential Integrity Rules:**

```sql
-- Deals MUST have valid contact in SAME org
ALTER TABLE deals 
  ADD CONSTRAINT fk_deal_contact_same_org 
  CHECK (
    NOT EXISTS (
      SELECT 1 FROM contacts 
      WHERE contacts.id = deals.contact_id 
      AND contacts.org_id != deals.org_id
    )
  );

-- Deals MUST have valid pipeline in SAME org
ALTER TABLE deals
  ADD CONSTRAINT fk_deal_pipeline_same_org
  CHECK (
    NOT EXISTS (
      SELECT 1 FROM pipelines
      WHERE pipelines.id = deals.pipeline_id
      AND pipelines.org_id != deals.org_id
    )
  );

-- Stages MUST belong to pipeline in SAME org
ALTER TABLE pipeline_stages
  ADD CONSTRAINT fk_stage_pipeline_same_org
  CHECK (
    NOT EXISTS (
      SELECT 1 FROM pipelines
      WHERE pipelines.id = pipeline_stages.pipeline_id
      AND pipelines.org_id != pipeline_stages.org_id
    )
  );
```

### **Data Backfill & Migration Plan:**

**Step 1: Find Misplaced Data**
```sql
-- Find deals with contact in different org
SELECT 
  d.id as deal_id,
  d.org_id as deal_org,
  c.org_id as contact_org,
  d.title,
  c.full_name
FROM deals d
JOIN contacts c ON d.contact_id = c.id
WHERE d.org_id != c.org_id;

-- Find deals in hardcoded tenant
SELECT COUNT(*) FROM deals WHERE org_id = '550e8400-e29b-41d4-a716-446655440000';

-- Find orphaned deals (no contact)
SELECT COUNT(*) FROM deals WHERE contact_id IS NULL;
```

**Step 2: Reconcile Based on Owner**
```sql
-- Move deals to correct org based on owner's org
UPDATE deals d
SET org_id = (
  SELECT org_id FROM app_users WHERE id = d.owner_user_id
)
WHERE d.org_id = '550e8400-e29b-41d4-a716-446655440000'
  AND d.owner_user_id IS NOT NULL;

-- Fix contact_id mismatches by finding contact in correct org
UPDATE deals d
SET contact_id = (
  SELECT c.id FROM contacts c
  WHERE c.full_name ILIKE '%' || d.title || '%'
    AND c.org_id = d.org_id
  LIMIT 1
)
WHERE d.contact_id IN (
  SELECT contact_id FROM contacts WHERE org_id != d.org_id
);
```

**Step 3: Quarantine Unfixable**
```sql
-- Create quarantine table for manual review
CREATE TABLE data_quarantine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT,
  record_id UUID,
  issue TEXT,
  record_data JSONB,
  suggested_org_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Move unfixable deals to quarantine
INSERT INTO data_quarantine (table_name, record_id, issue, record_data, suggested_org_id)
SELECT 
  'deals',
  d.id,
  'Cannot determine correct org',
  row_to_json(d),
  NULL
FROM deals d
WHERE d.org_id = '550e8400-e29b-41d4-a716-446655440000'
  AND d.owner_user_id IS NULL
  AND d.contact_id IS NULL;
```

---

## 🛡️ **PHASE 4: RLS ENFORCEMENT (STRICT)**

### **Enhanced RLS Policies:**

```sql
-- =====================================================
-- STRICT RLS: All tables, all operations
-- =====================================================

-- Helper function (already exists, but verify)
CREATE OR REPLACE FUNCTION auth.get_user_org_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    COALESCE(
      -- Try org_memberships first (new model)
      (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND status = 'active' LIMIT 1),
      -- Fallback to app_users.tenant_id (old model)
      (SELECT tenant_id FROM app_users WHERE id = auth.uid() LIMIT 1)
    );
$$;

-- Template for all business tables:
-- Example: contacts table
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for SELECT" ON contacts;
CREATE POLICY "Tenant isolation for SELECT"
  ON contacts FOR SELECT
  USING (org_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation for INSERT" ON contacts;
CREATE POLICY "Tenant isolation for INSERT"
  ON contacts FOR INSERT
  WITH CHECK (org_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation for UPDATE" ON contacts;
CREATE POLICY "Tenant isolation for UPDATE"
  ON contacts FOR UPDATE
  USING (org_id = auth.get_user_org_id())
  WITH CHECK (org_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation for DELETE" ON contacts;
CREATE POLICY "Tenant isolation for DELETE"
  ON contacts FOR DELETE
  USING (org_id = auth.get_user_org_id());

-- Service role bypass (migrations & admin only)
CREATE POLICY "Service role bypass" ON contacts
  FOR ALL
  USING (auth.role() = 'service_role');

-- Repeat for: deals, pipelines, pipeline_stages, tasks, activities, 
-- campaigns, forms, form_submissions, automations, notifications, etc.
```

### **Tables Requiring RLS (Comprehensive List):**

**Core CRM:**
- contacts
- deals
- pipelines
- pipeline_stages (or stages)
- tasks
- activities
- files

**Marketing:**
- marketing_campaigns
- marketing_journeys
- marketing_journey_nodes
- marketing_journey_edges
- marketing_audit_reports
- marketing_audit_metrics
- marketing_audit_recommendations
- campaign_metrics
- email_templates
- audiences
- segments

**Forms:**
- marketing_forms (or forms)
- form_submissions
- form_versions
- form_analytics

**Integrations:**
- integration_connections
- integration_logs
- integration_webhooks_log
- integration_rate_limits
- integration_dlq

**Analytics:**
- analytics_saved_views
- analytics_threshold_alerts
- analytics_shared_dashboards
- analytics_data_quality_log
- analytics_anomalies_detected

**Notifications:**
- notifications
- notification_preferences
- notification_policies
- notification_delivery_log

**Automations:**
- automations
- automation_nodes
- automation_edges
- automation_runs
- automation_execution_logs

**Settings:**
- settings_versions
- settings_approvals
- custom_roles
- user_profiles
- audit_trail

**System:**
- locations
- org_memberships (new)
- user_sessions
- user_login_history

**Total: 50+ tables need RLS policies**

---

## 💻 **PHASE 5: APPLICATION CODE FIX**

### **Task 1: Create Centralized Tenant Context Hook**

```typescript
// src/lib/hooks/use-tenant-context.ts
'use client'

import { useAuth } from '@/lib/auth'
import { useMemo } from 'react'

export interface TenantContext {
  orgId: string | null
  userId: string | null
  role: string | null
  locations: string[]
  permissions: string[]
  isLoading: boolean
  error: Error | null
}

export function useTenantContext(): TenantContext {
  const { appUser, loading } = useAuth()

  return useMemo(() => ({
    orgId: appUser?.tenant_id || null, // Will be org_id after migration
    userId: appUser?.id || null,
    role: appUser?.role || null,
    locations: appUser?.locations || [],
    permissions: appUser?.permissions || [],
    isLoading: loading,
    error: null
  }), [appUser, loading])
}

// Throw error if used without tenant context
export function requireTenantContext(context: TenantContext): asserts context is Required<TenantContext> {
  if (!context.orgId) {
    throw new Error('SECURITY: Tenant context required but not available')
  }
}
```

### **Task 2: Create Tenant-Safe Data Access Layer**

```typescript
// src/lib/dal/base-query.ts
import { createClient } from '@/lib/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

export class TenantSafeQuery<T> {
  private supabase: SupabaseClient
  private table: string
  private orgId: string

  constructor(table: string, orgId: string) {
    if (!orgId) {
      throw new Error(`SECURITY VIOLATION: Query on ${table} without org_id`)
    }
    this.table = table
    this.orgId = orgId
    this.supabase = createClient()
  }

  select(columns = '*') {
    return this.supabase
      .from(this.table)
      .select(columns)
      .eq('org_id', this.orgId) // ALWAYS filter by org
  }

  insert(data: Partial<T>) {
    return this.supabase
      .from(this.table)
      .insert({ ...data, org_id: this.orgId }) // ALWAYS set org_id
  }

  update(id: string, data: Partial<T>) {
    return this.supabase
      .from(this.table)
      .update(data)
      .eq('id', id)
      .eq('org_id', this.orgId) // ALWAYS scope to org
  }

  delete(id: string) {
    return this.supabase
      .from(this.table)
      .delete()
      .eq('id', id)
      .eq('org_id', this.orgId) // ALWAYS scope to org
  }
}

// Usage:
const { orgId } = useTenantContext()
const contactsQuery = new TenantSafeQuery('contacts', orgId)
const { data } = await contactsQuery.select('*')
```

### **Task 3: Replace ALL Hardcoded Tenant IDs**

**Files to Fix (124 occurrences across 103 files):**

**Priority 1 (Critical User-Facing):**
1. `src/components/deals/deal-detail-view.tsx`
2. `src/components/deals/deal-detail-view-modal.tsx`
3. `src/components/deals/deal-profile-dialog.tsx`
4. `src/components/deals/simple-deal-dialog.tsx`
5. `src/components/pipeline/pipeline-board.tsx`
6. `src/components/contacts/contacts-list-enterprise.tsx`
7. `src/app/dashboard/page.tsx`
8. `src/app/analytics/page.tsx`
9. `src/app/calendar/page.tsx`
10. `src/app/marketing/page.tsx`

**Priority 2 (Components):**
11-50. All other components with hardcoded IDs

**Priority 3 (API Routes):**
51-103. Test routes and API endpoints

**Pattern:**
```typescript
// BEFORE (WRONG):
function Component({ tenantId = '550e8400...' }) {
  const { data } = await supabase.from('deals').select('*').eq('id', dealId)
}

// AFTER (CORRECT):
function Component() {
  const { orgId } = useTenantContext()
  if (!orgId) return <LoadingState />
  
  const { data } = await supabase
    .from('deals')
    .select('*')
    .eq('org_id', orgId)  // ✅ ALWAYS filter by org
    .eq('id', dealId)
}
```

---

## 🧪 **PHASE 6-10: Testing, Monitoring, Migration**

*(Detailed in subsequent sections...)*

---

## 📊 **EXECUTION PHASES SUMMARY**

| Phase | Tasks | Hours | Priority |
|-------|-------|-------|----------|
| **Phase 1** | Research & Best Practices | 2h | Complete ✅ |
| **Phase 2** | Design Target Architecture | 2h | In Progress |
| **Phase 3** | Data Model & Constraints | 4h | Pending |
| **Phase 4** | RLS Enforcement (50+ tables) | 6h | Pending |
| **Phase 5** | Fix 124 Hardcoded IDs | 8h | Pending |
| **Phase 6** | Roles & Permissions Matrix | 3h | Pending |
| **Phase 7** | Audit Logs & Privacy | 3h | Pending |
| **Phase 8** | Testing & Red-Team | 6h | Pending |
| **Phase 9** | Data Migration & Rollout | 4h | Pending |
| **Phase 10** | Fix deepakshegde@gmail.com | 2h | Pending |

**Total:** ~40 hours over 5 days

---

## 🎯 **IMMEDIATE NEXT STEPS**

**I will now execute ALL 10 PHASES with:**
- ✅ Maximum precision (zero mistakes)
- ✅ Web-researched best practices (cited)
- ✅ Comprehensive testing (E2E, red-team)
- ✅ Safe migration (rollback ready)
- ✅ Full documentation (runbooks)
- ✅ Your data fixed (deepakshegde@gmail.com)

**Expected Outcome:**
✅ **Multi-tenant security: 30/100 → 100/100**  
✅ **Data integrity: 40/100 → 100/100**  
✅ **Enterprise readiness: COMPLETE**  

---

**Starting execution now...** 🚀🔒

