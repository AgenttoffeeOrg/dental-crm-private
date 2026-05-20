# Automation engine audit (Phase 2b.12)

> **Audit type:** Read-only docs investigation — no code or schema changes.
> **Date:** 2026-05-20
> **Audited at commit:** `527224a` (`docs(2b.11.5b): close §9.1 inbound SMS gate`)
> **Branch:** `phase-1-attribution-foundation`
> **Test tenant:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf` ("Deepak's Dental Practice")
> **D11 reference:** `Audit and Analysis/full_system_audit/D11_automations_workflow.md` (2026-05-03)
> **Structural precedent:** `docs/audits/deal_attachment_audit.md` (2b.11.5), `docs/audits/outbound_audit.md` (2b.6)
> **Scope:** Automation subsystem liveness, event-emitter adoption on four launch-blocking inbound paths, trigger/action vocabulary, worker/async behavior, governance/retention, launch feasibility. Excludes canvas UI polish, full engine refactor, implementing auto-replies (2b.13+).

**DB query path:** Supabase MCP `execute_sql` — all queries succeeded (no pooler fallback).

**Post-push deploy (docs-only Part A):** deploy in progress at audit time (`527224a` push triggered Vercel build).

---

## §1 — TL;DR — what works, what doesn't

| Area | Verdict | One-line summary |
|------|---------|------------------|
| Engine liveness (production runs) | ❌ Untested / broken | **0** `automation_runs` globally; **0** `automations` on test tenant; listener never bootstrapped in `src/`. |
| Event-emitter adoption (launch paths) | ❌ Missing | Form, Google Lead Form, WhatsApp, SMS all use `ingestLead()` raw inserts — **no** `events.*` / `emit*` calls. |
| Trigger vocabulary | ⚠️ Mismatch | DB seed uses `form_submitted`; listener maps `MARKETING.FORM_SUBMITTED` → `form_submit`. **No** `sms_inbound` / `whatsapp_inbound` triggers anywhere. |
| Action vocabulary (send email/SMS/WhatsApp) | ❌ Stub | Handlers insert `activities` rows only — **no** `communications/dispatcher`, Twilio, or Resend. |
| Listener ↔ engine wiring | ❌ Split brain | Listener queries `automations` but `startJourney()` reads `marketing_journeys` by id — ids are not interchangeable. |
| Worker / queue / wait nodes | ❌ Non-functional | `processWaitingJourneys()` has **zero callers**; no Vercel cron; no BullMQ. |
| Governance | ⚠️ Partial | Validator detects canvas loops; `automation_governance_locks` table **does not exist**; rate limits via `automation_rate_limits`. |
| GDPR / retention | ⚠️ P1 | Tables empty (~64 kB); **no TTL** policy found for run/execution logs. |
| Four launch-blocker auto-replies | ❌ Not feasible on engine today | See §10 — all four require inline webhook work for launch. |
| Gaps vs D11 (2026-05-03) | Mostly unchanged | Engine still in `lib/marketing/`; emitters still unused; no API routes; no tests. |
| 2b.11.5b open Q1 (`findReusableOpenDeal`) | ✅ N/A | Automation code does **not** reference deal resolver or contact composers. |
| 2b.11.5b open Q2 (`activities.deal_id` trigger) | ✅ None | No DB trigger on `activities.deal_id` UPDATE; only FK tenant guard in migrations. |

**Headline:** The automation subsystem is a large, well-factored **scaffold** (~6,700 LOC in `lib/automations/` + 742 LOC engine) with UI, governance modules, and DB tables — but it is **not wired to production inbound traffic** and **does not send real messages**. The four launch-blocking auto-replies should ship **inline in webhook routes** (Path B), not on top of this engine.

---

## §2 — D11 reality check

| D11 claim (2026-05-03) | Status (2026-05-20) | Evidence |
|------------------------|---------------------|----------|
| ~8,481 LOC / 24 files | **Still accurate** | `lib/automations/` ≈ 6,627 LOC + `automation-engine.ts` 742 LOC + pages/canvas |
| Engine in `lib/marketing/automation-engine.ts` | **Still accurate** | File unchanged path; D11 day-1 move not done |
| Visual canvas (XYFlow), 4 node types | **Still accurate** | `automation-canvas.tsx`, trigger/action/condition/wait nodes exist |
| `event-emitters.ts` wraps mutations | **Regressed / never adopted** | **Zero** imports of `emit*` from `src/` outside the file itself |
| `automation-event-listener.ts` subscribes to events | **Code exists, not started** | `initializeAutomationSystem()` only in `initialize.ts` comment — **no** `src/` caller |
| No `/api/automations/*` | **Still accurate** | Browser `createClient()` CRUD |
| No tests for lib files | **Still accurate** | Only `__tests__/phase-2a-5-notification-redirect.test.ts` in automations folder |
| Worker / queue may stall (§8.3) | **Confirmed worse** | No queue; wait resume uncalled |
| Sites bypass emitters (§8.1) | **Still accurate** | All four launch webhooks bypass |
| `userId: undefined` in emitters | **Still accurate** | `event-emitters.ts` TODO unchanged |
| `automation_run_steps` table | **Schema drift** | Table **does not exist**; `automation_runs` + `automation_execution_logs` + `automation_nodes`/`automation_edges` instead |
| `automation_governance_locks` | **Does not exist** | Not in `information_schema` |
| Prebuilt workflows (487 LOC) | **Still accurate** | Templates present; no production runs |

---

## §3 — Code inventory

### UI (D11 pages — still present)

| Path | LOC | Role |
|------|-----|------|
| `src/app/automations/page.tsx` | 511 | List/manage automations (tabs by category) |
| `src/app/automations/create/page.tsx` | 286 | Create flow |
| `src/app/automations/[id]/page.tsx` | 299 | Edit existing |
| `src/components/automations/automation-canvas.tsx` | 226 | XYFlow canvas |
| `src/components/automations/create-automation-slide-over.tsx` | 378 | Quick create |

### Engine (misplaced per D11)

| Path | LOC | Role |
|------|-----|------|
| `src/lib/marketing/automation-engine.ts` | **742** | Journey execution against `marketing_journeys` / `marketing_journey_states` |

### `src/lib/automations/` (20 modules + 1 test)

| Path | LOC | Role |
|------|-----|------|
| `task-automation-actions.ts` | 674 | Task CRUD actions |
| `prebuilt-workflows.ts` | 487 | Template library |
| `event-emitters.ts` | 417 | DB wrap + `events.*` (**unused**) |
| `automation-event-listener.ts` | 426 | Maps unified events → `automations` table → `startJourney()` |
| `automation-governance.ts` | 412 | Approvals, rate limits, consent |
| `deal-automation-actions.ts` | 373 | Deal actions |
| `automation-simulator.ts` | 342 | Dry-run |
| `pipeline-automation-actions.ts` | 318 | Pipeline actions |
| `contact-automation-actions.ts` | 291 | Contact actions |
| `stage-auto-move.ts` | 271 | Time-based stage moves (cron-intended) |
| `automation-analytics.ts` | 244 | Metrics |
| `automation-search.ts` | 237 | Search |
| `automation-validator.ts` | 236 | Pre-publish validation (canvas loop detection) |
| `deal-sla-monitor.ts` | 235 | SLA breach (cron-intended) |
| `automation-error-handler.ts` | 192 | Error capture |
| `analytics-monitors.ts` | 186 | KPI monitors |
| `integration-monitors.ts` | 186 | Token/sync monitors |
| `call-monitors.ts` | 154 | Call events |
| `pipeline-workflows.ts` | 148 | Pipeline templates |
| `initialize.ts` | 56 | `initializeAutomationSystem()` — **never called from app** |

**Drift from D11:** No `automation-engine.ts` under `lib/automations/`; added entitlement/approval tables in migrations; listener now targets `automations` while engine still uses legacy `marketing_journeys`.

### Parallel legacy path

| Path | Role |
|------|------|
| `src/lib/marketing/crm-event-dispatcher.ts` | `setTimeout(0)` fire-and-forget; queries `marketing_journeys` — **zero imports** in `src/` |

---

## §4 — Data model

### Tables present (public schema)

| Table | Purpose |
|-------|---------|
| `automations` | Canvas workflows: `graph_json`, `trigger_type`, `trigger_config`, `status`, counters |
| `automation_nodes` / `automation_edges` | Normalized graph (companion to `graph_json`) |
| `automation_runs` | Per-run state machine (`state`, `current_node_key`, `waiting_until`, …) |
| `automation_execution_logs` | Step-level execution log |
| `automation_event_log` | Which automations fired for an event |
| `automation_errors` | **Not present** — errors use `automation_dlq` |
| `automation_dlq` | Dead-letter queue |
| `automation_rate_limits` | Frequency cap state |
| `automation_approvals` | Publish approval workflow |
| `automation_trigger_metadata` | Seed catalog of valid `trigger_type` values |
| `automation_versions` | Version history |
| `marketing_journeys` | **Legacy** engine target (steps in `steps_config`) |
| `marketing_journey_states` | Per-contact journey progress + `wait_until` |

### Tables D11 named but missing

- `automation_run_steps` — **does not exist**
- `automation_governance_locks` — **does not exist**
- `automation_errors` — **does not exist** (use `automation_dlq`)

### `automations` columns (live)

`id`, `tenant_id`, `category`, `name`, `description`, `status`, `trigger_type`, `trigger_config`, `graph_json`, `exit_conditions`, `max_duration_days`, run counters, `tags`, template flags, audit columns, `deleted_at`.

**Note:** D11 referenced `definition_jsonb`; live column is `graph_json`.

### RLS

`2025101620_phase_5_complete_rls.sql` — tenant isolation SELECT + ALL on `automations`; service_role bypass. Same browser-direct pattern as D11 warned.

### FK surprise

`activities.deal_id` has tenant-consistency trigger (`2025101604_hardening_004_fk_guards.sql`) — validates deal tenant matches activity tenant. **No** trigger fires automations on deal reassignment.

---

## §5 — Engine liveness

### Production evidence (test tenant + global)

```sql
-- Test tenant
SELECT count(*) FROM automations
WHERE tenant_id = '5aadca14-9786-4aef-bc53-e9287cdd0bbf';
-- → 0

SELECT count(*), MIN(started_at), MAX(started_at)
FROM automation_runs
WHERE tenant_id = '5aadca14-9786-4aef-bc53-e9287cdd0bbf';
-- → count 0, min/max null

SELECT count(*) FROM marketing_journeys
WHERE tenant_id = '5aadca14-9786-4aef-bc53-e9287cdd0bbf';
-- → 0

-- Global
SELECT count(*) FROM automation_runs;
-- → 0
```

**Verdict:** Engine liveness is **untested on the test tenant** (no automations to fire). Globally, **zero runs have ever been recorded** in `automation_runs` — consistent with listener never starting and/or schema split preventing successful execution.

### Wiring chain (if it ran)

1. `events-unified` `eventService.on(...)` (requires `setupUnifiedEventListeners()`)
2. `AutomationEventListener.handleEvent()` — maps event → `trigger_type` string
3. `findMatchingAutomations()` — `automations` where `status = 'active'` AND `trigger_type` match
4. `automationEngine.startJourney(automation.id, contactId)` — loads **`marketing_journeys`** by that id

**P0 defect:** Step 4 uses `automation.id` as `journey_id`. UUIDs in `automations` ≠ UUIDs in `marketing_journeys`. Even if the listener started, `startJourney` would throw "Journey not found" unless ids were manually synced.

### Bootstrap

`initializeAutomationSystem()` in `src/lib/automations/initialize.ts` is documented for `useEffect` in layout — **grep shows no invocation anywhere under `src/`** (only the definition and markdown docs).

---

## §6 — Event-emitter adoption (launch-critical)

All four launch-blocking entry points funnel through **`ingestLead()`**, which performs raw Supabase inserts and `_emitNotification({ event_key: 'lead.arrived' })` — **not** unified automation events.

| Entry point | Route / orchestrator | `ingestLead` | `emitContactCreated` / `emitDealCreated` / `MARKETING.FORM_SUBMITTED` | `triggerFormSubmitJourney` |
|-------------|---------------------|--------------|------------------------------------------------------------------------|----------------------------|
| **Form submission** | `src/app/api/marketing/forms/submit/route.ts` | Yes (~312–390) | **No** | **No** |
| **Google Lead Form** | `src/app/api/webhooks/google-lead-form/route.ts` | Yes (~126–129) | **No** | **No** |
| **WhatsApp inbound** | `src/app/api/webhooks/whatsapp/route.ts` → `lib/whatsapp/inbound.ts` | Yes (~288) | **No** | **No** |
| **SMS inbound** | `src/app/api/webhooks/sms/route.ts` → `lib/sms/inbound.ts` | Yes (~276) | **No** | **No** |

**Form submit extra:** Raw insert to `marketing_form_submissions` for analytics (lines ~222–240 spam path, ~403–423 post-ingest) — still no automation emit.

**`ingest-lead.ts`:** Contact insert `contacts.insert` (lines ~511–528); deal via `createDealForLead()` → raw `deals.insert` in `deal-creation.ts` (~181–200). **No** `events.contactCreated` / `events.dealCreated`.

**`event-emitters.ts`:** 14 exported `emit*` functions — **zero call sites** in `src/` outside the module.

**Implication:** Publishing an automation with trigger `form_submitted` on the canvas would **never fire** for real form/WhatsApp/SMS traffic until emitters are wired into `ingestLead` (or webhooks call `events.*` directly).

---

## §7 — Trigger and action vocabularies

### DB `trigger_type` CHECK constraint (migration `2025011607_extended_automation_triggers.sql`)

Includes: `contact_created`, `form_submitted`, `deal_created`, `deal_stage_change`, `email_opened`, `call_missed`, … **Does not include:** `sms_inbound`, `whatsapp_inbound`, `google_lead_form`, `form_submit`.

### Listener `EVENT_TO_TRIGGER_MAP` (`automation-event-listener.ts` lines 27–80)

| Unified event | Mapped trigger |
|---------------|----------------|
| `MARKETING.FORM_SUBMITTED` | `form_submit` ⚠ |
| `CONTACT.CREATED` | `contact_created` |
| `DEAL.CREATED` | `deal_created` |
| … | (deal/task/pipeline/call/integration/analytics/ai) |

**No mapping** for inbound message events — `ingestLead` does not emit them anyway.

### Trigger mismatch table

| Location | String | Issue |
|----------|--------|-------|
| DB CHECK + seed | `form_submitted` | Canonical in schema |
| Listener line 61 | `form_submit` | Automations with DB value **never match** |
| `automation-engine.ts` JourneyTrigger type | `form_submit` | Same |
| Launch need: SMS ack | *(missing)* | Need new trigger or inline only |
| Launch need: WhatsApp ack | *(missing)* | Need new trigger or inline only |

### Action handlers (`automation-engine.ts` lines 242–370)

| Action type | Handler | Actually sends? | Uses 2b.9 dispatcher? |
|-------------|---------|-----------------|----------------------|
| `send_email` | `executeSendEmail` | **No** — `activities.insert` only (`marketing_event_type: journey_email_sent`) | **No** |
| `send_sms` | `executeSendSMS` | **No** — activity row only | **No** |
| `send_whatsapp` | `executeSendWhatsApp` | Delegates to SMS stub | **No** |
| `wait` | `scheduleWaitAction` | Sets `wait_until` on `marketing_journey_states` | N/A |
| `create_task`, `add_tag`, etc. | Various | DB mutations / stubs | N/A |

**Outbound gap:** Engine emails lack `conversation_id`, Message-ID (2b.11), and provider dispatch — even if engine were fixed.

---

## §8 — Worker / queue / async behavior

| Mechanism | Finding |
|-----------|---------|
| BullMQ / Redis queue | **Not used** in automations |
| `setTimeout` | Only in legacy `crm-event-dispatcher.ts` (dead) |
| Wait nodes | `scheduleWaitAction` writes `status='waiting'`, `wait_until` to **`marketing_journey_states`** |
| Resume | `processWaitingJourneys()` polls waiting states — comment says "cron/scheduler" |
| Cron caller | **None** — grep shows zero callers of `processWaitingJourneys` |
| Vercel cron | `vercel.json` has `scheduled-audits` only — **no** automation cron |

**Verdict:** Wait nodes **do not work** on Vercel serverless today. Any multi-step workflow with a delay will stall permanently after the first synchronous step completes.

**Async actions:** `executeNextAction` runs recursively in-process until a wait node; no background worker survives cold start.

---

## §9 — Governance, retention, GDPR

### Governance

- **Canvas loop detection:** `automation-validator.ts` `detectCircularLoops()` — client-side at publish.
- **Cascade depth:** D11 §8.2 asked to verify — **no runtime cascade-depth limit** found in `automation-governance.ts` (grep: no `cascade` / `depth`).
- **Rate limits:** `automation_rate_limits` table exists; governance module references approvals and consent audit.
- **Business hours:** Referenced in D11; verify per-automation `trigger_config` at publish time — not enforced at engine stub send path.

### Retention / GDPR

```sql
SELECT pg_size_pretty(pg_total_relation_size('automation_runs')) AS runs_size,
       pg_size_pretty(pg_total_relation_size('automation_execution_logs')) AS exec_logs_size,
       pg_size_pretty(pg_total_relation_size('automation_dlq')) AS dlq_size;
-- runs 64 kB, exec_logs 72 kB, dlq 48 kB (empty tables)

SELECT count(*) FROM automation_runs;
-- 0
```

**P1:** No TTL / purge job found for `automation_runs`, `automation_execution_logs`, or `automation_event_log`. When runs begin, step payloads may contain contact PII — unbounded growth risk.

---

## §10 — The four launch-blockers (feasibility map)

| Auto-reply | Trigger needed | Action needed | Emitter present? | Engine handler present? | Reliable today? |
|------------|----------------|---------------|------------------|-------------------------|-----------------|
| **Form → confirmation email** | `form_submitted` (DB) / `form_submit` (listener) | `send_email` | **No** — `ingestLead` only | Stub (activity insert) | **No** |
| **Google Lead Form → confirmation email** | Same + `google_lead_form` channel | `send_email` | **No** | Stub | **No** |
| **WhatsApp inbound → acknowledgement** | *(none)* — need `whatsapp_inbound` or `message.received` | `send_whatsapp` | **No** | Stub (reuses SMS stub) | **No** — no Twilio/template dispatch |
| **SMS inbound → acknowledgement** | *(none)* — need `sms_inbound` | `send_sms` | **No** | Stub | **No** — no Twilio dispatch |

### Prose per row

**Form / Google Lead Form:** `forms/submit/route.ts` and `webhooks/google-lead-form/route.ts` call `ingestLead()`. That path creates contact/deal/activity and notifies `lead.arrived` — it does **not** emit `MARKETING.FORM_SUBMITTED`. The listener is not started. Even with emitters, `form_submit` ≠ `form_submitted` would block matching.

**WhatsApp / SMS:** `lib/whatsapp/inbound.ts` and `lib/sms/inbound.ts` call `ingestLead` with `source_channel` `whatsapp_inbound` / `sms_inbound`. No automation trigger type exists in CHECK constraint or listener map. Dispatcher-based outbound (2b.9) is the correct send path for launch — engine does not call it.

**Opt-out / templates:** Engine stubs do not check `sms_consent` / WhatsApp template rules — inline routes must use existing compliance helpers in dispatcher layer.

---

## §11 — Issues / risks register

| # | Priority | Issue |
|---|----------|-------|
| 1 | **P0** | `initializeAutomationSystem()` never called — listener dead on all tenants |
| 2 | **P0** | Listener passes `automations.id` to `startJourney()` which reads `marketing_journeys` — schema split |
| 3 | **P0** | Launch webhooks bypass unified events — engine cannot see inbound/form traffic |
| 4 | **P0** | No `sms_inbound` / `whatsapp_inbound` trigger types in schema or listener |
| 5 | **P0** | `send_*` actions do not dispatch real messages |
| 6 | **P0** | `processWaitingJourneys()` never scheduled — wait nodes stall |
| 7 | **P1** | `form_submit` vs `form_submitted` naming mismatch |
| 8 | **P1** | `event-emitters.ts` unused — deal/contact creates from ingestion miss automations |
| 9 | **P1** | Engine send path bypasses `communications/dispatcher` — no `conversation_id` / Message-ID |
| 10 | **P1** | No automation run/error TTL — GDPR growth risk |
| 11 | **P2** | No server-side API for automation CRUD — RLS-only browser writes |
| 12 | **P2** | No unit tests on engine/listener/emitters |
| 13 | **P2** | `checkAutomationSystemHealth()` always returns `isHealthy: true` |
| 14 | **P3** | D11 "move engine to lib/automations" deferred — cosmetic |

### Answers to 2b.11.5b §12 open questions

1. **`findReusableOpenDeal` / composers:** Automation subsystem does not import deal resolver or Change Deal UI — **no interaction**.
2. **`activities.deal_id` UPDATE trigger:** **None** for automation; only cross-tenant FK validation on insert/update.

---

## §12 — Recommendation

### **Path B — Inline-first** (selected)

Ship the four launch-blocking auto-replies **directly in the webhook/orchestrator routes** after `ingestLead()` succeeds:

1. Call `communications/dispatcher` (or thin wrapper) with tenant template + contact context.
2. Respect existing consent flags and channel rules (SMS opt-out, WhatsApp templates).
3. Stamp `deal_id` / `conversation_id` using the same rules as manual outbound (2b.11).

**Do not block launch on engine repair.**

### Why not Path A (engine-first)?

Path A requires, at minimum: bootstrap listener, unify `automations` vs `marketing_journeys` (or rewrite engine to use `automation_runs` + `graph_json`), wire emitters into `ingestLead`, add four trigger types, fix `form_submit` naming, replace stub send actions with dispatcher integration, and add cron for wait resume. Estimated **2–3 weeks** before first reliable auto-reply — too slow for launch.

### Why not Path C (hybrid)?

Hybrid is viable post-launch, but parallel engine repair during launch adds coordination overhead without shortening time-to-first-auto-reply. Recommend **inline first**, then schedule engine repair as explicit post-launch phases once launch traffic is stable.

---

## §13 — Recommended execution sequence

### Phase 2b.13 — SMS inbound acknowledgement (inline)

- **Where:** `src/lib/sms/inbound.ts` after successful `ingestLead`
- **What:** Feature-flagged template SMS via dispatcher; log activity with `conversation_id`
- **Effort:** ~1–2 days

### Phase 2b.14 — WhatsApp inbound acknowledgement (inline)

- **Where:** `src/lib/whatsapp/inbound.ts`
- **What:** Template/conversation rules per Twilio; dispatcher send
- **Effort:** ~1–2 days

### Phase 2b.15 — Form + Google Lead Form confirmation email (inline)

- **Where:** `forms/submit/route.ts`, `webhooks/google-lead-form/route.ts`
- **What:** Resend/dispatcher email with practice branding; locale from tenant settings
- **Effort:** ~2–3 days (batched)

### Post-launch stream (engine repair — not 2b.13 scope)

| Phase | Work | Effort |
|-------|------|--------|
| E1 | Call `initializeAutomationSystem()` from server layout/worker; fix listener→engine id bridge | 2–3 days |
| E2 | Wire `ingestLead` → `events.contactCreated` / `activityCreated` / form event | 2 days |
| E3 | Align trigger strings; add inbound trigger types to CHECK + listener | 1 day |
| E4 | Replace stub sends with dispatcher; write `automation_runs` rows | 3–5 days |
| E5 | Vercel cron for `processWaitingJourneys` or remove wait nodes | 1 day |
| E6 | Tests + TTL policy | 3–5 days |

---

## §14 — Open questions for planner

1. **Confirm Path B** — inline auto-replies in four routes for launch?
2. **Copy / locale** — subject lines, body text, opt-out language (Toffee sign-off per D12)?
3. **Business hours** — suppress 3am SMS ack, or send always?
4. **Feature flags** — per-tenant opt-in for first 10 customers?
5. **Google Lead Form** — same email template as embedded form, or separate?
6. **WhatsApp** — session vs template message for ack (Twilio policy)?
7. **Duplicate ack** — if patient sends 5 SMS in a row, one ack or per message? (idempotency window)
8. **Engine post-launch priority** — is visual canvas automation still a Q3 goal, or deprioritize until inline acks ship?

---

## §15 — What to leave alone (2b.13+ scope clarity)

- XYFlow canvas UI (`automation-canvas.tsx`) — not needed for inline acks
- `prebuilt-workflows.ts` content templates
- `automation-analytics.ts` reporting
- `automation-simulator.ts` dev dry-run
- 2b.11.5b deal attachment / Change Deal UI
- 2b.9–2b.11 dispatcher / `conversation_id` / Message-ID (reuse, don't rewrite)

---

## §16 — Out of scope for 2b.13+

- Full engine move `lib/marketing/` → `lib/automations/`
- `/api/automations/*` REST surface
- Test coverage for all 20 lib files
- BullMQ / dedicated worker infrastructure
- AI-generated auto-reply copy (D12)
- Marketing Breeze / AI Drafts modules

### Adjacent findings (not fixed)

- `checkAutomationSystemHealth()` is a stub returning healthy unconditionally.
- `crm-event-dispatcher.ts` appears fully dead (zero imports).

---

## Source files audited (read-only)

| File | Notes |
|------|-------|
| `src/lib/marketing/automation-engine.ts` | Send stubs, wait scheduling, `startJourney` |
| `src/lib/automations/automation-event-listener.ts` | Event map, `automations` query |
| `src/lib/automations/event-emitters.ts` | Unused exports |
| `src/lib/automations/initialize.ts` | Never called |
| `src/lib/lead-ingestion/ingest-lead.ts` | No automation events |
| `src/lib/lead-ingestion/deal-creation.ts` | Raw deal insert |
| `src/app/api/marketing/forms/submit/route.ts` | ingestLead |
| `src/app/api/webhooks/google-lead-form/route.ts` | ingestLead |
| `src/app/api/webhooks/sms/route.ts` | Delegates to inbound lib |
| `src/app/api/webhooks/whatsapp/route.ts` | Delegates to inbound lib |
| `src/lib/sms/inbound.ts` | ingestLead |
| `src/lib/whatsapp/inbound.ts` | ingestLead |
| `Audit and Analysis/full_system_audit/D11_automations_workflow.md` | Baseline |

## Source DB queries run

| # | Query | Result |
|---|-------|--------|
| 1 | `automations` count test tenant | 0 |
| 2 | `automation_runs` count test tenant / global | 0 / 0 |
| 3 | `marketing_journeys` count test tenant | 0 |
| 4 | `automation_*` table list | 14 tables; no `automation_run_steps` |
| 5 | Relation sizes | ~64–72 kB empty |
| 6 | DISTINCT `trigger_type` from `automations` | empty set |

---

*End of audit. Awaits planner review of §14 before 2b.13 prompt is written.*
