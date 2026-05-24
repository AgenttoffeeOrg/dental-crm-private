# Tasks module rebuild — Overview

> Source-of-truth index for the upcoming **2b.58+** phase series.
> Captures the vision agreed in the 2026-05-24 product discussion.
>
> Audit: `docs/audits/tasks_module_rebuild_audit.md` (produced by the
> audit-researcher subagent — Stage-2 deliverable).

## What this rebuild is for

Tasks are the connective tissue between the operator's day-to-day
flow and the patient pipeline. They're how a 3pm callback gets
remembered; how a quote-follow-up gets scheduled; how a re-engagement
campaign hands work back to the front desk.

Today the tasks module exists but it was built BEFORE the dashboard,
BEFORE the chat-bubble redesign, BEFORE the practice-playbook
discussion. It needs a focused rebuild on top of the existing
schema (which is good) and the existing TaskQueuePanel (which is
~80% right but missing the channel-batch + auto-done-from-action
+ inline composer behaviour the new vision demands).

## The locked decisions

### Creation paths (THREE — no stale-state path)

1. **Manual** — operator types into a small form. Mounts from
   per-contact, per-deal, /tasks toolbar, dashboard Quick Actions.
2. **AI-suggested** — when AI detects a commitment in conversation
   text ("call me tomorrow at 3pm" inbound, "I'll call you Thursday"
   outbound), a small **"✨ Create task?"** pill renders on the
   chat bubble below the message. One-click accept. Edit before
   create. **No auto-create — every AI suggestion is operator-
   confirmed.** No sidebar accumulator; pill-only.
3. **Practice playbook** — the practice configures repeatable rules
   on `/automations`: "When deal moves to stage X → create task with
   title T, due in N days, assigned to Y." Pre-built templates ship
   on by default; custom rule builder for edge cases.

**Stale-state nudges create NO tasks.** Dashboard "Stale follow-ups"
lane handles that surface. Putting them in the task queue would
duplicate the signal and pollute the queue with system-generated
"you should check this" items the operator can't really act on
without further context.

### Task data shape

- Title (required, short imperative — "Call Joey", "Send Mark the
  quote")
- **Date + Time, both required.** Pickers for each. Stored as a
  single `due_at timestamptz`.
- Assignee — resolved at creation:
  - Specific person, OR
  - Practice group ("Front Desk" / "TCs" — practice-defined names), OR
  - Everyone in the practice (shared inbox).
- Priority (existing: low / normal / high / urgent). Operator
  picks on create (default normal). Coloured dot in table.
  **Urgent jumps to front of queue.**
- Linked deal (optional) — auto-fills linked contact when present.
- Linked contact (optional) — for contact-tied but no-deal tasks.
- Recurring — `none` (default) / `daily` / `weekly` / `monthly` /
  `custom`. When marked done, next instance auto-created at the
  next interval.
- Status (existing: open / in_progress / done / cancelled).
- Editable post-creation — every field changeable.

### Three task flavours

| Flavour | linked_deal | linked_contact | Example |
|---|---|---|---|
| Deal-tied | ✓ | ✓ (inherited) | "Call Joey about implant quote — 3pm today" |
| Contact-tied | ∅ | ✓ | "Confirm Anna's referral was received — by EOD" |
| Free-floating | ∅ | ∅ | "Call dental supplies vendor about new aligners" |

### Assignee model

**Tenant default in `/settings/practice`:**
- Option A: assign to contact's owner (stable accountability)
- Option B: assign to a specific practice group
- Option C: assign to everyone

Practice picks one default. Per-task override always available.

**Practice groups are a new concept.** Membership roles (owner /
manager / member) are about permissions; groups are about job
function (Front Desk / Treatment Coordinators / Hygienists). New
schema: `practice_groups` + `user_group_memberships`. See
`tasks/practice-groups.md`.

**Shared-inbox semantics** when assignee is a group or everyone:
task appears in EVERY member's queue. First person to complete it
removes it from everyone's queue. No claim-first race condition —
mirrors how a paper to-do list on a 2-5 person front desk actually
works.

### /tasks page (table-first)

Initial view = TABLE, not the queue panel. Tabs at top: All ·
Today · Tomorrow · Overdue. Date filter with multi-bucket support.
Assignee filter (permission-aware). Channel chips (Calls /
Messages / All-mixed) — chip determines the queue's mode when she
clicks Start Queue.

Cols: name · time (date is on the filter so no need to repeat).
Priority shown as coloured dot. Per-row Mark done + global
**Start Queue** button.

### Queue UX

**Channel-batch by design.** Operator picks her batch BEFORE
entering flow. Queue never flips between modal-vs-workspace
mid-stream.

- **Messages batch** (default) → side modal per task. Inline
  composer (SMS / WhatsApp / Email / Note). Skip / Snooze /
  Reschedule / Edit / Reassign / Done. Auto-advance.
- **Calls batch** → full Call Coaching workspace takes over. Dialer
  + live transcript + AI objection detection + scripts + persona.
  Power-hour mode. Hangup + log outcome → next call auto-loads.
- **All-mixed** → both modes flip per task (the solo-operator
  edge case).

**Auto-mark-done via Path X (channel match).** If the operator
takes an outbound action of the matching channel after the task
was created → auto-complete. Visible "Auto-completed because you
sent an [email] to [Joey]" hint with Reopen button. No AI semantic
match in v1.

**Call outcome rules:**
- Connected → done.
- Voicemail → done + auto-create follow-up tomorrow.
- No-answer → done + auto-create follow-up +3h.
- Busy / wrong-number → leave open.

**Mid-queue arrivals** quiet-land at end of queue + small "+1 new"
counter. Don't break flow.

**End**: "Task queue empty 🎉" celebration + back-to-dashboard CTA.

### Notifications

- **Due-now**: in-app toast/badge + browser push notification.
  Default ON. Email/SMS opt-in for **urgent priority only** via
  `/settings/notifications`.
- **Morning digest** at 8am tenant-local: "You have 12 tasks
  today: 3 calls, 7 messages, 2 general." Email. Default ON,
  dismissible per-user.
- **Overdue** ping when crossing threshold: single ping (browser
  push + in-app badge). No daily nag. Manager escalation after
  24h for **urgent only**.

### Sidebar cleanup

- **DELETE /reception** — older workspace, fully replaced by the
  new Dashboard + Tasks + Call Coaching combo. Sidebar entry
  removed, route deleted, `ReceptionWorkspace` component deleted.
- **KEEP /call-coaching** — but reframe. It's now for:
  - Live coaching DURING a call (auto-opens from task queue when
    current task is type=call).
  - Post-call review + AI feedback on tone/closing (standalone
    sidebar entry).
  - It is NOT for processing today's calls — that's the task queue.
  - The 2b.55 `?mode=queue` banner gets removed (or repurposed as
    a "back to task queue" affordance).

### Permissions

**Anyone in the practice can close / edit any task.** Trust the
small-team dynamic. No fine-grained permissions in v1.

### Deal-close prompt

When a deal moves to closed_won / closed_lost AND it has open
tasks, prompt the operator with a small modal at the moment of
close: "This deal has 3 open tasks — close them?" Un-tick per
task. Default = close all (the common case).

### Other locked decisions

- **No subtasks** in v1.
- **`task-calendar-view.tsx`** kept as third view on /tasks.
- **`task-templates-manager.tsx`** kept; lives at
  `/settings/task-templates`. Operator can fire a template from a
  contact's detail page with one click (e.g. "Post-op instructions
  for implants").

## Documents in this redesign series

| Doc | Surface |
|---|---|
| [[00-overview]] | This file |
| [[task-data-model]] | Schema additions (recurring, practice_groups, user_group_memberships, contact_persona_summaries-style auto-done hints) |
| [[tasks-page]] | /tasks table + tabs + filters + Start Queue button |
| [[queue-ux]] | TaskQueuePanel reshape — channel-batch, inline composers, auto-done, snooze, reschedule, reassign, end celebration |
| [[ai-suggest-pill]] | Path 1 — AI commitment detection + bubble pill |
| [[playbook-automations]] | Path 2 — `/automations` task-creation rules: templates + custom builder |
| [[notifications]] | Browser push + morning email digest + overdue + manager escalation |
| [[practice-groups]] | New concept: schema + UI for defining org-chart groups (Front Desk / TCs / etc.) |
| [[deal-close-prompt]] | Modal that fires when a deal closes with open tasks |

## Build approach

Per CLAUDE.md: small phases (~1-2 days each), each = one validated
commit + push + agent-handleable operator gate. The audit will
produce a phased task list; we expect ~15-20 phases under the
`2b.58+` series.

Order roughly: schema additions → table reshape → queue reshape →
channel-batch wiring → AI-suggest pill → playbook templates → custom
playbook wizard → notifications (browser push + cron) → sidebar
cleanup (delete /reception) → call-coaching reframe → final sweep.
