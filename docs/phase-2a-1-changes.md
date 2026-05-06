# Phase 2a.1 — Foundations & Cleanup (change log)

This doc captures the concrete changes made in Phase 2a.1 so the planner and any future archeologist can trace what moved.

## Schema migrations applied

- `20260503_phase_2a_1_foundations.sql`
  - New tables: `treatment_types`, `practice_treatment_offerings`, `practice_notification_routing`
  - New columns: `contacts.first_response_at`, `contacts.first_response_user_id`, `activities.source_channel` (typed `source_channel_enum`)
  - New unique partial index: `idx_pipelines_one_default_per_tenant` enforces "one default pipeline per tenant"
  - New trigger: `trigger_update_contact_first_response` on `activities` AFTER INSERT — populates `contacts.first_response_at` for outbound communication activities
  - Backfill: every tenant now has exactly one `is_default = true` pipeline; default `lead.arrived` notification routing seeded for every tenant
  - Companion rollback file: `20260503_phase_2a_1_foundations_rollback.sql`
- `20260503_phase_2a_1_seed_treatment_types.sql`
  - Seeds 20 canonical UK dental treatments (4 cosmetic, 1 emergency, 2 general, 2 orthodontic, 7 restorative, 4 specialist).

## Code fixes

### Routing (Audit 0)
- `src/lib/marketing/form-processor.ts`, `src/lib/integrations/pms/sync-engine.ts`, `src/app/api/integrations/pms/webhooks/treatment-proposed/route.ts`, `src/components/deals/simple-deal-dialog.tsx`, `src/components/deals/create-deal-slide-over.tsx`
  - Replaced broken `quickRouteDeal({ … })` object-literal calls with `routeDealWithAdapter({ … })`
  - Mapped `orgId` → `tenantId`, `userOverridePipeline` → `existingPipelineId`
  - Mapped result reads to `AdapterResult` shape: `pipelineId` / `stageId` / `method` / `reason` (was `pipeline_id` / `stage_id` / `routingMethod` / `explanation`)
  - `routingLogId` is no longer surfaced via the adapter; we set the local var to `undefined` and rely on the routing-engine's own logging. Phase 2a.2 should plumb this through `AdapterResult` if we need it back in `deals.custom_fields`.
  - `quickRouteDeal` alias re-export in `src/lib/treatment-routing/index.ts` retained for now (no remaining call sites in production code).

### Activities writes/updates (Audit 3)
- `src/app/api/activities/route.ts` + `src/app/api/activities/[id]/route.ts` + `src/schemas/activity.schema.ts`
  - Removed non-existent columns `script_version_id` and `conversation_session_id` from the `ActivityCreateSchema`, `ActivityUpdateSchema`, and `ActivityQuerySchema`
- `src/app/api/webhooks/voice/route.ts`
  - Renamed columns: `call_status` → `message_status`, `call_duration_seconds` → `duration_seconds`, `call_recording_url` → `recording_url`. Removed non-existent `updated_at` and `created_at` writes.
  - Added `source_channel: 'phone_call_inbound'` to inbound call inserts.
- `src/app/api/webhooks/voicestack/route.ts`
  - Removed non-existent `updated_at` from the activity update payload.
- `src/lib/marketing/automation-engine.ts`
  - Renamed `activity_date` → `occurred_at` for both the `executeSendEmail` and `executeSendSMS` activity inserts; added `direction: 'outbound'` for trigger compatibility.
- `scripts/demo/MASTER_INVESTOR_SEED.ts`
  - Renamed `activity_timestamp` → (dropped, redundant with `occurred_at`) and `content` → `description` to match the activities schema.

### Forward-prep
- `src/lib/marketing/form-processor.ts` — the existing form-submission activity insert now writes `direction: 'inbound'` and `source_channel: 'form_embedded'` so Phase 2a.2's `ingestLead()` has typed channel data already flowing.

## Endpoint deletions (Audit 4)

The following routes had zero rows in their target tables and broken/dead code paths. They are now deleted and the empty parent directories removed:

- `src/app/api/webhooks/form-submission/route.ts`
- `src/app/api/webhooks/universal/route.ts`
- `src/app/api/webhooks/lead-intake/route.ts`
- `src/app/api/categorize-deals/route.ts`

Dangling references handled:
- `src/components/pipeline/pipeline-board.tsx` — `handleAutoCategorize` now shows a "feature returning in Phase 2a.2" toast instead of calling the deleted endpoint.
- `src/components/settings/api-developer-tab.tsx` — surface URL switched from `/api/webhooks/form-submission` to the canonical `/api/marketing/forms/submit`.
- `src/components/forms/form-builder-old.tsx` (deprecated codegen) — same URL switch.

The single canonical webform path is `/api/marketing/forms/submit`; this endpoint will be refactored in Phase 2a.2 when `ingestLead()` lands.

## Deferred (track for later)

Items that came up during the audits but were intentionally not done in 2a.1:

- Drop vestigial `stages` table (Audit 1 §4 #4) — DB cleanup migration.
- Drop vestigial `forms` and `form_submissions` shadow tables (Audit 4 §1.1).
- Drop `lead_intakes`, `lead_sources`, `auto_categorize_lead` RPC once 2a.2 confirms `ingestLead()` doesn't need them (Audit 4 §9 §4).
- Fix `pipeline-settings-dialog.tsx` and `deal-slide-in-panel.tsx` `tenantId`-undefined bugs (Audit 1 §4 #16, #17).
- Fix `org-create` page that creates a Default pipeline with zero stages (Audit 1 §4 #19) — 2a.2's tenant-creation seeding will subsume this.
- `treatment_routing_logs.source` column drift — bulk-reroute GET broken (Audit 4).
- 8 RLS policies on `pipelines` and `pipeline_stages` to consolidate (Audit 1 §1.1).
- `pipeline_settings` un-honoured fields (`enforce_stage_order`, `required_fields_per_stage`, `webhook_url`).
- `deal_stage_history` is empty in production because no code writes it. 2a.2's pipeline-write path will start writing it.
- Remove `quickRouteDeal` alias re-export from `src/lib/treatment-routing/index.ts` once we're confident no out-of-tree code imports it.
- Plumb `routingLogId` back through `AdapterResult` so deal `custom_fields.routing_log_id` is populated again.

## Hotfix between 2a.1 and 2a.2

### `src/components/deals/deal-detail-view-modal.tsx` — in-place repair (Option B)

The Option-A revert was abandoned (no clean ancestor existed; every commit since `df6fa64` references `deal.deal_type`, `deal.pipeline_stage_id`, and `deal.description`, none of which are on the shared `Deal` interface in `@/types/database`). Repaired in place per `Audit and Analysis/Build/hotfix_deal_detail_modal.md`. Three changes, one file: (1) **field renames** — `deal.deal_type` → `deal.treatment_type` (4 read sites), `deal.pipeline_stage_id` → `deal.stage_id` (1 read site at line 679 plus the matching `updateData.pipeline_stage_id` typo in `handleSaveEdit` that was silently breaking stage edits at runtime); the three `deal.description` reads are kept verbatim because `deals.description` is in fact a real `text` column. (2) **toolbar removal** — deleted the entire `<div className="flex flex-wrap items-center gap-2">` block (was lines 511–572) containing five never-wired buttons: Call (`<PhoneCall>`), Email (`<Mail>`), SMS (`<MessageCircle>`), AI Assist (`<Bot>`), Log Activity (`<ActivityIcon>` + `setCreateActivityDialogOpen`). The icons were never imported and the activity-dialog state was never declared, so the block never compiled. Phase 2b should re-add Call/SMS/Log-Activity wired through the dispatcher (Email and AI Assist are already reachable from the right-hand Quick Actions sidebar and the floating AI button). (3) **JSX rebalance** — added the single missing `</div>` that closes the root container (originally opened around line 409, now line 418 after the type-extension addition). Also added a file-local `type DealRow = Deal & { treatment_type?: string; description?: string }` and switched the `useState<Deal | null>` to `useState<DealRow | null>` so tsc can see the two DB-only fields without modifying the shared `Deal` interface; Phase 2a.2 should broaden the shared type and remove the alias. The broken state was introduced by `fe18203` ("Complete CRM deployment..."); `tsc --noEmit` and `npm run build` are now both clean for this file (other repo errors elsewhere are pre-existing and out of scope).
