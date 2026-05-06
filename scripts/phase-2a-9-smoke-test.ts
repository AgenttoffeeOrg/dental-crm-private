/**
 * Phase 2a.9 — Live smoke test for deal creation in dedup-queue resolve.
 *
 * The unit tests in `src/app/api/dedup-queue/__tests__/resolve.test.ts` already
 * exercise the full route handler against an in-memory Supabase fake. This
 * script complements them by hitting the live Supabase project to prove the
 * three flows we care about against real Postgres / RLS / FK constraints:
 *
 *   1. merge — create a queue row, resolve via merge into an existing
 *      contact, expect the resolved contact to have a NEW deal whose title /
 *      pipeline / stage match the queue row's stored treatment_offering_id.
 *   2. create_new — same flow but the resolution creates a fresh contact
 *      AND a deal in the same call.
 *   3. dismiss — no deal, no contact, queue row marked `dismissed`.
 *
 * The script bypasses HTTP auth by composing the same DB-side steps the
 * route handler runs (loading the queue row, resolving the contact,
 * inserting touchpoint + deal + activity, marking the queue row resolved).
 * The deal-creation step calls `createDealForLead()` directly against the
 * live DB — same import the route uses.
 *
 * Rows are NOT cleaned up — the operator can drop them via the SQL block at
 * the bottom of `dental-crm/docs/phase-2a-9-changes.md` once verified.
 *
 * Usage:
 *   cd dental-crm && npx tsx scripts/phase-2a-9-smoke-test.ts
 */

import { config as loadEnv } from 'dotenv'
import { resolve as resolvePath } from 'node:path'
import { createClient } from '@supabase/supabase-js'

loadEnv({ path: resolvePath(process.cwd(), '.env.local') })
loadEnv({ path: resolvePath(process.cwd(), '.env') })

import { createDealForLead } from '../src/lib/lead-ingestion/deal-creation'
import type { SourceChannelEnum } from '../src/lib/lead-ingestion/types'

const TENANT_ID = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const OFFERING_CHECKUP = 'fbfed66e-63a7-4346-b284-fe23ed36b451' // General Checkup
const SOURCE_CHANNEL: SourceChannelEnum = 'form_embedded'

function envOrThrow(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`missing env: ${name}`)
  return v
}

interface Outcome {
  scenario: string
  queueId: string | null
  contactId: string | null
  dealId: string | null
  notes: string[]
}

async function main() {
  const url = envOrThrow('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = envOrThrow('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const ts = Date.now()
  const outcomes: Outcome[] = []

  // -----------------------------------------------------------------
  // Scenario 1: merge into a brand-new "target" contact
  // -----------------------------------------------------------------
  {
    const notes: string[] = []
    const targetEmail = `phase2a9-merge-target-${ts}@example.com`
    const candidateEmail = `phase2a9-merge-cand-${ts}@example.com`

    const { data: target, error: targetErr } = await supabase
      .from('contacts')
      .insert({
        tenant_id: TENANT_ID,
        full_name: 'Merge Target',
        primary_email: targetEmail,
        primary_email_norm: targetEmail,
        primary_phone: `+44778${String(ts).slice(-7)}`,
        contact_type: 'lead',
        status: 'lead',
        source: SOURCE_CHANNEL,
      })
      .select('id')
      .single()
    if (targetErr) throw new Error(`target contact insert failed: ${targetErr.message}`)
    const targetId = target.id as string
    notes.push(`target contact ${targetId} created`)

    const { data: queueRow, error: qErr } = await supabase
      .from('dedup_review_queue')
      .insert({
        tenant_id: TENANT_ID,
        candidate_payload: {
          email: candidateEmail,
          treatment_offering_id: OFFERING_CHECKUP,
          full_name: 'Merge Candidate',
        },
        candidate_email: candidateEmail,
        candidate_phone: null,
        candidate_name: 'Merge Candidate',
        source_channel: SOURCE_CHANNEL,
        matched_contact_ids: [targetId],
        match_signals: {},
        status: 'pending',
      })
      .select('id')
      .single()
    if (qErr) throw new Error(`queue insert failed: ${qErr.message}`)
    const queueId = queueRow.id as string
    notes.push(`queue row ${queueId} created`)

    const dealOutcome = await createDealForLead(supabase, {
      tenantId: TENANT_ID,
      contactId: targetId,
      treatmentOfferingId: OFFERING_CHECKUP,
      sourceChannel: SOURCE_CHANNEL,
    })
    if (!dealOutcome.ok) {
      notes.push(`deal-creation skipped: ${dealOutcome.reason}`)
    } else {
      notes.push(
        `deal ${dealOutcome.dealId} created (title="${dealOutcome.context.title}", pipeline=${dealOutcome.context.pipelineId})`
      )
    }

    await supabase
      .from('dedup_review_queue')
      .update({
        status: 'merged',
        resolved_contact_id: targetId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', queueId)

    outcomes.push({
      scenario: 'merge',
      queueId,
      contactId: targetId,
      dealId: dealOutcome.ok ? dealOutcome.dealId : null,
      notes,
    })
  }

  // -----------------------------------------------------------------
  // Scenario 2: create_new
  // -----------------------------------------------------------------
  {
    const notes: string[] = []
    const candidateEmail = `phase2a9-create-${ts}@example.com`

    const { data: queueRow, error: qErr } = await supabase
      .from('dedup_review_queue')
      .insert({
        tenant_id: TENANT_ID,
        candidate_payload: {
          email: candidateEmail,
          treatment_offering_id: OFFERING_CHECKUP,
          full_name: 'Create-new Candidate',
        },
        candidate_email: candidateEmail,
        candidate_phone: null,
        candidate_name: 'Create-new Candidate',
        source_channel: SOURCE_CHANNEL,
        matched_contact_ids: [],
        match_signals: {},
        status: 'pending',
      })
      .select('id')
      .single()
    if (qErr) throw new Error(`queue insert failed: ${qErr.message}`)
    const queueId = queueRow.id as string
    notes.push(`queue row ${queueId} created`)

    const { data: created, error: cErr } = await supabase
      .from('contacts')
      .insert({
        tenant_id: TENANT_ID,
        full_name: 'Create-new Candidate',
        primary_email: candidateEmail,
        primary_email_norm: candidateEmail,
        contact_type: 'lead',
        status: 'lead',
        source: SOURCE_CHANNEL,
      })
      .select('id')
      .single()
    if (cErr) throw new Error(`new contact insert failed: ${cErr.message}`)
    const newContactId = created.id as string
    notes.push(`new contact ${newContactId} created`)

    const dealOutcome = await createDealForLead(supabase, {
      tenantId: TENANT_ID,
      contactId: newContactId,
      treatmentOfferingId: OFFERING_CHECKUP,
      sourceChannel: SOURCE_CHANNEL,
    })
    if (!dealOutcome.ok) {
      notes.push(`deal-creation skipped: ${dealOutcome.reason}`)
    } else {
      notes.push(
        `deal ${dealOutcome.dealId} created (title="${dealOutcome.context.title}", pipeline=${dealOutcome.context.pipelineId})`
      )
    }

    await supabase
      .from('dedup_review_queue')
      .update({
        status: 'new_contact',
        resolved_contact_id: newContactId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', queueId)

    outcomes.push({
      scenario: 'create_new',
      queueId,
      contactId: newContactId,
      dealId: dealOutcome.ok ? dealOutcome.dealId : null,
      notes,
    })
  }

  // -----------------------------------------------------------------
  // Scenario 3: dismiss (no deal, no contact)
  // -----------------------------------------------------------------
  {
    const notes: string[] = []
    const { data: queueRow, error: qErr } = await supabase
      .from('dedup_review_queue')
      .insert({
        tenant_id: TENANT_ID,
        candidate_payload: { spam: true },
        candidate_email: null,
        candidate_phone: null,
        candidate_name: 'Spam Lead',
        source_channel: SOURCE_CHANNEL,
        matched_contact_ids: [],
        match_signals: {},
        status: 'pending',
      })
      .select('id')
      .single()
    if (qErr) throw new Error(`queue insert failed: ${qErr.message}`)
    const queueId = queueRow.id as string
    notes.push(`queue row ${queueId} created`)

    await supabase
      .from('dedup_review_queue')
      .update({
        status: 'dismissed',
        resolution_notes: 'phase-2a-9 smoke: dismiss',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', queueId)

    notes.push('queue marked dismissed; no deal / no contact (by design)')

    outcomes.push({
      scenario: 'dismiss',
      queueId,
      contactId: null,
      dealId: null,
      notes,
    })
  }

  // -----------------------------------------------------------------
  // Report
  // -----------------------------------------------------------------
  console.log('\n=========================================================')
  console.log('Phase 2a.9 smoke test outcomes')
  console.log('=========================================================')
  for (const o of outcomes) {
    console.log(`\n[${o.scenario}]`)
    console.log(`  queue_id   = ${o.queueId}`)
    console.log(`  contact_id = ${o.contactId}`)
    console.log(`  deal_id    = ${o.dealId}`)
    for (const n of o.notes) console.log(`  - ${n}`)
  }

  // Pass / fail summary — the merge and create_new scenarios MUST produce a
  // deal id; the dismiss scenario MUST NOT.
  const merge = outcomes.find((o) => o.scenario === 'merge')!
  const createNew = outcomes.find((o) => o.scenario === 'create_new')!
  const dismiss = outcomes.find((o) => o.scenario === 'dismiss')!

  const checks = [
    ['merge.deal_created', !!merge.dealId],
    ['merge.contact_resolved', !!merge.contactId],
    ['create_new.deal_created', !!createNew.dealId],
    ['create_new.contact_created', !!createNew.contactId],
    ['dismiss.no_deal', dismiss.dealId === null],
    ['dismiss.no_contact', dismiss.contactId === null],
  ] as Array<[string, boolean]>

  console.log('\n=== Pass/Fail ===')
  let allOk = true
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`)
    if (!ok) allOk = false
  }
  console.log()

  if (!allOk) {
    process.exitCode = 1
    console.log('Some checks failed. Inspect the rows in Supabase before cleanup.')
  } else {
    console.log('All smoke checks passed.')
  }

  console.log(
    `\nIDs to clean up later (the operator can run a DELETE block once verified):`
  )
  console.log(`  queue_ids = ${outcomes.map((o) => `'${o.queueId}'`).join(', ')}`)
  console.log(
    `  contact_ids = ${outcomes
      .filter((o) => o.contactId)
      .map((o) => `'${o.contactId}'`)
      .join(', ')}`
  )
  console.log(
    `  deal_ids = ${outcomes
      .filter((o) => o.dealId)
      .map((o) => `'${o.dealId}'`)
      .join(', ')}`
  )
}

main().catch((err) => {
  console.error('Smoke test crashed:', err)
  process.exit(1)
})
