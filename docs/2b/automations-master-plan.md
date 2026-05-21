# Automations feature — master plan (Build A)

> **Internal working notes — not Toffee-facing.** Phase numbering continues from 2b.12 (the audit). Build A = full feature in this manifest. Build B (deferred) is in `automations-build-b-future-work.md`.

## Vision (locked Stage 1, 2026-05-21)

Two pillars, both customisable by the practice, both reading from one global tenant-level knowledge hub:

1. **Nurture workflows** — multi-step sequences triggered by inbound (form / Google Lead Form / SMS / WhatsApp). Multi-channel, branching on patient reply, with optional cadenced follow-ups. AI primary mode; template-only mode as fallback.
2. **Always-on FAQ responder** — independent of nurture workflows. AI replies to generic questions (opening hours, pricing, services) by pulling from Practice Brain.

Plus pipeline routing: AI primary (intent classification) + practice keyword rules + fallback to unsorted pipeline.

## Locked product rules

- **Practice Brain is global** — used by every AI feature in the CRM, not just Automations.
- **Stop rules:** note added → stop; logged call → stop; manual outbound + patient reply → stop; reading / pipeline change / assignment → don't stop.
- **Patient reply branching:** per-workflow setting — AI continues OR human takeover.
- **Quiet hours:** off by default, opt-in per workflow.
- **Day-1 prebuilts:** shipped OFF (drafts), AI-mode, with one prebuilt per launch channel + a "no reply in 2 days → switch channel" cadence. Pipeline routing ON by default.
- **Templates:** library tab inside Automations, used in workflows by picking from library or writing inline.
- **Editor UX:** wizard default, advanced canvas (existing XYFlow) on toggle.

## Engine truth (from 2b.12 audit + Stage 2 reads)

- Engine in `src/lib/marketing/automation-engine.ts` operates on `marketing_journeys` table.
- Listener in `src/lib/automations/automation-event-listener.ts` queries `automations` table.
- Schema split: listener passes `automations.id` to `startJourney()` which loads `marketing_journeys` by id → fails. **P0.**
- Listener never bootstrapped. **P0.**
- Send stubs insert activity rows only, do not call dispatcher. **P0.**
- `processWaitingJourneys()` has zero callers. **P0.**
- Event emitters in `src/lib/automations/event-emitters.ts` exist but zero call sites — `ingestLead` does not emit unified events. **P0.**
- DB trigger CHECK constraint has no `sms_inbound`, `whatsapp_inbound`, `google_lead_form` types. **P0.**
- `form_submit` (listener) vs `form_submitted` (DB) naming mismatch. **P1.**

## Adjacent systems (from Stage 2 audit)

- **AI:** `src/lib/openai-client.ts` (lazy init), `src/lib/ai.ts` (gpt-4o-mini), `/api/ai-assistant/chat` (context+system-prompt pattern reusable). No tenant-level brand voice surface today.
- **Dispatcher:** `lib/communications/dispatcher.ts` is canonical outbound — dispatchEmail / dispatchSms / dispatchWhatsApp. Already stamps conversation_id, Message-ID, conversation rows, error metadata.
- **Events:** `lib/events-unified.ts` is in-process pub/sub. Add new event types to EventMap freely.
- **ingestLead:** `lib/lead-ingestion/ingest-lead.ts` is the chokepoint for ALL inbound. Emit automation events here, after activity insert, with `source_channel + activity_id` in payload.
- **Pipeline schema:** `pipelines` (with `is_default`), `pipeline_stages` (with `is_won` / `is_lost`), deals reference both. `tenant_routing_settings.auto_create_unsorted` + `unsorted_pipeline_id` already exist for the fallback pattern.
- **Settings architecture:** 2-level (sidebar section → horizontal tabs), `?section=&tab=` query params. New Practice Brain goes under `ai` section.
- **Merge tags:** `lib/marketing/merge-tag-resolver.ts` supports contact / today / practice / link / contact.custom. Needs extending for `deal.*`, `tenant.*` brand fields.
- **Vercel cron:** one job today (`scheduled-audits`). Pattern in `vercel.json`.
- **Consent:** `consent_records` (granted / withdrawn_at), `contacts.compliance_tags` array. WhatsApp 24h session window NOT tracked.

## Phase plan (Build A)

Each phase ends with operator gate, push, deploy verification, code-reviewer subagent, changelog. Numbering continues 2b.13 onwards. Phone-side gates are inline per phase (not batched).

### 2b.13 — Practice Brain (foundation)
**Why first:** every AI feature downstream depends on it; building anything else first means rework.

- New table `tenant_ai_context`: brand_voice (text), practice_description (text), services_offered (jsonb), pricing (jsonb), opening_hours (jsonb), faqs (jsonb), escalation_rules (text), additional_instructions (text), updated_at.
- API: `GET / PATCH /api/settings/practice-brain` (auth-gated via `requireAuthenticatedTenantUser`).
- Settings UI: new tab under `ai` section. Subheadings for each field.
- Seed default record for test tenant (and a per-tenant seed hook for later).
- New helper `lib/automations/practice-brain.ts` exposing `loadPracticeBrain(tenantId)` for downstream AI calls.
- Operator gate: agent-handleable (log into CRM, save a value, verify DB row).

### 2b.14 — Engine repair + event wiring + cron + missing trigger types
**Why coupled:** all the engine P0 fixes are interdependent — fixing one without the others leaves the system still broken.

- **Pick one source of truth.** Rewrite `automation-engine.ts` to operate on `automations` + `automation_runs` (drop `marketing_journeys` dependency). Move engine to `lib/automations/automation-engine.ts` per D11. Adapt `startJourney` to load from `automations` and write run-state to `automation_runs`.
- Bootstrap listener: call `initializeAutomationEventListener()` from a server-side entry. Either: (a) `instrumentation.ts` `register()` hook, or (b) lazy-init on first webhook hit via a guarded singleton, or (c) explicit `/api/system/init` route called by the cron.
- Add Vercel cron job `/api/cron/process-automation-waits` every 1 min calling `processWaitingJourneys()`.
- Add new trigger types to DB CHECK constraint: `inbound_sms`, `inbound_whatsapp`, `web_form_submitted`, `google_lead_form_submitted`. Canonicalise to `form_submitted` (drop `form_submit`).
- Update listener EVENT_TO_TRIGGER_MAP accordingly.
- Add new event types to `EventMap`: `INBOUND.SMS_RECEIVED`, `INBOUND.WHATSAPP_RECEIVED` (form already has `MARKETING.FORM_SUBMITTED`; add `MARKETING.GOOGLE_LEAD_FORM_SUBMITTED`).
- Wire `ingestLead` to emit the appropriate event after the activity insert, with `{ tenantId, contactId, dealId, activityId, source_channel, raw_payload }` in the payload.
- Operator gate: agent-handleable (create a test automation, send a test SMS via Twilio sandbox, verify `automation_runs` row appears).

### 2b.15 — Real sends via dispatcher + AI auto-reply integration
**Why coupled:** AI drafter calls into the dispatcher; testing one without the other is half-a-feature.

- Replace `executeSendEmail` / `executeSendSMS` / `executeSendWhatsApp` stubs with thin wrappers around `dispatchEmail` / `dispatchSms` / `dispatchWhatsApp`. Pass tenant_id, contact_id, deal_id from automation_run state.
- New action type `send_ai_reply` with config `{ channel: 'sms'|'whatsapp'|'email', tone_override?, escalation_phrase? }`.
- New module `lib/automations/ai-reply-drafter.ts`:
  - Loads Practice Brain via `loadPracticeBrain()`.
  - Builds system prompt: brand voice + services + pricing + escalation rules + additional instructions.
  - Reads the original inbound activity body (for context) + the conversation history.
  - Calls OpenAI (gpt-4o-mini via `getOpenAIClient()`).
  - Returns drafted message; on failure → throws.
- Engine `executeSendAiReply` action: call drafter → call dispatcher → log AI metadata on activity.
- Fallback: if AI throws, attempt configured per-workflow template (action.config.fallback_template). If neither, mark run failed with reason.
- Operator gate: agent-handleable (send test SMS in via Twilio, verify an AI-drafted reply lands in the activity feed AND in the dispatcher activity row with conversation_id).

### 2b.16 — Pipeline routing (AI + keyword + unsorted fallback)
- Extend `tenant_routing_settings` with `keyword_pipeline_rules` JSONB column: array of `{ keywords: string[], pipeline_id, stage_id?, priority }`.
- New module `lib/automations/pipeline-router.ts`:
  - Reads inbound message text + tenant routing settings + tenant's pipelines.
  - Tries practice keyword rules first (highest priority match wins).
  - If no keyword match, calls AI intent classifier (Practice Brain services list + pipeline name list as context).
  - If AI confidence < 0.6 or no match, returns `unsorted_pipeline_id` (auto-create "General" if not present).
- Hook into `lib/lead-ingestion/deal-creation.ts` — after `treatment_offering` resolution, before `is_default` fallback.
- Settings UI: extend the existing routing settings or add a new "Pipeline Routing" tab under workflow.
- Operator gate: agent-handleable (seed test pipelines, send SMS with "braces" → verify deal lands in Orthodontics).

### 2b.17 — Stop conditions + reply branching + quiet hours
- Manual engagement detector: subscribe to `ACTIVITY.CREATED` events; if activity is type `note` or `call`, OR (activity is outbound from practice user AND a subsequent inbound from patient exists within window), find any `automation_runs` rows for that (tenant, contact) with `status='active'|'waiting'` and update to `status='stopped'` with `stop_reason`.
- Patient reply branching: workflow config gets `on_patient_reply` enum (`stop` | `ai_continue`). When patient inbound arrives and an active automation_run exists, follow the config: either stop OR start an AI-continue loop where each inbound triggers a drafted reply via the same `ai-reply-drafter`.
- Quiet hours: workflow config gets `respect_quiet_hours` boolean + Practice Brain `opening_hours` is source of truth. At send time, if outside hours, delay the action by writing `wait_until` set to next open hour.
- Operator gate: agent-handleable (trigger workflow → log a call → verify automation_run stops; trigger another → reply as patient → verify branch behaviour).

### 2b.18 — Always-on FAQ responder
- New module `lib/automations/faq-responder.ts`:
  - Triggered on every inbound message (subscribes to INBOUND.* events).
  - Builds prompt from Practice Brain `faqs` + `services_offered` + `pricing` + `opening_hours`.
  - Asks AI: "Is this a generic FAQ-type question? If yes, answer succinctly. If no, return null."
  - If null returned, do nothing. Otherwise dispatch via channel-matching dispatcher.
- Per-tenant toggle (in Practice Brain settings): `faq_responder_enabled`. Per-channel granularity if needed.
- Idempotency: never reply twice to the same inbound activity; check for existing outbound activity in the same conversation_id with `metadata.faq_responder = true`.
- Coexistence with nurture workflows: if an active nurture workflow IS handling this conversation (e.g., `on_patient_reply='ai_continue'`), skip FAQ responder for that message — nurture wins.
- Operator gate: agent-handleable (send "what time are you open" via SMS → verify FAQ reply with opening hours).

### 2b.19 — Automation CRUD API
**Why now:** current page writes to `automations` table via browser RLS. We need server-side validation, audit_trail for publish actions, and a clean surface for the new editor.

- `/api/automations/` route surface:
  - `GET /api/automations` (list with filters)
  - `GET /api/automations/[id]`
  - `POST /api/automations` (create)
  - `PATCH /api/automations/[id]` (update — including publish/unpublish)
  - `DELETE /api/automations/[id]` (soft-delete via `deleted_at`)
  - `POST /api/automations/[id]/clone`
  - `POST /api/automations/install-template` (install prebuilt → tenant)
- All auth-gated via `requireAuthenticatedTenantUser`.
- audit_trail row on publish / unpublish / delete via `logAuditServer`.
- Update existing page + slide-over + edit page to use new endpoints (drop browser-direct writes).
- Operator gate: agent-handleable (create automation via new editor, verify `audit_trail` row on publish).

### 2b.20 — Workflow editor: wizard default + advanced canvas toggle
- Wizard component `<WorkflowWizard>`: linear step-by-step ("when does this start?" → "what's the first message?" → "wait how long?" → "if no reply, do what?" → "stop / continue with AI on reply?" → "quiet hours?").
- Wizard output → simple linear `graph_json` compatible with the existing canvas.
- Existing canvas remains; "Advanced" toggle in editor header swaps view.
- Both share underlying state. Switching from wizard → canvas is fine; canvas → wizard works only if graph is linear.
- New nodes for `send_ai_reply` and `wait_until` (quiet-hours-aware) in `components/automations/nodes/`.
- Operator gate: agent-handleable (build a 3-step workflow via wizard, switch to canvas, verify same graph).

### 2b.21 — Templates library (inside Automations)
- New tab at `/automations?tab=templates` alongside the existing list.
- Reuse existing `activity_templates` table (extend with new `category='automation_step'` value) OR create `automation_step_templates` (decide during phase based on coupling risk).
- CRUD UI: list / create / edit / delete templates for SMS / WhatsApp / email. Merge tag picker.
- Extend `lib/marketing/merge-tag-resolver.ts` to include `deal.title`, `deal.value`, `tenant.name`, plus all Practice Brain fields (`practice.opening_hours.monday` etc.).
- In wizard / canvas, the message-step config gets a "Pick template" picker that pulls from the library.
- Operator gate: agent-handleable (create a template, reference it from a workflow, fire workflow, verify merge-tag resolution in the dispatched activity).

### 2b.22 — Prebuilt workflows + per-tenant seeding
- Extend `prebuilt-workflows.ts` with INBOUND workflow set:
  - `inbound_sms_auto_reply` — AI reply to incoming SMS, with `on_patient_reply='ai_continue'`.
  - `inbound_whatsapp_auto_reply` — AI reply to incoming WhatsApp.
  - `web_form_confirmation_email` — confirmation email + 2-day SMS follow-up.
  - `google_lead_form_confirmation` — confirmation email + 2-day SMS follow-up.
  - `no_reply_2_day_cadence` — generic cadence helper that chains after any auto-reply.
- Seeding hook on tenant onboarding completion → install all prebuilts as `status='draft'`. Practice Brain gets a stub record with empty subheadings.
- "Restore defaults" button per prebuilt (re-install from canonical config without losing edits to other workflows).
- Operator gate: agent-handleable (delete test tenant's automations, run seed, verify all prebuilts present as drafts).

### 2b.23 — TTL + tests + bug sweep
- Add a daily Vercel cron `/api/cron/purge-automation-data` that:
  - Deletes `automation_runs` older than 90 days with `status IN ('completed','stopped','failed')`.
  - Deletes `automation_execution_logs` older than 30 days.
  - Deletes `automation_event_log` older than 14 days.
- Unit tests for engine action handlers, AI drafter (mocked OpenAI), FAQ responder, pipeline router, stop-condition detector.
- Integration test: end-to-end SMS inbound → ingestLead → event → listener → engine → AI drafter → dispatcher → activity row.
- code-reviewer subagent on cumulative diff from 2b.13 onwards.
- Bug sweep: full `npx jest` + `npx tsc --noEmit` + `npm run build`. Fix all surfacing issues.

## Build B (future work — documented, not built)

See `automations-build-b-future-work.md`.

## Out of scope entirely

- Appointment reminders (handled by external practice-management software, per Toffee).
- Marketing Breeze module rewrite (separate feature track).
- BullMQ / dedicated worker (Vercel cron is sufficient at launch scale).
- AI Drafts module rewrite.

## Open engineering decisions (decide silently during phases)

- **Engine schema unification path:** rewrite engine to use `automations`+`automation_runs` (preferred — single source of truth) vs. write a thin adapter that translates between schemas. Decide in 2b.14.
- **Listener bootstrap path:** `instrumentation.ts` register hook vs. lazy-init singleton vs. explicit `/api/system/init`. Decide in 2b.14.
- **Templates table:** reuse `activity_templates` with new category vs. new `automation_step_templates`. Decide in 2b.21.
- **AI failure default behaviour:** if no per-workflow fallback template set, do we send NOTHING and log, or send a "we received your message" stock reply? Decide in 2b.15. Default proposal: send nothing + log + practice notification.
