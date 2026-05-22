/**
 * @jest-environment node
 *
 * Phase 2b.25.3 — CSV import validation paths.
 *
 * Smoke-tests the input-validation surface. We don't exercise the
 * happy path because that requires deep mocking of ingestLead + the
 * supabase client; ingestLead has its own 52-test harness already.
 */

import { NextRequest, NextResponse } from 'next/server'

const mockRequire = jest.fn()
const mockIngest = jest.fn()

class FakeAuthApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
    this.name = 'AuthApiError'
  }
}

jest.mock('@/lib/auth/api-auth-helpers', () => ({
  AuthApiError: FakeAuthApiError,
  requireAuthenticatedTenantUser: (...args: unknown[]) => mockRequire(...args),
  authErrorResponse: (err: unknown) => {
    if (err instanceof FakeAuthApiError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  },
}))

jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: jest.fn(() => ({})),
}))

jest.mock('@/lib/lead-ingestion/ingest-lead', () => ({
  ingestLead: (...args: unknown[]) => mockIngest(...args),
}))

import { GET, POST } from '../route'

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const USER = '224bdacf-dc6b-4b13-a9b8-f2f23fe08d53'

function postReq(body: BodyInit | null, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/import/contacts', {
    method: 'POST',
    headers,
    body,
  })
}

function postCsv(csv: string, filename = 'contacts.csv') {
  const form = new FormData()
  const file = new File([csv], filename, { type: 'text/csv' })
  form.append('file', file)
  return new NextRequest('http://localhost/api/import/contacts', {
    method: 'POST',
    body: form,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRequire.mockResolvedValue({
    userId: USER,
    tenantId: TENANT,
    email: 'me@example.com',
    role: 'owner',
    entitlements: [],
  })
})

describe('POST /api/import/contacts — validation', () => {
  it('returns 401 unauthenticated when not logged in — no ingestLead calls', async () => {
    mockRequire.mockRejectedValueOnce(new FakeAuthApiError(401, 'unauthenticated', 'login required'))
    const res = await POST(postCsv('full_name,email\nJane,j@example.com'))
    expect(res.status).toBe(401)
    expect(mockIngest).not.toHaveBeenCalled()
  })

  it('returns 400 missing_file when the form has no file field', async () => {
    const form = new FormData()
    const req = new NextRequest('http://localhost/api/import/contacts', {
      method: 'POST',
      body: form,
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('missing_file')
  })

  it('returns 400 invalid_file_type for non-csv files', async () => {
    const form = new FormData()
    form.append('file', new File(['{}'], 'leads.json', { type: 'application/json' }))
    const res = await POST(
      new NextRequest('http://localhost/api/import/contacts', { method: 'POST', body: form })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_file_type')
  })

  it('returns 400 empty_csv when the file has only headers', async () => {
    const res = await POST(postCsv('full_name,email,phone\n'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('empty_csv')
  })

  it('reports a row-level error when neither email nor phone is present', async () => {
    mockIngest.mockResolvedValue({
      contact_id: 'c-1',
      deal_id: 'd-1',
      dedup_decision: 'new',
    })
    const res = await POST(
      postCsv(
        [
          'full_name,email,phone',
          '"No Contact Info",,',
          '"Has Email","j@example.com",',
        ].join('\n')
      )
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.summary.total).toBe(2)
    expect(body.summary.failed).toBe(1)
    expect(body.summary.succeeded).toBe(1)
    expect(mockIngest).toHaveBeenCalledTimes(1)
    const failedRow = body.summary.rows.find((r: { ok: boolean }) => !r.ok)
    expect(failedRow.error).toContain('email')
  })

  it('happy path: passes parsed rows through ingestLead with source_channel=csv_import', async () => {
    mockIngest.mockResolvedValue({
      contact_id: 'c-1',
      deal_id: 'd-1',
      dedup_decision: 'new',
    })
    const res = await POST(postCsv('full_name,email,phone\n"Jane","j@example.com","+447700900100"'))
    expect(res.status).toBe(200)
    expect(mockIngest).toHaveBeenCalledTimes(1)
    const ingestInput = mockIngest.mock.calls[0][0]
    expect(ingestInput).toMatchObject({
      tenant_id: TENANT,
      source_channel: 'csv_import',
      contact: {
        full_name: 'Jane',
        email: 'j@example.com',
        phone: '+447700900100',
      },
    })
    const body = await res.json()
    expect(body.summary.new_contacts).toBe(1)
  })

  it('accepts first_name + last_name and combines into full_name', async () => {
    mockIngest.mockResolvedValue({
      contact_id: 'c-1',
      deal_id: 'd-1',
      dedup_decision: 'new',
    })
    await POST(
      postCsv('first_name,last_name,email\n"Jane","Smith","jane@example.com"')
    )
    const ingestInput = mockIngest.mock.calls[0][0]
    expect(ingestInput.contact.full_name).toBe('Jane Smith')
  })

  it('returns 413 too_many_rows when the CSV has more than the cap', async () => {
    const header = 'full_name,email'
    // 5001 rows exceeds MAX_ROWS = 5000
    const rows = Array.from({ length: 5001 }, (_, i) => `"P${i}","p${i}@example.com"`)
    const csv = [header, ...rows].join('\n')
    const res = await POST(postCsv(csv))
    expect(res.status).toBe(413)
    expect(mockIngest).not.toHaveBeenCalled()
  })

  it('counts matched dedup decisions separately from new contacts', async () => {
    mockIngest
      .mockResolvedValueOnce({ contact_id: 'c-new', deal_id: 'd-new', dedup_decision: 'new' })
      .mockResolvedValueOnce({ contact_id: 'c-existing', deal_id: 'd-existing', dedup_decision: 'matched' })
    const res = await POST(
      postCsv(
        [
          'full_name,email,phone',
          '"New","new@example.com",',
          '"Existing","existing@example.com",',
        ].join('\n')
      )
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.summary.new_contacts).toBe(1)
    expect(body.summary.matched_contacts).toBe(1)
  })
})

describe('GET /api/import/contacts — template', () => {
  it('returns 401 unauthenticated', async () => {
    mockRequire.mockRejectedValueOnce(new FakeAuthApiError(401, 'unauthenticated', 'login required'))
    const res = await GET(
      new NextRequest('http://localhost/api/import/contacts', { method: 'GET' })
    )
    expect(res.status).toBe(401)
  })

  it('returns a CSV template with sample rows', async () => {
    const res = await GET(
      new NextRequest('http://localhost/api/import/contacts', { method: 'GET' })
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/csv')
    const body = await res.text()
    expect(body).toContain('full_name')
    expect(body).toContain('email')
    expect(body).toContain('phone')
  })
})
