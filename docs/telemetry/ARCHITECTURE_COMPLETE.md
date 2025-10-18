# 🏗️ ADMIN-TELEMETRY PLATFORM - COMPLETE ARCHITECTURE
## **Observability + Control Plane**

**Version:** 2.0 (Revised)  
**Date:** October 18, 2025  
**Purpose:** 
1. **Track CRM usability and adoption** (Analytics)
2. **Manage all accounts from admin panel** (Control Plane)

---

## 🎯 PLATFORM PURPOSE (CLARIFIED)

### Primary Goals:

#### **1. OBSERVABILITY (Analytics/Telemetry)**
**What it does:**
- ✅ Track how users interact with the CRM
- ✅ Measure feature adoption across all orgs
- ✅ Understand what works and what doesn't
- ✅ Identify drop-off points
- ✅ Measure retention and engagement

**Why you need it:**
- See which features customers actually use
- Find usability issues (high error rates, abandoned flows)
- Make data-driven product decisions
- Identify power users vs struggling users

---

#### **2. CONTROL PLANE (Super Admin Management)**
**What it does:**
- ✅ View and manage ALL customer accounts (orgs/tenants)
- ✅ Enable/disable features for any account
- ✅ Grant access to paid features for testing/support
- ✅ Impersonate users to debug issues
- ✅ Override billing/quotas
- ✅ View any org's data (support mode)

**Why you need it:**
- Quickly enable features for demos/testing
- Support: "This customer says X doesn't work" → Login as them and see
- Grant beta features to select customers
- Override trial limits for VIP customers
- Emergency access to fix customer issues

---

## 📐 REVISED HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│              DENTAL-CRM (Production)                    │
│  - Multi-tenant SaaS                                    │
│  - Each org sees only their data (RLS)                  │
│  - Feature flags controlled by entitlements             │
└────────────┬────────────────────────────────────────────┘
             │
             │ (Read-Only + Control APIs)
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│         ADMIN-TELEMETRY PLATFORM (Your Platform)        │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │          OBSERVABILITY SIDE                    │    │
│  │  (Track what users do)                         │    │
│  │                                                 │    │
│  │  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │  Ingestion   │  │  Processor   │           │    │
│  │  │  (Mode A/B)  │  │  (Analytics) │           │    │
│  │  └──────┬───────┘  └──────┬───────┘           │    │
│  │         │                  │                    │    │
│  │         ▼                  ▼                    │    │
│  │  ┌────────────────────────────────┐            │    │
│  │  │   Telemetry DB                 │            │    │
│  │  │   - events_raw                 │            │    │
│  │  │   - sessions                   │            │    │
│  │  │   - funnels, cohorts           │            │    │
│  │  └────────────────────────────────┘            │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │           CONTROL PLANE SIDE                   │    │
│  │   (Manage accounts, enable features)           │    │
│  │                                                 │    │
│  │  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │  Org Manager │  │Feature Flag  │           │    │
│  │  │  (CRUD)      │  │   Manager    │           │    │
│  │  └──────┬───────┘  └──────┬───────┘           │    │
│  │         │                  │                    │    │
│  │         ▼                  ▼                    │    │
│  │  ┌────────────────────────────────┐            │    │
│  │  │   Control DB (or CRM DB)       │            │    │
│  │  │   - tenants (read/write)       │            │    │
│  │  │   - tenant_entitlements        │            │    │
│  │  │   - feature_flags              │            │    │
│  │  │   - admin_audit_log            │            │    │
│  │  └────────────────────────────────┘            │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │              ADMIN UI (Unified)                │    │
│  │                                                 │    │
│  │  LEFT NAV:                                     │    │
│  │  📊 Analytics                                  │    │
│  │     - Dashboard (DAU/WAU/MAU)                 │    │
│  │     - Feature Adoption                         │    │
│  │     - Funnels & Retention                     │    │
│  │                                                 │    │
│  │  🏢 Organizations                              │    │
│  │     - All Orgs (table, search)                │    │
│  │     - Org Detail (view their data)            │    │
│  │     - Enable Features (toggle switches)        │    │
│  │     - Impersonate (login as org)              │    │
│  │                                                 │    │
│  │  👥 Users                                      │    │
│  │     - All Users (cross-org search)            │    │
│  │     - User Activity                            │    │
│  │     - Impersonate User                         │    │
│  │                                                 │    │
│  │  🎛️ Feature Flags                             │    │
│  │     - Global Flags (all orgs)                 │    │
│  │     - Per-Org Overrides                       │    │
│  │     - Rollout % (gradual rollout)             │    │
│  │                                                 │    │
│  │  🔐 Access Control                            │    │
│  │     - Who accessed what org when              │    │
│  │     - Audit trail (all admin actions)         │    │
│  └────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

---

## 🎯 USE CASES (CONCRETE EXAMPLES)

### **Use Case 1: Track Feature Adoption**

**Scenario:** You launched "AI Assistant" feature. Want to know if anyone uses it.

**What you do:**
1. Open Admin Panel → Analytics → Feature Adoption
2. See chart: "AI Assistant" used by 30% of orgs
3. Drill down: Which orgs? Which users?
4. Discover: Only Enterprise plans use it
5. Decision: Market it better to Professional plans

**Technical:**
- Telemetry tracks: `event_type: feature_used`, `event_name: ai_assistant_opened`
- Aggregator computes: `unique_orgs` / `total_orgs` = 30%
- UI shows bar chart

---

### **Use Case 2: Enable Feature for Specific Customer**

**Scenario:** Customer "Dr. Smith Dental" wants to try "Multi-Location" feature (normally paid).

**What you do:**
1. Open Admin Panel → Organizations
2. Search "Dr. Smith Dental"
3. Click org → "Features" tab
4. Toggle "Multi-Location" → ON
5. Save → Feature immediately enabled for that org

**Technical:**
```sql
-- Admin UI sends:
POST /api/admin/orgs/abc-123/features
{ "feature_key": "multi_location", "enabled": true }

-- API updates CRM DB:
INSERT INTO tenant_entitlements (tenant_id, feature_key, granted_by, reason)
VALUES ('abc-123', 'multi_location', 'admin_user_id', 'Beta tester');

-- CRM reads this table to show/hide features
SELECT * FROM tenant_entitlements WHERE tenant_id = 'abc-123';
```

---

### **Use Case 3: Debug Customer Issue**

**Scenario:** Customer says "I can't create a deal, it just spins forever."

**What you do:**
1. Open Admin Panel → Organizations → Search customer
2. Click "Impersonate" → You're now logged in AS them
3. Try creating a deal → You see the same error
4. Check Admin Panel → Errors tab → See: "deal_validation_failed, field: contact_id required"
5. Fix: Contact them, tell them to select a contact first

**Technical:**
- Impersonate: Generate short-lived JWT with their `user_id`, `tenant_id`
- Telemetry shows error: `event_type: error`, `error_class: ValidationError`
- All impersonation logged: `admin_audit_log` (who, what org, when)

---

### **Use Case 4: Find Usability Issues**

**Scenario:** Want to know where users drop off in signup flow.

**What you do:**
1. Open Admin Panel → Funnels
2. Create funnel: "Signup Flow"
   - Step 1: Visited `/sign-up`
   - Step 2: Submitted email
   - Step 3: Verified email
   - Step 4: Created first contact
3. See conversion: 100% → 80% → 60% → 30%
4. Drop-off: 60% → 30% (after email verify, don't create contact)
5. Hypothesis: Onboarding is confusing
6. Action: Add onboarding checklist

**Technical:**
- Telemetry tracks pageviews + events
- Funnel processor: Groups users by cohort, counts conversions
- UI: Shows funnel chart (Sankey diagram)

---

## 📊 ADMIN UI - DETAILED PAGES

### **Page 1: Analytics Dashboard** (`/admin/analytics`)

**Purpose:** See platform-wide metrics

**Sections:**

#### **Top KPIs (Cards)**
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Total Orgs      │ Total Users     │ DAU             │ Signups (30d)  │
│ 847             │ 3,291           │ 1,247           │ +87 (↑12%)     │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

#### **DAU/WAU/MAU Trend (Line Chart)**
- Last 90 days
- 3 lines: Daily, Weekly, Monthly active users

#### **Feature Adoption (Bar Chart)**
- Top 10 features by usage %
- Example: Pipeline (95%), Contacts (92%), AI Assistant (30%)

#### **Signups Over Time (Line Chart)**
- Last 6 months
- New orgs per week

#### **Error Rate (Line Chart)**
- Last 7 days
- Errors per hour (grouped by type)

---

### **Page 2: Organizations** (`/admin/organizations`)

**Purpose:** Manage all customer accounts

**Table (Sortable, Searchable):**

| Org Name | Plan | Users | Created | Last Active | MRR | Actions |
|----------|------|-------|---------|-------------|-----|---------|
| Dr. Smith Dental | Pro | 5 | 2024-03-15 | 2 hours ago | $99 | **View** \| **Edit** \| **Impersonate** |
| Central Dental Group | Enterprise | 47 | 2023-11-02 | 10 min ago | $499 | **View** \| **Edit** \| **Impersonate** |

**Actions:**
- **View** → Go to Org Detail page
- **Edit** → Update org settings (name, plan, limits)
- **Impersonate** → Login as org owner (audit logged)

**Filters:**
- Plan: All, Free, Professional, Enterprise
- Status: Active, Trial, Churned
- Last Active: Today, Week, Month, 90+ days ago

---

### **Page 3: Organization Detail** (`/admin/organizations/[id]`)

**Purpose:** Deep dive into one org

**Tabs:**

#### **Tab 1: Overview**
```
┌─────────────────────────────────────────────────────┐
│ Dr. Smith Dental (ID: abc-123)                     │
│ Plan: Professional | Status: Active | MRR: $99     │
│ Created: 2024-03-15 | Last Active: 2 hours ago     │
│ Owner: john@drsmith.com | Users: 5/10 seats        │
└─────────────────────────────────────────────────────┘

📊 Usage Score: 68/100 (Good)
  - Logs in daily ✅
  - Uses 8/15 features ⚠️
  - No errors in 7 days ✅

🎯 Health Score: 72/100 (At Risk)
  - Engagement trending down 📉
  - Hasn't created contact in 14 days ⚠️
  - Support tickets: 2 this month
```

#### **Tab 2: Features**
```
Toggle switches for ALL features:
┌─────────────────────────────────────┐
│ ✅ Multi-Location (Enabled)        │ [Toggle]
│ ❌ AI Assistant (Not Enabled)      │ [Toggle]
│ ✅ Marketing Campaigns (Enabled)    │ [Toggle]
│ ✅ API Access (Enabled)             │ [Toggle]
│ ❌ White Label (Not Enabled)       │ [Toggle]
└─────────────────────────────────────┘

[Save Changes]

History:
- 2024-10-15: admin@yourcompany.com enabled "Multi-Location"
- 2024-09-03: admin@yourcompany.com enabled "API Access"
```

**Behind the scenes:**
```sql
-- When you toggle a feature:
INSERT INTO tenant_entitlements (tenant_id, feature_key, enabled, granted_by)
VALUES ('abc-123', 'ai_assistant', true, 'admin_user_id');

-- CRM checks this table:
SELECT * FROM tenant_entitlements 
WHERE tenant_id = current_user_tenant_id();

-- If feature exists and enabled = true, show feature
```

#### **Tab 3: Users**
- List all users in this org
- See their activity (last login, events count)
- Impersonate individual user

#### **Tab 4: Activity**
- Timeline of all events from this org (last 30 days)
- Sessions list
- Most used features

#### **Tab 5: Analytics**
- Feature usage heatmap (this org only)
- Session duration trend
- Error rate

#### **Tab 6: Billing**
- Current plan
- Usage vs limits (API calls, seats, storage)
- Override limits (admin superpower)
- Payment history (if integrated)

---

### **Page 4: Users (Cross-Org)** (`/admin/users`)

**Purpose:** Search and manage users across ALL orgs

**Table:**

| Name | Email | Org | Role | Last Active | Actions |
|------|-------|-----|------|-------------|---------|
| John Smith | john@drsmith.com | Dr. Smith Dental | Owner | 2 hrs ago | **View** \| **Impersonate** |
| Sarah Lee | sarah@central.com | Central Dental | Admin | 10 min ago | **View** \| **Impersonate** |

**Search:**
- By email (fuzzy search)
- By name
- By org name

**Use case:** "Customer Sarah called, need to see what she sees" → Search → Impersonate

---

### **Page 5: Feature Flags** (`/admin/feature-flags`)

**Purpose:** Control feature rollout

**Global Flags:**

```
┌─────────────────────────────────────────────────────┐
│ Feature: AI Assistant                               │
│                                                      │
│ Rollout Strategy:                                   │
│ ⚪ Disabled (0%)                                     │
│ ⚪ Beta (selected orgs only)                        │
│ ⚪ Gradual (% of orgs)  [Slider: 25%] ————●———— 100%│
│ 🔘 Enabled for all (100%)                          │
│                                                      │
│ Per-Org Overrides:                                  │
│ ✅ Dr. Smith Dental (Forced ON)                    │
│ ❌ Test Org (Forced OFF)                           │
│                                                      │
│ [Save]                                              │
└─────────────────────────────────────────────────────┘
```

**How it works:**
```typescript
// CRM code checks:
function canUseFeature(featureKey: string): boolean {
  // 1. Check per-org override (tenant_entitlements)
  const override = await db.query(`
    SELECT enabled FROM tenant_entitlements
    WHERE tenant_id = $1 AND feature_key = $2
  `, [currentOrgId, featureKey])
  
  if (override) return override.enabled
  
  // 2. Check global flag (feature_flags table)
  const globalFlag = await db.query(`
    SELECT rollout_percentage FROM feature_flags WHERE key = $1
  `, [featureKey])
  
  // 3. Deterministic hash (org always gets same result)
  const hash = hashCode(currentOrgId + featureKey) % 100
  return hash < globalFlag.rollout_percentage
}
```

---

### **Page 6: Access Audit** (`/admin/audit`)

**Purpose:** Who did what, when (compliance)

**Table:**

| Timestamp | Admin | Action | Target | Details |
|-----------|-------|--------|--------|---------|
| 2024-10-18 14:32 | admin@you.com | Impersonate | Dr. Smith Dental | Logged in as john@drsmith.com |
| 2024-10-18 14:15 | admin@you.com | Enable Feature | Dr. Smith Dental | Enabled "Multi-Location" |
| 2024-10-18 13:05 | support@you.com | View Org | Central Dental | Viewed org details |

**Filters:**
- Date range
- Admin user
- Action type
- Target org

**Export:** CSV for compliance audits

---

## 🔐 SECURITY & ACCESS CONTROL

### **Admin Authentication**

**Separate from CRM auth:**
```sql
-- Admin users table (in Control DB or separate)
CREATE TABLE admin_users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- bcrypt
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'support', 'analyst')),
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Roles:**
- **super_admin**: Full access (enable features, impersonate, billing)
- **support**: Read-only + impersonate (for debugging)
- **analyst**: Read-only analytics (no impersonate, no control)

**MFA Required:** Yes, for all admin users (Google Authenticator)

---

### **Impersonation Flow**

**How it works:**

1. Admin clicks "Impersonate" on org
2. Admin UI calls: `POST /api/admin/impersonate { org_id: 'abc-123' }`
3. Backend verifies admin has permission
4. Backend generates short-lived JWT (15 min expiry):
   ```json
   {
     "sub": "org_owner_user_id",
     "tenant_id": "abc-123",
     "impersonated_by": "admin_user_id",
     "exp": 1697635200
   }
   ```
5. Backend logs to audit: `admin_audit_log` table
6. Admin UI opens CRM in new tab with JWT in URL
7. CRM validates JWT, logs admin in as org owner
8. CRM shows banner: "⚠️ You are impersonating Dr. Smith Dental"

**Audit Log Entry:**
```sql
INSERT INTO admin_audit_log (
  admin_user_id,
  action,
  target_type,
  target_id,
  details,
  ip_address,
  created_at
) VALUES (
  'admin_uuid',
  'impersonate_org',
  'tenant',
  'abc-123',
  '{"impersonated_as": "john@drsmith.com", "reason": "Debug deal creation issue"}',
  '203.0.113.42',
  NOW()
);
```

---

### **Feature Flag Implementation**

**Database Schema:**

```sql
-- Global feature flags (default for all orgs)
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY,
  key TEXT UNIQUE NOT NULL, -- 'multi_location', 'ai_assistant'
  name TEXT NOT NULL, -- Display name
  description TEXT,
  default_enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-org overrides (admin grants access)
CREATE TABLE tenant_entitlements (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  granted_by UUID REFERENCES admin_users(id), -- Who enabled it
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT, -- "Beta tester", "VIP customer"
  expires_at TIMESTAMPTZ, -- Optional: trial period
  UNIQUE(tenant_id, feature_key)
);

CREATE INDEX idx_tenant_entitlements_tenant ON tenant_entitlements(tenant_id);
CREATE INDEX idx_tenant_entitlements_feature ON tenant_entitlements(feature_key);
```

**Admin UI enables feature:**

```typescript
// Admin clicks "Enable Multi-Location" for org
async function enableFeature(tenantId: string, featureKey: string) {
  await adminDb.query(`
    INSERT INTO tenant_entitlements (
      tenant_id, feature_key, enabled, granted_by, reason
    ) VALUES ($1, $2, true, $3, $4)
    ON CONFLICT (tenant_id, feature_key) 
    DO UPDATE SET enabled = true, granted_at = NOW()
  `, [tenantId, featureKey, currentAdminUserId, 'Admin override'])
  
  // Clear CRM's feature flag cache
  await redis.del(`features:${tenantId}`)
}
```

**CRM checks if feature enabled:**

```typescript
// In CRM code (src/lib/feature-flags.ts)
async function hasFeature(featureKey: string): Promise<boolean> {
  const tenantId = getCurrentTenantId()
  
  // Check cache first
  const cached = await redis.get(`features:${tenantId}:${featureKey}`)
  if (cached !== null) return cached === 'true'
  
  // Check per-org override (from admin)
  const override = await db.query(`
    SELECT enabled FROM tenant_entitlements
    WHERE tenant_id = $1 AND feature_key = $2
  `, [tenantId, featureKey])
  
  if (override.rows.length > 0) {
    const enabled = override.rows[0].enabled
    await redis.setex(`features:${tenantId}:${featureKey}`, 3600, enabled)
    return enabled
  }
  
  // Check global flag + rollout %
  const flag = await db.query(`
    SELECT rollout_percentage FROM feature_flags WHERE key = $1
  `, [featureKey])
  
  if (!flag.rows.length) return false
  
  // Deterministic rollout (same org always gets same answer)
  const hash = hashCode(tenantId + featureKey) % 100
  const enabled = hash < flag.rows[0].rollout_percentage
  
  await redis.setex(`features:${tenantId}:${featureKey}`, 3600, enabled)
  return enabled
}

// Usage in components:
{hasFeature('multi_location') && <LocationSwitcher />}
```

---

## 🏗️ IMPLEMENTATION PLAN (REVISED)

### **Phase 1: Observability MVP (Weeks 1-2)**
- ✅ Ingestion API (Mode A/B)
- ✅ Basic processor (sessionization)
- ✅ Telemetry DB (events_raw, sessions)
- ✅ Admin UI: Analytics dashboard only (DAU/WAU/MAU, signups)

**Deliverable:** Can see platform-wide metrics

---

### **Phase 2: Control Plane MVP (Weeks 3-4)**
- ✅ Organizations page (list all, search)
- ✅ Org Detail page (overview, users)
- ✅ Feature Flag system (DB tables + API)
- ✅ Feature Flags page (enable/disable per org)
- ✅ Admin auth (separate login, MFA)
- ✅ Audit logging (all admin actions)

**Deliverable:** Can enable features for any org

---

### **Phase 3: Advanced Observability (Weeks 5-6)**
- ✅ Funnels, cohorts, retention
- ✅ Feature adoption dashboard
- ✅ Error tracking
- ✅ Path analysis

**Deliverable:** Can understand user behavior deeply

---

### **Phase 4: Advanced Control (Weeks 7-8)**
- ✅ Impersonation (login as any org/user)
- ✅ Per-org analytics (drill down)
- ✅ Billing overrides (quotas, limits)
- ✅ Exports (CSV/JSON)

**Deliverable:** Full super admin powers

---

## ✅ ACCEPTANCE CRITERIA (FINAL)

**As a platform admin, I can:**

### Observability:
- [x] See DAU/WAU/MAU for entire platform
- [x] Track feature adoption (% of orgs using each feature)
- [x] Create funnels (signup → activation)
- [x] See retention curves (4-week cohorts)
- [x] Identify usability issues (error rates, drop-offs)

### Control Plane:
- [x] View all customer orgs (searchable table)
- [x] Enable any feature for any org (toggle switch)
- [x] Impersonate any org to debug issues
- [x] Override quotas/limits for VIP customers
- [x] See audit trail (who did what, when)
- [x] Export data for compliance

### Integration:
- [x] CRM continues working if admin platform is down
- [x] Feature flags cached (fast, < 20ms latency)
- [x] All admin actions logged (audit trail)
- [x] No performance impact on CRM (read-only, async)

---

## 🎯 SUMMARY

**You get TWO platforms in one:**

### **1. Analytics/Telemetry (Observability)**
- Track what users do
- Measure adoption
- Find usability issues
- Data-driven decisions

### **2. Super Admin Panel (Control Plane)**
- Manage all accounts
- Enable features instantly
- Debug customer issues (impersonate)
- Override billing/limits
- Full audit trail

**Both in one unified admin UI.**

---

## 📋 NEXT DELIVERABLE

**#3: Database Schema + ERD**

Will include:
- Telemetry tables (events, sessions, funnels)
- Control plane tables (feature_flags, tenant_entitlements, admin_users, audit_log)
- Complete SQL migrations
- Sample queries

---

**IS THIS WHAT YOU MEANT?** ✅

Does this match your vision:
1. ✅ Track CRM usability/adoption
2. ✅ Admin access to enable features for any account
3. ✅ Manage all customers from one place

