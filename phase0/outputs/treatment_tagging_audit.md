# Treatment Tagging & Routing Audit

> **Branch (intended):** `phase-2a-treatment-audit` (audit-only, no code changes made).
> **Repo audited:** `/Users/deepak/auth-app/dental-crm` (the active CRM codebase).
> **Live DB schema reference:** `dental-crm/phase0/outputs/reconciliation_report.md` (Phase 0).
> **Date:** 2026-05-03.
> **Deliverable:** this report. No code edited, no migrations created, no behaviour changed.

A second copy of this file is also written under the audit-relative path used by the prompt: `phase0/outputs/treatment_tagging_audit.md`. The Audit and Analysis copy (this file) is the canonical one.

---

## Executive summary (5 lines)

1. The CRM ships a **single-tier "Treatment Tag" system** (`treatment_tags`, `treatment_tag_pipeline_mappings`, `treatment_routing_logs`, `tenant_routing_settings`, plus `pms_procedure_tag_mappings`). It is per-tenant, with optional per-location overlays — there is **no canonical, system-managed treatment library**. Every practice defines its own tag set from scratch.
2. The routing engine (`src/lib/treatment-routing/routing-engine.ts`) is well-structured (4-tier: user override → tag mapping → AI keyword match → value-based → unsorted fallback) and writes a complete audit trail to `treatment_routing_logs`. It works as designed when called correctly.
3. **Every lead-capture call site is calling the public `quickRouteDeal` API with the wrong shape** — they pass an object literal where the function signature expects `(tenantId: string, treatmentTags: string[])`. This means form submissions, lead-intake webhooks, and PMS-proposed-treatment webhooks **silently route every deal to the "Unsorted" fallback** (or fail when the engine tries to insert with a bogus tenant_id). This is the most important finding.
4. There are **two parallel "treatment configuration" UIs** (the legacy `localStorage`-backed `TreatmentConfig` in `src/components/settings/treatment-config.tsx`, and the DB-backed `TreatmentTagsSettings` in `src/components/treatment-routing/treatment-tags-settings.tsx`), plus a migration wizard. Only the DB-backed one is wired into `settings-tabs-v2.tsx`. The legacy code path is still readable by `deal-categorization.ts` for backward compatibility.
5. The Phase 2a target model (canonical `treatment_types` + per-practice `practice_treatment_offerings` + `treatment_offering_id` on `contacts`/`lead_intent_sessions`/`practice_booking_widgets`) **does not exist anywhere** in the codebase or the live DB. The closest existing concept is `treatment_tags` (which is per-tenant, not canonical) and `dental_services` (which is dead — referenced only by the lead-intake webhook but classified as dead schema in §5 of the Phase 0 reconciliation report).

**Recommended option: B — build the new two-layer canonical/overlay model alongside `treatment_tags`** and let the existing system continue serving the deal-routing use case until Phase 2a's widget flow is proven, then migrate. (Reasoning at §5.)

---

## §1 — What exists

### 1.1 Tables

The treatment-tagging system spans **5 dedicated tables**, plus columns on `deals`, `treatment_plans` (PMS), and `deal_settings`. There is no `treatment_categories` table, no `treatment_types` table, no `practice_treatment_offerings` table. Source of truth: `dental-crm/supabase/sql/45_treatment_routing.sql`, `46_treatment_routing_permissions.sql`, `47_pms_procedure_tag_mappings.sql`, `44_pms_integration.sql`, `48_demo_treatment_routing_data.sql`.

| # | Table | Purpose | Key columns |
|---|---|---|---|
| 1 | `treatment_tags` | Per-tenant (optionally per-location) tag definitions used to categorise deals and drive routing. The closest thing to a "treatment list" the system has. | `id`, `tenant_id`, `location_id`, `name`, `description`, `keywords text[]`, `color`, `icon`, `category` (free text: `high_value` / `emergency` / `cosmetic` / `orthodontic` / `general` / `custom`), `min_value_cents`, `priority` (0–100), `is_active`, `is_system_tag`, `scope` (`'organization'` \| `'location'`), `usage_count`, `conversion_rate`, `avg_deal_value_cents`, `created_by_user_id`, audit columns. Unique on `(tenant_id, location_id, name)`. |
| 2 | `treatment_tag_pipeline_mappings` | Many-to-many join from a `treatment_tags` row to a `pipelines` row (optionally a specific `pipeline_stages` row). Carries optional value-range filters and an "auto-assign owner" flag. | `id`, `tenant_id`, `location_id`, `treatment_tag_id` (FK), `pipeline_id` (FK), `stage_id` (FK, nullable), `min_value_cents`, `max_value_cents`, `priority`, `is_active`, `auto_assign_owner`, `assigned_owner_user_id`, `conditions jsonb`. Unique on `(tenant_id, location_id, treatment_tag_id, pipeline_id)`. |
| 3 | `treatment_routing_logs` | Append-only audit trail of every routing decision. Used by `routing-analytics.tsx` and the bulk-reroute API. **Renamed from `treatment_tag_routing_logs`** — see Phase 0 reconciliation §2.A row 6. | `id`, `tenant_id`, `deal_id` (FK), `routed_from_pipeline_id`, `routed_to_pipeline_id`, `routed_to_stage_id`, `routing_method` (CHECK: `user_override` / `tag_mapping` / `ai_keyword_match` / `value_based` / `unsorted_fallback` / `legacy_config` / `api_specified`), `matched_tag_ids uuid[]`, `matched_keywords text[]`, `confidence_score` (0–100), `routing_reason`, snapshot of deal context, `routing_duration_ms`, `routed_by_user_id`, `was_manual_override`, `metadata jsonb`. Immutable (no UPDATE/DELETE policies). |
| 4 | `tenant_routing_settings` | Per-tenant feature flags and behaviour controls for the routing engine. | `tenant_id` (UNIQUE), `routing_enabled`, `ai_routing_enabled`, `suggest_pipeline_in_ui`, `auto_route_webhooks`, `unsorted_pipeline_id`, `auto_create_unsorted`, `ai_confidence_threshold` (default 70), `ai_keyword_matching_enabled`, `ai_value_based_routing_enabled`, `allow_user_override`, `require_approval_for_high_value`, `high_value_threshold_cents` (default £5,000), notification flags, `advanced_settings jsonb`. |
| 5 | `pms_procedure_tag_mappings` | Maps ADA/CDT procedure codes (e.g. `D6010`) coming from a PMS integration to one of the tenant's `treatment_tags`. | `id`, `tenant_id`, `procedure_code` (e.g. `D6010`), `procedure_name`, `procedure_category`, `treatment_tag_id` (FK), `treatment_tag_name` (denormalised), `mapping_priority`, `is_active`, `location_id`, `applies_to_all_locations`. Unique on `(tenant_id, procedure_code, location_id)`. |

**Adjacent tables found, with audit notes:**

| Table | Relationship to treatment system | Notes |
|---|---|---|
| `deals.treatment_tags text[]` | Stores the tag *names* (not IDs) selected for a deal. Powers analytics (`treatment_tags = ANY(...)` joins). | Free-form `text[]` — not a FK. Decoupling from `treatment_tags.id` means a tag rename does not propagate to historical deals. |
| `deals.treatment_type text` | Free-text label written by the PMS sync engine. | Added by `44_pms_integration.sql`. Distinct from `treatment_tags`. Used only by `treatment_type_analytics` view. |
| `deals.procedure_codes text[]` | Stores ADA/CDT codes from the PMS. | Used by the PMS sync engine, not by routing. |
| `treatment_plans` (PMS) | Mirrors a PMS treatment plan; has its own `treatment_type` column. | Joined to deals, not to tags. The `treatment_type_analytics` view aggregates from here, **not** from `treatment_tags`. |
| `treatment_type_analytics` (view) | Aggregates `treatment_plans` by `treatment_type` for revenue/acceptance metrics. | Defined in `44_pms_integration.sql:265`; consumed by `src/components/analytics/treatment-analytics.tsx:49`. Confirms there are *two parallel taxonomies* — `treatment_tags.name` (CRM/marketing/routing) and `treatment_plans.treatment_type` (PMS/clinical/finance). They never join. |
| `deal_settings.allowed_treatment_tags text[]`, `min_treatment_tags`, `max_treatment_tags`, `required_treatment_tags` | Per-tenant validation rules for tag selection on deal forms. | Confirmed in `src/types/supabase.ts:7031–7077`. |
| `dental_services` | Older categorisation table used by the auto_categorize_lead RPC. | Listed as a **dead-schema candidate** in Phase 0 reconciliation §5. Referenced only by `src/app/api/webhooks/lead-intake/route.ts:235`. |
| `lead_intakes.dental_service_id` | Result of `auto_categorize_lead` RPC. | Same dead-path note as above. |

**No `treatment_types` (the Phase 2a canonical layer) and no `practice_treatment_offerings` (the Phase 2a overlay layer) exist** in code or in live DB. Phase 1 (`supabase/migrations/20260502210540_phase_1_attribution_foundation.sql`) added `lead_intent_sessions` and `practice_booking_widgets` — verified — but neither table has any treatment column.

### 1.2 API routes

Only **one** route lives under `src/app/api/treatment-routing/`:

- `src/app/api/treatment-routing/bulk-reroute/route.ts` — POST handler (admin-only, permission `bulk_reroute_deals`). Re-routes up to 1,000 existing deals against current tag mappings. Supports filters, dry-run, optional tag re-extraction, "preserve manual pipeline" flag. GET handler returns recent bulk-reroute log entries. (Note: it queries `treatment_routing_logs` for `source = 'bulk_reroute'` (line 495), but the table has no `source` column — it has `metadata jsonb`. This GET is silently broken; see §3.)

Other routes that touch the treatment system:

- `src/app/api/categorize-deals/route.ts` — POST handler intended to bulk-categorise existing deals using `categorizeDeal` from `deal-categorization.ts`. **Broken — references `appUser.tenant_id` but `appUser` is never defined** (line 15: `const tenantId = appUser.tenant_id`, but no preceding declaration of `appUser`). Will throw a `ReferenceError` on first invocation. Not called from the UI; only `pipeline-board.tsx` references the path string.
- `src/app/api/marketing/forms/submit/route.ts` — calls `processFormSubmission` → `quickRouteDeal` (broken call shape, see §1.3 / §3).
- `src/app/api/webhooks/form-submission/route.ts` — calls `quickRouteDeal` (broken call shape).
- `src/app/api/webhooks/lead-intake/route.ts` — calls `quickRouteDeal` (broken call shape) and the `auto_categorize_lead` RPC.
- `src/app/api/integrations/pms/webhooks/treatment-proposed/route.ts` — calls `quickRouteDeal` (broken call shape).
- `src/app/api/deals/route.ts` — reads/writes `treatment_tags`.
- `src/app/api/search/universal/route.ts` — searches `treatment_tags` field.

### 1.3 Library / service code

`src/lib/treatment-routing/` (5 files, all part of the Phase 3 "Core Routing Engine" deliverable):

| File | Purpose |
|---|---|
| `index.ts` | Public barrel. Exports `routeDealWithAdapter`, `quickRoute`, **`quickRoute as quickRouteDeal`** (alias, line 50), `routeWithAI`, `isRoutingEnabled`, `invalidateRoutingCache`, `routeMultipleDeals`, `rerouteDeal`, `testRouting`, plus the engine internals (`routeDealToPipeline`, `getTreatmentTags`, `getPipelineMappings`, `getOrCreateUnsortedPipeline`, `logRoutingDecision`, cache helpers) and the AI extractor (`extractTreatmentTags`, `suggestTags`, `validateTagName`, `getTagByName`). |
| `adapter.ts` | The "clean integration layer". `routeDealWithAdapter(context: AdapterContext)` is the documented main entry point. Handles AI tag extraction → engine call → emits `events.dealRouted` (Phase 13) → emergency fallback to first pipeline if everything else fails. Defines `quickRoute(tenantId: string, treatmentTags: string[])` (line 312) — **a positional 2-arg signature, NOT an object signature**. Also `routeWithAI`, `isRoutingEnabled`, `invalidateRoutingCache`, `routeMultipleDeals`, `rerouteDeal`. |
| `routing-engine.ts` | The core 4-tier engine: `routeDealToPipeline(context: RoutingContext)`. In-memory `RoutingCache` with 5-min TTL. Helpers: `getTenantRoutingSettings`, `getTreatmentTags`, `getPipelineMappings`, `getOrCreateUnsortedPipeline`, `getPipelineDetails`, `logRoutingDecision`. |
| `ai-extractor.ts` | `extractTreatmentTags(title, description, tenantId, locationId?, options?)`. Levenshtein-distance fuzzy matcher + stop-word filter + dental-context boost. Helpers: `suggestTags`, `validateTagName`, `getTagByName`. Legacy alias `extractTagsFromDealText` (line 526) — used by `lead-intake/route.ts` and `treatment-proposed/route.ts` and `form-processor.ts`. |
| `migration-checker.ts` | Probes whether the 5 required tables exist. `checkMigrationStatus()`, `checkTableExists(tableName)`, `handleDatabaseError(error, context)`, `createMigrationNeededMessage()`. Used by every settings UI to show "set up not complete" instead of crashing. |

**`src/lib/deal-categorization.ts`** is the "pre-routing" predecessor. Re-exported by `treatment-routing/index.ts:113–121` for backward compatibility. Its public API: `categorizeDeal`, `getTreatmentCategory`, `isHighValue`, `isEmergency`, `autoTagDeal`, plus the type `TreatmentTagConfig`. The header comment states all hardcoded arrays were removed in Oct 2025 ("Phase 0 Cleanup"); the module now reads tag configs from either DB-supplied `tagConfigs` or `localStorage.getItem('treatment_config')` (line 47, marked DEPRECATED).

**Functions matching the prompt's hit-list:**

- `quickRouteDeal` — exported from `src/lib/treatment-routing/index.ts:50` as alias of `quickRoute(tenantId, treatmentTags)`. Called from 7 places (see §3 — most call it with the wrong shape).
- `routeByTreatment` — **does not exist** by that name.
- `categorizeLead` — local helper inside `lead-intake/route.ts:24`, calls the `auto_categorize_lead` SQL RPC.
- `assignToPipeline` — **does not exist** by that name. The work is done inline in `routing-engine.ts:528` (`routeDealToPipeline`).
- `auto_categorize_lead` — Postgres function, defined in `supabase/sql/03_lead_management_enhancement.sql:94`. Operates on `dental_services`, **not** on `treatment_tags`. Phase 0 §5 lists `dental_services` as dead-schema-candidate.
- `routeDealByTags` — **does not exist** by that name; the equivalent is `routeDealToPipeline` step 3 in `routing-engine.ts:600–660`.

### 1.4 UI components

`src/components/treatment-routing/` (the Phase 4–6 settings + analytics surface):

| Component | Purpose |
|---|---|
| `treatment-tags-settings.tsx` (834 lines) | Full CRUD on `treatment_tags`. Suggested-tag templates (8 hard-coded examples — see §6). Dialog with name, description, keyword chips, colour, icon, category, min-value, priority, scope (org vs location). Calls `invalidateRoutingCache(tenantId)` on save. |
| `pipeline-mapping-settings.tsx` (964 lines) | CRUD on `treatment_tag_pipeline_mappings`. Visual tag-card → pipeline picker + optional stage. Bulk mapping. Unmapped-tags warning. Per-location support. |
| `enhanced-treatment-tags.tsx` | Tabbed wrapper combining `TreatmentTagsSettings` and `RoutingAnalytics`. This is the component wired into `settings-tabs-v2.tsx:339`. |
| `routing-analytics.tsx` | Reads `treatment_routing_logs` to display routing-method breakdown, confidence-score distribution, and tag conversion rates. |
| `bulk-import-export.tsx` | CSV import/export for `treatment_tags`. |
| `bulk-operations-panel.tsx` | UI shell for bulk-reroute (calls `/api/treatment-routing/bulk-reroute`). |
| `migration-wizard.tsx` (617 lines) | Wizard to migrate `localStorage.treatment_config` → DB rows in `treatment_tags`. Conflict resolution + dry-run preview. Implies the legacy localStorage path was widely deployed enough that a migration tool was justified. |
| `deal-audit-panel.tsx` | Shows the `treatment_routing_logs` history for a single deal. |
| `index.ts` | Barrel; exports `TreatmentTagsSettings`, `BulkImportExport`, `PipelineMappingSettings`, `RoutingAnalytics`. |

**Other UI surfaces that capture treatment intent:**

- `src/components/settings/treatment-config.tsx` — **the legacy localStorage-backed settings UI**. 8 default treatments hard-coded in `DEFAULT_TREATMENTS` (line 29). Persists to `localStorage.treatment_config` (line 169). Not currently wired into the live settings tabs (only `EnhancedTreatmentTags` is, see `settings-tabs-v2.tsx:47`), but the file is still in the bundle.
- `src/components/marketing/forms-builder.tsx` — adds a `treatment_tags` field type to the form builder (line 31, 43, 96). On submit, this field's values are passed through to `processFormSubmission` as `payload.treatment_tags`.
- `src/components/deals/deal-treatment-tags.tsx` — the per-deal tag selector used inside deal dialogs and detail views. Reads `treatment_tags` from DB; writes via `deals.treatment_tags`.
- `src/components/deals/{simple-deal-dialog,create-deal-slide-over,edit-deal-dialog,deal-detail-view,deal-detail-view-modal,deal-profile-dialog,enterprise-deals-table}.tsx` — all reference `treatment_tags`.
- `src/components/pipeline/{pipeline-board,deal-card,deal-card-proper,deal-card-safe,deal-card-no-drag,DealCardPremium}.tsx` — all read `deal.treatment_tags` for display.
- `src/components/contacts/{contact-detail-view,contact-deals}.tsx` — surface the deal's treatment tags on the contact view.
- `src/components/settings/{comprehensive-deal-settings,comprehensive-pipeline-settings,pipeline-preferences-tab,settings-tabs,settings-tabs-v2}.tsx` — settings shells that include the routing tab.

### 1.5 RPCs / database functions

Functions in `supabase/sql/` whose names match `treatment|route|categorize`:

| Function | Defined in | Used? |
|---|---|---|
| `get_or_create_unsorted_pipeline(p_tenant_id uuid)` | `45_treatment_routing.sql:295` | Not called from code (the TS routing engine has its own implementation in `routing-engine.ts:348`). The SQL one is dormant. |
| `update_treatment_tag_stats()` | `45_treatment_routing.sql:329` | Triggered AFTER INSERT/UPDATE on `deals` (`treatment_tags`, `value_estimate_cents`). Updates `treatment_tags.usage_count` and `avg_deal_value_cents`. Active. |
| `initialize_tenant_routing_settings(p_tenant_id uuid)` | `45_treatment_routing.sql:532` | Not called from code visibly (no grep hit). Intended for tenant onboarding; presumably orphaned. |
| `auto_categorize_lead(p_message text, p_tenant_id uuid)` | `03_lead_management_enhancement.sql:94` | Called by `src/app/api/webhooks/lead-intake/route.ts:27`. Operates on `dental_services`, not `treatment_tags`. Best-effort wrapper swallows errors. The Phase 0 reconciliation report flags `dental_services` as dead-schema-candidate (§5), which means this RPC is operating on a soon-to-be-deprecated table. |

The Phase 0 reconciliation report (`dental-crm/phase0/outputs/reconciliation_report.md` §2.A row 6) records that the table was renamed from `treatment_tag_routing_logs` to `treatment_routing_logs` in the live DB, and the code already uses the new name (see `routing-engine.ts:478`, `bulk-reroute/route.ts:493`). So the rename is **complete in code**, only one stale file (`bulk-reroute` GET handler with the bogus `.eq('source', 'bulk_reroute')` filter) deserves a follow-up — and that's an unrelated bug.

### 1.6 Where in lead capture does treatment tagging happen?

For a marketing-form submission via `POST /api/marketing/forms/submit`:

1. The route handler (`src/app/api/marketing/forms/submit/route.ts`) authenticates and resolves `appUser.tenant_id`, then calls `processFormSubmission(submission, dealRules)` from `src/lib/marketing/form-processor.ts`.
2. `processFormSubmission` upserts the contact, logs an activity (`type: 'form_submission'` — note: only allowed by the live CHECK constraint *after* the Phase 0 reconciliation migration; see Phase 0 §6A-1 / §2.D), then enters the **Phase 9 "Universal Treatment Tag Routing" block** (line 113–225).
3. Treatment tags are sourced in this order:
   - If `payload.treatment_tags` is an array → use it (line 119–121).
   - Else build a `formText` string from `formName`, `payload.reason_for_inquiry`, `payload.treatment_type`, `payload.service_interest`, `payload.message`, `payload.notes` (line 123–134).
   - Pass `formText` into `extractTagsFromDealText(formText, tenantId)` (the legacy alias of `extractTreatmentTags`). Failures are best-effort (caught and logged).
4. Routing is decided via three branches (line 164–225):
   - `forceManualPipeline + targetPipelineId + defaultStageId` → bypass engine (`routingMethod = 'manual_override'`).
   - `enableAutoRouting !== false` → call `quickRouteDeal({...})`. **This call is broken-shape** (see §3 — `quickRoute` takes `(tenantId, treatmentTags)`, not an object). The destructured result (`pipelineId`, `stageId`, `routingMethod`, `routingLogId`) means the engine emergency-fallback is the only path that produces a usable result, because the AdapterContext seen by the engine treats the entire form-processor object as `tenantId`.
   - Else → use the form-rule's `targetPipelineId` directly (`routing_disabled`).
5. Deal insert (line 227–254): writes `treatment_tags: text[]` on the deal, plus `pipeline_id`, `stage_id`, attribution columns, `custom_fields.routing_log_id`, `custom_fields.routing_method`. **The contact does not get a treatment field written.** The deal is the only entity that knows what treatment was discussed.

For the older `POST /api/webhooks/lead-intake/route.ts` flow:

- Same `quickRouteDeal({...})` broken-shape problem.
- Additionally calls `auto_categorize_lead` RPC against the dead `dental_services` table to set `lead_intakes.dental_service_id` and `lead_intakes.categorization_confidence`.

For the PMS webhook (`POST /api/integrations/pms/webhooks/treatment-proposed/route.ts`) and `PMSSyncEngine.syncTreatmentPlanToCRM`:

- The PMS-supplied `treatmentType` and `procedureCodes` are written to `treatment_plans` and copied to `deals.treatment_type` / `deals.procedure_codes`.
- A subsequent `quickRouteDeal({...})` call (also broken shape) tries to route the deal — see §3.

**Summary table — where treatment intent lands today:**

| Surface | Captures intent? | Where it's stored |
|---|---|---|
| `contacts` row | ❌ No treatment field exists. | — |
| `deals.treatment_tags text[]` | ✅ As tag *names*, only when a deal is created. | `deals.treatment_tags` |
| `deals.treatment_type`, `deals.procedure_codes` | ✅ Only for deals from the PMS sync. | `deals.treatment_type`, `deals.procedure_codes` |
| `lead_intakes.dental_service_id` | ⚠️ Set by `auto_categorize_lead` (dead-schema table). | `lead_intakes.dental_service_id` |
| `marketing_form_submissions.payload jsonb` | ✅ Raw form payload — including any user-selected treatment_tags. | jsonb blob |
| `lead_intent_sessions` (Phase 1) | ❌ Not yet — Phase 1 added the table but no treatment column. | — |
| `treatment_routing_logs` | ✅ Audit record per routing decision. | `treatment_routing_logs.deal_treatment_tags`, `matched_tag_ids`, `matched_keywords` |

---

## §2 — How it works

### 2.1 Data model

- **Representation:** treatments are represented as **per-tenant tags** in `treatment_tags`, joined to pipelines through `treatment_tag_pipeline_mappings`. There is no canonical, system-managed list. Each tenant defines its own tags.
- **Cardinality:** a deal carries `treatment_tags text[]` (names, not FKs) — so it's effectively a denormalised many-to-many. Tag rename does not propagate to existing deals.
- **Per-practice overlay:** the `scope` column on `treatment_tags` (`'organization'` or `'location'`) and the `location_id` on both `treatment_tags` and `treatment_tag_pipeline_mappings` give *some* per-location override. But the overlay is a flat partition (a tag is either org-wide or location-only), not the canonical-with-overlay shape Phase 2a wants. Two practices in the same tenant can have a `Veneers` tag with completely different keywords and pipeline mappings — but they cannot both extend a shared canonical "Composite Veneers" definition.
- **Categorical taxonomy:** `treatment_tags.category` is a free-text column (`high_value` / `emergency` / `cosmetic` / `orthodontic` / `general` / `custom`) — there is **no enum constraint**. The UI offers the 6 options listed but the DB will accept anything.
- **Stable identifiers (the `key`/`slug` concept):** **none.** `treatment_tags.name` is the only handle; there is no `key` column. Renaming a tag breaks the `deals.treatment_tags text[]` join.
- **Free text vs typed:** mixed. `deals.treatment_tags` is `text[]` (free), `treatment_tag_pipeline_mappings.treatment_tag_id` is a uuid FK (typed).

### 2.2 Routing logic

`routing-engine.ts:routeDealToPipeline` — a 4-tier (effectively 6-step) state machine, lines 528–815:

1. **Step 0 — Validate input.** Throws if `tenantId` missing.
2. **Step 1 — Fetch settings.** `getTenantRoutingSettings(tenantId)` from `tenant_routing_settings`. Cache TTL 5 min. Defaults if not found. Hard-coded defaults: `routing_enabled = true`, `ai_routing_enabled = true`, `ai_confidence_threshold = 70`, `auto_create_unsorted = true`, `allow_user_override = true`, `high_value_threshold_cents = 500_000` (£5,000).
3. **Step 2 — User override.** If `existingPipelineId` provided AND `allow_user_override` → return immediately, `confidence = 100`, `routingMethod = 'user_override'`.
4. **Step 3 — Tag mapping.** Fetch active `treatment_tags` and `treatment_tag_pipeline_mappings`. Match by case-insensitive name. For each match, check `min_value_cents`/`max_value_cents` constraints. First valid match wins (mappings sorted by priority DESC). `confidence = 95`, `routingMethod = 'tag_mapping'`. The TODO at line 629 (`Implement advanced condition checking`) means the `conditions jsonb` column is **collected but never enforced**.
5. **Step 4 — AI keyword match.** Build `TreatmentTagConfig[]` from active tags, call `categorizeDeal(...)` from `deal-categorization.ts`, then look up the resulting `pipelineName` via `pipelines.name ILIKE %X%`. Only fires if the categorisation confidence ≥ `ai_confidence_threshold`. `routingMethod = 'ai_keyword_match'`. **Brittle:** the lookup matches pipeline by *name string*, so renaming a pipeline can silently break the mapping.
6. **Step 5 — Value-based routing.** If `dealValue ≥ high_value_threshold_cents`, look for `pipelines.name ILIKE '%high%value%' OR ILIKE '%premium%'`. `confidence = 80`, `routingMethod = 'value_based'`. Same brittleness.
7. **Step 6 — Unsorted fallback.** `getOrCreateUnsortedPipeline(tenantId)`. Returns `confidence = 0`, `routingMethod = 'unsorted_fallback'`.
8. **Catch-all.** Any thrown error → another fallback to Unsorted. If even that fails, the engine throws.

The rules engine is therefore a **prioritised lookup with hardcoded fallback ladder**, not a configurable rules engine. The "advanced conditions" jsonb column is dead code.

### 2.3 User-facing surface

A practice manager configures the system via **Settings → Treatment Tags & Pipeline Mapping** (`settings-tabs-v2.tsx:93,94`):

- **Treatment Tags tab** (`EnhancedTreatmentTags` → `TreatmentTagsSettings`) — create/edit tags, set keywords, colour, icon, category, min-value, priority, scope (org-wide vs location-specific). Pre-built suggestions (Dental Implant, Invisalign, Veneers, Crown, Root Canal, Emergency, Whitening, Braces) for one-click setup. Usable by a non-technical manager — the form is well-labelled.
- **Pipeline Mapping tab** (`PipelineMappingSettings`) — drag/drop tags onto pipelines (and optionally a specific stage), set value ranges, optional auto-assigned owner.
- **Migration Wizard** (`migration-wizard.tsx`) — walks a tenant from the legacy `localStorage.treatment_config` to DB tags. Detects the localStorage key, previews changes, resolves conflicts.

**Gaps:**

- The legacy `TreatmentConfig` component (`src/components/settings/treatment-config.tsx`) is still in the bundle but not mounted in `settings-tabs-v2.tsx`. It writes `localStorage.treatment_config` (line 169) which the deal categoriser still reads (`deal-categorization.ts:47`). A user who finds the old route would persist tags into a path the rest of the app silently ignores at write-time but reads at categorisation-time.
- There is **no pre-launch onboarding flow** that seeds default tags for a new tenant. The 8 templates inside the dialog are opt-in, not auto-applied. New tenants without manual setup → routing engine's "no matches" path → everything to "Unsorted".

### 2.4 Reporting surface

- "How many leads in the last month had treatment intent X across all practices" → **partially answerable**:
  - For deals: `SELECT count(*) FROM deals WHERE created_at > now() - interval '30 days' AND treatment_tags @> ARRAY['X']` works.
  - For routing decisions: `SELECT count(*) FROM treatment_routing_logs WHERE 'X' = ANY(deal_treatment_tags)` works (joinable to `tenant_id` for "across all practices" cross-tenant).
  - For *contacts* / *leads at the lead stage* (before deal creation): **not answerable** — there is no contact-level treatment field. If the deal isn't created (e.g. a low-score lead), the treatment intent is not stored anywhere queryable except buried in `marketing_form_submissions.payload jsonb`.
  - The PMS clinical taxonomy (`treatment_plans.treatment_type` / `treatment_type_analytics`) is in a *different* taxonomy from `treatment_tags`. Cross-cutting reporting (CRM tag → PMS treatment type) requires a manual mapping that nobody maintains.
- The `routing-analytics.tsx` UI surfaces routing-method breakdown and tag conversion rates (computed from `treatment_routing_logs`).

---

## §3 — How well does it work?

| Piece | Status | Why |
|---|---|---|
| `treatment_tags` table | ✅ Solid | Well-indexed (8 indexes incl. GIN on keywords + trigram on name), tight constraints (unique-per-location, keywords-not-empty), RLS correctly scoped to `tenant_id` and role. |
| `treatment_tag_pipeline_mappings` table | ⚠️ Partial | Schema is fine. The `conditions jsonb` column is collected by the dialog but **never evaluated** by the engine (`routing-engine.ts:629` TODO comment "Advanced conditions exist but not yet implemented"). Anyone configuring a condition expects it to be enforced; it isn't. |
| `treatment_routing_logs` | ✅ Solid | Immutable (no UPDATE/DELETE policies), GIN-indexed on `matched_tag_ids`, complete deal/method/confidence snapshot. `bulk-reroute/route.ts:495` filter `.eq('source', 'bulk_reroute')` is wrong column (should be `metadata->>'source'`), but that's only the GET endpoint of the bulk-reroute route — write side is fine. |
| `tenant_routing_settings` | ⚠️ Partial | Functioning but `initialize_tenant_routing_settings(uuid)` is never called from code, so a brand-new tenant has *no row* until they edit something. The engine handles this with hardcoded defaults — fine in practice, but `notify_on_routing` / `notify_on_fallback` are silent flags with no consumer code yet. |
| `pms_procedure_tag_mappings` | ❓ Unclear | Table and indexes exist; PMS sync code references `treatment_tags`/`treatment_type` directly, not this table. No call sites read `pms_procedure_tag_mappings` (grep returns only the SQL file and `migration-checker.ts:24` which probes for existence). Looks like Phase 11 deliverable that the PMS sync engine never integrated. |
| `routing-engine.ts → routeDealToPipeline` | ✅ Solid | The engine itself is clean, well-tested-shaped, and behaves correctly when called with a valid `RoutingContext`. Caching, fallbacks, and error handling are all proper. |
| `adapter.ts → routeDealWithAdapter` | ✅ Solid | Documented entry point; defensive fallback to first-pipeline-in-tenant is appropriate. |
| `adapter.ts → quickRoute / quickRouteDeal` | ❌ Broken — call-site mismatch | `quickRoute(tenantId: string, treatmentTags: string[])` has a 2-arg positional signature. **Six callers pass a single object literal instead** (form-processor.ts:175, lead-intake/route.ts:218, form-submission webhook line 205, sync-engine.ts:295, treatment-proposed webhook line 172, simple-deal-dialog.tsx:310, create-deal-slide-over.tsx:302). When TS allows this (which it does — the calling files import the alias and pass `{ orgId, treatmentTags, ... }`), the engine receives an object as `tenantId` and an `undefined` as `treatmentTags`. The engine then defaults to the unsorted fallback or, worse, attempts to insert a new pipeline with a malformed tenant_id and hits an FK violation. **This is the most important finding in the audit.** Quote (`form-processor.ts:175–183`): <pre>const routingResult = await quickRouteDeal({<br>  dealTitle: `${contactData.full_name} - ${submission.formName}`,<br>  dealDescription: submission.payload.reason_for_inquiry || submission.payload.message,<br>  contactId,<br>  orgId: submission.tenantId,<br>  treatmentTags,<br>  userOverridePipeline: dealRules.targetPipelineId,<br>  source: 'marketing_form',<br>});</pre> Two of the six call sites (`simple-deal-dialog.tsx:310`, `create-deal-slide-over.tsx:302`) **do** pass `tenantId` (correct key), but they're still passing an object where the function takes positional args — they're correct only by coincidence (the object's `tenantId` field name lines up with the parameter name when `routeDealWithAdapter` re-destructures, but `quickRoute` itself reassigns `routeDealWithAdapter({ tenantId, treatmentTags })` — meaning the *whole object* gets re-wrapped as `tenantId`). Net effect: **all 6 call sites are broken at runtime**. |
| `categorizeDeal` (deal-categorization.ts) | ⚠️ Partial | Refactored Oct 2025 to remove all hardcoded keyword arrays — good. But still has `localStorage.getItem('treatment_config')` fallback (line 47), which is dead-code-paths in SSR contexts (returns `[]` when `window === undefined`) and a footgun on the client (encourages people to keep using the legacy UI). Comment header line 41 promises removal "after migration wizard is deployed" — wizard exists, removal hasn't happened. |
| `ai-extractor.ts` | ⚠️ Partial | The Levenshtein fuzzy match + dental-context boost is fine, but it's pure keyword matching dressed up as "AI". No LLM call, no semantic understanding. Confidence scoring is reasonable but coupled to keyword density, so a tag with a single rare keyword tends to score lower than a tag with many common keywords — even when the rare-keyword tag is more specific. |
| `bulk-reroute API route` | ⚠️ Partial | POST handler is solid (auth, validation, dry-run, batch). GET handler line 491–499 queries `treatment_routing_logs` filtering on a column that doesn't exist (`.eq('source', 'bulk_reroute')` — `source` is not a column on the table). Will silently return zero rows for the "recent operations" panel. |
| `categorize-deals API route` | ❌ Broken | `src/app/api/categorize-deals/route.ts:15` references `appUser.tenant_id` but `appUser` is never declared in that handler scope. First call → `ReferenceError`. Quote: <pre>export async function POST() {<br>  try {<br>    const supabase = await createServiceClient()<br>    const tenantId = appUser.tenant_id  // ← undefined identifier<br>    ...</pre> No call sites in production code (only `pipeline-board.tsx` references the URL string). Treat as dead code. |
| `auto_categorize_lead` SQL function + `dental_services` table | 🔄 Wrong shape | Operates on a separate, near-dead taxonomy (`dental_services`) that doesn't connect to `treatment_tags`, doesn't connect to pipelines, doesn't connect to the routing engine. Phase 0 reconciliation §5 lists `dental_services` as a dead-schema candidate. The lead-intake webhook calls it, gets a `dental_service_id`, writes it to `lead_intakes.dental_service_id`, and then **separately** calls `quickRouteDeal` with treatment tags extracted independently — so the categorisation result is never connected to the routing decision. Two systems doing similar work, neither aware of the other. |
| `pipeline-mapping-settings.tsx` UI | ✅ Solid | Well-structured, validates per-tenant uniqueness, supports per-location overlays, surfaces unmapped-tag warnings. |
| `treatment-tags-settings.tsx` UI | ✅ Solid | Comprehensive CRUD, fuzzy-match keywords, suggested templates, scope selector. |
| `treatment-config.tsx` (legacy localStorage UI) | 🔄 Wrong shape | Persists to `localStorage.treatment_config` only. Hardcoded `DEFAULT_TREATMENTS` array (8 entries). Not mounted in `settings-tabs-v2.tsx`. Reading still happens from `deal-categorization.ts:47` for backward compatibility. Should be deleted now that `migration-wizard.tsx` exists. |
| `migration-wizard.tsx` UI | ✅ Solid | Clean step-by-step flow. Conflict resolution. The fact that it exists at all is evidence of how widely the legacy localStorage path was deployed. |
| `forms-builder.tsx → treatment_tags field type` | ✅ Solid | Form builder correctly loads tags from DB, supports multi-select, persists `payload.treatment_tags` on submission. |
| `treatment_type_analytics` view + `treatment_plans.treatment_type` (PMS taxonomy) | 🔄 Wrong shape | This is a **second, parallel taxonomy** that does not connect to `treatment_tags`. PMS sync writes a free-text `treatment_type` (e.g. `'crown'`, `'implant'`) onto deals and treatment_plans, completely independent of the tag system. Cross-system reporting is impossible without a manual join table. |
| Contact-level treatment intent | ❌ Broken (missing) | `contacts` has no treatment column. Pre-deal intent (e.g. a low-score lead that doesn't auto-create a deal) is only persisted as raw jsonb in `marketing_form_submissions.payload`. Any "what treatment is this contact interested in?" question requires querying the deals table or the form submissions table — not the contact. |

---

## §4 — Gap analysis vs Phase 2a target model

The Phase 2a target wants a two-layer model:

```
treatment_types (canonical, system-managed, with `key`)
  ↓ FK
practice_treatment_offerings (per-practice overlay)
  ↓ FK from
contacts.treatment_type_id, contacts.treatment_offering_id
lead_intent_sessions.treatment_offering_id
practice_booking_widgets.treatment_options (jsonb, ordered)
```

For each piece of the target, here's what exists today:

### 4.1 Canonical layer (`treatment_types` — system-managed)

- **Coverage:** ❌ No.
- **Closest existing thing:** `treatment_tags` is per-tenant, has no `key` (stable identifier), no `default_pipeline_template_id`, no `default_sla_minutes`, no `default_lead_value_range`. The `category` column is free text without enum constraint. There is no system-level "you may not delete this — it's canonical" guard.
- **What's missing:** every column except `id`, `name` (≈ `display_name`), `is_active`. Missing: `key` (slug), `default_pipeline_template_id`, `default_sla_minutes`, `default_lead_value_range`, `metadata`, `sort_order`, the system-managed semantics.

### 4.2 Per-practice overlay layer (`practice_treatment_offerings`)

- **Coverage:** ⚠️ Partially.
- **Closest existing thing:** `treatment_tag_pipeline_mappings` provides the *pipeline link*, and the `location_id` columns on `treatment_tags`/`treatment_tag_pipeline_mappings` provide *location-specific overrides*. But:
  - There is no FK from a per-practice tag to a canonical type — the tag *is* the only definition.
  - There is no `custom_label` separate from canonical name — the `name` column on `treatment_tags` *is* the practice-facing label.
  - There is `min_value_cents`/`max_value_cents` per mapping (≈ `custom_lead_value`) but no `custom_sla_minutes`.
- **What's missing:** the canonical→overlay relationship. The current model is "every practice writes its own tag from scratch" — no inheritance.

### 4.3 Pipeline link per offering

- **Coverage:** ✅ Yes — this is exactly what `treatment_tag_pipeline_mappings.pipeline_id` does.
- **Catch:** the link is via a tag, not via an offering. If we keep tags-as-offerings the existing column is fine. If we add a separate `practice_treatment_offerings` table, we'd need a similar mapping there.

### 4.4 Tagging at ingestion time

- **Coverage:** ⚠️ Partial — tags get attached to *deals*, not to *contacts* or *lead_intent_sessions*.
- **Specifically missing:**
  - `contacts.treatment_type_id` — no equivalent column. Contacts know nothing about treatment.
  - `contacts.treatment_offering_id` — same.
  - `lead_intent_sessions.treatment_offering_id` — Phase 1 created the table without any treatment column.
  - `practice_booking_widgets.treatment_options jsonb` — Phase 1 created the table without a treatment_options column.

### 4.5 Per-treatment defaults

- **Coverage:** ⚠️ Partial.
- **Closest existing thing:** `treatment_tag_pipeline_mappings.min_value_cents` / `max_value_cents` (≈ `custom_lead_value`), `tenant_routing_settings.high_value_threshold_cents` (an SLA-shaped number applied org-wide).
- **Missing:** `default_sla_minutes`, `default_lead_value_range jsonb`, `custom_sla_minutes` on the overlay.

**Net gap:** the Phase 2a model is genuinely a different shape. The current system covers ~30% of what's needed (per-tenant tags + pipeline routing) but is missing the entire "shared canonical + per-practice overlay" axis and the entire "treatment intent at the contact / session / widget level" surface.

---

## §5 — Three options for Phase 2a

### Option A — Extend the existing system

**Keep:**
- `treatment_tags` (rename to `practice_treatment_offerings` *conceptually* — no DB rename)
- `treatment_tag_pipeline_mappings` (stays — represents the pipeline link)
- `treatment_routing_logs`, `tenant_routing_settings` (no change)
- All routing engine code (after fixing the broken `quickRouteDeal` call shape)
- All settings UIs

**Add:**
- A new `treatment_types` table for the canonical layer with `key`, `display_name`, `default_pipeline_template_id`, `default_sla_minutes`, `default_lead_value_range jsonb`, `is_active`, `sort_order`, `metadata`, `is_system_managed boolean`.
- New columns on `treatment_tags`: `treatment_type_id uuid REFERENCES treatment_types(id)`, `custom_label text`, `custom_sla_minutes integer` (i.e. retrofit the per-tenant tag into a "canonical-with-overlay").
- New columns on `contacts`: `treatment_type_id uuid`, `treatment_offering_id uuid` (FK to the same `treatment_tags`).
- New columns on `lead_intent_sessions`: `treatment_offering_id uuid`.
- New columns on `practice_booking_widgets`: `treatment_options jsonb`.
- Seed `treatment_types` with the 8 templates currently hardcoded in `treatment-tags-settings.tsx` (Dental Implant, Invisalign, Veneers, Crown, Root Canal, Emergency, Whitening, Braces).

**Rename / reshape:**
- Rename existing `treatment_tags.name` semantics: it becomes the "practice's display label" (`custom_label`); the new FK to `treatment_types` is the canonical anchor.
- Potentially deprecate `treatment_tags.category` (free text) in favour of inherited category from `treatment_types`.
- The `pipeline_id` link on `treatment_tag_pipeline_mappings` stays.

**Effort estimate:** **M–L** (1.5–2.5 weeks).
- 1 migration to add `treatment_types` + columns.
- Code changes in `routing-engine.ts` to look up tags via canonical type when present, fall back to old behaviour when not.
- UI changes in `treatment-tags-settings.tsx` to add a "based on canonical type" picker.
- Phase 2a widget code can read directly from the new structure.
- **Plus** the prerequisite of fixing `quickRouteDeal` call shape across 6 files (~1 day).

**Risks:**
- Existing tenants have free-form tags that don't map to any canonical type. Need a "leave them unmapped" escape hatch — the migration cannot be all-or-nothing.
- The dual-shape model (canonical-with-overlay AND free-form) doubles the complexity of every read path. Grep-able, but a lot of "if treatment_type_id then X else Y" branches.
- Phase 2a engineers have to understand two layers of legacy behaviour before they can build on top.

### Option B — Build the new two-layer model alongside

**Keep (untouched):**
- `treatment_tags`, `treatment_tag_pipeline_mappings`, `treatment_routing_logs`, `tenant_routing_settings`, `pms_procedure_tag_mappings` — frozen for the deal-routing flow.
- All existing settings UIs and the routing engine.

**Add (new, isolated):**
- `treatment_types` (canonical) and `practice_treatment_offerings` (overlay) — exactly the Phase 2a shape.
- `practice_treatment_offerings.pipeline_id` (FK) — same role as `treatment_tag_pipeline_mappings.pipeline_id`.
- `contacts.treatment_type_id`, `contacts.treatment_offering_id`.
- `lead_intent_sessions.treatment_offering_id`.
- `practice_booking_widgets.treatment_options jsonb`.
- A *new*, separate routing function (or a new branch in the adapter) that prefers the new tables when the lead came through the booking widget, and falls back to the old engine otherwise.

**Existing system:** continues to serve manual deal creation, the legacy form-processor flow (after fixing the call-shape bug), and the PMS-treatment-proposed webhook. Existing analytics views (`treatment_type_analytics`) are untouched.

**Migrate / deprecate later:** in a Phase 2b or Phase 3, write a migration that:
1. Creates a `treatment_types` row for each cluster of similar `treatment_tags` rows across tenants.
2. Backfills `treatment_offering_id` on existing deals.
3. Removes the `treatment_tags`/`treatment_tag_pipeline_mappings` tables — or just stops writing to them.

**Effort estimate:** **M** (1–1.5 weeks).
- 1 migration to add 4 new tables/columns.
- Phase 2a builds against the new tables only — no entanglement with legacy.
- Bug fix for `quickRouteDeal` call shape stays a separate, pre-Phase-2a bugfix (needed regardless).

**Risks:**
- Two parallel sources of truth for "which treatments does this practice offer". Practice managers will have two settings UIs to maintain (new widget config + old tag settings) until deprecation.
- Reporting queries either need to UNION across both, or we accept a knowledge cliff (pre-Phase-2a deals queried via `treatment_tags`, post-Phase-2a contacts/leads queried via `treatment_offering_id`).
- Risk of "the new system is the source of truth, but we keep writing to the old one for safety" pattern that never gets cleaned up.

### Option C — Replace the existing system entirely

**Deprecate (drop):**
- `treatment_tags` and `treatment_tag_pipeline_mappings` — replaced by `treatment_types` + `practice_treatment_offerings`.
- The 4 settings UIs in `src/components/treatment-routing/` — replaced by a new "Treatment offerings" admin surface.
- `treatment_routing_logs` — keep the audit trail behaviour but rename to `treatment_routing_decisions` keyed off the new offering ID.
- `deal-categorization.ts` (legacy) and the `localStorage` fallback path.
- The dead `auto_categorize_lead` RPC and `dental_services` table (which Phase 0 already flagged for cleanup).

**Migrate:**
- Every `treatment_tag` → either a `treatment_type` (canonical) or a `practice_treatment_offering` (overlay) — requires a manual triage of every existing tag (or a "best-effort" automated mapping by name with conflict resolution UI).
- Every `deal.treatment_tags text[]` → either keep as legacy field OR rewrite to `deal.treatment_offering_id` (singular) + a denormalised list.

**Effort estimate:** **L** (3–5 weeks).
- 2–3 migrations (forward + data migration + cleanup).
- Rewriting 6 lead-capture/deal-creation call sites.
- Rebuilding 6+ admin UIs.
- Updating ~50 components that read `deal.treatment_tags` for display.
- Updating analytics + the `routing-analytics` UI.

**Risks:**
- Big-bang migration — high blast radius. Any tenant with non-default tag setups requires hand-holding.
- The PMS sync code path (which writes `treatment_type` and `procedure_codes` on deals) and the `pms_procedure_tag_mappings` table all need re-pointing to the new model. This is the messiest dependency.
- Dropping the legacy tables means losing the audit trail in `treatment_routing_logs` (or having to migrate it).
- Minimum 2 weeks where the system has duplicate code paths for safety.

### Recommendation: **Option B**

**Why:** Phase 2a's primary deliverable is the booking widget flow (lead → session → contact → deal, with treatment intent captured at session-creation time). The Phase 2a target model is *shaped for that flow*. The existing `treatment_tags` system is *shaped for deal-creation routing* and works fine for that use case (modulo the broken `quickRouteDeal` call shape, which is a separate bug). Option B lets us ship the Phase 2a widget without touching the existing system, validates the canonical/overlay shape against a real flow before we commit to migrating six years of accumulated tag data, and avoids the "renovate the kitchen while cooking dinner" risk of Option A. It also leaves the `treatment_routing_logs` audit trail intact, which the existing analytics dashboards depend on. The longer-term consolidation (Option C-style replacement) becomes a Phase 2b decision once we know the new shape works.

---

## §6 — Sample data

### Hardcoded treatment templates (live in code today)

**`src/components/treatment-routing/treatment-tags-settings.tsx:123–188`** — eight `SUGGESTED_TAGS`, the templates a practice manager sees when creating a new tag:

| Name | Category | Color | Icon | Min value (£) | Sample keywords |
|---|---|---|---|---|---|
| Dental Implant | high_value | #9333ea | 🦷 | 5,000 | implant, implants, dental implant, tooth implant |
| Invisalign | orthodontics | #3b82f6 | 😁 | 3,000 | invisalign, invisible braces, clear aligners |
| Veneers | cosmetic | #ec4899 | ✨ | 2,000 | veneer, veneers, porcelain veneers, composite veneers |
| Crown | general | #10b981 | 👑 | 800 | crown, dental crown, cap, crown restoration |
| Root Canal | general | #f59e0b | 🔧 | 600 | root canal, endodontic, root treatment |
| Emergency | emergency | #ef4444 | 🚨 | (none) | emergency, urgent, same day, pain, trauma |
| Whitening | cosmetic | #06b6d4 | 🌟 | 300 | whitening, bleaching, teeth whitening, smile whitening |
| Braces | orthodontics | #8b5cf6 | 🎯 | 2,500 | braces, orthodontic braces, metal braces, traditional braces |

**`src/components/settings/treatment-config.tsx:29–85`** — eight `DEFAULT_TREATMENTS` for the legacy localStorage UI (overlapping but distinct list):

- Dental Implants (high_value, £3,000)
- Full Mouth Reconstruction (high_value, £10,000)
- Invisalign (orthodontic, £3,500)
- Braces (orthodontic, £2,500)
- Veneers (cosmetic, £1,500)
- Teeth Whitening (cosmetic, £300)
- Emergency Care (emergency, no min)
- Root Canal (emergency, £800)

The `min_value_cents` numbers don't match between the two lists (e.g. Veneers £2,000 vs £1,500; Implants £5,000 vs £3,000) — implying there's no shared source of truth even within the codebase.

### Demo seed (per-tenant, for the `deepakshegde@gmail.com` tenant)

`supabase/sql/48_demo_treatment_routing_data.sql` seeds 6 treatment tags + their pipeline mappings + tenant_routing_settings for **one specific tenant** (looked up by user email). Tags: Dental Implants, Orthodontics, Cosmetic, Root Canal, Cleaning, Emergency. Tenant-scoped, idempotent, safe to re-run. Not used outside the demo tenant.

### Test fixtures

- `__tests__/` and `tests/` directories exist at the repo root but no grep hits for hard-coded treatment lists in test fixtures specifically.
- `src/app/api/test/test-single-patient/route.ts`, `create-realistic-practice/route.ts`, `create-deals/route.ts`, etc. write `treatment_tags` arrays inline as part of demo-data generators (free-text names, not joined to any table).

### Other taxonomies in the codebase (worth knowing)

- `dental_services.category` enum: `treatment` / `preventive` / `cosmetic` / `emergency` (`supabase/sql/03_lead_management_enhancement.sql:9`). Different shape from `treatment_tags.category`.
- `treatment_plans.treatment_type` (free text from PMS): `'crown'`, `'implant'`, `'orthodontics'`, `'periodontics'`, etc. (`supabase/sql/44_pms_integration.sql:150`).
- `forms-builder.tsx` lists `treatment_tags` as a built-in form field type (line 31); it pulls live from the tenant's tags at form-builder time.

---

## §7 — Questions for the human

1. **Pre-launch state:** the codebase has elaborate tag-management UIs, a migration wizard, and demo data — but is it actually in production with real customer data, or is it all "feature-built, not yet rolled out"? The amount of orphaned code (legacy `treatment-config.tsx`, the `localStorage.treatment_config` fallback, the broken `categorize-deals` API, the dead `dental_services` flow) suggests no real customer is depending on the routing system today. Confirming this changes the calculus on Option C significantly.

2. **`quickRouteDeal` call-shape mismatch — is it actually broken?** Six call sites pass an object literal (`{ orgId, dealTitle, contactId, treatmentTags, ... }`) to a function whose signature is `quickRoute(tenantId: string, treatmentTags: string[])`. By a strict reading of the code, every form/webhook deal must be silently routing to "Unsorted" (or hitting an FK error on `pipelines.tenant_id`). If the routing engine is in fact silently fallbacking, you'd see this in `treatment_routing_logs` as a high proportion of `routing_method = 'unsorted_fallback'` for `source IN ('marketing_form', 'lead_intake', 'pms_webhook')`. Worth a single SQL query to confirm. If the audit is correct, this is a P0 bug, **independent of Phase 2a**.

3. **`pms_procedure_tag_mappings`:** the table exists, has indexes, has RLS, has a dedicated migration (`47_pms_procedure_tag_mappings.sql`), but no production code reads it. Was this Phase 11 deliverable abandoned, or is the integration intentionally deferred?

4. **`dental_services` and `auto_categorize_lead`:** Phase 0 §5 lists `dental_services` as dead-schema. The lead-intake webhook still calls `auto_categorize_lead(message, tenant_id)` against it. Should this code path be removed in Phase 2a (since Phase 2a will replace the lead-intake flow with the booking widget anyway), or should the RPC be left as-is for safety until Phase 2a's widget is fully ramped?

5. **Two parallel taxonomies (`treatment_tags.name` vs `treatment_plans.treatment_type`):** the PMS integration writes a clinical taxonomy to `deals.treatment_type` and `treatment_plans.treatment_type` that **does not connect** to the marketing/CRM `treatment_tags`. Should Phase 2a's `treatment_types` canonical layer also become the canonical anchor for the PMS clinical taxonomy (i.e. one source of truth across CRM + clinical), or is it intentional to keep these as separate axes?

6. **Tag `category` enum:** the column is free text in DB but has 6 documented values in the UI. Should Phase 2a tighten this into an enum (or a FK to a `treatment_categories` table), or is the free-form intentional flexibility?

7. **`treatment_tag_pipeline_mappings.conditions jsonb`:** the column is collected by the dialog but never enforced by the engine (TODO at `routing-engine.ts:629`). Is the intent to ship advanced conditions, or is this dead intent that should be removed?

8. **Default-tag rollout:** there is no automation that gives a brand-new tenant any treatment tags. Should Phase 2a's `treatment_types` table be auto-seeded into every new tenant's `practice_treatment_offerings`, or should new tenants start empty and pick from canonical?

9. **`deals.treatment_tags text[]` vs `deals.treatment_offering_id`:** if Phase 2a adds an `offering_id`, do we keep the `text[]` column for backwards-compatible reads (and stop writing to it), or rewrite all 30+ display components in one go?

10. **Legacy `localStorage.treatment_config`:** can `deal-categorization.ts:47` be removed (i.e. is there any tenant whose data still lives only in `localStorage` and hasn't been migrated)? The migration wizard exists but I have no evidence it was ever run.

11. **The orphaned `categorize-deals` POST endpoint:** `src/app/api/categorize-deals/route.ts` references an undefined identifier (`appUser.tenant_id` with no `appUser` declaration). Is this safe to delete, or is it called by an external job/cron we aren't seeing?

---

## Appendix: file-path index for fast lookup

**Schema (SQL):**
- `dental-crm/supabase/sql/45_treatment_routing.sql` — tags, mappings, logs, settings, helper functions
- `dental-crm/supabase/sql/45_treatment_routing_rollback.sql` — rollback companion
- `dental-crm/supabase/sql/46_treatment_routing_permissions.sql` — RLS / permission additions
- `dental-crm/supabase/sql/46a_fix_permission_key_type.sql` — fix
- `dental-crm/supabase/sql/46b_fix_foreign_keys.sql` — fix
- `dental-crm/supabase/sql/47_pms_procedure_tag_mappings.sql` — PMS code → tag mapping table
- `dental-crm/supabase/sql/48_demo_treatment_routing_data.sql` — per-tenant demo data
- `dental-crm/supabase/sql/44_pms_integration.sql` — `treatment_plans`, `deals.treatment_type`, `treatment_type_analytics` view
- `dental-crm/supabase/sql/03_lead_management_enhancement.sql` — `dental_services`, `auto_categorize_lead` RPC
- `dental-crm/supabase/migrations/20260502210540_phase_1_attribution_foundation.sql` — Phase 1 added `lead_intent_sessions` and `practice_booking_widgets` (no treatment columns)

**Library:**
- `dental-crm/src/lib/treatment-routing/index.ts`
- `dental-crm/src/lib/treatment-routing/adapter.ts`
- `dental-crm/src/lib/treatment-routing/routing-engine.ts`
- `dental-crm/src/lib/treatment-routing/ai-extractor.ts`
- `dental-crm/src/lib/treatment-routing/migration-checker.ts`
- `dental-crm/src/lib/deal-categorization.ts`
- `dental-crm/src/lib/marketing/form-processor.ts`
- `dental-crm/src/lib/integrations/pms/sync-engine.ts`

**API:**
- `dental-crm/src/app/api/treatment-routing/bulk-reroute/route.ts`
- `dental-crm/src/app/api/categorize-deals/route.ts` (broken)
- `dental-crm/src/app/api/marketing/forms/submit/route.ts`
- `dental-crm/src/app/api/webhooks/form-submission/route.ts`
- `dental-crm/src/app/api/webhooks/lead-intake/route.ts`
- `dental-crm/src/app/api/integrations/pms/webhooks/treatment-proposed/route.ts`

**UI:**
- `dental-crm/src/components/treatment-routing/treatment-tags-settings.tsx`
- `dental-crm/src/components/treatment-routing/pipeline-mapping-settings.tsx`
- `dental-crm/src/components/treatment-routing/enhanced-treatment-tags.tsx`
- `dental-crm/src/components/treatment-routing/routing-analytics.tsx`
- `dental-crm/src/components/treatment-routing/bulk-import-export.tsx`
- `dental-crm/src/components/treatment-routing/bulk-operations-panel.tsx`
- `dental-crm/src/components/treatment-routing/migration-wizard.tsx`
- `dental-crm/src/components/treatment-routing/deal-audit-panel.tsx`
- `dental-crm/src/components/settings/treatment-config.tsx` (legacy)
- `dental-crm/src/components/marketing/forms-builder.tsx` (treatment_tags field type)
- `dental-crm/src/components/deals/deal-treatment-tags.tsx`

**Settings wiring:**
- `dental-crm/src/components/settings/settings-tabs-v2.tsx:47,93,338` — mounts `EnhancedTreatmentTags` and `PipelineMappingSettings`.

---

*End of audit. No code, schema, or behaviour has been modified.*
