# Tasks — notifications spec

> Phase 2b.58+ — when assignees get pinged about tasks. Three
> notification layers: due-now (real-time), morning digest
> (daily email), overdue (single ping + manager escalation for
> urgent-only).

## Three notification layers

### Layer 1 — Due-now ping

When a task's `due_at` is reached AND the task is still open,
ping the assignee(s):

- **In-app toast / badge** — appears in the top-right of the CRM
  whenever the operator's session is active. Click → opens the
  task's queue modal.
- **Browser push notification** — fires even if the CRM tab is in
  the background. Requires one-time permission grant the first
  time the operator logs in.

Both are **default ON**, no opt-out (they're the core mechanic).

For **urgent priority** tasks ONLY, the operator can opt in (in
`/settings/notifications`) to also receive:
- **Email** — via the existing email infrastructure. Subject:
  "Urgent task due: [title]".
- **SMS** — via Twilio. Costs ~£0.04 per send. Body: "Urgent task
  due now: [title]. Open: [short link]".

Both opt-in OFF by default (cost + spam risk).

### Layer 2 — Morning digest

A daily email sent at **8am tenant-local time** (resolved from
`tenants.timezone` if set, else UTC). Default ON, per-user
dismissible at `/settings/notifications` (toggle
`task_morning_digest_enabled`).

Email content:

```
Good morning, Sarah —

You have 12 tasks today:
  • 3 calls
  • 7 messages (SMS / WhatsApp / Email)
  • 2 general tasks

First call: 09:00 — Joey Baby (Implant Treatment Plan)
First message: 09:30 — Confirm Anna's consult tomorrow

[Open today's queue →]

— Limelight Dental CRM
```

- Counts grouped by channel (matches the channel-batch chips on
  /tasks).
- Names the first task in each batch as a teaser.
- Single CTA: opens /tasks?queue=on (today's queue auto-launch).

### Layer 3 — Overdue ping

When a task crosses `due_at` AND remains open for > 5 minutes,
fire a SINGLE additional ping:
- In-app toast (red border to distinguish from "due now").
- Browser push (same).

**NO daily nag** — only once per task. The dashboard's "Overdue"
tab is the persistent visual reminder; no need to ping the
operator every morning about every overdue task.

**Manager escalation** for **urgent priority only** when the task
has been overdue for 24h+:
- The assignee's manager (resolved via `user_tenant_memberships.role
  = 'manager'` OR `'owner'`) receives an in-app toast + browser
  push + email.
- Manager toggle in their own `/settings/notifications` —
  "Notify me when urgent tasks of my reports go overdue" (default
  ON for managers and owners).

## Implementation

### Browser push notification setup

- Use the Web Push API (built into modern browsers).
- One-time permission grant: trigger on first /dashboard mount
  for new users. Toast with "Enable notifications so we can ping
  you when tasks are due — recommended." Two buttons: Yes / Maybe
  later (later defers for 7 days).
- Store the push subscription in `app_users.push_subscription jsonb`.
- A background worker (Vercel Function on cron) checks every minute
  for tasks where `due_at <= now()` AND `status = 'open'` AND no
  ping has been sent yet, then dispatches Web Push messages to the
  subscribed users.

### Due-now / overdue cron

`src/app/api/cron/task-notifications/route.ts` — Vercel scheduled
function, runs every minute.

Logic:
```typescript
// 1. Find tasks whose due_at just passed (in last 60s) and are still open.
// 2. For each, resolve the assignee(s) — user, group members, or everyone.
// 3. For each resolved user:
//      - Insert a row into `notifications` (in-app badge).
//      - Send Web Push if user has subscription.
//      - If task.priority = 'urgent' AND user.urgent_task_email_enabled, send email.
//      - If task.priority = 'urgent' AND user.urgent_task_sms_enabled, send SMS.
// 4. Set tasks.notified_at = now() to prevent re-pinging.
// 5. For overdue (due_at > 5 minutes ago + no notified_overdue_at yet):
//      - Repeat the above with the "overdue" tone.
//      - Set tasks.notified_overdue_at.
// 6. For urgent overdue 24h+:
//      - Find managers / owners.
//      - Ping them.
```

New columns on `tasks`:
- `notified_at timestamptz` — set when first due-now ping fires.
- `notified_overdue_at timestamptz` — set when overdue ping fires.
- `escalated_to_manager_at timestamptz` — set when urgent
  escalation fires.

### Morning digest cron

`src/app/api/cron/task-morning-digest/route.ts` — Vercel scheduled
function, runs hourly. For each tenant whose local-time is
currently 8am AND has at least one user with `task_morning_digest_enabled
= true`, build and send the digest.

Digest queries:
- For each opted-in user, find their tasks where `due_at::date =
  today (tenant tz)` AND `status = 'open'`, group by `task_type`
  bucket (calls / messages / general).
- Resolve the first task per bucket for the teaser.
- Render email template + send via existing email provider
  abstraction.

## What's intentionally NOT in v1

- **No SMS for non-urgent tasks.** Cost + spam risk.
- **No customisable digest time per user.** 8am tenant-local is
  the default; v2 could let users pick their own time.
- **No "you have a meeting in 15 minutes" reminders.** Calendar
  is a separate concern; meeting reminders live in the calendar
  app the practice uses (Google / Outlook).
- **No Slack / Teams integrations.** Browser push + email + SMS
  are enough for v1.
- **No mobile push notifications.** No mobile app exists; email is
  the proxy for off-desk operators.

## User-facing settings

`/settings/notifications` — a new sub-page (or a section on the
existing /settings page). Three toggles per user:

- ☑ Morning task digest (email at 8am)
- ☐ Email pings for urgent tasks
- ☐ SMS pings for urgent tasks (costs ~£0.04 per send)

Plus for managers:
- ☑ Notify me when my team's urgent tasks go overdue (24h+)

## Implementation phases

| Phase | What |
|---|---|
| 2b.58.T | Schema: `tasks.notified_at` + `notified_overdue_at` + `escalated_to_manager_at` + `app_users` push_subscription + user prefs |
| 2b.58.U | Web Push subscription flow on /dashboard first-mount (permission grant + store) |
| 2b.58.V | task-notifications cron — due-now + overdue + escalation logic |
| 2b.58.W | task-morning-digest cron + email template |
| 2b.58.X | /settings/notifications UI with three toggles |
