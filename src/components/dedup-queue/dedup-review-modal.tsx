'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { authFetch } from '@/lib/auth-fetch'
import { sourceChannelToLabel } from '@/lib/lead-ingestion/source-labels'
import {
  DedupSignalsExplainer,
  type DedupSignals,
} from './dedup-signals-explainer'
import { DedupMatchCard, type DedupMatchedContact } from './dedup-match-card'
import { DedupActions, type ResolveAction } from './dedup-actions'

export interface DedupQueueItem {
  id: string
  candidate_payload: Record<string, unknown>
  candidate_email: string | null
  candidate_phone: string | null
  candidate_name: string | null
  source_channel: string | null
  matched_contact_ids: string[]
  match_signals: DedupSignals
  status: string
  created_at: string
  expires_at: string | null
  resolved_at: string | null
  resolved_by_user_id: string | null
  resolved_contact_id?: string | null
  resolution_notes: string | null
  matched_contacts: DedupMatchedContact[]
}

interface Props {
  item: DedupQueueItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onResolved: () => void
}

/**
 * Phase 2a.2b — comparison modal showing the candidate vs every matched
 * contact, plus the signals explainer and resolve actions. POSTs to
 * /api/dedup-queue/[id]/resolve and notifies the parent on success.
 */
export function DedupReviewModal({ item, open, onOpenChange, onResolved }: Props) {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  // Reset transient state whenever a new item is loaded.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelectedMatchId(null)
      setNotes('')
    }
    onOpenChange(next)
  }

  if (!item) return null

  const candidate = (item.candidate_payload ?? {}) as Record<string, unknown>
  const candidateName =
    item.candidate_name ||
    pickString(candidate, ['full_name', 'name']) ||
    'Unknown lead'
  const candidateEmail = item.candidate_email ?? pickString(candidate, ['email'])
  const candidatePhone = item.candidate_phone ?? pickString(candidate, ['phone'])
  const treatment = pickString(candidate, ['treatment_label', 'treatment_intent', 'message'])
  const submittedAt = (() => {
    try {
      return format(new Date(item.created_at), 'PPpp')
    } catch {
      return item.created_at
    }
  })()

  const handleResolve = async (
    action: ResolveAction,
    extra: { merge_into_contact_id?: string; notes?: string }
  ) => {
    setBusy(true)
    try {
      const res = await authFetch(`/api/dedup-queue/${item.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data: { error?: string; contact?: { full_name?: string | null } } =
        await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(data.error ?? `Failed to ${action.replace('_', ' ')}`)
        return
      }

      if (action === 'merge') {
        toast.success(
          `Merged into ${data.contact?.full_name ?? 'existing contact'}`
        )
      } else if (action === 'create_new') {
        toast.success('Created as new contact')
      } else {
        toast.success('Dismissed')
      }
      onResolved()
      handleOpenChange(false)
    } catch (err) {
      console.error('[DedupReviewModal] resolve failed', err)
      toast.error('Network error — please try again')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review possible duplicate</DialogTitle>
          <DialogDescription>
            We weren't sure if this lead matched an existing contact. Choose an
            action below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Section 1 — Candidate */}
          <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              New lead
            </h3>
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Field label="Name" value={candidateName} />
              <Field label="Email" value={candidateEmail ?? '—'} />
              <Field label="Phone" value={candidatePhone ?? '—'} />
              <Field
                label="Source"
                value={sourceChannelToLabel(item.source_channel)}
              />
              {treatment && <Field label="Treatment" value={treatment} />}
              <Field label="Submitted" value={submittedAt} />
            </dl>
          </section>

          {/* Section 2 — Possible matches */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Possible matches ({item.matched_contacts.length})
            </h3>
            {item.matched_contacts.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No live matched contacts. Use "Create new contact" or "Dismiss".
              </p>
            ) : (
              <div className="space-y-2">
                {item.matched_contacts.map((c) => (
                  <DedupMatchCard
                    key={c.id}
                    contact={c}
                    selected={selectedMatchId === c.id}
                    onSelect={setSelectedMatchId}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Section 3 — Signals explainer */}
          <DedupSignalsExplainer signals={item.match_signals ?? {}} />

          {/* Sections 4 + 5 — Notes + actions */}
          <DedupActions
            notes={notes}
            onNotesChange={setNotes}
            selectedMatchContactId={selectedMatchId}
            onResolve={handleResolve}
            busy={busy}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-gray-900 break-words">{value}</dd>
    </div>
  )
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === 'string' && v.trim().length > 0) return v
  }
  return null
}
