# Phases 2b.81 – 2b.85 — Tasks final-tail follow-up

**Feature**: Wipe out the last deferred items from the 2b.80 summary — manager picker UI, recurring rule picker in CreateTask form, quiet-hours enforcement in the push cron, per-tenant manager-overdue threshold, auto-done widening, race-window protection on the manager rail, misc nits, and unit tests.

**Branch**: `phase-1-attribution-foundation`
**Window**: 2026-05-24
**Commits**: `b17d93d..HEAD` (5 phases bundled)

## Why one bundle

All items were called out as deferred in the 2b.80 summary or surfaced by the 2b.80 code-reviewer pass. User asked to "complete everything else that needs to be completed except the sidebar audit." This bundle closes the loop.

---

## Phase-by-phase

### 2b.81 — Manager picker + recurring rule picker
- **Manager dropdown** added to `EditUserModal`. Loads candidates via `GET /api/users?in_tenant=1`, filters out the user themselves. Persists `app_users.manager_user_id`.
- **TeamMembersTab rewritten** — replaced the placeholder "Coming Soon" stub with a real roster loaded from `/api/users?in_tenant=1` enriched with role/status/manager_user_id from `app_users`, wired to the EditUserModal. Renders "Reports to X" line per member.
- **Recurring rule picker** added to `CreateTaskSlideOver`. Frequency (daily/weekly/monthly), interval count, weekly-days chips (Sun–Sat), monthly day-of-month override, optional end date. On submit, creates the rule first via `POST /api/task-recurring-rules` (new endpoint, audit-first with pre-generated UUID), then creates the task with `recurring_rule_id` stamped.

### 2b.82 — Quiet hours + per-tenant manager threshold
- **Quiet hours enforcement** in `/api/cron/task-push-notifications`. For each due-soon recipient, looks up `notification_preferences.quiet_hours` in the user's timezone (fallback tenant tz → UTC). Suppresses non-urgent sends inside the window. Still stamps `notified_at` (we don't re-evaluate). Urgent and overdue/manager rails bypass quiet hours.
- **Per-tenant manager threshold** — cron pre-loads all `notification_policies` rows, finds the smallest `manager_overdue_hours` for the bulk query cut-off, then re-checks per task against the specific tenant's threshold. Default 24h if unset.

### 2b.83 — Auto-done widening + race-window + misc nits
- **Auto-complete-on-outbound widened**: when `operatorUserId` is provided, the close now matches `(assignee = operator OR assignee = NULL OR group-assigned OR everyone-assigned)`. Group + everyone tasks can legitimately be satisfied by any operator.
- **Manager rail try/finally** in the push cron — uses a `shouldStamp` flag with the stamp in `finally`. Matches the protection the due-soon and overdue rails got in 2b.79. No-manager paths intentionally don't stamp (so a task re-evaluates after a manager is set).
- **Duplicate-detection by error code** (`23505`) instead of message-substring in `POST /api/practice-groups` and `POST /api/practice-groups/[id]/members`. Driver/locale-stable.
- **Snooze filter logs invalid timestamps** in `/tasks` page so a malformed `snoozed_until` is traceable rather than silently treated as not-snoozed.
- **Success toast** added to the notifications-preferences-tab channel-toggle save path.

### 2b.84 — Unit tests
- **`recurring-generator.test.ts`** — 12 tests for `computeNextDueAt` covering daily/weekly/monthly cadences, interval > 1, weekly_days snap behaviour, monthly_day override, month-end overflow (Jan 31 + 1 month → Mar 3 in 2026), and the custom-RRULE-returns-null contract.
- Route tests for the audit-writing endpoints were **deferred** to a proper integration-test harness setup. Initially written with mocked `logAuditServer`, but per CLAUDE.md "Tests must SELECT the real `audit_trail` row. Never mock `logAudit*`." Pulled before commit. Future phase: stand up a Supabase test database + write integration tests.

### 2b.85 — Final sweep
- `code-reviewer` ran on `b17d93d..HEAD`. Reported 0 CRITICAL, 3 HIGH, 4 MEDIUM, 4 LOW.
- All 3 HIGH fixed:
  - **Mocked `logAuditServer` in route tests** — removed both files (precedent for other route tests doing it is a separate problem; not introducing more violations here).
  - **CreateTaskSlideOver loaded `app_users` directly** — now routes through `GET /api/users?in_tenant=1` like the rest.
  - **TeamMembersTab silent fallback on enrich error** — now fails loud with toast + empty list rather than showing every user as "staff/active/no manager".
- MEDIUM #1 fixed: **Module-scoped cache survives warm starts** — cleared at the top of every cron GET so tenant policy edits take effect on the next 5-min tick.
- MEDIUM #3 fixed: **`EditUserModal` write went direct to `app_users` without audit** — built `PATCH /api/users/[id]` with the standard audit-first pattern (tenant scope check, manager-can't-be-self check, manager-in-tenant check) and switched the modal to use it.
- MEDIUM #2 (`.limit(10000)` guard on `notification_policies` scan) — left for a future phase; today there's at most one row per tenant.
- MEDIUM #4 (orphan rule cleanup if task create fails after rule create) — left as a TODO comment; acceptable per the existing in-code comment.

---

## Operator action required

None new. Existing operator action items (VAPID env vars on Vercel from 2b.70) carry over.

To use the new features:
1. **Set a manager**: Settings → Team → Team Members → edit a member → Manager dropdown → Save. Now their urgent overdue tasks (24h+) escalate to that manager via browser push.
2. **Set quiet hours**: Settings → Notifications → Advanced → Enable quiet hours → pick start + end. Non-urgent pushes will be suppressed in that window for you on every device.
3. **Make a task repeat**: Open the Create Task slide-over → tick "Repeat this task" → pick frequency. When you mark the task done or cancelled, the next instance appears within 24 hours (via the daily recurring-generator cron).
4. **Adjust manager-overdue threshold** (admin only): Settings → Notifications → Policies → "Manager-overdue threshold" → save. The next push cron tick (within 5 min) respects it.

---

## Deferred (future)

- **Route tests** for the four audit-writing endpoints (`POST /api/practice-groups`, `PATCH /api/practice-groups/[id]`, `DELETE /api/practice-groups/[id]`, `PATCH /api/tenant-routing-settings/default-assignee-policy`, `PATCH /api/users/[id]`). Need a Supabase test harness that SELECTs the real `audit_trail` row per CLAUDE.md.
- **Orphan recurring-rule cleanup** if the task insert fails after the rule was created. Low impact; documented TODO in `create-task-slide-over.tsx`.
- **`.limit(10000)` guard** on the `notification_policies` smallest-threshold scan. Cosmetic at v1 scale.

---

## Test coverage

- `npx jest --silent --testPathPattern="lib/tasks|lib/notifications|lib/communications"`: 51/51 passing (39 from prior phases + 12 new recurring-generator).
- `npm run build`: clean.
- `npx tsc --noEmit` clean across all touched files (pre-existing errors in `marketing-audit/*` and `users/invite` + `users/[id]/page.tsx` are unrelated).
