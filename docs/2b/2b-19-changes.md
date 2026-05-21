# Phase 2b.19 — Automation CRUD API

> Part 7 of 11 in `docs/2b/automations-master-plan.md`.

## What changed

New routes under `/api/automations/*`:

- **GET `/api/automations`** — list. Filters: `?status=`, `?category=`,
  `?q=` (name ilike). Tenant-scoped via session. Returns 200 with
  `{ ok, automations: [...] }`.
- **POST `/api/automations`** — create. Body validated by Zod
  (`name`, `category`, `trigger_type`, `graph_json`, optional
  `description`, `trigger_config`, `workflow_config`, `tags`). Always
  inserts as `status='draft'` regardless of body. Body `tenant_id`
  must match session or 403.
- **GET `/api/automations/[id]`** — fetch one. 404 if not found or
  soft-deleted on this tenant.
- **PATCH `/api/automations/[id]`** — update. Partial Zod schema —
  any subset of fields. Status transitions to/from `active`,
  `paused`, `archived` write an **audit-first** row via
  `logAuditServer` with category `setting`, entity_type `automation`,
  changed_fields `['status']`. Audit insert failure returns 500
  `audit_log_failed`; mutation failure compensating-deletes the
  audit row. Activate transition stamps `activated_at` +
  `activated_by_user_id`.
- **DELETE `/api/automations/[id]`** — soft-delete via `deleted_at`,
  flips `status='archived'`. Audit-first, same pattern.
- **POST `/api/automations/[id]/clone`** — creates a draft copy
  with `name = "<original> (copy)"`.
- **POST `/api/automations/install-template`** — body
  `{ template_id }`. Pulls from `lib/automations/prebuilt-workflows.ts`
  `getWorkflowTemplate()` and converts the legacy `actions[]` shape
  into a `graph_json` (trigger → linear chain of nodes → end).
  Inserts as `status='draft'`. 2b.22 will rework the underlying
  templates to include the inbound workflows; the route stays the
  same.

All routes:
- Auth via `requireAuthenticatedTenantUser` — body `tenant_id` cannot
  override session.
- Service-role Supabase client (already required for `audit_trail`
  writes per the locked principle).
- Tenant filter is re-applied on every query even though RLS would
  enforce it — for clean 404s instead of presence leakage.

## What's not changed (intentional)

- Existing `/automations` page + slide-over still write via the
  browser Supabase client. Cutover to the new API ships alongside
  the 2b.20 wizard refactor so we don't churn the page twice.
- No new permission code. Reuses existing tenant-scoped RLS +
  session-derived tenant — no `automations.publish` permission yet
  (CLAUDE.md "don't add new permission codes without checking the
  catalog"). Anyone in the tenant can publish; finer-grained checks
  belong to a future RBAC pass.

## Tests

Existing 28 automation tests still pass. Dedicated route tests
deferred to the 2b.23 sweep.

## Operator gate

**Agent-handleable** (curl the live API):

1. Hit `POST /api/automations` with a valid draft. Verify the row
   lands in DB.
2. Hit `PATCH /api/automations/[id]` setting `status='active'`.
   Verify a row appears in `audit_trail` with
   `entity_type='automation'`, `changed_fields=['status']`,
   `description LIKE 'Automation status: draft → active'`.
3. Hit `DELETE /api/automations/[id]`. Verify `deleted_at` is set
   and a fresh `audit_trail` row exists with
   `action_type='delete'`.

## Follow-ups

- Switch the existing pages/slide-over to `authFetch()` against
  these routes (with 2b.20 wizard).
- Add `automations.publish` / `automations.delete` permission codes
  when the next RBAC pass lands.
- Integration test that asserts the audit row shape on publish (per
  CLAUDE.md "must SELECT the real audit_trail row").
