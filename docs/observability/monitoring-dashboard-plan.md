# Phase 0 Observability Baseline

This document captures the monitoring instrumentation added in Phase 0 and how to operationalise dashboards in Grafana and PostHog.

## Metrics Emitted

- **Queue Metrics (`metric:queue:*`)**  
  - `queue=communications:dispatch` with events `active`, `completed`, `failed`  
  - Captured through BullMQ `QueueEvents`; forwarded via `trackEvent`
- **Provider Failures (`metric:provider:failure`)**  
  - Includes `provider`, `operation`, `error`
- **API Latency (`metric:api:latency`)** *(optional)*  
  - Wrapper available via `recordApiLatency` helper for routes that need fine-grained latency tracing

PostHog keys (`POSTHOG_API_KEY`, `POSTHOG_HOST`) activate automatic forwarding; when unavailable, metrics log to console if `LOG_METRICS=true`.

## Grafana Dashboard

1. **Datasource**: `Redis` via BullMQ metrics or `Prometheus` with scrape job hitting the new `/api/system/queues` endpoint.
2. **Panels**:
   - Queue Depth (active, waiting, delayed) via `GET /api/system/queues`
   - Failure Rate (BullMQ failed/total)
   - Dead-letter backlog (`communications:deadletter` job count)
3. **Alerts**:
   - `Failed Jobs > 5` within 15 minutes
   - `Deadletter backlog > 0` for >5 minutes
4. **Setup**:
   ```bash
   curl https://app.yourdomain.com/api/system/queues
   ```
   Configure Grafana JSON datasource to poll every 60 s.

## PostHog Dashboard

Create a dashboard named **“Comm Platform Health”** with the following insights:

- **Queue Throughput**: event `metric:queue:completed` (break down by `queue`)
- **Failure Drilldown**: event `metric:queue:failed` and `metric:provider:failure`
- **Latency Histogram**: event `metric:api:latency` bucketed by `route`

Custom property filters:

- `queue` – queue name
- `provider` – email/sms provider
- `operation` – `send`, `receive_webhook`

## Bull Board (Optional)

For local debugging, install `@bull-board/express` and mount the UI using the queue manager instance:

```ts
import { ExpressAdapter } from '@bull-board/express'
import { createBullBoard } from '@bull-board/api'

const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/admin/queues')

createBullBoard({
  queues: [new BullMQAdapter(queueManager.getQueue('communications:dispatch'))],
  serverAdapter,
})
```

Deploy behind admin authentication only.

## Runbooks

- **Queue Incident**: Examine `/api/system/queues`, inspect dead-letter queue payload, replay after fix. Alert automatically fires when backlog >0.
- **Provider Failures**: Filter PostHog dashboard on `metric:provider:failure`. Cross-reference `integration_logs` for context. Escalate to integrations squad if third-party outage confirmed.

## Next Steps

- Wire `recordApiLatency` into priority endpoints (authentication, communications) once baseline is stable.
- Add uptime alerts via StatusPage integration.





