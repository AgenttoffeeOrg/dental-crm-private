# Phase 0 Schema Foundations – Sales Intelligence Layer

This document outlines the database artifacts introduced in the `20251107_phase0_sales_intelligence.sql` migration. It is intended as a companion reference for engineering, analytics, and data science teams.

## Overview

- Conversational tracking primitives (`conversation_sessions`, `conversation_messages`, `conversation_state_events`, `conversation_state_transitions`)
- Psychological profiling (`contact_psych_profiles`, `contact_psych_profile_history`)
- Sales script catalog and experimentation (`sales_scripts`, `sales_script_versions`, `sales_script_tests`, `sales_script_metrics`, `sales_script_test_variants`)
- Outcome attribution and receptionist feedback (`conversion_attributions`, `receptionist_feedback`)
- Competitor intelligence (`competitors`, `competitor_price_points`, `competitor_touchpoints`)
- Backfills to populate `location_id` across `tasks`, `deals`, `activities`

All new tables are tenant-scoped with Row-Level Security (RLS) policies enforcing `tenant_id = auth.get_user_org_id()` and respecting location access where applicable.

## Table Reference

| Table | Purpose | Key Columns | Notes |
| --- | --- | --- | --- |
| `sales_scripts` | Playbook catalog | `persona`, `stage_id`, `metadata` | Soft delete via `deleted_at` |
| `sales_script_versions` | Versioned script content | `version_number`, `tone`, `target_persona`, `usage_count`, `positive_outcome_count`, `total_revenue_cents` | Unique `(script_id, version_number)` |
| `sales_script_tests` | AB tests / experiments | `status`, `primary_metric` | Supports lifecycle states |
| `sales_script_metrics` | Daily aggregates | `metric_date`, `usage`, `revenue` | Unique `(script_version_id, metric_date)` |
| `sales_script_usages` | Real-time usage log | `helpful`, `persona_snapshot`, `context` | Trigger refresh keeps version stats in sync |
| `conversation_outcomes` | Post-usage results | `outcome_type`, `revenue_cents`, `notes` | Extends attribution + learning loop data |
| `sales_script_test_variants` | Mapping test ⇔ version | `allocation_weight` | Enforces unique variant per test |
| `conversation_sessions` | Root session entity | `channel`, `direction`, `status` | Links contacts, deals, locations |
| `conversation_messages` | Transcript & notes | `message_type`, `content_json`, `sentiment` | Supports linkage to script versions |
| `conversation_state_events` | State machine events | `event_type`, `trigger_source`, `confidence` | Captures automations & AI transitions |
| `conversation_state_transitions` | Derived transitions | `from_state`, `to_state`, `probability` | Append-only history |
| `receptionist_feedback` | Front-desk reviews | `agent_user_id`, `score`, `insights` | Supports optional attachments |
| `contact_psych_profiles` | Active persona model | `dominant_trait`, `confidence_score` | Nullable `contact_id` for future linking |
| `contact_psych_profile_history` | Historical snapshots | `source`, `analysis_notes` | Uses `profile_id` foreign key |
| `conversion_attributions` | Multi-touch attribution | `attribution_model`, `weight` | Links to `activities` & `deals` |
| `competitors` | Competitor registry | `category`, `region`, `metadata` | Soft delete via `archived_at` |
| `competitor_price_points` | Pricing intel | `treatment_category`, `price_cents` | Optional `source_url` |
| `competitor_touchpoints` | Competitive encounters | `touchpoint_type`, `notes` | Links deals/contacts |

## Row-Level Security

All tables enable RLS with policies that:

1. Enforce tenant isolation (`tenant_id = auth.get_user_org_id()`).
2. Restrict location-scoped tables (`conversation_sessions`, `conversation_messages`, `receptionist_feedback`) to users with access via `get_user_accessible_locations`.
3. Validate foreign keys belong to same tenant in `WITH CHECK` clauses.

Refer to the migration for individual policy definitions and helper functions.

## Backfills & Data Integrity

- `tasks.location_id`, `deals.location_id`, and `activities.location_id` are backfilled from deal/contact relationships.
- Post-backfill notices report remaining counts to aid manual verification.
- `conversation_state_transitions` is populated via PL/pgSQL function `conversation_state_transition_sync()` to maintain derived transitions.

## Down Migration

Dropping the migration rolls back in reverse dependency order, ensuring all new tables and indices are removed cleanly.

## Verification Checklist

- [ ] `supabase db reset` (or staging deploy) applies migration without error.
- [ ] Application health checks confirm new tables accessible via Supabase client.
- [ ] Post-deploy run `SELECT table_name FROM information_schema.tables` filter ensures 15 new tables exist.
- [ ] Validate RLS: attempt cross-tenant read should fail (use Supabase impersonation script).
- [ ] Confirm location backfill counts are near-zero; investigate exceptions.

## Next Steps

- Generate TypeScript types with `supabase gen types typescript --local` (include new tables).
- Wire `conversation_sessions` and related tables into realtime pipeline once Phase 3 begins.
- Extend analytics jobs to populate `sales_script_metrics` nightly.
- `sales_script_usages` & `conversation_outcomes` feed the script recommendation service; keep the trigger function `recompute_sales_script_version_stats` intact when adjusting schema.

