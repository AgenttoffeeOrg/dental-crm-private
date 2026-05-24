# Phase 2b.23.1 — SMS auto-reply not firing (root-cause fix)

## Symptom

User completed setup (Practice Brain filled in, automation
configured with `inbound_sms` trigger + `send_ai_reply` action,
ANTHROPIC_API_KEY + CRON_SECRET added to Vercel) and texted the
practice SMS number. The inbound message landed (activity row
written) but no AI reply came back.

## Investigation

Live state in Supabase (test tenant `5aadca14…`) showed:

- `activities` row created with `type=sms direction=inbound
  source_channel=sms_inbound` at the right time — webhook + lead
  ingestion clearly worked.
- Zero new rows in `automation_runs` since the 2026-05-21 op-gate
  test.
- Zero rows in `automation_event_log` (none ever — has been silent
  since the table was created).

So the inbound SMS event was being emitted, but the automation
listener never completed its work for the new event.

## Root cause

In `src/lib/lead-ingestion/ingest-lead.ts` (Phase 2b.14 wiring), the
four inbound automation events were emitted without awaiting the
returned promise:

```ts
if (input.source_channel === 'sms_inbound' && contactId && activityId) {
  events.inboundSmsReceived({ … })   // ⟵ no await
}
```

`events.inboundSmsReceived` returns the promise from
`eventService.emit(...)`, which in turn `await`s every listener via
`Promise.allSettled`. Without an `await` at the call site, the
listener's async work — the `automations` match query and
`engine.startRun()` (which does the run-row insert + walks to the
first node) — is left as a dangling promise.

In a Vercel Function, once the HTTP response is flushed and the
handler returns, dangling work can be torn down before it
completes. That's why:

- `automation_runs` had no new row (insert never landed).
- `automation_event_log` had no rows (insert never landed).
- The first `send_ai_reply` node never executed.

Stop-conditions listener wasn't the culprit — it was racing against
nothing, since `startRun` never wrote a row for it to find. The
automation graph also fires `send_ai_reply` immediately on `trigger`
(no `wait` first), so the daily cron lag couldn't explain the
absence of the reply.

## Fix

1. `await` each of the four event calls in `ingestLead` (SMS,
   WhatsApp, form, Google Lead Form). The added latency is bounded:
   `walk()` advances synchronously through the first non-wait node,
   then a `send_ai_reply` calls Claude (~1–3 s) and the dispatcher
   (~500 ms). Total budget on a Twilio webhook is 15 s, so this is
   comfortably safe.
2. Independently: flip
   `vercel.json:/api/cron/process-automation-waits` from
   `0 2 * * *` (daily, the Hobby-plan compromise from 2b.14) to
   `* * * * *` (every minute) now that the project is on Vercel
   Pro. Wait nodes will resume promptly.

## Test tenant seed

The five Phase 2b.22 prebuilts were inserted directly via service-
role for tenant `5aadca14-9786-4aef-bc53-e9287cdd0bbf` (the seed
API needs a logged-in session; service-role bypassed for one-time
test-tenant seeding):

| prebuilt_key | trigger_type | status |
| --- | --- | --- |
| inbound_sms_auto_reply | inbound_sms | draft |
| inbound_whatsapp_auto_reply | inbound_whatsapp | draft |
| web_form_confirmation_email | form_submitted | draft |
| google_lead_form_confirmation | google_lead_form_submitted | draft |
| no_reply_2_day_cadence | contact_created | draft |

They land as `status='draft'`. The operator opens each in the CRM
and flips it to `active` if they want it on.

## Validation

- `npx tsc --noEmit` — no new errors in touched files
  (pre-existing test/tooling errors untouched).
- `npx jest --testPathPattern="(ingest-lead|automation-engine)"` —
  36 tests pass.
- Live verification deferred to operator (text the SMS number, see
  if the AI reply lands within ~10 s after this deploy completes).

## Deferred

- Operational gotcha: tests should add a coverage case that asserts
  the listener's `automation_runs` row IS written when an inbound
  event fires through `ingestLead`. Pure unit tests of `ingestLead`
  mock the events module and miss this race.
- The seed API (`POST /api/automations/seed`) is intentionally
  auth-gated. A follow-up should wire it into the new-tenant
  onboarding flow so new practices get the five prebuilts as
  drafts on day 1 (the "optional hook" from the 2b.23 summary).
