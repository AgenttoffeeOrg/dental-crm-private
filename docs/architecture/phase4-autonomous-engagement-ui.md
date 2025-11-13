# Phase 4 – Autonomous Engagement UI & Ops Plan

## Goals

- Provide an operator-grade surface for managing autonomous engagement campaigns.
- Give receptionists and revenue teams real-time visibility into bot-led conversations, with safe escalation controls.
- Wire observability and reliability cues directly into the product so issues surface before patients notice.

## Top-Level Navigation

- **New Nav Entry:** `Autonomous Engagement` → `/engagement`
  - Tab 1: `Campaigns`
  - Tab 2: `Bot Console`
  - Tab 3: `Reliability` (metrics + DLQ viewer – phase 4.3)

## Campaign Management UX

### Campaign List

- Columns: Name, Status (Draft/Active/Paused), Trigger, Steps, Last Updated, Enrollments (Active/Total).
- Badges for status; “Activate / Pause / Archive” inline actions.
- “New Campaign” button opens modal with:
  - Name (required)
  - Description
  - Primary goal (dropdown: nurture, reactivation, post-op, collections, custom)
  - Trigger template (tag added, segment entry, manual, high-priority flag)
  - Timezone (default from tenant)

### Campaign Detail Drawer

- Tabs: Overview, Steps, Enrollments, Activity Log.
- Overview: trigger config, schedule cadence, success metrics.
- Steps:
  - List with order, type, summary.
  - “Add Step” button opens step editor (type + config).
  - Supported step types (Phase 4 scope):
    - Send Email (subject, HTML, optional AI personalization flag)
    - Send SMS / WhatsApp (message, optional media URL)
    - Wait (relative time in minutes/hours/days)
    - Notify Human (note body, optional owner)
  - Drag & drop reordering (stretch goal → fallback: manual order inputs).
- Enrollments:
  - Filters by status (Active / Waiting / Completed / Failed).
  - Columns: Contact, Deal, Current Step, Next Run, Status Badge.
  - Bulk actions: Cancel enrollment, Force next step.
- Activity Log:
  - Timeline view from `engagement_events`.
  - Surface failures with red badges; allow export.

## Bot Console UX

### Left Pane – Session List

- Segmented controls: Active, Handoff Pending, Escalated, Closed (last 7 days).
- Search by contact, phone, deal title.
- Each session card shows:
  - Patient name + channel badge
  - Status pill
  - Last message preview + timestamp
  - Automation source, if any

### Right Pane – Conversation Viewer

- Transcript with role-based styling (patient = blue, bot = gray, human = purple).
- Header actions:
  - “Escalate to Human” (creates task + marks escalation)
  - “Close Session” (status → closed, add resolution note)
  - “Mark Resolved” (requires resolution note)
- Footer composer (Phase 4 stretch):
  - Quick replies (Reassure, Book call, Collect info)
  - Manual message (send as human; optional to disable if compliance requires)
- Insights sidebar:
  - Intent classification, sentiment trend, urgency score
  - Linked deal + next best action
  - Recent campaign enrollments for contact

## Reliability & Observability

- Queue health cards (engagement queue depth, active workers).
- Last 24h stats: enrollments processed, AI replies sent, escalations triggered.
- DLQ viewer (read from `engagement:deadletter` queue) with retry button (phase 4.3).
- Alert toggles: daily Slack/email digests, on-call escalation when queue depth > threshold.

## Technical Implementation Notes

- Reuse `DashboardLayout` with new nav entry.
- Client-side Supabase queries for CRUD (RLS enforces tenant isolation).
- API routes already exist for sessions (`/api/bot/...`) and enrollments; extend as needed for campaign mutations.
- Use `sonner` toasts for optimistic feedback; show skeletons while loading.
- For step creation, coerce JSON schemas with Zod before sending to Supabase.
- Record every mutation to `engagement_events` (server side) for auditability.
- Background worker already running – ensure UI surfaces worker status via `/api/system/queues`.

## Testing Checklist

- Create campaign → add steps → activate → enroll contact → verify worker processes.
- Pause campaign → confirm new enrollments blocked, existing continue.
- Induce failure (e.g., missing contact email) → verify Activity Log + DLQ capture.
- Bot conversation: simulate user turn via `/api/bot/turn`, check console updates live.
- Escalation flow: escalate session, verify task/integration logs + UI state transition.
