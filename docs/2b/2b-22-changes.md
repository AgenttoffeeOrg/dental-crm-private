# Phase 2b.22 — Prebuilt workflows + per-tenant seeding

> Part 10 of 11 in `docs/2b/automations-master-plan.md`.

## What changed

- **`lib/automations/inbound-prebuilts.ts`** — 5 day-1 automations
  authored in the new `graph_json` shape, every one tagged with a
  stable `prebuilt_key`:

  | key | trigger | what it does |
  |---|---|---|
  | `inbound_sms_auto_reply` | `inbound_sms` | AI reply, ai_continue, quiet-hours-aware. |
  | `inbound_whatsapp_auto_reply` | `inbound_whatsapp` | Same pattern on WhatsApp. |
  | `web_form_confirmation_email` | `form_submitted` | Confirmation email → wait 2 days → SMS follow-up. |
  | `google_lead_form_confirmation` | `google_lead_form_submitted` | Same as web form, for Google Lead Form leads. |
  | `no_reply_2_day_cadence` | `contact_created` | Generic 2-day no-reply chaser. |

  All five have `respect_quiet_hours: true`. AI-reply nodes carry
  short `fallback_template` strings so a Claude outage doesn't drop
  the conversation.

- **`/api/automations/seed`** (POST) — installs the prebuilts as
  drafts on the caller's tenant:
  - Body `{ keys?: string[], replace?: boolean }`.
  - Default = install all keys not yet present (idempotent —
    re-running is a no-op).
  - `replace: true` soft-deletes any existing prebuilt with the
    same `prebuilt_key` and re-inserts the canonical version.
    That's the "restore defaults" path the master plan calls for.
  - Also upserts a `tenant_ai_context` row (Practice Brain stub)
    so the AI features have somewhere to read from.
  - Returns `{ ok, installed, replaced, skipped }` so the caller
    can show a clear summary.

## What's NOT in this phase

- Onboarding-flow hook that auto-fires the seed on tenant creation
  — touches the registration/onboarding code path which is out of
  scope. The seed is callable on demand; wiring it into onboarding
  is a 1-line additional call to be done when the onboarding flow
  is next touched.
- A UI "Install prebuilts" button on the `/automations` list page.
  The API works today; the button ships when the page gets its
  refresh.

## Operator gate

**Agent-handleable** (curl while authenticated):

1. `POST /api/automations/seed` with empty body. Verify response
   `{ ok:true, installed:[5 keys], replaced:[], skipped:[] }`.
2. Re-run → expect `installed:[], skipped:[5 keys]`.
3. Re-run with `{ replace: true }` → expect `replaced:[5 keys]`,
   `installed:[5 keys]`, `skipped:[]`. The previous incarnations
   should be soft-deleted in DB.

## Follow-ups

- Onboarding completion hook → call the seed.
- "Restore defaults" UI button per prebuilt on the list page.
- Per-tenant prebuilt customisation surface (e.g. swap the
  default fallback_template strings without forking the workflow).
