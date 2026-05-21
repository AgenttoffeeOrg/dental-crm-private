# Phase 2b.20 — Workflow wizard (linear) + new node types

> Part 8 of 11 in `docs/2b/automations-master-plan.md`.

## What changed

- **`src/components/automations/workflow-wizard.tsx`** — new 4-step
  React wizard. Plain-English UI:
  1. **When should this start?** picks the trigger
     (`inbound_sms` / `inbound_whatsapp` / `form_submitted` /
     `google_lead_form_submitted`).
  2. **What's the first message?** picks the action kind
     (`send_ai_reply` / `send_sms` / `send_whatsapp` / `send_email`)
     and channel/body/subject/tone-override/fallback as appropriate.
  3. **Follow up if no reply?** optional second action behind a
     wait in minutes. Default 2 days when toggled on.
  4. **Behaviour + name** — `on_patient_reply` (stop /
     ai_continue), `respect_quiet_hours`, name + description, and
     a "turn on now" checkbox that publishes via PATCH after the
     initial draft insert.
- **`src/app/automations/new/page.tsx`** — server-rendered host for
  the wizard component. The existing
  `/automations/create` and `/automations/[id]` editor pages are
  unchanged (advanced canvas stays the way it was).
- Wizard output is a strict linear `graph_json`:
  `trigger → a1 [→ wait1 → a2] → done`. Compatible with the engine
  and with the existing XYFlow canvas — switching from wizard to
  canvas works because the shape is the canvas's lowest-common
  denominator.
- Saves via `authFetch('/api/automations', POST)` from 2b.19. If
  the "turn it on now" toggle is set, the wizard immediately PATCHes
  `status='active'` which fires the audit-trail row from 2b.19.

## What's not changed

- The XYFlow advanced canvas is untouched. Per the master plan it
  remains the path for branching graphs / multiple stages /
  conditional nodes.
- New node visuals (`send_ai_reply`, `wait_until`) are NOT yet
  added to the canvas component catalogue — the engine handles
  these types correctly, but a user editing a canvas-imported
  wizard automation won't see custom node renderers for them. The
  default action-node renderer falls through. Cosmetic; fix in a
  follow-up.
- "Switch view" toggle between wizard and canvas on the same
  automation is **not** in this phase. The wizard is "build a new
  one"; the canvas is "edit the existing one." A round-trip toggle
  needs both to share a graph state — deferred.

## Tests

Build green (Next.js compiles the new page). 28 automation suites
still pass. No new unit tests for the wizard — it's a thin React
form; the engine + API surfaces it calls into are already covered.

## Operator gate

**Agent-handleable** (UI flow against production):

1. Log into CRM, navigate to `/automations/new`.
2. Walk the wizard: trigger=inbound_sms, action=send_ai_reply
   (channel=sms), no follow-up, on_patient_reply=stop,
   respect_quiet_hours=off, name="2b.20 op-gate", check
   "turn it on now".
3. Verify a new row in `automations` with status='active' and a
   matching `audit_trail` row (entity_type='automation',
   changed_fields=['status']).

## Follow-ups

- Canvas-side renderers for `send_ai_reply` and `wait_until` nodes
  (planned for 2b.22 alongside the prebuilt set).
- Cutover the existing `create` page to the wizard (delete the
  current minimal create flow). Tracked for 2b.23 sweep.
- Wizard → canvas "advanced" toggle inside the editor (per master
  plan §2b.20). Needs a shared graph state model.
