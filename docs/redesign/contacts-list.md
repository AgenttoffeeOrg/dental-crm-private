# Contacts List — `/contacts` redesign spec

> Phase 2b.36 subset — reverts the inbox-style features added in 2b.34.2 and
> reshapes the list back to a **directory**. See [[00-overview]] for the why.

## Job-to-be-done

The /contacts page is a **directory**. The operator opens it to find a
specific person (search), filter the population (e.g. "all leads tagged
Invisalign"), or add a new contact.

It is NOT used for daily triage — that's the [[dashboard]]'s job. Reply
prompts, "needs follow-up" surfacing, and similar inbox cues live on the
dashboard, not here.

## What gets undone from 2b.34.2

The 2b.34.2 patch added the following to `contacts-list-enterprise.tsx`. All
of these REVERT:

- Amber **"Reply"** pill on rows with unanswered patient messages.
- **Snippet preview** of the last inbound message under the contact name.
- **In-memory sort by `last_activity_at`** when the default sort is active.
- Channel icon + relative-time "last touch" on the source line.
- The expanded activities-query window (was bumped to `.limit(2000)`).

These were aimed at making the list feel like an inbox. They're the wrong
shape for a directory.

## What the list SHOULD show

A scannable table-style row per contact:

- **Name** (primary identifier)
- **Primary phone** + **primary email** (whichever is set; both if both)
- **Source channel** (badge — sms, whatsapp, email, web, manual, etc.)
- **Tags** (small chips, up to 3 with "+N more" overflow)
- **Owner** (avatar + name if set)
- **Open deal count** (small number, "—" if zero)
- **Created date** (relative if <30 days, absolute otherwise)
- **Quick-action affordance** (hover-revealed: open / call / email)

No reply pills, no snippet previews, no "needs you" cues.

## Top bar — search, filters, add

- **Global search box** (debounced) — matches against name / phone / email /
  tags. The same field is duplicated as the global search on the dashboard
  (see [[dashboard]]).
- **Filters** (left-rail or top-bar — match existing CRM pattern):
  - Source channel (multi-select)
  - Tags (multi-select)
  - Owner (multi-select)
  - Has open deals (toggle)
  - Created date range
  - Last activity date range
- **"+ New Contact"** button on the right — opens the existing manual
  contact-creation slide-over (which ingests via `ingestLead`, per Phase 2b.32).
- **Bulk action menu** (when rows selected): export CSV, add tag, change
  owner.

## Sorting

- Default sort: **alphabetical by name** (was: most-recent-activity).
- Selectable sort columns: name · created_at · open_deal_count · owner · tags.

## What about the "needs reply" / "unread" surfacing that was useful?

That information moves to the **dashboard's "Unread Inbound" lane** (see
[[dashboard]]). The dashboard handles triage; /contacts handles directory
lookup.

If an operator is on /contacts and wants to see "who needs a reply," she
filters by an explicit filter (e.g. "open deals · last inbound > last
outbound") rather than getting it as ambient signal. The directory is not
the right surface for ambient signal.

## Performance

- Pagination: 50 rows per page (or virtualised infinite scroll if the existing
  pattern uses that).
- Filtering / search is server-side via the existing /api/contacts endpoint
  (no client-side mega-fetch).
- Activity-derived signals (last inbound timestamp etc.) are NOT fetched on
  the list — they were the cause of the 2b.34.2 unbounded-query gotcha and
  they don't belong in the directory view anyway.

## Implementation phases (slice of 2b.36 series)

- 2b.36.1: Revert 2b.34.2 inbox-style features (Reply pills, snippet preview,
  sort-by-activity, the heavy activities query).
- 2b.36.2: Re-style row layout to directory shape (name + phone + email +
  source + tags + owner + open-deal-count).
- 2b.36.3: Restore alphabetical default sort + selectable sort columns.
- 2b.36.4: Confirm filters work (source · tags · owner · has-open-deals ·
  created/activity date ranges) — extend if needed.

## Out of scope (might come later)

- Saved views / custom filter sets.
- Inline edit-tag from the row (operator opens the contact to edit).
- Bulk import from CSV (handled by /marketing/leads-import per 2b.25.3).
