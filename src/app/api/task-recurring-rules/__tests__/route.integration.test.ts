/**
 * @jest-environment node
 *
 * Phase 2b.86 — Integration test for POST and DELETE
 * /api/task-recurring-rules.
 *
 * Real Supabase, real audit. Validates the orphan-cleanup pattern
 * works end-to-end: create a rule via POST, delete it via DELETE,
 * SELECT audit_trail to verify both rows landed.
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

import { POST as ruleCreatePost } from '../route'
import { DELETE as ruleDelete } from '../[id]/route'

function makeCreateRequest(body: unknown) {
  return new NextRequest('http://localhost/api/task-recurring-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const createdRuleIds: string[] = []

describeIntegration('task-recurring-rules POST + DELETE (integration)', () => {
  afterEach(async () => {
    const service = getServiceClient()
    for (const id of createdRuleIds) {
      await service.from('task_recurring_rules').delete().eq('id', id)
      await service
        .from('audit_trail')
        .delete()
        .eq('entity_type', 'task_recurring_rule')
        .eq('entity_id', id)
    }
    createdRuleIds.length = 0
  })

  it('POST happy path: writes rule + real audit row', async () => {
    const res = await ruleCreatePost(
      makeCreateRequest({ frequency: 'weekly', interval_count: 1, weekly_days: [1, 3, 5] })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/)
    createdRuleIds.push(body.id)

    const service = getServiceClient()
    const { data: row } = await service
      .from('task_recurring_rules')
      .select('id, tenant_id, frequency, interval_count, weekly_days')
      .eq('id', body.id)
      .single()
    expect(row).toMatchObject({
      id: body.id,
      tenant_id: TEST_TENANT_ID,
      frequency: 'weekly',
      interval_count: 1,
      weekly_days: [1, 3, 5],
    })

    const audit = await fetchLatestAudit({
      entity_type: 'task_recurring_rule',
      entity_id: body.id,
    })
    expect(audit).not.toBeNull()
    expect(audit?.action_type).toBe('create')
  })

  it('DELETE removes the rule + writes a real audit row', async () => {
    // Seed a rule to delete.
    const create = await ruleCreatePost(
      makeCreateRequest({ frequency: 'daily', interval_count: 1 })
    )
    const created = await create.json()
    const ruleId: string = created.id
    createdRuleIds.push(ruleId)

    const req = new NextRequest(
      `http://localhost/api/task-recurring-rules/${ruleId}`,
      { method: 'DELETE' }
    )
    const res = await ruleDelete(req, { params: { id: ruleId } })
    expect(res.status).toBe(200)

    const service = getServiceClient()
    const { data: row } = await service
      .from('task_recurring_rules')
      .select('id')
      .eq('id', ruleId)
      .maybeSingle()
    expect(row).toBeNull()

    // Two audit rows now exist (create + delete). Most recent should
    // be the delete.
    const audit = await fetchLatestAudit({
      entity_type: 'task_recurring_rule',
      entity_id: ruleId,
    })
    expect(audit?.action_type).toBe('delete')
  })

  it('DELETE is idempotent on a missing id', async () => {
    const missingId = '00000000-0000-0000-0000-000000000000'
    const req = new NextRequest(
      `http://localhost/api/task-recurring-rules/${missingId}`,
      { method: 'DELETE' }
    )
    const res = await ruleDelete(req, { params: { id: missingId } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
