# Phases 2b.72 – 2b.80 — Tasks follow-up build-out

**Feature**: Complete the deferred items from the 2b.58–2b.71 Tasks rebuild — snooze persistence, manager-overdue alerts, recurring task generator, practice groups admin UI, default-assignee policy UI, notifications Advanced + Policies tabs, and code-review nits.

**Branch**: `phase-1-attribution-foundation`
**Window**: 2026-05-24
**Commits**: `8c98743..HEAD` (9 phases bundled)

## Why this was a single feature

The original Tasks rebuild summary called out 8 deferred items (#3–#9 in the leftover list). The user asked to "complete all the other tasks please" excluding the standing Sidebar IA audit. These items share a foundation (snooze + manager + recurring schema) and the same audit-first + lazy-require gotchas, so a single bundled feature workflow was the right shape.

---

## Phase-by-phase

### 2b.72 — Schema additions
Three column adds in one migration:
- `tasks.snoozed_until` (timestamptz, partial index where NOT NULL)
- `tasks.last_recurring_generated_at` (dedup for the recurring cron)
- `app_users.manager_user_id` (FK to app_users.id, ON DELETE SET NULL, partial index)

Applied via `mcp__supabase__apply_migration` (`{"success":true}`).

### 2b.73 — Snooze persistence
- `TaskUpdateSchema` accepts `snoozed_until`.
- `TaskActionsMenu.doSnooze` writes `snoozed_until` (not `due_at`). The deadline stays put; the task just disappears from queue + dashboard until the snooze expires.
- `TaskActionsMenu.doReschedule` clears `snoozed_until` on reschedule — the operator actively moved the deadline so any prior "hide until" intent is moot.
- `/tasks` page client-side filter in `loadTasks()`: `snoozed_until IS NULL || snoozed_until <= now`.
- Dashboard triage lanes ("Today's priorities" + "Today's calls") use a Postgres `.or()` filter so the counts respect snooze.

### 2b.74 — Manager-overdue alerts cron rail
Extended `/api/cron/task-push-notifications` with a third rail:
- Open tasks (assignee_user_id NOT NULL), priority IN ('high', 'urgent'), `due_at <= now - 24h`, `escalated_to_manager_at IS NULL`.
- Looks up the assignee's `manager_user_id`; resolves manager's `manager_overdue_alerts_enabled`.
- Manager opted in → push "Assignee's task is overdue" with task title + URL to /tasks?taskId=…, stamp `escalated_to_manager_at`.
- Manager opted out → stamp `escalated_to_manager_at` anyway (avoids re-querying). Asymmetric on purpose — flipping opt-in back on does NOT retroactively fire pings.

### 2b.75 — Recurring task next-instance generator
- New `src/lib/tasks/recurring-generator.ts` with `computeNextDueAt` covering daily / weekly / monthly cadences (UTC math). Custom RRULE intentionally skipped with a `console.info`.
- Series cap respected: `occurrences_limit` (count rows by `recurring_rule_id`) and `ends_at`.
- New `/api/cron/task-recurring-generator` route scheduled `0 1 * * *` in vercel.json. Bearer ${CRON_SECRET} auth.
- Anchor is stamped (`last_recurring_generated_at`) on every terminal path so the daily tick never spawns twice. Anchor-stamp failure after a successful insert is logged as `console.error` and counted in `result.errors` so an operator can manually stamp.

### 2b.76 — Practice groups admin UI + API
- `GET/POST /api/practice-groups` — list + create.
- `PATCH/DELETE /api/practice-groups/[id]` — rename + delete (cascade removes user_group_memberships).
- `GET/POST/DELETE /api/practice-groups/[id]/members` — list + add + remove members.
- `GET /api/users?in_tenant=1` — new helper that lists active members of the caller's tenant (used by the dropdowns). Guards against bare GET by requiring the scope param.
- New tab "Practice Groups" under Settings → Team. Inline edit, expandable member list, Add Member dropdown wired to the new users endpoint.
- All mutations use audit-first with pre-generated UUIDs + compensate-delete on failure.

### 2b.77 — Default-assignee policy UI
- `GET/PATCH /api/tenant-routing-settings/default-assignee-policy` with Zod refinements enforcing `group_id` required for `mode: 'group'` and `fallback_user_id` required for `mode: 'fallback_user'`.
- New `DefaultAssigneePolicySection` mounted inside the Practice Groups tab. Four radio modes (`contact_owner` / `group` / `everyone` / `fallback_user`) with dependent picker UI for the latter two.
- Audit-first on PATCH; upserts the tenant_routing_settings row.

### 2b.78 — Notifications Advanced + Policies tabs
- Rewrote `NotificationsPreferencesTab` (was a 469-line broken stub) as a real Advanced pane: per-channel master toggles (in-app/email/SMS/push) and quiet-hours with start/end picker. Persists to `notification_preferences`.
- Rewrote `NotificationsPoliciesTab` (was 320-line broken stub) as an admin-gated tenant policy editor: retention days, manager-overdue threshold, rate limit. Admin gate uses `user_tenant_memberships.role` lookup rather than the missing `AppUser.role`.
- Fixed `UnifiedNotificationsTab`: `isAdmin` no longer references the missing field; tab visibility opens for any signed-in user, with the inner Policies tab handling actual access.

### 2b.79 — Code-review nits from 2b.71
- `auto-complete-on-outbound`: added optional `operatorUserId` to the input. When provided, scoped close to `(assignee_user_id == operatorUserId OR unassigned)` so cross-assignee batch closure becomes opt-in.
- `task-push-notifications`: wrapped due-soon + overdue recipient loops in try/finally so mid-fanout exceptions still stamp `notified_at` / `notified_overdue_at` and avoid re-pinging.
- `task-push-notifications`: added `.order('created_at', { ascending: true })` to the everyone-fanout query so the truncation at `EVERYONE_FANOUT_CAP = 25` is deterministic across cron ticks.
- `push-server.ts`: replaced silent `catch {}` blocks with `console.warn` for trace.

### 2b.80 — Final sweep
- `code-reviewer` subagent ran on the cumulative diff. Reported 0 CRITICAL, 5 HIGH, 6 MEDIUM, 3 LOW.
- All 5 HIGH fixed:
  - **Dead `/api/users?in_tenant=1` call** — built the endpoint.
  - **Silent catch in practice-groups-tab.tsx (×2)** — added `console.warn` + toast on failure.
  - **Silent catch in default-assignee-policy-section.tsx load** — added log + toast.
  - **Manager-overdue opt-in asymmetry** — documented in code comment.
  - **Recurring-generator stamp failures** — added `console.warn` on best-effort stamps; `console.error` + `result.errors++` on anchor-stamp failure after successful insert (duplicate risk).
- MEDIUM deferred (documented below): tests for recurring-generator + practice-groups routes; manager-overdue race window protection; auto-complete-on-outbound group/everyone shared-task closure; snooze date helper TZ alignment; unified-notifications-tab gate optimisation.

---

## Operator action required

None new beyond what was already required from 2b.70 (VAPID env vars on Vercel).

To enable manager-overdue alerts in practice:
1. Open Settings → Team → Team Members, and for each direct report click into their profile and set their `manager_user_id` to the manager's user id (the underlying column write — the UI surface for this isn't built in 2b.76; that's a future polish item).
2. Each manager should leave the "Manager alerts" toggle ON in Settings → Notifications → Basic (it defaults ON).

To enable recurring tasks:
1. The schema accepts recurring rules via the existing `task_recurring_rules` table, but the **task-create UI doesn't yet surface a recurrence picker**. Operators who need recurring tasks today can insert rules via SQL; the daily cron will pick them up. UI picker is a future phase.

To enable a non-default assignee policy:
1. Settings → Team → Practice Groups → "Default assignee" section. Pick a mode (contact_owner is default), optionally specify a group or fallback user.

---

## Deferred (future)

- **Manager UI** for setting `manager_user_id` on team members. Currently SQL-only.
- **Recurring rule picker** in CreateTaskSlideOver + Edit form. Currently SQL-only.
- **Recurring custom RRULE** support. Skipped with `console.info` in the generator; needs an RFC 5545 parser library (`rrule` package).
- **Quiet-hours enforcement in push cron**. Schema + UI exist; the cron doesn't yet read the receiving user's `notification_preferences.quiet_hours` to suppress pings during the window.
- **Manager-overdue threshold per tenant**. Settings UI saves it to `notification_policies.manager_overdue_hours`; the cron currently uses a hard-coded `MANAGER_ESCALATION_THRESHOLD_HOURS = 24`.
- **Tests** for the recurring-generator helper and the four new practice-groups/tenant-routing audit-writing routes. The audit-first paths deserve happy + rollback coverage.

---

## Test coverage

- All existing tests pass (`jest` clean across feature-scoped paths; `npm run build` clean).
- No new unit tests added in this bundle — see Deferred section.
- Manual smoke covered by next operator gate (post-deploy).
