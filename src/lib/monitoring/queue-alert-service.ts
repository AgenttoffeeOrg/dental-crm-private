import { queueManager } from '@/lib/queues/queue-manager'
import { createServiceClient } from '@/lib/supabase-server'
import type {
  QueueAlertRule,
  QueueHealthIncident,
} from '@/types/database'

interface QueueSnapshot {
  name: string
  counts: Record<string, number>
  oldestWaitingAgeSeconds: number | null
  oldestDelayedAgeSeconds: number | null
  workers: {
    id: string
    name?: string
    addr?: string
    age?: number
    idle?: boolean
  }[]
}

interface BreachDescriptor {
  metric: 'waiting' | 'delayed' | 'failed' | 'oldest_waiting'
  actual: number
  threshold: number
  description: string
}

export interface QueueAlertResult {
  ruleId?: string
  queueName: string
  status: 'healthy' | 'breached' | 'resolved'
  severity: 'info' | 'warning' | 'critical'
  breaches: BreachDescriptor[]
  snapshot: QueueSnapshot
  incident?: QueueHealthIncident
}

export async function collectQueueSnapshots(queueNames: string[]) {
  if (!queueManager.isEnabled()) {
    return {}
  }

  const results: Record<string, QueueSnapshot> = {}
  for (const queueName of queueNames) {
    try {
      results[queueName] = await queueManager.getQueueSnapshot(queueName)
    } catch (error) {
      console.error('[queue-alerts] Failed to gather snapshot', { queueName, error })
    }
  }
  return results
}

export async function evaluateQueueRule(
  rule: QueueAlertRule,
  snapshot: QueueSnapshot,
  options?: {
    existingIncident?: QueueHealthIncident | null
  }
): Promise<QueueAlertResult> {
  const breaches: BreachDescriptor[] = []
  const waitingCount = snapshot.counts.waiting ?? snapshot.counts.waitingCount ?? 0
  const delayedCount = snapshot.counts.delayed ?? snapshot.counts.delayedCount ?? 0
  const failedCount = snapshot.counts.failed ?? snapshot.counts.failedCount ?? 0

  if (rule.max_waiting_jobs != null && waitingCount > rule.max_waiting_jobs) {
    breaches.push({
      metric: 'waiting',
      actual: waitingCount,
      threshold: rule.max_waiting_jobs,
      description: `Waiting jobs ${waitingCount} exceeded ${rule.max_waiting_jobs}`,
    })
  }

  if (rule.max_delayed_jobs != null && delayedCount > rule.max_delayed_jobs) {
    breaches.push({
      metric: 'delayed',
      actual: delayedCount,
      threshold: rule.max_delayed_jobs,
      description: `Delayed jobs ${delayedCount} exceeded ${rule.max_delayed_jobs}`,
    })
  }

  if (rule.max_failed_jobs != null && failedCount > rule.max_failed_jobs) {
    breaches.push({
      metric: 'failed',
      actual: failedCount,
      threshold: rule.max_failed_jobs,
      description: `Failed jobs ${failedCount} exceeded ${rule.max_failed_jobs}`,
    })
  }

  if (
    rule.max_oldest_job_seconds != null &&
    snapshot.oldestWaitingAgeSeconds != null &&
    snapshot.oldestWaitingAgeSeconds > rule.max_oldest_job_seconds
  ) {
    breaches.push({
      metric: 'oldest_waiting',
      actual: snapshot.oldestWaitingAgeSeconds,
      threshold: rule.max_oldest_job_seconds,
      description: `Oldest waiting job age ${snapshot.oldestWaitingAgeSeconds}s exceeded ${rule.max_oldest_job_seconds}s`,
    })
  }

  const supabase = createServiceClient()
  const existingIncident = options?.existingIncident ?? null
  const nowIso = new Date().toISOString()

  if (breaches.length === 0) {
    if (existingIncident && existingIncident.status !== 'resolved') {
      await supabase
        .from('queue_health_incidents')
        .update({
          status: 'resolved',
          resolved_at: nowIso,
          updated_at: nowIso,
          metrics: {
            snapshot,
            resolved: true,
          },
        })
        .eq('id', existingIncident.id)
    }

    return {
      ruleId: rule.id,
      queueName: snapshot.name,
      status: existingIncident ? 'resolved' : 'healthy',
      severity: 'info',
      breaches: [],
      snapshot,
      incident: existingIncident
        ? {
            ...existingIncident,
            status: 'resolved',
            resolved_at: nowIso,
            metrics: {
              snapshot,
              resolved: true,
            },
          }
        : undefined,
    }
  }

  const severity: 'warning' | 'critical' =
    breaches.some((breach) => breach.metric === 'failed' || breach.metric === 'oldest_waiting')
      ? 'critical'
      : 'warning'

  let incident: QueueHealthIncident | undefined = existingIncident ?? undefined

  if (existingIncident) {
    const { data, error } = await supabase
      .from('queue_health_incidents')
      .update({
        status: 'open',
        updated_at: nowIso,
        metrics: {
          snapshot,
          breaches,
        },
      })
      .eq('id', existingIncident.id)
      .select('*')
      .single()

    if (!error && data) {
      incident = data as QueueHealthIncident
    } else {
      console.error('[queue-alerts] Failed to update incident', { error, incidentId: existingIncident.id })
    }
  } else {
    const payload = {
      rule_id: rule.id,
      tenant_id: rule.tenant_id ?? null,
      queue_name: snapshot.name,
      incident_type: 'threshold_exceeded',
      severity,
      status: 'open',
      metrics: {
        snapshot,
        breaches,
      },
      detected_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    }

    const { data, error } = await supabase.from('queue_health_incidents').insert(payload).select('*').single()

    if (error) {
      console.error('[queue-alerts] Failed to create incident', { error, ruleId: rule.id })
    } else if (data) {
      incident = data as QueueHealthIncident
    }
  }

  return {
    ruleId: rule.id,
    queueName: snapshot.name,
    status: 'breached',
    severity,
    breaches,
    snapshot,
    incident,
  }
}







