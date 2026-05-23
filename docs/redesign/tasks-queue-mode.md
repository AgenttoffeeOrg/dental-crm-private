# Tasks — "Start Queue" mode spec

> Phase 2b.36 subset — adds a queue-walkthrough mode to `/tasks` so the
> operator can step through today's tasks one at a time without bouncing
> between the list and individual task details. See [[00-overview]].

## Job-to-be-done

When the operator clicks "Today's Priorities" on the [[dashboard]], she
arrives at /tasks already in queue mode. The page shows ONE task at a time,
maximised for action. Complete it → next task. Skip → next task. Done with
the queue → returns to dashboard.

This is the "stop bouncing between list view and detail view" pattern.
Salesforce calls it "work queue." HubSpot calls it "task queue."

## Two modes

The /tasks page has two modes accessible via a toggle at the top:

- **List mode** (default if you navigate to /tasks directly) — the existing
  task list view. Browse, filter, edit any task.
- **Queue mode** (default if you arrive via `?mode=queue`) — single-task
  focus, advance/skip/complete buttons, progress bar.

## Queue mode layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← Back to dashboard                Task 3 of 8 · 5 remaining                │
│                                                                              │
│  Progress: ████████░░░░░░░░░░  37%                                          │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  📞 Call Joey Baby                                                    │   │
│  │  Due: today                                                          │   │
│  │                                                                       │   │
│  │  Notes from previous activity:                                       │   │
│  │  "Joey asked for callback after 3pm Tuesday. He's interested in      │   │
│  │   the £4k implant plan but wants to discuss financing."              │   │
│  │                                                                       │   │
│  │  Related deal: Implant Treatment Plan · Quote sent · £4,000          │   │
│  │  Related contact: Joey Baby · joey@example.com · +44 7424 805475     │   │
│  │                                                                       │   │
│  │  [📞 Call now]  [💬 Send SMS]  [📧 Send email]                       │   │
│  │                                                                       │   │
│  │  Log outcome:                                                        │   │
│  │  [Completed] [Voicemail] [No answer] [Reschedule]                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  [⏭ Skip]                                                       [✓ Done]   │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Behaviour

- **Queue contents** = today's tasks for the current operator. Sorted by:
  overdue first → due_today → due_later_today. Sub-sort by priority then
  by deal value (descending).
- **Done** = marks the task complete, advances to the next.
- **Skip** = leaves the task open, advances to the next. Skipped tasks stay
  in the queue but appear at the end.
- **Reschedule** = opens a small date picker to push the task to a future
  date, then advances.
- **Log outcome buttons** (specific to call tasks) = create an activity row
  + mark task done + advance.
- **Inline action buttons** (Call / SMS / Email) = open the contact's
  composer prefilled and tied to the related deal.
- **End of queue** = "All done!" celebration + button to return to the
  dashboard.

## Data dependencies

- `tasks` table — task_id, contact_id, deal_id, due_date, task_type,
  description, status, scheduled_for, created_by, assigned_to.
- `deals` table — for the related-deal context card.
- `contacts` table — for the related-contact card.
- `activities` table — for the "Notes from previous activity" snippet (most
  recent activity on the related deal, summarised if long).

## What stays in list mode

Everything currently on `/tasks` (filters, columns, bulk actions, etc.)
stays in list mode. Queue mode is additive.

## Implementation phases (slice of 2b.36)

- 2b.36.28: /tasks?mode=queue route + page-level mode toggle.
- 2b.36.29: Queue rendering — one task at a time + progress bar + nav
  buttons.
- 2b.36.30: Inline composers (Call / SMS / Email) wired to the related
  contact + deal.
- 2b.36.31: Log-outcome buttons (call-task-specific) → activity insert +
  task complete.
- 2b.36.32: End-of-queue celebration + return-to-dashboard CTA.

## Out of scope

- Multi-operator queue sharing ("claim this task").
- Auto-routing tasks to operators by skill / availability.
- Voice-based task completion ("Hey Toffee CRM, mark task done").
