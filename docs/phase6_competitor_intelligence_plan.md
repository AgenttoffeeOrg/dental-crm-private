# Phase 6 Implementation Blueprint – Competitor & Coverage Intelligence

## Vision Alignment

- **Objective**: Equip every tenant with live competitive insight and frictionless insurance clarity so receptionists can remove objections before they surface.
- **Guiding Principles**:
  - Tenant-first data isolation (RLS parity with existing CRM tables)
  - Automations that surface insights at the point of conversation (dashboard + workflow triggers)
  - Instrument everything for observability (metrics, logs, audit trails)

## Workstreams & Deliverables

### 1. Competitor Intelligence Ingestion (P6-2)

- **Data Sources**
  - Manual CSV/Google Sheet uploads (MVP path for smaller clinics)
  - Scheduled HTTP scrapers (SaaS pricing pages, review feeds) using Supabase Edge Functions / queues
  - Optional Zapier/API connector hooks for curated datasets
- **Schema Usage**
  - Reuse existing `competitors`, `competitor_price_points`, `competitor_touchpoints` tables (Phase 0)
  - Add `competitor_documents` (optional) for storing brochures / screen captures (Supabase Storage bucket with signed URLs)
- **Processing Pipeline**
  1. Ingestion job parses payload → normalized competitor records
  2. Delta engine flags price/touchpoint changes and writes to `queue_alert_rules` (Phase 5 queue alerts) for leadership notifications
  3. Metrics worker aggregates deltas into `competitor_price_points` snapshots (daily rollups, top competitors per tenant)
- **Deliverables**
  - `scripts/ingest-competitor-intel.ts` (CLI + queue processor)
  - Supabase Edge Function for webhook ingestion (`edge/competitors/index.ts`)
  - Metrics instrumentation (`metrics.recordMetric('competitor', ...)`)
  - Documentation: `docs/operations/competitor-intelligence.md`

### 2. Leadership Benchmark Dashboards (P6-3)

- **UI Surface**: New dashboard tab `Analytics → Competitive Insights`
- **Components**
  - Win-rate vs competitor chart (`TopLossReasons`, pipeline stage comparison)
  - Price delta heatmap (per competitor, per treatment category)
  - Touchpoint timeline (competitor marketing pushes vs our conversions)
  - Alert banner using Phase 5 queue incident feed for critical pricing swings
- **Tech Stack**
  - Reuse chart primitives (`recharts`, `tailwind`)
  - API route `/api/analytics/competitors` returning aggregated data (cached via Redis for 5 minutes)
  - PostHog events for dashboard interactions
- **Deliverables**
  - `src/app/analytics/competitive-insights/page.tsx`
  - `src/app/api/analytics/competitors/route.ts`
  - Storybook stories for new widgets
  - Snapshot tests (Playwright) for high-value widgets

### 3. Insurance Verification Workflow (P6-4)

- **User Journey**
  1. Receptionist enters insurance provider + member ID
  2. System hits clearinghouse API (mock provider + real connectors later)
  3. Eligibility result stored + tasks auto-created for follow-up if pending
  4. Outcome displayed in deal/contact record (with coverage options/procedures)
- **Schema Additions**
  - `insurance_payers` (payer metadata per tenant or global)
  - `insurance_verification_requests` (status, payload, response snapshot, coverage summary)
  - `insurance_coverage_rules` (mapped treatments, exclusions, pre-auth requirements)
  - RLS mirrored to tenant/location, service role write access for background jobs
- **Workflow Automation**
  - Queue job `queues:insurance` for async verification
  - Notification via Phase 5 reliability layer (DLQ if payer API fails > threshold)
  - Optional templated SMS/email to patient when additional info required (leveraging Phase 3 dispatchers)
- **UI Enhancements**
  - `Contact` panel widget “Insurance Coverage” with status badges
  - Task automation specifying due dates based on payer SLA
- **Deliverables**
  - Migrations for new tables + policies
  - `src/lib/insurance/verification-service.ts`
  - API routes `/api/insurance/verify` (submit), `/api/insurance/rules` (CRUD)
  - UI components (contact detail widget, verification modal)
  - End-to-end test covering success + failure scenario

### 4. Compliance & RLS Hardening (P6-5)

- **Scope**
  - Update RLS policies for new insurance tables (tenant scope, service-role) + competitor storage bucket policies
  - Audit logging: extend `audit_trail` to capture insurance verifications & competitor data edits
  - Data retention: configure nightly job to purge expired verification responses per tenant settings
- **Security Checks**
  - Semgrep rules for PII leakage in logs
  - Update security checklist doc & runbook (`docs/operations/compliance-checklist.md`)
  - Performance considerations (indexes on new tables, queue metrics)

## Success Criteria

- Competitor data ingestion produces actionable alerts and persists under tenant RLS
- Competitive Insights dashboard offers leadership-ready visualisations with <2s load
- Insurance verification workflow reduces manual calls, automatically creates follow-ups, and logs outcomes
- All new data paths comply with RLS, audit, and retention standards; security scans clean

## Implementation Order

1. **Foundation**: migrations + service scaffolding (competitor ingestion job stubs, insurance schema)
2. **Pipelines**: implement competitor ingestion and insurance queues with observability
3. **UX surfaces**: dashboards + insurance widgets wired to staging data
4. **Compliance pass**: RLS review, audit hooks, documentation updates
5. **Testing & rollout**: integration tests, Playwright snapshots, ops runbooks

## Dependencies & Risks

- Ensure existing queues (Phase 5) scaled for new jobs (consider dedicated Redis connections)
- External payer APIs may vary; start with mock provider + modular connector interface
- Competitor scraping must respect robots.txt / ToS; provide manual upload fallback to avoid legal risk
- Leadership dashboard requires reliable data snapshots; plan nightly aggregation job to smooth ingestion noise

---

This plan anchors Phase 6 while keeping downstream phases unblocked (dashboards, automation, analytics). Next step: execute migrations & services per deliverable list.
