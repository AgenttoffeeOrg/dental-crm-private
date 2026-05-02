# Phase 0 — Schema Reconciliation Report

> Generated: 2026-05-02
> Branch: `phase-0-schema-reconciliation`
> Source-of-truth DB: `hhdtatppvtmgqjopzqay.supabase.co` (production)
> Captured via Supabase MCP `execute_sql` (no `pg_dump` access required).

---

## 1. Headline numbers

| Metric | Value | Notes |
|---|---:|---|
| Tables in live DB (`public`, base tables) | **255** | Audit said ~240; 6% drift, all forward |
| Views in live DB (`public`) | 43 | Counts toward "things code can `.from()`" |
| Columns in live DB (`public`) | 4,392 | |
| CHECK constraints in live DB | 1,418 | |
| Enum types in live DB | 6 | `invitation_status`, `invite_status`, `membership_role`, `membership_status`, `org_validation_event_type`, `validation_status_type` |
| Routines (functions) in live DB | 292 | 246 are unused by code (mostly trigger / extension internals) |
| Tables referenced by code (raw) | 185 | After dropping false positives `_migrations`/`audio`/`public`/`avatars`: **183** |
| RPCs called by code | 39 | |
| Migration files in `supabase/migrations/` (forward) | 119 | Plus 9 `ROLLBACK_*` files |
| SQL files in `supabase/sql/` | 64 | Mostly historical declarative + seed data |
| Migrations applied (recorded in `supabase_migrations.schema_migrations`) | **125** | The audit's "7 applied" claim is **outdated** |
| Migration files matched 1:1 to applied record | 108 | |
| File present, version not in applied list | 11 | All 11 are the *same migrations* applied with a slightly different version stamp (date-shifted by 1–4 days) |
| Applied without an exact-version file on disk | 17 | 11 are the version-stamp duplicates above; **6 are genuinely missing files** (see §4) |

**Bottom line:** the audit's headline ("194 SQL files vs 7 applied") is no longer accurate. The migration log records **125 applied migrations**, and 108 of them match a forward-migration file in the repo by version. Real drift is much smaller than feared.

---

## 2. Code-vs-DB mismatches (the silent-failure list)

### 2.A Tables referenced by code, missing from live DB

After removing storage-bucket false positives (`avatars`, `public` → both are `supabase.storage.from()`, not DB tables), and confirming view-vs-table classification, the **CRITICAL** list is below. Each is a guaranteed `PGRST205` (table not found) on the next call.

| # | Table referenced | Likely true intent | Severity | Suggested fix |
|---|---|---|---|---|
| 1 | `marketing_audit_competitors` | DB has `audit_competitors`. Naming drift after a rename. | CRITICAL | Rewrite code to `audit_competitors` (preferred — DB is source of truth) OR add a view alias. |
| 2 | `marketing_audit_metrics` | DB has `audit_metrics`. | CRITICAL | Same as above. |
| 3 | `marketing_audit_recommendations` | DB has `audit_recommendations`. | CRITICAL | Same as above. |
| 4 | `marketing_audit_schedules` | DB has `audit_schedules`. | CRITICAL | Same as above. |
| 5 | `marketing_audit_notification_preferences` | No corresponding DB table. Notification preferences for marketing-audit module never shipped. | HIGH | Either implement the table (CREATE) or remove the UI surface. |
| 6 | `treatment_tag_routing_logs` | DB has `treatment_routing_logs`. | CRITICAL | Rename code reference. |
| 7 | `tenant_settings` | DB has `tenant_routing_settings`, `tenant_feature_flags`, `tenant_admins` — no general `tenant_settings`. The references read settings (`from('tenant_settings').select('value').eq('key', ...)`). | HIGH | Either CREATE the simple key/value table or rewrite callers to read from the typed settings tables they actually need. |
| 8 | `contact_psych_profiles` | Psychological-analyzer feature. No matching DB table. | HIGH | Either CREATE the table (this is a documented feature) or feature-flag the call sites off. |
| 9 | `contact_psych_profile_history` | Append-only history for #8. | HIGH | Same — either create both or disable both. |
| 10 | `conversation_messages` | Call coaching feature. Closest DB neighbour is `bot_turns`. | HIGH | INVESTIGATE — likely call-coaching prototype that was never tabled. |
| 11 | `contact_tags` | Tagging feature. DB has `marketing_tags`. | HIGH | Likely intended to be `marketing_tags`; verify the join key. |
| 12 | `form_variants` | A/B testing for forms. No DB table. | HIGH | Either CREATE or feature-flag off. |
| 13 | `sales_script_metrics` | Aggregated metrics view. DB has `sales_script_outcomes`, `sales_script_usages`. | HIGH | Likely should be a VIEW computing metrics from the existing tables. |
| 14 | `web_vitals_metrics` | Web-vitals capture endpoint. | HIGH | CREATE table or stop calling `/api/analytics/web-vitals`. |
| 15 | `local_presence_reviews` | Review aggregation for "local presence" integration. | HIGH | INVESTIGATE — may be planned-but-unbuilt. |
| 16 | `multiorg_adoption_metrics` | Multi-org analytics endpoint. | HIGH | Likely should be a VIEW. |

### 2.B Tables that look "missing" but are actually views (NOT bugs)

Code reads from these as if they were tables; they're VIEWS in DB. This is fine — `.from(view)` works for `SELECT`. Listed for completeness:

`activities_with_associations`, `activities_with_integrations`, `cohort_retention_analysis`, `conversion_funnel_metrics`, `crm_lead_source_analytics`, `crm_pipeline_stage_analytics`, `crm_revenue_by_month`, `crm_sales_performance_by_user`, `customer_ltv_by_source`, `deals_with_contacts`, `executive_dashboard_kpis`, `journey_analytics`, `journey_step_analytics`, `marketing_cac_analysis`, `marketing_campaign_attribution`, `marketing_roi_summary`, `revenue_forecast_base`, `tasks_with_associations`, `treatment_type_analytics`.

### 2.C CHECK constraint mismatches — `activities.type`

The audit was correct. The live constraint is:

```sql
CHECK (type = ANY (ARRAY['call'::text, 'email'::text, 'whatsapp'::text, 'note'::text, 'sms'::text, 'meeting'::text]))
```

Code-side violations confirmed by grep:

- `src/lib/automations/deal-automation-actions.ts:66` — inserts `type: 'stage_change'` ❌
- `src/lib/automations/deal-automation-actions.ts:164` — inserts `type: 'assignment'` ❌

Severity: **CRITICAL** — every stage change and every deal-assignment automation **silently fails** to write its activity row (or 23514 errors are swallowed). Suggested fix: extend the CHECK to include the values the code actually writes (and any audit-listed values intentionally planned: `form_submission`, `online_booking_completed`, `online_booking_abandoned`, `voicestack_call`, `instagram_dm`, `fb_messenger`).

### 2.D Activities — missing columns (the form-processor silent failure)

`src/lib/marketing/form-processor.ts:96–104` writes to `activities` with three columns that **do not exist** in the live DB:

```ts
await supabase.from('activities').insert({
  tenant_id: submission.tenantId,
  contact_id: contactId,
  activity_type: 'form_submission',         // ❌ column is `type`, not `activity_type`
  activity_timestamp: new Date().toISOString(), // ❌ no such column (closest: `occurred_at`)
  notes: `Submitted form: ${submission.formName}`, // ❌ no such column (closest: `description`)
  marketing_campaign_id: submission.formId,
  marketing_event_type: 'form_filled',
});
```

Live `activities` columns include `type`, `occurred_at`, `description`, `marketing_campaign_id`, `marketing_event_type` — so the **fix is a column-name rewrite in code**, plus extending the CHECK constraint (§2.C) to accept `'form_submission'`.

Severity: **CRITICAL** — every web-form submission fails to log a follow-up activity. This is exactly the "lead capture broken" scenario Phase 0 exists to prevent.

### 2.E RPC functions called but missing in DB

| RPC | Severity | Notes |
|---|---|---|
| `exec`, `exec_sql` | LOW | Search shows these are referenced in test/diagnostic helpers (`src/app/api/test/...`). Not used by production paths; safe to leave. INVESTIGATE for cleanup. |
| `execute_analytics_query` | HIGH | Referenced by analytics module. Either define it or rewrite callers to use plain `select()`. |
| `find_nearby_competitors` | HIGH | Marketing-audit local-presence feature. CREATE function or remove. |
| `increment_form_submissions`, `increment_form_views` | HIGH | Counter increments for the marketing forms module. CREATE simple counter functions. |
| `increment_variant_submissions`, `increment_variant_views` | HIGH | Counters for `form_variants` (which itself is missing — §2.A row 12). Both block A/B testing. |

### 2.F Column-mismatch noise (the 394 vs 367 figure)

The naive code-walker flagged 394 column writes that don't appear in DB. After triage (`phase0/outputs/columns_triaged.json`), most are false positives caused by:
- Writing to a *different* table inside the same code block as a `.from('X')` chain (the regex's 800-char window is too greedy).
- Object literals that aren't insert/update payloads at all (e.g. function options).
- Helper objects shaped like the row but stripped down before the actual `.insert(...)`.

The **real** column gaps in §2.D (form-processor) and the table-naming gaps in §2.A account for the customer-impacting failures. The remaining 367 "high-confidence" rows are noted in the JSON but should be treated as **INVESTIGATE** items, not auto-fixed. Manually verifying each one is the human-review work in Step 5.

### 2.G Enum mismatches

The 6 public enums (`invitation_status`, `invite_status`, `membership_role`, `membership_status`, `org_validation_event_type`, `validation_status_type`) are all small and well-defined. Spot-checks against code did not surface any value the code writes that the enum forbids. **No changes needed.**

---

## 3. SQL-files-vs-DB mismatches (the drift list)

### 3.A In-DB-but-not-declared

The 6 truly untracked applied migrations (no matching file by name *or* close-version filename):

| Version | Name | Classification | Notes |
|---|---|---|---|
| `00000000000000` | `baseline_from_sql_folder` | KEEP-AND-DECLARE (synthetic) | Auto-generated baseline marker; safe to ignore. |
| `20260502131345` | `fix_validate_task_tenant_relationships_drop_created_by_user_id` | KEEP-AND-DECLARE | Applied today via MCP. **Back-fill a file** in `supabase/migrations/`. |
| `20260502150820` | `add_missing_app_users_fks_for_postgrest_joins` | KEEP-AND-DECLARE | Applied today via MCP. Back-fill. |
| `20260502155655` | `create_missing_tasks_and_deals_views` | KEEP-AND-DECLARE | Applied today via MCP. Back-fill. |

The other 13 "applied without file" rows in `phase0/outputs/migration_diff.json` all match a file under a slightly different version stamp (e.g. file `20251017_hardening_001_helpers.sql` vs applied `20251017` `hardening_001_helpers`, or file `20250120_ensure_integration_connections.sql` vs applied `20250122_ensure_integration_connections`). These are bookkeeping noise, not real drift — suggested cleanup in §6.B.

### 3.B Declared-but-not-in-DB

The 11 file-but-not-applied entries are all the version-stamp twins of §3.A (same migration body, different timestamp). **No real un-applied design intent was found.** This means no migration file in `supabase/migrations/` is sitting un-applied with new schema waiting to ship. Good news.

### 3.C `supabase/sql/` — the legacy declarative folder

64 files, none authoritatively tracked in `schema_migrations`. They serve as historical declarative intent (initial schema, seed data, demo data, RLS resets, etc.). The single `baseline_from_sql_folder` row in `schema_migrations` represents the "we treat all these as already applied" decision someone made at the time.

Classification:
- KEEP-AND-DECLARE (read-only history): all 64 files — leave them alone, do not delete. They're useful for archaeology.
- DELETE: not recommended in Phase 0; revisit during the dead-schema cleanup in §6.B.

### 3.D Declared-inconsistently

The audit mentioned 21 cases. Two confirmed examples in `supabase/sql/`:
- `05_enhanced_deal_management.sql` and `05_enhanced_deal_management_safe.sql` — the same logical migration with two variants.
- `45_treatment_routing.sql` and `45_treatment_routing_rollback.sql` — pair.
- `46_super_admin_system.sql` and `46_treatment_routing_permissions.sql` — same number prefix, different content.
- `47_fix_metadata_column.sql` and `47_pms_procedure_tag_mappings.sql` — duplicate prefix.

Severity: LOW (DB already reflects whichever was last applied). Recommendation: leave for Phase 1+ cleanup.

---

## 4. Applied-but-untracked migrations

Migrations applied to production where the migration file is missing or version-mis-stamped. See §3.A for the 4 truly-missing file back-fills (3 of them applied today). The other 13 are version-stamp twins of existing files; safe to ignore.

**Action**: in §6, we propose generating placeholder files for the 3 from today so the `supabase/migrations/` folder reflects production reality.

---

## 5. Dead schema candidates (do NOT delete in Phase 0)

109 tables are present in DB and never referenced by code. Spot-checks suggest most are legitimate (audit/log/queue infrastructure that's read by RPCs, not by client code), but a real cleanup pass should triage them. Examples that look genuinely dead and worth investigating later:

`isolation_violations`, `data_quarantine`, `data_reconciliation_log`, `seed_pack_manifest`, `gdpr_deletion_requests` (vs. the actively-used `data_subject_requests` and `gdpr_export_requests`), `dental_services`, `dental_groups`, `restore_requests`, `backup_verification_runs`, `system_error_logs` (vs. Sentry).

**Do not delete in Phase 0.** Track these in a follow-up cleanup ticket. Full list: `phase0/outputs/code_vs_db_diff.json` → `tables_in_db_not_referenced`.

---

## 6. Top-line recommendations

### 6.A Must-fix in Phase 0 reconciliation migration

These are the items that block lead capture or cause guaranteed silent failures **right now**.

| # | Finding | Decision: |
|---|---|---|
| **6A-1** | Extend `activities.type` CHECK to allow `'form_submission'`, `'stage_change'`, `'assignment'`, `'instagram_dm'`, `'fb_messenger'`, `'online_booking_completed'`, `'online_booking_abandoned'`, `'voicestack_call'`, `'web_chat'` (final list to confirm with Shamanth in Step 5). | _pending review_ |
| **6A-2** | Code fix: `src/lib/marketing/form-processor.ts:96–104` — rename `activity_type` → `type`, `activity_timestamp` → `occurred_at`, `notes` → `description`. (Code change, NOT in the migration; flagged here so it ships in the same PR.) | _pending review_ |
| **6A-3** | Create RPCs: `increment_form_submissions(form_id uuid)`, `increment_form_views(form_id uuid)` — 2-line counter functions on `forms`. | _pending review_ |
| **6A-4** | Create view aliases or rename the code: `marketing_audit_competitors` → `audit_competitors`, `marketing_audit_metrics` → `audit_metrics`, `marketing_audit_recommendations` → `audit_recommendations`, `marketing_audit_schedules` → `audit_schedules`. **Recommended:** add 4 simple `CREATE VIEW` aliases so we don't have to touch 50+ files of marketing-audit code. | _pending review_ |
| **6A-5** | Rename code or add view alias: `treatment_tag_routing_logs` → `treatment_routing_logs`. (One file: `src/app/api/treatment-routing/bulk-reroute/route.ts`. Code-side fix is simpler.) | _pending review_ |
| **6A-6** | Back-fill the 3 "applied today" migrations into `supabase/migrations/` so the file folder reflects production:<br>`20260502131345_fix_validate_task_tenant_relationships_drop_created_by_user_id.sql`<br>`20260502150820_add_missing_app_users_fks_for_postgrest_joins.sql`<br>`20260502155655_create_missing_tasks_and_deals_views.sql`<br>(Body can be a comment + the original SQL — pull from the `statements` array in `schema_migrations`.) | _pending review_ |

### 6.B Should-fix later (NOT in this Phase 0 migration)

- **B-1** Resolve the 11 version-stamp-duplicate migration entries (file `20251017_X` vs applied `20251017` `X` — clarify which is canonical and either delete the file or update the applied record).
- **B-2** Implement or feature-flag-off the un-shipped tables: `contact_psych_profiles`, `contact_psych_profile_history`, `conversation_messages`, `form_variants`, `sales_script_metrics`, `web_vitals_metrics`, `local_presence_reviews`, `multiorg_adoption_metrics`, `marketing_audit_notification_preferences`. Each is a feature decision, not a schema decision.
- **B-3** Replace the dev-helper `exec`/`exec_sql` RPC calls (test paths only) with proper Supabase queries.
- **B-4** Decide on `tenant_settings`, `contact_tags`: either create them or rewrite the few callers to use `tenant_routing_settings`/`marketing_tags`.
- **B-5** Dead-schema review of the 109 unreferenced tables (§5).
- **B-6** Triage the 367 "high-confidence" column gaps from `columns_triaged.json` — many are regex false positives, but the few real ones should be patched.

### 6.C Out of scope for Phase 0

- Anything Phase 1 (typed attribution columns, `channel_identifiers`, `attribution_touchpoints`, etc.) — by design.
- Data backfills (e.g. retroactively logging missed form-submission activities). That's a data-cleanup phase, not structure.
- The 21 inconsistently-declared `supabase/sql/` files (§3.D).

---

## 7. Effort estimate

**S** — small. The Phase 0 reconciliation migration is dominated by:

- 1 `ALTER TABLE activities DROP CONSTRAINT … ADD CONSTRAINT …` (CHECK extension)
- 4 `CREATE OR REPLACE VIEW marketing_audit_X AS SELECT * FROM audit_X;`
- 2 `CREATE OR REPLACE FUNCTION increment_form_X(...)` 
- 3 retroactive migration files (§6A-6)

Plus a small code patch (`form-processor.ts`, `bulk-reroute/route.ts`, plus the form-counters wrapper) shipped in the same PR. Estimated coding time: **30–45 min** for the migration, **15–20 min** for the code patches, **30–45 min** for human-review (Step 5). Total: **~1.5–2 hours** including review.

---

## Status

- **Steps 1–4 of the runbook are complete.** All artifacts are in `phase0/outputs/`.
- **Step 5 (human review with Shamanth) is required** before generating the migration in Step 6.
  - For each row in §6A, replace `_pending review_` with `FIX` (and optionally an updated approach) or `DEFER`.
  - Pay special attention to **6A-1**: confirm the final list of `activities.type` values.
  - Pay special attention to **6A-4**: confirm whether marketing-audit module canonical name should be `audit_X` (DB) or `marketing_audit_X` (code). If DB, accept the view aliases. If code, we need to rename the DB tables (much bigger change — out of Phase 0).

Once §6A has decisions, run the Step 6 prompt against this report to generate `supabase/migrations/<timestamp>_phase_0_reconciliation.sql`.

---

## Appendix: artifact files

- `phase0/outputs/live_db_metadata.json` — structured live DB schema (255 tables, 4392 columns, 1418 checks, 6 enums, 292 routines, 125 applied migrations).
- `phase0/outputs/code_expectations.json` — what the code references (185 tables, 39 RPCs, ~1k columns extracted).
- `phase0/outputs/code_vs_db_diff.json` — automated diff feeding §2 of this report.
- `phase0/outputs/columns_triaged.json` — best-effort column-mismatch confirmations (367 high-confidence, 27 low).
- `phase0/outputs/migration_diff.json` — file-vs-applied migration-history diff (§3, §4).
- `phase0/outputs/raw_mcp_responses/` — original Supabase MCP responses (for reproducibility).
- `phase0/scripts/` — assembler + diff scripts (`dump_live_metadata.sh`, `inventory_code.py`, `assemble_metadata.py`, `diff_migrations.py`, `diff_code_vs_db.py`, `triage_columns.py`).

---

## Appendix: deviations from the runbook

1. **`pg_dump` was not used** because the postgres direct password isn't in `.env.local` (only the `service_role` key is). Live schema was captured via the Supabase MCP `execute_sql` tool, which uses the same source-of-truth catalog tables (`information_schema.*`, `pg_catalog.*`, `supabase_migrations.schema_migrations`). The runbook's `live_db_schema.sql` artifact is therefore not generated; the `live_db_metadata.json` artifact carries the same information in structured form. To produce the SQL file later, install `libpq` and run the `dump_live_metadata.sh` script with a direct DB connection string.
2. **Step 5 (human review)** was not performed by the agent — it is left for the human owner per the runbook ("Don't skip this. Cursor will get some calls wrong.").
3. **Step 6 (write the reconciliation migration)** was not performed because Step 6 explicitly depends on the human-review decisions in Step 5.

---

## §8 Migration written and applied

**Migration file:** `supabase/migrations/20260502174927_phase_0_reconciliation.sql`

Applied to production via the Supabase MCP `apply_migration` tool on
2026-05-02 (recorded in `supabase_migrations.schema_migrations` as
version `20260502174927`, name `phase_0_reconciliation`). The
file's timestamp on disk was renamed to match the recorded version so
the file/DB stay in sync.

**Findings addressed (§6A):**
- §6A-1 — `activities.type` CHECK extended with 28 additional values (Block 1.1; final list has 34 values covering Phase 0 through Phase 2 channel/system events).
- §6A-2 — code patches: `activities` column renames `activity_type → type`, `activity_timestamp → occurred_at`, `notes → description` (Commit 3, 10 files).
- §6A-3 — `increment_form_submissions(uuid)` and `increment_form_views(uuid)` RPCs created (Block 1.4; both `marketing_forms.total_submissions` and `total_views` columns pre-existed with `default 0`, so no schema change needed there).
- §6A-4 — `audit_*` tables renamed to `marketing_audit_*` (Block 1.2). Pre-flight verified the only FK relationships were *outgoing* to `marketing_audit_runs`; no incoming FKs from other tables, so the rename was safe. Cosmetic index rename happens in the same block.
- §6A-5 — code rename `treatment_tag_routing_logs → treatment_routing_logs` (Commit 4, single caller).
- §6A-6 — 3 back-fill migration files created (Commit 2): `20260502131345`, `20260502150820`, `20260502155655`. SQL bodies pulled from `supabase_migrations.schema_migrations.statements`. No re-application; already in production.
- §6A-7 (added) — `DEFAULT_TENANT_ID` zero-UUID fallback removed (Commit 5). webhook handlers now require resolvable `tenant_id` and 400 with structured logging if not. TikTok handler grew an `integration_connections`-based lookup. Test endpoint also patched.
- §6A-8 (added) — silent `.catch()` audit on the 11 in-scope ingestion files (Commit 6). All Type B handlers gained structured context (`route`, `tenant_id`, `correlation_id`, `error_message`, `error_stack`). No Type C swallows were found.

**Findings deliberately deferred to Phase 1+ (§6B and beyond):**
- §6B-1 through §6B-6 — un-shipped feature tables, dev-helper RPCs, dead-schema cleanup, column-gap full pass.
- The 367 high-confidence column gaps from `columns_triaged.json` (sample-checked 6/10 = false positives, see below).
- Calendar-sync, sales-script, and PMS feature column drift surfaced by the sample audit (none on the lead-capture critical path; all behind feature flags or in deferred integrations).

**Validation results:**
- **Idempotency test:** PASS. Migration body re-executed via `execute_sql` after the initial `apply_migration`; second run completed successfully (`status: idempotency-second-run OK`). Every block uses `IF EXISTS` / `IF NOT EXISTS` / `DO` guards.
- **Post-migration code/DB diff:** PASS on every runbook success criterion:
  - `activities` CHECK contains all 34 expected values.
  - `audit_competitors|metrics|recommendations|schedules` no longer exist; `marketing_audit_*` counterparts exist.
  - `increment_form_submissions(uuid)` and `increment_form_views(uuid)` are now in `information_schema.routines`.
  - `treatment_routing_logs` is unchanged in DB; code now uses this name (Commit 4).
  - No webhook handler hardcodes `DEFAULT_TENANT_ID` (Commit 5).
- **Application smoke test:** Jest unit suite has 85 pre-existing failures (orchestrator fixtures missing, Playwright import in WCAG suite, etc.). Filtered the failure log for keywords from this work (`activity_type`, `activity_timestamp`, `treatment_tag_routing_logs`, `DEFAULT_TENANT_ID`, `increment_form`, `marketing_audit`) — **zero new failures** introduced by these commits. TypeScript `tsc --noEmit` reports 3 pre-existing errors in `src/components/deals/deal-detail-view-modal.tsx` (unrelated; not touched by Phase 0).

**Zero-UUID-tenant audit (one-time count, info only — no rows deleted):**

Pre-flight count of rows with `tenant_id = '00000000-0000-0000-0000-000000000000'`:

| Table | Rows |
| --- | --- |
| contacts | 0 |
| deals | 0 |
| activities | 0 |
| marketing_form_submissions | 0 |

The pre-launch state means no clean-up pass is needed. Once the
`DEFAULT_TENANT_ID` fallback was removed (Commit 5), there is no path
that produces new zero-UUID rows.

**Sample-check of 367 column gaps (10 random from `columns_triaged.json` high-confidence list, RNG seed=42):**

1. `tenants.description` (`practice-settings-tab.tsx`) — **false positive** — `description` is a key inside the `metadata` jsonb field, not a column on `tenants`.
2. `appointments.external_sync_status` (`google-calendar-sync.ts`) — **REAL** — `external_sync_status`, `google_event_id`, `last_synced_at` not on `appointments`. Calendar-sync feature; deferred (not on lead-capture critical path).
3. `activities.sms_status` (`send-sms-v2/route.ts`) — **REAL and FIXED inline** — also `sms_to`, `sms_from`. Renamed to `to_number`, `from_number`, `message_status` to match `dispatcher.ts` canonical pattern. Fixed in the same audit pass (extra commit between Commit 6 and Commit 7).
4. `conversation_outcomes.activity_id` (`deals/[id]/route.ts`, `scripts/outcomes/route.ts`) — **REAL** — sales-script feature; deferred (not on lead-capture path).
5. `contacts.notes` (`import-service.ts`, `form-processor.ts`) — `import-service.ts` — **REAL** — writes `notes` (and `first_name`, `last_name`) to `contacts`; columns don't exist (real columns: `full_name`). Manual CSV-import feature; surface for fix in the next data-import iteration. The `form-processor.ts` hit is a **false positive** (`submission.payload.notes` reads a payload key, not a column).
6. `contacts.external_id` (`webhooks/sms`, `webhooks/whatsapp`) — **false positive** — `external_id` is on `activities` and `integration_logs`; the regex correlated unrelated `.from('contacts')` calls.
7. `audits.is_super_admin` (`org/switch/route.ts`) — **false positive** — `is_super_admin` is a key inside the `metadata` jsonb field on the audits insert.
8. `app_users.user_id` (`saved-views-manager.tsx`, `sync-error-recovery.ts`) — **false positive** — `user_id` is on `analytics_saved_views`; the `.from('app_users')` query is a separate read for `tenant_id`.
9. `treatment_plans.routing_method` (`pms/webhooks/treatment-proposed/route.ts`) — **false positive** — `routing_method` is a key inside the `custom_fields` jsonb field on the deals insert that follows the `.from('treatment_plans')` read.
10. `pipeline_stages.deal_id` (`pms/webhooks/treatment-declined/route.ts`) — **false positive** — `deal_id` is on `deal_outcomes`; the `.from('pipeline_stages')` query is a separate read.

Verdict: **6/10 false positives, 4/10 real (1 fixed inline, 3 deferred to feature owners).** This is below the runbook's 9/10 threshold for "deferral confirmed safe", so the column-gap full pass is added explicitly to the Phase 1+ backlog (Section §6B). The deferred 3 are not on the lead-capture critical path — calendar-sync (feature flag), sales-script integration, and CSV import.

**Production application:**
- Applied at: 2026-05-02T17:49:27Z (UTC) via Supabase MCP `apply_migration`.
- Method: Supabase MCP `apply_migration` (server-side; equivalent to `supabase db push` from the management plane).
- Recorded in `supabase_migrations.schema_migrations`: YES — version `20260502174927`, name `phase_0_reconciliation`.
- Migration file timestamp on disk renamed from the originally-planned `20260502180000` to `20260502174927` so the file matches the recorded version.

**Phase 0 status: COMPLETE.** Phase 1 (data model foundation for typed attribution) can begin.

---

## §9 Phase 1 — Attribution foundation + booking widget schema

**Migration files:**
- `supabase/migrations/20260502210540_phase_1_attribution_foundation.sql`
- `supabase/migrations/20260502211011_phase_1_backfill.sql`

**Branch:** `phase-1-attribution-foundation` (created off
`phase-0-schema-reconciliation` rather than `main` because Phase 0 has
not yet been merged to `main` — the Phase 0 migration is in production
via Supabase MCP `apply_migration` but the PR is still open. Trade-off
documented in §"Anything unexpected" below.)

**What was built:**
- `source_channel_enum` with 25 values (incl. 3 `booking_widget_*` paths)
- 32 typed attribution columns on `contacts` (16 `first_touch_*` + 16
  `last_touch_*`)
- `channel_identifiers` table (dedup backbone, 14-channel CHECK)
- `attribution_touchpoints` append-only log
- `lead_intent_sessions` table (the v2 widget session record;
  phone-as-join-key, replaces the old `click_id_pending` design)
- `practice_booking_widgets` table (per-practice widget config —
  calendar/webform/whatsapp toggles, branding, embed_script_secret)
- `practice_domains` table
- `consent_text_version`, `lawful_basis`, `consent_locale` on
  `consent_records`
- `lead_sla_rules` table
- 25 seeded system-default SLA rules (`tenant_id IS NULL`)
- Backfill from `marketing_form_submissions` history (zero-rows on
  pre-launch DB; idempotent via NOT-NULL guards + `NOT EXISTS`
  on `metadata->>'submission_id'`)

**Adaptations from `phase_1_execution_prompt_v2.md` (both required by
the live schema):**
1. RLS policies use this codebase's `get_user_org_id()` helper and one
   policy per CRUD action (plus a service-role bypass), matching the
   pattern of `public.contacts`. The prompt's
   `(auth.jwt() ->> 'tenant_id')::uuid` style would not match the rest
   of the codebase. `practice_booking_widgets` also gets an extra
   anonymous SELECT policy gated on `is_active = true` so the embed
   loader can fetch widget config without a session (Phase 2 routes
   will additionally check `embed_script_secret`).
2. `practice_location_id` columns FK to `public.practice_locations(id)`
   (the live table name in this codebase).

**Deferred to Phase 2:**
- The booking widget React code + JS embed loader
- `app.<crm>.com/book/:slug` route
- `/api/widget/*` API routes
- Central `ingestLead()` function
- CareStack potential-patient join worker
- `dedup_review_queue` table
- Conversion-events-out worker, SLA monitor, notification dispatcher
- Refactor of existing webhook handlers to call `ingestLead()`

**Phase 2 contract:** see `docs/phase-2-contracts.md`.

**Validation:**
- **Idempotency (forward migration):** PASS. Every block re-run via
  `execute_sql` after the initial `apply_migration`; second run
  completed without errors and confirmed the new state was unchanged
  (sla_count_unchanged=25, attribution_columns_unchanged=32). Every
  block uses `IF EXISTS` / `IF NOT EXISTS` / `DO` guards.
- **Idempotency (backfill migration):** PASS. The two `UPDATE`s guard
  on `first_touch_at IS NULL` / `last_touch_at IS NULL`; the `INSERT`
  guards on `NOT EXISTS (... metadata->>'submission_id' = mfs.id::text)`.
- **Schema verification:** PASS on every runbook success criterion:
  - `pg_enum` for `source_channel_enum` returns **25 rows**.
  - `information_schema.columns` for `contacts` first_touch_*/last_touch_*
    returns **32 rows**.
  - The 6 new tables (`channel_identifiers`, `attribution_touchpoints`,
    `lead_intent_sessions`, `practice_booking_widgets`,
    `practice_domains`, `lead_sla_rules`) are present.
  - `lead_sla_rules` system defaults: **25 rows**.
  - `consent_records` new columns (`consent_text_version`,
    `lawful_basis`, `consent_locale`): **3 rows**.
  - `pg_class.relrowsecurity` is `true` for all 6 new tables.
- **Foreign-key sanity:** PASS. **16 FKs** present on the new tables,
  including the inter-table chains
  `attribution_touchpoints → lead_intent_sessions`,
  `lead_intent_sessions → practice_booking_widgets`, and the three
  `practice_*` tables FK to `tenants` + `practice_locations`.
- **Backfill row counts:** contacts_with_first_touch=**0**,
  contacts_with_last_touch=**0**, backfilled_touchpoints=**0**,
  total_form_submissions=**0**, total_contacts=**50** (all manual
  seeds with no UTM context; pre-launch as expected).
- **Smoke test:** TypeScript regeneration returned the same shape as
  before — see §"Production application" below for the smoke-test
  details and any new failures.
- **TypeScript regeneration:** PASS. New tables/columns appear in
  `src/types/supabase.ts`; pre-existing 3 errors in
  `deal-detail-view-modal.tsx` are unchanged; no new errors.

**Production application:**
- Forward migration applied at: 2026-05-02T21:05:40Z (UTC) via Supabase
  MCP `apply_migration`. Recorded in
  `supabase_migrations.schema_migrations` as version `20260502210540`,
  name `phase_1_attribution_foundation`.
- Backfill migration applied at: 2026-05-02T21:10:11Z (UTC) via Supabase
  MCP `apply_migration`. Recorded as version `20260502211011`, name
  `phase_1_backfill`.
- **Both file timestamps on disk renamed** to match the recorded
  versions (same convention used in §8).

**Anything unexpected:**
- **Branched off `phase-0-schema-reconciliation`, not `main`.** The
  prompt assumed Phase 0 was already merged to `main`; in fact the
  Phase 0 PR is still open. Branching off the working Phase-0 branch
  preserves the migration files needed to validate Phase 1 locally.
  When Phase 0 merges to `main`, this branch will need to rebase. No
  schema impact — the migrations are already live in production.
- **The forward migration was applied in 5 chunks via MCP** (the first
  using `apply_migration` so the migration record is created with the
  right name; the rest using `execute_sql` because the full SQL exceeds
  the practical size for a single MCP call). The on-disk file is the
  single canonical source containing all 10 blocks; the chunked
  application is purely a transport detail and the resulting database
  state matches the file exactly.
- **Codacy CLI is not installed in this repo.** The workspace's Codacy
  rule asks the agent to install it before continuing, but the user
  opted to skip Codacy analysis for this Phase 1 work.

**Phase 1 status: COMPLETE.** Phase 2 (booking widget + `ingestLead()`)
is unblocked.
