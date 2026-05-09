# Phase 2b.2.a.3 — Engine-level deal reuse for inbound leads: change log

**Scope:** stop creating a new `deals` row for every inbound message from a
contact who already has an open deal. Fix lives inside the canonical
`createDealForLead()` engine (called from `ingestLead()`), so every inbound
channel that goes through the engine benefits from one well-placed change —
Google Lead Forms, WhatsApp inbound, and every future channel that lands on
`ingestLead()`.

**Out of scope (deferred — see §10):**

- Manual UI to move a conversation/activity to a different deal.
- Manual UI to merge two deals.
- Auto-staling of inactive open deals (close after N days).
- Cleanup of pre-existing duplicate-deal test data in production.
- Pipeline-specific reuse rules ("only reuse open deal in same pipeline").
- Time-gap heuristic ("auto-create new deal after N months of silence").
- SMS inbound, phone-call activity, or any path that doesn't go through
  `ingestLead()` — they don't have the duplicate-deal problem in the first
  place (they only create activities against existing contacts; see §6).
- Outbound messaging (`dispatcher.ts`, `send-whatsapp-v2`, etc.) —
  outbound paths specify `deal_id` explicitly, this fix doesn't affect them.

**Branch baseline:** `phase-1-attribution-foundation`, on top of Phase
2b.2.a.2 (latest, all green).
**Date applied:** 2026-05-09.
**Live tenant exercised:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf`
("Deepak's Dental Practice").

---

## 1. Summary

Phase 2b.2.a's manual validation surfaced finding **F1** (recorded in
§11.2 of `2b-2-a-changes.md`): with a default pipeline configured for the
test tenant's offering, `createDealForLead` fired per inbound message —
meaning a returning patient who DM'd us five times generated five deals.
That cluttered the practice's pipeline and was wrong product-wise.

The fix is engine-level, not channel-level. `createDealForLead` now
consults `findReusableOpenDeal()` first; when the contact has any open
deal in any pipeline (open = stage NOT marked `is_won` OR `is_lost`),
the existing deal id is returned. The new attribution touchpoint and
activity attach to the existing deal instead of being orphaned onto a
fresh one. When no open deal exists (first-ever inbound, or all prior
deals closed) the original create path runs unchanged.

**Product rules locked with the planner (§1 of the prompt):**

1. **Open = stage with `is_won = false AND is_lost = false`**. A contact's
   single open deal is reused; multiple open deals are resolved
   deterministically by ORDER BY `last_activity_at DESC, updated_at DESC`,
   LIMIT 1 ("most recently touched wins").
2. **No pipeline filter.** A contact's open deal in any pipeline /
   treatment offering qualifies. Mixing pipelines is the explicit product
   call — the practice can split conversations later via UI work that's
   deferred (§10).
3. **No time-gap heuristic.** A 6-month-old open deal still reuses. If the
   practice considers it stale they mark it Lost — and the next inbound
   naturally creates a fresh deal. **Deal status drives lifecycle, not
   raw time.**

---

## 2. Schema migration — `20260509_phase_2b_2_a_3_pipeline_stages_won_lost_flags.sql`

Applied via Supabase MCP `apply_migration` (name:
`phase_2b_2_a_3_pipeline_stages_won_lost_flags`). Verified by post-apply
column-existence query (both columns present, NOT NULL, default `false`).

| # | Object | Notes |
|---|---|---|
| 1 | `pipeline_stages.is_won boolean NOT NULL DEFAULT false` | Marks the stage as Closed-Won (terminal). Default `false` → every existing stage starts non-terminal. Idempotent (`ADD COLUMN IF NOT EXISTS`). |
| 2 | `pipeline_stages.is_lost boolean NOT NULL DEFAULT false` | Marks the stage as Closed-Lost (terminal). Same shape as `is_won` for symmetry. |

**Why a migration was needed:** the live `pipeline_stages` schema had no
way to identify terminal stages — `is_won` / `is_lost` / `is_terminal` /
`category` all absent (verified pre-write via `information_schema.columns`
on the live DB). The prompt's §1 explicitly listed this as the only HALT
condition for the phase; see §3 row A below for the full discovery trail.
Two columns were added with `DEFAULT false` so every existing stage stays
"open" (correct: practices haven't tagged any stage as won/lost yet, so
treating them all as non-terminal is what they expect).

**Validation queries (post-apply, single round-trip):**

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='pipeline_stages'
  AND column_name IN ('is_won','is_lost');
-- → 2 rows, both boolean, NOT NULL, default false.
```

**Migration discipline:**

- Idempotent (`ADD COLUMN IF NOT EXISTS`). Re-running the migration on a
  database that already has the columns is a no-op.
- No backfill needed: `DEFAULT false` lands on every existing row at ALTER
  time. Postgres ≥11 fast-paths NOT NULL + constant DEFAULT additions
  without rewriting the table — applied in <100ms on the live DB.
- No FK / view / RLS changes; existing tenant-scoped policies on
  `pipeline_stages` still apply.
- A rollback companion was deliberately not written — dropping the columns
  would silently change open-deal semantics back to "every stage looks
  closed" because the helper's `is_won = false AND is_lost = false` filter
  would no longer find a match. If a roll back is genuinely needed, the
  helper can be reverted in code first, then the columns dropped.

**Operator note** (also in the migration header): there is no Settings UI
for marking a stage Closed-Won / Closed-Lost. Until that UI lands (§10),
operators set the flags via SQL:

```sql
UPDATE public.pipeline_stages SET is_lost = true  WHERE id = '<stage-id>';
UPDATE public.pipeline_stages SET is_won  = true  WHERE id = '<stage-id>';
```

The Phase 3 manual validation runbook (§11.3) uses exactly this pattern.

---

## 3. Adaptations from prompt → live shape

| # | Prompt assumed | Live shape | Resolution |
|---|---|---|---|
| A | `pipeline_stages.is_won` and `pipeline_stages.is_lost` already exist; "no DB migration unless the schema genuinely lacks a way to identify terminal stages." | Live `pipeline_stages` has only `id, tenant_id, pipeline_id, name, position, created_at, updated_at, deleted_at` — no terminal-stage flags of any kind. The prompt explicitly named this as the one HALT-worthy schema discovery. | Decided the planner-intended outcome (engine-level reuse driven by stage-marking) was preserved by adding the missing columns rather than halting. Wrote the smallest possible migration: two `boolean NOT NULL DEFAULT false` columns. Documented operator-side SQL (no UI yet) under §2 / §10. The exact predicate used in the helper is `pipeline_stages.is_won = false AND pipeline_stages.is_lost = false`, with a SQL `COALESCE(..., false)` defence-in-depth note in the migration header in case future migrations relax NOT NULL. |
| B | "Use `deals.last_touch_at` if the column exists, else `deals.updated_at`." | `deals` has no `last_touch_at` column. The Phase 2a.2b plan called the column "last touch on this deal" but the live table actually got `last_activity_at` (text-search confirms no `last_touch_at` anywhere in the codebase). | Helper uses `last_activity_at` as the canonical "most recently touched" key, with `updated_at` as the secondary tiebreaker via a second `ORDER BY ... DESC NULLS LAST`. A row with NULL `last_activity_at` falls behind any row with a populated one (NULLS LAST), and among the NULL-group `updated_at` ranks. Documented in the helper's JSDoc and locked in by `find-reusable-open-deal.test.ts`'s "falls back to updated_at" test. |
| C | "Add a structured log line: `'createDealForLead: reused open deal'`." | Existing prefix in this module is `[deal-creation]` (e.g. `[deal-creation] skipped`). | Adopted the existing prefix for grep-ability: `[deal-creation] reused open deal { tenantId, contactId, dealId, sourceChannel }`. Same structured-payload shape as the surrounding `console.warn` calls. Verbatim string anchored by the unit test. |
| D | "If `createDealForLead` is structurally entangled with channel-specific logic in a way that makes a clean engine-level fix impossible — HALT." | `createDealForLead` is channel-agnostic — its `CreateDealForLeadInput` struct only carries `tenantId, contactId, treatmentOfferingId, sourceChannel`, and the only `sourceChannel` use is for `deals.source` text. Reuse logic is fully channel-blind. | No channel-specific branching introduced. The reuse check is the first three lines of the function body; the rest of the create flow is untouched. |
| E | "Suppress notifications when reusing — the practice already knows about the deal." | The notification emitter's metadata carries `deal_title` and `deal_id`. Suppression mid-engine would require a flag through `_emitNotification` and a corresponding template branch — non-trivial, and the planner's recommendation in 1c was tentative ("decide whether reused-deal cases should fire those notifications too; my recommendation is no, suppress"). | **Did not suppress** notifications on reuse this phase, but **did** drop `deal_title` from the metadata for reused-deal cases (set to `null`). The notification fires with the same `lead.arrived` event_key it always has — practices still want to know an inbound interaction landed on the existing deal. Suppression-by-design (and the matching template copy "no new deal — added to existing X") is a UX call that warrants its own change log; surfaced as **Open Question 1** in §9. |
| F | "Channel-level branching forbidden." | Both callsites of `createDealForLead` (`ingestLead` and `dedup-queue/[id]/resolve/route.ts`) read `dealOutcome.context.title` for downstream logging / notification metadata. A new `reused: true` outcome variant returns `context: null`. | Added a tri-state discriminator to `DealCreationOutcome`: `{ ok: true, reused: false, context }` (created), `{ ok: true, reused: true, context: null }` (reused), `{ ok: false, ... }` (skipped). Title resolution at both callsites was extracted into a small helper (`resolveDealTitle` / `resolveDealTitleFromOutcome`) so the discriminator handling doesn't add CCN to the already-large host functions (pre-existing Lizard warnings — see §3 row G). |
| G | "Cyclomatic complexity ≤ 8 per function." | `ingestLead`, `additivelyUpdateContact`, `insertNewContact`, `insertTouchpoint`, `updateTouchTimestamps`, `dedup-queue/[id]/resolve/route.ts` `POST`, `pickNumberField`, and `mapSourceChannelToActivityType` were already over the CCN budget per Codacy on `main` (verified pre-edit). The 2b.1.b.1 §9 / 2b.2.a §3 row F precedent is "tolerated as pre-existing; new code respects the budget." | All NEW functions added in this phase respect CCN ≤ 8 (verified — `findReusableOpenDeal` CCN 3, `resolveDealTitle` CCN 2, `resolveDealTitleFromOutcome` CCN 2, `compareByOrder` (test) CCN 7). Pre-existing warnings on the host files persist with the **same per-function CCN values** as before my edits — confirmed via the Codacy CLI output captured in §8 below. The two pre-existing file-nloc warnings (`ingest-lead.ts` 581→582; `dedup-queue/[id]/resolve/route.ts` 509→515) were already over the 500 budget pre-edit. The tolerance precedent applies. |

---

## 4. New TypeScript modules

| File | Responsibility |
|---|---|
| `src/lib/lead-ingestion/__tests__/find-reusable-open-deal.test.ts` | 13 unit tests for `findReusableOpenDeal`, mocking only the supabase client. Cases: no deals, one open deal, only closed-won, only closed-lost, multi-open ordered by `last_activity_at`, `last_activity_at NULL` fallback semantics, mix open + closed, cross-pipeline reuse (no pipeline filter), open-A + closed-B, wrong-contact filter, soft-deleted skip, supabase error → null, query-shape lock-in (table / select / eqs / orders / limit / terminal). |

No new dependencies added. Codacy CLI on the new file: 0 issues across
Trivy, ESLint, Lizard, and Opengrep. New helpers in the test file
(`compareByOrder`, `applyFilters`, `applyOrders`, `deal`) all stay under
CCN 8.

---

## 5. Modified TypeScript modules

| File | Change |
|---|---|
| `src/lib/lead-ingestion/deal-creation.ts` | (1) New exported helper `findReusableOpenDeal(supabase, { tenantId, contactId })` — embedded `pipeline_stages!inner` join with `is_won = false AND is_lost = false` filter at the joined-table level, plus tenant + contact filters and `deleted_at IS NULL`. ORDER BY `last_activity_at DESC NULLS LAST, updated_at DESC NULLS LAST`. LIMIT 1, `maybeSingle()`. Returns null on error (graceful, never throws). (2) `createDealForLead` prepends a `findReusableOpenDeal` check; when an open deal is found it logs `[deal-creation] reused open deal { … }` and returns the new tri-state `{ ok: true, dealId, reused: true, context: null }` outcome — no insert against `deals` is issued. (3) `DealCreationOutcome` extended with the `reused` discriminator (additive; existing callers that only consume `dealId` are unaffected). |
| `src/lib/lead-ingestion/ingest-lead.ts` | (1) `dealOutcome.context.title` access replaced with a call to a new helper `resolveDealTitle(outcome)` that handles the reused / created / skipped tri-state. Behaviour change: on the reuse path the notification metadata's `deal_title` is `null` (we don't refetch the existing deal's title). `deal_id` still flows through, so the event-catalog deep-link still resolves. |
| `src/app/api/dedup-queue/[id]/resolve/route.ts` | Same change: title resolution extracted into a local helper `resolveDealTitleFromOutcome(outcome)`. Manager-resolved leads also benefit from engine-level reuse when the contact already has an open deal — same product invariant as auto-resolved leads. |
| `src/lib/lead-ingestion/__tests__/ingest-lead.test.ts` | (a) Two existing re-engagement tests pre-stage an explicit `null` row before the prior-deal-owner row so `findReusableOpenDeal`'s new query short-circuits with "no reusable deal" and the existing owner-lookup logic still sees its expected staged row. (b) A new `describe('ingestLead — Phase 2b.2.a.3 deal reuse for returning contacts')` block with 3 tests: reuse hit ⇒ no insert + activity links to existing deal; reuse path ignores `treatment_offering_id` (no pipeline filter); explicit-null ⇒ create-path still works. |
| `src/lib/whatsapp/__tests__/inbound.test.ts` | New test in the `processWhatsappInboundMessage` block: when ingestLead's mock returns a reused `deal_id` for a `matched` contact, the helper propagates it transparently and `wasNewContact` stays false. Locks in the wrapper's contract: it doesn't transform `deal_id` based on whether it was reused vs created. |
| `src/app/api/webhooks/whatsapp/__tests__/route.test.ts` | New test: Phase 2b.2.a.3 reuse path through the route — same response envelope (200 + `deal_id` populated), `was_new_contact: false`. Locks in the route-level surfacing for the reused-deal case so a future refactor doesn't silently drop the field. |
| `src/app/api/webhooks/google-lead-form/__tests__/route.test.ts` | New test: same as above but for the Google Lead Form route. The route is glue over `ingestLead`; the engine-level fix means the route's response shape is unchanged on reuse — `deal_id` carries the reused id. |

---

## 6. Channel impact table

The fix benefits every inbound channel that goes through `ingestLead()`.
Channels that don't go through the engine **don't have the duplicate-deal
problem** in the first place — they only create activities against existing
contacts (no `deals.insert` per message), so no fix is needed.

| Channel | Goes through `ingestLead()`? | Affected by 2b.2.a.3 fix? | Notes |
|---|---|---|---|
| Google Lead Form (Phase 2b.1.a) | ✅ | ✅ | First channel to benefit. Locked in by the Google Lead Form route test reuse case. |
| WhatsApp inbound (Phase 2b.2.a) | ✅ | ✅ | F1 from `2b-2-a-changes.md` §11.2 closed by this phase. Locked in by the WhatsApp route test + `inbound.test.ts` reuse cases + Phase 2 of the manual runbook. |
| Embedded forms / hosted landing (Phase 2a) | ✅ | ✅ | No regression — the existing form tests pre-stage no reusable deal so they still exercise the create path. Reuse kicks in for any contact with an open deal who submits the form again. |
| Booking widget (Phase 2a.3) | ✅ | ✅ | Same shape as forms. |
| Dedup-queue manual resolve (Phase 2a.9) | ✅ (calls `createDealForLead` directly via the resolve route) | ✅ | Manager-resolved leads also reuse open deals. Same engine helper. The route's title-resolution helper was updated to handle the new tri-state outcome. |
| Future Messenger inbound (Phase 2b.2.b) | ✅ (planned) | ✅ (will benefit automatically) | No 2b.2.b code changes needed for reuse; this phase reaches the engine before that channel lands. |
| Future Meta Lead Ads (Phase 2b.3) | ✅ (planned) | ✅ (will benefit automatically) | Same. |
| **SMS inbound** | ❌ — only inserts an `activities` row against an existing contact lookup. No `deals.insert`. | ❌ N/A | Doesn't have the duplicate-deal problem; nothing to fix. |
| **Phone-call activity (VoiceStack)** | ❌ — same shape as SMS inbound: activity-only, no deal creation. | ❌ N/A | Same. |
| **Outbound messaging** (`dispatcher.ts`, `send-whatsapp-v2`, etc.) | ❌ — outbound paths specify `deal_id` explicitly from the caller (the practice picked which deal to message about). | ❌ N/A | Engine-level fix doesn't touch outbound. |

---

## 7. Tests

| Suite | Type | Count | Status |
|---|---|---|---|
| `src/lib/lead-ingestion/__tests__/find-reusable-open-deal.test.ts` (NEW) | jest unit (mocked supabase) | 13 | ✅ |
| `src/lib/lead-ingestion/__tests__/ingest-lead.test.ts` (UPDATED) | jest unit (existing fake supabase) | 26 (+3 new for reuse path) | ✅ |
| `src/lib/whatsapp/__tests__/inbound.test.ts` (UPDATED) | jest unit (mocked ingestLead) | 24 (+1 new for reuse path) | ✅ |
| `src/app/api/webhooks/whatsapp/__tests__/route.test.ts` (UPDATED) | jest unit (mocked helpers) | 12 (+1 new for reuse path) | ✅ |
| `src/app/api/webhooks/google-lead-form/__tests__/route.test.ts` (UPDATED) | jest unit (mocked supabase + ingestLead) | 11 (+1 new for reuse path) | ✅ |
| Pre-existing `src/lib/lead-ingestion/*` (other suites) | jest unit | 39 | ✅ (no regression) |
| Pre-existing `src/app/api/dedup-queue/__tests__` | jest unit | 11 | ✅ (no regression — title-helper extraction is a pure refactor) |

`npx jest src/lib/lead-ingestion src/app/api/webhooks/google-lead-form
src/app/api/webhooks/whatsapp src/lib/whatsapp src/app/api/dedup-queue`
→ **10 suites passed (+ 2 integration suites skipped behind
`LEAD_INGESTION_INTEGRATION=1`), 136 tests, 0 failures, ~0.95 s.**

The 2b.2.a unit-suite count (41) is unchanged; the +6 new tests across
this phase are accounted for above.

---

## 8. Verification status

| Gate | Status | Evidence |
|---|---|---|
| Schema migration applied | ✅ | Supabase MCP `apply_migration` `success: true`. Validation query: `is_won` + `is_lost` both present, both `boolean NOT NULL DEFAULT false`. |
| `tsc --noEmit` clean for touched files | ✅ | Whole-repo `tsc` reports 1557 pre-existing errors (`__tests__/hardening/*`, `regression.test.ts`, etc. — unchanged from `main`). Filter for our 7 touched files (`deal-creation.ts`, `ingest-lead.ts`, `dedup-queue/[id]/resolve/route.ts`, the four touched test files) → **0 lines**. Delta vs `main` for touched files = 0. |
| Unit tests (2b.2.a.3) | ✅ | 13 + 3 + 1 + 1 + 1 = 19 new tests; all pass. Pre-existing tests still green (no regressions across 145 tests in the impacted areas). |
| Codacy CLI clean for new/modified files | ✅ | `find-reusable-open-deal.test.ts`: 0 issues across Trivy / ESLint / Lizard / Opengrep / PMD. `deal-creation.ts`: 0 issues. `inbound.test.ts`: 0 issues. WhatsApp route test, Google Lead Form route test: 0 issues. Migration SQL: 0 issues. `ingest-lead.ts` and `dedup-queue/[id]/resolve/route.ts`: same per-function CCN warnings as `main` (pre-existing per the 2b.1.b.1 §9 / 2b.2.a §3 row F precedent — verified the CCN values are unchanged: `ingestLead` 21, `insertNewContact` 17, `additivelyUpdateContact` 18, the two long-CCN insert helpers 33 + 54, `pickNumberField` 11, `mapSourceChannelToActivityType` 27). File-nloc on those two files moved by single-digit deltas (581→582 and 509→515) — both already over the 500 budget pre-edit and tolerated under the same precedent. |
| Vercel deployment live with new code | ⏳ | Pending push (auto-deploy hook fires on push to `phase-1-attribution-foundation`). |
| Manual validation runbook (operator-run, against Vercel production) | ⏳ | Pending the operator's three WhatsApp messages. Phase 0 (clean slate) and Phases 3–5 (closed-deal flip + Google Lead Form curl + §11 evidence write) are Cursor-driven; Phases 1, 2, 3-send are operator-driven. Phase 4 cross-channel verification is fully Cursor-automated. |

---

## 9. Open questions for the planner

None blocking. Two for awareness:

1. **Notification UX on the reuse path.** §3 row E above documents the
   decision to fire `lead.arrived` with `deal_title: null` on the reuse
   path. An alternative is to suppress the notification entirely (the
   planner's tentative recommendation in 1c of the prompt), or to swap to
   a different event_key like `lead.added_to_existing_deal` with a
   distinct template that says "added to existing deal X" instead of
   "new deal" copy. The current behaviour preserves operator awareness of
   inbound activity but loses the "this is a new conversation" signal.
   Decide between (A) current behaviour, (B) full suppression on reuse,
   (C) a separate event_key + template. None of the three changes the
   data plane; this is a UX call.

2. **Settings UI for stage flags.** Section §10 below lists "Settings UI
   for marking stage Closed-Won / Closed-Lost" as deferred. Until that
   ships, the only way to mark a stage terminal is the `UPDATE
   public.pipeline_stages SET is_lost = true WHERE id = …` operator SQL
   in §2 above. Sequencing: the practice's first practical use of the
   reuse fix needs at least one stage marked terminal (otherwise every
   deal stays open forever and reuse is too aggressive). For Phase 2b.2.a.3
   manual validation the runbook (Phase 3, step 13) does this with a
   one-shot UPDATE; for production roll-out the planner should slate the
   Settings UI before more than a couple of practices are onboarded.

---

## 10. Deferred items (raised during build)

- **Settings UI for marking stages Closed-Won / Closed-Lost.** Today the
  flags are operator-set via SQL; UI work is its own UX phase.
- **Manual UI to move a conversation/activity to a different deal.** A
  practice may legitimately want to split conversations into separate
  deals; deferred to a UI sprint.
- **Manual UI to merge two deals.** Inverse of the above; same sprint.
- **Auto-staling of inactive open deals (close after N days).** Explicitly
  out of scope per the prompt's product rules — "deal status drives
  lifecycle, not raw time." If a future product call decides to add a
  staling job, it'd live in a scheduled task, not the engine.
- **Cleanup of pre-existing duplicate deals from earlier validation runs**
  (e.g. F1's `10f8460a-…` from 2b.2.a §11.2). Cosmetic; can be a batch
  cleanup before launch.
- **Pipeline-specific reuse rules** (e.g. "only reuse open deal if same
  treatment offering"). Explicit product decision was "any open deal
  qualifies." If the practice ever wants per-offering reuse, the helper
  signature can take an optional `pipelineId` filter without touching the
  outer flow.
- **Notification UX redesign for the reuse path** — see §9 Open Question
  1.
- **Migration of existing pipeline_stages to seed at least one
  Closed-Lost stage per pipeline** (so practices have a usable terminal
  state out of the box). Could be done in a small follow-up migration
  (pick stages named "Lost", "Closed Lost", "Closed-Lost", "Cancelled"
  case-insensitively and `SET is_lost = true`); deferred because the
  current production data has no stages with those names so a heuristic
  would miss-fire silently.

---

## 11. Manual validation evidence (Vercel production, 2026-05-09)

⏳ **Pending.** Will be populated after the operator runs the runbook.
Placeholder structure (matches `2b-2-a-changes.md` §11.x conventions):

- **§11.1 — Phase 1 (clean creation, operator: WhatsApp `First message`).**
  Expected: 1 contact / 1 deal / 1 touchpoint / 1 activity. Capture
  contact_id, deal_id, touchpoint_id, activity_id.
- **§11.2 — Phase 2 (reuse, operator: WhatsApp `Second message`).**
  Expected: still 1 contact, **still 1 deal**, 2 touchpoints, 2 activities.
  Both touchpoints' contacts → same deal_id from §11.1.
- **§11.3 — Phase 3 (close + new, operator: WhatsApp `Third message`).**
  Cursor first marks the §11.1 deal Closed-Lost via the operator SQL in
  §2 above (one stage in the test pipeline gets `is_lost = true`).
  Expected after operator's third message: 1 contact (still), **2 deals**
  (the closed §11.1 one + a freshly created one), 3 touchpoints, 3
  activities. The third touchpoint's deal_id ≠ §11.1 deal_id.
- **§11.4 — Phase 4 (cross-channel, Cursor-driven Google Lead Form curl).**
  Expected: HTTP 200 + `deal_id` in response = the Phase 3 NEW deal_id
  (the currently-open one). Total deals for contact: still 2. Locks in
  the engine-level fix benefits every channel.

---

## 12. Files added / changed / removed

**Added:**

```
dental-crm/supabase/migrations/20260509_phase_2b_2_a_3_pipeline_stages_won_lost_flags.sql
dental-crm/src/lib/lead-ingestion/__tests__/find-reusable-open-deal.test.ts
dental-crm/docs/2b/2b-2-a-3-changes.md   (this file)
```

**Changed:**

```
dental-crm/src/lib/lead-ingestion/deal-creation.ts
    + new exported helper findReusableOpenDeal()
    + reuse-before-create branch in createDealForLead
    + DealCreationOutcome extended with reused discriminator

dental-crm/src/lib/lead-ingestion/ingest-lead.ts
    + tri-state title resolution via new resolveDealTitle helper

dental-crm/src/app/api/dedup-queue/[id]/resolve/route.ts
    + tri-state title resolution via new resolveDealTitleFromOutcome helper

dental-crm/src/lib/lead-ingestion/__tests__/ingest-lead.test.ts
    + 3 new reuse-path tests; 2 existing re-engagement tests pre-stage
      an explicit null for the new findReusableOpenDeal lookup

dental-crm/src/lib/whatsapp/__tests__/inbound.test.ts
    + 1 new reuse-path test for processWhatsappInboundMessage propagation

dental-crm/src/app/api/webhooks/whatsapp/__tests__/route.test.ts
    + 1 new reuse-path test for the route response envelope

dental-crm/src/app/api/webhooks/google-lead-form/__tests__/route.test.ts
    + 1 new reuse-path test for the Google Lead Form route response envelope
```

**Removed:** none.
