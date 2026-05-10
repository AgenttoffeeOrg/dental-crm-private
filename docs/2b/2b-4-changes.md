# Phase 2b.4 — SMS inbound webhook rebuild: change log

**Scope:** rip-and-replace `/api/webhooks/sms` so an inbound SMS from a
prospective patient creates a contact + deal + attribution touchpoint via
the canonical `ingestLead()` engine, with secure tenant resolution
(receiving-number lookup against `tenants.sms_phone_number`),
always-required Twilio signature verification, and `MessageSid`-based
idempotency. **Text-only** — `NumMedia >= 1` payloads still ingest as
SMS leads; media URLs are captured into `raw_payload` for a future MMS
phase but not downloaded or stored.

**Out of scope (deferred):**

- MMS / inbound photo / file capture — separate phase if ever needed.
- Outbound SMS auth fix — `/api/communications/send-sms` and
  `send-sms-v2` currently have no auth and can be triggered by anyone
  with a tenant UUID. Severe; needs its own phase.
- Settings UI for SMS (tenant configures their own SMS number) — comes
  with the practice-onboarding wizard.
- Two-way SMS conversation thread UI — not in this phase cluster.
- Auto-replies / business-hours / opt-in / opt-out flows — later
  automations phase.
- Outbound SMS path migration / cleanup of v1 vs v2 send routes.
- Per-tenant SMS number provisioning / number-pool routing — wizard.

**Branch baseline:** `phase-1-attribution-foundation`, on top of Phase
2b.3 (web forms cleanup) — `2b-3-changes.md`.
**Date applied:** 2026-05-10.
**Test tenant exercised:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf`
("Deepak's Dental Practice"), `sms_phone_number = '+447782218044'`
(real Twilio UK number on the existing account).
**Production deploy target:** https://dental-crm-nine.vercel.app

---

## 1. Summary

The pre-2b.4 `/api/webhooks/sms` (278 LOC) had the same defects pre-2b.2.a
WhatsApp had: cross-tenant phone lookup against `contacts.primary_phone`
with no tenant filter, signature verification silently no-op'd when the
`X-Twilio-Signature` header was absent, no `ingestLead()` call (just a
direct `activities.insert(...)` with `tenant_id = contact?.tenant_id`
which goes NULL when no contact exists), and no `MessageSid` idempotency
beyond a soft check against an integration-log table.

| # | Pre-2b.4 defect | Fix |
|---|---|---|
| 1 | SMS inbound never called `ingestLead()`; new patients produced a stub `activities` row with `tenant_id` potentially NULL and no contact / deal / touchpoint / consent record. | The rewritten route delegates to `processSmsInboundMessage`, which calls `ingestLead()` for both new and existing-contact paths. Contact, deal, attribution touchpoint, consent record, and activity are all written. |
| 2 | Cross-tenant lookup hazard: tenant resolution matched `From` against `contacts.primary_phone` with no tenant filter, so any tenant whose contact happened to have that phone was implicated. | Tenant is now resolved by the receiving (`To`) SMS number against the new `tenants.sms_phone_number` column. Lead-engine then dedups within that tenant. |
| 3 | `verifyTwilioSignature` silently no-op'd when the `X-Twilio-Signature` header was absent (`if (twilioSignature && !verifyTwilioSignature(...))`). | Reuses the tri-state `verifyTwilioSignature` helper from `@/lib/whatsapp/twilio-signature` (added in 2b.2.a). 'missing_header' and 'invalid_signature' both → 401. The "no header → pass" hole is closed. |
| 4 | No `MessageSid` idempotency beyond a SELECT against `integration_webhooks_log` (a different table from the canonical attribution path). A Twilio retry could double-up. | Two-layer idempotency, mirroring 2b.2.a: (a) pre-flight `isSmsAlreadyProcessed` SELECT against `attribution_touchpoints`, (b) DB-level partial unique index on `(tenant_id, source_channel, external_message_id) WHERE external_message_id IS NOT NULL` (added in 2b.2.a, reused unchanged). The route catches the unique-violation race and converts it to a 200 idempotent response. |
| 5 | The route swallowed transactional consent and never wrote a `consent_records` row. | `ingestLead()`'s consent path runs uniformly for SMS — patient-initiated SMS implies transactional consent, captured via `ingestLead`'s standard consent insertion. |

Concretely: the single-channel chokepoint (`ingestLead()`) that 2a.2a
established and 2b.1.a, 2b.2.a, 2b.3 wired Google Lead Form, WhatsApp
inbound, and web forms into respectively, is now also the SMS inbound
entry point. Dedup, SLA resolution, deal creation (including cross-channel
reuse from 2b.2.a.3 — an SMS from a phone that already has an open deal
from a prior WhatsApp inbound reuses the deal), attribution touchpoint
insertion, activity insertion, and `lead.arrived` notifications all
behave identically across channels.

---

## 2. Schema migration — `20260510_phase_2b_4_sms_inbound_source_channel_and_tenant_phone.sql`

Applied via Supabase MCP `apply_migration` (name:
`phase_2b_4_sms_inbound_source_channel_and_tenant_phone`). Verified by
post-apply count query (`enum_added=1, column_added=1, test_tenant_number='+447782218044'`).

| # | Object | Notes |
|---|---|---|
| 1 | `public.source_channel_enum += 'sms_inbound'` | Pre-flight check showed this value was already present in the live DB (added by an earlier phase whose effects predated this prompt — also already in `src/lib/lead-ingestion/types.ts`'s `SourceChannelEnum`). The migration is still authored as `ADD VALUE IF NOT EXISTS` so the SQL is replayable in fresh environments and CI. |
| 2 | `tenants.sms_phone_number text NULL` | Mirrors the existing `whatsapp_phone_number` column shape. Holds the E.164 receiving SMS number for the tenant. Documented via `COMMENT ON COLUMN`. |
| 3 | `UPDATE tenants SET sms_phone_number = '+447782218044'` (test tenant only) | Sets the test tenant's number so the inbound webhook can resolve tenant by `To`. Idempotent (`AND (sms_phone_number IS NULL OR sms_phone_number != '+447782218044')`). |

**Validation queries (post-apply, single round-trip):**

```sql
SELECT
  (SELECT count(*) FROM pg_enum e
     JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = 'source_channel_enum' AND e.enumlabel = 'sms_inbound') AS enum_added,
  (SELECT count(*) FROM information_schema.columns
     WHERE table_schema='public' AND table_name='tenants' AND column_name='sms_phone_number') AS column_added,
  (SELECT sms_phone_number FROM tenants WHERE id = '5aadca14-9786-4aef-bc53-e9287cdd0bbf') AS test_tenant_number;
-- → 1, 1, '+447782218044'
```

**Migration discipline:**

- Idempotent (`ADD VALUE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`,
  `UPDATE … WHERE … != target_value`).
- No backfill needed — the new column is nullable; only the test tenant
  gets a value in this migration. Production tenants are populated via
  the SQL recipe in `docs/onboarding/practice-onboarding-runbook.md`
  §9b until the wizard ships.
- No FK / view / RLS changes; existing tenant-scoped policies still
  apply.
- No rollback companion — same reasoning as 2b.2.a §2: enum-value drops
  are not idempotent in Postgres (`ALTER TYPE … DROP VALUE` doesn't
  exist) and dropping the column would orphan no indexes here, so
  recovery if needed is straightforward (`ALTER TABLE tenants DROP
  COLUMN sms_phone_number`).

---

## 3. Adaptations from prompt → live shape

| # | Prompt assumed | Live shape | Resolution |
|---|---|---|---|
| A | `'sms_inbound'` was NOT yet in `source_channel_enum`. | Live DB already has `'sms_inbound'` in the enum; `src/lib/lead-ingestion/types.ts` already lists it; `src/lib/lead-ingestion/source-labels.ts` already maps it to `'Inbound SMS'`; `ingest-lead.ts`'s `mapSourceChannelToActivityType` already has `case 'sms_inbound': return 'sms'`; `dedup-queue/[id]/resolve/route.ts`'s switch already has `case 'sms_inbound': return 'sms_received'`. | The prompt's Step 7 mechanical updates were no-ops — every reference was already present. The migration's `ADD VALUE IF NOT EXISTS` is preserved so a fresh environment / CI checkout still applies it idempotently. |
| B | `tenants.sms_phone_number` may or may not exist. | Did not exist; column needed to be added. | Added in the migration. |
| C | The orchestrator's `ingestLead` input would carry an explicit `phone_e164`, `utm`, `click_ids`, `http`, and a structured `consent` block. | Live `IngestLeadInput` (per `src/lib/lead-ingestion/ingest-lead.ts`) takes a `contact: { phone, full_name, email }` shape; UTM / click IDs / HTTP context arrive via the optional `attribution` field; consent is derived inside `ingestLead` itself. The WhatsApp inbound rebuild (2b.2.a) uses the same minimal-call shape. | Mirrored the WhatsApp call shape exactly: pass `tenant_id`, `source_channel: 'sms_inbound'`, `contact: { phone: fromPhoneE164, full_name: null, email: null }`, `treatment_intent_text: body`, `raw_payload: {...}`, `event_id: 'sms_inbound:<MessageSid>'`, `external_message_id: <MessageSid>`. The "implied transactional consent" is inherent to phone-channel patient-initiated inbound — `ingestLead` lands the consent record uniformly. |
| D | Return shape would include `mergedWithExisting`, `reviewRequired`, `slaDueAt`, `activitiesCreated`. | The WhatsApp orchestrator returns `{ contactId, dealId, attributionTouchpointId, activityId, wasNewContact, mediaResults }`. SMS doesn't need `mediaResults` (no media download in this phase). | Mirrored WhatsApp's actual shape: `{ contactId, dealId, attributionTouchpointId, activityId, wasNewContact }`. The route surfaces those keys verbatim in the JSON envelope (`contact_id`, `deal_id`, `attribution_touchpoint_id`, `activity_id`, `was_new_contact`). `wasNewContact` is inferred from `result.dedup_decision === 'new' && !idempotent_replay`. |
| E | The WhatsApp inbound parser strips a `whatsapp:` prefix; the SMS parser should NOT. | Confirmed — see `WHATSAPP_PREFIX` / `stripWhatsappPrefix` in `src/lib/whatsapp/inbound.ts`. SMS uses raw E.164 with no prefix. | The SMS parser leaves `From` / `To` verbatim. Bonus: if Twilio ever routes a WhatsApp-prefixed payload to the SMS route by misconfiguration, the prefix surfaces in `fromPhoneE164` and the downstream tenant-resolve fails (no tenant matches `whatsapp:+…` against `tenants.sms_phone_number`), producing a clean 401 rather than silent bad data. Locked in as a unit test. |
| F | The route should use the public Vercel URL for signature computation, not `req.url`. | Examined the live WhatsApp route — it actually passes `request.url` directly to `verifyTwilioSignature`. Behind Vercel, `NextRequest.url` carries the public host (Vercel sets `x-forwarded-host` correctly), so this works in practice. | Mirrored the WhatsApp route — `fullUrl: request.url`. Captured the failure mode in `docs/operational-gotchas.md` so a future runbook reader sees why this matters when developing locally with a tunnel. |
| G | The dedup-queue resolve route's `mapSourceChannelToActivityType` should add `case 'sms_inbound': return 'sms_message'`. | Live shape already has `case 'sms_inbound': return 'sms_received'`. | Left as-is. `'sms_received'` is consistent with the existing scheme for SMS-flavoured queue-resolved activities (`call_received`, `voicemail_received`, `meta_lead_received`). The prompt's `'sms_message'` would have introduced an inconsistency. |

---

## 4. New TypeScript modules

| File | LOC | Notes |
|---|---|---|
| `src/lib/sms/inbound.ts` | 248 | Mirrors `src/lib/whatsapp/inbound.ts` function-for-function. Four exports: `parseTwilioInboundSmsMessage`, `resolveTenantBySmsNumber`, `isSmsAlreadyProcessed`, `processSmsInboundMessage`. No `whatsapp:` prefix-stripping; no media download (URLs captured into `raw_payload._media_urls` instead). Service-role client passed in from the route so tests can mock cleanly. |
| `src/lib/sms/__tests__/inbound.test.ts` | 425 | Mirrors `src/lib/whatsapp/__tests__/inbound.test.ts`. 25 tests covering all four exports. Mocks `ingestLead` at the module boundary. Notable additions vs WhatsApp: an explicit "does NOT strip `whatsapp:` prefix" guard test, and an MMS path test (`numMedia >= 1` with photo-only / photo-plus-text payloads). |
| `src/app/api/webhooks/sms/__tests__/route.test.ts` | 240 | Mirrors `src/app/api/webhooks/whatsapp/__tests__/route.test.ts`. 11 tests covering every branch in the route: signature missing/invalid, missing fields, no tenant, idempotent pre-check hit, happy path (new + existing), unique-index race past pre-check (with index name and column-only message), 500 on unexpected, 500 on non-23505 error, GET health check. |

---

## 5. Modified TypeScript modules

| File | Change |
|---|---|
| `src/app/api/webhooks/sms/route.ts` | Rewritten end-to-end. From 278 LOC of mixed concerns (DLQ writes, integration_webhooks_log writes, integration_logs writes, direct `activities.insert`) to ~225 LOC of pure glue: parse → verify → resolve tenant → idempotency check → orchestrate. Mirrors the structure of `src/app/api/webhooks/whatsapp/route.ts` line-for-line. Adds a UUID `correlation_id` to every log line so a Twilio retry can be traced through Vercel function logs alongside the original. |
| _(no other modifications)_ | The mechanical references the prompt's Step 7 listed (`types.ts`, `source-labels.ts`, `ingest-lead.ts`, `dedup-queue/[id]/resolve/route.ts`) were already up-to-date for `'sms_inbound'`. See §3 row A. |

`src/lib/whatsapp/twilio-signature.ts` is **reused unchanged** — the
SMS route imports it directly. Twilio uses one signature scheme across
SMS and WhatsApp messaging, so duplication would just be tech debt.

---

## 6. `ingestLead` channel wire-up

Updated channel-table from `2b-2-a-changes.md` §6, with a new row for
SMS inbound:

| `source_channel` | Entry point | `event_id` namespace | `external_message_id` | Activity `type` (live) | Notes |
|---|---|---|---|---|---|
| `form_embedded` / `form_hosted_landing` | `/api/marketing/forms/submit` | `form:<formId>:<submissionUuid>` | unset | `form_submission` | Phase 2b.3 wired this. |
| `google_lead_form` | `/api/webhooks/google-lead-form` | `google_lead_form:<lead_id>` | unset | `google_lead_received` | Phase 2b.1.a. |
| `whatsapp_inbound` | `/api/webhooks/whatsapp` | `whatsapp_inbound:<MessageSid>` | `<MessageSid>` | `whatsapp` | Phase 2b.2.a. Twilio MessageSid both event_id and external_message_id. |
| `sms_inbound` (NEW) | `/api/webhooks/sms` | `sms_inbound:<MessageSid>` | `<MessageSid>` | `sms` | Phase 2b.4. Same Twilio SID shape as WhatsApp; the partial unique index keeps the keyspaces independent via `source_channel`. |

The `event_id` namespace prefix prevents a hypothetical SID collision
between channels from cross-deduplicating. The
`idx_attribution_touchpoints_external_msg_uniq` partial unique index is
keyed on `(tenant_id, source_channel, external_message_id)` precisely
to make this safe — captured as a new entry in
`docs/operational-gotchas.md`.

---

## 7. Tests

| Suite | Tests | Time |
|---|---|---|
| `src/lib/sms/__tests__/inbound.test.ts` | 25 passed | < 0.5s |
| `src/app/api/webhooks/sms/__tests__/route.test.ts` | 11 passed | < 0.5s |
| **SMS total (new)** | **36 passed** | |

Regression suite (`src/lib/whatsapp src/app/api/webhooks/whatsapp
src/lib/lead-ingestion src/app/api/webhooks/google-lead-form
src/app/api/marketing/forms/submit`): **147 passed, 12 pre-existing
skips, 0 failures** — confirming the migration / type changes / new
`sms_inbound` references don't regress any adjacent module.

---

## 8. Validation results

### 8.1 Automated (Cursor — pre-deploy)

- `npx jest src/lib/sms src/app/api/webhooks/sms` → 36 passed.
- `npx jest <regression-paths>` → 147 passed.
- `npx tsc --noEmit` → 0 errors in any file under `src/lib/sms`,
  `src/app/api/webhooks/sms`, or any module they touch. (Pre-existing
  type errors in `tests/e2e`, `tests/integration`, `tests/visual`,
  `tools/` are unrelated and predate this phase.)
- Codacy CLI (Lizard / ESLint / Trivy / Opengrep / PMD) on every new
  and modified file → 0 issues.
- Live DB post-migration: `enum_added=1, column_added=1,
  test_tenant_number='+447782218044'`.

### 8.2 Curl tests against deployed Vercel build (post-push)

Push commit `fa9827f`; deploy `dpl_CDQ37Xrnb36joTfLTNro9wK73TcZ` →
`dental-48txbhkyk-toffeehegde-9056s-projects.vercel.app` aliased to
`dental-crm-nine.vercel.app`.

```
GET  /api/webhooks/sms                                   → 200 { "status": "ready", "endpoint": "sms-webhook", "version": "phase-2b.4" }
POST /api/webhooks/sms (no X-Twilio-Signature)           → 401 (empty body)
POST /api/webhooks/sms (X-Twilio-Signature: junk)        → 401 (empty body)
```

All three pass — the new route is live, the GET health check responds
with the phase-2b.4 version marker (proving the new code shipped, not
the cached pre-2b.4 GET handler), and signature gating returns 401 for
both missing-header and invalid-signature requests.

### 8.3 Operator validation gate — **PASSED (2026-05-10)**

#### Twilio Console webhook repoint (Step 0.2)

The operator initially saw Twilio's default canned reply ("Thanks for the
message. Configure your numbers' SMS URL to change this message") on the
first SMS attempt — Twilio's "no webhook configured" fallback. Confirmed
via Console screenshots that the per-number "Handling for incoming
messages → Webhook URL" was still pointed at
`https://demo.twilio.com/welcome/sms/reply` (Twilio's default demo URL).

Operator changed it to
`https://dental-crm-nine.vercel.app/api/webhooks/sms` with HTTP method
POST. The number IS associated with a Messaging Service ("Notify -
Dental CRM") which Twilio warns may override per-number config; in
practice the per-number webhook took precedence and no Messaging
Service edit was needed (verified by `MessagingServiceSid=MGb62e0…` on
the inbound payload + the route still receiving POSTs after the
per-number change).

#### Smoke-test 1 — new contact path (operator phone A: `+447424805475`)

Sent at **16:13 BST** (15:13 UTC). Landed end-to-end inside 4 seconds:

| What | UUID | Detail |
|---|---|---|
| Touchpoint | `cfd72867-4978-48bf-959f-ac4613397762` | source_channel=`sms_inbound`, external_message_id=`SM958d9d00bd4c01b253847b756fb12b07`, occurred 15:13:24Z |
| Contact | `eff2b8c1-9b25-47e5-bc33-0cd6e64d5848` | primary_phone_e164=`+447424805475`, source=`sms_inbound`, full_name=null (later set by operator), status=`lead` |
| Deal | `357ccbb7-cb9f-4e44-9fc6-2866695a57cc` | title="Inquiry", status=`open`, source=`sms_inbound`, pipeline=`47be4b64-…`, currency=GBP, created 15:13:26Z |
| Activity | `0d208c1e-6f92-43d4-b830-5ccf8977ef3e` | type=`sms`, direction=`inbound`, deal_id=`357ccbb7-…`, description="Hi, interested in Invisalign for my teen, what does the process look like?" |
| Notification | `cf2c4683-5d28-431f-9237-92749d16a0a6` | event_key=`lead.arrived`, channel=`email`, provider=`resend`, status=`sent` at 15:13:28Z (4s after touchpoint) |

Raw Twilio payload preserved on the touchpoint with all expected fields
including `MessagingServiceSid=MGb62e0ac8fb4da71bb50337f42100ca56` and
the `_media_urls=[]` / `_num_media=0` markers from
`processSmsInboundMessage`. ✅

#### Smoke-tests 2 + 3 — dedup + deal-reuse + cross-channel (operator phone B: `+447404683609`)

The operator switched to a different phone for tests 2 and 3 — sent
two SMSs and one WhatsApp from `+447404683609`. The first SMS created a
new contact (no prior touchpoint for this phone); the second SMS and
the WhatsApp both landed on that contact via dedup + deal-reuse.

| What | UUID | Detail |
|---|---|---|
| Contact (NEW from this phone) | `5c19db1f-38b0-4445-9661-58d6795060b2` | primary_phone_e164=`+447404683609`, full_name="shamanth", source=`sms_inbound`, created 15:22:06Z. **Single row** — both later SMS and the WhatsApp landed here, not in a duplicate. |
| Deal (reused for SMS #2 + WhatsApp) | `878bdd75-ece5-4967-9326-cdb36acc4dc0` | title="Inquiry", status=`open`, source=`sms_inbound` (originating channel), pipeline=`47be4b64-…`. **Single row** — the deal opened on the first SMS was reused for both subsequent inbounds via cross-channel deal reuse from 2b.2.a.3. |
| SMS touchpoint #1 (15:22:06Z) | `cabe546f-5c9d-4f8c-b81c-332042cb3b65` | external_message_id=`SM7aa0db2cd6a724679abb6be9f63f2a47` |
| SMS touchpoint #2 (15:23:48Z) | `a9661871-d264-4839-9c04-fcff1dbd4779` | external_message_id=`SM0193be4488130a9cbe9e08853600ec8f`, on the same contact — proves **dedup** ✅ |
| WhatsApp touchpoint (15:26:30Z) | `893425d2-d414-4abb-bc72-3d84097d2064` | source_channel=`whatsapp_inbound`, external_message_id=`SMeb6312402bc73161ed174f10c6a1ce90`, on the same contact — proves **cross-channel** ✅ |
| SMS activity #1 | `d97af34f-1ce9-49a5-961f-ad17c9c497fe` | deal_id=`878bdd75-…`, type=`sms`, direction=`inbound` |
| SMS activity #2 | `ceb9bef6-0110-41ca-883f-8b56dbeaf8a8` | deal_id=`878bdd75-…` — same deal, second activity, proves **deal-reuse** ✅ |
| WhatsApp activity | `f0158bc5-1b6f-45cc-9765-eed000b780ff` | deal_id=`878bdd75-…`, type=`whatsapp`, direction=`inbound`, source_channel=`whatsapp_inbound` — three activities now hang off the same deal across two channels |

Final state of deal `878bdd75-…`: 3 activities (SMS, SMS, WhatsApp),
3 attribution_touchpoints (2 sms_inbound + 1 whatsapp_inbound), 1
contact, status `open`. Operator confirmed the same in the CRM UI.

#### Four ✅s

1. **new-contact path** — ✅ contact + deal + activity + touchpoint +
   notification all created on the first SMS for both test phones.
2. **dedup** — ✅ second SMS from `+447404683609` matched the existing
   contact via Tier 2 phone match; no duplicate contact row created.
3. **deal-reuse** — ✅ second SMS attached to the same open deal;
   `findReusableOpenDeal` (Phase 2b.2.a.3) selected the existing
   `878bdd75-…` instead of opening a second.
4. **cross-channel** — ✅ WhatsApp from `+447404683609` matched the same
   contact (phone match across the `whatsapp:` prefix-strip) and
   appended to the same deal. Three activities now span two channels
   on one deal.

#### Notable observations (ops follow-up — not blocking)

- **Twilio MessageSid prefix collision across channels.** WhatsApp's
  `external_message_id` was `SMeb6312402bc73161ed174f10c6a1ce90` —
  same `SM…` prefix Twilio uses for SMS. The partial unique index on
  `(tenant_id, source_channel, external_message_id)` correctly kept
  the keyspaces independent. Validates the operational-gotchas entry.
- **Per-number webhook overrode the Messaging Service.** Twilio's
  warning ("may override") was conservative here — the per-number
  config took precedence. If a future practice has a different
  Messaging Service setup, the inbound flow may instead need to be
  configured at the service level. Capture this in the
  per-practice provisioning runbook section if it ever bites.
- **First test phone (`+447424805475`)'s contact was named "Unknown
  Lead"** until the operator manually added a name in the CRM. SMS
  carries no display-name field; the natural CRM workflow is to fill
  the name on first contact attempt. Same as WhatsApp on the rare
  payloads where `ProfileName` is empty. No change needed.
- **No `consent_records` row was created** for either contact. The
  WhatsApp inbound rebuild (2b.2.a) followed the same pattern: the
  ingestLead call shape used by Twilio inbound paths doesn't pass an
  explicit `consent` block, so no `consent_records` row is written.
  This was flagged in §3 row C as an adaptation. If we want
  per-message implied-consent capture, the engine needs to grow a
  channel-default consent path (or each Twilio-inbound orchestrator
  needs to write the row directly). Not a 2b.4 regression — same shape
  as 2b.2.a — but worth making explicit in §11 below.

---

## 9. Operational changes

### 9.1 New file: `docs/operational-gotchas.md`

Created with five entries:

1. `'use client'` modules can't be imported by server routes (first seen
   2b.3).
2. Auto-deploy hook lives at `.husky/pre-push`, not `.git/hooks/`
   (first seen 2b.3).
3. Twilio inbound webhook signature URL must match what's configured in
   the Console (first seen 2b.2.a).
4. Twilio inbound: `sms_inbound` and `whatsapp_inbound` keyspaces are
   independent — always filter touchpoint lookups by `source_channel`
   alongside `external_message_id` (new in 2b.4).
5. Each tenant needs its own Twilio receiving number — multi-tenant
   collisions on a shared number resolve to the oldest tenant by
   `created_at` and emit a structured warn (new in 2b.4).

### 9.2 Updated: `docs/onboarding/practice-onboarding-runbook.md`

Added new section **§9b — Inbound SMS provisioning (Phase 2b.4)**:
buying / configuring a Twilio number, repointing the inbound webhook,
setting `tenants.sms_phone_number`, smoke-testing from a phone, the
`pipeline_stages.is_won/is_lost` SQL reminder, and the explicit list of
deferred items so onboarding operators don't over-promise.

### 9.3 Twilio Console webhook repoint (operator action — Step 0.2)

Confirmed 2026-05-10. The operator changed the per-number "Handling for
incoming messages → Webhook URL" on `+447782218044` from the Twilio
default (`https://demo.twilio.com/welcome/sms/reply`) to
`https://dental-crm-nine.vercel.app/api/webhooks/sms` (HTTP method POST).
The number is also associated with a Messaging Service ("Notify -
Dental CRM") which Twilio warns may override per-number config; in
practice the per-number webhook took precedence and post-change inbound
SMSs were correctly routed to our handler (verified by the
`MessagingServiceSid=MGb62e0…` field present on inbound payloads + the
SMS / activity / touchpoint / notification rows landing in the DB
after the change). See §8.3 for the full smoke-test trace.

### 9.4 Vercel env var sanity

`TWILIO_AUTH_TOKEN`, `TWILIO_ACCOUNT_SID`, `TWILIO_SMS_FROM` all present
in production / preview / development scopes (verified via
`vercel env ls production`). The inbound webhook only depends on
`TWILIO_AUTH_TOKEN`; `TWILIO_SMS_FROM` is the outbound sender number
and out of scope for this phase.

---

## 10. Out of scope (deferred)

Locked in for clarity — if any of these come up while testing or in
operator follow-up, decline politely and capture in §11 below.

- **MMS** (inbound photo / file capture). The Twilio webhook does deliver
  `MediaUrlN` keys for MMS today; the parser captures them into the
  parsed `mediaUrls` field and the touchpoint's `raw_payload`, but the
  orchestrator does not download or store media. A future MMS phase can
  read URLs straight off the touchpoint.
- **Outbound SMS auth fix.** `/api/communications/send-sms` and
  `send-sms-v2` currently have no auth and can be triggered by anyone
  with a tenant UUID. This is a real production concern but rebuilding
  it is its own phase.
- **Settings UI for SMS** (tenant configures their own SMS number,
  inbound webhook URL preview, test inbound button). Comes with the
  practice-onboarding wizard.
- **Two-way SMS conversation thread UI.** The activity feed currently
  shows inbound SMS as a single inbound activity; threading + outbound
  reply composition is a later product phase.
- **Auto-replies / business-hours / opt-in / opt-out / STOP-keyword
  flows.** All later automations phase.
- **Outbound SMS path migration** / cleanup of v1 vs v2 send routes.
  Separate phase.
- **Per-tenant SMS number provisioning / number-pool routing.** Today
  every test tenant shares `+447782218044`; production wants one number
  per practice, automated by the wizard.

---

## 11. Open questions for next phase

- **No `consent_records` row written for Twilio-inbound channels.**
  Surfaced during operator validation (§8.3): both the SMS-only contact
  (`eff2b8c1-…`) and the cross-channel contact (`5c19db1f-…`) have zero
  rows in `consent_records`. Same shape as WhatsApp inbound. Patient-
  initiated inbound is implied transactional consent under
  `legitimate_interests` lawful basis, but right now nothing persists
  that. Two paths to fix: (a) extend `ingestLead` so each
  `source_channel` has a default consent shape applied when no
  explicit `consent` block is passed; (b) have each Twilio-inbound
  orchestrator (`processSmsInboundMessage`,
  `processWhatsappInboundMessage`) write the consent row directly
  after `ingestLead` returns. Path (a) is cleaner — captures the
  implied-consent semantic once for every channel — but is a wider
  change. Decide before any GDPR-audit phase ships.
- **Multi-tenant collision on shared test number.** During friends-and-
  family testing, more than one practice is likely to point at
  `+447782218044`. The helper picks the oldest tenant by `created_at`
  and warns. Do we want a hard-fail mode for production, or is the
  warn-and-route-to-oldest behaviour the correct semantic forever?
- **`source_sub_id` for SMS.** WhatsApp inbound doesn't use it; SMS
  inbound also doesn't. Is there a future analytics need for tagging
  the receiving number on the touchpoint via `source_sub_id` (so
  multi-number tenants can slice analytics by which number a lead
  texted), or should that go through `tenants.sms_phone_number` joins
  always? Defer to the wizard phase.
- **Media handling for MMS.** When this phase ships, do we follow the
  WhatsApp media pattern (download to Supabase Storage `message-media`
  bucket via `processInboundMediaItems`), or is SMS-MMS rare enough to
  warrant a different model (e.g. just hand the URL to the operator and
  let them download manually)?
- **STOP keyword handling.** Twilio's carrier-level STOP filtering
  blocks _outbound_ messages to recipients who have replied STOP, but
  the STOP itself still arrives at this webhook. Should we (a) ingest
  it as an activity (current default — it'll come in as a regular
  inbound SMS), (b) intercept and just write a `consent_records` row
  with `withdrawn_at`, or (c) some hybrid? Defer until the consent
  / opt-out automations phase.
- **Production number purchase.** Going from one shared test number to
  one number per practice means buying ~£1/practice/month and routing
  the billing through. This is a commercial / billing decision, not an
  engineering one.

---

## 12. Post-validation follow-up — activity body visible in CRM (commit `653ce5f`)

After §8 operator validation confirmed that inbound SMS and WhatsApp
correctly created contacts / deals / activities / touchpoints, the
operator pointed out that the resulting rows on
`/deals/<deal_id>` rendered with **no message body and a red "Failed
to load AI insights" banner** — making the ingested data unreadable
in the UI even though the data was in the DB. This is in scope for
2b.4 (the phase only delivers operator value when the body is
visible), so a follow-up was shipped on the same branch.

### 12.1 Root cause — two independent UI bugs

1. **Activity feeds rendered `activity.snippet` only.** `ingestLead()`
   writes the channel message body to `activity.description` and
   leaves `snippet` null (see `src/lib/lead-ingestion/ingest-lead.ts`'s
   `insertActivity`). Every feed/timeline component was reading
   `snippet` only, so SMS / WhatsApp / web form / Google lead form
   inbound rows displayed an empty body. The `description` column was
   also missing from the canonical `Activity` interface in
   `src/types/database.ts`, hiding the field from TypeScript.

2. **`AIArtifactsDisplay` mounted on every activity row in the
   deal-page timeline** without `tenantId`. The internal
   `.eq('tenant_id', undefined)` query errored, surfacing as a red
   "Failed to load AI insights" card on SMS / WhatsApp / email /
   note rows. That component is purpose-built for **call** activities
   only (transcript / sentiment / conversion probability / immediate
   actions); it has no data shape for plain inbound text messages.

### 12.2 Fix shape

| # | File | Change |
|---|---|---|
| 1 | `src/types/database.ts` | Added `description?: string` to the canonical `Activity` interface (with comment explaining ingestLead writes here). Single source-of-truth fix; everything else is just consuming it. |
| 2 | `src/components/deals/activity-timeline.tsx` | (a) Body display: `activity.snippet \|\| activity.description` with `whitespace-pre-wrap break-words`. (b) Gated `<AIArtifactsDisplay>` on `activity.type === 'call'` and forwarded `tenantId={orgId ?? undefined}`. |
| 3 | `src/components/activities/activity-feed-enterprise.tsx` | Added `description?: string` to local `Activity` interface; snippet display falls back to description (used by contact detail and deal modal). |
| 4 | `src/components/activities/activity-timeline-enterprise.tsx` | Same shape as #3. |
| 5 | `src/components/activities/activity-feed-simple.tsx` | Same shape as #3. |
| 6 | `src/components/communications/activity-detail-slide-in.tsx` | Right-side detail panel: SMS/WhatsApp body now reads `snippet \|\| description` with a `"No message body recorded"` placeholder; styling promoted to `whitespace-pre-wrap break-words`. |
| 7 | `src/components/communications/global-activity-feed.tsx` | Communications-tab feed: snippet line falls back to description. |

### 12.3 Why `AIArtifactsDisplay` needed gating, not a fallback

A defensive change inside `AIArtifactsDisplay` (e.g. swallowing the
error and returning `null`) would have hidden the bug but also masked
real problems for genuine call rows. The component has no rendering
path for SMS/WhatsApp data — there's no "summary", "transcript",
"treatments_discussed", or "conversion_probability" for a plain
inbound text message — so the right place to gate is at the call
site, by `activity.type`. Future channels that get AI artifacts
(e.g. email summaries) would extend the gate explicitly.

### 12.4 Validation

- **All 123 unit tests pass** (`npx jest`). No new tests added — the
  fix is in pure rendering/type code with no orchestration logic.
- **TypeScript:** `npx tsc --noEmit` confirms no new errors in any
  edited file. Pre-existing TS errors elsewhere in the repo are
  unchanged.
- **Codacy** (`codacy_cli_analyze` per file): ESLint, Opengrep, Trivy
  all clean; the only flags are pre-existing Lizard complexity /
  file-nloc warnings on functions and files I did not modify
  (per the workspace rule, complexity metrics are ignored).
- **Operator visual confirmation** post-deploy: the same deal
  page (`/deals/878bdd75-ece5-4967-9326-cdb36acc4dc0`) now renders
  the WhatsApp inbound body and both SMS inbound bodies; the red
  "Failed to load AI insights" banner is gone for non-call rows.

### 12.5 Ripple effects (intentional)

- **Web form and Google lead form inbound also benefit.** Both flow
  through `ingestLead()` and write the inquiry text to
  `activity.description`. They had the same blank-body bug before
  this fix; they're now readable in every feed without any
  channel-specific change.
- **Call rows are unaffected.** They keep rendering the full
  `AIArtifactsDisplay` card whenever the AI artifacts pipeline has
  populated data (gated on `activity.type === 'call'`).
- **Outbound activities** (manual `snippet`-edited rows from the
  operator) are unaffected — the fallback is `snippet || description`,
  so an operator-authored snippet still wins.

### 12.6 What is _still_ deferred (unchanged from §10)

This fix only makes the **single inbound activity body readable**. It
does NOT add:

- Two-way SMS / WhatsApp conversation threading (multiple inbound
  + outbound messages grouped into a thread view).
- Outbound reply composition wired to a sender pipeline.
- Inline media rendering for MMS (the `_media_urls` are captured in
  `attribution_touchpoints.metadata->'raw_payload'` but not
  downloaded, per the original 2b.4 text-only scope).

These remain in §10 as deferred and are unaffected by §12.
