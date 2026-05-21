# Phase 2b.15 — Real sends via dispatcher + AI auto-reply (Claude)

> Part 3 of 11 in `docs/2b/automations-master-plan.md`.

## What changed

- **Claude SDK added.** `@anthropic-ai/sdk` installed. Lazy-init client
  at `src/lib/anthropic-client.ts` with `claudeOneShot()` convenience.
  Default model `claude-haiku-4-5-20251001`. Provider swap from
  OpenAI was an explicit Toffee call — OpenAI stays in the codebase
  for Whisper / existing AI Assistant routes; new automation AI
  surfaces all use Claude.
- **AI reply drafter** at `src/lib/automations/ai-reply-drafter.ts`.
  Loads Practice Brain, builds a system prompt with brand voice +
  services + pricing + opening hours + FAQs + escalation rules +
  additional instructions, reads the triggering inbound activity +
  6 messages of channel history, asks Claude for a reply. Channel-
  shaped prompts (SMS ≤160 chars hint, WhatsApp casual, email with
  optional `SUBJECT:` prefix). Throws on AI failure so the engine's
  fallback path can take over.
- **Real dispatcher wiring** in the engine. `send_email`,
  `send_sms`, `send_whatsapp` nodes now call `dispatchEmail` /
  `dispatchSms` / `dispatchWhatsApp` from
  `lib/communications/dispatcher.ts`. Dispatcher imports are **lazy
  inside the use sites** (locked principle #12 — heavy lib lazy
  require pattern).
- **New `send_ai_reply` action.** Config: `{ channel, tone_override?,
  escalation_phrase?, fallback_template?, model? }`. Pipeline:
  drafter → dispatcher → AI metadata stamped on the activity via a
  merge into `integration_metadata.ai`.
- **Fallback path.** If AI throws and `fallback_template` is set in
  the node config, the engine sends the template via the dispatcher
  with metadata `{ provider: 'fallback_template', ai_error }`. If
  neither AI nor fallback, the node throws and the run is marked
  failed.
- **Trigger context plumbing.** `startRun` stashes the triggering
  activity id in an in-process `Map<runId, {activityId,eventType}>`
  so `send_ai_reply` can know which inbound message it's replying to.
  Documented as a Vercel-function-lifetime mechanism — extending to
  durable state (e.g., a JSON column on `automation_runs`) is a
  follow-up.

## Tests

`src/lib/automations/__tests__/automation-engine.test.ts` (28 tests
total, all green). Replaced the old 2b.14 stub tests with a
send_ai_reply-failure case using `jest.isolateModules` + dynamic
mocks. Note: integration tests for the full drafter → dispatcher
chain depend on live Twilio / Resend + Anthropic credentials and are
scoped to the live operator gate (see §Operator gate).

## Operator gate

**Phone-side end-to-end** (deferred until ANTHROPIC_API_KEY is set on
Vercel by Toffee):

1. Toffee adds `ANTHROPIC_API_KEY` in Vercel → Settings → Env Vars
   (Production).
2. Toffee builds a tiny test automation in the CRM UI:
   - Trigger: Inbound SMS
   - Action: send_ai_reply (channel=sms, no fallback)
   - Status: active
3. Toffee texts the practice number (+44 7782 218044). Expected:
   the listener picks up `INBOUND.SMS_RECEIVED`, engine creates a
   run, drafter calls Claude with the Practice Brain context, the
   reply is dispatched via Twilio. Toffee should see the reply on
   his phone within ~5 seconds. The CRM activity row will carry
   `integration_metadata.ai = { provider: 'anthropic', model, ... }`.

**Why no agent-handleable live gate:** sending real messages from
the engine to a phone is the whole point of the feature. The
agent-handleable verification is the unit tests + tsc + build, all
green.

## Follow-ups

- Move trigger context off in-process `Map` onto an
  `automation_runs.trigger_context` jsonb column so resumes after a
  cold-start still have access. Track in 2b.17 alongside stop
  conditions.
- Send-on-quiet-hours guard belongs in 2b.17.
- Consider switching the drafter to `claude-sonnet-4-6` for the
  email channel where copy quality matters more than cost.
