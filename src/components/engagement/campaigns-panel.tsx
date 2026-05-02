'use client'

import { useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Activity, AlertTriangle, Bot, CalendarClock, ClipboardList, Cpu, MessageCircle, Pause, Play, RefreshCw, ServerCrash, X } from 'lucide-react'
import type {
  EngagementCampaign,
  EngagementEnrollment,
  EngagementEvent,
  EngagementStep,
} from '@/types/database'

const STEP_TYPES: { value: EngagementStep['step_type']; label: string }[] = [
  { value: 'send_email', label: 'Send Email' },
  { value: 'send_sms', label: 'Send SMS' },
  { value: 'send_whatsapp', label: 'Send WhatsApp' },
  { value: 'wait', label: 'Wait / Delay' },
  { value: 'notify_human', label: 'Notify Human' },
  { value: 'webhook', label: 'Call Webhook' },
]

export type CampaignStepForm = {
  type: EngagementStep['step_type']
  subject?: string
  html?: string
  message?: string
  waitAmount?: number
  waitUnit?: 'minutes' | 'hours' | 'days'
  note?: string
  webhookUrl?: string
  webhookMethod?: string
  webhookHeaders?: string
}

export type CampaignWithMeta = EngagementCampaign & {
  stepCount: number
  activeEnrollments: number
  totalEnrollments: number
  nextRunAt?: string | null
}

export type EnrollmentSummary = EngagementEnrollment
export type EngagementEventLog = EngagementEvent

interface CampaignsPanelProps {
  campaigns: CampaignWithMeta[]
  loading: boolean
  error: string | null
  selectedCampaignId: string | null
  onSelectCampaign: (id: string | null) => void
  selectedCampaign: CampaignWithMeta | null
  steps: EngagementStep[]
  stepsLoading: boolean
  enrollments: EnrollmentSummary[]
  events: EngagementEventLog[]
  onAddStep: (campaignId: string, form: CampaignStepForm) => Promise<void>
  onRemoveStep: (campaignId: string, stepId: string) => Promise<void>
  onStatusChange: (campaign: CampaignWithMeta, status: EngagementCampaign['status']) => Promise<void>
}

export function CampaignsPanel({
  campaigns,
  loading,
  error,
  selectedCampaignId,
  onSelectCampaign,
  selectedCampaign,
  steps,
  stepsLoading,
  enrollments,
  events,
  onAddStep,
  onRemoveStep,
  onStatusChange,
}: CampaignsPanelProps) {
  const sortedCampaigns = useMemo(() => {
    return [...campaigns].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }, [campaigns])

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <Card className="border border-purple-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <ClipboardList className="h-5 w-5" />
            Campaigns
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-72 text-gray-500">
              <RefreshCw className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-72 text-red-500 gap-2 text-sm px-6 text-center">
              <ServerCrash className="h-5 w-5" />
              <span>{error}</span>
            </div>
          ) : sortedCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-72 text-gray-500 gap-3 px-6 text-center">
              <Bot className="h-10 w-10 text-purple-300" />
              <span className="font-medium text-gray-700">No campaigns yet</span>
              <p className="text-sm text-gray-500">
                Kickstart your first autonomous sequence to nurture leads or re-engage patients automatically.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[420px]">
              <div className="px-2">
                {sortedCampaigns.map((campaign) => {
                  const isActive = campaign.id === selectedCampaignId
                  return (
                    <button
                      key={campaign.id}
                      onClick={() => onSelectCampaign(campaign.id)}
                      className={`w-full text-left rounded-lg border transition-all px-4 py-3 mb-2 ${
                        isActive ? 'border-purple-500 bg-purple-50' : 'border-transparent hover:border-purple-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                          <p className="text-xs text-gray-500">
                            Updated {formatDistanceToNow(new Date(campaign.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                        <StatusBadge status={campaign.status} />
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{campaign.description}</p>
                      )}
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-600">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{campaign.stepCount}</span>
                          <span>Steps</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{campaign.activeEnrollments}</span>
                          <span>Active Enrollments</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{campaign.totalEnrollments}</span>
                          <span>Total Enrollments</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">
                            {campaign.nextRunAt ? formatDistanceToNow(new Date(campaign.nextRunAt), { addSuffix: true }) : '—'}
                          </span>
                          <span>Next Step</span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        {selectedCampaign ? (
          <>
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-purple-600" />
                    {selectedCampaign.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Trigger: {selectedCampaign.trigger_config?.type || 'manual'} · Timezone: {selectedCampaign.timezone}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedCampaign.status !== 'active' && (
                    <Button size="sm" onClick={() => onStatusChange(selectedCampaign, 'active')}>
                      <Play className="mr-2 h-4 w-4" />
                      Activate
                    </Button>
                  )}
                  {selectedCampaign.status === 'active' && (
                    <Button size="sm" variant="outline" onClick={() => onStatusChange(selectedCampaign, 'paused')}>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => onStatusChange(selectedCampaign, 'archived')}>
                    <X className="mr-2 h-4 w-4" />
                    Archive
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <div className="p-6 space-y-6">
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-purple-500" />
                        Steps
                      </h3>
                      <AddStepButton onSubmit={(form) => onAddStep(selectedCampaign.id, form)} />
                    </div>
                    {stepsLoading ? (
                      <div className="flex justify-center items-center h-32 text-gray-500">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      </div>
                    ) : steps.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-purple-200 p-6 text-center text-sm text-gray-500">
                        No steps yet. Add the first touchpoint to kick off your automation.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {steps.map((step) => (
                          <div
                            key={step.id}
                            className="rounded-lg border border-gray-200 p-4 flex gap-3 items-start justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">#{step.step_order}</Badge>
                                <Badge variant="secondary">
                                  {STEP_TYPES.find((s) => s.value === step.step_type)?.label ?? step.step_type}
                                </Badge>
                              </div>
                              <StepSummary step={step} />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onRemoveStep(selectedCampaign.id, step.id)}
                              title="Remove step"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-purple-500" />
                        Recent Enrollments
                      </h3>
                    </div>
                    {enrollments.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                        No enrollments yet. Once contacts are enrolled you’ll see live progress here.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Contact</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Current Step</TableHead>
                            <TableHead>Next Run</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {enrollments.map((enrollment) => (
                            <TableRow key={enrollment.id}>
                              <TableCell>{enrollment.contact_id || '—'}</TableCell>
                              <TableCell>
                                <StatusBadge status={enrollment.status} />
                              </TableCell>
                              <TableCell>#{enrollment.current_step_order}</TableCell>
                              <TableCell>
                                {enrollment.next_run_at
                                  ? formatDistanceToNow(new Date(enrollment.next_run_at), { addSuffix: true })
                                  : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </section>
                </div>

                <div className="border-l border-gray-100 bg-gray-50/60 p-6 space-y-6">
                  <section>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-purple-500" />
                      Activity
                    </h3>
                    <ScrollArea className="h-[220px] pr-4">
                      {events.length === 0 ? (
                        <p className="text-sm text-gray-500">No activity yet. Campaign events will appear here in real time.</p>
                      ) : (
                        <div className="space-y-3">
                          {events.map((event) => (
                            <div key={event.id} className="rounded-lg border border-gray-200 bg-white p-3">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</span>
                                <StatusBadge status={event.status} />
                              </div>
                              <p className="text-sm font-medium text-gray-800">{event.event_type}</p>
                              {event.payload && (
                                <pre className="mt-2 max-h-24 overflow-hidden text-xs bg-gray-50 border border-gray-100 rounded p-2">
                                  {JSON.stringify(event.payload, null, 2)}
                                </pre>
                              )}
                              {event.error_message && (
                                <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {event.error_message}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-purple-500" />
                      Campaign Insights
                    </h3>
                    <div className="space-y-3 text-sm text-gray-600">
                      <p>
                        <span className="font-semibold text-gray-800">Goal:</span>{' '}
                        {selectedCampaign.trigger_config?.goal || 'nurture'}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-800">Trigger:</span>{' '}
                        {selectedCampaign.trigger_config?.type || 'manual'}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-800">Cadence:</span>{' '}
                        {selectedCampaign.schedule_config?.cadence || 'continuous'}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-800">Created:</span>{' '}
                        {format(new Date(selectedCampaign.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </section>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <div className="flex items-center justify-center h-[420px] text-gray-500">
            <p>Select a campaign to view details</p>
          </div>
        )}
      </Card>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    paused: 'bg-amber-100 text-amber-700 border-amber-200',
    waiting: 'bg-sky-100 text-sky-700 border-sky-200',
    completed: 'bg-blue-100 text-blue-700 border-blue-200',
    failed: 'bg-red-100 text-red-700 border-red-200',
    cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
    archived: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  return <Badge className={`capitalize border ${styles[status] || styles.draft}`}>{status}</Badge>
}

function StepSummary({ step }: { step: EngagementStep }) {
  switch (step.step_type) {
    case 'send_email':
      return (
        <div className="text-sm text-gray-600">
          <p>
            <span className="font-semibold text-gray-800">Subject:</span> {step.config?.subject || 'Untitled'}
          </p>
          <p className="line-clamp-2 text-xs text-gray-500 mt-1">
            {(step.config?.html || '').replace(/<[^>]+>/g, '').slice(0, 160) || '—'}
          </p>
        </div>
      )
    case 'send_sms':
    case 'send_whatsapp':
      return (
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-800">Message:</span> {step.config?.message || '—'}
        </p>
      )
    case 'wait':
      return (
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-800">Delay:</span>{' '}
          {(() => {
            if (step.config?.wait_seconds) {
              return `${Math.round(step.config.wait_seconds / 60)} minutes`
            }
            if (step.wait_duration_seconds) {
              return `${Math.round(step.wait_duration_seconds / 60)} minutes`
            }
            return '—'
          })()}
        </p>
      )
    case 'notify_human':
      return (
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-800">Note:</span> {step.config?.note || '—'}
        </p>
      )
    case 'webhook':
      return (
        <div className="text-sm text-gray-600">
          <p>
            <span className="font-semibold text-gray-800">URL:</span> {step.config?.url || '—'}
          </p>
          <p>
            <span className="font-semibold text-gray-800">Method:</span> {step.config?.method || 'POST'}
          </p>
        </div>
      )
    default:
      return <p className="text-sm text-gray-600">Unconfigured step</p>
  }
}

function AddStepButton({ onSubmit }: { onSubmit: (form: CampaignStepForm) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<EngagementStep['step_type']>('send_email')
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [message, setMessage] = useState('')
  const [waitAmount, setWaitAmount] = useState(60)
  const [waitUnit, setWaitUnit] = useState<'minutes' | 'hours' | 'days'>('minutes')
  const [note, setNote] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookMethod, setWebhookMethod] = useState('POST')
  const [webhookHeaders, setWebhookHeaders] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const resetForm = () => {
    setType('send_email')
    setSubject('')
    setHtml('')
    setMessage('')
    setWaitAmount(60)
    setWaitUnit('minutes')
    setNote('')
    setWebhookUrl('')
    setWebhookMethod('POST')
    setWebhookHeaders('')
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await onSubmit({
        type,
        subject,
        html,
        message,
        waitAmount,
        waitUnit,
        note,
        webhookUrl,
        webhookMethod,
        webhookHeaders,
      })
      setOpen(false)
      resetForm()
    } catch {
      // parent handles toast
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) resetForm()
        setOpen(value)
      }}
    >
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <ClipboardList className="mr-2 h-4 w-4" />
        Add Step
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure Step</DialogTitle>
          <DialogDescription>Add a new action to the campaign journey.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label id="step-type-label" htmlFor="step-type" className="text-sm font-medium text-gray-700 mb-1 block">Step Type</label>
              <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
                <SelectTrigger id="step-type" aria-labelledby="step-type-label">
                  <SelectValue placeholder="Select step type" />
                </SelectTrigger>
                <SelectContent>
                  {STEP_TYPES.map((step) => (
                    <SelectItem key={step.value} value={step.value}>
                      {step.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {type === 'wait' && (
              <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                <div>
                  <label htmlFor="wait-amount" className="text-sm font-medium text-gray-700 mb-1 block">Amount</label>
                  <Input
                    id="wait-amount"
                    type="number"
                    min={1}
                    value={waitAmount}
                    onChange={(event) => setWaitAmount(Number(event.target.value))}
                  />
                </div>
                <div>
                  <label id="wait-unit-label" htmlFor="wait-unit" className="text-sm font-medium text-gray-700 mb-1 block">Unit</label>
                  <Select value={waitUnit} onValueChange={(value) => setWaitUnit(value as typeof waitUnit)}>
                    <SelectTrigger id="wait-unit" aria-labelledby="wait-unit-label">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {type === 'send_email' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Subject</label>
                <Input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="e.g., Welcome to our practice"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">HTML Body</label>
                <Textarea
                  value={html}
                  onChange={(event) => setHtml(event.target.value)}
                  rows={6}
                  placeholder="<p>We’re excited to help you with your smile…</p>"
                />
              </div>
            </div>
          )}

          {(type === 'send_sms' || type === 'send_whatsapp') && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Message</label>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                placeholder="Hi {{contact.first_name}}, we noticed you requested more info…"
              />
            </div>
          )}

          {type === 'notify_human' && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Instructions</label>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                placeholder="Create a follow-up task for the coordinator with conversation context."
              />
            </div>
          )}

          {type === 'webhook' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Webhook URL</label>
                <Input
                  value={webhookUrl}
                  onChange={(event) => setWebhookUrl(event.target.value)}
                  placeholder="https://example.com/webhooks/engagement"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Method</label>
                <Select value={webhookMethod} onValueChange={(value) => setWebhookMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Headers (JSON)</label>
                <Textarea
                  value={webhookHeaders}
                  onChange={(event) => setWebhookHeaders(event.target.value)}
                  rows={4}
                  placeholder='{"Authorization": "Bearer ..."}'
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            Add Step
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

