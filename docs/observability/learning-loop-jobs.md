# Learning Loop Jobs

Phase 2 introduces a nightly learning loop that recalculates script performance and conversion intelligence metrics.

## What Runs

- **Daily Script Metrics**: Aggregates usage, win counts, and revenue for each `sales_script_version` and upserts into `sales_script_metrics`.
- **Persona Signals**: Persona insights are available on-demand via the psychological analyzer and surface in the conversion intelligence dashboard.

## Execution

- **Queue**: `analytics:learning-loop` (BullMQ). Enable with `QUEUE_ANALYTICS=true`.
- **Worker**: Start with `npm run workers:analytics`.
- **Manual Trigger**:

  ```bash
  curl -X POST https://app.example.com/api/system/analytics/recompute \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{"tenantId":"<tenant-id>","mode":"sync"}'
  ```

  - `targetDate` (ISO string) defaults to yesterday.
  - `mode` defaults to `async`. Use `sync` for immediate recompute (e.g., in tests).

## Scheduling

Use your scheduler (e.g., Supabase Scheduled Functions or external cron) to enqueue a blank job nightly:

```bash
curl -X POST https://app.example.com/api/system/analytics/recompute \
  -H "Authorization: Bearer service_token" \
  -H "Content-Type: application/json" \
  -d '{"mode":"async"}'
```

Without queue support the endpoint runs synchronously, making it safe for local environments.
