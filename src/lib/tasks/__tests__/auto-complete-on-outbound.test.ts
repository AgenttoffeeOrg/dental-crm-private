/**
 * Phase 2b.64 — Tests for autoCompleteTasksOnOutbound.
 *
 * Locks the three product invariants from the 2026-05-24 discussion:
 *   1. Channel match is the rule (task_type === outbound channel).
 *   2. Free-floating outbound (no contact_id) closes NOTHING.
 *   3. Tasks created AFTER the outbound DO NOT close. (Prevents a
 *      brand-new task from auto-closing the instant it's created.)
 *   4. ALL matching open tasks close, not just one. (Batch intent —
 *      one send satisfies multiple "send X" tasks.)
 */

import { autoCompleteTasksOnOutbound } from '../auto-complete-on-outbound'

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const CONTACT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const OUTBOUND_ACTIVITY = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

type TaskRow = {
  id: string
  tenant_id: string
  contact_id: string
  task_type: string
  status: string
  created_at: string
  completed_at?: string | null
  auto_completed_via_activity_id?: string | null
}

function makeSupabase(tasksTable: TaskRow[]) {
  const updates: Array<{ ids: string[]; patch: Record<string, unknown> }> = []
  return {
    updates,
    client: {
      from: (table: string) => {
        if (table !== 'tasks') {
          throw new Error(`Unexpected table: ${table}`)
        }
        const filters: Array<[string, unknown]> = []
        const inFilters: Array<[string, unknown[]]> = []
        const ltFilters: Array<[string, string]> = []
        let isUpdate = false
        let updatePatch: Record<string, unknown> | null = null

        const builder: any = {
          select: () => builder,
          eq: (col: string, val: unknown) => {
            filters.push([col, val])
            return builder
          },
          in: (col: string, vals: unknown[]) => {
            inFilters.push([col, vals])
            return builder
          },
          lt: (col: string, val: string) => {
            ltFilters.push([col, val])
            return builder
          },
          update: (patch: Record<string, unknown>) => {
            isUpdate = true
            updatePatch = patch
            return builder
          },
          then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
            const rows = tasksTable.filter((row) => {
              for (const [col, val] of filters) {
                if ((row as any)[col] !== val) return false
              }
              for (const [col, vals] of inFilters) {
                if (!vals.includes((row as any)[col])) return false
              }
              for (const [col, val] of ltFilters) {
                if (!((row as any)[col] < val)) return false
              }
              return true
            })
            if (isUpdate && updatePatch) {
              const ids = rows.map((r) => r.id)
              updates.push({ ids, patch: updatePatch })
              return Promise.resolve({ data: null, error: null }).then(resolve)
            }
            return Promise.resolve({
              data: rows.map((r) => ({ id: r.id })),
              error: null,
            }).then(resolve)
          },
        }
        return builder
      },
    },
  }
}

describe('autoCompleteTasksOnOutbound', () => {
  it('closes ALL matching open tasks (batch intent)', async () => {
    const tasks: TaskRow[] = [
      { id: 't1', tenant_id: TENANT, contact_id: CONTACT, task_type: 'sms', status: 'open', created_at: '2026-05-20T10:00:00Z' },
      { id: 't2', tenant_id: TENANT, contact_id: CONTACT, task_type: 'sms', status: 'open', created_at: '2026-05-21T10:00:00Z' },
    ]
    const { client, updates } = makeSupabase(tasks)

    const result = await autoCompleteTasksOnOutbound(client as any, {
      tenantId: TENANT,
      contactId: CONTACT,
      channel: 'sms',
      activityId: OUTBOUND_ACTIVITY,
      activityOccurredAt: '2026-05-24T15:00:00Z',
    })

    expect(result.completedTaskIds.sort()).toEqual(['t1', 't2'])
    expect(updates.length).toBe(1)
    expect(updates[0].patch.status).toBe('done')
    expect(updates[0].patch.auto_completed_via_activity_id).toBe(OUTBOUND_ACTIVITY)
  })

  it('does NOT close tasks created AFTER the outbound activity', async () => {
    const tasks: TaskRow[] = [
      // Created before the outbound — should close.
      { id: 't_before', tenant_id: TENANT, contact_id: CONTACT, task_type: 'email', status: 'open', created_at: '2026-05-20T10:00:00Z' },
      // Created AFTER the outbound — should NOT close.
      { id: 't_after', tenant_id: TENANT, contact_id: CONTACT, task_type: 'email', status: 'open', created_at: '2026-05-24T16:00:00Z' },
    ]
    const { client } = makeSupabase(tasks)

    const result = await autoCompleteTasksOnOutbound(client as any, {
      tenantId: TENANT,
      contactId: CONTACT,
      channel: 'email',
      activityId: OUTBOUND_ACTIVITY,
      activityOccurredAt: '2026-05-24T15:00:00Z',
    })

    expect(result.completedTaskIds).toEqual(['t_before'])
    expect(result.completedTaskIds).not.toContain('t_after')
  })

  it('does NOT close tasks of a different channel', async () => {
    const tasks: TaskRow[] = [
      { id: 't_sms', tenant_id: TENANT, contact_id: CONTACT, task_type: 'sms', status: 'open', created_at: '2026-05-20T10:00:00Z' },
      { id: 't_email', tenant_id: TENANT, contact_id: CONTACT, task_type: 'email', status: 'open', created_at: '2026-05-20T10:00:00Z' },
    ]
    const { client } = makeSupabase(tasks)

    const result = await autoCompleteTasksOnOutbound(client as any, {
      tenantId: TENANT,
      contactId: CONTACT,
      channel: 'sms',
      activityId: OUTBOUND_ACTIVITY,
      activityOccurredAt: '2026-05-24T15:00:00Z',
    })

    expect(result.completedTaskIds).toEqual(['t_sms'])
  })

  it('does NOT close tasks for a different contact', async () => {
    const tasks: TaskRow[] = [
      { id: 't_other_contact', tenant_id: TENANT, contact_id: 'other-contact', task_type: 'sms', status: 'open', created_at: '2026-05-20T10:00:00Z' },
    ]
    const { client } = makeSupabase(tasks)

    const result = await autoCompleteTasksOnOutbound(client as any, {
      tenantId: TENANT,
      contactId: CONTACT,
      channel: 'sms',
      activityId: OUTBOUND_ACTIVITY,
      activityOccurredAt: '2026-05-24T15:00:00Z',
    })

    expect(result.completedTaskIds).toEqual([])
  })

  it('does NOT close already-done or cancelled tasks', async () => {
    const tasks: TaskRow[] = [
      { id: 't_done', tenant_id: TENANT, contact_id: CONTACT, task_type: 'sms', status: 'done', created_at: '2026-05-20T10:00:00Z' },
      { id: 't_cancelled', tenant_id: TENANT, contact_id: CONTACT, task_type: 'sms', status: 'cancelled', created_at: '2026-05-20T10:00:00Z' },
    ]
    const { client } = makeSupabase(tasks)

    const result = await autoCompleteTasksOnOutbound(client as any, {
      tenantId: TENANT,
      contactId: CONTACT,
      channel: 'sms',
      activityId: OUTBOUND_ACTIVITY,
      activityOccurredAt: '2026-05-24T15:00:00Z',
    })

    expect(result.completedTaskIds).toEqual([])
  })

  it('returns empty + no DB call when contactId is null (free-floating outbound)', async () => {
    const { client } = makeSupabase([])
    const result = await autoCompleteTasksOnOutbound(client as any, {
      tenantId: TENANT,
      contactId: null,
      channel: 'sms',
      activityId: OUTBOUND_ACTIVITY,
      activityOccurredAt: '2026-05-24T15:00:00Z',
    })
    expect(result.completedTaskIds).toEqual([])
  })

  it('returns empty when no candidates match (silent no-op)', async () => {
    const { client } = makeSupabase([])
    const result = await autoCompleteTasksOnOutbound(client as any, {
      tenantId: TENANT,
      contactId: CONTACT,
      channel: 'sms',
      activityId: OUTBOUND_ACTIVITY,
      activityOccurredAt: '2026-05-24T15:00:00Z',
    })
    expect(result.completedTaskIds).toEqual([])
    expect(result.error).toBeUndefined()
  })
})
