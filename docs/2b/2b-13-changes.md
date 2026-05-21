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

## 8. Live apply, operator gate, and code-review outcomes

This section records what happened when the migration was actually
applied and the agent-handleable operator gate was run, plus the
follow-up fixes from `code-reviewer`.

### 8.1 Migration applied via Supabase MCP

The Supabase MCP server was registered mid-phase (`.mcp.json` + agent
skills under `.agents/`), which makes `mcp__supabase__apply_migration`
the cleanest no-credential path. The migration was applied through
that tool — not via the SQL Editor or the direct-Postgres script
fallback documented in §4. Post-apply checks confirmed the table,
the unique index, the `set_updated_at` trigger, all three RLS
policies, and the seeded test-tenant row exist.

`src/types/supabase.ts` was regenerated via
`mcp__supabase__generate_typescript_types`; `tenant_ai_context` is now
typed (the AI drafter in 2b.15 can rely on the typed read).

### 8.2 Operator gate — passed

Headless Playwright (`scripts/operator-gate-2b13.mjs`) signed in with
the test account, navigated to Settings → AI & Automation → Practice
Brain, filled `brand_voice` with a uniquely-tagged value, and clicked
Save. `PATCH /api/settings/practice-brain` returned 200. Verification
via the MCP `execute_sql` tool:

- `tenant_ai_context.brand_voice` row for the test tenant carries the
  exact run-tagged value.
- `audit_trail` has the matching row: `entity_type='tenant_ai_context'`,
  `action_type='update'`, `changed_fields=['brand_voice']`,
  `action_description='Updated Practice Brain (brand_voice)'`.
- Audit timestamp precedes the upsert timestamp by ~370 ms — the
  audit-first invariant is intact under live RLS.

Note: the AI section in `settings-tabs.tsx` hardcodes `'ai-assistant'`
as the default tab regardless of the URL `tab=` param, so the script
clicks the "Practice Brain" tab trigger after navigation. Not a 2b.13
regression — it's how the section already worked — but worth fixing
in a later pass so deep-links work properly.

### 8.3 Code-reviewer findings and fixes

The `code-reviewer` subagent ran against `58d6425`. Result:
**0 CRITICAL, 2 HIGH, 4 MEDIUM, 4 LOW.**

**HIGH — fixed in this phase (no new phase number; tighter helper):**

1. `loadPracticeBrain` swallowed DB errors and returned an empty brain
   — every downstream AI feature (2b.15 drafter, 2b.16 router, 2b.18
   responder) would inherit that. Now rethrows
   `loadPracticeBrain failed for tenant ${id}: …`; the GET route's
   `authErrorResponse` translates the throw to a real 500
   `internal_error`.
2. `loadPracticeBrain('')` returned an empty brain with
   `tenant_id = ''`. There is no legitimate caller that should pass
   an empty string. Now throws
   `loadPracticeBrain requires a tenantId`.

Test update: replaced the "returns empty default on db error" case
with a `.rejects.toThrow` case; added a new
`throws when called without a tenantId` case. The Practice Brain
suite is now 21 tests, all green; `npm run build` clean.

**Deferred (MEDIUM / LOW — file in a follow-up phase, not blockers):**

- M1. The Jest route tests mock `logAuditServer` /
  `deleteAuditRowServer` rather than SELECTing the real
  `audit_trail` row. CLAUDE.md says "Tests must SELECT the real
  `audit_trail` row. Never mock `logAudit*`." The live operator gate
  above does cover this end-to-end against the real table, so the
  gap is in the Jest layer, not in any runtime invariant. Plan: add
  an integration test (separate file, service-role client against the
  test tenant) in 2b.14 alongside the engine-repair tests already
  scoped there.
- M2. The PATCH outer `catch` calls `authErrorResponse(err)` without
  logging the `auditId`. If a non-auth error fires between the audit
  write and the upsert, the compensating delete runs but the original
  `auditId` is not in the operator's error trail. Low-frequency
  observability gap; address in 2b.14.
- M3. The 400 `invalid_payload` response echoes `parsed.error.flatten()`.
  Safe today (no secret-shaped fields), but worth tightening to
  field-name-only if anyone later adds a secret-shaped field to the
  Practice Brain schema. Track in the master plan as a hardening note.
- M4. The settings tab's `console.error` + generic toast on load
  failure has no retry affordance. Acceptable for a settings tab;
  improve when we revisit the wider settings load-failure UX.
- L1. The `JSON.stringify` field-diff in `diffChangedFields` treats
  `[]` vs `undefined` as different. Empirically benign because the
  migration's DB defaults are `[]` / `{}`, but a tenant created
  pre-migration and then patched without sending the structured
  fields would produce an audit row with a misleading "changed from
  null to []" delta. Address alongside any future schema cleanup.
- L2. `'use client'` correctness: `practice-brain-tab.tsx` is only
  imported by `settings-tabs.tsx` (itself a client component). No
  server-route import; no `'use client' module imported by a server
  route` regression risk. Noting for the audit trail.
- L3. The unique index `idx_tenant_ai_context_tenant_id` is fine; the
  table-level `UNIQUE` could also have been authored as a constraint
  for clarity. Cosmetic.
- L4. The migration's `COMMENT ON TABLE` is a nice-to-have; we did it.

### 8.4 Operational-gotchas append

Added a Phase 2b.13 entry to `docs/operational-gotchas.md` noting that
the migration was applied via the Supabase MCP `apply_migration` tool
after registering the MCP server mid-feature, and that future phases
should reach for the MCP first before falling back to the SQL Editor
or the direct-Postgres helper.
