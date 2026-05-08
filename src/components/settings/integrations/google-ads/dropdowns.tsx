'use client'

/**
 * Phase 2b.1.b.2 — customer + conversion-action dropdowns used in the
 * outbound-targets picker. Both render their own loading / error / revoked
 * branches so the picker itself stays small.
 */

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  ConversionActionOption,
  CustomerOption,
  ListState,
} from './types'

function RevokedReconnectLink({ testid }: { testid: string }) {
  return (
    <p className="text-sm text-red-700" data-testid={testid}>
      Your connection to Google was revoked.{' '}
      <a className="underline" href="/api/integrations/google-ads/oauth/initiate">
        Reconnect
      </a>
    </p>
  )
}

function RetryLink({ testid, label }: { testid: string; label: string }) {
  return (
    <p className="text-sm text-red-700" data-testid={testid}>
      {label}{' '}
      <button
        type="button"
        className="underline"
        onClick={() => globalThis.location.reload()}
      >
        Retry
      </button>
    </p>
  )
}

export function CustomerDropdown({
  state,
  selected,
  onSelect,
}: {
  state: ListState<CustomerOption>
  selected: string
  onSelect: (v: string) => void
}) {
  if (state.kind === 'loading') {
    return (
      <p className="text-sm text-gray-500" data-testid="customers-loading">
        Loading your Google Ads accounts…
      </p>
    )
  }
  if (state.kind === 'oauth_revoked') {
    return <RevokedReconnectLink testid="customers-oauth-revoked" />
  }
  if (state.kind === 'error') {
    return <RetryLink testid="customers-error" label="Couldn't load accounts." />
  }
  return (
    <div className="space-y-1">
      <Label>Google Ads account</Label>
      <Select value={selected} onValueChange={onSelect}>
        <SelectTrigger data-testid="customer-select-trigger">
          <SelectValue placeholder="Select an account" />
        </SelectTrigger>
        <SelectContent>
          {state.items.map((c) => (
            <SelectItem key={c.customer_id} value={c.customer_id}>
              Account {c.customer_id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function ConversionActionDropdown({
  state,
  selected,
  onSelect,
  disabled,
}: {
  state: ListState<ConversionActionOption>
  selected: string
  onSelect: (v: string) => void
  disabled: boolean
}) {
  if (disabled) {
    return (
      <div className="space-y-1">
        <Label>Conversion action</Label>
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Pick an account first" />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    )
  }
  if (state.kind === 'loading') {
    return (
      <p className="text-sm text-gray-500" data-testid="actions-loading">
        Loading conversion actions…
      </p>
    )
  }
  if (state.kind === 'oauth_revoked') {
    return <RevokedReconnectLink testid="actions-oauth-revoked" />
  }
  if (state.kind === 'error') {
    return <RetryLink testid="actions-error" label="Couldn't load conversion actions." />
  }
  return (
    <div className="space-y-1">
      <Label>Conversion action</Label>
      <Select value={selected} onValueChange={onSelect}>
        <SelectTrigger data-testid="action-select-trigger">
          <SelectValue placeholder="Select a conversion action" />
        </SelectTrigger>
        <SelectContent>
          {state.items.map((a) => (
            <SelectItem key={a.resource_name} value={a.resource_name}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
