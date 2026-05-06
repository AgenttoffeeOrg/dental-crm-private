/**
 * Phase 2b.1.a — CLI: generate (or rotate) a Google Lead Form webhook key
 * for a tenant.
 *
 * Writes a fresh row to `google_lead_form_configs` for the supplied tenant
 * (deactivating any prior active row first), then prints the webhook URL
 * and key for paste into the Google Ads Lead Form Extensions configuration.
 *
 * Usage:
 *   cd dental-crm
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/phase-2b/generate-google-webhook-key.ts <tenant_id>
 *
 * Env (auto-loaded from .env.local if present):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_APP_URL  (optional; defaults to https://app.example.com)
 *
 * Notes:
 *   - Service-role client; bypasses RLS, intentional for 2b.1.a (Settings
 *     UI is deferred to 2b.1.b).
 *   - Rotation is non-destructive: the previous active row is set to
 *     `is_active = false` so we keep an audit trail of past keys.
 */

import { config as loadEnv } from 'dotenv'
import { resolve as resolvePath } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

loadEnv({ path: resolvePath(process.cwd(), '.env.local') })

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com'

// Untyped client — we don't import the generated Database type into scripts
// (kept lightweight, no schema generic). Tables touched: tenants (read),
// google_lead_form_configs (read/write).
type SbClient = SupabaseClient

function fail(msg: string): never {
  console.error(msg)
  process.exit(1)
}

function readArgs(): string {
  const tenantId = process.argv[2]
  if (!tenantId) {
    fail(
      'Usage: npx tsx scripts/phase-2b/generate-google-webhook-key.ts <tenant_id>'
    )
  }
  return tenantId
}

function buildClient(): SbClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    fail(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env. ' +
        'Did you `set -a && source .env.local && set +a` first?'
    )
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

async function loadTenant(
  supabase: SbClient,
  tenantId: string
): Promise<{ id: string; name: string }> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('id', tenantId)
    .maybeSingle()
  if (error || !data) {
    fail(`Tenant not found: ${tenantId} ${error?.message ?? ''}`)
  }
  return data as { id: string; name: string }
}

async function rotateAndInsertKey(
  supabase: SbClient,
  tenantId: string
): Promise<string> {
  const { error: deactErr } = await supabase
    .from('google_lead_form_configs')
    .update({ is_active: false })
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
  if (deactErr) {
    fail(`Failed to deactivate prior config: ${deactErr.message}`)
  }

  const { data: cfg, error: cErr } = await supabase
    .from('google_lead_form_configs')
    .insert({ tenant_id: tenantId, is_active: true })
    .select('webhook_key')
    .single()
  if (cErr || !cfg) {
    fail(`Insert failed: ${cErr?.message ?? 'unknown error'}`)
  }
  return (cfg as { webhook_key: string }).webhook_key
}

function printResult(
  tenant: { id: string; name: string },
  webhookKey: string
): void {
  const webhookUrl = `${APP_BASE_URL}/api/webhooks/google-lead-form`
  console.log('')
  console.log('=== Google Lead Form webhook config ===')
  console.log(`Tenant:      ${tenant.name} (${tenant.id})`)
  console.log(`Webhook URL: ${webhookUrl}`)
  console.log(`Webhook Key: ${webhookKey}`)
  console.log('')
  console.log('Paste both into the Lead Form Extensions config in Google Ads.')
  console.log(
    'Google sends the key back as `google_key` on every lead delivery.'
  )
}

async function main(): Promise<void> {
  const tenantId = readArgs()
  const supabase = buildClient()
  const tenant = await loadTenant(supabase, tenantId)
  const webhookKey = await rotateAndInsertKey(supabase, tenantId)
  printResult(tenant, webhookKey)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
