# Phases 2b.58 – 2b.71 — Tasks-module rebuild

**Feature**: Complete rebuild of the Tasks module — multi-path creation, queue UX, AI-suggested tasks, deal-close cascade, browser push + morning email notifications, and a Limelight Playbook of prebuilt task automations.

**Branch**: `phase-1-attribution-foundation`
**Window**: 2026-05-23 (kickoff) → 2026-05-24 (ship)
**Commits**: `5bae190..HEAD` (14 phases bundled under one feature workflow)

---

## Why this was a single feature, not a string of bug fixes

The Tasks module existed before this work but was largely dead — the in-engine `create_task` action wrote the wrong column names (P0 bug), reminders never fired (cron not wired), and there were three different "Create Task" dialogs depending on entry point. The 2026-05-23 product discussion settled the full target shape (three creation paths, queue UX, channel-batching, deal-close cascade, notifications), which made this a feature build, not a sweep.

---

## Phase-by-phase

### 2b.58 — Substrate fixes
- **P0**: `src/lib/automations/automation-engine.ts:494` was writing `due_date`, `assigned_to`, `created_by`, `status:'pending'` — none of which are real columns. Every automation-generated task was silently rejected by Supabase. Fixed to write `due_at`, `assignee_user_id`, `status:'open'`, `task_type`, `priority`, `location_id`, `auto_created:true`. Insert errors now surface instead of being swallowed.
- Wired `/api/cron/task-reminders` (previously dead — `sendTaskReminders` + `checkTaskEscalations` had no caller). Schedule `*/5 * * * *` added to `vercel.json`.
- Added missing FK target `task_recurring_rules` (hybrid schema: frequency enum + RRULE escape hatch). `supabase/migrations/20260524_phase_2b_58_task_recurring_rules.sql`.
- Removed hard-400 in `/api/tasks` when no location resolves — free-floating tasks now creatable.

### 2b.59 — Schema additions
Single migration, 7 blocks: `practice_groups`, `user_group_memberships`, `tasks.assigned_to_group_id` + `assigned_to_everyone` + `auto_completed_via_activity_id` + `source_activity_id` + `notified_at` + `notified_overdue_at` + `escalated_to_manager_at`, `tenant_routing_settings.default_assignee_policy` (JSONB), `push_subscriptions`, and four notification-preference columns on `app_users`. All tables tenant-scoped via `get_accessible_tenants()`. `supabase/migrations/20260524_phase_2b_59_tasks_groups_push_subs.sql`.

### 2b.60 — Consolidate task creators
Deleted `create-task-dialog.tsx` and `create-task-panel.tsx`. Migrated `contact-tasks.tsx` + `deal-tasks.tsx` mounts to the single `CreateTaskSlideOver` with normalised prop names. Free-floating mode added (no contact, no deal — operator just needs to remember something).

### 2b.61 — AI commitment pill (Path 3 from kickoff)
`src/lib/communications/detect-commitment.ts` — Claude detector with structured JSON output, confidence threshold 0.7. Cached on `activities.metadata.ai_commitment_suggestion` so detection only fires once per activity. `POST /api/activities/[id]/detect-commitment` is the lazy entry point (called from `activity-chat-bubble` on first render). `POST /api/activities/[id]/accept-commitment-suggestion` is the one-click create. Default-assignee resolution uses tenant_routing_settings.default_assignee_policy (modes: `contact_owner` / `group` / `everyone` / `fallback_user`). UI is a small violet pill at the bottom of the chat bubble with `[Create task]` + `[✕]`.

### 2b.62 — Playbook templates
`PLAYBOOK_TASK_TEMPLATES` (8 templates) and `DEFAULT_ON_TASK_PLAYBOOK_TEMPLATE_IDS` added to `src/lib/automations/prebuilt-workflows.ts`. Wizard exposes triggers for the templates.

### 2b.63 — Queue UX part 1
Reusable `TaskActionsMenu` (Snooze / Reschedule / Reassign / Edit) with two variants (`queue`, `row`). Uses datetime-local picker + DropdownMenu primitives. Extended `TaskTypeEnum` with `sms` / `whatsapp` / `note` and added `assigned_to_group_id` + `assigned_to_everyone` to `TaskUpdateSchema` so the Edit form can change channel and assignment dimension.

### 2b.64 — Queue UX part 2 (Path X auto-done)
`src/lib/tasks/auto-complete-on-outbound.ts` — channel-match heuristic: when an outbound email/SMS/WhatsApp succeeds, close every open task of the matching channel for that (tenant, contact) that was created before the activity. 7 unit tests cover the invariants. Wired into `dispatchEmail` / `dispatchSms` / `dispatchWhatsApp` in `src/lib/communications/dispatcher.ts` via dynamic import (won't break dispatcher cold-start).

### 2b.65 — Queue UX part 3 (call outcomes + celebration)
`src/lib/tasks/log-call-outcome.ts` — connected → done; voicemail → done + 24h follow-up; no_answer → done + 3h follow-up; busy / wrong_number → leave open. Follow-up inherits assignee / contact / deal / location / priority. `POST /api/tasks/[id]/log-call-outcome` endpoint. End-of-session celebration screen on `task-queue-panel` with stats + onward CTAs.

### 2b.66 — /tasks page rebuild
Multi-bucket date filter, channel chips (`all` / `calls` / `messages`), URL-persistence, permission-aware assignee filter, bulk actions.

### 2b.67 — Deal-close cascade
`GET/POST /api/deals/[id]/close-open-tasks` — GET returns open tasks for the deal; POST bulk-cancels with per-task `logAuditServer` (audit-first per CLAUDE.md). Modal in `deal-close-task-prompt.tsx` auto-fetches on mount, silently closes if zero tasks, defaults all checkboxes checked. Drag-end handler in `enterprise-deals-table.tsx` detects `wasOpen && becameClosed` transition and fires the modal.

### 2b.68 — Sidebar cleanup
Deleted `/reception` (page + workspace) entirely — its three jobs (triage, calls, tasks) are covered by Dashboard + Tasks + Call Coaching. Reframed `/call-coaching` to drop the 2b.55 queue-mode banner; pure workspace mount. Removed Reception sidebar entry.

### 2b.69 — Morning email digest cron
`src/lib/tasks/morning-digest.ts` builds a per-user digest (counts grouped by calls / messages / general + first-task teasers + plain text + HTML body). Cron at `0 * * * *` resolves every tenant's local time, sends when local hour === 8 (8am tenant-local). Dedup column `app_users.task_morning_digest_last_sent_date`. Empty queue → no email sent. Timezone math reconstructed via `Intl.DateTimeFormat` longOffset so "midnight" resolves in the tenant's TZ, not the runtime UTC (Vercel-fix in the 2b.71 sweep).

### 2b.70 — Browser push notifications (Web Push)
- VAPID keypair generated via `scripts/generate-vapid.mjs`. Keys in `.env.local`. **Operator must add the same three env vars to Vercel** (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT) before production push fires — flagged in final summary.
- Service worker at `public/sw.js` (plain JS, scope=/). `push` and `notificationclick` handlers; click focuses an existing CRM tab and navigates rather than fanning out new tabs.
- Browser helpers at `src/lib/notifications/push-client.ts`: `isPushSupported` / `pushPermissionStatus` / `requestPushPermission` / `subscribeToPush` / `unsubscribeFromPush`.
- Server helper at `src/lib/notifications/push-server.ts`: lazy-requires `web-push` (DOMPurify pattern). Auto-prunes dead subscriptions on HTTP 404/410. Stamps `last_used_at` on success.
- `POST /api/push-subscriptions` upserts by `(user_id, endpoint)`; `DELETE` removes; `GET` lists. Writes via service-role (RLS blocks user writes).
- `/api/cron/task-push-notifications` every 5 min. Due-soon rail: tasks with `due_at` in next 5 min and `notified_at IS NULL`. Overdue rail: tasks with `due_at` ≥30 min ago and `notified_overdue_at IS NULL`. Assignee resolution covers user / group / everyone (capped at 25 for `everyone` fanout). Skips entirely when VAPID isn't configured — no log noise while keys are being added.
- New `/settings → Notifications → Basic` tab replaces toast-only stub. Real persistence to `app_users` columns + per-device push enable/disable.
- `GET/PATCH /api/me/notification-preferences` reads + writes the four preference booleans.

### 2b.71 — Final sweep
- `code-reviewer` subagent ran across the cumulative diff (5bae190..HEAD). Flagged 0 CRITICAL, 4 HIGH, 5 MEDIUM, 3 LOW.
- All 4 HIGH fixed before push:
  - **Timezone bug in morning-digest.ts** — `new Date('${ymd}T00:00:00')` parses in runtime local TZ (UTC on Vercel). Replaced with `tenantOffsetSuffix(timezone)` helper that derives the offset via `Intl.DateTimeFormat` and constructs an offset-aware ISO string. Caveat noted for DST transition days (acceptable since digest fires at 8am, well past midnight).
  - **log-call-outcome audit gap** — added `userId` to input, wrote audit FIRST for the close with compensate-delete on update failure. Follow-up insert uses pre-generated `randomUUID()` so audit-first works on creates too, with compensate-delete on insert failure.
  - **close-open-tasks audit-first** — inverted: write all per-task audits first, abort + compensate-delete if any audit fails. Same for UPDATE failure after audits.
  - **accept-commitment-suggestion audit-first** — pre-generate task id with `randomUUID()`, audit FIRST, then insert. Compensate-delete on insert failure.
- MEDIUM/LOW deferred (documented for follow-up): assignee-scoping in `auto-complete-on-outbound`, `notified_at` race window, `assigned_to_everyone` ordering for fanout cap, silent-catch log signal in push-server, push_subscriptions `(tenant_id)` conflict-key consideration.
- Build + tsc + jest clean on push.

---

## Operator action required (production)

1. **Add VAPID env vars to Vercel** (Production + Preview + Development scopes):
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (set to `mailto:<operator-email>`)

   Values are in `.env.local` (gitignored). The push cron emits `skipped:true` rather than erroring when these are missing, so production stays quiet until the operator wires them.

2. **Trigger initial seeding** of `practice_groups` for the test tenant (Front Desk, Treatment Coordinators, etc.) — UI for this lives on `/settings/team` and is part of the 2b.59 schema; no separate gate needed.

3. **Set `tenant_routing_settings.default_assignee_policy`** if anything other than `{mode: 'contact_owner'}` is desired. Default applies if column is null.

---

## Deferred / future

- **Manager overdue alerts** (`manager_overdue_alerts_enabled` column exists; cron rule not wired). Will fire from the same `/api/cron/task-push-notifications` once "direct report" relationship is added to `user_tenant_memberships`.
- **Recurring task next-instance daily cron** — schema exists (`task_recurring_rules` + `tasks.recurring_rule_id`); daily generator not built. Bumped to a follow-up phase.
- **Snooze persistence on cross-device** — currently snooze only affects the local UI state; once the next-instance cron lands, snooze writes a `snoozed_until` on the task that the queue respects.
- **Push subscription `(tenant_id)` in conflict key** — current unique key is `(user_id, endpoint)`; tenant column stays on the row but is informational. Not a security issue; flagged for cleanup if multi-tenant operators surface confusion.

---

## Test coverage added

- `src/lib/tasks/__tests__/auto-complete-on-outbound.test.ts` — 7 tests covering channel-match, created-before, batch-close, assignee scoping, contact scoping, no-op on unrelated channels, idempotency.

Existing tests (jest) all pass on the merge.
