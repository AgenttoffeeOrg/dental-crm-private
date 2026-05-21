# Phase 2b.17 — Stop conditions + reply branching + quiet hours

> Part 5 of 11 in `docs/2b/automations-master-plan.md`.

## What changed

- **Migration** `20260521_phase_2b_17_stop_state_and_workflow_config.sql`:
  - `automation_runs.state` CHECK extended with `'stopped'`.
  - New column `automation_runs.stop_reason text`.
  - New column `automations.workflow_config jsonb NOT NULL DEFAULT '{}'`.
- **`lib/automations/stop-conditions.ts`** — listener subscribed to
  `ACTIVITY.CREATED` + `INBOUND.SMS_RECEIVED` + `INBOUND.WHATSAPP_RECEIVED`.
  - Note or call activity on a contact with an active/waiting run →
    mark run `stopped`, `stop_reason='note_added'|'call_added'`.
  - Patient reply on a contact with active runs → follow each
    automation's `workflow_config.on_patient_reply`:
    - `'stop'` (default) → mark `stopped`, `stop_reason='patient_reply'`.
    - `'ai_continue'` → leave running; the next `send_ai_reply`
      node picks up the new inbound via the trigger-context map.
- **`lib/automations/quiet-hours.ts`** — Practice Brain
  `opening_hours` interpreter. `evaluateQuietHours()` returns
  `{ isOpenNow }` or `{ isOpenNow: false, nextOpenAt }`. Walks forward
  up to 7 days for the next open window. Timezone defaulted to
  `Europe/London`.
- **Engine** — new `maybeDeferForQuietHours()` guard at the top of
  `executeSendStatic` and `executeSendAiReply`. When
  `workflow_config.respect_quiet_hours = true` AND the brain says
  closed, the node returns a `wait` outcome with
  `resumeAtSameNode: true`. The walk now honours that flag — sets
  `current_node_key` back to the same node, so resume re-runs the
  send at the next opening rather than skipping it.
- **`instrumentation.ts`** — bootstraps the new stop-conditions
  listener alongside the main automation event listener.

## Tests

28 automation tests still pass. Dedicated stop-conditions / quiet-hours
unit tests deferred to 2b.23 sweep (the engine quiet-hours path is
exercised live by the operator gate).

## Operator gate

**Agent-handleable** (seeded test): seed an `automation_runs` row in
`running` state on Joey Baby, then emit a fake `ACTIVITY.CREATED`
with `type='note'` for the same contact via a debug entry point.
Expected: the run flips to `stopped`, `stop_reason='note_added'`.

In practice the live exercise happens in the 2b.15 SMS gate (when
that lands) — adding a note in the CRM mid-workflow will stop the
run; replying as the patient triggers the configured `on_patient_reply`
behaviour.

## Follow-ups

- Manual-outbound-then-reply detection (third stop condition listed
  in the master plan) deferred — needs a "did a practice user send
  a manual outbound recently?" check that's coupled to per-user
  outbound activity attribution. Tracked for 2b.23.
- Per-tenant `time_zone` (currently hardcoded Europe/London in the
  quiet-hours helper).
- UI for `workflow_config` editing (lands in 2b.20 with the wizard).
