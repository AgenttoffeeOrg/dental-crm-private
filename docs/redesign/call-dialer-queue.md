# Call Coaching — dialer queue mode spec

> Phase 2b.36 subset — adds a dial-then-next-call queue mode to
> `/call-coaching` so the operator can power through today's promised
> callbacks. See [[00-overview]].

## Job-to-be-done

When the operator clicks "Today's Calls" on the [[dashboard]], she arrives
at /call-coaching in queue mode with a list of contacts to dial. She clicks
"Dial" → call happens → call ends → next contact auto-loads → repeat.

This is the equivalent of [[tasks-queue-mode]] but specifically for calls,
with a tighter loop (no per-task acknowledgement screen — just dial-then-
next).

## Two modes

The /call-coaching page has two modes:

- **Coaching mode** (default if you navigate directly) — the existing call-
  coaching surface for reviewing past calls, transcripts, AI feedback.
- **Queue mode** (default if you arrive via `?mode=queue`) — dialer-focused
  single-contact view, with one-tap dial and auto-advance.

## Queue mode layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← Back to dashboard                Call 2 of 5 · 3 remaining                │
│                                                                              │
│  Progress: ████░░░░░░░░░░░░░░░░  20%                                        │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  [Avatar]  Joey Baby                                                  │   │
│  │            +44 7424 805475                                            │   │
│  │                                                                       │   │
│  │  Why you're calling:                                                 │   │
│  │  "Joey asked for callback after 3pm Tuesday. He's interested in      │   │
│  │   the £4k implant plan but wants to discuss financing."              │   │
│  │                                                                       │   │
│  │  Related deal: Implant Treatment Plan · Quote sent · £4,000          │   │
│  │                                                                       │   │
│  │  Last 3 conversations (preview):                                     │   │
│  │  • Sent SMS yesterday: "Hi Joey, available to chat tomorrow?"        │   │
│  │  • Inbound call 3d ago: 4m 12s — asked about pricing                 │   │
│  │  • Sent email 5d ago: implant pricing brochure                       │   │
│  │                                                                       │   │
│  │       ┌─────────────────────────────────────────┐                    │   │
│  │       │            📞  DIAL NOW                  │                    │   │
│  │       └─────────────────────────────────────────┘                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  [⏭ Skip]                                                  [✓ Mark done]   │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Behaviour

- **Queue contents** = today's call-typed tasks for the current operator.
  Same source as the dashboard's "Today's Calls" lane.
- **Dial now** = uses the existing `ClickToCallDialer` component. When the
  call ends, the operator gets a small post-call panel (log outcome:
  connected / voicemail / no-answer / busy / wrong-number) → activity row
  written → task closed → next contact auto-loads.
- **Skip** = leaves the call task open, advances. Skipped calls return at
  the end of the queue.
- **Mark done without dialing** = a quick escape ("they replied via SMS, no
  need to call") that closes the task without firing a dial.
- **Inline note** = small "Add a note before next call" textarea that
  attaches a note to the related deal.

## Pre-call context

The "Why you're calling" block is the description of the task that
generated this queue entry — operator's previous commitment ("call him back
Tuesday after 3pm"). Pulled from `tasks.description`.

The "Last 3 conversations" preview is short — channel · time · single-
sentence summary. Pulled from the related deal's activity log.

## Mid-call coaching overlay (optional)

If the existing call-coaching infrastructure surfaces live coaching cues
(AI prompts during the call), they overlay the dialer panel as small floaty
chips. NOT a v1 requirement — only if the existing system already supports
live coaching cues.

## Post-call panel

After hang-up:

```
┌──────────────────────────────────────────────────────────────────────┐
│  Call ended · 4m 12s                                                  │
│                                                                       │
│  How did it go?                                                       │
│  [Connected & spoke] [Voicemail] [No answer] [Busy] [Wrong number]    │
│                                                                       │
│  Quick note (optional):                                              │
│  [                                                                  ] │
│                                                                       │
│  [⏭ Next call]                                       [✓ Save & next]│
└──────────────────────────────────────────────────────────────────────┘
```

Outcome buttons map to the existing `activities.outcome` enum. Note saves
as an activity-attached note. "Next call" auto-advances.

## Data dependencies

- `tasks` table — call-typed tasks scheduled today.
- `contacts` — phone, name, recent activity.
- `activities` — last 3 activities for the related deal, for the preview.
- `ClickToCallDialer` component — already exists, just re-wired into the
  queue flow.

## Implementation phases (slice of 2b.36)

- 2b.36.33: /call-coaching?mode=queue route + mode toggle.
- 2b.36.34: Queue rendering — one contact at a time + progress + skip/done
  navigation.
- 2b.36.35: Dialer wiring — ClickToCallDialer integrated with the queue,
  post-call panel.
- 2b.36.36: Post-call activity insert + task complete + auto-advance.
- 2b.36.37: End-of-queue celebration + return-to-dashboard CTA.

## Out of scope

- Power-dialing (auto-dial next without operator click).
- Multi-line dialing.
- Recording playback inside the queue (use the coaching mode for that).
