# Feature Flag Governance Playbook

## Overview

Phase 5 introduces a database-backed feature flag registry with tenant overrides, audit history, and usage telemetry. Operations teams can manage rollouts directly from **Settings → System → Feature Flags** without making code changes.

## Components

- **Registry (`feature_flag_registry`)**  
  Authoritative list of flags, metadata, default state, and rollout category.

- **Assignments (`feature_flag_assignments`)**  
  Per-tenant overrides with optional variants, expiry timestamps, and supporting metadata.

- **Audit Log (`feature_flag_audit_log`)**  
  Every toggle and deletion is captured with actor, timestamp, and context.

- **Governance UI**  
  Accessible to tenant administrators. Provides status badges, toggle controls, and last-audit tooltips.

- **API**  
  `/api/system/feature-flags` supports `GET` (normalized state) and `POST` (upsert/remove overrides). All writes emit a metric event: `api:feature_flag_override_*`.

## Workflow

1. **Create flag**  
   Insert into `feature_flag_registry` (or add via future admin console) with sensible defaults, metadata, and rollout notes.

2. **Tenant rollout**  
   Use the Feature Flags tab to enable/disable per tenant. Optional reason text is saved alongside the audit entry.

3. **Monitoring**  
   - Dashboard surfacing: the governance UI highlights enabled counts, override counts, and audit coverage.  
   - PostHog/metrics: `recordMetric('api', ...)` events allow dashboards to track toggles over time.

4. **Cleanup**  
   Remove overrides by toggling a flag “off” using the context menu (the API treats `enabled: null` as a delete).

## CLI & Automation

Programmatic toggles can be executed with a service-role token:

```bash
curl -X POST https://your-app.com/api/system/feature-flags \
  -H "Authorization: Bearer $SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
        "flagKey": "live_coach_console",
        "enabled": true,
        "reason": "Pilot launch for UK clinics"
      }'
```

## Notes

- Flags fall back in this order: tenant override → global override → registry default.  
- The UI disables toggles for flags marked `allow_tenant_override = false`.  
- Script usage analytics and persona insights reference these flags for conditional rendering (see `LiveCoachPanel` on the dashboard).





