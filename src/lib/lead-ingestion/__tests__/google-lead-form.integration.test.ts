/**
 * @jest-environment node
 *
 * Phase 2b.1.a — Google Lead Form webhook integration test (live DB).
 *
 * Strategy: drive the route handler directly (the same code paths Vercel
 * would run) against the real Supabase project. Provisions a temporary
 * `google_lead_form_configs` row for the test tenant, POSTs a sample
 * payload, asserts contact + touchpoint + activity + deal are created,
 * then POSTs the same payload again to verify idempotency.
 *
 * Gated behind LEAD_INGESTION_INTEGRATION=1 + real Supabase env vars so
 * unit-only test runs and CI without secrets stay green.
 *
 * Run:
 *   NEXT_PUBLIC_SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   LEAD_INGESTION_INTEGRATION=1 \
 *   npm test -- src/lib/lead-ingestion/__tests__/google-lead-form.integration.test.ts
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { setNotificationEmitter } from '../ingest-lead'
import { POST } from '@/app/api/webhooks/google-lead-form/route'

const TENANT_ID = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const TEST_PREFIX = `phase2b1a_test_${Date.now()}_`
const TEST_EMAIL = `${TEST_PREFIX}sarah@example.com`

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const HAS_LIVE_DB =
  !!SUPABASE_URL &&
  !!SUPABASE_SERVICE_ROLE_KEY &&
  !SUPABASE_URL.includes('localhost') &&
  SUPABASE_SERVICE_ROLE_KEY !== 'supabase-test-key' &&
  process.env.LEAD_INGESTION_INTEGRATION === '1'

const describeIfLive = HAS_LIVE_DB ? describe : describe.skip

let supabase: SupabaseClient
let webhookKey: string
let configRowId: string

function buildPayload(leadId = 'phase2b1a-test-lead-1') {
  return {
    lead_id: leadId,
    api_version: '1.0',
    form_id: 9876543210,
    campaign_id: 1234567890,
    google_key: webhookKey,
    is_test: true,
    gcl_id: 'Cj0KCQjw-phase2b1a-gclid',
    user_column_data: [
      { column_id: 'FULL_NAME', string_value: `${TEST_PREFIX}Sarah` },
      { column_id: 'EMAIL', string_value: TEST_EMAIL },
      { column_id: 'PHONE_NUMBER', string_value: '+447700900100' },
    ],
  }
}

function jsonReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/google-lead-form', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeAll(async () => {
  if (!HAS_LIVE_DB) return
  supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  setNotificationEmitter(async () => {})

  // Provision a fresh active config (deactivating any prior one).
  await supabase
    .from('google_lead_form_configs')
    .update({ is_active: false })
    .eq('tenant_id', TENANT_ID)
    .eq('is_active', true)

  const { data: cfg, error } = await supabase
    .from('google_lead_form_configs')
    .insert({ tenant_id: TENANT_ID, is_active: true })
    .select('id, webhook_key')
    .single()
  if (error || !cfg) {
    throw new Error(`Failed to provision test config row: ${error?.message}`)
  }
  configRowId = cfg.id as string
  webhookKey = cfg.webhook_key as string
})

afterAll(async () => {
  if (!HAS_LIVE_DB) return
  // Cleanup in dependency order.
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id')
    .eq('tenant_id', TENANT_ID)
    .eq('primary_email_norm', TEST_EMAIL.toLowerCase())
  const ids = (contacts ?? []).map((c) => c.id as string)
  if (ids.length > 0) {
    await supabase.from('activities').delete().in('contact_id', ids)
    await supabase
      .from('attribution_touchpoints')
      .delete()
      .in('contact_id', ids)
    await supabase.from('deals').delete().in('contact_id', ids)
    await supabase.from('contacts').delete().in('id', ids)
  }
  if (configRowId) {
    await supabase
      .from('google_lead_form_configs')
      .update({ is_active: false })
      .eq('id', configRowId)
  }
})

describeIfLive('Google Lead Form webhook (integration, live DB)', () => {
  test('POSTing a sample payload creates contact, touchpoint, activity, deal', async () => {
    const res = await POST(jsonReq(buildPayload('phase2b1a-test-lead-1')))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.lead_id).toBe('phase2b1a-test-lead-1')
    expect(body.contact_id).toBeTruthy()
    // deal_id may be null if the tenant default pipeline check changes shape;
    // the test tenant has a default pipeline with stages so we expect a deal.
    expect(body.deal_id).toBeTruthy()

    // DB-side assertions
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, primary_email_norm, source')
      .eq('id', body.contact_id)
      .single()
    expect(contact?.primary_email_norm).toBe(TEST_EMAIL.toLowerCase())
    expect(contact?.source).toBe('google_lead_form')

    const { data: tp } = await supabase
      .from('attribution_touchpoints')
      .select('id, gclid, source_channel, event_id')
      .eq('event_id', 'google-lead:9876543210:phase2b1a-test-lead-1')
      .single()
    expect(tp?.source_channel).toBe('google_lead_form')
    expect(tp?.gclid).toBe('Cj0KCQjw-phase2b1a-gclid')

    const { data: activities } = await supabase
      .from('activities')
      .select('id, type, source_channel')
      .eq('contact_id', body.contact_id)
    expect(activities?.length).toBe(1)
    expect(activities?.[0]?.type).toBe('google_lead_received')
    expect(activities?.[0]?.source_channel).toBe('google_lead_form')

    const { data: deals } = await supabase
      .from('deals')
      .select('id, contact_id')
      .eq('contact_id', body.contact_id)
    expect(deals?.length).toBe(1)
  })

  test('replaying the same payload is idempotent', async () => {
    const res = await POST(jsonReq(buildPayload('phase2b1a-test-lead-1')))
    expect(res.status).toBe(200)

    // Same event_id ⇒ no duplicate touchpoint.
    const { data: tps } = await supabase
      .from('attribution_touchpoints')
      .select('id')
      .eq('event_id', 'google-lead:9876543210:phase2b1a-test-lead-1')
    expect(tps?.length).toBe(1)

    // Contact still 1 row with our test email.
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('primary_email_norm', TEST_EMAIL.toLowerCase())
    expect(contacts?.length).toBe(1)

    // Deal still 1 row.
    const ids = (contacts ?? []).map((c) => c.id as string)
    const { data: deals } = await supabase
      .from('deals')
      .select('id')
      .in('contact_id', ids)
    expect(deals?.length).toBe(1)
  })

  test('unknown webhook key returns 401', async () => {
    const bogus = buildPayload('phase2b1a-bogus-key')
    bogus.google_key = '00000000-0000-0000-0000-000000000000'
    const res = await POST(jsonReq(bogus))
    expect(res.status).toBe(401)
  })

  test('payload missing email and phone returns 400', async () => {
    const noIdentity = buildPayload('phase2b1a-no-identity')
    noIdentity.user_column_data = [
      { column_id: 'FULL_NAME', string_value: `${TEST_PREFIX}Anon` },
    ]
    const res = await POST(jsonReq(noIdentity))
    expect(res.status).toBe(400)
  })
})
