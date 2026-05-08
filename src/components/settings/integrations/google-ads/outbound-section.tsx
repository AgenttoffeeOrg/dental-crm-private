'use client'

/**
 * Phase 2b.1.b.2 — Settings UI's outbound conversions section.
 *
 * Renders the appropriate state based on the active config row:
 *   - null         → disabled empty state ("set up the webhook first")
 *   - !has_oauth   → "Connect Google Ads" CTA
 *   - missing targets → <TargetsPicker>
 *   - all set      → <FullyConfiguredView>
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TargetsPicker } from './targets-picker'
import { DisconnectDialog } from './disconnect-dialog'
import { fetchListJson, formatConnectedAt } from './fetch-helpers'
import type { ConversionActionOption, GoogleAdsConfig } from './types'

export function OutboundConversionsSection({
  config,
}: {
  config: GoogleAdsConfig | null
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Send conversions back to Google Ads</CardTitle>
        <CardDescription>
          Tells Google when a lead converts, so its bidding gets smarter over time.
          Optional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <OutboundBody config={config} />
      </CardContent>
    </Card>
  )
}

function OutboundBody({ config }: { config: GoogleAdsConfig | null }) {
  if (!config) {
    return (
      <p className="text-sm text-gray-500" data-testid="outbound-disabled">
        Set up the webhook above first, then you can connect your Google Ads account here.
      </p>
    )
  }
  if (!config.has_oauth) {
    return <ConnectGoogleAdsCta />
  }
  if (!config.customer_id || !config.conversion_action_resource_name) {
    return (
      <TargetsPicker
        connectedAt={config.oauth_connected_at}
        initialLoginCustomerId={config.login_customer_id ?? ''}
      />
    )
  }
  return <FullyConfiguredView config={config} />
}

function ConnectGoogleAdsCta() {
  return (
    <div className="space-y-3">
      <a
        href="/api/integrations/google-ads/oauth/initiate"
        className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        data-testid="connect-google-ads-btn"
      >
        Connect Google Ads
      </a>
      <p className="text-sm text-gray-600">
        You&apos;ll be redirected to Google to sign in and authorise this CRM. We never
        see your password.
      </p>
    </div>
  )
}

function FullyConfiguredView({ config }: { config: GoogleAdsConfig }) {
  const [showPicker, setShowPicker] = useState(false)
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  const actionName = useResolvedActionName(config)

  if (showPicker) {
    return (
      <TargetsPicker
        connectedAt={config.oauth_connected_at}
        initialLoginCustomerId={config.login_customer_id ?? ''}
      />
    )
  }

  return (
    <div className="space-y-3">
      {config.oauth_connected_at && (
        <p className="text-sm text-gray-600" data-testid="oauth-connected-at">
          Connected on {formatConnectedAt(config.oauth_connected_at)}.
        </p>
      )}
      <ConfiguredSummary config={config} actionName={actionName} />
      <FullyConfiguredActions
        onChange={() => setShowPicker(true)}
        onDisconnect={() => setDisconnectOpen(true)}
      />
      <DisconnectDialog open={disconnectOpen} onOpenChange={setDisconnectOpen} />
    </div>
  )
}

function ConfiguredSummary({
  config,
  actionName,
}: {
  config: GoogleAdsConfig
  actionName: string | null
}) {
  return (
    <div className="space-y-1 text-sm" data-testid="configured-summary">
      <p>
        <span className="text-gray-500">Customer ID:</span>{' '}
        <span className="font-mono">{config.customer_id}</span>
      </p>
      <p>
        <span className="text-gray-500">Conversion action:</span>{' '}
        {actionName ?? config.conversion_action_resource_name}
      </p>
      {config.login_customer_id && (
        <p>
          <span className="text-gray-500">Manager account:</span>{' '}
          <span className="font-mono">{config.login_customer_id}</span>
        </p>
      )}
    </div>
  )
}

function FullyConfiguredActions({
  onChange,
  onDisconnect,
}: {
  onChange: () => void
  onDisconnect: () => void
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <Button onClick={onChange}>Change customer or conversion action</Button>
      <Button variant="outline" onClick={onDisconnect} data-testid="disconnect-btn">
        Disconnect
      </Button>
    </div>
  )
}

/**
 * Best-effort lookup of the human-readable conversion-action name. Cosmetic
 * only; falls through to the resource name on any failure.
 */
function useResolvedActionName(config: GoogleAdsConfig): string | null {
  const [name, setName] = useState<string | null>(null)
  useEffect(() => {
    if (!config.customer_id || !config.conversion_action_resource_name) return
    let cancelled = false
    const params = new URLSearchParams({ customer_id: config.customer_id })
    if (config.login_customer_id) params.set('login_customer_id', config.login_customer_id)
    void fetchListJson<{ conversion_actions: ConversionActionOption[] }>(
      `/api/integrations/google-ads/conversion-actions/list?${params.toString()}`
    ).then((r) => {
      if (cancelled || !r.ok) return
      const list = r.body.conversion_actions ?? []
      const found = list.find(
        (a) => a.resource_name === config.conversion_action_resource_name
      )
      if (found) setName(found.name)
    })
    return () => {
      cancelled = true
    }
  }, [config.customer_id, config.login_customer_id, config.conversion_action_resource_name])
  return name
}
