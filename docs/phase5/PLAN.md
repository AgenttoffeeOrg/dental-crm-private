# Phase 5 Implementation Plan

## Queue Reliability & Alerts

- Add Supabase tables `queue_alert_rules`, `queue_incidents`, and `queue_dead_letter_jobs`.
- Create APIs under `/api/system/queues` for snapshots, alert evaluation, and dead-letter replay/archive.
- Extend BullMQ manager to publish heartbeat metrics and register dead-letter actions.
- Build operator UI module showing queue depth, alerts, worker heartbeat, and DLQ management.
- Implement a scheduled backup verification script that persists outcomes in Supabase.

## Feature Flag Governance

- Introduce Supabase tables for `feature_flags`, `feature_flag_overrides`, and `feature_flag_audit_log`.
- Provide service-layer helpers to resolve flag values with tenant overrides and environment defaults.
- Expose secure API routes and admin UI for flag management.
- Emit analytics events when flags are evaluated and toggled.
- Enforce input validation with Zod schemas and tenant membership checks.

## Receptionist Workspace Polish

- Audit the existing receptionist experience and document pain points.
- Redesign layout with unified comms panel, persona badges, alert banners, and a feature-flag insights widget.
- Ensure consistent badges, skeletons, empty states, and spacing across the workspace.
- Integrate queue alerts and flag states into the receptionist view.
- Execute regression tests for core receptionist workflows (calling, messaging, task handoff).
