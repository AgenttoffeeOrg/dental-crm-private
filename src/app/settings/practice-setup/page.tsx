'use client'

/**
 * Phase 2b.35.4 — Practice Setup wizard.
 *
 * One-page wizard for the 2026-05-23 locked product flow:
 *   1. Practice picks which treatments they offer (multi-select from
 *      the 20-row canonical `treatment_types` catalog).
 *   2. For each new treatment, picks either "create a fresh pipeline"
 *      (default) or "merge into an existing pipeline" (e.g. group
 *      "Implants - single tooth" and "Implants - full arch" under one
 *      Implants pipeline).
 *   3. Applies — POSTs to /api/practice-setup/provision-treatments
 *      which creates pipelines + stages + offerings + ensures the
 *      Unsorted pipeline exists so AI-uncertain inbound has a home.
 *
 * Re-usable as an onboarding step AND as ongoing practice maintenance —
 * already-active treatments are shown with a lock icon and skipped on
 * apply, so a practice can come back later and add more without
 * worrying about duplicates.
 */

import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Check, AlertCircle, Sparkles, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TreatmentType {
  id: string
  display_name: string
  sort_order: number | null
}

interface ExistingOffering {
  id: string
  treatment_type_id: string | null
  pipeline_id: string
}

interface ExistingPipeline {
  id: string
  name: string
  is_default: boolean
}

interface SetupState {
  treatment_types: TreatmentType[]
  offerings: ExistingOffering[]
  pipelines: ExistingPipeline[]
}

type PickAction =
  | { action: 'create_pipeline' }
  | { action: 'merge_into_pipeline'; merge_pipeline_id: string }

export default function PracticeSetupPage() {
  const router = useRouter()
  const [state, setState] = useState<SetupState | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedTreatments, setSelectedTreatments] = useState<Set<string>>(new Set())
  const [picksByTreatment, setPicksByTreatment] = useState<Record<string, PickAction>>({})
  const [applying, setApplying] = useState(false)
  const [done, setDone] = useState<{
    created: number
    merged: number
    skipped: number
    unsortedCreated: boolean
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await fetch('/api/settings/treatment-offerings', {
          credentials: 'include',
        })
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          setLoadError(body?.error ?? 'Failed to load')
          return
        }
        const body = (await res.json()) as SetupState
        if (cancelled) return
        setState(body)
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'load_failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Map: treatment_type_id → offering (if any). Used to show which
  // treatments are already active and skip them on apply.
  const offeringByTreatmentId = useMemo(() => {
    const m = new Map<string, ExistingOffering>()
    for (const o of state?.offerings ?? []) {
      if (o.treatment_type_id) m.set(o.treatment_type_id, o)
    }
    return m
  }, [state])

  const toggleTreatment = (id: string) => {
    if (offeringByTreatmentId.has(id)) return // already active — locked
    setSelectedTreatments((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setPicksByTreatment((prevPicks) => {
          const np = { ...prevPicks }
          delete np[id]
          return np
        })
      } else {
        next.add(id)
        // Default pick = create new pipeline
        setPicksByTreatment((prevPicks) => ({
          ...prevPicks,
          [id]: { action: 'create_pipeline' },
        }))
      }
      return next
    })
  }

  const setPickAction = (treatmentId: string, action: PickAction) => {
    setPicksByTreatment((prev) => ({ ...prev, [treatmentId]: action }))
  }

  const handleApply = async () => {
    if (selectedTreatments.size === 0) {
      toast.error('Pick at least one treatment first.')
      return
    }

    setApplying(true)
    try {
      const picks = Array.from(selectedTreatments).map((id) => {
        const pick = picksByTreatment[id] ?? { action: 'create_pipeline' as const }
        if (pick.action === 'merge_into_pipeline') {
          return {
            treatment_type_id: id,
            action: 'merge_into_pipeline' as const,
            merge_pipeline_id: pick.merge_pipeline_id,
          }
        }
        return { treatment_type_id: id, action: 'create_pipeline' as const }
      })

      const res = await fetch('/api/practice-setup/provision-treatments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ picks, ensure_unsorted: true }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        toast.error(body?.error ?? 'Apply failed.')
        return
      }

      const body = (await res.json()) as {
        ok: boolean
        results: Array<{ status: string; error?: string }>
        unsorted_created: boolean
      }

      const created = body.results.filter((r) => r.status === 'created' && !r.error).length
      const merged = body.results.filter((r) => r.status === 'merged' && !r.error).length
      const skipped = body.results.filter((r) => r.status === 'skipped_already_offered').length
      const errors = body.results.filter((r) => !!r.error)

      if (errors.length > 0) {
        toast.error(`${errors.length} treatments failed — see settings to retry.`)
      } else {
        toast.success(`Practice set up: ${created} new pipelines, ${merged} merged.`)
      }

      setDone({
        created,
        merged,
        skipped,
        unsortedCreated: body.unsorted_created,
      })

      // Refresh local state so any retry/back action reflects the new
      // offerings + pipelines.
      const refreshRes = await fetch('/api/settings/treatment-offerings', {
        credentials: 'include',
      })
      if (refreshRes.ok) {
        const fresh = (await refreshRes.json()) as SetupState
        setState(fresh)
      }
      setSelectedTreatments(new Set())
      setPicksByTreatment({})
    } catch (err) {
      console.error('[practice-setup] apply failed', err)
      toast.error(err instanceof Error ? err.message : 'Apply failed.')
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    )
  }

  if (loadError) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-2xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Couldn't load setup</h3>
                <p className="text-sm text-red-700 mt-1">{loadError}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  const activeTreatments = state?.treatment_types.filter((t) => offeringByTreatmentId.has(t.id)) ?? []
  const availableTreatments =
    state?.treatment_types.filter((t) => !offeringByTreatmentId.has(t.id)) ?? []
  const allPipelines = state?.pipelines ?? []

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Set up your treatments</h1>
          <p className="text-sm text-gray-600 mt-1">
            Pick which treatments your practice offers. Each one becomes its own deal
            pipeline so leads land in the right lane. You can merge two treatments into one
            pipeline if you prefer (e.g. group all implant types under "Implants").
          </p>
        </div>

        {done && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-5 flex items-start gap-3">
              <Check className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-emerald-900">Practice set up</h3>
                <p className="text-sm text-emerald-800 mt-1">
                  {done.created} new pipeline{done.created === 1 ? '' : 's'} created
                  {done.merged > 0 ? `, ${done.merged} merged into existing` : ''}
                  {done.skipped > 0 ? `, ${done.skipped} already active` : ''}
                  {done.unsortedCreated ? '. Unsorted pipeline also created.' : ''}
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push('/deals')}
                >
                  Open Deals
                  <ArrowRight className="h-3 w-3 ml-1.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTreatments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Already active</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {activeTreatments.map((t) => {
                const offering = offeringByTreatmentId.get(t.id)
                const pipeline = offering
                  ? allPipelines.find((p) => p.id === offering.pipeline_id)
                  : null
                return (
                  <Badge
                    key={t.id}
                    className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    {t.display_name}
                    {pipeline && (
                      <span className="ml-1.5 text-emerald-600 text-[10px]">
                        → {pipeline.name}
                      </span>
                    )}
                  </Badge>
                )
              })}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {activeTreatments.length > 0 ? 'Add more treatments' : 'Pick the treatments your practice offers'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availableTreatments.length === 0 ? (
              <p className="text-sm text-gray-500">
                Every catalog treatment is already active. You're fully set up.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {availableTreatments.map((t) => {
                  const selected = selectedTreatments.has(t.id)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTreatment(t.id)}
                      className={cn(
                        'text-left px-3 py-2.5 rounded-lg border-2 transition-all flex items-center gap-2',
                        selected
                          ? 'border-purple-500 bg-purple-50 text-purple-900'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800'
                      )}
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                          selected
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-gray-300'
                        )}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="text-sm font-medium">{t.display_name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedTreatments.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                How should each one be handled?
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                Default: each treatment gets its own pipeline. Pick "Merge into…" to
                group several treatments under one.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from(selectedTreatments).map((treatmentId) => {
                const treatment = state?.treatment_types.find((t) => t.id === treatmentId)
                if (!treatment) return null
                const pick = picksByTreatment[treatmentId] ?? { action: 'create_pipeline' as const }
                return (
                  <div
                    key={treatmentId}
                    className="border border-gray-200 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-900">
                        {treatment.display_name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {pick.action === 'create_pipeline'
                          ? 'New pipeline'
                          : 'Merge into existing'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPickAction(treatmentId, { action: 'create_pipeline' })}
                        className={cn(
                          'text-left px-3 py-2 rounded-md border-2 text-sm',
                          pick.action === 'create_pipeline'
                            ? 'border-purple-500 bg-purple-50 text-purple-900'
                            : 'border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        <div className="font-medium">Create new pipeline</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Stages: New → Qualified → Booked → Won / Lost
                        </div>
                      </button>

                      <div
                        className={cn(
                          'px-3 py-2 rounded-md border-2 text-sm',
                          pick.action === 'merge_into_pipeline'
                            ? 'border-purple-500 bg-purple-50 text-purple-900'
                            : 'border-gray-200'
                        )}
                      >
                        <div className="font-medium mb-1.5">Merge into existing</div>
                        <Select
                          value={
                            pick.action === 'merge_into_pipeline'
                              ? pick.merge_pipeline_id
                              : undefined
                          }
                          onValueChange={(value) =>
                            setPickAction(treatmentId, {
                              action: 'merge_into_pipeline',
                              merge_pipeline_id: value,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Pick a pipeline…" />
                          </SelectTrigger>
                          <SelectContent>
                            {allPipelines.length === 0 ? (
                              <div className="px-2 py-1.5 text-xs text-gray-500">
                                No pipelines yet — create one first
                              </div>
                            ) : (
                              allPipelines.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between sticky bottom-0 bg-white border-t border-gray-200 -mx-6 lg:-mx-8 px-6 lg:px-8 py-4 mt-6">
          <div className="text-sm text-gray-600">
            <Sparkles className="h-4 w-4 inline mr-1 text-purple-500" />
            An "Unsorted" pipeline is also created so AI-uncertain leads always land somewhere.
          </div>
          <Button
            size="lg"
            onClick={handleApply}
            disabled={applying || selectedTreatments.size === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {applying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Setting up…
              </>
            ) : (
              <>
                Set up {selectedTreatments.size > 0 ? `${selectedTreatments.size} ` : ''}
                treatment{selectedTreatments.size === 1 ? '' : 's'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
