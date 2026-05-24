/**
 * @jest-environment node
 *
 * Phase 2b.86 — Integration test: PATCH /api/tenant-routing-settings/
 * default-assignee-policy.
 *
 * Real Supabase, real audit. Resets policy to a sentinel before each
 * test and restores the prior value after (so the test tenant doesn't
 * end up with an arbitrary policy after the suite runs).
 */

import { NextRequest } from 'next/server'
import {
  buildTestContext,
  describeIntegration,
  fetchLatestAudit,
  getServiceClient,
  TEST_TENANT_ID,
} from '@/test-utils/integration-context'

jest.mock('@/lib/api/context', () => ({
  ApiContextError: jest.requireActual('@/lib/api/context').ApiContextError,
  getApiRequestContext: jest.fn(async () => buildTestContext()),
}))

import { PATCH } from '../route'

function makeRequest(body: unknown) {
  return new NextRequest(
    'http://localhost/api/tenant-routing-settings/default-assignee-policy',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
}

let priorPolicy: Record<string, unknown> | null = null

describeIntegration('PATCH default-assignee-policy (integration)', () => {
  beforeAll(async () => {
    const service = getServiceClient()
    const { data } = await service
      .from('tenant_routing_settings')
      .select('default_assignee_policy')
      .eq('tenant_id', TEST_TENANT_ID)
      .maybeSingle()
    priorPolicy = (data as any)?.default_assignee_policy ?? null
  })

  afterAll(async () => {
    // Restore the prior policy and clean up audit rows we created.
    const service = getServiceClient()
    if (priorPolicy) {
      await service
        .from('tenant_routing_settings')
        .update({ default_assignee_policy: priorPolicy })
        .eq('tenant_id', TEST_TENANT_ID)
    }
    await service
      .from('audit_trail')
      .delete()
      .eq('entity_type', 'tenant_routing_settings')
      .eq('entity_id', TEST_TENANT_ID)
  })

  it('happy path with contact_owner mode + writes a real audit_trail row', async () => {
    const res = await PATCH(
      makeRequest({ default_assignee_policy: { mode: 'contact_owner' } })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

    const service = getServiceClient()
    const { data } = await service
      .from('tenant_routing_settings')
      .select('default_assignee_policy')
      .eq('tenant_id', TEST_TENANT_ID)
      .single()
    expect((data as any).default_assignee_policy).toEqual({ mode: 'contact_owner' })

    const audit = await fetchLatestAudit({
      entity_type: 'tenant_routing_settings',
      entity_id: TEST_TENANT_ID,
    })
    expect(audit).not.toBeNull()
    expect(audit?.action_type).toBe('update')
    expect(audit?.category).toBe('setting')
  })

  it('group mode without group_id fails Zod refinement (no audit written)', async () => {
    // Read audit count before to confirm none added.
    const audit_before = await fetchLatestAudit({
      entity_type: 'tenant_routing_settings',
      entity_id: TEST_TENANT_ID,
    })
    const res = await PATCH(makeRequest({ default_assignee_policy: { mode: 'group' } }))
    expect(res.status).toBe(400)
    const audit_after = await fetchLatestAudit({
      entity_type: 'tenant_routing_settings',
      entity_id: TEST_TENANT_ID,
    })
    expect(audit_after?.id).toBe(audit_before?.id)
  })
})
