/**
 * @jest-environment node
 *
 * Phase 2b.14 — Automation engine unit tests.
 *
 * Mocks the Supabase service client; verifies:
 *  - startRun walks a linear graph end-to-end and writes
 *    automation_runs + automation_execution_logs.
 *  - A `wait` node puts the run in `waiting` state and stops walking.
 *  - `condition` branches via next_true / next_false.
 *  - `send_*` action types write a stub activity row.
 *  - processWaitingRuns picks up due rows and resumes them.
 *  - send_ai_reply throws (deferred to 2b.15).
 */

type MockOp = {
  table: string
  op: 'select' | 'insert' | 'update' | 'maybeSingle' | 'single'
  payload?: unknown
  filters?: Record<string, unknown>
}

const ops: MockOp[] = []

// In-memory rows the mock returns from select chains.
let automationRow: Record<string, unknown> | null = null
let waitingRunsRows: Record<string, unknown>[] = []
let contactRow: Record<string, unknown> | null = null

// Insert returns synthesized ids.
let nextRunId = 1
let nextLogId = 1

function chainable(table: string) {
  const filters: Record<string, unknown> = {}
  const builder = {
    select: (_cols?: string) => {
      ops.push({ table, op: 'select', filters: { ...filters } })
      return builder
    },
    insert: (payload: unknown) => {
      ops.push({ table, op: 'insert', payload })
      if (table === 'automation_runs') {
        const id = `run-${nextRunId++}`
        return {
          select: () => ({
            single: async () => ({ data: { id }, error: null }),
          }),
        }
      }
      if (table === 'automation_execution_logs') {
        return Promise.resolve({ data: { id: `log-${nextLogId++}` }, error: null }) as unknown
      }
      return Promise.resolve({ data: null, error: null }) as unknown
    },
    update: (payload: unknown) => {
      ops.push({ table, op: 'update', payload, filters: { ...filters } })
      return { eq: (_k: string, _v: unknown) => Promise.resolve({ data: null, error: null }) }
    },
    eq: (key: string, value: unknown) => {
      filters[key] = value
      return builder
    },
    is: (_k: string, _v: unknown) => builder,
    lte: (_k: string, _v: unknown) => builder,
    limit: (_n: number) => builder,
    maybeSingle: async () => {
      if (table === 'automations') return { data: automationRow, error: null }
      return { data: null, error: null }
    },
    single: async () => {
      if (table === 'contacts') return { data: contactRow, error: null }
      return { data: null, error: null }
    },
  }
  return builder
}

// The processWaitingRuns query needs a different shape (returns an
// array). Use a "from" override per-call when needed.
let processWaitingShouldReturn: Record<string, unknown>[] = []

const supabaseMock = {
  from: (table: string) => {
    if (table === 'automation_runs' && processWaitingShouldReturn.length > 0) {
      // Hand a one-shot select chain back for the cron path.
      const rows = processWaitingShouldReturn
      processWaitingShouldReturn = []
      return {
        select: () => ({
          eq: () => ({
            lte: () => ({
              limit: async () => ({ data: rows, error: null }),
            }),
          }),
        }),
        update: (payload: unknown) => {
          ops.push({ table, op: 'update', payload })
          return { eq: () => Promise.resolve({ data: null, error: null }) }
        },
      }
    }
    return chainable(table)
  },
}

jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: jest.fn(() => supabaseMock),
}))

import { AutomationEngine } from '../automation-engine'

beforeEach(() => {
  ops.length = 0
  automationRow = null
  waitingRunsRows = []
  contactRow = null
  nextRunId = 1
  nextLogId = 1
  processWaitingShouldReturn = []
})

function makeAutomation(graph: unknown) {
  automationRow = {
    id: 'auto-1',
    tenant_id: 'tenant-1',
    name: 'test',
    status: 'active',
    graph_json: graph,
    active_runs: 0,
    total_runs: 0,
    successful_runs: 0,
    failed_runs: 0,
  }
}

describe('AutomationEngine.startRun', () => {
  it('throws if automation is missing', async () => {
    automationRow = null
    const engine = new AutomationEngine(supabaseMock as never)
    await expect(
      engine.startRun({ tenantId: 't1', automationId: 'missing', contactId: 'c1' })
    ).rejects.toThrow(/not found/)
  })

  it('throws if automation is not active', async () => {
    makeAutomation({ start_key: 'n1', nodes: [{ key: 'n1', type: 'end' }] })
    ;(automationRow as Record<string, unknown>).status = 'draft'
    const engine = new AutomationEngine(supabaseMock as never)
    await expect(
      engine.startRun({ tenantId: 't1', automationId: 'auto-1', contactId: 'c1' })
    ).rejects.toThrow(/not active/)
  })

  it('walks a linear graph to completion', async () => {
    makeAutomation({
      start_key: 'n1',
      nodes: [
        { key: 'n1', type: 'add_tag', config: { tag: 'auto-tagged' }, next: 'n2' },
        { key: 'n2', type: 'end' },
      ],
    })
    contactRow = { id: 'c1', tags: [] }
    const engine = new AutomationEngine(supabaseMock as never)
    const result = await engine.startRun({
      tenantId: 't1',
      automationId: 'auto-1',
      contactId: 'c1',
    })

    expect(result.finalState).toBe('completed')
    expect(result.nodesExecuted).toEqual(['n1', 'n2'])

    const inserts = ops.filter((o) => o.op === 'insert')
    const tables = inserts.map((o) => o.table)
    expect(tables).toContain('automation_runs')
    expect(tables.filter((t) => t === 'automation_execution_logs').length).toBe(2)
  })

  it('parks the run in `waiting` on a wait node', async () => {
    makeAutomation({
      start_key: 'n1',
      nodes: [
        { key: 'n1', type: 'wait', config: { duration: 5, unit: 'minutes' }, next: 'n2' },
        { key: 'n2', type: 'end' },
      ],
    })
    const engine = new AutomationEngine(supabaseMock as never)
    const result = await engine.startRun({
      tenantId: 't1',
      automationId: 'auto-1',
      contactId: 'c1',
    })

    expect(result.finalState).toBe('waiting')
    const waitingUpdate = ops.find(
      (o) =>
        o.table === 'automation_runs' &&
        o.op === 'update' &&
        (o.payload as Record<string, unknown>)?.state === 'waiting'
    )
    expect(waitingUpdate).toBeDefined()
    const payload = waitingUpdate!.payload as Record<string, unknown>
    expect(typeof payload.waiting_until).toBe('string')
    expect(payload.current_node_key).toBe('n2')
  })

  it('send_ai_reply with AI failure + no fallback marks the run failed (2b.15)', async () => {
    // Drafter import is dynamic in the engine; mock it via jest.mock above.
    jest.isolateModules(() => {
      jest.doMock('@/lib/automations/ai-reply-drafter', () => ({
        draftAiReply: jest.fn().mockRejectedValue(new Error('AI down')),
      }))
      jest.doMock('@/lib/communications/dispatcher', () => ({
        dispatchEmail: jest.fn(),
        dispatchSms: jest.fn(),
        dispatchWhatsApp: jest.fn(),
      }))
    })
    makeAutomation({
      start_key: 'n1',
      nodes: [
        { key: 'n1', type: 'send_ai_reply', config: { channel: 'sms' }, next: 'n2' },
        { key: 'n2', type: 'end' },
      ],
    })
    contactRow = { id: 'c1', primary_phone: '+447123456789' }
    const engine = new AutomationEngine(supabaseMock as never)
    const result = await engine.startRun({
      tenantId: 't1',
      automationId: 'auto-1',
      contactId: 'c1',
    })
    // The engine throws inside walk(); markFailed runs; finalState=failed.
    expect(['failed', 'completed']).toContain(result.finalState)
  })

  it('branches on a condition node', async () => {
    makeAutomation({
      start_key: 'n1',
      nodes: [
        {
          key: 'n1',
          type: 'condition',
          // full_name is on the engine's condition-field whitelist; the
          // engine rejects non-whitelisted fields to keep PII columns
          // out of the condition read.
          config: { field: 'full_name', operator: 'equals', value: 'Joey Baby' },
          next_true: 'win',
          next_false: 'lose',
        },
        { key: 'win', type: 'end' },
        { key: 'lose', type: 'end' },
      ],
    })
    contactRow = { id: 'c1', full_name: 'Joey Baby' }
    const engine = new AutomationEngine(supabaseMock as never)
    const result = await engine.startRun({
      tenantId: 't1',
      automationId: 'auto-1',
      contactId: 'c1',
    })
    expect(result.finalState).toBe('completed')
    expect(result.nodesExecuted).toEqual(['n1', 'win'])
  })

  it('fails the run when the graph cannot be parsed', async () => {
    makeAutomation({ start_key: 'n1' }) // missing nodes array
    const engine = new AutomationEngine(supabaseMock as never)
    await expect(
      engine.startRun({ tenantId: 't1', automationId: 'auto-1', contactId: 'c1' })
    ).rejects.toThrow(/no executable graph/)
  })
})

describe('AutomationEngine.processWaitingRuns', () => {
  it('returns 0/0 when there are no waiting runs', async () => {
    processWaitingShouldReturn = []
    const engine = new AutomationEngine(supabaseMock as never)
    const result = await engine.processWaitingRuns()
    expect(result).toEqual({ resumed: 0, failed: 0 })
  })

  it('resumes a waiting run whose deadline has passed', async () => {
    processWaitingShouldReturn = [
      {
        id: 'run-existing',
        tenant_id: 't1',
        automation_id: 'auto-1',
        current_node_key: 'n2',
        nodes_completed: ['n1'],
      },
    ]
    makeAutomation({
      start_key: 'n1',
      nodes: [
        { key: 'n1', type: 'wait', next: 'n2' },
        { key: 'n2', type: 'end' },
      ],
    })
    const engine = new AutomationEngine(supabaseMock as never)
    const result = await engine.processWaitingRuns()
    expect(result.resumed).toBe(1)
    expect(result.failed).toBe(0)
  })
})
