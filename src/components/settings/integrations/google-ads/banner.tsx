'use client'

/**
 * Phase 2b.1.b.2 — the success / error banner that appears at the top of the
 * Google Ads Settings page after the OAuth callback redirect.
 */

import type { StatusBanner } from './types'

const BANNER_COPY: Record<string, { tone: 'success' | 'error'; text: string }> = {
  connected: {
    tone: 'success',
    text: 'Google Ads connected successfully.',
  },
  expired: {
    tone: 'error',
    text: 'Connection link expired. Please try again.',
  },
  oauth_failed: {
    tone: 'error',
    text: 'Google rejected the connection. Please try again.',
  },
  invalid_state: {
    tone: 'error',
    text: 'Connection request was invalid or expired. Please try again.',
  },
  unknown: {
    tone: 'error',
    text: 'Something went wrong connecting Google Ads. Please try again or contact support.',
  },
}

function bannerKey(banner: StatusBanner): string {
  return banner.status === 'connected' ? 'connected' : (banner.reason ?? 'unknown')
}

export function BannerStrip({
  banner,
  onDismiss,
}: {
  banner: StatusBanner
  onDismiss: () => void
}) {
  const copy = BANNER_COPY[bannerKey(banner)] ?? BANNER_COPY.unknown
  const toneClass =
    copy.tone === 'success'
      ? 'bg-green-50 border-green-300 text-green-800'
      : 'bg-red-50 border-red-300 text-red-800'
  return (
    <div
      role="status"
      data-testid="status-banner"
      className={`border rounded-lg px-4 py-3 flex items-start justify-between gap-4 ${toneClass}`}
    >
      <p className="text-sm font-medium">{copy.text}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="text-sm opacity-70 hover:opacity-100"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
