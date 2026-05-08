'use client'

/**
 * Phase 2b.1.b.2 — Settings UI's outbound targets picker.
 *
 * Lives in the post-OAuth, pre-targets state of the page (or when the user
 * clicks "Change customer or conversion action"). Three pieces of state:
 *   - `customer_id`     (from /customers/list)
 *   - `login_customer_id` (manual input — optional manager account)
 *   - `conversion_action_resource_name` (from /conversion-actions/list)
 * On Save: POST /targets, refresh the page so the server component re-renders
 * the fully-configured view.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConversionActionDropdown, CustomerDropdown } from './dropdowns'
import { DisconnectDialog } from './disconnect-dialog'
import { fetchListJson, formatConnectedAt, toListState } from './fetch-helpers'
import type {
  ConversionActionOption,
  CustomerOption,
  ListState,
} from './types'

export function TargetsPicker({
  connectedAt,
  initialLoginCustomerId,
}: {
  connectedAt: string | null
  initialLoginCustomerId: string
}) {
  const router = useRouter()
  const [customers, setCustomers] = useState<ListState<CustomerOption>>({ kind: 'loading' })
  const [loginCustomerId, setLoginCustomerId] = useState(initialLoginCustomerId)
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [conversionActions, setConversionActions] = useState<ListState<ConversionActionOption>>(
    { kind: 'loading' }
  )
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [disconnectOpen, setDisconnectOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetchListJson<{ customers: CustomerOption[] }>(
      '/api/integrations/google-ads/customers/list'
    ).then((r) => {
      if (cancelled) return
      setCustomers(toListState(r, (b) => b.customers ?? []))
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedCustomer) {
      setConversionActions({ kind: 'ready', items: [] })
      return
    }
    let cancelled = false
    setConversionActions({ kind: 'loading' })
    const params = new URLSearchParams({ customer_id: selectedCustomer })
    if (loginCustomerId) params.set('login_customer_id', loginCustomerId)
    void fetchListJson<{ conversion_actions: ConversionActionOption[] }>(
      `/api/integrations/google-ads/conversion-actions/list?${params.toString()}`
    ).then((r) => {
      if (cancelled) return
      setConversionActions(toListState(r, (b) => b.conversion_actions ?? []))
    })
    return () => {
      cancelled = true
    }
  }, [selectedCustomer, loginCustomerId])

  const onSave = useCallback(async () => {
    if (!selectedCustomer || !selectedAction) return
    setSaving(true)
    try {
      const res = await fetch('/api/integrations/google-ads/targets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomer,
          conversion_action_resource_name: selectedAction,
          login_customer_id: loginCustomerId || undefined,
        }),
      })
      if (res.status === 401) {
        globalThis.location.assign('/login')
        return
      }
      if (!res.ok) {
        toast.error('Could not save targets. Please retry.')
        return
      }
      toast.success('Targets saved.')
      router.refresh()
    } catch {
      toast.error("Couldn't reach the server, please retry.")
    } finally {
      setSaving(false)
    }
  }, [selectedCustomer, selectedAction, loginCustomerId, router])

  return (
    <div className="space-y-4">
      {connectedAt && (
        <p className="text-sm text-gray-600" data-testid="oauth-connected-at">
          Connected on {formatConnectedAt(connectedAt)}.
        </p>
      )}

      <CustomerDropdown
        state={customers}
        selected={selectedCustomer}
        onSelect={setSelectedCustomer}
      />

      <ManagerAccountInput value={loginCustomerId} onChange={setLoginCustomerId} />

      <ConversionActionDropdown
        state={conversionActions}
        selected={selectedAction}
        onSelect={setSelectedAction}
        disabled={!selectedCustomer}
      />

      <PickerActions
        canSave={Boolean(selectedCustomer && selectedAction)}
        saving={saving}
        onSave={onSave}
        onDisconnect={() => setDisconnectOpen(true)}
      />

      <DisconnectDialog open={disconnectOpen} onOpenChange={setDisconnectOpen} />
    </div>
  )
}

function ManagerAccountInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor="login-customer-id">Manager account ID (optional)</Label>
      <Input
        id="login-customer-id"
        inputMode="numeric"
        placeholder="e.g. 9374708799"
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        data-testid="login-customer-id-input"
      />
      <p className="text-xs text-gray-500">
        Only fill this in if your Google Ads account is managed by an agency. Most
        practices leave this blank.
      </p>
    </div>
  )
}

function PickerActions({
  canSave,
  saving,
  onSave,
  onDisconnect,
}: {
  canSave: boolean
  saving: boolean
  onSave: () => void
  onDisconnect: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={onSave}
        disabled={saving || !canSave}
        data-testid="save-targets-btn"
      >
        Save
      </Button>
      <Button variant="outline" onClick={onDisconnect} data-testid="disconnect-btn">
        Disconnect
      </Button>
    </div>
  )
}
