# Phase 2a.2a — Lead-ingestion engine: change log

**Scope:** server-side lead ingestion engine. Built the canonical `ingestLead()`
function plus its dedup engine and SLA resolver, refactored
`/api/marketing/forms/submit` to flow through it, and added supporting schema
(treatment_offering links, dedup review queue, idempotency key, RBAC permission,
per-tenant default-offerings RPC).

**Branch baseline:** Phase 2a.1 + the `deal-detail-view-modal.tsx` hotfix +
Phase 2a.2b checkpoints 1–4 (notification system) — see prior change logs.

**Date applied:** 2026-05-03.
**Live tenant:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf` (only one currently).

---

## 1. Schema migration — `20260504_phase_2a_2a_engine.sql`

Applied via Supabase MCP `apply_migration` (name: `phase_2a_2a_engine`).
Rollback companion at `20260504_phase_2a_2a_engine_rollback.sql`.

**Contents:**

| # | Object | Notes |
|---|---|---|
| 1 | `lead_intent_sessions.treatment_offering_id` (uuid, FK) | + partial index |
| 1 | `attribution_touchpoints.treatment_offering_id` (uuid, FK) | + partial index |
| 1 | `contacts.treatment_offering_id` (uuid, FK) | + partial index |
| 2 | `attribution_touchpoints.event_id` (text) | + UNIQUE partial index `(tenant_id, event_id) WHERE event_id IS NOT NULL` for `ingestLead` webhook-retry idempotency |
| 3 | `dedup_review_queue` table | 17 columns, RLS enabled, updated_at trigger, 4 partial indexes (tenant+status, tenant+email, tenant+phone, expires_at) |
| 4 | `permissions` row `contacts.dedup_queue_manage` | granted to `owner` and `admin` via `role_permissions` |
| 5 | RPC `seed_default_treatment_offerings(p_tenant_id uuid)` | `SECURITY DEFINER`, idempotent (relies on existing partial unique idx) |

### Validation results (Checkpoint 1)

```
treatment_offering_id columns: 3 / 3 ✓
attribution_touchpoints.event_id: 1 ✓
dedup_review_queue columns:    17 ✓ (≥14 required)
permission row:                 1 ✓
role_permissions rows:          2 ✓ (owner + admin)
RPC:                            1 ✓
```

### Backfill results (Checkpoint 2)

```
Tenant 5aadca14… seeded 20 offerings  (matches 20 active treatment_types)
```

---

## 2. Adaptations from prompt → live schema

The planner's prompt assumed schema shapes that don't match the live DB. The
introspection step at the top of the prompt caught these; this section
documents every deviation.

| # | Prompt assumption | Live reality | Adaptation |
|---|---|---|---|
| A | `permissions(key, label, description, category)` with `role_permissions(role text, permission_key text)` and 2-arg `user_has_permission(uid, key)` | `permissions(code, name, description, module, action, resource_type, …)`, `role_permissions(role_id uuid, permission_id uuid, granted bool)`, 3-arg `user_has_permission(uid, tenant_id, code)` | Use the live shape. **The 2-arg `user_has_permission` in `pg_proc` is broken** (joins on `permission_key` which no longer exists). Always call the 3-arg version. |
| B | Permission key `dedup_queue_manage` | `permissions.module` has a CHECK constraint allowing only `analytics, audit, automations, contacts, deals, integrations, marketing, pipeline, settings, tasks` (no `leads`) | Renamed code to `contacts.dedup_queue_manage` (closest semantic fit; queue is fundamentally a contact-management UI). All RLS policies + future API routes should grep this exact code. |
| C | `attribution_touchpoints` has `raw_payload` | no such column | Stash raw payload in existing `metadata` jsonb under `metadata.raw_payload`. |
| D | `attribution_touchpoints` has `event_id` for idempotency | doesn't | **Added** `event_id text` column + partial UNIQUE index in this migration. |
| E | `lead_sla_rules` has `treatment_offering_id` | doesn't (no link to offerings) | SLA resolver matches by `(tenant_id, source_channel)` only at Tier 1. Tiers 2–3 derive SLA from the offering's `custom_sla_minutes` then the canonical type's `default_sla_minutes`. |
| F | `contacts` has `first_name`/`last_name` | only `full_name` (NOT NULL) | `buildFullName()` helper synthesises `full_name` from any combination of `first_name`/`last_name`/`full_name`, defaulting to `'Unknown Lead'`. |
| G | `contacts.consents` jsonb | flat boolean cols (`marketing_consent`, `email_consent`, `sms_consent`); no consent_text_version/consent_method on contacts | Set the booleans on `contacts`. Stash `consent_text_version` + `consent_method` in `attribution_touchpoints.metadata`. (When a `lead_intent_session_id` is linked, those fields already live on `lead_intent_sessions` from Phase 1.) |
| H | `channel_identifiers` uses `(kind, value)` | uses `(channel, external_id)` | Dedup engine maps internal `ChannelIdentifierKind` → `channel` column. |
| I | Source channel `meta_lead_form` | actual enum has `meta_lead_ad`, `meta_messenger_ad`, `google_lead_form` (the latter exists, the former two cover Meta) | All adapter mapping in `ingest-lead.ts` uses live enum values. Forms route only emits `'form_embedded'` / `'form_hosted_landing'` so this only matters for future channel adapters. |
| J | Activity types `booking_widget_*` | not in `activities_type_check` CHECK list | `mapSourceChannelToActivityType()` translates each source channel to a CHECK-allowed `type` (`form_submission`, `web_chat`, `whatsapp`, `meta_lead_received`, `google_lead_received`, etc.). The exact channel is preserved in `activities.source_channel`. |

### Permission-system pattern — answer to planner Q

Live RBAC chain:

```
app_users → org_memberships(user_id, tenant_id, role text)
           → role_definitions(code text UNIQUE)
           → role_permissions(role_id, permission_id, granted bool)
           → permissions(code text UNIQUE, …)
```

Direct overrides live in `user_permissions(user_id, tenant_id, permission_id, granted, expires_at)`.

`role_definitions` rows in this DB: `super_admin, owner, admin, manager, marketing, staff, read_only`.

The newer 3-arg `user_has_permission(uid, tenant_id, code)` is the only working
permission-check function. The older 2-arg signature in `pg_proc` is dead code.

---

## 3. New TypeScript modules

All under `dental-crm/src/lib/lead-ingestion/`.

| File | Responsibility |
|---|---|
| `types.ts` | `SourceChannelEnum` mirror + `isSourceChannel()` guard |
| `normalise.ts` | `normaliseEmail()`, `normalisePhoneE164()` (libphonenumber-js GB default), `buildFullName()` |
| `dedup-engine.ts` | `resolveDedup()` — 4-tier matching (email → phone → channel_identifier → new). Phone-with-conflicting-email never auto-merges. Fail-safe: any DB error returns `review_required` rather than risk an auto-merge. |
| `sla-resolver.ts` | `resolveSLA()` — 4-tier resolution (matched_rule → offering_default → canonical_default → system_fallback at 15 min) |
| `ingest-lead.ts` | `ingestLead()` — single chokepoint that branches on dedup decision, runs SLA, writes `attribution_touchpoint` + `activity` + first/last touch fields, and emits `lead.arrived` notification (best-effort). Webhook-retry idempotency via `event_id`. Validation throws `IngestLeadValidationError`. |

The notification emitter inside `ingest-lead.ts` defaults to a lazy dynamic
import of `@/lib/notifications/notification-router`'s `emitNotification`. Tests
override it via `setNotificationEmitter()`. Lazy-loading avoids pulling
`resend` → `react-dom/server.browser` (which trips jsdom) into unit tests.

### Unit tests (jest, mocked supabase)

| File | Scenarios |
|---|---|
| `__tests__/dedup-engine.test.ts` | 12 tests covering all 4 tiers, family-share-phone case, malformed inputs, cross-tenant isolation, fail-safe error path |
| `__tests__/sla-resolver.test.ts` | 6 tests covering each tier + PostgREST array-vs-object join shape |
| `__tests__/ingest-lead.test.ts` | 8 tests covering validation, happy path, review_required, best-effort notifications, treatment_offering_id propagation, activity-type mapping |

**Result: 26/26 passing.**

### Integration tests (live DB; opt-in)

`__tests__/integration.test.ts` runs the 7 prompt-mandated scenarios end-to-end
against the real Supabase database using a `phase2a2a_test_<timestamp>_` data
prefix and an `afterAll` cleanup hook.

Skipped automatically unless ALL of these are true:
- `NEXT_PUBLIC_SUPABASE_URL` is set and not `localhost`
- `SUPABASE_SERVICE_ROLE_KEY` is set and not the jest placeholder
- `LEAD_INGESTION_INTEGRATION=1` opt-in flag is present

To run locally:
```bash
set -a && source .env.local && set +a
LEAD_INGESTION_INTEGRATION=1 \
  npx jest src/lib/lead-ingestion/__tests__/integration.test.ts
```

**Result (verified 2026-05-03 against live tenant `5aadca14…`): 7/7 passing.**

Cleanup verified post-run: 0 leftover contacts, 0 leftover queue rows, SLA
rule restored to `is_active = true`, all 20 tenant offerings preserved.

---

## 4. `/api/marketing/forms/submit/route.ts` refactor

Old behaviour (broken for the actual use case): required an authenticated CRM
user, then read `app_users.tenant_id` from the session. Iframe submissions
from a customer's marketing site never have a logged-in CRM user, so this
returned 401 in production.

New behaviour:
1. **No auth gate.** Removed the `auth.getUser()` 401 check.
2. **Tenant resolved via formId.** Looks up `marketing_forms.tenant_id`. Rejects 404 if form missing, 403 if not active or unpublished.
3. **Marketing-module gate** is applied against the form's tenant (not the session).
4. **Spam-detection runs first.** When detected, persists a spam row and short-circuits without calling `ingestLead`.
5. **`ingestLead()` is the single source of truth** for dedup, SLA, touchpoint, activity, and `lead.arrived` notification.
6. **`marketing_form_submissions` analytics row** now uses `ingestLead`'s authoritative `dedup_decision` instead of the never-implemented `result.contactCreated` / `result.isDuplicate` / `result.submissionId` flags.
7. **Outbound webhook fan-out** is gated on `result.contact_id` (skipped on `review_required`, since subscribers expect a contactId).
8. **Source channel detection:** `form_hosted_landing` if referer host matches our app domain, else `form_embedded`.
9. **Idempotency:** generates `event_id = "form_submit:<formId>:<idempotencyKey ?? randomUUID()>"`. Repeated submits with the same `idempotencyKey` short-circuit via `attribution_touchpoints.event_id` UNIQUE constraint.

### Deletions

- `dental-crm/src/lib/marketing/form-processor.ts` — last importer was the
  refactored route. Confirmed zero call sites remain (`grep
  processFormSubmission` → 0 matches in `src/`). Removed 14 KB of dead code.

---

## 5. Verification status (Checkpoint 8)

| Check | Result |
|---|---|
| Schema additions present (5 columns + 1 column + 1 table + 1 RPC + 1 perm + 2 role grants) | All ✓ |
| Backfill: 20 offerings on the live tenant | ✓ |
| `dedup-engine.ts`, `sla-resolver.ts`, `ingest-lead.ts` exist | ✓ |
| Unit tests (26) | All ✓ |
| Integration tests (7, live DB) | All ✓ |
| Codacy (ESLint + Trivy + Opengrep) on all new/edited files | 0 issues ✓ |
| Codacy Lizard complexity | 5 metric warnings on `ingest-lead.ts` (CCN 17/18 on null-safe COALESCE-style updates; 2 misattributed to template-literal lines). Per workspace rule, complexity *metrics* are not blocking. |
| `npx tsc --noEmit` errors attributable to Phase 2a.2a | **0** (total errors went from 1572 baseline → 1562; net reduction from deleting `form-processor.ts`) |
| `npm run build` | Compiled successfully (⚠ warnings); SSG generated 201/201 pages; export step fails on `/_error: /404` and `/_error: /500` due to pre-existing `<Html>` import bug — **unrelated to Phase 2a.2a** |
| `grep deal_type|pipeline_stage_id|PhoneCall|MessageCircle|ActivityIcon|setCreateActivityDialogOpen src/components/deals/deal-detail-view-modal.tsx` | 0 matches ✓ (hotfix verification) |

---

## 6. PAUSE GATE findings (for the planner)

The prompt has an explicit pause gate after Checkpoint 2. The user instructed
"complete this first" referring to the entire phase, so we proceeded through
C3–C8 without waiting. Here are the answers the planner asked for:

- **Did C1+C2 pass cleanly?** Yes — after one corrective re-apply (the `permissions.module` and `permissions.action` CHECK constraints rejected `module='leads'`; renamed to `contacts.dedup_queue_manage`).
- **Schema deviations from the audit-described shapes?** Yes, several. See section 2 above for the full table.
- **Permission-system pattern?** See section 2's "Permission-system pattern" subsection.
- **Unexpected errors during migration?** One: the `permissions_module_check` CHECK constraint (above). Migration was atomic — first attempt rolled back cleanly; second attempt with the corrected module value succeeded.

---

## 7. Deferred items (not 2a.2a)

Tracked here so the planner doesn't lose them. These were explicitly out of
scope per the prompt's "Deferred items" section:

- `lead.arrived` notification dispatcher — the **router-side** wiring (event catalog, audience resolver, channel adapters) was completed in Phase 2a.2b checkpoints 1–4 (prior session). Phase 2a.2a's `ingestLead` already calls `emitNotification` so this is functional today.
- Dedup queue API endpoints (`/api/dedup-queue/...`) — Phase 2a.2b
- Dedup queue UI page — Phase 2a.2b
- Email channel adapter (Resend) — already wired in Phase 2a.2b
- Booking widget React component — Phase 2a.3
- Widget API routes (`/api/widget/config`, `/api/widget/sessions`) — Phase 2a.3
- Static Netlify test site — Phase 2a.4
- E2E tests across all channels — Phase 2a.4
- Drop legacy `lead_intakes`, `lead_sources`, `auto_categorize_lead` RPC — late 2a or early 2b
- Remove `quickRouteDeal` alias re-export — late 2a cleanup
- Plumb `routingLogId` through `AdapterResult` — minor 2a.1 follow-up
- Business-hours-aware SLA resolution — Phase 2b

---

## 8. Files added / changed / removed

**Added (12):**
```
dental-crm/supabase/migrations/20260504_phase_2a_2a_engine.sql
dental-crm/supabase/migrations/20260504_phase_2a_2a_engine_rollback.sql
dental-crm/src/lib/lead-ingestion/types.ts
dental-crm/src/lib/lead-ingestion/normalise.ts
dental-crm/src/lib/lead-ingestion/dedup-engine.ts
dental-crm/src/lib/lead-ingestion/sla-resolver.ts
dental-crm/src/lib/lead-ingestion/ingest-lead.ts
dental-crm/src/lib/lead-ingestion/__tests__/dedup-engine.test.ts
dental-crm/src/lib/lead-ingestion/__tests__/sla-resolver.test.ts
dental-crm/src/lib/lead-ingestion/__tests__/ingest-lead.test.ts
dental-crm/src/lib/lead-ingestion/__tests__/integration.test.ts
dental-crm/docs/phase-2a-2a-changes.md  (this file)
```

**Modified (1):**
```
dental-crm/src/app/api/marketing/forms/submit/route.ts
```

**Removed (1):**
```
dental-crm/src/lib/marketing/form-processor.ts
```
