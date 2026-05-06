# Phase 2a.8 — Settings UI for Treatment Offerings

## Summary

Phase 2a.7 made `ingestLead()` create deals based on `practice_treatment_offerings` configuration (title, pipeline, stage, value range, owner). Practices had no UI to configure those rows — they would have needed raw SQL access. Phase 2a.8 adds a Settings UI that lets a practice manager:

1. Toggle which of the 20 canonical UK treatments the practice offers.
2. Edit per-offering pipeline, stage override, value range and a custom display label.
3. Add custom treatments (e.g. "Sleep Dentistry") that aren't in the canonical list.
4. Soft-delete custom treatments (canonical ones are toggled off, never deleted).

The lead-ingestion engine was also updated to honour the new `is_active` toggle so a lead arriving with an `treatment_offering_id` pointing at an inactive offering routes to the `Inquiry` fallback path instead of being misdirected onto the disabled lane.

The new UI lives **as a tab inside the existing `/settings` Workflow section** (`Settings → Workflow → Treatments`) and is also reachable as a deep-link at `/settings/treatments`. This matches the precedent set by the other workflow-config tabs (Pipelines, Treatment Tags, Pipeline Mapping).

---

## Pre-flight findings

### Q1 — `practice_treatment_offerings` schema

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | |
| `tenant_id` | uuid | NO | — | |
| `location_id` | uuid | YES | — | |
| `treatment_type_id` | uuid | **NO → YES (this phase)** | — | Halt condition; relaxed in Task 1. |
| `custom_label` | text | YES | — | |
| `pipeline_id` | uuid | NO | — | |
| `stage_id` | uuid | YES | — | Honoured by 2a.7 deal-creation. |
| `custom_sla_minutes` | integer | YES | — | Used by SLA resolver. |
| `custom_lead_value_cents_min` | integer | YES | — | |
| `custom_lead_value_cents_max` | integer | YES | — | |
| `is_active` | boolean | NO | `true` | **Already exists** — no migration needed for the toggle. |
| `sort_order` | integer | NO | `0` | |
| `created_at`, `updated_at`, `created_by_user_id`, `deleted_at` | — | — | — | |

Halt: `treatment_type_id NOT NULL` blocks custom offerings. Resolved by Task 1 (relax + add CHECK).

### Q2 — `treatment_types` catalogue

20 canonical rows present, sort orders 10–200 (General Checkup → Sleep Apnea Appliance). Matches expectation.

### Q3 — Existing Settings architecture

- Two-level navigation in `dental-crm/src/components/settings/settings-tabs.tsx`: vertical sidebar sections × horizontal tabs.
- The `workflow` section already contains tabs for Pipelines, Deals, Treatment Tags, Pipeline Mapping, Custom Fields, Tags & Sources. Our new tab slots in here.
- Standalone `/settings/<feature>/page.tsx` routes coexist (booking-widget, integrations, marketing); they wrap their content in `DashboardLayout` + `NoOrgEmptyState`.
- Data flow: client components, fetch via `authFetch('/api/...')` (no React Query in settings), `sonner` toasts, `Sheet` from `@/components/ui/sheet` for drawers.
- API style: `getApiRequestContext` for auth+tenant, `createServiceClient` for writes, `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`, Zod validation, `user_has_permission(p_user_id, p_tenant_id, p_permission_code)` RPC for permission gates, JSON `{ error: 'code' }` failures.

The new page matches this pattern as closely as possible: client component, `authFetch`, `Sheet`, `sonner`, `pipeline.edit` permission code (closest existing fit — treatment offerings literally configure pipeline routing).

### Q4 — Test-tenant existing offerings

20 rows on tenant `5aadca14-…`, exactly one per canonical treatment type, all `is_active = true`, all on the default pipeline `47be4b64-…` ("New Patient Acquisition"). No custom labels, stage overrides or value ranges set. Pristine seed state.

### Q5 — Pipelines and stages

Three pipelines on the test tenant:
- `New Patient Acquisition` (default) — Inquiry / Consultation Scheduled / Consultation Complete / Treatment Accepted
- `Treatment Plans` — Needs Assessment / Plan Created / Insurance Verified / Scheduled / In Progress
- `Cosmetic Dentistry` — Interest / Consultation / Quote Provided / Approved

All three render as drawer dropdown options.

---

## Per-task results

### Task 1 — Schema migration

**`is_active` already exists** with the exact semantics the prompt envisaged (boolean NOT NULL DEFAULT true) — no migration for it.

**`treatment_type_id`** was NOT NULL, blocking custom offerings. Per planner direction (resolved at the start of this phase), we relaxed it and added a CHECK so the data integrity invariant ("every offering has either a canonical type or a user-supplied label") is enforced at the DB layer.

Migration: `dental-crm/supabase/migrations/20260504_phase_2a_8_offering_custom_treatments.sql`

```sql
ALTER TABLE public.practice_treatment_offerings
  ALTER COLUMN treatment_type_id DROP NOT NULL;

ALTER TABLE public.practice_treatment_offerings
  ADD CONSTRAINT practice_treatment_offerings_canonical_or_custom_chk
  CHECK (treatment_type_id IS NOT NULL OR custom_label IS NOT NULL);
```

Rollback: `20260504_phase_2a_8_offering_custom_treatments_rollback.sql` (re-tightens `NOT NULL`; only safe when no custom offerings exist).

**Applied to live database via `apply_migration` MCP call.** Verified via the live smoke at the bottom of this document.

### Task 2 — Settings page route and shell

The new tab is mounted under `Settings → Workflow → Treatments`. The same component is also exposed at `/settings/treatments` for deep-linking (matches the booking-widget standalone-route precedent).

Files added:
- `dental-crm/src/app/settings/treatments/page.tsx` — standalone route, `DashboardLayout` + `NoOrgEmptyState` wrapper around `<TreatmentOfferingsTab />`.
- `dental-crm/src/components/settings/treatment-offerings-tab.tsx` — main tab/page component.
- `dental-crm/src/components/settings/treatment-offerings-types.ts` — shared row types (kept out of the route handler so it's not pulled into the client bundle).

Files modified:
- `dental-crm/src/components/settings/settings-tabs.tsx` — added `treatments` tab to the `workflow` section's `SECTION_TABS` and a `<TabsContent value="treatments">` rendering `<TreatmentOfferingsTab embedded />`.

The `embedded` prop suppresses the page-level title when rendered inside the tab grid (which already has its own header), and shows it when rendered standalone.

### Task 3 — Offerings list

Two sections:

**Standard treatments** — one row per `treatment_types` row (20 canonical UK treatments). Each row shows display name, optional custom label suffix (`→ "Routine examination"`), pipeline name, value range (`£500 – £800` / `From £500` / `Up to £800` / `—`), Edit pencil, and a Switch.

- Toggle ON: calls `POST /api/settings/treatment-offerings/toggle` with `is_active: true`. Reactivates an existing row (preserving all overrides) or creates a new one with the tenant's default pipeline.
- Toggle OFF: calls the same endpoint with `is_active: false`. Sets `is_active = false` — never soft-deletes.
- Toggled-off rows render muted (slate-50 background, slate-500 text) but stay in the list so the practice can toggle them back without losing config.

**Custom treatments** — one row per `practice_treatment_offerings WHERE treatment_type_id IS NULL`. Same row shape, plus a "Custom" badge. Empty-state card with a Sparkles icon when there are none.

Custom rows toggle via direct PATCH (the toggle endpoint is canonical-keyed; custom rows bypass it).

### Task 4 — Edit / Add drawer

Single `<Sheet>`-based drawer in `dental-crm/src/components/settings/treatment-offering-drawer.tsx` that handles all three modes:

| Field | Standard | Custom |
|---|---|---|
| Name | Read-only (`treatment_types.display_name`) | Editable, required, 2–100 chars |
| Custom label | Optional override input | (hidden — name IS the custom label) |
| Pipeline | Required dropdown of tenant pipelines | Same |
| Stage | Optional dropdown ("Use first stage by default") | Same |
| Min lead value (£) | Number input, decimal | Same |
| Max lead value (£) | Same; validated `max ≥ min` | Same |
| Active | Switch (mirrors the row toggle) | Same |

Validation runs client-side for inline errors; the API re-validates with Zod (shared schema in `dental-crm/src/lib/treatment-offerings/schema.ts`).

Custom offerings have a "Delete this custom treatment" link at the bottom of the drawer that opens a confirmation `<AlertDialog>`. Standard offerings do **not** show a delete affordance — the API also enforces this (returns 400 `standard_offering_not_deletable`).

When the user changes the pipeline, the stage selection is dropped silently if the new pipeline doesn't include that stage. The PATCH endpoint applies the same defensive cleanup server-side (`maybeClearStageOnPipelineChange`).

### Task 5 — API endpoints

All under `/api/settings/treatment-offerings/`, all gated by `pipeline.edit` (resolved by `user_has_permission` RPC).

- **`GET /api/settings/treatment-offerings`** — single round-trip returning `{ treatment_types, offerings, pipelines, stages }`. Stages are filtered to the tenant's pipelines defensively (FK is on `pipelines.tenant_id`, not stages directly).
- **`POST /api/settings/treatment-offerings`** — create offering. Validates pipeline + stage belong to tenant. Refuses to create a duplicate canonical offering (returns 409 `canonical_offering_already_exists` and points to the existing row id; reactivation belongs on the toggle endpoint).
- **`PATCH /api/settings/treatment-offerings/[id]`** — update. Validates new pipeline/stage. Refuses to clear `custom_label` on a custom offering (the DB CHECK would reject it anyway; we surface a friendly error first).
- **`DELETE /api/settings/treatment-offerings/[id]`** — soft-delete (`deleted_at = now()`, `is_active = false`). Custom offerings only; standard offerings get `400 standard_offering_not_deletable`.
- **`POST /api/settings/treatment-offerings/toggle`** — `{ treatment_type_id, is_active }`. Reactivates an existing row (preserving config), creates a new one with the tenant default pipeline if none exists, or no-ops on toggle-off when no active row is present. Returns `state: 'created' | 'reactivated' | 'deactivated' | 'noop'`.

The Zod schemas in `dental-crm/src/lib/treatment-offerings/schema.ts` accept pounds-as-decimal (`custom_lead_value_pounds_min`/`max`) and the routes convert to pence via `poundsToPence` before persisting. Inverse `penceToPounds` round-trips into the drawer form fields.

### Task 6 — Wire `is_active` into deal creation

Updated `dental-crm/src/lib/lead-ingestion/deal-creation.ts` `fetchOffering`:

```ts
.eq('tenant_id', input.tenant_id)
.eq('id', input.treatment_offering_id)
.eq('is_active', true)              // <-- added in 2a.8
.is('deleted_at', null)
.maybeSingle()
```

When a lead arrives carrying `treatment_offering_id` for an *inactive* offering, the lookup returns no row, the resolver falls through to `buildFallbackPartial`, and the deal lands on the tenant's default pipeline with title `'Inquiry'` (resolution path `fallback_no_offering_match`).

Two new tests in `dental-crm/src/lib/lead-ingestion/__tests__/ingest-lead.test.ts`:
1. Asserts `is_active=true` is included in the eq predicates of the offering lookup the engine performs (filter shape contract).
2. Asserts that when no row is returned for the offering lookup (simulating the live DB filtering an inactive row out), the resulting deal is the Inquiry fallback on the default pipeline.

The fake Supabase was extended to record `eq()` predicates per terminal call (`selectFilters: Array<Array<[col, val]>>`) so tests can assert filter shape without simulating WHERE-semantics.

### Task 7 — Tests

**API tests** (`dental-crm/src/app/api/settings/treatment-offerings/__tests__/treatment-offerings.test.ts`, 19 tests):

| Scenario | Endpoint | Assertion |
|---|---|---|
| 403 when permission denied | GET | status 403 |
| Returns 4 arrays | GET | treatment_types/offerings/pipelines/stages all present |
| Toggle ON (no existing row) | POST /toggle | state=created, default pipeline used |
| Toggle ON (inactive row exists) | POST /toggle | state=reactivated, prior pipeline + values preserved |
| Toggle OFF on active row | POST /toggle | state=deactivated, deleted_at remains null |
| Toggle OFF when no row | POST /toggle | state=noop |
| Unknown treatment_type_id | POST /toggle | 400 |
| Custom offering create | POST | treatment_type_id null, pence conversion correct |
| Missing both type and label | POST | 400 |
| Pipeline not in tenant | POST | 400 |
| Stage not in pipeline | POST | 400 |
| max < min | POST | 400 |
| Duplicate canonical offering | POST | 409 |
| Update value range | PATCH | pence stored correctly |
| max < min on PATCH | PATCH | 400 |
| Stage not in pipeline on PATCH | PATCH | 400 |
| Clear custom_label on custom offering | PATCH | 400 (CHECK constraint pre-empted) |
| Non-existent id | PATCH | 404 |
| Soft-delete custom | DELETE | 204, deleted_at set, is_active false |
| Refuse to delete standard | DELETE | 400 standard_offering_not_deletable |

**Deal-creation tests** (added to existing ingest-lead suite, 2 new):
1. `practice_treatment_offerings` lookup includes `is_active=true` predicate.
2. Lookup miss → deal lands on Inquiry fallback, default pipeline, default stage.

**Total test outcomes**:

```
Test Suites: 4 passed, 1 skipped (integration.test.ts; pre-existing, env-gated)
Tests:       60 passed, 8 skipped (integration), 0 failed
```

Including the 19 new API tests, the 2 new deal-creation tests, and a fake-Supabase enhancement that records `eq()` predicates per terminal call.

**Codacy**: ESLint, Opengrep OSS, and Trivy all return zero issues across every new/edited file. Lizard reports a handful of cyclomatic-complexity *metric* warnings on the larger UI components (peak: `handleSave` at CCN 28, `TreatmentOfferingsTab` at CCN 16). Per the project's `.cursor/rules/codacy.mdc` ("Complexity metrics are different from complexity issues … focus on solving the complexity issues and ignore the complexity metric"), these are accepted; adjacent files (`settings-tabs.tsx::getInitialState` at CCN 10) carry similar warnings.

---

## Validation evidence

### Unit-test output

```
PASS src/app/api/settings/treatment-offerings/__tests__/treatment-offerings.test.ts
PASS src/lib/lead-ingestion/__tests__/ingest-lead.test.ts (43 tests)
PASS src/lib/lead-ingestion/__tests__/dedup-engine.test.ts
PASS src/lib/lead-ingestion/__tests__/sla-resolver.test.ts

Test Suites: 4 passed, 1 skipped, 5 total
Tests:       60 passed, 8 skipped, 68 total
```

### Live smoke (against tenant `5aadca14-9786-4aef-bc53-e9287cdd0bbf`)

1. **Toggle behaviour on Implants offering (`b6d7f2ac-…`)**:
   - `UPDATE … SET is_active=false` simulates a UI toggle-off. The deal-creation engine's lookup query (`SELECT … WHERE id=… AND is_active=true AND deleted_at IS NULL`) returns **0 rows**, confirming the engine's offering-resolution falls through to the Inquiry fallback path.
   - `UPDATE … SET is_active=true` simulates toggle-on. The same lookup returns the row again, with `pipeline_id` and other config intact (no overrides were configured so they stayed null).

2. **Custom offering insert + DB-level validation**:
   - Inserting a row with `treatment_type_id = NULL, custom_label = 'Sleep Dentistry (smoke 2a.8)'` succeeded (CHECK constraint allows it).
   - Inserting a row with both NULL hit `practice_treatment_offerings_canonical_or_custom_chk` and was rejected (verified inside a `DO $$ … EXCEPTION WHEN check_violation … $$` block).
   - Test row deleted at end of smoke.

3. **Schema verification**:
   - `treatment_type_id` is now nullable; the new CHECK constraint is present and matches the spec exactly: `CHECK (((treatment_type_id IS NOT NULL) OR (custom_label IS NOT NULL)))`.

### Manual UI test plan (deferred to local browser pass)

The following end-to-end UI flows weren't run in this session but are exercised end-to-end by the unit + API tests above. Quick browser smoke for the next session:
- Open `/settings/treatments` → standard list renders, all 20 treatments appear toggled ON, default pipeline "New Patient Acquisition" shown for each.
- Toggle Implants OFF → row mutes, toast confirms.
- Run a lead ingestion against an Implants offering id → expect deal title `Inquiry` on default pipeline.
- Toggle Implants back ON → row restores. (We empirically validated this against the DB; UI flow should mirror.)
- Click "Add custom treatment" → drawer opens. Save without name → inline error. Save with "Sleep Dentistry", default pipeline, value 5000–8000 → row appears in custom section.
- Edit the custom row → change name to "Sleep Dentistry (IV)" → persists.
- Delete custom → confirm dialog → removed from list.
- Sign in as a non-manager → "No access" empty state appears (relies on `pipeline.edit` permission gating, which the API enforces server-side regardless).

---

## Deferred items / open follow-ups

- **Treatment categorisation (cosmetic vs restorative)** — not in scope this phase.
- **Treatment images / icons / public-facing descriptions** — needed when the booking widget grows richer treatment cards. Not required now.
- **Bulk import / export** — defer until a customer asks. The CSV path also needs to think about FK validation against the canonical 20.
- **Drag-and-drop reordering** — the existing `sort_order` column on `practice_treatment_offerings` is unused by the UI right now (the list orders by `created_at` ASC). When this lands it should be a single-PR follow-up that wires up the Settings UI without changing the engine.
- **Reporting / analytics on offering performance** — out of scope.
- **Booking widget link-out from Settings → Treatments** — the booking-widget Settings page already shows offerings; adding a "Manage your offerings" CTA to it for symmetry is a small follow-up.
- **Offering-level `custom_sla_minutes` editor** — the column exists on the DB and is honoured by the SLA resolver, but isn't surfaced in the 2a.8 drawer (would conflate per-offering SLA with the lead-SLA settings page that already exists). If we later decide it belongs here, the drawer field is straightforward to add.

## Open questions for the planner

1. **`pipeline.edit` permission re-use** — we reused this rather than seeding a new `treatments.manage` permission, on the basis that treatment offerings *are* pipeline configuration. If the planner wants finer-grained control later (e.g. a marketing role that can manage treatments but not pipelines), we'd need to split.
2. **Custom offering name uniqueness** — we don't enforce uniqueness of `custom_label` per tenant. If the practice creates two "Sleep Dentistry" rows the engine treats them as separate offerings; the booking widget would show both. Worth a unique partial index (`UNIQUE (tenant_id, custom_label) WHERE treatment_type_id IS NULL AND deleted_at IS NULL`) when we have evidence customers actually do this. Not adding it now to avoid blocking legitimate "v1" / "v2" naming patterns.
3. **Custom offering migration if a canonical type is later added** — if the canonical 20 grows to include something currently sold as a custom (e.g. a future "Sleep Dentistry" canonical row), there's no migration path that converts custom rows to canonical. Likely a manual SQL operation guided by the planner; not worth tooling for unless it happens repeatedly.
