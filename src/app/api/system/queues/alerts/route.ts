import { NextResponse } from 'next/server'

import { queueManager } from '@/lib/queues/queue-manager'
import {
  registerCommunicationQueue,
  COMMUNICATION_QUEUE_NAME,
} from '@/lib/queues/communication-queue'
import {
  registerEngagementQueue,
  ENGAGEMENT_QUEUE_NAME,
} from '@/lib/queues/engagement-queue'
import { createServiceClient } from '@/lib/supabase-server'
import {
  collectQueueSnapshots,
  evaluateQueueRule,
  QueueAlertResult,
} from '@/lib/monitoring/queue-alert-service'

const DEFAULT_MONITORED_QUEUES = [COMMUNICATION_QUEUE_NAME, ENGAGEMENT_QUEUE_NAME]

if (queueManager.isEnabled()) {
  registerCommunicationQueue()
  registerEngagementQueue()
}

export async function GET() {
  if (!queueManager.isEnabled()) {
    return NextResponse.json(
      {
        enabled: false,
        message: 'Redis not configured; queue alerts disabled',
      },
      { status: 200 }
    )
  }

  const supabase = createServiceClient()

  const { data: rulesData, error: rulesError } = await supabase
    .from('queue_alert_rules')
    .select('*')
    .eq('enabled', true)

  if (rulesError) {
    console.error('[queue-alerts] Failed to load rules', rulesError)
    return NextResponse.json(
      { error: 'Failed to load alert rules' },
      { status: 500 }
    )
  }

  const rules = rulesData || []

  const queueNames = Array.from(
    new Set<string>([...DEFAULT_MONITORED_QUEUES, ...rules.map((rule) => rule.queue_name)])
  )

  const snapshots = await collectQueueSnapshots(queueNames)

  const [{ data: incidentsData }, { data: backupRunsData }] = await Promise.all([
    supabase
      .from('queue_health_incidents')
      .select('*')
      .in('queue_name', queueNames)
      .in('status', ['open', 'acknowledged']),
    supabase
      .from('backup_verification_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(5),
  ])

  const incidentByRule = new Map<string, any>()

  if (incidentsData) {
    for (const incident of incidentsData) {
      const key = incident.rule_id || `queue:${incident.queue_name}`
      const existing = incidentByRule.get(key)
      if (!existing) {
        incidentByRule.set(key, incident)
      } else if (new Date(incident.detected_at).getTime() > new Date(existing.detected_at).getTime()) {
        incidentByRule.set(key, incident)
      }
    }
  }

  const evaluations: QueueAlertResult[] = []

  for (const rule of rules) {
    const snapshot = snapshots[rule.queue_name]
    if (!snapshot) {
      continue
    }
    const incidentKey = rule.id || `queue:${rule.queue_name}`
    const evaluation = await evaluateQueueRule(rule, snapshot, {
      existingIncident: incidentByRule.get(incidentKey) || null,
    })
    evaluations.push(evaluation)
  }

  const response = {
    enabled: true,
    queues: queueNames.map((queueName) => {
      const queueSnapshot = snapshots[queueName] ?? null
      const queueIncidents = (incidentsData || []).filter(
        (incident) => incident.queue_name === queueName && incident.status !== 'resolved'
      )
      const queueEvaluations = evaluations.filter((evaluation) => evaluation.queueName === queueName)
      const severity = queueEvaluations.some((evaluation) => evaluation.severity === 'critical')
        ? 'critical'
        : queueEvaluations.some((evaluation) => evaluation.severity === 'warning')
        ? 'warning'
        : 'info'

      return {
        name: queueName,
        snapshot: queueSnapshot,
        severity,
        evaluations: queueEvaluations,
        incidents: queueIncidents,
      }
    }),
    evaluations,
    incidents: incidentsData || [],
    backupRuns: backupRunsData || [],
  }

  return NextResponse.json(response, { status: 200 })
}


