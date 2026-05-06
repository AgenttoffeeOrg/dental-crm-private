'use client'

/**
 * Phase 2a.8 \u2014 Treatment Offerings settings tab.
 *
 * Lives inside the Workflow section of /settings (see SettingsTabs) and is also
 * available as a deep-link at /settings/treatments. Lets practices:
 *   1. Toggle which of the 20 canonical UK treatments they currently offer.
 *   2. Add/edit custom treatments (e.g. "Sleep Dentistry") outside that list.
 *   3. Configure pipeline + stage + lead value range per offering, the same
 *      fields the lead ingestion engine reads in `deal-creation.ts`.
 *
 * Architecture:
 *   - Client component (matches WidgetSettingsForm); loads via authFetch.
 *   - Single GET round-trip pulls treatment_types + offerings + pipelines +
 *     stages so the drawer dropdowns don\u2019t need their own fetches.
 *   - Mutations re-merge the server-returned row into local state \u2014 no full
 *     reload after each toggle/save (snappy UX, fewer requests).
 *   - 403 is surfaced as a "no access" card matching booking-widget settings.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil, Plus, ShieldAlert, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { authFetch } from '@/lib/auth-fetch'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { TreatmentOfferingDrawer, type DrawerMode } from './treatment-offering-drawer'
import type {
  OfferingRow,
  PipelineRow,
  StageRow,
  TreatmentOfferingsApiResponse,
  TreatmentTypeRow,
} from './treatment-offerings-types'

interface TreatmentOfferingsTabProps {
  // Optional embed flag \u2014 when true the page-level title/breadcrumb is omitted
  // because the parent (settings tab grid) already renders one.
  embedded?: boolean
}

function formatValueRange(min: number | null, max: number | null): string {
  if (min == null && max == null) return '\u2014'
  const fmt = (cents: number) =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100)
  if (min != null && max != null) return `${fmt(min)} \u2013 ${fmt(max)}`
  if (min != null) return `From ${fmt(min)}`
  return `Up to ${fmt(max as number)}`
}

export function TreatmentOfferingsTab({ embedded = false }: TreatmentOfferingsTabProps) {
  const [loading, setLoading] = useState(true)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [treatmentTypes, setTreatmentTypes] = useState<TreatmentTypeRow[]>([])
  const [offerings, setOfferings] = useState<OfferingRow[]>([])
  const [pipelines, setPipelines] = useState<PipelineRow[]>([])
  const [stages, setStages] = useState<StageRow[]>([])
  const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null)
  const [togglingTypeIds, setTogglingTypeIds] = useState<Set<string>>(new Set())

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/settings/treatment-offerings')
      const data = await res.json().catch(() => ({}))
      if (res.status === 403) {
        setPermissionDenied(true)
        return
      }
      if (!res.ok) {
        setError(data?.error ?? 'Failed to load treatment offerings')
        return
      }
      const payload = data as TreatmentOfferingsApiResponse
      setTreatmentTypes(payload.treatment_types ?? [])
      setOfferings(payload.offerings ?? [])
      setPipelines(payload.pipelines ?? [])
      setStages(payload.stages ?? [])
      setPermissionDenied(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load treatment offerings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // Index for fast lookups during render. Canonical types map 1:1 to a single
  // active offering (enforced by the toggle endpoint); we just take the most
  // recent if duplicates ever sneak in.
  const offeringByTypeId = useMemo(() => {
    const map = new Map<string, OfferingRow>()
    for (const row of offerings) {
      if (!row.treatment_type_id) continue
      const existing = map.get(row.treatment_type_id)
      if (!existing || (row.created_at ?? '') > (existing.created_at ?? '')) {
        map.set(row.treatment_type_id, row)
      }
    }
    return map
  }, [offerings])

  const customOfferings = useMemo(
    () => offerings.filter((o) => o.treatment_type_id === null),
    [offerings]
  )

  const pipelineNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of pipelines) map.set(p.id, p.name)
    return map
  }, [pipelines])

  const upsertOffering = (next: OfferingRow) => {
    setOfferings((prev) => {
      const idx = prev.findIndex((o) => o.id === next.id)
      if (idx === -1) return [...prev, next]
      const copy = prev.slice()
      copy[idx] = next
      return copy
    })
  }

  async function handleToggle(typeRow: TreatmentTypeRow, nextValue: boolean) {
    setTogglingTypeIds((prev) => {
      const next = new Set(prev)
      next.add(typeRow.id)
      return next
    })
    try {
      const res = await authFetch('/api/settings/treatment-offerings/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treatment_type_id: typeRow.id, is_active: nextValue }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Toggle failed')
        return
      }
      if (data.offering) {
        upsertOffering(data.offering as OfferingRow)
      } else if (data.state === 'noop') {
        // already in target state \u2014 nothing to do.
      }
      toast.success(
        nextValue ? `${typeRow.display_name} enabled` : `${typeRow.display_name} disabled`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Toggle failed')
    } finally {
      setTogglingTypeIds((prev) => {
        const next = new Set(prev)
        next.delete(typeRow.id)
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-6 py-12 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading treatment offerings\u2026
      </div>
    )
  }

  if (permissionDenied) {
    return (
      <Card className="mx-6 my-12 max-w-2xl border-amber-300 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <h2 className="text-base font-semibold text-amber-900">No access</h2>
            <p className="mt-1 text-sm text-amber-800">
              You don\u2019t have permission to manage treatment offerings. Ask your owner or admin
              to grant you the <code>pipeline.edit</code> permission.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="mx-6 my-12 max-w-2xl border-red-300 bg-red-50 p-6 text-sm text-red-900">
        {error}
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className={embedded ? 'space-y-8' : 'space-y-8 px-6 py-6'}>
      {!embedded && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Treatment Offerings</h1>
            <p className="text-sm text-slate-600">
              Manage which treatments your practice offers and how leads route through your
              pipelines.
            </p>
          </div>
          <Button onClick={() => setDrawerMode({ kind: 'add-custom' })}>
            <Plus className="mr-2 h-4 w-4" />
            Add custom treatment
          </Button>
        </div>
      )}

      {embedded && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Treatment Offerings</h2>
            <p className="text-sm text-slate-600">
              Manage which treatments your practice offers and how leads route through your
              pipelines.
            </p>
          </div>
          <Button onClick={() => setDrawerMode({ kind: 'add-custom' })}>
            <Plus className="mr-2 h-4 w-4" />
            Add custom treatment
          </Button>
        </div>
      )}

      {/* Section 1: Standard treatments */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Standard treatments
          </h3>
          <p className="text-xs text-slate-500">
            The canonical UK treatment list. Toggle each one to indicate whether you currently
            offer it.
          </p>
        </div>

        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-slate-100">
            {treatmentTypes.map((tt) => {
              const offering = offeringByTypeId.get(tt.id) ?? null
              const isActive = offering?.is_active ?? false
              const toggling = togglingTypeIds.has(tt.id)
              return (
                <li
                  key={tt.id}
                  className={
                    'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6 ' +
                    (isActive ? '' : 'bg-slate-50')
                  }
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          'truncate text-sm font-medium ' +
                          (isActive ? 'text-slate-900' : 'text-slate-500')
                        }
                      >
                        {tt.display_name}
                      </span>
                      {offering?.custom_label && (
                        <span className="truncate text-xs text-slate-500">
                          \u2192 \u201c{offering.custom_label}\u201d
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 truncate text-xs text-slate-600">
                    {isActive && offering ? pipelineNameById.get(offering.pipeline_id) ?? '\u2014' : '\u2014'}
                  </div>

                  <div className="min-w-0 truncate text-xs text-slate-600">
                    {isActive && offering
                      ? formatValueRange(
                          offering.custom_lead_value_cents_min,
                          offering.custom_lead_value_cents_max
                        )
                      : '\u2014'}
                  </div>

                  <div className="flex items-center gap-3">
                    {isActive && offering && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDrawerMode({ kind: 'edit', offering, treatmentType: tt })
                        }
                        aria-label={`Edit ${tt.display_name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Switch
                      checked={isActive}
                      disabled={toggling}
                      onCheckedChange={(v) => void handleToggle(tt, v)}
                      aria-label={`Toggle ${tt.display_name}`}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      </section>

      {/* Section 2: Custom treatments */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Custom treatments
          </h3>
          <p className="text-xs text-slate-500">
            Treatments specific to your practice, outside the standard list.
          </p>
        </div>

        {customOfferings.length === 0 ? (
          <Card className="flex flex-col items-center justify-center px-6 py-10 text-center">
            <Sparkles className="mb-2 h-6 w-6 text-slate-400" />
            <p className="text-sm text-slate-700">No custom treatments yet.</p>
            <p className="mt-1 text-xs text-slate-500">
              Click <strong>Add custom treatment</strong> above to create one.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-slate-100">
              {customOfferings.map((offering) => {
                const label = offering.custom_label ?? '(unnamed)'
                return (
                  <li
                    key={offering.id}
                    className={
                      'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6 ' +
                      (offering.is_active ? '' : 'bg-slate-50')
                    }
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            'truncate text-sm font-medium ' +
                            (offering.is_active ? 'text-slate-900' : 'text-slate-500')
                          }
                        >
                          {label}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Custom
                        </Badge>
                      </div>
                    </div>

                    <div className="min-w-0 truncate text-xs text-slate-600">
                      {pipelineNameById.get(offering.pipeline_id) ?? '\u2014'}
                    </div>

                    <div className="min-w-0 truncate text-xs text-slate-600">
                      {formatValueRange(
                        offering.custom_lead_value_cents_min,
                        offering.custom_lead_value_cents_max
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDrawerMode({ kind: 'edit', offering, treatmentType: null })
                        }
                        aria-label={`Edit ${label}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={offering.is_active}
                        onCheckedChange={async (v) => {
                          // Custom offerings don\u2019t go through the toggle endpoint
                          // (which is keyed on treatment_type_id). We PATCH the
                          // is_active field directly instead.
                          try {
                            const res = await authFetch(
                              `/api/settings/treatment-offerings/${offering.id}`,
                              {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ is_active: v }),
                              }
                            )
                            const data = await res.json().catch(() => ({}))
                            if (!res.ok) {
                              toast.error(data?.error ?? 'Toggle failed')
                              return
                            }
                            upsertOffering(data.offering as OfferingRow)
                            toast.success(v ? `${label} enabled` : `${label} disabled`)
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'Toggle failed')
                          }
                        }}
                        aria-label={`Toggle ${label}`}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
      </section>

      <TreatmentOfferingDrawer
        open={drawerMode !== null}
        mode={drawerMode}
        pipelines={pipelines}
        stages={stages}
        onClose={() => setDrawerMode(null)}
        onSaved={(offering) => upsertOffering(offering)}
        onDeleted={(id) => setOfferings((prev) => prev.filter((o) => o.id !== id))}
      />
    </div>
  )
}
