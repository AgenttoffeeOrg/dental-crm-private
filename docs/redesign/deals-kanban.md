# Deals Kanban — `/deals` (board view) card upgrades

> Phase 2b.36 subset — adds last-activity-date and next-activity-date to every
> deal card in the Kanban board view. See [[00-overview]] and [[dashboard]] for
> upstream context.

## Why

The dashboard's "New Inquiries" and "Stale Follow-ups" lanes route into the
Deals Kanban with appropriate filters. Once the operator lands there, she
needs to immediately see **how recently each deal was touched** and **whether
there's a next action queued up**. Without those on the card she'd have to
click into each deal to find out — which defeats the purpose of the dashboard
triage.

## What gets added to each Kanban card

Existing card fields stay. New fields:

- **Last activity date** — relative ("2d ago", "yesterday", "just now").
  Sourced from `deals.last_activity_at`.
- **Next activity date** — relative ("in 3d", "today", "overdue 2d"). Sourced
  from the nearest open `task.due_date` for that deal, or NULL if no task is
  scheduled. NULL renders as a subtle "No follow-up set" pill (the stale
  signal).
- **AI-uncertain marker** — small ⚠ icon if any activity on this deal has
  `ai_attachment_uncertain = true`. Click → opens the deal with the activity
  feed filtered to uncertain items.

## Card layout (revised)

```
┌─────────────────────────────────┐
│ Implant Treatment Plan       ⚠  │
│ Joey Baby                       │
│ £4,000 · GBP                    │
│ ──────────────────────────────  │
│ Last: 2d ago · SMS              │
│ Next: in 3d (Call)              │
│ ──────────────────────────────  │
│ [Avatar] Sarah · 3 activities   │
└─────────────────────────────────┘
```

The "Last" line shows the relative timestamp + the channel icon of the last
activity. The "Next" line shows the relative timestamp + the task type. When
either is missing, render a muted "—" or a stale-warning pill respectively.

## Stale visual treatment

When `last_activity_at > 7 days ago` AND no future task:
- Card gets a thin amber left border.
- "No follow-up set" pill in the next-activity slot.
- Sorts to the TOP of its stage column when the stale filter is active.

## Filters added to the Kanban toolbar

The Kanban view inherits the existing Deals filters (pipeline, stage, owner,
tags, source). Add:

- **Stale** toggle — filters to deals matching the stale definition.
- **Unread inbound** toggle — filters to deals where the most-recent activity
  is inbound (i.e. patient said something and we haven't replied).
- **New & untouched** toggle — filters to deals at the "New" stage with no
  outbound activity yet.

These three filters are the targets the dashboard's triage lanes route to.

## Click behaviours

- **Click card body** → /deals/[id] (the deal detail page, which now hosts
  the NBA card — see [[contact-detail]]).
- **Click the contact name** → /contacts/[id] (jump into the deep-dive
  workspace).
- **Click "Last: 2d ago"** → /contacts/[id] with the activity feed scrolled
  to that last activity.
- **Click "Next: in 3d"** → /tasks/[task_id] OR opens the task drawer.
- **Drag card** (existing dnd-kit kanban) — same reorder + cross-stage move.

## NBA card on /deals/[id]

As part of this phase, the **NBA card moves from /contacts/[id] to
/deals/[id]**. The deal detail page (already exists) gains the NBA card at
the top, computed for that specific deal's context (not the whole contact).
The contact-level NBA went away; the deal-level one stays because actions
on a specific deal are well-defined.

Implementation: re-use `next-best-action-card.tsx` + `next-best-action.ts`
rule engine, passing it a deal-scoped data shape rather than a contact-scoped
one. Some rules will be deal-specific (e.g. "this deal hasn't moved stage in
14 days — propose moving it forward or marking lost").

## Implementation phases (slice of 2b.36)

- 2b.36.24: Deals query upgrade — include `last_activity_at` and `next_task`
  in the kanban list endpoint.
- 2b.36.25: Kanban card layout — render last + next + AI-uncertain marker +
  stale visual treatment.
- 2b.36.26: Kanban toolbar — add Stale / Unread inbound / New & untouched
  filters.
- 2b.36.27: NBA card → /deals/[id] migration.

## Out of scope

- Drag-to-reschedule on the kanban (drag a card's next-date to change it).
- Inline edit of deal title / value from the card.
- Saved Kanban views.
