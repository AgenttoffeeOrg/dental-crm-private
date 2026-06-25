# Completed vs Pending — Verified Ledger

**Last updated:** 27 May 2026 · verified against code at commit `800dc80` (branch `phase-1-attribution-foundation`).

## Why this document exists

The repo contains **~246 files marked "complete / done / 100% / success."** They record what was *claimed* finished at a moment in time. This ledger reconciles those claims against what the **code actually does today**, so the team doesn't have to trust the labels. Every row is tagged:

| Tag | Meaning |
|---|---|
| ✅ **Working** | Built and verified working in the code. |
| ⚠️ **Partial** | Real, but incomplete, behind a flag, or with known gaps. |
| ❌ **Claimed-but-broken** | A doc says "complete," but the code shows it does not work. |
| 🔲 **Pending** | Documented as planned; not built or not wired up. |
| ❓ **Unverified** | Can't be confirmed without the live database. |

> For the full system narrative, see `CURRENT_STATE_OF_THE_DENTAL_CRM.md`. For where each source file lives, see `DOCUMENTATION_INDEX.md`.

---

## At a glance

| Area | Overall status |
|---|---|
| Auth & sign-in | ✅ Working |
| Multi-tenancy (data isolation) | ⚠️ Partial — RLS vs app-layer mismatch (high risk) |
| Organization creation | ⚠️ Partial — works, but duplicate endpoints |
| Onboarding flow | ⚠️ Partial — current path works; wizard half-superseded, has bugs |
| Invitations | ⚠️ Partial — core works; no email send, no cancel/resend |
| Roles & permissions | ⚠️ Partial — model built; location-role assignment has no UI |
| CRM core (contacts/deals/pipeline) | ✅ / ⚠️ Mostly working |
| Tasks | ❌ Automation-created tasks broken; reminders never fire |
| Marketing-Audit module | ✅ Working (most built-out part of the app) |
| Marketing → CRM (forms/leads/attribution) | ⚠️ Partial — pipeline real, marketing email is a stub |
| AI assistant | ✅ Working |
| Call transcription / coaching | ❌ Transcription is mocked |
| Automation engine | ⚠️ Partial — engine real, `create_task` action broken |
| Communications (SMS/WhatsApp/voice) | ✅ Working (with credential-path gotchas) |
| Email sending | ❌ One path real, marketing path is a no-op stub |
| Payments / billing | ✅ Working (Stripe wired) |
| PMS integration (Dentrix/OpenDental) | 🔲 Pending — only a generic webhook stub |
| Deployment | ✅ Working on Vercel (Railway config stale) |
| Observability | ⚠️ Partial — Sentry/logging real; dashboards aspirational |
| Testing infra | ⚠️ Partial — extensive setup, no green-run record |
| Database schema integrity | ❌ Two parallel schemas; clean rebuild fails |
| Dental clinical features | 🔲 Pending — none exist (it's a generic CRM) |
| `dental-crm-admin` security | ❌ Unsecured (anon-key only) |

---

## 1. Auth, tenancy & onboarding

| Feature | Claimed | Reality | Status | Evidence |
|---|---|---|---|---|
| Email/password auth, cookie sessions | Complete | Supabase Auth wired; signup → `app_users` row → `/dashboard`. Email verification not required. | ✅ Working | `02-auth-signup-flow.md`, code-verified |
| Multi-tenant data isolation | "100% complete / hardened" | `tenant_id` on every table + RLS. **But** RLS helper `current_tenant_id()` reads `org_memberships` while the whole app reads `user_tenant_memberships` + `active_tenant_id`. If those diverge, data appears missing. | ⚠️ Partial (high risk) | `06-multi-tenancy-implementation.md`, migration `…hardening_001_helpers.sql` |
| Auto-tenant-on-signup | "Definitive: trigger active" | Trigger was **dropped** by later migrations. Auto-creation is OFF. | ❌ Doc stale | `20251030_disable_auto_tenant_creation.sql` |
| Organization creation | Complete | Works via `/api/orgs/create` (service role: tenant → location → owner membership). **Two endpoints exist** (`/orgs/create` + `/organizations/create`). No DB transaction. | ⚠️ Partial | `03-organization-creation.md` |
| Onboarding flow | "Revolutionary / complete" (×several) | Current path: middleware → `/organization-setup` (create or join). The multi-step wizard still exists but is largely bypassed and has bugs (`description` vs `company_description`; `.single()` breaks multi-org). | ⚠️ Partial | `EXISTING_ONBOARDING_AUDIT.md`, `NEW_ONBOARDING_WORKFLOW_IMPLEMENTATION.md`, middleware code |
| Invitations | Complete | `pending_invites` (6-char code, role, 7-day expiry) works. **Gaps:** invite email not auto-sent; no cancel/resend; can't assign location. Legacy `user_invitations` also still present. | ⚠️ Partial | `09-invitation-system-complete-flow.md` |
| Roles (owner/admin/manager/staff/viewer) | Complete | Permission matrix in `src/lib/permissions.ts` works. | ✅ Working | code-verified |
| Location-based roles | "Complete analysis / done" | DB layer fully built (`membership_locations`, overrides, RLS helpers). **No admin UI or API to assign them**; only Contacts API enforces location filtering. | ⚠️ Partial | `08-location-based-roles-complete-analysis.md` |

---

## 2. CRM core & tasks

| Feature | Claimed | Reality | Status | Evidence |
|---|---|---|---|---|
| Contacts, deals, pipeline, stages | Complete | Core entities + APIs present and working. | ✅ Working | route + schema verified |
| Pipeline board / views | "Complete" (many UI polish notes) | Functional; lots of recent iteration (the `2b.x` commits). | ✅ Working | git log |
| Manual task creation | Complete | **`POST /api/tasks` requires `location_id`**, so dashboard quick-add (free-floating) tasks fail. | ❌ Claimed-but-broken | `route.ts:170`, tasks audit |
| Automation-created tasks | "Task workflows complete" | `create_task` writes non-existent columns (`due_date`/`assigned_to`) and a `status:'pending'` that violates the CHECK constraint; insert fails, error swallowed. **Prebuilt workflows install but never create tasks.** | ❌ Claimed-but-broken | `automation-engine.ts:494-517`, `docs/audits/tasks_module_rebuild_audit.md` |
| Task reminders / escalations | "ON" | `sendTaskReminders()` / `checkTaskEscalations()` exist but **no cron invokes them**. Never fire. | ❌ Claimed-but-broken | tasks audit F5 |
| Recurring tasks | Referenced | FK target table `task_recurring_rules` **does not exist**. | 🔲 Pending | schema grep |
| `tasks.status` constraint drift | (was a bug) | **Now fixed** — consistent across migration + TS types + Zod. | ✅ Resolved | `20260524_…tasks_status_align.sql` |

---

## 3. Marketing & AI

| Feature | Claimed | Reality | Status | Evidence |
|---|---|---|---|---|
| Marketing-Audit module (SEO/site/competitor scoring) | "Conditional GO / plan" | **Most built-out part of the app.** Real connectors (PageSpeed, Search Console, GA4, Places, SemRush, BrightLocal), scorers, orchestrator, PDF/CSV export, alerts. Paid connectors key-gated. | ✅ Working | `marketing-audit/orchestrator.ts` + connectors |
| Marketing → CRM (forms, leads, attribution) | "Masterplan complete" | Lead ingestion webhooks (Meta/TikTok/Google), form submit, click tracking, attribution libs are real. Pricing/positioning is aspirational. | ⚠️ Partial | `MARKETING_CRM_INTEGRATION_MASTERPLAN.md` |
| Marketing email sending | implied working | `src/lib/marketing/mail-provider.ts` is a **NoOp stub** (`console.log "Would send email"`); SendGrid path is a `// TODO`. | ❌ Claimed-but-broken | code-verified |
| AI assistant (chat, draft email) | "15/15 tasks complete" | Chat works (GPT-4-Turbo with context builders); draft-email works. | ✅ Working | `ai-assistant/chat/route.ts` |
| Automation engine | Complete | ~1,000-line engine with listeners, prebuilt workflows, SLA, governance — real. (But its `create_task` action is broken — see §2.) | ⚠️ Partial | `automation-engine.ts` |
| Call transcription | "Complete" | `ai/transcribe-call` returns a **hardcoded mock transcript** (`// TODO: Integrate Whisper`). | ❌ Claimed-but-broken | code-verified |
| Call coaching / conversation analysis | "Complete" | Analyzer + summarizer real, but depend on the mocked transcript end-to-end. | ⚠️ Partial | `conversation-analyzer.ts` |
| Psychological profiles | Complete | Real (GPT-4o-mini), with a `mock` mode. | ⚠️ Partial | `psychological-analyzer.ts` |
| "AI briefing" in task queue panel | shown in UI | **Hardcoded talking points** rendered as if they were live AI output. | ❌ Fake | `task-queue-panel.tsx:461-514` |

---

## 4. Integrations, comms & payments

| Feature | Claimed | Reality | Status | Evidence |
|---|---|---|---|---|
| Twilio SMS / voice / WhatsApp | Complete | Real clients + inbound webhooks with signature verification. | ✅ Working | `*-service.ts` |
| Outbound email (transactional) | Complete | Real via Communications Integrations path (`dispatcher.ts` + `integration_settings`). **Legacy Settings tabs write to dead columns** — only the Communications tab works. | ⚠️ Partial (gotcha) | `operational-gotchas.md` |
| Stripe payments / billing | Complete | Payment intents + billing routes wired. | ✅ Working | `payments/create-intent` |
| Google APIs (calendar, reCAPTCHA, audit connectors) | Complete | Wired with OAuth. | ✅ Working | code-verified |
| PMS adapters (Dentrix, OpenDental, Eaglesoft) | "100% COMPLETE" | Only a **generic webhook adapter** ships. Named adapters are empty type stubs. | 🔲 Pending | `PMS_INTEGRATION_FINAL_SUMMARY.md` vs `pms/types.ts` |
| Background workers (4× BullMQ) | Complete | communication / engagement / analytics / competitor-intel workers exist; need Redis. | ✅ Working (needs Redis) | `src/workers/*` |

---

## 5. Platform: deploy, observability, testing, schema

| Feature | Claimed | Reality | Status | Evidence |
|---|---|---|---|---|
| Deployment | "Railway production ready" | **Live path is Vercel** (`.vercel/`, husky auto-deploy, crons). Railway config exists but is stale. Pick one. | ⚠️ Confusing | `operational-gotchas.md`, `vercel.json` |
| Observability | "Phase 9 complete" | Sentry + Pino + `/api/health` + security headers are real. Web Vitals / OTel / dashboards are **plans**. | ⚠️ Partial | `observability.md` |
| Build-time type/lint checking | (assumed on) | **Disabled** (`ignoreBuildErrors: true`, `ignoreDuringBuilds: true`). Type errors ship silently — root cause of recurring DB drift. | ❌ Off | `next.config.js:8-12` |
| Test suites (unit/e2e/visual/a11y/load) | "Complete coverage" | Infra exists (Jest, Playwright, Percy, axe, Lighthouse, k6) + CI gate. **No record of a green run**; historical coverage ~0. | ⚠️ Partial | `package.json`, `tests/verification/results` |
| Single reproducible schema | "Complete" | **Two parallel systems** (`migrations/` + legacy `sql/`); phantom `practices` table; missing FK tables. Clean `db push` from scratch **fails**. | ❌ Broken | `SCHEMA_INVENTORY.md` |
| `dental-crm-admin` access control | (assumed) | Uses public anon key, **no super-admin gate**. | ❌ Insecure | `AUDIT_AND_ACTION_PLAN.md` |
| Leaked secret | — | A live `SENTRY_AUTH_TOKEN` is committed in `RAILWAY_DEPLOYMENT_GUIDE.md`. **Rotate.** | ❌ Risk | code-verified |
| Dental clinical features (scheduling, charting, claims, patient portal) | "Dental CRM" | **None exist.** It's a generic CRM branded dental. | 🔲 Pending (product) | `DENTAL_CRM_COMPREHENSIVE_AUDIT.md` |

---

## 6. The fix list, in priority order

1. **Turn build-time type-checking back on** (`next.config.js`) and fix the fallout — this surfaces the whole DB-drift bug class at once.
2. **Consolidate to one canonical schema** — replay migrations into a fresh DB, resolve the `sql/` split + phantom `practices` table, create missing tables (`task_recurring_rules`, `push_subscriptions`), commit `pg_dump --schema-only`.
3. **Fix `create_task` automation drift** and stop swallowing insert errors.
4. **Resolve the RLS vs app-layer tenancy mismatch** (`org_memberships` vs `user_tenant_memberships`) — likely cause of "data hidden by RLS."
5. **Wire a real marketing email provider; invoke the orphaned reminder/escalation crons.**
6. **Fix `/api/tasks`** location requirement; **replace or remove the fake-AI panel.**
7. **Secure `dental-crm-admin`; rotate the leaked Sentry token; pick Vercel or Railway.**
8. **De-duplicate endpoints** (org-create ×2, invite ×2); settle on one onboarding flow.
9. **Decide the dental-vs-generic-CRM product question.**

---

## 7. Needs the live database to confirm (❓)

1. Is `org_memberships` (used by RLS) populated and in sync with `user_tenant_memberships` (used by the app)?
2. Does the live DB match any committed schema, or the partial ~7-migration state described in `SCHEMA_INVENTORY.md`?
3. Which org-create endpoint and which onboarding path are actually reachable in production?

---

*Sources: the verified findings in `CURRENT_STATE_OF_THE_DENTAL_CRM.md`, the repo's own `AUDIT_AND_ACTION_PLAN.md` and `docs/audits/tasks_module_rebuild_audit.md`, plus direct code, migration, and git inspection. "Claimed" reflects the completion docs in `docs/build-history/`.*
