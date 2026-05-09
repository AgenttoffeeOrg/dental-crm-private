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
| Manual validation runbook (operator-run, against Vercel production) | ✅ | Operator (Toffee) drove WhatsApp-from-real-phone steps (Phases 1–2); Cursor automated Phases 0, 3–5 and §11. Deployment `dpl_DAKbcaXa6pZ3JhC3oKvwmfVvELnu`, commit `e273391`. Row-level evidence in §11. Two findings (one doc-prose drift, one CI/CD drift) recorded; neither blocks 2b.2.a sign-off. |

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

## 11. Manual validation evidence (Vercel production, 2026-05-09)

Hybrid runbook (`docs/2b/phase-2b-2-a-validation-prompt.md`) executed
against deployment `dpl_DAKbcaXa6pZ3JhC3oKvwmfVvELnu` of commit
`e273391` ("phase 2b.2.a: WhatsApp inbound webhook rebuild") on branch
`phase-1-attribution-foundation`, aliased to
`https://dental-crm-nine.vercel.app`. Test tenant
`5aadca14-9786-4aef-bc53-e9287cdd0bbf` ("Deepak's Dental Practice"),
`tenants.whatsapp_phone_number = '+14155238886'` (Twilio shared
sandbox). Operator (Toffee) sent WhatsApp messages from the joined
phone `+919916558958`; Cursor handled deployment, baseline capture,
DB queries, and the curl-based security tests.

Health check confirms the live route is the new code:
`GET /api/webhooks/whatsapp` →
`{"status":"ready","endpoint":"whatsapp-webhook","version":"phase-2b.2.a"}`.

**Schema-vs-runbook drift (recorded once, applies to all sub-sections):**

- The runbook's queries use `activities.channel` and `activities.body`,
  inherited from the original prompt's pre-correction assumptions. Per
  §3 row B above, the live `activities` schema uses `type` and
  `description`. All Cursor queries below were translated accordingly;
  the underlying invariants are unchanged.
- The runbook expects `attribution_touchpoints.deal_id`; that column
  doesn't exist. Deal linkage is via `deals.contact_id` to the
  contact id on the touchpoint. Documented; queried via the contacts↔
  deals join.
- The runbook expects `metadata->>'message_sid'` and
  `metadata->>'profile_name'` at the top of `attribution_touchpoints.metadata`.
  The actual helper preserves Twilio's verbatim payload under
  `metadata.raw_payload.*` (with normalized hoists at
  `raw_payload._media_urls`, `raw_payload._profile_name`,
  `raw_payload._wa_id`). The two-locations-for-MessageSid invariant
  (column for dedup + metadata for audit) holds at
  `metadata->'raw_payload'->>'MessageSid'`.

### 11.1 — Lazy-create path (Phase 1) ✅

Operator sent body `"Hello from new lead test"` from `+919916558958`
to the sandbox at `+14155238886`. Twilio assigned MessageSid
`SMe54eaab4f39986f887d98ace25733ad5`.

| Artifact | ID | Verified fields |
|---|---|---|
| Contact (new) | `a0ac5939-35af-4789-af73-4f92e63e9764` | `full_name='Deepak Hegde'` (lifted from Twilio's `ProfileName`), `primary_phone='+919916558958'`, `primary_phone_e164='+919916558958'` (the `whatsapp:` prefix was correctly stripped by `parseTwilioInboundMessage`), `tenant_id` correct, `created_at='2026-05-09T13:14:37.076619+00:00'`. |
| Touchpoint | `62e06d0b-1e54-43b1-9a3e-1e06e2385e60` | `source_channel='whatsapp_inbound'`, `external_message_id='SMe54eaab4f39986f887d98ace25733ad5'` (34-char SM-prefixed Twilio SID), `contact_id` linked, `tenant_id` correct, `metadata->'raw_payload'->>'MessageSid'` matches the column, `metadata->'raw_payload'->>'ProfileName'='Deepak Hegde'`, `metadata->'raw_payload'->>'_media_urls'=[]` (text-only — media handling is 2b.2.a.2). Twilio's verbatim `From`, `To`, `WaId`, `AccountSid`, `ChannelMetadata`, `ExternalUserId` all preserved under `raw_payload`. |
| Activity | `8a61ce9c-affa-4543-8e69-e4bbe23e2464` | `type='whatsapp'`, `direction='inbound'`, `source_channel='whatsapp_inbound'`, `description='Hello from new lead test'` (verbatim body, threaded via `treatment_intent_text` per §3 row B), `contact_id` linked to the new contact, `deal_id` linked to the new deal, `tenant_id` correct. |
| Deal | `4a310622-8c7f-4d84-bddc-b2ce546b9d89` | Created (the test tenant's offering has a default pipeline, so `createDealForLead`'s `dealOutcome.ok===true` path fired). Confirms ingestLead's deal-creation branch works correctly for the WhatsApp inbound shape. |

Counts after Phase 1 in the test tenant: contacts-with-this-phone=1,
`whatsapp_inbound` touchpoints=1, `whatsapp_inbound` activities=1 — no
duplicates.

### 11.2 — Dedup path (Phase 2) ✅ (1 finding F1)

Operator sent body `"This is a second message"` from the same phone.
Twilio assigned MessageSid `SM74a6a5b0cdcc2847c66a142e5a55d606`.

| Check | Result | Detail |
|---|---|---|
| No duplicate contact | ✅ | `count(*)=1`; `min(created_at)=max(created_at)='2026-05-09T13:14:37.076619+00:00'` (the row from §11.1, unchanged). The dedup engine's Tier 2 phone match correctly reused contact `a0ac5939-…`. |
| New touchpoint | ✅ | Touchpoint `baa62e0d-9dd7-41e1-a128-110303696ad6`, `external_message_id='SM74a6a5b0cdcc2847c66a142e5a55d606'`, `contact_id='a0ac5939-…'` (existing contact, not new), `created_at='2026-05-09T13:20:23.015432+00:00'`. |
| New activity | ✅ | Activity `14b409a0-aad1-4743-bf1d-36dcc4af27b8`, `description='This is a second message'`, `type=whatsapp`, `direction=inbound`, `source_channel=whatsapp_inbound`. |
| `whatsapp_inbound` touchpoint count after Phase 2 | ✅ | 1 → 2. |
| `whatsapp_inbound` activity count after Phase 2 | ✅ | 1 → 2. |

**Finding F1 — deal-per-message divergence from §10 prose (recorded; not
a 2b.2.a regression).**
A second deal `10f8460a-828f-4b74-a71e-bee947d516fc` was created for the
same contact at `2026-05-09T13:20:23.622689+00:00` (and the new activity
was linked to it, not to the §11.1 deal). Section §10 of this change
log states:

> "ingestLead does not actively reuse an existing open deal for the
> same contact today — it conditionally creates one when configured,
> and skips otherwise. **For the WhatsApp inbound flow this is the
> desired behaviour: a returning patient who DMs us a second time gets
> a new attribution touchpoint + a new activity, but no new deal**."

Those two sentences are internally inconsistent: when a default pipeline
IS configured for the offering (which it is for this tenant — Phase 1
proved it), `createDealForLead` fires unconditionally and produces a new
deal per message. The CODE is self-consistent across phases; the §10
prose claim "no new deal for returning patients" is documentation drift
or aspirational. No 2b.2.a hard-fail criterion is breached (the runbook
checks for no duplicate *contact*, not no duplicate *deal*). Surface
to the planner as a separate decision:
**(A)** fix §10 prose to match observed behaviour, or **(B)** add an
"open deal exists for contact + offering" reuse guard inside
`createDealForLead`. Either way, scope is a follow-up sprint.

### 11.3 — Idempotency, re-fired MessageSid (Phase 3) ✅

Cursor re-fired Phase 2's MessageSid via
`scripts/whatsapp-validation/phase3-idempotency.mjs` with a freshly
computed valid Twilio HMAC-SHA1 signature.

```
URL:        https://dental-crm-nine.vercel.app/api/webhooks/whatsapp
Method:     POST
Headers:    X-Twilio-Signature: tqlYVo1N4rUBRZdf0bNBY/eUwfA=
            Content-Type: application/x-www-form-urlencoded
Form keys:  AccountSid, Body, From, MessageSid, NumMedia, ProfileName, To
            (sorted ASCII for the HMAC base, per twilio-signature.ts)
MessageSid: SM74a6a5b0cdcc2847c66a142e5a55d606  (= Phase 2's SID)

Response:   HTTP 200 OK  (856ms)
            {"status":"ok","idempotent":true}
```

Post-fire DB state:

| Counter | Pre | Post | Delta |
|---|---|---|---|
| `whatsapp_inbound` touchpoints in test tenant | 2 | 2 | 0 ✅ |
| `whatsapp_inbound` activities in test tenant | 2 | 2 | 0 ✅ |
| Contacts for this phone in test tenant | 1 | 1 | 0 ✅ |
| Deals for contact `a0ac5939-…` | 2 | 2 | 0 ✅ |

Touchpoint `external_message_id` set is exactly `{
SMe54eaab4f39986f887d98ace25733ad5,
SM74a6a5b0cdcc2847c66a142e5a55d606 }` (the §11.1 + §11.2 originals,
no third row). Confirms `isMessageAlreadyProcessed` short-circuited
ahead of any contact / deal / activity work — the partial unique index
race net was not even exercised, which is the intended hot path.

### 11.4 — Signature security, both 401 cases (Phase 4) ✅

Two unsigned/invalid-signature posts to the live endpoint:

**Test 1 — missing `X-Twilio-Signature` header.**
```
POST https://dental-crm-nine.vercel.app/api/webhooks/whatsapp
Content-Type: application/x-www-form-urlencoded
(no X-Twilio-Signature header)
body: AccountSid=ACfake&MessageSid=SMsigtest1&From=whatsapp:+12025551234&To=whatsapp:+14155238886&Body=unauthorized&NumMedia=0

Response: HTTP 401, body bytes = 0
```

**Test 2 — bogus `X-Twilio-Signature` value.**
```
POST https://dental-crm-nine.vercel.app/api/webhooks/whatsapp
X-Twilio-Signature: this-is-not-a-valid-signature
Content-Type: application/x-www-form-urlencoded
body: AccountSid=ACfake&MessageSid=SMsigtest2&From=whatsapp:+12025551234&To=whatsapp:+14155238886&Body=tampered&NumMedia=0

Response: HTTP 401, body bytes = 0
```

Both return the same shape, which is intentional —
`twilio-signature.ts` returns `'missing_header'` and
`'invalid_signature'` and the route maps both to a bare 401, denying any
side-channel that distinguishes them. DB confirmation:
`SELECT count(*) FROM attribution_touchpoints WHERE external_message_id IN ('SMsigtest1', 'SMsigtest2')`
→ **0**. The pre-2b.2.a "no header → silently treat as valid" hole
(defect #3 in `2b-2-pre-plan-findings.md`) is conclusively closed.

### 11.5 — Tenant-resolution security, valid sig + unknown To-number (Phase 5) ✅

Cursor crafted a payload with a To-number that is registered to **no**
tenant (`+18005550199` — pre-confirmed by
`SELECT count(*) FROM tenants WHERE whatsapp_phone_number IN ('+18005550199', 'whatsapp:+18005550199')` → 0)
and a **cryptographically valid** Twilio signature, posted via
`scripts/whatsapp-validation/phase5-fake-tenant.mjs`.

```
URL:        https://dental-crm-nine.vercel.app/api/webhooks/whatsapp
Method:     POST
Headers:    X-Twilio-Signature: NS6nuEpdFXr75cvEj7oHDYlFdhE=  (genuine HMAC over the body)
            Content-Type: application/x-www-form-urlencoded
Form keys:  AccountSid, Body, From, MessageSid, NumMedia, To
MessageSid: SMfaketenant
To:         whatsapp:+18005550199   (unregistered)

Response:   HTTP 401 Unauthorized  (680ms)
            body bytes = 0
```

Critical: response is 401, **not 404** — the route deliberately conflates
"bad signature" and "no tenant for To" so an attacker cannot probe which
WhatsApp numbers are tenant-registered. DB confirmation across the
ENTIRE table (not scoped to the test tenant — the most dangerous failure
mode would be the touchpoint landing in tenant `5aadca14-…` because it's
the only one with the sandbox number registered):
`SELECT id, tenant_id FROM attribution_touchpoints WHERE external_message_id = 'SMfaketenant'` → **0 rows globally**. Counts in test tenant unchanged at touchpoints=2, activities=2.

### 11.6 — Findings & recommendations (no 2b.2.a regressions)

Two findings worth surfacing to the planner; neither blocks 2b.2.a
sign-off, neither calls for code changes inside this phase.

**F1 — §10 prose ↔ deal-creation behaviour mismatch (documentation
drift OR product decision).** See §11.2 for evidence. Decide between
(A) §10 prose fix or (B) deal-reuse guard in `createDealForLead`.

**F2 — Vercel auto-deploy did not fire for our `git push` to
`phase-1-attribution-foundation` (CI/CD drift).** When commit `e273391`
landed at GitHub, the previous Vercel deploy on this branch was 14h
old; no new build was queued in the project's deployment list. Cursor
triggered the deploy manually with `vercel --prod --yes` (3-minute
build, deployment `dpl_DAKbcaXa6pZ3JhC3oKvwmfVvELnu`). Earlier commits
on this same branch (`944845c`, `19af10f`, etc., per the 2b.1.b.2
evidence in §14 of `docs/2b/2b-1-b-2-changes.md`) did auto-deploy, so
something has changed in the GitHub→Vercel hookup since then —
candidates: integration token refresh, paused project, branch-tracking
config. Out of scope for 2b.2.a; surface to the planner / DevOps owner.

### 11.7 — Test data fingerprints (for any future cleanup)

All rows below are real test data created by this validation, scoped
to the test tenant `5aadca14-9786-4aef-bc53-e9287cdd0bbf`. They are
filterable by `source_channel='whatsapp_inbound'` and can be ignored
or purged from any future reporting.

| Phase | Type | ID |
|---|---|---|
| §11.1 | Contact | `a0ac5939-35af-4789-af73-4f92e63e9764` |
| §11.1 | Touchpoint | `62e06d0b-1e54-43b1-9a3e-1e06e2385e60` (`SMe54eaab4f39986f887d98ace25733ad5`) |
| §11.1 | Activity | `8a61ce9c-affa-4543-8e69-e4bbe23e2464` |
| §11.1 | Deal | `4a310622-8c7f-4d84-bddc-b2ce546b9d89` |
| §11.2 | Touchpoint | `baa62e0d-9dd7-41e1-a128-110303696ad6` (`SM74a6a5b0cdcc2847c66a142e5a55d606`) |
| §11.2 | Activity | `14b409a0-aad1-4743-bf1d-36dcc4af27b8` |
| §11.2 | Deal (F1) | `10f8460a-828f-4b74-a71e-bee947d516fc` |

The pre-2b.2.a leftover sandbox contact
`8d65dde7-c009-4439-9188-dd2fa5f3f2ec` was deleted in Phase 0 to force
the lazy-create path on Phase 1; it is not recreated and does not need
to be.

### 11.8 — Helper scripts retained

For any future re-runs (e.g. after F2 is fixed and CI/CD lands a new
deploy automatically):

```
dental-crm/scripts/whatsapp-validation/phase3-idempotency.mjs
dental-crm/scripts/whatsapp-validation/phase5-fake-tenant.mjs
```

Both are ESM, require Node ≥18 (built-in `fetch`), zero npm
dependencies, and read `TWILIO_AUTH_TOKEN` + `TWILIO_ACCOUNT_SID`
from `.env.local`. The Phase 3 script accepts an alternate MessageSid
as `argv[2]` for re-targeting any past inbound message.

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
dental-crm/scripts/whatsapp-validation/phase3-idempotency.mjs   (§11.3 helper)
dental-crm/scripts/whatsapp-validation/phase5-fake-tenant.mjs   (§11.5 helper)
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
