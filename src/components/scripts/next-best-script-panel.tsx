'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Clipboard,
  Copy,
  Lightbulb,
  Loader2,
  Sparkles,
  ThumbsDown,
  ThumbsUp
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import {
  SCRIPT_TRIGGER_LABELS,
  SCRIPT_TRIGGERS,
} from '@/lib/services/script-trigger-metadata'
import {
  SCRIPT_OUTCOME_LABELS,
  SCRIPT_OUTCOME_TYPES,
  type ScriptOutcomeType,
} from '@/lib/services/script-outcome-metadata'
import { ScriptRecommendation } from '@/lib/services/script-selector'
import { ScriptTrigger } from '@/types/database'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'

interface NextBestScriptPanelProps {
  contactId: string
  dealId?: string
  defaultTrigger?: ScriptTrigger
}

interface ScriptUsageState {
  usageId?: string
  submitting: boolean
  helpful?: boolean | null
  feedback?: string
  feedbackSubmitting?: boolean
  outcomeType?: ScriptOutcomeType
  outcomeNotes?: string
  outcomeSubmitting?: boolean
  outcomeRecorded?: boolean
}

const TRIGGER_OPTIONS = SCRIPT_TRIGGERS.map((trigger) => ({
  value: trigger,
  label: SCRIPT_TRIGGER_LABELS[trigger]
}))

const OUTCOME_OPTIONS = SCRIPT_OUTCOME_TYPES.map((type) => ({
  value: type,
  label: SCRIPT_OUTCOME_LABELS[type],
}))

export function NextBestScriptPanel({
  contactId,
  dealId,
  defaultTrigger = 'price_objection'
}: NextBestScriptPanelProps) {
  const [trigger, setTrigger] = useState<ScriptTrigger>(defaultTrigger)
  const [recommendations, setRecommendations] = useState<ScriptRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [usageState, setUsageState] = useState<Record<string, ScriptUsageState>>({})
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const { user, loading: authLoading } = useAuth()

  const getAuthHeaders = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.access_token) {
      return {
        Authorization: `Bearer ${session.access_token}`,
      }
    }

    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) {
      console.error('[NextBestScriptPanel] refreshSession error', refreshError)
      return null
    }

    if (!refreshed.session?.access_token) {
      return null
    }

    return {
      Authorization: `Bearer ${refreshed.session.access_token}`,
    }
  }, [supabase])

  const triggerLabel = useMemo(() => SCRIPT_TRIGGER_LABELS[trigger], [trigger])

  const fetchRecommendations = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        trigger,
        contactId,
        limit: '3'
      })

      if (dealId) {
        params.set('dealId', dealId)
      }

      const authHeaders = await getAuthHeaders()
      if (!authHeaders) {
        setError('Session expired. Please sign in again.')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/scripts/recommendations?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          ...authHeaders,
        },
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to load recommendations')
      }

      const payload = await response.json()
      setRecommendations(payload.data ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load recommendations'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [trigger, contactId, dealId, getAuthHeaders])

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!user) {
      setLoading(false)
      setRecommendations([])
      setError('Sign in to view recommendations')
      return
    }

    fetchRecommendations()
  }, [authLoading, user?.id, fetchRecommendations])

  const handleUseScript = async (rec: ScriptRecommendation) => {
    setUsageState((prev) => ({
      ...prev,
      [rec.slug]: {
        ...(prev[rec.slug] ?? {}),
        submitting: true
      }
    }))

    try {
      const authHeaders = await getAuthHeaders()
      if (!authHeaders) {
        throw new Error('Session expired. Please sign in again.')
      }

      const response = await fetch('/api/scripts/usages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        credentials: 'include',
        body: JSON.stringify({
          scriptVersionId: rec.scriptVersionId,
          contactId,
          dealId,
          trigger,
          personaSnapshot: {
            personaTags: rec.personaTags
          },
          metadata: {
            source: 'next_best_script_panel'
          }
        })
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to log script usage')
      }

      const { data } = await response.json()

      setUsageState((prev) => ({
        ...prev,
        [rec.slug]: {
          usageId: data.id,
          submitting: false,
          helpful: null,
          feedback: '',
          outcomeType: 'appointment_booked',
          outcomeNotes: '',
        }
      }))

      toast.success('Script logged. Let us know if it helped!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to log script usage'
      toast.error(message)
      setUsageState((prev) => ({
        ...prev,
        [rec.slug]: {
          ...(prev[rec.slug] ?? {}),
          submitting: false
        }
      }))
    }
  }

  const handleOutcomeSubmit = async (rec: ScriptRecommendation) => {
    const usage = usageState[rec.slug]
    if (!usage?.usageId || usage?.outcomeRecorded) {
      if (!usage?.usageId) {
        toast.error('Please tap “Use Script” before recording an outcome.')
      }
      return
    }

    const outcomeType = usage.outcomeType ?? 'appointment_booked'

    setUsageState((prev) => ({
      ...prev,
      [rec.slug]: {
        ...(prev[rec.slug] ?? {}),
        outcomeSubmitting: true,
      },
    }))

    try {
      const authHeaders = await getAuthHeaders()
      if (!authHeaders) {
        throw new Error('Session expired. Please sign in again.')
      }

      const response = await fetch('/api/scripts/outcomes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        credentials: 'include',
        body: JSON.stringify({
          usageId: usage.usageId,
          outcomeType,
          notes: usage.outcomeNotes?.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to record outcome')
      }

      toast.success(`${SCRIPT_OUTCOME_LABELS[outcomeType]} recorded`)
      setUsageState((prev) => ({
        ...prev,
        [rec.slug]: {
          ...(prev[rec.slug] ?? {}),
          outcomeSubmitting: false,
          outcomeRecorded: true,
        },
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record outcome'
      toast.error(message)
      setUsageState((prev) => ({
        ...prev,
        [rec.slug]: {
          ...(prev[rec.slug] ?? {}),
          outcomeSubmitting: false,
        },
      }))
    }
  }

  const handleFeedback = async (rec: ScriptRecommendation, helpful: boolean) => {
    const usage = usageState[rec.slug]
    if (!usage?.usageId) {
      toast.error('Please tap “Use Script” before recording feedback.')
      return
    }

    setUsageState((prev) => ({
      ...prev,
      [rec.slug]: {
        ...(prev[rec.slug] ?? {}),
        helpful,
        feedbackSubmitting: true
      }
    }))

    try {
      const authHeaders = await getAuthHeaders()
      if (!authHeaders) {
        throw new Error('Session expired. Please sign in again.')
      }

      const response = await fetch(`/api/scripts/usages/${usage.usageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        credentials: 'include',
        body: JSON.stringify({
          helpful
        })
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Unable to record feedback')
      }

      toast.success(helpful ? 'Glad it helped!' : 'Thanks for letting us know. We’ll review it.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to record feedback'
      toast.error(message)
      setUsageState((prev) => ({
        ...prev,
        [rec.slug]: {
          ...(prev[rec.slug] ?? {}),
          helpful: null
        }
      }))
    } finally {
      setUsageState((prev) => ({
        ...prev,
        [rec.slug]: {
          ...(prev[rec.slug] ?? {}),
          feedbackSubmitting: false
        }
      }))
    }
  }

  const handleFeedbackSubmit = async (rec: ScriptRecommendation, note: string) => {
    const usage = usageState[rec.slug]
    if (!usage?.usageId) {
      toast.error('Please tap “Use Script” before sharing feedback.')
      return
    }

    setUsageState((prev) => ({
      ...prev,
      [rec.slug]: {
        ...(prev[rec.slug] ?? {}),
        feedback: note,
        feedbackSubmitting: true
      }
    }))

    try {
      const authHeaders = await getAuthHeaders()
      if (!authHeaders) {
        throw new Error('Session expired. Please sign in again.')
      }

      const response = await fetch('/api/scripts/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        credentials: 'include',
        body: JSON.stringify({
          usageId: usage.usageId,
          feedback: note
        })
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Unable to save feedback')
      }

      toast.success('Feedback saved. Thank you!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save feedback'
      toast.error(message)
    } finally {
      setUsageState((prev) => ({
        ...prev,
        [rec.slug]: {
          ...(prev[rec.slug] ?? {}),
          feedbackSubmitting: false
        }
      }))
    }
  }

  const handleCopy = (rec: ScriptRecommendation) => {
    navigator.clipboard
      .writeText(rec.body)
      .then(() => toast.success('Script copied to clipboard'))
      .catch(() => toast.error('Unable to copy script'))
  }

  return (
    <Card className="border-blue-200 shadow-sm">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Next Best Script
          </CardTitle>
          <Badge variant="outline" className="text-xs font-medium">
            {triggerLabel}
          </Badge>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">
            Data-backed playbooks tailored to common objections. Select a scenario to see what top performers use.
          </div>
          <div className="w-full md:w-60">
            <Select value={trigger} onValueChange={(value) => setTrigger(value as ScriptTrigger)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose scenario" />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Curating playbooks for this patient…</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-md border border-dashed border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-600">
            {error}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-sm text-muted-foreground">
            No recommendations yet—try a different scenario or update the contact’s persona.
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec) => {
              const usage = usageState[rec.slug]
              const personaBadges = rec.personaTags.length
                ? rec.personaTags
                : ['all-personas']

              return (
                <div
                  key={rec.slug}
                  className={cn(
                    'rounded-lg border bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md',
                    usage?.helpful === true && 'border-green-200 bg-green-50',
                    usage?.helpful === false && 'border-amber-200 bg-amber-50'
                  )}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                          {rec.scriptName}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {rec.triggerLabel}
                        </Badge>
                        {rec.toneDescriptor && (
                          <Badge variant="outline" className="text-xs">
                            {rec.toneDescriptor}
                          </Badge>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Success rate&nbsp;
                          <span className="font-semibold text-green-700">{Math.round(rec.successRate)}%</span>
                          &nbsp;· used {rec.usageCount}x
                        </div>
                      </div>
                      <h4 className="text-base font-semibold text-slate-900">{rec.title}</h4>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                        {rec.body}
                      </p>
                      {rec.marketingHighlight && (
                        <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-700">
                          <Lightbulb className="h-4 w-4" />
                          {rec.marketingHighlight}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(rec)}
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy script
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUseScript(rec)}
                        disabled={usage?.submitting}
                        className="gap-2"
                      >
                        {usage?.submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Logging…
                          </>
                        ) : (
                          <>
                            <Clipboard className="h-4 w-4" />
                            Use script
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {personaBadges.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs capitalize">
                          #{tag.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                      {rec.estimatedDurationSeconds && (
                        <Badge variant="outline" className="text-xs">
                          ~{Math.round(rec.estimatedDurationSeconds / 60)} min delivery
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-600">Helpful?</span>
                      <Button
                        size="icon"
                        variant={usage?.helpful === true ? 'default' : 'outline'}
                        className="h-8 w-8"
                        disabled={!usage?.usageId || usage?.feedbackSubmitting}
                        onClick={() => handleFeedback(rec, true)}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant={usage?.helpful === false ? 'destructive' : 'outline'}
                        className="h-8 w-8"
                        disabled={!usage?.usageId || usage?.feedbackSubmitting}
                        onClick={() => handleFeedback(rec, false)}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {usage?.usageId && (
                    <div className="mt-3 space-y-2 rounded-md border border-blue-100 bg-blue-50/40 p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
                          <span className="text-xs font-medium text-blue-800">
                            Record outcome
                          </span>
                          <Select
                            value={usage.outcomeType ?? 'appointment_booked'}
                            onValueChange={(value) =>
                              setUsageState((prev) => ({
                                ...prev,
                                [rec.slug]: {
                                  ...(prev[rec.slug] ?? {}),
                                  outcomeType: value as ScriptOutcomeType,
                                },
                              }))
                            }
                            disabled={usage.outcomeRecorded}
                          >
                            <SelectTrigger className="h-8 w-full md:w-56 text-xs">
                              <SelectValue placeholder="Choose outcome" />
                            </SelectTrigger>
                            <SelectContent>
                              {OUTCOME_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-2 text-xs"
                          onClick={() => handleOutcomeSubmit(rec)}
                          disabled={
                            usage.outcomeSubmitting ||
                            usage.outcomeRecorded ||
                            !usage.outcomeType
                          }
                        >
                          {usage.outcomeSubmitting ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Saving…
                            </>
                          ) : usage.outcomeRecorded ? (
                            'Outcome recorded'
                          ) : (
                            'Save outcome'
                          )}
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Outcome notes (optional)"
                        value={usage.outcomeNotes ?? ''}
                        onChange={(event) =>
                          setUsageState((prev) => ({
                            ...prev,
                            [rec.slug]: {
                              ...(prev[rec.slug] ?? {}),
                              outcomeNotes: event.target.value,
                            },
                          }))
                        }
                        disabled={usage.outcomeRecorded}
                        className="text-xs"
                      />
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    <Textarea
                      placeholder="Add context or notes (optional)"
                      value={usage?.feedback ?? ''}
                      onChange={(event) =>
                        setUsageState((prev) => ({
                          ...prev,
                          [rec.slug]: {
                            ...(prev[rec.slug] ?? {}),
                            feedback: event.target.value
                          }
                        }))
                      }
                      disabled={!usage?.usageId}
                      className="text-sm"
                    />
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-xs"
                        disabled={!usage?.usageId || (usage?.feedback ?? '').trim().length === 0 || usage?.feedbackSubmitting}
                        onClick={() => handleFeedbackSubmit(rec, (usage?.feedback ?? '').trim())}
                      >
                        {usage?.feedbackSubmitting ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          'Save note'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

