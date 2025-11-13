# Phase 4 – Autonomous Engagement & Bot Readiness

## Objectives

- Deliver a tenant-aware auto-campaign engine capable of scripted and AI-assisted outreach sequences.
- Expose a secure Bot API gateway (`/bot/sessions`, `/bot/turn`, `/bot/escalate`) with full auditing.
- Introduce a deterministic conversation state machine to govern AI ↔ patient ↔ human handoffs.

## Architecture Overview

```
┌──────────────────────────┐      ┌──────────────────────────┐
│ engagement_campaigns     │      │ bot_sessions             │
│ engagement_steps         │      │ bot_turns                │
│ engagement_enrollments   │      │ bot_escalations          │
│ engagement_events        │      │                          │
└──────────┬───────────────┘      └───────────┬──────────────┘
           │                                   │
           ▼                                   ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│ CampaignEngine           │      │ ConversationStateMachine │
│  • processEnrollment     │      │  • evaluateTurn          │
│  • executeStep           │      │  • nextActions           │
│  • scheduleDelay         │      └───────────┬──────────────┘
└──────────┬───────────────┘                  │
           │                                   │
           ▼                                   ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│ BullMQ Queue             │      │ BotService               │
│ engagement:campaigns     │      │  • createSession         │
│ → engagement-worker      │      │  • recordTurn            │
│                          │      │  • escalate              │
└──────────┬───────────────┘      └───────────┬──────────────┘
           │                                   │
           ▼                                   ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│ Communications Dispatcher│◄─────┤ dispatchEmail/SMS/Voice │
│ (email/SMS/whatsapp/voice)     └──────────────────────────┘
└──────────────────────────┘
```

## Data Model Additions

- `engagement_campaigns`: campaign meta, triggers, cadence, AI configuration.
- `engagement_steps`: ordered steps (`send_email`, `send_sms`, `wait`, `ai_reply`, `notify_human`, `branch`).
- `engagement_enrollments`: runtime state per contact/deal (status, current_step, run cadence).
- `engagement_events`: immutable log for observability / replay.
- `bot_sessions`: active conversational threads (channel, assignment, escalation status).
- `bot_turns`: full transcript with role attribution (patient/human/bot/system).
- `bot_escalations`: escalation requests + resolution metadata.

All tables are tenant-scoped with RLS mirroring existing automation policies; service role retains unrestricted access.

## Execution Flow

1. Campaign creation/enrollment writes to `engagement_enrollments` and queues a job (`process-enrollment`).
2. `engagement-worker` consumes jobs, invokes `CampaignEngine.processEnrollment`.
3. `CampaignEngine` fetches next step, executes via communications dispatcher or AI helper, logs event, and schedules follow-up (immediate or delayed job).
4. Bot endpoints use `BotService` to:
   - upsert session,
   - append turn,
   - evaluate conversation state machine,
   - optionally call OpenAI for AI messages,
   - escalate to human when thresholds met.
5. Every bot action is mirrored to `engagement_events` for analytics and audit.

## Conversation State Machine

Implemented as a deterministic FSM (`conversation-state-machine.ts`) with states:

- `collecting_context`
- `qualifying`
- `booking`
- `handoff_pending`
- `escalated`
- `closed`

Transitions are driven by heuristics (intent classification, confidence scores, metrics) and can trigger:

- auto-replies (AI),
- campaign enrollment (e.g., follow-up sequence),
- escalation events (task creation + assignment).

## Observability & Safety

- All mutations recorded in `engagement_events`, `bot_turns`, `bot_escalations`.
- Dead-letter handling via `engagement:deadletter`.
- Idempotent processors keyed by enrollment + step.
- Secure endpoints (service role + tenant-membership checks).

## Worker & Scripts

- `src/lib/queues/engagement-queue.ts` registers queue/processor helpers.
- `src/workers/engagement-worker.ts` boots BullMQ worker.
- `package.json` exposes `workers:engagement`.

## Next Steps (Front-End / Ops)

- Build UI for campaign authoring and enrollment management.
- Surface live bot sessions in receptionist console with real-time transcript.
- Instrument dashboards (queue depth, response latency, escalation rate).
- Extend action palette (e.g., webhook calls, experimental branches) via step config.
