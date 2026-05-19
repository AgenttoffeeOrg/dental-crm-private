# Operational gotchas

Things that have bitten us in production. Read before debugging anything weird.

## 'use client' modules can't be imported by server routes

**Symptom:** code works in dev and jest tests, throws `TypeError: (0 , X.Y) is not a function` in production.

**Cause:** A file with `'use client'` at the top exports a function. A server-side API route imports that function. At runtime in a real Next.js production build, the import returns a placeholder object (a "client reference"), not the actual function. Test mocks bypass this entirely.

**Fix:** Either (a) remove the `'use client'` directive and gate any browser-only logic with `typeof window !== 'undefined'`, or (b) split shared utilities into separate `*.client.ts` and `*.server.ts` files.

**First seen:** Phase 2b.3, in `src/lib/marketing/feature-flags.ts`. Workaround at the time was to inline the `tenants.marketing_enabled` SELECT in the route. See `docs/2b/2b-3-changes.md` §5.5.

## Auto-deploy hook lives at `.husky/pre-push`, not `.git/hooks/`

**Symptom:** push completes but no Vercel deploy fires.

**Cause:** Husky redirects `core.hooksPath` to `.husky/_/`. Hooks placed in `.git/hooks/` are silently ignored.

**Fix:** Edit `.husky/pre-push`. Manual fallback: `npm run deploy:prod`.

**First seen:** Phase 2b.3 deploy hook diagnosis.

## Twilio inbound webhook signature URL must match what's configured in the Console

**Symptom:** signature verification fails for every inbound message; webhook returns 401.

**Cause:** Twilio computes the signature over the EXACT URL configured in the Console (including any query string, including the protocol). If the route handler computes the signature over `req.url` (the internal Next.js URL) instead of the public Vercel URL, the two won't match.

**Fix:** The signature helper must use the public URL. See `src/lib/whatsapp/twilio-signature.ts` and how it's invoked from `src/app/api/webhooks/whatsapp/route.ts` and `src/app/api/webhooks/sms/route.ts`. In production behind Vercel, `request.url` carries the public host because Vercel sets `x-forwarded-host` correctly; in local dev with Twilio webhook tunnels the URL Twilio used must equal what the helper sees.

**First seen:** Phase 2b.2.a (WhatsApp inbound rebuild).

## Twilio inbound: `sms_inbound` and `whatsapp_inbound` keyspaces are independent

**Symptom:** confused why the same `MessageSid` shape (`SMxxxx…`) appears under two `source_channel` values.

**Cause:** Twilio uses the same SID prefix (`SM…` for messaging) across SMS and WhatsApp. The `idx_attribution_touchpoints_external_msg_uniq` partial unique index is keyed on `(tenant_id, source_channel, external_message_id)` precisely so a hypothetical SID collision between channels would not cross-deduplicate.

**Fix:** Always filter by `source_channel = 'sms_inbound'` (or `'whatsapp_inbound'`) when looking up an `attribution_touchpoints` row by `external_message_id`. Don't filter by `external_message_id` alone.

**First seen:** Phase 2b.4 (SMS inbound rebuild, mirroring WhatsApp's pattern).

## Each tenant needs its own Twilio receiving number

**Symptom:** an inbound message from a known patient doesn't show up under their tenant in the CRM, or shows up under a different tenant.

**Cause:** Tenant resolution for inbound Twilio webhooks looks up the **receiving** number (`To`) against either `tenants.whatsapp_phone_number` or `tenants.sms_phone_number`. Whichever tenant claims that number gets the lead. If two tenants share a number (e.g. the WhatsApp shared sandbox `+14155238886` during testing, or `+447782218044` during initial SMS testing), only the OLDEST-by-`created_at` tenant will receive the message; the others see nothing.

**Fix:** In production, every practice gets its own Twilio number. Until that's automated by the wizard, set numbers via SQL (see `docs/onboarding/practice-onboarding-runbook.md` §SMS / §WhatsApp). The inbound helpers emit a `console.warn('[…-inbound] multi-tenant collision …')` log line when they detect the situation, so it's at least visible in Vercel function logs.

**First seen:** Phase 2b.4 (SMS), inherited pattern from 2b.2.a (WhatsApp).

## Outbound send routes are tenant-scoped to the authenticated user

**Rule:** all `/api/communications/send-*` routes (`send-email`, `send-sms`, `send-sms-v2`, `send-whatsapp`, `send-whatsapp-v2`) and `/api/communications/initiate-call` require a logged-in CRM session. They ignore any `tenant_id` in the request body — the tenant is always derived from the authenticated user's `app_users.active_tenant_id` + `user_tenant_memberships`. Each route also enforces a per-tenant per-minute rate limit (`email`: 60, `sms`: 30, `whatsapp`: 30, `voice`: 10) via `lib/rate-limiter.ts`.

**Symptom if you forget:** server-internal callers using HTTP `fetch()` to these routes will get `401 unauthenticated`. Browser-side code (UI composers, bulk-send panel) is fine because it inherits the session cookie automatically.

**Fix:** call `dispatchEmail` / `dispatchSms` / `dispatchWhatsApp` / `dispatchVoiceCall` directly from `lib/communications/dispatcher.ts` for any server-internal automation, scheduled job, queue worker, or bot. They bypass HTTP entirely and are unaffected by the auth gate.

**Don't:** re-add `tenant_id` reading from the request body. The whole point is that nobody outside an authenticated session can pick the tenant. Mismatch on body `tenant_id` → 403 `tenant_mismatch`. Body `tenant_id` is silently overridden by the authenticated value if absent.

**First seen:** Phase 2b.5 (outbound communications auth fix). Closes the D03 §1 unauthenticated-send P0.

## Outbound credential split-brain: legacy settings tabs ≠ dispatcher

**Symptom:** practice owner fills in "SMS Configuration" / "WhatsApp Configuration" / "Email Configuration" tabs in Settings, saves, then tries to send a message — dispatcher throws `"SMS integration not configured. Please configure in Settings → Integrations."`.

**Cause:** the legacy single-channel settings tabs (`<EmailConfigTab>`, `<SMSConfigTab>`, `<WhatsAppConfigTab>`) write to plain-text columns on the `tenants` table (`tenants.smtp_host`, `tenants.sms_api_key`, `tenants.sms_api_secret`, `tenants.sms_from_number`, `tenants.whatsapp_api_key`, etc.). The dispatcher (`lib/communications/dispatcher.ts`) reads its credentials via `loadTenantIntegrationSettings` (`lib/integrations/tenant-integration-config.ts`), which resolves from `integration_secret_vault` → `integration_channel_settings` → `integration_settings` → env. **The dispatcher does not read the legacy `tenants.sms_*` / `tenants.whatsapp_*` / `tenants.smtp_*` columns at all.** So the legacy tabs save successfully and configure nothing.

The newer combined `<CommunicationsIntegrationsTab>` writes to `integration_settings`, which the dispatcher *does* read. That tab works.

**Additional trap on the API side:** `PATCH /api/settings/email`, `PATCH /api/settings/sms`, `PATCH /api/settings/whatsapp` (the routes the legacy tabs POST to) accept `tenant_id` from the request body, use the service-role Supabase client, and have **no authentication**. Anyone with the URL can rotate any tenant's outbound credentials. Tracked as a P0 in `docs/audits/outbound_audit.md` §11.

**Fix:** until the legacy tabs are deleted or rewired (planned phase 2b.7 / 2b.8 per the outbound audit), tell practice owners to use only the **Communications Integrations** tab. Internally, never read or write `tenants.sms_*` / `tenants.whatsapp_*` / `tenants.smtp_*` columns from new code — go through `loadTenantIntegrationSettings` for reads and `integration_settings` for writes.

**Bonus trap:** the v2 SMS / v2 WhatsApp routes (`/api/communications/send-sms-v2`, `/send-whatsapp-v2`) *do* read those legacy plain-text columns (and write thinner activity rows that lack `agent_user_id` / `metadata.ai_*` / `snippet`). They are dormant — no UI calls them — but if anyone wires them up, they will silently bypass the canonical credential resolver. Plan: delete in 2b.7. Until then, don't use v2.

**First seen:** Phase 2b.6 (outbound communications audit). See `docs/audits/outbound_audit.md` §7 and §11 issue #4.
## Settings PATCH routes are now auth-gated (2b.7)

**Symptom:** any future server-internal HTTP caller of
`/api/settings/email`, `/api/settings/sms`, or `/api/settings/whatsapp`
will see a 401 `unauthenticated` unless it presents a valid CRM
session cookie. As of 2b.7 there is no such internal caller; the only
callers are the legacy single-channel settings tab UIs, which inherit
the user's session cookie.

**Cause:** Phase 2b.7 wrapped each route through the 2b.5 auth helper.
The WHERE filter on the `tenants.update(...)` is pinned to
`auth.tenantId` resolved via `requireAuthenticatedTenantUser`; body
`tenant_id` is checked for mismatch (403 `tenant_mismatch` on
disagreement) and otherwise ignored.

**Implication for any future server-to-server caller:** present a
session cookie via shared auth context, or add a service-token path —
do not re-introduce body `tenant_id` reading. Phase 2b.8 is expected
to delete the legacy tab UIs entirely, at which point these PATCH
routes have no caller at all and can themselves be deleted.

**Related deletions in 2b.7 (callers will now see 404):**

- `POST /api/emails/welcome` — was unauthenticated; deleted. Public
  spam vector. If any historical caller exists (no evidence of one in
  source, env vars, or `vercel.json`), it will now 404.
- `POST /api/communications/send-sms-v2` — deleted. Zero source
  callers at the audit.
- `POST /api/communications/send-whatsapp-v2` — deleted. Zero source
  callers at the audit.

**Library cleanup in 2b.7:** `src/lib/email-queue.ts` and
`src/lib/marketing/sms-provider.ts` were deleted (zero callers). The
`email_logs` Postgres table that `email-queue.ts` wrote to is
**preserved** for now; drop is scheduled for 2b.8's migration sweep.

**First seen:** Phase 2b.7 (settings auth + dead-code purge). See
`docs/2b/2b-7-changes.md` and audit P0 #1–#3, P1 #9, P2 #24/#25.

## `docs/2b/migrations-pending/` is a deliberately-quarantined apply path (2b.8)

**Symptom:** somebody finds a `.sql` file under
`dental-crm/docs/2b/migrations-pending/` and assumes the standard
migration apply path will pick it up. It will not.

**Cause:** Phase 2b.8 authored a single squashed migration that drops
14 legacy outbound credential columns on `tenants` and the orphaned
`email_logs` table (whose only writer was deleted in 2b.7). Per the
locked decision in the 2b.8 prompt §0.4, the migration ships **with**
the UI deletion but **not** as an apply — they are independently
reviewable and rollback-able. The file lives outside
`dental-crm/supabase/migrations/` precisely so `supabase db push` and
the MCP `apply_migration` tool cannot pick it up by accident before
the planner-approved follow-up phase moves it across with a fresh
timestamp.

**Fix:** any SQL file under `dental-crm/docs/2b/migrations-pending/`
is in the "authored but not applied" state. To apply: read the file's
header (apply steps documented), move into
`dental-crm/supabase/migrations/` with a fresh `YYYYMMDDHHMMSS`
prefix, apply via the project's standard path, regenerate TypeScript
types (`supabase MCP generate_typescript_types`), run the post-apply
check, document in the phase's changelog.

**Bonus rule:** the rollback companion file
(`*_rollback.sql`) is **not** itself a migration. Move both files
together when applying; run the forward one only.

**First seen:** Phase 2b.8 (settings UI rationalisation). See
`docs/2b/2b-8-changes.md` §2 and the `migrations-pending/README.md`.

## `tenants.sms_phone_number` and `tenants.whatsapp_phone_number` are inbound routing identifiers, not outbound credentials (2b.8)

**Symptom:** a future "let's just drop all the legacy `tenants.sms_*`
/ `tenants.whatsapp_*` columns" cleanup migration accidentally drops
the `_phone_number` columns, and inbound SMS / WhatsApp webhooks stop
resolving a tenant.

**Cause:** the dispatcher reads outbound credentials from
`integration_settings` (via `loadTenantIntegrationSettings`), so most
of the `tenants.sms_*` / `tenants.whatsapp_*` plain-text columns are
genuinely dead outbound surfaces. **But two of them**
— `sms_phone_number` and `whatsapp_phone_number` — are used by the
inbound Twilio webhook handlers (`src/lib/sms/inbound.ts:165` and
`src/lib/whatsapp/inbound.ts:186`) to resolve the receiving number's
tenant. Drop them and inbound delivery silently breaks (no tenant
match → message dropped).

**Fix:** any future schema cleanup migration that touches
`tenants.sms_*` / `tenants.whatsapp_*` columns must explicitly
preserve `sms_phone_number` and `whatsapp_phone_number` (and confirm
no inbound resolver path was migrated to a different identifier in
the meantime). The 2b.8 scheduled migration
(`docs/2b/migrations-pending/20260512_phase_2b_8_drop_legacy_outbound_columns.sql`)
omits both from its `DROP COLUMN` list with explicit `-- PRESERVED:`
annotations and a post-apply check that asserts both columns still
exist.

**Related preserve list:** `tenants.email`, `tenants.email_main`, and
`tenants.email_support` were also preserved by the same migration —
they are tenant contact addresses used by the org profile editor, the
onboarding contact step, and the marketing merge-tag resolver
(`{{practice.email}}`), not outbound SMTP credentials. Don't drop
them without grepping for surviving callers first.

**First seen:** Phase 2b.8 (settings UI rationalisation, schema
migration authoring). See `docs/2b/2b-8-changes.md` §3.4.

## The `tenants` table no longer carries legacy plain-text outbound credential columns (2b.8.1)

**Symptom:** code or SQL still references `tenants.smtp_host`,
`tenants.sms_api_key`, `tenants.whatsapp_api_key`, or the other 14
columns dropped in 2b.8.1 — queries fail at runtime or greps look
"dead" while `src/types/supabase.ts` still lists them.

**Cause:** Phase 2b.8.1 applied
`20260518194500_phase_2b_8_1_drop_legacy_outbound_columns.sql` to
production. Outbound credentials live on `public.integration_settings`
only (CIT: `PATCH /api/settings/communications/integrations`, loader:
`loadTenantIntegrationSettings`).

**Fix:** read/write credentials via `integration_settings` (or the CIT
API). Do not expect the dropped `tenants.*` columns to exist. Regenerate
types when touching schema consumers. **`sms_phone_number` and
`whatsapp_phone_number` on `tenants` are preserved** — inbound webhook
routing identifiers, not outbound credentials. Same for `email`,
`email_main`, `email_support` (tenant contact / merge tags).

**First seen:** Phase 2b.8.1. See `docs/2b/2b-8-1-changes.md`.

## `<CommunicationsIntegrationsTab>` was a stub until 2b.8.2 (save/load lied)

**Symptom:** from its introduction through end of Phase 2b.8,
`<CommunicationsIntegrationsTab>` advertised as the canonical outbound
credentials UI, yet **Save** only showed a misleading toast:
“Database migration required to save settings” — **nothing was
persisted**. **Load** returned immediately without calling the backend.

**Cause:** handlers were placeholders (see `2b-8-cit-save-investigation.md`).
The outbound audit did not trace CIT Save → network → DB (`outbound_audit`
§1.2/§1.3 explicitly skipped this surface).

**Fix (2b.8.2):** `GET` + `PATCH /api/settings/communications/integrations`
plus `authFetch` wiring in `communications-integrations-tab.tsx`. See
`docs/2b/2b-8-2-changes.md`.

**Lesson for planners:** whenever a phase promotes a UI as **canonical**
or “the working alternative,” add a **pre-flight that traces one Save
through DevTools Network to a persisted row**. Inspecting React state alone
misses stubbed persistence.

**First seen:** documented at Phase 2b.8.2 (CIT save/load implementation).

## `authFetch` can hang silently when supabase `getSession()` deadlocks on its NavigatorLock (2b.8.2)

**Symptom:** a UI button (Save, Send, Connect, anything driven by
`authFetch`) flips into its "…ing" state and stays there forever. No
network request appears in DevTools — not even an aborted or pending
one. No console error from the calling component, even when the caller
wraps the request in an `AbortController` timeout.

**Debugging hint:** **if a button hangs in the UI with no network
request, suspect the auth header path before suspecting the route.**
Confirm with DevTools → Network: filter to the expected method/URL —
if no entry appears at all (not even pending), the request never left
the browser, so the server route is innocent. Then look at the auth
console for an `[AUTH] onAuthStateChange SIGNED_IN` event firing near
the moment of the click — that's the smoking gun for this exact bug.

**Cause:** `authFetch` (`src/lib/auth-fetch.ts`) awaits
`supabaseBrowser.auth.getSession()` to read a bearer token **before**
issuing the real `fetch()`. `@supabase/ssr`'s browser client takes an
internal NavigatorLock during token-refresh windows; if a click races
the refresh, `getSession()` never resolves on the affected code path.
The real `fetch()` is never reached, so the caller's
`AbortController.signal` is wired to nothing — aborting is a no-op, the
catch never runs, and every `authFetch`-based UI silently wedges. This
is shared infrastructure: CIT was the most visible victim, but
treatment offerings, dedup queue, org switcher, location switcher, etc.
all share the same code path.

**Canonical mitigation:** `getAuthHeaders()` in `src/lib/auth-fetch.ts`
races `getSession()` against a **2.5 s timeout**
(`GET_SESSION_TIMEOUT_MS`). On timeout it logs
`[authFetch] supabase.auth.getSession() exceeded 2500ms; falling back
to cookie auth` and returns no `Authorization` header. The request
still authenticates because `authFetch` sends `credentials: 'include'`
and every API route under `src/app/api/` is cookie-friendly — they all
auth via `requireAuthenticatedTenantUser`, `getApiRequestContext`,
`getSupabaseAuthContext`, or `createServerSupabaseClient`, each of which
builds a `@supabase/ssr` server client with the modern `cookies.getAll`
adapter (see `src/lib/api/auth.ts`, `src/lib/api/context.ts`,
`src/lib/auth/api-auth-helpers.ts`, `src/lib/supabase-server.ts`).

**Implication for future routes:** if anyone adds a new API route that
auths **only** via the `Authorization: Bearer` header (no cookie path),
post-timeout calls into that route will 401 instead of hanging. That's
degraded but **visible** — far better than the silent hang — so it's
not a regression, but worth knowing if a UI suddenly starts 401-ing
during refresh windows. Stick to the four canonical helpers above and
you'll be fine. As of 2b.8.2, every authFetch-callable route in the
tree was spot-checked and is cookie-friendly.

**Don't:**

- Raise the `GET_SESSION_TIMEOUT_MS` cap (e.g. to 30 s) "to be safe."
  The hang is unbounded — `getSession()` does not self-resolve. A
  longer cap just means a longer silent wedge.
- Remove `credentials: 'include'` from `authFetch`. Without cookies the
  timeout path becomes a 401 instead of a successful fallback.
- Add a new client-side fetch wrapper that re-introduces the
  pre-`fetch()` `await` on the supabase client. Either use `authFetch`
  (which is now bounded) or call `fetch(url, { credentials: 'include',
  … })` directly.

**First seen:** Phase 2b.8.2 (CIT save investigation, post-deploy
fix #2). Reproduced live in the browser with operator credentials:
`PATCH /api/settings/communications/integrations` never left the
browser; `[AUTH] onAuthStateChange SIGNED_IN` had fired at exactly the
click timestamp. See `docs/2b/2b-8-2-changes.md` §16.

---

## Phase 2b.9 — Failed outbound sends visible in activity feed

**Failed outbound sends are now visible in the activity feed.** Before
2b.9, the dispatcher threw on provider failure before writing any
activity, so failed sends produced zero audit trail. Post-2b.9, every
send attempt writes a `pending` activity row up front and updates it to
`sent` or `failed`. A `failed` row's friendly label lives at
`integration_metadata.error.message`; the raw provider response lives at
`integration_metadata.error.raw`. The dispatcher still throws after
writing the failed row, so the route still returns 500 to the UI.

---

## Phase 2b.9 — Outbound email HTML sanitised in dispatcher

**Outbound email HTML is now DOMPurify-sanitised in the dispatcher.** A
user pasting `<script>` tags into a composer body will have them stripped
before the email is sent AND before the body is stored in
`activities.rich_content`. The slide-in's `dangerouslySetInnerHTML`
render of `rich_content` is now safe by construction. Sanitisation runs
at the dispatcher, not the composer. **Build note:** `isomorphic-dompurify`
pulls jsdom; Next.js needs an empty `browser/default-stylesheet.css` at
the repo root (see `2b-9-changes.md` §3.7).

---

## Phase 2b.9 — Templates manager not in sidebar

**The Templates manager has been removed from the sidebar nav** (it was
already absent on `phase-1-attribution-foundation` at 2b.9 execution).
There is no `/templates` page route in this branch — only
`/marketing/templates` and `/forms/templates`. The `<TemplatesManager>`
component still exists for a future wired phase. Re-add a sidebar link
when composers integrate with `activity_templates`.

---

## Phase 2b.9 — ActivityDetailModal removed

**`<ActivityDetailModal>` is gone.** The single activity-detail surface
is `<ActivityDetailSlideIn>`. Any code authored against the modal is
reading a pre-2b.9 repo.

---

## Phase 2b.9.1 — Failed-send toasts match the slide-in badge

**Failed-send toasts now match the slide-in badge.** The dispatcher
rethrows `new Error(friendlyLabel)` instead of the raw provider error.
Send routes propagate the message to the response body only when it
matches a known-safe prefix (`Send failed —`, `Email provider not
configured`, `SMS provider not configured`, `WhatsApp provider not
configured`); otherwise return generic `'Internal server error'` and
server-log the raw error via `console.error`. Composers' `toast.error`
reads from the response body. If a new friendly label is introduced in
the dispatcher, add its prefix to `FRIENDLY_ERROR_PREFIXES` in
`error-helpers.ts` or it will be hidden behind the generic fallback.

**Vercel cold start:** do not top-level-import `isomorphic-dompurify` on
code paths shared by `send-sms` / `send-whatsapp` (e.g. `dispatcher.ts`).
It pulls jsdom and can crash the route with an HTML 500 before the route
handler runs; the SMS composer then shows a generic “Failed to send SMS”
toast. Use lazy `require` inside `sanitiseOutboundHtml()` only (fix in
`5380723`).

## Phase 2b.10 — System-email module merge

> **There is now exactly one system-email module.**
> `src/lib/services/email-service.ts` is the canonical system-email
> surface (user invites, join-request notifications, join
> approve/reject, seat-limit warnings). It branches by
> `getEmailProvider()` across Resend / SendGrid / Console.
> `src/lib/email-service.ts` no longer exists — any code referencing
> `EmailService`, `emailService`, or `@/lib/email-service` is reading a
> pre-2b.10 repo.

