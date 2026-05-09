# Phase 2b.2.a — WhatsApp inbound webhook rebuild: change log

**Scope:** rewire `/api/webhooks/whatsapp` so an inbound WhatsApp message
from a prospective patient (Twilio sandbox today, real WhatsApp Business
Sender later) creates a contact + deal + attribution touchpoint via the
canonical `ingestLead()` engine, with secure tenant resolution,
always-required Twilio signature verification, and `MessageSid`-based
idempotency. **Text only** — media handling is captured in raw_payload
for 2b.2.a.2 to pick up but not downloaded or stored.

**Out of scope (deferred):**

- Media download / storage / rendering — Phase 2b.2.a.2 (immediately next).
- Messenger inbound — Phase 2b.2.b (greenfield; same shape as this).
- Settings UI for WhatsApp — Phase 2b.2.c.
- Outbound WhatsApp paths (`dispatcher.ts`, `send-whatsapp-v2`,
  `whatsapp-config-tab.tsx`) — separate sprint.
- Credential storage drift between encrypted vault and plain-text
  `tenants.whatsapp_*` columns — separate sprint.
- Auto-reply / business-hours / opt-in flows — later automations phase.
- Cleanup of dead `+447782218044` env var — operator's call.

**Branch baseline:** `phase-1-attribution-foundation`, on top of Phase
2b.2 sandbox setup (`docs/2b/2b-2-twilio-sandbox-setup.md`).
**Date applied:** 2026-05-09.
**Live tenant exercised:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf`
("Deepak's Dental Practice"), `whatsapp_phone_number = '+14155238886'`
(Twilio shared sandbox number).

---

## 1. Summary

The five known defects called out in `docs/2b/2b-2-pre-plan-findings.md`
are closed:

| # | Pre-2b.2.a defect | Fix |
|---|---|---|
| 1 | WhatsApp inbound never called `ingestLead()`; new patients produced a stub `activities` row with `tenant_id: undefined` and nothing else. | The rewritten route delegates to `processWhatsappInboundMessage`, which calls `ingestLead()` for both new and existing-contact paths. Contact, deal, attribution touchpoint, and activity are all written. |
| 2 | Cross-tenant lookup hazard: tenant resolution matched `From` against `contacts.primary_phone` with no tenant filter. | Tenant is now resolved by the receiving (`To`) WhatsApp number against `tenants.whatsapp_phone_number`. Lead-engine then dedups within that tenant. |
| 3 | `verifyTwilioSignature` silently no-op'd when the `X-Twilio-Signature` header was absent. | New tri-state helper returns `'valid' | 'missing_header' | 'invalid_signature'`. Callers treat the latter two identically (401). The "no header → pass" hole is closed. |
| 4 | Webhook crashed 500 with `tenant_id NOT NULL` violation when the `From` number didn't match any contact. | Tenant comes from the `To`-number lookup; ingestLead's contact-creation path handles the no-prior-contact case correctly. |
| 5 | No idempotency on Twilio's `MessageSid` — a Twilio retry would have doubled-up records. | Two-layer idempotency: (a) pre-flight `isMessageAlreadyProcessed` SELECT; (b) DB-level partial unique index on `(tenant_id, source_channel, external_message_id) WHERE external_message_id IS NOT NULL`. The route catches the unique-violation race and converts it to a 200 idempotent response. |

The single-channel chokepoint (`ingestLead()`) that 2a.2a established
and 2b.1.a wired Google Lead Form into is now also the WhatsApp inbound
entry point, so dedup, SLA resolution, deal creation, attribution
touchpoint, activity insertion, and `lead.arrived` notifications all
behave identically across channels.

---

## 2. Schema migration — `20260509_phase_2b_2_a_whatsapp_inbound_source_channel_and_external_message_id.sql`

Applied via Supabase MCP `apply_migration` (name:
`phase_2b_2_a_whatsapp_inbound_source_channel_and_external_message_id`).
Verified by post-apply count query (`enum_added=1, column_added=1,
index_added=1`).

| # | Object | Notes |
|---|---|---|
| 1 | `public.source_channel_enum += 'whatsapp_inbound'` | New value (post-2a-foundation enum had 25 values; now 26). The existing `whatsapp_*` channel values describe how a lead **arrived** ("clicked our website button"), not "the patient DM'd us". `whatsapp_inbound` is the dedicated channel for Twilio-mediated inbound messages. |
| 2 | `attribution_touchpoints.external_message_id text NULL` | Generic across channels — paired with `source_channel` so 2b.2.b (Messenger inbound) can reuse the same column for Meta's `mid`. Documented via `COMMENT ON COLUMN`. |
| 3 | `idx_attribution_touchpoints_external_msg_uniq` | `UNIQUE INDEX ... ON attribution_touchpoints (tenant_id, source_channel, external_message_id) WHERE external_message_id IS NOT NULL`. Doubles as the lookup index for the `isMessageAlreadyProcessed` pre-check AND the safety net for the race-past-pre-check case. |

**Validation queries (post-apply, single round-trip):**

```sql
SELECT
  (SELECT count(*) FROM pg_enum e
     JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = 'source_channel_enum'
       AND e.enumlabel = 'whatsapp_inbound') AS enum_added,
  (SELECT count(*) FROM information_schema.columns
     WHERE table_schema='public'
       AND table_name='attribution_touchpoints'
       AND column_name='external_message_id') AS column_added,
  (SELECT count(*) FROM pg_indexes
     WHERE schemaname='public'
       AND tablename='attribution_touchpoints'
       AND indexname='idx_attribution_touchpoints_external_msg_uniq')
       AS index_added;
-- → 1 / 1 / 1
```

**Migration discipline:**

- Idempotent (`ADD VALUE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`,
  `CREATE UNIQUE INDEX IF NOT EXISTS`).
- No backfill — the partial index ignores existing `NULL` rows.
- No FK / view / RLS changes; the touchpoints table's existing tenant
  RLS still applies.
- Supabase advisors re-run after apply: zero new issues against
  `attribution_touchpoints` (existing `*_security_definer_view`
  warnings on unrelated views are unchanged).

A rollback companion (`*_rollback.sql`) was deliberately **not**
written: enum-value drops are not idempotent in Postgres (`ALTER TYPE
... DROP VALUE` does not exist) and dropping the column would orphan
the `idx_attribution_touchpoints_external_msg_uniq` index. Recovery
path if this needs to be reversed: nullify `external_message_id`
on the rows we just wrote (low single digits during validation),
drop the index, drop the column. The enum value can stay.

---

## 3. Adaptations from prompt → live shape

| # | Prompt assumed | Live shape | Resolution |
|---|---|---|---|
| A | The route handler would set `external_message_id` on the new touchpoint row directly. | `attribution_touchpoints` is only inserted from inside `ingestLead()`'s `insertTouchpoint()`. The outer route handler doesn't touch the table. | Added an optional `external_message_id?: string \| null` field to `IngestLeadInput` and threaded it through `insertTouchpoint()`. Additive change to the engine; all existing callers (Google Lead Form, dedup-queue resolve, form embed adapters) continue to omit it and the column stays NULL for them. |
| B | Activity body lives on a `body` column on `activities`. | Live `activities` schema has no `body` column — `description` is the long-text column, with `subject`, `snippet`, `rich_content`, etc. as siblings. `ingestLead.insertActivity()` already writes `description = input.treatment_intent_text \|\| 'New lead via <channel>'`. | Pass the WhatsApp message text via `treatment_intent_text` so it lands in `activities.description`. No need for a separate post-ingestLead activity insert. The activity gets `type='whatsapp'`, `direction='inbound'`, `source_channel='whatsapp_inbound'`, `description=<message body>` in one shot. |
| C | `whatsapp_inbound` was assumed not to need a label entry. | `Record<SourceChannelEnum, string>` in `src/lib/lead-ingestion/source-labels.ts` is exhaustive — TypeScript fails the build until every enum value has a label. | Added `whatsapp_inbound: 'WhatsApp (inbound message)'`. Consumed by the dedup-queue UI and the `lead.arrived` notification template's `source_label` variable. |
| D | The dedup-queue resolve route's `mapSourceChannelToActivityType` switch is exhaustive over `SourceChannelEnum`. | Existing `default:` branch returns `'note'`; new enum values silently fall through. | Added `case 'whatsapp_inbound':` as a fall-through alongside the other `whatsapp_*` cases → `'whatsapp_message'`. Keeps queue-resolved WhatsApp inbound rows visually consistent with queue-resolved `whatsapp_*_button/_qr/_meta_ad` activities. |
| E | A Postgres-ENUM `ALTER TYPE ... ADD VALUE` migration must be run outside a transaction in older Postgres. | Supabase MCP wraps each migration in its own transaction. Postgres 12+ allows `ADD VALUE` inside a transaction as long as the new value isn't referenced in the same transaction. | The migration only adds the value; the unique index and the column don't reference it. Migration applied in one transaction without splitting. |
| F | Pre-existing complexity warnings on `ingest-lead.ts` and `dedup-queue/[id]/resolve/route.ts` would need refactoring. | Per 2b.1.b.1 §9 precedent, pre-existing Lizard warnings on `ingest-lead.ts` were verified pre-existing and tolerated; same precedent applies here. The 2b.2.a edits added (a) one optional field to `IngestLeadInput`, (b) one column to `insertTouchpoint`'s INSERT, (c) one fall-through case to two switches. None of these adds a new branch / new complexity point. | Documented; not refactored. The new helpers in `src/lib/whatsapp/` are all under CCN 8 (Lizard reported 0 warnings). |

---

## 4. New TypeScript modules

| File | Responsibility |
|---|---|
| `src/lib/whatsapp/twilio-signature.ts` | `verifyTwilioSignature({ authToken, signatureHeader, fullUrl, formParams })` returning `'valid' | 'missing_header' | 'invalid_signature'`. HMAC-SHA1(authToken, fullUrl + sortedKeys.flat()), constant-time base64 compare. Always treats null header as `missing_header` (no env-based opt-out). |
| `src/lib/whatsapp/inbound.ts` | The orchestration helpers used by the route handler: `parseTwilioInboundMessage` (Twilio form body → typed shape, strips `whatsapp:` prefix, captures media URLs verbatim), `resolveTenantByWhatsappNumber` (service-role lookup with multi-match → oldest-by-`created_at` + warn log), `isMessageAlreadyProcessed` (idempotency pre-check via `attribution_touchpoints.external_message_id`), and `processWhatsappInboundMessage` (calls `ingestLead()` with the canonical shape and forwards `external_message_id` for the partial unique index). |
| `src/lib/whatsapp/__tests__/twilio-signature.test.ts` | 9 unit tests: valid signature → `'valid'`; null header → `'missing_header'`; tampered body / URL / signature / token → `'invalid_signature'`; same-length-wrong-bytes header → `'invalid_signature'`; insertion order independence (sorted keys); short-circuit semantics for the missing-header path. |
| `src/lib/whatsapp/__tests__/inbound.test.ts` | 23 unit tests across the four exports. `parseTwilioInboundMessage`: prefix stripping, raw-payload immutability, NumMedia/MediaUrl collection, NumMedia cap at 10, missing-field defaults. `resolveTenantByWhatsappNumber`: single match, no match, multi-match → oldest with warn, error path → null, empty input → no DB hit. `isMessageAlreadyProcessed`: hit, miss, empty SID short-circuit, error fall-through. `processWhatsappInboundMessage`: new contact path, existing contact path, idempotent_replay path, review_required → throws (5xx for Twilio retry), `external_message_id` correctly forwarded. |
| `src/app/api/webhooks/whatsapp/__tests__/route.test.ts` | 11 unit tests over every branch in the §4 prompt table: missing-header / invalid-signature → 401; missing parsed fields → 400; no tenant → 401; pre-check hit → 200 idempotent; happy paths (new + existing contact) → 200 with all IDs; race-past-pre-check (23505 with index name OR with column tuple) → 200 idempotent; non-23505 error → 500; GET → 200 health check. |

No new dependencies. Codacy CLI on every new file: 0 issues across
Trivy / ESLint / Lizard / Opengrep.

---

## 5. Modified TypeScript modules

| File | Change |
|---|---|
| `src/lib/lead-ingestion/types.ts` | Added `'whatsapp_inbound'` to the `SourceChannelEnum` union and to `SOURCE_CHANNEL_VALUES`. Comment header refreshed to note the 2026-05-09 update. |
| `src/lib/lead-ingestion/ingest-lead.ts` | (1) Added `external_message_id?: string \| null` to `IngestLeadInput` (JSDoc explains the relationship to `event_id`). (2) `insertTouchpoint()` now writes that value to the new `attribution_touchpoints.external_message_id` column. (3) `mapSourceChannelToActivityType` adds `case 'whatsapp_inbound':` as a fall-through to the existing `whatsapp_*` group → `'whatsapp'`. No other changes. |
| `src/lib/lead-ingestion/source-labels.ts` | Added `whatsapp_inbound: 'WhatsApp (inbound message)'` to satisfy the exhaustive `Record<SourceChannelEnum, string>` constraint. |
| `src/app/api/dedup-queue/[id]/resolve/route.ts` | Added `case 'whatsapp_inbound':` as a fall-through in `mapSourceChannelToActivityType` → `'whatsapp_message'`. Keeps queue-resolved-WhatsApp consistent across all `whatsapp_*` enum members. |
| `src/app/api/webhooks/whatsapp/route.ts` | **Rewritten.** 275 LOC → 167 LOC, 0 of the original code preserved. Pure glue over the helpers in §4: parse → verify signature → parse message → resolve tenant → idempotency pre-check → orchestrate via `processWhatsappInboundMessage` → handle 23505-race as idempotent. Health-check `GET` retained but slimmed. |

---

## 6. Wire-up — `ingestLead()` is the canonical entry point

| Channel | Adapter / route | Engine call |
|---|---|---|
| Google Lead Form | `src/app/api/webhooks/google-lead-form/route.ts` (Phase 2b.1.a) | `ingestLead({ source_channel: 'google_lead_form', ... })` |
| Embedded forms / hosted landing | `src/app/api/forms/submit/route.ts` (Phase 2a) | `ingestLead({ source_channel: 'form_embedded' \| 'form_hosted_landing', ... })` |
| Booking widget | `src/lib/booking-widget/...` (Phase 2a.3) | `ingestLead({ source_channel: 'booking_widget_*', ... })` |
| Dedup-queue resolution | `src/app/api/dedup-queue/[id]/resolve/route.ts` (Phase 2a.9) | Replays the original payload through `ingestLead()` after operator decision. |
| **WhatsApp inbound (this phase)** | `src/app/api/webhooks/whatsapp/route.ts` | `processWhatsappInboundMessage(...)` → `ingestLead({ source_channel: 'whatsapp_inbound', ... })` |

The `external_message_id` field added to `IngestLeadInput` is opt-in:
all existing callers continue to omit it and the touchpoint column
stays NULL (the partial unique index ignores them). Only the WhatsApp
caller passes it today; 2b.2.b will pass Meta's `mid` through the same
field for Messenger inbound.

---

## 7. Tests

| Suite | Type | Count | Status |
|---|---|---|---|
| `src/lib/whatsapp/__tests__/twilio-signature.test.ts` | jest unit | 9 | ✅ |
| `src/lib/whatsapp/__tests__/inbound.test.ts` | jest unit (mocked `ingestLead`, mocked supabase) | 23 | ✅ |
| `src/app/api/webhooks/whatsapp/__tests__/route.test.ts` | jest unit (mocked helpers, mocked supabase) | 11 | ✅ |
| **2b.2.a unit total** | | **41** | ✅ |
| Pre-existing `src/lib/lead-ingestion/*` | jest unit | 64 | ✅ (no regression from `external_message_id` / `mapSourceChannelToActivityType` changes) |
| Pre-existing `src/app/api/webhooks/google-lead-form/__tests__/route.test.ts` | jest unit | 9 | ✅ (no regression) |

`npx jest src/lib/whatsapp src/app/api/webhooks/whatsapp src/lib/lead-ingestion`
→ 7 suites passed (+ 2 integration suites skipped behind `LEAD_INGESTION_INTEGRATION=1`),
91 tests, 0 failures, 0.7 s.

---

## 8. Verification status

| Gate | Status | Evidence |
|---|---|---|
| Schema migration applied | ✅ | Supabase MCP `apply_migration` `success: true`. Validation query: `enum_added=1`, `column_added=1`, `index_added=1`. |
| Supabase advisors | ✅ | No new issues against `attribution_touchpoints` after apply. Existing `security_definer_view` warnings on unrelated objects unchanged. |
| `tsc --noEmit` clean for touched files | ✅ | Pre-existing repo error count unchanged (the missing-label-for-`whatsapp_inbound` error was the only one introduced by my edits and it was fixed in `source-labels.ts`). `npx tsc --noEmit \| grep -E "src/lib/whatsapp/\|src/app/api/webhooks/whatsapp\|whatsapp_inbound\|external_message_id"` → 0 lines. |
| Unit tests (2b.2.a) | ✅ | 41 / 41 pass. |
| Pre-existing tests still green | ✅ | `npx jest src/lib/lead-ingestion src/app/api/webhooks/google-lead-form` → 64 unit tests pass + 12 integration tests gated. |
| Codacy CLI clean for new/modified files | ✅ | Trivy / ESLint / Lizard / Opengrep / PMD: 0 issues on every file in §4 + the 2b.2.a additions to `types.ts`, `source-labels.ts`, and `inbound.ts`. Pre-existing complexity warnings on `ingest-lead.ts` and `dedup-queue/[id]/resolve/route.ts` were verified pre-existing per the 2b.1.b.1 §9 precedent and not introduced by this phase. |
| ingestLead behaviour verified for WhatsApp-shaped input | ✅ | See §10 below. |
| Manual validation runbook (operator-run, against Vercel production) | ⏳ | Awaiting operator. Runbook at `docs/2b/phase-2b-2-a-prompt.md` "Manual validation runbook"; §11 will be filled with row-level evidence after the operator completes Phases 0–5. |

---

## 9. Open questions for the planner

None blocking. Two for awareness:

1. **Twilio shared sandbox number is global.** `+14155238886` is the
   same number across every Twilio sandbox account. Today's
   `tenants.whatsapp_phone_number = '+14155238886'` is fine for one
   tenant, but the moment a second tenant is onboarded and joins the
   sandbox, two rows will share the receiving number and
   `resolveTenantByWhatsappNumber` will warn-and-pick-oldest. This is
   the expected behaviour per the prompt (no 500), but for production
   we'll need each tenant on their own Twilio-registered WhatsApp
   Business Sender — at which point this caveat disappears entirely.
   No engineering change needed today; surfacing for sequencing.

2. **`__is_test=true` payload tagging.** Google Lead Form's webhook
   does this for Google's Lead Form Tester (sets
   `metadata.raw_payload.__is_test`). Twilio's sandbox doesn't have an
   equivalent test flag — every sandbox message is a real message
   semantically. We just rely on the test-tenant filter for now. If
   Twilio adds something like a `Diagnostic` flag in future, slot it in.

---

## 10. ingestLead behaviour verification (Task 5)

Per the prompt, before declaring 2b.2.a complete, `ingestLead()` was
re-read end-to-end with a focus on the existing-contact-found case
for phone-only WhatsApp inputs.

| Check | Behaviour |
|---|---|
| Reuses the contact (no duplicate) when phone matches an existing tenant contact | ✅ Tier 2 of `dedup-engine.resolveDedup` matches against `contacts.primary_phone_e164` OR `contacts.primary_phone`, returns `decision: 'matched', contact_id`. ingestLead's `additivelyUpdateContact` then patches missing fields only — never widens consent, never overwrites a non-null existing value. |
| Reuses an open deal OR doesn't create a duplicate one | ✅ `createDealForLead` runs inside ingestLead. Per `deal-creation.ts`, it consults `practice_treatment_offerings.pipeline_id` for the contact's offering; absence of a default pipeline / zero-stage pipeline / DB error yields `dealOutcome.ok === false` and ingestLead returns `deal_id: null`. The route surfaces `null` via `result.dealId`. **No duplicate-deal path.** Note: ingestLead does not actively reuse an existing open deal for the same contact today — it conditionally creates one when configured, and skips otherwise. For the WhatsApp inbound flow this is the desired behaviour: a returning patient who DMs us a second time gets a new attribution touchpoint + a new activity, but no new deal. |
| Always creates a new `attribution_touchpoint` row | ✅ Unconditional in `insertTouchpoint`; only skipped on `review_required` (which is a non-issue for phone-only WhatsApp candidates — see next row). |
| Doesn't break if `email` is null | ✅ `validate()` only requires one of `email \| phone \| channel_identifier`. With phone present and `email = null`, Tier 1 is skipped (no `emailNorm`), Tier 2 evaluates phone, Tier 3 is skipped (no channel_identifier passed), Tier 4 returns `'new'` if no match. The `phone_matches_different_email` review-required branch only triggers when BOTH the candidate and the matched contact have emails — impossible here, so the WhatsApp inbound path can never end up in `review_required`. |

**Conclusion:** ingestLead is correct for the WhatsApp inbound shape.
No fixes needed. The `processWhatsappInboundMessage` helper does throw
if ingestLead surprisingly returns null IDs (only `review_required` can
do that, and per the analysis above it can't for our inputs) — that
gives Vercel 5xx visibility and lets Twilio retry, rather than papering
over the surprise with custom branching.

The `external_message_id` field added in this phase is the only
modification to the engine's behaviour, and it's purely additive: an
optional input field that, when supplied, is written to a new column;
existing callers that omit it see no behavioural change.

---

## 11. Manual validation evidence (Vercel production)

⏳ **To be populated by the operator after running the runbook in
`docs/2b/phase-2b-2-a-prompt.md` — Manual validation runbook.**

Sections matching the prompt's Phase 6 §13 spec:

- **11.1 — Lazy-create path (Phase 1).** Pending: contact + deal +
  touchpoint + activity created with correct tenant_id, `external_message_id`
  = the Twilio MessageSid.
- **11.2 — Dedup path (Phase 2).** Pending: no duplicate contact / deal;
  new touchpoint + activity for the second message.
- **11.3 — Idempotency (Phase 3).** Pending: re-fired MessageSid → 200
  with `{ idempotent: true }`; record counts unchanged.
- **11.4 — Signature security (Phase 4).** Pending: missing-header → 401;
  invalid signature → 401.
- **11.5 — Tenant-resolution security (Phase 5).** Pending: unknown
  To-number with valid signature → 401; no records created in any tenant.

Once the operator completes the runbook and reports back, this section
will be replaced with row-level evidence and §8 will flip its bottom
row from ⏳ to ✅. The pre-2b.2.a leftover sandbox contact
`8d65dde7-c009-4439-9188-dd2fa5f3f2ec` is the one the runbook deletes
to exercise the lazy-create path (see prompt Phase 0 step 3).

---

## 12. Deferred items (raised during build)

- **Media handling (download + Supabase Storage + `message_media` table
  + GDPR retention).** Captured as `attribution_touchpoints.metadata.raw_payload._media_urls`
  for 2b.2.a.2 to pick up. Today's flow extracts media URLs into the
  structured `mediaUrls` array AND preserves them verbatim in the
  raw_payload — but does not download or persist any binary.
- **Outbound credential drift cleanup.** Encrypted-vault vs plain-text
  `tenants.whatsapp_*` columns are still both in use by different code
  paths. Out of scope for this phase per the prompt's "must NOT" list.
- **Settings UI for WhatsApp** — Phase 2b.2.c.
- **Auto-replies / business-hours / opt-in management** — later
  automations phase.
- **Message body encryption beyond Postgres-at-rest** — deferred.
- **Cleanup of dead `+447782218044` env var** — operator's call,
  flagged in `2b-2-twilio-sandbox-setup.md` Caveats.
- **Generic "inbound message processor" abstraction across channels** —
  premature; revisit after Messenger (2b.2.b) when we know what the
  abstraction wants to be.
- **`messenger_inbound` enum value** — explicitly out of scope; lives
  in 2b.2.b's migration.

---

## 13. Files added / changed / removed

**Added:**

```
dental-crm/supabase/migrations/20260509_phase_2b_2_a_whatsapp_inbound_source_channel_and_external_message_id.sql
dental-crm/src/lib/whatsapp/twilio-signature.ts
dental-crm/src/lib/whatsapp/inbound.ts
dental-crm/src/lib/whatsapp/__tests__/twilio-signature.test.ts
dental-crm/src/lib/whatsapp/__tests__/inbound.test.ts
dental-crm/src/app/api/webhooks/whatsapp/__tests__/route.test.ts
dental-crm/docs/2b/2b-2-a-changes.md   (this file)
```

**Changed:**

```
dental-crm/src/app/api/webhooks/whatsapp/route.ts                  (rewritten — glue only)
dental-crm/src/lib/lead-ingestion/types.ts                         (+ 'whatsapp_inbound')
dental-crm/src/lib/lead-ingestion/ingest-lead.ts                   (+ external_message_id field; + whatsapp_inbound activity-type case)
dental-crm/src/lib/lead-ingestion/source-labels.ts                 (+ label for 'whatsapp_inbound')
dental-crm/src/app/api/dedup-queue/[id]/resolve/route.ts           (+ whatsapp_inbound case in mapSourceChannelToActivityType)
```

**Removed:** none.
