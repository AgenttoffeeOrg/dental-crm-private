# Phase 2b.1.a — Google Lead Form inbound webhook: change log

**Scope:** wire Google Lead Form Extensions into the existing Phase-2a
`ingestLead()` engine. Added the `google_lead_form_configs` schema +
per-tenant webhook key, the `mapGoogleLeadFormPayload()` adapter, the
`/api/webhooks/google-lead-form` POST handler, and a tsx CLI to provision
keys. Deleted the pre-Phase-2a stub at `/api/webhooks/google-ads-leads`.

**Out of scope (deferred to 2b.1.b):** OAuth flow for Google Ads API,
outbound Enhanced Conversions for Leads, the `conversion_events_fired`
table, the self-serve Settings UI for Google integration, and
treatment-by-question matching. Phase 2a.7's "Inquiry on default pipeline"
fallback handles offering routing for now.

**Branch baseline:** Phase 2a.9b + 2a.8 (the prior commit on `main`).
**Date applied:** 2026-05-05.
**Live tenant exercised:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf` ("Deepak's
Dental Practice").

---

## 1. Summary

A Google Lead Form ad submission now creates the same four artifacts a
form/widget submission does: a `contacts` row, an `attribution_touchpoints`
row, an `activities` row (`type=google_lead_received`,
`source_channel=google_lead_form`), and a `deals` row (Phase 2a.7's
"Inquiry" fallback on the tenant's default pipeline). Webhook-retry
idempotency is provided by the existing `attribution_touchpoints.event_id`
UNIQUE index — Google's at-least-once delivery is safe.

Tenant resolution uses a per-tenant UUID stored in a new dedicated
`google_lead_form_configs` table, looked up by the `google_key` field
Google echoes back on every delivery. No payload signature is verified
beyond the key (Google does not sign Lead Form webhooks).

---

## 2. Schema migration — `20260505_phase_2b_1_a_google_lead_form_configs.sql`

Applied via Supabase MCP `apply_migration` (name:
`phase_2b_1_a_google_lead_form_configs`). Rollback companion at
`20260505_phase_2b_1_a_google_lead_form_configs_rollback.sql`.

**Contents:**

| # | Object | Notes |
|---|---|---|
| 1 | `google_lead_form_configs` table | `id`, `tenant_id` FK→tenants ON DELETE CASCADE, `webhook_key uuid DEFAULT gen_random_uuid()`, `is_active`, `created_by` FK→app_users, `created_at`, `updated_at`. |
| 2 | `idx_google_lead_form_configs_one_active_per_tenant` | UNIQUE on `(tenant_id) WHERE is_active = true` — enforces one active config per tenant; rotated keys live on as audit history. |
| 3 | `idx_google_lead_form_configs_webhook_key` | Global UNIQUE on `webhook_key` — fast O(1) lookup, prevents accidental key collision. |
| 4 | `trg_google_lead_form_configs_updated_at` | Reuses the existing `public.set_updated_at()` helper. |
| 5 | RLS enabled + 5 policies | `glfc_select_tenant_members` (tenant SELECT), `glfc_insert_with_permission` / `glfc_update_with_permission` / `glfc_delete_with_permission` (write gated by `settings.integrations.manage`), `glfc_service_role` (catch-all for service-role writes). |

**Validation queries (post-apply):**

```sql
SELECT count(*) FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'google_lead_form_configs';
-- → 1

SELECT count(*) FROM pg_indexes WHERE tablename = 'google_lead_form_configs';
-- → 3 (PK + 2 unique partials)

SELECT count(*) FROM pg_policies WHERE tablename = 'google_lead_form_configs';
-- → 5 (SELECT + INSERT + UPDATE + DELETE for authenticated + service_role catch-all)
```

Supabase advisors flagged no new issues for the table.

---

## 3. Adaptations from prompt → live schema

The prompt was written against an idealised `IngestLeadInput` and
`org_memberships` shape. The live shape has diverged in places. We
adapted rather than HALT, and document each divergence here:

| # | Prompt assumed | Live shape | Resolution |
|---|---|---|---|
| A | Flat `IngestLeadInput`: `email`, `phone_e164`, `full_name`, `click_ids.gclid`, `consent.method`, `http.ip_address`, `source_sub_id` | Nested `IngestLeadInput`: `contact: { email, phone, first_name, last_name, full_name, consents: { marketing_consent, email_consent, sms_consent, consent_text_version, consent_method } }`, `attribution: { utm_*, gclid, ip_address, ... }`, `form_id`, `event_id`, `treatment_offering_id`, `raw_payload` | Adapter rewritten to match the live nested shape. The implied-consent record (method/lawful_basis/text_version/text/captured_at/ip_address) is preserved by stamping it onto `raw_payload.__consent_record`, since the live `consents` object only has flat boolean flags + free-text version/method strings. The full record then lives in `attribution_touchpoints.metadata.raw_payload.__consent_record` for GDPR audit. |
| B | `IngestLeadInput.consent.method` is a typed enum that may or may not include `'implied_inquiry'` | `consents.consent_method` is a free-text `string` field | `'implied_inquiry'` is accepted as-is. No schema change required. |
| C | `source_sub_id` field carries `form_id` | No `source_sub_id` field; live engine uses top-level `form_id: string \| null` | We pass `form_id: String(payload.form_id)` directly. |
| D | `event_id` is "part of IngestLeadInput per Phase 2a.2a §2 deviation D" | Confirmed: `event_id?: string \| null` exists at the top level | Used as documented. |
| E | RLS uses `org_memberships(user_id, tenant_id, role_id)` joined to `role_definitions(id, code text UNIQUE)` | Live: `org_memberships(user_id, tenant_id, role text, ...)` — no `role_id`/`role_definitions` join. | Replaced with the canonical Phase-2a-2a RLS pattern: `tenant_id = ANY(public.get_accessible_tenants())` for SELECT and `public.user_has_permission(auth.uid(), tenant_id, 'settings.integrations.manage')` for write. The CLI script uses the service role and bypasses RLS, which is intentional for 2b.1.a. |
| F | Adapter sets `contact.first_name` / `contact.last_name` (note: prompt says drop these "if absent") | The live `contact` shape DOES include both | Kept both; falls through to `null` when Google's columns are absent. |
| G | Sentry logging | The route logs to `console.{warn,error}` with structured fields and avoids PII (no full payload at info level). Sentry is wired via `instrumentation.ts` for unhandled exceptions; `console.error` is captured by Sentry's Next.js integration when `dsn` is configured. | No additional Sentry calls in the route. |

---

## 4. New TypeScript modules

| File | Responsibility |
|---|---|
| `src/lib/lead-ingestion/adapters/google-lead-form-adapter.ts` | Pure function `mapGoogleLeadFormPayload(payload, tenantId, requestIp): IngestLeadInput`. Extracts standard columns (FULL_NAME / EMAIL / PHONE_NUMBER / FIRST_NAME / LAST_NAME), builds the implied-consent record, preserves the entire raw payload. Helpers split out (`extractContactFields`, `buildConsentRecord`) to keep cyclomatic complexity ≤ 8. |
| `src/app/api/webhooks/google-lead-form/route.ts` | POST handler. Parses JSON → structural validation → tenant lookup by `google_key` → adapter → `ingestLead({ ..., event_id })`. GET returns 405. |
| `src/lib/lead-ingestion/adapters/__tests__/google-lead-form-adapter.test.ts` | 9 pure-function unit tests for the adapter. |
| `src/app/api/webhooks/google-lead-form/__tests__/route.test.ts` | 14 route-handler tests with mocked supabase + `ingestLead`. |
| `src/lib/lead-ingestion/__tests__/google-lead-form.integration.test.ts` | 4 live-DB integration tests gated behind `LEAD_INGESTION_INTEGRATION=1`. |
| `scripts/phase-2b/generate-google-webhook-key.ts` | Tsx CLI that provisions or rotates a webhook key for a tenant (deactivates prior active row, inserts new one, prints URL + key). |

---

## 5. Webhook route behaviour

| HTTP | When | Body |
|---|---|---|
| 200 | Lead accepted (new or matched contact) | `{ status: 'ok', lead_id, contact_id, deal_id }` |
| 200 | Idempotent replay (same `event_id`) | Same body, no duplicate writes |
| 400 | Malformed JSON, missing required field, or `IngestLeadValidationError` (no_identity / invalid_source_channel / missing_tenant) | empty (Google won't retry on 4xx — correct for caller-side errors) |
| 401 | Unknown / inactive `google_key` | empty (don't leak which keys exist) |
| 405 | Non-POST | empty |
| 500 | DB lookup error or unexpected ingestion failure | empty (Google retries 5xx with backoff) |

**Idempotency:** `event_id = google-lead:<form_id>:<lead_id>`. Google's
`lead_id` is documented unique per form; combined with `form_id` the
event_id survives Google's at-least-once delivery via the existing UNIQUE
index on `attribution_touchpoints.event_id`. The engine short-circuits to
`{ idempotent_replay: true, ... }` and we still return 200.

**Logging:** never logs the full payload at info level (PII). Logged
fields are restricted to `lead_id`, `form_id`, `tenant_id`, source IP,
error code/message.

**`is_test=true`:** ingested as a real lead and tagged via
`raw_payload.__is_test=true` so practices can run Google's Lead Form Tester
end-to-end without a separate environment, and reports can filter it out
later.

---

## 6. CLI script — `scripts/phase-2b/generate-google-webhook-key.ts`

Usage:

```bash
cd dental-crm
set -a && source .env.local && set +a
npx tsx scripts/phase-2b/generate-google-webhook-key.ts <tenant_id>
```

- Verifies the tenant exists.
- Deactivates any prior active config row (rotation case; non-destructive — old rows are kept as audit history).
- Inserts a fresh active row with auto-generated `webhook_key`.
- Prints the webhook URL + key for paste into Google Ads Lead Form Extensions.

Service-role; bypasses RLS, intentional for 2b.1.a (Settings UI is 2b.1.b).

---

## 7. Deleted routes

`src/app/api/webhooks/google-ads-leads/route.ts` (and its now-empty
parent directory) removed. Confirmed safe to delete:

- It did not import `ingestLead` (proves it was pre-Phase-2a).
- No production callers in `src/` (`grep -rn syncGoogleAdsLeads dental-crm/src/` returned only the route file itself).
- No documentation references in `docs/`, `scripts/`, or `tests/`.
- Three remaining mentions in `architecture-reports/all-eslint-errors.json`, `FORM_BUILDER_280_TASKS_COMPLETE.md`, `FORM_BUILDER_COMPLETE_DOCUMENTATION.md` are historical/auto-generated artifacts outside the prompt's required cleanup scope.

---

## 8. Tests

| Suite | Type | Count | Status |
|---|---|---|---|
| `google-lead-form-adapter.test.ts` | jest unit (jsdom) | 9 | ✅ all pass |
| `webhooks/google-lead-form/__tests__/route.test.ts` | jest unit (`@jest-environment node`, mocked supabase + ingestLead) | 14 | ✅ all pass |
| `lead-ingestion/__tests__/google-lead-form.integration.test.ts` | live-DB integration, gated on `LEAD_INGESTION_INTEGRATION=1` | 4 | ⏭ skip-by-default; cases verified manually via curl (Task 7) |

---

## 9. Verification status

| Gate | Status | Evidence |
|---|---|---|
| Schema migration applied | ✅ | Supabase MCP `apply_migration` returned `success: true`; validation queries returned 1 table / 3 indexes / 5 policies. |
| Schema migration reversible | ✅ | Rollback companion `20260505_phase_2b_1_a_google_lead_form_configs_rollback.sql` written; `DROP TABLE … CASCADE` removes table + indexes + trigger + policies. (Not exercised in production.) |
| `tsc --noEmit` clean for touched files | ✅ | 1482 pre-existing repo errors; **0** in any 2b.1.a-touched file. |
| Codacy CLI (ESLint + Lizard + Opengrep + Trivy + PMD) | ✅ | 0 issues across all new/edited files. |
| Unit tests pass | ✅ | 23 / 23 (adapter 9, route 14). |
| Integration test gated correctly | ✅ | 4 skipped without `LEAD_INGESTION_INTEGRATION=1`. |
| Manual curl: happy path | ✅ | 200 with `{ status, lead_id, contact_id, deal_id }`. DB inspected: 1 contact, 1 touchpoint (`source_channel=google_lead_form`, `gclid=Cj0KCQjw-test-gclid-2b1a`, `metadata.raw_payload.__consent_record.method=implied_inquiry`, `metadata.form_id=9876543210`), 1 activity (`type=google_lead_received`, `direction=inbound`), 1 deal (title `Inquiry`, on default pipeline `47be4b64-…`). |
| Manual curl: idempotent replay | ✅ | Second POST returned 200 with same `contact_id` and `deal_id`. Post-replay row counts unchanged: 1 contact, 1 touchpoint, 1 deal, 1 activity. |
| Manual curl: wrong key | ✅ | 401 with empty body. |
| Manual curl: no-identity payload | ✅ | 400 with empty body (engine threw `IngestLeadValidationError('no_identity')`). |
| `grep -rn google-ads-leads` in `src/`, `docs/`, `scripts/`, `tests/` | ✅ | Zero matches in all four directories. |
| Test data cleaned up | ✅ | All test rows deleted; webhook key deactivated. |

---

## 10. Open questions for the planner

None. All checkpoint adaptations are deterministic and documented in §3.

If 2b.1.b wants to extend `google_lead_form_configs` with OAuth state
columns (`refresh_token`, `access_token_expires_at`, `customer_id`,
`conversion_action_id`), the table is already structured for it — just add
columns and bump RLS to a fresher permission code if needed.

---

## 11. Deferred items (raised during build)

- **Treatment matching from custom Lead Form questions** — practices can add custom `column_id`s for treatment intent. We preserve them on `raw_payload.user_column_data` but don't read them. A later phase should map a per-tenant question→offering rules table to `treatment_offering_id`. Until then, every Google lead lands as "Inquiry" on the default pipeline.
- **Outbound Enhanced Conversions for Leads** — `conversion_events_fired` table + Google Ads API call to send `gclid` + hashed user info back to Google. Listed as 2b.1.b scope.
- **Self-serve Settings UI for Google integration** — read/copy/rotate the webhook key in `Settings → Integrations`. Listed as 2b.1.b scope.
- **Sentry capture in route handler** — `console.error` in the route is auto-captured by Sentry's Next.js integration, but a future hardening pass could add explicit `Sentry.captureException(err, { tags: { route: 'google-lead-form' }, extra: { lead_id, form_id, tenant_id } })` for richer context.
- **Multi-key support per tenant** — current schema enforces one active key per tenant. If a practice runs multiple Google Ads accounts and wants to differentiate in attribution, we'd need to drop the partial-unique index and add an `account_label` column. Not currently requested.

---

## 12. Files added / changed / removed

**Added:**

```
dental-crm/supabase/migrations/20260505_phase_2b_1_a_google_lead_form_configs.sql
dental-crm/supabase/migrations/20260505_phase_2b_1_a_google_lead_form_configs_rollback.sql
dental-crm/src/lib/lead-ingestion/adapters/google-lead-form-adapter.ts
dental-crm/src/lib/lead-ingestion/adapters/__tests__/google-lead-form-adapter.test.ts
dental-crm/src/app/api/webhooks/google-lead-form/route.ts
dental-crm/src/app/api/webhooks/google-lead-form/__tests__/route.test.ts
dental-crm/src/lib/lead-ingestion/__tests__/google-lead-form.integration.test.ts
dental-crm/scripts/phase-2b/generate-google-webhook-key.ts
dental-crm/docs/2b/2b-1-a-changes.md  (this file)
```

**Removed:**

```
dental-crm/src/app/api/webhooks/google-ads-leads/route.ts
dental-crm/src/app/api/webhooks/google-ads-leads/  (now-empty directory)
```

**Changed:** none. (All Phase-2a engine code was reused without modification.)
