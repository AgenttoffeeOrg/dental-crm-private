'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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

export type ResolveAction = 'merge' | 'create_new' | 'dismiss'

interface Props {
  notes: string
  onNotesChange: (value: string) => void
  selectedMatchContactId: string | null
  onResolve: (
    action: ResolveAction,
    extra: { merge_into_contact_id?: string; notes?: string }
  ) => Promise<void>
  busy: boolean
}

/**
 * Phase 2a.2b — three-button bottom bar inside the dedup review modal:
 * Merge / Create new / Dismiss + an optional notes field. Dismiss requires
 * a confirmation dialog because it's irreversible.
 */
export function DedupActions({
  notes,
  onNotesChange,
  selectedMatchContactId,
  onResolve,
  busy,
}: Props) {
  const [confirmDismiss, setConfirmDismiss] = useState(false)

  const handleMerge = async () => {
    if (!selectedMatchContactId) return
    await onResolve('merge', {
      merge_into_contact_id: selectedMatchContactId,
      notes: notes.trim() || undefined,
    })
  }

  const handleCreateNew = async () => {
    await onResolve('create_new', { notes: notes.trim() || undefined })
  }

  const handleDismissConfirmed = async () => {
    setConfirmDismiss(false)
    await onResolve('dismiss', { notes: notes.trim() || undefined })
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="dedup-notes"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Notes <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <Textarea
          id="dedup-notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add a note explaining your decision (optional)"
          maxLength={2000}
          rows={2}
          disabled={busy}
        />
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
        <Button
          variant="destructive"
          disabled={busy}
          onClick={() => setConfirmDismiss(true)}
        >
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden /> : null}
          Dismiss
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={handleCreateNew}
        >
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden /> : null}
          Create new contact
        </Button>
        <Button
          variant="default"
          disabled={busy || !selectedMatchContactId}
          onClick={handleMerge}
        >
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden /> : null}
          Merge into selected
        </Button>
      </div>

      <AlertDialog open={confirmDismiss} onOpenChange={setConfirmDismiss}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dismiss this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The candidate will be removed from the
              review queue without creating or updating any contact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDismissConfirmed} disabled={busy}>
              Yes, dismiss
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
