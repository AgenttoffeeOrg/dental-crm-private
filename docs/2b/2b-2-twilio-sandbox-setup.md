# Twilio WhatsApp Sandbox setup — pre-2b.2.a

**Date:** 2026-05-09 (UTC)
**Phase:** 2b.2 — pre-build infrastructure / ops setup (no application code changes).
**Test tenant:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf` ("Deepak's Dental Practice")
**Operator:** Toffee.

## Twilio side
- **Account SID:** `AC...e835` (last 4 chars; full value already lived in `.env.local` and Vercel before this runbook ran).
- **Account name / status:** *"My first Twilio account"* — `active`, type `Full`, balance £44.71 at the time of setup.
- **Sandbox phone number:** `+14155238886` (the shared Twilio sandbox WhatsApp number).
- **Join code:** `join my-too`
- **Operator's joined phone:** `+919916558958` (Deepak Hegde, India number) — confirmed by Twilio's "you are all set" reply during Phase 1.
- **Inbound webhook URL configured in Twilio Sandbox:** `https://dental-crm-nine.vercel.app/api/webhooks/whatsapp` (HTTP `POST`). Saved under *Develop → Messaging → Try it out → Send a WhatsApp message → Sandbox settings*. Status callback URL left blank.

## App side

### `.env.local` (local dev)
- `TWILIO_ACCOUNT_SID` — unchanged.
- `TWILIO_AUTH_TOKEN` — unchanged.
- `TWILIO_WHATSAPP_SENDER` — **changed** from `whatsapp:+447782218044` to `whatsapp:+14155238886`. A revert comment was added inline above the var with the original UK value.
- `TWILIO_SMS_FROM`, `TWILIO_VOICE_CALLER_ID`, `TWILIO_MESSAGING_SERVICE_SID` — unchanged.

### Code-level env var name disambiguation
The runbook prompt referred to the WhatsApp number var as `TWILIO_WHATSAPP_NUMBER`. The actual var name used by the codebase is **`TWILIO_WHATSAPP_SENDER`** (verified across `src/lib/integrations/tenant-integration-config.ts`, `env.example`, `scripts/store-tenant-credentials.js`). All edits used the real name.

### Vercel env vars
Updated for the linked project `toffeehegde-9056s-projects/dental-crm` (`prj_2jcBXOCiiRuGay84tyFKQRFGrEuF`).

| Env | `TWILIO_WHATSAPP_SENDER` | Notes |
|---|---|---|
| Production | `whatsapp:+14155238886` ✓ | removed and re-added (the `4d ago` value held the UK number); no `--force` overwrite was used because the CLI's `env rm` first removed all three scopes in one shot. |
| Preview | **NOT SET** ⚠️ | Vercel CLI 53.1.0 refused to add to "all preview branches" with `git_branch_required: Project does not have a connected Git repository`. This project deploys via the CLI without a git integration today, so preview branch builds aren't actively used. Not a runtime blocker for the production sandbox test. If preview deploys are needed later, add the value via the Vercel dashboard once a git integration is connected. |
| Development | `whatsapp:+14155238886` ✓ | added with `--value ... --yes`. |

`TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` were already populated correctly across all three environments (verified by a `curl` to `https://api.twilio.com/2010-04-01/Accounts/<SID>.json` returning `status: active`). They were not touched.

### Tenant column
```sql
UPDATE tenants
SET whatsapp_phone_number = '+14155238886'
WHERE id = '5aadca14-9786-4aef-bc53-e9287cdd0bbf';
```
Verified: `whatsapp_phone_number = '+14155238886'`. **Note:** today's webhook does not read this column (it does a `contacts.primary_phone` lookup with no tenant scope — the broken behaviour 2b.2.a is mandated to replace). Pre-populating it now is harmless and unblocks 2b.2.a's tenant-by-receiving-number resolution.

### Vercel deployment refreshed
- `vercel --prod` ran 12:09 UTC → deployment `dpl_FwL47z7THmjBR7T6dXSRsY6DvAr9` `READY`.
- Aliased to `https://dental-crm-nine.vercel.app`.
- Sanity check: `GET /api/webhooks/whatsapp` → HTTP 200 (the route's health-check JSON).

## Connectivity test (Phase 3)

Two real WhatsApp messages were sent from the joined phone (`+919916558958`) to the sandbox (`+14155238886`).

### Round 1 — `Hello Test` — exposed the existing broken business logic
- Twilio inbound: received ✓
- Twilio → our webhook: POSTed ✓
- Twilio-recorded webhook status: **500**
- Correlation ID: `db95cb5f-d452-488c-a635-ad5fe521c965`
- Root cause from function logs:
  ```
  Error creating activity: code 23502
  null value in column "tenant_id" of relation "activities" violates not-null constraint
  ```
  The webhook does `SELECT * FROM contacts WHERE primary_phone = '+919916558958'` (no tenant filter, no fallback). With no matching contact, `tenant_id` was `null`, and the `activities` insert was rejected by Postgres. This is **the exact failure mode 2b.2.a is mandated to fix** — it is not a regression introduced by this setup. The signature verification and the receipt path itself worked.

### Round 2 — `Hello test 2` — happy path with seeded contact
To produce a clean 200 connectivity proof, a single test contact was inserted into the `contacts` table:
```
id:               8d65dde7-c009-4439-9188-dd2fa5f3f2ec
tenant_id:        5aadca14-9786-4aef-bc53-e9287cdd0bbf
full_name:        Deepak Hegde (WhatsApp Sandbox Test)
primary_phone:    +919916558958
primary_phone_e164: +919916558958
source:           whatsapp_sandbox_test
tags:             {test, phase-2b.2-sandbox}
```
With that contact present, the second message processed cleanly:
- Twilio inbound: received ✓
- Twilio → our webhook: POSTed ✓
- Twilio-recorded webhook status: **200** ✓
- Correlation ID: `a2bcfdaf-90d1-4f91-9afb-1b783d26c039`
- Twilio Message SID: `SM21e529441bf3ed5b583a6be82303b50c`
- Vercel function log entry: `[WEBHOOK WHATSAPP][a2bcfdaf-...] ✅ WhatsApp message processed - activity 99f63f13-a93f-4f1e-a16d-eb6648341bce` (level `info`, not `error`).
- DB verification:
  ```
  activity 99f63f13-a93f-4f1e-a16d-eb6648341bce
    tenant_id:    5aadca14-9786-4aef-bc53-e9287cdd0bbf  ✓
    contact_id:   8d65dde7-c009-4439-9188-dd2fa5f3f2ec  ✓
    type:         whatsapp
    direction:    inbound
    snippet:      Hello test 2
    from_number:  +919916558958
    to_number:    +14155238886
    message_status: received
    external_id:  SM21e529441bf3ed5b583a6be82303b50c
  ```
  Vercel function log confirms invocation; integration_logs / integration_webhooks_log rows were also written by the webhook for audit.

## Status

| Check | Result |
|---|---|
| Real WhatsApp message sent from joined phone | yes (twice — `Hello Test` then `Hello test 2`) |
| Twilio recorded webhook POST status | 500 (round 1, expected broken-logic failure) → 200 (round 2, happy path) |
| Vercel function log confirms webhook invocation | yes (info level on round 2; error level on round 1) |
| Activity row written with correct tenant + contact | yes (round 2) |
| `TWILIO_AUTH_TOKEN` signature verification | passes (no 401 on either round) |

**Sandbox connectivity scaffolding is live.** 2b.2.a can be planned next.

## Caveats / known limitations

- **The shared sandbox number `+14155238886` is global to all Twilio sandbox users.** If a second tenant is onboarded before going to production WhatsApp, the to-number lookup will collide — every account using Twilio's sandbox sees inbound messages routed through the same number. Production WhatsApp Business senders each get their own dedicated number, so this caveat disappears the moment a real sender is registered.
- **The UK number `+447782218044`** that previously occupied `TWILIO_WHATSAPP_SENDER` is **not** a registered WhatsApp Business sender on the Twilio account. Verified via `GET https://messaging.twilio.com/v2/Channels/Senders?Channel=whatsapp` → `senders: []`. The number is provisioned for SMS+voice only (its SMS webhook is currently pointed at `https://demo.twilio.com/welcome/sms/reply`). Outbound WhatsApp from that number would have failed regardless of this runbook. Registering it as a real WhatsApp sender is a separate effort, downstream of 2b.2.a.
- **`TWILIO_AUTH_TOKEN`** is currently stored in plain env. Should be rotated when the first real customer is onboarded.
- **Vercel preview env vars** for `TWILIO_WHATSAPP_SENDER` are not set (CLI requires a connected Git repository to add to "all preview branches"). Production and Development scopes are set. If preview deploys start being used, add the value via the Vercel dashboard.
- **The current pre-2b.2.a inbound webhook still does the broken from-number-only lookup with no tenant scope.** Round 1 above (`Hello Test` → 500) is the smoking gun: when the from-number doesn't match any contact in any tenant, the webhook crashes on the `tenant_id NOT NULL` constraint instead of either (a) resolving tenant by receiving number or (b) creating a lead. Both behaviours are 2b.2.a's responsibility.
- **Test fixtures created during this setup** (do NOT delete blindly — they're now referenced by activity `99f63f13-...`):
  - `contacts.id = 8d65dde7-c009-4439-9188-dd2fa5f3f2ec` ("Deepak Hegde (WhatsApp Sandbox Test)", tenant Deepak's Dental Practice). Tagged `phase-2b.2-sandbox` for easy filtering.
  - `activities.id = 99f63f13-a93f-4f1e-a16d-eb6648341bce` (the round-2 inbound).
  - The corresponding `integration_webhooks_log` and `integration_logs` rows for both round-1 and round-2 webhook receipts.
- **No code commits made.** This document is for reference only.
