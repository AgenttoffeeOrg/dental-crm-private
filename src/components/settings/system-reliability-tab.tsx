'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Activity, AlertTriangle, Loader2, RefreshCcw, Repeat2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Severity = 'info' | 'warning' | 'critical'

interface QueueSnapshot {
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

interface QueueEvaluation {
  status: 'healthy' | 'breached' | 'resolved'
  severity: Severity
  breaches: {
    metric: string
    description: string
    actual: number
    threshold: number
  }[]
}

interface QueueSummary {
  name: string
  snapshot: QueueSnapshot | null
  severity: Severity
  evaluations: QueueEvaluation[]
  incidents: any[]
}

interface DeadLetterJob {
  id: string
  name: string
  data: {
    failedQueue?: string
    payload?: any
    attemptsMade?: number
    failedReason?: string
    timestamp?: number
  }
  failedReason?: string
  attemptsMade?: number
  timestamp?: number
}

interface BackupRun {
  id: string
  status: 'pass' | 'fail' | 'skipped'
  environment: string
  started_at: string
  completed_at?: string | null
  duration_ms?: number | null
  details: Record<string, any>
  log_url?: string | null
}

interface AlertsResponse {
  queues: QueueSummary[]
  backupRuns: BackupRun[]
  incidents: any[]
  evaluations: QueueEvaluation[]
}

const DLQ_OPTIONS: { key: 'communications' | 'engagement'; label: string }[] = [
  { key: 'communications', label: 'Communications' },
  { key: 'engagement', label: 'Engagement Campaigns' },
]

export function SystemReliabilityTab() {
  const [loading, setLoading] = useState(true)
  const [queues, setQueues] = useState<QueueSummary[]>([])
  const [backupRuns, setBackupRuns] = useState<BackupRun[]>([])
  const [selectedDlq, setSelectedDlq] = useState<'communications' | 'engagement'>('communications')
  const [deadLetterJobs, setDeadLetterJobs] = useState<DeadLetterJob[]>([])
  const [deadLetterLoading, setDeadLetterLoading] = useState(false)

  const incidentCounts = useMemo(() => {
    const critical = queues.filter((queue) => queue.severity === 'critical').length
    const warnings = queues.filter((queue) => queue.severity === 'warning').length
    return { critical, warnings }
  }, [queues])

  const loadReliability = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/system/queues/alerts', { credentials: 'include' })
      if (!response.ok) {
        throw new Error(await response.text())
      }
      const data = (await response.json()) as AlertsResponse
      setQueues(data.queues || [])
      setBackupRuns(data.backupRuns || [])
    } catch (error) {
      console.error('[Reliability] failed to load', error)
      toast.error('Failed to load reliability metrics')
    } finally {
      setLoading(false)
    }
  }

  const loadDeadLetter = async (queueKey: 'communications' | 'engagement') => {
    try {
      setDeadLetterLoading(true)
      const response = await fetch(`/api/system/queues/deadletter?queue=${queueKey}`, {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(await response.text())
      }
      const data = await response.json()
      setDeadLetterJobs(data.jobs || [])
    } catch (error) {
      console.error('[Reliability] failed to load dead letter queue', error)
      toast.error('Failed to load dead-letter queue')
    } finally {
      setDeadLetterLoading(false)
    }
  }

  const handleDeadLetterAction = async (
    action: 'replay' | 'discard',
    job: DeadLetterJob,
    queueKey: 'communications' | 'engagement'
  ) => {
    try {
      const response = await fetch('/api/system/queues/deadletter', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          jobId: job.id,
          queue: queueKey,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody?.error || 'Failed to update dead-letter job')
      }

      toast.success(
        action === 'replay'
          ? 'Job re-queued successfully'
          : 'Job archived from dead-letter queue'
      )
      loadDeadLetter(queueKey)
    } catch (error) {
      console.error('[Reliability] dead-letter action failed', error)
      toast.error('Dead-letter operation failed')
    }
  }

  useEffect(() => {
    loadReliability()
  }, [])

  useEffect(() => {
    loadDeadLetter(selectedDlq)
  }, [selectedDlq])

  const severityBadge = (severity: Severity) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-100 text-red-700">Critical</Badge>
      case 'warning':
        return <Badge className="bg-amber-100 text-amber-700">Warning</Badge>
      default:
        return <Badge className="bg-emerald-100 text-emerald-700">Healthy</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          Loading reliability metrics…
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-emerald-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Queue Health & Worker Status</CardTitle>
            <CardDescription>
              Monitor BullMQ queues, worker heartbeats, and threshold incidents in real-time.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadReliability} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">Queues Monitored</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{queues.length}</p>
            <p className="mt-1 text-xs text-gray-500">communications, engagement</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">Critical Incidents</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{incidentCounts.critical}</p>
            <p className="mt-1 text-xs text-gray-500">threshold breaches requiring attention</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">Warnings</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{incidentCounts.warnings}</p>
            <p className="mt-1 text-xs text-gray-500">queues approaching thresholds</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {queues.map((queue) => {
          const counts = queue.snapshot?.counts || {}
          return (
            <Card key={queue.name} className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base capitalize">{queue.name.replace(':', ' · ')}</CardTitle>
                  <CardDescription>
                    Workers:{' '}
                    {queue.snapshot?.workers?.length ?? 0}{' '}
                    · Oldest waiting{' '}
                    {queue.snapshot?.oldestWaitingAgeSeconds != null
                      ? `${queue.snapshot.oldestWaitingAgeSeconds}s`
                      : '—'}
                  </CardDescription>
                </div>
                {severityBadge(queue.severity)}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <MetricTile label="Waiting" value={counts.waiting || 0} />
                  <MetricTile label="Delayed" value={counts.delayed || 0} />
                  <MetricTile label="Active" value={counts.active || 0} />
                  <MetricTile label="Failed" value={counts.failed || 0} />
                </div>

                {queue.evaluations
                  .filter((evaluation) => evaluation.status !== 'healthy' && evaluation.breaches.length)
                  .map((evaluation, index) => (
                    <div
                      key={`${queue.name}-breach-${index}`}
                      className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800"
                    >
                      <p className="mb-1 font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Threshold breach detected
                      </p>
                      <ul className="space-y-1">
                        {evaluation.breaches.map((breach, idx) => (
                          <li key={idx} className="flex justify-between gap-4">
                            <span>{breach.description}</span>
                            <span className="font-medium text-amber-900">
                              {breach.actual} / {breach.threshold}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                {queue.incidents.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50/70 p-3 text-xs text-red-800">
                    <p className="mb-1 font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Open incidents
                    </p>
                    <ul className="space-y-1">
                      {queue.incidents.map((incident) => (
                        <li key={incident.id} className="flex justify-between gap-4">
                          <span>{incident.incident_type}</span>
                          <span>
                            {formatDistanceToNow(new Date(incident.detected_at), { addSuffix: true })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Dead-letter Queue Operations</CardTitle>
            <CardDescription>
              Inspect failed jobs and replay or archive them without leaving the dashboard.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {DLQ_OPTIONS.map((option) => (
              <Button
                key={option.key}
                size="sm"
                variant={selectedDlq === option.key ? 'default' : 'outline'}
                onClick={() => setSelectedDlq(option.key)}
                className={selectedDlq === option.key ? 'bg-indigo-600 text-white' : ''}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {deadLetterLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-indigo-600" />
              Loading dead-letter jobs…
            </div>
          ) : deadLetterJobs.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-gray-500">
              <p>No jobs in the {selectedDlq} dead-letter queue 🎉</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead className="w-[140px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deadLetterJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-gray-900">{job.name}</span>
                        <span className="text-xs text-gray-500">
                          Queue: {job.data?.failedQueue || 'unknown'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-600">
                      {job.data?.failedReason || job.failedReason || 'n/a'}
                    </TableCell>
                    <TableCell>{job.attemptsMade ?? job.data?.attemptsMade ?? 0}</TableCell>
                    <TableCell>
                      {job.timestamp
                        ? formatDistanceToNow(new Date(job.timestamp), { addSuffix: true })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => handleDeadLetterAction('replay', job, selectedDlq)}
                        >
                          <Repeat2 className="h-3.5 w-3.5" />
                          Replay
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeadLetterAction('discard', job, selectedDlq)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Automated Backup Verification</CardTitle>
          <CardDescription>
            Recent verification job results recorded via&nbsp;
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-700">
              npm run runbooks:backup-verify
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backupRuns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-gray-500">
                    No backup verification runs recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {backupRuns.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="text-xs text-gray-600">
                    {run.details?.databaseTime ? `DB ${run.details.databaseTime}` : run.id}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        run.status === 'pass'
                          ? 'bg-emerald-100 text-emerald-700'
                          : run.status === 'fail'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }
                    >
                      {run.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {run.duration_ms != null ? `${Math.round(run.duration_ms / 1000)}s` : '—'}
                  </TableCell>
                  <TableCell className="text-sm uppercase text-gray-600">
                    {run.environment}
                  </TableCell>
                  <TableCell className="text-xs text-gray-600">
                    {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

const MetricTile = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
    <p className="text-xs uppercase text-gray-500">{label}</p>
    <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
  </div>
)



