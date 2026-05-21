# Phase 2b.13 — Practice Brain foundation

> **Status:** code on disk + tests green; migration awaiting apply on remote.
> Part 1 of 11 in the Automations master plan (`docs/2b/automations-master-plan.md`).

## 0. Why this phase exists

The Automations feature has two AI surfaces (nurture workflows and the
always-on FAQ responder) plus pipeline routing — and Toffee's product
direction puts a single tenant-level knowledge hub at the centre of all
of them: brand voice, services, pricing, opening hours, FAQs, escalation
rules. Building anything downstream first would mean rework, so this
phase ships the schema, helper, API and UI before the engine repair and
drafter work in 2b.14 / 2b.15.

## 1. What changed

### 1.1 Schema — `tenant_ai_context`

`supabase/migrations/20260521_phase_2b_13_tenant_ai_context.sql`

- New table with one row per tenant: `brand_voice`, `practice_description`,
  `services_offered` (jsonb array), `pricing` (jsonb array),
  `opening_hours` (jsonb object), `faqs` (jsonb array),
  `escalation_rules`, `additional_instructions`, plus `created_at` /
  `updated_at`.
- `UNIQUE` partial index on `tenant_id` (one row per tenant).
- `BEFORE UPDATE` trigger via the canonical `set_updated_at()` function.
- RLS:
  - SELECT — `tenant_id = ANY (get_accessible_tenants())`
  - INSERT/UPDATE — same + `user_has_permission(uid, tenant_id, 'settings.integrations.manage')`
  - No new permission code added (per CLAUDE.md "don't add new permission
    codes without checking the catalog" — no `settings.ai.*` exists today).
- Seeds the test tenant (`5aadca14-9786-4aef-bc53-e9287cdd0bbf`) with an
  empty row.
- Rollback file alongside: `..._rollback.sql` (drops table cascade).

### 1.2 Helper — `src/lib/automations/practice-brain.ts`

- `loadPracticeBrain(tenantId)` — service-role read; returns the empty
  default if no row exists yet, so callers never null-check.
- `buildPracticeBrainPromptFragment(brain)` — turns the brain into a
  system-prompt fragment for AI features (drafter, FAQ responder,
  pipeline router). Omits sections with no content to save tokens.
- Type surface: `PracticeBrain`, `ServiceOffering`, `PricingItem`,
  `FaqItem`, `OpeningHours`.

### 1.3 API — `src/app/api/settings/practice-brain/route.ts`

- `GET` — returns the current tenant's brain (or empty default).
- `PATCH` — partial update. Auth: `requireAuthenticatedTenantUser`. Body
  validation via Zod (rejects empty service names, malformed FAQ rows,
  unrecognised fields).
- Audit-first invariant: writes `audit_trail` with
  `category='setting'`, `entityType='tenant_ai_context'`,
  `changedFields=[...]` BEFORE the upsert. If audit insert fails →
  500 `audit_log_failed`. If upsert fails after audit → compensating
  delete via `deleteAuditRowServer`.
- No-op fast path: PATCH with values matching the current state returns
  200 without writing an audit row.

### 1.4 UI — `src/components/settings/practice-brain-tab.tsx`

- New tab under Settings → AI & Automation → Practice Brain (first tab
  in the section).
- 8 cards: practice description, brand voice, services, pricing,
  opening hours (per-day rows with "Closed" toggle), FAQs, escalation
  rules, additional instructions.
- Sticky save bar at the bottom; the button enables only when state has
  diverged from the last loaded snapshot.
- Reads/writes via `authFetch('/api/settings/practice-brain')`.

### 1.5 Tabs wiring — `src/components/settings/settings-tabs.tsx`

- Adds `{ id: 'practice-brain', label: 'Practice Brain' }` as the first
  entry under the `ai` section.
- Mounts `<PracticeBrainTab />` in `renderAITabs`.

## 2. Tests

`src/lib/automations/__tests__/practice-brain.test.ts` (10 cases):

- `emptyPracticeBrain` shape.
- `loadPracticeBrain` happy path, no-row path, db-error path, malformed
  jsonb fallback.
- `buildPracticeBrainPromptFragment` empty case, text-only case,
  structured-list case, skip-rows-with-missing-fields case.

`src/app/api/settings/practice-brain/__tests__/route.test.ts` (10 cases):

- GET 401 / GET 200.
- PATCH 401, PATCH 403 (tenant mismatch), PATCH 400 (invalid services,
  no recognised fields), PATCH 200 no-op (returns without writing audit).
- PATCH happy path: asserts `audit` is logged BEFORE `upsert` (call
  order), asserts audit payload shape (`actionType='update'`,
  `category='setting'`, `entityType='tenant_ai_context'`, `changedFields`
  contains the actual changed key).
- PATCH audit-insert-fails: 500 with `audit_log_failed`, no upsert.
- PATCH upsert-fails-after-audit: compensating delete called with the
  audit id and tenant id.

Run: `npx jest --testPathPattern="practice-brain|automations/practice"` →
20 passed.

## 3. Validation

| Step | Result |
|------|--------|
| `npx tsc --noEmit` on new files | 0 errors in new files; pre-existing baseline noise elsewhere unchanged |
| `npx jest` (settings + automations + auth helpers) | 94 passed, 0 failures |
| `npm run build` | green, `/settings` page +84.3 kB |

## 4. Migration apply

`supabase db push --linked` is still blocked by remote-only migration
drift (documented in `docs/operational-gotchas.md` §Phase 2b.11 Migration
apply). The canonical paths used by previous phases are Supabase MCP
`apply_migration` (not available in this session — MCP not connected)
or the direct-Postgres script with `SUPABASE_DB_PASSWORD` set (password
not available in `.claude/test-credentials.json`).

**Apply path for this phase:** Toffee runs the SQL from
`supabase/migrations/20260521_phase_2b_13_tenant_ai_context.sql` in the
Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → run).
This is the simplest no-credential path; it bypasses both `db push` and
the direct-Postgres helper. After apply, recording the version in
`supabase_migrations.schema_migrations` is a follow-up housekeeping
step.

## 5. Operator gate (agent-handleable, deferred to live verification)

After the migration is applied and code deployed:

1. Log into the CRM with the test account.
2. Navigate to Settings → AI & Automation → Practice Brain.
3. Save a brand voice value (e.g. "Warm, professional, never use
   'dear sir/madam'").
4. Verify the row was upserted:
   ```sql
   SELECT brand_voice, updated_at FROM tenant_ai_context
   WHERE tenant_id = '5aadca14-9786-4aef-bc53-e9287cdd0bbf';
   ```
5. Verify the audit_trail row was written:
   ```sql
   SELECT entity_type, changed_fields, action_description, created_at
   FROM audit_trail
   WHERE tenant_id = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
     AND entity_type = 'tenant_ai_context'
   ORDER BY created_at DESC LIMIT 1;
   ```

## 6. What's NOT in this phase

- FAQ responder `faq_responder_enabled` toggle (ships in 2b.18 with the
  responder itself).
- Per-tenant onboarding hook that seeds a fresh `tenant_ai_context` row
  on tenant creation (ships in 2b.22 alongside the prebuilt workflows
  seeding).
- Generated TypeScript types for `tenant_ai_context` in
  `src/types/supabase.ts` — regen happens via `supabase MCP
  generate_typescript_types` post-apply (or manual edit). Routes use
  service-role queries and don't require typed Database entries.

## 7. Follow-ups

- After migration apply, record the migration in
  `supabase_migrations.schema_migrations` to clear future `db push`
  drift on this version.
- Regenerate `src/types/supabase.ts` to include `tenant_ai_context`
  before 2b.15 (the AI drafter will need the typed read).
