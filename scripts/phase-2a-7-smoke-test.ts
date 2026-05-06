/**
 * Phase 2a.7 — Live integration smoke test for deal creation in ingestLead().
 *
 * Calls `ingestLead()` directly against the live Supabase project with three
 * scenarios on the test tenant:
 *
 *   A. Brand-new email + treatment offering → expect 1 contact, 1 deal,
 *      title from treatment_types.display_name, pipeline from offering.
 *   B. Same email as A but different offering → expect SAME contact, NEW deal.
 *   C. Brand-new email, no offering → expect 1 contact, 1 deal titled
 *      'Inquiry' on the tenant's default pipeline.
 *
 * After running each scenario it queries the DB to verify the expected shape
 * and prints a result table. Rows are NOT cleaned up — the planner asked
 * for evidence in the change log; deletion is the operator's call.
 *
 * Usage:
 *   cd dental-crm && npx tsx scripts/phase-2a-7-smoke-test.ts
 */

import { config as loadEnv } from 'dotenv'
import { resolve as resolvePath } from 'node:path'
import { createClient } from '@supabase/supabase-js'

loadEnv({ path: resolvePath(process.cwd(), '.env.local') })
loadEnv({ path: resolvePath(process.cwd(), '.env') })

import { ingestLead } from '../src/lib/lead-ingestion/ingest-lead'

const TENANT_ID = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const OFFERING_CHECKUP = 'fbfed66e-63a7-4346-b284-fe23ed36b451' // General Checkup
const OFFERING_FILLING = '57bd9cc7-08a1-49ea-b590-8fd86ae4cd75' // Filling

function envOrThrow(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`missing env: ${name}`)
  return v
}

async function main() {
  const url = envOrThrow('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = envOrThrow('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const ts = Date.now()
  const emailA = `phase2a7-A-${ts}@example.com`
  const emailC = `phase2a7-C-${ts}@example.com`
  const phoneA = `+44777${String(ts).slice(-7)}`
  const phoneC = `+44778${String(ts).slice(-7)}`

  // ---------------- Scenario A: new email, with treatment ----------------
  console.log('\n=== Scenario A: new email + General Checkup ===')
  const resultA = await ingestLead(
    {
      tenant_id: TENANT_ID,
      source_channel: 'form_embedded',
      contact: { email: emailA, phone: phoneA, full_name: 'Phase 2a.7 Test A' },
      treatment_offering_id: OFFERING_CHECKUP,
      raw_payload: { scenario: 'A' },
      event_id: `phase2a7-smoke-A-${ts}`,
    },
    supabase as never
  )
  console.log('result:', JSON.stringify(resultA, null, 2))

  // ---------------- Scenario B: same email, different treatment ---------
  console.log('\n=== Scenario B: same email A, switched to Filling ===')
  const resultB = await ingestLead(
    {
      tenant_id: TENANT_ID,
      source_channel: 'form_embedded',
      contact: { email: emailA, phone: phoneA, full_name: 'Phase 2a.7 Test A' },
      treatment_offering_id: OFFERING_FILLING,
      raw_payload: { scenario: 'B' },
      event_id: `phase2a7-smoke-B-${ts}`,
    },
    supabase as never
  )
  console.log('result:', JSON.stringify(resultB, null, 2))

  // ---------------- Scenario C: new email, no treatment -----------------
  console.log('\n=== Scenario C: new email, no offering (Inquiry) ===')
  const resultC = await ingestLead(
    {
      tenant_id: TENANT_ID,
      source_channel: 'form_embedded',
      contact: { email: emailC, phone: phoneC, full_name: 'Phase 2a.7 Test C' },
      raw_payload: { scenario: 'C' },
      event_id: `phase2a7-smoke-C-${ts}`,
    },
    supabase as never
  )
  console.log('result:', JSON.stringify(resultC, null, 2))

  // ---------------- Verification queries --------------------------------
  console.log('\n=== Verification ===')
  const { data: contactA } = await supabase
    .from('contacts')
    .select('id, primary_email, full_name, source')
    .eq('primary_email', emailA)
    .maybeSingle()

  const { data: dealsA } = await supabase
    .from('deals')
    .select('id, title, pipeline_id, stage_id, owner_user_id, value_estimate_cents, source, treatment_tags, created_at')
    .eq('contact_id', resultA.contact_id ?? 'never-matches')
    .order('created_at', { ascending: true })

  const { data: contactC } = await supabase
    .from('contacts')
    .select('id, primary_email, full_name')
    .eq('primary_email', emailC)
    .maybeSingle()

  const { data: dealsC } = await supabase
    .from('deals')
    .select('id, title, pipeline_id, stage_id, owner_user_id, value_estimate_cents')
    .eq('contact_id', resultC.contact_id ?? 'never-matches')

  console.log('\nContact A:', contactA)
  console.log('Deals on Contact A (expect 2):', dealsA)
  console.log('\nContact C:', contactC)
  console.log('Deals on Contact C (expect 1):', dealsC)

  // ---------------- Pass/fail ------------------------------------------
  const dealsACount = dealsA?.length ?? 0
  const dealsCCount = dealsC?.length ?? 0
  const inquiryDeal = dealsC?.[0]

  const passes = [
    ['A.contact_created', !!resultA.contact_id],
    ['A.deal_created', !!resultA.deal_id],
    ['B.same_contact', resultA.contact_id === resultB.contact_id],
    ['B.new_deal', !!resultB.deal_id && resultB.deal_id !== resultA.deal_id],
    ['A_total_deals_on_contact', dealsACount === 2],
    ['C.contact_created', !!resultC.contact_id],
    ['C.deal_created', !!resultC.deal_id],
    ['C.title_is_Inquiry', inquiryDeal?.title === 'Inquiry'],
    ['C_total_deals_on_contact', dealsCCount === 1],
  ] as const

  console.log('\n=== Pass/Fail ===')
  let allPass = true
  for (const [name, ok] of passes) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
    if (!ok) allPass = false
  }

  if (!allPass) {
    process.exit(1)
  }
  console.log('\nAll smoke checks passed.')
}

main().catch((err) => {
  console.error('Smoke test failed:', err)
  process.exit(1)
})
