# Documentation Index (Verified — 100% read)
**Last updated:** 27 May 2026 · every one of 1069 files read in full and classified by content.
Tags: **CURRENT** = still accurate · **history** = point-in-time record · **SUPERSEDED**/**outdated** = replaced by a newer doc (see `_superseded/`).
> For the verified what-works-vs-broken picture see `COMPLETED_VS_PENDING_LEDGER.md`; for secrets to rotate see `SECRETS_TO_ROTATE.md`.

## Topics

- Architecture — 30 files
- Database & Schema — 106 files
- Auth, Tenancy & Roles — 103 files
- Onboarding & Invitations — 26 files
- CRM Core — 106 files
- Marketing — 85 files
- AI & Automation — 61 files
- Integrations & Communications — 70 files
- Deployment & Ops — 106 files
- Testing & QA — 60 files
- Product & Features — 112 files
- Audit & Analysis — 48 files
- Build History — 92 files
- Third-party (deps) — 28 files

---

## Architecture
*30 files — CURRENT:26, outdated:3, history:1*

| Status | File | What it actually contains |
|---|---|---|
| CURRENT | `F04_frontend_architecture.md` | Audit of the frontend codebase (264K LOC, 600+ components). Identifies critical issues: force-dynamic at root layout def |
| CURRENT | `CURRENT_STATE_OF_THE_DENTAL_CRM.md` | Comprehensive developer reference consolidating ~224 durable docs and cross-checking them against the codebase (commit 8 |
| CURRENT | `stack_cost_summary.md` | Auto-generated tech stack inventory and monthly cost breakdown from October 2025 covering all infrastructure components, |
| CURRENT | `06_ARCHITECTURE_AND_DEVOPS.md` | Architecture audit with Mermaid flowchart, deployment pipeline description (Railway Nixpacks), observability setup (Pino |
| CURRENT | `ARCHITECTURE_ANALYSIS_REPORT.md` | A generated architecture analysis report covering TypeScript compilation status, ESLint code quality, npm security audit |
| CURRENT | `FINAL_ANALYSIS_SUMMARY.md` | An executive-level summary of the architecture analysis for the dental CRM, identifying 3 blocking TypeScript errors, 19 |
| CURRENT | `README.md` | An index file for the architecture-reports directory describing the contents of each generated report and providing quic |
| CURRENT | `00_START_HERE.md` | A navigation guide to the dental CRM documentation, directing new readers to three canonical reference documents (curren |
| CURRENT | `CURRENT_STATE_OF_THE_DENTAL_CRM.md` | Authoritative consolidation of ~224 durable docs cross-checked against actual code and migrations as of commit 800dc80 ( |
| CURRENT | `ARCHITECTURE_ANALYSIS_TOOLS.md` | How-to guide for 7 architecture analysis tools (SonarQube, Semgrep, Dependency-Cruiser, npm audit, TypeScript, ESLint, B |
| CURRENT | `CRM_ARCHITECTURE_OVERVIEW.md` | Comprehensive single-file architecture overview with real code snippets covering the full tech stack, auth flow, RLS pat |
| CURRENT | `DATA_CAPTURE_AND_CONTEXT.md` | Technical reference for all data entry points including form builder, contact deduplication, PMS sync webhook, activity  |
| CURRENT | `ENTERPRISE_ARCHITECTURE_MASTER.md` | Comprehensive enterprise architecture document v1.0 (October 16 2025) with full DDL schema, RLS policies, hierarchical f |
| CURRENT | `QUICK_START_ARCHITECTURE_ANALYSIS.md` | Quick reference guide for running npm run analyze:architecture to generate reports in architecture-reports/ folder inclu |
| CURRENT | `17-additional-findings.md` | Summarises architectural concerns including in-memory rate limiting (lost on restart), inconsistent tenant resolution pa |
| CURRENT | `CLAUDE.md` | The canonical project manifest for the dental CRM instructing Claude Code on how to work with founder Toffee (Deepak), c |
| CURRENT | `COMPREHENSIVE_DOCS.md` | Concise technical documentation covering installation, tech stack (Next.js 15, React 19, Supabase, Tailwind 4, Zod), pro |
| CURRENT | `MASTER_FIX_FINAL_SUMMARY.txt` | Completion certificate for a 12-phase enterprise security hardening initiative (v10.0) delivering 12 SQL migrations, ent |
| CURRENT | `PROJECT_MASTER_DOCUMENTATION.md` | High-level master documentation for Dental CRM v8.1 covering technical stack (Next.js 15, Supabase, Railway), architectu |
| CURRENT | `README.md` | Top-level project README declaring v1.0.0 of the dental CRM as 100% complete with 279/279 tasks done, covering tech stac |
| CURRENT | `SUPER_ADMIN_COMPLETE.md` | Completion summary for the separate dental-crm-admin Next.js app including analytics tracking SDK, four dashboard pages, |
| CURRENT | `TECHNICAL_LOG.md` | Comprehensive developer reference documenting architecture decisions, core database schema, deployment config, performan |
| CURRENT | `crm-tech-stack.md` | Comprehensive reference document covering the full technology stack: Next.js 14/React 19/TypeScript frontend, Supabase P |
| CURRENT | `adapter-integration-pattern.md` | Explains the Adapter Pattern for the Universal Treatment Tag Routing System showing how routeDealWithAdapter() simplifie |
| CURRENT | `routing-engine-api.md` | Full API reference for the Universal Treatment Tag Routing System covering routeDealWithAdapter(), routeDealToPipeline() |
| CURRENT | `architecture.md` | Technical architecture for the Marketing Audit module describing the Orchestrator→Connector→Scoring pipeline, directory  |
| outdated | `ENTERPRISE_ARCHITECTURE_ASSESSMENT.md` | Sales-pitch-style document evaluating hosting options (Vercel free, Railway, AWS). Recommends Railway.app for the curren |
| outdated | `MULTI_LOCATION_ARCHITECTURE.md` | Architecture documentation for multi-location and seat-based billing covering design principles (zero impact on single-l |
| history | `SUPER_ADMIN_BUILD_PLAN.md` | Architecture plan for a separate Next.js super-admin app (dental-crm-admin/) with 60 tasks covering database analytics t |
| outdated | `repo-map.md` | Auto-generated architectural overview of the CRM (as of October 14, 2025) documenting module boundaries, key files, data |

## Database & Schema
*106 files — CURRENT:75, history:23, SUPERSEDED:6, outdated:2*

| Status | File | What it actually contains |
|---|---|---|
| CURRENT | `SKILL.md` | Skill manifest for a comprehensive Postgres performance optimization guide organized into 8 priority categories (query,  |
| CURRENT | `_contributing.md` | Internal authoring guide for contributors creating Postgres best-practice reference files, covering structure, SQL forma |
| CURRENT | `_sections.md` | Defines the 8 rule category sections and their filename prefixes used to auto-assign Postgres best-practice rules within |
| CURRENT | `_template.md` | Blank template with YAML frontmatter and markdown skeleton for creating new Postgres best-practice reference files. |
| CURRENT | `advanced-full-text-search.md` | Explains why LIKE-based search is unindexable and shows how to use generated tsvector columns with GIN indexes for 100x  |
| CURRENT | `advanced-jsonb-indexing.md` | Covers GIN indexing strategies for JSONB columns including operator class selection (jsonb_ops vs jsonb_path_ops) and ex |
| CURRENT | `conn-idle-timeout.md` | Shows how to reclaim idle connection slots using idle_in_transaction_session_timeout and idle_session_timeout server set |
| CURRENT | `conn-limits.md` | Explains how to size max_connections and work_mem based on available RAM to prevent memory exhaustion and database crash |
| CURRENT | `conn-pooling.md` | Explains the cost of per-request Postgres connections and demonstrates PgBouncer transaction-mode pooling to handle 10-1 |
| CURRENT | `conn-prepared-statements.md` | Explains why named prepared statements fail in transaction-mode pooling and provides three workarounds: unnamed statemen |
| CURRENT | `data-batch-inserts.md` | Shows how to replace individual INSERT statements with multi-row batches or COPY command for 10-50x faster bulk data loa |
| CURRENT | `data-n-plus-one.md` | Shows how to replace per-item query loops with single batch queries using ANY(array[...]) or JOINs to reduce 100+ round  |
| CURRENT | `data-pagination.md` | Explains why OFFSET pagination degrades on deep pages and shows keyset/cursor pagination pattern using WHERE id > last_i |
| CURRENT | `data-upsert.md` | Demonstrates INSERT ... ON CONFLICT as an atomic upsert alternative to the check-then-insert race condition pattern. |
| CURRENT | `lock-advisory.md` | Explains advisory locks as a lightweight coordination mechanism and shows session-level, transaction-level, and try-lock |
| CURRENT | `lock-deadlock-prevention.md` | Shows how to eliminate deadlocks by acquiring row locks in consistent (e.g., ID ascending) order using SELECT ... FOR UP |
| CURRENT | `lock-short-transactions.md` | Explains why long transactions (especially those with external API calls mid-transaction) cause lock contention and show |
| CURRENT | `lock-skip-locked.md` | Shows the FOR UPDATE SKIP LOCKED pattern for parallel worker queues where multiple workers can each claim a different pe |
| CURRENT | `monitor-explain-analyze.md` | Demonstrates EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) usage and how to interpret key plan node types such as Seq Scan, hi |
| CURRENT | `monitor-pg-stat-statements.md` | Shows how to enable pg_stat_statements extension and query it for slowest-by-total-time, most-frequent, and high-mean-la |
| CURRENT | `monitor-vacuum-analyze.md` | Explains how stale planner statistics cause wrong query plans and shows manual ANALYZE usage, autovacuum tuning for high |
| CURRENT | `query-composite-indexes.md` | Explains leftmost prefix rules for composite indexes and recommends placing equality-filter columns before range-filter  |
| CURRENT | `query-covering-indexes.md` | Shows how to use INCLUDE clause in index definitions to cover all columns needed by a query, enabling index-only scans t |
| CURRENT | `query-index-types.md` | Provides a reference guide mapping Postgres index types (B-tree, GIN, GiST, BRIN, Hash) to their supported operators and |
| CURRENT | `query-missing-indexes.md` | Explains how unindexed filter and join columns cause full sequential scans and shows the EXPLAIN output difference befor |
| CURRENT | `query-partial-indexes.md` | Shows how to create partial indexes with a WHERE clause to index only a subset of rows, producing smaller indexes and fa |
| CURRENT | `schema-constraints.md` | Documents that PostgreSQL does not support ADD CONSTRAINT IF NOT EXISTS and provides a DO $$ block pattern using pg_cons |
| CURRENT | `schema-data-types.md` | Provides a best-practice data type reference recommending bigint identity PKs, text over varchar(n), timestamptz over ti |
| CURRENT | `schema-foreign-key-indexes.md` | Highlights that Postgres does not auto-index FK columns and provides a diagnostic query against pg_constraint and pg_ind |
| CURRENT | `schema-lowercase-identifiers.md` | Explains PostgreSQL case-folding rules and why quoted mixed-case identifiers cause tool/ORM/AI compatibility issues, rec |
| CURRENT | `schema-partitioning.md` | Shows range-based time partitioning syntax, explains partition pruning for date queries, and contrasts instantaneous DRO |
| CURRENT | `schema-primary-keys.md` | Compares serial, bigint identity, UUIDv4, and UUIDv7 primary key strategies with guidance on when to use each based on s |
| CURRENT | `phase-2b-11-prompt.md` | Execution prompt adding conversation_id (uuidv5-derived) to activities table, backfilling existing rows, stamping it on  |
| CURRENT | `phase_0_schema_reality_check_runbook.md` | How-to guide for schema reconciliation between live database and codebase. Defines a 9-step process: dump live DB, inven |
| CURRENT | `SCHEMA_INVENTORY.md` | Comprehensive static analysis of all 265 tables, 255 functions, 70 triggers, and 225 RLS policies across both schema sys |
| CURRENT | `lock-skip-locked.md` | Explains how to use SELECT FOR UPDATE SKIP LOCKED in PostgreSQL to allow multiple workers to process queue rows in paral |
| CURRENT | `monitor-explain-analyze.md` | Reference guide showing how to use EXPLAIN (ANALYZE, BUFFERS) to identify query bottlenecks including missing indexes, p |
| CURRENT | `monitor-pg-stat-statements.md` | Reference guide for enabling and querying the pg_stat_statements extension to identify the slowest and most frequent que |
| CURRENT | `monitor-vacuum-analyze.md` | Reference guide for keeping PostgreSQL query planner statistics fresh via VACUUM and ANALYZE, including autovacuum tunin |
| CURRENT | `query-composite-indexes.md` | Reference guide explaining composite index column ordering (equality columns first, range columns last) for efficient mu |
| CURRENT | `query-covering-indexes.md` | Reference guide for using the INCLUDE clause on indexes to enable index-only scans that serve all queried columns withou |
| CURRENT | `query-index-types.md` | Reference guide comparing B-tree, GIN, GiST, BRIN, and Hash index types with use-case guidance for choosing the optimal  |
| CURRENT | `query-missing-indexes.md` | Reference guide demonstrating the critical importance of indexing columns used in WHERE filters and JOIN predicates to a |
| CURRENT | `query-partial-indexes.md` | Reference guide for partial indexes (indexes with a WHERE clause) to create smaller, faster indexes for queries that con |
| CURRENT | `schema-constraints.md` | Reference guide for adding constraints idempotently in PostgreSQL migrations using DO $$ blocks with pg_constraint check |
| CURRENT | `schema-data-types.md` | Reference guide for PostgreSQL data type selection covering when to use bigint vs int, text vs varchar, timestamptz vs t |
| CURRENT | `schema-foreign-key-indexes.md` | Reference guide explaining that PostgreSQL does not auto-index foreign key columns and providing a query to find all mis |
| CURRENT | `schema-lowercase-identifiers.md` | Reference guide explaining why PostgreSQL identifiers should be lowercase snake_case to avoid quoting requirements and c |
| CURRENT | `schema-partitioning.md` | Reference guide for PostgreSQL table partitioning by range (e.g., monthly time buckets), covering when to partition, syn |
| CURRENT | `schema-primary-keys.md` | Reference guide comparing primary key strategies (IDENTITY bigint, UUIDv4, UUIDv7) and recommending bigint GENERATED ALW |
| CURRENT | `02_DATA_MODEL_AND_TENANCY.md` | Comprehensive data model audit covering all canonical entities, the ERD, multi-tenant RLS helper functions, soft-delete  |
| CURRENT | `2b-8-1-changes.md` | Applies the 2b.8-authored migration that drops 14 legacy plain-text outbound credential columns from tenants and the orp |
| CURRENT | `README.md` | Explains the migrations-pending directory workflow for SQL migrations authored by a phase but not yet applied, and confi |
| CURRENT | `11-field-mappings-and-transformations.md` | Documents the 2 field name mismatches between onboarding form fields and database columns (address_line1 vs address, pho |
| CURRENT | `14-data-flow-all-entities.md` | Documents CRUD operations, tenant/location scoping, and foreign key relationships for all CRM entities including contact |
| CURRENT | `ALL_FIXES_SUMMARY.md` | Summary of two database migration fixes dated October 17, 2025: creation of the tenant_admins table (replacing incorrect |
| CURRENT | `PASTE_THESE_4_SQL_FILES.md` | Operational runbook providing four complete SQL scripts to apply marketing forms RLS policies, form versioning with roll |
| CURRENT | `PHASE_1_COMPLETE.md` | Documents creation of four new Supabase database tables for the universal treatment tag routing system: treatment_tags,  |
| CURRENT | `PLAN.md` | Comprehensive plan for seeding a dental practice demo dataset with 50 patients, 120 deals, 105 appointments, 3 locations |
| CURRENT | `RUN_THESE_4_SQL_FILES.md` | Contains the full SQL for four migrations (60–63) to be pasted into Supabase: saved_deal_views table, deals performance  |
| CURRENT | `SETUP_GUIDE.md` | A 7-step guide for running a single SQL migration file (RUN_THIS_IN_SUPABASE.sql) to create 10 enterprise tables includi |
| CURRENT | `V11_QUICK_REFERENCE.md` | Quick-reference card confirming all 12 database hardening migrations applied, achieving 256+ RLS policies and security g |
| CURRENT | `VERSION_10_HARDENED_COMPLETE.md` | Master completion report for v10.0 enterprise hardening delivering 12 SQL migrations, 5 TypeScript files, 4 test suites, |
| CURRENT | `01-database-schema.md` | Comprehensive column-by-column documentation of core tables: auth.users, app_users, tenants, locations, user_tenant_memb |
| CURRENT | `DATABASE_ARCHITECTURE.md` | High-level ERD and architecture overview showing relationships between tenants, app_users, contacts, pipelines, pipeline |
| CURRENT | `MARKETING_MIGRATION_GUIDE.md` | Explains how to safely run the marketing-to-CRM database migration (file 25_marketing_crm_integration.sql) that adds mar |
| CURRENT | `MIGRATIONS_QUICKSTART.md` | Quick-reference guide for running three treatment-routing SQL migration files (45, 46, 47) in the Supabase SQL Editor to |
| CURRENT | `PASTE_INTO_SUPABASE_SQL_EDITOR.md` | Contains the complete SQL for two migration files: settings versioning/governance tables (settings_versions, settings_ap |
| CURRENT | `PASTE_IN_SUPABASE_SQL_MIGRATIONS.md` | Lists two migration files to run to fix a console error on notifications unread count and activate the Calendar/Appointm |
| CURRENT | `RUN_MIGRATIONS_MANUAL_GUIDE.md` | Step-by-step manual guide for running treatment routing migrations 45, 46, optional 46a (permission_key type fix), and 4 |
| CURRENT | `marketing-audit-database-schema.md` | Reference documentation for the 8-table marketing audit database schema (schema version 1.0, Jan 16 2025). Tables: marke |
| CURRENT | `practice-groups.md` | Spec introducing practice_groups and user_group_memberships tables to allow task assignment to job-function groups (e.g. |
| CURRENT | `task-data-model.md` | Schema delta document listing all additive changes to the existing tasks table and related tables needed for the 2b.58+  |
| CURRENT | `phase0-sales-intelligence.md` | Reference document for the 20251107_phase0_sales_intelligence.sql migration, describing the sales intelligence schema la |
| CURRENT | `reconciliation_report.md` | Detailed audit report from 2026-05-02 reconciling the live Supabase production database (255 tables, 125 applied migrati |
| history | `phase-2a-5-cleanup-prompt.md` | Execution prompt to drop lead_intakes, lead_sources, and auto_categorize_lead, delete shadow tables forms/form_submissio |
| history | `phase_0_execution_prompt.md` | Execution prompt for schema reconciliation: extend activities.type CHECK constraint to 30+ values, rename audit_* tables |
| history | `phase_1_execution_prompt_v2.md` | Execution prompt creating 6 new attribution tables, defining the 25-value source_channel_enum, adding 32 attribution col |
| history | `phase_2a_1_foundations_and_cleanup.md` | Execution prompt creating treatment_types (20 UK dental treatments), practice_treatment_offerings, and practice_notifica |
| outdated | `MIGRATION_GUIDE.md` | Step-by-step migration guide for the multi-location and seat-based billing system covering backup, environment setup, fe |
| history | `PERMISSION_KEY_TYPE_FIX_COMPLETE.md` | Documents a self-healing migration fix for migration 46 that auto-detects and corrects role_permissions.permission_key c |
| SUPERSEDED | `ROLE_PERMISSIONS_FIX_COMPLETE.md` | Documents a self-healing migration fix for migration 46 that auto-detects and renames the permission column in role_perm |
| history | `ALL_ISSUES_FIXED.md` | Comprehensive summary of three migration-blocking issues fixed on October 17 2025: missing tenant_admins table, non-idem |
| history | `CONSOLE_ERROR_FIXED.md` | Debug note documenting that the Activity Feed console error was caused by the user_activity_log table not existing yet,  |
| history | `FOREIGN_KEY_FIX_COMPLETE.md` | Documents the fix for a foreign key constraint error in the role_permissions table where role_id incorrectly referenced  |
| history | `ISSUE_4_FIXED.md` | Documents the fix for migration 004 which referenced non-existent tables role_definitions and permissions instead of the |
| history | `NULL_COLUMN_TYPE_FIX_COMPLETE.md` | Documents a fix for a migration error where querying information_schema.columns for a non-existent permission_key column |
| history | `POLICY_DEPENDENCY_FIX_COMPLETE.md` | Documents a two-step migration fix for changing role_permissions.permission_key from UUID to TEXT type, handling depende |
| history | `PRACTICE_LOCATIONS_FIX_COMPLETE.md` | Documents fix for 'relation practice_locations does not exist' migration error by making foreign key constraints conditi |
| outdated | `QUICK_FIX_REFERENCE.md` | Reference card documenting the fix for 'relation super_admins does not exist' error by creating a new tenant_admins tabl |
| history | `START_HERE.md` | Navigation guide for deploying a one-migration fix that resolves a missing super_admins table error by introducing the t |
| history | `ALL_MIGRATIONS_FIXED_SUMMARY.md` | Documents resolution of 4 migration errors encountered while running treatment routing SQL migrations: missing practice_ |
| history | `DEALS_TABLE_FIX.md` | Documents replacement of 9 occurrences of appUser?.tenant_id with appUser?.active_tenant_id in deals-table.tsx to fix 'E |
| history | `FIX_CONSTRAINT_IDEMPOTENT.md` | Documents wrapping ADD CONSTRAINT statements in DO $$ IF NOT EXISTS $$ blocks to make migrations idempotent, fixing 'con |
| history | `HOW_TO_RUN_MIGRATION_NOW.md` | Operational guide directing the user to run three SQL migration files (MIGRATION_PART_1_USERS, PART_2_ENTERPRISE, PART_3 |
| history | `MIGRATIONS_APPLIED_SUCCESS.txt` | Confirms all 12 database hardening migrations were applied, achieving 256+ RLS policies, 25+ helper functions, 8+ valida |
| history | `MIGRATION_47_FIX_COMPLETE.md` | Documents the resolution of a missing update_timestamp() trigger function in migration 47 (pms_procedure_tag_mappings) b |
| SUPERSEDED | `MIGRATION_EXECUTION_ORDER.md` | Ordered reference guide for the 12 database hardening migrations (v10.0), providing file names, purposes, estimated time |
| history | `MIGRATION_IMPACT_SUMMARY.md` | Critical pre-migration analysis identifying four blocking issues: dual conflicting schemas for the locations table (addr |
| SUPERSEDED | `MIGRATION_REQUIRED.md` | Instructs running 05_enhanced_deal_management_safe.sql to fix a FK constraint error when creating deals, adding 20+ new  |
| history | `MIGRATION_STATUS_CHECK.md` | Snapshot showing migrations 01–63 complete (deal/contact saved views and performance indexes) and migration 64 (marketin |
| SUPERSEDED | `PHASE_1_DATABASE_MIGRATION_GUIDE.md` | Step-by-step instructions for running migration 18_enterprise_tasks_activities.sql which adds task types, activity outco |
| history | `PRE_MIGRATION_IMPACT_ANALYSIS.md` | Detailed impact analysis identifying critical schema mismatch (locations table has two conflicting schemas across migrat |
| history | `VERSION_11_MIGRATIONS_APPLIED.md` | Milestone document confirming all 12 hardening migrations are applied, documenting what each migration created (256+ RLS |
| SUPERSEDED | `DEPLOY_NOW.md` | Ultra-quick deployment guide for the multi-location and billing schema migrations (20251018_001 through _009), documenti |
| SUPERSEDED | `FIXED_DEPLOYMENT_GUIDE.md` | Corrected migration order guide that resolves the super_admins vs tenant_admins table conflict, providing exact SQL Edit |

## Auth, Tenancy & Roles
*103 files — CURRENT:49, history:42, SUPERSEDED:11, outdated:1*

| Status | File | What it actually contains |
|---|---|---|
| CURRENT | `security-privileges.md` | Shows how to create minimal-permission roles for read-only and write-limited application access and how to revoke the de |
| CURRENT | `security-rls-basics.md` | Explains RLS concepts and shows how to enable it on a table, create a policy using current_setting or auth.uid(), and us |
| CURRENT | `security-rls-performance.md` | Shows the (select auth.uid()) wrapping trick to cache the function result once per query instead of per row, and securit |
| CURRENT | `F03_api_surface.md` | Comprehensive inventory of 182 HTTP routes in the dental CRM. Documents five auth patterns (A–E), with only Pattern A fu |
| CURRENT | `security-privileges.md` | Reference guide for granting minimal, specific PostgreSQL privileges using role separation (readonly vs writer roles) an |
| CURRENT | `security-rls-basics.md` | Reference guide for enabling PostgreSQL RLS on tables with policy examples using current_setting('app.current_user_id')  |
| CURRENT | `security-rls-performance.md` | Reference guide for writing performant RLS policies, covering the SELECT-wrapped function trick to prevent per-row evalu |
| CURRENT | `05_SECURITY_PRIVACY_COMPLIANCE.md` | Security audit documenting auth model (Supabase middleware + RLS), role/permission matrix, secrets handling, audit table |
| CURRENT | `2b-5-changes.md` | Closes the P0 unauthenticated-send vulnerability by wrapping all six outbound routes and the AI draft-email route throug |
| CURRENT | `2b-7-changes.md` | Closes three unauthenticated settings PATCH routes (email/sms/whatsapp credentials), deletes /api/emails/welcome spam ve |
| CURRENT | `API_REFERENCE.md` | Reference documentation for multi-location and billing API endpoints covering organization discovery, join requests, use |
| CURRENT | `ARCHITECTURE_CHANGE_IMPACT_ANALYSIS.md` | Impact analysis for removing auto-tenant creation from signup, concluding risk level LOW with no breaking changes as RLS |
| CURRENT | `ARCHITECTURE_IMPLEMENTATION_REPORT.md` | Multi-org/multi-location architecture implementation report with Phase 1 complete covering RLS hardening, location switc |
| CURRENT | `02-auth-signup-flow.md` | Traces the complete signup flow from form submission through Supabase Auth user creation, app_users insert, and dashboar |
| CURRENT | `06-multi-tenancy-implementation.md` | Documents active tenant/location tracking via app_users fields, org-switching API, user_tenant_memberships schema, and R |
| CURRENT | `08-location-based-roles-complete-analysis.md` | Confirms the membership_locations table is fully implemented with role_override, scope, and five DB helper functions, bu |
| CURRENT | `10-tenant-id-constraint-definitive-answer.md` | Definitively resolves the tenant_id nullable question: the column was made nullable in migration 20251030, a BEFORE INSE |
| CURRENT | `13-security-permissions-complete.md` | Documents the layered security implementation including Supabase Auth, PERMISSIONS matrix, RLS policies on core tables,  |
| CURRENT | `ALL_60_PERMISSIONS.md` | Marketing-style reference listing all 60+ granular permission keys across 9 categories (deals, contacts, pipelines, task |
| CURRENT | `LEGACY_TENANT_ID_AUDIT.md` | Code audit of 205 occurrences of app_users.tenant_id identifying 2 critical context-derivation usages that must be migra |
| CURRENT | `SECURITY.md` | Formal security policy document covering authentication, authorization, data protection, API security, application secur |
| CURRENT | `SECURITY_GUIDE.md` | Brief cheat-sheet covering environment variable hygiene, authentication settings, data protection principles, RBAC/RLS a |
| CURRENT | `USER_TENANT_RELATIONSHIP_EXPLAINED.md` | Explains the multi-tenant architecture where every user must belong to a tenant, covers solo vs invited-user onboarding  |
| CURRENT | `03-organization-creation.md` | Line-by-line technical reference documenting the POST /api/orgs/create endpoint including the 9-step sequence (auth, get |
| CURRENT | `ACCOUNT_SETUP_FIX.md` | Documents an auto-repair system for users whose auth.users record exists but app_users record is missing, replacing the  |
| CURRENT | `CHECKPOINT_2025_10_28.md` | Comprehensive checkpoint documenting a fully operational multi-tenant CRM on October 28 2025 with RLS-based tenant isola |
| CURRENT | `COMPLETE_ENTERPRISE_TRANSFORMATION.md` | Documents an enterprise transformation session completing 24 tasks plus a critical RLS security fix that enabled row-lev |
| CURRENT | `DELIVERY_SUMMARY_FIX.md` | Delivery summary for the fix of a super_admins relation-not-found error by creating a separate tenant_admins table and u |
| CURRENT | `EDGE_CASES_TESTING.md` | Comprehensive documentation of 15 authentication edge cases (duplicate email, network errors, weak password, rate limiti |
| CURRENT | `ENTERPRISE_SYSTEM_COMPLETE.md` | Completion record for the enterprise multi-user system adding unlimited custom roles, 60+ granular permissions, comprehe |
| CURRENT | `FINAL_AUDIT_SUMMARY.md` | Documents a comprehensive end-to-end audit of authentication, navigation, and performance issues resolved on October 14, |
| CURRENT | `FINAL_STATUS_ALL_10_PHASES_COMPLETE.md` | Completion report for a 10-phase enterprise multi-tenant security overhaul dated October 16, 2025, increasing security s |
| CURRENT | `FIX_USER_ACCOUNT.md` | A troubleshooting guide for fixing a user account (toffeehegde@gmail.com) stuck in 'Account Setup Error' due to a missin |
| CURRENT | `HONEST_ASSESSMENT_REPORT.md` | An honest multi-tenant architecture assessment dated January 20, 2025 confirming per-tenant Twilio/email credentials are |
| CURRENT | `IMPLEMENTATION_COMPLETE.md` | Completion record dated October 30 2025 documenting removal of automatic tenant creation from sign-up, making app_users. |
| CURRENT | `IMPLEMENTATION_STATUS_FINAL.md` | Final status report dated October 27 2025 confirming all 12 engineering tasks complete including export security fixes,  |
| CURRENT | `LOCATION_SWITCHER_RESTORED.md` | Documents restoring the missing LocationSwitcher UI component to the dashboard by creating a /api/tenant/context endpoin |
| CURRENT | `LOCATION_SWITCH_406_ERROR_ROOT_CAUSE.md` | Root cause analysis of 406 Supabase RLS errors occurring after location switch because useAuth's appUser state still hol |
| CURRENT | `PHASE_2_COMPLETE.md` | Documents creation of 21 granular permission definitions for the treatment routing system across four categories (tags,  |
| CURRENT | `QUICK_START_CHECKLIST.md` | Checklist-format quick start for the enterprise RBAC/audit system covering migration deployment, and manual testing of c |
| CURRENT | `SAFE_DELETE_GUIDE.md` | Instructions for safely deleting test user accounts from Supabase auth without deleting the primary (oldest) user accoun |
| CURRENT | `STEP5_LOCATION_FILTERING_AUDIT.md` | Security audit dated October 27 2025 identifying critical vulnerabilities in contact and deal APIs including client-supp |
| CURRENT | `USER_FLOWS_DOCUMENTATION.md` | Detailed documentation of all eight authentication and onboarding user flows including signup, signin, password reset, e |
| CURRENT | `WORLD_CLASS_IMPLEMENTATION_COMPLETE.md` | Final report for October 27 2025 security sprint that fixed 2 critical cross-tenant data-exfiltration vulnerabilities in |
| CURRENT | `TASK_STATUS_AND_NEXT_STEPS.md` | Status document confirming 13 engineering tasks complete (security fixes for /api/export endpoints, 7 contacts API updat |
| CURRENT | `HARDENING_MASTER_COMPLETE.md` | Master completion document for the 12-phase security hardening effort delivering 12 SQL migrations, 5 TypeScript files,  |
| CURRENT | `preflight.md` | Comprehensive security audit identifying 28 gaps across 12 categories including 4 P0 critical risks: entitlement bypass  |
| CURRENT | `ARCHITECTURE_VERIFICATION_REPORT.md` | Architecture audit verifying 8 core requirements for the multi-tenant CRM, finding a critical conflict: a database trigg |
| CURRENT | `DEEP_DIVE_VERIFICATION_REPORT.md` | Deep-dive audit identifying a CRITICAL gap: navigation guards are completely absent from both middleware files, meaning  |
| history | `phase-2b-5-prompt.md` | Execution prompt closing a P0 security hole where all outbound send routes (/api/communications/send-*) accepted tenant_ |
| history | `SIGNUP_DEBUG_INSTRUCTIONS.txt` | Temporary debugging note instructing the developer to open the browser console during sign-up and paste specific debug l |
| history | `SIGNUP_ERRORS_FIXED.txt` | Point-in-time fix record documenting three resolved signup/onboarding errors: missing pipelines.description column (400) |
| history | `SIGNUP_FIX_DEPLOYED.txt` | Brief deployment announcement confirming a fix for duplicate user constraint error, missing email/status fields, pipelin |
| history | `TASKS_COMPLETE_SUMMARY.txt` | Completion summary claiming three tasks done: authentication system rebuild with multi-step validation, error boundaries |
| history | `TENANT_ID_FIX_DEPLOYED.txt` | Short fix announcement noting the root cause of 'invalid input syntax for type uuid: undefined' was appUser not being fu |
| history | `TENANT_ID_UNDEFINED_FIXED.txt` | Fix record documenting a 3-retry-with-1s-delay solution for tenant_id not being available from app_users during onboardi |
| history | `IMPLEMENTATION_SUMMARY.md` | October 2025 summary claiming complete implementation of multi-location and seat-based billing with 39 files, ~10,900 LO |
| history | `MULTI_TENANCY_AUDIT.md` | October 2025 audit finding that RLS was disabled and fix implementing complete RLS across all tables via a new migration |
| history | `INTELLIGENT_WORKFLOWS.md` | Describes auth flow UX improvements for signup/signin cross-redirect with smart email pre-fill, not automation workflows |
| history | `AUTHENTICATION_QUICK_START.md` | A combined completion summary and quick-start guide confirming 30 tasks done (20 demo data + 10 auth), listing all key f |
| history | `AUTHENTICATION_SYSTEM_COMPLETE.md` | Comprehensive documentation of the complete auth system covering sign-up, sign-in, password reset, onboarding wizard, in |
| history | `AUTH_FLOW_COMPLETE_FIX.md` | Documents fixes for two auth bugs: (1) sign-up showing false errors due to transient issues and (2) dashboard stuck on ' |
| history | `AUTH_FLOW_FIX.md` | Identifies and fixes a redirect loop where signup without email confirmation created an auth user but no session, causin |
| history | `AUTH_PAGES_REDESIGNED.md` | Announces a visual redesign of login, sign-up, and password-reset pages to a split-screen enterprise style inspired by S |
| history | `CRITICAL_SECURITY_AUDIT.md` | A P0 security audit from October 16, 2025 identifying 80+ hardcoded tenant IDs in 50+ files, queries missing tenant filt |
| history | `ENTERPRISE_MULTI_TENANT_SECURITY_MASTER_PLAN.md` | Research-backed 40-hour master plan for transforming multi-tenant security to enterprise grade, covering OWASP/NIST best |
| history | `ENTERPRISE_SECURITY_FIX_MASTER_PLAN.md` | Execution-level companion to the master plan, listing 10 concrete phases with file counts, hours, and deliverables for f |
| SUPERSEDED | `ENTERPRISE_SECURITY_STATUS_COMPREHENSIVE.md` | Status snapshot at 60% completion showing 4 SQL migrations ready to run (architecture, data integrity, data migration, R |
| history | `FIX_AUTH_SCHEMA_COMPLETE.md` | Documents the complete resolution of 'permission denied for schema auth' errors across 5 migrations by moving function c |
| SUPERSEDED | `FIX_AUTH_SCHEMA_PERMISSIONS.md` | Initial fix document for 'permission denied for schema auth' in migrations 004 and 007, replacing direct auth.users tabl |
| history | `FIX_PERMISSION_FINAL.md` | Third-iteration fix resolving column 'permission_key does not exist' by confirming the Phase 7 RBAC schema uses permissi |
| history | `FIX_PERMISSION_SCHEMA.md` | Second-iteration fix for migration 004 column errors, identifying that the deployed database uses the original permissio |
| SUPERSEDED | `FIX_SIGNUP_WORKFLOW.md` | Urgent fix guide instructing user to run URGENT_FIX_SIGNUP.sql to make app_users.tenant_id nullable after sign-ups start |
| history | `FIX_SUMMARY_tenant_admins.md` | Documents the renaming of a conflicting super_admins table reference to tenant_admins, creating migration 001a_create_te |
| SUPERSEDED | `MIGRATION_FIX_AUTH_PERMISSION.md` | Brief fix note documenting the change of a function creation from auth schema to public schema in migration 20251027_001 |
| SUPERSEDED | `SECURITY_FIX_PROGRESS_DETAILED.md` | Detailed file-by-file tracker showing 18 of 103 files with hardcoded tenant IDs have been fixed (all critical deal, pipe |
| SUPERSEDED | `SECURITY_FIX_PROGRESS_STATUS.md` | Phase-level progress tracker at 60% completion: phases 1-5 (research, architecture SQL, data integrity SQL, data migrati |
| SUPERSEDED | `SIGNUP_FIX_COMPLETE.md` | Records the fix that made app_users.tenant_id nullable, dropped the auto-create-tenant trigger, and cleaned up an orphan |
| outdated | `TEST_SIGNUP_LOCALLY.md` | A brief prompt asking the developer to test the sign-up flow at localhost:3000/sign-up and report any console errors bef |
| history | `VERSION_9_CHECKPOINT_SECURITY_ARCHITECTURE.md` | Comprehensive checkpoint document dated October 16, 2025 describing the discovery of 124 hardcoded tenant IDs across 103 |
| history | `🏆_ENTERPRISE_SECURITY_100_PERCENT_COMPLETE.md` | Final summary declaring all 10 phases of the security overhaul complete, covering RLS on 50+ tables, 200+ RLS policies,  |
| history | `COMPLETE_SYSTEM_AUDIT_REPORT.md` | Audit finding that the entire CRM was non-functional due to RLS policies requiring an app_users record with tenant_id, a |
| history | `COMPREHENSIVE_FIX_STATUS.md` | Describes the root cause (stale React state after location switch causing RLS 406 errors) and fix (forced full page relo |
| history | `DUPLICATE_ACCOUNT_FIX.md` | Troubleshooting guide and code fix for duplicate key violations during signup caused by partial account creation when em |
| SUPERSEDED | `IMMEDIATE_FIX_INSTRUCTIONS.md` | Three-step urgent fix for a sign-up failure caused by app_users.tenant_id having a NOT NULL constraint while the code tr |
| SUPERSEDED | `IMPLEMENTATION_MASTER_PLAN.md` | Phased execution checklist created October 27 2025 covering security fixes to export endpoints, API context refactoring  |
| history | `PHASE_6_COMPLETE_ALL_FILES_FIXED.md` | Documents removal of all 124 hardcoded tenant ID occurrences ('550e8400-e29b-41d4-a716-446655440000') from 109+ files ac |
| SUPERSEDED | `PHASE_6_EXECUTION_PLAN.md` | Pre-execution plan for removing 124 hardcoded tenant ID occurrences across 103 files, organized by priority: critical UI |
| history | `URGENT_FIX_GUIDE.md` | Targeted debugging and repair guide for a specific user (deepakshegde@gmail.com) encountering an Account Setup Incomplet |
| history | `VERSION_9_QUICK_REFERENCE.md` | Quick-reference card for the v9.0-security-architecture git tag, summarising the elimination of 124 hardcoded tenant IDs |
| history | `🚨_CRITICAL_AUDIT_AND_FIX.md` | Diagnostic note identifying that core CRM inserts and queries return nothing because the RLS auth.get_user_tenant_id() f |
| history | `🚨_DATA_HIDDEN_BY_RLS.md` | Explains that 60 contacts and 120 deals in the Smile tenant are invisible because they were created before location supp |
| history | `MIGRATION_004_READY.md` | Documents the fix for a column-reference error in migration 004 (create_join_requests) where rp.permission_key was corre |
| history | `MIGRATION_ANALYSIS_AND_FIX.md` | Analyzes and resolves a PostgreSQL function signature conflict when creating user_has_location_access() in migration 202 |
| history | `MIGRATION_STATUS_FINAL.md` | Status report dated October 17 2025 confirming three migration errors (missing tenant_admins table, duplicate constraint |
| SUPERSEDED | `RUN_MIGRATION_NOW.md` | Quick reference confirming three issues resolved in migration 20251027_001_strict_rls_auth_function.sql: schema permissi |
| history | `RUN_THESE_4_SQL_MIGRATIONS_IN_SUPABASE.md` | Urgent instruction to run 4 security migrations (phase 2 architecture, phase 3 data integrity, phase 4 data migration fi |
| history | `IMPLEMENTATION_PROGRESS.md` | Progress report dated October 16, 2025 showing Phase 1 RLS Foundations at 75% complete with 3 of 4 migrations applied, d |
| history | `a1_rls_inventory.txt` | SQL test output from the RLS inventory check showing 142 public tables, 77 with RLS enabled, 146 with tenant_id column,  |
| history | `a2_rls_functional.txt` | Single functional RLS test result confirming that the deals table SELECT policy has a tenant_id filter, with status PASS |
| history | `a3_soft_delete_updated_at.txt` | Single test result confirming that service role can see soft-deleted contacts (count 1, expected 1, PASS), likely one re |
| history | `a4_entitlements.txt` | Single test result showing quota correctly set (limit 1000, used 0, reset in future) with PASS status for the entitlemen |
| history | `a5_quotas.txt` | Single test result showing that the quota trigger on marketing_campaign_sends does not exist, recorded as INFO (not a fa |

## Onboarding & Invitations
*26 files — CURRENT:16, history:8, SUPERSEDED:2*

| Status | File | What it actually contains |
|---|---|---|
| CURRENT | `07-issues-and-analysis.md` | Detailed audit of onboarding wizard bugs including race conditions in wizard initialization, data source conflicts betwe |
| CURRENT | `CONFIRMED_REQUIREMENTS_AND_PLAN.md` | Documents confirmed requirements for a role-based invite system (6-char codes, 7-day expiry, explicit role assignment) a |
| CURRENT | `OPTION2_IMPLEMENTATION_STATUS.md` | Phase 1 completion report for a 6-phase invite system built October 27 2025, with pending_invites table, role-assigned-b |
| CURRENT | `PROJECT_COMPLETE_FINAL.md` | Final completion report for a 6-phase multi-organization invite system delivering database schema, 7 API endpoints, 12 U |
| CURRENT | `PHASE5_ROLLOUT_COMPLETE.md` | Completion record for Phase 5 of the invite/org system rollout, delivering useOrgGuard hook, OrgRequiredModal component, |
| CURRENT | `PHASE2_API_COMPLETE.md` | Documents completion of Phase 2 invite and organization management API endpoints including POST /api/invites/create with |
| CURRENT | `04-wizard-architecture.md` | Technical deep-dive into WizardProvider context at src/contexts/wizard-context.tsx. Documents state variables, initializ |
| CURRENT | `05-wizard-step-components.md` | Analysis of 10 step components in src/components/onboarding/steps/. Key issues documented: empty dependency arrays in us |
| CURRENT | `09-invitation-system-complete-flow.md` | Complete documentation of the invitation system. Two systems exist: pending_invites (modern, 6-char alphanumeric codes)  |
| CURRENT | `CHECKPOINT_ONBOARDING_FIXES.md` | November 1, 2025 checkpoint documenting schema mismatch fixes. DB uses address/phone; code was querying address_line1/ph |
| CURRENT | `EXISTING_ONBOARDING_AUDIT.md` | October 27, 2025 audit of the existing onboarding system. Verdict: STRONG FOUNDATION - EXTEND, DON'T REBUILD. Recommends |
| CURRENT | `FIX_INVITES_RLS.md` | Debug note for permission denied for table users error on /api/invites/list. Root cause: RLS policy directly querying au |
| CURRENT | `NEW_ONBOARDING_WORKFLOW_IMPLEMENTATION.md` | October 27, 2025 implementation plan addressing orphaned org problem from auto-tenant creation. Solution: force explicit |
| CURRENT | `ONBOARDING_ANALYSIS_COMPLETE.md` | Comprehensive analysis with 3 critical bugs: (1) org description not saved — code uses description but DB column is comp |
| CURRENT | `PHASE4_ONBOARDING_INTEGRATION_COMPLETE.md` | October 27, 2025 Phase 4 completion document. Built IntegratedOnboardingFlow component (319 lines) at src/components/onb |
| CURRENT | `RUN_INVITES_MIGRATION.md` | Operational guide for running supabase/migrations/20251027_004_pending_invites_system.sql. Includes expected output form |
| SUPERSEDED | `REVOLUTIONARY_ONBOARDING_COMPLETE.txt` | Completion announcement describing a redesigned onboarding flow where users reach the dashboard immediately after signup |
| history | `READY_FOR_WORKFLOW_IMPLEMENTATION.md` | Build fixes completion note from October 27 2025 documenting four resolved build errors and the new onboarding workflow  |
| history | `ARCHITECTURE_ANALYSIS.md` | Root cause analysis of the onboarding wizard race condition with 4 identified issues including data loading race, resume |
| history | `ALL_TASKS_COMPLETE.md` | Completion summary for authentication and onboarding system tasks including user journey testing, error handling for 15+ |
| history | `PHASE3_UI_COMPLETE.md` | Documents completion of four invite-related React/TypeScript UI components: InviteDetectionBanner, OrgDecisionModal, Cre |
| history | `PHASE5_100_PERCENT_COMPLETE.md` | Final completion record for Phase 5, confirming the useOrgGuard hook and OrgRequiredModal were fully implemented and int |
| history | `PHASE5_CORE_COMPLETE.md` | Records the creation of the useOrgGuard hook and OrgRequiredModal component as foundational navigation-blocking infrastr |
| history | `PHASE5_NAVIGATION_BLOCKING_GUIDE.md` | Developer how-to guide with four copy-paste patterns for wrapping action buttons and form submissions with the useOrgGua |
| history | `PHASE6_COMPLETE.md` | Completion record for the admin invite management interface including TeamInvitesTab, three new API endpoints (list, rev |
| SUPERSEDED | `PROJECT_SUMMARY_COMPLETE.md` | Summary document written at 83% completion (5 of 6 phases) of the multi-org invite system, detailing all files created,  |

## CRM Core
*106 files — CURRENT:50, history:42, SUPERSEDED:12, outdated:2*

| Status | File | What it actually contains |
|---|---|---|
| CURRENT | `phase-2b-11-5b-1-prompt.md` | Bug-fix prompt for a silent audit_trail insert failure on PATCH /api/activities/[id]: diagnose root cause (4 candidates: |
| CURRENT | `phase-2b-11-5b-prompt.md` | Execution prompt implementing a single shared deal resolver (resolveMostRecentlyActiveOpenDeal) for both inbound and out |
| CURRENT | `phase-2a-6-deal-creation-audit.md` | Live audit confirming that ingestLead() NEVER inserts into the deals table. Zero from('deals').insert(...) calls exist a |
| CURRENT | `activities_audit.md` | Detailed audit of the 44-column activities table and 33 insert call sites. Five call sites are broken due to wrong colum |
| CURRENT | `notifications_audit.md` | Audit of 7 notification-related tables. The notifications table has 0 rows in production. Modern dispatcher (notificatio |
| CURRENT | `pipelines_audit.md` | Audit of 8 pipeline-related tables. The stages table is vestigial with no FKs and no code reads it. deal_stage_history h |
| CURRENT | `quick_route_deal_bug_confirmation.md` | Standalone audit confirming the quickRouteDeal function is broken in silent-failure mode. treatment_routing_logs has 0 r |
| CURRENT | `treatment_tagging_audit.md` | Comprehensive audit of the treatment tagging and routing system. Five dedicated tables exist: treatment_tags, treatment_ |
| CURRENT | `workflow_01_lead_capture_audit_prompt.md` | Comprehensive audit prompt specifying requirements for the lead capture workflow. Defines 6 lead capture channels: hoste |
| CURRENT | `2b-11-5b-changes.md` | Change log for implementing a shared resolveMostRecentlyActiveOpenDeal resolver to fix inbound/outbound deal-attachment  |
| CURRENT | `2b-2-a-3-changes.md` | Change log for adding findReusableOpenDeal() to createDealForLead() so returning inbound contacts (across all channels u |
| CURRENT | `2b-30-to-33-contacts-module.md` | Documents the 2026-05-22 overhaul of the contacts module including list polish with source-channel labels, manual contac |
| CURRENT | `2b-36-to-57-changes.md` | Cumulative changelog for 22 phases rebuilding the contacts module, dashboard, deals Kanban, tasks queue, and call dialer |
| CURRENT | `2b-58-to-71-tasks-rebuild-changes.md` | Complete rebuild of the Tasks module fixing a P0 automation-created task bug (wrong column names), wiring the task-remin |
| CURRENT | `2b-72-to-80-tasks-followup-changes.md` | Completes deferred items from the 2b.58–2b.71 tasks rebuild: snooze persistence, manager-overdue alerts cron rail, recur |
| CURRENT | `2b-81-to-85-final-tail-changes.md` | Closes last deferred items from 2b.80: manager picker UI in EditUserModal, recurring rule picker in CreateTaskSlideOver, |
| CURRENT | `2b-9-changes.md` | Makes the outbound activity surface honest: pending-first activity rows, failed-send badges with friendly labels, hardco |
| CURRENT | `crm-core-endpoints.md` | Phase 0 modernization REST API reference for deals, tasks, activities, scripts, and psych-profile endpoints with tenant  |
| CURRENT | `ARCHITECTURE_DIAGRAM.md` | Architecture of the premium pipeline board components with deal intelligence layer, describing PipelineSummaryBar, DealC |
| CURRENT | `contacts_dashboard_rebuild_audit.md` | May 2026 audit scoping a 22-phase contacts/dashboard rebuild covering activities feed, tasks, call coaching, deals Kanba |
| CURRENT | `deal_attachment_audit.md` | May 2026 audit of how activities.deal_id is assigned, identifying issues with multi-open-deal contact handling, missing  |
| CURRENT | `tasks_module_rebuild_audit.md` | May 2026 audit identifying P0 schema drift where automation engine writes wrong column names for tasks, task_recurring_r |
| CURRENT | `COMPONENT_UNIFICATION_COMPLETE.md` | Documents the replacement of two separate deal table components with a single EnterpriseDealsTable component (~1800 line |
| CURRENT | `ENTERPRISE_READY_ACHIEVEMENT.md` | Verification report confirming CRM feature parity with HubSpot/Salesforce/Pipedrive across saved views, bulk actions, pa |
| CURRENT | `ENTERPRISE_TASKS_COMPLETE.md` | Completion record for the task management system delivering HubSpot-style interface with filter tabs, task queue sidebar |
| CURRENT | `GLOSSARY.md` | A reference glossary defining business terms (Contact, Deal, Pipeline, Stage, Journey, Attribution, CAC, LTV, MRR, Churn |
| CURRENT | `HOW_TO_LOAD_DEMO_DATA.md` | A guide to populating the dental CRM database with 10 SQL files creating 5 practice tenants, 15 staff, 9 pipelines, 100+ |
| CURRENT | `SYSTEM_COMPLETE.md` | Completion report for a 22-phase, 133-task universal routing system that maps treatment tags to deal pipelines using fou |
| CURRENT | `TYPE_CHANGES_AND_FALLBACK_LOGIC.md` | Developer reference documenting the TypeScript type extensions and pure client-side algorithms for deal probability, hea |
| CURRENT | `✅_DEALS_ERROR_FIXED.md` | Documents that the 'Error loading deals: {}' console error was caused by deals lacking a location_id required by the pos |
| CURRENT | `CONTACTS_DEALS_PIPELINE_ENTERPRISE_COMPLETE.md` | Master completion document for the October 15 2025 enterprise transformation sprint covering all 41 tasks across Pipelin |
| CURRENT | `DEALS_PAGE_REDESIGN_COMPLETE.md` | Completion note for the October 28 2025 Deals page visual-only redesign delivering avatar + two-line deal/contact displa |
| CURRENT | `DEAL_CARDS_FINAL_FIX.md` | Fix document for two pipeline board bugs: non-uniform card heights (fixed by always rendering the intelligence row) and  |
| CURRENT | `HOW_TO_USE_PIPELINES.md` | End-user guide explaining how to create pipelines from 6 dental-specific templates, use Board and List views, drag-and-d |
| CURRENT | `PIPELINE_LIST_VIEW_ANALYSIS.md` | A comprehensive inventory of all state, filters, columns, view modes, sorting options, data loading strategy, dependenci |
| CURRENT | `PIPELINE_QUICK_START.md` | End-user quick-start guide confirming all 20 transformation tasks are complete, describing how to use the Deals tab, Sav |
| CURRENT | `PIPELINE_SYSTEM_GUIDE.md` | User-facing guide describing the unified pipeline interface, 6 dental-specific pipeline templates (High-Value, Emergency |
| CURRENT | `PIPELINE_TEMPLATES_COMPLETE.md` | Records standardization of all 6 pipeline templates to the same 5-stage structure (New Lead, Consultation, Proposal Sent |
| CURRENT | `PIPELINE_TRANSFORMATION_COMPLETE.md` | Final completion report confirming all 20 pipeline/deals transformation tasks are delivered across 4 phases, listing 11  |
| CURRENT | `PIPELINE_UNIFIED_HEADER_COMPLETE.md` | Documents creation of the PipelineUnifiedHeader component (440 lines) and refactoring of pipeline-board.tsx to use it, p |
| CURRENT | `PREMIUM_PIPELINE_REDESIGN_COMPLETE.md` | Completion report for the premium pipeline board redesign, documenting creation of 11 new files including DealCardPremiu |
| CURRENT | `TASKS_MODULE_COMPLETION_SUMMARY.md` | Completion report for 10 critical enterprise improvements to the Tasks module, covering contact/deal selectors in create |
| CURRENT | `TREATMENT_ROUTING_COMPLETE_TODO.md` | Full 21-phase task breakdown for the Universal Treatment Tag Routing System, with Phases 0–6 marked complete and Phases  |
| CURRENT | `TREATMENT_ROUTING_SAFETY_ANALYSIS.md` | Comprehensive safety analysis auditing all 12 existing integrations (PMS, marketing automation, forms, lead intake, AI m |
| CURRENT | `DEALS_TABLE_ANALYSIS.md` | Detailed feature inventory of src/components/deals/deals-table.tsx covering 8 filters, 5 sortable columns, pagination, b |
| CURRENT | `routing-system-troubleshooting.md` | Comprehensive guide covering 10 common issues with the treatment tag routing system including deals not routing, wrong p |
| CURRENT | `how-to-map-tags-to-pipelines.md` | Detailed guide for practice administrators on creating treatment tag-to-pipeline mappings with priority, location, and c |
| CURRENT | `how-to-set-up-treatment-tags.md` | Step-by-step guide for practice administrators to create and configure treatment tags with keywords, colors, icons, prio |
| CURRENT | `understanding-routing-analytics.md` | Comprehensive guide to the routing analytics dashboard explaining key metrics, charts, routing method breakdown targets, |
| CURRENT | `treatment_tagging_audit.md` | Deep audit of the treatment tag routing system identifying that all six lead-capture call sites pass a wrong-shape objec |
| history | `hotfix_deal_detail_modal.md` | A targeted hotfix prompt to rename deal_type to treatment_type, pipeline_stage_id to stage_id, and remove an unfinished  |
| history | `phase-2a-7-deal-creation-prompt.md` | Execution prompt specifying how deal creation should be added to ingestLead(): title from offering, pipeline from offeri |
| history | `phase-2a-9-queue-resolve-prompt.md` | Execution prompt to connect createDealForLead() into the dedup queue resolve endpoint so that merge and create_new actio |
| history | `phase_2a_2a_engine.md` | Full specification for the canonical ingestLead() function with a 4-tier dedup strategy, dedup_review_queue table, seed_ |
| history | `phase-2b-11-5-audit-prompt.md` | Read-only audit prompt investigating activity.deal_id assignment behavior across ingestLead, dispatcher, composer surfac |
| history | `phase-2b-2-a-3-prompt.md` | Execution prompt adding findReusableOpenDeal() helper to createDealForLead(), implementing the rule 'return most recentl |
| history | `phase-2a-6-deal-creation-audit-prompt.md` | Audit prompt/instructions document that defined the scope and method for the deal creation audit. Specifies 5 product re |
| history | `treatment_tagging_audit_prompt.md` | Cursor/Claude Code prompt for the treatment tagging audit. Defines the Phase 2a target data model: treatment_types and p |
| history | `PIPELINE_FIX_DEPLOYED.txt` | Short status note confirming a pipeline creation fix was deployed: removed non-existent fields (is_default, display_styl |
| history | `SESSION_COMPLETE_SUMMARY.md` | Summarises a session dated October 12, 2025 that delivered AI deal intelligence scoring, URL state persistence, editable |
| history | `ALL_49_TASKS_COMPLETE_FINAL.md` | Completion report dated January 15, 2025 for a 49-task dashboard upgrade replacing fake Math.random() data with real DB  |
| history | `ALL_FIXED.md` | Records three UI fixes: Permissions button restored to role cards (opens modal with 60+ permissions), 'Smart AI' tab ren |
| history | `CHECKPOINT_1_CLEAN_UI.md` | Early checkpoint documenting the first professional pipeline UI milestone with HubSpot-style deal detail modal, drag-and |
| outdated | `COMPLETE_FIX_LIST_ALL_ISSUES.md` | Catalogues 12 issues from critical missing routes (/contacts/new, /tasks/new, /deals/[id]) through TypeScript syntax err |
| SUPERSEDED | `ENTERPRISE_TASKS_PLAN.md` | Planning document researching HubSpot/Salesforce task management features and defining 4-phase build plan covering inter |
| history | `FINAL_STATUS.md` | A status report dated October 12, 2025 confirming resolution of 6 runtime bugs in Settings pages including a missing loa |
| history | `PHASES_1_2_3_IMPLEMENTATION_COMPLETE.md` | Provides complete production-ready code for a priority-scoring algorithm (tasks, deals, contacts) and a TodaysPriorities |
| history | `PHASE_0_COMPLETE.md` | Records removal of six hardcoded treatment keyword arrays from deal-categorization.ts and their replacement with a dynam |
| history | `PHASE_14_COMPLETE.md` | Documents creation of a bulk re-route REST API endpoint (up to 1000 deals, dry-run mode), a BulkOperationsPanel UI, a 4- |
| history | `PHASE_14_COMPLETION_STATUS.txt` | ASCII-formatted final status report for Phase 14 bulk operations, listing all 4 tasks complete, files created with line  |
| history | `PHASE_14_SUMMARY.md` | Executive summary of Phase 14 bulk operations including use-case walkthroughs, file manifest with line counts, required  |
| history | `PHASE_14_VISUAL_COMPLETE.txt` | ASCII-art formatted visual summary of Phase 14 bulk operations including 4-step migration wizard flow, deal audit dashbo |
| history | `PHASE_4_COMPLETE.md` | Documents delivery of the Treatment Tags Settings UI with full CRUD, bulk CSV import/export, 8 predefined dental treatme |
| history | `PHASE_4_VISUAL_SUMMARY.txt` | ASCII art visual summary of the Treatment Tags Settings UI showing statistics dashboard, actions bar, tags grid, create/ |
| history | `PHASE_5_COMPLETE.md` | Documents the Pipeline Mapping Settings UI enabling visual tag-to-pipeline mapping with bulk operations, value range fil |
| history | `PHASE_7_COMPLETE.md` | Documents enhancement of both deal creation forms (create-deal-slide-over.tsx and simple-deal-dialog.tsx) with AI tag su |
| SUPERSEDED | `PHASE_7_PROGRESS.md` | Mid-phase progress snapshot showing 6 of 8 tasks done for intelligent routing integration into deal creation forms, with |
| history | `PHASE_7_VISUAL_SUMMARY.txt` | ASCII art visual showing the completed deal creation form with AI tag suggestions section, pipeline suggestion with tool |
| history | `PHASE_8_PART_2_COMPLETE.md` | Documents completion of 6 tasks adding treatment tag display to deal cards (colored badges), dynamic tag filter on pipel |
| history | `PHASE_8_PART_2_VISUAL.txt` | ASCII art visual confirming completion of deal card colored tags, pipeline board dynamic filter, deals table Tags column |
| SUPERSEDED | `PHASE_8_PROGRESS.md` | Mid-phase snapshot showing 5 of 10 Phase 8 tasks done, with a new shared DealTreatmentTags component (375 lines) replaci |
| outdated | `VISIBLE_CHANGES_APPLIED.md` | Status update noting that Dashboard and Deals table pages have been updated with formatted numbers, currency symbols, Me |
| history | `_COMPLETE_ALL_29_TASKS.md` | Completion report for the premium pipeline board redesign delivering DealCardPremium, PipelineColumnPremium, PipelineSum |
| history | `CONTACTS_COMPLETE_TRANSFORMATION.md` | Executive summary declaring Phase 0 of the contacts transformation complete (5/5 tasks), achieving enterprise-baseline p |
| history | `CONTACTS_PHASE_0_COMPLETE.md` | Detailed delivery note for the 5 Phase 0 contacts tasks, listing exact files created, feature specs, performance targets |
| SUPERSEDED | `CONTACTS_TRANSFORMATION_MASTER_PLAN.md` | Planning document outlining 21 tasks across 4 phases for transforming the contacts module, with detailed specs for each  |
| history | `CONTACT_UX_FIXED.md` | Short fix note confirming the /contacts/new directory was removed, the Dashboard button renamed from 'Add Contact' to 'N |
| SUPERSEDED | `CRM_BASELINE_FEATURES.md` | Pre-integration snapshot documenting all working CRM features before the Version 4 marketing integration, including cont |
| SUPERSEDED | `DEALS_PAGE_REDESIGN_PLAN.md` | Pre-implementation planning document for the Deals page visual redesign, detailing 10 redesign components (filter bar, h |
| SUPERSEDED | `DEAL_CARD_DRAG_FIX_ROUND_2.md` | Earlier iteration of the drag fix that wrapped dnd-kit listeners with custom onPointerDown/Move/Up handlers to track dra |
| history | `DEBUG_CONTACT_ISSUE.md` | Systematic debug guide for investigating why the new contact slide-over was not appearing, covering console log verifica |
| history | `PIPELINE_COMPLETE_TRANSFORMATION_PLAN.md` | A 20-task phased roadmap (4 phases, 10–13 weeks) for elevating the pipeline and deals system to enterprise grade, coveri |
| history | `PIPELINE_CRASH_FIXED.md` | Documents a critical ReferenceError ('formatCurrencyValue is not defined') in pipeline-board.tsx that caused complete pa |
| SUPERSEDED | `PIPELINE_DEALS_ENTERPRISE_AUDIT.md` | An audit comparing the pipeline board, list view, and missing deals page against HubSpot/Salesforce/Pipedrive standards, |
| history | `PIPELINE_DEFAULT_VIEW_BOARD.md` | Records a one-line code change in pipeline-board.tsx line 333, switching the default viewMode state from 'list' to 'boar |
| history | `PIPELINE_DRAG_DROP_FIXED.md` | Documents the fix for broken drag-and-drop in the pipeline board, caused by a missing sensors configuration in DndContex |
| history | `PIPELINE_DROPDOWN_IMPROVEMENTS.md` | Records UI tweaks to the pipeline selector dropdown: icon size reduced from 11px to 8px, dropdown width narrowed to 380p |
| history | `PIPELINE_FILTERS_UNIFIED.md` | Documents removal of the viewMode === 'board' conditional wrapper around the filters bar in pipeline-board.tsx so that a |
| history | `PIPELINE_HEADER_FIXES_COMPLETE.md` | Records fixes for icon cutoff in the 'All Deals' button and 'New Deal' button being cut off at the right edge, plus remo |
| SUPERSEDED | `PIPELINE_REDESIGN_MAPPING.md` | Pre-implementation design doc mapping Deal type fields to spec requirements, defining client-side intelligence derivatio |
| SUPERSEDED | `PIPELINE_TRANSFORMATION_PROGRESS.md` | Mid-session progress snapshot showing 7 of 20 transformation tasks complete (Phase 0 fully done, Phase 1 partially done) |
| history | `PIPELINE_UI_CONSISTENCY_COMPLETE.md` | Records removal of the 'Newest First' sorting dropdown from the List view filters bar and confirms that Board and List v |
| history | `QUICK_FIX_PIPELINE_ERROR.md` | Documents a quick fix for pipeline creation failures caused by missing database columns (description, is_default), imple |
| SUPERSEDED | `TASKS_MODULE_ENTERPRISE_AUDIT.md` | Audit identifying 25 gaps in the Tasks module from critical (missing contact/deal selectors, direct Supabase calls bypas |
| SUPERSEDED | `TREATMENT_ROUTING_FINAL_CONFIRMATION.md` | Pre-implementation confirmation checklist verifying that all 12 deal creation entry points, 12 existing integrations, da |
| history | `phase-2-contracts.md` | Pre-implementation contract document specifying the three Phase 2 surfaces to build: the booking widget (JS embed + host |

## Marketing
*85 files — CURRENT:38, history:33, SUPERSEDED:10, outdated:4*

| Status | File | What it actually contains |
|---|---|---|
| CURRENT | `form_builder_audit.md` | Audit of the form builder subsystem. The form builder UI is solid; the submission pipeline is the broken half. 7 public  |
| CURRENT | `2b-3-changes.md` | Change log for re-aligning the canonical form submission endpoint with the ingestLead engine, adding click ID and landin |
| CURRENT | `api-setup.md` | Administrator guide for configuring Google Cloud OAuth and API key credentials required by the Marketing Audit module, c |
| CURRENT | `endpoints.md` | API reference for 14 marketing audit endpoints under /api/marketing-audit/ covering composite and sub-scores, with rate  |
| CURRENT | `CHANGELOG.md` | Formal changelog for the Marketing Audit module v1.0.0 covering four phases: core MVP (10 connectors, 8 scoring engines, |
| CURRENT | `ENTERPRISE_LAUNCH_READY.md` | Launch announcement for the marketing automation platform claiming all 44 features complete including visual email build |
| CURRENT | `MISSION_COMPLETE.md` | Final completion certificate for the Marketing Audit module declaring all 279 tasks done, with 300+ files, 50,000+ lines |
| CURRENT | `OPTIONAL_ENHANCEMENTS.md` | Backlog of 37 optional UI polish and advanced feature tasks for the Marketing-CRM integration, explicitly recommended to |
| CURRENT | `QUICK_START.md` | 3-step activation guide for the Marketing-CRM integration: run migration 25_marketing_crm_integration.sql, verify core C |
| CURRENT | `STEP_1_DATABASE_SQL.md` | Contains the complete SQL for creating 8 marketing audit tables (marketing_audit_runs, audit_metrics, audit_recommendati |
| CURRENT | `WHAT_TO_PASTE_IN_SUPABASE.md` | Step-by-step instructions for running 6 marketing SQL migration files (20–25) to create marketing_audiences, campaigns,  |
| CURRENT | `DEPLOYMENT_READY_CHECKLIST.md` | Production-readiness checklist confirming the marketing audit module is feature-complete for Phase 1 with 9.2/10 securit |
| CURRENT | `adding-scorers.md` | Developer guide for adding new scoring categories to the Marketing Audit module using Social Media Presence as a worked  |
| CURRENT | `COMPLETE_INTEGRATION_TASKS.md` | Comprehensive 115-task plan across 14 phases for safely integrating Marketing into the existing CRM with additive-only c |
| CURRENT | `ENTERPRISE_MARKETING_COMPLETE.md` | Dated Oct 13 2025. Claims A grade (93/100) for campaign manager after all critical gaps from initial audit were addresse |
| CURRENT | `FORM_BUILDER_280_TASKS_COMPLETE.md` | Dated Oct 15 2025. Claims 280/280 tasks (100%) complete. Certificate of completion for the form builder enterprise build |
| CURRENT | `FORM_BUILDER_COMPLETE_DOCUMENTATION.md` | Full feature reference documentation for the form builder. Header metadata claims 250/280 (89.3%) complete. Documents al |
| CURRENT | `FORM_BUILDER_DEPLOYMENT_GUIDE.md` | Operational deployment checklist for the form builder. Covers DB migrations to run, required environment variables, and  |
| CURRENT | `FORM_BUILDER_FINAL_SUMMARY.md` | Brief certificate of completion claiming 280/280 tasks (100%) complete for the form builder. Concise summary version of  |
| CURRENT | `MARKETING_AUDIT_FULL_TASK_LIST.md` | Complete breakdown of all tasks for the marketing audit module organized into 5 phases: Phase 0 Setup (22 tasks), Phase  |
| CURRENT | `MARKETING_AUDIT_JSON_EXAMPLES.md` | Reference document with complete JSON structures for the marketing audit module including AuditRun interface, API respon |
| CURRENT | `MARKETING_AUDIT_MODULE_FINAL_DELIVERY.md` | Delivery report dated January 16, 2025 claiming 247/279 tasks (88.5%) complete. Lists 75+ frontend components, 20 API en |
| CURRENT | `MARKETING_AUDIT_MODULE_MASTER_PLAN.md` | Original 1,530-line architecture and planning document dated January 15, 2025. Contains API cost analysis ($50-930/mo by |
| CURRENT | `MARKETING_CRM_INTEGRATION_MASTERPLAN.md` | 115-task marketing-CRM integration plan with 12 phases describing a $299/mo Marketing add-on on top of $99/mo CRM. Key i |
| CURRENT | `MARKETING_INTEGRATION_AUDIT_AND_SOCIAL_MEDIA_PLAN.md` | October 13, 2025 audit declaring current marketing integration 100% complete for Email/SMS/WhatsApp/Forms/Landing Pages. |
| CURRENT | `MARKETING_INTEGRATION_COMPLETE.md` | October 13, 2025 completion document. Claims 78/225 tasks (78%) complete. Lists 9 production services built: feature-fla |
| CURRENT | `MARKETING_MODULE_COMPLETE.md` | October 13, 2025 document claiming the full Mailchimp-style marketing module is complete. 35+ UI components, 27 new DB t |
| CURRENT | `MARKETING_PREMIUM_TRANSFORMATION_PLAN.md` | 18-task premium transformation plan introducing 3-tier pricing: Starter (free), Pro ($29/mo), Enterprise ($99/mo). Four  |
| CURRENT | `MARKETING_QUICK_START.md` | How-to guide for running migration supabase/sql/64_marketing_feature_flags.sql and testing feature flags at /settings/ma |
| CURRENT | `MARKETING_SETUP_GUIDE.md` | Setup guide for the marketing module. Run 5 SQL migrations in order (20-24), then navigate to Marketing in the sidebar.  |
| CURRENT | `MARKETING_TRANSFORMATION_COMPLETE.md` | October 15, 2025 completion document for all 18 premium transformation tasks. Lists 12 new files created including src/h |
| CURRENT | `README_MARKETING_AUDIT.md` | README for the marketing audit module. Phase 1 MVP complete, Phase 2 60% complete, Phase 3 30% complete, Phase 4 planned |
| CURRENT | `README_MARKETING_INTEGRATION.md` | October 13, 2025 final stats document claiming 188/225 tasks (84%) complete. Lists 9 services, 6 UI components, 2 API en |
| CURRENT | `first-audit.md` | Quick-start guide for running a dental practice marketing audit that produces a 0-100 health score across 5 weighted cat |
| CURRENT | `recommendations.md` | Guide explaining how to interpret and implement marketing audit recommendations using a 2x2 impact/effort matrix, with s |
| CURRENT | `scheduling-audits.md` | Guide for setting up automated weekly or monthly marketing audits with email reports, covering schedule management, noti |
| CURRENT | `understanding-scores.md` | Reference guide explaining the composite marketing health score formula, all five category score components with improve |
| CURRENT | `audit-walkthrough.md` | A 3-5 minute video script for dental practice owners demonstrating the marketing audit feature, covering running an audi |
| history | `phase-2b-3-prompt.md` | Execution prompt refactoring /api/marketing/forms/submit to drop its auth gate and route through ingestLead(), deleting  |
| history | `COMPLETE_FEATURE_LIST.md` | Claims 100% completion with 280+ features across SEO audit, competitive benchmarking, scoring, API connectors, reporting |
| history | `MARKETING_AUDIT_SESSION_SUMMARY.md` | Session summary for Phase 0+1 of a marketing audit module, confirming backend engine (10 API connectors, 8 scorers, orch |
| history | `ABSOLUTE_FINAL_STATUS.md` | Precise task breakdown at 246/279 (88.2%) listing 33 pending tasks (primarily test execution, performance optimisation,  |
| history | `ALL_20_TASKS_COMPLETE.md` | Completion report dated October 13, 2025 for the marketing module redesign delivering 13 production-ready features (camp |
| history | `BUILD_STATUS_62_PERCENT.md` | Midpoint progress report for a marketing audit and benchmarking module showing 174/279 tasks complete, with a production |
| history | `FINAL_COMPLETION_CERTIFICATE.md` | A formal certificate of completion for the Marketing Audit & Benchmarking Module at 83.2% (232/279 tasks), dated January |
| history | `FINAL_DELIVERY_SUMMARY.md` | The definitive delivery document claiming 100% completion (279/279 tasks) of the Marketing Audit & Benchmarking Module a |
| history | `FINAL_SYSTEM_COMPLETE.md` | The most detailed completion checklist claiming 304/304 tasks complete (expanded from 279 original) for the marketing au |
| history | `FINAL_TASK_COMPLETION_100_PERCENT.md` | A granular phase-by-phase checklist confirming all 279 original tasks complete (expanded to 304 with additions) across 6 |
| history | `MILESTONE_100_TASKS.md` | Milestone at 100/279 tasks for the Marketing Audit module, confirming complete backend (8 DB tables, 14 APIs, 10 connect |
| history | `MILESTONE_25_PERCENT.md` | Milestone at 67/279 tasks (24%) for the Marketing Audit module, confirming a working end-to-end audit flow with all 5 sc |
| history | `PHASE_0_PROGRESS.md` | Progress tracker for a marketing audit feature's Phase 0, listing 19 automated tasks complete and 3 manual tasks (Google |
| history | `PHASE_12_COMPLETE.md` | Documents enhancement of the marketing form processor with a 3-priority routing system (manual override, auto-routing, r |
| history | `PHASE_12_SUMMARY.md` | Executive summary of Phase 12 marketing integration, recapping the 3-priority routing system, six new attribution fields |
| history | `PHASE_12_VISUAL_COMPLETE.txt` | ASCII-art formatted visual summary of Phase 12 marketing integration covering the 3-priority routing system, attribution |
| history | `PHASE_1_PROGRESS.md` | In-progress task tracker for the marketing audit feature's Phase 1 (138 tasks) covering API connectors, scoring engine,  |
| history | `PHASE_9_COMPLETE.md` | Documents integration of universal treatment tag routing into all lead capture entry points: form processor, form submis |
| SUPERSEDED | `PHASE_9_PLAN.md` | Pre-execution plan identifying 6 tasks to integrate universal routing into form-processor.ts, form submission webhook, l |
| SUPERSEDED | `PHASE_9_TASKS_1-3_COMPLETE.md` | Mid-phase report documenting completion of form processor, form submission webhook, and lead intake webhook integrations |
| history | `PHASE_9_VISUAL_COMPLETE.txt` | ASCII art visual confirming Phase 9 completion with data flow diagram from form submission through AI tag extraction, un |
| history | `PROGRESS_SNAPSHOT.md` | Mid-build snapshot of the Marketing Audit Module showing 38.7% completion (108/279 tasks), with backend fully working an |
| history | `PROGRESS_UPDATE.md` | Real-time build progress log for the Marketing Audit Module at 22.2% completion, listing the last 10 completed tasks and |
| history | `VERSION_4_COMPLETE_SUMMARY.md` | Documents completion of Version 4, which delivered a full Marketing ↔ CRM integration including contact sync, attributio |
| history | `✅_ALL_WORKING_NOW.md` | Confirms the dev server is running after installing 7 missing npm dependencies (pino, several Radix UI packages, sonner, |
| outdated | `✅_SERVER_RUNNING_NOW.md` | Status note confirming the dev server started after enabling NEXT_PUBLIC_ENABLE_MARKETING_AUDIT=true in .env.local, with |
| history | `🎉_100_PERCENT_COMPLETE.md` | Celebration document declaring the Marketing Audit and Benchmarking module 100% complete with 279 tasks, 300+ files, 50k |
| outdated | `🚀_LOCAL_SETUP_COMPLETE.md` | Short note confirming NEXT_PUBLIC_ENABLE_MARKETING_AUDIT=true was added to .env.local and the dev server started, making |
| history | `TASKS_COMPLETE_COMPREHENSIVE_ANSWER.md` | Status response document claiming 232 of 279 marketing audit module tasks are complete (83.2%), with 47 remaining tasks  |
| history | `TASK_STATUS_LIVE.md` | Live progress snapshot for the marketing audit module showing 79 of 279 tasks complete (28.3%), with Phase 0 at 86%, Pha |
| history | `INTEGRATION_STATUS_FINAL.md` | Final status report dated October 13, 2025 showing Marketing-CRM integration at 165 of 225 tasks (73%) complete on git b |
| SUPERSEDED | `CAMPAIGN_MANAGER_ENTERPRISE_AUDIT.md` | Dated Oct 13 2025. Initial audit scoring the campaign manager at B+ (83/100). Identifies critical missing features: visu |
| SUPERSEDED | `FORM_BUILDER_BUILD_COMPLETE.md` | Dated Oct 15 2025. Claims 250/280 tasks (89.3%) complete. States Phase 5 optional features were skipped. Lists 52 files  |
| SUPERSEDED | `FORM_BUILDER_COMPLETE_CHECKLIST.md` | Checkbox checklist showing 280/280 tasks complete, with all Phase 5 white-labeling tasks checked. Appears to be a comple |
| SUPERSEDED | `FORM_BUILDER_COMPLETE_TASK_LIST.md` | Original pre-build planning task list showing 0/280 tasks complete (0%). This was the starting checklist before any impl |
| history | `FORM_BUILDER_ENTERPRISE_AUDIT.md` | Initial audit of the form builder scoring 15/100 before the enterprise build. Lists 40+ critical gaps and defines the fu |
| history | `FORM_BUILDER_FINAL_VERDICT.md` | Pre-build executive verdict document rating the original form builder as NOT enterprise-ready (15/100). Same assessment  |
| history | `FORM_BUILDER_FIXES.md` | Dated January 2025. Documents 4 critical bug fixes post-build: field names not saving due to state sync issue, drag-and- |
| SUPERSEDED | `FORM_BUILDER_PROGRESS.md` | Early-stage progress snapshot showing 9/280 tasks (3.2%) complete. Only Phase 0 partially started. This is an early buil |
| SUPERSEDED | `MARKETING_AUDIT_FINAL_SUMMARY.md` | Status summary claiming marketing audit module is 68.5% complete (191/279 tasks). Claims Phase 0 and Phase 1 are 100% co |
| SUPERSEDED | `MARKETING_AUDIT_MASTER_PROGRESS.md` | Progress tracker showing only 40/279 tasks (14.3%) complete at time of writing. Lists 25 files created. Phase 0 at 86%,  |
| history | `MARKETING_MODULE_MASTER_PLAN.md` | Original planning document for the Mailchimp-style marketing module. Lists 85+ tasks estimated at approximately 100 hour |
| history | `MARKETING_MODULE_TASKS.md` | 103-task breakdown for the marketing module. Similar to MARKETING_MODULE_MASTER_PLAN.md but more granular. Largely super |
| SUPERSEDED | `MARKETING_TRANSFORMATION_PROGRESS.md` | Progress tracker also claiming 18/18 tasks (100%) complete for the premium transformation. Content largely duplicates MA |
| history | `MARKETING_TRANSFORMATION_VISUAL_SUMMARY.md` | Pre-build planning document with ASCII art mockups for all 18 premium transformation tasks. Shows intended UI layout for |
| outdated | `ALL_44_ENTERPRISE_FEATURES_COMPLETE.md` | Celebratory completion report from October 13 2025 declaring 44 enterprise marketing features built including email buil |
| outdated | `COMPLETE_FEATURES_LIST.md` | Feature checklist for the marketing audit and benchmarking module showing 226 of 279 tasks complete (81%) across auditin |

## AI & Automation
*61 files — CURRENT:41, history:10, SUPERSEDED:10*

| Status | File | What it actually contains |
|---|---|---|
| CURRENT | `phase-2b-11-5b-close-and-2b-12-audit-prompt.md` | Two-part prompt: Part A closes 2b.11.5b by verifying inbound SMS deal_id assignment matches resolver logic for Joey Baby |
| CURRENT | `03_INTEGRATIONS_AND_AI_WORKFLOWS.md` | Detailed audit of all external integrations and AI pipelines including the full call recording transcription flow (Supab |
| CURRENT | `04_WORKFLOWS_AUTOMATIONS_AND_SLOS.md` | Audit of the automation engine covering unified event bus, prebuilt workflow templates, pipeline governance, AI-triggere |
| CURRENT | `2b-13-changes.md` | Change log for creating the tenant_ai_context table (brand voice, services, pricing, FAQs, opening hours, escalation rul |
| CURRENT | `2b-14-changes.md` | Change log for replacing the broken automation scaffold with a working engine on the automations table, fixing listener- |
| CURRENT | `2b-15-changes.md` | Change log for adding @anthropic-ai/sdk, an AI reply drafter using Practice Brain context and channel history, real disp |
| CURRENT | `2b-16-changes.md` | Change log for adding a three-tier pipeline router (keyword rules → AI Claude classifier → unsorted fallback) wired into |
| CURRENT | `2b-17-changes.md` | Change log for adding stop conditions (note/call added, patient reply) that halt automation runs, a quiet-hours evaluato |
| CURRENT | `2b-18-changes.md` | Change log for an always-on FAQ responder that subscribes to inbound SMS/WhatsApp, checks a gating chain (toggle, API ke |
| CURRENT | `2b-19-changes.md` | Change log for adding a full REST CRUD API for automations (/api/automations/*) including list, create, fetch, patch, so |
| CURRENT | `2b-20-changes.md` | Change log for adding a 4-step plain-English React wizard at /automations/new that generates strict linear graph_json au |
| CURRENT | `2b-21-changes.md` | Change log for adding a new automation_step_templates table with CRUD API and an extended merge-tag resolver covering de |
| CURRENT | `2b-22-changes.md` | Change log for authoring 5 day-1 automation prebuilts (inbound SMS/WhatsApp AI reply, web form confirmation, Google Lead |
| CURRENT | `2b-23-1-fix-changes.md` | Bug fix record identifying that inbound automation events in ingestLead were fired without await, causing dangling promi |
| CURRENT | `2b-23-changes.md` | Change log for Part 11 of the automations Build A master plan, adding a daily TTL purge cron for automation_runs/executi |
| CURRENT | `2b-24-changes.md` | Change log for 5 sub-phases adding judgeInboundDealAttachment() that uses the pipeline router to split inbound messages  |
| CURRENT | `automations-build-b-future-work.md` | Documents five deferred automation trigger types (deal_stuck, deal_won, deal_lost, patient_gone_quiet, high_value_lead_a |
| CURRENT | `automations-master-plan.md` | Internal working notes detailing the full 11-phase Build A plan (2b.13–2b.23) for automations including Practice Brain,  |
| CURRENT | `AI_WORKFLOWS_AND_AUTOMATIONS.md` | Technical reference documenting key AI functions buildDealContext and analyzeConversations, the automation_runs table sc |
| CURRENT | `AUTOMATION_EVENTS_DOCUMENTATION.md` | Reference documenting 50+ event types across 9 categories with full TypeScript payload schemas and instructions for emit |
| CURRENT | `DEAL_INTELLIGENCE_COMPLETE.md` | Completion report dated October 12 2025 documenting the deal likelihood scoring algorithm, health status thresholds, and |
| CURRENT | `INTELLIGENT_CATEGORIZATION_COMPLETE.md` | Completion record for AI-powered auto-categorization of deals using conversation analysis, with Settings → Smart Categor |
| CURRENT | `SALES_ENABLEMENT_SYSTEMS.md` | Technical reference with real code snippets covering the AI assistant chat component, conversation analyzer, prebuilt wo |
| CURRENT | `SETUP_AI_ASSISTANT.md` | 4-step setup guide for the GPT-4 Turbo AI assistant covering environment variable configuration, database migration, and |
| CURRENT | `USER_WORKFLOWS_AND_JOURNEYS.md` | Technical reference documenting user workflow patterns including receptionist daily flow, patient journey, and re-engage |
| CURRENT | `automation_engine_audit.md` | May 2026 production audit confirming the automation engine is a well-factored scaffold (~6700 LOC) but not wired to prod |
| CURRENT | `ANALYTICS_100_OUT_OF_100_COMPLETE.md` | Final summary of 18 analytics enhancements delivering a perfect 100/100 score including natural language SQL queries via |
| CURRENT | `ANALYTICS_QUICK_REFERENCE.md` | End-user reference guide describing the 5 main analytics dashboards (Executive, CRM, Marketing, Cohort, Predictive) with |
| CURRENT | `ANALYTICS_UI_VISUAL_GUIDE.md` | Design specification document with ASCII wireframes, color palette, typography scale, chart component patterns, and resp |
| CURRENT | `ENTERPRISE_ANALYTICS_COMPLETE.md` | Completion record for the analytics system rebuild delivering 5 dashboards (Executive, CRM, Marketing, Cohort, Predictiv |
| CURRENT | `METRICS_AND_ANALYTICS.md` | Reference document describing the analytics architecture including real-time dashboard metrics, calendar capacity analyt |
| CURRENT | `SMART_CATEGORIZATION_GUIDE.md` | User guide for the AI-powered deal auto-categorization feature that routes deals to the correct dental pipeline (High-Va |
| CURRENT | `TECHNICAL_IMPLEMENTATION_ROADMAP.md` | A detailed medium-confidence architecture assessment covering schema extensions, new API endpoints, integration requirem |
| CURRENT | `PASTE_THESE_8_SQL_MIGRATIONS.md` | Lists seven automation-related SQL migration files (event logging, extended triggers, deal SLA rules, stage auto-move ru |
| CURRENT | `next-best-script.md` | Documents the Next-Best Script Panel feature including script library seeder, ranking service (trigger/persona/feedback/ |
| CURRENT | `learning-loop-jobs.md` | Documents the nightly learning loop for recalculating sales script performance and conversion intelligence metrics. Queu |
| CURRENT | `ai-persona-summary.md` | Spec for a new AI feature that synthesises a 2–3 sentence persona blurb from a contact's full conversation history, appe |
| CURRENT | `email-summariser.md` | Spec for an AI feature generating 1–3 sentence summaries of each email (inbound and outbound) using Claude Haiku 4.5, st |
| CURRENT | `ai-suggest-pill.md` | Spec for AI commitment detection that renders an inline pill on chat bubbles when Claude detects a commitment (confidenc |
| CURRENT | `playbook-automations.md` | Spec extending /automations with a new create_task step type, shipping 8 pre-built template cards operators can toggle/e |
| CURRENT | `README.md` | Deployment and operational guide for the process-call-activity Supabase Edge Function that transcribes call recordings v |
| history | `AI_ASSISTANT_COMPLETE.md` | October 2025 completion record claiming all 15 AI assistant tasks done across chat UI, context engine, GPT-4 Turbo integ |
| history | `AI_ASSISTANT_MASTER_PLAN.md` | 15-task build plan for GPT-4 Turbo AI assistant; all tasks marked complete with API route /api/ai-assistant/chat, DB tab |
| history | `AI_FINAL_SUMMARY.md` | Completion summary declaring all 15 AI assistant tasks done across 12 new files and 5 commits, with setup instructions f |
| SUPERSEDED | `AUTOMATIONS_ARCHITECTURE_FIX_TODO.md` | 20-task pending plan to separate automations from the marketing module, recommending Option A (rename marketing_journeys |
| SUPERSEDED | `AUTOMATIONS_COMPLETE_100_PERCENT.md` | Claims 67/67 tasks complete with 100/100 score as of January 16 2025, covering 8 phases, 35 files, and 13 new DB tables  |
| SUPERSEDED | `AUTOMATIONS_COMPLETE_AUDIT_AND_PLAN.md` | Mid-build audit scoring the automation engine at 75/100 with the engine at src/lib/marketing/automation-engine.ts (648 l |
| SUPERSEDED | `AUTOMATIONS_COMPLETE_DEEP_ANALYSIS.md` | Mid-build analysis scoring automation at 60/100 with the critical discovery that the event system is not connected to th |
| SUPERSEDED | `AUTOMATIONS_FINAL_ARCHITECTURE.md` | Claims Option B implemented — clean standalone automations tables separate from marketing — with 5 new tables, a /automa |
| SUPERSEDED | `ANALYTICS_100_PERCENT_TRANSFORMATION.md` | Interim progress document recording the first 9 of 18 analytics enhancements completed, raising the analytics score from |
| SUPERSEDED | `ANALYTICS_BUILD_PROGRESS.md` | Early progress tracking document from October 13 2025 showing Phase 1 (database, dependencies, shared UI components) com |
| SUPERSEDED | `ANALYTICS_ENTERPRISE_AUDIT_COMPLETE.md` | Detailed audit of the analytics system at 90/100 scoring, with competitive benchmarking against Salesforce, HubSpot, Pow |
| SUPERSEDED | `ENTERPRISE_ANALYTICS_MASTER_PLAN.md` | Comprehensive planning document for the full analytics rebuild with research on HubSpot, Salesforce, and Tableau, defini |
| SUPERSEDED | `ENTERPRISE_ANALYTICS_UPGRADE.md` | Phase 1 completion record for the analytics rebuild, covering 3 rebuilt dashboard components (Executive, CRM, Marketing) |
| history | `PHASES_19-21_COMPLETE.md` | Completion record for the final three phases of the Universal Treatment Tag Routing System, covering in-app notification |
| history | `PHASE_13_COMPLETE.md` | Documents addition of a DEAL.ROUTED event to the event system, automatic event emission from the routing adapter, a new  |
| history | `PHASE_13_COMPLETION_STATUS.txt` | ASCII-formatted completion status report for Phase 13 listing all tasks complete, files modified, quality metrics, and t |
| history | `PHASE_13_SUMMARY.md` | Executive summary of Phase 13 AI and automation integration, covering the DEAL.ROUTED event system, conversation tag ext |
| history | `PHASE_13_VISUAL_COMPLETE.txt` | ASCII-art system architecture diagram for Phase 13 showing the full flow from deal creation entry points through AI conv |
| history | `PHASE_3_COMPLETE.md` | Documents the completion of Phase 3 which delivered the 4-tier treatment routing engine (routing-engine.ts, ai-extractor |
| history | `PHASE_6_COMPLETE.md` | Documents the Routing Analytics Dashboard (routing-analytics.tsx, 700+ lines) with line/pie/bar charts, tag performance  |

## Integrations & Communications
*70 files — CURRENT:42, history:21, SUPERSEDED:7*

| Status | File | What it actually contains |
|---|---|---|
| CURRENT | `Phase 2b.1.b.1 prerequisites google-ads-setup-runbook.md` | One-time setup runbook for Google Ads Enhanced Conversions infrastructure: creating production MCC 'Dental CRM Master' a |
| CURRENT | `F05_integrations_and_external_services.md` | Audit of 12+ third-party integrations. Critical issues: ALLOW_ENV_FALLBACK=true causes cross-tenant Twilio/SendGrid cred |
| CURRENT | `2b-1-a-changes.md` | Detailed change log for wiring Google Lead Form webhook into the ingestLead() engine, including a new google_lead_form_c |
| CURRENT | `2b-1-b-1-changes.md` | Change log for wiring outbound Google Ads conversion events (Lead and FirstResponse) back to Google using per-tenant OAu |
| CURRENT | `2b-1-b-2-changes.md` | Change log for replacing three CLI scripts with a full self-serve Settings page at /settings/integrations/google, adding |
| CURRENT | `2b-1-b-follow-ups.md` | A human-action checklist of non-engineering tasks required before going live with real practices on Google Ads integrati |
| CURRENT | `2b-10-changes.md` | Change log for consolidating two parallel email service modules by deleting the Resend-only src/lib/email-service.ts sin |
| CURRENT | `2b-11-changes.md` | Change log for adding activities.conversation_id (stable UUID v5 per tenant+contact+channel) with backfill migration, ca |
| CURRENT | `2b-2-a-2-changes.md` | Change log for downloading Twilio media attachments (images, audio, video, PDF) synchronously inside the webhook, upload |
| CURRENT | `2b-2-a-changes.md` | Change log for rewriting the WhatsApp inbound webhook to close 5 known defects: now calls ingestLead(), resolves tenant  |
| CURRENT | `2b-4-changes.md` | Complete rip-and-replace of /api/webhooks/sms to route inbound SMS through canonical ingestLead engine with secure tenan |
| CURRENT | `2b-8-2-changes.md` | Implements GET + PATCH at /api/settings/communications/integrations (Path B: service-role + authenticated tenant), wires |
| CURRENT | `2b-8-changes.md` | Deletes three legacy single-channel settings tabs and their three auth-gated routes, removes orphaned BulkSendPanel, wir |
| CURRENT | `2b-9-1-changes.md` | Patches the 2b.9 operator-gate toast nuance: dispatcher now rethrows new Error(friendly) instead of providerErr, route c |
| CURRENT | `outbound_audit.md` | May 2026 audit of canonical outbound messaging finding all outbound activity samples have NULL channel fields, zero rows |
| CURRENT | `HONEST_OAUTH_REALITY_CHECK.md` | Provides an honest assessment of what is achievable with OAuth integrations, confirming one-click per-provider flow work |
| CURRENT | `OAUTH_ONE_CLICK_FLOW.md` | Confirms that OAuth integrations (Google, Facebook, TikTok, Outlook) follow a true two-click flow: user clicks Connect,  |
| CURRENT | `OAUTH_SETUP_REQUIRED.md` | Step-by-step guide for registering OAuth apps with Google, Facebook, and Microsoft developer consoles, configuring redir |
| CURRENT | `COMPLETE_SETUP_GUIDE.md` | Step-by-step guide for configuring the Marketing Audit module including Google Cloud project creation, enabling 5 APIs,  |
| CURRENT | `FORM_HOSTING_GUIDE.md` | A step-by-step guide for deploying a dummy dental practice website at dentalcrmtest.com that embeds CRM lead capture for |
| CURRENT | `MIGRATION_EXPLANATION.md` | Clarifies the difference between a database-structure migration (creating integration_connections table) already complet |
| CURRENT | `adding-connectors.md` | Developer guide for adding new API connectors to the Marketing Audit system using Bing Webmaster Tools as a worked examp |
| CURRENT | `API_DOCUMENTATION.md` | Minimal API reference covering core endpoints for Contacts, Deals, Tasks, Marketing campaigns, and Webhooks with rate li |
| CURRENT | `COMMUNICATIONS_SETUP_GUIDE.md` | Step-by-step guide for configuring email (SendGrid/Gmail/Outlook/SES), SMS, WhatsApp, and Voice integrations via Twilio, |
| CURRENT | `CUSTOM_INTEGRATION_API_DOCUMENTATION.md` | Comprehensive REST API documentation for custom integrations covering API key and OAuth 2.0 authentication, inbound webh |
| CURRENT | `INTEGRATIONS_AND_APIS.md` | Reference overview of the CRM integration philosophy and key integrations—PMS via webhooks, Twilio for SMS/voice, Resend |
| CURRENT | `INTEGRATION_MANAGEMENT_COMPLETE.md` | Documents the completed per-tenant integration credential management system allowing organizations to buy or link their  |
| CURRENT | `INTEGRATION_SETUP_GUIDES.md` | Comprehensive step-by-step setup instructions for Twilio (SMS/WhatsApp/Voice), Meta (Facebook/Instagram Lead Ads), Googl |
| CURRENT | `INTEGRATION_SYSTEM_COMPLETE.md` | Documents completion of all 7 OAuth integration phases with unified scope management where one provider connection activ |
| CURRENT | `INTEGRATION_TROUBLESHOOTING_RUNBOOKS.md` | Enterprise-grade P0-P3 severity runbooks for integration issues covering Twilio signature verification failures, OAuth t |
| CURRENT | `PMS_INTEGRATION_COMPLETE.md` | Documents PMS integration core completion (11 of 36 tasks) with database schema for treatment tracking, provider webhook |
| CURRENT | `PMS_INTEGRATION_FINAL_SUMMARY.md` | Claims all 36 PMS integration tasks complete as of Oct 13 2025. Describes bidirectional sync with Dentrix, Open Dental,  |
| CURRENT | `PMS_INTEGRATION_MASTER_PLAN.md` | Architecture and planning document for PMS integration dated Oct 13 2025. Defines full SQL schema with 5 tables (pms_int |
| CURRENT | `PMS_INTEGRATION_USER_GUIDE.md` | End-user how-to guide for configuring PMS integration. Covers webhook URL setup, settings configuration for each PMS sys |
| CURRENT | `SAFE_INTEGRATION_PLAN.md` | 115-task plan for safely integrating the marketing module into the existing CRM without breaking existing functionality. |
| CURRENT | `SOCIAL_MEDIA_INTEGRATION_COMPLETE.md` | Dated Oct 13 2025. Reports social media hub database schema and UI components as complete for Facebook, Instagram, TikTo |
| CURRENT | `UNIFIED_INTEGRATIONS_MASTER_PLAN.md` | Dated Jan 20 2025. Plan to consolidate 7+ scattered integration UI locations into a single /settings/integrations hub. D |
| CURRENT | `USER_FRIENDLY_INTEGRATIONS_SUMMARY.md` | Dated Jan 20 2025. Describes UX improvements to the integrations hub: step-by-step setup wizards, plain English credenti |
| CURRENT | `README.md` | Reference documentation for the unified OAuth-per-provider integration system. Covers architecture overview, API endpoin |
| CURRENT | `communications-providers.md` | Reference table for all communications provider credentials. Documents integration_settings field names and environment  |
| CURRENT | `provider-setup.md` | Operational setup checklist for Twilio and SendGrid credentials. Documents all required environment variables, the secur |
| CURRENT | `connecting-apis.md` | Step-by-step instructions for connecting Google Analytics 4, Search Console, and Business Profile to the marketing audit |
| SUPERSEDED | `phase_2a_2b_notifications_and_queue.md` | Execution prompt adding lead.arrived event to notification catalog, implementing lead_routing audience mode, replacing t |
| history | `2b-1-a-cursor-prompt.md` | Execution prompt creating google_lead_form_configs table, new /api/webhooks/google-lead-form route replacing old /api/we |
| history | `2b-1-b-1-cursor-prompt.md` | Execution prompt adding conversion_events_fired table, OAuth columns and customer_id to google_lead_form_configs, deals. |
| history | `phase-2b-1-b-2-prompt.md` | Execution prompt for a self-serve Google Ads settings UI at /settings/integrations/google, webhook key rotation preservi |
| history | `phase-2b-10-prompt.md` | Execution prompt to consolidate two competing email service modules, designating src/lib/services/email-service.ts (521  |
| history | `phase-2b-2-a-2-prompt.md` | Execution prompt adding a message_media table, Supabase Storage bucket, synchronous download+upload+persist pipeline for |
| history | `phase-2b-2-a-prompt.md` | Execution prompt rebuilding /api/webhooks/whatsapp to fix 5 known bugs: missing ingestLead() call, cross-tenant phone lo |
| history | `phase-2b-2-pre-plan-fact-finding-prompt.md` | Read-only investigation prompt to determine: what the existing WhatsApp webhook actually does on new vs existing contact |
| history | `phase-2b-4-prompt.md` | Execution prompt rebuilding /api/webhooks/sms to mirror the WhatsApp 2b.2.a pattern: add sms_inbound to source_channel_e |
| history | `2b-2-pre-plan-findings.md` | Pre-build audit of the WhatsApp inbound webhook revealing 5 critical defects (no ingestLead call, cross-tenant contact l |
| SUPERSEDED | `2b-8-cit-save-investigation.md` | Read-only investigation confirming the CIT save button always showed a misleading 'Database migration required' toast be |
| history | `ALL_59_TASKS_COMPLETE.md` | Completion report for 59 enterprise communications tasks delivering HubSpot-style activity slide-in panel, email/SMS/Wha |
| history | `IMMEDIATE_FIXES.md` | Documents three classes of runtime errors found on January 20 2025 — a missing integration_connections table causing 404 |
| history | `PHASE_10_COMPLETE.md` | Documents integration of the universal treatment tag routing adapter into both the form-submission and lead-intake webho |
| history | `PHASE_10_VISUAL_COMPLETE.txt` | ASCII-art visual summary of Phase 10 webhook integration tasks and test results, covering the same content as PHASE_10_C |
| history | `PHASE_11_COMPLETE.md` | Documents integration of the universal routing engine into the PMS treatment-proposed webhook and sync engine using a 3- |
| history | `PHASE_11_SUMMARY.md` | Executive summary of Phase 11 PMS integration, recapping the 3-tier tag extraction, routing adapter integration, pms_pro |
| history | `PHASE_11_VISUAL_COMPLETE.txt` | ASCII-art formatted visual summary of Phase 11 PMS integration covering 3-tier extraction strategy, complete integration |
| history | `STEP_3_ADD_CREDENTIALS.md` | One-time setup instruction for filling in GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local to enable the marketin |
| history | `COMPLETE_COMMUNICATIONS_SYSTEM.md` | Completion summary documenting all 46 communications system tasks done, listing 26 new files created including 4 compose |
| history | `ENTERPRISE_COMMUNICATIONS_COMPLETE.md` | Documents 35 of 59 core communications tasks complete (100% of critical path) including activity-detail-slide-in panel,  |
| SUPERSEDED | `INTEGRATIONS_ENTERPRISE_HARDENING_PLAN.md` | The original 51-task enterprise integration hardening roadmap covering webhook signature verification, idempotency, DLQ  |
| history | `INTEGRATION_HARDENING_100_PERCENT_COMPLETE.md` | Final confirmation that all 51 integration hardening tasks are complete with 95/100 enterprise readiness score, listing  |
| SUPERSEDED | `INTEGRATION_HARDENING_COMPLETE_SUMMARY.md` | Interim milestone summary documenting 28 of 51 integration hardening tasks complete (55%) with core security infrastruct |
| SUPERSEDED | `INTEGRATION_HARDENING_PROGRESS.md` | Early progress snapshot showing 20 of 51 integration hardening tasks complete (39%) with Phase 0 foundation fully done b |
| history | `INTEGRATION_SYSTEM_SUMMARY.md` | Summary of completed communications infrastructure including enhanced activities table with 20+ new fields, integration_ |
| SUPERSEDED | `MASTER_INTEGRATION_PLAN.md` | Master plan for unified provider OAuth architecture where one connection activates all provider services, including inte |
| SUPERSEDED | `PMS_INTEGRATION_TASKS.md` | Pre-build planning checklist of 36 tasks, all shown as unchecked [ ]. This was the original task list and was never upda |

## Deployment & Ops
*106 files — CURRENT:46, history:39, SUPERSEDED:11, outdated:9, ?:1*

| Status | File | What it actually contains |
|---|---|---|
| CURRENT | `F06_observability_and_operations.md` | Final foundation-tier audit covering monitoring, logging, testing, and operations. Critical: Sentry init() is commented  |
| CURRENT | `T4_operational_reality.md` | Final audit tier assessing operational maturity. Scores overall maturity at 2.6/10. Confirms deployment is on Vercel (ve |
| CURRENT | `HOW_TO_RUN_SUPER_ADMIN.md` | Quick-start guide for running the dental-crm-admin app on port 3001 alongside the main CRM on port 3000, covering env va |
| CURRENT | `README.md` | README for the dental-crm-admin app describing it as a separate GOD MODE dashboard for monitoring all practices/users, l |
| CURRENT | `README.md` | Operational README for the investor-pack screenshot generation tooling, documenting prerequisites, environment setup, sa |
| CURRENT | `npm-audit-summary.txt` | Raw npm audit output listing 19 vulnerabilities across 7 packages including dompurify XSS, playwright SSL bypass, tar-fs |
| CURRENT | `WORKFLOW_STATUS.md` | GitHub Actions CI/CD workflow status listing 12 active workflows with trigger conditions and required secrets, not CRM w |
| CURRENT | `ALL_BUILD_ERRORS_FIXED.md` | Documents fixes for three build errors: missing PostHog module (stub created), database function column error (utm.is_ac |
| CURRENT | `ALL_CRITICAL_FIXES_COMPLETE.md` | Documents two production fixes: location switching 406 errors resolved by forcing full page reload with cache-busting UR |
| CURRENT | `CACHE_MANAGEMENT.md` | How-to guide explaining browser and Next.js caching issues, the solutions implemented (environment-aware headers in next |
| CURRENT | `DEPENDENCY_INFRASTRUCTURE_AUDIT.md` | Full technology stack inventory covering 103 npm dependencies, 10 external APIs, hosting options, cost tiers, and HIPAA  |
| CURRENT | `DISASTER_RECOVERY.md` | Concise disaster recovery plan defining RTO/RPO targets, backup strategy, and recovery procedures for database corruptio |
| CURRENT | `ENV_SETUP_GUIDE.md` | Developer guide for configuring all required and optional environment variables including Supabase, Resend, Twilio, Open |
| CURRENT | `GITHUB_PUSHED_NEXT_STEPS.md` | Documents that the dental CRM codebase was pushed to GitHub repo AgenttoffeeOrg/dental-crm-private and provides step-by- |
| CURRENT | `HOW_TO_RESTORE_VERSION_2.md` | A recovery guide for restoring git tag v2-hubspot-pipelines (commit df6fa64, created October 11, 2025) which represents  |
| CURRENT | `NEXT_STEPS.md` | Setup guide for SonarCloud CI integration and CodeRabbit code review, including GitHub Actions workflow configuration, S |
| CURRENT | `PERFORMANCE_OPTIMIZATION.md` | A reference guide covering frontend and backend optimization techniques including code splitting, image optimization, ca |
| CURRENT | `PHASE_17_COMPLETE.md` | Documents production deployment preparation including a 60-test regression suite, 150+ item manual checklist, database m |
| CURRENT | `QUICK_START_FOR_DEEPAK.md` | Personalized 6-minute deployment guide for deepakshegde@gmail.com to activate multi-location, billing, domain discovery, |
| CURRENT | `README_FOR_FRIEND.md` | A step-by-step onboarding guide for a new developer to clone the repo, set up Supabase, run SQL migrations 01–14, config |
| CURRENT | `README_START_HERE.md` | An orientation document for the production-ready dental CRM summarising recent auth/performance fixes, available feature |
| CURRENT | `START_HERE_GITHUB_SETUP.md` | Step-by-step guide to push the dental CRM to two separate private GitHub repos and invite a collaborator while keeping s |
| CURRENT | `TROUBLESHOOTING.md` | Short reference listing common build, runtime, database, and UI issues with brief solutions for the dental CRM developme |
| CURRENT | `DEMO_SEED_SETUP.md` | Setup guide for a demo seed system targeting deepakshegde@gmail.com, creating a separate 'Deepak's Dental Practice (DEMO |
| CURRENT | `demo-mode.md` | Reference documentation for the sandboxed demo environment controlled by DEMO_MODE env var, explaining how to reset demo |
| CURRENT | `COMPREHENSIVE_DEPLOYMENT_CHECKLIST.md` | Full deployment checklist for the Railway production deployment including environment variables, Railway configuration ( |
| CURRENT | `DASHBOARD_DEPLOYMENT_GUIDE.md` | Deployment guide for Dashboard version 9.0 (Enterprise Transformation) covering the pre-deployment checklist, 5-step Rai |
| CURRENT | `DEPLOYMENT_COMPLETE_GUIDE.md` | Step-by-step guide for deploying both the main Dental CRM and the Super Admin dashboard to Vercel, including SQL migrati |
| CURRENT | `DEPLOYMENT_GUIDE.md` | General deployment reference covering three deployment options (Vercel, AWS EC2+Nginx, Docker), required environment var |
| CURRENT | `DEPLOYMENT_RUNBOOK.md` | Step-by-step deployment runbook for the Marketing Audit module covering environment setup, database migrations, Google C |
| CURRENT | `HARDENING_DEPLOYMENT_CHECKLIST.md` | Comprehensive deployment checklist for the security hardening release covering all 12 migrations, application code chang |
| CURRENT | `RAILWAY_DEPLOYMENT_GUIDE.md` | Comprehensive Railway deployment guide covering CLI installation, project initialization, environment variable configura |
| CURRENT | `RAILWAY_ENV_VARS_COMPLETE.md` | Reference document listing all Railway environment variables grouped by priority (required, recommended, optional) with  |
| CURRENT | `SENTRY_SETUP.md` | Configuration guide for Sentry error monitoring in the Dental CRM Next.js application covering the four config files, re |
| CURRENT | `check-sentry-status.md` | Short operational guide explaining how to verify Sentry integration is working by checking the Sentry dashboard issues l |
| CURRENT | `production-checklist.md` | Step-by-step checklist covering environment variables, database migrations, RLS verification, Redis setup, cron configur |
| CURRENT | `PHASE_10_CICD_GUIDE.md` | Implementation guide for CI/CD safety guards including a TypeScript migration linter detecting DROP TABLE/ALTER COLUMN D |
| CURRENT | `PHASE_9_OBSERVABILITY_GUIDE.md` | Implementation guide for enterprise observability covering trace ID propagation via x-trace-id header, system_metrics_re |
| CURRENT | `observability.md` | Implementation plan for the application observability stack. Tools: Sentry (error tracking with DSN config), Pino (struc |
| CURRENT | `monitoring-dashboard-plan.md` | Phase 0 observability baseline document. Metrics emitted: metric:queue:* (BullMQ), metric:provider:failure, metric:api:l |
| CURRENT | `2a-4-smoke-test-runbook.md` | Smoke test runbook for Phase 2a.4. Specific URLs: CRM at dental-d1xvxu6cu-toffeehegde-9056s-projects.vercel.app, test pr |
| CURRENT | `practice-onboarding-runbook.md` | Comprehensive 11-section practice onboarding guide. Covers: pre-flight checklist, tenant creation, default offering prov |
| CURRENT | `operational-gotchas.md` | A living reference of production issues covering Next.js client/server module boundaries, Twilio webhook signatures, ten |
| CURRENT | `optimization-guide.md` | Developer guide with target metrics (Lighthouse 90+, bundle <180KB, TTI <2s) and concrete code patterns for bundle split |
| CURRENT | `backup-verification.md` | Operational runbook for nightly automated Supabase/PostgreSQL backup verification: snapshot export, Docker restore into  |
| CURRENT | `hardening-guide.md` | Production security checklist and code-level guide covering HTTP security headers, rate limiting, input validation, auth |
| history | `phase_2a_4_deployment_helper.md` | Execution prompt for Vercel MCP deployment with env var sync (skipping SENDGRID_*), smoke test runbook, and test site pl |
| history | `DEPLOYMENT_ALMOST_THERE.md` | Early deployment troubleshooting note about needing an OpenAI API key. Presents two options: add the key or skip AI feat |
| history | `DEPLOYMENT_STATUS_CHECK.md` | Early deployment troubleshooting note about Vercel authentication protection blocking public access. Instructions to dis |
| SUPERSEDED | `DEPLOYMENT_STEP_BY_STEP.md` | Step-by-step Vercel deployment guide for both the main CRM and the super admin app. Includes Resend API key setup, Twili |
| SUPERSEDED | `DEPLOY_NOW.md` | Condensed Vercel deployment guide (npx vercel). Contains hardcoded Supabase anon key AND service_role key in plaintext.  |
| history | `DEVELOPMENT_WORKFLOW_EXPLAINED.md` | Overview of the two-environment development workflow (local localhost:3000 + production Vercel). Documents daily workflo |
| SUPERSEDED | `RAILWAY_DEPLOYMENT_GUIDE.md` | Step-by-step guide for deploying the dental CRM to Railway, including env var configuration, Supabase redirect setup, an |
| outdated | `SAFE_DEVELOPMENT_WORKFLOW.md` | Explains the two-branch git workflow (main=production on Vercel, development=local), with commands for switching branche |
| outdated | `SIMPLE_WORKFLOW.txt` | Plain-text summary of the development workflow explaining the live Vercel URL for users, localhost:3000 for development, |
| history | `YOUR_LIVE_APP.txt` | Deployment announcement listing the live Vercel URL, the local dev URL, the super admin URL on port 3001, and the GitHub |
| history | `README.txt` | Auto-generated Vercel README explaining the purpose of the .vercel folder (stores projectId and orgId) and that it shoul |
| history | `2b-2-twilio-sandbox-setup.md` | Operations setup record for configuring the Twilio WhatsApp sandbox (number +14155238886, join code 'join my-too') as th |
| outdated | `DEPLOYMENT_GUIDE.md` | Step-by-step deployment guide for the Marketing Audit module covering environment setup, database migrations, and option |
| SUPERSEDED | `RAILWAY_DEPLOYMENT_GUIDE.md` | October 2025 Railway deployment guide for version 6.0 multi-location enterprise edition covering Railway configuration,  |
| outdated | `ROLLOUT_PLAYBOOK.md` | Six-week phased rollout strategy for multi-location and seat-based billing using feature flags, progressing from interna |
| history | `BUILD_ERROR_FIX_COMPLETE.md` | Documents the fix for a duplicate createServerClient export in supabase-server.ts that would have blocked Railway deploy |
| SUPERSEDED | `CACHE_SOLUTION_SUMMARY.md` | Summary document explaining the cache problem (missing headers causing constant manual cache clearing) and the solution  |
| history | `COMMANDS_TO_RUN.md` | Step-by-step commands for creating a private GitHub repo for the dental CRM code and a separate repo to share with a fri |
| history | `COMPLETE_SYSTEM_STATUS.md` | Master status document declaring the CRM production-ready with Dashboard, Pipeline, Contacts, Marketing, Tasks, Calls, a |
| history | `CRITICAL_FIXES_COMPLETED.md` | Documents October 15, 2025 fixes including disabling RLS (QUICK_FIX_RLS.sql) to unblock all database writes, fixing cont |
| history | `FINAL_QA_REPORT.md` | QA report for PR #16 (deploy/railway-production-v6) documenting resolution of 56 VS Code Problems: 100+ TypeScript error |
| history | `GITHUB_DONE.md` | Confirmation that the dental CRM codebase was pushed to two GitHub repos under the Agenttoffee account: a private repo ( |
| history | `GITHUB_SETUP_COMPLETE.md` | A pre-push checklist confirming security verification (.env.local not tracked), summarizing the two-repo strategy (priva |
| outdated | `QUICK_FIX_APPLIED.md` | Documents a one-time fix installing the missing 'pino' logging dependency that was causing the dev server to crash, then |
| history | `QUICK_RECOVERY_GUIDE.md` | Step-by-step guide for restoring the codebase to git checkpoint v1.0.0-checkpoint-2025-10-28 (commit 43e8a40), including |
| history | `QUICK_START_ENTERPRISE.md` | 3-step enterprise upgrade deployment guide covering running 3 database migrations (email_logs, user_pipeline_preferences |
| history | `VISUAL_FIX_GUIDE.md` | ASCII-diagram guide explaining that Railway was crashing because the Custom Build Command was set to 'npm install' inste |
| history | `✅_FINAL_ERROR_FIX.md` | Companion fix note confirming the /api/locations/context 500 error (column utm.is_active does not exist) was resolved in |
| history | `DEPLOYMENT_COMPLETE.md` | Deployment record for commit 366f7ea on October 29 2025 pushing 83 files with a premium pipeline redesign (deep navy the |
| history | `DEPLOYMENT_COMPLETE_SUMMARY.md` | Comprehensive summary confirming commit fe18203 (369 files) was pushed to Railway, fixing the last hardcoded tenant ID i |
| history | `DEPLOYMENT_INSTRUCTIONS.md` | Three-step deployment instructions for enabling multi-location, billing, and marketing audit features via environment fl |
| history | `DEPLOYMENT_REPORT_v6.md` | Comprehensive report summarizing the preparation and packaging of v6.0 Multi-Location Enterprise Edition for Railway pro |
| SUPERSEDED | `DEPLOYMENT_STEPS_SIMPLE.md` | Interactive step-by-step guide (version 10.0 hardening) walking through 15 steps including database backup, running 4 ha |
| history | `DEPLOYMENT_SUCCESS.md` | Post-deployment success record documenting that after 5 attempts and iterative fixes (tsconfig baseUrl, nixpacks npm rem |
| ? | `DEPLOY_TRIGGER.md` | Stub file containing only a deployment identifier number with no additional content, likely a placeholder or automated t |
| SUPERSEDED | `DEPLOY_VIA_GITHUB.md` | Brief guide explaining how to deploy the Dental CRM to Railway using GitHub integration rather than the CLI, covering th |
| SUPERSEDED | `ENTERPRISE_UPGRADE_DEPLOYMENT_GUIDE.md` | Deployment guide for the v2.0.0 Enterprise Edition upgrade covering 3 database migrations (email_logs, user_pipeline_pre |
| history | `FINAL_DEPLOYMENT_FOR_INVESTOR_MEETING.md` | Urgent pre-investor-meeting deployment checklist documenting 7 completed fixes (CSP WebSocket, null checks, marketing au |
| history | `PRE_DEPLOYMENT_VERIFICATION.md` | Verification report for the Marketing Audit module confirming 300+ new files, all dependencies installed, directory stru |
| history | `PRODUCTION_CERTIFICATION.md` | Self-certification document for the Marketing Audit module claiming production readiness at 81% task completion (226/279 |
| history | `PRODUCTION_READINESS_CHECKLIST.md` | Production readiness checklist for the core CRM platform (pre-enterprise features) confirming all auth flows, page loads |
| history | `PRODUCTION_READY_CONFIRMATION.md` | Duplicate production confirmation for the Marketing Audit module at 83.5% completion (233/279 tasks) reiterating securit |
| history | `RAILWAY_BUILD_FIXES.md` | Debug record of Railway build fixes including installing @sendgrid/mail, adding extractTagsFromDealText legacy export al |
| history | `RAILWAY_BUILD_FIX_PRECISION.md` | Precision analysis of a Railway deployment crash caused by setting Custom Build Command to 'npm install' instead of 'npm |
| history | `RAILWAY_DEPLOYMENT_FIX.md` | Documents fix for npm ci failing due to out-of-sync package-lock.json (missing @mermaid-js and tsx dependencies), resolv |
| history | `RAILWAY_DEPLOYMENT_FIXED.md` | Documents fixing Railway build failures caused by missing baseUrl in tsconfig.json for TypeScript path alias resolution, |
| history | `RAILWAY_DEPLOYMENT_STATUS.md` | Status document recording the final set of build fixes including downgrading from Next.js 15 to 14.2.18, converting next |
| SUPERSEDED | `RAILWAY_DEPLOYMENT_STEP_BY_STEP.md` | Step-by-step guide for initial Railway deployment that includes hardcoded Supabase credentials (URL, anon key, service r |
| history | `RAILWAY_DEPLOYMENT_SUMMARY.md` | Summary document for v6.0 deployment listing 150+ features across all modules (CRM, analytics, multi-location, billing,  |
| history | `RAILWAY_FINAL_FIX.md` | Documents the fourth and final deployment fix switching from npm ci to npm install with --legacy-peer-deps flag to bypas |
| SUPERSEDED | `RAILWAY_NEXT_STEPS.md` | Operational guide listing the next steps for Railway deployment including obtaining Supabase credentials, setting enviro |
| history | `RAILWAY_NIXPACKS_FIX.md` | Documents and resolves the Nixpacks build error 'undefined variable npm' by removing 'npm' from the nixPkgs array, expla |
| SUPERSEDED | `RAILWAY_QUICK_START.md` | Quick-start guide offering an automated deploy-to-railway.sh script and manual CLI steps for deploying the Dental CRM to |
| history | `RAILWAY_REACT19_PEER_DEPS_FIX.md` | Documents and resolves the npm ERESOLVE error caused by @testing-library/react and @react-email/render requiring React 1 |
| history | `READY_FOR_RAILWAY.md` | Pre-deployment readiness confirmation document recording that all 8 critical database migrations are applied, Railway co |
| outdated | `SUPER_ADMIN_AND_DEPLOYMENT_PLAN.md` | Planning document outlining 50 tasks to build a super admin dashboard (god mode for all tenants) and user analytics trac |
| history | `🎉_SUCCESSFULLY_DEPLOYED.md` | Announces that 294 files and 77,741 lines of code for the Marketing Audit module v1.0.0 were successfully pushed to the  |
| outdated | `INVESTOR_PACK_COMPLETE.md` | Documentation for an automated investor pack generation system built in October 2025 that produces screenshots, architec |
| outdated | `QUICK_START_INVESTOR_PACK.md` | Three-command quick-start guide for the investor pack generation system referencing npm run investor:pack, .env.local se |
| outdated | `SHARE_WITH_FRIEND_GUIDE.md` | Step-by-step guide for creating two separate GitHub repositories—one private for the owner and one for a collaborator—co |

## Testing & QA
*60 files — CURRENT:29, history:27, ?:2, outdated:1, SUPERSEDED:1*

| Status | File | What it actually contains |
|---|---|---|
| CURRENT | `ALL_ERRORS_REPORT.md` | A consolidated error report cataloguing 3 blocking TypeScript compilation errors, 19 npm security vulnerabilities, 648 f |
| CURRENT | `dependency-issues.txt` | Raw output from Dependency-Cruiser listing 91 orphaned-module warnings and 12 unresolvable-dependency errors including m |
| CURRENT | `typescript-errors.txt` | Raw tsc --noEmit output showing exactly 3 TypeScript compilation errors, all in deal-detail-view-modal.tsx at lines 409, |
| CURRENT | `2b-86-changes.md` | Adds DELETE /api/task-recurring-rules/[id] for orphan cleanup on task-create failure, and establishes a real-Supabase in |
| CURRENT | `16-edge-cases-and-errors.md` | Documents error handling patterns across all API routes, Zod validation usage, database constraints, and identifies the  |
| CURRENT | `CLEAN_SLATE_INSTRUCTIONS.md` | Step-by-step Supabase SQL instructions for cleaning a development database by preserving only the first-created user and |
| CURRENT | `CODERABBIT_SETUP.md` | Short guide describing the CodeRabbit AI code review GitHub App installation and the .coderabbit.yaml configuration enab |
| CURRENT | `COMPREHENSIVE_TEST_GUIDE.md` | Six test suites covering organization switching, location switching, export security (cross-tenant injection attempts),  |
| CURRENT | `COMPREHENSIVE_TEST_SUITE.md` | Records passed test results across 13 phases of Marketing-CRM integration testing covering schema, feature flags, contac |
| CURRENT | `DASHBOARD_COMPREHENSIVE_TEST_PLAN.md` | Manual and automated test plan with 60 checks spanning data accuracy, performance (target <2s), real-time WebSocket mult |
| CURRENT | `ENTERPRISE_AUDIT_COMPLETE.md` | Completion summary for a cross-cutting enterprise audit fixing 3 critical bugs (CreateContact crash, VerifyEmail not sen |
| CURRENT | `ERROR_HANDLING_FIXES_COMPLETE.md` | Fix summary resolving 6 empty console error objects caused by treatment routing components querying tables that don't ex |
| CURRENT | `HOW_TO_RUN_ANALYSIS.md` | Quick reference guide for running TypeScript, ESLint, security, and dependency analysis tools, with a snapshot of outsta |
| CURRENT | `KNOWN_ISSUES.md` | Documents a non-critical peer dependency conflict where @testing-library/react@14 requires React ^18 but the project use |
| CURRENT | `QUICK_TEST_CHECKLIST.md` | A 7-step rapid smoke test checklist for verifying org/location switching, export security, and console health in approxi |
| CURRENT | `QUICK_TEST_GUIDE.md` | A 12-flow test checklist covering slide-over UI interactions, multi-tenancy data isolation, validation, and mobile respo |
| CURRENT | `SONARCLOUD_SETUP.md` | Instructions for configuring and running SonarCloud static analysis locally or via GitHub Actions for the dental-crm pro |
| CURRENT | `TOOLS_COMPARISON.md` | Reference guide explaining the distinct roles of CodeRabbit, Sentry, Jest, and Playwright and how they complement each o |
| CURRENT | `PRE_DEPLOYMENT_CHECKLIST.md` | 150+ item manual and automated testing checklist for Phase 17 deployment covering deal creation, pipeline operations, co |
| CURRENT | `PHASE_11_12_TESTING_GUIDE.md` | Implementation guide for Phase 11 E2E and red-team testing (tenant isolation, entitlement bypass, quota enforcement via  |
| CURRENT | `verification_report.md` | Post-hardening verification report dated October 17, 2025 confirming all 12 migrations applied with 256+ RLS policies ac |
| CURRENT | `k6.md` | Reference and how-to for k6 load testing profiles. Defines three test tiers: smoke (1 VU, 1 min), load (ramp 0 to 50 VUs |
| CURRENT | `ACCESSIBILITY_GUIDE.md` | Accessibility implementation guide covering WCAG 2.1 AA requirements for the CRM: perceivable, operable, understandable, |
| CURRENT | `TEST_DASHBOARD.md` | Reference guide describing all testing layers (Jest unit, Playwright E2E, Percy visual regression, Lighthouse CI, k6 loa |
| CURRENT | `VERIFICATION_QUICK_START.md` | Step-by-step quick-start guide instructing users to run the 5 SQL Section A verification tests in Supabase SQL Editor, l |
| CURRENT | `QUICK_START.md` | Five-minute setup guide for deploying a dummy dental practice website to dentalcrmtest.com via Vercel with CRM form ifra |
| CURRENT | `README.md` | Instructions for running a multi-page static HTML dental practice website locally on port 8080 for testing CRM form subm |
| CURRENT | `README.md` | Index file describing the format and commands for running SQL, API, E2E, and performance verification tests and saving r |
| CURRENT | `README.md` | Setup and deployment guide for a static HTML mock dental practice website used in Phase 2a.4 to validate the booking wid |
| history | `phase_2a_4_test_site_and_e2e.md` | Specification for a static test site ('Bright Smile Dental Practice') using Ofcom fiction numbers, a 14-case e2e test ma |
| history | `2b-1-b-1-task8-vercel-validation-prompt.md` | Validation runbook against dental-crm-nine.vercel.app for the Google Ads EC4L integration, covering OAuth via eeveeshegd |
| history | `phase-2b-1-b-2-validation-prompt.md` | Hybrid validation runbook for the Google Ads integration UI verifying that webhook_key is preserved after disconnect/rec |
| history | `phase-2b-2-a-validation-prompt.md` | Hybrid validation runbook for the WhatsApp webhook rebuild covering 5 verification phases: lazy-create path, dedup path, |
| outdated | `eslint-errors.txt` | Raw ESLint output showing the tool prompted for ESLint configuration mode selection and did not complete — no actual lin |
| history | `COMPACT_SETTINGS_TEST_GUIDE.md` | Manual testing checklist and measurement comparison table for verifying the compact settings UI changes across all tabs, |
| history | `FINAL_FIX_SUMMARY.md` | Documents resolution of 5 TypeScript and runtime errors (useKeyboardShortcuts TypeError, PostHog module missing, SetupBa |
| history | `PHASE_15_COMPLETE.md` | Documents 63 comprehensive test cases covering the routing engine, AI tag extraction, tag matching logic, unsorted fallb |
| history | `PHASE_15_SUMMARY.md` | Executive summary of Phase 15 testing confirming 63 test cases, 90%+ coverage, 100% pass rate, and 3 bugs found and fixe |
| history | `REMAINING_ISSUES.md` | Lists 20 SonarQube code quality warnings in SQL verification test files, none affecting production code, with a recommen |
| history | `REMAINING_TASKS_STATUS.md` | Reports that two blocking bugs (406 errors on location switching, React hydration crashes) were fixed and deployed to Ra |
| history | `SETTINGS_REDESIGN_TEST_GUIDE.md` | A step-by-step testing guide for verifying all 27 tabs, URL navigation, search, mobile responsiveness, browser back/forw |
| history | `SETTINGS_TEST_GUIDE.md` | A verification checklist for the ultra-compact settings UI transformation, specifying exact CSS measurements (32px tabs, |
| history | `SONARCLOUD_STATUS.md` | A status document confirming SonarCloud is configured and analysis is running on 1,091 files across TypeScript, JavaScri |
| history | `SYSTEM_HEALTH_REPORT.md` | Snapshot health assessment rating the CRM at 95/100 overall, documenting all core pages as functional and recent auth pe |
| history | `TIMESTAMP_AUDIT_REPORT.md` | Audit confirming all database and application timestamps are server/runtime generated and correct, with only the What's  |
| SUPERSEDED | `PRE_MIGRATION_AUDIT_CHECKLIST.md` | Comprehensive audit checklist template covering every page, button, link, form, and data relationship to test before run |
| history | `PRE_MIGRATION_AUDIT_FINDINGS.md` | Complete audit results showing the CRM is 93% functional with 3 critical broken links (/contacts/new, /tasks/new, /deals |
| history | `PRE_MIGRATION_TODO_LIST.md` | Actionable task list derived from the pre-migration audit, categorizing 3 critical broken-route fixes, 4 medium TypeScri |
| ? | `SEED_PACK_SUMMARY.md` | Summary of a planned demo seed pack for Deepak's Dental Practice that will create 750+ realistic records across 3 locati |
| history | `FEATURE_FLAGS_QA.md` | QA notes from 2025-11-11 confirming migration, service helper, API route, governance UI, and legacy useFeatureFlags hook |
| history | `QUEUE_QA.md` | QA notes from 2025-11-11 verifying BullMQ dead-letter integration, queue snapshot API, SystemReliabilityTab UI, and back |
| history | `RECEPTION_QA.md` | QA notes from 2025-11-11 confirming receptionist workspace navigation, contact search, communication drawer prefill, per |
| ? | `COMPLETE_USER_JOURNEY_TEST.md` | Testing guide for the enterprise authentication system covering sign-up, sign-in, onboarding flow, dashboard access, err |
| history | `FINAL_VERIFICATION_CHECKLIST.md` | Pre-production sign-off checklist for the Marketing Audit module dated January 16, 2025, showing 240/279 tasks complete  |
| history | `MASTER_VERIFICATION_COMPLETE.md` | Summary document confirming the verification infrastructure (SQL tests Section A, 2 E2E examples, seed data script, 50-p |
| history | `VERIFICATION_CHECKPOINT.md` | Progress checkpoint dated October 17, 2025 showing Section A (5 SQL tests) complete and Section B paused at test B1.1 (C |
| history | `VERIFICATION_INFRASTRUCTURE_COMPLETE.md` | Infrastructure summary confirming the creation of 5 SQL test files (Section A), seed data script, test runner script, an |
| history | `SECTION_A_COMPLETE.md` | Sign-off document for Section A verification tests conducted 2025-10-17, reporting all five test suites (RLS inventory,  |
| history | `SECTION_B_MANUAL_TESTS.md` | Manual UI test guide and SQL verification suite for Section B covering contacts, deals, pipelines, and tasks modules wit |
| history | `a3_soft_delete.txt` | Empty results file for the soft delete functional tests with only a header and blank body — no actual test results have  |

## Product & Features
*112 files — CURRENT:42, history:41, SUPERSEDED:24, outdated:3, ?:2*

| Status | File | What it actually contains |
|---|---|---|
| CURRENT | `01_PRODUCT_FEATURES_AND_MODULES.md` | Evidence-backed analysis of all dental CRM product modules including dental-specific logic (treatment tag routing, NHS p |
| CURRENT | `phase4-autonomous-engagement-ui.md` | UI and ops plan for Phase 4 autonomous engagement with new Autonomous Engagement nav section, campaign management, bot c |
| CURRENT | `phase4-autonomous-engagement.md` | Technical architecture for Phase 4 autonomous engagement with 7 new tables, a conversation state machine, BullMQ engagem |
| CURRENT | `15-ui-components-complete.md` | Catalogs 12 wizard step components, 86+ settings components, data display components, and form components including the  |
| CURRENT | `ADMIN_GUIDE.md` | Short operational guide for CRM administrators covering user management, role configuration, security setup (2FA, IP whi |
| CURRENT | `CALENDAR_FINAL_REDESIGN_COMPLETE.md` | Documents the pivot from a full appointment-booking system to a CRM activity aggregator calendar, moving calendar access |
| CURRENT | `CHART_REFINEMENTS_GUIDE.md` | Developer reference guide specifying color-blind-safe chart color tokens, Recharts component patterns for line/bar/area/ |
| CURRENT | `DASHBOARD_TRANSFORMATION_SUCCESS.md` | Final success announcement claiming all 49 dashboard transformation tasks complete with keyboard shortcuts, AI insights, |
| CURRENT | `ENTERPRISE_UX_COMPLETE.md` | Completion record for standardizing all create actions (Contact, Deal, Task) across the app to use a uniform right-side  |
| CURRENT | `FAQ.md` | Basic user-facing FAQ covering general info, setup, features, billing, and technical questions for the dental CRM produc |
| CURRENT | `FINAL_COMPLETION_SUMMARY.md` | Documents completion of a 12-task investor pack system (100%) including Playwright screenshot runner, Mermaid architectu |
| CURRENT | `FORMS_MODULE_COMPREHENSIVE_AUDIT.md` | A detailed gap analysis of the marketing forms / lead capture forms module concluding it is 70% complete versus enterpri |
| CURRENT | `HOW_TO_SHARE_FORMS.md` | Step-by-step instructions for publishing a CRM marketing form and retrieving its hosted link, iframe embed code, and QR  |
| CURRENT | `MOBILE_OPTIMIZATION_COMPLETE.md` | Comprehensive guide documenting the October 14 2025 mobile optimization adding a hamburger menu, responsive layouts, 44p |
| CURRENT | `NOTIFICATIONS_100_OUT_OF_100_COMPLETE.md` | Final completion report for the enterprise notifications system documenting all 12 tasks delivered including database sc |
| CURRENT | `NOTIFICATIONS_ENTERPRISE_RESEARCH_AND_DESIGN.md` | Pre-build design document benchmarking notifications patterns from Salesforce, HubSpot, Slack, GitHub, Material Design,  |
| CURRENT | `ONE_PAGE_SUMMARY.md` | Executive one-pager with project statistics (98,091 LOC, 280 components, 84 APIs, 50+ tables, 214 commits) and business  |
| CURRENT | `SETTINGS_100_OUT_OF_100_COMPLETE.md` | Completion record for 12 settings enhancement tasks that raised the settings system score from 85/100 to 100/100, adding |
| CURRENT | `SPEED_OPTIMIZATION_TASKS.md` | A checklist of 50 pending performance and UX tasks covering optimistic updates, modal/slide-in patterns, caching, animat |
| CURRENT | `START_HERE_FINAL.md` | High-level onboarding entry point declaring all 390 build tasks complete and the CRM production-ready, with links to set |
| CURRENT | `STREAMLINED_FILTERS_COMPLETE.md` | Completion report for replacing a two-row cramped deal filter layout with a single-row design featuring one Filters butt |
| CURRENT | `UI_POLISH_COMPLETE_SUMMARY.md` | Final completion report for a 50-task enterprise UI polish initiative that raised the UI score from 70 to 100 through de |
| CURRENT | `UI_POLISH_STYLE_GUIDE.md` | Production-ready style guide documenting design system foundation, component usage patterns, formatting utilities, layou |
| CURRENT | `UI_TRANSFORMATION_COMPLETE.md` | Final transformation report confirming all 50 polish tasks executed across 15 pages, delivering consistent number format |
| CURRENT | `PIPELINE_BUTTON_DESIGN_VARIATIONS.md` | Documents four CSS/TSX design styles for the pipeline selector button (Flat, Soft Gradient, Glassmorphic, Material 3) wi |
| CURRENT | `INTEGRATION_GUIDE.md` | Step-by-step instructions for adding new enterprise dashboard components (TodaysPriorities, AIInsightsWidget, EnhancedKP |
| CURRENT | `MARKETING_MODULE_REDESIGN_COMPLETE.md` | October 13, 2025 UI redesign completion document. Built 11 major UI features including Unified Marketing Hub, Modern Cam |
| CURRENT | `feature-flag-governance.md` | Playbook describing the Phase 5 database-backed feature flag system with registry, tenant assignment overrides, audit lo |
| CURRENT | `FEATURE_FLAGS_PLAN.md` | Architecture document for Phase 5 feature flag system specifying the data model (feature_flag_registry, feature_flag_ass |
| CURRENT | `FEATURES_AND_MODULES.md` | Product overview document describing six core modules with code snippets: patient management workspace (ContactDetailVie |
| CURRENT | `USER_GUIDE.md` | Step-by-step end-user instructions covering first login, contacts, pipeline, tasks, marketing campaigns, analytics, sett |
| CURRENT | `00-overview.md` | Source-of-truth index for the 2b.36+ phase series capturing locked product decisions from the 2026-05-23 discussion for  |
| CURRENT | `call-dialer-queue.md` | Spec for adding a queue mode to /call-coaching so operators can power through today's promised callbacks with one-tap di |
| CURRENT | `contact-detail.md` | Detailed layout spec replacing the current tabs-with-big-cards layout with a read-first WhatsApp-style chat bubble timel |
| CURRENT | `contacts-list.md` | Spec reverting 2b.34.2 inbox-style features (Reply pills, snippet previews, sort-by-activity) and reshaping the contacts |
| CURRENT | `dashboard.md` | Detailed spec for the operator's morning landing page featuring a top KPI strip, eight triage lane cards, quick-action b |
| CURRENT | `deals-kanban.md` | Spec adding last-activity-date, next-activity-date, and AI-uncertain marker to every Kanban deal card, plus three new fi |
| CURRENT | `00-overview.md` | Source-of-truth index for the 2b.58+ tasks module rebuild, capturing locked decisions from a 2026-05-24 product discussi |
| CURRENT | `deal-close-prompt.md` | Spec for a modal that fires when a deal moves to closed_won or closed_lost and has open tasks, prompting the operator to |
| CURRENT | `notifications.md` | Spec defining three notification layers for tasks: due-now (in-app toast + browser push, default ON), morning digest ema |
| CURRENT | `queue-ux.md` | Detailed UX spec for the reshaped TaskQueuePanel with channel-batch mode selection (Messages modal vs Calls full-screen  |
| CURRENT | `tasks-page.md` | Spec for reshaping src/app/tasks/page.tsx into a triage-first table with four tabs (All/Today/Tomorrow/Overdue), date fi |
| history | `phase-2a-8-settings-ui-prompt.md` | Execution prompt for a settings page at /settings/treatments to manage practice_treatment_offerings with toggle/edit/add |
| history | `phase_2a_3_booking_widget.md` | Specification for a chatbot-style booking widget in Shadow DOM built with Vite, identified by slug, with 3 user paths (c |
| history | `UI_CONFIRMATION.txt` | Confirmation note describing the existing split-screen sign-up/sign-in UI (indigo-purple gradient right panel, 2-step fo |
| history | `COMPLETE_SUCCESS.md` | Point-in-time completion record from October 18 2025 declaring the investor pack generation finished, listing 51 screens |
| SUPERSEDED | `INVESTOR_PACK_STATUS.md` | Earlier status snapshot for the investor pack noting core documentation complete but screenshots still pending manual ru |
| history | `feature_matrix.md` | Auto-generated feature completion matrix from October 2025 listing 45 features across 10 modules with status (Complete/I |
| history | `CLEAN_PERMISSION_UI.md` | Announces a redesigned permissions editor that opens as a modal popup with 10 collapsible color-coded categories, search |
| history | `DASHBOARD_SESSION_FINAL_REPORT.md` | Session summary reporting 32 of 49 dashboard tasks completed (65%), including real data analytics engine, priority syste |
| history | `FINAL_SESSION_SUMMARY_ALL_100_PERCENT.md` | Session completion summary claiming Settings, Notifications, and Feature Visibility systems each reached 100/100, delive |
| history | `BRAND_ALIGNED_UI_POLISH_COMPLETE.md` | Documents a 9-phase UI color consistency pass that eliminated all purple and bright-green color references from the CRM  |
| SUPERSEDED | `CALENDAR_100_PERCENT_COMPLETE.md` | Final completion report for a full appointment-scheduling calendar module with 45 tasks done including 5 calendar views, |
| SUPERSEDED | `CALENDAR_COMPLETE_AUDIT_AND_PLAN.md` | Initial audit scoring the calendar at 15/100 (only a task calendar view existed) and a 45-task enterprise plan covering  |
| SUPERSEDED | `CALENDAR_IMPLEMENTATION_COMPLETE.md` | Intermediate status report showing the appointment-scheduling calendar built to 80/100 with 5 views, create slide-over,  |
| SUPERSEDED | `CALENDAR_REDESIGN_PLAN.md` | Planning document that identified the full appointment-booking calendar as the wrong direction and proposed replacing it |
| history | `COMPACT_SETTINGS_COMPLETE.md` | Documents a settings UI density improvement reducing the header from 188px to 56px and increasing visible content by 80- |
| history | `COMPACT_SETTINGS_DONE.md` | Records completion of a settings UI compaction task that reduced header height from 188px to 56px, increased visible fie |
| SUPERSEDED | `COMPACT_SETTINGS_PROGRESS.md` | Interim progress snapshot of the settings compaction task showing 13 of 35 tasks done, with phases 3-6 still pending at  |
| history | `DASHBOARD_COMPLETE_IMPLEMENTATION_PLAN.md` | Batched execution plan for 42 remaining dashboard tasks covering Phase 0 performance, Phase 1 real-time and priorities,  |
| history | `DASHBOARD_DEEP_ANALYSIS.md` | Line-by-line audit of the dashboard component at version 8.1 documenting critical fake/hardcoded data issues, missing re |
| SUPERSEDED | `DASHBOARD_ENTERPRISE_TRANSFORMATION_STATUS.md` | Mid-session progress tracker showing 7 of 49 dashboard transformation tasks complete (14%) with Phase 0 at 58% and all s |
| history | `DASHBOARD_PERFORMANCE_AUDIT.md` | Performance audit at version 9.0 showing before/after metrics with FCP improving from 3.2s to 1.5s and Total Blocking Ti |
| SUPERSEDED | `DASHBOARD_PROGRESS_CHECKPOINT_1.md` | Early progress checkpoint recording 5 of 49 tasks complete (10%) including creation of real analytics functions replacin |
| SUPERSEDED | `DASHBOARD_TRANSFORMATION_COMPLETE_STATUS.md` | Status snapshot at 65% completion (32/49 tasks) listing all implemented features including real-time WebSocket subscript |
| history | `DASHBOARD_TRANSFORMATION_FINAL_SUMMARY.md` | End-of-session summary at 14% tasks complete (7/49) that provides complete architecture specifications for all remaining |
| SUPERSEDED | `DASHBOARD_TRANSFORMATION_TASKS.md` | Detailed task breakdown across four phases (Critical, Minimalist Redesign, Customization, Advanced) with effort estimate |
| history | `DEBUG_CARDS.md` | Troubleshooting guide for pipeline DealCardPremium.tsx addressing non-uniform card heights and broken drag-and-drop, wit |
| SUPERSEDED | `ENTERPRISE_DASHBOARD_COMPLETE_SOLUTION.md` | Architecture specification document providing complete TypeScript code examples for all 37 remaining dashboard tasks acr |
| history | `EVERYTHING_FIXED_SUMMARY.md` | Fix summary addressing 4 UI/UX issues including restoring the missing Permissions modal button on role cards, renaming S |
| history | `EVERYTHING_WORKING_GUIDE.md` | Post-fix guide confirming all 8 reported issues resolved including AI deal intelligence on every card, compact editable  |
| SUPERSEDED | `EXECUTION_STATUS.md` | Mid-sprint status showing 16 of 50 UI/UX polish tasks complete (32%) with 34 tasks remaining across layout polish, conte |
| history | `EXPLAIN_TO_ANYONE.md` | Non-technical overview of the project scale citing 98,091 lines of code, 280 components, 84 API endpoints, and revenue p |
| history | `FORMS_NOW_WORKING.md` | A fix confirmation dated October 15, 2025 resolving Next.js routing conflict (/forms/[tenant]/[slug] moved to /f/[slug]) |
| history | `LIVE_TRANSFORMATION_STATUS.md` | Mid-session status showing 5 of 15 pages transformed with number formatting, currency symbols, and UI polish applied to  |
| history | `MOBILE_OPTIMIZATION_SUMMARY.md` | Concise executive summary of the same October 14 2025 mobile optimization, confirming 3 git commits pushed, Railway auto |
| history | `NOTIFICATIONS_PHASE_0_FOUNDATION_COMPLETE.md` | Phase 0 completion report confirming database schema (4 tables, 8 functions), 28-event catalog, and research document de |
| history | `NOTIFICATIONS_SYSTEM_COMPLETE_SUMMARY.md` | Mid-build summary at 85/100 score confirming router, bell button, and drawer are working end-to-end with WebSocket deliv |
| history | `PHASE_18_COMPLETE.md` | Documents mobile optimization of treatment tag UI components including compact tag display on pipeline cards, touch-frie |
| history | `PHASE_2_COMPLETE_SUMMARY.md` | Completion record for a UI polish phase targeting nine core shadcn/ui components (Button, Input, Card, Badge, etc.) with |
| history | `PHASE_3_LAYOUT_POLISH_PLAN.md` | Pre-execution plan for UI layout polish tasks covering Dashboard, Pipeline, Deals, Contacts, Tasks, Calendar, Marketing, |
| history | `REDESIGNED_DASHBOARD_V2.md` | A design analysis and wireframe plan for redesigning the dashboard into four collapsible sections (Hero KPIs, Priorities |
| history | `RELOAD_PERSISTENCE_FIXED.md` | Documents the fix that makes pipeline and settings tab selection persist across page reloads by reading URL query params |
| history | `SETTINGS_BACKUP_STRUCTURE.md` | A backup record of the original 36-tab flat settings structure including all component imports and tab IDs, created befo |
| history | `SETTINGS_ENHANCEMENT_PLAN.md` | A safety-first analysis of the existing 31-tab settings system identifying missing fields in user profile and a proposed |
| history | `SETTINGS_ENTERPRISE_AUDIT_COMPLETE.md` | A detailed competitive audit of the settings system scoring it 85/100 and identifying three critical gaps (no gear icons |
| SUPERSEDED | `SETTINGS_EXPLAINED.md` | A plain-language explanation of six settings tabs (Profile, Team, Roles, Pipeline Settings, Deal Settings, Smart AI) wri |
| history | `SETTINGS_FILE_CHANGES.md` | A complete inventory of all 13 new files, 2 modified files, and 2 backup files created during the October 26, 2025 setti |
| history | `SETTINGS_QUICK_START.md` | A quick-start guide for the new 2-level settings navigation (7 sidebar sections, 27 tabs) with instructions for testing, |
| history | `SETTINGS_REDESIGN_COMPLETE.md` | The definitive completion report for the October 26, 2025 settings redesign that restructured 36 flat tabs into a 2-leve |
| history | `SETTINGS_REDESIGN_IMPLEMENTATION.md` | The technical implementation plan for restructuring settings from 36 horizontal tabs to 7-section 2-level navigation, sp |
| history | `SETTINGS_REDESIGN_SUCCESS.md` | A summary of the ultra-compact settings UI transformation that removed the legacy header and reduced tab height to 32px, |
| history | `SETTINGS_REDESIGN_SUMMARY.md` | A summary document covering the before/after comparison of the settings redesign (36 tabs to 7 sections/27 tabs), listin |
| SUPERSEDED | `SETTINGS_REORGANIZATION_PLAN.md` | An earlier planning document proposing the same 7-section reorganisation of 36 tabs, including a decision matrix for eac |
| history | `SETTINGS_ULTRA_COMPACT_COMPLETE.md` | Documents the batch transformation of 52+ settings files to an ultra-dense design system reducing padding by 50-67%, fon |
| history | `SETTINGS_VISUAL_TRANSFORMATION.md` | An ASCII-art before/after comparison showing the transformation from a 36-tab horizontal scroll to a 7-section sidebar w |
| history | `SPEED_AND_SLICKNESS_COMPLETE.md` | Records 50 performance and UX tasks completed including optimistic UI updates, slide-in panels, debounced search, prefet |
| SUPERSEDED | `SWITCH_TO_REDESIGNED_DASHBOARD.md` | Instructions for switching the live dashboard route to use a redesigned page from /dashboard-redesigned, inspired by Lin |
| SUPERSEDED | `TRANSFORMATION_PROGRESS.md` | Mid-execution status snapshot showing Dashboard, Deals, and Contacts pages transformed with number/currency formatting,  |
| SUPERSEDED | `UI_CLEANED_COMPLETE.md` | Completion note for settings page cleanup reducing tabs from a cluttered set to 10 functional tabs with horizontal scrol |
| SUPERSEDED | `UI_POLISH_EXECUTION_STATUS.md` | Early-phase status snapshot showing Phase 1 foundation complete at 10% progress, with component and layout phases not ye |
| SUPERSEDED | `UI_POLISH_IMPLEMENTATION_GUIDE.md` | Phased implementation plan and task breakdown for the 50-task UI polish effort, mapping Phase 1 foundation tasks to spri |
| SUPERSEDED | `UI_UX_ENTERPRISE_POLISH_COMPLETE_PLAN.md` | Initial planning document studying 8 design reference products (Linear, Stripe, Apple HIG, WCAG 2.1) and proposing a 50- |
| outdated | `INTEGRATION_AUDIT_REPORT.md` | Navigation audit from October 15, 2025 finding that Marketing Premium features exist as files but are not accessible via |
| SUPERSEDED | `PLAN.md` | High-level implementation plan for three Phase 5 workstreams: queue reliability and alerts with BullMQ dead-letter and b |
| SUPERSEDED | `RECEPTION_PLAN.md` | Layout and interaction design plan for the Phase 5 receptionist workspace featuring a hero bar, contact search with pers |
| SUPERSEDED | `phase5_reliability_ux_plan.md` | Executive overview of the three Phase 5 objectives—queue reliability guardrails, feature flag governance, and receptioni |
| ? | `DASHBOARD_FEATURES_COMPLETE_DOCUMENTATION.md` | Documentation of enterprise dashboard features including real-data revenue analytics, AI-powered insight detection, prio |
| outdated | `ENABLE_ALL_FEATURES_GUIDE.md` | Guide for enabling all 10 premium marketing feature flags by default for testing purposes, including SQL migration 65_en |
| outdated | `FEATURE_VISIBILITY_100_PERCENT_COMPLETE.md` | Status report from January 16 2025 documenting four critical visibility fixes applied (notifications bell in app bar, ne |
| ? | `HOW_TO_USE_ALL_NEW_ANALYTICS_FEATURES.md` | User guide describing 18 analytics features including drill-down click-through, comparison mode, metric dictionary at /a |
| SUPERSEDED | `tasks-queue-mode.md` | Spec adding a queue-walkthrough mode to /tasks under the 2b.36 series, showing one task at a time with inline action but |

## Audit & Analysis
*48 files — history:18, CURRENT:15, SUPERSEDED:10, outdated:5*

| Status | File | What it actually contains |
|---|---|---|
| CURRENT | `AUDIT_AND_ACTION_PLAN.md` | A comprehensive reconciling audit of two prior audits of the dental CRM codebase, cataloguing 236,165 LOC, 122 active ta |
| CURRENT | `COMPLETED_VS_PENDING_LEDGER.md` | Verified audit ledger cross-checking ~246 'complete' claims against actual code at commit 800dc80, tagging each feature  |
| CURRENT | `DOCUMENTATION_AUDIT_REPORT.md` | Audit report quantifying 1,067 documentation files (989 real project docs), recommending keeping 224 durable documents a |
| CURRENT | `DOCUMENTATION_INDEX.md` | Navigation map for all ~989 documentation files organized into 13 topic sections, each with a table of durable reference |
| CURRENT | `audit-researcher.md` | Defines the audit-researcher subagent persona and methodology for conducting read-only codebase audits of dental-crm sub |
| CURRENT | `code-reviewer.md` | Defines the code-reviewer subagent with a 13-item checklist covering critical project conventions including silent error |
| CURRENT | `00_README_AUDIT_PLAN.md` | Master audit plan document describing scope, investigation coverage, high-level tech stack inventory, and evidence file  |
| CURRENT | `07_FINDINGS_RISKS_QUESTIONS.md` | A structured risk assessment of the dental CRM with traffic-light ratings across product, data, AI, workflows, security, |
| CURRENT | `COMPLETED_VS_PENDING_LEDGER.md` | Authoritative reconciliation of ~246 completion-claiming docs against actual code at commit 800dc80, tagging each featur |
| CURRENT | `DOCUMENTATION_INDEX.md` | Navigation map for ~989 documentation files organized by topic with REF/AUDIT/TODO/DONE/NOTE/HIST tags, explicitly warni |
| CURRENT | `COMPLETE_ANALYTICS_SYSTEM.md` | Documents the completed analytics system comprising 3 dashboards (Executive, CRM, Marketing), 8 SQL views, 3 calculation |
| CURRENT | `CRITICAL_GAPS_AUDIT.md` | Honest audit admitting that while 250 UI tasks were built, critical backend functionality including actual email sending |
| CURRENT | `QUALITY_AUDIT_REPORT.md` | Honest quality audit of the Marketing-CRM integration code confirming all 13 backend services, 15 UI components, 2 API e |
| CURRENT | `MARKETING_AUDIT_COMPLETE_TASK_LIST.md` | Large foundational reference document (2366 lines, read to 1517) containing the original 247-task list with full SQL mig |
| CURRENT | `security-audit.md` | Security assessment dated January 16, 2025 for the Marketing Audit module, scoring it 9.2/10 and approving it for produc |
| history | `pre_phase_2a_audits.md` | Prompt document containing 5 audit task instructions for pre-Phase 2a work: (0) quickRouteDeal bug confirmation, (1) Pip |
| SUPERSEDED | `DENTAL_CRM_AUDIT_SUMMARY.txt` | High-level early audit summary listing critical feature gaps: Treatment management, Appointment scheduling, Patient port |
| SUPERSEDED | `DENTAL_CRM_COMPREHENSIVE_AUDIT.md` | Detailed early audit with an investment priority matrix. Lists same feature gaps as DENTAL_CRM_AUDIT_SUMMARY.txt (Treatm |
| history | `ENTERPRISE_AUDIT_FINAL_REPORT.md` | October 2025 session summary claiming 24/24 tasks completed including testing infrastructure (Playwright, Jest, MSW), ob |
| history | `ENTERPRISE_AUDIT_PLAN.md` | October 2025 4–6 week implementation plan for enterprise-grade audit covering testing infrastructure setup, high-impact  |
| history | `ENTERPRISE_AUDIT_PROGRESS.md` | October 2025 in-flight progress tracker showing 4/24 tasks (17%) complete after 10 minutes of work, with phases 2-4 at 0 |
| history | `ENTERPRISE_AUDIT_SESSION_1_COMPLETE.md` | October 2025 session closeout after 1.5 hours showing 7/24 tasks (29%) done, covering testing infrastructure, baseline E |
| SUPERSEDED | `COMPLETE_BUILD_STATUS_FINAL.md` | Status report for the Marketing Audit module showing 227 of 279 tasks complete with 52 polish and certification tasks re |
| history | `COMPLETE_PRODUCT_AUDIT_MASTER_PLAN.md` | Comprehensive audit identifying 200+ issues across 18 categories including hardcoded tenant IDs in 47 files, missing set |
| SUPERSEDED | `COMPLETE_STATUS_85_PERCENT.md` | Progress snapshot of the Marketing Audit module at 236 of 279 tasks complete (84.6%), with quality scores of 9.4/10 over |
| SUPERSEDED | `COMPLETE_SYSTEM_SUMMARY.md` | Mid-build summary of the Marketing Audit module at 49% (137/279 tasks), documenting completed foundation, backend infras |
| SUPERSEDED | `COMPLETE_TASK_SUMMARY_FINAL_ANSWER.md` | Summary answer confirming 244 of 279 tasks complete (87.5%), listing pending 35 tasks broken down by category (testing,  |
| SUPERSEDED | `COMPLETE_TASK_TRACKER.md` | Earliest task tracker for the 279-task Marketing Audit module at 17.9% completion, listing every individual task with ch |
| history | `COMPLETE_TRANSFORMATION_TASK_LIST.md` | Master execution plan listing 200 tasks across 17 phases for transforming the CRM to enterprise quality, covering hardco |
| history | `COMPLETE_UX_AUDIT_AND_FIX_PLAN.md` | UX audit identifying 75 specific problems across navigation, layouts, loading states, hardcoded tenant IDs, form validat |
| SUPERSEDED | `COMPLETION_PROGRESS_55_PERCENT.md` | Brief progress update for the Marketing Audit module at 56.6% (158/279 tasks) listing recently completed animation utili |
| history | `COMPREHENSIVE_AUDIT_REPORT.md` | Full system audit across 30 pages declaring overall health 96/100 with all core features working, two non-blocking TypeS |
| SUPERSEDED | `COMPREHENSIVE_STATUS_REPORT.md` | Status report for the Marketing Audit module at 122/279 tasks (43.7%), with Foundation, Backend, API Routes, Frontend UI |
| SUPERSEDED | `CURRENT_STATUS.md` | Brief status snapshot of the Marketing Audit module at 94/279 tasks (33.7%) with Phase 0 at 86% and Phase 1 at 54%, with |
| outdated | `PRODUCT_100_100_AUDIT.md` | Self-assessment audit claiming the dental CRM achieves 100/100 across 14 categories including UI/UX, core CRM, marketing |
| history | `COMPLETE_MARKETING_AUDIT_SPECIFICATION.md` | Shows marketing audit module at 67% complete (187/279 tasks). Describes architecture: 10 API connectors, 8 scoring engin |
| history | `MARKETING_AUDIT_BUILD_COMPLETE.md` | Mid-build status snapshot showing 85% complete (237/279 tasks). Backend 100%, API 100%, DB 100%, frontend 98%, testing 8 |
| history | `MARKETING_AUDIT_BUILD_SUMMARY.md` | Dated Jan 15 2025. First session progress snapshot at 28.3% complete (79/279 tasks). Documents 65,000+ words of document |
| history | `MARKETING_AUDIT_COMPLETE_GUIDE.md` | Mid-to-late build snapshot claiming 78.5% complete and describing all features built so far including BrightLocal integr |
| history | `MARKETING_AUDIT_COMPLETE_SUMMARY_FINAL.md` | Status snapshot showing 82.8% complete (231/279 tasks). Lists the remaining 48 tasks as non-blockers. Describes the modu |
| history | `MARKETING_AUDIT_COMPLETE_SYSTEM.md` | Status snapshot at 78.9% complete (220/279 tasks) with a comprehensive architecture section describing all system compon |
| history | `MARKETING_AUDIT_EXECUTIVE_SUMMARY.md` | Dated Jan 15 2025. Go/no-go business decision document recommending phased build of the marketing audit module. Phase 1  |
| history | `MARKETING_AUDIT_FINAL_BUILD_STATUS.md` | Final pre-100% status snapshot showing 87.5% complete (244/279 tasks). Documents what remains before the final push to c |
| outdated | `12-missing-features-comprehensive.md` | December 2024 audit of missing and partially-implemented features across multi-location, settings inheritance, invite ma |
| outdated | `FEATURE_VISIBILITY_AUDIT_COMPLETE.md` | Detailed January 16 2025 audit of feature discoverability scoring the app 72/100 and identifying 15 critical gaps includ |
| outdated | `INVESTOR_DEMO_STATUS.md` | Investor demo preparation report from October 19 2025 confirming 60 patient contacts, 120 active deals worth $300,650, a |
| outdated | `INVESTOR_MEETING_READY.md` | Demo environment preparation document from October 19 2025 confirming 33 patient contacts, 30 active deals worth $81,050 |
| history | `COMPREHENSIVE_VERIFICATION.md` | Self-review audit confirming the Marketing ↔ CRM integration is production-ready with ~6,000 lines of new integration co |

## Build History
*92 files — history:69, SUPERSEDED:11, outdated:11, CURRENT:1*

| Status | File | What it actually contains |
|---|---|---|
| CURRENT | `FINAL_250_COMPLETION.md` | Completion announcement for a 250-task build sprint delivering settings system (23 tabs), UI component library (40+ comp |
| history | `DASHBOARD_ENHANCEMENT_COMPLETE.txt` | Point-in-time operational status note confirming dashboard navigation, charts, and KPI cards were added and deployed to  |
| SUPERSEDED | `DEBUG_ONBOARDING_ISSUE.txt` | Debug instructions for investigating an onboarding redirect issue. References specific Vercel deployment URL (dental-r2a |
| history | `ENTERPRISE_AUTH_COMPLETE.txt` | Status announcement note claiming enterprise-grade authentication is complete: multi-step signup, sign-in with forgot-pa |
| history | `FINAL_DEPLOYMENT_CHECKLIST.txt` | Summary checklist confirming 580+ tasks completed across UI improvements, backend features, speed optimizations, auth re |
| SUPERSEDED | `HARD_REDIRECT_FIX.txt` | Debug note documenting a fix for the post-auth redirect bug: changed router.push('/dashboard') to window.location.href=' |
| SUPERSEDED | `ONBOARDING_DEBUG_INSTRUCTIONS.txt` | Short debug note asking developer to test the onboarding Step 1 (Practice Info) form and report console log output from  |
| SUPERSEDED | `ONBOARDING_FIX_INSTRUCTIONS.txt` | Short debug note asking developer to test the onboarding flow on localhost and report console output ('Updating tenant:' |
| history | `ONBOARDING_PAGE_REMOVED.txt` | Records the fix for the onboarding redirect problem: the old onboarding page (src/app/(auth)/onboarding/page.tsx) was de |
| history | `OPEN_SUPER_ADMIN.txt` | One-page quick-reference pointing the developer to the super admin dashboard at localhost:3001. Lists available pages (/ |
| history | `AUTOMATION_COMPLETE.md` | GitHub repository security automation report dated October 17 2025 covering CodeQL alert remediation and Dependabot vuln |
| history | `SESSION_COMPLETE_ALL_SYSTEMS_100_PERCENT.md` | Documents a single coding session that brought Settings and Notifications to 100/100 and Feature Visibility to 95/100, c |
| outdated | `100_PERCENT_COMPLETION_PLAN.md` | A planning document outlining 44 remaining tasks across 4 milestones to reach 279/279 (100%) from 235/279 (84.2%), cover |
| outdated | `100_TASKS_REMAINING.md` | Progress marker noting 179/279 tasks complete (64.2%) with 100 tasks remaining, breaking down remaining work into four p |
| outdated | `60_PERCENT_MILESTONE.md` | Progress status report at 168/279 tasks (60.2%) summarising completed core audit system, competitive intelligence, and U |
| outdated | `70_PERCENT_APPROACHING.md` | Progress marker at 189/279 tasks (67.7%) for the marketing audit system build, listing remaining 90 tasks across PDF gen |
| outdated | `70_PERCENT_MILESTONE_ACHIEVED.md` | Progress milestone at 197/279 tasks (70.6%) dated January 16, 2025, marking the marketing intelligence system as live-de |
| outdated | `75_PERCENT_MILESTONE.md` | Progress checkpoint at 211/279 tasks (75.6%) confirming full PDF generation (jsPDF), white-label branding, and webhook s |
| outdated | `80_PERCENT_APPROACHING.md` | Progress status at 218/279 (78.1%) noting 61 tasks remaining, with 27 documentation guides complete and the marketing au |
| outdated | `90_PERCENT_APPROACHING.md` | Progress status at 245/279 (87.8%) with 34 tasks remaining covering testing execution, performance optimisation, UI poli |
| outdated | `ACHIEVEMENT_REPORT_53_PERCENT.md` | Progress milestone report at 148/279 tasks confirming the backend infrastructure (10 API connectors, 8 scoring engines)  |
| history | `ALL_140_TASKS_COMPLETE.md` | Completion report dated October 13, 2025 covering 140 backend tasks including auth/onboarding flow, dashboard, user mana |
| SUPERSEDED | `ALL_250_TASKS_APPROVED.md` | Master task checklist for a 250-task transformation sprint covering removal of hardcoded values, settings overhaul, navi |
| outdated | `ALL_250_TASKS_TRACKING.md` | Tracking version of the 250-task checklist showing 50/250 (20%) complete at time of recording, with detailed tick-box st |
| history | `ALL_FIXES_VERIFIED.md` | Documents 5 specific code-level bug fixes (formatCurrencyValue naming, React hooks violation, missing import, dynamic na |
| history | `ALL_ISSUES_FIXED_SUMMARY.md` | Records 9 issues resolved on October 15 2025 including three missing route pages (contacts/new, tasks/new, deals/[id]),  |
| history | `ALL_TASKS_STATUS_COMPLETE.md` | Status report showing 246 of 279 tasks complete (88.2%) for a marketing intelligence platform, with 33 remaining tasks i |
| history | `AUDIT_AND_CHECKPOINT_COMPLETE.md` | Summary of a comprehensive system audit on October 14 2025 covering 30 pages and 200+ components, finding 0 critical bug |
| history | `BUILD_FIXES_COMPLETE.md` | Records four build errors fixed on October 27 2025: missing onboarding-fields-admin component, useShortcut wrong export, |
| history | `BUILD_FIX_SUMMARY.md` | Documents four build errors fixed after adding the treatment routing feature: a TypeScript space-in-property-name syntax |
| SUPERSEDED | `BUILD_FIX_VISUAL.txt` | ASCII-art visual companion to BUILD_FIX_SUMMARY.md showing a before/after table of the same four build errors and their  |
| history | `CHECKPOINT_SAVED.md` | Git checkpoint confirmation showing tag v1.0.0-checkpoint-2025-10-28 at commit 43e8a40 with 290 files changed and 59702  |
| history | `CHECKPOINT_V1.0.0.md` | V1.0.0 checkpoint documenting a production-ready dental CRM with 30 pages, 200+ components, 23 settings tabs, multi-tena |
| history | `COMPLETION_CERTIFICATE.txt` | Formal completion certificate declaring 390 total tasks complete (250 UI/UX + 140 backend) covering auth, email infrastr |
| SUPERSEDED | `COMPLETION_STRATEGY.md` | Execution strategy document outlining batched approach to completing 164 remaining tasks across 7 batches covering forms |
| history | `COMPLETION_SUMMARY.txt` | Formal completion announcement for all 250 tasks covering foundation hooks, 23-tab settings system, 40+ UI components, f |
| history | `COMPREHENSIVE_BUILD_ANALYSIS.md` | Quantitative analysis claiming 98,091 lines of TypeScript, 11,507 lines of SQL, 73 migrations, 84 API endpoints, 34 page |
| SUPERSEDED | `FINAL_45_TASKS_ORGANIZED.md` | Task list for the final 16% of a 279-task build sprint, covering testing execution, performance optimization, PDF system |
| SUPERSEDED | `FINAL_50_TASKS.md` | Task list for the final 18% of a 279-task build sprint at 82.1% completion, covering testing, performance, UI polish, PD |
| SUPERSEDED | `FINAL_60_TASKS_TO_COMPLETION.md` | Task list for the final 19.4% of a 279-task build sprint at 80.6% completion, adding soak test, NVDA/JAWS screen reader  |
| history | `FINAL_87_TASKS_LIST.md` | A checklist of 87 remaining tasks (from a baseline of 192/279 complete) spanning PDF system, attribution UI, content str |
| history | `FINAL_ACHIEVEMENT_REPORT.md` | Documents completion of Phase 0 (12/49 tasks) of a dashboard transformation effort dated January 15, 2025, replacing fak |
| history | `FINAL_ANSWER_TASKS.md` | A Q&A-format status document asserting 248 of 279 marketing audit module tasks are complete (88.9%), declaring the syste |
| history | `FINAL_BUILD_REPORT_80_PERCENT.md` | Milestone status report at 222/279 tasks (79.6%) for the Marketing Audit module, dated January 16, 2025, with 57 remaini |
| history | `FINAL_COMPLETION_PLAN.md` | A planning document from a mid-build checkpoint at 45.9% (128/279 tasks) outlining remaining work across four phases: fi |
| history | `FINAL_COMPLETION_TRACKING.md` | A live-tracking document at 77.4% completion (216/279 tasks) for the marketing audit module, listing 63 remaining tasks  |
| history | `FINAL_COMPREHENSIVE_ANSWER.md` | Another Q&A status document asserting 248/279 tasks complete (89%) for the marketing audit module, confirming production |
| history | `FINAL_PUSH_TO_100.md` | A motivational status document at 73.8% (206/279 tasks) listing 73 remaining tasks across PDF system, UI polish, perform |
| history | `FINAL_STATS.txt` | A completion banner/summary claiming 250 tasks complete for Dental CRM Enterprise Version 7.0, covering UI/UX, backend,  |
| history | `FINAL_STATUS_COMPREHENSIVE.md` | A mid-build status report at approximately 30% completion (75/250 tasks) of a 250-task enterprise transformation, detail |
| history | `FINAL_STATUS_COMPREHENSIVE_UPDATE.md` | A progress update at 214/279 tasks (76.7%) for the marketing audit module, confirming all core systems production-ready  |
| history | `FINAL_SUMMARY.txt` | A completion summary claiming 480 total tasks completed for Dental CRM Enterprise including 250 UI/UX tasks, 140 backend |
| history | `FINAL_TASKS_SUMMARY.md` | A mid-build checkpoint at 52.3% (146/279 tasks) detailing completed infrastructure, backend, frontend, testing, and docu |
| history | `HONEST_AUDIT_WHAT_ACTUALLY_NEEDS_BUILDING.md` | A candid gap analysis acknowledging that despite polished UI (95% complete), backend functionality is only 60% complete, |
| history | `IMMEDIATE_ACTION_PLAN.md` | Pre-meeting checklist created on October 19 2025 for testing UI screens and preparing an investor demo with seeded data  |
| history | `INFINITE_LOOP_FIX.md` | Documents a React infinite re-render bug in dashboard/page.tsx caused by immediately invoking guardedAction() inside use |
| history | `LASER_FOCUS_FINAL_TASKS.md` | Progress snapshot at 240/279 tasks complete (86%) listing the remaining 39 tasks across testing, performance, polish, PD |
| history | `LIVE_PROGRESS.md` | Intermediate progress snapshot at 119/279 tasks (42.7%) for the Marketing Audit module, listing the last 10 completed co |
| history | `MASTER_CHECKLIST_250_TASKS.md` | Comprehensive 250-task checklist for a UI/UX enterprise transformation covering foundation hooks, full settings system,  |
| history | `MILESTONE_100.md` | Milestone record at 100 of 250 tasks complete documenting finished systems: hooks, settings (23 tabs), 40+ UI components |
| history | `MILESTONE_30_PERCENT.md` | Brief milestone marker at 85/279 tasks (30.5%) declaring that all architecture, backend infrastructure, and core UI flow |
| history | `PHASE_16_COMPLETE.md` | Documents creation of six comprehensive documentation files totaling 3,150+ lines: three user guides (tag setup, pipelin |
| history | `PHASE_16_SUMMARY.md` | Executive summary of Phase 16 documentation confirming 6 guides, 3,150+ lines, 158+ estimated pages, and world-class qua |
| history | `PROGRESS_MILESTONE_60_TASKS.md` | Progress snapshot from a 250-task enterprise transformation showing 60 tasks done including useTenant() hook, settings s |
| outdated | `REALTIME_PROGRESS.md` | A mid-build status snapshot showing 81 of 250 UI improvement tasks complete (32%), with breadcrumb additions in progress |
| history | `REAL_REMAINING_TASKS.md` | A candid admission that 250 completed 'tasks' were UI improvements only, and 50 critical backend tasks (auth flow, email |
| history | `RESTORE_POINT_COMPLETE.md` | Documents a git restore operation on October 27, 2025 that reverted the codebase to the Settings Redesign Complete state |
| history | `SETUP_BANNER_FIX.md` | Documents a one-line bug fix changing the wrong prop name onSetupClick to the correct onOpenWizard in dashboard/page.tsx |
| SUPERSEDED | `TRANSFORMATION_STRATEGY.md` | Mid-build planning document outlining 5 phases covering UI improvements, data tables, analytics, performance, and securi |
| history | `VERSION.txt` | Single-file version marker recording build 1.0.1 which removed the old onboarding page and enforces dashboard redirect. |
| history | `VERSION_2_SAVED.md` | Checkpoint notification confirming the v2-hubspot-pipelines git tag was created at commit df6fa64 with 174 files and 37, |
| history | `VERSION_2_SNAPSHOT.md` | Detailed technical snapshot of Version 2 documenting all modified files, pipeline template names, database schema, smart |
| history | `VERSION_3_QUICK_REFERENCE.md` | Quick-reference card for the v3-clean-ui-enterprise git tag summarising UI changes: compact deal cards, 2-row pipeline h |
| history | `VERSION_3_SNAPSHOT.md` | Detailed technical snapshot of Version 3 documenting all UI changes including the 2-row pipeline header, 40% smaller dea |
| history | `VERSION_5_SNAPSHOT.md` | Snapshot of Version 5 which added 5 analytics dashboards (Executive, CRM, Marketing, Cohort, Predictive), 4 new DB table |
| history | `VERSION_7_COMPLETE.md` | Declares Version 7 complete with 250 tasks done, covering a 40+ component UI library, 23-tab settings system, forms/vali |
| history | `VERSION_8_1_CHECKPOINT.md` | Records Version 8.1 milestone which introduced uniform right-side slide-over panels for Contact/Task/Deal creation, fixe |
| history | `✅_ALL_COMPLETE.md` | Final status report from October 27 confirming all 7 build errors fixed including the location context SQL column bug (u |
| history | `✅_FINAL_RECOVERY_REPORT.md` | Comprehensive recovery report documenting how 104 previously uncommitted files (36 DB migrations, 20+ onboarding compone |
| history | `✅_RESTORATION_SUCCESS.md` | Documents successful revert to the Settings Redesign Complete checkpoint (Oct 26), removing ~150 multi-org/onboarding fi |
| history | `🎉_ALL_COMPONENTS_RECOVERED.md` | Second recovery session report (same day as COMPLETE_RECOVERY_SUCCESS) that specifically recovered the org-switcher comp |
| history | `🎉_COMPLETE_RECOVERY_SUCCESS.md` | First of two recovery reports from Oct 27 documenting restoration of 100+ files (36 DB migrations, 20+ onboarding wizard |
| history | `🔍_MISSING_COMPONENTS_AUDIT.md` | Audit written between the two recovery sessions identifying 4 still-missing pieces: the org-switcher component, organiza |
| history | `phase-2a-1-changes.md` | Change log for Phase 2a.1 recording schema migrations (treatment_types, practice_treatment_offerings, practice_notificat |
| history | `phase-2a-2a-changes.md` | Change log documenting the build of the canonical ingestLead() function, dedup engine, SLA resolver, dedup_review_queue  |
| history | `phase-2a-2b-changes.md` | Change log for Phase 2a.2b covering dedup queue API endpoints (list, detail, resolve with merge/create_new/dismiss), six |
| history | `phase-2a-4-changes.md` | Change log for Phase 2a.4 describing the static HTML test practice site (Bright Smile Dental), the practice onboarding r |
| history | `phase-2a-5-changes.md` | Change log documenting the removal of the legacy lead-intake stack (lead_intakes, lead_sources, auto_categorize_lead RPC |
| history | `phase-2a-7-changes.md` | Change log for Phase 2a.7 recording the addition of deal creation inside ingestLead() via a new deal-creation.ts module, |
| history | `phase-2a-8-changes.md` | Change log for Phase 2a.8 detailing the Settings → Workflow → Treatments UI, migration relaxing treatment_type_id NOT NU |
| history | `phase-2a-9-changes.md` | Change log for Phase 2a.9 closing the gap where dedup queue resolve (merge/create_new) did not produce a deal; createDea |
| history | `BUILD_VERIFICATION_COMPLETE.md` | Build verification record documenting a single import path fix (SettingsGearButton moved from @/components/layout/ to @/ |

## Third-party (deps)
*28 files — CURRENT:24, ?:4*

| Status | File | What it actually contains |
|---|---|---|
| CURRENT | `SKILL.md` | Comprehensive Supabase skill covering core principles, CLI usage, MCP server setup, schema change workflow, and an exten |
| CURRENT | `SKILL.md` | Skill manifest for a comprehensive Postgres performance optimization guide maintained by Supabase, covering 8 rule categ |
| CURRENT | `_contributing.md` | Internal contribution guide for authoring Postgres best-practice reference files, specifying formatting standards (error |
| CURRENT | `_sections.md` | Defines the 8 rule category sections for the Postgres best-practices skill, mapping filename prefixes (query-, conn-, se |
| CURRENT | `_template.md` | Template file for authoring new Postgres best-practice reference entries, showing the required frontmatter (title, impac |
| CURRENT | `advanced-full-text-search.md` | Best-practice reference showing how to replace LIKE wildcard queries with tsvector generated columns and GIN indexes for |
| CURRENT | `advanced-jsonb-indexing.md` | Best-practice reference explaining GIN indexing for JSONB containment queries and expression indexes for specific key lo |
| CURRENT | `conn-idle-timeout.md` | Best-practice reference for configuring idle_in_transaction_session_timeout (30s) and idle_session_timeout (10min) to au |
| CURRENT | `conn-limits.md` | Best-practice reference for calculating and setting max_connections based on available RAM, with the formula (RAM MB / 5 |
| CURRENT | `conn-pooling.md` | Best-practice reference explaining why connection pooling is essential (each Postgres connection uses 1-3MB RAM), with t |
| CURRENT | `conn-prepared-statements.md` | Best-practice reference explaining that named prepared statements conflict with transaction-mode connection pooling and  |
| CURRENT | `data-batch-inserts.md` | Best-practice reference showing how to replace individual INSERT statements with multi-row batches (up to ~1000 rows) or |
| CURRENT | `data-n-plus-one.md` | Best-practice reference showing how to replace per-item database loops with a single batch query using WHERE id = ANY(AR |
| CURRENT | `data-pagination.md` | Best-practice reference demonstrating that OFFSET pagination degrades on deep pages (page 10000 scans 200k rows) while c |
| CURRENT | `data-upsert.md` | Best-practice reference showing how INSERT ... ON CONFLICT DO UPDATE eliminates the race condition in SELECT-then-INSERT |
| CURRENT | `lock-advisory.md` | Best-practice reference explaining how pg_advisory_lock/pg_advisory_xact_lock provide application-level coordination wit |
| CURRENT | `lock-deadlock-prevention.md` | Best-practice reference showing that deadlocks are prevented by always acquiring row locks in a consistent order (e.g.,  |
| CURRENT | `lock-short-transactions.md` | Best-practice reference advising to perform all external API calls and validation outside transaction boundaries, holdin |
| CURRENT | `SKILL.md` | Comprehensive agent skill instruction set for Supabase covering core principles, CLI usage, MCP server setup, documentat |
| CURRENT | `skill-feedback.md` | Agent instructions for handling user-reported skill errors, directing the agent to draft a GitHub issue using the feedba |
| CURRENT | `app-verification-guide.md` | How-to guide for completing OAuth app verification with Google, Facebook, and Microsoft. Covers required screenshots, pr |
| CURRENT | `competitor-intelligence.md` | Operations runbook for Phase 6 competitor data ingestion covering CSV/CLI upload, BullMQ queue configuration, Supabase s |
| CURRENT | `phase6_competitor_intelligence_plan.md` | Implementation blueprint for Phase 6 covering competitor intelligence ingestion (CSV/scrapers/webhooks), leadership benc |
| CURRENT | `troubleshooting.md` | End-user troubleshooting guide for the Marketing Audit module covering common failure scenarios: audit not running, scor |
| ? | `feedback-issue-template.md` | A GitHub issue template with fill-in-the-blank sections (What happened, Source, Fix suggestion) for reporting bugs again |
| ? | `skill-feedback.md` | Instructions for how to collect feedback on the Supabase agent skill and file GitHub issues at supabase/agent-skills. |
| ? | `README.md` | README for a standalone React Native 0.81.0 login/signup demo app located in the AuthApp/ subdirectory. Uses AsyncStorag |
| ? | `feedback-issue-template.md` | A blank GitHub issue template used to structure user feedback reports when the Supabase agent skill provides incorrect o |
