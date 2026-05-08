'use client'

/**
 * Phase 2b.1.b.2 — confirmation dialog for the Disconnect Google Ads action.
 * Disconnect is outbound-only — the inbound webhook keeps working.
 */

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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

export function DisconnectDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const [working, setWorking] = useState(false)
  const onConfirm = useCallback(async () => {
    setWorking(true)
    try {
      const res = await fetch('/api/integrations/google-ads/disconnect', {
        method: 'POST',
      })
      if (res.status === 401) {
        globalThis.location.assign('/login')
        return
      }
      if (!res.ok) {
        toast.error('Could not disconnect. Please retry.')
        return
      }
      toast.success('Google Ads disconnected.')
      router.refresh()
    } catch {
      toast.error("Couldn't reach the server, please retry.")
    } finally {
      setWorking(false)
      onOpenChange(false)
    }
  }, [router, onOpenChange])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect Google Ads?</AlertDialogTitle>
          <AlertDialogDescription>
            Conversions will stop firing back to Google Ads. The webhook URL keeps
            working — leads will still arrive in this CRM.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              void onConfirm()
            }}
            disabled={working}
            data-testid="disconnect-confirm"
          >
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
