# Receptionist Workspace Polish Plan

## Goals
- Deliver a dedicated receptionist workspace focused on live call triage, queue awareness, and persona-specific guidance.
- Consolidate unified communications, alerts, and scripts for front-desk teams without duplicating Call Coaching.
- Ensure visual consistency with dashboard patterns (32px grid, sticky headers, status chips).

## Layout Overview
1. **Hero Bar**: Tenant badge, location selector, and queue health summary (pulls from queue reliability API).
2. **Left Column (40%)**: 
   - Contact search + quick create.
   - Live call queue list (integration with `integration_dlq` retry + active calls feed).
   - Alert banners (queue incidents, feature flag notices).
3. **Right Column (60%)**:
   - Persona snapshot card (from contact insights) with recommended greeting/script.
   - Unified comms panel (call, SMS, WhatsApp, email drawers) reusing `ClickToCallDialer` and composer components.
   - Task + appointment mini-agenda to coordinate follow-ups.

## Data Dependencies
- Supabase: `contacts`, `deals`, `activities`, `queue_health_incidents`, `feature_flag_assignments`.
- Existing hooks: `useAuth`, `useTenant`, `createClient` for queries.
- Queue API: `/api/system/queues/alerts` for incident banners.

## Interaction Model
- Selecting contact loads persona insights and last engagement timeline snippet.
- Clicking communication buttons opens respective drawers anchored within workspace.
- Queue incident banners include quick action buttons (`Replay DLQ`, `View Reliability`).
- Feature flag widget surfaces beta access (e.g., `live_coach_console`).

## Visual Polish
- Use `DashboardLayout` with `sticky` left sidebar ensuring independent scroll area.
- Apply `min-h-0` + `overflow-y-auto` to columns to avoid clipping.
- Badge system: teal for available agents, amber for waiting calls, red for incidents.

## Future Enhancements
- Integrate real-time presence via WebSockets for upcoming call events.
- Add receptionist-specific metrics to dashboard home (avg wait time, call resolution SLA).






