# 2b.2 pre-plan findings (read-only fact-finding)

Source files inspected:
- `dental-crm/src/app/api/webhooks/whatsapp/route.ts` (275 LOC)
- `dental-crm/src/lib/whatsapp-service.ts`
- `dental-crm/src/lib/communications/dispatcher.ts`
- `dental-crm/src/lib/integrations/tenant-integration-config.ts`
- `dental-crm/src/app/api/communications/send-whatsapp-v2/route.ts`
- `dental-crm/src/app/api/settings/whatsapp/route.ts`
- `dental-crm/src/components/settings/whatsapp-config-tab.tsx`
- Greps across `dental-crm/src/**/*.{ts,tsx}` for Messenger / `psid` / `page_id`.

## Q1 — WhatsApp inbound webhook
- **New-number behaviour:** does NOT call `ingestLead()` and does NOT insert into `contacts`; it just logs `"No contact found for: <phone>"` and inserts an `activities` row with `tenant_id` set to `contact?.tenant_id` (i.e. `undefined`) — see `route.ts:142-171`.
- **Existing-contact behaviour:** inserts a single `activities` row (`type='whatsapp'`, `direction='inbound'`, `integration_provider='twilio_whatsapp'`, `external_id=MessageSid`) tied to the matched contact's `tenant_id`; no last-inbound timestamp update, no deal stage change, no notification fired (`route.ts:147-171`).
- **`attribution_touchpoints` write:** no — the webhook never references `attribution_touchpoints`.
- **Signature verification:** yes, Twilio HMAC-SHA1 via `verifyTwilioSignature`, env var `TWILIO_AUTH_TOKEN` (`route.ts:31-65`). Note: verification only runs when the `x-twilio-signature` header is present — a request with no signature header silently passes (`if (twilioSignature && !verifyTwilioSignature(...))`).
- **Tenant resolution:** derived only from the matched contact's `tenant_id`; the receiving WhatsApp number (`To`) is parsed but never used to look up the tenant (`route.ts:134-150`).
- **BSP / API:** Twilio WhatsApp Business API (form-encoded webhook with `MessageSid`, `From=whatsapp:+E164`, `To`, `Body`, `NumMedia`, `ProfileName` and `x-twilio-signature` header).
- **Code-level notes:**
  - `contacts` lookup at `route.ts:134-138` is cross-tenant: `.eq('primary_phone', phoneNumber).limit(1)` with no tenant filter and no `eq('to', tenant.whatsapp_phone_number)` join. Two tenants whose contacts share a phone would route the message to whichever row Postgres returns first.
  - When no contact matches, the activity is still inserted with `tenant_id: undefined`, which will either fail the `NOT NULL` constraint on `activities.tenant_id` or (if nullable) create an orphan row. Either way it's broken behaviour for net-new inbound numbers.
  - No retry / DLQ on the activity-insert path beyond `add_to_dlq` RPC; the webhook still returns 500, so Twilio will retry.
  - No call to `ingestLead()` anywhere in the file → inbound WhatsApp from a brand-new number never creates a lead/deal.

## Q2 — Messenger surface
- **Inbound webhook route:** no — `dental-crm/src/app/api/webhooks/` contains `email`, `google-lead-form`, `meta-lead-ads`, `route.ts`, `sms`, `tiktok-lead-gen`, `voice`, `voicestack`, `whatsapp` only.
- **Dispatcher send path:** no — `dispatcher.ts` exports only `dispatchEmail`, `dispatchSms`, `dispatchWhatsApp`, `dispatchVoiceCall`.
- **Service module:** no — no `messenger-service.ts` (or anything similar) under `dental-crm/src/lib/`.
- **UI composer:** no — no `messenger-composer*` or equivalent under `dental-crm/src/components/`.
- **Other references:**
  - `dental-crm/src/lib/lead-ingestion/types.ts:18,26,75` — enum members `meta_messenger_ad`, `fb_messenger`, and identifier kind `fb_messenger_psid`.
  - `dental-crm/src/lib/lead-ingestion/source-labels.ts:18,26` — display labels for those enums.
  - `dental-crm/src/lib/lead-ingestion/ingest-lead.ts:186,614,633,641-642` — type union mention plus a switch case mapping `fb_messenger` → `'fb_messenger'` source channel; `meta_messenger_ad` falls into the "no direct touchpoint" branch.
  - `dental-crm/src/app/api/dedup-queue/[id]/resolve/route.ts:631,639-640` — switch case mapping `fb_messenger` → `'messenger_message'`.
  - `dental-crm/src/components/dedup-queue/dedup-signals-explainer.tsx:39` — UI string mentioning Messenger ID.
  - `dental-crm/src/types/supabase.ts:28489,28497,28661,28669` — generated enum entries.
  - No runtime handler anywhere for `psid`, `page_id`, or `recipient.id` against Meta Messenger payloads (the `page_id` matches in `integrations-hub.tsx` and `meta-lead-ads/route.ts` are for Lead Ads / settings UI, not Messenger).

Conclusion: Messenger is **completely unbuilt as a conversation channel** — only schema/enum scaffolding and a few label strings exist. Phase 2b.2 is greenfield for Messenger.

## Q3 — Bonus
- **Credentials storage:** **mixed**. The encrypted path exists (`tenant-integration-config.ts` calls `integration_load_credentials` RPC with `INTEGRATION_CREDENTIAL_KEY` and reads Twilio secrets from a vault-backed RPC), and the new `dispatchWhatsApp` in `dispatcher.ts` uses it via `loadTenantIntegrationSettings`. But the legacy plain-text columns `tenants.whatsapp_api_key / whatsapp_api_secret / whatsapp_phone_number` are still actively used by:
  - `dental-crm/src/app/api/communications/send-whatsapp-v2/route.ts:42-77` (still selects and sends with them),
  - `dental-crm/src/app/api/settings/whatsapp/route.ts:7-20` (POST writes them in plain text),
  - `dental-crm/src/components/settings/whatsapp-config-tab.tsx:17-83` (settings UI still renders/saves them).
  So `D03_communications.md §9.2` is partially out of date: the encrypted path exists, but the legacy plain-text columns are still the source of truth for one of two send paths and the settings UI.
- **WhatsApp send BSP:** Twilio (`dental-crm/src/lib/whatsapp-service.ts` uses the `twilio` Node SDK and the `whatsapp:+E164` sender format).
- **Tenant-by-number lookup confirmed:** **no**. The inbound webhook never matches `To` against `tenants.whatsapp_phone_number`; it resolves tenant solely by looking up the inbound `From` against `contacts.primary_phone` (cross-tenant — no tenant filter on the query). This is a fundamentally different mental model from Google's per-tenant webhook key.

## Anything else worth flagging
- **Cross-tenant contact lookup bug.** `route.ts:134-138` queries `contacts` without scoping to a tenant. In a multi-tenant DB this is a data-leakage / mis-routing hazard, and it gets worse the more tenants we have on the same Twilio number pool.
- **Silent signature bypass.** `route.ts:46` only verifies the signature when the header is present. A request lacking `x-twilio-signature` is accepted as long as the body parses. Should probably be a hard reject.
- **Net-new inbound WhatsApp = no lead created.** The route never calls `ingestLead()` and never inserts a `contacts` row. A prospective patient who DMs the practice on WhatsApp from a number not already in the CRM produces an `activities` row with `tenant_id: undefined` and nothing else — no contact, no deal, no attribution touchpoint, no first-response surface for the agent. This is the single biggest gap 2b.2 needs to fix.
- **No `attribution_touchpoints` write at all.** Inbound WhatsApp messages are invisible to the attribution engine, so any deal that originated on WhatsApp will not have a `whatsapp_message` (or equivalent) touchpoint. Worth deciding in 2b.2 whether `ingestLead()` covers this for new numbers and whether existing-contact inbound messages should also create a touchpoint.
- **Two send paths for WhatsApp.** `dispatchWhatsApp` (via `loadTenantIntegrationSettings`, vault-aware) and `send-whatsapp-v2/route.ts` (legacy plain-text columns) both exist and read different credential sources. 2b.2 should decide which one is canonical or the dispatcher will silently disagree with the v2 send route on a given tenant.
- **Settings UI drift.** `whatsapp-config-tab.tsx` writes only the legacy columns; nothing in the UI populates `channel_settings.twilio_*` or the encrypted vault, so the only way to populate the new path today is environment variables or out-of-band SQL. Worth flagging as a UX gap before 2b.2 plans a Messenger settings UI.
- **Webhook idempotency works but tenant_id on the log row is `null` until contact resolves.** `integration_webhooks_log.tenant_id` is initially inserted as `null` (`route.ts:117`) and only patched to `contact?.tenant_id` afterwards (`route.ts:213`). For unmatched inbound numbers it stays `null`, which will affect any tenant-scoped log dashboards.
- **Messenger enum scaffolding is already in `lead-ingestion`** (`fb_messenger`, `meta_messenger_ad`, `fb_messenger_psid`), so the ingest engine is ready to receive Messenger inbound — the missing pieces are the Meta webhook route, the dispatcher send path, the service module, and the settings/credentials surface.
