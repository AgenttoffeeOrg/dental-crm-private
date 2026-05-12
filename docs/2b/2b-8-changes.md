# Phase 2b.8 — Settings UI rationalisation: change log

**Scope:** close audit P0 #4 (`outbound_audit.md` §11) and the 2b.7 §13
open questions #1, #2, and #4. The three legacy single-channel settings
tabs (`<EmailConfigTab>`, `<SMSConfigTab>`, `<WhatsAppConfigTab>`) and
their three auth-gated-but-functionally-pointless PATCH routes were
deleted alongside the orphaned `<BulkSendPanel>` component. The
canonical `<CommunicationsIntegrationsTab>` was wired into the live
Settings nav (it was previously only mounted in the unused
`settings-tabs-v2.tsx`). A squashed migration that drops the legacy
plain-text outbound columns on `tenants` and the orphaned `email_logs`
table was authored under `docs/2b/migrations-pending/` but **not
applied** — it lives in a docs-only path so `supabase db push` cannot
pick it up by accident.

**Branch baseline:** `phase-1-attribution-foundation`, on top of 2b.7
(settings auth + dead-code purge). HEAD before 2b.8: `0e65076`
(`docs(2b.7): mark operator gate fully resolved (3 ✅ + 1 N/A + 1
skipped)`).
**Date applied:** 2026-05-12.
**Test tenant exercised:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf`
("Deepak's Dental Practice"); operator user
`deepakshegde@gmail.com` (`role=owner`, `status=active`).
**Production deploy target:** https://dental-crm-nine.vercel.app
(`dpl_E527iwXBAxfayTddMpc8UkirKbhA`, READY).

---

## 1. Summary

Pre-2b.8, three legacy Settings sub-tabs in the Communications section
(`<EmailConfigTab>`, `<SMSConfigTab>`, `<WhatsAppConfigTab>`) were
auth-safe (per 2b.7) but functionally pointless: they wrote to
plain-text columns on the `tenants` table (`smtp_host`, `sms_api_key`,
`whatsapp_api_secret`, etc.) that the dispatcher does not read. The
dispatcher reads from `integration_settings` /
`integration_channel_settings` / vault, populated by the canonical
`<CommunicationsIntegrationsTab>`. Additionally,
`<BulkSendPanel>` was orphaned dead code (zero `src/` callers, per
2b.7 §3.7).

This phase deletes all five surfaces and the three colocated route-test
files, removes their nav entries from `settings-tabs.tsx` and
`settings-tabs-v2.tsx`, and replaces the three legacy Communications
sub-tabs in the live nav with one consolidated "Integrations" sub-tab
that mounts `<CommunicationsIntegrationsTab>` (the canonical surface).
The 19-column schema cleanup migration (14 dropped + 5 preserved) and
the `email_logs` table drop are authored but **not applied**; they
live in `docs/2b/migrations-pending/`.

| # | Pre-2b.8 state | Audit ref | Action |
|---|---|---|---|
| 1 | `<EmailConfigTab>` / `<SMSConfigTab>` / `<WhatsAppConfigTab>` wrote to plain-text columns the dispatcher does not read. | P0 #4 / §7.2–7.4 | Component files deleted. |
| 2 | `PATCH /api/settings/{email,sms,whatsapp}` routes (auth-gated in 2b.7) had only the three deleted tabs as callers. | P0 #4 / §7.2–7.4 | Route files + colocated `__tests__/route.test.ts` deleted. Empty parent dirs removed. |
| 3 | `<BulkSendPanel>` was orphaned (zero `src/` callers per 2b.7 §3.7). | 2b.7 §13 #4 | File deleted. |
| 4 | 14 legacy outbound credential columns on `tenants` + `email_logs` table had no surviving writers after 2b.7 / 2b.8. | §13 #2 | Squashed migration + rollback companion authored under `docs/2b/migrations-pending/`, **not applied**. |
| 5 | `<CommunicationsIntegrationsTab>` was canonical but **not mounted** in the live `settings-tabs.tsx` — only in the unused v2 file. | discovered in pre-flight | Added a "Communications → Integrations" sub-tab in the live nav that mounts the canonical component. |

---

## 2. Schema migration

**Authored, NOT applied.** The migration drops 14 confirmed-dead columns
on `tenants` and the orphaned `email_logs` table. Files:

- `dental-crm/docs/2b/migrations-pending/20260512_phase_2b_8_drop_legacy_outbound_columns.sql`
- `dental-crm/docs/2b/migrations-pending/20260512_phase_2b_8_drop_legacy_outbound_columns_rollback.sql`
- `dental-crm/docs/2b/migrations-pending/README.md`

The `migrations-pending/` directory is deliberately separate from
`dental-crm/supabase/migrations/` so the standard apply path
(`supabase db push`, MCP `apply_migration`) cannot pick the file up
before the planner-approved follow-up phase moves it across with a
fresh timestamp. This containment is documented in the README and
appended to `operational-gotchas.md`.

The migration is **not** scoped to also drop the per-tenant
inbound routing identifiers (`sms_phone_number`,
`whatsapp_phone_number`) per the locked decision in the prompt §0.4 and
the audit §7.1 / §7.4 — those columns drive inbound webhook tenant
resolution and must survive any outbound cleanup. They are explicitly
called out as preserved in the migration file's header and the
post-apply check verifies their count is exactly 2.

The migration is also **not** scoped to drop the tenant-contact email
columns (`email`, `email_main`, `email_support`); the §2.1
classification finding below confirms those have surviving callers.

---

## 3. Adaptations from prompt → live shape

### 3.1 `<CommunicationsIntegrationsTab>` was not mounted in the live nav before 2b.8

The prompt §0.4 stated:

> CommunicationsIntegrationsTab is canonical. It writes to
> integration_settings which the dispatcher reads. No code changes
> to this component in 2b.8.

The §10.2 operator gate then required the operator to "Open Settings →
Communications Integrations (or wherever `<CommunicationsIntegrationsTab>`
is mounted post-rationalisation)" — implying a live mount exists.

Pre-flight §1.6 found:

```
$ grep -rn "CommunicationsIntegrationsTab" src/ \
    --include="*.tsx" --include="*.ts"

src/components/settings/settings-tabs-v2.tsx:65  import { CommunicationsIntegrationsTab } from './communications-integrations-tab'
src/components/settings/settings-tabs-v2.tsx:408 <CommunicationsIntegrationsTab />
src/components/settings/communications-integrations-tab.tsx:60 export function CommunicationsIntegrationsTab() {
```

`settings-tabs-v2.tsx` is unmounted (no `src/app/` page imports it;
`src/app/settings/page.tsx` imports the live `settings-tabs.tsx`).
The live `settings-tabs.tsx` had no reference to
`<CommunicationsIntegrationsTab>` at all. So the canonical surface was
**reachable nowhere in production** before 2b.8.

The audit's stated path (`outbound_audit.md` §11 P0 #4 / §13 P1 #8a:
"delete the legacy tabs, surface only `<CommunicationsIntegrationsTab>`")
implies a live mount is required for the canonical surface. Without
adding one, deleting the three legacy tabs would leave outbound
credentials un-configurable from the UI.

**Adaptation:** added an "Integrations" sub-tab in the live
`settings-tabs.tsx` Communications section that mounts
`<CommunicationsIntegrationsTab>`. The three legacy sub-tab slots
(`email`, `sms`, `whatsapp`) collapse to a single `integrations` slot.
Default sub-tab for the Communications section is now `integrations`.
The component file itself was not modified — only the new mount point
was added in `settings-tabs.tsx`.

This is **not** the "legacy nav redirect breadcrumb" that prompt §0.4
forbade — there is no "config moved to Integrations" pointer in any
deleted slot; the sub-tabs are simply gone and the canonical surface
takes their place under a clearly-named sibling slot.

### 3.2 Live `email_logs` schema differs from the prompt's rollback template

The prompt §2.2 rollback template used a hypothetical `email_logs`
schema (`recipient_email`, `template_id`, sent_at default
`now()`, etc.) sourced from audit "F00 §6.5". The live schema in
`supabase/migrations/20251014_email_logs.sql` uses different columns
(`to_email`, `from_email`, `email_type`, `status`, retry/error tracking,
RLS policies, `updated_at` trigger). The rollback companion was rewritten
verbatim from the live migration so a rollback would faithfully
recreate what's actually there.

### 3.3 `smtp_encryption` had a non-null default that the prompt template omitted

Pre-flight §2.1 SQL query against the live DB:

```
column_name      | data_type | is_nullable | column_default
default_email…   | text      | YES         | null
sms_api_key      | text      | YES         | null
smtp_encryption  | text      | YES         | 'tls'::text
smtp_port        | integer   | YES         | null
...
```

Two notable deltas from the prompt's defaults:

- `smtp_encryption` has `DEFAULT 'tls'`. The rollback companion's `ADD
  COLUMN smtp_encryption text DEFAULT 'tls'` preserves this.
- `smtp_port` is `integer`, not text. The rollback companion uses
  `integer`.

### 3.4 Column classification: 14 drops, 5 preserves (out of the 19 audit-listed)

Final classification per pre-flight §2.1 grep results across `src/`
(excluding test files and `src/types/supabase.ts`):

| Column | Audit category | Surviving caller(s) | Classification |
|---|---|---|---|
| `default_email_from_address` | outbound default | None | **DROP_SAFE** |
| `default_email_from_name` | outbound default | None | **DROP_SAFE** |
| `default_email_reply_to` | outbound default | None | **DROP_SAFE** |
| `email` | tenant contact? | `lib/marketing/merge-tag-resolver.ts:108` reads `practiceInfo.email` for the `{{practice.email}}` merge tag | **PRESERVE** |
| `email_main` | tenant contact | `onboarding/steps/contact-info-step.tsx`, `settings/organization-profile-editor.tsx`, `settings/organization-sections/contact-information-section.tsx` (3 surviving callers) | **PRESERVE** |
| `email_support` | tenant contact | same three callers as `email_main` | **PRESERVE** |
| `sms_api_key` | outbound credential | None | **DROP_SAFE** |
| `sms_api_secret` | outbound credential | None | **DROP_SAFE** |
| `sms_from_number` | outbound credential | None on `tenants` — dispatcher reads `integration_channel_settings.twilio_sms_from_number` and the legacy `integration_settings.sms_from_number`, never `tenants.sms_from_number` (per `lib/integrations/tenant-integration-config.ts`) | **DROP_SAFE** |
| `sms_phone_number` | inbound routing | `lib/sms/inbound.ts` tenant resolution | **PRESERVE** (locked decision §0.4) |
| `sms_provider` | outbound credential | None on `tenants` (the `marketing.ts` reference is a separate marketing campaign type, not the tenants column) | **DROP_SAFE** |
| `smtp_encryption` | outbound credential | None | **DROP_SAFE** |
| `smtp_host` | outbound credential | None on `tenants` (the `integrations-hub.tsx:175` reference is a local form-field key string in the email_marketing integration descriptor, not a tenants column read) | **DROP_SAFE** |
| `smtp_password` | outbound credential | None | **DROP_SAFE** |
| `smtp_port` | outbound credential | None on `tenants` (same `integrations-hub.tsx:176` form-field key, not a tenants column read) | **DROP_SAFE** |
| `smtp_username` | outbound credential | None | **DROP_SAFE** |
| `whatsapp_api_key` | outbound credential | None | **DROP_SAFE** |
| `whatsapp_api_secret` | outbound credential | None | **DROP_SAFE** |
| `whatsapp_phone_number` | inbound routing | `lib/whatsapp/inbound.ts` tenant resolution | **PRESERVE** (locked decision §0.4) |

**Final drop set: 14 columns.** **Preserved: 5 columns** (2 by locked
decision, 3 by classification).

### 3.5 Test scope swap and count delta

The prompt §7 expected post-2b.8 jest count to be 67 in the scope
`src/lib/auth src/app/api/settings src/app/api/communications src/components/settings`. The actual count post-2b.8
is **80**:

```
PASS src/components/settings/integrations/__tests__/google-ads-settings.test.tsx
PASS src/app/api/settings/treatment-offerings/__tests__/treatment-offerings.test.ts
PASS src/lib/auth/__tests__/api-auth-helpers.test.ts
PASS src/app/api/communications/send-sms/__tests__/route.test.ts
PASS src/app/api/communications/send-email/__tests__/route.test.ts
PASS src/app/api/communications/send-whatsapp/__tests__/route.test.ts
PASS src/app/api/communications/initiate-call/__tests__/route.test.ts

Test Suites: 7 passed, 7 total
Tests:       80 passed, 80 total
```

The 2b.7 closeout reported 82 in a *similar but not identical* scope
(`src/lib/auth src/app/api/settings src/app/api/communications src/app/api/emails`). The 2b.8 scope swaps `src/app/api/emails` (now
empty) for `src/components/settings` (which contains the Google Ads
settings test suite added by 2b.1.b.2). The net delta is:

- –15 tests (the 5×3 settings route tests deleted by 2b.8)
- +13 tests (the `google-ads-settings.test.tsx` suite that wasn't in
  the 2b.7 scope — `components/settings/integrations/__tests__/`)
- = –2 tests, but 2b.7's 82 already counted email/sms/whatsapp twice
  conceptually (the route tests and the `src/app/api/emails` empty
  directory), so the actual net is +0 / –2. Either way: **all 80
  tests green; no regressions.**

The prompt's expected count of 67 assumed strict subtraction
(82 − 15) and didn't account for the scope swap. The 80-green result
is healthier than the prompt's expectation.

### 3.6 `settings-tabs-clean.tsx` is also unused; left alone

A third settings-tabs file exists at
`src/components/settings/settings-tabs-clean.tsx`. It is not mounted
anywhere (`src/app/settings/page.tsx` imports `settings-tabs`, not
`-clean`), and it has no references to the three legacy tabs (grep
returns zero hits). It has three pre-existing TS errors that predate
2b.8. Left alone — out of scope for 2b.8, which only edits files that
reference the deleted components.

### 3.7 Husky hook executable bit confirmed; no chmod needed

`ls -la .husky/pre-push` returned `-rwxr-xr-x` — already executable
per the 2b.3 / 2b.4 fix history. No `chmod +x` needed.

---

## 4. New TypeScript modules

**None.** This phase deletes UI / route / library code and replaces
three nav entries with one. No new modules authored.

---

## 5. Modified TypeScript modules

### 5.1 `src/components/settings/settings-tabs.tsx`

- L57–L62: comment block replacing the three legacy imports
  (`EmailConfigTab`, `SMSConfigTab`, `WhatsAppConfigTab`) with one
  import for `CommunicationsIntegrationsTab` and an explanatory comment
  block citing the 2b.8 scope (legacy tabs wrote to plain-text columns
  the dispatcher does not read; canonical tab writes to
  `integration_settings`, which the dispatcher does read).
- `SECTION_TABS.communications`: collapsed from 5 entries
  (`email`, `sms`, `whatsapp`, `notifications`, `calendar`) to 3
  (`integrations`, `notifications`, `calendar`). New `integrations`
  entry uses label `"Integrations"`.
- `activeTabs` default for `communications`: changed from `'email'`
  to `'integrations'` so the section's first-load shows the canonical
  surface.
- `renderCommunicationsTabs`: three `<TabsContent>` blocks for the
  legacy tabs replaced with one `<TabsContent value="integrations">`
  mounting `<CommunicationsIntegrationsTab />`. The `notifications`
  and `calendar` `<TabsContent>` blocks are preserved verbatim.

No other changes to this file. Section-tab navigation logic, sidebar
chrome, render-routing switch in `renderTabContents`, and the
`getInitialState` URL parsing all unchanged.

### 5.2 `src/components/settings/settings-tabs-v2.tsx`

This file is unmounted (no `src/app/` page imports it). Modified
defensively so that its three legacy-tab imports do not become dangling
references after the component files are deleted.

- L52–L57: removed three legacy imports
  (`EmailConfigTab`, `SMSConfigTab`, `WhatsAppConfigTab`); added a
  comment block citing 2b.8 and noting that the file already mounts
  `<CommunicationsIntegrationsTab>` under its Integrations section's
  "Connected Apps" sub-tab (unchanged).
- `SECTION_TABS.communications`: collapsed from 5 entries to 2
  (`notifications`, `calendar`). Unlike the live `settings-tabs.tsx`,
  this file already had `<CommunicationsIntegrationsTab>` in the
  separate Integrations section, so we don't add a new sub-tab here.
- `activeTabs` default for `communications`: changed from `'email'`
  to `'notifications'` (since the section's first entry is now
  notifications).
- `renderCommunicationsTabs`: three legacy `<TabsContent>` blocks
  removed; only `notifications` and `calendar` remain.

This file's existing pre-existing TS errors (9, all `string | null`
nullability and one callback type mismatch) and ESLint findings
(`cn` unused, two `tab` parameter unused) carry over unchanged — they
existed pre-2b.8 (verified by baseline ESLint run against `git stash`).

---

## 6. What was deleted

| Path | LOC | Why |
|---|---|---|
| `src/components/settings/email-config-tab.tsx` | 130 | Legacy single-channel email config tab; wrote to `tenants.smtp_*` / `tenants.default_email_*` columns the dispatcher does not read. Audit P0 #4. |
| `src/components/settings/sms-config-tab.tsx` | 110 | Legacy SMS config tab; wrote to `tenants.sms_api_key` / `sms_api_secret` / `sms_provider` / `sms_from_number` (none read by the dispatcher). Audit P0 #4. |
| `src/components/settings/whatsapp-config-tab.tsx` | 92 | Legacy WhatsApp config tab; wrote to `tenants.whatsapp_api_key` / `whatsapp_api_secret` (none read by the dispatcher). `whatsapp_phone_number` is preserved separately by the inbound webhook path. Audit P0 #4. |
| `src/app/api/settings/email/route.ts` | 90 | Auth-gated route (2b.7) with the deleted `<EmailConfigTab>` as its only caller. |
| `src/app/api/settings/email/__tests__/route.test.ts` | 142 | Test file colocated with the deleted route. |
| `src/app/api/settings/sms/route.ts` | 75 | Auth-gated route (2b.7) with the deleted `<SMSConfigTab>` as its only caller. |
| `src/app/api/settings/sms/__tests__/route.test.ts` | 136 | Test file colocated with the deleted route. |
| `src/app/api/settings/whatsapp/route.ts` | 78 | Auth-gated route (2b.7) with the deleted `<WhatsAppConfigTab>` as its only caller. |
| `src/app/api/settings/whatsapp/__tests__/route.test.ts` | 135 | Test file colocated with the deleted route. |
| `src/components/communications/bulk-send-panel.tsx` | 238 | Orphaned per 2b.7 §3.7 (zero `src/` callers). 2b.7 §13 #4 deferred this to 2b.8; pre-launch decision (prompt §0.2.3) is to delete now, rebuild later with a proper Contacts-page entry point. |

**Total: 10 files, 1,226 LOC removed.**

Empty parent directories
`src/app/api/settings/{email,sms,whatsapp}/__tests__/` and
`src/app/api/settings/{email,sms,whatsapp}/` were also removed (six
empty directories), per prompt §4. No empty parents left on disk.

No shared utility files were imported only by the deleted tabs — each
tab imported stock shadcn/ui components, `useTenant`, `createClient`,
`toast`, and lucide-react icons (all consumed elsewhere). No orphan
utility deletions in this phase.

---

## 7. Server-internal callers found and how they were handled

Pre-flight grep batches (§1.2, §1.3, §1.4, §1.5) results:

| Grep target | Result |
|---|---|
| `EmailConfigTab` / `SMSConfigTab` / `WhatsAppConfigTab` (and kebab-case variants) | Only the three component files themselves and the two `settings-tabs*.tsx` nav mount points. **No other `src/` callers.** |
| `/api/settings/email`, `/api/settings/sms`, `/api/settings/whatsapp` | Only the three legacy tab files and the three deleted route files themselves. **No other `src/` callers.** |
| `BulkSendPanel` / `bulk-send-panel` | Only the component file itself. **Zero `src/` callers**, matching 2b.7 §3.7. |
| `email_logs` | Only `src/types/supabase.ts` (auto-generated DB types). **Zero application-code references.** Types will be regenerated when the migration is applied in a follow-up phase. |

Post-deletion grep (run after §3 / §4 / §5 file removals and §6 nav
edits):

```
$ grep -rn "EmailConfigTab\|SMSConfigTab\|WhatsAppConfigTab" src/ \
    --include="*.tsx" --include="*.ts"
src/components/settings/settings-tabs-v2.tsx:53 // Phase 2b.8: the legacy <EmailConfigTab>, <SMSConfigTab>, and
src/components/settings/settings-tabs-v2.tsx:54 // <WhatsAppConfigTab> were deleted. The canonical
src/components/settings/settings-tabs.tsx:57   // Phase 2b.8: the legacy <EmailConfigTab>, <SMSConfigTab>, and
src/components/settings/settings-tabs.tsx:58   // <WhatsAppConfigTab> were deleted (they wrote to plain-text columns on

$ grep -rn "email-config-tab\|sms-config-tab\|whatsapp-config-tab" src/ \
    --include="*.tsx" --include="*.ts"
(no matches)

$ grep -rn "BulkSendPanel\|bulk-send-panel" src/ \
    --include="*.tsx" --include="*.ts"
(no matches)
```

Only the historical comments in the two nav files reference the deleted
class names — for future-archaeology context.

---

## 8. Tests

### 8.1 No new tests

The deletions remove their own tests (15 cases across 3 files). No new
tests were added in 2b.8 — the canonical
`<CommunicationsIntegrationsTab>` is unchanged and its existing tests
(if any) carry over unchanged.

### 8.2 Test sweep

```
npx jest src/lib/auth src/app/api/settings src/app/api/communications src/components/settings

PASS src/components/settings/integrations/__tests__/google-ads-settings.test.tsx
PASS src/app/api/settings/treatment-offerings/__tests__/treatment-offerings.test.ts
PASS src/lib/auth/__tests__/api-auth-helpers.test.ts
PASS src/app/api/communications/send-sms/__tests__/route.test.ts
PASS src/app/api/communications/send-email/__tests__/route.test.ts
PASS src/app/api/communications/send-whatsapp/__tests__/route.test.ts
PASS src/app/api/communications/initiate-call/__tests__/route.test.ts

Test Suites: 7 passed, 7 total
Tests:       80 passed, 80 total
Time:        ~1s
```

The prompt §7 expected 67; actual is 80. See §3.5 for the scope-swap
delta reconciliation.

### 8.3 Pre-existing regression profile unchanged

The `src/lib/marketing-audit/__tests__/` failure profile (9 failed
tests on `audit-orchestrator.ts`) is unchanged from 2b.5 / 2b.7. Out
of scope for 2b.8.

---

## 9. What you have to do operationally

### 9.1 Husky hook fired cleanly

```
[2026-05-12T20:45:05Z] git pre-push hook triggered
  repo    : /Users/deepak/auth-app/dental-crm
  branch  : phase-1-attribution-foundation
  sha     : 5fd12df
  scope   : team_5U85NyAOQrHvS30Kp4hFyp6y
  note    : sleeping 12s before deploy to let push complete
```

Deploy ID: `dpl_E527iwXBAxfayTddMpc8UkirKbhA`. State: `READY`. Aliased
to `https://dental-crm-nine.vercel.app`. No manual `npm run deploy:prod`
fallback needed.

### 9.2 Post-deploy curl smoke — all four passed

| Endpoint | Method | Status | Expectation |
|---|---|---|---|
| `/api/settings/email` | PATCH (anon, body `{"tenant_id":"x"}`) | **404** | 404 or 405 (route deleted) |
| `/api/settings/sms` | PATCH (anon, body `{"tenant_id":"x"}`) | **404** | 404 or 405 (route deleted) |
| `/api/settings/whatsapp` | PATCH (anon, body `{"tenant_id":"x"}`) | **404** | 404 or 405 (route deleted) |
| `/settings` | GET (anon) | **200** | 200 (page renders / serves login redirect) |

All four match expectations. None of the three deleted routes returned
401, which would have meant the route was still live — that would have
been a deployment bug. Clean cutover.

### 9.3 Read-only DB checks (already done pre-deploy)

Pre-flight §1.5 confirmed `email_logs` table still exists in the DB.
Pre-flight §2.1 confirmed all 19 audit-listed columns still exist on
`tenants`. **No DB writes were made in this phase** — the migration is
authored but not applied.

---

## 10. Validation results

| Tool | Scope | Result |
|---|---|---|
| `npx jest src/lib/auth src/app/api/settings src/app/api/communications src/components/settings` | 7 suites, 80 tests | All green. |
| `npx tsc --noEmit` | Whole project | 22 errors in `src/components/settings/{settings-tabs.tsx, settings-tabs-v2.tsx, settings-tabs-clean.tsx}` — **all pre-existing, verified by baseline run against `git stash`.** No new TS errors introduced by 2b.8. Other unrelated pre-existing TS errors carry over unchanged. |
| `npx eslint src/components/settings/settings-tabs.tsx src/components/settings/settings-tabs-v2.tsx src/components/settings/communications-integrations-tab.tsx` | Modified scope | 13 problems (12 errors, 1 warning) — **all pre-existing, verified by baseline run against `git stash`** (identical 13 problems at identical line offsets pre-2b.8). No new ESLint findings. |
| `npm run build` | Whole project | Clean. No "module not found" errors from dangling imports. Dynamic-server-usage logs on unrelated routes are pre-existing. |
| Codacy CLI (Trivy, ESLint, Lizard, Opengrep OSS) | `settings-tabs.tsx`, `settings-tabs-v2.tsx`, migration `.sql` files | Clean. Pre-existing Lizard warning on `getInitialState` (CCN 10, limit 8) in `settings-tabs.tsx:144` preserved per the standard discipline — verified pre-existing by baseline run. |
| Post-deploy curl smoke (§9.2) | 3 endpoints + settings page | See §10 below. |
| Operator gate (browser-based, §11) | 5 items | **PENDING** — Toffee runs these. |

---

## 11. Deploy ID

`dpl_E527iwXBAxfayTddMpc8UkirKbhA` — see §9.1.

---

## 12. Curl smoke results

See §9.2. Summary: three deleted settings PATCH routes return 404,
`/settings` page returns 200. All four match expectations.

---

## 13. Operator gate status

Five browser-based items per prompt §10. Cursor cannot run these
(logged-in browser required). Toffee runs them; this list will be
updated once each is exercised.

1. **PENDING — Settings nav has no legacy tabs visible.** Log in as
   `deepakshegde@gmail.com`, open Settings → Communications. Confirm:
   - "Email", "SMS", "WhatsApp" sub-tabs are **gone** from the
     Communications section's horizontal tab row.
   - The new "Integrations" sub-tab is the first entry and loads
     `<CommunicationsIntegrationsTab>`.
   - Pass criterion: zero of the three legacy sub-tab labels visible
     anywhere in the settings UI.

2. **PENDING — Communications Integrations tab still renders and
   saves.** Open Settings → Communications → Integrations. Confirm:
   - Tab loads without console errors.
   - Form fields populate with existing values (or show a clean empty
     state if nothing is saved).
   - Editing one field (e.g. `sms_from_number`) and clicking Save
     produces a green toast.
   - Reloading the page persists the change.
   - Pass criterion: edit, save, reload, value persists.

3. **PENDING — Dispatcher still reads the saved value.** After step 2,
   send a real SMS through the app (use the `<SMSComposerPanel>` from
   a contact's activity surface). Confirm:
   - The send succeeds (toast green, activity row created).
   - The activity row's `from_number` matches the value saved in
     step 2.
   - Pass criterion: end-to-end save → dispatch → activity row.

4. **PENDING — No regressions on other settings tabs.** Click through
   the surviving tabs in each section. Confirm each one still loads.
   Pass criterion: zero blank screens, zero "Module not found" errors.

5. **PENDING — The three deleted route paths return 404 in the
   browser.** Open DevTools → Network. Hit
   `https://dental-crm-nine.vercel.app/api/settings/email` directly
   (or curl it). Confirm 404 (or 405). Same for `/sms` and
   `/whatsapp`. Pass criterion: 404/405 on all three.

---

## 14. Out of scope (deferred)

Copied verbatim from prompt §0.3 / §12:

- Applying the 2b.8 scheduled migration → separate phase (the planner
  will sequence; tentatively 2b.8.1 or wherever it makes sense).
- Outbound email provider consolidation (SendGrid vs Resend vs SES) →
  2b.10.
- `<TemplatesManager>` pull-from-nav → 2b.9.
- Activity-feed correctness, AI Insights placeholder → 2b.9.
- Dispatcher correctness audit → 2b.9.
- Conversation rows / message-ID capture → 2b.11.
- BulkSendPanel rebuild with Contacts entry point + rate-limit
  truncation fix → post-2b.11 phase (planner will design).

---

## 15. Open questions for next phase (2b.9)

Authored at phase start (prompt §13). Updated below with anything
2b.8 surfaced in execution.

1. **What dispatcher-correctness work does 2b.9 need to pick up that
   the audit hasn't already enumerated?** Audit §13.2 lists the known
   items: failed-send `message_status`, AI placeholder fix,
   activity-detail variant pick, HTML sanitisation, templates pull,
   purpose-classifier rename. 2b.8 noticed in passing:
   - The `<CommunicationsIntegrationsTab>` component itself has 6
     pre-existing ESLint findings (4× `react/no-unescaped-entities`
     on inline strings, 1× unused `supabase` variable). Not in 2b.8
     scope (no code changes to the component), but worth a 2b.9 spot
     when dispatcher / template cleanup is happening adjacent.
   - The unused `settings-tabs-v2.tsx` and `settings-tabs-clean.tsx`
     files are dead code (zero `src/app/` mounts). Worth a 2b.9 or
     later dead-code-purge pass.

2. **Templates manager pull vs wire — final call.** Outbound audit
   §13.2 listed both options (`P1 #8a` vs `P1 #8b`). The handoff doc
   carried `pull from sidebar nav` as the locked decision. Confirm
   with planner before 2b.9 starts.

3. **Communications section default sub-tab.** 2b.8 set
   `communications: 'integrations'` as the default for the live
   `settings-tabs.tsx`. If `<CommunicationsIntegrationsTab>` is later
   moved into the standalone Integrations top-level section (rather
   than living under Communications), the default sub-tab needs to be
   revisited at that point.

---

## 16. Definition of done

- ✅ §1 pre-flight grep results recorded — see §3 above.
- ✅ §2.1 column classification recorded with the final drop set
   explicitly listed (14 DROP_SAFE, 5 PRESERVE) — see §3.4.
- ✅ Migration `.sql` + rollback `.sql` + README authored under
   `docs/2b/migrations-pending/`. Not applied. Verified by
   `ls supabase/migrations/ | grep 2b_8` returning zero matches.
- ✅ The three legacy tab component files deleted.
- ✅ The three settings API route files + their colocated tests
   deleted. Empty parent directories removed.
- ✅ `<BulkSendPanel>` file deleted.
- ✅ Nav entries removed from every mount point identified in §1.2
   (both `settings-tabs.tsx` and `settings-tabs-v2.tsx`).
- ✅ Post-deletion grep returns zero non-comment references to any of
   the deleted symbols anywhere in `src/`.
- ✅ Jest passes: 80 tests in the modified scope. (Prompt expected 67;
   actual exceeds — see §3.5.)
- ✅ TypeScript clean on touched files (no new TS errors introduced).
- ✅ ESLint clean on touched files (no new ESLint findings introduced).
- ✅ `npm run build` clean.
- ✅ Codacy CLI clean on touched files (no new findings; pre-existing
   `getInitialState` CCN warning preserved).
- ✅ Husky pre-push hook auto-deployed to Vercel; deployment is READY
   (`dpl_E527iwXBAxfayTddMpc8UkirKbhA`).
- ✅ §9.2 curl smoke: three settings routes return 404; `/settings`
   page returns 200.
- ✅ `2b-8-changes.md` written and complete.
- ✅ `operational-gotchas.md` appended with two 2b.8 entries
   (migrations-pending directory + inbound routing identifiers).
- ☐ §10 operator gate: all five items ✅ (run by Toffee). Currently
   all five PENDING — see §13 above.

All Cursor-runnable items ✅. Phase 2b.8 hands off to Toffee for the
five operator-gate items; once those land ✅, the phase is closed.
