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
  /** When set, this customer was discovered as a descendant of a manager in
   *  the OAuth user's hierarchy. The UI uses this as a pre-fill hint for the
   *  "Manager account ID" field on subsequent conversion-actions calls (it's
   *  the value the API requires in the `login-customer-id` header to access
   *  this customer). Null/undefined means the customer is directly
   *  accessible to the OAuth user without going through a manager. See §3
   *  row O in `2b-1-b-2-changes.md`. */
  login_customer_id?: string | null
  /** True when this row is itself a manager (MCC) account. Managers don't
   *  host conversion actions, but we surface them so they're discoverable.
   *  Undefined for top-level rows (the listAccessibleCustomers endpoint
   *  doesn't return a manager flag — only the descendant query does). */
  is_manager?: boolean
  /** Optional human-readable name from Google Ads. Empty string when
   *  unavailable. */
  descriptive_name?: string
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
