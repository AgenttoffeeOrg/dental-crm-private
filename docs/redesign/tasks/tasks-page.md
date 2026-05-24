# /tasks page — table-first layout

> Phase 2b.58+ — reshape of `src/app/tasks/page.tsx` from
> calendar-friendly tabs into a triage-first table layout that
> launches into the queue.

## Job-to-be-done

She lands on /tasks when:
1. The dashboard's "Today's Priorities" lane sent her here.
2. She clicked "Tasks" in the sidebar to find / edit / create a
   task outside the queue flow.
3. A notification pinged her about a specific task.

The page's job: show her the right slice of tasks fast, and let
her launch into the queue with one click.

## Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Tasks                                              [+ New task]    │
│                                                                     │
│  [ All ] [ Today ] [ Tomorrow ] [ Overdue ]                         │
│                                                                     │
│  Date filter: [▼ Next 7 days        ]  Assignee: [▼ All           ] │
│  Channel:     [ All-mixed ] [ Calls ] [ Messages ]                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  [▶ Start Queue (12)]   3 selected: [Mark done] [Reassign...]  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  ☐  •  Call Joey Baby                                  09:00   ││
│  │       → Joey · Implant Treatment Plan (£4k)                    ││
│  │       Sarah · Urgent · 📞                                       ││
│  │  ─────────────────────────────────────────────────────────────  ││
│  │  ☐  •  Confirm Anna's consult tomorrow                 09:30   ││
│  │       → Anna · Invisalign Enquiry                              ││
│  │       Front Desk group · 💬                                     ││
│  │  ─────────────────────────────────────────────────────────────  ││
│  │  ☐  •  Call dental supplies vendor (re: aligners)      14:00   ││
│  │       — (no contact / deal)                                    ││
│  │       Anyone · Normal · 📞                                     ││
│  │  ...                                                            ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  [ List ] [ Calendar ]   ← bottom toggle for the calendar view     │
└─────────────────────────────────────────────────────────────────────┘
```

## Sections

### A. Tabs (top)

Four mutually-exclusive tabs:
- **All** — every open task across all dates.
- **Today** (default when arriving via dashboard or sidebar).
- **Tomorrow** — for prep work.
- **Overdue** — separate tab so overdue tasks don't drown today's.

### B. Date filter (alongside tabs)

Dropdown with predefined buckets:
- Today (default if on Today tab)
- Tomorrow
- Next 7 days
- Next 30 days
- Custom range… → opens a date-range picker
- **Multi-select** — operator can pick "Tomorrow + day after" together.

Date filter and tabs intersect — tab narrows further. Tab=Today
+ filter=Next 7 days shows only Today's tasks (tab wins).

### C. Assignee filter (alongside)

Permission-aware dropdown:
- **Solo user** (default for most operators) — only shows their own
  tasks. Filter is greyed out / disabled.
- **Group permission** (e.g. front desk team lead) — sees own tasks
  + their group's tasks + can multi-select members.
- **Manager** (`role = manager` or `owner`) — sees all users +
  multi-select any combination.

Three modes the filter renders:
- "My tasks" (default)
- "[Group name]'s tasks" (their group, if permission granted)
- "All users" → multi-select dropdown of operators

### D. Channel filter chips

Three chips. Exactly one active at a time:
- **All-mixed** (default) — every task type.
- **Calls** — `task_type = 'call'` only.
- **Messages** — `task_type IN ('sms', 'whatsapp', 'email', 'note')`.

The chip determines the queue's mode when she clicks Start Queue
(see [[queue-ux]]).

### E. Action bar

- **[▶ Start Queue (N)]** primary button on the left — count
  reflects current filter result.
- When 1+ rows are checked, action bar shows: **Mark done · Reassign
  to… · Reschedule… · Snooze… · Delete** (bulk operations).

### F. Table rows

Each row:
- **Checkbox** for bulk selection.
- **Priority dot** — red (urgent) / amber (high) / blank (normal) /
  grey (low).
- **Title** (bold).
- **Time** (right-aligned).
- Below title in lighter text:
  - Linked deal name (if any) with → arrow.
  - "— (no contact / deal)" for free-floating.
- Below that:
  - Assignee (operator name OR group name OR "Anyone").
  - Priority text (only when not normal).
  - Channel icon (📞 / 💬 / 📧 / 📝).

Row hover reveals quick actions: Edit · Mark done · Snooze · Delete.

**Overdue tasks** render with a red left border so they stand out
even when interleaved with on-time tasks.

**Auto-completed tasks** (via Path X) render with a small "Auto-
completed because you sent [activity]" hint + Reopen button.

### G. Bottom toggle — List / Calendar view

A two-button toggle pins the bottom-right of the page:
- **List** (default) — the table above.
- **Calendar** — keeps the existing `task-calendar-view.tsx`
  component as the third view (treatment coordinators who think
  in week-blocks).

The queue panel can launch from either view.

## Empty states

- "No tasks for this filter" — friendly message + "+ New task"
  button.
- "All caught up! 🎉" — when Today tab is empty AND there are no
  overdue tasks. Bigger celebration; encourages her to ping
  patients she's been meaning to.

## Behaviour notes

- **Multi-select shift-click + ctrl-click** for fast bulk
  selection. Same pattern as the dashboard's deal-chip-filter.
- **URL persistence**: tab + filter + chip state goes in the URL
  query string so a refresh or back-button preserves the view.
  Pattern matches the chat filter row from 2b.45.
- **Sort** — default is `due_at ASC` (earliest first). Urgent
  priority tasks float to the top of their date bucket. Column
  headers in the table are sortable for explicit overrides.

## Implementation phases

| Phase | What |
|---|---|
| 2b.58.X | Restructure /tasks/page.tsx — tabs + date filter + assignee filter + channel chips. Table render reshape. |
| 2b.58.Y | Bulk actions bar + checkbox column |
| 2b.58.Z | List ↔ Calendar bottom toggle (keeps existing calendar component) |
| 2b.58.W | URL persistence for tab + filter state |
