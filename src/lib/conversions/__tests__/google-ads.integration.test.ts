/**
 * @jest-environment node
 *
 * Phase 2b.1.b.1 — Google Ads conversion-event firing integration test (live).
 *
 * Strategy: against the real Supabase project + the real Google Ads test MCC,
 * fire one `Lead` event end-to-end and assert that `conversion_events_fired`
 * records the result row.
 *
 * Pre-requisites (operator-driven, see Task 8 of the prompt):
 *   1. Apply the 2b.1.b.1 migration.
 *   2. Run `scripts/phase-2b/connect-google-ads.ts <TENANT_ID>` and complete
 *      the consent flow in a browser. The callback writes the encrypted
 *      refresh token onto the active config row.
 *   3. Run `scripts/phase-2b/set-google-ads-targets.ts <TENANT_ID> ...` to set
 *      customer_id, login_customer_id, and conversion_action_resource_name.
 *   4. Optionally insert a synthetic deal + contact row pair so the test has
 *      something to attach to. The test below auto-creates those if missing.
 *
 * Gating: this test only runs when LEAD_INGESTION_INTEGRATION=1 AND real
 * Supabase env vars are present. Otherwise it skips, matching the 2b.1.a
 * pattern.
 *
 * Verification of conversion ingestion in the Google Ads UI takes hours-to-days
 * — we deliberately do NOT poll Google Ads here. The test only asserts that we
 * successfully exchanged tokens, posted to the API, and recorded the outcome.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { fireGoogleConversionEvent } from '../fire-conversion-event'

const TENANT_ID = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const TEST_PREFIX = `phase2b1b1_test_${Date.now()}_`

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const HAS_LIVE_DB =
  !!SUPABASE_URL &&
  !!SUPABASE_SERVICE_ROLE_KEY &&
  !SUPABASE_URL.includes('localhost') &&
  SUPABASE_SERVICE_ROLE_KEY !== 'supabase-test-key' &&
  process.env.LEAD_INGESTION_INTEGRATION === '1'

const describeOrSkip = HAS_LIVE_DB ? describe : describe.skip

describeOrSkip('Google Ads conversion firing — live integration', () => {
  jest.setTimeout(30_000)

  let supabase: SupabaseClient
  let contactId: string
  let dealId: string

  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })

    // Sanity: tenant has an active config with full Google Ads targets + refresh token.
    const { data: cfg } = await supabase
      .from('google_lead_form_configs')
      .select('customer_id, conversion_action_resource_name, oauth_refresh_token_encrypted')
      .eq('tenant_id', TENANT_ID)
      .eq('is_active', true)
      .maybeSingle()
    if (!cfg || !cfg.customer_id || !cfg.conversion_action_resource_name || !cfg.oauth_refresh_token_encrypted) {
      throw new Error(
        'Tenant is not fully wired for Google Ads. Complete Task 8 setup ' +
          '(connect-google-ads.ts + set-google-ads-targets.ts) before running this test.'
      )
    }

    // Create a synthetic contact + deal that we can dedupe on.
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .insert({
        tenant_id: TENANT_ID,
        full_name: `${TEST_PREFIX}Sarah`,
        primary_email: `${TEST_PREFIX}sarah@example.com`,
        primary_email_norm: `${TEST_PREFIX}sarah@example.com`,
        primary_phone_e164: '+447700900100',
        contact_type: 'lead',
        status: 'lead',
        source: 'google_lead_form',
      })
      .select('id')
      .single()
    if (contactErr || !contact) throw new Error(`contact insert failed: ${contactErr?.message}`)
    contactId = contact.id

    // Find a default pipeline + first stage for this tenant; if none, fail loudly.
    const { data: pipeline } = await supabase
      .from('pipelines')
      .select('id, pipeline_stages(id, position)')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    const stages = (pipeline?.pipeline_stages as Array<{ id: string; position: number }> | undefined) ?? []
    const firstStage = [...stages].sort((a, b) => a.position - b.position)[0]
    if (!pipeline || !firstStage) {
      throw new Error('No pipeline/stages found for the test tenant.')
    }

    const { data: deal, error: dealErr } = await supabase
      .from('deals')
      .insert({
        tenant_id: TENANT_ID,
        contact_id: contactId,
        pipeline_id: pipeline.id,
        stage_id: firstStage.id,
        title: `${TEST_PREFIX}Inquiry`,
      })
      .select('id')
      .single()
    if (dealErr || !deal) throw new Error(`deal insert failed: ${dealErr?.message}`)
    dealId = deal.id
  })

  afterAll(async () => {
    if (!supabase || !contactId) return
    await supabase
      .from('conversion_events_fired')
      .delete()
      .eq('contact_id', contactId)
    await supabase.from('deals').delete().eq('id', dealId)
    await supabase.from('contacts').delete().eq('id', contactId)
  })

  it('fires a Lead event and records the outcome (success OR a deterministic Google error)', async () => {
    await fireGoogleConversionEvent(
      {
        tenant_id: TENANT_ID,
        deal_id: dealId,
        contact_id: contactId,
        event_type: 'Lead',
        gclid: `${TEST_PREFIX}TEST_GCLID`,
        email: `${TEST_PREFIX}sarah@example.com`,
        phone_e164: '+447700900100',
        occurred_at: new Date().toISOString(),
      },
      supabase
    )

    const { data: row, error } = await supabase
      .from('conversion_events_fired')
      .select('*')
      .eq('deal_id', dealId)
      .eq('event_type', 'Lead')
      .maybeSingle()
    expect(error).toBeNull()
    expect(row).toBeTruthy()
    expect(row?.platform).toBe('google_ads')
    // Status will be `success` if the test gclid is recognised by Google;
    // otherwise it'll be `failure` with a 4xx (e.g. "GCLID can't be associated
    // with the conversion action"). Either way, the row is recorded.
    expect(['success', 'failure']).toContain(row?.status)
  })
})
