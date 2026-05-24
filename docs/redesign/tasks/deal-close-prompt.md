# Deal-close prompt — tasks cleanup at deal closure

> Phase 2b.58+ — small modal that fires when a deal moves to
> closed_won / closed_lost AND it has open tasks. Per Q4 product
> decision: prompt the operator to close them, with un-tick per
> task. Default = close all.

## Job-to-be-done

When a deal closes (won or lost), the operator's mental model is
"that work is done." But the deal might still have open tasks like
"Follow up on Joey's implant quote." Those tasks become noise in
the queue if they stay open — operator dismisses them every day
without context.

Two extreme alternatives:
- **Auto-cancel all** on deal close — silent, fast, no decision
  cost. But might drop legitimate tasks (e.g. "send post-treatment
  instructions" — relevant even after closed_won).
- **Leave all open** — operator has to manually cancel each. Tedious.

The **prompt** model puts the decision in the operator's hands at
exactly the moment of closure (when context is fresh) without
making her think hard.

## Where this fires

Any UI surface that transitions a deal's stage to a closed-won or
closed-lost stage. Two current entry points:

1. **Deals Kanban** — drag a deal card to a closed column.
2. **Deal detail page** — change stage via the stage picker.

Both routes should funnel through the same modal.

## Trigger logic

After the deal's `stage_id` UPDATE succeeds AND the new stage's
`is_won = true OR is_lost = true`, query open tasks:

```sql
SELECT id, title, due_at, priority, task_type
  FROM public.tasks
 WHERE tenant_id = ? AND deal_id = ?
   AND status NOT IN ('done', 'cancelled')
 ORDER BY due_at ASC;
```

If the result is empty → no prompt. Just toast: "Deal closed."

If 1+ tasks exist → open the close-prompt modal.

## Modal layout

```
┌─────────────────────────────────────────────────────────┐
│  This deal has 3 open tasks                       [×]   │
│                                                         │
│  Joey's Implant Treatment Plan was just closed (Won).   │
│  Do you want to close these open tasks too?             │
│                                                         │
│  ☑ Call Joey to confirm payment received                │
│       Tomorrow · 09:00                                  │
│                                                         │
│  ☑ Send Joey post-treatment instructions                │
│       Thursday · 14:00                                  │
│                                                         │
│  ☐ Re-engage Joey in 6 months                           │
│       Nov 24, 2026 · 09:00                              │
│       (unchecked — won't be closed)                     │
│                                                         │
│           [ Skip — leave all open ]   [ Close 2 tasks ] │
└─────────────────────────────────────────────────────────┘
```

- Title block: "This deal has N open tasks".
- Subtitle: "[Deal name] was just closed ([Won/Lost]). Do you want
  to close these open tasks too?"
- Per-task row: checkbox + title + due-when. **All checked by
  default** — most tasks become irrelevant on close.
- Operator un-ticks any task she wants to preserve.
- Two buttons:
  - **"Skip — leave all open"** (secondary, grey) — closes the
    modal, leaves all tasks open.
  - **"Close N tasks"** (primary) — count updates as she un-ticks.
    Clicking marks the checked tasks as `status = 'cancelled'`,
    sets `completed_at = now()`, fires the audit row, closes
    modal.

## On "Close N tasks"

Bulk UPDATE:
```sql
UPDATE public.tasks
   SET status = 'cancelled',
       completed_at = now()
 WHERE tenant_id = ? AND id IN (?, ?, ...);
```

Audit (one row per cancelled task) — `logAuditServer`:
- `action_type = 'update'`
- `category = 'task'`
- `entity_type = 'task'`
- `entity_id = task.id`
- `description = 'Task cancelled because deal closed'`
- `before_state = { status: 'open' }`
- `after_state = { status: 'cancelled', completed_at }`
- `changed_fields = ['status', 'completed_at']`
- `tags = ['task', 'deal_close_cancel']`

Toast on success: "3 tasks closed."

## Edge cases

- **Recurring tasks** — if a cancelled task has `recurrence !=
  'none'`, the recurrence chain ends (no next instance created —
  matches the "Cancellation rule" in [[task-data-model]]).
- **Shared-inbox tasks** — when cancelled, they disappear from
  everyone's queue.
- **Operator dismisses modal (clicks ×)** — same effect as "Skip —
  leave all open." No tasks change.
- **Browser refresh mid-modal** — modal state is ephemeral; refresh
  closes the modal, leaves all tasks open. The deal stays closed.
- **Concurrent edit** — if another operator marks one of the tasks
  done while this modal is open, the bulk UPDATE simply doesn't
  affect that row (already not in the `status NOT IN (...)` filter
  on re-read). Toast: "2 of 3 tasks closed (1 was completed by
  another operator)."

## What's intentionally NOT in v1

- **No "re-open this deal" undo** — closing the deal is a separate
  action with its own audit trail. The deal-close modal only
  decides what to do with the open tasks.
- **No "create one final follow-up task" prompt on close** — too
  many micro-decisions. Operator can manually create a task after
  if needed.
- **No "remind me in 6 months to re-engage" auto-create** — that's
  what the practice-playbook "Closed Lost → re-engagement in 6
  months" template (per [[playbook-automations]]) handles, if
  enabled.

## Implementation phases

| Phase | What |
|---|---|
| 2b.58.AD | API endpoint POST /api/deals/[id]/close-open-tasks that bulk-cancels with audit |
| 2b.58.AE | Modal component (DealCloseTaskPrompt) |
| 2b.58.AF | Mount the modal trigger in deal-detail-view.tsx + enterprise-deals-table.tsx (Kanban drag) |
| 2b.58.AG | Recurring-task chain termination on cancellation (cron-side check) |
