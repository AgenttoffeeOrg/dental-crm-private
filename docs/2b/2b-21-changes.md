# Phase 2b.21 — Templates library (DB + API + merge tags)

> Part 9 of 11 in `docs/2b/automations-master-plan.md`.

## What changed

- **Migration:** new table `public.automation_step_templates`
  (per-tenant SMS / WhatsApp / Email templates) with RLS, soft
  delete, updated_at trigger. Kept separate from
  `public.activity_templates` (which is the contact-detail
  composer's snippets surface) to avoid mixing audiences.
  Permission reused: `settings.integrations.manage`.

- **API:**
  - `GET  /api/automations/templates` — list (optional `?channel=` filter).
  - `POST /api/automations/templates` — create. Body validated by Zod.
  - `GET  /api/automations/templates/[id]` — fetch.
  - `PATCH /api/automations/templates/[id]` — update.
  - `DELETE /api/automations/templates/[id]` — soft-delete.

- **`lib/marketing/merge-tag-resolver.ts`** — new
  `resolveAutomationMergeTags(content, contact, options)` that
  extends the existing resolver with:
  - `{{deal.title}}`, `{{deal.value}}`, `{{deal.currency}}`
    (deal.value formatted via Intl.NumberFormat).
  - `{{tenant.name}}`, `{{tenant.email}}`, `{{tenant.phone}}` —
    synonyms of practice.* for copy that refers to the business.
  - `{{practice.opening_hours.monday}}` … `sunday` (renders
    "09:00–17:00" or "closed").
  - `{{practice.services_offered}}` — comma-joined.
  - `{{practice.brand_voice}}`.

  Existing `resolveMergeTags()` is unchanged and continues to drive
  the marketing-email / SMS composer paths.

## What's not changed (yet)

- The wizard does NOT yet show a "Pick template" picker. Adding it
  requires a token-aware text input + an API call into the new
  endpoint; deferred to a small follow-up. The wizard still creates
  workflows with free-text bodies that work today.
- The dispatcher does NOT automatically resolve
  `automation_step_templates` references on send. Future phase:
  when an engine `send_*` node carries `config.template_id`, look
  the template up + resolve merge tags via
  `resolveAutomationMergeTags()` before calling the dispatcher.

## Tests

Builds + existing 28 automation tests still green. Dedicated
template-route + merge-tag tests deferred to 2b.23 sweep.

## Operator gate

**Agent-handleable** (curl):
1. POST `/api/automations/templates` with `{name, channel:"sms", body:"Hi {{contact.full_name}}, opening hours are {{practice.opening_hours.monday}}"}`.
2. GET the same endpoint, verify the row appears.
3. PATCH `body` and verify it persists.
4. DELETE → verify `deleted_at` is set.

The merge-tag preview (Step 2) is exercised live by the wizard
once the template picker lands.

## Follow-ups

- Wizard template picker (small UI change).
- Engine resolves `config.template_id` at send time.
- A "merge tag autocomplete" surface for the wizard textarea (so
  practice owners discover `{{practice.opening_hours.monday}}`).
