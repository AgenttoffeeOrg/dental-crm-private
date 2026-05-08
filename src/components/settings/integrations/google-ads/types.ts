/**
 * Phase 2b.1.b.2 — shared types for the Google Ads Settings UI.
 */

export interface GoogleAdsConfig {
  webhook_key: string | null
  oauth_connected_at: string | null
  customer_id: string | null
  login_customer_id: string | null
  conversion_action_resource_name: string | null
  has_oauth: boolean
}

export interface StatusBanner {
  status: 'connected' | 'error'
  reason?: 'expired' | 'oauth_failed' | 'invalid_state' | 'unknown'
}

export interface CustomerOption {
  customer_id: string
  resource_name: string
}

export interface ConversionActionOption {
  id: string
  resource_name: string
  name: string
  category: string
  status: string
}

export type ListState<T> =
  | { kind: 'loading' }
  | { kind: 'ready'; items: T[] }
  | { kind: 'oauth_revoked' }
  | { kind: 'error'; detail?: string }
