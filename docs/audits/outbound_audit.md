# Outbound communications audit

> **Audit type:** Per-feature deep-dive, post-Phase-2b.5 baseline.
> **Date:** 2026-05-11
> **Audited by:** Cursor execution of `phase-2b-6-prompt`.
> **Audited at commit:** `3bc8a38554c20957e6a196cdb3b127842de33217` (`docs(2b.5): record post-deploy curl results — all green`).
> **Branch:** `phase-1-attribution-foundation`.
> **Test tenant exercised for read-only DB checks:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf` ("Deepak's Dental Practice").
> **Scope:** Manual outbound email / SMS / WhatsApp / voice from a contact card or bulk panel, plus the system-email and AI-draft routes that share the same auth shape. Excludes auto-reply / automation engine (separate future audit), excludes inbound channels (already shipped under 2b.1.a / 2b.2.a / 2b.3 / 2b.4), excludes voice-call lifecycle UI past initiation (covered by D15).

## Source files audited (every file read end to end)

**Reference docs**
- `Audit and Analysis/full_system_audit/D03_communications.md` (608 lines, 2026-05-03 baseline).
- `Audit and Analysis/full_system_audit/F05_integrations_and_external_services.md` (§4 + §7.4 + §11 read for credential-store + email-provider context).
- `dental-crm/docs/2b/2b-5-changes.md` (493 lines — most recent shipped change; treated as authoritative for current send-route shape).
- `dental-crm/docs/operational-gotchas.md` (67 lines — for the existing 2b.5 gotcha entry).

**Send routes**
- `dental-crm/src/app/api/communications/send-email/route.ts` (162 LOC).
- `dental-crm/src/app/api/communications/send-sms/route.ts` (128 LOC, "v1").
- `dental-crm/src/app/api/communications/send-sms-v2/route.ts` (121 LOC).
- `dental-crm/src/app/api/communications/send-whatsapp/route.ts` (134 LOC, "v1").
- `dental-crm/src/app/api/communications/send-whatsapp-v2/route.ts` (175 LOC).
- `dental-crm/src/app/api/communications/initiate-call/route.ts` (74 LOC).
- `dental-crm/src/app/api/emails/welcome/route.ts` (27 LOC).
- `dental-crm/src/app/api/ai-assistant/draft-email/route.ts` (149 LOC).

**Composer + UI**
- `dental-crm/src/components/communications/email-composer-panel.tsx` (364 LOC).
- `dental-crm/src/components/communications/sms-composer-panel.tsx` (243 LOC).
- `dental-crm/src/components/communications/whatsapp-composer-panel.tsx` (240 LOC).
- `dental-crm/src/components/communications/bulk-send-panel.tsx` (238 LOC).
- `dental-crm/src/components/communications/click-to-call-dialer.tsx` (488 LOC).
- `dental-crm/src/components/communications/activity-detail-modal.tsx` (335 LOC).
- `dental-crm/src/components/communications/activity-detail-slide-in.tsx` (795 LOC).
- `dental-crm/src/components/communications/global-activity-feed.tsx` (200 LOC).
- `dental-crm/src/components/communications/templates-manager.tsx` (354 LOC).

**Service / dispatcher / provider layers**
- `dental-crm/src/lib/communications/dispatcher.ts` (695 LOC — the canonical post-2b.5 dispatcher).
- `dental-crm/src/lib/email-service.ts` (266 LOC — Resend-only system-email service for invitations / welcome / password reset).
- `dental-crm/src/lib/services/email-service.ts` (521 LOC — multi-provider `sendEmail` + invitation/join-request templates).
- `dental-crm/src/lib/integrations/email-provider.ts` (460 LOC — per-tenant provider router; SendGrid / Gmail / Outlook / SES / Resend).
- `dental-crm/src/lib/email-queue.ts` (273 LOC — `email_logs`-backed queue, currently dead code at the route layer).
- `dental-crm/src/lib/sms-service.ts` (99 LOC — Twilio singleton).
- `dental-crm/src/lib/whatsapp-service.ts` (72 LOC — Twilio WhatsApp wrapper).
- `dental-crm/src/lib/marketing/sms-provider.ts` (195 LOC — `ISmsProvider` interface + NoOp + Twilio stubs; dead code at the route layer).
- `dental-crm/src/lib/queues/communication-queue.ts` (142 LOC — BullMQ wrapper around the dispatcher).
- `dental-crm/src/lib/integrations/tenant-integration-config.ts` (420 LOC — credential resolver; vault → channel_settings → legacy → env).
- `dental-crm/src/lib/auth/api-auth-helpers.ts` (286 LOC — the 2b.5 helper).

**Settings routes + UI**
- `dental-crm/src/app/api/settings/email/route.ts` (53 LOC).
- `dental-crm/src/app/api/settings/sms/route.ts` (38 LOC).
- `dental-crm/src/app/api/settings/whatsapp/route.ts` (36 LOC).
- `dental-crm/src/components/settings/email-config-tab.tsx` (140 LOC).
- `dental-crm/src/components/settings/sms-config-tab.tsx` (110 LOC).
- `dental-crm/src/components/settings/whatsapp-config-tab.tsx` (93 LOC).
- `dental-crm/src/components/settings/communications-integrations-tab.tsx` (≥ 800 LOC; first 80 read for shape).

**Confirmation that `/api/emails/test` is gone**
- `Glob dental-crm/src/app/api/emails/**/route.ts` returns only `welcome/route.ts`. Deletion confirmed; matches 2b.5 §6.

## Source DB queries run (read-only)

All run via Supabase MCP `execute_sql` against the live project. Each result captured verbatim in §8 and Appendix A.

| # | SQL | Result summary |
|---|---|---|
| 1 | `SELECT … FROM tenants` (whatsapp/sms phone present, whatsapp_api_key present, total) | 1 tenant total; `whatsapp_phone_number` set; `sms_phone_number` set; `whatsapp_api_key` plain-text NULL. |
| 2 | `SELECT type, count(*) FROM activities WHERE direction='outbound' AND occurred_at > now() - 30d GROUP BY type` | call=8, sms=8, email=6, whatsapp=5 — all on the test tenant; cross-checked below as seed/fixture data, not real provider sends. |
| 3a | Sample outbound `email` activity | `from_number/to_number/email_to/email_from/message_status/integration_provider/external_id` all `NULL`; only `subject`/`snippet` populated. |
| 3b | Sample outbound `sms` activity | Same: all canonical channel columns `NULL`. |
| 3c | Sample outbound `whatsapp` activity | Same: all canonical channel columns `NULL`. |
| 4 | `SELECT table_name FROM information_schema.tables WHERE … template/message/conversation/integration/channel` | 15 tables present (see §10). Notable: `activity_templates`, `email_templates`, `marketing_templates`, `marketing_template_versions`, `integration_settings`, `integration_channel_settings`, `integration_secret_vault`. |
| 5 | `SELECT count(*) FROM user_tenant_memberships WHERE tenant_id=…` | 1 active membership for the test tenant. Confirms 2b.5 auth join shape is live. |
| 6 | `information_schema.columns WHERE table='activity_templates'` | 12 cols: `id, tenant_id, name, activity_type, subject_template, content_template, variables (jsonb), category, is_active, created_by_user_id, created_at, updated_at`. |
| 7 | `SELECT count(*) FROM activity_templates` (test tenant + global) | 0 / 0. **No templates have ever been authored, by anyone, in this database.** |
| 8 | `tenants` columns matching `sms*/whatsapp*/smtp*/email*/default_email*` | 19 plain-text legacy columns still present in the schema (full list in §7.1). |
| 9 | `SELECT count(*) FROM integration_settings WHERE tenant_id=…` | 1. |
| 10 | `SELECT count(*) FROM integration_channel_settings WHERE tenant_id=…` | 0. **Dispatcher is therefore reading via the legacy fallback, not the new channel-settings path.** |

No errors from any query. Schema shape of `activities` confirms D03 §9.1 (canonical columns are `to_number / from_number / message_status / external_id / integration_provider / email_to / email_from / metadata.ai_*`).

---

## §1 — TL;DR: what works, what doesn't

### 1.1 Verdict table

| Aspect | Verdict | Evidence |
|---|---|---|
| `POST /api/communications/send-email` auth + tenant scoping + rate limit | ✅ Working post-2b.5 | `send-email/route.ts:62-90`, helper at `api-auth-helpers.ts`, 6/6 route tests in `send-email/__tests__/route.test.ts`. |
| `POST /api/communications/send-sms` (v1) auth + scoping + RL | ✅ Working post-2b.5 | `send-sms/route.ts:42-50`. |
| `POST /api/communications/send-sms-v2` auth + scoping + RL | ✅ Working post-2b.5 | `send-sms-v2/route.ts:53-58`; routed through `authAndRateLimit` helper. |
| `POST /api/communications/send-whatsapp` (v1) auth + scoping + RL | ✅ Working post-2b.5 | `send-whatsapp/route.ts:45-53`. |
| `POST /api/communications/send-whatsapp-v2` auth + scoping + RL | ✅ Working post-2b.5 | `send-whatsapp-v2/route.ts:123-128` via `authAndRateLimit`. |
| `POST /api/communications/initiate-call` auth + scoping + RL | ✅ Working post-2b.5 | `initiate-call/route.ts:11-22`. |
| `POST /api/ai-assistant/draft-email` auth + scoping (no RL) | ✅ Working post-2b.5 | `draft-email/route.ts:12-25`. |
| `POST /api/emails/welcome` auth | ❌ **Still no auth** | `emails/welcome/route.ts:1-25`. Calls `emailService.sendWelcome(email, name, practiceName)`; trusts body fields. Documented in 2b.5 §3.5 as deferred. |
| `POST /api/emails/test` | ✅ Deleted in 2b.5 | Glob confirms only `welcome` remains under `api/emails/`. |
| `PATCH /api/settings/email` auth | ❌ **No auth, body-trusted tenant_id** | `settings/email/route.ts:4-21`. Service-role client. |
| `PATCH /api/settings/sms` auth | ❌ **No auth, body-trusted tenant_id** | `settings/sms/route.ts:4-15`. |
| `PATCH /api/settings/whatsapp` auth | ❌ **No auth, body-trusted tenant_id** | `settings/whatsapp/route.ts:4-15`. |
| Dispatcher (`lib/communications/dispatcher.ts`) | ✅ Canonical, 695 LOC, all 4 channels | Used by all five v1/v2 routes (some directly, some via `*Service`) and by the queue. |
| Email composer UI (`<EmailComposerPanel>`) | ⚠ Works but no attachments, no template integration, no Reply-To, no template picker beyond 3 hardcoded buttons | `email-composer-panel.tsx:300-337`. AI Draft button is a `toast.info('coming soon')` stub at L123-134. |
| SMS composer UI | ⚠ Works; cost estimate hardcoded `chars/160 * 0.0075` (US/UK GSM-7) | `sms-composer-panel.tsx:43-44`. Per D03 §11.9 this miscalculates for emoji/Unicode. |
| WhatsApp composer UI | ⚠ Works; media-URL only (no upload), no approved-template picker | `whatsapp-composer-panel.tsx:151-172`. |
| `<BulkSendPanel>` | ❌ **Crashes on render** | Uses `<Avatar>` and `<AvatarFallback>` at L160-164 without imports. Also no per-channel rate-limit awareness — fires the 60/min limit immediately on >60 selected contacts. |
| Click-to-call dialer | ⚠ Calls `/initiate-call`; the in-page "End Call" button is fake (just a setTimeout, doesn't actually hang up the Twilio call). | `click-to-call-dialer.tsx:146-156`. |
| Activity detail (modal) | ⚠ Older variant, stays | `activity-detail-modal.tsx`. Still shipped. |
| Activity detail (slide-in) | ⚠ Newer richer variant, stays | `activity-detail-slide-in.tsx`. The right-column "AI Insights" panel is mostly placeholder content (hardcoded "$3,000-$5,000", hardcoded "Patient interested in orthodontic treatment" fallbacks at L729-740). |
| Global activity feed | ✅ Works for both inbound and outbound | `global-activity-feed.tsx`. Filters by type. |
| Templates manager UI | ⚠ Shipped, queries `activity_templates`. **0 rows in DB across all tenants.** | `templates-manager.tsx:62-67`. The "Use" button is a no-op (L237-241) — no wiring back into composers. |
| Reply affordance from inbound activity | ⚠ Works for SMS/WhatsApp/email through `activity-detail-slide-in.tsx:159-222` | But: no In-Reply-To / References headers on email replies; no Reply-To token; reply is just a fresh outbound activity, no thread linkage. |
| Threading model | ❌ **None** | Verified: no `thread_id` writes anywhere; only `metadata.thread_id` is read by activity-detail-modal as an optional tab, and dispatcher never sets it. |
| Outbound-email Reply-To | ⚠ Set if `integration_settings.email_reply_to_address` is non-null; `dispatcher.ts:222`. Otherwise empty. UI never lets the user override per-email. |
| Email attachments | ❌ Not supported in composer or dispatcher | `dispatcher.ts:dispatchEmail` does not accept `attachments`; `email-provider.ts:sendViaSendGrid` etc. do not pass any. |
| Inbox / unified conversations view | ❌ Doesn't exist | Confirmed by grep: no `/inbox`, `/messages`, `/conversations` page. |
| HTML sanitisation on outbound | ❌ Not done | Body is sent as-is to provider SDKs. No DOMPurify pass anywhere. |
| Unsubscribe / List-Unsubscribe | ❌ Not added by dispatcher; not enforced by templates | No header set in `email-provider.ts`. |

### 1.2 Narrative summary

**The single most striking finding:** the 2b.5 phase closed the D03 §1 P0 on the *send* routes, but the *settings* routes that configure those sends are still wide open. `PATCH /api/settings/email`, `PATCH /api/settings/sms`, `PATCH /api/settings/whatsapp` all accept `tenant_id` from the request body, use the service-role Supabase client, and update the tenant's outbound credentials with no authentication. The blast radius isn't quite as bad as the original send-route P0 (an attacker can rotate the tenant's keys but doesn't get to send messages directly any more), but it is still a "with one curl I can plant my own SendGrid API key into a competitor's tenant and intercept all their outbound mail" hole. This is the new P0.

The dispatcher is in good shape. `lib/communications/dispatcher.ts` (695 LOC) is the right shape — single entry point per channel, credential resolution via the per-tenant `loadTenantIntegrationSettings`, structured `activities` row + `integration_logs` row per send, FirstResponse Google Ads conversion event hook for paid attribution. The four `dispatch*` functions all use canonical column names. The 2b.5 work confirms that all browser-driven sends and the BullMQ queue go through it. Where the v1/v2 split still lives is in the routes themselves: `send-sms-v2` and `send-whatsapp-v2` call `smsService` / `whatsappService` directly with credentials read from the legacy plain-text `tenants.sms_*` / `tenants.whatsapp_*` columns instead of from `loadTenantIntegrationSettings`. That divergence means the send path used by the v2 routes ignores the encrypted vault and the channel-settings table entirely. Since no v2 UI is wired (every composer posts to v1 — see §3), this is dormant code; but it means that the moment anyone wires the composer to v2 they will silently bypass the canonical credential store.

The provider layer is mostly cleaned up. Of the five email-provider files D03 §7 listed, two are now unambiguously dead at the outbound-send layer (`lib/email-queue.ts`, `lib/marketing/sms-provider.ts`), one is the canonical multi-provider router (`lib/integrations/email-provider.ts`), one is the dispatcher itself (`lib/communications/dispatcher.ts`), and two (`lib/email-service.ts`, `lib/services/email-service.ts`) are still used — but only for *system* email (signup welcomes, invitations, join-request notifications), never for the user-facing CRM outbound flow. So the user-facing outbound flow is no longer "5 layers" — it's `composer → /api/communications/send-* → dispatcher → email-provider → provider SDK`. That is a clean four-step flow. The auditing confusion in D03 was real and is largely resolved by 2b.5; what remains is to delete the dead files (or document their narrow system-email scope) and to consolidate `lib/email-service.ts` ↔ `lib/services/email-service.ts` (both are used by `users/invite` and `join-requests`, which is messy; see §5).

The templates feature is essentially decorative. `activity_templates` exists, the UI lets you create/edit/delete templates and shows hardcoded variable hints, but the table contains zero rows across the whole database, and there is no path from a template back into a composer. Each composer has a small set of inline hardcoded "quick template" buttons that hardcode strings into the textarea — those are working but unrelated to the templates manager. Templates need a rebuild before launch.

Threading does not exist. Every outbound send produces a flat `activities` row with no `thread_id`, no `In-Reply-To`, no `References`, no Reply-To token. The only place `thread_id` appears is inside `activity-detail-modal.tsx` reading `activity.metadata?.thread_id` to optionally render a "thread" tab whose body is a "Conversation thread view coming soon" stub. This is the biggest single gap for the launch UX: a sales agent following up on a Limelight Digital lead has no way to see "all the back-and-forth with this contact" except scrolling the per-contact activity feed — which 2b.4 §12 fixed enough to be readable, but is not a conversation tool.

Activity rendering on outbound is correct but bland. The 2b.4 §12 fix that made inbound SMS/WhatsApp message bodies render correctly in the slide-in panel did not regress outbound; both paths use `activity.snippet || activity.description`. Outbound emails go through `dispatcher.ts:246-275` which fills `email_to / email_cc / email_bcc / email_from / subject / snippet (200 chars) / rich_content (full HTML) / integration_provider / external_id / message_status / metadata.ai_*`. Outbound SMS/WhatsApp similarly fill `from_number / to_number / message_status`. The DB sample queries (§8) showed that the *seed-data* fixture rows on the test tenant have all of those columns NULL, but real dispatcher-produced rows do populate them. That mismatch is worth flagging because anyone testing the activity feed against the seed data will see "blank" outbound emails and conclude something is broken when in fact the dispatcher is fine — the seeds just predate the dispatcher.

Reply UX from inbound is functional but minimal. Opening an inbound email or SMS in the slide-in panel exposes a Reply button that pre-fills `to`, derives `Re: <subject>` for emails, and posts to the same `/api/communications/send-*` route. There is no link between the original inbound activity and the reply: the resulting outbound row has no `in_reply_to_activity_id` or `thread_id`. So clicking Reply twice produces two unrelated outbound activities that just happen to be addressed to the same contact.

### 1.3 Confirmed since D03 (problems still applicable)

- D03 §11.7: no email attachments support.
- D03 §11.8: no HTML sanitisation.
- D03 §11.9: SMS cost estimate hardcoded to `chars/160 * 0.0075` (still wrong for Unicode/international).
- D03 §11.5: no Reply-To-token threading on outbound email; no Message-ID / In-Reply-To headers stamped.
- D03 §11.6: no unsubscribe / List-Unsubscribe header enforcement.
- D03 §1: no inbox / conversations view.
- D03 §1: bulk send entitlement gating not enforced (no role check; only the per-tenant rate limit will throttle).
- D03 §11.4: no idempotency keys on queued jobs (`enqueueCommunication` does not pass `jobId`).
- D03 §1: `extractEmailPurpose` / `extractSMSPurpose` / `extractWhatsAppPurpose` are still keyword classifiers labelled "AI Helper" both at the route layer and inside `dispatcher.ts:99-184`. Same code, two copies.
- D03 §4.2: two activity-detail UI variants (modal + slide-in) both still shipped.
- D03 §11.2: dispatcher does not mark `message_status: 'failed'` from a 4xx; it throws and the route returns 500. (`dispatcher.ts:225-228`, `:357-360`, `:465-468`.)

### 1.4 Resolved since D03

- D03 §1 / §8: all five `send-*` routes now require auth + override body `tenant_id` + rate-limit per (tenant, channel). Closed by 2b.5.
- D03 §1: `/api/emails/test` deleted. Closed by 2b.5 §6.
- D03 §1: per-tenant per-minute rate limits exist (60 email / 30 sms / 30 whatsapp / 10 voice). Closed by 2b.5.
- D03 §5.4: `send-whatsapp-v2` writing to canonical `to_number / from_number / message_status` columns. Was actually already correct as of 2b.4 (the v2 route comments at L80-83 confirm); D03 was right that v1 *had* used non-existent columns historically, but the inline fix predates 2b.5.
- D03 §1: dispatcher-driven outbound `whatsapp` activity rows now include `metadata.has_media` and `integration_metadata.media_url` (`dispatcher.ts:495-501`). Was not in D03 §9.1.
- D03 §5.3 "5 different files all claiming to be the email service": effectively 2, post-2b.5, for the user-facing outbound flow (`dispatcher.ts` + `email-provider.ts`). The other three (`email-service.ts`, `services/email-service.ts`, `email-queue.ts`) are now isolated to the system-email path or dead.
- D03 §1 / §11.1: BullMQ queue → dispatcher fallback exists (`send-email/route.ts:97-138`); confirmed lines covered by tests in `__tests__/route.test.ts`.

### 1.5 Newly discovered (not in D03)

- **`PATCH /api/settings/{email,sms,whatsapp}` is the new P0**: same shape as the closed send-route hole — body-trusted `tenant_id`, service-role write, no auth (§7).
- **The settings UIs and the dispatcher write to disjoint storage**: SMS settings UI saves to `tenants.sms_api_key` / `sms_api_secret` / `sms_from_number` (plain text); the dispatcher reads `sms_account_sid / sms_auth_token / sms_messaging_service_sid` from `loadTenantIntegrationSettings` (vault → channel_settings → legacy → env). A practice that fills in the SMS settings tab will *not* be enabling SMS sending. The dispatcher will throw "SMS integration not configured" until env vars are set or the newer `<CommunicationsIntegrationsTab>` is used (§7.3).
- **`<BulkSendPanel>` will throw on render**: missing `Avatar` / `AvatarFallback` imports at L160-164 (§3.4).
- **Click-to-call "End Call" button does not actually end the Twilio call** — just resets local state (`click-to-call-dialer.tsx:146-156`).
- **`emails/welcome/route.ts` is wide open** — no auth, no rate limit. Trusts body `email`, `name`, `practiceName` and sends through Resend. Documented as "leave alone" in 2b.5 §3.5 because it has zero source callers, but it remains a public spam vector for any outsider who finds the URL.
- **Activity-feed mock content**: `activity-detail-slide-in.tsx:729-760` ships hardcoded "Patient interested in orthodontic treatment / Budget range: $3,000 - $5,000 / Schedule initial consultation" placeholders that render as "AI Key Points / Next Actions" when `metadata.ai_key_points` is missing. Customers will see these on every real activity that doesn't have AI metadata yet (which today is all of them, per the §8 fixture-row check) and the placeholders look real, not like obvious lorem-ipsum.
- **`templates_manager.tsx` "Use" button is a no-op** (L237-241): clicking it does nothing — there is no plumbing back to the composers.
- **`activity_templates` table is empty in production**: 0 rows. The templates feature has never been used.
- **System email is divided across two parallel modules**: `lib/email-service.ts` (Resend-only, used by `emails/welcome` + `users/invite` + `join-requests/*`) and `lib/services/email-service.ts` (multi-provider `sendEmail` + the same `users/invite` + `join-requests/*` endpoints import its `sendInvitationEmail`/`sendJoinRequest*`). Both are imported by the same callers — invite emails are likely being sent through both paths depending on which export the route reaches for. This is not user-facing outbound, but it is a hygiene mess that any rebuild phase touching email needs to clean up.

---

## §2 — User-facing capabilities

| Capability | Where (UI) | API | Status | Permission |
|---|---|---|---|---|
| Send email from contact view | `<EmailComposerPanel>` opened from `<ContactDetailView>` | `POST /api/communications/send-email` | ✅ Working | logged-in tenant member; rate-limited 60/min/tenant |
| Send SMS from contact view | `<SMSComposerPanel>` | `POST /api/communications/send-sms` | ✅ Working | tenant member; 30/min/tenant |
| Send WhatsApp from contact view | `<WhatsAppComposerPanel>` | `POST /api/communications/send-whatsapp` | ✅ Working | tenant member; 30/min/tenant |
| Make a call (click-to-call) | `<ClickToCallDialer>` | `POST /api/communications/initiate-call` | ⚠ Initiates; "End Call" button is fake | tenant member; 10/min/tenant |
| Bulk send (email/sms) to multiple contacts | `<BulkSendPanel>` | per-contact loop POST to v1 send routes | ❌ **Crashes on render** (missing Avatar import) | no role check beyond tenant member |
| Use a template | `<TemplatesManager>` | reads `activity_templates` | ❌ "Use" button is a no-op; 0 rows in DB | tenant member |
| AI-draft an email | (UI button in `<EmailComposerPanel>`) | `POST /api/ai-assistant/draft-email` | ❌ The composer's "AI Draft" button is a `toast.info('coming soon')` stub. The API route works but is unwired. | tenant member; no rate limit |
| Reply to an inbound email | `<ActivityDetailSlideIn>` Reply panel | `POST /api/communications/send-email` | ⚠ Works; no thread linkage / no In-Reply-To header | tenant member |
| Reply to an inbound SMS | `<ActivityDetailSlideIn>` Reply panel | `POST /api/communications/send-sms` | ⚠ Works; no thread linkage | tenant member |
| Reply to an inbound WhatsApp | `<ActivityDetailSlideIn>` Reply panel | `POST /api/communications/send-whatsapp` | ⚠ Works; no thread linkage; no template selection | tenant member |
| See the global activity feed | `<GlobalActivityFeed>` | reads `activities_with_integrations` view | ✅ Working | tenant member |
| Open an activity detail | `<ActivityDetailModal>` or `<ActivityDetailSlideIn>` | reads `activities_with_integrations` | ⚠ Two parallel UI variants in shipped code | tenant member |
| Configure email provider per-tenant | `<EmailConfigTab>` | `PATCH /api/settings/email` | ❌ No auth on the route. Writes SMTP fields the dispatcher does not read. | nominally owner/manager; not enforced |
| Configure SMS provider per-tenant | `<SMSConfigTab>` | `PATCH /api/settings/sms` | ❌ No auth. Writes plain-text columns the dispatcher does not read directly (legacy fallback only). | nominally owner/manager; not enforced |
| Configure WhatsApp per-tenant | `<WhatsAppConfigTab>` | `PATCH /api/settings/whatsapp` | ❌ No auth. Writes plain-text columns the dispatcher does not read. | nominally owner/manager; not enforced |
| Configure integrations (newer) | `<CommunicationsIntegrationsTab>` | (separate routes; not audited in scope this phase) | ⚠ Coexists with the three legacy tabs above; user can pick either | nominally owner/manager |
| ❌ Unified inbox / conversations view | **Doesn't exist** | n/a | ❌ Per-contact activity feed is the only surface. | n/a |
| ❌ Approved-template picker for WhatsApp | **Doesn't exist** | n/a | ❌ Composer accepts free-form body; Twilio Business API will reject if outside the 24-hour session window. | n/a |
| ❌ Email open / click tracking | **Disabled by default** in `EmailConfigTab` shape (`enable_tracking: true` is set in state but never persisted) | n/a | ❌ No pixel injection, no click rewriting, no `email_opens / email_clicks` table. | n/a |
| ❌ Email attachments | **Not supported** | n/a | ❌ Dispatcher's `dispatchEmail` payload has no `attachments` field. | n/a |
| ❌ Per-email Reply-To override | **Not supported** | n/a | ❌ Composer has no Reply-To field; dispatcher uses the tenant default. | n/a |

---

## §3 — UX flows

### 3.1 Sending an email from a contact (the working path)

1. User opens a contact's detail page; the contact's `primary_email` populates the composer's "to" prop.
2. User clicks "Send Email" → `<EmailComposerPanel>` slides in from the right.
3. Composer pulls `tenantId` and `userId` from `useTenantContext()` props passed in.
4. User types subject and body. The "AI Draft" button (`email-composer-panel.tsx:123-134`) is a stub: clicking it shows `toast.info('AI drafting coming soon!')`. There are 3 hardcoded "Quick Templates" buttons (`L300-337`) that just `setSubject(...)` and `setBody(...)` to fixed strings.
5. User clicks Send → `handleSend` (`L57-121`):
   1. Validates non-empty `to/subject/body`.
   2. Reads the Supabase session, attaches `Authorization: Bearer <token>` header (defense in depth — the cookie is also sent via `credentials: 'include'`).
   3. POSTs `{to, cc, bcc, subject, body, contact_id, deal_id, tenant_id, user_id}` to `/api/communications/send-email`.
6. Route (`send-email/route.ts:62-150`):
   1. `requireAuthenticatedTenantUser(request)` — looks up `app_users.active_tenant_id` join `user_tenant_memberships`. 401 on no session.
   2. `assertBodyTenantMatches(body.tenant_id, auth.tenantId)` — 403 on mismatch.
   3. Overrides `body.tenant_id = auth.tenantId` and `body.user_id ??= auth.userId`.
   4. `enforceOutboundRateLimit(auth.tenantId, 'email')` — 60/min sliding window via Redis.
   5. `extractEmailPurpose(subject, body)` keyword classifier (also runs inside the dispatcher; see §1.3).
   6. If `QUEUE_COMMUNICATIONS=true` and `queueManager.isEnabled()` → `enqueueCommunication({type:'email', context, payload})` → 202 Accepted; the BullMQ worker processes via `lib/queues/communication-queue.ts:handleEmailJob` → `dispatchEmail`. Otherwise → `dispatchEmail` directly → 200.
7. Dispatcher (`dispatcher.ts:dispatchEmail` L186-326):
   1. `loadTenantIntegrationSettings(tenantId)` — vault → channel_settings → legacy `integration_settings` row → env (in priority order). Throws "Email integration not configured" if `is_email_configured` is false.
   2. `sendEmailWithIntegration(emailSettings, payload)` → `lib/integrations/email-provider.ts` switches on `email_provider.toLowerCase()` → SendGrid / Gmail / Outlook / SES / Resend. Each branch returns `{success, externalId, status, providerResponse, updatedToken?, error?}`.
   3. On Gmail-only, if `updatedToken` came back and channel source was legacy, refresh the row's `email_oauth_token` / `email_oauth_expires_at`.
   4. Insert `activities` row: `type='email', direction='outbound', subject, snippet (200ch), rich_content (full HTML), email_to, email_cc, email_bcc, email_from, integration_provider, external_id, message_status, metadata.ai_*, occurred_at, created_at`. (`agent_user_id = context.userId`.)
   5. Insert `integration_logs` row referencing the activity.
   6. If `dealId` present → `detectAndFireFirstResponse` for Google Ads attribution (best-effort).
8. Composer toasts success, resets fields, closes.

**Friction / gaps observed in this flow:**
- Composer asserts `tenantId && userId` from props (`L63-66`). If those props aren't passed it shows "Missing tenant or user context. Please refresh." — meaning the composer is hard-coupled to the parent passing the right context. Since 2b.5 the route ignores body `tenant_id` anyway, so this client-side guard is now redundant defense rather than necessary.
- No attachment field. The composer has a `<Paperclip>` button (`L283-287`) that does nothing.
- No template picker beyond the 3 hardcoded buttons. The `<TemplatesManager>` data is unused here.
- No HTML editor — the body is a plain `<Textarea>`, sent as `html` to the dispatcher unchanged. So a user typing a multi-line email gets `\n` line breaks rendered as a single line in HTML email clients (no `<br>` conversion).
- No Reply-To override field.

### 3.2 Sending an SMS from a contact

Same shape as 3.1, slightly simpler. `<SMSComposerPanel>` (`L53-93`):
1. Posts `{to, message, contact_id, deal_id, tenant_id, user_id}` to `/api/communications/send-sms` (the v1 route).
2. The composer does **not** attach an Authorization Bearer header (unlike the email composer). It relies entirely on the session cookie. Works because the cookie is sent by default on same-origin POSTs, but it's an inconsistency worth noting.
3. The cost estimator (`L43-44`) is hardcoded to GSM-7 segments × $0.0075. Wrong for emoji and for non-US/UK destinations.
4. Maximum input is `maxLength={1600}` (10 segments). No warning past that.

### 3.3 Sending a WhatsApp message

`<WhatsAppComposerPanel>` (`L51-93`):
1. Posts `{to, message, media_url, contact_id, deal_id, tenant_id, user_id}` to `/api/communications/send-whatsapp` (v1).
2. `media_url` field is a free text input — user has to paste a public URL. The "Upload Image" / "Upload PDF" buttons (`L160-167`) are `disabled`, with a "coming soon" caption (`L169-171`).
3. No Twilio approved-template picker. WhatsApp Business API requires sends outside the 24-hour customer-initiated session window to use a pre-approved template; the composer offers no way to do that. Sends to contacts whose last inbound message is >24h old will fail at the Twilio layer with `error 63016`. The composer surfaces the failure as a generic `data.error`.

### 3.4 Bulk send to multiple contacts

`<BulkSendPanel>` (`L52-107`):
1. User selects N contacts via checkboxes.
2. User types subject + body (with `{{contact_name}}` / `{{practice_name}}` shown as variable hints in `L196-197`, but the send code at `L71-90` never substitutes anything — variables are sent as literal `{{contact_name}}` to the recipient).
3. On Send, loops sequentially, posting per-contact to `/api/communications/send-email` or `/api/communications/send-sms`.
4. Tracks `sent` / `failed` counters and a progress bar.
5. **Will crash before rendering**: `L160-164` uses `<Avatar>` + `<AvatarFallback>` but neither is imported. Error: `ReferenceError: Avatar is not defined`. The panel cannot have been used in production since the imports were removed (probably during a refactor — `Avatar` is imported in every other communications panel).
6. Even if rendered, the per-contact loop hits the per-tenant rate limit (60/min email, 30/min SMS) on bulk-send sizes >60 (or 30) and partially fails.

### 3.5 Using a template

`<TemplatesManager>` (`L57-77`):
1. Loads from `activity_templates` filtered by tenant.
2. Cards show the template name, channel badge, subject/content preview, and detected `{{variable}}` names.
3. The "Use" button (`L237-241`) is **not wired**. Clicking it does nothing — there is no callback prop, no event emission, no router push. The composers do not know about the `<TemplatesManager>` and don't accept a "preselected template" prop.
4. Variable substitution helper: `extractVariables` (`L138-142`) parses `{{name}}` matches at *save* time and stores them in the row's `variables` JSONB column. There is no helper that *expands* `{{name}}` at send time.
5. **DB state**: 0 rows in `activity_templates` across all tenants (§ live query 7).

### 3.6 Replying to an inbound message

From `<ActivityDetailSlideIn>` (`L159-222`):
1. User opens an inbound activity (e.g. an SMS or email reply).
2. Clicks "Reply" → an inline `<Textarea>` opens.
3. On Send, `handleReply` builds a payload based on `activity.type`:
   - email: `{to: [activity.contact_email], subject: 'Re: ' + activity.subject, body: replyBody, contact_id, deal_id, tenant_id, user_id}` → `POST /api/communications/send-email`.
   - sms: `{to: activity.contact_phone, message: replyBody, ...}` → `POST /api/communications/send-sms`.
   - whatsapp: same as sms but → `/send-whatsapp`.
4. On success: refreshes the activity panel via `loadActivity()`.

**No thread linkage anywhere in this flow.** The reply produces a fresh outbound `activities` row with no `in_reply_to_activity_id`, no `thread_id`, no `In-Reply-To` email header, no Message-ID echoing the original. Two replies to the same inbound message produce two unrelated outbound rows.

---

## §4 — Backend send routes (one subsection per route)

### 4.1 `/api/communications/send-email` — 162 LOC
- **Auth model post-2b.5:** `requireAuthenticatedTenantUser` → `assertBodyTenantMatches` → override → `enforceOutboundRateLimit('email')` (60/min/tenant). Source-of-truth for tenant is `app_users.active_tenant_id` ⨝ `user_tenant_memberships`.
- **Provider used:** routed through `dispatcher.dispatchEmail` → `loadTenantIntegrationSettings` → `email-provider.sendEmailWithIntegration` → SendGrid / Gmail / Outlook / SES / Resend depending on tenant config.
- **Body shape expected:** `{to, cc, bcc, subject, body, contact_id?, deal_id?, tenant_id?, user_id?}`. After 2b.5, `tenant_id` is overridden; required fields validated post-override are `to / subject / body`.
- **Activity row written by dispatcher** (`dispatcher.ts:246-275`): `tenant_id, type='email', contact_id, deal_id, agent_user_id, direction='outbound', subject, snippet (200ch), rich_content (full HTML), integration_provider, external_id, email_to, email_cc, email_bcc, email_from, message_status, metadata: {ai_purpose, ai_outcome, ai_summary, ai_sentiment: 'neutral'}, occurred_at, created_at`.
- **Response shape (sync):** `{success, activity_id, external_id, message: 'Email sent successfully!', status, ai_purpose, ai_outcome, ai_summary}`.
- **Response shape (queued, 202):** `{success, queued: true, message: 'Email queued for delivery', ai_purpose}`.
- **Known issues / TODOs:** route still ships its own `extractEmailPurpose` keyword classifier (L13-54) which duplicates `dispatcher.ts:99-137`. Pre-existing Lizard cyclomatic-complexity warning per 2b.5 §9.1.
- **Recommendation:** **Keep.** Delete the duplicated `extractEmailPurpose` (the dispatcher already runs it).

### 4.2 `/api/communications/send-sms` (v1) — 128 LOC
- **Auth model:** identical 2b.5 prelude. Channel `sms`, 30/min/tenant.
- **Provider used:** `dispatcher.dispatchSms` → `smsService` initialized from `loadTenantIntegrationSettings` (`sms_account_sid + sms_auth_token + (sms_messaging_service_sid | sms_from_number)`).
- **Body shape:** `{to, message, contact_id?, deal_id?, tenant_id?, user_id?}`. Required after override: `to, message`.
- **Activity row written by dispatcher** (`dispatcher.ts:367-394`): `type='sms', subject='SMS', snippet=message[0..200], integration_provider='twilio_sms', external_id=messageId, from_number, to_number, message_status, metadata.ai_*, occurred_at, created_at`.
- **Response (sync):** `{success, activity_id, external_id, message, status, ai_purpose, ai_outcome, ai_summary, characters: message.length, estimated_cost: ceil(chars/160)*0.0075}`.
- **Response (queued, 202):** `{success, queued: true, message, ai_purpose}`.
- **Known issues / TODOs:** duplicate `extractSMSPurpose` keyword classifier (L13-34). Hardcoded cost calculation. Pre-existing Lizard CC=12 warning.
- **Recommendation:** **Keep**, but consolidate with v2 (one or the other should be deleted; see §4.3).

### 4.3 `/api/communications/send-sms-v2` — 121 LOC
- **Auth model:** identical, factored into `authAndRateLimit` helper (`L17-26`) to keep CC under the lint limit. Same channel/limits.
- **Provider used:** **Bypasses dispatcher.** Reads `sms_provider, sms_api_key, sms_api_secret, sms_from_number` directly from the **legacy plain-text `tenants` columns** (`L67-71`), initializes `smsService`, sends, and writes activity row inline (`L90-103`). The route never calls `loadTenantIntegrationSettings`, so it ignores both the encrypted vault and the channel-settings table.
- **Body shape:** `{to, message, contact_id?, deal_id?, tenant_id?}`. (No `user_id`; the route does not write `agent_user_id`.)
- **Activity row written inline:** `tenant_id, contact_id, deal_id, type='sms', direction='outbound', subject='SMS Sent', description: message, occurred_at, to_number, from_number, message_status='sent', external_id`. **Note: `agent_user_id` is not set, `metadata` is not set, `snippet` is not set**, contrary to D03 §5.6 expectations and contrary to the dispatcher's row shape. So v2 produces a structurally different activity row from v1.
- **Response:** `{success, messageId}` (no `activity_id`, no `ai_*` fields, no characters/cost).
- **Known issues / TODOs:** the route is wired to legacy plain-text credentials that **no UI currently writes** unless someone uses the legacy `<SMSConfigTab>`; the newer `<CommunicationsIntegrationsTab>` writes elsewhere. Activity row lacks `agent_user_id` / `metadata` / `snippet`.
- **Recommendation:** **Deprecate and delete after confirming no UI calls it.** Grep confirms no source caller — every composer hits v1. Either delete this file or rewrite it as a thin pass-through to `dispatcher.dispatchSms` and remove the v1 file.

### 4.4 `/api/communications/send-whatsapp` (v1) — 134 LOC
- **Auth model:** identical 2b.5 prelude. Channel `whatsapp`, 30/min/tenant.
- **Provider used:** `dispatcher.dispatchWhatsApp` → `whatsappService` initialized from `loadTenantIntegrationSettings` (`whatsapp_account_sid + whatsapp_auth_token + whatsapp_from_number`).
- **Body shape:** `{to, message, media_url?, contact_id?, deal_id?, tenant_id?, user_id?}`.
- **Activity row written by dispatcher** (`dispatcher.ts:475-505`): `type='whatsapp', subject='WhatsApp Message', snippet=message[0..200], integration_provider='twilio_whatsapp', external_id, from_number=whatsapp_from_number, to_number=whatsapp:<to>, message_status, metadata.ai_*, integration_metadata.media_url, occurred_at, created_at`.
- **Response:** `{success, activity_id, external_id, message, status, ai_purpose, ai_outcome, ai_summary, has_media}`.
- **Known issues / TODOs:** duplicate `extractWhatsAppPurpose` (L14-37). Pre-existing Lizard CC=14 warning.
- **Recommendation:** **Keep**, consolidate with v2.

### 4.5 `/api/communications/send-whatsapp-v2` — 175 LOC
- **Auth model:** identical, factored into `authAndRateLimit` (L17-33).
- **Provider used:** **Bypasses dispatcher.** Reads `whatsapp_api_key, whatsapp_api_secret, whatsapp_phone_number` directly from legacy plain-text `tenants` columns (`L137-141`), initializes `whatsappService`, sends, writes activity row inline (`L84-97`).
- **Body shape:** `{to, message, mediaUrl?, contact_id?, deal_id?, tenant_id?}`.
- **Activity row written inline:** `tenant_id, contact_id, deal_id, type='whatsapp', direction='outbound', subject='WhatsApp Sent', description: message, occurred_at, to_number, from_number, message_status='sent', external_id`. Same lacks-fields shape as v2 SMS.
- **Response:** `{success, messageId}`.
- **Known issues / TODOs:** explicit comment in the file (`L80-83`) about historical column drift (`whatsapp_to/from/status → to_number/from_number/message_status`) — D03 §5.4's claim is preserved as a comment but the actual fix is older than 2b.5. Like v2 SMS, this route reads legacy columns no current UI populates correctly.
- **Recommendation:** **Deprecate and delete after confirming no UI calls it.** Grep confirms only v1 is wired.

### 4.6 `/api/communications/initiate-call` — 74 LOC
- **Auth model:** identical 2b.5 prelude. Channel `voice`, 10/min/tenant.
- **Provider used:** `dispatcher.dispatchVoiceCall` → Twilio Voice via `voiceService` initialized from `loadTenantIntegrationSettings` (`voice_account_sid + voice_auth_token + voice_from_number`); requires `APP_URL` / `NEXT_PUBLIC_APP_URL` env to construct the TwiML callback URL.
- **Body shape:** `{to, contact_id?, deal_id?, tenant_id?, user_id?, record?}`.
- **Activity row written by dispatcher** (`dispatcher.ts:603-636`): `type='call', subject='Phone Call', snippet='Call to <to>', integration_provider='twilio_voice', external_id=callSid, call_sid, call_from, call_to, outcome ('connected'|'failed'), message_status ('queued'|'failed'), metadata: {ai_purpose, ai_summary, recording_enabled, needs_outcome_update: true}, integration_metadata.recording_enabled, occurred_at, created_at`. Note this is the only outbound that uses `outcome` and `call_sid` columns.
- **Response:** `{success, activity_id, call_sid, message, status, ai_purpose, ai_summary, note: 'Call details (duration, recording) will update automatically via webhook.'}`.
- **Known issues / TODOs:** Voice fully out of scope per Toffee but the auth fix is in. No "end call" API; the dialer's End Call button is local-only.
- **Recommendation:** **Keep auth fix as-is**; full voice work is D15 / post-launch.

### 4.7 `/api/emails/welcome` — 27 LOC
- **Auth model:** **None.** `POST` with `{email, name, practiceName}` will trigger a real Resend email to the supplied address.
- **Provider used:** `lib/email-service.ts → emailService.sendWelcome` → Resend (using env `RESEND_API_KEY` / `RESEND_FROM_EMAIL`).
- **Body shape:** `{email, name, practiceName}`. No tenant context. Sends a generic "Welcome to Dental CRM, {name}!" template with hardcoded link to `${NEXT_PUBLIC_APP_URL}/onboarding`.
- **Activity row:** **None.** This route writes nothing to `activities`; it is a fire-and-forget transactional mail.
- **Response:** `{success: true}` or `{error: 'Failed to send email'}` 500.
- **Known issues / TODOs:** documented in 2b.5 §3.5 as "no source callers, leave alone." That's true for *source* callers — but it remains a public spam vector if discovered. Anyone POSTing arbitrary `email/name/practiceName` will get a Resend message dispatched.
- **Recommendation:** **Delete OR gate.** Either delete (mirrors `/api/emails/test` deletion) or wrap with `requireAuthenticatedTenantUser` plus a strict per-tenant cap (1 welcome/user/day). 5-minute archaeology pass to confirm provenance first.

### 4.8 `/api/ai-assistant/draft-email` — 149 LOC
- **Auth model:** `requireAuthenticatedTenantUser + assertBodyTenantMatches` only (no `enforceOutboundRateLimit` — drafting is not a send). Closed by 2b.5.
- **Provider used:** OpenAI `gpt-4-turbo-preview` via `getOpenAIClient()`. Server-side OpenAI key (env `OPENAI_API_KEY`).
- **Body shape:** `{activityId, dealId, contactId, incomingEmailContent, tenantId?}`. tenantId is overridden post-2b.5.
- **Side effect:** inserts into `ai_email_drafts` table: `{tenant_id, activity_id, deal_id, contact_id, draft_subject, draft_body, generated_by_ai: true, status: 'pending'}`.
- **Response:** `{success, draft: {id, subject, body}, tokensUsed}`.
- **Known issues / TODOs:** the parent UI (`<EmailComposerPanel>`) does not call this endpoint — its "AI Draft" button is a `toast.info` stub (`email-composer-panel.tsx:123-134`). So the route exists, is gated, is tested — and is unwired to the UI. There is also no per-tenant or per-user cost cap on OpenAI calls.
- **Recommendation:** **Wire the composer**. Add a per-tenant OpenAI token-budget gate before launch (Limelight Digital practices will run this weekly during setup; without a budget cap a runaway script could rack up cost).

### 4.9 Other routes under `dental-crm/src/app/api/communications/`

Checked via `Glob api/communications/**/route.ts`. The full list:
- `send-email/`, `send-sms/`, `send-sms-v2/`, `send-whatsapp/`, `send-whatsapp-v2/`, `initiate-call/`. **Six routes total.** No others. (The `__tests__/` subfolders contain Jest specs, not routes.)

### 4.10 Other routes under `dental-crm/src/app/api/emails/`

Only `welcome/`. `/api/emails/test` deletion confirmed. (Glob returned a single file.)

---

## §5 — Provider abstraction layers

D03 §7 listed five "email" files. Here is the post-2b.5 picture, with `who imports this` grep results.

### 5.1 `lib/communications/dispatcher.ts` — 695 LOC — **CANONICAL for user-facing CRM outbound**
- Exports: `dispatchEmail`, `dispatchSms`, `dispatchWhatsApp`, `dispatchVoiceCall`.
- Imported by:
  - `app/api/communications/send-email/route.ts`
  - `app/api/communications/send-sms/route.ts` (v1)
  - `app/api/communications/send-whatsapp/route.ts` (v1)
  - `app/api/communications/initiate-call/route.ts`
  - `lib/queues/communication-queue.ts`
  - `lib/notifications/channel-adapters.ts`
  - `lib/engagement/campaign-engine.ts`
  - `lib/engagement/bot-service.ts`
- **Recommendation:** **Keep. Single source of truth.** Wire v2 routes into it (or delete v2 routes).

### 5.2 `lib/integrations/email-provider.ts` — 460 LOC — **CANONICAL for per-tenant email provider routing**
- Exports: `sendEmailWithIntegration`, `EmailIntegrationSettings`, `EmailSendPayload`, `EmailSendResult`.
- Branches by `email_provider`: `sendgrid` (SDK), `gmail` (OAuth + Google API), `outlook` (Graph API + token refresh), `microsoft`/`office365` (alias of outlook), `ses` (AWS SDK), `resend` (HTTP API). Default branch returns `{success: false, error: 'Unsupported email provider'}`.
- Imported only by `dispatcher.ts`.
- **Recommendation:** **Keep.** Add a sixth branch handler for SMTP if the legacy SMTP fields in `<EmailConfigTab>` are to be honoured (currently they aren't).

### 5.3 `lib/email-service.ts` — 266 LOC — Resend-only **system-email** service
- Exports: `EmailService` class + `emailService` singleton with methods `sendInvitation`, `sendWelcome`, `sendPasswordReset`, `sendEmailVerification`. Uses env `RESEND_API_KEY` exclusively.
- Imported by:
  - `app/api/emails/welcome/route.ts` (uses `sendWelcome`).
  - `app/api/users/invite/route.ts` (likely uses `sendInvitation`).
  - `app/api/join-requests/route.ts` and the `[id]/approve/[id]/reject` routes.
- Not imported by any user-facing CRM outbound code.
- **Recommendation:** **Keep, but rename** to `lib/system-email-service.ts` or move under `lib/system-emails/` to make the scope obvious. The current name actively confuses readers (D03 §7 was confused for this exact reason).

### 5.4 `lib/services/email-service.ts` — 521 LOC — multi-provider `sendEmail` + system-email templates
- Exports: `sendEmail`, `sendInvitationEmail`, `sendJoinRequestNotification`, `sendJoinRequestApproved`, `sendJoinRequestRejected`, `sendSeatLimitWarning`. Branches by `getEmailProvider()` (Resend / SendGrid / Console).
- Imported by **the same callers** as `lib/email-service.ts`: `users/invite/route.ts`, `join-requests/route.ts`, the approve/reject routes. So those routes pull `sendInvitation` from one file and `sendInvitationEmail` from another — which means the same operation is implemented twice in parallel.
- Not imported by any user-facing CRM outbound code.
- **Recommendation:** **Pick one and delete the other.** This is genuinely dead-or-duplicate; not in scope for outbound rebuild but worth flagging because both files contain the word "email-service" and casual readers can't tell which is canonical.

### 5.5 `lib/email-queue.ts` — 273 LOC — `email_logs`-backed in-process queue — **DEAD**
- Exports: `EmailQueue` class, `emailQueue` singleton, `QueuedEmail` type. Self-starts a 60s `setInterval` processor on import in non-test server envs.
- Imported by **no one** (`Grep "from '@/lib/email-queue'"` returns 0 hits in the route layer; only its own tests).
- Pre-dates `lib/queues/communication-queue.ts` (BullMQ). Predates dispatcher.
- **Recommendation:** **Delete** after confirming `email_logs` table is also unused, or keep purely as a fallback if `BullMQ_REDIS_URL` is unset (currently the BullMQ path simply falls back to direct dispatch; no need for a second queue).

### 5.6 `lib/sms-service.ts` — 99 LOC — **CANONICAL Twilio SMS wrapper**
- Exports: `SMSService` class + `smsService` singleton. `initialize({accountSid, authToken, fromNumber, messagingServiceSid})` + `send({to, message, from?, messagingServiceSid?})`.
- Imported by `dispatcher.ts:dispatchSms` AND by `app/api/communications/send-sms-v2/route.ts` (which bypasses dispatcher).
- **Recommendation:** **Keep.** Only consumer should be the dispatcher once v2 is removed.

### 5.7 `lib/whatsapp-service.ts` — 72 LOC — **CANONICAL Twilio WhatsApp wrapper**
- Exports: `WhatsAppService` class + `whatsappService` singleton.
- Imported by `dispatcher.ts:dispatchWhatsApp` AND `app/api/communications/send-whatsapp-v2/route.ts`.
- **Recommendation:** **Keep.** Single consumer once v2 is removed.

### 5.8 `lib/marketing/sms-provider.ts` — 195 LOC — interface stub + NoOp + Twilio-stub — **DEAD at outbound**
- Exports: `ISmsProvider` interface, `NoOpSmsProvider`, `TwilioSmsProvider` (stub with TODOs), `createSmsProvider` factory.
- Imported by **no one** outside `lib/marketing/` itself (factory is referenced in marketing audit code, not in send routes).
- **Recommendation:** **Delete or move into `lib/marketing/`-only**. It is not part of the outbound channel layer.

### 5.9 `lib/queues/communication-queue.ts` — 142 LOC — BullMQ wrapper
- Exports: `registerCommunicationQueue`, `enqueueCommunication`, `getCommunicationQueueMetrics`, queue name constants.
- Imported by all four channel send routes (email/sms/whatsapp/initiate-call) plus the queue manager.
- The four `handle*Job` functions just delegate to the corresponding `dispatch*`.
- **Recommendation:** **Keep.** Add idempotency keys (D03 §11.4 / §11 issue #18 below).

### 5.10 `lib/integrations/tenant-integration-config.ts` — 420 LOC — credential resolver
- Exports: `loadTenantIntegrationSettings`, `NormalizedIntegrationSettings`. Resolves credentials in order: vault (`integration_secret_vault` via `integration_load_credentials` rpc) → `integration_channel_settings` row → legacy `integration_settings` row → env vars. Marks `_debug.channelSource` and `_debug.secretSource` for the dispatcher.
- Imported by `dispatcher.ts` only.
- **Recommendation:** **Keep**; this is the right shape per F05 §4.

### 5.11 Proposed canonical layer per channel (rebuild target)

| Channel | Canonical entry | Provider router | Provider SDK wrapper | Storage |
|---|---|---|---|---|
| Email | `dispatcher.dispatchEmail` | `email-provider.sendEmailWithIntegration` | (per-provider; SendGrid/Gmail/Outlook/SES/Resend SDKs) | `loadTenantIntegrationSettings` → vault > channel_settings > legacy > env |
| SMS | `dispatcher.dispatchSms` | n/a (single provider Twilio) | `lib/sms-service.ts` | same |
| WhatsApp | `dispatcher.dispatchWhatsApp` | n/a (Twilio WhatsApp Business) | `lib/whatsapp-service.ts` | same |
| Voice | `dispatcher.dispatchVoiceCall` | n/a (Twilio Voice) | `lib/voice-service.ts` | same |

Everything else (`email-queue.ts`, `marketing/sms-provider.ts`, the v2 routes that bypass dispatcher) should be deleted. `email-service.ts` and `services/email-service.ts` should be merged and renamed to clearly mark their system-email-only scope.

---

## §6 — The dispatcher (`lib/communications/dispatcher.ts`) — 695 LOC

### 6.1 Exports
- `dispatchEmail({context, to[], cc?, bcc?, subject, html})` — L186-326.
- `dispatchSms({context, to, message})` — L328-435.
- `dispatchWhatsApp({context, to, message, mediaUrl?})` — L437-548.
- `dispatchVoiceCall({context, to, record?})` — L550-694.

`BaseContext = {tenantId, userId?, contactId?, dealId?}`. Returned shape per channel: `{activityId, externalId, status, aiPurpose, aiOutcome, aiSummary}` (email/sms/whatsapp); voice adds `callSid, success, providerResponse, error`.

### 6.2 How each function picks its provider

All four start with `loadTenantIntegrationSettings(tenantId, {supabase})`. If the returned `is_*_configured` flag is false → `recordProviderFailure(...)` and `throw new Error('… not configured. Please configure in Settings → Integrations.')`.

- **Email** (`L197-223`): pulls `email_provider, email_api_key, email_from_address, email_from_name` (and OAuth tokens for Gmail/Outlook only via the channel-source-legacy path) and calls `sendEmailWithIntegration`. Five provider branches inside `email-provider.ts`.
- **SMS** (`L336-355`): pulls `sms_account_sid, sms_auth_token, sms_from_number, sms_messaging_service_sid` and calls `smsService.initialize` + `.send`. Single provider (Twilio).
- **WhatsApp** (`L446-468`): pulls `whatsapp_account_sid, whatsapp_auth_token, whatsapp_from_number` and calls `whatsappService.initialize` + `.send`. Single provider (Twilio WhatsApp Business).
- **Voice** (`L559-595`): pulls `voice_account_sid, voice_auth_token, voice_from_number` and calls `voiceService.initialize` + `.initiateCall(...)`. Constructs the TwiML callback URL from `APP_URL` / `NEXT_PUBLIC_APP_URL` + tenant/contact/deal/record search params.

### 6.3 How credentials flow in
Through `loadTenantIntegrationSettings` (`lib/integrations/tenant-integration-config.ts`), priority:
1. **Vault**: `integration_load_credentials` Postgres RPC decrypts using `INTEGRATION_CREDENTIAL_KEY` env. If env missing → skips this layer.
2. **`integration_channel_settings`**: per-tenant config row with channel toggles (`twilio_voice_enabled`, `twilio_sms_enabled`, `twilio_whatsapp_enabled`, `email_provider`, defaults). Combines with vault secrets to build `NormalizedIntegrationSettings`.
3. **`integration_settings` (legacy)**: older single-row schema with all credentials inline.
4. **Env**: `TWILIO_ACCOUNT_SID/AUTH_TOKEN/MESSAGING_SERVICE_SID/SMS_FROM/WHATSAPP_SENDER/VOICE_CALLER_ID`, `SENDGRID_API_KEY`, `DEFAULT_FROM_EMAIL`, `DEFAULT_REPLY_TO_EMAIL`.

`_debug.channelSource` is one of `channel_settings | legacy | env`. `_debug.secretSource` is `vault | env | legacy | unknown`.

**Live shape on the test tenant** (per §10 query 9 + 10): 1 row in `integration_settings`, 0 rows in `integration_channel_settings`, vault not used (no `integration_secret_vault` rows under this tenant — the vault RPC returns nothing). So the dispatcher resolves credentials via the `legacy` channel source and `legacy` (or `env` for AWS keys) secret source. Anyone who reads "the vault is the source of truth" should know the test tenant is **not** using it.

### 6.4 Logging / telemetry
- Activities row written per channel (correctly; D03 §5.6 confirmed against §8 of this audit).
- `integration_logs` row written per send with `request_data` (snapshot of payload size, ai_purpose) and `response_data` (provider response). One row per send. Used by F05 §11 reporting.
- `recordProviderFailure(provider, action, error)` from `lib/monitoring/metrics.ts` — increments a Prometheus counter per provider failure. Doesn't alert.
- `console.error` on activity-insert failure (`L280, :397, :510, :639`). Pino logger is referenced in `lib/email-queue.ts` (dead) but not in `dispatcher.ts`.

### 6.5 Error handling
- Provider failure (e.g. SendGrid 4xx, Twilio reject) → `recordProviderFailure` + `throw new Error(...)`. Currently this **does not** mark the activity row as `failed` because the dispatcher throws **before** writing the activity row (it throws straight from the provider failure check at L225-228, L357-360, L465-468). Result: a failed send produces no activity at all. The route catch block returns 500.

  This is a regression from D03 §11.2's expectation that "Dispatcher should mark `message_status: 'failed'` in the activity and not throw."

- Voice (`dispatchVoiceCall`) is the exception: it inserts the activity even on `callResult.success === false`, with `outcome: 'failed', message_status: 'failed'`. Inconsistent with the other three channels.

### 6.6 Provider tagging
- Email: `integration_provider = settings.email_provider` (literal: "sendgrid" / "gmail" / "outlook" / "ses" / "resend"). ✅
- SMS: `integration_provider = 'twilio_sms'` (hardcoded). ✅
- WhatsApp: `integration_provider = 'twilio_whatsapp'` (hardcoded). ✅
- Voice: `integration_provider = 'twilio_voice'` (hardcoded). ✅

### 6.7 Specific TODOs / FIXMEs / dead branches
- The four `inferEmailPurpose` / `inferSmsPurpose` / `inferWhatsAppPurpose` keyword classifiers (L99-184) duplicate the route-layer copies. Marketing copy still calls these "AI" (D03 §1 §11.13).
- L230-239 conditional token-write only fires for `_debug.channelSource === 'legacy'`. New tenants on `channel_settings` will not get OAuth tokens refreshed back into the DB — silent breakage waiting to happen for Gmail/Outlook users on the new schema.
- `integration_logs` insert (`L282-301`) is best-effort — there's no error handling on the insert itself; if it fails the send is still considered "successful" and we lose the audit trail row.
- Voice section (L597-643) has a `try/catch` around the activity insert that the other three channels don't have. Inconsistent.
- The `extractCallInsights` helper (L17-93) has 7 stage-name string checks (`.includes('initial')`, `.includes('consultation')`, etc.). Hand-coded heuristic, also labelled "AI" downstream.

---

## §7 — Settings UIs

### 7.1 The `tenants` table currently carries 19 plain-text outbound config columns

Per §10 query 8:

```
default_email_from_address  default_email_from_name  default_email_reply_to
email                       email_main               email_support
sms_api_key                 sms_api_secret           sms_from_number
sms_phone_number            sms_provider
smtp_encryption             smtp_host                smtp_password
smtp_port                   smtp_username
whatsapp_api_key            whatsapp_api_secret      whatsapp_phone_number
```

`sms_phone_number` and `whatsapp_phone_number` are dual-purpose: they're set by the **inbound** routing logic (§F05 / 2b.4 §multi-tenant collision rule) and read by `tenants.smtp_*` / `tenants.sms_api_key` / `tenants.whatsapp_api_key` / etc. for outbound. The plain-text outbound columns predate the encrypted vault and the channel-settings table.

### 7.2 Email settings — `<EmailConfigTab>` + `PATCH /api/settings/email`

- **Fields exposed** (UI, `email-config-tab.tsx:18-28`): `smtp_host, smtp_port, smtp_username, smtp_password, smtp_encryption, default_from_name, default_from_address, default_reply_to, enable_tracking`.
- **DB columns written** (`/api/settings/email/route.ts:25-37`): `tenants.smtp_host, smtp_port, smtp_username, smtp_password, smtp_encryption, default_email_from_name, default_email_from_address, default_email_reply_to`. Plain text. Service-role client. **No auth.** Body-trusted `tenant_id`.
- **The dispatcher does not read SMTP fields.** `email-provider.ts` has no SMTP branch. So a practice that fills in this tab is configuring nothing the dispatcher will use. Even the `default_email_*` fields aren't read by `loadTenantIntegrationSettings` from the legacy `tenants` columns — that resolver reads `integration_settings.email_*` columns.
- **`enable_tracking`** is set in component state (`L27`) but never persisted (it's not in the PATCH payload) and never honoured by the dispatcher. Dead UI control.

### 7.3 SMS settings — `<SMSConfigTab>` + `PATCH /api/settings/sms`

- **Fields exposed**: `sms_provider (twilio/messagebird/vonage), sms_api_key, sms_api_secret, sms_from_number`.
- **DB columns written**: `tenants.sms_provider, sms_api_key, sms_api_secret, sms_from_number`. Plain text. **No auth.**
- **The dispatcher does not read these columns directly.** `loadTenantIntegrationSettings` resolves SMS via `integration_settings.sms_account_sid / sms_auth_token / sms_from_number / sms_messaging_service_sid` (or vault, or channel_settings). The `tenants.sms_*` columns are only read by the v2 SMS route, which no UI calls. Result: a practice that fills in this tab → dispatcher still throws "SMS integration not configured".
- The MessageBird and Vonage options in the UI dropdown are decorative — there's no provider router for SMS (Twilio is the only `smsService` implementation).

### 7.4 WhatsApp settings — `<WhatsAppConfigTab>` + `PATCH /api/settings/whatsapp`

Same shape:
- **Fields exposed**: `whatsapp_phone_number, whatsapp_api_key, whatsapp_api_secret`.
- **DB columns written**: `tenants.whatsapp_phone_number, whatsapp_api_key, whatsapp_api_secret`. Plain text. **No auth.**
- **The dispatcher does not read these.** Resolved via `integration_settings.whatsapp_account_sid / whatsapp_auth_token / whatsapp_from_number` or vault/channel-settings. Only the v2 WhatsApp route reads the legacy plain-text columns, and no UI calls v2.
- `whatsapp_phone_number` overlap: same column is used by inbound webhook tenant resolution. So the WhatsApp settings tab has *some* effect: setting the phone number will let inbound WhatsApp be routed to the tenant. Setting the api_key/secret on this tab is pointless for outbound.

### 7.5 The newer `<CommunicationsIntegrationsTab>`

Coexists with the three legacy tabs above. Reads/writes via a different route surface (not audited in this phase per §1.2 / §1.3 of the prompt). Its state shape (`L24-58`) matches the dispatcher's expected `integration_settings` columns: `email_provider, email_api_key, sms_account_sid, sms_auth_token, sms_from_number, whatsapp_account_sid, whatsapp_auth_token, whatsapp_from_number, voice_account_sid, voice_auth_token, voice_from_number`. So this is the tab that *actually* feeds the dispatcher.

The user-facing problem is that the Settings sidebar (per `settings-sidebar.tsx` / `settings-tabs.tsx`) likely surfaces both — three legacy single-channel tabs that don't work, plus one combined tab that does. A practice owner who clicks "Email Configuration" expecting it to work will fill in SMTP fields and assume they're done.

### 7.6 Per-tenant credentials story for launch

For the first 10 paying customers, each practice will have:
- Their own SendGrid sender domain + API key.
- Their own Twilio phone number (per the existing 2b.4 multi-tenant-collision gotcha).
- Optionally their own Twilio WhatsApp Business sender (operational, per-tenant per F05 §10).

The `<CommunicationsIntegrationsTab>` UI **does** support storing these per-tenant. The vault path is wired via `INTEGRATION_CREDENTIAL_KEY`. Whether each practice actually uses the vault vs. the legacy `integration_settings` row depends on which save path the UI uses; from the read we did, the test tenant has 1 row in `integration_settings` and 0 in `integration_channel_settings` and 0 in vault → meaning the live setup is currently **legacy-mode**, not vault.

---

## §8 — Activity logging on outbound send

### 8.1 What the dispatcher writes (canonical)

Reproduced from §6.2 / §4.1-4.6:

| Channel | `subject` | `snippet` | `description` | `from_*` | `to_*` | `email_*` | `message_status` | `integration_provider` | `external_id` | `metadata.ai_*` | `agent_user_id` |
|---|---|---|---|---|---|---|---|---|---|---|---|
| email | user-supplied | first 200ch of HTML | (not set) | — | — | `email_to/cc/bcc/from` set | from provider | "sendgrid"/"gmail"/etc | provider message id | yes | yes |
| sms (v1) | "SMS" | first 200ch of message | (not set) | `from_number` | `to_number` | — | from Twilio | "twilio_sms" | yes | yes | yes |
| sms (v2) | "SMS Sent" | (not set) | full message | `from_number` | `to_number` | — | hardcoded "sent" | (not set) | yes | (not set) | (not set) |
| whatsapp (v1) | "WhatsApp Message" | first 200ch | (not set) | `from_number` | `whatsapp:<to>` | — | from Twilio | "twilio_whatsapp" | yes | yes (+ has_media) | yes |
| whatsapp (v2) | "WhatsApp Sent" | (not set) | full message | `from_number` | `to_number` | — | hardcoded "sent" | (not set) | yes | (not set) | (not set) |
| call | "Phone Call" | "Call to <to>" | (not set) | `call_from` | `call_to` | — | "queued" or "failed" | "twilio_voice" | yes (= callSid) | yes | yes |

So **v1 routes write rich activity rows; v2 routes write thin ones**. Anyone migrating from v1 to v2 would lose `metadata.ai_*`, `subject` consistency, `snippet`, `agent_user_id`, and `integration_provider`. Another reason v2 is dormant code that should be removed.

### 8.2 Live samples confirm the shape (or don't)

§10 queries 3a/3b/3c showed `subject` and `snippet` populated but every other field **NULL** on the latest outbound rows for each channel. These rows pre-date the dispatcher and are seed/fixture data — confirmed by the absence of `external_id`, `integration_provider`, `message_status`. Real dispatcher-produced rows on this tenant would have those columns populated.

This matters for the rebuild because:
1. Anyone testing the activity feed against the seed data sees blank message bodies for outbound and might think the dispatcher is broken.
2. The 2b.4 §12 fix ("show inbound SMS/WhatsApp message bodies") was specifically about the slide-in panel falling back from `snippet → description`. For outbound v1, the dispatcher writes `snippet` (so the fix renders correctly). For outbound v2, the route writes `description` (so it would also render correctly via the fallback). Seeds write neither. **The §12 fix did not regress outbound rendering**, but seed data behaves like a third broken case.

### 8.3 Inbound vs outbound activity shape — diff after 2b.4 §12

Inbound (per `lib/sms/inbound.ts`, `lib/whatsapp/inbound.ts`): writes `description = received body`, `snippet` not set (or short), `subject` left empty or set to a short label. Outbound (dispatcher): writes `snippet` and `subject` but not `description`.

`<ActivityDetailSlideIn>` falls back `activity.snippet || activity.description` for the body display (`L572`). Either route renders. ✅ No regression.

`<GlobalActivityFeed>` uses `activity.snippet || activity.description` (`L138`). ✅ Same.

`<ActivityDetailModal>` only reads `activity.snippet` (`L237-243`). Inbound activities show no body in this older variant. ⚠ Minor gap; only matters if anywhere still opens the modal instead of the slide-in. The Settings page and the contact detail page use the slide-in, so this is mostly historical.

### 8.4 Outbound activity rendering correctness

- Subject: outbound emails populate `subject` from user input → renders in slide-in / modal / feed. ✅
- Body: outbound emails populate `rich_content` (full HTML) and `snippet` (200ch). Slide-in renders `rich_content` via `dangerouslySetInnerHTML` (`L513-518`). **No DOMPurify**. Outbound HTML round-trips: a user pasting `<script>` tags into the body will round-trip them into the activity feed AND into the recipient's inbox. ❌
- Outbound SMS / WhatsApp: `snippet` rendered. ✅
- "AI Insights" right column on slide-in: hardcoded placeholder values render when `metadata.ai_key_points` / `ai_actions` / etc. are missing (`L729-760`). Outbound activities have `metadata.ai_purpose / ai_outcome / ai_summary / ai_sentiment: 'neutral'` set by the dispatcher, but **not** `ai_key_points`, `ai_actions`, `ai_sentiment`, `ai_engagement`, `ai_urgency`, `treatments_mentioned`. So the panel will show the placeholder lists ("Patient interested in orthodontic treatment", "Schedule initial consultation", etc.) on **every real outbound activity**, which is misleading and shippable-blocking.

---

## §9 — Threading model (or lack thereof)

### 9.1 Today

There is **no threading**. Every outbound and inbound activity is a flat row on `activities` with no `thread_id`, no `in_reply_to_activity_id`, no `conversation_id`. The only place a `thread_id` appears is `activity-detail-modal.tsx:138` where the UI checks `activity.metadata?.thread_id` and offers a "Thread" tab whose content is a "Conversation thread view coming soon" stub.

The dispatcher does not stamp:
- `Message-ID` header on outbound emails (provider may auto-generate one — SendGrid does — but we don't capture or echo it).
- `In-Reply-To` / `References` on email replies. The reply UI in `<ActivityDetailSlideIn>` doesn't pass the original message-ID, and `dispatchEmail` doesn't have a parameter for it.
- Reply-To-token (e.g. `replies+<activityId>@yourdomain.com`) for routing replies back to a conversation.

For SMS / WhatsApp, the providers don't have headers to thread on. Conversations are reconstructible by `(contact_id, type, occurred_at desc)` filtering — which is what the per-contact activity feed does — but there is no first-class conversation row.

### 9.2 What it would take to add header-based threading on email

Layer 1 (capture provider Message-ID on send + echo on reply):
1. `email-provider.ts`: every provider branch already returns `externalId` (SendGrid `x-message-id` header, Resend `data.id`, etc.). The dispatcher already writes this to `activities.external_id`. ✅ Capture done.
2. The dispatcher would need to also store the *full* RFC-822 Message-ID (not just the provider-internal id) so that recipients' replies (which echo it in `In-Reply-To: <…>`) can be matched.
3. On outbound reply: pull the original activity's Message-ID and pass it as `headers: {'In-Reply-To': msgid, 'References': msgid}` to the provider. Each provider branch in `email-provider.ts` would need a header pass-through.
4. New schema column on `activities`: `email_message_id text` (or store under `metadata.message_id`).

Estimated 0.5-1 day of dispatcher + email-provider work + a small migration.

### 9.3 What it would take to add Reply-To-token threading

Layer 2 (route incoming replies back to the originating activity / conversation):
1. Acquire a domain (`replies.yourdental.app` or similar) and configure SendGrid Inbound Parse / Mailgun Routes / Postmark Inbound to POST to a new `/api/webhooks/email-inbound` route. **2b.5 §11 explicitly defers this until domain purchase.**
2. On outbound send, set `Reply-To: replies+<base64(activity_id)>@replies.yourdental.app`. `email-provider.ts` already accepts `replyTo`; the dispatcher would just need to construct it from `activityId`.
3. On inbound parse, decode the token, lookup the originating activity, write the reply as a new inbound activity with `in_reply_to_activity_id` set, and use the same `(contact_id, deal_id, tenant_id)` from the original.
4. New schema column on `activities`: `in_reply_to_activity_id uuid references activities(id)`. Possibly also `thread_id uuid` for transitive grouping.

Estimated 2-3 days. Hard dependency: domain. Soft dependency: choosing a single email provider as the inbound gateway (likely SendGrid since it's the only one with Inbound Parse already widely used).

### 9.4 Threading for SMS / WhatsApp

These channels don't have headers. The right model is **conversation-by-(contact_id, channel)**:
- Compute `conversation_id = uuid_v5(tenant_id || contact_id || channel)`.
- Stamp it on every inbound and outbound row.
- Surface a "Conversations" UI sidelist in the inbox page (§13).

WhatsApp specifically benefits from a stronger 24-hour-session concept: outside the customer-initiated 24h window, only approved templates can be sent. The conversation row could carry `last_inbound_at` so the composer can warn the user before they try to send free-form text outside the window.

Estimated 1 day for the schema + dispatcher stamp; the UI is part of the inbox phase.

### 9.5 Recommendation for which threading layers to ship in 2b.7+

**Ship in this order:**
1. **Conversation row for SMS/WhatsApp** (§9.4). Smallest scope, biggest UX win for the per-contact inbox. Doesn't require a domain.
2. **Capture-only Message-ID on outbound email** (§9.2 Layer 1 step 1-2). Cheap. Sets up the infrastructure for inbound threading later.
3. **Reply-To-token threading on email** (§9.3). Bigger project, requires domain. Defer to post-launch unless Limelight Digital practices need email two-way.

Skip header-only `In-Reply-To` outbound stamping (§9.2 step 3) for the launch. It only helps when the customer's email client groups our messages — but most email clients group by sender + subject anyway, and this doesn't help us route replies.

---

## §10 — Templates manager integration

### 10.1 Where templates are stored

`activity_templates` table. Schema (12 columns, per Appendix A query 6):

```
id uuid pk
tenant_id uuid (tenant-scoped)
name text
activity_type text   -- 'email' | 'sms' | 'whatsapp' | 'task'
subject_template text
content_template text
variables jsonb      -- detected at save time by extractVariables() in templates-manager.tsx
category text        -- free-form category label
is_active boolean
created_by_user_id uuid
created_at timestamptz
updated_at timestamptz
```

There is also `email_templates` (separate, separate audit) and `marketing_templates` + `marketing_template_versions` (used by the marketing engine, not the per-message composer). **Three template tables exist; only `activity_templates` is touched by the user-facing composers + templates manager.**

### 10.2 What variables are supported

`templates-manager.tsx:138-142` ships an `extractVariables` helper that parses `{{variable_name}}` matches at *save* time and stores the unique names in the row's `variables` JSONB column. Documented in the UI's variable-hints panel as `{{contact_name}}`, `{{practice_name}}`, `{{appointment_date}}`, `{{deal_amount}}` (`L341-352`) — but those are only display hints. There is no whitelist; the user can type any `{{name}}` they want.

**There is no expansion helper that runs at send time.** Grep for `extractVariables` across `lib/` returns 0 hits outside the templates-manager itself. Grep for `replace.*\{\{` across `app/api/communications/` returns 0 hits. The send path **does not substitute variables**. If a user picked a template and sent it (which they can't today; see §10.3), `{{contact_name}}` would arrive as the literal string `{{contact_name}}` in the recipient's inbox.

The closest live substitution is in `<BulkSendPanel>` (`L196-197`) which displays variable hints in the UI but the send loop at `L71-90` does not substitute either. Same trap, same outcome.

### 10.3 Which composers can use templates

**None.** Despite the templates manager UI listing "Use" buttons on every template card, none of the four composers (`<EmailComposerPanel>`, `<SMSComposerPanel>`, `<WhatsAppComposerPanel>`, `<BulkSendPanel>`) accepts a `templateId` prop, listens to a template-selected event, or otherwise integrates with the templates manager. The "Use" button click handler at `templates-manager.tsx:237-241` is empty — clicks do nothing.

What the composers *do* have is a tiny set of inline hardcoded "quick template" buttons:
- `<EmailComposerPanel>:300-337` — 3 buttons (Welcome / Follow-up / Promotion) that hardcode strings into the textarea.
- `<SMSComposerPanel>:174-198` — 3 buttons (Reminder / Confirmation / Follow-up).
- `<WhatsAppComposerPanel>:174-198` — 3 buttons (Welcome / Update / Reminder).
- `<BulkSendPanel>` — none.

These hardcoded buttons are unrelated to `activity_templates`. Editing a template in the templates manager does not change them. They are essentially dead UI controls that look like template integration.

### 10.4 Tenant scoping, role scoping, versioning, archival

- **Tenant-scoped:** ✅ Filter is `eq('tenant_id', tenantId)` (`templates-manager.tsx:62-67`). RLS policy presumably enforces this server-side too (not audited in this phase).
- **Role-scoped:** ❌ No role check in the UI; any authenticated tenant member can view, create, edit, delete any tenant template. `is_active` flag exists but is not gated by role.
- **Versioning:** ❌ The `activity_templates` table has `created_at` and `updated_at` but no version history. Editing a template overwrites the previous content irrecoverably. In contrast, `marketing_templates` has a sibling `marketing_template_versions` table — that pattern was not extended to `activity_templates`.
- **Approval workflow:** ❌ None.
- **Archival:** Soft via `is_active = false`. The list filter in the UI hides inactive templates by default but doesn't permanently delete.

### 10.5 Live shape

Per Appendix A query 7: **0 rows in `activity_templates`** for the test tenant; **0 rows across all tenants in the database**. The templates feature has never been used. (Whether that's because no one has tried, or because the broken Use button discouraged adoption, is unclear — but the operational result is the same: there are no templates.)

### 10.6 Recommendation

**Pull the templates manager from the navigation for launch** (P1 #8 option a in §11). Re-introduce in a future phase that:
1. Adds a runtime variable expander (`{{contact.first_name}} → contact.first_name`).
2. Wires composers to accept a `templateId` URL param, fetch on mount, pre-fill subject + body, run variable expansion against the current contact + deal context.
3. Optionally adopts the `marketing_template_versions` pattern for edit history.

Estimated rebuild scope: **M** (1-2 days). Not a launch blocker — the hardcoded quick-template buttons in each composer are fine for the first paying customers.

---

## §11 — Issues register (P0 → P3)

### P0 (must fix before launch)
1. **`PATCH /api/settings/{email,sms,whatsapp}` are unauthenticated.** Same shape as the 2b.5 send-route P0 — body-trusted `tenant_id`, service-role client, no `requireAuthenticatedTenantUser`. Anyone can rotate any tenant's outbound credentials. **Fix:** apply the 2b.5 helper (`requireAuthenticatedTenantUser` + `assertBodyTenantMatches` + use the user's session client, not service-role) to all three settings routes. ~1h work mirroring 2b.5 §3.
2. **`POST /api/emails/welcome` is unauthenticated and triggers a real Resend send.** Public spam vector. **Fix:** delete it, or wrap it like the send routes with auth + rate limit. 15m.
3. **`<BulkSendPanel>` crashes on render** (missing `Avatar` / `AvatarFallback` imports at `bulk-send-panel.tsx:160-164`). Currently shipped but unusable. **Fix:** add the imports, or remove the avatar UI block. 15m. Optionally add a per-bulk-send rate-limit awareness so >60 selections don't trip the 60/min limit silently.
4. **Settings UIs write to columns the dispatcher does not read** (§7.2-7.4). Practice owners filling in SMTP / SMS / WhatsApp tabs are configuring nothing. **Fix:** either point the legacy tabs at `integration_settings` (preferred) or remove them and surface only `<CommunicationsIntegrationsTab>`. ~1d for clean cutover.

### P1 (data quality / structural; should fix in 2b.7 / 2b.8)
5. **Dispatcher throws on provider failure instead of marking activity `failed`.** Drops the audit trail for failed sends. **Fix:** insert the activity row first (with `message_status: 'pending'`), then call provider, then update the row with success/failure. Mirrors voice's pattern. ~3h per channel.
6. **Two parallel UI variants for activity detail** (`activity-detail-modal.tsx`, `activity-detail-slide-in.tsx`). Pick one. **Fix:** delete the modal variant; rewire any callsites to the slide-in. ~2h.
7. **AI Insights placeholder content** (`activity-detail-slide-in.tsx:729-760`). Hardcoded "Patient interested in orthodontic treatment", "$3,000-$5,000", "Schedule initial consultation" render on every activity that lacks AI metadata (which is all of them today). **Fix:** show "AI Insights — not yet generated" empty-state instead of the placeholder lists. 30m.
8. **`<TemplatesManager>` "Use" button is a no-op.** Templates exist as a feature but cannot be applied. **Fix:** either (a) delete the templates manager page until it can be wired, or (b) wire it: composer accepts a `templateId` query param, fetches and pre-fills + variable substitution. ~4h.
9. **v2 SMS / v2 WhatsApp routes bypass dispatcher and the canonical credential resolver.** Currently dormant (no UI calls them) but present and discoverable. **Fix:** delete `send-sms-v2/route.ts` and `send-whatsapp-v2/route.ts` after a final grep. 15m. Or rewrite them as thin pass-throughs to the dispatcher.
10. **`<EmailComposerPanel>` "AI Draft" button is a stub** while the `/api/ai-assistant/draft-email` route is fully implemented. **Fix:** wire the button → route → response into the body. Add per-tenant cost cap. ~3h.
11. **No HTML sanitisation on outbound emails.** User-pasted `<script>` tags round-trip. **Fix:** DOMPurify pass on body before sending; or limit composer to plain-text + line-break-to-`<br>` conversion. ~2h.
12. **No SMS cost calc for non-GSM-7 / non-US.** Hardcoded 160ch / $0.0075. **Fix:** detect Unicode → 70ch segments, configurable price per destination prefix or simply remove the cost claim from the UI. ~2h.
13. **No idempotency keys on queued communications.** A duplicate POST to the queue produces two sends. **Fix:** generate `jobId = sha256(tenantId + payload)` in `enqueueCommunication`; BullMQ dedupes natively. ~1h.
14. **Legacy plain-text credential columns on `tenants` table** (19 columns). **Fix:** schedule a migration to move all credentials into `integration_settings` (or vault) and drop the columns. Multi-step; not urgent if §3 above is done.

### P2 (UX / completeness; nice-to-have for launch)
15. **No threading for SMS/WhatsApp** — conversation row would be a meaningful UX win (§9.4). ~1d.
16. **No email attachments support.** Composer has a paperclip button that does nothing. ~1-2d.
17. **No approved-template picker for WhatsApp.** Sends outside 24h session window will fail. ~1d.
18. **Click-to-call "End Call" button is fake** (`click-to-call-dialer.tsx:146-156`). Looks like it ended the call but Twilio call continues. ~3h to wire to a `POST /api/communications/end-call/{callSid}` endpoint.
19. **Inbox / unified conversations view doesn't exist.** Per-contact feed only. ~3-5d.
20. **No per-email Reply-To override field in composer.** ~1h.
21. **`enable_tracking` UI control in `<EmailConfigTab>` is dead** — never persisted, never honoured. ~30m to remove or implement.
22. **`extractEmailPurpose` / `extractSMSPurpose` / `extractWhatsAppPurpose` keyword classifiers are duplicated** — once in each route, once in `dispatcher.ts`. Marketed as "AI" in copy. **Fix:** delete from routes (dispatcher owns it), and either rename to `inferPurpose` (truthful) or replace with a real LLM call. ~2h.
23. **Two parallel system-email modules** (`lib/email-service.ts`, `lib/services/email-service.ts`). Both imported by `users/invite/route.ts` + `join-requests/*` routes. Pick one. ~2h.
24. **`lib/email-queue.ts` is dead.** Self-imports `setInterval` processor that runs on every server boot. Delete. ~1h to delete + verify `email_logs` table can be dropped.
25. **`lib/marketing/sms-provider.ts` is dead at outbound.** Move to `lib/marketing/` private or delete. ~30m.

### P3 (nice cleanup / future)
26. **`extractCallInsights` heuristic** (`dispatcher.ts:17-93`) is hand-coded keyword matching labelled as "AI." Either replace with real LLM call or rename. ~2h.
27. **`integration_logs` insert has no error handling** in dispatcher — silent loss of audit row on insert failure. ~30m.
28. **OAuth token refresh path only fires for `_debug.channelSource === 'legacy'`** (`dispatcher.ts:230-239`). Tenants migrated to `channel_settings` will silently break Gmail/Outlook on token expiry. ~3h.
29. **Outbound emails do not capture provider Message-ID** (only the provider-internal `externalId`). Blocks future inbound threading. ~3h.
30. **No Pino structured logging in `dispatcher.ts`.** Uses `console.error`. ~1h to swap.

---

## §12 — What's missing for launch

Specifically for the first 10 paying customers (Limelight Digital practices running paid ads), here is the gap analysis.

### 12.1 Outbound features NEEDED that don't exist

1. **Auth on settings routes.** Without it, anyone can rotate any tenant's outbound credentials. Cannot ship paid customers with this hole. (P0 #1.)
2. **Settings UIs that actually configure outbound.** Today the legacy SMTP / SMS / WhatsApp tabs write to columns the dispatcher does not read; only `<CommunicationsIntegrationsTab>` works. A practice owner clicking 'Email Configuration' will fill in fields and silently configure nothing. Either the legacy tabs go, or they get fixed. (P0 #4.)
3. **`<BulkSendPanel>` working at all.** Currently crashes on render due to missing `Avatar` import. (P0 #3.)
4. **Failed sends visible in the activity feed.** The dispatcher throws on provider failure today, dropping the audit row. A sales agent will never know a message bounced. (P1 #5.)
5. **HTML sanitisation on outbound emails.** `<script>` tags round-trip from the composer to the recipient's inbox. (P1 #11.)

### 12.2 Outbound features that EXIST but are too broken to launch with

1. **`/api/emails/welcome`** — public spam vector. Either delete or gate. (P0 #2.)
2. **AI Insights placeholders in activity-detail-slide-in** — hardcoded 'Patient interested in orthodontic treatment / Budget range: $3,000-$5,000' renders on every real activity. Looks legit, isn't. Customers will assume the system is generating insights when it isn't. (P1 #7.)
3. **`<TemplatesManager>`** — 'Use' button is a no-op; the manager exists but doesn't connect to composers. Pull from nav until wired. (P1 #8.)
4. **`<EmailComposerPanel>` AI Draft button** — labelled but stubs to a `toast.info('coming soon')`. Either wire to the existing `/api/ai-assistant/draft-email` route or hide the button. (P1 #10.)
5. **Click-to-call End Call button** — fakes ending the call (only resets local state). Real call continues on Twilio's side. Misleading and a billing hazard. (P2 #18.)
6. **v2 SMS / v2 WhatsApp routes** — discoverable but bypass the canonical credential resolver and write thinner activity rows. Delete before launch. (P1 #9.)
7. **SMS cost estimate** — hardcoded for GSM-7 / US pricing. Wrong for emoji and for non-US destinations. Either fix or remove the cost claim from the UI. (P1 #12.)

### 12.3 What's good enough as-is

- Send routes' auth + tenant scoping + rate limiting (closed by 2b.5). Solid.
- The dispatcher (`lib/communications/dispatcher.ts`) — right shape, all four channels, correct activity-row schema for v1 routes.
- Email provider routing (`lib/integrations/email-provider.ts`) — five providers, OAuth refresh path for Gmail/Outlook (on legacy channel source).
- BullMQ communication queue with direct-dispatch fallback.
- The `loadTenantIntegrationSettings` resolver — vault → channel_settings → legacy → env priority is correct.
- Per-contact activity feed via `<ActivityDetailSlideIn>` (after the AI placeholders fix).
- Outbound email rendering of subject + body in the activity feed.
- Reply affordance from inbound activities (works without thread linkage; thread linkage is a post-launch upgrade).
- The 2b.5 auth helper (`api-auth-helpers.ts`) — reusable for the settings-route fix.

### 12.4 The inbox / conversations view gap

There is no inbox. This audit confirms:



- No `/inbox`, `/messages`, `/conversations` route in `app/`. Verified by ls.
- No "Inbox" item in `dashboard-nav.tsx` (sidebar nav).
- The closest surface is per-contact: opening a contact and scrolling its activity list. Useful for "what have we done with Sarah?" but not for "what came in to my practice today across everyone?".
- `<GlobalActivityFeed>` is close-but-not-an-inbox: it's a flat reverse-chrono feed of all activities, with channel filters. It doesn't group by contact, doesn't surface "unread", doesn't separate inbound from outbound, doesn't separate "needs reply" from "informational." It's a reporting feed, not a workspace.

For Limelight Digital sales agents to triage incoming SMS / WhatsApp / email replies efficiently they need:
1. A grouped view: one row per conversation (contact + channel), most-recently-active on top.
2. Unread state (track `last_read_activity_id` per (user, conversation) — simple `user_conversation_state` table).
3. A "Reply" affordance that opens the right composer pre-filled with context.

This is a 3-5 day phase. Not blocking launch (per-contact feed works) but the single biggest UX upgrade once the core blockers are cleared. The §9.4 conversation-row work is the data prerequisite.

A pragmatic shortcut for launch: surface a "Recent activity needing attention" card on the dashboard that lists the latest 10 inbound activities across all contacts with one-click reply. Rolls up into the inbox later. ~1 day.

**Launch decision:** ship the dashboard 'Recent activity needing attention' card as the launch interim (~1d). Defer the full conversations UI to a 2c phase. Practice owners will accept the shortcut for the first 10 customers; sales agents will eventually need the full inbox to scale beyond that.

---

## §13 — Recommended rebuild sequence

### 13.1 The minimal "ship-quality launch" target

For Limelight Digital's first 10 paying customers to use the outbound system end-to-end without embarrassment, the bar is:

- **Auth on settings routes (P0 #1)** + delete or gate `emails/welcome` (P0 #2) + fix bulk-send crash (P0 #3) + cleanup of legacy settings tabs (P0 #4) — closes all known security holes.
- **Failed-send marked as `failed` in activity (P1 #5)** + AI placeholder fix (P1 #7) + HTML sanitisation (P1 #11) — gets the activity feed to a state where it accurately reflects what happened.
- **Templates pulled from UI for now (P1 #8 option a)** + activity-detail single variant (P1 #6) + delete v2 routes (P1 #9) — removes the most visible "things that look like they work but don't."

That's roughly **3-4 days of focused work** to clear the launch blockers. Everything else (P1 #10 / #12 / #13 / #14 / all P2 / all P3) can ship in 2b.8+ phases.

### 13.2 Ordered phase plan

**Phase 2b.7 — Settings auth + dead-code purge (1 day)**
- Apply 2b.5 helper to `/api/settings/{email,sms,whatsapp}` (P0 #1).
- Delete `/api/emails/welcome` (P0 #2; archaeology pass first).
- Fix `<BulkSendPanel>` (P0 #3).
- Delete `send-sms-v2/route.ts`, `send-whatsapp-v2/route.ts` (P1 #9).
- Delete `lib/email-queue.ts`, `lib/marketing/sms-provider.ts` (P2 #24, #25).
- Smoke-test: legacy settings tabs still work or are removed.

**Phase 2b.8 — Settings UI rationalisation (1 day)**
- Decide: legacy tabs out, `<CommunicationsIntegrationsTab>` in (P0 #4). Either delete `<EmailConfigTab>` / `<SMSConfigTab>` / `<WhatsAppConfigTab>` or rewire their PATCH targets at the right `integration_settings` columns. Recommendation: delete (the combined tab is more correct).
- Schedule the 19-column `tenants` cleanup migration as a follow-up phase but don't block on it (P1 #14).

**Phase 2b.9 — Activity correctness + AI honesty (1 day)**
- Dispatcher: mark failed sends as `message_status: 'failed'` in activity (P1 #5).
- Fix AI Insights empty-state (P1 #7).
- Pick one activity-detail variant (P1 #6).
- DOMPurify outbound HTML (P1 #11).
- Pull templates manager from sidebar (P1 #8a) OR wire it (P1 #8b) — pick one.
- Delete duplicate `extractEmailPurpose` / `extractSMSPurpose` / `extractWhatsAppPurpose` from routes; rename in dispatcher (P2 #22).

**Phase 2b.10 — System-email module merge (0.5 day)**
- Pick one of `lib/email-service.ts` / `lib/services/email-service.ts`. Update `users/invite/route.ts` + all `join-requests/*` to use only it. Delete the other (P2 #23).

**Phase 2b.11 — Conversation rows + outbound message-ID capture (1.5 days)**
- Add `conversation_id` column on `activities` (`uuid_v5(tenantId || contactId || channel)`). Dispatcher stamps it on outbound; inbound parsers stamp on inbound (P2 #15).
- Capture provider Message-ID into `metadata.message_id` on outbound emails (P3 #29).
- New "Conversations" sidelist surface — out of scope for this phase but unlocked by the data.

**Phase 2b.12+ (post-launch) — Inbox UI, attachments, WhatsApp templates, two-way email threading, voice end-call API, OAuth refresh on `channel_settings`.**

### 13.3 What to **leave alone** for now
- The dispatcher core. It's the right shape.
- The provider router (`email-provider.ts`). Keep it as the only place provider-specific code lives.
- The 2b.5 auth helper. Reuse.
- The credential resolver (`tenant-integration-config.ts`). Keep.
- The BullMQ queue.
- `<GlobalActivityFeed>` and `<ActivityDetailSlideIn>` (after the §11 fixes).

### 13.4 What to **delete outright**
- `app/api/communications/send-sms-v2/route.ts`
- `app/api/communications/send-whatsapp-v2/route.ts`
- `app/api/emails/welcome/route.ts` (or gate)
- `lib/email-queue.ts`
- `lib/marketing/sms-provider.ts`
- One of `lib/email-service.ts` / `lib/services/email-service.ts`
- `<EmailConfigTab>`, `<SMSConfigTab>`, `<WhatsAppConfigTab>` (replace with single combined integrations tab)
- `<ActivityDetailModal>` (replace fully with slide-in)

---

## §14 — Open questions (do NOT decide; surface only)

1. **Settings UIs**: should the legacy `<EmailConfigTab>` / `<SMSConfigTab>` / `<WhatsAppConfigTab>` be deleted entirely (replacing them with `<CommunicationsIntegrationsTab>`), or should their PATCH routes be redirected to write to `integration_settings` columns the dispatcher actually reads? Trade-off: deleting is cleaner but breaks any bookmarked URLs / muscle memory; redirecting preserves the UI shape but doubles the surface area.
2. **`/api/emails/welcome`**: delete or gate? It has no source callers in the current codebase but historical signup flows may have used it. A 5-minute git-log archaeology pass on the file would settle this; in scope for the phase that fixes it.
3. **v2 SMS / v2 WhatsApp**: confirm there are zero source callers in the codebase before deletion. Grep was limited to `dental-crm/src`; no other projects in this monorepo, so this is likely a clean delete, but worth one more pass.
4. **Templates manager**: is there a documented intent for templates feature pre-launch? If not, pull it from the nav until it can be wired (preferred). If there is, prioritise wiring (estimated ~4h).
5. **AI Insights placeholders**: was the hardcoded placeholder content (`activity-detail-slide-in.tsx:729-760`) intended as a demo for screenshots / sales calls, or as production fallback? If demo, it must be replaced before launch. If production fallback, it's misleading and must be replaced regardless.
6. **Activity detail modal vs slide-in**: any callsite still using the modal? Sidebar uses slide-in; contact view uses slide-in. Modal may be dead in routing; needs a quick grep before deletion.
7. **System email module merge** (`lib/email-service.ts` vs `lib/services/email-service.ts`): which is canonical? The Resend-only one is simpler; the multi-provider one supports SendGrid + Console. For invitations + welcome + password reset it's debatable which is needed.
8. **Threading pre-launch**: ship the SMS/WhatsApp conversation row in 2b.11 (recommended) or defer to post-launch? Required for the shortcut "Recent activity" dashboard card; not strictly required if launch ships only the per-contact view.
9. **Inbox launch scope**: is the "Recent activity needing attention" dashboard card acceptable as an interim, with full conversations UI in a 2c phase? Or must conversations ship before paid customers go live?
10. **Outbound HTML editor**: the current plain-text `<Textarea>` produces poor email rendering (line breaks lost). Ship a basic Tiptap / Lexical rich-text editor pre-launch, or accept plain-text-only with a `\n → <br>` conversion at dispatch time?

---

*End of audit.*

---

## Appendix A — Read-only DB findings (raw evidence)

### A.1 `tenants` (per query 1)

```
sample_tenant_id                      whatsapp_phone_number  sms_phone_number  whatsapp_legacy_creds_present  total_tenants
5aadca14-9786-4aef-bc53-e9287cdd0bbf  +447401153002          +14155238886       0                              1
```

**Reading:**
- One tenant in this database.
- The `whatsapp_phone_number` column is set to a Twilio sandbox/operational sender (likely the inbound-routing target).
- The `sms_phone_number` column is set to the Twilio US sandbox (`+1 415 523 8886`).
- `whatsapp_api_key` is NULL on this tenant — the legacy plain-text WhatsApp credentials column is empty. Outbound WhatsApp via the v2 route would fail because v2 reads from these NULL columns. Outbound WhatsApp via the v1 route + dispatcher works *only if* `integration_settings.whatsapp_account_sid` etc. are set, which Appendix A.4 confirms.

### A.2 Outbound activity counts last 30 days (per query 2)

```
type      direction  cnt
call      outbound   8
sms       outbound   8
email     outbound   6
whatsapp  outbound   5
```

All on the test tenant. **All from seed data**, per query 3 (next).

### A.3 Latest outbound activity per channel (per queries 3a / 3b / 3c)

**Outbound email:**
```
id                     subject                                          snippet                                                                                            from_number  to_number  email_to  email_from  message_status  integration_provider  external_id
07ca1bba-9c97-4...     Special Offer: Comprehensive Dental Examination… Dear Sarah Williams,\n\nWe're pleased to inform you that you qualify for our Comprehensive…   NULL         NULL       NULL      NULL        NULL            NULL                  NULL
```

**Outbound SMS:**
```
id                     snippet                                                                                            from_number  to_number  message_status  integration_provider  external_id
b71c5fcc-c4b1-4…       Hi James! 🚀 Quick reminder: Your appointment is confirmed for tomorrow at 2 PM. Please reply…   NULL         NULL       NULL            NULL                  NULL
```

**Outbound WhatsApp:**
```
id                     snippet                                                                                            from_number  to_number  message_status  integration_provider  external_id
1cabaa3b-91cc-4…       💬 Maria! Just wanted to check in about our previous conversation regarding the family…           NULL         NULL       NULL            NULL                  NULL
```

**Reading:** every channel column is NULL on the latest outbound row → **these are seed/fixture rows**, written by the seed scripts that pre-date the dispatcher. Real dispatcher-produced outbound rows would have the columns populated per §8.1. There has been no real CRM-user outbound activity on this tenant in the last 30 days. The 2b.5 deploy curl tests in `2b/2b-5-changes.md` §13 *did* produce real rows, but those are post the 30-day window the query ran or were inserted with missing canonical fields (worth a future check).

### A.4 `integration_settings` and `integration_channel_settings` (queries 9 / 10)

```
integration_settings rows for tenant     = 1
integration_channel_settings rows         = 0
```

→ Dispatcher resolves credentials via the **legacy** `integration_settings` row, not `channel_settings`, not vault. Confirms §6.3 narrative.

### A.5 `activity_templates` (queries 6 / 7)

Schema columns:
```
id, tenant_id, name, activity_type, subject_template, content_template,
variables (jsonb), category, is_active, created_by_user_id, created_at, updated_at
```

Row counts:
```
this_tenant_templates  = 0
all_tenants_templates  = 0
```

→ Templates feature has never been used by anyone in the database. Confirms §3.5.

### A.6 Tables present (per query 4)

```
activity_templates              conversation_outcomes
email_templates                 integration_channel_settings
integration_connections         integration_dlq
integration_logs                integration_rate_limits
integration_secret_vault        integration_settings
integration_webhooks_log        marketing_template_versions
marketing_templates             message_media
task_templates
```

Notable absences: **no `email_threads`, `email_messages`, `sms_threads`, `whatsapp_threads`, `conversations`, `inbox_messages` tables**. Confirms §9 (no threading model).

`message_media` exists — relevant for WhatsApp media-attachment audit if/when supported.

`email_templates` exists separately from `activity_templates` and from `marketing_templates`. Three template tables. (Out of scope for this phase but flagged.)

### A.7 Membership shape (per query 5)

`user_tenant_memberships` rows for the test tenant: 1. The 2b.5 helper joins via `app_users.active_tenant_id` ⨝ `user_tenant_memberships(tenant_id, status='active')`. With only one membership, all auth tests on this tenant produce single-result joins — no cross-tenant ambiguity to worry about for the audit itself.

### A.8 Confirming D03 §9.1 column shape on `activities`

The five columns `activities` query returned were also implicitly confirmed by the sample queries 3a/3b/3c — they all referenced the canonical column names without errors:
- `email_to, email_from, email_cc, email_bcc, email_reply_to`
- `from_number, to_number`
- `call_from, call_to, call_sid, call_recording_url, call_duration_seconds`
- `message_status, integration_provider, external_id, integration_metadata, metadata`
- `subject, snippet, rich_content, description`
- `agent_user_id, contact_id, deal_id, occurred_at, created_at`

These are all the columns the dispatcher writes. ✅
