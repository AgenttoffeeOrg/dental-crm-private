# Dashboard — `/dashboard` redesign spec

> Phase 2b.36 subset — the operator's morning landing page. See [[00-overview]]
> for the why. This is the most important new surface in the rebuild because
> "most of the work happens on the dashboard."

## Job-to-be-done

The receptionist or treatment coordinator opens this every morning. In
30 seconds she answers: **"what do I need to do today?"** and gets clickable
entry points into each lane of work.

Personas:
- **Receptionist** — high-volume work. Calls, SMS replies, new inquiry
  triage, scheduling first appointments.
- **Treatment coordinator** — fewer but higher-touch deals. Treatment-plan
  follow-ups, financial discussions, longer conversations.
- **Practice manager** — not the v1 audience. Manager dashboards (team
  performance, conversion analytics) belong on a separate `/reports` page in
  a future phase.

## Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Good morning, Sarah                       [🔎 Global search ………]            │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Top strip — at-a-glance numbers                                     │   │
│  │  12 open deals · £48,300 open value · 7 new leads this week ·        │   │
│  │  3 replies needed · 1h 12m avg response (7d)                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Triage — do these now                                                       │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │ Today's priorities  │  │ Today's calls       │  │ New inquiries       │ │
│  │      🔥 8 tasks      │  │       📞 5 calls     │  │      ✨ 3 new        │ │
│  │  → Start queue       │  │  → Open dialer       │  │  → Open kanban       │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │ Stale follow-ups    │  │ Unread inbound      │  │ Failed sends        │ │
│  │       ⏳ 6 deals      │  │       💬 4 messages  │  │       ⚠ 1 failed    │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
│  ┌─────────────────────┐  ┌─────────────────────┐                          │
│  │ Voicemails / missed │  │ AI needs your eye   │                          │
│  │       📞 2 calls     │  │       👁 3 to review │                          │
│  └─────────────────────┘  └─────────────────────┘                          │
│                                                                              │
│  Quick actions                                                               │
│  [+ New contact] [+ New deal] [+ Log activity]                              │
│                                                                              │
│  Smart prompts (dismissible)                                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ 💡 You have 24 closed-lost leads from 6 months ago. Re-engage them?  │   │
│  │                                                          [Open] [✕]   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Section A — Top strip (at-a-glance numbers)

Compact, one line under the page header. Five numbers max:

1. **Total open deals** — count where `is_won = false AND is_lost = false`.
2. **Total open deal value (£)** — sum of `value_estimate_cents` on open
   deals. Display in £, abbreviated where large (£48.3k, £1.2M).
3. **New leads this week** — count of contacts created in the last 7 days
   via lead-source channels (excludes manual entries by operators).
4. **Replies needed** — count of contacts where the most recent inbound is
   > 4 hours old and no outbound followed it. The "we're losing them"
   number.
5. **Average response time (7-day)** — average minutes between inbound
   message arrival and the first outbound reply. Optional. Display "—" if
   under-sample.

Each number is clickable and routes somewhere sensible (e.g. clicking "12
open deals" → /deals filtered to open; clicking "3 replies needed" → the
Unread Inbound triage lane below).

## Section B — Triage lanes (the "do these now" cards)

Eight clickable cards in a grid. Each card shows:
- Lane name
- Count badge with an icon
- Optional one-line subtitle (e.g. "2 overdue from yesterday")
- Click → routes to the appropriate workspace

### B1. Today's Priorities (tasks due today)
- Source: `tasks` table, due_date = today (or earlier and not completed).
- Routes to `/tasks?mode=queue` → walks through tasks one at a time. See
  [[tasks-queue-mode]].

### B2. Today's Calls (calls promised today)
- Source: `tasks` where task_type = 'call' AND scheduled for today, OR a
  separate `scheduled_calls` table if we add one.
- Routes to `/call-coaching?mode=queue` → dial-then-next-call dialer
  queue. See [[call-dialer-queue]].

### B3. New Inquiries (untouched new leads)
- Source: deals in any lead pipeline at the "New" stage with no outbound
  activity yet.
- Routes to `/deals?view=kanban&filter=new-untouched`.

### B4. Stale Follow-ups (deals untouched)
- Source: open deals where last_activity_at > 7 days ago AND no future
  task is set.
- Routes to `/deals?view=kanban&filter=stale`.

### B5. Unread Inbound
- Source: contacts where most-recent inbound > most-recent outbound AND
  inbound was within the last 14 days.
- Routes to `/deals?view=kanban&filter=unread-inbound` OR a dedicated
  inbox view (TBD during implementation).

### B6. Failed Sends
- Source: activities where `message_status = 'failed'` in the last 7 days
  that haven't been acknowledged / retried.
- Routes to a filtered list view (TBD).

### B7. Voicemails / Missed Calls
- Source: activities where `type = 'call'` AND `outcome IN ('voicemail',
  'no_answer', 'missed')` AND direction = 'inbound' in the last 7 days,
  not yet acted on.
- Only renders if Twilio captures these (depends on number config).

### B8. AI Needs Your Eye
- Source: activities where `metadata.ai_attachment_uncertain = true` AND
  the operator hasn't reassigned the deal.
- Routes to a filtered activity list — operator can accept the AI
  suggestion (per 2b.35.2) one at a time.

### Behavioural rules for the cards

- **Zero-state:** when a lane is empty, the card greys out with a small
  "Nothing here ✓" message instead of a count. Not clickable.
- **Counts auto-refresh** every 60 seconds in the foreground.
- **Order** in the grid is fixed (most-urgent first). Future: operator can
  reorder via settings.

## Section C — Quick action buttons

Small button row under the triage grid. Single click → opens a slide-over
or modal. No navigation.

1. **+ New contact** — opens the manual contact creation slide-over (Phase
   2b.32 — already wired to `ingestLead`).
2. **+ New deal** — opens the create-deal dialog. Requires picking a
   contact first (or creating one inline).
3. **+ Log activity** — opens the LogActivityPanel for a "I just had a
   hallway chat" entry. Requires picking a contact.

## Section D — Smart prompts (dismissible nudges)

Cards that appear conditionally based on tenant state. Dismissible per-
operator (stored in `user_preferences` or similar).

1. **Practice Setup Incomplete** — appears when:
   - No `practice_treatment_offerings` rows exist for the tenant, OR
   - `tenant_routing_settings.unsorted_pipeline_id` is NULL.
   - Routes to `/settings/practice-setup`.

2. **Integration Warnings** — appears when:
   - Twilio number not configured (`integration_settings.twilio_number`
     unset), OR
   - Email provider not configured (`integration_settings.email_provider`
     unset).
   - Routes to `/settings/integrations`.

3. **Re-engagement Opportunity** — appears when:
   - There are ≥10 closed-lost leads with last activity ~6 months old.
   - Routes to `/marketing/campaigns/new?template=re-engagement`.

4. **AI Features Unconfigured** — appears when:
   - Practice Brain not seeded, OR
   - Brand voice not set, OR
   - No AI features enabled.
   - Routes to `/settings/ai`.

Smart prompts NEVER block the page. They're hints, dismissible, non-modal.

## Global search

A persistent search box in the dashboard header (and ideally on every page
via the global layout).

- Searches contacts, deals, activities.
- Returns ranked results (contacts first, then deals, then individual
  messages).
- ⌘K / Ctrl+K keyboard shortcut.

## Data sources summary

| Section | Primary source |
|---|---|
| Top strip — open deals | `deals` table where stage is open |
| Top strip — open value | sum of `deals.value_estimate_cents` (open) |
| Top strip — new leads | `contacts` created in last 7d via lead channels |
| Top strip — replies needed | derived from `activities` (inbound > outbound, > 4h) |
| Top strip — avg response time | derived from `activities` (paired inbound→outbound) |
| Today's Priorities | `tasks` due today |
| Today's Calls | `tasks` typed 'call' scheduled today |
| New Inquiries | `deals` at 'New' stage with no outbound |
| Stale Follow-ups | open `deals`, last_activity > 7d, no future task |
| Unread Inbound | derived from `activities` direction sequence |
| Failed Sends | `activities` where message_status = 'failed' |
| Voicemails | `activities` type=call, outcome in {voicemail,no_answer,missed} |
| AI Needs Your Eye | `activities` where `metadata.ai_attachment_uncertain` |

All counts are tenant-scoped and (where applicable) location-scoped per
membership.

## What's OUT of v1

- **Role-aware dashboards** (different view for receptionist vs TC vs
  manager). One shared view in v1.
- **Team-performance metrics** (calls made per operator, conversion by
  TC). Belongs on `/reports` later.
- **Custom widgets / drag-to-rearrange.**
- **Charts / graphs** in the top strip. Numbers only. Charts later if
  needed.
- **Date-range selector.** Top-strip numbers are always "now" + "this week"
  + "last 7 days." No custom ranges in v1.

## Implementation phases (slice of 2b.36 series)

The dashboard rebuild spans roughly phases **2b.36.17 through 2b.36.23**:

- 2b.36.17: Dashboard skeleton — header + grid layout + global search
- 2b.36.18: Top strip — 5 at-a-glance numbers with their queries
- 2b.36.19: Triage lanes — cards 1–4 (Today's Priorities, Today's Calls,
  New Inquiries, Stale Follow-ups)
- 2b.36.20: Triage lanes — cards 5–8 (Unread Inbound, Failed Sends,
  Voicemails, AI Needs Your Eye)
- 2b.36.21: Quick action buttons (New Contact / New Deal / Log Activity)
- 2b.36.22: Smart-prompt cards (Practice Setup / Integrations / Re-engage /
  AI Config), with dismissal persistence
- 2b.36.23: Auto-refresh + zero-states + routing wiring for every clickable
  surface
