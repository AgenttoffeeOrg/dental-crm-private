'use client'

import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  type DealForAttachment,
  fetchMaxActivityTimestampsForDeals,
  isDealClosedByStage,
  isDealOpen,
  partitionDealsForDropdown,
} from '@/lib/deal-resolver'
import { createClient } from '@/lib/supabase-client'

export interface ChangeDealAffordanceProps {
  activityId?: string
  currentDealId: string | null
  currentDealTitle: string | null
  contactId: string
  tenantId: string
  deals: DealForAttachment[]
  onChange?: (newDealId: string | null) => void
  mode: 'patch' | 'preview'
  /** Pre-computed activity timestamps per deal (optional; fetched if omitted). */
  activityTimestamps?: Map<string, string>
}

type PendingTarget = {
  dealId: string | null
  title: string
}

export function ChangeDealAffordance({
  activityId,
  currentDealId,
  currentDealTitle,
  contactId,
  tenantId,
  deals,
  onChange,
  mode,
  activityTimestamps: activityTimestampsProp,
}: ChangeDealAffordanceProps) {
  const [pending, setPending] = useState<PendingTarget | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [timestamps, setTimestamps] = useState<Map<string, string>>(
    activityTimestampsProp ?? new Map()
  )

  if (!deals.length) return null

  const { open, closed } = useMemo(() => {
    return partitionDealsForDropdown(deals, timestamps)
  }, [deals, timestamps])

  const ensureTimestamps = async () => {
    if (activityTimestampsProp) return
    if (timestamps.size > 0) return
    const supabase = createClient()
    const map = await fetchMaxActivityTimestampsForDeals(
      supabase,
      tenantId,
      deals.map((d) => d.id)
    )
    setTimestamps(map)
  }

  const openConfirm = (target: PendingTarget) => {
    setPending(target)
    setConfirmOpen(true)
  }

  const applyChange = async (target: PendingTarget) => {
    if (mode === 'preview') {
      onChange?.(target.dealId)
      return
    }

    if (!activityId) {
      toast.error('Missing activity id for reassignment')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const authHeaders = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}

      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({ deal_id: target.dealId }),
      })

      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || 'Failed to update deal')
      }

      onChange?.(target.dealId)
      toast.success(
        target.dealId ? `Activity moved to ${target.title}` : 'Activity detached from deal'
      )
    } catch (err) {
      console.error('[ChangeDealAffordance] PATCH failed', err)
      toast.error(err instanceof Error ? err.message : 'Failed to update deal')
    } finally {
      setSaving(false)
    }
  }

  const handlePick = (target: PendingTarget) => {
    if (target.dealId === currentDealId) return
    openConfirm(target)
  }

  const chipLabel = currentDealTitle
    ? `Deal: ${currentDealTitle}`
    : 'No deal · Attach'

  const relativeLabel = (dealId: string) => {
    const ts = timestamps.get(dealId)
    if (!ts) return null
    try {
      return formatDistanceToNow(new Date(ts), { addSuffix: true })
    } catch {
      return null
    }
  }

  return (
    <>
      <DropdownMenu
        modal={false}
        onOpenChange={(open) => open && void ensureTimestamps()}
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 border-purple-200 bg-purple-50 text-purple-900 hover:bg-purple-100"
          >
            <span className="max-w-[200px] truncate text-xs font-medium">{chipLabel}</span>
            <span className="text-xs text-purple-600">Change</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          {open.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs text-gray-500">Open deals</DropdownMenuLabel>
              {open.map((deal) => (
                <DropdownMenuItem
                  key={deal.id}
                  data-testid={`deal-option-${deal.id}`}
                  onClick={() => handlePick({ dealId: deal.id, title: deal.title })}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{deal.title}</span>
                    {relativeLabel(deal.id) && (
                      <span className="text-xs text-gray-500">
                        last active {relativeLabel(deal.id)}
                      </span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
          {closed.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs text-gray-400">Closed deals</DropdownMenuLabel>
              {closed.map((deal) => (
                <DropdownMenuItem
                  key={deal.id}
                  data-testid={`deal-option-${deal.id}`}
                  className="text-gray-500"
                  onClick={() => handlePick({ dealId: deal.id, title: deal.title })}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span>{deal.title}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {deal.stage?.is_won ? 'Won' : 'Lost'}
                    </Badge>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            data-testid="deal-option-detach"
            onClick={() => handlePick({ dealId: null, title: 'No deal' })}
          >
            Detach (no deal)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change deal?</AlertDialogTitle>
            <AlertDialogDescription>
              Move this activity to {pending?.title ?? 'another deal'}? The original send time and
              any first-response timestamp won&apos;t change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={async (e) => {
                e.preventDefault()
                if (!pending) return
                await applyChange(pending)
                setConfirmOpen(false)
                setPending(null)
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export { isDealOpen, isDealClosedByStage }
