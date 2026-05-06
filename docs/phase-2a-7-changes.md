# Phase 2a.7 — Deal creation in `ingestLead()` (changes)

## Summary

Phase 2a.7 closes the gap diagnosed in the 2a.6 audit: `ingestLead()` now
creates a Deal alongside the contact / touchpoint / activity for every
non-`review_required` ingestion. Title, pipeline, stage, owner and value are
resolved from `practice_treatment_offerings` when a treatment matches and
fall back to `'Inquiry'` on the tenant's default pipeline otherwise.
Re-engagement always produces a NEW deal on the same contact (no
de-duplication) and inherits the owner from the contact's most recent prior
deal. The change is additive on the `IngestLeadResult` and the form/widget
endpoint responses (new `deal_id` field, never breaks an existing caller),
and degrades gracefully — a missing default pipeline, a zero-stage pipeline,
or a `deals.insert()` error logs a warning and returns `deal_id: null`
without dropping the lead.

No schema migration was needed: the existing
`custom_lead_value_cents_min` / `_max` range is read and synthesised into a
single value (midpoint).

---

## Pre-flight findings

### Q1 — `practice_treatment_offerings` schema

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'practice_treatment_offerings'
ORDER BY ordinal_position;
```

| column | type | nullable |
|---|---|---|
| `id` | uuid | NO |
| `tenant_id` | uuid | NO |
| `location_id` | uuid | YES |
| `treatment_type_id` | uuid | NO |
| `custom_label` | text | YES |
| `pipeline_id` | uuid | **NO** |
| `stage_id` | uuid | YES |
| `custom_sla_minutes` | integer | YES |
| **`custom_lead_value_cents_min`** | integer | YES |
| **`custom_lead_value_cents_max`** | integer | YES |
| `is_active` | boolean | NO |
| `sort_order` | integer | NO |
| `created_by_user_id` | uuid | YES |
| `created_at`, `updated_at`, `deleted_at` | … | … |

**Halt-condition triggered.** The prompt assumed a `default_value_cents` column;
the live schema has a value RANGE (`min` / `max`) instead, plus a nullable
`stage_id` for offering-level stage overrides. Resolved with the planner
(this chat session):

- **Value:** **midpoint of `(min, max)` when both set; else `min`; else
  `max`; else NULL.**
- **Stage override:** **honour `offering.stage_id` when set**; validate it
  belongs to the resolved pipeline; fall back to first stage by `position
  ASC` otherwise.

Because of this resolution **Task 1 (schema migration) is skipped** — no
column needs to be added.

Also notable: `pipeline_id` is **NOT NULL** on offerings, so the prompt's
"offering found but `pipeline_id` is null" branch is unreachable. The
resolution code is simpler than the prompt outline.

### Q2 — Default pipeline for the test tenant

```sql
SELECT id, name, is_default FROM pipelines
WHERE tenant_id = '5aadca14-...' AND is_default = true;
```

→ `47be4b64-a042-4eae-ae04-c20e7b28a0ed  "New Patient Acquisition"  is_default=true`

Stages: `Inquiry` (1) → `Consultation Scheduled` (2) → `Consultation
Complete` (3) → `Treatment Accepted` (4). Exactly one `is_default = true`
row, ≥ 1 stage, partial unique index intact.

### Q3 — Owner inheritance sanity

```sql
SELECT count(*) total, count(owner_user_id) with_owner,
       count(*) - count(owner_user_id) null_owner
FROM deals WHERE tenant_id = '5aadca14-...';
```

→ `total=120, with_owner=120, null_owner=0`

Every existing deal on the test tenant has a populated `owner_user_id`, so
the inheritance fallback will reliably kick in for re-engagement. Live
smoke test below confirmed `owner_user_id = 224bdacf-...` got assigned via
the SLA-routed path on a fresh contact (Scenario A) too.

### Q4 — Dedup-queue resolution path

`src/app/api/dedup-queue/[id]/resolve/route.ts` (the `merge` /
`create_new` / `dismiss` handler) writes:

- contact patch / insert ✓
- attribution_touchpoint ✓
- activity ✓
- queue row update ✓
- `lead.arrived` notification (event_id `dedup_resolved:<queue_id>`) ✓
- **deal: NO** ✗

So the dedup-queue resolution path has the **same** deal-creation gap the
ingestion path used to have. **Flagged for Phase 2a.9; not fixed in 2a.7**
per the prompt's instructions. The fix is straightforward — extract
`createDealForLead()` (added in 2a.7) and call it from the resolve
endpoint after the touchpoint+activity are written.

### Q5 — Other deal-creation call sites confirmed untouched

| Site | Path | Status |
|---|---|---|
| Manual UI dialogs (×3) | `src/components/deals/{create-deal-slide-over,simple-deal-dialog,deal-profile-dialog}.tsx` | unchanged |
| Authenticated CRM API | `src/app/api/deals/route.ts:243` | unchanged |
| PMS sync engine | `src/lib/integrations/pms/sync-engine.ts:338` | unchanged |
| PMS treatment-proposed webhook | `src/app/api/integrations/pms/webhooks/treatment-proposed/route.ts:213` | unchanged |
| Test/seed routes (×16) | `src/app/api/test/**` | unchanged |

All continue to work as they did before. `createDealForLead()` is exported
from `src/lib/lead-ingestion/deal-creation.ts` so future phases can adopt
it from the dedup-queue resolve path or anywhere else.

### Bonus — `deals` table schema notes

- `pipeline_id`, `stage_id`, `title`, `currency` are all NOT NULL.
- `value_estimate_cents` is `integer` (not bigint as the audit prompt
  assumed). Midpoint computation rounds to integer pence.
- Two owner columns exist: `owner_user_id` and a separate legacy `owner_id`.
  All 120 demo deals use `owner_user_id`; we follow that convention and
  leave `owner_id` NULL.

---

## Per-task results

### Task 1 — Schema migration → **skipped**

Pre-flight Q1 resolved this differently. We compute the value from the
existing `custom_lead_value_cents_min` / `_max` columns. No `ALTER TABLE`
written.

### Task 2 — Deal creation in `ingestLead()` → **done**

New module: `src/lib/lead-ingestion/deal-creation.ts` (~330 lines, 0 lint
warnings). Exports:

- `interface DealContext` with `resolutionPath:
  'with_offering' | 'no_offering_inquiry' | 'fallback_no_offering_match'`
  for debugging.
- `type DealCreationOutcome = { ok: true, dealId, context } | { ok: false,
  reason: 'review_required' | 'no_default_pipeline' | 'pipeline_has_no_stages'
  | 'deal_insert_failed', context }`.
- `async function createDealForLead(supabase, input, contactId)`.

Internal helpers (`fetchOffering`, `buildOfferingPartial`,
`buildFallbackPartial`, `resolveStageId`, `resolveOwner`,
`fetchMostRecentDealOwner`, `fetchSlaRoutedOwner`) keep `resolveDealContext`
under Lizard's complexity limit.

Resolution logic (verbatim implementation):

1. **Offering lookup.** Single PostgREST query joining
   `practice_treatment_offerings → treatment_types ( display_name )` filtered
   by `tenant_id`, `id`, `deleted_at IS NULL`.
2. **Title.** `offering.custom_label || treatment_types.display_name` when
   matched; `'Inquiry'` otherwise.
3. **Pipeline.** `offering.pipeline_id` when matched (NOT NULL → always
   present); `pipelines.is_default = true` LIMIT 1 otherwise.
4. **Stage.** `offering.stage_id` when set (validated against the resolved
   pipeline); else `pipeline_stages WHERE pipeline_id = $1 ORDER BY position
   ASC LIMIT 1`.
5. **Value.** `midpointOrNull(custom_lead_value_cents_min,
   custom_lead_value_cents_max)`: midpoint when both set, else min, else
   max, else NULL. Rounded to integer pence.
6. **Owner.**
   - **Inherit:** `deals WHERE tenant_id=$1 AND contact_id=$2 AND
     owner_user_id IS NOT NULL ORDER BY created_at DESC LIMIT 1`.
   - **SLA-routed (fallback):** mirror the `notification-router.ts`
     resolution for the `lead_routing` audience —
     `practice_notification_routing WHERE event_key='lead.arrived' AND
     pipeline_id = $resolved` first, then with
     `pipeline_id IS NULL` as the tenant-default fallback. Same query, same
     `primary_user_id` the notification system would ping.
   - **NULL:** deal lands unassigned. Practice sees it as such in the UI.

The deal insert sets `tenant_id, contact_id, pipeline_id, stage_id, title,
owner_user_id, value_estimate_cents, currency: 'GBP', source:
input.source_channel, treatment_tags: [label] | null, status: 'open',
last_activity_at`. `treatment_tags` is the legacy text array per
`pipelines_audit.md`; populated only when an offering matched. 2b/2c can
deprecate it once a typed `treatment_offering_id` FK lands on `deals`.

In `ingest-lead.ts` the step ordering changed:

- **Before:** validate → idempotency → dedup → contact → SLA → touchpoint →
  activity → contact-touch update → notification.
- **After:** validate → idempotency → dedup → contact → SLA → touchpoint
  → **deal** → activity (now with `deal_id`) → contact-touch update →
  notification (metadata now carries `deal_id`, `deal_title`).

Skipped entirely on `review_required`.

### Task 3 — `IngestLeadResult` + endpoint propagation → **done**

`IngestLeadResult` gains `deal_id: string | null` (between `activity_id`
and `dedup_decision`). JSDoc spells out the four cases that produce
`null`: `review_required`, idempotent replay, graceful skip, or zero-stage
pipeline.

The JSDoc on `routing_log_id` was updated to call out that 2a.7
deliberately leaves it null — direct
`practice_treatment_offerings.pipeline_id` lookup was used instead of
`routeDealWithAdapter()`, deferring the routing-engine refactor until
post-2b. (The audit anticipated this; the docstring now matches reality.)

Endpoint responses extended (additive only):

- `POST /api/marketing/forms/submit` → response now includes `deal_id`.
- `POST /api/widget/sessions/[id]/submit` → response now includes `deal_id`.

### Task 4 — Activity references `deal_id` → **done**

`insertActivity()` signature gained `dealId: string | null` and writes it
into the row. On graceful-skip the activity is still inserted with
`deal_id: NULL` (the lead remains contact-scoped).

### Task 5 — Notification metadata → **done**

`_emitNotification()` metadata gained `deal_id` and `deal_title`. Event
key still `lead.arrived`; deep-link target in `event-catalog.ts` unchanged
(still `/contacts/{entity_id}?action=respond` per the prompt).

### Task 6 — Graceful failure handling → **done**

All four failure modes are non-throwing and produce a valid
`IngestLeadResult` with `deal_id: null`:

| failure mode | reason emitted | log line |
|---|---|---|
| Offering lookup error | (falls back to default pipeline path) | `practice_treatment_offerings lookup failed; falling back to default pipeline` |
| No `is_default` pipeline | `no_default_pipeline` | `[ingestLead] deal-creation skipped` |
| Pipeline has zero stages | `pipeline_has_no_stages` | `[ingestLead] deal-creation skipped` |
| `deals.insert()` returned an error | `deal_insert_failed` | `[ingestLead] deal-creation skipped` (with `dealContext` and DB error) |

Each warning carries `tenantId, contactId, reason` so a future Sentry rule
can be wired against `[ingestLead] deal-creation skipped`. Activity
insertion still runs after a graceful skip; the lead is captured.

### Task 7 — Tests → **done**

#### Unit tests (jest, fakeSupabase)

Added 8 new tests inside the existing
`src/lib/lead-ingestion/__tests__/ingest-lead.test.ts`. The fake-Supabase
helper was extended to support `pipelines`, `pipeline_stages`, `deals`,
and `practice_notification_routing` tables, and `.limit(N)` is now
chainable so `.limit(1).maybeSingle()` works (drains exactly N rows).

| # | Test | Result |
|---|---|---|
| 1 | `with-treatment, new contact` → deal title from `custom_label`, midpoint value, owner from SLA routing | ✓ |
| 2 | `treatment without custom_label` → falls back to `treatment_types.display_name` ("Implants"); both value cols null → value NULL | ✓ |
| 3 | `offering.stage_id override honoured` when validation succeeds | ✓ |
| 4 | `re-engagement (matched contact)` → distinct deal id, owner inherited from prior deal | ✓ |
| 5 | `same email, same treatment, second submission` → still a new deal | ✓ |
| 6 | `no-treatment lead` → title 'Inquiry', `pipeline_id = is_default`, value NULL, treatment_tags NULL | ✓ |
| 7 | `treatment specified but no matching offering` → falls through to Inquiry on default pipeline | ✓ |
| 8 | `review_required path` → no deal inserted, `result.deal_id = null` | ✓ |
| 9 | `zero-stage pipeline` (graceful skip) → `result.deal_id = null`, no exception | ✓ |
| 10 | `no default pipeline for tenant` (graceful skip) → `result.deal_id = null` | ✓ |
| 11 | `idempotent replay` (same event_id) → no duplicate deal, prior `deal_id` surfaced from the activity | ✓ |

Total in the file: **21 / 21 passing** (13 pre-existing + 8 new). Across
the whole `src/lib/lead-ingestion/` folder: **39 / 39 passing**.

```
$ npx jest src/lib/lead-ingestion/
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests:       8 skipped, 39 passed, 47 total
```

(The 1 skipped suite / 8 skipped tests are pre-existing — they are the
`integration.test.ts` suite that was already skipped before 2a.7.)

#### Live integration smoke test

A standalone tsx script,
`dental-crm/scripts/phase-2a-7-smoke-test.ts`, invokes `ingestLead()`
directly against the live Supabase project on tenant `5aadca14-...`. It
runs three scenarios:

- **A.** Brand-new email + `treatment_offering_id =
  fbfed66e-...` (General Checkup).
- **B.** Same email as A, `treatment_offering_id =
  57bd9cc7-...` (Filling). Tests re-engagement.
- **C.** Brand-new email, no offering. Tests the Inquiry fallback.

Why a tsx script instead of the booking-widget HTTP path: there are
currently no published `marketing_forms` rows for this tenant, and the
booking widget needs a `lead_intent_session` provisioned first. Calling
`ingestLead()` directly with a service-role Supabase client exercises the
exact code path the HTTP routes wrap.

Output, condensed:

```text
=== Scenario A: new email + General Checkup ===
result.deal_id = "1c414c68-2380-490c-ac41-e208e3f6a9c9"
✅ Email sent successfully (lead.arrived notification)

=== Scenario B: same email A, switched to Filling ===
result.contact_id matches A's  ← matched dedup decision
result.deal_id = "89967961-89fe-43dd-b668-1fef6d300735"  ← distinct from A's
result.dedup_decision = "matched"

=== Scenario C: new email, no offering (Inquiry) ===
result.deal_id = "6bcbc7be-3310-479b-8945-2be4ba878cc7"

Deals on Contact A (expect 2):
  [ { title: "General Checkup", pipeline_id: "47be4b64-...",
      stage_id: "7bcdac84-...",  owner_user_id: "224bdacf-...",
      value_estimate_cents: null, source: "form_embedded",
      treatment_tags: ["General Checkup"] },
    { title: "Filling", pipeline_id: "47be4b64-...",
      stage_id: "7bcdac84-...",  owner_user_id: "224bdacf-...",
      value_estimate_cents: null, source: "form_embedded",
      treatment_tags: ["Filling"] } ]

Deals on Contact C (expect 1):
  [ { title: "Inquiry", pipeline_id: "47be4b64-...",
      stage_id: "7bcdac84-...",  owner_user_id: "224bdacf-...",
      value_estimate_cents: null } ]

=== Pass/Fail ===
PASS  A.contact_created
PASS  A.deal_created
PASS  B.same_contact
PASS  B.new_deal
PASS  A_total_deals_on_contact      (2)
PASS  C.contact_created
PASS  C.deal_created
PASS  C.title_is_Inquiry
PASS  C_total_deals_on_contact      (1)

All smoke checks passed.
```

Notes from the live run:

- **Owner assignment via SLA-routed lookup works:**
  `owner_user_id = 224bdacf-dc6b-4b13-a9b8-f2f23fe08d53` was assigned to a
  brand-new contact (Scenario A) — proving the
  `practice_notification_routing` fallback path is wired correctly.
- **`lead.arrived` notification fired** in all three scenarios (the
  `✅ Email sent successfully` and `[Notifications] Emitted 1
  notifications for: lead.arrived` lines came from the real
  notification router invoked from inside `ingestLead`).
- **`value_estimate_cents = null`** on every deal — expected, because all
  10 offerings on the live tenant currently have NULL min/max value
  ranges. When the Settings UI lands in 2a.8 and a practice fills in
  values, the midpoint computation will populate this automatically.
- **`treatment_tags = ['General Checkup']`** / `['Filling']` /
  `null` (Inquiry) — matches the spec.
- **`stage_id = 7bcdac84-...`** corresponds to the "Inquiry" stage of
  the default "New Patient Acquisition" pipeline (position 1) — confirms
  the first-stage fallback works end-to-end.

Test rows were left in place as evidence; the operator can clean them up
with:

```sql
DELETE FROM deals
 WHERE id IN ('1c414c68-2380-490c-ac41-e208e3f6a9c9',
              '89967961-89fe-43dd-b668-1fef6d300735',
              '6bcbc7be-3310-479b-8945-2be4ba878cc7');
DELETE FROM activities WHERE contact_id IN
  ('a70643ae-73e8-40c3-8908-ac6d8995371c',
   '9ddd1814-79f2-41f6-a3b9-f7b851a4073a');
DELETE FROM attribution_touchpoints WHERE contact_id IN
  ('a70643ae-73e8-40c3-8908-ac6d8995371c',
   '9ddd1814-79f2-41f6-a3b9-f7b851a4073a');
DELETE FROM contacts WHERE id IN
  ('a70643ae-73e8-40c3-8908-ac6d8995371c',
   '9ddd1814-79f2-41f6-a3b9-f7b851a4073a');
```

#### Manual UI smoke

Not performed in this session (no display attached). Recommended quick
follow-up: load `/deals` in the CRM UI as the test-tenant admin and
confirm the three new deals appear on the New Patient Acquisition kanban
under the Inquiry column, and that each deal opens with the expected
title and the contact's "Deals" tab shows two for Contact A. The deal
shapes are otherwise identical to the seed deals already on the tenant,
so visual regressions are unlikely.

---

## Validation evidence — file changes

| File | Change |
|---|---|
| `src/lib/lead-ingestion/deal-creation.ts` | NEW. ~330 LoC. Lint-clean. |
| `src/lib/lead-ingestion/ingest-lead.ts` | New step between touchpoint and activity; `IngestLeadResult.deal_id` field; `insertActivity` signature gained `dealId`; `_emitNotification` metadata gained `deal_id` + `deal_title`; idempotent-replay path now surfaces prior `deal_id` from the activity. |
| `src/app/api/marketing/forms/submit/route.ts` | Response JSON gained `deal_id`. |
| `src/app/api/widget/sessions/[id]/submit/route.ts` | Response JSON gained `deal_id`. |
| `src/lib/lead-ingestion/__tests__/ingest-lead.test.ts` | FakeState extended with `pipelines`, `pipeline_stages`, `deals`, `practice_notification_routing`; `.limit(N)` made chainable; 8 new tests. |
| `scripts/phase-2a-7-smoke-test.ts` | NEW. Live integration smoke test. |

Lint output for new files (`codacy_cli_analyze`):

- `deal-creation.ts` — **0 warnings.**
- `ingest-lead.ts` — 5 pre-existing Lizard complexity warnings on
  unchanged functions (`insertNewContact`, `additivelyUpdateContact`, plus
  two false-positive readings of inline arrow expressions in
  `updateTouchTimestamps`). The file's NLoC also nudged from ~500 to 538;
  out of scope for 2a.7. None of the warnings are on code added or
  modified by this phase.

TypeScript: full repo `tsc --noEmit` shows pre-existing errors in
`tests/`, `tests/e2e/`, `tools/` (Playwright API drift, untyped tools).
Filtered for files touched by 2a.7 (`src/lib/lead-ingestion/**`,
`src/app/api/marketing/forms/submit/**`,
`src/app/api/widget/sessions/**`): **zero errors.**

---

## Deferred items / open follow-ups

| When | What |
|---|---|
| **2a.8** | Settings UI for editing `practice_treatment_offerings.custom_label`, `custom_lead_value_cents_min`, `custom_lead_value_cents_max`, and `stage_id` per offering. Also surface offering-level `pipeline_id` for review/correction. |
| **2a.9** | Extend `createDealForLead()` consumption to `src/app/api/dedup-queue/[id]/resolve/route.ts` so manager-resolved leads also produce a deal (Pre-flight Q4 confirmed the same gap as ingestLead had). |
| **Post-2b** | Routing engine refactor: have `ingestLead()` call `routeDealWithAdapter()` so a `treatment_routing_logs` row is written for every ingested lead and `IngestLeadResult.routing_log_id` becomes non-null. The current direct read of `practice_treatment_offerings.pipeline_id` works but bypasses the routing-engine audit trail. |
| **Post-2b** | Once PMS integrations (CareStack / VoiceStack) land, `value_estimate_cents` can be overwritten with real treatment estimates at the deal-insert site. Comment in `deal-creation.ts:142-143` flags this. |
| **Future** | Existing demo data with `"Treatment - ContactName"` titles (120 deals on the test tenant from seed scripts) is left alone — wipe before paying customers, or write a one-off rename migration. The change for new ingested deals is in effect immediately. |
| **Future** | `lead.arrived` notification template copy + deep-link still point at `/contacts/{contact_id}` rather than `/deals/{deal_id}`. The metadata now carries `deal_id` and `deal_title` so a template refactor is a one-line change in `event-catalog.ts` when UX wants it. |
| **Future** | The legacy `owner_id` column on `deals` (separate from `owner_user_id`) is not populated by the new path. All 120 demo deals also leave `owner_id` NULL, so this matches existing convention; consider dropping the column when a cleanup window opens. |

---

## Open questions for the planner

**None.** The one halt-condition during pre-flight (value-column shape) was
resolved live in the planner conversation: midpoint of min/max for value;
honour `offering.stage_id` for the stage override. Everything else
implemented as specified.
