/**
 * Integration tests for the core CRM APIs:
 * - /api/deals
 * - /api/tasks
 * - /api/activities
 *
 * These tests validate CRUD operations, tenant/location isolation,
 * and authentication behaviour using a real Supabase instance.
 */

import { beforeAll, afterAll, describe, it, expect, jest } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

jest.setTimeout(120_000)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const TEST_EMAIL = `crm-api-test-${Date.now()}@example.com`
const TEST_PASSWORD = 'Testpassword123!'

let tenantId: string
let locationId: string
let otherLocationId: string
let contactId: string
let pipelineId: string
let stageId: string
let userId: string
let membershipId: string
let accessToken: string
let dealId: string
let scriptVersionId: string
let scriptUsageId: string

async function signIn(): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (error || !data.session?.access_token) {
    throw new Error(`Failed to sign in test user: ${error?.message}`)
  }
  return data.session.access_token
}

beforeAll(async () => {
  // --- Create tenant and locations
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .insert({ name: 'CRM API Test Tenant', timezone: 'UTC' })
    .select()
    .single()
  tenantId = tenant.id

  const { data: locationA } = await supabaseAdmin
    .from('locations')
    .insert({ tenant_id: tenantId, name: 'HQ Location' })
    .select()
    .single()
  locationId = locationA.id

  const { data: locationB } = await supabaseAdmin
    .from('locations')
    .insert({ tenant_id: tenantId, name: 'Branch Location' })
    .select()
    .single()
  otherLocationId = locationB.id

  // --- Create pipeline + stage
  const { data: pipeline } = await supabaseAdmin
    .from('pipelines')
    .insert({
      tenant_id: tenantId,
      name: 'API Test Pipeline',
      location_id: locationId,
    })
    .select()
    .single()
  pipelineId = pipeline.id

  const { data: stage } = await supabaseAdmin
    .from('pipeline_stages')
    .insert({
      tenant_id: tenantId,
      pipeline_id: pipelineId,
      name: 'Initial Contact',
      position: 1,
    })
    .select()
    .single()
  stageId = stage.id

  // --- Create contact
  const { data: contact } = await supabaseAdmin
    .from('contacts')
    .insert({
      tenant_id: tenantId,
      full_name: 'API Test Contact',
      location_id: locationId,
      status: 'lead',
    })
    .select()
    .single()
  contactId = contact.id

  // --- Create test user (Supabase auth + app_users)
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (authError || !authUser.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`)
  }
  userId = authUser.user.id

  await supabaseAdmin.from('app_users').insert({
    id: userId,
    email: TEST_EMAIL,
    full_name: 'CRM API Tester',
    active_tenant_id: tenantId,
    active_location_id: locationId,
  })

  const { data: membership } = await supabaseAdmin
    .from('user_tenant_memberships')
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      role: 'admin',
      status: 'active',
      all_locations: false,
    })
    .select()
    .single()
  membershipId = membership.id

  await supabaseAdmin.from('membership_locations').insert([
    { membership_id: membershipId, location_id: locationId, is_active: true },
  ])

  accessToken = await signIn()
})

afterAll(async () => {
  await supabaseAdmin.auth.admin.deleteUser(userId)
  await supabaseAdmin.from('tenants').delete().eq('id', tenantId)
})

const authHeaders = (token = accessToken) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
})

describe('Deals API', () => {
  it('creates a deal for an accessible tenant/location', async () => {
    const response = await fetch(`${baseUrl}/api/deals`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: 'New Invisalign Deal',
        contact_id: contactId,
        pipeline_id: pipelineId,
        stage_id: stageId,
        value_estimate_cents: 250000,
      }),
    })

    expect(response.status).toBe(201)
    const body = await response.json()
    dealId = body.deal.id

    expect(body.deal.tenant_id).toBe(tenantId)
    expect(body.deal.contact_id).toBe(contactId)

    const { data: storedDeal } = await supabaseAdmin
      .from('deals')
      .select('id, tenant_id, location_id')
      .eq('id', dealId)
      .single()
    expect(storedDeal?.tenant_id).toBe(tenantId)
    expect(storedDeal?.location_id).toBe(locationId)
  })

  it('lists deals limited to accessible locations', async () => {
    // Insert a deal in another location (user should not see it)
    await supabaseAdmin
      .from('deals')
      .insert({
        tenant_id: tenantId,
        contact_id: contactId,
        pipeline_id: pipelineId,
        stage_id: stageId,
        title: 'Hidden Deal',
        status: 'open',
        location_id: otherLocationId,
      })

    const response = await fetch(`${baseUrl}/api/deals?limit=25`, {
      method: 'GET',
      headers: authHeaders(),
    })
    expect(response.status).toBe(200)
    const body = await response.json()

    const ids = body.deals.map((d: any) => d.id)
    expect(ids).toContain(dealId)
    expect(ids).not.toContain('Hidden Deal')
  })

  it('blocks creating a deal in an unauthorized location', async () => {
    const response = await fetch(`${baseUrl}/api/deals`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: 'Unauthorized Deal',
        contact_id: contactId,
        pipeline_id: pipelineId,
        stage_id: stageId,
        location_id: otherLocationId,
      }),
    })

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain('Location access denied')
  })

  it('updates a deal status', async () => {
    const response = await fetch(`${baseUrl}/api/deals/${dealId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: 'won' }),
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.deal.status).toBe('won')
  })

  it('archives a deal via DELETE', async () => {
    const response = await fetch(`${baseUrl}/api/deals/${dealId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)

    const { data: storedDeal } = await supabaseAdmin
      .from('deals')
      .select('status, deleted_at')
      .eq('id', dealId)
      .single()
    expect(storedDeal?.status).toBe('archived')
    expect(storedDeal?.deleted_at).not.toBeNull()
  })

  it('requires authentication', async () => {
    const response = await fetch(`${baseUrl}/api/deals`, { method: 'GET' })
    expect(response.status).toBe(401)
  })
})

describe('Tasks API', () => {
  let supportingDealId: string
  let taskId: string

  beforeAll(async () => {
    const { data: deal } = await supabaseAdmin
      .from('deals')
      .insert({
        tenant_id: tenantId,
        contact_id: contactId,
        pipeline_id: pipelineId,
        stage_id: stageId,
        title: 'Task Parent Deal',
        status: 'open',
        owner_user_id: userId,
        location_id: locationId,
      })
      .select()
      .single()
    supportingDealId = deal.id
  })

  it('creates a task for accessible location', async () => {
    const response = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: 'Follow up call',
        task_type: 'call',
        deal_id: supportingDealId,
        contact_id: contactId,
        due_at: new Date().toISOString(),
      }),
    })

    expect(response.status).toBe(201)
    const body = await response.json()
    taskId = body.task.id

    expect(body.task.status).toBe('open')
    expect(body.task.location_id).toBe(locationId)
  })

  it('lists tasks limited to accessible locations', async () => {
    await supabaseAdmin.from('tasks').insert({
      tenant_id: tenantId,
      title: 'Hidden Task',
      status: 'open',
      task_type: 'todo',
      location_id: otherLocationId,
    })

    const response = await fetch(`${baseUrl}/api/tasks?limit=50`, {
      method: 'GET',
      headers: authHeaders(),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    const ids = body.tasks.map((t: any) => t.id)
    expect(ids).toContain(taskId)
    expect(body.tasks.find((t: any) => t.title === 'Hidden Task')).toBeUndefined()
  })

  it('blocks creating a task in an unauthorized location', async () => {
    const response = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: 'Unauthorized Task',
        task_type: 'todo',
        location_id: otherLocationId,
      }),
    })
    expect(response.status).toBe(403)
  })

  it('updates a task status', async () => {
    const response = await fetch(`${baseUrl}/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: 'done' }),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.task.status).toBe('done')
  })

  it('cancels a task via DELETE', async () => {
    const response = await fetch(`${baseUrl}/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    expect(response.status).toBe(200)

    const { data: storedTask } = await supabaseAdmin
      .from('tasks')
      .select('status, deleted_at')
      .eq('id', taskId)
      .single()
    expect(storedTask?.status).toBe('cancelled')
    expect(storedTask?.deleted_at).not.toBeNull()
  })

  it('requires authentication', async () => {
    const response = await fetch(`${baseUrl}/api/tasks`, { method: 'GET' })
    expect(response.status).toBe(401)
  })
})

describe('Activities API', () => {
  let activityId: string

  it('creates an activity with automatic location scoping', async () => {
    const response = await fetch(`${baseUrl}/api/activities`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        type: 'call',
        contact_id: contactId,
        deal_id: null,
        subject: 'Intro call summary',
        snippet: 'Patient asked about braces availability.',
      }),
    })
    expect(response.status).toBe(201)
    const body = await response.json()
    activityId = body.activity.id

    const { data: storedActivity } = await supabaseAdmin
      .from('activities')
      .select('tenant_id, location_id')
      .eq('id', activityId)
      .single()
    expect(storedActivity?.tenant_id).toBe(tenantId)
    expect(storedActivity?.location_id).toBe(locationId)
  })

  it('lists activities limited to accessible locations', async () => {
    await supabaseAdmin.from('activities').insert({
      tenant_id: tenantId,
      type: 'note',
      contact_id: contactId,
      location_id: otherLocationId,
      subject: 'Hidden Note',
    })

    const response = await fetch(`${baseUrl}/api/activities?limit=50`, {
      method: 'GET',
      headers: authHeaders(),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    const ids = body.activities.map((a: any) => a.id)
    expect(ids).toContain(activityId)
    expect(body.activities.find((a: any) => a.subject === 'Hidden Note')).toBeUndefined()
  })

  it('blocks creating activity in unauthorized location', async () => {
    const response = await fetch(`${baseUrl}/api/activities`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        type: 'email',
        contact_id: contactId,
        location_id: otherLocationId,
      }),
    })
    expect(response.status).toBe(403)
  })

  it('updates an activity', async () => {
    const response = await fetch(`${baseUrl}/api/activities/${activityId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ outcome: 'completed', is_edited: true }),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.activity.outcome).toBe('completed')
    expect(body.activity.is_edited).toBe(true)
  })

  it('soft-deletes an activity via DELETE', async () => {
    const response = await fetch(`${baseUrl}/api/activities/${activityId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)

    const { data: storedActivity } = await supabaseAdmin
      .from('activities')
      .select('deleted_at')
      .eq('id', activityId)
      .single()
    expect(storedActivity?.deleted_at).not.toBeNull()
  })

  it('requires authentication', async () => {
    const response = await fetch(`${baseUrl}/api/activities`, { method: 'GET' })
    expect(response.status).toBe(401)
  })
})

describe('Script Intelligence APIs', () => {
  it('returns recommended scripts for a contact', async () => {
    const response = await fetch(
      `${baseUrl}/api/scripts/recommendations?trigger=price_objection&contactId=${contactId}`,
      {
        method: 'GET',
        headers: authHeaders(),
      }
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)

    scriptVersionId = body.data[0].scriptVersionId
    expect(scriptVersionId).toBeDefined()
  })

  it('logs script usage tied to the contact and deal', async () => {
    const response = await fetch(`${baseUrl}/api/scripts/usages`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        scriptVersionId,
        contactId,
        dealId,
        trigger: 'price_objection',
      }),
    })

    expect(response.status).toBe(201)
    const body = await response.json()
    scriptUsageId = body.data.id
    expect(scriptUsageId).toBeDefined()

    const { data: usage } = await supabaseAdmin
      .from('sales_script_usages')
      .select('id, contact_id, deal_id')
      .eq('id', scriptUsageId)
      .single()

    expect(usage?.id).toBe(scriptUsageId)
    expect(usage?.contact_id).toBe(contactId)
    expect(usage?.deal_id).toBe(dealId)
  })

  it('records an appointment outcome via the outcomes API', async () => {
    const response = await fetch(`${baseUrl}/api/scripts/outcomes`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        usageId: scriptUsageId,
        outcomeType: 'appointment_booked',
        notes: 'Booked hygiene visit from Next Best Script panel',
        revenueCents: 15000,
      }),
    })

    expect(response.status).toBe(201)

    const { data: appointmentOutcome } = await supabaseAdmin
      .from('conversation_outcomes')
      .select('id, outcome_type')
      .eq('usage_id', scriptUsageId)
      .eq('outcome_type', 'appointment_booked')
      .maybeSingle()

    expect(appointmentOutcome?.outcome_type).toBe('appointment_booked')
  })

  it('records a deal win outcome when updating the deal', async () => {
    const response = await fetch(`${baseUrl}/api/deals/${dealId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({
        status: 'won',
        script_outcome: {
          usage_id: scriptUsageId,
          outcome_type: 'deal_won',
          notes: 'Closed after price objection script',
          revenue_cents: 250000,
        },
      }),
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.deal.status).toBe('won')

    const { data: wonOutcome } = await supabaseAdmin
      .from('conversation_outcomes')
      .select('id, outcome_type')
      .eq('usage_id', scriptUsageId)
      .eq('outcome_type', 'deal_won')
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    expect(wonOutcome?.outcome_type).toBe('deal_won')

    const { data: versionMetrics } = await supabaseAdmin
      .from('sales_script_versions')
      .select('positive_outcome_count, outcome_count, success_rate')
      .eq('id', scriptVersionId)
      .single()

    expect(versionMetrics?.outcome_count).toBeGreaterThanOrEqual(2)
    expect(versionMetrics?.positive_outcome_count).toBeGreaterThanOrEqual(2)
    expect(versionMetrics?.success_rate).toBeGreaterThan(0)
  })
})

describe('Psychological Profile API', () => {
  it('analyzes and stores a psychological profile for the contact', async () => {
    const response = await fetch(`${baseUrl}/api/psych-profiles/analyze`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ contactId }),
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data?.profile?.anxietyLevel).toBeDefined()
    expect(body.data?.profile?.trustScore).toBeDefined()

    const { data: storedProfile } = await supabaseAdmin
      .from('contact_psych_profiles')
      .select('anxiety_level, trust_score, snapshot')
      .eq('contact_id', contactId)
      .single()

    expect(storedProfile?.anxiety_level).toBeGreaterThanOrEqual(0)
    expect(storedProfile?.trust_score).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(storedProfile?.snapshot?.persona_tags)).toBe(true)

    const { data: historyEntries } = await supabaseAdmin
      .from('contact_psych_profile_history')
      .select('id')
      .eq('contact_id', contactId)
      .order('recorded_at', { ascending: false })
      .limit(1)

    expect((historyEntries ?? []).length).toBeGreaterThan(0)
  })
})

describe('Analytics Learning Loop API', () => {
  it('recomputes script metrics synchronously for the tenant', async () => {
    const response = await fetch(`${baseUrl}/api/system/analytics/recompute`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ tenantId, targetDate: new Date().toISOString(), mode: 'sync' }),
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data?.processedScripts).toBeGreaterThanOrEqual(0)

    const { data: metricRows } = await supabaseAdmin
      .from('sales_script_metrics')
      .select('script_version_id, metric_date, usages, successful_outcomes')
      .eq('tenant_id', tenantId)
      .eq('script_version_id', scriptVersionId)
      .order('metric_date', { ascending: false })
      .limit(1)

    expect((metricRows ?? []).length).toBeGreaterThan(0)
  })
})
