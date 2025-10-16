/**
 * HARDENING PHASE 11.4: Webhook Idempotency Tests
 * Date: October 16, 2025
 * Purpose: Verify webhooks are idempotent and secure
 */

import { describe, test, expect } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

describe('Webhook Idempotency Tests', () => {
  let supabaseService: any

  beforeAll(() => {
    supabaseService = createClient(supabaseUrl, supabaseServiceKey)
  })

  test('Duplicate event ID is detected', async () => {
    const eventId = 'test-event-' + Date.now()
    const tenantId = await getTestTenantId()

    // Register event first time
    const { data: result1 } = await supabaseService.rpc('register_webhook_event', {
      p_event_id: eventId,
      p_tenant_id: tenantId,
      p_source: 'test',
      p_event_type: 'test.event',
      p_signature: 'sig123',
      p_payload: { test: true }
    })

    expect(result1[0].is_new).toBe(true)

    // Register same event again
    const { data: result2 } = await supabaseService.rpc('register_webhook_event', {
      p_event_id: eventId,
      p_tenant_id: tenantId,
      p_source: 'test',
      p_event_type: 'test.event',
      p_signature: 'sig123',
      p_payload: { test: true }
    })

    expect(result2[0].is_new).toBe(false)

    // Verify status marked as duplicate
    const { data: event } = await supabaseService
      .from('webhook_events')
      .select('status, retry_count')
      .eq('id', eventId)
      .single()

    expect(event.status).toBe('duplicate')
    expect(event.retry_count).toBeGreaterThan(0)
  })

  test('mark_webhook_processed updates status', async () => {
    const eventId = 'test-process-' + Date.now()
    const tenantId = await getTestTenantId()

    // Register event
    await supabaseService.rpc('register_webhook_event', {
      p_event_id: eventId,
      p_tenant_id: tenantId,
      p_source: 'test',
      p_event_type: 'test.event',
      p_signature: 'sig123',
      p_payload: { test: true }
    })

    // Mark as processed
    await supabaseService.rpc('mark_webhook_processed', {
      p_event_id: eventId,
      p_status: 'completed',
      p_result: { success: true }
    })

    // Verify
    const { data: event } = await supabaseService
      .from('webhook_events')
      .select('status, processed_at, result')
      .eq('id', eventId)
      .single()

    expect(event.status).toBe('completed')
    expect(event.processed_at).not.toBeNull()
    expect(event.result).toEqual({ success: true })
  })

  test('Cleanup deletes old events', async () => {
    // Create old completed event (100 days ago)
    const oldEventId = 'old-event-' + Date.now()
    const tenantId = await getTestTenantId()

    await supabaseService.from('webhook_events').insert({
      id: oldEventId,
      tenant_id: tenantId,
      source: 'test',
      event_type: 'test.old',
      payload: {},
      status: 'completed',
      received_at: new Date(Date.now() - 100 * 86400000).toISOString(),
      processed_at: new Date(Date.now() - 100 * 86400000).toISOString()
    })

    // Run cleanup (default 90 days)
    const { data: deletedCount } = await supabaseService.rpc('cleanup_old_webhook_events')

    expect(deletedCount).toBeGreaterThan(0)

    // Verify old event was deleted
    const { data: event } = await supabaseService
      .from('webhook_events')
      .select('*')
      .eq('id', oldEventId)
      .single()

    expect(event).toBeNull()
  })
})

describe('Automation Idempotency Tests', () => {
  test('Same event does not trigger automation twice', async () => {
    const automationId = await createTestAutomation()
    const eventId = 'auto-event-' + Date.now()
    
    // Build idempotency key
    const { data: idemKey } = await supabaseService.rpc('build_automation_idempotency_key', {
      p_automation_id: automationId,
      p_event_id: eventId,
      p_entity_id: null
    })

    // Check eligibility first time
    const { data: eligible1 } = await supabaseService.rpc('check_automation_eligible', {
      p_automation_id: automationId,
      p_idempotency_key: idemKey,
      p_origin_tag: null
    })

    expect(eligible1[0].is_eligible).toBe(true)

    // Create execution log
    await supabaseService.from('automation_execution_logs').insert({
      tenant_id: await getTestTenantId(),
      automation_id: automationId,
      idempotency_key: idemKey,
      status: 'success'
    })

    // Check eligibility again (should be false - already executed)
    const { data: eligible2 } = await supabaseService.rpc('check_automation_eligible', {
      p_automation_id: automationId,
      p_idempotency_key: idemKey,
      p_origin_tag: null
    })

    expect(eligible2[0].is_eligible).toBe(false)
    expect(eligible2[0].reason).toContain('Already executed')
  })

  test('Loop guard prevents infinite loops', async () => {
    const automationId = await createTestAutomation()
    const originTag = 'auto:' + automationId

    // Try to execute with matching origin tag (self-trigger)
    const { data } = await supabaseService.rpc('check_automation_eligible', {
      p_automation_id: automationId,
      p_idempotency_key: 'test-key',
      p_origin_tag: originTag
    })

    expect(data[0].is_eligible).toBe(false)
    expect(data[0].reason).toContain('Loop detected')
  })

  test('Failed automation can retry (up to limit)', async () => {
    const automationId = await createTestAutomation()
    const idemKey = 'retry-test-' + Date.now()

    // Create failed execution with retry_count = 2
    await supabaseService.from('automation_execution_logs').insert({
      tenant_id: await getTestTenantId(),
      automation_id: automationId,
      idempotency_key: idemKey,
      status: 'failed',
      retry_count: 2
    })

    // Check eligibility (should allow retry)
    const { data: eligible1 } = await supabaseService.rpc('check_automation_eligible', {
      p_automation_id: automationId,
      p_idempotency_key: idemKey
    })

    expect(eligible1[0].is_eligible).toBe(true)
    expect(eligible1[0].reason).toContain('Retry allowed')

    // Update to retry_count = 3 (at limit)
    await supabaseService.from('automation_execution_logs')
      .update({ retry_count: 3 })
      .eq('idempotency_key', idemKey)

    // Check again (should deny - max retries)
    const { data: eligible2 } = await supabaseService.rpc('check_automation_eligible', {
      p_automation_id: automationId,
      p_idempotency_key: idemKey
    })

    expect(eligible2[0].is_eligible).toBe(false)
    expect(eligible2[0].reason).toContain('Max retries')
  })
})

// Helper functions
async function getTestTenantId() {
  const { data } = await supabaseService
    .from('tenants')
    .select('id')
    .limit(1)
    .single()
  return data.id
}

async function createTestAutomation() {
  const { data } = await supabaseService
    .from('automations')
    .insert({
      tenant_id: await getTestTenantId(),
      name: 'Test Automation',
      category: 'deal',
      trigger_type: 'deal_created',
      is_active: true
    })
    .select()
    .single()
  return data.id
}

