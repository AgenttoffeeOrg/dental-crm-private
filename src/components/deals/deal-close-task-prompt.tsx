'use client'

/**
 * Phase 2b.67 — DealCloseTaskPrompt.
 *
 * Renders the "This deal has N open tasks — close them?" modal when
 * a deal moves into a closed_won or closed_lost stage AND it has
 * 1+ open tasks. Per the 2026-05-24 product decision (Q4):
 * default-all-checked + per-task un-tick + [Skip] / [Close N tasks]
 * buttons.
 *
 * Mounting pattern: parent (Kanban / deal slide-in / deal detail
 * page) renders this once and controls `open`. On mount when
 * `open === true && dealId`, the modal fetches the deal's open
 * tasks. If zero, it auto-closes (silent — no need to bother the
 * operator). Otherwise renders the list with checkboxes.
 */

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface OpenTask {
  id: string
  title: string
  due_at: string | null
  priority: string | null
  task_type: string | null
  status: string
}

interface DealCloseTaskPromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dealId: string | null
  dealTitle?: string | null
  /** "Won" / "Lost" — used in the prompt copy. */
  closedAs?: 'Won' | 'Lost' | null
  /** Called after the operator decides (Skip or Close), regardless
   *  of which. Lets the parent refresh its task lists. */
  onResolved?: () => void
}

export function DealCloseTaskPrompt({
  open,
  onOpenChange,
  dealId,
  dealTitle,
  closedAs,
  onResolved,
}: DealCloseTaskPromptProps) {
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [tasks, setTasks] = useState<OpenTask[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Fetch open tasks when the modal opens. If zero, auto-close so
  // the operator isn't shown an empty prompt.
  useEffect(() => {
    if (!open || !dealId) return
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/deals/${dealId}/close-open-tasks`, {
          credentials: 'include',
        })
        if (!res.ok) {
          toast.error('Could not load this deal\'s open tasks.')
          onOpenChange(false)
          return
        }
        const body = (await res.json()) as { open_tasks: OpenTask[] }
        if (cancelled) return
        if (body.open_tasks.length === 0) {
          // Silent close — no work to do.
          onOpenChange(false)
          onResolved?.()
          return
        }
        setTasks(body.open_tasks)
        // Default-all-checked per the product decision.
        setSelectedIds(new Set(body.open_tasks.map((t) => t.id)))
      } catch (err) {
        console.error('[deal-close-task-prompt] load failed', err)
        onOpenChange(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dealId])

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSkip = () => {
    onOpenChange(false)
    onResolved?.()
  }

  const handleCloseSelected = async () => {
    if (!dealId) return
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      // No tasks selected = same effect as Skip.
      handleSkip()
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/deals/${dealId}/close-open-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ task_ids: ids }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        toast.error(body?.message ?? 'Could not close tasks.')
        return
      }
      const body = (await res.json()) as {
        closed_count: number
        skipped_count: number
        note?: string
      }
      const noun = body.closed_count === 1 ? 'task' : 'tasks'
      toast.success(
        `${body.closed_count} ${noun} closed${
          body.skipped_count > 0
            ? ` (${body.skipped_count} were already closed by someone else)`
            : ''
        }.`
      )
      onResolved?.()
      onOpenChange(false)
    } catch (err) {
      console.error('[deal-close-task-prompt] close failed', err)
      toast.error('Network error — try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {loading
              ? 'Checking for open tasks…'
              : `This deal has ${tasks.length} open task${tasks.length === 1 ? '' : 's'}`}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500">
            No open tasks on this deal.
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-3">
              {dealTitle ? `"${dealTitle}"` : 'This deal'} was just closed
              {closedAs ? ` (${closedAs})` : ''}. Do you want to close these
              open tasks too? Un-tick anything you'd like to preserve.
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto border border-gray-200 rounded-md p-3">
              {tasks.map((t) => (
                <label
                  key={t.id}
                  className="flex items-start gap-2.5 cursor-pointer hover:bg-gray-50 p-1.5 rounded"
                >
                  <Checkbox
                    checked={selectedIds.has(t.id)}
                    onCheckedChange={() => toggle(t.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 truncate">
                      {t.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t.due_at
                        ? formatDistanceToNow(new Date(t.due_at), { addSuffix: true })
                        : 'No due date'}
                      {t.priority && t.priority !== 'normal' ? ` · ${t.priority}` : ''}
                      {t.task_type ? ` · ${t.task_type}` : ''}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 mt-4">
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={busy}
                className="text-gray-600"
              >
                Skip — leave all open
              </Button>
              <Button onClick={() => void handleCloseSelected()} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Closing…
                  </>
                ) : (
                  <>
                    Close {selectedIds.size} task{selectedIds.size === 1 ? '' : 's'}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
