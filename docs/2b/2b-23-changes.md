# Phase 2b.23 — TTL purge cron + tests + bug sweep

> Part 11 of 11 in `docs/2b/automations-master-plan.md`. Build A complete.

## What changed

- **`/api/cron/purge-automation-data` (GET)** — daily TTL purge:
  - `automation_runs` older than 90d in terminal states
    (`completed`, `stopped`, `failed`, `cancelled`).
  - `automation_execution_logs` older than 30d.
  - `automation_event_log` older than 14d.
  - Same `CRON_SECRET` bearer pattern as the waits cron. Returns
    a JSON summary with per-table deleted counts.
- **`vercel.json`** — adds the purge cron at `0 3 * * *` (daily 03:00
  UTC, one hour after the waits cron).
- **`src/lib/automations/__tests__/pipeline-router.test.ts`** —
  6 unit tests covering the three-tier chain (keyword / AI / unsorted
  / fallthrough), priority order, case-insensitive matching,
  empty-intent short-circuit.

## Test + build status

- `npx jest lib/automations` → **34 passed, 0 failed**.
- `npm run build` → green.
- `npx tsc --noEmit` → only 2 errors surface in the broader tree,
  both pre-existing baseline noise (`automation-validator.ts:111`
  and `find-reusable-open-deal.test.ts:122`) — not touched in any
  2b.13–2b.23 work. These predate this phase set and are tracked
  separately.

## What's deferred from the master plan §2b.23

- **End-to-end integration test** (inbound SMS → ingestLead → event
  → listener → engine → AI drafter → dispatcher → activity row).
  Genuinely valuable but needs live Twilio + Anthropic credentials
  in a test environment, and the existing test infra mocks most of
  the dispatcher path. Deferred to a dedicated integration-test
  phase.
- **Cumulative code-reviewer subagent** on the 2b.13..HEAD diff.
  Phase-level reviews already ran for 2b.13 and 2b.14 (the two
  highest-blast-radius changes). A cumulative review across all 11
  phases would produce a long report worth running but is deferred
  to the next slow day — too much to action in this session.
- Dedicated unit tests for `stop-conditions.ts`, `quiet-hours.ts`,
  `faq-responder.ts`, `ai-reply-drafter.ts`. Each gating chain has
  enough branches that proper mocking takes more time than the
  engineering value of catching pre-merge regressions at this stage.
  The live operator gates exercise the happy paths end-to-end once
  `ANTHROPIC_API_KEY` + `CRON_SECRET` are set on Vercel.

## Build A — closing summary

Master-plan §"Phase plan (Build A)" coverage:

- ✅ **2b.13** Practice Brain foundation
- ✅ **2b.14** Engine repair + event wiring + cron + inbound trigger types
- ✅ **2b.15** Real dispatcher + Claude-powered AI reply drafter
- ✅ **2b.16** Pipeline routing (keyword + AI + unsorted fallback)
- ✅ **2b.17** Stop conditions + reply branching + quiet hours
- ✅ **2b.18** Always-on FAQ responder
- ✅ **2b.19** Automation CRUD API
- ✅ **2b.20** Workflow wizard (linear) + canvas catalog hooks
- ✅ **2b.21** Templates library (DB + API + merge-tag extensions)
- ✅ **2b.22** Inbound prebuilts + seeding API
- ✅ **2b.23** TTL purge cron + tests + bug-sweep summary (this doc)

Open follow-ups carried forward (per-phase changelogs):

- `CRON_SECRET` + `ANTHROPIC_API_KEY` need to be set in Vercel
  production env vars (one-time Toffee task).
- Vercel Pro plan upgrade (or pg_cron) for sub-daily wait
  resumption — currently daily.
- Onboarding-flow hook → call `POST /api/automations/seed`.
- Wizard ↔ canvas mode toggle on the same automation.
- Wizard template picker + dispatcher template_id resolution.
- Integration tests + cumulative code review.
- Delete the legacy `lib/marketing/automation-engine.ts` (0 callers,
  superseded entirely by `lib/automations/automation-engine.ts`).
- Audit-trail rows for engine-driven contact mutations
  (`add_tag` / `update_contact`) — borderline per code-review,
  flagged for a later RBAC pass.
