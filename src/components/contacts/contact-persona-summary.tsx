'use client'

/**
 * Phase 2b.40 — AI persona summary card for the contact detail page.
 *
 * Sits just below the KPI strip (2b.38). 2-3 sentences synthesised
 * from the contact's full conversation history.
 *
 * Lifecycle:
 *   - On mount, GETs the cached summary.
 *   - If none cached → fires POST to generate.
 *   - If cached but stale (≥5 new activities since `last_activity_seen_at`)
 *     → renders the cached text + fires POST in the background to
 *       refresh; swaps the text in when the POST returns.
 *   - "Refresh" button forces a regenerate.
 *   - Fallback rendering when there's not enough history.
 */

import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface ContactPersonaSummaryProps {
  contactId: string
}

interface PersonaState {
  summary: string | null
  generatedAt: string | null
  isFallback: boolean
  modelVersion: string | null
  needsGeneration: boolean
  stale: boolean
  newActivityCount: number
}

const EMPTY_STATE: PersonaState = {
  summary: null,
  generatedAt: null,
  isFallback: false,
  modelVersion: null,
  needsGeneration: false,
  stale: false,
  newActivityCount: 0,
}

export function ContactPersonaSummary({ contactId }: ContactPersonaSummaryProps) {
  const [state, setState] = useState<PersonaState>(EMPTY_STATE)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Guards against firing POST twice in StrictMode dev double-mount.
  const generationFiredRef = useRef(false)

  // 1. On mount: fetch the cached summary.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/contacts/${contactId}/persona-summary`, {
          credentials: 'include',
        })
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          setError(body?.error ?? 'Failed to load summary')
          return
        }
        const body = (await res.json()) as {
          summary: string | null
          generated_at?: string
          is_fallback?: boolean
          model_version?: string
          needs_generation: boolean
          stale: boolean
          new_activity_count?: number
        }
        if (cancelled) return
        setState({
          summary: body.summary,
          generatedAt: body.generated_at ?? null,
          isFallback: body.is_fallback ?? false,
          modelVersion: body.model_version ?? null,
          needsGeneration: body.needs_generation,
          stale: body.stale,
          newActivityCount: body.new_activity_count ?? 0,
        })
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'load_failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [contactId])

  // 2. If needs_generation OR stale, auto-fire a POST to refresh.
  useEffect(() => {
    if (loading || regenerating || generationFiredRef.current) return
    if (!state.needsGeneration && !state.stale) return
    generationFiredRef.current = true
    void regenerate(state.needsGeneration)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, state.needsGeneration, state.stale])

  const regenerate = async (isInitialGeneration: boolean) => {
    setRegenerating(true)
    if (!isInitialGeneration) {
      // For background refresh, keep the existing summary visible
      // while the POST runs.
    }
    try {
      const res = await fetch(`/api/contacts/${contactId}/persona-summary`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? 'Generation failed')
        return
      }
      const body = (await res.json()) as {
        summary: string
        is_fallback: boolean
        model_version: string
        last_activity_seen_at: string | null
        activities_seen_count: number
      }
      setState({
        summary: body.summary,
        generatedAt: new Date().toISOString(),
        isFallback: body.is_fallback,
        modelVersion: body.model_version,
        needsGeneration: false,
        stale: false,
        newActivityCount: 0,
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'generate_failed')
    } finally {
      setRegenerating(false)
    }
  }

  // ---- Render states ----

  // First-load skeleton.
  if (loading) {
    return (
      <Card className="p-3 bg-violet-50/40 border-violet-100">
        <div className="flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-violet-100 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-violet-100 rounded animate-pulse w-full" />
            <div className="h-3 bg-violet-100 rounded animate-pulse w-2/3" />
          </div>
        </div>
      </Card>
    )
  }

  // Error state.
  if (error && !state.summary) {
    return (
      <Card className="p-3 bg-gray-50 border-gray-200">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-gray-600">
            Couldn&apos;t load summary. <button onClick={() => void regenerate(true)} className="underline">Retry</button>
          </div>
        </div>
      </Card>
    )
  }

  // First-time generation (no summary yet, POST is in flight).
  if (state.needsGeneration && regenerating) {
    return (
      <Card className="p-3 bg-violet-50/40 border-violet-100">
        <div className="flex items-start gap-2.5">
          <Loader2 className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5 animate-spin" />
          <div className="flex-1 text-sm text-violet-700 italic">
            Generating persona summary from this contact&apos;s history…
          </div>
        </div>
      </Card>
    )
  }

  // Steady-state.
  return (
    <Card
      className={cn(
        'p-3 border',
        state.isFallback ? 'bg-gray-50 border-gray-200' : 'bg-violet-50/40 border-violet-100'
      )}
    >
      <div className="flex items-start gap-2.5">
        <Sparkles
          className={cn(
            'h-4 w-4 flex-shrink-0 mt-0.5',
            state.isFallback ? 'text-gray-400' : 'text-violet-500'
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3
              className={cn(
                'text-[11px] font-semibold uppercase tracking-wide',
                state.isFallback ? 'text-gray-500' : 'text-violet-700'
              )}
            >
              {state.isFallback ? 'Summary (auto-fallback)' : 'AI persona summary'}
            </h3>
            <div className="flex items-center gap-2">
              {state.generatedAt && (
                <span className="text-[10px] text-gray-500">
                  Updated {formatDistanceToNow(new Date(state.generatedAt), { addSuffix: true })}
                </span>
              )}
              <button
                type="button"
                onClick={() => void regenerate(false)}
                disabled={regenerating}
                title="Regenerate summary"
                className={cn(
                  'p-1 rounded hover:bg-violet-100 transition-colors text-violet-500 hover:text-violet-700 disabled:opacity-50',
                  state.isFallback && 'text-gray-400 hover:bg-gray-100'
                )}
              >
                <RefreshCw className={cn('h-3 w-3', regenerating && 'animate-spin')} />
              </button>
            </div>
          </div>
          <p
            className={cn(
              'text-sm leading-snug',
              state.isFallback ? 'text-gray-700' : 'text-gray-800'
            )}
          >
            {state.summary ?? '—'}
          </p>
          {state.stale && !regenerating && (
            <p className="text-[10px] text-violet-600 mt-1.5 italic">
              {state.newActivityCount} new activities since this summary — refreshing in the background.
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
