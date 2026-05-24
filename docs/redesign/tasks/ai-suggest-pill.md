# AI-suggest pill — Path 1 task creation

> Phase 2b.58+ — when AI detects a commitment in conversation text,
> a small inline pill on the chat bubble lets the operator one-click
> create a task. NEVER auto-create — every AI suggestion is
> operator-confirmed.

## Job-to-be-done

Patients say things like "call me back tomorrow at 3pm" or "send me
the quote when you can" in SMS / WhatsApp / email / call transcripts.
Operators also commit on outbound — "I'll call you Thursday" / "Let
me get back to you next week with pricing."

These commitments get lost. AI catches them; operator decides.

## What triggers AI detection

For every new inbound activity (SMS / WhatsApp / email body / call
transcript) AND every outbound activity (same channels), run a
Claude one-shot **after the activity row is committed** (lazy
post-write, not pre-write — never blocks the dispatcher hot path).

Claude prompt asks:
1. Did anyone in this message make a commitment to a future action?
2. If yes, who's committing (the patient or the practice)?
3. What's the action (call back / send something / book a meeting)?
4. What's the deadline (parsed to a specific date+time if possible)?

Output is a structured JSON `{ has_commitment: bool, by: "patient"|
"practice", action: string, deadline_iso: string | null, confidence:
number }`.

If `has_commitment && confidence > 0.7`, the pill renders on the
bubble.

## Why not auto-create?

The whole reason we're surfacing as a SUGGESTION is that
conversation text is messy:
- "Maybe call me sometime" → looks like commitment, isn't.
- "I might call you back if I have questions" → patient *might*
  call, not a commitment for the practice.
- "What time works for you?" → question, not commitment.
- "Tomorrow at 3" — ambiguous timezone, ambiguous Tuesday.

Auto-create floods the queue with junk. AI-suggest-with-one-click
gives 95% of the speed with none of the false-positive cost.

## Pill placement

Renders **on the chat bubble itself**, below the message text,
inside the bubble's border. Same component pattern as the
`ai_attachment_uncertain` marker from 2b.42.

```
┌─────────────────────────────────────────────┐
│  Hey, can you call me tomorrow at 3pm?      │
│  Thanks!                                    │
│                                             │
│  SMS · 09:14 · enquiry · positive          │
│  ┌─────────────────────────────────────┐   │
│  │ ✨ AI heard: "Call patient tomorrow │   │
│  │    at 3pm" — Create task? [Yes][⋮] │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

- **[Yes]** = one click, creates the task with parsed defaults
  (title = AI's action, due_at = parsed deadline, assignee = tenant
  default from `tenant_routing_settings.default_task_assignee_mode`).
- **[⋮]** = expands a small inline form so the operator can adjust
  title / due / assignee / priority before creating.
- **Dismiss** (X icon) = closes the pill for this bubble. Persisted
  in localStorage per-user so dismissing doesn't reappear if she
  re-renders the chat.

## Where the pill does NOT appear

- Not in a sidebar / notification area. Per Q2 product decision —
  pill-only, no sidebar accumulator.
- Not for low-confidence detections (< 0.7) — too noisy.
- Not on activities older than 7 days — operator already past it.
- Not on activities that already have an associated task — no
  point suggesting what's already done.

## State

The pill's state is stored on the activity's `metadata` jsonb:
- `metadata.ai_commitment_suggestion = { action, deadline_iso,
  confidence, generated_at }`
- `metadata.ai_commitment_dismissed_at = timestamptz | null` (set
  when operator dismisses; non-null = don't render pill).

Once the operator accepts → a task is created with reference back
to the source activity (new column `tasks.source_activity_id` to
join). The pill stops rendering on this bubble going forward.

## Backend

### Helper

`src/lib/communications/detect-commitment.ts` — pure function,
takes activity text + channel + direction, calls `claudeOneShot`,
returns the structured output. Mirrors the existing patterns from
`detect-deal-attachment-judgement.ts` and `email-summariser.ts`.

### Trigger point

A small hook in the dispatcher (outbound) + ingestLead (inbound)
that fires-and-forgets a call to:

`POST /api/activities/[id]/detect-commitment`

The endpoint runs the helper, updates `metadata.ai_commitment_suggestion`,
returns. Lazy — doesn't block the activity's own write.

### Acceptance endpoint

`POST /api/activities/[id]/accept-commitment-suggestion` —
- Reads the cached suggestion from `metadata.ai_commitment_suggestion`.
- If body overrides any fields (title / due_at / assignee), use those.
- Creates the task. Sets `tasks.source_activity_id = params.id`.
- Returns the new task.
- Audit: regular write via `logAuditServer` (task creation IS an
  operator action).

### Cost

Claude Haiku 4.5 per activity. ~£0.0002 per inbound SMS / outbound
email — negligible at dental-practice volume (~50-100 inbound/day).
No batching needed.

## Implementation phases

| Phase | What |
|---|---|
| 2b.58.J | detect-commitment helper + Claude prompt + structured output schema |
| 2b.58.K | POST /api/activities/[id]/detect-commitment endpoint + lazy trigger hook in dispatcher + ingestLead |
| 2b.58.L | Pill render on activity-chat-bubble.tsx (matches 2b.42 AI-uncertain pattern) |
| 2b.58.M | Accept + dismiss endpoints + UI buttons |
| 2b.58.N | tasks.source_activity_id column + audit on accept |
