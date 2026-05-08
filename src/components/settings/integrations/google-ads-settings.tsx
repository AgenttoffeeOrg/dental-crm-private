'use client'

/**
 * Phase 2b.1.b.2 — Self-serve Google Ads settings entry component.
 *
 * The page (`/settings/integrations/google/page.tsx`) is a server component
 * that does the role gate + initial config load and hands the snapshot to
 * this client component. We compose three children:
 *   - `<BannerStrip>`          (success/error after OAuth callback redirect)
 *   - `<InboundWebhookSection>` (the per-tenant webhook URL + key)
 *   - `<OutboundConversionsSection>` (OAuth + customer/action picker)
 *
 * Each child lives in its own file under `./google-ads/` to keep file size +
 * per-method complexity inside Lizard's gates.
 */

import { useState } from 'react'
import { BannerStrip } from './google-ads/banner'
import { InboundWebhookSection } from './google-ads/inbound-section'
import { OutboundConversionsSection } from './google-ads/outbound-section'
import type { GoogleAdsConfig, StatusBanner } from './google-ads/types'

export type {
  GoogleAdsConfig,
  StatusBanner,
} from './google-ads/types'

export interface GoogleAdsSettingsProps {
  config: GoogleAdsConfig | null
  statusBanner: StatusBanner | null
  webhookUrl: string
}

export function GoogleAdsSettings(props: GoogleAdsSettingsProps) {
  const { config, statusBanner, webhookUrl } = props
  const [bannerDismissed, setBannerDismissed] = useState(false)

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Google Ads</h1>
        <p className="text-gray-600 mt-1">
          Connect your Google Ads account to receive leads and send conversion data back.
        </p>
      </header>

      {statusBanner && !bannerDismissed && (
        <BannerStrip banner={statusBanner} onDismiss={() => setBannerDismissed(true)} />
      )}

      <InboundWebhookSection config={config} webhookUrl={webhookUrl} />

      <OutboundConversionsSection config={config} />
    </div>
  )
}
