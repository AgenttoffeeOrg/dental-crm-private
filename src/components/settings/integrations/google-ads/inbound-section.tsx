'use client'

/**
 * Phase 2b.1.b.2 — Settings UI's inbound webhook section.
 *
 * Shows the webhook URL + key (with copy buttons) when a config exists,
 * or a "Generate webhook key" CTA when first-time setup. Rotation is
 * gated behind a confirmation dialog explaining that OAuth + targets are
 * preserved across the rotation.
 */

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import type { GoogleAdsConfig } from './types'

export function InboundWebhookSection({
  config,
  webhookUrl,
}: {
  config: GoogleAdsConfig | null
  webhookUrl: string
}) {
  const router = useRouter()
  const [rotateOpen, setRotateOpen] = useState(false)
  const [working, setWorking] = useState(false)

  const rotate = useCallback(async () => {
    setWorking(true)
    try {
      const res = await fetch('/api/integrations/google-ads/webhook/rotate', {
        method: 'POST',
      })
      if (res.status === 401) {
        globalThis.location.assign('/login')
        return
      }
      if (!res.ok) {
        toast.error('Could not generate webhook key. Please retry.')
        return
      }
      router.refresh()
      toast.success('Webhook key updated.')
    } catch {
      toast.error("Couldn't reach the server, please retry.")
    } finally {
      setWorking(false)
      setRotateOpen(false)
    }
  }, [router])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receive leads from Google Ads</CardTitle>
        <CardDescription>
          Paste these into your Google Lead Form Extension to receive leads in this CRM.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {config ? (
          <ExistingKeyView
            config={config}
            webhookUrl={webhookUrl}
            onRotateClick={() => setRotateOpen(true)}
          />
        ) : (
          <EmptyKeyView working={working} onGenerate={rotate} />
        )}
      </CardContent>

      <RotateConfirmDialog
        open={rotateOpen}
        working={working}
        onOpenChange={setRotateOpen}
        onConfirm={rotate}
      />
    </Card>
  )
}

function EmptyKeyView({ working, onGenerate }: { working: boolean; onGenerate: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        No webhook key generated yet. Generate one to start receiving leads.
      </p>
      <Button onClick={onGenerate} disabled={working} data-testid="generate-webhook-btn">
        Generate webhook key
      </Button>
    </div>
  )
}

function ExistingKeyView({
  config,
  webhookUrl,
  onRotateClick,
}: {
  config: GoogleAdsConfig
  webhookUrl: string
  onRotateClick: () => void
}) {
  return (
    <div className="space-y-4">
      <CopyField label="Webhook URL" value={webhookUrl} testid="webhook-url" />
      <CopyField label="Webhook key" value={config.webhook_key ?? ''} testid="webhook-key" />
      <div>
        <Button variant="outline" onClick={onRotateClick} data-testid="rotate-webhook-btn">
          Rotate key
        </Button>
      </div>
    </div>
  )
}

function CopyField({
  label,
  value,
  testid,
}: {
  label: string
  value: string
  testid?: string
}) {
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }, [label, value])
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} data-testid={testid} className="font-mono" />
        <Button variant="outline" type="button" onClick={copy}>
          Copy
        </Button>
      </div>
    </div>
  )
}

function RotateConfirmDialog({
  open,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  working: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => Promise<void>
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rotate webhook key?</AlertDialogTitle>
          <AlertDialogDescription>
            Rotating will invalidate the current key. You&apos;ll need to update Google
            Ads with the new key. Your OAuth connection and conversion targets stay
            connected.
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
            data-testid="rotate-webhook-confirm"
          >
            Rotate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
