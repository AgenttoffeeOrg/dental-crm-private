/**
 * Phase 2b.1.b.1 — CLI: set Google Ads customer_id, login_customer_id, and
 * conversion_action_resource_name on a tenant's active google_lead_form_configs row.
 *
 * Usage:
 *   cd dental-crm
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/phase-2b/set-google-ads-targets.ts \
 *     <tenant_id> <customer_id> <conversion_action_id> [--login-customer-id=<mcc_id>]
 *
 * Example (test tenant):
 *   npx tsx scripts/phase-2b/set-google-ads-targets.ts \
 *     5aadca14-9786-4aef-bc53-e9287cdd0bbf \
 *     1675268286 \
 *     7600535419 \
 *     --login-customer-id=9374708799
 *
 * Notes:
 *   - customer_id and login_customer_id are 10-digit Google Ads account IDs (NO dashes).
 *   - conversion_action_id is the numeric ID of the "offline (upload) / Converted lead"
 *     conversion action; we synthesise the full resource path
 *     (`customers/<customer_id>/conversionActions/<id>`) and store that.
 *   - login-customer-id is needed when the customer is reached via an MCC (manager)
 *     account; required for our test setup (sub-account under a Test MCC).
 *   - Service-role client; bypasses RLS, intentional for 2b.1.b.1.
 */

import { config as loadEnv } from 'dotenv'
import { resolve as resolvePath } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

loadEnv({ path: resolvePath(process.cwd(), '.env.local') })

type SbClient = SupabaseClient

function fail(msg: string): never {
  console.error(msg)
  process.exit(1)
}

interface ParsedArgs {
  tenantId: string
  customerId: string
  conversionActionId: string
  loginCustomerId: string | null
}

function readArgs(): ParsedArgs {
  const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const flags = process.argv.slice(2).filter((a) => a.startsWith('--'))

  const [tenantId, customerId, conversionActionId] = positional
  if (!tenantId || !customerId || !conversionActionId) {
    fail(
      'Usage: npx tsx scripts/phase-2b/set-google-ads-targets.ts ' +
        '<tenant_id> <customer_id> <conversion_action_id> [--login-customer-id=<mcc_id>]'
    )
  }

  if (!/^\d{8,12}$/.test(customerId)) {
    fail(`customer_id must be all digits (no dashes). Got: ${customerId}`)
  }
  if (!/^\d+$/.test(conversionActionId)) {
    fail(`conversion_action_id must be all digits. Got: ${conversionActionId}`)
  }

  let loginCustomerId: string | null = null
  const loginFlag = flags.find((f) => f.startsWith('--login-customer-id='))
  if (loginFlag) {
    loginCustomerId = loginFlag.split('=')[1] ?? null
    if (loginCustomerId && !/^\d{8,12}$/.test(loginCustomerId)) {
      fail(`--login-customer-id must be all digits. Got: ${loginCustomerId}`)
    }
  }

  return { tenantId, customerId, conversionActionId, loginCustomerId }
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

async function applyTargets(
  supabase: SbClient,
  args: ParsedArgs
): Promise<void> {
  const conversionActionResourceName = `customers/${args.customerId}/conversionActions/${args.conversionActionId}`

  const { data, error } = await supabase
    .from('google_lead_form_configs')
    .update({
      customer_id: args.customerId,
      login_customer_id: args.loginCustomerId,
      conversion_action_resource_name: conversionActionResourceName,
    })
    .eq('tenant_id', args.tenantId)
    .eq('is_active', true)
    .select('id')

  if (error) {
    fail(`Update failed: ${error.message}`)
  }
  if (!data || data.length === 0) {
    fail(
      `No active google_lead_form_configs row for tenant ${args.tenantId}. ` +
        `Run generate-google-webhook-key.ts and connect-google-ads.ts first.`
    )
  }

  console.log('')
  console.log(`Set targets for tenant ${args.tenantId}`)
  console.log(`  customer_id:                     ${args.customerId}`)
  console.log(`  login_customer_id:               ${args.loginCustomerId ?? '(none)'}`)
  console.log(`  conversion_action_resource_name: ${conversionActionResourceName}`)
}

async function main(): Promise<void> {
  const args = readArgs()
  const supabase = buildClient()
  await applyTargets(supabase, args)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
