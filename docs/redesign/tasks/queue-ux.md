# Task queue UX — channel-batched walkthrough

> Phase 2b.58+ — reshape of the existing `TaskQueuePanel` (~600 LOC)
> with channel-batch awareness, inline composers, AI auto-done
> handling, snooze, reschedule, reassign, and the end celebration.

## Channel-batch principle

Operator picks her batch with the channel chip on /tasks BEFORE
clicking Start Queue. The queue never flips between modal-vs-workspace
mid-stream:

| Active chip | Queue mode |
|---|---|
| **Messages** (default) | Side modal per task with inline composer |
| **Calls** | Full Call Coaching workspace per task |
| **All-mixed** | Both modes flip per task (solo-operator escape hatch) |

The dashboard's "Today's Priorities" lane routes to messages-batch
by default. "Today's Calls" lane routes to calls-batch. See [[dashboard]]
for the upstream wiring.

## Messages batch — side modal

### Layout

```
┌─────────────────────────────────────────────┬─────────────────────┐
│                                             │ Task 3 of 7 · 4 left│
│  ┌──────────────────────────────────────┐   │ ▓▓▓▓░░░░ 43%        │
│  │  Confirm Anna's consult tomorrow     │   │                     │
│  │  09:30                               │   │ Linked deal:        │
│  │  → Anna · Invisalign Enquiry         │   │   Invisalign        │
│  └──────────────────────────────────────┘   │   Enquiry           │
│                                             │   £2,500 · Quote    │
│  ┌──────────────────────────────────────┐   │   Sent              │
│  │  Why you're calling/sending:         │   │                     │
│  │  "Anna asked to confirm her consult  │   │ Recent activity:    │
│  │   slot tomorrow morning."            │   │ • SMS yesterday     │
│  └──────────────────────────────────────┘   │ • Call 3d ago       │
│                                             │ • Email 5d ago      │
│  ┌──────────────────────────────────────┐   │                     │
│  │ [📞] [💬 SMS] [💚 WhatsApp] [📧 Email]│   │ Persona summary:    │
│  │                                       │   │ "Prefers SMS,       │
│  │  Inline composer for selected channel │   │  responds same-day, │
│  │  ┌────────────────────────────────┐  │   │  price-conscious"   │
│  │  │ Hi Anna! Confirming your...    │  │   │                     │
│  │  └────────────────────────────────┘  │   │                     │
│  │                              [Send]  │   │                     │
│  └──────────────────────────────────────┘   │                     │
│                                             │                     │
│  + Add note                                 │                     │
│                                             │                     │
│  [⏪ Skip]              [Snooze ▾] [⏩ Done]│ [⚙ Edit]  [↻ Reassign]│
└─────────────────────────────────────────────┴─────────────────────┘
```

### Left column — task focus

- **Task header**: title (bold), date+time, linked deal (when any).
- **"Why you're calling/sending"** — pulled from the task's
  description or the most recent activity that triggered the task
  (for AI-suggested tasks, this is the inbound message that fired
  the suggestion).
- **Channel buttons** — only the relevant channels for this contact
  (greyed out if missing phone/email). Click → composer pops open
  inline below.
- **Inline composer** — same primitives as the chat quick-reply
  from 2b.46. POSTs to the dispatcher. Auto-done fires on
  successful send via Path X.
- **+ Add note** — quick affordance to add a note to the contact's
  timeline without sending anything externally.
- **Bottom action bar**: Skip · Snooze (dropdown) · Done · Edit ·
  Reassign.

### Right column — context

- **Linked deal card** (when any) — title, pipeline, stage,
  value, last activity timestamp.
- **Recent activity** — last 3-5 activities for the linked contact
  (bullet list, channel + time + 1-line preview). Click to expand.
- **Persona summary** — the 2b.40 AI persona summary blurb if
  cached for this contact.
- (Right column is intentionally read-only — all actions live in
  the left column.)

### Auto-done

When the operator clicks Send in the inline composer, the
dispatcher writes the outbound activity. Path X (channel-match)
detects the new outbound matches this task's channel + contact and
auto-completes the task. The queue immediately advances to the
next task. A small "Auto-completed because you sent an [SMS] to
[Anna]" hint stays visible in a toast for 4 seconds; Reopen button
in the toast undoes it.

### Snooze dropdown

Click "Snooze ▾" → dropdown opens:
- 1 hour
- End of day (today, 6pm tenant-local)
- Tomorrow 9am
- Next week (Monday 9am)
- — divider —
- Custom… → opens date+time picker

Pick → task's `due_at` updates; task leaves the queue (will reappear
when the new `due_at` arrives).

### Skip behaviour

Skip → task stays open, but is moved to the END of today's queue
(not stays-in-place). She'll see it again after the others. If she
wants to push to tomorrow, she should Snooze.

### Reschedule

Reschedule = same as Snooze → Custom. Same date+time picker. The
distinction in language matters: "Snooze" implies "remind me later,"
"Reschedule" implies "no, this needs to happen at a different time."
Same underlying action.

### Reassign

Opens a small dropdown of operators + groups. Picks one →
`assigned_to_*` columns update. The task leaves THIS user's queue
(if it was assigned to them specifically) and appears in the new
assignee's queue.

If she reassigns to a group or everyone, the task becomes shared-
inbox. It stays in her queue too (since she's a group member /
everyone-member).

### Mid-queue arrivals

While she's in flow, a new task might arrive (AI-suggest accepted
on another tab, automation fired, manual create by colleague).
**The new task does NOT interrupt.** It lands at the end of her
current queue. Footer shows "+1 new" badge subtly. She'll see it
after she finishes her current batch.

If she clicks "+1 new" → it expands a small list of newly-arrived
tasks, she can preview but the queue continues from where she was.

### End of queue

When she completes / skips / snoozes the last task:

```
┌────────────────────────────────────────────────┐
│                                                │
│                    🎉                          │
│         Task queue empty — nice work!          │
│                                                │
│   You completed 7 tasks in 12 minutes.         │
│                                                │
│   [Back to dashboard]  [Open call queue (3)]   │
│                                                │
└────────────────────────────────────────────────┘
```

- Stats: how many done in how long (gentle gamification).
- Two CTAs: back to dashboard, OR jump straight to the call queue
  if calls are pending (`?filter=calls&queue=on`).

### Edit

Opens a small edit form (modal or inline) where she can change any
task field. Save → task updates, queue refreshes.

## Calls batch — full Call Coaching workspace

When the active chip is Calls, clicking Start Queue takes over the
**entire screen** with the Call Coaching workspace (existing
`CallCoachingWorkspace` component from 2b.55, reframed for queue
mode).

### Layout (full-screen)

```
┌──────────────────────────────────────────────────────────────────┐
│  Call 2 of 5 · 3 left          [⏪ Previous]  [Exit queue (×)]  │
│  ▓▓▓▓░░░░░░░░ 40%                                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────────────┐ │
│  │  Joey Baby             │  │  Live transcript (when in call)│ │
│  │  +44 7424 805475       │  │  • Patient: Hi, is this Sarah? │ │
│  │  → Implant Treatment   │  │  • You: Yes! Calling about...  │ │
│  │    Plan (£4,000)       │  │                                │ │
│  │                        │  │  AI prompts (live):            │ │
│  │  Recent: SMS yesterday │  │  💡 Price objection detected — │ │
│  │  Persona: decisive,    │  │     try the financing script   │ │
│  │  prefers SMS           │  │                                │ │
│  │                        │  │  Scripts panel:                │ │
│  │  Why you're calling:   │  │  • Opening script              │ │
│  │  "Joey asked for       │  │  • Pricing objection           │ │
│  │   callback after 3pm   │  │  • Booking close               │ │
│  │   to discuss financing"│  │                                │ │
│  │                        │  │                                │ │
│  │  [📞 DIAL NOW]         │  │                                │ │
│  └────────────────────────┘  └────────────────────────────────┘ │
│                                                                  │
│  After call ends → outcome prompt:                              │
│  [Connected]  [Voicemail]  [No answer]  [Busy]  [Wrong number]  │
│                                                                  │
│  Quick note (optional):                                          │
│  [                                                            ]  │
│                                                                  │
│  [Save & next call →]                                            │
└──────────────────────────────────────────────────────────────────┘
```

### Behaviour

- **Dial** opens the existing `ClickToCallDialer`. Same Twilio
  initiation path.
- **Live transcript + AI prompts** — existing call-coaching
  infrastructure (scripts panel, persona-driven prompts, objection
  detection). The unique value of /call-coaching, preserved here.
- **On hangup**, the outcome prompt appears. Operator picks one:
  - **Connected** → task done, advance to next call.
  - **Voicemail** → task done + auto-create follow-up task for
    tomorrow ("Call back — left voicemail"). Advance.
  - **No answer** → task done + auto-create follow-up task for
    +3h. Advance.
  - **Busy / Wrong number** → leave task open. Advance.
- **Previous** button stays visible always (per Q7 product
  decision) — back-step the queue if she wants to revisit.
- **Exit queue** → returns to /tasks table view.

### Mid-queue arrivals

Same as messages batch: quiet land at end + "+1 new" footer badge.
Don't break the call.

### End of queue

Same celebration screen as messages-batch but with call-specific
phrasing: "5 calls completed. 3 connected, 1 voicemail, 1 missed."

## Order within the queue

Default sort: `due_at ASC`. **Urgent priority** tasks jump to the
front regardless of due time (the "VIP wants to book NOW" case
overrides the morning's call sequence).

Within the same priority level, due-time wins. Within the same
due-time, creation-time wins.

## URL pattern

- `/tasks?queue=on` — start messages-batch queue (or all-mixed
  if no channel chip set).
- `/tasks?queue=on&filter=calls` — start calls-batch (full Call
  Coaching takeover).
- Snooze / reschedule / reassign / done all push history state so
  back-button works sensibly.

## Implementation phases

| Phase | What |
|---|---|
| 2b.58.A | TaskQueuePanel reshape: side-modal layout + right context column |
| 2b.58.B | Inline composers (SMS/WhatsApp/Email) wired to dispatcher per task channel |
| 2b.58.C | Auto-done via Path X — channel-match listener |
| 2b.58.D | Snooze dropdown (predefined chips + Custom… picker) |
| 2b.58.E | Reschedule + Edit + Reassign affordances |
| 2b.58.F | Mid-queue arrival badge + counter |
| 2b.58.G | End-of-queue celebration screen + onward CTAs |
| 2b.58.H | Calls batch — Call Coaching takeover wiring (when chip=calls) |
| 2b.58.I | Call outcome rules — voicemail/no-answer auto-follow-up creation |
