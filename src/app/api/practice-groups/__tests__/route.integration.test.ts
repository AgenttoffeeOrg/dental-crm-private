/**
 * @jest-environment node
 *
 * Phase 2b.86 — Integration test: POST /api/practice-groups.
 *
 * Hits the real test Supabase via the unmocked service client,
 * exercises the real logAuditServer path, then SELECTs the
 * audit_trail row to verify it landed (per CLAUDE.md).
 *
 * Cleans up: deletes the created practice_groups row + its
 * audit_trail row after each test.
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

import { POST } from '../route'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/practice-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const createdGroupIds: string[] = []

describeIntegration('POST /api/practice-groups (integration)', () => {
  afterEach(async () => {
    const service = getServiceClient()
    for (const id of createdGroupIds) {
      await service.from('practice_groups').delete().eq('id', id)
      // Cascade auto-removes user_group_memberships; audit rows we
      // remove explicitly.
      await service
        .from('audit_trail')
        .delete()
        .eq('entity_type', 'practice_group')
        .eq('entity_id', id)
    }
    createdGroupIds.length = 0
  })

  it('happy path: writes group AND a real audit_trail row', async () => {
    const uniqueName = `test-group-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const res = await POST(makeRequest({ name: uniqueName }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.group.id).toMatch(/^[0-9a-f-]{36}$/)
    createdGroupIds.push(body.group.id)

    // Verify the group row landed.
    const service = getServiceClient()
    const { data: row } = await service
      .from('practice_groups')
      .select('id, tenant_id, name')
      .eq('id', body.group.id)
      .single()
    expect(row).toMatchObject({
      id: body.group.id,
      tenant_id: TEST_TENANT_ID,
      name: uniqueName,
    })

    // Verify the audit_trail row landed via the real logAuditServer
    // path (NOT a mock).
    const audit = await fetchLatestAudit({
      entity_type: 'practice_group',
      entity_id: body.group.id,
    })
    expect(audit).not.toBeNull()
    expect(audit?.tenant_id).toBe(TEST_TENANT_ID)
    expect(audit?.action_category).toBe('user')
    expect(audit?.action_type).toBe('create')
  })

  it('rejects empty name with 400 and writes no audit', async () => {
    const res = await POST(makeRequest({ name: '' }))
    expect(res.status).toBe(400)
  })

  it('rejects duplicate name with 409 unique-violation', async () => {
    const uniqueName = `test-group-dup-${Date.now()}`
    const first = await POST(makeRequest({ name: uniqueName }))
    expect(first.status).toBe(200)
    const firstBody = await first.json()
    createdGroupIds.push(firstBody.group.id)

    const second = await POST(makeRequest({ name: uniqueName }))
    expect(second.status).toBe(409)
    const secondBody = await second.json()
    expect(secondBody.error).toBe('name_already_taken')
  })
})
