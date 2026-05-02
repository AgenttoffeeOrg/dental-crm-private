# Phase 5 Feature Flag Governance QA Notes

Date: 2025-11-11

## Coverage
- Confirmed migration `20251113_phase5_feature_flags.sql` provisions registry, assignment, and audit tables with appropriate RLS policies.
- Reviewed service helper `src/lib/services/feature-flags.ts` for normalized resolution order (registry → global override → tenant override) and audit lookup.
- API route `/api/system/feature-flags` uses `getApiRequestContext`, validates inputs via Zod, enforces membership roles, writes audit entries, and records PostHog metrics via `recordMetric`.
- `FeatureFlagsGovernanceTab` surfaces KPIs, grouped tables, toggle controls with disabled state when overrides disallowed, and last-audit tooltips.
- Client hook `useFeatureFlags` still operates for legacy marketing feature gates; governance layer coexists without regression.

## Smoke Checklist
1. Load Settings → System → Feature Flags → observe KPI tiles and grouped table.
2. Toggle a flag → request succeeds, toast confirmation, switch state updates, audit tooltip shows recent change.
3. Send `POST /api/system/feature-flags` with `{ enabled: null }` → override removed, audit entry writes `deleted` action.
4. Validate RLS by attempting toggle as non-admin → API returns 403 via `getApiRequestContext` guard.
5. In PostHog or console (with `LOG_METRICS=true`), verify `metric:api:feature_flag_override_*` events emit for toggles.

## Follow-ups
- Add bulk edit support (multi-select toggles) in UI.
- Surface variant selector for multivariate flags when `rollout_type !== 'boolean'.`






