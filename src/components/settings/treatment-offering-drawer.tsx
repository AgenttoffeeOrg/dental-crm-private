'use client'

/**
 * Phase 2a.8 \u2014 Edit / Add drawer for treatment offerings.
 *
 * One <Sheet> handles all three modes (edit canonical, edit custom, add custom)
 * because the field set is identical. Differences:
 *   - Canonical: name field is read-only (treatment_types.display_name);
 *     `custom_label` is shown as an optional override.
 *   - Custom (existing or new): `custom_label` IS the name; required, editable.
 *
 * Validation lives in `@/lib/treatment-offerings/schema` and is re-checked on
 * the API side. We do client-side checks for inline error UX but trust the
 * server to be the source of truth.
 */

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { authFetch } from '@/lib/auth-fetch'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { penceToPounds } from '@/lib/treatment-offerings/schema'
import type {
  OfferingRow,
  PipelineRow,
  StageRow,
  TreatmentTypeRow,
} from './treatment-offerings-types'

export type DrawerMode =
  | { kind: 'edit'; offering: OfferingRow; treatmentType: TreatmentTypeRow | null }
  | { kind: 'add-custom' }

interface TreatmentOfferingDrawerProps {
  open: boolean
  mode: DrawerMode | null
  pipelines: PipelineRow[]
  stages: StageRow[]
  onClose: () => void
  onSaved: (offering: OfferingRow) => void
  onDeleted: (offeringId: string) => void
}

interface FormState {
  customLabel: string
  pipelineId: string
  stageId: string | null
  minPounds: string
  maxPounds: string
  isActive: boolean
}

const FIRST_STAGE_VALUE = '__first_stage__'

function emptyForm(defaultPipelineId: string): FormState {
  return {
    customLabel: '',
    pipelineId: defaultPipelineId,
    stageId: null,
    minPounds: '',
    maxPounds: '',
    isActive: true,
  }
}

function formFromOffering(offering: OfferingRow, defaultPipelineId: string): FormState {
  return {
    customLabel: offering.custom_label ?? '',
    pipelineId: offering.pipeline_id || defaultPipelineId,
    stageId: offering.stage_id ?? null,
    minPounds:
      offering.custom_lead_value_cents_min == null
        ? ''
        : String(penceToPounds(offering.custom_lead_value_cents_min) ?? ''),
    maxPounds:
      offering.custom_lead_value_cents_max == null
        ? ''
        : String(penceToPounds(offering.custom_lead_value_cents_max) ?? ''),
    isActive: offering.is_active,
  }
}

function poundsStringToNumberOrNull(input: string): number | null | 'invalid' {
  const trimmed = input.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return 'invalid'
  return n
}

export function TreatmentOfferingDrawer({
  open,
  mode,
  pipelines,
  stages,
  onClose,
  onSaved,
  onDeleted,
}: TreatmentOfferingDrawerProps) {
  const defaultPipelineId =
    pipelines.find((p) => p.is_default)?.id ?? pipelines[0]?.id ?? ''

  const [form, setForm] = useState<FormState>(() => emptyForm(defaultPipelineId))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !mode) return
    if (mode.kind === 'edit') {
      setForm(formFromOffering(mode.offering, defaultPipelineId))
    } else {
      setForm(emptyForm(defaultPipelineId))
    }
    setError(null)
  }, [open, mode, defaultPipelineId])

  const isCustom = mode?.kind === 'add-custom' || mode?.kind === 'edit' && mode.offering.treatment_type_id === null
  const isAdd = mode?.kind === 'add-custom'
  const canonicalDisplayName = mode?.kind === 'edit' ? mode.treatmentType?.display_name ?? null : null

  const stagesForPipeline = useMemo(
    () => stages.filter((s) => s.pipeline_id === form.pipelineId),
    [stages, form.pipelineId]
  )

  // If the chosen pipeline doesn't include the currently-selected stage, drop
  // the selection silently. This mirrors the API-side behaviour and keeps the
  // dropdown in a valid state during pipeline switches.
  useEffect(() => {
    if (form.stageId && !stagesForPipeline.some((s) => s.id === form.stageId)) {
      setForm((f) => ({ ...f, stageId: null }))
    }
  }, [form.stageId, stagesForPipeline])

  const validation = useMemo(() => {
    const issues: { field: keyof FormState; message: string }[] = []
    if (isCustom) {
      const trimmed = form.customLabel.trim()
      if (trimmed.length < 2) {
        issues.push({ field: 'customLabel', message: 'Name must be at least 2 characters' })
      } else if (trimmed.length > 100) {
        issues.push({ field: 'customLabel', message: 'Name must be at most 100 characters' })
      }
    } else if (form.customLabel.trim().length > 100) {
      issues.push({ field: 'customLabel', message: 'Custom label must be at most 100 characters' })
    }
    if (!form.pipelineId) {
      issues.push({ field: 'pipelineId', message: 'Pipeline is required' })
    }
    const min = poundsStringToNumberOrNull(form.minPounds)
    const max = poundsStringToNumberOrNull(form.maxPounds)
    if (min === 'invalid') issues.push({ field: 'minPounds', message: 'Must be a positive number' })
    if (max === 'invalid') issues.push({ field: 'maxPounds', message: 'Must be a positive number' })
    if (
      min !== 'invalid' &&
      max !== 'invalid' &&
      typeof min === 'number' &&
      typeof max === 'number' &&
      max < min
    ) {
      issues.push({ field: 'maxPounds', message: 'Maximum value must be \u2265 minimum' })
    }
    return issues
  }, [form, isCustom])

  const issueByField = useMemo(() => {
    const map: Record<string, string | undefined> = {}
    for (const issue of validation) map[issue.field] = issue.message
    return map
  }, [validation])

  const isValid = validation.length === 0

  if (!open || !mode) {
    // Render the Sheet shell so animations work, but with no body. The parent
    // controls open/close via the prop, so we mount in any state.
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full sm:max-w-lg" />
      </Sheet>
    )
  }

  async function handleSave() {
    if (!mode || !isValid) return
    setSaving(true)
    setError(null)
    try {
      const minNum = poundsStringToNumberOrNull(form.minPounds)
      const maxNum = poundsStringToNumberOrNull(form.maxPounds)
      const trimmedLabel = form.customLabel.trim()

      const body = {
        pipeline_id: form.pipelineId,
        stage_id: form.stageId,
        custom_lead_value_pounds_min: minNum === 'invalid' ? null : minNum,
        custom_lead_value_pounds_max: maxNum === 'invalid' ? null : maxNum,
        // For canonical offerings, an empty label clears the override; for custom
        // offerings the validator above guarantees a non-empty trimmed string.
        custom_label: trimmedLabel ? trimmedLabel : isCustom ? trimmedLabel : null,
      } as Record<string, unknown>

      if (isAdd) {
        const res = await authFetch('/api/settings/treatment-offerings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, treatment_type_id: null }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data?.error ?? 'Save failed')
          return
        }
        toast.success('Custom treatment created')
        onSaved(data.offering as OfferingRow)
        onClose()
      } else if (mode.kind === 'edit') {
        const res = await authFetch(`/api/settings/treatment-offerings/${mode.offering.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, is_active: form.isActive }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data?.error ?? 'Save failed')
          return
        }
        toast.success('Treatment updated')
        onSaved(data.offering as OfferingRow)
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (mode?.kind !== 'edit') return
    if (mode.offering.treatment_type_id !== null) return
    setDeleting(true)
    try {
      const res = await authFetch(`/api/settings/treatment-offerings/${mode.offering.id}`, {
        method: 'DELETE',
      })
      if (res.status === 204) {
        toast.success('Custom treatment deleted')
        onDeleted(mode.offering.id)
        setConfirmDelete(false)
        onClose()
        return
      }
      const data = await res.json().catch(() => ({}))
      setError(data?.error ?? 'Delete failed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const headerTitle = isAdd
    ? 'Add custom treatment'
    : isCustom
      ? 'Edit custom treatment'
      : 'Edit treatment'
  const headerSubtitle = isAdd
    ? 'Create a treatment specific to your practice that isn\u2019t in the standard list.'
    : isCustom
      ? 'Update how leads route through your pipelines for this custom treatment.'
      : 'Update how leads for this standard treatment route through your pipelines.'

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg flex flex-col overflow-y-auto p-0"
        >
          <SheetHeader>
            <SheetTitle>{headerTitle}</SheetTitle>
            <SheetDescription>{headerSubtitle}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 px-8 py-6">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                {error}
              </div>
            )}

            {/* Name */}
            {isCustom ? (
              <div className="grid gap-2">
                <Label htmlFor="custom_label">
                  Treatment name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="custom_label"
                  placeholder="e.g. Sleep Dentistry"
                  value={form.customLabel}
                  onChange={(e) => setForm((f) => ({ ...f, customLabel: e.target.value }))}
                  maxLength={100}
                />
                {issueByField.customLabel && (
                  <p className="text-xs text-red-600">{issueByField.customLabel}</p>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label>Treatment name</Label>
                  <Input value={canonicalDisplayName ?? ''} disabled readOnly />
                  <p className="text-xs text-slate-500">
                    Standard name from the canonical treatments list.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="custom_label">Custom label (optional)</Label>
                  <Input
                    id="custom_label"
                    placeholder='Override how patients see this, e.g. "Routine examination"'
                    value={form.customLabel}
                    onChange={(e) => setForm((f) => ({ ...f, customLabel: e.target.value }))}
                    maxLength={100}
                  />
                  <p className="text-xs text-slate-500">
                    Leave blank to use the standard name. Used in deal titles and lead notifications.
                  </p>
                  {issueByField.customLabel && (
                    <p className="text-xs text-red-600">{issueByField.customLabel}</p>
                  )}
                </div>
              </>
            )}

            {/* Pipeline */}
            <div className="grid gap-2">
              <Label htmlFor="pipeline">
                Pipeline <span className="text-red-600">*</span>
              </Label>
              <Select
                value={form.pipelineId || undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, pipelineId: v }))}
              >
                <SelectTrigger id="pipeline">
                  <SelectValue placeholder="Choose a pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.is_default ? ' (default)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Where deals from leads choosing this treatment land.
              </p>
              {issueByField.pipelineId && (
                <p className="text-xs text-red-600">{issueByField.pipelineId}</p>
              )}
            </div>

            {/* Stage override */}
            <div className="grid gap-2">
              <Label htmlFor="stage">Starting stage</Label>
              <Select
                value={form.stageId ?? FIRST_STAGE_VALUE}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, stageId: v === FIRST_STAGE_VALUE ? null : v }))
                }
              >
                <SelectTrigger id="stage">
                  <SelectValue placeholder="Use first stage by default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FIRST_STAGE_VALUE}>Use first stage by default</SelectItem>
                  {stagesForPipeline.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Override the starting stage if you want these leads to skip the first column.
              </p>
            </div>

            {/* Lead value range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="value_min">Minimum lead value (\u00a3)</Label>
                <Input
                  id="value_min"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="\u2014"
                  value={form.minPounds}
                  onChange={(e) => setForm((f) => ({ ...f, minPounds: e.target.value }))}
                />
                {issueByField.minPounds && (
                  <p className="text-xs text-red-600">{issueByField.minPounds}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="value_max">Maximum lead value (\u00a3)</Label>
                <Input
                  id="value_max"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="\u2014"
                  value={form.maxPounds}
                  onChange={(e) => setForm((f) => ({ ...f, maxPounds: e.target.value }))}
                />
                {issueByField.maxPounds && (
                  <p className="text-xs text-red-600">{issueByField.maxPounds}</p>
                )}
              </div>
            </div>
            <p className="-mt-2 text-xs text-slate-500">
              We use the midpoint of these values as the deal\u2019s estimated value. Leave blank if
              you don\u2019t want an estimate.
            </p>

            {/* Active toggle (edit mode only) */}
            {!isAdd && mode.kind === 'edit' && (
              <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
                <div>
                  <Label className="text-sm font-medium">Currently offering this treatment</Label>
                  <p className="text-xs text-slate-500">
                    When off, the treatment hides from booking widgets and incoming leads route
                    to your default pipeline as a generic Inquiry.
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
              </div>
            )}

            {/* Delete (custom only) */}
            {!isAdd && mode.kind === 'edit' && mode.offering.treatment_type_id === null && (
              <div className="border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete this custom treatment
                </button>
                <p className="mt-1 text-xs text-slate-500">
                  Existing deals on this treatment are preserved.
                </p>
              </div>
            )}
          </div>

          <SheetFooter>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!isValid || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isAdd ? 'Create' : 'Save changes'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this custom treatment?</AlertDialogTitle>
            <AlertDialogDescription>
              The treatment will be removed from your settings. Existing deals stay where they are
              \u2014 only future leads are affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
