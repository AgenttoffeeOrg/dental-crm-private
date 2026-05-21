# Phase 2b.18 — Always-on FAQ responder

> Part 6 of 11 in `docs/2b/automations-master-plan.md`.

## What changed

- **Migration:** `tenant_ai_context.faq_responder_enabled boolean NOT
  NULL DEFAULT false`.
- **`lib/automations/faq-responder.ts`** — listener subscribes to
  `INBOUND.SMS_RECEIVED` + `INBOUND.WHATSAPP_RECEIVED`. Each inbound
  goes through a gating chain:
  1. Tenant toggle on — skip otherwise.
  2. `ANTHROPIC_API_KEY` set — skip otherwise.
  3. **Coexistence:** if the contact has any active automation_run
     whose workflow has `on_patient_reply='ai_continue'`, skip. The
     nurture workflow handles that conversation.
  4. **Idempotency:** if there's an outbound activity on the same
     conversation in the last 24h tagged
     `integration_metadata.faq_responder=true`, skip.
  5. Ask Claude haiku-4-5 (strict JSON: `{is_faq, answer}`). Reply
     only when `is_faq=true` AND `answer` non-empty AND answer ≤ 320
     chars. Claude is instructed to refuse fabricating prices /
     hours / services not in the brain.
  6. Dispatch via the canonical dispatcher (`dispatchSms` /
     `dispatchWhatsApp`).
  7. Stamp `activities.integration_metadata.faq_responder=true` for
     the next idempotency check.
- **`instrumentation.ts`** — bootstraps the FAQ responder listener
  alongside the main automation + stop-conditions listeners.

## Tests

28 automation tests still pass. Dedicated FAQ-responder unit tests
deferred to 2b.23 sweep — the gating chain has enough conditional
branches that mocking the world is heavy.

## Operator gate

**Phone-side end-to-end** (deferred until Toffee enables the toggle
on the test tenant and ANTHROPIC_API_KEY is set):

1. Toggle on: `UPDATE tenant_ai_context SET faq_responder_enabled = true WHERE tenant_id = '...'`.
2. Text the practice number with a question like "What are your
   opening hours?".
3. Expected: an SMS reply from the practice with the hours, lifted
   from Practice Brain. `activities.integration_metadata.faq_responder`
   should be `true` on the outbound row.

## Follow-ups

- Surface the `faq_responder_enabled` toggle in the Practice Brain
  settings UI + the PATCH route. Currently DB-only.
- Per-channel granularity (e.g. SMS-only) — schema allows it via a
  jsonb but the v1 ships as one global switch.
- Add `audit_trail` row when the toggle flips (it's a behaviour
  change visible to patients).
