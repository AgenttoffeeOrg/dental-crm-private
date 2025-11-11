import { trackEvent } from '@/lib/posthog'

type MetricType = 'queue' | 'api' | 'provider'

interface MetricPayload {
  [key: string]: any
}

export function recordMetric(type: MetricType, name: string, payload: MetricPayload = {}) {
  if (process.env.NODE_ENV !== 'production' && !process.env.POSTHOG_API_KEY) {
    if (process.env.LOG_METRICS === 'true') {
      console.log('[Metric]', { type, name, payload })
    }
    return
  }

  trackEvent(`metric:${type}:${name}`, payload)
}

export function recordApiLatency(route: string, method: string, durationMs: number, status: number) {
  recordMetric('api', 'latency', {
    route,
    method,
    durationMs,
    status,
  })
}

export function recordProviderFailure(provider: string, operation: string, error: string) {
  recordMetric('provider', 'failure', {
    provider,
    operation,
    error,
  })
}

export function trackQueueMetric(queue: string, event: string, payload: MetricPayload = {}) {
  recordMetric('queue', event, {
    queue,
    ...payload,
  })
}

