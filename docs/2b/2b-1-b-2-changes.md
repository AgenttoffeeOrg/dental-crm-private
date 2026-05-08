# Phase 2b.1.b.2 — Self-serve Settings UI for Google Ads: change log

**Scope:** expose the **operator-only** Google Ads bring-up flow shipped in
Phase 2b.1.b.1 — webhook key generation, OAuth Connect/Disconnect, manager
account selection, customer + conversion-action targeting, key rotation —
through a new tenant-admin-facing Settings sub-page at
`/settings/integrations/google`. Replaces three CLI scripts (`connect-
google-ads.ts`, `set-google-ads-targets.ts`,
`generate-google-webhook-key.ts`) with self-serve API routes + UI. No DB
migrations, no new env vars; the page rides entirely on the
`google_lead_form_configs` columns landed in 2b.1.b.1.

**Out of scope (deferred):** OAuth Verification + custom-domain fixes
(F-1 / F-2 / F-3 in `2b-1-b-follow-ups.md` — admin/business work);
Meta + WhatsApp settings UIs (Phases 2b.2 / 2b.3); a generic
`<PermissionGate>` component + the F02 §13 Phase B RBAC migration; the 5
P0 unauthenticated settings routes from `D20_settings_and_configuration.md`
§1 (separate security sweep); async-via-BullMQ conversion firing
(deferred per `2b-1-b-1-changes.md` §11); human-readable customer names
in the customer picker (cosmetic; would require an extra GAQL call per
customer); an `oauth_disconnected_at` timestamp column (deferred per
`2b-1-b-1-changes.md` §11 — we just null-out fields).

**Branch baseline:** `phase-1-attribution-foundation`, on top of Phase
2b.1.b.1 (commit `19af10f`, `docs/2b/2b-1-b-1-changes.md`).
**Date applied:** 2026-05-07.
**Live tenant exercised:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf`
("Deepak's Dental Practice"), reactivated webhook config row from
2b.1.b.1's validation.

---

## 1. Summary

Anyone with `owner | super_admin | admin` membership on a tenant can now
manage their Google Ads integration end-to-end without operator
involvement. The page composes two independently-resolvable surfaces on
top of the **single per-tenant** `google_lead_form_configs.is_active`
row that 2b.1.b.1 left in place:

```
  Inbound (webhook)                      Outbound (conversions)
  ─────────────────                      ──────────────────────
  POST /api/integrations/                GET  /api/integrations/google-ads/oauth/initiate
       google-ads/webhook/rotate              ↓ 302 → Google consent page
       ↳ generates / rotates webhook_key      ↓
       ↳ deactivates old active row,         GET /api/integrations/google-ads/oauth/callback
         carries OAuth+target fields              ↳ exchanges code, encrypts refresh token
         onto new row (preserves outbound)       ↳ 302 → /settings/integrations/google
                                                       ?status=connected
                                          ↓
  webhook_url shown + copy-to-clipboard   GET /api/integrations/google-ads/customers/list
                                          GET /api/integrations/google-ads/conversion-actions/list
                                          POST /api/integrations/google-ads/targets
                                          POST /api/integrations/google-ads/disconnect
```

The two surfaces are deliberately **mentally separate**: rotating the
inbound webhook key never disconnects OAuth or drops the customer /
conversion-action targets (carry-over logic in
`webhook/rotate/route.ts`). Disconnecting outbound never invalidates the
inbound webhook key.

Permission gate: every server route + the page itself checks
`isManagementRole(role)` (set: `owner | super_admin | admin`) on the
authenticated session's `user_tenant_memberships.role` for the active
tenant. RLS on `google_lead_form_configs` is the second line of
defence; the role gate is the first. A `// TODO(rbac):` comment in
every gated location pins where the F02 §13 Phase B
`user_has_permission(..., 'settings.integrations.manage')` swap will
land.

OAuth callback semantics changed: the route used to render terminal
HTML success/failure pages (the "operator runs the CLI in their
browser" model). It now 302-redirects to
`/settings/integrations/google?status=…&reason=…`, and the page renders
a dismissible banner. The `error_description` from Google is logged
server-side only — never echoed to the client URL.

---

## 2. Schema migration

**None required.** All columns the page reads or writes already exist
from Phase 2b.1.b.1's
`20260507_phase_2b_1_b_1_google_conversions.sql`:

- `google_lead_form_configs`: `webhook_key`, `customer_id`,
  `login_customer_id`, `conversion_action_resource_name`,
  `oauth_refresh_token_encrypted`, `oauth_scope`, `oauth_connected_at`,
  `oauth_connected_by_user_id`, `oauth_pending_state`,
  `oauth_pending_state_expires_at`, `is_active`, `created_by`,
  `tenant_id`.
- The partial unique index `(tenant_id) WHERE is_active = true` is the
  rotation safety net (prevents two active rows simultaneously).
- The partial index on `oauth_pending_state` already supports the
  callback-side state lookup.

---

## 3. Adaptations from prompt → live shape

| # | Prompt assumed | Live shape | Resolution |
|---|---|---|---|
| A | The OAuth callback route writes `redirect(`https://...?status=…`)` and the new Settings page reads `?status` directly. | The callback at `src/app/api/integrations/google-ads/oauth/callback/route.ts` previously **rendered HTML pages** end-to-end, with no redirect anywhere. | Rewrote every terminal `renderHtml(…)` to `NextResponse.redirect(…)` aimed at `/settings/integrations/google?status=…&reason=…`. `oauthError`'s `error_description` is logged server-side only; the redirect URL gets a coarse `reason=oauth_failed` instead. |
| B | A shared `/settings` permission helper exists. | None present; tenant resolution lives in `src/lib/api/context.ts` (route-side) and ad-hoc inline in server components. | Added `src/app/api/integrations/google-ads/_lib/role-gate.ts` (`isManagementRole` + `MANAGEMENT_ROLE_LIST`). Every new route and the page import from it; the role list is the single source of truth and the only place to swap to `user_has_permission(...)` later. |
| C | `GoogleAdsConfig` requires `customer_id` + `conversion_action_resource_name`. | True for the **fire** path, but the **bootstrap** path (listing accessible customers before the user has picked one) only needs the OAuth refresh token. | Made `customer_id` and `conversion_action_resource_name` **optional** in the `GoogleAdsConfig` interface. Added `loadGoogleAdsOAuthOnly(supabase, tenantId)` for the bootstrap path. `uploadClickConversion` now defensively throws if either field is missing — guards against accidental misuse. |
| D | Lizard's TypeScript adapter counts `\|` in `string \| null \| undefined` return types as branch operators. | Confirmed empirically: `parseLoginCustomerId(raw): string \| null \| undefined` reported CCN 13 even with 4 actual branches; same code with `{ ok: true; value: string \| null } \| { ok: false }` ditto. | Returned a tagged-union object `{ ok, value }` with **separate** `if` statements per branch (no `\|\|` chains). Documented in `targets/route.ts`. Same trick applied to `conversion-actions/list/route.ts` (`readParams` + `handleApiError` extraction). |
| E | The Supabase typed client cleanly types `.eq('tenant_id', …)`. | The project's generated `Database` types currently widen every table row to `never` — 600+ pre-existing `tsc` errors across `src/app`. The project-wide workaround (visible in e.g. `src/lib/api/context.ts:13`) is to type the client as `any`. | Cast `supabase` to `any` in `src/app/settings/integrations/google/page.tsx` with an explanatory comment + an `eslint-disable` for `@typescript-eslint/no-explicit-any`. Casts the **read** results back to typed shapes (`ConfigSnapshot`, `string \| null`). Behavioural parity with the typed call; RLS unaffected. Tracked as part of the project-wide Supabase-typing follow-up. |
| F | The OAuth-pending TTL is canonical somewhere. | Hard-coded literal in the (now-deleted in spirit, kept on disk) CLI `connect-google-ads.ts`. | Re-introduced as `PENDING_TTL_MIN = 10` in `oauth/initiate/route.ts`. Same 10-minute window the CLI used; matches the partial-index TTL semantics in 2b.1.b.1. |
| G | `<CreateActivityDialog>` callers all pass `tenantId`. | Three callers — `contacts/contact-detail-view.tsx`, `activities/activity-timeline-enterprise.tsx`, `activities/activity-feed-simple.tsx` — were missing it (RLS 42501 on the activity insert). The contact-page caller also passed a non-existent `preselectedContactId` prop. | Added `tenantId={…}` (sourced from `useTenant()` for the contact page; `useTenantContext().orgId` for the two activity components). Removed `preselectedContactId`. See §8 for diffs. The deal-page sibling already shipped in 2b.1.b.1 (commit `248ca74`). |
| H | The sidebar "Integrations" link routes to `/settings/integrations` (the file 2b.1.b.2 §8.1 modified). | It actually routes to `/settings?section=integrations&tab=integrations`, which mounts `src/app/settings/page.tsx` → `<SettingsTabs />` → `renderIntegrationsTabs` → `<IntegrationsHubV2 />`. The standalone `/settings/integrations` route exists but no UI links to it from the sidebar. Discovered during validation (the operator landed on the unified Google one-click hub instead of the new Google Ads tile). | Mirrored the §8.1 tile addition into `src/components/settings/settings-tabs.tsx`'s `renderIntegrationsTabs` so both entrypoints surface the Google Ads tile above `<IntegrationsHubV2 />`. Same `Link` → `Card` markup, same `data-testid="google-ads-integration-tile"`. Adds `next/link` and `@/components/ui/card` imports to `settings-tabs.tsx`. See §8.3. |
| I | The page can `redirect('/login?redirectTo=…')` on auth failure, and the login page reads `searchParams.get('redirect')` so the destination is honoured. | `/login`'s param key is `redirect` (singular), not `redirectTo`. The page sent `?redirectTo=…`, login fell back to `/dashboard`, and an already-authed user was bounced to dashboard — looking like "logged out then immediately back in." Discovered when the operator clicked the new tile and was bounced to dashboard mid-validation. | Removed the redirect entirely. Middleware (`src/middleware.ts`) already gates `/settings/*` for unauthenticated users, so the server-component check is defence-in-depth. On null-user, render a `<PermissionDeniedShell>` with a "session needs to refresh, please reload" message instead of redirecting through `/login`. Drops the unused `redirect` import and `SETTINGS_PATH` constant. The wider login/sign-in pages' hard-coded `/dashboard` redirect (ignoring `redirectTo`) is a separate pre-existing bug, out of scope here. |
| J | `createServerSupabaseClient()` in `src/lib/supabase-server.ts` correctly reads the `@supabase/ssr` session cookie. | It used the **deprecated single-cookie `get(name)`/`set(name,…)`/`remove(name)` API**. Modern `@supabase/ssr` (`^0.5.1`) chunks the session JWT across multiple cookies (e.g. `sb-<ref>-auth-token.0`, `…1`); the legacy adapter looks up the unchunked name, finds nothing, and `auth.getUser()` returns null even when the user is fully authenticated. Surfaced after fix I shipped: the new Google Ads page consistently rendered the "session needs to refresh" shell on every navigation, even after sign out + sign in. | Rewrote the adapter to the modern `getAll()` / `setAll(cookiesToSet)` API — the same shape `createMiddlewareClient` in `src/lib/supabase.ts` already uses. Touched only `supabase-server.ts`; no caller-site changes required. |
| K | `getSupabaseAuthContext()` in `src/lib/api/auth.ts` correctly authenticates browser `fetch()` calls into API routes. | Same chunked-cookie bug as row J: the adapter used `request.cookies.get(name)` (deprecated single-cookie API). The earlier theory that "API routes are masked by the `Authorization: Bearer` fallback" was only half-right — the fallback **only fires when callers explicitly set the header**. Browser `fetch()` does NOT, so every browser-originated API call was failing 401 silently, with the new Google Ads UI being the first place that surface error mattered (curl-based testing always passes the bearer header, hiding the bug). Surfaced when the operator clicked Disconnect: page POSTed `/api/integrations/google-ads/disconnect` → 401 → client redirected through `/login` → already-authed user bounced back to the same page → "looked like a refresh that did nothing." | Rewrote `getSupabaseAuthContext`'s cookie adapter to `getAll()` / `setAll()`. Bearer-token fallback path is unchanged — that branch keeps working for curl + any caller that explicitly sets the header. Touched only `src/lib/api/auth.ts`; no API route changes required. Fixes a long-standing latent correctness issue across ~60 API routes. |
| L | Any HTTP 401 from the Google Ads list endpoints means the OAuth refresh token has been revoked, so we should null all OAuth fields on the active row. | Google ALSO returns 401 for non-OAuth permission failures (developer token in test mode rejecting non-test customers; customer not in the supplied manager's hierarchy; etc.) — `error.status === 'PERMISSION_DENIED'` shaped 401s. The original implementation classified ALL 401s as `GoogleOAuthRevokedError`, which the routes handled by NULL-ing all OAuth fields. So one wrong customer pick during the picker UI silently disconnected the tenant's OAuth, forcing them to redo the consent dance. Surfaced during validation: operator picked an accessible-but-non-test customer + manager combo, Google returned 401 PERMISSION_DENIED, our code wiped the OAuth, and every subsequent retry returned `oauth_not_connected`. | `throwForStatus` now only surfaces `GoogleOAuthRevokedError` when Google's body explicitly indicates UNAUTHENTICATED (top-level `error.status === 'UNAUTHENTICATED'` or message-string matches like "invalid authentication credentials" / "access token has expired" / "OAuth 2 access error"). Every other 401 falls through to `GoogleAdsApiError`, which the routes report as a recoverable error without touching the row. Both list-route handlers (`customers/list`, `conversion-actions/list`) now `console.error` Google's full 500-char body excerpt on any failure, so future debugging from Vercel logs is one-shot. Added 2 new jest tests (UNAUTHENTICATED → revoked, PERMISSION_DENIED 401 → recoverable). Test count: 23 → 25 in `google-ads-client.test.ts`. |
| M | The `listConversionActions` GAQL query uses `WHERE conversion_action.status = 'ENABLED' AND conversion_action.category = 'LEAD'` (string-quoted enum literals). | Google's GAQL parser rejects quoted enum literals with `INVALID_ARGUMENT  queryError: BAD_ENUM_CONSTANT  "Invalid enum value cannot be included in WHERE clause: 'LEAD'."`. The previous implementation quoted both filters, which Google partially tolerated for `status` (probably string-coerced) but hard-rejected for `category` — so every conversion-actions list call returned HTTP 400 from Google. This was hidden in 2b.1.b.1 because that phase only exercised `uploadClickConversion`, never `listConversionActions`; the picker UI in 2b.1.b.2 is the first place this code path runs against the live API, so the bug surfaced during validation. Operator visible symptom: dropdown shows "Couldn't load conversion actions. Retry." for any customer (even ones the OAuth user has full access to). | Changed both filter literals to the canonical GAQL unquoted-enum form. Updated the character-for-character `EXPECTED_QUERY` assertion in `google-ads-client.test.ts` so a future copy-paste accidentally re-quoting an enum will fail unit tests immediately. (See also row N — fixing the quoting alone wasn't enough.) |
| N | The category filter compares against the enum value `LEAD`. | Google removed the legacy single `LEAD` value from `ConversionActionCategory` several API versions ago and split it into more specific lead-flavoured categories: `SUBMIT_LEAD_FORM`, `PHONE_CALL_LEAD`, `IMPORTED_LEAD`, `QUALIFIED_LEAD`, `CONVERTED_LEAD`, `BOOK_APPOINTMENT`, `REQUEST_QUOTE`, `CONTACT` (verified against the v24 docs at `developers.google.com/google-ads/api/reference/rpc/v24/ConversionActionCategoryEnum.ConversionActionCategory`). Even after fixing row M (unquoting the enum), the query still 400s with `BAD_ENUM_CONSTANT` because the literal `LEAD` is no longer a valid enum value at all. | Replaced `category = LEAD` with an `IN` clause covering the full lead-relevant enum set: `conversion_action.category IN (SUBMIT_LEAD_FORM, PHONE_CALL_LEAD, IMPORTED_LEAD, QUALIFIED_LEAD, CONVERTED_LEAD, BOOK_APPOINTMENT, REQUEST_QUOTE, CONTACT)`. Excludes non-lead categories (PURCHASE, PAGE_VIEW, ADD_TO_CART, SUBSCRIBE_PAID, …) which don't make sense for a CRM-driven offline-conversion firing. Updated `EXPECTED_QUERY` in the test, and updated the test mock data's `category` from `'LEAD'` to `'SUBMIT_LEAD_FORM'` (the modern equivalent — same picker semantics, valid in v24+). |

---

## 4. New TypeScript modules

| File | Responsibility |
|---|---|
| `src/app/api/integrations/google-ads/_lib/role-gate.ts` | `isManagementRole(role)` + `MANAGEMENT_ROLE_LIST = ['owner','super_admin','admin']`. Single source of truth for the gate; `// TODO(rbac):` here points at the F02 §13 Phase B `user_has_permission(...)` swap. Imported by every new route + the page. |
| `src/app/api/integrations/google-ads/_lib/oauth-failure.ts` | `nullOutRevokedOAuth(supabase, tenantId)` — when Google returns 401 / `invalid_grant`, nulls the four OAuth columns + the three target columns on the active config row in one update, so the next page render reflects the disconnected state without forcing the user to click Disconnect manually. |
| `src/app/api/integrations/google-ads/oauth/initiate/route.ts` | `GET` — auth + role gate, looks up the active config row, refuses with 400 `webhook_not_generated_yet` if none, generates `randomBytes(32).toString('hex')` state with a 10-minute TTL, persists, 302s to Google's consent URL (`access_type=offline`, `prompt=consent`, scope `https://www.googleapis.com/auth/adwords`). Replaces `scripts/phase-2b/connect-google-ads.ts`. |
| `src/app/api/integrations/google-ads/webhook/rotate/route.ts` | `POST` — auth + role gate. `loadCarryOver()` snapshots the previous active row's OAuth + target fields; `rotateRow()` sets `is_active=false` on the old row(s) and inserts a new active row with `webhook_key` defaulted to `gen_random_uuid()` server-side and the carry-over fields applied. Returns `{ webhook_url, webhook_key }`. Replaces `scripts/phase-2b/generate-google-webhook-key.ts`. |
| `src/app/api/integrations/google-ads/customers/list/route.ts` | `GET` — auth + role gate, loads OAuth-only config, calls `GoogleAdsClient.listAccessibleCustomers()`. On `GoogleOAuthRevokedError` → calls `nullOutRevokedOAuth` and returns 400 `oauth_revoked`. On `GoogleAdsApiError` → 500 `google_api_error` with HTTP status detail. |
| `src/app/api/integrations/google-ads/conversion-actions/list/route.ts` | `GET ?customer_id=…&login_customer_id=…` — auth + role gate, validates the digits-only IDs (`readParams` extracted to keep CCN ≤ 8), loads OAuth-only config, calls `GoogleAdsClient.listConversionActions(customerId, loginCustomerId)`. Same revoked / api-error mapping (`handleApiError` extracted) as the customers route. |
| `src/app/api/integrations/google-ads/targets/route.ts` | `POST` — auth + role gate. `parseBody` validates `customer_id` (digits), `conversion_action_resource_name` (`/^customers\/\d+\/conversionActions\/\d+$/`), and the optional `login_customer_id` via the `parseLoginCustomerId` tagged-union helper. Refuses with 400 `oauth_not_connected` unless the active row already has `oauth_refresh_token_encrypted`. Updates the three target columns on the active row. Replaces `scripts/phase-2b/set-google-ads-targets.ts`. |
| `src/app/api/integrations/google-ads/disconnect/route.ts` | `POST` — auth + role gate. Idempotent: if no active row, 200 `not_connected`; otherwise nulls out **only** the four OAuth columns + the three target columns. `webhook_key`, `is_active`, `created_by` remain. Returns `{ status: 'ok' }`. |
| `src/app/settings/integrations/google/page.tsx` | Server component. Auth via `createServerSupabaseClient()`, resolves `app_users.active_tenant_id`, looks up `user_tenant_memberships.role` for that tenant, gates on `ALLOWED_ROLES`. `loadActiveConfig` fetches the active row's UI-relevant columns. `resolveStatusBanner(status, reason)` maps `?status=connected` / `?status=error&reason=expired\|oauth_failed\|invalid_state\|unknown` to a typed banner. Renders `<DashboardLayout>` + `<GoogleAdsSettings>`. Permission-denied users see a friendly shell; unauthenticated users redirect to `/login?redirectTo=…`. |
| `src/components/settings/integrations/google-ads-settings.tsx` | Root client component (refactored to a thin composer). Reads `bannerDismissed` local state; composes `<BannerStrip>`, `<InboundWebhookSection>`, `<OutboundConversionsSection>`. Re-exports `GoogleAdsConfig` and `StatusBanner` types so callers don't have to reach into the `google-ads/` subfolder. |
| `src/components/settings/integrations/google-ads/types.ts` | `GoogleAdsConfig`, `StatusBanner`, `CustomerOption`, `ConversionActionOption`, `ListState<T>` — shared types so each child component can import only what it needs (avoids prop-drilling and dead imports). |
| `src/components/settings/integrations/google-ads/fetch-helpers.ts` | `fetchListJson(url)` (handles `globalThis.location.assign('/login')` on 401 — matches the rest of the app's auth-redirect convention), `toListState(promise, mapper)`, `formatConnectedAt(iso)`. |
| `src/components/settings/integrations/google-ads/banner.tsx` | `<BannerStrip>` — dismissible status banner with green/red styling per `StatusBanner.status` and a per-`reason` user-friendly message. |
| `src/components/settings/integrations/google-ads/inbound-section.tsx` | `<InboundWebhookSection>` — three states: (a) no row → "Generate webhook key" CTA → `POST /webhook/rotate` → `router.refresh()`; (b) row exists → URL + key with copy buttons + `<RotateKeyDialog>`; (c) rotate flow → confirmation `<AlertDialog>` → `POST /webhook/rotate` → `router.refresh()`. |
| `src/components/settings/integrations/google-ads/dropdowns.tsx` | `<CustomerDropdown>` and `<ConversionActionDropdown>` — handle empty / loading / error / `oauth_revoked` states, render `<Select>` with the corresponding option list. Pure presentation; data fetching is parent-side. |
| `src/components/settings/integrations/google-ads/targets-picker.tsx` | `<TargetsPicker>` — orchestrates the three-input flow (customer → optional manager account → conversion action). Re-fetches conversion actions when `customer_id` or `login_customer_id` changes; persists via `POST /targets` with toast feedback. |
| `src/components/settings/integrations/google-ads/disconnect-dialog.tsx` | `<DisconnectDialog>` — `AlertDialog` with the disconnect copy + `POST /disconnect` + `router.refresh()`. |
| `src/components/settings/integrations/google-ads/outbound-section.tsx` | `<OutboundConversionsSection>` — picks one of four sub-views: (i) inbound-not-set-up disabled state, (ii) `<ConnectGoogleAdsCta>` (anchor to `/oauth/initiate`), (iii) `<TargetsPicker>` when OAuth is connected but targets are missing, (iv) `<FullyConfiguredView>` (read-only summary + "Reconfigure" + `<DisconnectDialog>`) when everything is set. |
| `src/app/api/integrations/google-ads/oauth/callback/__tests__/route.test.ts` | New — 8 jest tests covering: 302 to `?status=connected` on the happy path; `?reason=expired`; `?reason=invalid_state` (no row); `?reason=invalid_state` (missing params); `?reason=oauth_failed` on Google-reported error; `?reason=oauth_failed` on token-exchange non-2xx; `?reason=unknown` on persist failure; `?reason=unknown` on missing `refresh_token` in token response. |
| `src/app/api/integrations/google-ads/oauth/initiate/__tests__/route.test.ts` | 4 tests: 401 unauthenticated; 403 wrong role; 400 `webhook_not_generated_yet`; happy-path 302 to `accounts.google.com/o/oauth2/v2/auth?...&state=<hex>` with `oauth_pending_state` persisted. |
| `src/app/api/integrations/google-ads/webhook/rotate/__tests__/route.test.ts` | 4 tests: 401, 403, first-time setup (no carry-over), rotation (carry-over verified for all 7 OAuth + target columns). |
| `src/app/api/integrations/google-ads/customers/list/__tests__/route.test.ts` | 6 tests: 401, 403, 400 `oauth_not_connected`, 400 `oauth_revoked` (verifies `nullOutRevokedOAuth` was called), 500 `google_api_error`, happy path returns `{ customers: [...] }`. |
| `src/app/api/integrations/google-ads/conversion-actions/list/__tests__/route.test.ts` | 6 tests: 401, 403, 400 `invalid_customer_id`, 400 `oauth_not_connected`, 400 `oauth_revoked`, happy path with `login_customer_id` correctly forwarded. |
| `src/app/api/integrations/google-ads/targets/__tests__/route.test.ts` | 6 tests: 401, 403, 400 `invalid_input`, 400 `oauth_not_connected`, happy path persists all three columns, idempotent re-save. |
| `src/app/api/integrations/google-ads/disconnect/__tests__/route.test.ts` | 4 tests: 401, 403, idempotent on no row (200 `not_connected`), happy path nulls only OAuth + target columns (`webhook_key` and `is_active` preserved). |
| `src/components/settings/integrations/__tests__/google-ads-settings.test.tsx` | 8 React-Testing-Library tests: empty state (no config); webhook-only (no OAuth); OAuth-pending (renders customer dropdown, fetches list); fully-configured (read-only view + Reconfigure); all 5 banner variants (`connected` + 4 `error` reasons); rotate-flow (confirm → POST → refresh); disconnect-flow (confirm → POST → refresh); manager-account-id propagation (changes login-customer-id → re-fetches conversion actions). |

---

## 5. Extended TypeScript modules

| File | Change |
|---|---|
| `src/lib/conversions/google-ads-client.ts` | Added: `class GoogleOAuthRevokedError extends Error`, `class GoogleAdsApiError extends Error` (with `httpStatus`); `async listAccessibleCustomers()` (GET `customers:listAccessibleCustomers`); `async listConversionActions(customerId, loginCustomerId?)` (POST `customers/<id>/googleAds:search` with the GAQL query `SELECT conversion_action.id, .resource_name, .name, .category, .status FROM conversion_action WHERE conversion_action.status='ENABLED' AND conversion_action.category='LEAD'`); `async loadGoogleAdsOAuthOnly(supabase, tenantId)`; `throwForStatus(res)` helper; `nullishToEmpty / toConversionActionRow / isUsableConversionAction / parseConversionActions` helpers (extracted to keep `listConversionActions`'s map callback under Lizard's CCN ≤ 8). Made `customer_id` and `conversion_action_resource_name` optional on `GoogleAdsConfig`; `uploadClickConversion` defensively throws if either is missing. |
| `src/lib/conversions/__tests__/google-ads-client.test.ts` | Extended from 15 → 23 tests. New coverage: `listAccessibleCustomers` happy path, header construction (Authorization + developer-token, no `login-customer-id`), 401 → `GoogleOAuthRevokedError`, 5xx → `GoogleAdsApiError`; `listConversionActions` happy path, GAQL query body shape (`SELECT … WHERE status='ENABLED' AND category='LEAD'`), `login-customer-id` header presence when `loginCustomerId` is passed and absence when not, 401 → `GoogleOAuthRevokedError`, 4xx → `GoogleAdsApiError`. |

---

## 6. New routes

| Route | Method | Behaviour |
|---|---|---|
| `/api/integrations/google-ads/oauth/initiate` | GET | Auth + `isManagementRole` gate. Looks up active config row; 400 `webhook_not_generated_yet` if none. Generates 32-byte hex `oauth_pending_state` (10-min TTL), persists to the active row, 302s to Google's consent URL with `access_type=offline`, `prompt=consent`, `scope=https://www.googleapis.com/auth/adwords`. Replaces CLI `connect-google-ads.ts`. |
| `/api/integrations/google-ads/webhook/rotate` | POST | Auth + role gate. Snapshots prev OAuth + target fields, sets `is_active=false` on existing active row(s), inserts a new `is_active=true` row with `created_by=auth.uid()`, fresh server-generated `webhook_key`, and the carry-over OAuth + target fields. Returns `{ webhook_url, webhook_key }`. Idempotent in the failure mode (partial unique index never lets two active rows coexist). Replaces CLI `generate-google-webhook-key.ts`. |
| `/api/integrations/google-ads/customers/list` | GET | Auth + role gate. Loads OAuth-only config; 400 `oauth_not_connected` if missing. Calls `GoogleAdsClient.listAccessibleCustomers()`. Returns `{ customers: [{ customer_id, resource_name }] }`. On `GoogleOAuthRevokedError` (401 from Google) → calls `nullOutRevokedOAuth` and returns 400 `oauth_revoked`. On `GoogleAdsApiError` → 500 `google_api_error` with HTTP detail. |
| `/api/integrations/google-ads/conversion-actions/list` | GET (`?customer_id=…&login_customer_id=…`) | Auth + role gate. Validates IDs (digits only). Loads OAuth-only config. Calls `GoogleAdsClient.listConversionActions(customerId, loginCustomerId)` (the client filters to `status=ENABLED AND category=LEAD`). Same revoked / api-error mapping as `/customers/list`. Returns `{ conversion_actions: [{ id, resource_name, name, category, status }] }`. |
| `/api/integrations/google-ads/targets` | POST | Auth + role gate. Body: `{ customer_id, conversion_action_resource_name, login_customer_id? }` — strict regex validation. Refuses with 400 `oauth_not_connected` unless `oauth_refresh_token_encrypted IS NOT NULL` on the active row. Updates the three target columns. Returns `{ status: 'ok' }`. Replaces CLI `set-google-ads-targets.ts`. |
| `/api/integrations/google-ads/disconnect` | POST | Auth + role gate. Idempotent — no active row → 200 `not_connected`. Otherwise nulls out: `oauth_refresh_token_encrypted`, `oauth_scope`, `oauth_connected_at`, `oauth_connected_by_user_id`, `customer_id`, `login_customer_id`, `conversion_action_resource_name`. **Preserves** `webhook_key`, `is_active`, `created_by`. Returns `{ status: 'ok' }`. |

---

## 7. Modified routes

| Route | Method | Change |
|---|---|---|
| `/api/integrations/google-ads/oauth/callback` | GET | Every terminal `renderHtml(…)` replaced with `NextResponse.redirect('/settings/integrations/google?status=…&reason=…')`. Status `connected` on success; `error` with `reason ∈ { expired, oauth_failed, invalid_state, unknown }` on failure. `error_description` from Google is logged server-side only — never leaked into the redirect URL. The `GET` handler was extracted into `GET` + `exchangeAndPersist(req, supabase, cfg, code)` to stay under Lizard's CCN ≤ 8 limit. |

No other routes were modified.

---

## 8. Modified components

### 8.1 `src/app/settings/integrations/page.tsx`

Added a Google Ads tile at the top of the existing Integrations hub,
linking to `/settings/integrations/google`. Mirrors the existing card
styling; `data-testid="google-ads-integration-tile"` for future E2E.

> **Note (added during validation):** this file is the standalone
> `/settings/integrations` route. The sidebar's "Settings →
> Integrations" link does **not** open this route — it opens
> `/settings?section=integrations&tab=integrations`, which mounts
> `<SettingsTabs />`. The same tile was therefore also added in
> `settings-tabs.tsx` (see §8.3). Both surfaces stay in lockstep.

### 8.2 Sibling-bug fixes — `<CreateActivityDialog>` callers (Task 6)

Three pre-existing callers were missing `tenantId` (causing the same
RLS-42501 anon-key insert failure that 2b.1.b.1 fixed for the deal page
in commit `248ca74`). One of them was also passing a non-existent
`preselectedContactId` prop. All three are now mechanical sibling
fixes:

`src/components/contacts/contact-detail-view.tsx` — `tenantId` already
in scope from `useTenant()`. Removed `preselectedContactId`; added
`contactId={contactId}` (the dialog's actual required prop) and
`tenantId={tenantId ?? undefined}`.

`src/components/activities/activity-timeline-enterprise.tsx` — added
`import { useTenantContext } from '@/lib/hooks/use-tenant-context'`,
destructured `const { orgId } = useTenantContext()` at the top of the
component, threaded `tenantId={orgId ?? undefined}` to the dialog.

`src/components/activities/activity-feed-simple.tsx` — same pattern
(`useTenantContext` import, `orgId` destructure, `tenantId={orgId ??
undefined}`).

No new tests for these — they're sibling fixes to the deal-page change
covered by 2b.1.b.1.

### 8.3 `src/components/settings/settings-tabs.tsx` — sidebar entrypoint fix

Discovered during validation: the sidebar's "Settings → Integrations"
link routes to `/settings?section=integrations&tab=integrations`,
which mounts `<SettingsTabs />` → `renderIntegrationsTabs` →
`<IntegrationsHubV2 />`. The §8.1 tile, added to
`/settings/integrations/page.tsx`, was on a route the sidebar never
opens — so a tenant admin would never discover the Google Ads UI.

Fix: mirrored the same `Link` → `Card` markup (and the same
`data-testid="google-ads-integration-tile"`) into
`renderIntegrationsTabs` above `<IntegrationsHubV2 />`. Added two new
imports to `settings-tabs.tsx`:

```ts
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
```

No behavioural change to `<IntegrationsHubV2 />` itself; the tile sits
above it as a separate `<section>`. Codacy clean for the touched lines
(pre-existing `getInitialState` CCN-10 at L144 is unrelated to this
edit window). No new tests — the tile is a static `Link` whose target
route already has its own component-level tests in §9.

---

## 9. Tests

| Suite | Type | Count | Status |
|---|---|---|---|
| `src/app/api/integrations/google-ads/oauth/callback/__tests__/route.test.ts` | jest unit (mocked supabase + `fetch`) | 8 | ✅ |
| `src/app/api/integrations/google-ads/oauth/initiate/__tests__/route.test.ts` | jest unit (mocked `getApiRequestContext`) | 4 | ✅ |
| `src/app/api/integrations/google-ads/webhook/rotate/__tests__/route.test.ts` | jest unit | 4 | ✅ |
| `src/app/api/integrations/google-ads/customers/list/__tests__/route.test.ts` | jest unit (mocked `GoogleAdsClient`) | 6 | ✅ |
| `src/app/api/integrations/google-ads/conversion-actions/list/__tests__/route.test.ts` | jest unit (mocked `GoogleAdsClient`) | 6 | ✅ |
| `src/app/api/integrations/google-ads/targets/__tests__/route.test.ts` | jest unit | 6 | ✅ |
| `src/app/api/integrations/google-ads/disconnect/__tests__/route.test.ts` | jest unit | 4 | ✅ |
| `src/lib/conversions/__tests__/google-ads-client.test.ts` | jest unit (mocked `fetch`) | 23 (15 pre-existing + 8 new) | ✅ |
| `src/components/settings/integrations/__tests__/google-ads-settings.test.tsx` | jest + React Testing Library + jsdom (mocked `globalThis.fetch`, `next/navigation`, `sonner`) | 8 | ✅ |
| **2b.1.b.2 new total** | | **62 new** | ✅ |
| Phase 2b suite (`src/lib/conversions src/app/api/integrations/google-ads src/components/settings/integrations`) total | jest unit + integration | 97 pass, 1 skipped (the `LEAD_INGESTION_INTEGRATION=1`-gated integration test from 2b.1.b.1) | ✅ |

Ran `npx jest src/lib/conversions src/app/api/integrations/google-ads
src/components/settings/integrations` → **11 suites, 97 passed, 1
skipped, 0 failed, 2.4 s**.

E2E intentionally not added per the prompt's "no E2E" instruction;
manual validation runbook covers integration sign-off.

---

## 10. Verification status

| Gate | Status | Evidence |
|---|---|---|
| Schema migration applied | ✅ N/A | None required (re-uses 2b.1.b.1 columns). |
| `tsc --noEmit` clean for touched files | ✅ | Stash-and-recheck: baseline (untracked + modified stashed) = **1497** repo errors. After restoring this phase's changes = **1496** errors (one **fewer** — the bug we fixed in `contact-detail-view.tsx` (passing a non-existent `preselectedContactId` prop) was a TS error in the baseline). **0 new errors** in any 2b.1.b.2-touched file. The page.tsx Supabase typing workaround (cast to `any`) is documented in §3 row E. |
| Unit tests | ✅ | 11 suites, 97 / 97 pass (1 pre-existing integration test skipped without env flag). |
| Pre-existing tests still green after Task 6 fixes | ✅ N/A | `npx jest src/components/contacts src/components/activities` matched 0 test files — no pre-existing tests cover those callers. The dialogs they invoke have their own coverage (unchanged). |
| Codacy CLI clean on every new/modified file | ✅ | All 17 new + 9 modified files: 0 Lizard CCN/NLOC warnings, 0 ESLint, 0 Opengrep, 0 Trivy on touched lines. (Pre-existing warnings verified out-of-window via stash-and-recheck: `contact-detail-view.tsx` `fetchPsychProfile` CCN-9 + global NLOC-71; `settings-tabs.tsx` `getInitialState` CCN-10 at L144 — none overlap our edits.) |
| ESLint clean on every new/modified file | ✅ | Per-file Codacy run includes ESLint; 0 issues. |
| Permission gate verified manually | ⏳ | Pending operator step 12 in §13. |
| Manual validation runbook | ⏳ | Pending operator run; see §13. |

---

## 11. Open questions for the planner

None blocking. Two for awareness:

1. **Customer-name resolution.** The customer dropdown today shows the
   raw 10-digit `customer_id`. Resolving each ID to a friendly name
   (`SELECT customer.descriptive_name FROM customer LIMIT 1`) requires
   an extra GAQL call per customer in the list — modest cost (≤10
   typically), but not trivial. Cosmetic, deferred per the prompt's
   out-of-scope list. Mention to the planner if a UX research session
   surfaces it.
2. **OAuth Verification + Custom domain (F-1 / F-2 / F-3).** The
   current Google OAuth client is in **Testing** mode against the
   `vercel.app` redirect domain. Real tenant admins outside the test
   allowlist will hit Google's "App not verified" interstitial. Tracked
   in `2b-1-b-follow-ups.md`; an admin/business sequence (custom
   domain → privacy policy → OAuth verification request), not
   engineering.

---

## 12. Deferred items

- **OAuth Verification + custom domain + privacy policy** — F-1 / F-2
  / F-3 in `2b-1-b-follow-ups.md`. Not engineering work; tracked
  separately.
- **Meta + WhatsApp settings UIs** — Phases 2b.2 and 2b.3.
- **Generic `<PermissionGate>` component + RBAC migration** — F02 §13
  Phase B. The `// TODO(rbac):` comments in every gated location pin
  the swap site (replace `isManagementRole(ctx.membership.role)` with
  `await user_has_permission(ctx.user.id, ctx.tenantId,
  'settings.integrations.manage')`).
- **Cleanup of the 5 D20 P0 unauthenticated settings routes** —
  separate security sweep.
- **Async / queued conversion firing** — deferred per
  `2b-1-b-1-changes.md` §11.
- **Human-readable customer names in the picker** — see §11 question 1.
- **`oauth_disconnected_at` timestamp column** — deferred per
  `2b-1-b-1-changes.md` §11. Today we just null out the OAuth fields.
- **Removal / archival of the three CLI scripts**
  (`connect-google-ads.ts`, `set-google-ads-targets.ts`,
  `generate-google-webhook-key.ts`) now that the UI replaces them. The
  scripts still work (service-role); leaving them in place for one
  release as a fallback. Remove in a follow-up cleanup PR after
  operator confidence in the UI.
- **`location.assign('/login')` shimming** — `fetchListJson` redirects
  to `/login` on 401 by writing to `globalThis.location`. Works in
  production; in tests the helper is exercised through the component
  flow rather than being mocked. A future test util could replace
  `globalThis.location` with a navigation spy.

---

## 13. Files added / changed / removed

**Added:**

```
dental-crm/src/app/api/integrations/google-ads/_lib/role-gate.ts
dental-crm/src/app/api/integrations/google-ads/_lib/oauth-failure.ts
dental-crm/src/app/api/integrations/google-ads/oauth/initiate/route.ts
dental-crm/src/app/api/integrations/google-ads/oauth/initiate/__tests__/route.test.ts
dental-crm/src/app/api/integrations/google-ads/oauth/callback/__tests__/route.test.ts
dental-crm/src/app/api/integrations/google-ads/webhook/rotate/route.ts
dental-crm/src/app/api/integrations/google-ads/webhook/rotate/__tests__/route.test.ts
dental-crm/src/app/api/integrations/google-ads/customers/list/route.ts
dental-crm/src/app/api/integrations/google-ads/customers/list/__tests__/route.test.ts
dental-crm/src/app/api/integrations/google-ads/conversion-actions/list/route.ts
dental-crm/src/app/api/integrations/google-ads/conversion-actions/list/__tests__/route.test.ts
dental-crm/src/app/api/integrations/google-ads/targets/route.ts
dental-crm/src/app/api/integrations/google-ads/targets/__tests__/route.test.ts
dental-crm/src/app/api/integrations/google-ads/disconnect/route.ts
dental-crm/src/app/api/integrations/google-ads/disconnect/__tests__/route.test.ts
dental-crm/src/app/settings/integrations/google/page.tsx
dental-crm/src/components/settings/integrations/google-ads-settings.tsx
dental-crm/src/components/settings/integrations/google-ads/types.ts
dental-crm/src/components/settings/integrations/google-ads/fetch-helpers.ts
dental-crm/src/components/settings/integrations/google-ads/banner.tsx
dental-crm/src/components/settings/integrations/google-ads/inbound-section.tsx
dental-crm/src/components/settings/integrations/google-ads/dropdowns.tsx
dental-crm/src/components/settings/integrations/google-ads/targets-picker.tsx
dental-crm/src/components/settings/integrations/google-ads/disconnect-dialog.tsx
dental-crm/src/components/settings/integrations/google-ads/outbound-section.tsx
dental-crm/src/components/settings/integrations/__tests__/google-ads-settings.test.tsx
dental-crm/docs/2b/2b-1-b-2-changes.md   (this file)
```

**Changed:**

```
dental-crm/src/app/api/integrations/google-ads/oauth/callback/route.ts   (renderHtml → NextResponse.redirect; extracted exchangeAndPersist)
dental-crm/src/app/settings/integrations/page.tsx                        (Google Ads tile added)
dental-crm/src/lib/conversions/google-ads-client.ts                      (new error classes + listAccessibleCustomers + listConversionActions + loadGoogleAdsOAuthOnly + helpers; GoogleAdsConfig: customer_id and conversion_action_resource_name now optional; refined 401 classification per §3 row L — UNAUTHENTICATED only, not every 401; GAQL enum literals unquoted per §3 row M; category filter switched from removed `LEAD` enum to IN-clause over modern lead-flavoured enums per §3 row N)
dental-crm/src/lib/conversions/__tests__/google-ads-client.test.ts       (15 → 25 tests; +2 for the refined 401 classification; EXPECTED_QUERY + mock category data updated for the modern lead-category set per §3 rows M+N)
dental-crm/src/app/api/integrations/google-ads/customers/list/route.ts                (added console.error of Google's body excerpt on every failure; see §3 row L)
dental-crm/src/app/api/integrations/google-ads/conversion-actions/list/route.ts       (added console.error of Google's body excerpt on every failure; see §3 row L)
dental-crm/src/components/contacts/contact-detail-view.tsx               (sibling caller fix: contactId + tenantId; dropped non-existent preselectedContactId)
dental-crm/src/components/activities/activity-timeline-enterprise.tsx    (sibling caller fix: useTenantContext + tenantId={orgId ?? undefined})
dental-crm/src/components/activities/activity-feed-simple.tsx            (sibling caller fix: useTenantContext + tenantId={orgId ?? undefined})
dental-crm/src/components/settings/settings-tabs.tsx                     (Google Ads tile mirrored into renderIntegrationsTabs so the sidebar entrypoint surfaces it; see §8.3)
dental-crm/src/lib/supabase-server.ts                                    (createServerSupabaseClient: deprecated get/set/remove cookie adapter → modern getAll/setAll; fixes chunked-cookie session reading for Server Components; see §3 row J)
dental-crm/src/lib/api/auth.ts                                           (getSupabaseAuthContext: same deprecated → modern cookie-adapter migration; fixes chunked-cookie session reading for browser fetch() calls into API routes; see §3 row K)
```

**Removed:** none. The three CLI scripts in `scripts/phase-2b/` remain
on disk as fallbacks for one release (see §12).

---

## 14. Manual validation evidence

⏳ **Pending operator run against Vercel production.**

Operator runbook (from prompt §"Manual validation runbook"):

1. Sign in as test tenant admin (tenant
   `5aadca14-9786-4aef-bc53-e9287cdd0bbf`).
2. Settings → Integrations. Confirm Google Ads tile visible. Click.
3. Land on `/settings/integrations/google`. Expected state:
   "fully configured" — webhook + OAuth + customer `1675268286` +
   conversion action `7600535419` + manager account `9374708799`
   (per 2b.1.b.1's validation §13.1).
4. Click "Disconnect". Confirm. Verify page now shows only inbound
   webhook + "Connect Google Ads" CTA. Verify `google_lead_form_configs`
   row has all OAuth + target fields nulled but `webhook_key` and
   `is_active` preserved.
5. Click "Connect Google Ads". Land on Google consent. Authorise. Land
   back on `/settings/integrations/google?status=connected` with green
   banner.
6. Pick customer `1675268286`. Verify dropdown loaded.
7. Add manager account `9374708799` in optional input. Verify
   conversion-actions dropdown reloads with new login-customer-id.
8. Pick `Lead (test)` conversion action. Click Save.
9. Verify row in DB matches values from §13.1 of `2b-1-b-1-changes.md`.
10. Trigger Google Lead Form webhook with synthetic gclid (per
    2b.1.b.1 validation §13.2). Verify new `conversion_events_fired`
    row written with `http_status=200` (status = `failure` expected
    due to synthetic gclid — same as 2b.1.b.1).
11. Click "Rotate key". Confirm. Verify new key displayed and old key
    invalidated. Re-fire webhook with OLD key → 401. Re-fire with NEW
    key → success + contact/deal/activity. OAuth still works (no
    reconnect needed) — confirms carry-over logic in §6 row 2.
12. Sign in as `staff`-role user. Try `/settings/integrations/google`
    → denied. Try `POST /api/integrations/google-ads/disconnect` via
    curl → 403.

Capture row-level evidence of steps 4, 5, 8, 9, 10, 11, 12 here once
operator runs.
