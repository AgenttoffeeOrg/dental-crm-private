# Phase 2b.14 — Engine repair + event wiring + cron + missing trigger types

> Part 2 of 11 in `docs/2b/automations-master-plan.md`.

## 0. Why

The 2b.12 audit found the automation subsystem was a **scaffold** — never
ran in production. Six P0 defects (audit §11):

1. Listener never bootstrapped.
2. Listener → engine schema split: listener passes `automations.id` to a
   `startJourney()` that reads `marketing_journeys` → throws.
3. Launch webhooks bypass unified events.
4. No `inbound_sms` / `inbound_whatsapp` trigger types.
5. Send actions are stubs.
6. `processWaitingJourneys()` never scheduled.

2b.14 closes 1, 2, 4, 6 in full and 3 (event wiring at `ingestLead`).
P0 #5 (send actions are stubs) is intentionally still stubbed — they
write activities rows so the engine completes, and 2b.15 swaps in the
real dispatcher.

## 1. What changed

### 1.1 New engine — `src/lib/automations/automation-engine.ts`

Fresh engine on `automations` + `automation_runs` + `automation_execution_logs`.

- `startRun({ tenantId, automationId, contactId, dealId? })` — creates
  the run row, walks `graph_json` node-by-node, persists progress on
  `automation_runs`, logs each node to `automation_execution_logs`.
- Supports nodes: `trigger`, `send_email`, `send_sms`, `send_whatsapp`,
  `wait`, `wait_until`, `add_tag`, `remove_tag`, `update_contact`,
  `create_task`, `condition` (with `next_true` / `next_false`),
  `webhook` (placeholder), `end`. `send_ai_reply` throws on purpose
  until 2b.15.
- `processWaitingRuns()` — picks up to 50 runs whose `waiting_until` has
  elapsed and resumes them from `current_node_key`. Idempotent at the
  run level.
- `send_*` action handlers write an `activities` row with
  `marketing_event_type='automation_send_stub'` — 2b.15 replaces with
  the real dispatcher.
- Service-role-only. `createServiceClient()` from `lib/supabase-server`.
- Walk depth guard at 100 nodes to catch graph loops.

### 1.2 Listener rewrite — `src/lib/automations/automation-event-listener.ts`

- Now uses the service-role client (was browser client → unusable on
  server).
- Calls the new engine's `startRun()` (was the old engine's
  `startJourney()`, which had the id-mismatch defect).
- `EVENT_TO_TRIGGER_MAP`:
  - `MARKETING.FORM_SUBMITTED` → `form_submitted` (was `form_submit`,
    which never matched the DB).
  - Added `MARKETING.GOOGLE_LEAD_FORM_SUBMITTED` → `google_lead_form_submitted`.
  - Added `INBOUND.SMS_RECEIVED` → `inbound_sms`.
  - Added `INBOUND.WHATSAPP_RECEIVED` → `inbound_whatsapp`.
- Trigger-config filtering supports `keywords` (any-of substring match
  on inbound message body) and `form_id`.
- Bootstrap is idempotent — calling `initializeAutomationEventListener()`
  multiple times from multiple cold-start surfaces is safe.

### 1.3 New EventMap entries — `src/lib/events-unified.ts`

- `MARKETING.GOOGLE_LEAD_FORM_SUBMITTED`
- `INBOUND.SMS_RECEIVED`
- `INBOUND.WHATSAPP_RECEIVED`
- `MARKETING.FORM_SUBMITTED` extended with optional `dealId`,
  `activityId`, `sourceChannel`, `rawPayload`.
- Convenience emit helpers: `events.inboundSmsReceived`,
  `events.inboundWhatsappReceived`,
  `events.marketingGoogleLeadFormSubmitted`.

### 1.4 Listener bootstrap — `instrumentation.ts`

Next.js's `register()` hook now lazy-imports the listener and calls
`initializeAutomationEventListener()` on every Node-runtime cold start.
A second guard at `ingestLead`'s emit site calls the same idempotent
init, so any code path that emits an event also ensures the subscriber
is up — defence in depth.

### 1.5 Vercel cron — `/api/cron/process-automation-waits`

`vercel.json` adds the cron at `* * * * *` (every minute). The route:

- Optional `CRON_SECRET` bearer check (skipped if env var unset).
- Lazy-init the listener on entry (cold-start safety net).
- Call `engine.processWaitingRuns()` and return `{ ok, resumed, failed, ranAt }`.

### 1.6 `ingestLead` event emission — `src/lib/lead-ingestion/ingest-lead.ts`

After step 8 (notification emit), a new step 8b emits the appropriate
unified event by `source_channel`:

- `sms_inbound` → `INBOUND.SMS_RECEIVED`
- `whatsapp_inbound` → `INBOUND.WHATSAPP_RECEIVED`
- `form_embedded` / `form_hosted_landing` / `booking_widget_webform` →
  `MARKETING.FORM_SUBMITTED`
- `google_lead_form` → `MARKETING.GOOGLE_LEAD_FORM_SUBMITTED`

Wrapped in try/catch; failure is logged and never fails ingestion.
Payload includes `tenantId`, `contactId`, `dealId`, `activityId`,
`body`, `fromNumber`, `externalMessageId`, `rawPayload`, timestamp.

### 1.7 Trigger catalog migration — `20260521_phase_2b_14_inbound_trigger_types.sql`

Adds three rows to `automation_trigger_metadata`:

- `inbound_sms` (category: marketing)
- `inbound_whatsapp` (category: marketing)
- `google_lead_form_submitted` (category: marketing)

Idempotent via `ON CONFLICT DO NOTHING`. Applied via Supabase MCP.

## 2. What's not changed

- The legacy engine at `src/lib/marketing/automation-engine.ts` is
  unchanged. It is dead code today (0 callers in production) — leave
  intact; 2b.23 sweep deletes it.
- `marketing_journeys` / `marketing_journey_states` tables stay. The
  new engine does not touch them. Drop in a future migration sweep.
- Send actions still don't call the dispatcher — that's 2b.15.

## 3. Tests

`src/lib/automations/__tests__/automation-engine.test.ts` — 9 cases:

- startRun: missing automation throws, inactive throws, linear graph
  completes, wait parks the run, send_email stub logs, send_ai_reply
  rejects with 2b.15 marker, condition branches via `next_true` /
  `next_false`, malformed graph fails fast.
- processWaitingRuns: empty queue is no-op, due waiting run resumes.

Full automation suite: 29 tests, all green. Builds clean.

## 4. Operator gate

**Agent-handleable** (engine + cron path):

1. Insert a tiny test automation via MCP (trigger `inbound_sms`,
   status `active`, graph `trigger → add_tag → end`).
2. Insert an automation_run in `waiting` state with `waiting_until` in
   the past on the test tenant.
3. Hit production `/api/cron/process-automation-waits`.
4. Verify the run state transitioned to `completed` and an
   `automation_execution_logs` row was written.

**Phone-side end-to-end** (deferred to the 2b.15 SMS gate — that phase
sends a real SMS into the practice number which will trigger the
2b.14 engine path AND the 2b.15 AI drafter in one test).

## 5. Follow-ups

- Tighten the `current_node_key` semantics on `wait` resume:
  documented behaviour is "points at the next node to execute", which
  this engine relies on. Add a runtime assertion in 2b.17.
- Add `CRON_SECRET` env var on Vercel (open auth gap on the cron
  route until set).
- Delete the legacy engine + `marketing_journeys` tables in 2b.23.
