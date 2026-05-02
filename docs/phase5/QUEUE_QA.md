# Phase 5 Queue Reliability QA Notes

Date: 2025-11-11

## Coverage
- Verified Supabase migration `20251113_phase5_reliability.sql` defines `queue_alert_rules`, `queue_health_incidents`, and `backup_verification_runs` with RLS policies for service role and tenant readers.
- Confirmed BullMQ dead-letter integration in `queue-manager.ts` publishes failures into per-queue DLQ and exposes `getQueueSnapshot` helpers.
- API surface documented via `/api/system/queues/alerts` (snapshots + evaluations) and `/api/system/queues/deadletter` (list/replay/discard) with admin guard.
- UI entry: `SystemReliabilityTab` reachable from `Settings → System → Reliability`, rendering queue metrics, DLQ controls, and backup verification table.
- Runbook script `scripts/run-backup-verification.ts` persists pass/fail rows into `backup_verification_runs`.

## Smoke Checklist
1. With Redis enabled, hit `/api/system/queues/alerts` → receive `enabled: true`, queue snapshots, and latest backup runs.
2. Trigger a BullMQ job failure → verify DLQ queue receives payload, `/api/system/queues/deadletter?queue=communications` lists job, replay path enqueues back into source queue.
3. Toggle `LOG_METRICS=true` and observe `metric:queue` console entries for worker state transitions.
4. Run `npm run runbooks:backup-verify` with Supabase credentials → new row appears in `backup_verification_runs` and UI lists it.
5. Create alert rule row via SQL → breach evaluation generates incident row and highlights warning/critical badge in reliability card.

## Follow-ups
- Future: add UI CRUD for alert rules (currently seeded via SQL) and webhook integration for notifying PagerDuty.






