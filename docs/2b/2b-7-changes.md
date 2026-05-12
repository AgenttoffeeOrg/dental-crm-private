# Phase 2b.7 — Settings auth + dead-code purge: change log

**Scope:** close audit P0 #1–#3, P1 #9, and P2 #24/#25 from
`docs/audits/outbound_audit.md`. Three settings PATCH routes
(`/api/settings/email`, `/sms`, `/whatsapp`) were previously
unauthenticated and accepted body `tenant_id` as the WHERE filter,
making credential rotation possible from any anonymous caller who knew
a tenant UUID (which is essentially public per F03). Two v2 send
routes, one public welcome route, and two dead lib modules were also
removed. A render crash in `<BulkSendPanel>` (missing shadcn `Avatar`
imports) was fixed.

**Out of scope (deferred — copied verbatim from prompt §0.2):**

- `src/components/settings/email-config-tab.tsx`,
  `sms-config-tab.tsx`, `whatsapp-config-tab.tsx`. The legacy tab UIs
  are flagged for deletion in **2b.8**, not here. Left on disk and in
  the settings nav.
- `src/components/settings/communications-integrations-tab.tsx`. The
  working tab; out of scope.
- `src/lib/auth/api-auth-helpers.ts`. The 2b.5 helper. Consumed only —
  not modified. No parallel auth helpers.
- `src/lib/communications/dispatcher.ts`. Read-only this phase.
  Dispatcher correctness is 2b.9.
- `src/lib/email-service.ts` and `src/lib/services/email-service.ts`.
  System-email module merge is 2b.10.
- `activity-detail-modal.tsx` and `activity-detail-slide-in.tsx`.
  Activity-feed correctness is 2b.9.
- `<TemplatesManager>`. Pull-from-nav is 2b.9.
- Any schema migration. The 19-column `tenants` cleanup is scheduled
  in 2b.8, not run.
- All P1 #10/#12/#13/#14, all P2 except #24/#25, all P3.

**Branch baseline:** `phase-1-attribution-foundation`, on top of 2b.5
(auth helper) and 2b.6 (outbound audit, docs-only). HEAD before 2b.7:
`3ab71a1`.
**Date applied:** 2026-05-12.
**Test tenant exercised:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf`
("Deepak's Dental Practice"); operator user
`deepakshegde@gmail.com` (`role=owner`, `status=active`).
**Production deploy target:** https://dental-crm-nine.vercel.app
(`dpl_FnRANvcwFeQXNvceW7NA4VRJ2CxH`, READY).

---

## 1. Summary

Pre-2b.7, the three settings PATCH routes pulled `tenant_id` straight
from the request body, then used it as the WHERE filter against
`tenants.update(...)` under a service-role client. There was no auth,
no rate cap, no session check. Any caller with knowledge of any tenant
UUID could rotate that tenant's SMTP password, SMS API key, or
WhatsApp credentials at will. Three other dead routes
(`/api/emails/welcome`, `/api/communications/send-sms-v2`,
`/api/communications/send-whatsapp-v2`) and two unused lib modules
(`lib/email-queue.ts`, `lib/marketing/sms-provider.ts`) had been
flagged in the 2b.6 audit and were removed. A render crash in
`<BulkSendPanel>` (missing `<Avatar>`/`<AvatarFallback>` imports) was
fixed by adding the shadcn `avatar` import.

| # | Pre-2b.7 defect | Audit ref | Fix |
|---|---|---|---|
| 1 | `PATCH /api/settings/email` was unauthenticated; WHERE filter came from body `tenant_id`. | P0 #1 / §7.2 | Wrapped through `requireAuthenticatedTenantUser` + `assertBodyTenantMatches`. WHERE pinned to `auth.tenantId`. |
| 2 | `PATCH /api/settings/sms` — same shape, same defect. | P0 #1 / §7.3 | Same wrapping. WHERE pinned to `auth.tenantId`. |
| 3 | `PATCH /api/settings/whatsapp` — same shape, same defect. | P0 #1 / §7.4 | Same wrapping. WHERE pinned to `auth.tenantId`. Inbound WhatsApp routing still reads `tenants.whatsapp_phone_number` (unchanged); only the rotation path is now gated. |
| 4 | `POST /api/emails/welcome` — public, unauthenticated, fired a real Resend `sendWelcome`. Spam vector. | P0 #2 / §4.7 | Deleted (zero source callers; archaeology pass below). |
| 5 | `<BulkSendPanel>` referenced `<Avatar>`/`<AvatarFallback>` without importing them; React rendered an error overlay. | P0 #3 / §1.1 | Added `import { Avatar, AvatarFallback } from '@/components/ui/avatar'`. No other changes to the file. |
| 6 | `POST /api/communications/send-sms-v2` and `/send-whatsapp-v2` bypassed the dispatcher and the canonical credential resolver; zero source callers. | P1 #9 / §4.5–4.6 | Deleted (including each route's `__tests__/` directory). |
| 7 | `src/lib/email-queue.ts` (273 LOC) and `src/lib/marketing/sms-provider.ts` (195 LOC) — both unused, both flagged. | P2 #24, P2 #25 / §13 | Deleted. `email_logs` table preserved (drop scheduled for 2b.8 migration sweep). |

---

## 2. Schema migration

**None.** No DB changes were applied or required.

The `email_logs` table that `lib/email-queue.ts` used to write to is
intentionally **not** dropped in 2b.7. It is scheduled for the 2b.8
migration sweep alongside the 19-column `tenants` cleanup.

---

## 3. Adaptations from prompt → live shape

### 3.1 Path B selected (service-role + pinned WHERE), not Path A (session client + RLS)

Per prompt §1.5, the pre-flight RLS audit returned:

| polname | polcmd | description |
|---|---|---|
| `Service role can manage tenants` | `*` | `auth.role() = 'service_role'` |
| `Users can view their own tenant` | `r` (SELECT) | `id = get_user_tenant_id()` |

There is no UPDATE policy for authenticated users on `tenants`. The
only UPDATE path is the service-role bypass. **Path B was therefore
the only viable choice.** Each new settings route:

1. Resolves the authenticated tenantId via the 2b.5 helper.
2. Uses `createServiceClient()` (existing `lib/supabase-server.ts`).
3. Pins the WHERE to `auth.tenantId` — never reads it from the body
   for the DB write.

This is called out explicitly in each route's leading doc comment.

### 3.2 No required-field validation added (per prompt §2.1 step 5)

The pre-2b.7 routes had one required-field check each: `tenant_id`.
That check is now obsolete (tenant comes from auth, not body), so it
was removed. Per the prompt, **no new validation** was introduced.
This means a malformed body (e.g. missing `smtp_host`) will reach
Supabase and be rejected by NOT NULL constraints if any exist —
exactly the pre-2b.7 contract for non-`tenant_id` fields. The legacy
config tabs being deleted in 2b.8 means this is short-lived noise.

### 3.3 `_ignoredBodyTenantId` destructure dropped in favour of "do not destructure"

The prompt's §2.1 step 4 template suggested
`const { tenant_id: _ignoredBodyTenantId, ...settings } = payload`. In
practice the project's ESLint config (`next/typescript` flat config)
does not have an `argsIgnorePattern` for unused vars, so
`_ignoredBodyTenantId` triggers `@typescript-eslint/no-unused-vars`.
The route was reworked to **just not destructure tenant_id at all**;
the body's value is never used. A comment in each route makes the
intent explicit:

```ts
// Body `tenant_id` is intentionally NOT destructured: we pin the
// WHERE to auth.tenantId below; the body's value is never the
// source of truth for the DB write.
```

`assertBodyTenantMatches(payload?.tenant_id, auth.tenantId)` still
runs the mismatch check on the raw `payload?.tenant_id` access before
destructuring, so the defense-in-depth contract is preserved.

### 3.4 Empty `src/app/api/emails/` directory left in place

Per prompt §3.3 ("If the parent dir is now empty, leave it. Next.js
doesn't require its removal."), the empty directory was not removed.
Git does not track empty directories, so this is invisible in
`git status` and the commit anyway.

### 3.5 No colocated tests existed for `email-queue` or `sms-provider`

The prompt's §6.2 cleanup script defensively removed
`src/lib/__tests__/email-queue*.test.ts` and
`src/lib/marketing/__tests__/sms-provider*.test.ts`. Neither path
existed; the rm calls no-op'd. The two lib files had no tests at all,
so no test cleanup was required.

### 3.6 `npm run lint` is interactive; ESLint invoked directly

`next lint` (the script wired to `npm run lint`) prompts interactively
for ESLint config setup because Next.js 14 doesn't recognise the
project's flat-config `eslint.config.mjs`. ESLint was invoked directly
(`npx eslint src/app/api/settings ...`) for the validation pass. This
is a pre-existing project annoyance — not introduced in 2b.7. Codacy
CLI's ESLint also runs cleanly via the MCP server. The lint score for
modified files is captured in §10 below.

---

## 4. New TypeScript modules

Three route-level test files. Mirrors 2b.5's
`send-email/__tests__/route.test.ts` shape minus the 429 rate-limit
case (settings routes are not rate-limited per locked decision §0.3).

| File | LOC | Cases |
|---|---|---|
| `src/app/api/settings/email/__tests__/route.test.ts` | 134 | 5 |
| `src/app/api/settings/sms/__tests__/route.test.ts` | 132 | 5 |
| `src/app/api/settings/whatsapp/__tests__/route.test.ts` | 131 | 5 |

Each file covers:

1. No session → 401 `unauthenticated`; `mockUpdate` not called.
2. Entitlement missing → 403 `entitlement_missing`; `mockUpdate` not
   called. (Contract test — the settings routes don't pass
   `requireEntitlement`, but the catch-block's
   `authErrorResponse` mapping must handle any `AuthApiError`
   generically.)
3. Body `tenant_id` mismatch → 403 `tenant_mismatch`; `mockUpdate`
   not called.
4. Valid body, body `tenant_id` matches → 200; verify
   `.update(...)` was called once, `.eq('id', AUTH_TENANT)` was
   called with the **authenticated** tenant ID (never the body),
   and the update payload does not carry `tenant_id`.
5. Valid body, no `tenant_id` in body → 200; same `.eq('id',
   AUTH_TENANT)` verification.

Total: **15 new tests, all green.**

---

## 5. Modified TypeScript modules

### 5.1 `src/app/api/settings/email/route.ts` (was 53 LOC → now 88 LOC)

- L1–L9: new imports (`type NextRequest`, `NextResponse`, four
  helper exports, `createServiceClient`).
- L11–L21: leading doc comment explaining the auth gate + Path B
  rationale.
- L22–L48: new PATCH prelude — `requireAuthenticatedTenantUser`,
  body parsed as `payload` (not `body`, per SWC strict
  block-scoping trap captured in 2b.5 §9.2.a),
  `assertBodyTenantMatches`, then a non-destructuring of the body
  to pull only the persisted fields.
- L50–L68: `tenants.update(...).eq('id', auth.tenantId).select().single()`
  — the WHERE is the authenticated tenantId, never the body.
- L70–L87: catch block. `AuthApiError` → `authErrorResponse`;
  everything else → 500 `internal_error`.

### 5.2 `src/app/api/settings/sms/route.ts` (was 38 LOC → now 73 LOC)

Same shape as email. Channel-specific delta: writes
`sms_provider`, `sms_api_key`, `sms_api_secret`, `sms_from_number`.

### 5.3 `src/app/api/settings/whatsapp/route.ts` (was 36 LOC → now 76 LOC)

Same shape as email. Channel-specific delta: writes
`whatsapp_phone_number`, `whatsapp_api_key`,
`whatsapp_api_secret`. Leading doc comment explicitly calls out the
inbound-read gotcha (audit §7.4): the same column is read by the
inbound WhatsApp routing logic; the auth fix doesn't change that read
path, it just prevents anonymous attackers from rotating the number
out from under inbound delivery.

### 5.4 `src/components/communications/bulk-send-panel.tsx` (was 238 LOC → now 239 LOC)

- L12: added
  `import { Avatar, AvatarFallback } from '@/components/ui/avatar'`.

No other changes. Per locked decision §0.3, the silent rate-limit
truncation at >60 contacts was **not** fixed — that ships in a later
phase. Per prompt §4.4, the existing Lizard warning on the file's
component body (`Method *global*` NLOC 56, CCN 9) is pre-existing and
left untouched. The `useTenantContext` and `error` unused-vars ESLint
errors are likewise pre-existing.

---

## 6. What was deleted

| Path | LOC | Why |
|---|---|---|
| `src/app/api/emails/welcome/route.ts` | 27 | Public spam vector; zero source callers. Audit P0 #2. |
| `src/app/api/communications/send-sms-v2/route.ts` | 121 | Bypasses dispatcher + canonical credential resolver; zero callers. Audit P1 #9. |
| `src/app/api/communications/send-sms-v2/__tests__/route.test.ts` | 132 | Test file colocated with the deleted route. |
| `src/app/api/communications/send-whatsapp-v2/route.ts` | 175 | Same as send-sms-v2. Audit P1 #9. |
| `src/app/api/communications/send-whatsapp-v2/__tests__/route.test.ts` | 153 | Test file colocated with the deleted route. |
| `src/lib/email-queue.ts` | 273 | Unused (zero source callers); writes to `email_logs` table which survives. Audit P2 #24. |
| `src/lib/marketing/sms-provider.ts` | 195 | Unused (zero callers at the outbound layer). Audit P2 #25. |

**Total: 7 files, 1,076 LOC removed.**

Empty parent directory `src/app/api/emails/` left in place per prompt
§3.3.

---

## 7. Server-internal callers found and how they were handled

All four grep batches in pre-flight §1.6 returned zero hits. Final
re-grep in §6.1 (after the routes had been modified) also returned
zero. The deletions are safe.

| File | grep result | Action |
|---|---|---|
| `/api/emails/welcome` | Zero in `src/`. Doc-only mentions in `docs/audits/outbound_audit.md` and `docs/2b/2b-5-changes.md`. | Deleted. |
| `send-sms-v2` | Zero. | Deleted. |
| `send-whatsapp-v2` | Zero. | Deleted. |
| `email-queue` | Zero in `src/` outside the file itself. | Deleted. |
| `marketing/sms-provider` | Zero in `src/` outside the file itself. | Deleted. |

### Welcome route archaeology (prompt §1.7)

Git history:

```
65a48d1 Production ready v1.0.0 - Auth fixes, email verification banner, comprehensive audit complete
33db1ad Complete enterprise CRM with super admin system - All features included
```

Two historical commits, both predating Phase 2b. No env-var references
to the route path. No `vercel.json` cron config. No webhook config.
The `comprehensive_seed.ts` reference to "welcome emails" is for a
marketing-template seed description, not the route.

Conclusion: no live or historical caller exists. The library method
`emailService.sendWelcome` survives at `src/lib/email-service.ts:127`
but is now itself dead at the library level — 2b.10 will reconcile the
system-email modules.

`sendWelcome` library symbol survival is acceptable per prompt §3.3.

---

## 8. Tests

### 8.1 New tests

15 new tests across three files (5 per settings route). All green:

```
PASS src/app/api/settings/email/__tests__/route.test.ts
PASS src/app/api/settings/sms/__tests__/route.test.ts
PASS src/app/api/settings/whatsapp/__tests__/route.test.ts
```

### 8.2 Regression — existing 2b.5 tests still green

```
PASS src/lib/auth/__tests__/api-auth-helpers.test.ts (23 cases)
PASS src/app/api/communications/send-email/__tests__/route.test.ts
PASS src/app/api/communications/send-sms/__tests__/route.test.ts
PASS src/app/api/communications/send-whatsapp/__tests__/route.test.ts
PASS src/app/api/communications/initiate-call/__tests__/route.test.ts
PASS src/app/api/settings/treatment-offerings/__tests__/treatment-offerings.test.ts

Test Suites: 9 passed, 9 total
Tests:       82 passed, 82 total
```

Scope: `npx jest src/lib/auth src/app/api/settings src/app/api/communications src/app/api/emails`.

### 8.3 Pre-existing regression profile unchanged

`src/lib/marketing-audit/__tests__/` continues to report **7 failed
test files, 9 failed tests** — the same profile captured in 2b.5 §8.2.
The dominant failure mode is still the
`TypeError: Cannot read properties of undefined (reading 'domain')` in
`audit-orchestrator.ts:59` on an `undefined` `practice` fixture. Out
of scope for 2b.7; will be addressed in a fixture-cleanup phase.

---

## 9. What you have to do operationally

### 9.1 Husky hook fired cleanly

```
[2026-05-12T16:19:09Z] git pre-push hook triggered
  branch  : phase-1-attribution-foundation
  sha     : d355aa2
  note    : sleeping 12s before deploy to let push complete
```

Deploy ID: `dpl_FnRANvcwFeQXNvceW7NA4VRJ2CxH`. State: READY. Aliased
to `https://dental-crm-nine.vercel.app`. No manual `npm run deploy:prod`
fallback needed.

### 9.2 Post-deploy curl smoke — all eight passed

| Endpoint | Method | Status | Body |
|---|---|---|---|
| `/api/settings/email` | PATCH (anon) | 401 | `{"error":"unauthenticated","message":"Login required"}` |
| `/api/settings/sms` | PATCH (anon) | 401 | `{"error":"unauthenticated","message":"Login required"}` |
| `/api/settings/whatsapp` | PATCH (anon) | 401 | `{"error":"unauthenticated","message":"Login required"}` |
| `/api/emails/welcome` | POST | 404 | Next.js HTML 404 page (`<title>Dental CRM - Practice Management Platform</title>`, "Page Not Found" body) |
| `/api/communications/send-sms-v2` | POST | 404 | Next.js HTML 404 page |
| `/api/communications/send-whatsapp-v2` | POST | 404 | Next.js HTML 404 page |
| `/api/webhooks/sms` | GET | 200 | `{"status":"ready","endpoint":"sms-webhook","version":"phase-2b.4"}` (2b.4 regression check) |
| `/api/communications/send-email` | POST (anon) | 401 | `{"error":"unauthenticated","message":"Login required"}` (2b.5 regression check) |

### 9.3 Read-only DB checks

Test tenant credential state post-deploy
(`5aadca14-9786-4aef-bc53-e9287cdd0bbf`):

```json
{
  "id": "5aadca14-9786-4aef-bc53-e9287cdd0bbf",
  "smtp_host": null,
  "smtp_username": null,
  "sms_provider": null,
  "sms_from_number": null,
  "whatsapp_phone_number": "+14155238886"
}
```

`whatsapp_phone_number` is the Twilio sandbox number (matches audit
Appendix A.1). All other fields null — clean. No anonymous rotation
occurred during the audit → 2b.7 window.

`tenants` RLS policy state (informational):

| polname | polcmd |
|---|---|
| `Service role can manage tenants` | `*` (ALL) |
| `Users can view their own tenant` | `r` (SELECT) |

Unchanged from pre-flight §1.5. Service-role-only writes; SELECT
filtered by `get_user_tenant_id()`. No UPDATE policy for authenticated
users — Path B (service-role + pinned WHERE) is the only viable
choice.

---

## 10. Validation results

| Tool | Scope | Result |
|---|---|---|
| `npx jest src/lib/auth src/app/api/settings src/app/api/communications src/app/api/emails` | 9 suites, 82 tests | All green. 15 new tests + 67 pre-existing all pass. |
| `npx tsc --noEmit` | Whole project | Clean on all files modified in 2b.7. Pre-existing TS errors in unrelated files (`tests/e2e/*`, `tests/integration/*`, `tools/*`, `src/app/api/activities/*`, `src/app/api/ai-assistant/*`, etc.) — same profile as pre-2b.7. |
| `npx eslint src/app/api/settings src/app/api/communications src/components/communications/bulk-send-panel.tsx` | Modified scope | Clean on all 2b.7-touched files. Pre-existing errors in `src/app/api/settings/treatment-offerings/` (unrelated, untouched). |
| Codacy CLI (ESLint, Trivy, Opengrep, Lizard) | All 2b.7-touched files | Clean. Pre-existing Lizard warnings on `bulk-send-panel.tsx` *global* body (NLOC 56, CCN 9) preserved per prompt §4.4. |
| `npm run build` | Whole project | Clean. SWC strict-block-scoping check passed — no `body`/`payload` redeclaration trap. |
| Post-deploy curl smoke (§9.2) | 8 endpoints | All 8 expected status codes confirmed. |
| Operator gate (browser-based, §11) | 5 checks | **Pending Toffee.** Handoff below. |

---

## 11. Operator gate — pending Toffee

These five browser-based checks are not optional. Each must come back
✅ before 2b.7 is marked complete. Cursor cannot run them.

1. **Settings → Email Configuration tab** (legacy `<EmailConfigTab>`):
   open it logged in as `deepakshegde@gmail.com`. Confirm the tab
   loads, shows current values, and a "Save" attempt succeeds with a
   green toast. (The data being saved is still functionally pointless
   — the dispatcher doesn't read these columns — but the *auth* fix
   means the save no longer accepts anonymous requests. 2b.8 deletes
   this tab entirely.)
2. **Settings → SMS Configuration tab**: same shape. Loads, saves,
   toast green.
3. **Settings → WhatsApp Configuration tab**: same shape. Loads,
   saves, toast green.
4. **Open the page that hosts `<BulkSendPanel>`**: the panel is
   surfaced from the contacts list — select multiple contacts and
   trigger the bulk-send action (Email or SMS button on the
   multi-select toolbar). Confirm the panel renders without a React
   error overlay and shows the contact-selection UI with each
   contact's avatar circle. **Do not actually click Send.**
5. **Log out, then attempt `PATCH /api/settings/email`** from the
   browser DevTools console with `fetch` and no cookie. Confirm 401.
   (Belt-and-braces alongside the curl in §9.2.)

If any check fails: do not mark 2b.7 complete; surface to Toffee.

---

## 12. Out of scope (deferred)

Copied verbatim from prompt §0.2 — see top of this doc under "Out of
scope (deferred)". Summary:

- Legacy settings tabs (`email-config-tab`, `sms-config-tab`,
  `whatsapp-config-tab`) deletion → 2b.8.
- `<TemplatesManager>` pull-from-nav → 2b.9.
- Activity-feed correctness → 2b.9.
- Dispatcher correctness audit → 2b.9.
- System-email module merge → 2b.10.
- 19-column `tenants` cleanup migration + `email_logs` drop → 2b.8
  schema sweep.
- Bulk-send rate-limit-at->60-contacts truncation → later phase
  (locked decision §0.3).

---

## 13. Open questions for next phase (2b.8)

1. **Should `<EmailConfigTab>`, `<SMSConfigTab>`, `<WhatsAppConfigTab>`
   be deleted from the settings sidebar in 2b.8 (recommendation: yes),
   or rewired to write to `integration_settings` columns the
   dispatcher actually reads?** The 2b.7 auth fix made these tabs
   *safe* (no anonymous rotation) but they remain *functionally
   pointless* — the columns they write are not read by the
   dispatcher. Trade-off was sketched in audit §11 P0 #4 / §14 #1.
   Recommendation: delete the tabs, surface a clear "configure via
   `<CommunicationsIntegrationsTab>`" pointer in the legacy nav slot
   for one release, then drop the slot entirely.
2. **Schedule the 19-column `tenants` cleanup migration.** The columns
   no longer have any UI write path once 2b.8 deletes the tabs. The
   `email_logs` table can be dropped in the same migration sweep.
   Recommendation: do this in 2b.8 as a single squashed migration —
   one rollback unit.
3. **Outbound email provider consolidation.** SendGrid / Resend / AWS
   SES still coexist (2b.5 §3.4 captured this). 2b.7 didn't touch it;
   2b.8 should at minimum decide which is the canonical sender and
   document the others as fallbacks-only.
