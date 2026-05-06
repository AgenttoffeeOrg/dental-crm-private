# Phase 2a.9 — Deal creation in dedup queue resolve (changes)

## Summary

Phase 2a.9 closes the gap that Phase 2a.7's audit (Q4) flagged: when a queue
manager hits **Merge** or **Create new** on a queued lead in
`/api/dedup-queue/[id]/resolve`, the resolution now produces a Deal alongside
the contact / touchpoint / activity — exactly like the `ingestLead()` happy
path does. The deal is created from the queue row's stored
`treatment_offering_id` + `source_channel`, so the lead's original enquiry
intent is preserved through the queue (merging confirms identity; it doesn't
change what they enquired about). `Dismiss` continues to write nothing —
it's the explicit "this is spam / a duplicate I don't want to keep" path.

The change is mostly mechanical: the existing `createDealForLead()` helper
(introduced in 2a.7) was generalised to take a small input struct instead of
the full `IngestLeadInput`, then called from the resolve endpoint after the
touchpoint insert and before the activity insert. The activity now carries
`deal_id`; the `lead.arrived` notification metadata gains `deal_id` +
`deal_title`; the response includes `deal_id` so the queue UI can deep-link
to the created deal in a future phase. Graceful failure carries over
verbatim from 2a.7: a missing default pipeline, a zero-stage pipeline, or a
`deals.insert()` error returns `deal_id: null` without failing the
resolution.

A defensive write-side change in `ingestLead()` enriches
`dedup_review_queue.candidate_payload` with the structured fields the
resolve endpoint needs (`treatment_offering_id`, normalised email/phone,
consents) so the resolve flow can reconstruct deal context from the queue
row alone. No schema migration was needed.

---

## Pre-flight findings

### Q1 — Resolve endpoint

`src/app/api/dedup-queue/[id]/resolve/route.ts` is the single resolve
handler. It dispatches on the request body's `action` field
(`merge | create_new | dismiss`) and there are no other writers to
`dedup_review_queue` rows that resolve them — confirmed via
`grep -rn "dedup_review_queue" src/app/api`. The dedup queue UI handlers
(`src/components/dedup-queue/dedup-review-modal.tsx`,
`src/components/dedup-queue/dedup-queue-list.tsx`) all funnel through this
single endpoint.

### Q2 — What the endpoint did before 2a.9

| action | rows written | transaction? | response shape |
|---|---|---|---|
| `merge` | additive `contacts` patch + `attribution_touchpoints` insert + `activities` insert + `dedup_review_queue` status update + `lead.arrived` notification (event_id `dedup_resolved:<queue_id>`) | NO — sequential awaits, no RPC | `{ queue_item, contact, action: 'merge' }` |
| `create_new` | `contacts` insert + `attribution_touchpoints` insert + `activities` insert + `dedup_review_queue` status update + `lead.arrived` notification | NO | `{ queue_item, contact, action: 'create_new' }` |
| `dismiss` | `dedup_review_queue` status update only | n/a | `{ queue_item, action: 'dismiss' }` |

**No deal was being created on any path** — confirms the 2a.7 audit. No
transaction means each step's failure mode has to be handled individually;
2a.9 follows that pattern (deal-creation graceful skip leaves the rest of
the resolution intact).

### Q3 — `dedup_review_queue` schema

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'dedup_review_queue'
ORDER BY ordinal_position;
```

| column | type | nullable |
|---|---|---|
| `id` | uuid | NO |
| `tenant_id` | uuid | NO |
| `candidate_payload` | jsonb | NO |
| `candidate_email` | text | YES |
| `candidate_phone` | text | YES |
| `candidate_name` | text | YES |
| `source_channel` | enum (`source_channel_enum`) | YES |
| `matched_contact_ids` | uuid[] | NO |
| `match_signals` | jsonb | NO |
| `status` | text | NO |
| `resolved_contact_id` | uuid | YES |
| `resolved_by_user_id` | uuid | YES |
| `resolved_at` | timestamptz | YES |
| `resolution_notes` | text | YES |
| `created_at`, `updated_at`, `expires_at` | … | … |

`source_channel` is preserved on its own column; that one's safe.

`treatment_offering_id` is **NOT** a dedicated column — it has to live
inside `candidate_payload`. Reviewing the call sites
(`src/app/api/marketing/forms/submit/route.ts`,
`src/app/api/widget/sessions/[id]/submit/route.ts`) showed that the
`raw_payload` they pass to `ingestLead()` may or may not include
`treatment_offering_id`: forms include it iff the form posted it; the
widget keeps it on the session and may not echo it into `raw_payload`.

**Resolution (in-scope, no schema change):** extend
`insertReviewQueueItem()` in `ingest-lead.ts` to merge the structured fields
from the top-level `IngestLeadInput` into `candidate_payload` before
insertion (`treatment_offering_id`, `treatment_intent_text`, normalised
email/phone, consents). New queue rows post-2a.9 are guaranteed to carry
the data the resolve flow needs. This keeps the halt-condition resolved
without touching DDL.

No `event_id` column on the queue row — idempotency for notifications uses
`dedup_resolved:<queue_id>` as the event key, and idempotency for the
resolve action itself is enforced by the `status = 'pending'` filter on the
load query (a second resolve call returns 404 rather than running again).

### Q4 — Live tenant queue state

```sql
SELECT id, status, source_channel, created_at
FROM dedup_review_queue
WHERE tenant_id = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
ORDER BY created_at DESC;
```

→ **0 rows.** No backfill needed. Newly created queue rows post-2a.9 will
carry the enriched `candidate_payload`.

### Q5 — Reusability of `deal-creation.ts`

The `createDealForLead()` exported by `src/lib/lead-ingestion/deal-creation.ts`
took `(supabase, input: IngestLeadInput, contactId)` — coupling it tightly
to ingest-lead's input shape. Internally it only uses `tenant_id`,
`treatment_offering_id`, `source_channel` from the input plus `contactId`,
so the coupling was cosmetic. Task 1 below decoupled the surface to a small
struct that both call sites construct from their own context.

---

## Per-task results

### Task 1 — Generalise `createDealForLead` → done

`src/lib/lead-ingestion/deal-creation.ts` now exports
`CreateDealForLeadInput`:

```typescript
export interface CreateDealForLeadInput {
  tenantId: string
  contactId: string
  treatmentOfferingId: string | null
  sourceChannel: SourceChannelEnum
}

export async function createDealForLead(
  supabase: SupabaseClient,
  input: CreateDealForLeadInput
): Promise<DealCreationOutcome>
```

The implementation is the same — `resolveDealContext`, `fetchOffering`,
`buildOfferingPartial`, `buildFallbackPartial`, `resolveStageId`,
`resolveOwner`, `fetchMostRecentDealOwner`, `fetchSlaRoutedOwner` all carry
over verbatim, just reading `input.tenantId` / `input.treatmentOfferingId`
/ `input.sourceChannel` / `input.contactId` instead of pulling fields off
an `IngestLeadInput`. Log lines were renamed from `[ingestLead]` to
`[deal-creation]` since both call sites share the helper now.

`ingest-lead.ts` was updated to pass the new shape:

```typescript
const dealOutcome = await createDealForLead(supabase, {
  tenantId: input.tenant_id,
  contactId,
  treatmentOfferingId: input.treatment_offering_id ?? null,
  sourceChannel: input.source_channel,
})
```

No behaviour change — the existing 23 unit tests in
`src/lib/lead-ingestion/__tests__/ingest-lead.test.ts` pass without
modification.

`src/lib/lead-ingestion/ingest-lead.ts:insertReviewQueueItem()` was also
extended (defensive write-side fix from Pre-flight Q3) to enrich
`candidate_payload` with the structured fields the resolve endpoint needs.
The original `raw_payload` is spread first, then the structured fields
overlay it — so existing payload keys are preserved while
`treatment_offering_id`, normalised email/phone and consents are now
guaranteed regardless of which channel produced the queue row.

### Task 2 — Wire `createDealForLead` into the resolve endpoint → done

In `src/app/api/dedup-queue/[id]/resolve/route.ts`, the merge / create_new
flow was reordered to mirror `ingestLead()`'s ordering (touchpoint → deal →
activity):

1. Resolve the contact (existing logic; merge patches the target,
   create_new inserts a fresh row).
2. Insert `attribution_touchpoint` (existing logic).
3. **NEW** — Read `treatment_offering_id` from `candidate_payload`, call
   `createDealForLead({ tenantId, contactId, treatmentOfferingId,
   sourceChannel: item.source_channel })`. Source channel comes from the
   queue row's dedicated column, not the payload.
4. Insert `activity` with `deal_id` set when the deal step succeeded
   (`null` on graceful skip — same behaviour as ingestLead).
5. Update the queue row to `merged` / `new_contact` (existing logic).
6. Emit `lead.arrived` notification with `deal_id` + `deal_title` in
   metadata (mirrors ingestLead's metadata shape).

`dismiss` is unchanged — no contact, no touchpoint, no activity, no deal,
just `status = 'dismissed'` on the queue row.

**Idempotency:** the existing load query filters `status = 'pending'`. A
second resolve call on the same queue row finds nothing and returns 404,
so the deal is never created twice. Tested.

**Transaction boundary:** unchanged — the endpoint was already
non-transactional. Deal-creation's graceful failure model matches the
existing pattern: a missing default pipeline / zero-stage pipeline /
`deals.insert()` error logs a warning and returns `deal_id: null`, never
throws. The contact merge / create still succeeds. The practice can hand-
create a deal on the resolved contact later if needed.

### Task 3 — Response shape → done

Merge / create_new response now:

```jsonc
{
  "queue_item": { ... },
  "contact": { ... },
  "deal_id": "<uuid or null>",
  "deal_title": "<string or null>",
  "action": "merge"
}
```

Dismiss response:

```jsonc
{
  "queue_item": { ... },
  "deal_id": null,
  "action": "dismiss"
}
```

`deal_id: null` on the merge / create_new path means the deal-creation step
gracefully skipped — the contact is still merged/created and the queue row
is still resolved. The dedup queue UI does not yet consume `deal_id` —
deferred to whenever a "view created deal" link is added (post-2b).

The partial-success branch (queue update fails after the deal /
touchpoint / activity have already been written) also surfaces `deal_id`
so the caller can still find the created deal.

### Task 4 — Tests → done

#### Unit tests

New file: `src/app/api/dedup-queue/__tests__/resolve.test.ts` — 9 tests
covering the deal-creation behaviour added in 2a.9. Strategy mirrors the
existing `treatment-offerings.test.ts`: an in-memory Supabase fake covering
the eight tables the route touches (`dedup_review_queue`, `contacts`,
`attribution_touchpoints`, `activities`, `practice_treatment_offerings`,
`pipelines`, `pipeline_stages`, `deals`, `practice_notification_routing`),
plus a stubbed `user_has_permission` RPC. The route handler is mounted
directly and assertions cover both the response and the resulting DB
mutations.

| # | Test | Result |
|---|---|---|
| 1 | `merge` with treatment offering → deal on offering pipeline, midpoint value, owner from SLA routing | ✓ |
| 2 | `merge` with no `treatment_offering_id` on queue row → 'Inquiry' deal on default pipeline | ✓ |
| 3 | `merge` when target contact has prior deals → owner inherited from most recent prior deal | ✓ |
| 4 | `merge` with zero-stage pipeline → `deal_id: null` graceful skip, contact still resolved, activity inserted with `deal_id: null` | ✓ |
| 5 | `merge` with forced `deals.insert()` error → `deal_id: null` graceful skip, contact still merged, queue still resolved | ✓ |
| 6 | `create_new` with treatment offering → fresh contact AND deal, both linked, queue marked `new_contact` | ✓ |
| 7 | `dismiss` → no deal / no contact / no touchpoint / no activity, queue marked `dismissed` | ✓ |
| 8 | Calling resolve twice → second call returns 404, no duplicate deal | ✓ |
| 9 | User lacks `contacts.dedup_queue_manage` → 403, no deal | ✓ |

```
$ npx jest src/app/api/dedup-queue/__tests__/resolve.test.ts

PASS src/app/api/dedup-queue/__tests__/resolve.test.ts
  POST /api/dedup-queue/[id]/resolve — merge
    ✓ with treatment_offering_id → creates a Deal on the offering pipeline ...
    ✓ with no treatment_offering_id on queue row → creates an "Inquiry" deal ...
    ✓ target contact has prior deals → owner inherits from the most recent prior deal
    ✓ zero-stage pipeline → graceful skip, deal_id null, contact still resolved
    ✓ deals.insert error → graceful skip, deal_id null, contact still resolved
  POST /api/dedup-queue/[id]/resolve — create_new
    ✓ with treatment offering → inserts a fresh contact AND a deal
  POST /api/dedup-queue/[id]/resolve — dismiss
    ✓ marks dismissed and creates no contact/deal/touchpoint/activity
  POST /api/dedup-queue/[id]/resolve — idempotency
    ✓ a second call after a successful merge returns 404 and does NOT create a duplicate deal
  POST /api/dedup-queue/[id]/resolve — permission gating
    ✓ returns 403 when user lacks contacts.dedup_queue_manage

Tests:       9 passed, 9 total
```

The pre-existing `ingest-lead.test.ts` suite (23 tests) passes unchanged
after the `createDealForLead` signature refactor — proves the behaviour of
the ingestion path is untouched.

```
$ npx jest src/lib/lead-ingestion/ src/app/api/dedup-queue/

Test Suites: 1 skipped, 4 passed, 4 of 5 total
Tests:       8 skipped, 50 passed, 58 total
```

(The 1 skipped suite / 8 skipped tests are the pre-existing
`integration.test.ts` suite that was already skipped before this phase.)

#### Live smoke test

`scripts/phase-2a-9-smoke-test.ts` runs the same three flows against the
live Supabase project on tenant `5aadca14-...`:

```text
=========================================================
Phase 2a.9 smoke test outcomes
=========================================================

[merge]
  queue_id   = c8a26c50-b4c8-492f-96c6-44a98d7b87f7
  contact_id = 01b108ba-9157-4c5f-9a01-bb85038135dd
  deal_id    = 3e076821-7fb9-405c-8ed2-9e572d52cba5
  - target contact ... created
  - queue row ... created
  - deal ... created (title="General Checkup", pipeline=47be4b64-...)

[create_new]
  queue_id   = a4ea470e-f2ca-4727-bcbc-de9d0b1cde4c
  contact_id = 1d1cefd3-6b1d-4c3d-ab67-76a5269670b3
  deal_id    = 47290896-42f4-40ad-88c4-683ae77d1e4b
  - queue row ... created
  - new contact ... created
  - deal ... created (title="General Checkup", pipeline=47be4b64-...)

[dismiss]
  queue_id   = d8eac1db-df27-457a-8bf8-6551dbe36c43
  contact_id = null
  deal_id    = null
  - queue row ... created
  - queue marked dismissed; no deal / no contact (by design)

=== Pass/Fail ===
  PASS  merge.deal_created
  PASS  merge.contact_resolved
  PASS  create_new.deal_created
  PASS  create_new.contact_created
  PASS  dismiss.no_deal
  PASS  dismiss.no_contact

All smoke checks passed.
```

DB verification of the two created deals:

```sql
SELECT id, title, pipeline_id, stage_id, owner_user_id,
       value_estimate_cents, source, treatment_tags, status
FROM deals
WHERE id IN ('3e076821-7fb9-405c-8ed2-9e572d52cba5',
             '47290896-42f4-40ad-88c4-683ae77d1e4b');
```

| id | title | pipeline_id | stage_id | owner_user_id | value | source | treatment_tags | status |
|---|---|---|---|---|---|---|---|---|
| 3e076821-... | General Checkup | 47be4b64-... | 7bcdac84-... | 224bdacf-... | NULL | form_embedded | ['General Checkup'] | open |
| 47290896-... | General Checkup | 47be4b64-... | 7bcdac84-... | 224bdacf-... | NULL | form_embedded | ['General Checkup'] | open |

Notes from the live run:

- `owner_user_id = 224bdacf-dc6b-4b13-a9b8-f2f23fe08d53` — same SLA-routed
  user 2a.7's smoke test saw, confirming the
  `practice_notification_routing` fallback is wired correctly through the
  resolve flow too.
- `value_estimate_cents = NULL` — expected, the General Checkup offering
  has no `custom_lead_value_cents_min/max` populated yet (the Settings UI
  in 2a.8 lets practices fill these in; once they do, midpoint values flow
  through automatically).
- `treatment_tags = ['General Checkup']` — matches the spec.
- `pipeline_id = 47be4b64-...` is the General Checkup offering's
  `pipeline_id` (the tenant's "New Patient Acquisition" default pipeline,
  which the offering points at).
- The dismiss scenario produced a queue row marked `dismissed` and zero
  side-effect rows.

Manual UI flow against the dedup queue page was not run in this session
(no display attached). The live smoke covers the same DB-side behaviour
end-to-end against real Postgres / RLS / FK constraints; the route
handler is exhaustively unit-tested.

##### Cleanup

Test rows are left in place as evidence. Operator can clean up with:

```sql
DELETE FROM deals WHERE id IN
  ('3e076821-7fb9-405c-8ed2-9e572d52cba5',
   '47290896-42f4-40ad-88c4-683ae77d1e4b');
DELETE FROM dedup_review_queue WHERE id IN
  ('c8a26c50-b4c8-492f-96c6-44a98d7b87f7',
   'a4ea470e-f2ca-4727-bcbc-de9d0b1cde4c',
   'd8eac1db-df27-457a-8bf8-6551dbe36c43');
DELETE FROM contacts WHERE id IN
  ('01b108ba-9157-4c5f-9a01-bb85038135dd',
   '1d1cefd3-6b1d-4c3d-ab67-76a5269670b3');
```

---

## Validation evidence — file changes

| File | Change |
|---|---|
| `src/lib/lead-ingestion/deal-creation.ts` | Generalised `createDealForLead` to take `CreateDealForLeadInput` instead of `IngestLeadInput`. Internal helpers (`resolveDealContext`, `fetchOffering`, `buildFallbackPartial`) updated to match. Log prefix renamed from `[ingestLead]` to `[deal-creation]` for the shared helper. No behaviour change. |
| `src/lib/lead-ingestion/ingest-lead.ts` | Updated `createDealForLead` call to pass the new struct shape. `insertReviewQueueItem()` now enriches `candidate_payload` with `treatment_offering_id`, `treatment_intent_text`, normalised email/phone, and consents — so the resolve endpoint can reconstruct deal context regardless of what the upstream `raw_payload` carried. |
| `src/app/api/dedup-queue/[id]/resolve/route.ts` | Imports and calls `createDealForLead` after the touchpoint insert on `merge` and `create_new`. `insertActivity()` signature gained `dealId`; the activity row writes it in both the column and the metadata. Notification metadata gains `deal_id` + `deal_title`. Response shape gains `deal_id` + `deal_title` (also on the `dismiss` response, as `null`, for shape consistency). Top-of-file JSDoc updated to describe 2a.9 behaviour. |
| `src/app/api/dedup-queue/__tests__/resolve.test.ts` | NEW. 9 tests against an in-memory Supabase fake covering all three actions, the two graceful-skip paths, idempotency, and permission gating. |
| `scripts/phase-2a-9-smoke-test.ts` | NEW. Live integration smoke test against the live Supabase project — three scenarios (merge / create_new / dismiss), pass/fail summary, leaves rows in place for inspection. |

### Codacy (`codacy_cli_analyze`)

- `deal-creation.ts` — **0 warnings.**
- `ingest-lead.ts` — only the **5 pre-existing Lizard complexity warnings**
  on unchanged functions (`insertNewContact`, `additivelyUpdateContact`,
  the two false-positive readings of inline arrow expressions in
  `updateTouchTimestamps`, plus the unchanged section starting around
  L410). File NLoC nudged from 538 → 552 (was already over the 500
  threshold before 2a.9). No new warnings on modified code.
- `resolve/route.ts` — only the **2 pre-existing Lizard complexity
  warnings** on `pickStringField` and `mapSourceChannelToActivityType`
  (both unchanged). File NLoC nudged from ~497 → 510. No new warnings on
  modified code.
- `resolve.test.ts` — 3 minor Lizard warnings on the in-memory fake's
  `matches` / `result` / nested arrow expression. The same pattern is
  present in `treatment-offerings.test.ts` and `ingest-lead.test.ts` —
  this is just the cost of the fake-Supabase pattern these tests share.
- ESLint — clean across all four files.
- Trivy — clean.

### TypeScript

`tsc --noEmit` filtered to files touched by 2a.9 (`deal-creation.ts`,
`ingest-lead.ts`, `dedup-queue/[id]/resolve/route.ts`, the new
`resolve.test.ts`, the new `phase-2a-9-smoke-test.ts`): **zero errors.**
The repo-wide `tsc` run still has the same pre-existing errors in
`src/app/api/test/debug-deal-creation/route.ts` (missing `getFirstTenantId`
import) that 2a.7 already noted as untouched test/seed scaffolding.

---

## Deferred items / open follow-ups

| When | What |
|---|---|
| Post-2b | Add a "view created deal" deep-link to the dedup queue UI consuming the new `deal_id` field. The endpoint already returns it; the UI just needs a button. |
| Post-2b | Batch resolve (multiple queue rows in one call). Out of scope for 2a.9 — current UI is per-row. |
| Future | Once a `deal_id` link exists on the dedup queue UI, consider also exposing `deal_title` so the table can show "merged → Implants" rather than just "merged". |
| Future | The `lead.arrived` notification template now receives `deal_id` + `deal_title` in metadata (consistent with ingestLead) but `event-catalog.ts` still deep-links to `/contacts/{contact_id}`. A one-line change there can switch to `/deals/{deal_id}` when UX wants. |
| Future | Migrate the resolve endpoint to a single transaction (or a Supabase RPC). The current sequential awaits work in practice but a hard fail mid-flow leaves orphan rows; deal-creation's graceful skip masks this for the deal step itself but not the contact / touchpoint / activity steps. Worth a phase of its own once 2b is in. |

---

## Open questions for the planner

**None.** The one borderline halt-condition during pre-flight (Q3 — was
`treatment_offering_id` reliably preserved on the queue row?) was resolved
in-scope by extending `insertReviewQueueItem` to enrich
`candidate_payload`. No schema change needed; live tenant has 0
unresolved queue rows, so nothing to backfill.
