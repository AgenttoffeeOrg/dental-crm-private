/**
 * @jest-environment node
 *
 * Phase 2a.3 Checkpoint 7 — Server-side widget flow integration test.
 *
 * Exercises the full sequence:
 *   GET /api/widget/config → POST /api/widget/sessions → PATCH session →
 *   POST /api/widget/sessions/[id]/submit (webform / whatsapp / calendar paths)
 *
 * Strategy: a tiny in-memory Supabase fake (just the surface our routes use)
 * so we don't depend on a live DB and the test runs in jsdom in milliseconds.
 * `ingestLead` is mocked — its own behaviour is exercised by the existing
 * `lead-ingestion/__tests__` suite. We assert the right inputs flow through
 * and the right responses come back.
 */

import { GET as configHandler } from '@/app/api/widget/config/route'
import { POST as startHandler } from '@/app/api/widget/sessions/route'
import { PATCH as patchHandler } from '@/app/api/widget/sessions/[id]/route'
import { POST as submitHandler } from '@/app/api/widget/sessions/[id]/submit/route'

// ---------------------------------------------------------------------------
// Fake Supabase
// ---------------------------------------------------------------------------

interface FakeRow {
  [k: string]: unknown
}

const widgets: FakeRow[] = []
const offerings: FakeRow[] = []
const treatmentTypes: FakeRow[] = []
const tenants: FakeRow[] = []
const sessions: FakeRow[] = []

function reset() {
  widgets.length = 0
  offerings.length = 0
  treatmentTypes.length = 0
  tenants.length = 0
  sessions.length = 0
}

function makeBuilder(tableName: string) {
  let kind: 'select' | 'insert' | 'update' | null = null
  let columns = ''
  let pendingValues: FakeRow | FakeRow[] | null = null
  let pendingPatch: FakeRow | null = null
  const eqs: Array<[string, unknown]> = []
  const ins: Array<[string, unknown[]]> = []
  let isNullClause: string | null = null
  let limit: number | null = null

  const tableFor = (n: string): FakeRow[] => {
    switch (n) {
      case 'practice_booking_widgets':
        return widgets
      case 'practice_treatment_offerings':
        return offerings
      case 'treatment_types':
        return treatmentTypes
      case 'tenants':
        return tenants
      case 'lead_intent_sessions':
        return sessions
      default:
        return []
    }
  }

  const matches = (row: FakeRow) => {
    for (const [col, val] of eqs) {
      if (row[col] !== val) return false
    }
    for (const [col, vals] of ins) {
      if (!vals.includes(row[col])) return false
    }
    if (isNullClause && row[isNullClause] !== null && row[isNullClause] !== undefined) {
      return false
    }
    return true
  }

  const filterRows = () => tableFor(tableName).filter(matches)

  const result = (data: unknown, error: unknown = null) => Promise.resolve({ data, error })

  const builder: any = {
    select(cols: string) {
      // Don't overwrite insert/update modes — supabase-js chains
      // `.insert(...).select(...).single()` to read back the inserted row.
      if (kind === null) kind = 'select'
      columns = cols
      return builder
    },
    insert(values: FakeRow | FakeRow[]) {
      kind = 'insert'
      pendingValues = values
      return builder
    },
    update(patch: FakeRow) {
      kind = 'update'
      pendingPatch = patch
      return builder
    },
    eq(col: string, val: unknown) {
      eqs.push([col, val])
      return builder
    },
    in(col: string, vals: unknown[]) {
      ins.push([col, vals])
      return builder
    },
    is(col: string, val: unknown) {
      if (val === null) isNullClause = col
      return builder
    },
    order() {
      return builder
    },
    limit(n: number) {
      limit = n
      return builder
    },
    maybeSingle() {
      const rows = filterRows()
      return result(rows[0] ?? null)
    },
    single() {
      if (kind === 'insert') {
        const insertedRow = Array.isArray(pendingValues)
          ? pendingValues[0]
          : pendingValues!
        const rowWithDefaults = applyDefaults(tableName, insertedRow)
        tableFor(tableName).push(rowWithDefaults)
        return result(rowWithDefaults)
      }
      if (kind === 'update') {
        const rows = filterRows()
        for (const row of rows) Object.assign(row, pendingPatch)
        return result(rows[0] ?? null, rows[0] ? null : { message: 'not found' })
      }
      const rows = filterRows()
      return result(rows[0] ?? null, rows[0] ? null : { message: 'not found' })
    },
    then(resolve: (v: unknown) => void) {
      if (kind === 'update') {
        const rows = filterRows()
        for (const row of rows) Object.assign(row, pendingPatch)
        resolve({ data: rows, error: null })
        return
      }
      // Default: select rows
      const rows = filterRows()
      // honour limit
      const out = limit ? rows.slice(0, limit) : rows
      resolve({ data: out, error: null })
    },
    [Symbol.asyncIterator]() {
      // not used
    },
  }

  // Allow `await client.from(t).update(p).eq(...)` directly without .then chaining
  return builder
}

let counter = 0
function fakeUuid(): string {
  counter += 1
  const hex = counter.toString(16).padStart(12, '0')
  return `00000000-0000-4000-a000-${hex}`
}

function applyDefaults(tableName: string, row: FakeRow): FakeRow {
  const id = (row.id as string | undefined) ?? fakeUuid()
  if (tableName === 'lead_intent_sessions') {
    return {
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      session_token: row.session_token ?? `tok-${counter}`,
      ...row,
      id,
    }
  }
  return { ...row, id }
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: jest.fn(),
  createServiceClient: jest.fn(() => ({
    from: (table: string) => makeBuilder(table),
  })),
  createClient: jest.fn(),
}))

const mockIngestLead = jest.fn()
jest.mock('@/lib/lead-ingestion/ingest-lead', () => {
  const actual = jest.requireActual('@/lib/lead-ingestion/ingest-lead')
  return {
    ...actual,
    ingestLead: (...args: unknown[]) => mockIngestLead(...args),
  }
})

// ---------------------------------------------------------------------------
// Helpers to build Request objects
// ---------------------------------------------------------------------------

function jsonReq(url: string, init: { method: string; body?: unknown; headers?: HeadersInit } = { method: 'GET' }) {
  const body = init.body ? JSON.stringify(init.body) : undefined
  return new Request(url, {
    method: init.method,
    body,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.7',
      ...(init.headers ?? {}),
    },
  })
}

// ---------------------------------------------------------------------------
// Setup fixtures
// ---------------------------------------------------------------------------

const TENANT_ID = '11111111-1111-4111-a111-111111111111'
const WIDGET_ID = '22222222-2222-4222-a222-222222222222'
const OFFERING_ID = '33333333-3333-4333-a333-333333333333'
const TT_ID = '44444444-4444-4444-a444-444444444444'

beforeEach(() => {
  reset()
  mockIngestLead.mockReset()

  tenants.push({ id: TENANT_ID, name: 'Acme Dental', slug: 'acme' })

  treatmentTypes.push({
    id: TT_ID,
    key: 'whitening',
    display_name: 'Whitening',
    category: 'cosmetic',
  })
  offerings.push({
    id: OFFERING_ID,
    tenant_id: TENANT_ID,
    treatment_type_id: TT_ID,
    custom_label: null,
    sort_order: 1,
    is_active: true,
    deleted_at: null,
    treatment_type: {
      id: TT_ID,
      key: 'whitening',
      display_name: 'Whitening',
      category: 'cosmetic',
    },
  })

  widgets.push({
    id: WIDGET_ID,
    tenant_id: TENANT_ID,
    practice_location_id: null,
    slug: 'acme-dental-1234',
    display_name: 'Acme Dental',
    is_active: true,
    deleted_at: null,
    treatment_options: [{ offering_id: OFFERING_ID, sort_order: 1 }],
    enable_calendar: true,
    calendar_redirect_url: 'https://calendly.example/acme',
    calendar_button_label: 'Book',
    calendar_capture_phone: true,
    calendar_capture_email: false,
    calendar_capture_full_name: true,
    calendar_consent_text: null,
    calendar_interstitial_message: null,
    calendar_interstitial_duration_ms: 1500,
    enable_webform: true,
    webform_kind: 'inline',
    webform_redirect_url: null,
    webform_button_label: 'Send',
    webform_open_in_new_tab: false,
    enable_whatsapp: true,
    whatsapp_phone_e164: '447700900900',
    whatsapp_button_label: 'WhatsApp Us',
    whatsapp_prefilled_message_template: 'Hi about {treatment}.',
    brand_primary_color: '#0ea5e9',
    brand_text_color: '#FFFFFF',
    brand_logo_url: null,
    brand_font_family: null,
    greeting_title: 'How can we help?',
    greeting_subtitle: null,
    success_message: "Thanks — we'll be in touch shortly.",
    metadata: {
      trigger: { mode: 'button', position: 'bottom-right', button_label: 'Book now' },
      webform: {
        fields: [
          { name: 'full_name', label: 'Your name', required: true },
          { name: 'email', label: 'Email', required: true },
          { name: 'phone', label: 'Phone', required: true },
        ],
        consent_text: 'I agree',
        consent_required: true,
      },
    },
  })

  // Default ingestLead success
  mockIngestLead.mockResolvedValue({
    contact_id: 'c-1',
    attribution_touchpoint_id: 'tp-1',
    activity_id: 'a-1',
    dedup_decision: 'new',
    dedup_signals: { email_match: false, phone_match: false, channel_identifier_match: false },
    sla: { due_at: new Date().toISOString(), minutes: 15, rule_source: 'default' },
  })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/widget/config', () => {
  it('returns the public config payload for a valid slug', async () => {
    const res = await configHandler(
      jsonReq('http://test/api/widget/config?slug=acme-dental-1234')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      widget_id: WIDGET_ID,
      slug: 'acme-dental-1234',
      practice_name: 'Acme Dental',
      paths_enabled: expect.arrayContaining(['calendar', 'webform', 'whatsapp']),
    })
    expect(body.treatments).toHaveLength(1)
    expect(body.treatments[0]).toMatchObject({ offering_id: OFFERING_ID, label: 'Whitening' })
  })

  it('returns 400 on missing slug', async () => {
    const res = await configHandler(jsonReq('http://test/api/widget/config'))
    expect(res.status).toBe(400)
  })

  it('returns 400 on malformed slug', async () => {
    const res = await configHandler(jsonReq('http://test/api/widget/config?slug=!!!'))
    expect(res.status).toBe(400)
  })

  it('returns 404 when slug not found', async () => {
    const res = await configHandler(
      jsonReq('http://test/api/widget/config?slug=does-not-exist')
    )
    expect(res.status).toBe(404)
  })

  it('returns CORS headers', async () => {
    const res = await configHandler(
      jsonReq('http://test/api/widget/config?slug=acme-dental-1234')
    )
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })
})

describe('POST /api/widget/sessions', () => {
  it('creates a session and returns its id', async () => {
    const res = await startHandler(
      jsonReq('http://test/api/widget/sessions', {
        method: 'POST',
        body: { widget_slug: 'acme-dental-1234', source_url: 'https://acme.example/' },
      })
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.session_id).toBeTruthy()
    expect(body.session_token).toBeTruthy()
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({
      tenant_id: TENANT_ID,
      practice_booking_widget_id: WIDGET_ID,
      landing_page_url: 'https://acme.example/',
      intent_path: 'webform',
    })
  })

  it('rejects unknown widget slug with 404', async () => {
    const res = await startHandler(
      jsonReq('http://test/api/widget/sessions', {
        method: 'POST',
        body: { widget_slug: 'nope-not-real' },
      })
    )
    expect(res.status).toBe(404)
  })

  it('rejects malformed body with 400', async () => {
    const res = await startHandler(
      jsonReq('http://test/api/widget/sessions', {
        method: 'POST',
        body: { widget_slug: '!!' },
      })
    )
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/widget/sessions/[id]', () => {
  async function startSession() {
    const res = await startHandler(
      jsonReq('http://test/api/widget/sessions', {
        method: 'POST',
        body: { widget_slug: 'acme-dental-1234' },
      })
    )
    return (await res.json()) as { session_id: string }
  }

  it('persists the picked treatment_offering_id', async () => {
    const { session_id } = await startSession()
    const res = await patchHandler(
      jsonReq(`http://test/api/widget/sessions/${session_id}`, {
        method: 'PATCH',
        body: { treatment_offering_id: OFFERING_ID },
      }),
      { params: { id: session_id } }
    )
    expect(res.status).toBe(200)
    const found = sessions.find((s) => s.id === session_id)
    expect(found?.treatment_offering_id).toBe(OFFERING_ID)
  })

  it('updates intent_path on path_chosen', async () => {
    const { session_id } = await startSession()
    await patchHandler(
      jsonReq(`http://test/api/widget/sessions/${session_id}`, {
        method: 'PATCH',
        body: { path_chosen: 'whatsapp' },
      }),
      { params: { id: session_id } }
    )
    expect(sessions.find((s) => s.id === session_id)?.intent_path).toBe('whatsapp')
  })

  it('records abandoned_step into metadata', async () => {
    const { session_id } = await startSession()
    await patchHandler(
      jsonReq(`http://test/api/widget/sessions/${session_id}`, {
        method: 'PATCH',
        body: { abandoned_step: 'webform_fill' },
      }),
      { params: { id: session_id } }
    )
    const found = sessions.find((s) => s.id === session_id)
    expect((found?.metadata as Record<string, unknown>)?.abandoned_step).toBe('webform_fill')
  })

  it('rejects malformed session id', async () => {
    const res = await patchHandler(
      jsonReq('http://test/api/widget/sessions/not-a-uuid', {
        method: 'PATCH',
        body: {},
      }),
      { params: { id: 'not-a-uuid' } }
    )
    expect(res.status).toBe(400)
  })
})

describe('POST /api/widget/sessions/[id]/submit', () => {
  async function startSession(): Promise<string> {
    const res = await startHandler(
      jsonReq('http://test/api/widget/sessions', {
        method: 'POST',
        body: {
          widget_slug: 'acme-dental-1234',
          utm: { source: 'google', medium: 'cpc' },
        },
      })
    )
    const body = (await res.json()) as { session_id: string }
    return body.session_id
  }

  it('webform path: calls ingestLead and returns success_message', async () => {
    const sessionId = await startSession()
    const res = await submitHandler(
      jsonReq(`http://test/api/widget/sessions/${sessionId}/submit`, {
        method: 'POST',
        body: {
          path: 'webform',
          treatment_offering_id: OFFERING_ID,
          contact: {
            full_name: 'Joe Bloggs',
            email: 'joe@example.com',
            phone: '07700900900',
            consents: { marketing_consent: true },
          },
        },
      }),
      { params: { id: sessionId } }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      ok: true,
      success_message: expect.stringMatching(/touch shortly/i),
      whatsapp_redirect: null,
      calendar_redirect: null,
    })
    expect(mockIngestLead).toHaveBeenCalledTimes(1)
    expect(mockIngestLead.mock.calls[0][0]).toMatchObject({
      tenant_id: TENANT_ID,
      source_channel: 'booking_widget_webform',
      contact: { full_name: 'Joe Bloggs', email: 'joe@example.com' },
      attribution: { utm_source: 'google', utm_medium: 'cpc' },
      treatment_offering_id: OFFERING_ID,
      lead_intent_session_id: sessionId,
      event_id: `widget_submit:${sessionId}`,
    })
  })

  it('whatsapp path: returns wa.me URL with prefill text', async () => {
    const sessionId = await startSession()
    const res = await submitHandler(
      jsonReq(`http://test/api/widget/sessions/${sessionId}/submit`, {
        method: 'POST',
        body: {
          path: 'whatsapp',
          treatment_offering_id: OFFERING_ID,
          contact: { full_name: 'Jane', phone: '07700900900' },
        },
      }),
      { params: { id: sessionId } }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.whatsapp_redirect).toMatch(/wa\.me\/447700900900\?text=/)
    expect(body.calendar_redirect).toBeNull()
    expect(mockIngestLead).toHaveBeenCalledWith(
      expect.objectContaining({ source_channel: 'booking_widget_whatsapp' }),
      expect.anything()
    )
  })

  it('calendar path: returns calendar URL', async () => {
    const sessionId = await startSession()
    const res = await submitHandler(
      jsonReq(`http://test/api/widget/sessions/${sessionId}/submit`, {
        method: 'POST',
        body: {
          path: 'calendar',
          treatment_offering_id: OFFERING_ID,
          contact: { full_name: 'Sam', email: 'sam@example.com', phone: '07700900900' },
        },
      }),
      { params: { id: sessionId } }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.calendar_redirect).toBe('https://calendly.example/acme')
    expect(mockIngestLead).toHaveBeenCalledWith(
      expect.objectContaining({ source_channel: 'booking_widget_calendar' }),
      expect.anything()
    )
  })

  it('calendar path: rejects when widget has no calendar_redirect_url', async () => {
    widgets[0].calendar_redirect_url = null
    const sessionId = await startSession()
    const res = await submitHandler(
      jsonReq(`http://test/api/widget/sessions/${sessionId}/submit`, {
        method: 'POST',
        body: {
          path: 'calendar',
          contact: { full_name: 'Sam', phone: '07700900900' },
        },
      }),
      { params: { id: sessionId } }
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('calendar_not_configured')
  })

  it('whatsapp path: rejects when no phone configured', async () => {
    widgets[0].whatsapp_phone_e164 = null
    const sessionId = await startSession()
    const res = await submitHandler(
      jsonReq(`http://test/api/widget/sessions/${sessionId}/submit`, {
        method: 'POST',
        body: {
          path: 'whatsapp',
          contact: { full_name: 'Sam', phone: '07700900900' },
        },
      }),
      { params: { id: sessionId } }
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('whatsapp_not_configured')
  })

  it('phone-conflict candidate surfaces dedup_decision: review_required', async () => {
    mockIngestLead.mockResolvedValueOnce({
      contact_id: null,
      attribution_touchpoint_id: null,
      activity_id: null,
      dedup_decision: 'review_required',
      dedup_signals: { email_match: false, phone_match: true, channel_identifier_match: false },
      queue_item_id: 'q-1',
      sla: null,
    })
    const sessionId = await startSession()
    const res = await submitHandler(
      jsonReq(`http://test/api/widget/sessions/${sessionId}/submit`, {
        method: 'POST',
        body: {
          path: 'webform',
          contact: { full_name: 'Joe', email: 'joe@example.com', phone: '07700900900' },
        },
      }),
      { params: { id: sessionId } }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.dedup_decision).toBe('review_required')
  })
})
