/**
 * Phase 2b.1.b.2 — server-component entry for the Google Ads Settings page.
 *
 * Resolves the user + tenant + role server-side via `createServerSupabaseClient()`
 * (cookie-based session, same pattern the rest of the settings pages use),
 * loads the tenant's active `google_lead_form_configs` row through the
 * authenticated client (RLS will scope to the user's tenant), and hands a
 * pre-resolved snapshot to the `<GoogleAdsSettings>` client component for
 * interactive UI.
 *
 * The page lives under `/settings/integrations/google` per the prompt — a
 * sub-page of `/settings/integrations`, NOT a tab in the existing settings
 * tab shell.
 */

import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { GoogleAdsSettings } from '@/components/settings/integrations/google-ads-settings'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = new Set(['owner', 'super_admin', 'admin'])
const SETTINGS_PATH = '/settings/integrations/google'

interface ConfigSnapshot {
  id: string
  webhook_key: string | null
  oauth_refresh_token_encrypted: string | null
  oauth_connected_at: string | null
  customer_id: string | null
  login_customer_id: string | null
  conversion_action_resource_name: string | null
}

type StatusReason = 'expired' | 'oauth_failed' | 'invalid_state' | 'unknown'

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

function resolveStatusBanner(
  status: string | undefined,
  reason: string | undefined
): { status: 'connected' | 'error'; reason?: StatusReason } | null {
  if (status === 'connected') return { status: 'connected' }
  if (status === 'error') {
    const safe: ReadonlySet<StatusReason> = new Set(['expired', 'oauth_failed', 'invalid_state', 'unknown'])
    const r = reason && safe.has(reason as StatusReason) ? (reason as StatusReason) : 'unknown'
    return { status: 'error', reason: r }
  }
  return null
}

// NOTE: We intentionally type `supabase` as `any` here. The project's
// generated Database types currently widen every table row to `never` (a
// pre-existing issue across 600+ existing src/app errors, see e.g.
// src/app/api/org/switch/route.ts which mirrors the exact same pattern).
// Using a typed client triggers ~9 spurious TS errors that don't reflect
// real bugs. We cast the data back to `ConfigSnapshot` on read.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadActiveConfig(supabase: any, tenantId: string): Promise<ConfigSnapshot | null> {
  const { data } = await supabase
    .from('google_lead_form_configs')
    .select(
      'id, webhook_key, oauth_refresh_token_encrypted, oauth_connected_at, customer_id, login_customer_id, conversion_action_resource_name'
    )
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .maybeSingle()
  return (data as ConfigSnapshot | null) ?? null
}

interface PageProps {
  searchParams: Promise<{ status?: string; reason?: string }>
}

export default async function GoogleAdsIntegrationSettingsPage({ searchParams }: PageProps) {
  // See the note on `loadActiveConfig` — we cast through `any` to dodge
  // the project-wide Supabase typing regression. Behaviour is identical to
  // the typed call (RLS still applies, casts are explicit).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createServerSupabaseClient()) as any
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(SETTINGS_PATH)}`)
  }

  // Resolve the active tenant + the user's role on it. We re-derive both
  // from the authenticated session rather than trusting any client-side
  // value — the RLS policies on `google_lead_form_configs` provide a second
  // line of defence, but this page is the first.
  const { data: appUser } = await supabase
    .from('app_users')
    .select('active_tenant_id')
    .eq('id', user.id)
    .single()

  const tenantId: string | null = (appUser?.active_tenant_id as string | null | undefined) ?? null
  if (!tenantId) {
    return (
      <DashboardLayout>
        <PermissionDeniedShell message="Select an organisation to manage integrations." />
      </DashboardLayout>
    )
  }

  const { data: membership } = await supabase
    .from('user_tenant_memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single()

  const role: string | null = (membership?.role as string | null | undefined) ?? null

  // TODO(rbac): F02 §13 Phase B — replace the role list with
  // user_has_permission(..., 'settings.integrations.manage') once the RBAC
  // migration lands. See `_lib/role-gate.ts` for the API-side mirror.
  if (!role || !ALLOWED_ROLES.has(role)) {
    return (
      <DashboardLayout>
        <PermissionDeniedShell message="You don't have permission to manage Google Ads integrations. Ask an owner or admin." />
      </DashboardLayout>
    )
  }

  const config = await loadActiveConfig(supabase, tenantId)

  const params = await searchParams
  const banner = resolveStatusBanner(params?.status, params?.reason)
  const webhookUrl = `${appBaseUrl()}/api/webhooks/google-lead-form`

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 max-w-4xl">
        <GoogleAdsSettings
          config={
            config
              ? {
                  webhook_key: config.webhook_key,
                  oauth_connected_at: config.oauth_connected_at,
                  customer_id: config.customer_id,
                  login_customer_id: config.login_customer_id,
                  conversion_action_resource_name: config.conversion_action_resource_name,
                  has_oauth: Boolean(config.oauth_refresh_token_encrypted),
                }
              : null
          }
          statusBanner={banner}
          webhookUrl={webhookUrl}
        />
      </div>
    </DashboardLayout>
  )
}

function PermissionDeniedShell({ message }: { message: string }) {
  return (
    <div className="container mx-auto py-12 max-w-xl text-center">
      <h1 className="text-2xl font-semibold mb-3">Google Ads</h1>
      <p className="text-gray-600">{message}</p>
    </div>
  )
}
