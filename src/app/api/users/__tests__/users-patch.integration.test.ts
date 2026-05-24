/**
 * @jest-environment node
 *
 * Phase 2b.86 — Integration test for PATCH /api/users/[id].
 *
 * Real Supabase, real audit. Updates a test team member's full_name
 * via the route, verifies the audit row landed, and restores the
 * prior value afterwards.
 *
 * Uses the operator user (deepakshegde@gmail.com) as the target since
 * they're the known test member of the test tenant.
 */

import { NextRequest } from 'next/server'
import {
  buildTestContext,
  describeIntegration,
  fetchLatestAudit,
  getServiceClient,
  TEST_TENANT_ID,
  TEST_USER_ID,
} from '@/test-utils/integration-context'

jest.mock('@/lib/api/context', () => ({
  ApiContextError: jest.requireActual('@/lib/api/context').ApiContextError,
  getApiRequestContext: jest.fn(async () => buildTestContext()),
}))

import { PATCH } from '../[id]/route'

function makeRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

let priorFullName: string | null = null

describeIntegration('PATCH /api/users/[id] (integration)', () => {
  beforeAll(async () => {
    const service = getServiceClient()
    const { data } = await service
      .from('app_users')
      .select('full_name')
      .eq('id', TEST_USER_ID)
      .single()
    priorFullName = (data as any)?.full_name ?? null
  })

  afterAll(async () => {
    const service = getServiceClient()
    if (priorFullName !== null) {
      await service
        .from('app_users')
        .update({ full_name: priorFullName })
        .eq('id', TEST_USER_ID)
    }
    await service
      .from('audit_trail')
      .delete()
      .eq('entity_type', 'app_user')
      .eq('entity_id', TEST_USER_ID)
  })

  it('happy path: updates full_name + writes real audit row', async () => {
    const newName = `Integration Test ${Date.now()}`
    const res = await PATCH(makeRequest(TEST_USER_ID, { full_name: newName }), {
      params: { id: TEST_USER_ID },
    })
    expect(res.status).toBe(200)

    const service = getServiceClient()
    const { data } = await service
      .from('app_users')
      .select('full_name')
      .eq('id', TEST_USER_ID)
      .single()
    expect((data as any).full_name).toBe(newName)

    const audit = await fetchLatestAudit({
      entity_type: 'app_user',
      entity_id: TEST_USER_ID,
    })
    expect(audit).not.toBeNull()
    expect(audit?.action_type).toBe('update')
    expect(audit?.tenant_id).toBe(TEST_TENANT_ID)
    expect((audit?.changed_fields ?? []).includes('full_name')).toBe(true)
  })

  it('rejects self-as-manager with 400', async () => {
    const res = await PATCH(
      makeRequest(TEST_USER_ID, { manager_user_id: TEST_USER_ID }),
      { params: { id: TEST_USER_ID } }
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('self_manager')
  })

  it('rejects manager not in tenant with 400', async () => {
    const bogusManager = '11111111-2222-3333-4444-555555555555'
    const res = await PATCH(
      makeRequest(TEST_USER_ID, { manager_user_id: bogusManager }),
      { params: { id: TEST_USER_ID } }
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('manager_not_in_tenant')
  })
})
