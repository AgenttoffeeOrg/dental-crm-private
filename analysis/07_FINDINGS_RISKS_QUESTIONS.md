# Findings, Risks & Questions

## Traffic-Light Summary
| Area | Status | Rationale |
| --- | --- | --- |
| Product | Amber | Enterprise UI and workflow templates are present, but several API routes still rely on simulated payloads (e.g., call transcription). |
| Data | Amber | Strong multi-tenant RLS and DSR tooling exist; reliance on soft deletes and helper functions requires consistent adoption audits. |
| AI | Amber | AI orchestration is comprehensive, yet transcribe/summarise routes fallback to mock data—production readiness depends on completing OpenAI integrations. |
| Workflows | Amber | Unified event listener and prebuilt journeys cover pipelines/tasks, but execution depends on in-memory waits and rate limits without durable queues. |
| Security | Amber | Strict RLS, backup, and erasure routines are in place, but middleware ignores build-time type errors and CSRF/rate limiting remain TODO/in-memory. |
| DevOps | Amber | Railway deployment and extensive scripts exist; CI/CD and runtime telemetry are largely stubs or manual. |
| Cost | Amber | AI usage analytics table captures tokens/time, yet real telemetry (PostHog, cost guardrails) remains unimplemented or stubbed.

## Top Strengths
- Multi-tenant access control is enforced via strict `get_current_user_tenant_id` function and table-level RLS policies covering contacts, deals, files, and AI artifacts.
- Automation governance introduces approvals, rate limits, consent audits, and rollback/versioning to prevent runaway journeys.
- Privacy tooling supports GDPR-style erasure (anonymises contact fields, redacts notes/files, logs tombstones) and data export functions.
- Backup & restore subsystem provides tenant-specific policies, retention, verification, and restore request auditing.
- Pipeline workflows and SLA monitors translate operational thresholds into events/actions, aligning automation triggers with business SLOs.

## Risks & Gaps
| Risk | Severity × Likelihood | Next Action |
| --- | --- | --- |
| `/api/ai/transcribe-call` uses mocked transcript and TODO integration, leaving production summarisation unreliable. | High × High | Complete Whisper integration, add failure alerts before enabling in production. |
| `/api/ai/summarize-call` fallback returns static example, which could mislead users if OpenAI fails silently. | Medium × High | Replace static mock with contextual error handling and surface status in UI. |
| In-memory rate limiter and CSRF TODO in security utilities expose multi-instance deployments to abuse. | High × Medium | Adopt Redis-backed limiter and implement CSRF token validation before scaling. |
| `next.config.js` ignores TypeScript and ESLint errors during build, risking silent regressions. | Medium × Medium | Re-enable type/lint checks in CI and deployment builds. |
| Observability stub (`posthog.ts`) and lack of real telemetry limit insight into usage, cost, and incident detection. | Medium × Medium | Instrument key flows (AI usage, automations, errors) with actual analytics provider and dashboards. |
| Scheduled audits & automations rely on polling + manual invocation—no durable job queue or monitoring. | Medium × Medium | Introduce queue service or background workers with retry/backoff visibility (e.g., Supabase cron, external queue). |
| Backup routines mark backups completed without storing actual file exports (commented as future work). | Medium × Low | Implement real storage of backup artifacts or integrate with Supabase storage lifecycle before claiming prod readiness. |

## Assumptions & Unknowns
- No CI/CD workflow was found; assume deployments are manual via Railway CLI scripts.
- PMS integration currently references a generic adapter; assume provider-specific implementations or secrets are handled elsewhere.
- Feature flag service is defined, but activation UI/process is not visible—assume manual DB updates.
- Automated tasks and notifications depend on automation engine; actual execution environment (worker vs API process) is unspecified.

## Clarifying Questions
**Product**
- Which modules are live with real data today (dashboard, marketing audit, multi-location) versus staged for demo?
- Are there UX flows for reviewing AI artifacts or handling failures in the UI?

**Data**
- How are legacy records backfilled into new membership/locations tables, and are there data quality reports?
- Should soft-deleted rows ever be hard-deleted, and if so, what is the retention window?

**AI**
- What success criteria and guardrails exist for OpenAI cost/latency, and how are failures surfaced to users?
- Are there plans to store prompts/version history beyond current hard-coded strings?

**Security & Compliance**
- Have penetration tests or audits verified RLS/DSR routines, and is audit log tamper detection required?
- What is the plan for production-ready rate limiting and CSRF protection across API routes?

**DevOps & Cost**
- Is there an existing roadmap for CI/CD and automated testing gates before Railway deployment?
- How are Supabase backups monitored (success/failure alerts) and where are backup artifacts stored?

## Suggested 30 / 60 / 90 Day Plan
**30 Days (Stabilise Foundations)**
- Finish real OpenAI Whisper + GPT integrations (transcription & summary) and add user-visible status/error messaging.
- Re-enable TypeScript/ESLint checks in build pipeline and introduce minimal CI job (lint + unit tests).
- Implement Redis-backed rate limiter and enable CSRF validation in security utilities.

**60 Days (Instrument & Automate)**
- Ship telemetry pipeline (PostHog or equivalent) for AI usage, automation outcomes, and error logs; hook `ai_usage_analytics` into dashboards.
- Deploy production-ready cron/queue workflow (Supabase scheduled functions or external worker) for automations/audits with retry/backoff visibility.
- Create admin UI for feature flags and automation approvals to reduce manual DB edits.

**90 Days (Resilience & Compliance)**
- Implement actual backup artifact storage and automated restore drills; integrate alerting.
- Conduct RLS/DSR audit (internal or third-party) and document guardrails for multi-tenant isolation.
- Evaluate multi-instance scaling (stateless API + distributed cache) and add load testing gates in the deployment process.

## Evidence
- src/app/api/ai/transcribe-call/route.ts:42-96
- src/app/api/ai/summarize-call/route.ts:92-114
- src/lib/security.ts:10-92
- next.config.js:5-12
- src/lib/posthog.ts:1-38
- src/lib/automations/automation-governance.ts:21-399
- supabase/migrations/20251027_001_strict_rls_auth_function.sql:30-167
- src/lib/permissions.ts:1-195
- supabase/migrations/20251016_hardening_012_privacy_dsr.sql:150-375
- supabase/migrations/20251025_013_backup_recovery.sql:249-270






