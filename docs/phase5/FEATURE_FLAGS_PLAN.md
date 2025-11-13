# Feature Flag Governance Architecture

## Objectives

- Centralize flag definitions with metadata, default rollout, and override policy.
- Support tenant-level overrides and environment-specific defaults.
- Capture every toggle in an immutable audit trail.
- Expose typed APIs and UI controls with Zod validation and PostHog instrumentation.

## Data Model

- `feature_flag_registry`: master record keyed by `flag_key`, tracks name, description, category, rollout type, default state, override allowance, and metadata (e.g., `requires_verification`).
- `feature_flag_assignments`: per-tenant (or global) overrides that capture environment, enabled state, variant, rollout percentage, reason, expiry, metadata, and creator.
- `feature_flag_audit_log`: append-only history of toggles with previous/new state snapshots, context payload, actor, and timestamp.

## Access & Policies

- Service role has full CRUD for automation jobs and seed scripts.
- Tenant members can read registry, manage assignments for their tenant, and view audit entries referencing their tenant or global overrides.
- API uses `getApiRequestContext` to enforce membership and role checks (requires admin/owner).

## Runtime Resolution

1. Load registry rows.
2. Merge global overrides (`tenant_id IS NULL`) for target environment.
3. Apply tenant overrides (if allowed) to compute effective state.
4. Return normalized payload with `source`, `reason`, `variant`, and `lastAudit` metadata.

## API Contract

- `GET /api/system/feature-flags`: returns normalized flag list for active tenant.
- `POST /api/system/feature-flags`: accepts `{ flagKey, enabled|null, variant?, reason?, expiresAt?, metadata? }`; null removes override. All writes log to audit table and emit `recordMetric('api', 'feature_flag_override_*')` events.
- Schema enforced with Zod and returns detailed validation errors.

## UI Governance Tab

- Accessible under `Settings → System → Feature Flags`.
- Presents KPI tiles (active flags, tenant overrides, audit coverage).
- Category-grouped table with badges for source/default state, descriptive copy, toggle, and tooltip with last audit.
- Switch disables when overrides not allowed or mutation pending.

## Analytics & Telemetry

- Metric events help PostHog dashboards visualize adoption and churn.
- Audit tooltip includes reason + timestamp for operators.
- Future enhancement: add per-flag evaluation counters via `recordMetric('feature_flag', ...)` inline in code paths.
