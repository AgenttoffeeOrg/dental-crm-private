# Phases 2b.30 → 2b.33 — Contacts module overhaul

Driven by the 2026-05-22 audit walk-through. Closes the bulk of the
"good / bad / ugly" items the user surfaced after I screenshotted every
contact surface end-to-end.

## What shipped

### 2b.30 — Contacts list polish (commit `2e98400`, `0c91928`)

- New `src/lib/source-channels/labels.ts` — single source of truth
  mapping `source_channel_enum` values to `{ label, description, icon }`
  for the 13 active inbound channels.
- Contact list row sub-text replaces raw enum (`form_embedded`) with
  pretty label + Lucide icon (📝 "Web form").
- Source filter dropdown rebuilt off `ACTIVE_SOURCE_CHANNELS` (the
  previous list was free-form and filtered to zero against real data).
- New Owner filter (All / Unassigned / per team member).
- New Date Added filter (Today / 7d / 30d / Older than 30d).
- New "Last touch X ago" sub-text per row (parallel activities-query
  fold-in to the existing deal-stats lookup).

### 2b.30.2 — Persona / psych-profile paused (commit `b5200a7`)

`PSYCH_PROFILE_ENABLED = false` constant at the top of
`contact-detail-view.tsx`:

- `fetchPsychProfile()` skipped at mount → no more
  `contact_psych_profiles` 404s in the browser console on every
  contact view.
- "Persona Insights" sidebar panel hidden (entire JSX block gated).
- Code preserved unchanged — flipping the flag back to `true` after
  the schema + analyze API land is a single-line change.

### 2b.31.1 — Learning Loop Signals paused (commit `b10e80e`)

Same pattern: `LEARNING_LOOP_ENABLED = false`. Hides the three "Need
more data" placeholder boxes (TOP CONVERSION SCRIPT / MOST ADOPTED /
REVENUE DRIVER) until the sales-script system has organic data.

### 2b.31.2 — Next-Best-Action card (commit `b10e80e`)

New `src/components/contacts/next-best-action-card.tsx` mounted at the
top of the contact detail right column. Pure rule engine in
`src/lib/contacts/next-best-action.ts` with 11 unit tests covering the
full truth table. Rule priorities (first match wins):

1. `reply_inbound` — unreplied inbound within 48h → urgent
2. `follow_up_stale` — open deal silent ≥ 7d → high
3. `move_stage` — open deal row untouched ≥ 14d → high
4. `create_deal` — has activity but no open deal → high
5. `on_track` — open deal with recent activity → info
6. `first_touch` — brand new contact → normal
7. `no_signal` — fallback → info

Each renders an opinionated card: priority badge, one-line title,
reason subtitle, single primary CTA wired to the parent's composer
slide-overs or deal navigation.

### 2b.31.3 — Duplicated contact name removed

`Relationship Snapshot` card heading replaced with `Quick actions`.
The contact's name now appears once (left sidebar header) instead of
twice (sidebar + centre column).

### 2b.32 — Manual contact creation via `ingestLead` (commit `0c91928`)

- New `POST /api/contacts/manual-create`:
  - Validates body (`full_name` + at least one identifier).
  - Calls `ingestLead({ source_channel: 'manual_entry' })` so dedup,
    attribution touchpoint, default-pipeline deal, and the
    `lead.arrived` notification all fire — same as every other
    inbound channel.
  - 409 `review_required` when dedup is ambiguous → UI shows a
    "duplicate — queued on /dedup-queue" warning rather than
    silently creating a duplicate.
  - Applies tags + owner assignment after ingest.
- Create-Contact slide-over create path now POSTs to the new endpoint
  instead of direct INSERT. Edit path (mode==='edit') unchanged —
  editing isn't lead creation, no dedup needed.
- Source dropdown rebuilt off `ACTIVE_SOURCE_CHANNELS` so the value
  persisted matches what every other channel writes.
- **Closes locked principle #1 violation** — manual entry was the
  last lead-creation channel still bypassing `ingestLead`.

### 2b.33 — Dedup queue resolved-history hint (commit `0c91928`)

Subtitle now reads "0 pending — review and resolve · 3 resolved
earlier (switch the filter to view)" when pending=0 but resolved
items exist. Operators couldn't tell the difference between "no
dedup activity ever" and "all clean, but past resolutions exist".

## Code-review findings (deferred per CLAUDE.md)

Cumulative code review across all four commits: **0 CRITICAL, 0 HIGH,
6 MEDIUM, 4 LOW**. Verdict: PROCEED.

### MEDIUM

1. **manual-create post-ingest follow-ups have no error handling**
   (`route.ts:107-131`). If the tag-merge or owner-assignment
   `.update()` fails, the route still returns `{ ok: true }` and the
   operator sees a success toast even though those updates silently
   didn't apply. Worth catching + logging + signalling partial success.

2. **Tag-merge update is missing the `tenant_id` filter** for
   defence-in-depth (`route.ts:116-119`). Service-role client makes this
   moot in practice, but the owner-update 12 lines below DOES filter
   on `tenant_id`. Add for symmetry.

3. **NBA card silent fallback on fetch failure**
   (`next-best-action-card.tsx:182-186`). When the activities/deals
   queries fail, the card falls through to "Nothing urgent" (Rule 7)
   because the inputs stay at their defaults. Consider showing a
   "couldn't load suggestion" state so operators don't act on a
   false "all clear".

4. **Unbounded activity query for last-touch**
   (`contacts-list-enterprise.tsx:275-281`). 50 contacts × no row
   limit = potentially many MB of activity rows per page render.
   First-per-contact_id is taken then everything else discarded. The
   cleaner fix is a `contacts.last_activity_at` materialised column
   stamped by the same trigger that already maintains
   `deals.last_activity_at`.

5. **Dedup queue resolved-count over-fetch**
   (`dedup-queue-list.tsx:113-139`). Decorative hint costs 2 extra
   list-count fetches at mount. A single `/api/dedup-queue/counts`
   endpoint returning `{ pending, resolved }` would be cleaner.

6. **Slide-over collects fields that don't persist**
   (`create-contact-slide-over.tsx:316-329`). `contact_type`,
   `secondary_phone`, `secondary_email`, `address`, `city`,
   `postal_code`, `country`, `date_of_birth`, `occupation` are all
   gathered by the form but neither the create nor edit path
   persists them. Pre-existing — not introduced by this diff. Wire
   them through, or remove the dead form fields.

### LOW

1. `PSYCH_PROFILE_ENABLED` / `LEARNING_LOOP_ENABLED` are file-scoped
   booleans. A central `lib/feature-flags.ts` module would be cleaner
   if more flags accumulate; for two related-area flags it's fine.

2. Pre-existing stage-name string matching in `contact-detail-view`
   violates locked principle #9. NOT introduced here. Dedicated
   cleanup phase.

3. `event_id` uses `Date.now()` so rapid double-click within the same
   millisecond won't dedupe. Operator's responsibility per the
   comment, but worth knowing the limit.

4. NBA card's `onSendEmail` handler reads `contact.primary_email`
   from the closure; safe today because the card mounts inside the
   `if (!contact)` guard, but a future refactor moving the card
   upward could crash. Minor.

## Deferred / out of scope

Items from the original audit not addressed in 2b.30-33 (intentional
hold for a future phase or explicit user-direction call):

- **Tab structure expansion** (3 → 6 tabs: Overview / Activity /
  Deals / Notes / Files / Marketing). Genuine refactor risk on a
  1593-line file; needs its own phase.
- **Move "Call Coaching" + "Generate Research Profile" buttons to
  an AI Tools (beta) dropdown.** Skipped — Persona Insights pause
  already hides the "Generate Research Profile" button; Call
  Coaching button is now inside the paused Persona Insights card
  too, so it's effectively gone for now.
- **Hard-coded "Lead" badge on every contact in list**. Reflects
  the `contact_type` column. A real status model is a bigger
  decision; out of scope for this slice.
- **Tags column rendering raw strings (system vs user tags)**.
  Cosmetic; minor.
- **Voice / WhatsApp composer integration for the NBA card's
  Send WhatsApp CTA**. Currently routes to the generic activity
  dialog. Future polish.
