# Security, Privacy & Compliance

## AuthN / AuthZ Model
- **Supabase Auth:** Middleware checks Supabase session, redirects unauthenticated users to sign-in, and enforces organisation setup before dashboard access.
- **Session Sync:** React `AuthProvider` syncs Supabase session to server, refreshes app_user record, and supports sign-in/out helpers; server/service clients use environment keys with explicit guards.
- **Multi-Tenant RLS:** `public.get_current_user_tenant_id()` resolves tenant membership strictly (active tenant → membership fallback). Core tables enforce `tenant_id = current` and `user_has_location_access_rls` to scope location-bound data.
- **Role Matrix:** Permission utilities define owner/manager/staff/viewer abilities for deals, contacts, pipelines, tasks, users, settings, and analytics, returning errors for disallowed actions.

## Secrets & Encryption
- **Environment Controls:** `.env` sample enumerates API keys (Google, BrightLocal, Semrush, Twilio, Stripe, Resend) and feature toggles; defaults disable outbound comms/billing until configured.
- **Supabase Config:** Auth config enforces JWT expiry (3600s), refresh token rotation, confirmation options, and local HTTPS origins; storage limits set to 50 MiB.
- **Server Clients:** `createServiceClient` requires `SUPABASE_SERVICE_ROLE_KEY`; `createServerSupabaseClient` isolates cookies; `openai-client` lazily initialises only when API key present.
- **PII Redaction:** Logger redacts emails, tokens, and sensitive fields before logging; security utilities sanitize HTML/input and partially mask emails when redacting nested objects.

## Audit & Logging
- **Audit Table:** `audits` table stores per-tenant action details (before/after JSON, entity type, severity) with timestamps and indexes.
- **Automation Governance:** Approval flows notify reviewers, log events, and restrict publish/rollback actions; consent audits and rate limit updates write records for compliance review.
- **DSR Tombstones:** Erasure function writes tombstone entries and audit events capturing legal basis, PII fields erased, and related records redacted.

## Privacy & Compliance Posture
- **DSR Support:** `erase_contact_pii` anonymizes contact fields, redacts notes/transcripts, marks files for deletion, updates DSR requests, and emits audit events; `export_contact_data` packages contact data for access/portability.
- **Soft Deletes & Consent:** Soft-delete migration adds `deleted_at` across entities with `is_not_deleted` safeguards; contacts store marketing/email/SMS consent booleans and clinical data requiring protection.
- **Feature Flags & Safety:** Treatment routing and marketing modules default off; consent checks enforced before email/SMS/WhatsApp automations execute.

## Backups & Disaster Recovery
- **Backup Policies:** Tenants configure frequency, retention, compression, notification, and point-in-time options; RLS restricts access.
- **Backup Records:** `create_backup` logs table counts, verification, expiry, and updates policies with next run; restore requests track approvals, progress, and audit logs.
- **Cleanup & Monitoring:** Functions mark expired backups and raise notices; audit events log backup/restore operations.

## Evidence
- src/middleware.ts:1-70
- src/lib/auth.tsx:27-187
- src/lib/supabase-server.ts:5-62
- supabase/migrations/20251027_001_strict_rls_auth_function.sql:30-167
- src/lib/permissions.ts:1-195
- env.example:7-84
- supabase/config.toml:5-125
- src/lib/logger.ts:8-18
- src/lib/security.ts:6-175
- src/lib/openai-client.ts:16-35
- supabase/sql/01_initial_schema.sql:124-147
- src/lib/automations/automation-governance.ts:21-399
- supabase/migrations/20251016_hardening_012_privacy_dsr.sql:150-375
- supabase/migrations/20251016_hardening_002_soft_delete.sql:15-125
- supabase/migrations/20251016_hardening_001_helpers.sql:93-118
- supabase/migrations/20251025_013_backup_recovery.sql:19-256




