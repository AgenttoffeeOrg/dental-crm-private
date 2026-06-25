# Current State of the Dental CRM — Developer Source of Truth

**Last updated:** 27 May 2026
**Audience:** the development team picking up this codebase.
**Status of this document:** This is a consolidation of the ~224 durable docs in the repo, **cross-checked against the actual code, migrations, and git history** as of commit `800dc80` (25 May 2026, branch `phase-1-attribution-foundation`). Where the docs and the code disagreed, the code won and the contradiction is called out.

---

## 0. Read this first — how to trust the documentation

This repository contains **~1,000 documentation files**, the large majority of which are point-in-time notes from eight months of AI-assisted development. **Hundreds are named things like `*_COMPLETE.md`, `🎉_100_PERCENT_COMPLETE.md`, `*_SUCCESS.md`, `PHASE_N_COMPLETE.md`.** These are snapshots of a moment, not descriptions of the current system. **Do not treat any "complete / 100% / success / production-ready" document as a statement of what works today.** Several of them are directly contradicted by later commits.

When you need ground truth, trust sources in this order:

1. **The code and the migrations themselves** (`src/`, `supabase/migrations/`).
2. **This document.**
3. **`/_DOC_AUDIT/` (the audit report + inventory spreadsheet)** for what every doc is and whether to keep it.
4. **A small set of genuinely reliable docs**, listed in §13.

Everything else should be read as history, not specification.

---

## 1. Tech stack at a glance

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Next.js 14.2.18** (App Router) | `architecture.mmd` says "15.5.4" — that's wrong; package.json pins 14.2. |
| UI | **React 19.1.0**, Tailwind 4 (beta), Radix UI | An older assessment doc says React 18 — stale. |
| Language | TypeScript 5 | **Build-time type-checking and ESLint are DISABLED** (see §12 / §13). |
| Database | **Supabase (PostgreSQL)** | RLS for tenant isolation; ~181 tables defined across migrations. |
| Auth | Supabase Auth | Email/password, cookie sessions. |
| Background jobs | **BullMQ + Redis** (Upstash/ioredis) | 4 workers; degrade gracefully if Redis absent. |
| Build | `vite build` (embeddable widget) **+** `next build` | `NEXT_DISABLE_SWC_WASM=1`. |
| Hosting | **Vercel is the live path** (Railway is also configured but treat as stale — see §10). |
| Error tracking | Sentry (`@sentry/nextjs`) + Pino logging | Wired and real. |
| Node | ≥ 20 | |

Scale: ~1,070 source files, ~236k LOC, ~182 API routes, ~122 active DB tables, 176 migration files.

---

## 2. Architecture overview

It's a standard Next.js App Router monolith with a Postgres backend and a small fleet of background workers.

- **Frontend** lives under `src/app` (routes/pages) and `src/components` (~566 files across ~38 areas). The CRM and wizard UIs are client components that talk to API routes via `fetch` and the browser Supabase client.
- **Backend / business logic** is in three places:
  - **`src/app/api`** — ~55 route groups (the HTTP surface).
  - **`src/lib`** — the real heart of the domain logic (~351 files, ~45 subfolders: `services`, `queues`, `communications`, `marketing`, `marketing-audit`, `automations`, `intelligence`, `auth`, `schemas`, …).
  - **`src/workers`** — 4 BullMQ background workers (see §9).
  - Note: **`src/server` is nearly empty** (a single `middleware/entitlements.ts`) despite the name — it is *not* a major layer.
- **Per-request context** (auth + which tenant/location you're acting as) is resolved in middleware and `src/lib/services/tenant-context.ts`.
- **External services** (OpenAI, Anthropic, Twilio, Stripe, Resend/SendGrid, Google APIs) are called from clients in `src/lib`.

Architecture diagrams exist at `docs/architecture.mmd` and `docs/deployment.mmd` (Mermaid) — useful, but verify version labels against `package.json`.

---

## 3. Major modules

Based on the actual route/component tree:

- **CRM core** — contacts, pipelines, pipeline stages, deals, tasks, activities, dedup queue, import/export.
- **Onboarding** — organization setup + a multi-step wizard (see §6; the wizard is partly superseded).
- **Marketing** — two distinct, genuinely-built pieces: a **Marketing Audit** module (SEO/site/competitor scoring against live Google/SemRush/BrightLocal APIs) and a **Marketing→CRM** lead pipeline (forms, landing pages, lead-ingestion webhooks, attribution).
- **AI / engagement** — AI assistant chat, call summarization/coaching, psychological profiles, and a substantial automation engine. Mixed shipped-vs-aspirational (see §8).
- **Communications** — outbound SMS / voice / WhatsApp / email via Twilio + email providers, plus inbound webhooks.
- **Settings / admin / billing** — org & user management, multi-location, feature flags, Stripe billing.

---

## 4. Data model & database

**Platform:** Supabase Postgres, UUID primary keys, RLS for tenant isolation. Migration tooling is the Supabase CLI; the project scripts are `db:migrate` (`supabase db push`) and `db:validate` (`supabase db lint`).

**Core entities:** `tenants` → `locations`; `tenants` → `contacts` / `deals` / `tasks` / `activities` / `pipelines`; `pipelines` → `pipeline_stages` → `deals`; users ↔ tenants many-to-many via `user_tenant_memberships`, with per-location roles in `membership_locations`. Plus large clusters for marketing-audit, automations, sales intelligence/engagement, billing, RBAC, notifications, GDPR, webhooks, and feature flags.

### ⚠️ Critical database problems (these cause real breakage)

These are the single biggest source of the "it keeps breaking" experience. They are code-verified.

1. **Two parallel, unreconciled schema systems.** There are 176 dated migrations in `supabase/migrations/` **and** a separate legacy `supabase/sql/` folder (~64 hand-applied files). A clean `supabase db push` from scratch **fails** — migrations reference tables (`marketing_journeys`, `marketing_forms`) that exist only in `sql/`. Per `SCHEMA_INVENTORY.md`, the live DB only ever had ~7 migrations cleanly applied. **There is no single reproducible schema.**

2. **Phantom `practices` table.** Several migrations and `docs/marketing-audit-database-schema.md` reference a `practices` table via foreign keys, but **no `CREATE TABLE practices` exists anywhere**. (Only `practice_groups`, `practice_branding`, `practice_domains`, etc. exist.) This is an active blocker for a fresh apply.

3. **Missing FK target tables.** `tasks.recurring_rule_id` points at `task_recurring_rules`, which doesn't exist; `push_subscriptions` is similarly referenced but absent.

4. **Code↔DB column drift is the dominant bug class.** Because build-time type-checking is off (§12), column-name and constraint mismatches ship to production. The git history is full of these fixes: `tasks.status` constraint mismatch, `notification_policies` columns, "rename activities columns to match DB", "drop phantom `sms_*`/`whatsapp_*` columns", a long cluster of `role_permissions` type/column fixes, and "/api/* routes 500ed". At least a dozen commits are the same class of bug. (The `tasks.status` one specifically *is* now fixed and consistent across migration + TS types + Zod schema.)

5. **Duplicate definitions:** `locations` (×3), `role_permissions` (×3), `integration_connections` (×2), and two parallel feature-flag systems (`feature_flags` vs `feature_flag_registry`).

**The most reliable schema doc is `SCHEMA_INVENTORY.md`** (dated 2026-05-01). The numbered `01-`, `11-`, `14-` schema docs are from Dec 2024 and describe ~6–14 tables vs the real ~181 — **badly stale, do not trust.**

**Recommended fix (see §14):** replay the migrations into a fresh DB, resolve the failures, and commit a single `pg_dump --schema-only` as the canonical schema.

---

## 5. Multi-tenancy & data isolation

**Model:** every tenant-scoped table carries a `tenant_id` (UUID); core CRM tables also carry `location_id`. Isolation is enforced in two layers — app-layer query filters (`.eq('tenant_id', …)`) and Postgres RLS policies (~225 policy names across ~79 migrations; RLS has been reset/rewritten several times).

**The current, definitive answer on `tenant_id`:** `app_users.tenant_id` is **legacy and nullable**. The authoritative per-session context field is **`app_users.active_tenant_id`**, set on login / org-switch. Org switching goes through `POST /api/org/switch` and a full page reload.

### ⚠️ Highest-risk tenancy issue: RLS vs app-layer mismatch

The RLS helper function `current_tenant_id()` (migration `…hardening_001_helpers.sql`) reads from an **`org_memberships`** table plus `app_users.tenant_id`. But the **entire application layer** (34 files) resolves tenancy from **`user_tenant_memberships`** + `active_tenant_id`. **These are two different membership tables.** If `org_memberships` is empty or stale, RLS and the app will disagree about what a user can see — which presents as "my data is missing" or "RLS is hiding everything" (there's even a root doc named `🚨_DATA_HIDDEN_BY_RLS.md`). **Verify whether `org_memberships` is populated and synced** — this should be near the top of the investigation list.

Also note **auto-tenant creation is OFF.** An older doc (`10-tenant-id-constraint-definitive-answer.md`) claims a trigger auto-creates a tenant on signup; later migrations explicitly **drop** that trigger. The recent "tenant_id constraint" fixes in git are this teardown. Trust the migrations.

---

## 6. Auth, onboarding, invitations & roles

**Auth & signup.** Supabase Auth (email/password, HTTP-only cookie sessions). Signup inserts an `app_users` row (`role: 'owner'`, no `tenant_id`) and redirects to `/dashboard`. Email verification is **not** currently required for dashboard access.

**Onboarding — current design (code-verified):** after signup, `middleware.ts` checks for an active `user_tenant_memberships` row. If the user has none, tenant-required routes redirect to **`/organization-setup`** — a single page offering "Create Organization" or "Join with invite code." The older multi-step wizard (`enhanced-onboarding-wizard.tsx`, route `/onboarding`) still exists but is gated behind already having a membership and is largely bypassed.

⚠️ **Onboarding is the most contradictory area in the docs** — there are ~10 conflicting onboarding documents ("removed", "new workflow", "revolutionary", "fix instructions"). The reality above is what the shipped middleware actually does; the wizard docs describe designs that were only partly implemented. Known live bugs in the wizard path: a `description` vs `company_description` column mismatch, and a `.single()` call that breaks for multi-org users. **This subsystem needs one authoritative description and a decision on whether the wizard stays.**

⚠️ **Duplicate endpoints exist:** org creation has both `/api/organizations/create` (called by the UI) **and** `/api/orgs/create`; invitations have a modern path and a legacy one. Pick one of each and remove the other.

**Invitations.** The active system is `pending_invites`: a 6-character invite code, role assigned by the inviter, 7-day single-use expiry. Create via `POST /api/invites/create` (owner/admin only), accept via `POST /api/invites/accept`. Known gaps: the invite email is **not auto-sent** on creation, there's no cancel/resend endpoint, and the inviter can't choose a location. A legacy `user_invitations` token table also still exists.

**Roles & permissions.** Roles are `owner | admin | manager | staff | viewer`, stored on the membership. The permission matrix is in `src/lib/permissions.ts`. **Location-based roles are implemented at the DB level** (`membership_locations` with per-location `role_override` and `scope`, plus helper functions and RLS policies), **but there is no admin UI or API to assign them** — and only the Contacts API currently enforces location filtering end-to-end.

---

## 7. Integrations & external services

| Service | Status | Notes |
|---|---|---|
| **Twilio** (SMS / voice / WhatsApp) | **Implemented** | Real clients + inbound webhooks with signature verification. Per-tenant credentials. |
| **OpenAI** | **Implemented** | Powers AI assistant (GPT-4-Turbo), call summary, psych analyzer (GPT-4o-mini). |
| **Anthropic** | Available, lightly used | Client exists; most paths default to OpenAI. |
| **Stripe** | **Implemented** | Payment intents + billing routes. Needs `STRIPE_SECRET_KEY`. |
| **Resend + SendGrid** | Implemented (provider switch) | **BUT see the caveat below — a separate marketing mail path is a no-op stub.** |
| **Google APIs** | **Implemented** | Calendar sync, reCAPTCHA, and marketing-audit connectors (PageSpeed, Search Console, GA4, Places) with OAuth. |
| **PMS** (Dentrix / OpenDental / Eaglesoft) | **Stub** | Only a generic webhook adapter ships. Named PMS adapters are type stubs despite `PMS_INTEGRATION_FINAL_SUMMARY.md` claiming "100% complete." |
| **OpenAI Whisper** (call transcription) | **Mock** | `ai/transcribe-call` returns a hardcoded transcript (`// TODO: Integrate Whisper`). |

⚠️ **Email "split-brain" — important:** there are multiple email code paths. The **Communications Integrations** path (via `lib/communications/dispatcher.ts` + `integration_settings`) is the real one. But `src/lib/marketing/mail-provider.ts` is a **NoOp stub that only `console.log`s "Would send email"**, and a SendGrid provider there is a `// TODO`. So depending on which path a feature uses, email may silently not send. (See gotcha #3 in §12.)

**API surface (≈55 route groups):** CRM core (contacts/deals/pipelines/tasks/activities), org/auth/multitenancy (organizations/orgs/org/invites/join-requests/locations/onboarding/settings/users), communications + extensive `webhooks/*` (sms, voice, whatsapp, email, Meta/TikTok/Google lead ads), AI (`ai-assistant/*`, `ai/*`, `psych-profiles`, `automations`, `engagement`, `bot`), marketing + the large `marketing-audit/*` tree, and commerce/ops (billing, payments, integrations, cron, health, system).

---

## 8. AI features — shipped vs aspirational

Be skeptical here: there's a detailed `AI_ASSISTANT_MASTER_PLAN.md` and an `AI_ASSISTANT_COMPLETE.md`, but they're a plan and a victory lap respectively. What's actually in the code:

- **Shipped:** AI assistant chat (GPT-4-Turbo with deal/contact/global context builders), draft-email, automation engine (`automation-engine.ts`, ~1,000 lines — real, with event listeners, prebuilt workflows, SLA/governance), conversation analyzer (keyword/sentiment/urgency), call summarization.
- **Gated / mock:** psychological profiles (real, but has a `PSYCH_ANALYZER_MODE=mock` path); call transcription is **mocked**, so end-to-end call coaching needs an external transcript source.
- ⚠️ **Fake AI in the UI:** `task-queue-panel.tsx` renders **hardcoded** "AI briefing" talking points as if they were live model output. Either wire it to real output or remove it.

---

## 9. Background workers

Four BullMQ workers in `src/workers/`, all requiring Redis (`REDIS_URL` or host/port/password); they exit gracefully if Redis is absent:

- `communication-worker` — outbound SMS/email/WhatsApp dispatch.
- `engagement-worker` — autonomous engagement campaigns.
- `analytics-worker` — analytics learning loop.
- `competitor-intel-worker` — marketing-audit competitor intelligence.

⚠️ **Orphaned cron jobs:** `sendTaskReminders()` and `checkTaskEscalations()` are defined but **never invoked by any cron** — so task reminders/escalations never fire even when a user turns them on.

---

## 10. Deployment & environments

⚠️ **Railway vs Vercel — resolved:** both are configured, and the docs disagree. **The live deploy path is Vercel.** Evidence: `.vercel/project.json` exists, `deploy:prod` runs `vercel deploy --prod`, a Husky `pre-push` hook auto-deploys to Vercel on every push, `vercel.json` defines 7 production cron jobs, and the gotchas doc references live Vercel deploy IDs and function logs. Railway config (`railway.json`, `nixpacks.toml`) and `RAILWAY_DEPLOYMENT_GUIDE.md` also exist but should be treated as **stale/aspirational**. **Recommendation: pick one platform and delete the other's config** to stop the confusion. There are even three different "production URLs" floating across the docs — none verified.

⚠️ **Rotate the exposed secret:** a live `SENTRY_AUTH_TOKEN` is committed in `RAILWAY_DEPLOYMENT_GUIDE.md`. Rotate it and scrub it from history.

**Required env vars (high level):** Supabase (URL, anon key, service-role key, pooled `DATABASE_URL`), auth (`JWT_SECRET`, `NEXTAUTH_SECRET/URL`, `BASE_URL`), Stripe, Resend/SendGrid, Twilio, OpenAI/Anthropic, Google OAuth, `REDIS_URL`, `CRON_SECRET`, and Sentry keys.

**Feature flags:** two systems — env-level (`ENABLE_MULTI_LOCATION`, `ENABLE_BILLING`, `ENABLE_MARKETING`, `ENABLE_SEAT_ENFORCEMENT`, `NEXT_PUBLIC_ENABLE_*`) **and** a DB-backed registry (`feature_flag_registry`, managed in Settings → System → Feature Flags). Resolution order: tenant override → global → registry default.

**Demo mode:** `DEMO_MODE` toggle with an isolated `DEMO_TENANT_ID` and token-gated reset (`npm run demo:reset`).

---

## 11. Observability & testing

**Wired and real:** Sentry (`withSentryConfig`, hidden source maps, cron monitors), Pino logging (`src/lib/logger.ts`), a `/api/health` route, and security headers in `next.config.js` (with a deliberate `frame-ancestors` carve-out for the embeddable form routes `/forms/embed/` and `/f/`).

**Documented but mostly aspirational:** `observability.md` describes Web Vitals, OpenTelemetry, trace IDs, SLO tables, Grafana/PostHog dashboards — treat as plans, not live, unless you confirm otherwise. PostHog only forwards metrics if `POSTHOG_API_KEY` is set.

**Testing infrastructure exists and is extensive on paper:** Jest (unit + integration), Playwright (e2e), Percy (visual), axe-core (a11y), Lighthouse CI (budgets ≥90), k6 (smoke/load/stress) plus Artillery. CI under `.github/workflows/` includes a Pre-Deploy Gate (type-check, lint, build, unit), e2e, k6, Lighthouse, Percy, CodeQL, Semgrep, SonarCloud, and SQLFluff. **However**, there's no record of a green test run beyond a few manual SQL checks, and historical coverage was effectively zero. **The CI Pre-Deploy Gate is currently the only thing catching type errors, because the build itself ignores them (§12/§13).**

---

## 12. Dev workflow & operational gotchas

**Intended workflow:** work on a feature branch (current work is on `phase-1-attribution-foundation`), never push directly to `main` without approval; the PR Pre-Deploy Gate must pass; merges auto-deploy via the Husky hook. `ROLLOUT_PLAYBOOK.md` prescribes a phased feature-flag rollout (0→5→25→100%) with rollback triggers.

### The operational gotchas every developer must know

These come from `docs/operational-gotchas.md` (the single most valuable operational doc in the repo) and are code-verified. They explain a lot of "it works locally but breaks in prod" pain:

1. **`'use client'` modules break server routes in production** (they work in dev and Jest, then throw "X is not a function" in prod). Split client/server code into `*.client.ts` / `*.server.ts`.
2. **`authFetch` can silently hang.** Supabase `getSession()` can deadlock on a NavigatorLock, wedging any Save/Send button with no network request even appearing. There's a 2.5s timeout fallback to cookie auth — don't raise the cap and don't drop `credentials:'include'`.
3. **Outbound comms credential split-brain.** Legacy Settings tabs write to dead `tenants.sms_*`/`smtp_*` columns the dispatcher never reads. Only the **Communications Integrations** tab works; go through `loadTenantIntegrationSettings` / `integration_settings`. (Related to the email no-op stub in §7.)
4. **Outbound send routes are auth-gated and tenant-derived** — server-internal HTTP callers get 401. Call the `dispatch*` functions in `lib/communications/dispatcher.ts` directly. Per-tenant rate limits apply (email 60, sms/wa 30, voice 10 per minute).
5. **Do NOT drop `tenants.sms_phone_number` / `whatsapp_phone_number`** — these are inbound webhook routing IDs (not outbound creds). Dropping them silently breaks inbound message delivery. Each tenant needs its own Twilio number.
6. **Migrations:** prefer the Supabase apply-migration tooling; do **not** run `supabase db push --linked` (remote drift makes it fail). Files in `docs/2b/migrations-pending/` are deliberately quarantined.
7. **Lazy-require heavy libs** (`isomorphic-dompurify`, `web-push`) — top-level imports crash Vercel cold starts with HTML 500s.
8. **Audit-first writes:** write the `audit_trail` row before mutating and compensate-delete on failure (`logAuditServer`, service-role only). VAPID keys are write-once — never rotate them.

---

## 13. ⚠️ Known issues — what actually doesn't work

This is the honest section. It is based on code reading and git evidence, **not** on the "complete" docs. Overall: this is a **large, real, but fragile and only partially-working product** — built fast and patched constantly.

**The root enabler of most bugs:**

- **Build-time TypeScript and ESLint checks are turned OFF** (`next.config.js`: `typescript.ignoreBuildErrors: true`, `eslint.ignoreDuringBuilds: true`). Type errors — including the column-name and constraint mismatches that plague this app — ship to production silently. This is the highest-leverage thing to fix.

**Concrete broken areas:**

- **Task automation produces no tasks.** The `create_task` action in `automation-engine.ts` writes columns that don't exist (`due_date` vs `due_at`, `assigned_to` vs `assignee_user_id`) and a `status:'pending'` value that violates the CHECK constraint; the insert fails and the error is swallowed. Prebuilt task workflows install but never fire. (Source: `docs/audits/tasks_module_rebuild_audit.md`.)
- **Marketing email doesn't send** — the `mail-provider.ts` used by that path is a no-op stub (§7).
- **Task reminders/escalations never fire** — the functions exist but no cron calls them (§9).
- **Free-floating task creation is blocked** — `POST /api/tasks` requires `location_id`, so dashboard quick-add tasks can't be created.
- **Fake AI** talking points are hardcoded in the queue panel UI (§8).
- **Missing tables** referenced by FKs: `task_recurring_rules`, `push_subscriptions` (§4).
- **`dental-crm-admin` is unsecured** — it uses the public anon key with no super-admin gate, so anyone with the URL + key can read data. (Source: `AUDIT_AND_ACTION_PLAN.md`.)

**Dental-domain gap (a product question, not just a bug):** despite the name, there's **no treatment planning, clinical notes, appointment/scheduling, patient portal, or insurance/claims**. The schema is a generic CRM branded "dental." (Source: `DENTAL_CRM_COMPREHENSIVE_AUDIT.md`.)

**Missing UI/feature work:** location-role assignment UI (0%), location deletion, invite cancel/resend, settings inheritance, bulk operations, a global error boundary.

**Code-quality signals (verified across `src/`):** ~1,059 `any`/`as any`, ~1,471 `console.error`, 77 `eslint-disable`, 123 TODO/FIXME/HACK, ~962 "not implemented / placeholder / stub / coming soon" matches.

**Git pattern:** of the last 200 commits, ~95 feat / 46 fix / 40 docs; all-time it's roughly even feat/fix. The dominant fix theme is code↔DB schema drift — the exact bug class that disabled build-time type-checking allows through.

---

## 14. Top priorities to stabilize (recommended order)

1. **Re-enable `typescript.ignoreBuildErrors: false`** and fix the fallout. This surfaces the whole drift class at once and stops new drift shipping.
2. **Establish one canonical schema.** Replay the migrations into a fresh DB, resolve the `sql/`-vs-`migrations/` split and the phantom `practices` table, create the missing tables, and commit a single `pg_dump --schema-only` as the source of truth.
3. **Fix the `create_task` automation drift** (and stop swallowing insert errors).
4. **Resolve the RLS vs app-layer tenancy mismatch** (`org_memberships` vs `user_tenant_memberships`) — likely the cause of "data hidden by RLS."
5. **Wire a real email provider** on the marketing path and **invoke the orphaned reminder/escalation crons.**
6. **Fix `/api/tasks`** so free-floating tasks work; **replace or remove the fake-AI panel.**
7. **Lock down `dental-crm-admin`** and **rotate the leaked Sentry token**; pick Vercel *or* Railway and delete the other config.
8. **De-duplicate endpoints** (org-create ×2, invite ×2) and pick one onboarding flow.
9. **Decide the dental-vs-generic-CRM product question** before building more features.

---

## 15. Where to look / which docs to trust

**Trust these (durable, recent, code-aligned):**

- `SCHEMA_INVENTORY.md` — best schema reference (2026-05-01).
- `AUDIT_AND_ACTION_PLAN.md` (repo parent) — most reliable "what's wrong" doc (Apr 2026).
- `docs/audits/tasks_module_rebuild_audit.md` — current task-module reality.
- `docs/operational-gotchas.md` — the operational bible (§12).
- `docs/MIGRATION_GUIDE.md` — the authoritative migration process.
- `docs/DEPLOYMENT_GUIDE.md`, `docs/ROLLOUT_PLAYBOOK.md` — deploy & rollout.
- The numbered `02-`, `06-`, `08-`, `09-`, `13-` docs — useful for auth/tenancy/roles *concepts*, but verify specifics against code.

**Distrust / archive these:**

- Anything named `*_COMPLETE`, `*_SUCCESS`, `*_100_PERCENT`, `PHASE_N_*`, `*_MILESTONE`, emoji-prefixed status files.
- The numbered `01-`, `11-`, `14-` schema docs (Dec 2024 — describe a far smaller, older DB).
- `SYSTEM_HEALTH_REPORT.md` ("97/100, production ready" — Oct 2025, contradicted by later commits).
- `PMS_INTEGRATION_FINAL_SUMMARY.md`, `AI_ASSISTANT_COMPLETE.md` (claim completeness the code doesn't back up).

The full file-by-file keep/archive list is in `/_DOC_AUDIT/Documentation_Audit_Inventory.xlsx`.

---

## 16. Open questions to verify next

1. Is the `org_memberships` table (used by RLS) actually populated and synced with `user_tenant_memberships` (used by the app)? — top suspect for data-visibility bugs.
2. Which org-create endpoint is canonical (`/api/organizations/create` vs `/api/orgs/create`), and is the `/onboarding` wizard reachable in production or fully superseded by `/organization-setup`?
3. What is the actual live production URL and platform (confirm Vercel; decommission Railway)?
4. Does the live database match any committed schema, or is it the partial ~7-migration state described in `SCHEMA_INVENTORY.md`?

---

*Prepared by consolidating ~224 durable documents and cross-checking against the codebase, migrations, and git history. Confidence is noted inline; anything marked "verify" was inferred from docs and not confirmed against a running instance.*
