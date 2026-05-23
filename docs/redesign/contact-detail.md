# Contact Detail — `/contacts/[id]` redesign spec

> Phase 2b.36 subset — replaces the current tabs-with-big-cards layout with a
> read-first WhatsApp chat layout. See [[00-overview]] for the why.

## Job-to-be-done

When the operator opens a contact, the page answers **"who is this person and
what's happened with them, end-to-end."** It's read-first. Actions exist but
are secondary.

Three concrete use cases drive the design:

1. **New front-office staff joins** and wants to understand a contact's entire
   conversation history.
2. **An operator picks up a lead after three or four months** and wants the
   full context before reaching out.
3. **Someone needs to edit a contact's profile** or attribution data.

It is NOT used for daily triage (that's [[dashboard]]'s job) and NOT used for
"what should I do with this contact next?" prompts (those move to the deal
detail page).

## Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← Back        [Avatar] Contact Name                            [Edit profile]│
├─────────────────────────────────┬────────────────────────────────────────────┤
│                                 │  Top strip (one line, compact):           │
│  LEFT SIDEBAR                   │  3 open · 5 closed · £14,500 LTV          │
│                                 │                                            │
│  Active deals (small cards):    │  ┌──────────────────────────────────────┐  │
│  • Implant Treatment Plan       │  │  AI persona summary card             │  │
│    Stage: Quote sent            │  │  "Decisive but price-conscious;      │  │
│  • Invisalign Enquiry           │  │   prefers SMS, responds same-day…"   │  │
│    Stage: Consult booked        │  └──────────────────────────────────────┘  │
│  [View all deals ▾]             │                                            │
│                                 │  Filter row:                              │
│  Quick actions:                 │  [All] [Calls] [SMS] [WhatsApp] [Email]   │
│  📞 Call                        │  [Notes] [Meetings]                       │
│  💬 Send Message                │  [All] [Inbound] [Outbound]               │
│  💚 Send WhatsApp               │  🔎 Search messages…                      │
│                                 │                                            │
│  Tags (small chips)             │  CHAT TIMELINE (compact bubbles):         │
│                                 │                                            │
│                                 │  [Today]                                   │
│                                 │                                            │
│                                 │  ← Patient (left, grey bubble)            │
│                                 │    "Hi, want to know about implants"      │
│                                 │    SMS · 09:14 · purpose: enquiry         │
│                                 │                                            │
│                                 │              Practice (right, blue) →     │
│                                 │              "Happy to help! When are     │
│                                 │              you free for a quick chat?"  │
│                                 │              SMS · 09:18                  │
│                                 │                                            │
│                                 │  [Yesterday]                              │
│                                 │  ← 📞 Inbound call · 4m 12s               │
│                                 │    Patient asked about pricing.           │
│                                 │    AI sentiment: positive                 │
│                                 │                                            │
│                                 │  ──────────────────────────────────────   │
│                                 │  [💬 Quick reply input pinned bottom]     │
└─────────────────────────────────┴────────────────────────────────────────────┘
```

## Sections in detail

### A. Top strip (one line, just under the page header)

Compact, single line. No big cards.

- **Deal counts:** `N open · M closed`
- **LTV breakdown:** `£X open + £Y won + £Z lost` (or condensed to single LTV
  number with the breakdown on hover/tap)

Replaces the current 3-card KPI strip and the NBA card. NBA disappears from
/contacts entirely.

### B. AI persona summary

A small block (one card) under the top strip. 2–3 sentence
synthesised description of the contact based on **all** their past
conversations across all channels and deals.

Example output:

> "Decisive but price-conscious. Prefers SMS over phone. Responds within the
> same day. Initially enquired about Invisalign in October, ghosted, came
> back in March asking about implants. Treatment coordinator's note: dislikes
> being chased by email."

See [[ai-persona-summary]] for the AI build details (computation, refresh
cadence, display states).

### C. Filter row

Two-dimensional filter + search:

**Type tabs (single-select):**
- All (default)
- Calls
- SMS
- WhatsApp
- Emails
- Notes
- Meetings

**Direction tabs (single-select):**
- All (default)
- Inbound
- Outbound

**Search box:**
- Keyword search across message contents (snippet / body / description /
  call transcript / note body).

The existing **deal-chip filter row** (2b.34.4) remains above the type tabs
for contacts with ≥2 deals — operator can isolate one deal's thread.

### D. Chat timeline — the main event

**Bubble direction (confirmed in product discussion):**
- **Right side = practice (us) = outbound.** Calls, SMS, WhatsApp, emails
  sent by the practice. Notes (practice-authored) also on the right.
- **Left side = patient (them) = inbound.** Calls, SMS, WhatsApp, emails
  received from the patient.

**Bubble content:**

- **SMS / WhatsApp:** Full message text inside the bubble. They're short by
  nature.
- **Email:** AI-summary (one paragraph, generated by [[email-summariser]]).
  Subject line above the summary as a thin secondary label. Full body NOT
  rendered inline.
- **Phone call:** AI transcript summary (already generated by the call
  pipeline). Duration + outcome (connected / voicemail / no-answer) as a
  small footer.
- **Note:** Plain text inside the bubble. Always right-aligned. Distinct
  background colour (e.g. yellow / amber) to differentiate from messaging.
- **Meeting:** Title + duration + AI summary if available.

**Inline AI labels (compact, 1–2 words each):**

Each bubble carries up to 3 small inline labels at the footer:
- **Purpose:** e.g. "enquiry", "pricing", "follow-up", "consent"
- **Outcome:** (call only) e.g. "booked", "voicemail", "ghosted"
- **Sentiment:** e.g. "positive", "neutral", "frustrated"

No badges, no big icons — just two words separated by middle dots in a small
muted font. The full AI breakdown is in the side slide-out (see Section F).

**Bubble footer (small):**
- Channel icon
- Time (relative if today, absolute if older)
- AI labels (see above)
- Status icon for outbound: sent / delivered / read / failed

**Failed sends** are rendered with a red border + small "Failed" tag +
clickable "Retry" or "Open error" affordance.

**Grouping:**
- Group by day with a sticky "Today / Yesterday / Wednesday, May 15" header
  between bubbles.

**Performance:**
- Virtualise the timeline so a 6-year history loads in <300ms (use
  `react-virtuoso` or windowing approach).
- Lazy-load older messages on scroll-up.

### E. Inline quick-reply

Pinned to the bottom of the chat (above the page bottom edge).

**Behaviour:**
- A compact text input + send button.
- Channel selector defaults to the last channel used with this contact (SMS
  if the most recent thread was SMS, etc.). Manual switcher available.
- **Inherits the active deal-chip filter** — if she filtered the timeline to
  "Implant Treatment Plan", the outbound message attaches to that deal.
- Multi-line auto-expand up to 6 rows.
- Attachment + emoji + template-snippet buttons (use existing composer
  primitives).

This replaces the current "Quick actions" composer row and the per-row
"Reply" button.

### F. Click-to-detail side slide-out

Click any bubble → a side panel slides in from the right (does NOT replace
the page; preserves chat scroll position).

**Slide-out content:**
- Full message body (full email body, full call transcript)
- Full AI breakdown (purpose, outcome, sentiment, custom AI fields)
- Inline notes (read + add)
- "Change deal" affordance (existing component)
- Tags
- For calls: audio playback if available
- For emails: full HTML render

Closing the slide-out returns the operator to the same scroll position in
the chat. The chat itself never reflows.

### G. Left sidebar

**Active deals card list:**
- Compact cards (smaller than today's). Each card: deal title · pipeline ·
  stage · value if set.
- Only **open** deals (is_won = false AND is_lost = false).
- Click → /deals/[id].

**"View all deals" button:**
- Expands inline to also show closed-won and closed-lost deals (collapsed by
  default).

**Quick actions:**
- 📞 **Call** — opens dialer with contact's primary phone.
- 💬 **Send Message** — opens SMS composer.
- 💚 **Send WhatsApp** — opens WhatsApp composer.
- Email button NOT in the sidebar (the inline quick-reply handles
  threaded-into-chat email; the sidebar is for outbound-initiated channel
  decisions).

**Tags row:**
- Small chips showing contact's tags. Click to edit. Add-tag affordance.

**Optional later:** small "recently viewed deals" list.

### H. Edit profile overlay

Triggered by the **Edit profile** button (top right of the page header).

**Modal contents (single overlay, two-column form):**
- Identity: full name, primary phone (with sanitization), primary email,
  alternate phone, alternate email.
- Demographics: DOB, address, language preference.
- Tags + custom tags.
- Owner assignment.
- Source channel (manual override).
- **Attribution data section** (collapsible): first-touch UTM source / medium
  / campaign / referrer / landing page / IP; same for last-touch. Read-only
  except where the operator is allowed to edit.

**Save behaviour:**
- One save button at the bottom of the modal.
- Validates phone / email formats.
- Closes overlay on success + refreshes contact detail data.

This replaces the current scattered edit dialogs.

## What's NOT on the contact detail page

Explicitly removed or relocated:

- **NBA card** — gone. If anywhere, lives on /deals/[id].
- **Page-level quick-actions row** (between NBA and KPI strip) — gone;
  consolidated into the sidebar quick actions.
- **Customer Intelligence panel** — gone (already gone in 2b.34.3).
- **Persona Focus card** — gone (already gone in 2b.34.3).
- **Customer Value panel** — gone (already gone in 2b.34.3).
- **Deals tab** — gone. Active deals live in the sidebar; "View all" expands
  the sidebar. There is no separate Deals tab.
- **Overview tab** — gone (already gone in 2b.35.1).
- **Tasks tab / panel** — tasks move to the deal detail page (per-deal) or
  the dashboard's task queue. Not on the contact page.
- **AI Insights section** — full insights only inside the slide-out; not on
  the main page.

## Tactical decisions (locked, no need to ask)

- **Chat virtualisation:** use react-virtuoso or windowed list to keep
  initial render <300ms for contacts with 1000+ activities.
- **Slide-out behaviour:** width 480px desktop, full-width mobile, ESC + tap-
  outside to close, preserves chat scroll position.
- **Quick-reply composer:** pinned bottom, multi-line auto-expand to 6 rows,
  channel selector defaults to the last-used channel.
- **AI persona refresh:** nightly batch + on-demand if stale > 24h. See
  [[ai-persona-summary]].
- **Email summary fallback:** if summariser hasn't run yet, show the email
  subject + first 120 chars of plain text as a placeholder, with a small
  "Summarising…" pill that swaps in the AI summary when ready.
- **Drag-and-drop reassignment** (2b.35.3): keep working on chat bubbles —
  the drag handle becomes a small grip icon on bubble hover.
- **AI inline suggestion** (2b.35.2): keep — on bubbles with
  `ai_attachment_uncertain`, a small ✨ Suggest button appears beside the
  inline AI labels.

## Open implementation questions to resolve during build

- **Bubble rendering** of failed sends — should the user be able to retry
  inline (1-click resend) or only open an error detail? Lean: retry inline.
- **Notes on the right** — should there be a "+ Add note" floating action
  inside the chat, or is the inline quick-reply enough (with channel
  switched to "Note")? Lean: extend the quick-reply with a "Note" channel
  option.
- **Mobile layout** — sidebar becomes a top-collapsing accordion above the
  chat? Or a separate "Info" tab in a bottom-tab pattern? Lean: top
  accordion for now; mobile-first polish later.

## Implementation phases (slice of the 2b.36 series)

See [[00-overview]] for the full phase list. The contact detail rebuild
spans roughly phases **2b.36.5 through 2b.36.14**:

- 2b.36.5: New top strip (deal counts + LTV)
- 2b.36.6: AI persona summary placeholder (UI only, fed by stub)
- 2b.36.7: Filter row redesign (type + direction + search)
- 2b.36.8: Chat-bubble timeline — basic left/right compact layout
- 2b.36.9: Inline AI labels inside bubbles (1-2 word format)
- 2b.36.10: Click bubble → side slide-out (re-using
  ActivityDetailSlideIn where possible)
- 2b.36.11: Inline quick-reply composer (bottom-pinned, channel + deal
  inheritance)
- 2b.36.12: Restored sidebar — active deals + "View all" + quick actions
- 2b.36.13: Edit-profile overlay (single modal, profile + attribution)
- 2b.36.14: NBA card removal from contacts (clean up imports / props)
