# Phase 2a.5 — Pre-2b cleanup (changes)

## Summary

Phase 2a.5 is a short, zero-user-facing cleanup pass that removes five
landmines Phase 2b would otherwise trip over: the legacy lead-intake stack
that bypassed `ingestLead()`, three vestigial shadow tables, the
`quickRouteDeal` positional-arg footgun, the dropped-on-the-floor
`treatment_routing_logs.id`, and the eight broken `.from('notifications')
.insert(...)` call sites in `src/lib/automations/*` that wrote columns that
don't exist on the live schema.

Why now: Phase 2b adds Meta Lead Ads, Google Lead Forms, WhatsApp inbound
and the rest of the channel adapters. Every one of them routes through
`ingestLead()` and fires notifications via the router. Leaving the legacy
stack, the shadow tables, the alias footgun, or the broken emit paths in
place meant the next contributor could accidentally reintroduce a
silent-failure bug or target a zombie table.

---

## Per-task results

### Task 1 — Drop legacy lead-intake stack

**Deleted from code:** Nothing — `dental-crm/src/app/api/webhooks/lead-intake/`
was already absent from the tree when 2a.5 started.

**Deleted from types:** `DentalService`, `LeadSource`, `LeadIntake`,
`LeadIntakeWithRelations`, `DealWithLeadInfo`, `ContactWithLeadInfo`
interfaces in `src/types/database.ts`. Unused `LeadSource` import in
`src/components/integrations/integrations-hub.tsx`.

**Migration written:** `supabase/migrations/20260504_phase_2a_5_drop_legacy_lead_intake.sql`.
Applied live via Supabase MCP.

**Deviation from the prompt:** The prompt assumed a straight
`DROP TABLE ... CASCADE`. Pre-flight discovered two FKs from canonical
tables (`deals.lead_intake_id → lead_intakes`,
`contacts.lead_source_id → lead_sources`), both 100% null and
unreferenced in `src/`, plus two view dependencies
(`lead_pipeline_analytics` — a pure-analytics view over the vestigial
stack; `deals_with_contacts` — a canonical view that happened to
passthrough `d.lead_intake_id`). After halt-and-ask with the planner the
final migration:

1. Drops `lead_pipeline_analytics` outright (unreferenced).
2. Drops `deals_with_contacts`, then drops the FK columns on canonical
   tables (`deals.lead_intake_id`, `contacts.lead_source_id`), then
   recreates `deals_with_contacts` without the `d.lead_intake_id`
   passthrough. Column list captured from `pg_views` pre-migration so the
   view signature stays identical for every other column.
3. Drops the `auto_categorize_lead(text, uuid)` RPC.
4. `DROP TABLE ... CASCADE` for `lead_intakes` and `lead_sources`.

### Task 2 — Drop vestigial shadow tables

**Migration written:** `supabase/migrations/20260504_phase_2a_5_drop_vestigial_shadow_tables.sql`.
Applied live via Supabase MCP.

Pre-flight confirmed no FKs from canonical tables, no view dependencies,
zero rows. Simple three-line `DROP TABLE CASCADE`. No deviations.

### Task 3 — Remove `quickRouteDeal` and `quickRoute` aliases

**Deviation from the prompt:** Prompt said "Only the alias export should
remain." The implementation function `quickRoute(tenantId, treatmentTags)`
also still existed in `adapter.ts:312`; `index.ts` merely re-exported it as
both `quickRoute` and `quickRouteDeal`. Per the halt-and-ask, Task 3 now
deletes:

1. The `quickRoute, quickRoute as quickRouteDeal` re-exports in
   `src/lib/treatment-routing/index.ts`.
2. The underlying `quickRoute()` function body in
   `src/lib/treatment-routing/adapter.ts`.

Both files carry the canonical 3-line "Phase 2a.5" comment explaining why
the positional signature was a footgun. No other call sites had to change.

### Task 4 — Plumb `routingLogId` back through `AdapterResult` and `IngestLeadResult`

Pre-existing state: `RoutingResult` didn't have a `routingLogId` field, yet
`adapter.ts:211` already tried to read `result.routingLogId` when emitting
`events.dealRouted()` — it was silently evaluating to `undefined`. Three
downstream consumers (`bulk-reroute/route.ts`, `sync-engine.ts`,
`treatment-proposed/route.ts`) also referenced `.routingLogId` against
types that never declared it.

Changes:

- `routing-engine.ts`:
  - Added `routingLogId: string | null` to `RoutingResult`.
  - `logRoutingDecision()` now returns the inserted row's id (or `null` on
    insert failure) — previously returned `void`.
  - All six success-path returns in `routeDealToPipeline()` now `await`
    `logRoutingDecision()` and attach the id to the `RoutingResult`. The
    two fallback paths (routing disabled, catch-block emergency fallback)
    intentionally skip the log insert and return `routingLogId: null`.
- `adapter.ts`:
  - Added `routingLogId: string | null` to `AdapterResult`. Populated from
    `result.routingLogId` on success, `null` in both emergency-fallback
    paths.
- `events.ts` — widened `DEAL.ROUTED.routingLogId` from `string | undefined`
  to `string | null | undefined` to match the new adapter shape.
- `app/api/treatment-routing/bulk-reroute/route.ts` — widened the local
  `RerouteResult.routingLogId` type for the same reason.
- `lead-ingestion/ingest-lead.ts`:
  - Added `routing_log_id: string | null` to `IngestLeadResult`.
  - All three return sites (happy path, review_required, idempotent
    replay) now include `routing_log_id: null`.

**Deviation from the prompt:** The prompt assumed `ingestLead()` calls
`routeDealWithAdapter()` and therefore would have an `AdapterResult` to
propagate from. It doesn't — `ingestLead()` creates a
contact/touchpoint/activity, never a deal, so routing is strictly
downstream. The field is therefore plumbed on the type and always returned
as `null`. A doc-comment on `IngestLeadResult.routing_log_id` makes this
explicit and points at 2b as the consumer that will populate it when
webhook handlers run ingestLead → deal creation → routing in a single
request.

**Tests added:** `src/lib/lead-ingestion/__tests__/ingest-lead.test.ts`
gained two tests locking the `routing_log_id: null` contract on the happy
path and the `review_required` path.

### Task 5 — Notification insert sites in `src/lib/automations/*`

Discovery found **8** sites, not 5 as the prompt asserted — the "5 sites"
figure in `notifications_audit.md` §4 is a miscount; §3's detailed table
lists eight (rows 1–8) and every one of them was live in the current
tree. This is a stop condition per the prompt, so the work halted and
asked the planner. The planner chose "proceed on all 8 sites, halting on
individual Outcome B/C decisions" and then skipped the follow-up Outcome
questions, so each site was handled with the least-risky outcome
consistent with the audit evidence:

| # | File:line | Old event_type | Outcome | Redirect target |
|---|---|---|---|---|
| 1 | `deal-automation-actions.ts:381` (`sendDealNotification`) | `deal_alert` | **C (delete)** | — audit §3 row 5 confirmed zero callers; exported helper removed entirely |
| 2 | `task-automation-actions.ts:103` | `task_overdue` | **A** | `emitNotification({ event_key: 'task.overdue', ... })` |
| 3 | `task-automation-actions.ts:119` | `task_escalated` | **B** (new event) | Added `task.escalated` to the catalog. Recipient is the escalation target passed via `recipient_user_ids` |
| 4 | `task-automation-actions.ts:357` | `task_due_soon` | **A** | `emitNotification({ event_key: 'task.due_soon', ... })` |
| 5 | `task-automation-actions.ts:448` | `task_reassigned` | **A (reuse)** | Reuses `task.assigned` with `metadata.reason = 'auto_reassigned'` — reassignment is semantically an assignment to a new user, not a new event class |
| 6 | `pipeline-automation-actions.ts:285` (`notifyPipelineOwner`) | `pipeline_alert` | **C (delete)** | — audit §3 row 6 confirmed zero callers; helper removed entirely |
| 7 | `automation-governance.ts:80` | `automation_approval_requested` | **B** (new event) | Added `automation.approval_requested` to the catalog under `module: 'system'` |
| 8 | `automation-governance.ts:132` | `automation_approval_reviewed` | **B** (new event) | Added `automation.approval_reviewed` to the catalog under `module: 'system'` |

Three new events were added to `src/lib/notifications/event-catalog.ts`:
`task.escalated`, `automation.approval_requested`,
`automation.approval_reviewed`. Every redirect site uses a deterministic
`event_id` for idempotency (e.g. `task.overdue:${task.id}`,
`automation.approval_requested:${approvalId}`).

**Tests added:** `src/lib/automations/__tests__/phase-2a-5-notification-redirect.test.ts`
— 8 contract tests covering the catalog shape of each redirect target,
plus assertions that the two Outcome-C events (`deal.alert`,
`pipeline.alert`) are **not** in the catalog so a future contributor
can't accidentally re-wire the deleted helpers.

**Deferred outcome-B confirmations:** Because the planner skipped the
per-site follow-up questions, the product decision about who is notified
on which channels for the three new events was made using the default
audiences/channels from the most similar existing events. The default
copy and channel set can be tuned in 2b once the first real automation
trigger fires. See "Open questions for the planner" below.

---

## Output — `dental-crm/docs/phase-2a-5-changes.md`

(This file.)

---

## Discovery findings

### Pre-flight check #1 — `quickRouteDeal` / `quickRoute`

```
dental-crm/src/lib/treatment-routing/adapter.ts
  312:export async function quickRoute(

dental-crm/src/lib/treatment-routing/index.ts
  49:  quickRoute,
  50:  quickRoute as quickRouteDeal, // Alias for clarity
```

Zero external call sites. One implementation + two re-exports.

### Pre-flight check #2 — `lead_intakes` / `lead_sources` / `auto_categorize_lead`

Zero hits in `dental-crm/src` outside the generated `src/types/supabase.ts`
and the hand-written `src/types/database.ts`. The `database.ts` types were
dead: only `LeadSource` was even imported (by
`integrations-hub.tsx`) and even there the binding was unused.

### Pre-flight check #3 — `from('forms') / from('form_submissions') / from('stages')`

Zero hits in `dental-crm/src`. Safe.

### Pre-flight check #4 — `.from('notifications').insert` in `src/lib/automations/*`

**8 sites found**, not 5 as the prompt claimed. See the Task 5 table
above. Matches `notifications_audit.md` §3 rows 1–8.

### Pre-flight check #5 — Live DB tables

All 5 vestigial tables existed on the live DB:

```
form_submissions, forms, lead_intakes, lead_sources, stages
```

Row counts: **0** across all five.

### Pre-flight check #6 — `auto_categorize_lead` RPC

Exists in `public`.

---

## FK discovery results

### Task 1 (`lead_intakes`, `lead_sources`)

| FK name | Referencing (canonical) | Referenced (vestigial) |
|---|---|---|
| `deals_lead_intake_id_fkey` | `deals.lead_intake_id` | `lead_intakes` |
| `contacts_lead_source_id_fkey` | `contacts.lead_source_id` | `lead_sources` |
| `lead_intakes_lead_source_id_fkey` | `lead_intakes.lead_source_id` | `lead_sources` (internal) |

Additional data-safety checks:

- `SELECT count(*) FROM deals WHERE lead_intake_id IS NOT NULL` → **0**
- `SELECT count(*) FROM contacts WHERE lead_source_id IS NOT NULL` → **0**
- `grep` found zero references to `lead_intake_id` / `lead_source_id` in
  `dental-crm/src/` outside generated types files.

Both FK-bearing columns were functionally dead. Migration drops the
columns before dropping the referenced tables so no zombie columns are
left behind on `deals` / `contacts`.

### Task 2 (`forms`, `form_submissions`, `stages`)

```
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE confrelid IN (
  'public.forms'::regclass,
  'public.form_submissions'::regclass,
  'public.stages'::regclass
);
```

Zero rows. No FK references from any canonical table. CASCADE applied
defensively but had nothing to cascade.

### View dependencies

`pg_views` crawl found two views referencing the doomed entities:

| View | Status |
|---|---|
| `lead_pipeline_analytics` | Dropped outright — pure analytics view over `lead_intakes`, `lead_sources`, `dental_services`. Zero `src/` references. |
| `deals_with_contacts` | Dropped and recreated without the `d.lead_intake_id` passthrough. Used by `src/components/deals/deal-slide-in-panel.tsx` and `src/app/api/export/deals/route.ts`. |

---

## Validation evidence

### Live DB post-migration state

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN ('lead_intakes','lead_sources','forms','form_submissions','stages');
-- → []

SELECT routine_name FROM information_schema.routines
WHERE routine_schema='public' AND routine_name='auto_categorize_lead';
-- → []

SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='deals' AND column_name='lead_intake_id';
-- → []

SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='contacts' AND column_name='lead_source_id';
-- → []

SELECT count(*) FROM public.deals_with_contacts;
-- → 120 (view recreated successfully)
```

### Task 3 verification

```
$ grep -rn "quickRouteDeal\|\\bquickRoute\\b" dental-crm/src
(only the two "Phase 2a.5: removed" comment markers, no exports, no callers)
```

### Task 4 verification

```
$ npx jest src/lib/lead-ingestion
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests:       8 skipped, 28 passed, 36 total
```

Includes the two new tests under `ingestLead — Phase 2a.5 routing_log_id contract`.

TypeScript check on all touched files is clean. Remaining pre-existing TS
errors (in test files that don't import `vitest`, in hardening test suites
referencing an undefined `supabaseService` binding, in settings pages that
reference missing `WorkingHours`/`DaySchedule`/`Database` type exports
that were never in `database.ts`, in automation event-listener `unknown`
type narrowing, etc.) are unchanged from before 2a.5.

### Task 5 verification

```
$ grep -rn "from('notifications').insert\|from(\"notifications\").insert" dental-crm/src/lib/automations
(no matches — all 8 sites redirected or deleted)

$ npx jest src/lib/automations
Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

### Generated Supabase types

Regenerated `src/types/supabase.ts` via Supabase MCP
`generate_typescript_types` after both migrations applied. Post-regen
grep for any of the dropped symbols (`lead_intakes`, `lead_sources`,
`auto_categorize_lead`, the standalone `"forms"` / `"form_submissions"` /
`"stages"` table literals) returns zero matches.

---

## Deferred items

- **Default channel/audience tuning for the three new events**
  (`task.escalated`, `automation.approval_requested`,
  `automation.approval_reviewed`). Copy, severity, and default channels
  were modelled on the closest existing event. Practical tuning should
  happen the first time a real automation trigger fires one.
- **Unit-test harness for the automation actions.** The redirect tests
  this pass added are catalog-shape contracts, not full Supabase-wired
  integration tests. A proper harness (mocking Supabase + the router)
  belongs in a later cleanup.
- **Tangential type cleanup in `src/types/database.ts`.** Pre-existing TS
  errors show `WorkingHours`, `DaySchedule`, `Database` are imported from
  the file but never defined there. Untouched this pass.
- **Pre-existing TS errors across the tree** (test files, scripts, a
  handful of route files). Phase 2a.5 did not introduce any new ones and
  did not try to fix the pre-existing list.
- **Adapter `events.dealRouted` payload cleanup.** The `routingMethod`
  passed to `events.dealRouted` is still cast via `as any`; the enum in
  `events.ts` uses a different vocabulary from `RoutingResult.routingMethod`
  (`ai_keyword` vs `ai_keyword_match`, etc.). Out of scope for this pass.

---

## Open questions for the planner

1. **Task 5 Outcome-B event shapes.** The prompt's decision tree asked me
   to halt on every Outcome-B and Outcome-C call. Eight sites, six of
   which needed product decisions, were answered in-line with sensible
   defaults after the `AskQuestion` follow-up was skipped. If the planner
   wanted a different split (e.g. keep `sendDealNotification` /
   `notifyPipelineOwner` alive behind a new `deal.alert` / `pipeline.alert`
   event, or collapse the two automation-governance events into a single
   `automation.approval` with `metadata.stage`), those are still cheap
   reversals — the catalog additions and the deletions are both small,
   reversible diffs.

2. **`routing_log_id` on `IngestLeadResult`.** The prompt assumed
   `ingestLead()` already invokes the routing adapter. It doesn't, so
   the field is always `null` today. Is the intended design for 2b that
   `ingestLead()` itself calls `routeDealWithAdapter()` (currently deal
   creation and routing happen in the caller), or that 2b's webhook
   handlers continue to call them separately and wire the adapter's
   `routingLogId` to the `IngestLeadResult` they surface? The type shape
   is ready for either.

3. **`dental-crm/docs/phase-2a-3-changes.md`** is missing from the
   `docs/` folder (jumps from `phase-2a-2b-changes.md` to
   `phase-2a-4-changes.md`). This change log follows the format of
   `phase-2a-4-changes.md` and mirrors the 2a.4 section headings;
   happy to rename/renumber if the phase-3 gap is intentional.
