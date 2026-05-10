# Phase 2b.5 — Outbound communications auth fix: change log

**Scope:** close the D03 §1 unauthenticated-send P0. Today every
`/api/communications/send-*` route plus `initiate-call` accepts a
`tenant_id` from the request body with **zero authentication, zero rate
limiting, zero signature** — anyone with knowledge of any tenant UUID
(which is essentially public per F03) can trigger arbitrary email / SMS
/ WhatsApp / voice from that tenant's account at the tenant's expense.
This phase wraps every outbound route in a single shared auth helper
that requires a logged-in CRM session, ignores body `tenant_id`, refuses
mismatched body `tenant_id` (defense in depth), and enforces a per-tenant
per-minute rate limit on each channel.

**Out of scope (deferred):**

- Provider consolidation. SendGrid / Resend / AWS SES coexistence stays
  as-is — Phase 2b.7+.
- v1 vs v2 send-route consolidation (`send-sms` ↔ `send-sms-v2`,
  `send-whatsapp` ↔ `send-whatsapp-v2`) — Phase 2b.7+.
- Reply-To token threading, conversation/inbox UI — Phase 2b.7+.
- Refactoring `lib/communications/dispatcher.ts` internals.
- Inbound channel work (already covered by 2b.1.a / 2b.2.a / 2b.3 /
  2b.4).
- Email inbound infrastructure — deferred until domain purchase.
- The unauthenticated email-events webhook
  (`/api/webhooks/email`) — different P0, separate phase.
- WhatsApp Business sender registration — operational, per-tenant.
- Settings UI for outbound channel config — Phase 2b.7+ or wizard.
- Cost tracking / budget caps — F05 §6, separate phase.
- Channel-level entitlement enforcement — needs schema first; see §3
  Adaptations.

**Branch baseline:** `phase-1-attribution-foundation`, on top of Phase
2b.4 (SMS inbound rebuild) — `2b-4-changes.md`.
**Date applied:** 2026-05-10.
**Test tenant exercised:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf`
("Deepak's Dental Practice"); operator user
`deepakshegde@gmail.com` (`role=owner`, `status=active`).
**Production deploy target:** https://dental-crm-nine.vercel.app

---

## 1. Summary

Pre-2b.5, the six outbound routes
(`/api/communications/send-email`, `send-sms`, `send-sms-v2`,
`send-whatsapp`, `send-whatsapp-v2`, `initiate-call`) read `tenant_id`
straight from the request body, looked up the tenant's provider keys
under the service-role client, and dispatched a real Twilio / SendGrid
message. There was no auth, no signature, no rate cap. A
publicly-known tenant UUID was sufficient to bill that tenant's account
indefinitely.

Phase 2b.5 introduces a single shared helper at
`src/lib/auth/api-auth-helpers.ts` and wraps every send route through
it. Concretely:

| # | Pre-2b.5 defect | Fix |
|---|---|---|
| 1 | Body `tenant_id` was trusted as the operating tenant. | `requireAuthenticatedTenantUser` resolves the tenant from `app_users.active_tenant_id` + `user_tenant_memberships` (status=active). Body `tenant_id` is overridden by the authenticated value. Mismatch → 403 `tenant_mismatch`. |
| 2 | No login required. | Every send route now calls `requireAuthenticatedTenantUser(request)` first. No session → 401 `unauthenticated`. |
| 3 | No rate limit; a UI bug or runaway loop could fire 1000 messages in a minute. | `enforceOutboundRateLimit(tenantId, channel)` — 60/min email, 30/min sms, 30/min whatsapp, 10/min voice. Backed by the existing Redis-backed `lib/rate-limiter.ts` (in-memory fallback). Over limit → 429 `rate_limit_exceeded`. |
| 4 | `/api/emails/test` was an open public-internet test endpoint with no auth. | Deleted (zero source callers; Option A per prompt §3.7). |
| 5 | `/api/ai-assistant/draft-email` had the same body-trusted `tenant_id` shape and would happily draft against any tenant. | Wrapped through the same helper. No rate limit (drafting is not a send). |

The dispatcher (`lib/communications/dispatcher.ts`) was not modified —
its server-internal callers (`lib/engagement/campaign-engine.ts`,
`lib/engagement/bot-service.ts`, `lib/queues/communication-queue.ts`)
continue to reach it directly without going through HTTP, so the auth
gate has no effect on them. UI components
(`bulk-send-panel`, `email-composer-panel`, `sms-composer-panel`,
`whatsapp-composer-panel`, `click-to-call-dialer`,
`activity-detail-slide-in`) inherit the session cookie and continue to
work for logged-in users with no UX change.

---

## 2. Schema migration

**None.** No DB changes were applied or required.

---

## 3. Adaptations from prompt → live shape

The planner's prompt assumed several things that turned out to be
different from the live schema. Each adaptation below was made
explicitly — the helper file's doc comment captures it inline as well.

### 3.1 Membership table is `user_tenant_memberships`, not `user_tenants`

The pre-flight SQL in §1.4 hypothesised `user_tenants`. The live shape
is `user_tenant_memberships(user_id, tenant_id, role, status,
all_locations, …)`. The canonical `getApiRequestContext` already
joins through it correctly; we mirror that join verbatim in
`requireAuthenticatedTenantUser`. The active-tenant pointer is
`app_users.active_tenant_id`, not a column on the membership row.

### 3.2 No per-channel CRM entitlements in the live `features` table

The prompt's helper signature included
`requireEntitlement?: 'email' | 'sms' | 'whatsapp' | 'voice'` and
`'ai_features'` from D03 §2. The live `features` table contains:

| code | category |
|---|---|
| `crm_base` | base |
| `marketing` | addon |
| `automations` | addon |
| `marketing_ab_testing` | nested_addon |
| `marketing_advanced_analytics` | nested_addon |
| `marketing_ai_send_time` | nested_addon |
| `marketing_email_warmup` | nested_addon |
| `marketing_heatmaps` | nested_addon |
| `marketing_sms` | nested_addon |
| `marketing_social` | nested_addon |
| `marketing_whatsapp` | nested_addon |

There is no `email`, `sms`, `whatsapp`, `voice`, or `ai_features` code.
Marketing-campaign add-ons (`marketing_sms`, `marketing_whatsapp`)
exist for marketing campaigns, but 1:1 outbound from a contact card is
part of `crm_base`, which every active CRM tenant has implicitly.

Additionally the test tenant has zero rows in `tenant_entitlements` —
gating on any feature code today would fail-closed and break every
existing send.

**Adaptation:** the helper supports `requireEntitlement` (with
fail-closed behaviour and full unit-test coverage), but the send
routes do **not** currently pass it. When a future phase seeds proper
channel entitlements (or migrates to a richer per-tenant feature flag
model), the gate can be wired in by adding `{ requireEntitlement: …}`
at the call site — no further helper changes needed. The route-level
tests still exercise the entitlement-rejection contract by mocking
the helper to throw `entitlement_missing`, so the route's error
mapping remains under regression coverage.

### 3.3 Existing rate limiter is reused, not reinvented

The prompt §2.3 said "use the existing rate limiter if it's complete,
otherwise an in-memory `Map`". The live `src/lib/rate-limiter.ts` is
production-ready (Redis sliding-window with in-memory fallback), so we
call `checkRateLimit({ identifier, maxRequests, windowMs })` directly.
The identifier is `outbound:<channel>:<tenantId>` so v1 and v2 share
the same counter per channel.

### 3.4 No category-3 server-internal HTTP callers existed

§1.3 of the prompt asks us to find servers that reach the send routes
via HTTP fetch and add a service-token bypass. Grep across `src/`
shows the only callers are six UI components (category 1, browser
session) and three server modules
(`engagement/campaign-engine.ts`,
`engagement/bot-service.ts`,
`queues/communication-queue.ts`) that import `dispatcher.ts`
directly (category 2, bypass HTTP). **No category-3 callers exist**,
so the service-token bypass was not added — keeping the helper
surface as small as possible.

### 3.5 `/api/emails/welcome` was left alone

§3.8 of the prompt said "don't break signup". `/api/emails/welcome`
has zero source callers in the codebase (no UI, no server code, no
trigger). Either it's unused or it's invoked by an environment-level
process not in this repo. Leaving it untouched per the explicit
"if unsure, leave alone" rule. Documented as a known gap below.

---

## 4. New TypeScript modules

### 4.1 `src/lib/auth/api-auth-helpers.ts` (new, 286 LOC)

Single shared module exporting:

- `OutboundChannel` type (`'email' | 'sms' | 'whatsapp' | 'voice'`).
- `AuthenticatedTenantUser` type
  (`{ userId, tenantId, email, role, entitlements }`).
- `AuthApiError` (`status: 401 | 403 | 429`, `code`, `message`).
- `requireAuthenticatedTenantUser(request, options?)` — full session +
  membership + (optional) entitlement check, returns the resolved
  user.
- `assertBodyTenantMatches(bodyTenantId, authenticatedTenantId)` —
  throws 403 `tenant_mismatch` on mismatch, no-ops on absent / null /
  empty.
- `enforceOutboundRateLimit(tenantId, channel)` — wraps
  `checkRateLimit` with the locked per-channel limits.
- `authErrorResponse(err)` — `AuthApiError` → standard JSON, anything
  else → 500 `internal_error` with `console.error` logging.

Internally `requireAuthenticatedTenantUser` delegates the membership
lookup to a private `resolveActiveTenantMembership` helper to keep its
cyclomatic complexity ≤ 8 (Lizard limit).

### 4.2 `src/lib/auth/__tests__/api-auth-helpers.test.ts` (new, 23 tests)

Mocks `getSupabaseAuthContext` and `checkRateLimit` to keep the suite
unit-pure. Covers:

- `AuthApiError`: status / code / message preservation.
- `requireAuthenticatedTenantUser`: 401 on no-session and getUser
  error, 403 `no_tenant` for missing app_users / membership, success
  with empty + populated entitlements, success when `requireEntitlement`
  is satisfied, 403 `entitlement_missing` when absent, fail-closed
  when entitlement table errors out.
- `assertBodyTenantMatches`: undefined / null / empty / matching
  / mismatching.
- `enforceOutboundRateLimit`: allowed / denied (429) / identifier and
  limit shape per channel / voice limit value.
- `authErrorResponse`: AuthApiError 401, AuthApiError 429, generic
  Error 500 + console.error, non-Error throwable 500.

### 4.3 Six route-level test files (new, 36 tests total)

One per modified outbound route, each running 6 cases:

1. No session → 401 `unauthenticated`.
2. Helper rejects with `entitlement_missing` → 403
   `entitlement_missing` (contract test for the route's error
   mapping; the route doesn't currently pass `requireEntitlement` —
   see §3.2).
3. Body `tenant_id` mismatch → 403 `tenant_mismatch`, dispatch never
   called.
4. Rate limit exceeded → 429 `rate_limit_exceeded`, dispatch never
   called.
5. Valid body with body `tenant_id` set → 200, dispatcher receives
   the **authenticated** tenant_id (defense in depth).
6. Valid body without body `tenant_id` → 200, dispatcher still
   receives the authenticated tenant_id.

Files:

- `src/app/api/communications/send-email/__tests__/route.test.ts`
- `src/app/api/communications/send-sms/__tests__/route.test.ts`
- `src/app/api/communications/send-sms-v2/__tests__/route.test.ts`
- `src/app/api/communications/send-whatsapp/__tests__/route.test.ts`
- `src/app/api/communications/send-whatsapp-v2/__tests__/route.test.ts`
- `src/app/api/communications/initiate-call/__tests__/route.test.ts`

---

## 5. Modified TypeScript modules

Each route follows the same shape: import the helpers, run
`requireAuthenticatedTenantUser` first, override body `tenant_id` to
the authenticated value, run `assertBodyTenantMatches` against
whatever the body claimed, run `enforceOutboundRateLimit`, and route
`AuthApiError` through `authErrorResponse` in the catch block. Send
logic itself is unchanged.

### 5.1 `src/app/api/communications/send-email/route.ts`
- L1–L11: imports + new helper imports.
- L57–L78: new auth/rate-limit/tenant-override prelude. Required-field
  validation no longer demands body `tenant_id` (it's always present
  after the override).
- L142–L153: catch block now short-circuits `AuthApiError` through
  `authErrorResponse` before falling back to the legacy 500-with-details
  contract for genuine send failures.
- Channel: `email`. Rate limit: 60/min.

### 5.2 `src/app/api/communications/send-sms/route.ts` (v1)
- Mirror of 5.1. Channel: `sms`. Rate limit: 30/min.
- L37–L60 prelude, L113–L122 catch block.

### 5.3 `src/app/api/communications/send-sms-v2/route.ts`
- L4–L17: helper imports.
- L33–L46: new private `authAndRateLimit` extracted to keep POST
  under the LOC lint limit. Returns the resolved auth user + the
  parsed body. Channel: `sms` (shares the per-tenant counter with v1).
- L62–L77: POST prelude now delegates to `authAndRateLimit`; tenant_id
  is overridden from `auth.tenantId`.
- L100–L108: catch block adds AuthApiError short-circuit.

### 5.4 `src/app/api/communications/send-whatsapp/route.ts` (v1)
- Mirror of 5.1. Channel: `whatsapp`. Rate limit: 30/min.

### 5.5 `src/app/api/communications/send-whatsapp-v2/route.ts`
- L4–L17: helper imports.
- L36–L93: extracted three private helpers
  (`authAndRateLimit`, `dispatchAndLogWhatsApp`,
  `logWhatsAppOutboundActivity`) so POST stays under the LOC lint
  limit. None of these change behaviour — they just relocate
  existing code.
- L93–L142: POST now delegates to those helpers.
- Channel: `whatsapp` (shares counter with v1). Rate limit: 30/min.

### 5.6 `src/app/api/communications/initiate-call/route.ts`
- L1–L11: imports + helper imports.
- L13–L33: new prelude. Channel: `voice`. Rate limit: 10/min.
- L60–L70: catch block updated.
- Voice is fully deferred per Toffee, but the auth issue is identical
  to the messaging routes; fixing it now is the same pattern. Send
  logic is otherwise unchanged.

### 5.7 `src/app/api/ai-assistant/draft-email/route.ts`
- L1–L13: helper imports.
- L15–L23: new prelude. `requireAuthenticatedTenantUser` only — no
  rate limit (drafting is not a send action). Body `tenantId` is
  asserted-and-overridden the same way.
- L132–L141: catch block routes `AuthApiError` first.

---

## 6. What was deleted

- `src/app/api/emails/test/route.ts` — the development test-email
  endpoint (Option A per prompt §3.7). It accepted any `to` and sent
  a hard-coded "Email System Working!" message under the service-role
  email client. Zero source callers; pure spam vector if discovered.
- The (now-empty) `src/app/api/emails/test/` directory was also
  removed.

The `/api/emails/test` URL now returns 404 from Vercel.

---

## 7. Server-internal callers found and how they were handled

Per §1.3 of the prompt:

| Caller | Category | How affected |
|---|---|---|
| `src/lib/engagement/campaign-engine.ts` | 2 (direct dispatcher import) | Unaffected; bypasses HTTP. |
| `src/lib/engagement/bot-service.ts` | 2 | Unaffected. |
| `src/lib/queues/communication-queue.ts` | 2 | Unaffected. |
| `src/components/communications/email-composer-panel.tsx` | 1 (UI, browser session) | Inherits session cookie; works as-is. |
| `src/components/communications/sms-composer-panel.tsx` | 1 | Same. |
| `src/components/communications/whatsapp-composer-panel.tsx` | 1 | Same. |
| `src/components/communications/click-to-call-dialer.tsx` | 1 | Same. |
| `src/components/communications/bulk-send-panel.tsx` | 1 | Bulk fans out to `send-email`/`send-sms` in a loop; each call inherits the session cookie and counts individually against the per-channel limit. |
| `src/components/communications/activity-detail-slide-in.tsx` | 1 | Same. |

**No category-3 callers were found.** The service-token bypass
mechanism described in prompt §1.3 was therefore not added.

---

## 8. Tests

### 8.1 New tests added in this phase

- 23 unit tests in `src/lib/auth/__tests__/api-auth-helpers.test.ts`.
- 6 × 6 = 36 route-level tests across the six modified outbound
  routes.
- **Total new: 59 tests.**

### 8.2 Pre-existing regression results

Running `npx jest src/lib src/app/api` against the pre-change baseline
(via `git stash`) reproduces the same failure profile post-change: 7
failed test files, 9 failed tests, all inside
`src/lib/marketing-audit/__tests__/`. These are pre-existing failures
unrelated to outbound communications; they fail on `practice.domain`
of an `undefined` `practice` object, which is a fixture/orchestrator
issue introduced before this phase. Out of scope for 2b.5.

### 8.3 Phase-scoped test run (prompt §6.1 command)

```
$ npx jest src/lib/auth src/app/api/communications src/app/api/emails src/app/api/ai-assistant
Test Suites: 7 passed, 7 total
Tests:       59 passed, 59 total
```

All green.

---

## 9. Validation results

### 9.1 Automated (pre-push)

- Helper tests: 23/23 ✅
- Route tests: 36/36 ✅
- ReadLints on every modified file: clean except for two **pre-existing**
  Lizard cyclomatic-complexity warnings on
  `extractSMSPurpose` (CC=12) and `extractWhatsAppPurpose` (CC=14) —
  both untouched in this phase per the explicit "Don't refactor"
  scope rule, both predate 2b.5.

### 9.2 Post-deploy curl checks (run against `dental-crm-nine.vercel.app`)

```
/api/communications/send-email     -> 401  ✅
/api/communications/send-sms       -> 401  ✅
/api/communications/send-sms-v2    -> 401  ✅
/api/communications/send-whatsapp  -> 401  ✅
/api/communications/send-whatsapp-v2 -> 401  ✅
/api/communications/initiate-call  -> 401  ✅
/api/emails/test                   -> 404  ✅ (deleted)
/api/webhooks/sms (GET)            -> 200  ✅ (regression)
/api/webhooks/sms (POST, no sig)   -> 401  ✅ (regression — 2b.4 behaviour)
```

Sample 401 body shape (verifying the contract):

```json
{"error":"unauthenticated","message":"Login required"}
```

All curl checks green.

#### 9.2.a SWC build fix-up

Initial deploy (commit `ad432f3`) failed because the new
`const requestBody = await request.json()` in
`src/app/api/ai-assistant/draft-email/route.ts` was originally written
as `const body = ...`, which clashed with a later
`const body = aiDraft.replace(...)` in the same function. ts-jest's
TypeScript shadowed the binding silently; SWC's strict block scoping
in production rejected it ("`body` redefined here"). Fix-up commit
`607e390` renamed the helper-prelude local to `requestBody` —
3-line change, no behavioural impact.

### 9.3 Operator gate

Pending. Operator runs the §6.2 manual smoke test (negative
unauthenticated curl, positive logged-in email send, positive
logged-in SMS send) and replies with three ✅s. Change-log update
follows.

---

## 10. Operational gotchas + onboarding runbook updates

### 10.1 `dental-crm/docs/operational-gotchas.md`

Appended a new entry: **"Outbound send routes are tenant-scoped to the
authenticated user"**. Captures the rule, the symptom of forgetting
(internal HTTP callers get 401 — solution: call `dispatcher.ts`
directly), the per-channel rate limits, and the hard "don't re-add
body `tenant_id` reading" rule.

### 10.2 `dental-crm/docs/onboarding/practice-onboarding-runbook.md`

- Removed the "outbound SMS UI has no auth gate" caveat from §9b.6
  (now closed).
- Added a new §9c **"Outbound communications channels (Phase 2b.5)"**
  documenting the per-channel rate limits and the
  authenticated-tenant rule for support / onboarding context.

---

## 11. Out of scope (deferred)

Mirrors the top-of-doc list, expanded:

- **Provider consolidation.** SendGrid / Resend / AWS SES coexistence
  stays as-is. Phase 2b.7+.
- **v1 vs v2 send-route deletion.** Both still live. Phase 2b.7+.
- **Threading / Reply-To tokens / conversation UI.** Phase 2b.7+.
- **Refactoring `dispatcher.ts`.** Read-only this phase.
- **Inbound channel work.** WhatsApp / SMS / forms / Google Lead Form
  done in earlier 2b phases.
- **Email inbound infrastructure.** Deferred until domain purchase.
- **`/api/webhooks/email` delivery-events webhook.** Different P0,
  separate phase.
- **`/api/emails/welcome`.** Verified unused in source. Left
  untouched per the "don't break signup" rule. Worth a brief audit in
  a future phase to confirm whether to delete or gate.
- **WhatsApp Business sender registration.** Operational, not code.
- **Settings UI for outbound channel config.** Phase 2b.7+ or wizard.
- **Cost tracking / budget caps.** F05 §6, separate phase.
- **Channel-level entitlement enforcement.** Helper supports it; live
  schema doesn't have channel codes. Wire when the entitlement
  schema lands. See §3.2.

---

## 12. Open questions for next phase

- **Should marketing campaigns (which fan out via the dispatcher and
  the queue) also be rate-limited?** Today they bypass the HTTP
  routes. The per-channel cap was deliberately scoped to the HTTP
  routes since that's the only attack surface a tenant UUID alone can
  trigger. If a future phase adds cost tracking, the cap probably
  wants to move into `dispatcher.ts` or a per-tenant budget gate.
- **Should the `requireEntitlement` plumbing be wired immediately
  once the entitlement schema lands?** This phase's helper supports
  it but doesn't pass it. Consensus needed on whether base CRM
  outbound (1:1 from a contact card) should be gated separately from
  marketing-campaign outbound, or whether both should share a single
  base entitlement.
- **`/api/emails/welcome` provenance.** No source callers, no env-var
  references, no cron job. Either an unused dev artifact or invoked
  by an external system not in the repo. A 5-minute archaeology pass
  would resolve this.
- **Codacy CLI ESLint config.** The CLI's bundled ESLint can't parse
  TypeScript `import type` syntax, producing a false-positive
  parse error on every TS file (including pre-existing untouched
  ones like `src/lib/api/auth.ts`). Tooling fix needed in the
  workspace `.codacy/` config; not a code defect.
