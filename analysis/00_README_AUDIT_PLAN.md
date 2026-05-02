# Dental CRM Audit Plan

## Purpose & Scope
This audit documents the Dental CRM product, its supporting data platform, AI workflows, automations, and operational posture as implemented in the current codebase. The objective is to provide an evidence-backed map that a reviewer can follow to validate capabilities, surface risks, and plan next steps across product, data, AI, security, and DevOps concerns.

The scope includes the Next.js application under `src/`, Supabase database artifacts under `supabase/`, serverless functions, automation libraries, environment configuration, and deployment scaffolding. Third-party integrations, AI usage, row-level security, and disaster-recovery routines are all in scope for description but will not be altered.

## High-Level Inventory
| Area | Key Artifacts | Notes |
| --- | --- | --- |
| Front-end application | `src/app`, `src/components`, Next.js layout | Authenticated app shell with enterprise navigation and suspense handling.
| API routes & middleware | `src/app/api/*`, `src/middleware.ts` | Route handlers for AI, communications, integrations, cron, plus Supabase-auth middleware enforcing org membership.
| Shared application logic | `src/lib/*`, hooks, contexts | AI orchestration, automations, security utilities, feature flags, Supabase clients.
| Database layer | `supabase/sql/*.sql`, `supabase/migrations/*.sql` | Core schema, multi-tenant RLS policies, analytics tables, compliance routines, backups.
| Edge/serverless functions | `supabase/functions/process-call-activity` | Deno runtime for transcription + summarisation driving AI automation.
| Infrastructure & config | `supabase/config.toml`, `railway.json`, env flags | Supabase local stack, Railway deployment profile, feature toggles & service keys.
| Operations & jobs | `src/lib/marketing-audit/jobs/*`, cron endpoints | Scheduled marketing audits with retry/backoff, cron auth, orchestration class.

## Tech Stack Summary
- **Front-end:** Next.js 14 (App Router), React 19, TypeScript, Radix UI, Tailwind utilities, DnD Kit for drag/drop, Chart.js and Recharts for analytics.
- **Back-end / APIs:** Server components and route handlers backed by Supabase client libraries; Supabase SSR + service-role clients for privileged ops.
- **Data:** Supabase Postgres with extensive SQL migrations for tenants, contacts, pipelines, automations, analytics, marketing, backups, and AI artifacts.
- **Messaging & Comms:** Resend (email), Twilio (SMS), WhatsApp service stubs, Stripe payments, Google/BrightLocal/Semrush marketing providers (flagged via env).
- **AI:** OpenAI Whisper and GPT models for transcription, summarisation, proactive monitoring, and routing intelligence; AI tables for context, usage, suggestions.
- **Infra & DevOps:** Supabase local stack (`config.toml`), Railway deployment (`railway.json`), CLI scripts for migrations, demo seeding, and deployment automation.

## Investigation Coverage
- **Front-end & navigation:** Reviewed `src/app/layout.tsx`, dashboard layout, and keyboard shortcut hook to confirm enterprise UX scaffolding.
- **APIs & middleware:** Traced AI route handlers, process-call activity handler, and global middleware for auth + tenant gating.
- **Database & RLS:** Inspected initial schema, contact enrichment, multi-tenant membership policies, and strict tenant resolution function.
- **AI workflows:** Studied AI service, context builder, Supabase Edge function, proactive monitor, conversation analyzer, and AI tables.
- **Automations & jobs:** Examined automation governance, pipeline workflows, SLA monitor, unified events, and scheduled audit job.
- **Security & compliance:** Reviewed security utilities, permissions matrix, backup/recovery migration, and Supabase config for auth/rate limiting.
- **DevOps artifacts:** Captured deployment expectations from Railway config, Supabase project settings, and environment feature flags.

## Evidence
- package.json:5-147
- src/app/layout.tsx:1-43
- src/middleware.ts:1-70
- supabase/sql/01_initial_schema.sql:7-192
- supabase/sql/13_comprehensive_contact_fields.sql:4-63
- supabase/migrations/20251027_001_strict_rls_auth_function.sql:30-167
- supabase/functions/process-call-activity/index.ts:20-355
- src/lib/ai.ts:18-226
- src/lib/automations/automation-governance.ts:21-308
- src/lib/marketing-audit/jobs/scheduled-audit-job.ts:17-194
- supabase/config.toml:1-125
- railway.json:1-11








