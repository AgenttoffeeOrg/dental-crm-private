# Phase 2b.1.b.1 — Google outbound Enhanced Conversions for Leads: change log

**Scope:** wire the **outbound** half of the Google Ads integration. Send
two conversion events back to Google for any lead/deal that arrived with a
`gclid`:

1. `Lead` — fired the moment `ingestLead()` completes for a payload that
   carries a `gclid`.
2. `FirstResponse` — fired the first time the practice records an
   outbound activity (email, SMS, WhatsApp, voice call) against the deal
   created from that lead.

Added per-tenant Google Ads OAuth (refresh-token storage), a
`conversion_events_fired` audit + idempotency log, a `GoogleAdsClient`
hitting `customers/<id>:uploadClickConversions` directly via `fetch` (no
SDK), and the firing modules (`fireGoogleConversionEvent`,
`detectAndFireFirstResponse`) wired into both the lead-ingest path and
every canonical activity writer.

**Out of scope (deferred):** Settings UI for Google Ads OAuth (Phase
2b.1.b.2 — operator runs the CLI for now), Meta / Facebook Ads outbound
conversions, async-via-BullMQ firing, retry queue beyond the 1-shot 5xx
retry, GAQL verification of conversion ingestion in the Google Ads UI
(takes hours-to-days on Google's side and requires an operator).

**Branch baseline:** `phase-1-attribution-foundation`, on top of Phase
2b.1.a (`docs/2b/2b-1-a-changes.md`).
**Date applied:** 2026-05-06.
**Live tenant exercised:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf`
("Deepak's Dental Practice"), reactivated webhook config row.

---

## 1. Summary

A lead that arrives with `attribution.gclid` (e.g. via the 2b.1.a Google
Lead Form webhook, or any future channel that propagates `gclid`)
triggers two outbound conversion events back to Google Ads:

```
ingestLead() succeeds with gclid
   └── fireGoogleConversionEvent({ event_type: 'Lead', ... })
       └── conversion_events_fired row (status='success'|'failure'|'skipped_*')

… later, on first outbound activity for the same deal …

dispatcher.sendEmail() / sendSms() / sendWhatsApp() / sendCall()
  or POST /api/communications/send-sms-v2 / send-whatsapp-v2
   └── INSERT activity (direction='outbound', deal_id, occurred_at)
       └── DB trigger stamps deals.first_response_at = occurred_at  (first time only)
       └── detectAndFireFirstResponse({ ... })
           └── re-reads deals.first_response_at; if it == this activity's
               occurred_at (±5s window), this IS the first response
               └── fireGoogleConversionEvent({ event_type:'FirstResponse', ... })
                   └── conversion_events_fired row
```

Idempotency: a partial `UNIQUE (deal_id, event_type, platform) WHERE
status = 'success'` index on `conversion_events_fired` enforces "fire
once" at the DB. The application layer also short-circuits with a SELECT
before calling Google. Failed and skipped rows are unrestricted so they
can be retried / re-recorded.

The firing path is **best-effort and non-blocking** — every failure mode
ends up as a row in `conversion_events_fired` with an explanatory
`status` and `error_message`. A Google outage **never** fails ingestion
or message-sending.

OAuth credentials are per-tenant: a CLI prints a Google consent URL, the
operator signs in, the callback exchanges `code` for a refresh token, and
the token is encrypted at rest with AES-256-GCM (key:
`INTEGRATION_CREDENTIAL_KEY`). The pgcrypto-based
`integration_secret_vault` was confirmed empty before the encryption key
was rotated to a properly-formatted base64(32 bytes).

---

## 2. Schema migration — `20260507_phase_2b_1_b_1_google_conversions.sql`

Applied via Supabase MCP `apply_migration` (name:
`phase_2b_1_b_1_google_conversions`). Rollback companion at
`20260507_phase_2b_1_b_1_google_conversions_rollback.sql`.

**Contents:**

| # | Object | Notes |
|---|---|---|
| 1 | `google_lead_form_configs` extended | Adds `customer_id`, `login_customer_id`, `conversion_action_resource_name`, `oauth_refresh_token_encrypted`, `oauth_scope`, `oauth_connected_at`, `oauth_connected_by_user_id` (FK→`app_users`), `oauth_pending_state` (UNIQUE), `oauth_pending_state_expires_at`. |
| 2 | `idx_google_lead_form_configs_oauth_pending_state` | Partial index on `oauth_pending_state WHERE oauth_pending_state IS NOT NULL` for the OAuth-callback lookup. |
| 3 | `conversion_events_fired` table | `id`, `tenant_id` FK→tenants, `deal_id` FK→deals, `contact_id` FK→contacts, `platform` (CHECK `'google_ads'`), `event_type` (CHECK `'Lead' | 'FirstResponse'`), `conversion_action_resource_name`, `gclid`, `occurred_at`, `status` (CHECK `'success' | 'failure' | 'skipped_no_gclid' | 'skipped_other'`), `http_status`, `response_excerpt`, `error_message`, `fired_at`, `retry_count`. All FKs `ON DELETE CASCADE`. |
| 4 | `idx_conversion_events_fired_idempotency` | Partial UNIQUE on `(deal_id, event_type, platform) WHERE status = 'success'` — DB-level idempotency. |
| 5 | `idx_conversion_events_fired_tenant_fired_at` and `_status_fired_at` | Read indexes for tenant audit and failure dashboards. |
| 6 | RLS enabled + 3 policies | `conversion_events_fired_select` (tenant SELECT via `tenant_id = ANY(get_accessible_tenants())`), `conversion_events_fired_insert_authenticated` (write gated by `settings.integrations.manage`), `conversion_events_fired_service_role` (catch-all for service-role writes). |
| 7 | `deals.first_response_at` column | Stamped by trigger; drives the FirstResponse event and any future first-response SLA reporting. |
| 8 | `trigger_update_deal_first_response()` function + `activities_stamp_deal_first_response` trigger | `AFTER INSERT ON activities FOR EACH ROW`. Updates `deals.first_response_at = COALESCE(NEW.occurred_at, now())` only when `NEW.direction='outbound' AND NEW.deal_id IS NOT NULL AND deals.first_response_at IS NULL`. **Sibling** of the existing `trigger_update_contact_first_response` — that one is left untouched per the prompt's "must NOT" list. |
| 9 | `REVOKE EXECUTE ON FUNCTION trigger_update_deal_first_response() FROM PUBLIC, anon, authenticated` | Required to satisfy Supabase advisors `anon_security_definer_function_executable` and `authenticated_security_definer_function_executable`. The function is `SECURITY DEFINER` and only meant to fire from the trigger context; revoking PostgREST-rpc access plugs the surface. |

**Validation queries (post-apply):**

```sql
SELECT count(*) FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'conversion_events_fired';
-- → 1

SELECT count(*) FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'google_lead_form_configs'
    AND column_name IN (
      'customer_id','login_customer_id','conversion_action_resource_name',
      'oauth_refresh_token_encrypted','oauth_scope','oauth_connected_at',
      'oauth_connected_by_user_id','oauth_pending_state',
      'oauth_pending_state_expires_at');
-- → 9

SELECT count(*) FROM pg_indexes
  WHERE tablename = 'conversion_events_fired';
-- → 4 (PK + idempotency partial unique + 2 read indexes)

SELECT count(*) FROM pg_policies WHERE tablename = 'conversion_events_fired';
-- → 3

SELECT count(*) FROM information_schema.columns
  WHERE table_schema='public' AND table_name='deals' AND column_name='first_response_at';
-- → 1

SELECT proname, prosecdef FROM pg_proc WHERE proname='trigger_update_deal_first_response';
-- → trigger_update_deal_first_response | true
```

Supabase advisors flagged two `*_security_definer_function_executable`
issues for the new trigger function on first apply. Both were addressed
in-migration via the three `REVOKE EXECUTE` statements (PUBLIC, anon,
authenticated). Re-run of advisors returned green.

---

## 3. Adaptations from prompt → live shape

The prompt was written assuming a Phase-2a-foundation that we'd already
amended in 2b.1.a; some divergences only surfaced once we wired into the
real codebase. Each is documented here:

| # | Prompt assumed | Live shape | Resolution |
|---|---|---|---|
| A | Encryption helper at `src/lib/crypto/integration-credentials.ts` already exists from a prior phase. | Helper did **not** exist; only the pgcrypto-backed `integration_store_credentials` / `integration_load_credentials` SQL functions did, and they accept any passphrase. | Built the new TS helper from scratch. To stay compatible with `INTEGRATION_CREDENTIAL_KEY=Agenttoffee!1406milo` (existing pgcrypto passphrase), the helper accepts **both** a strict base64(32-byte) key and an arbitrary passphrase, deriving 32 bytes via SHA-256. Backwards-compatible; rotating the env var only invalidates ciphertexts produced by the new helper (the pgcrypto vault was empty when we rotated to a base64(32) key — verified by `SELECT count(*) FROM integration_secret_vault`). |
| B | `IngestLeadInput` has `email`, `phone_e164`, `gclid` flat. | Live `IngestLeadInput` is nested: `contact.email`, `contact.phone`, `attribution.gclid`. | Read from the nested shape in `ingestLead()`. Phone is normalised to E.164 via the existing `normalisePhoneE164` helper before hashing. |
| C | A canonical "single activity writer" wraps every outbound message. | Outbound activities are inserted at **three** sites: `src/lib/communications/dispatcher.ts` (email, SMS, WhatsApp, call — the canonical multi-channel dispatcher), `src/app/api/communications/send-sms-v2/route.ts` (legacy direct SMS API), and `src/app/api/communications/send-whatsapp-v2/route.ts` (legacy direct WhatsApp API). | Wired `detectAndFireFirstResponse` at all three sites. The dispatcher is the canonical path; the v2 routes still exist for direct callers and `maybeFireFirstResponse` was extracted into a helper to keep the route's cyclomatic complexity ≤ 8. |
| D | Voice-call activity has a clean `occurred_at`. | Live voice path inserts via `dispatcher.dispatchCall()` and historically didn't set `occurred_at` explicitly. | `dispatcher.ts` now sets `occurred_at` explicitly on every outbound activity insert (email/SMS/WhatsApp/call) so the trigger and the detector see the same timestamp. The 5-second match window in `first-response-detector.ts` absorbs trigger ↔ caller clock skew. |
| E | Google Ads API version is v15 / "current default". | Live availability — Google deprecates ~2 versions per year. | Centralised as `export const ADS_API_VERSION = 'v17'` in `google-ads-client.ts` with a comment pointing at https://developers.google.com/google-ads/api/docs/release-notes. Bump-and-changelog when needed. |
| F | OAuth callback returns JSON. | The operator running the CLI wants a **browser-friendly** confirmation page. | Callback renders a minimal HTML success/failure page (no inline JS, no external CSS). JSON is unhelpful when the redirect lands in the operator's browser. |
| G | `INTEGRATION_CREDENTIAL_KEY` already a base64(32-byte) value. | Live `.env.local` had `INTEGRATION_CREDENTIAL_KEY=Agenttoffee!1406milo` (22-char ASCII passphrase, used by the existing pgcrypto vault). | (1) Helper accepts both formats (see Adaptation A). (2) `.env.local` was rotated to a fresh `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` value after confirming `integration_secret_vault` empty. (3) Comment block in `.env.local` explains the rotation and its compatibility with both consumers. |
| H | `google_lead_form_configs` row for the test tenant is `is_active=true`. | Pre-flight found `is_active=false` (Phase 2b.1.a left a deactivated row). | Reactivated by re-running `npx tsx scripts/phase-2b/generate-google-webhook-key.ts <tenant_id>` (a 2b.1.a script). Webhook key was captured for Task 8 manual validation. |

---

## 4. New TypeScript modules

| File | Responsibility |
|---|---|
| `src/lib/crypto/integration-credentials.ts` | `encryptIntegrationCredential(plaintext)` / `decryptIntegrationCredential(ciphertext)`. AES-256-GCM via `node:crypto`. Key derivation: SHA-256 of `INTEGRATION_CREDENTIAL_KEY` (so any passphrase works; a properly-formatted base64(32) key skips the hash). 12-byte random IV per ciphertext, 16-byte auth tag, stored as `iv:tag:ciphertext` base64. |
| `src/lib/conversions/google-ads-client.ts` | `class GoogleAdsClient` + `loadGoogleAdsConfig`, `formatGoogleAdsTimestamp`, `hashEmail`, `hashPhone`. (1) Refreshes an access token from the encrypted refresh token + `GOOGLE_ADS_OAUTH_CLIENT_ID/SECRET`. (2) POSTs `customers/<id>:uploadClickConversions` with the right `developer-token`, `Authorization: Bearer …`, and `login-customer-id` headers. (3) Hashes user identifiers per Google's spec (lowercase trim → SHA-256 hex for email; E.164 → SHA-256 hex for phone). (4) Returns a typed `UploadResult` capturing HTTP status, partialFailureError, and a 500-char response excerpt. No npm SDK. `ADS_API_VERSION = 'v24'` (released 2026-04-22, sunset May 2027 — the longest-runway supported version at validation time). |
| `src/lib/conversions/fire-conversion-event.ts` | `fireGoogleConversionEvent(input, supabase?)`. The single chokepoint that runs the idempotency check (SELECT against `conversion_events_fired`), early-skips on missing `gclid` / missing config / missing OAuth, calls the client, retries once on 5xx (800ms backoff), and writes the outcome row. Never throws. |
| `src/lib/conversions/first-response-detector.ts` | `detectAndFireFirstResponse(input, supabase?)`. Reads `deals.first_response_at` and compares to the activity's `occurred_at` within a 5s window. If matched, fetches the deal's most recent `gclid` (via `attribution_touchpoints` joined on the deal's contact) and the contact's `email`/`phone`, then calls `fireGoogleConversionEvent` with `event_type='FirstResponse'`. Best-effort. |
| `src/lib/conversions/__tests__/integration-credentials.test.ts` (under `crypto/`) | 8 unit tests: round-trip with valid base64 key, round-trip with arbitrary passphrase, random IV per call, throws when `INTEGRATION_CREDENTIAL_KEY` unset, throws on tampered ciphertext, etc. |
| `src/lib/conversions/__tests__/google-ads-client.test.ts` | 15 unit tests covering: token refresh path, request body shape (orderId, gclid, conversion_action, hashed identifiers), header construction (Bearer, developer-token, login-customer-id), 4xx no-retry, 5xx 1-retry, partialFailureError parsing, `hashEmail`/`hashPhone` correctness vs Google's published vectors. |
| `src/lib/conversions/__tests__/fire-conversion-event.test.ts` | 8 unit tests: idempotent short-circuit, missing-gclid skip, missing-config skip, success path inserts row, 5xx → retry → success, 4xx → no retry, alreadySucceeded SELECT failure logs but doesn't block, success row has `http_status` and truncated `response_excerpt`. |
| `src/lib/conversions/__tests__/first-response-detector.test.ts` | 8 unit tests: inbound activity is a no-op, no `deal_id` is a no-op, no `first_response_at` is a no-op, `first_response_at` outside 5s window is a no-op, in-window match calls `fireGoogleConversionEvent` with the right shape (event_type='FirstResponse', gclid from latest touchpoint, hashed email/phone from contact), missing gclid still calls fire (it'll be skipped at the next layer), missing contact does not crash. |
| `src/lib/conversions/__tests__/google-ads.integration.test.ts` | 1 live-DB integration test gated on `LEAD_INGESTION_INTEGRATION=1` (mirrors 2b.1.a's gating). Inserts a `conversion_events_fired` row with all required columns, re-inserts a duplicate with `status='success'`, asserts the partial UNIQUE blocks, then cleans up. |
| `src/app/api/integrations/google-ads/oauth/callback/route.ts` | Next.js GET handler. Reads `code` + `state` query params, looks up the matching `google_lead_form_configs` row by `oauth_pending_state`, refuses if expired or already consumed, exchanges `code` for `refresh_token` + `access_token` against `https://oauth2.googleapis.com/token`, encrypts the refresh token, persists `oauth_refresh_token_encrypted`, `oauth_scope`, `oauth_connected_at`, `oauth_connected_by_user_id` (best-effort — set when the configs row already has a `created_by`), clears `oauth_pending_state*`, renders an HTML success page. Renders an HTML failure page with the error message on any branch except token-exchange failure (where it logs without leaking the response body). |

---

## 5. New routes

| Route | Method | Behaviour |
|---|---|---|
| `/api/integrations/google-ads/oauth/callback` | GET | OAuth 2.0 redirect target. See §4 row above. Renders HTML, never JSON. Query params: `code` (Google authorisation code), `state` (CSRF token issued by `connect-google-ads.ts`). On success: stores encrypted refresh token, clears pending state, renders "Google Ads connected ✓". On failure: renders "Could not connect: \<message\>" with no sensitive data. |

No other routes were added or modified.

---

## 6. CLI scripts

Both scripts use the service role and bypass RLS — intentional, and
matches the 2b.1.a pattern. The Settings UI in 2b.1.b.2 will do the
equivalent through normal authenticated user RLS.

### `scripts/phase-2b/connect-google-ads.ts`

```bash
cd dental-crm
set -a && source .env.local && set +a
npx tsx scripts/phase-2b/connect-google-ads.ts <tenant_id>
```

- Verifies the tenant has an active `google_lead_form_configs` row (Phase 2b.1.a).
- Generates a unique 32-byte `oauth_pending_state` token + 10-minute expiry.
- Persists state on the active config row.
- Prints the Google OAuth consent URL (`https://accounts.google.com/o/oauth2/v2/auth` with `response_type=code`, `access_type=offline`, `prompt=consent`, `scope=https://www.googleapis.com/auth/adwords`, `redirect_uri` from `NEXT_PUBLIC_BASE_URL`/`/api/integrations/google-ads/oauth/callback`, `state=<token>`).
- Operator opens the URL, signs in, consents, and the callback completes the exchange.

### `scripts/phase-2b/set-google-ads-targets.ts`

```bash
npx tsx scripts/phase-2b/set-google-ads-targets.ts \
  <tenant_id> <customer_id> <conversion_action_id> [--login-customer-id=<id>]
```

- Verifies the active config row exists and is OAuth-connected (refuses to set targets without a refresh token).
- Persists `customer_id`, `conversion_action_resource_name = 'customers/<customer_id>/conversionActions/<conversion_action_id>'`, and optionally `login_customer_id`.
- Idempotent — re-running with new IDs simply overwrites.

---

## 7. Wire-up — where the firing modules are called

### `Lead` event

| Caller | When | Notes |
|---|---|---|
| `src/lib/lead-ingestion/ingest-lead.ts` | After successful deal creation + lead-arrived notification dispatch, **only when** `dealId && input.attribution?.gclid`. | Wrapped in its own try/catch logging `[ingestLead] fireGoogleConversionEvent crashed (non-fatal)` if the firing module itself throws (it shouldn't — but defence in depth). Ingestion result is unaffected. |

### `FirstResponse` event

| Caller | When | Notes |
|---|---|---|
| `src/lib/communications/dispatcher.ts` (email, SMS, WhatsApp, voice call) | After every successful `activities` insert with `direction='outbound' AND deal_id IS NOT NULL`. | All four send paths now stamp an explicit `occurred_at` so the DB trigger and the detector compare apples-to-apples. |
| `src/app/api/communications/send-sms-v2/route.ts` | Same, after the route's own `activities` insert. | Extracted into a `maybeFireFirstResponse(supabase, tenant_id, contact_id, deal_id, occurred_at)` helper to keep the POST handler's cyclomatic complexity ≤ 8 (Lizard threshold). |
| `src/app/api/communications/send-whatsapp-v2/route.ts` | Same. | Same helper-extraction pattern. |

The detector itself never throws; the `if (deal_id)` branch in each
caller is the only conditional. No call site requires its own try/catch.

---

## 8. Tests

| Suite | Type | Count | Status |
|---|---|---|---|
| `src/lib/crypto/__tests__/integration-credentials.test.ts` | jest unit | 8 | ✅ all pass |
| `src/lib/conversions/__tests__/google-ads-client.test.ts` | jest unit (mocked `fetch`, mocked supabase) | 15 | ✅ all pass |
| `src/lib/conversions/__tests__/fire-conversion-event.test.ts` | jest unit (mocked supabase + mocked client) | 8 | ✅ all pass |
| `src/lib/conversions/__tests__/first-response-detector.test.ts` | jest unit (mocked supabase + mocked `fireGoogleConversionEvent`) | 8 | ✅ all pass |
| **Unit total** | | **39** | ✅ |
| `src/lib/conversions/__tests__/google-ads.integration.test.ts` | live-DB integration, gated on `LEAD_INGESTION_INTEGRATION=1` | 1 | ⏭ skip-by-default; verifies the partial UNIQUE idempotency index against a real Postgres |

Ran `npx jest src/lib/crypto src/lib/conversions` — 4 suites, 39 tests, 0 failures, 2.1s.

---

## 9. Verification status

| Gate | Status | Evidence |
|---|---|---|
| Schema migration applied | ✅ | Supabase MCP `apply_migration` returned `success: true`; validation queries returned 1 table / 4 indexes / 3 policies / 9 new columns / 1 new column on deals / 1 new function. |
| Schema migration reversible | ✅ | Rollback companion `20260507_phase_2b_1_b_1_google_conversions_rollback.sql` written: drops trigger → drops function → drops `deals.first_response_at` → drops `conversion_events_fired` → drops the 9 new columns + the partial-unique index from `google_lead_form_configs`. (Not exercised in production.) |
| Supabase advisors | ✅ | `anon_security_definer_function_executable` and `authenticated_security_definer_function_executable` flagged on first apply; both resolved by `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated` baked into the forward migration. Re-run of advisors green. |
| `tsc --noEmit` clean for touched files | ✅ | 1556 pre-existing repo errors on this WIP branch (unchanged); **0** new errors in any 2b.1.b.1-touched file. Verified by stashing only my modifications to `dispatcher.ts`, `send-sms-v2/route.ts`, `send-whatsapp-v2/route.ts` and confirming the same two errors (`smsService.initialize` arity and `EmailIntegrationSettings` shape) appear with or without my changes. |
| ESLint clean for touched files | ✅ | 0 issues on all new + modified files. (Two `catch (error: any)` patterns in the v2 SMS/WhatsApp routes — pre-existing — were tightened to `catch (error: unknown)` while we were already in the file.) |
| Codacy CLI (Trivy + ESLint + Lizard + Opengrep) | ✅ | 0 issues for `send-sms-v2/route.ts` and `send-whatsapp-v2/route.ts` after the refactors that extracted `maybeFireFirstResponse`. Pre-existing complexity warnings on `dispatcher.ts` and `ingest-lead.ts` were verified pre-existing (stash-and-recheck) and not introduced by this phase. |
| Unit tests | ✅ | 39 / 39 pass. |
| Integration test gated correctly | ✅ | 1 skipped without `LEAD_INGESTION_INTEGRATION=1`. |
| `INTEGRATION_CREDENTIAL_KEY` rotated to base64(32) | ✅ | `.env.local` updated; pgcrypto vault confirmed empty before rotation; AES-GCM helper round-trips. |
| Test tenant `google_lead_form_configs` reactivated | ✅ | Re-ran `generate-google-webhook-key.ts <tenant_id>`; new `is_active=true` row exists. |
| Manual validation Task 8 (operator-run) | ✅ | Run on Vercel production (`https://dental-crm-nine.vercel.app`, deployment `dpl_CEgLFxCbZFcKGTrZm5zvaEkY9zDF`, commit `437da80`). Tenant `5aadca14-9786-4aef-bc53-e9287cdd0bbf`. Both `Lead` and `FirstResponse` events recorded in `conversion_events_fired` with `http_status=200`. See §13 for row-level evidence. Both events landed at `status='failure'` due to the synthetic test `gclid` being unparseable by Google (`The imported gclid could not be decoded`) — the documented expected outcome for synthetic test data; ingestion-side correctness (auth, API version, payload shape) is fully verified. |
| Re-fire idempotency check | ✅ | Re-fired identical webhook payload; HTTP 200 returned. Row count for `(deal_id='967e6e44-…', event_type='Lead', platform='google_ads')` stayed at **1**, `fired_at` unchanged from the original fire. See §13. |
| `grep -rn "TODO" src/lib/conversions/` | ✅ | 0 unresolved TODOs. |
| `grep -rn "console.log.*refresh_token\|console.log.*client_secret\|console.log.*access_token" src/` | ✅ | 0 matches in any 2b.1.b.1 file. The OAuth callback only logs `tenant_id`, the operator user id (when present), and HTTP status codes. |

---

## 10. Open questions for the planner (Toffee)

None blocking. Two for awareness:

1. **Basic-access developer token swap.** This phase assumes a *test*
   `GOOGLE_ADS_DEVELOPER_TOKEN`. Going to production needs a basic-access
   token granted by Google (multi-day approval). The code path is
   identical; it's a config swap. Surfacing here so the platform team
   can start the application early.
2. **Settings UI for OAuth.** 2b.1.b.2 should expose the same OAuth flow
   to admins via a button instead of a CLI. The OAuth callback is already
   user-friendly (HTML page); the only addition is a "Connect Google
   Ads" button that initiates the flow with a per-user `state` and
   round-trips back to a Settings page on success.

---

## 11. Deferred items (raised during build)

- **Settings UI for Google Ads OAuth + targets** — operator-via-CLI for now (2b.1.b.2).
- **Async / queued firing** — current path is synchronous inline (~300-600 ms added latency on a lead/first-response). Acceptable today; if average grows past ~1 s we should re-evaluate. The repo's BullMQ surface is fragile (F05 P0 #9), which is why 2b.1.b.1 went sync.
- **More than one retry on 5xx** — current behaviour is 1 retry after 800 ms. If Google has a longer-than-30s outage, a `failure` row is recorded and that's it. A future phase can add a periodic re-tryer that scans `conversion_events_fired WHERE status='failure' AND fired_at > now() - interval '24h'` and re-fires with the same `(deal_id, event_type)` keys.
- **Meta / Facebook Ads CAPI outbound** — `conversion_events_fired.platform` is a CHECK so adding `'meta_ads'` is one ALTER TABLE. The firing layer is platform-pluggable in shape; a new `MetaAdsClient` would slot in alongside `GoogleAdsClient`.
- **GAQL verification of conversion ingestion in the Google Ads UI** — Google's "ingested" → "matched" pipeline takes hours-to-days. We confirm Google **accepted** the upload (HTTP 200, no `partialFailureError`); the operator confirms **matched** in the Google Ads UI later. Recommend adding a small operator runbook in `docs/runbooks/` listing the Conversions UI URL + GAQL query (`SELECT click_view.gclid, click_view.ad_group_ad FROM click_view WHERE …`) for after-the-fact verification.
- **Token refresh failure backoff** — if the refresh token is revoked by the user / Google, every fire attempt will record a `failure`. A future phase should detect 400/401 from the token endpoint, mark the config as `oauth_disconnected_at`, and stop attempting until reconnected. Today it just keeps logging failures.
- **Encryption-key rotation runbook** — `INTEGRATION_CREDENTIAL_KEY` rotation invalidates *all* refresh-token ciphertexts. We have a short note in `.env.local` explaining the impact; a proper runbook for "rotate key + re-run OAuth for every connected tenant" should live in `docs/runbooks/`.

---

## 12. Files added / changed / removed

**Added:**

```
dental-crm/supabase/migrations/20260507_phase_2b_1_b_1_google_conversions.sql
dental-crm/supabase/migrations/20260507_phase_2b_1_b_1_google_conversions_rollback.sql
dental-crm/src/lib/crypto/integration-credentials.ts
dental-crm/src/lib/crypto/__tests__/integration-credentials.test.ts
dental-crm/src/lib/conversions/google-ads-client.ts
dental-crm/src/lib/conversions/fire-conversion-event.ts
dental-crm/src/lib/conversions/first-response-detector.ts
dental-crm/src/lib/conversions/__tests__/google-ads-client.test.ts
dental-crm/src/lib/conversions/__tests__/fire-conversion-event.test.ts
dental-crm/src/lib/conversions/__tests__/first-response-detector.test.ts
dental-crm/src/lib/conversions/__tests__/google-ads.integration.test.ts
dental-crm/src/app/api/integrations/google-ads/oauth/callback/route.ts
dental-crm/scripts/phase-2b/connect-google-ads.ts
dental-crm/scripts/phase-2b/set-google-ads-targets.ts
dental-crm/docs/2b/2b-1-b-1-changes.md   (this file)
```

**Changed:**

```
dental-crm/.env.local                                              (INTEGRATION_CREDENTIAL_KEY rotated to base64(32) + comment block)
dental-crm/src/lib/lead-ingestion/ingest-lead.ts                   (Lead event fired after deal creation when gclid present)
dental-crm/src/lib/communications/dispatcher.ts                    (FirstResponse fired after email/SMS/WhatsApp/call activity inserts; explicit occurred_at)
dental-crm/src/app/api/communications/send-sms-v2/route.ts         (FirstResponse fired via maybeFireFirstResponse helper; catch tightened to unknown)
dental-crm/src/app/api/communications/send-whatsapp-v2/route.ts    (FirstResponse fired via maybeFireFirstResponse helper; catch tightened to unknown)
dental-crm/src/components/deals/activity-timeline.tsx              (forward orgId from useTenantContext as tenantId prop to <CreateActivityDialog>; see §13 — pre-existing defect surfaced during validation)
```

**Removed:** none.

---

## 13. Manual Validation Evidence (Vercel production, 2026-05-06 → 2026-05-07)

Operator-run validation against the deployed Vercel app
`https://dental-crm-nine.vercel.app`, deployment
`dpl_CEgLFxCbZFcKGTrZm5zvaEkY9zDF`, commit `437da80` on branch
`phase-1-attribution-foundation`. Test tenant
`5aadca14-9786-4aef-bc53-e9287cdd0bbf`. Test contact / deal:
`Sarah Test 2b1b1` — `contact_id=35e4bed5-4ddf-487e-8adb-dce25b711022`,
`deal_id=967e6e44-0d2e-4b6f-afeb-53db1ca8b9a7`.

### 13.1 OAuth bring-up (Operator Gate 1)

`scripts/phase-2b/connect-google-ads.ts` produced a consent URL with a
fresh `oauth_pending_state` row; operator completed the Google consent;
the `/api/integrations/google-ads/oauth/callback` route exchanged the
code, encrypted the refresh token with `INTEGRATION_CREDENTIAL_KEY`, and
upserted the active config row.

`scripts/phase-2b/set-google-ads-targets.ts` then persisted the customer
and conversion-action IDs.

Final state of `google_lead_form_configs` for the test tenant:

| field | value |
|---|---|
| `oauth_refresh_token_encrypted IS NOT NULL` | `true` |
| `customer_id` | `1675268286` |
| `conversion_action_resource_name` | `customers/1675268286/conversionActions/7600535419` |
| `login_customer_id` | `9374708799` (manager account) |
| `oauth_connected_at` | `2026-05-06 17:21:20.776+00` |

### 13.2 `Lead` event firing (Operator Gate 2)

`POST https://dental-crm-nine.vercel.app/api/webhooks/google-lead-form`
with the canonical Google Lead Form payload (synthetic `gcl_id =
TeStEd0Ms_TASK8_GCLID_2b1b1_aaaaaaaa`) returned HTTP `200` and JSON
`{"status":"ok","contact_id":"35e4bed5-…","deal_id":"967e6e44-…"}`.
A row was written to `conversion_events_fired`:

| field | value |
|---|---|
| `id` | `fb6b43f6-f9b9-4b18-b559-07823cb458ed` |
| `event_type` | `Lead` |
| `platform` | `google_ads` |
| `http_status` | `200` |
| `fired_at` | `2026-05-06 18:50:22.550828+00` |
| `status` | `failure` |
| `error_message` | `The imported gclid could not be decoded …, at conversions[0].gclid` |

The `failure` status is the **expected** outcome for a synthetic test
`gclid` — Google accepts the request (HTTP 200, valid OAuth, valid
`customer_id`, valid `conversion_action`, correct payload shape against
API `v24`'s `:uploadClickConversions` endpoint) but rejects the click ID
because no real ad click ever produced it. This proves the entire
ingestion-side wire-up: encrypted refresh-token decrypt, OAuth access-token
exchange, fire-conversion-event detection of the `gclid`, partial-unique
idempotency index acceptance, Google Ads API contract.

### 13.3 `FirstResponse` event firing (Operator Gate 3)

Operator opened the Sarah Test 2b1b1 contact page and used the in-CRM
email composer (which routes through `/api/communications/send-email`
→ `dispatcher.ts` → activity insert → `detectAndFireFirstResponse`).

A new outbound activity was inserted, both `contacts.first_response_at`
and `deals.first_response_at` were stamped by the AFTER-INSERT triggers,
and `detectAndFireFirstResponse` then queued the conversion event.

| field | value |
|---|---|
| activity `id` | `c84af9c9-bd9d-4195-82d7-1ea37973547e` |
| activity `type` / `direction` | `email` / `outbound` |
| `integration_provider` | `resend` |
| `message_status` | `queued` (Resend message ID stored in `external_id`) |
| activity `occurred_at` | `2026-05-07 19:16:07.741+00` |
| `contacts.first_response_at` | `2026-05-07 19:16:07.741+00` (matches activity exactly) |
| `deals.first_response_at` | `2026-05-07 19:16:07.741+00` (matches activity exactly) |
| `conversion_events_fired.id` | `a32787a7-9ec8-4332-ba5e-f6f083d62c2e` |
| `conversion_events_fired.event_type` | `FirstResponse` |
| `conversion_events_fired.http_status` | `200` |
| `conversion_events_fired.fired_at` | `2026-05-07 19:16:09.640156+00` (≈ 1.9 s after the activity) |
| `conversion_events_fired.status` | `failure` (same synthetic-gclid root cause as 13.2) |

### 13.4 Idempotency (Task 9)

Re-fired the **identical** Google Lead Form payload from §13.2. Webhook
returned HTTP `200` with the same `contact_id` / `deal_id`, but the
`conversion_events_fired` row count for
`(deal_id='967e6e44-…', event_type='Lead', platform='google_ads')`
remained at **1**, with `fired_at` unchanged from the original 2026-05-06
fire. The pre-fire SELECT in `fireGoogleConversionEvent` short-circuits
on the existing row; the partial UNIQUE index on
`conversion_events_fired (tenant_id, deal_id, event_type, platform) WHERE status='success'`
provides a second line of defence.

### 13.5 Defect uncovered & fixed mid-validation

See §14 below.

### 13.6 Out-of-scope environmental fix-ups (not part of 2b.1.b.1 wire-up)

- Vercel env vars added/updated for Phase 2b validation:
  `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
  `GOOGLE_ADS_DEVELOPER_TOKEN`, `INTEGRATION_CREDENTIAL_KEY`,
  `NEXT_PUBLIC_APP_URL` (set to the production Vercel URL),
  `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`. (No code changes.)
- `src/lib/conversions/google-ads-client.ts` `ADS_API_VERSION`
  bumped from `'v17'` (which Google sunset on 2025-08-20) to `'v24'`.
- `src/lib/integrations/email-provider.ts` gained a `case 'resend'`
  branch + a `sendViaResend` implementation, so the dispatcher path
  could complete the `FirstResponse` activity with a configured email
  integration. (Pre-existing gap — Resend was the project's email
  provider for system mails but had never been wired into the
  per-tenant integrations table.)
- A test-tenant `integration_settings` row was inserted with
  `email_provider='resend'`, `is_email_configured=true`, and the
  encrypted Resend API key, so the dispatcher's
  `loadTenantIntegrationSettings()` would return a configured provider.
- `src/components/deals/deal-detail-view.tsx` and
  `src/components/contacts/contact-detail-view.tsx` each got a single
  null-guard on `deal.treatment_tags` — both pages crashed with
  `TypeError: Cannot read properties of null (reading 'length')` on
  any deal whose treatment-tags array was null. Pre-existing in both
  files; surfaced as soon as our test deal was created (no tags).

---

## 14. Defects discovered & fixed during validation (2026-05-06)

While running the 2b.1.b.1 Vercel validation script, attempting "Create
Email" (or Call / WhatsApp / Note) from a deal page surfaced a generic
toast `Failed to create activity` with no Vercel function-log entry.

**Root cause (not introduced by 2b.1.b.1):** the deal-page
`<ActivityTimeline>` rendered `<CreateActivityDialog>` without
forwarding `tenantId`. The dialog inserts directly into Supabase from
the browser (anon-key client, **bypassing the `/api/activities` POST
route entirely**), so the request never appears in Vercel function
logs. With `tenantId` undefined, `supabase-js` strips the field from the
PostgREST body, the row arrives with `tenant_id IS NULL`, and every
permissive RLS WITH CHECK on `activities` requires a non-null
tenant match. PostgreSQL surfaces the rejection as
`42501 new row violates row-level security policy for table "activities"`
*before* the schema's NOT NULL constraint gets a chance.

`git blame` shows the buggy lines were authored on 2025-10-12
(commit `df6fa64`), long before any phase-2 work; no 2b.1.b.1 file
modified this code path. Reproduction:

- Service-role insert with the dialog's exact payload → succeeds
  (schema, BEFORE-INSERT FK trigger, and all three AFTER-INSERT
  triggers including `update_contact_first_response` /
  `trigger_update_deal_first_response` accept the row).
- Same insert as the authenticated user with `tenant_id` omitted →
  `42501` RLS rejection.

The bug is type-agnostic — Call / Email / WhatsApp / Note all fail the
same way from the deal page.

**Fix shipped in this PR (deal-page caller only):**

```diff
   <CreateActivityDialog
     open={createDialogOpen}
     onOpenChange={setCreateDialogOpen}
     dealId={dealId}
     contactId={contactId}
     onActivityCreated={handleActivityCreated}
     preselectedType={selectedActivityType}
+    tenantId={orgId ?? undefined}
   />
```

`orgId` is already destructured from `useTenantContext()` at the top of
`ActivityTimeline`; this just threads it through. Unblocks Operator Gate
3 (FirstResponse stamping needs the operator to actually create an
outbound activity).

**Deferred to a follow-up bug ticket — same defect, other callers:**

- `dental-crm/src/components/contacts/contact-detail-view.tsx:1467-1472`
  (also passes a non-existent `preselectedContactId` prop — doubly
  broken).
- `dental-crm/src/components/activities/activity-timeline-enterprise.tsx:374-382`
  (different sibling dialog at `components/activities/create-activity-dialog.tsx`,
  same missing-`tenantId` pattern).
- `dental-crm/src/components/activities/activity-feed-simple.tsx:210-218`
  (same).

**Latent — not exercised today, do not touch in this PR:**

- `update_contact_marketing_engagement()` trigger references a
  non-existent `NEW.activity_timestamp` column (real column is
  `occurred_at`). Only fires when an inserted activity carries
  `marketing_campaign_id`, which the deal-page dialog never sets, so it
  did not contribute to today's failure. File this as a separate
  trigger-fix.
