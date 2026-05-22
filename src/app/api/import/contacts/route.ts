/**
 * Phase 2b.25.3 — Bulk CSV contact import via `ingestLead`.
 *
 * Replaces the legacy direct-INSERT importer (`src/lib/import-service.ts`,
 * deleted) that bypassed dedup, attribution, deals and SLAs.
 *
 * Flow:
 *   - Authenticated, tenant-scoped.
 *   - Accepts multipart/form-data with one `file` (.csv).
 *   - Parses server-side via papaparse — case-insensitive headers, blanks
 *     trimmed, `\r` normalised.
 *   - For each row, calls `ingestLead({ source_channel: 'csv_import' })`.
 *     - Existing contact (email or phone match) → additive update + new
 *       touchpoint + activity. Counts as "matched".
 *     - Ambiguous dedup → review_required (counts as "review"). No deal.
 *     - New contact → created + deal in default pipeline.
 *   - Returns aggregate counts + per-row failure reasons.
 *
 * Accepted header names (any case, common variants):
 *   - Name: `full_name` | `name` | (or `first_name` + `last_name`)
 *   - Email: `email` | `email_address`
 *   - Phone: `phone` | `mobile` | `primary_phone`
 *
 * Either email OR phone must be present per row (matches IngestLeadInput).
 *
 * GET returns a downloadable CSV template for practices to start from.
 */

import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import {
  authErrorResponse,
  requireAuthenticatedTenantUser,
} from '@/lib/auth/api-auth-helpers'
import { createServiceClient } from '@/lib/supabase-server'
import { ingestLead, type IngestLeadInput } from '@/lib/lead-ingestion/ingest-lead'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Bounded for safety — practices uploading >5k rows in one shot should
// chunk client-side. The serverless function timeout (300s default)
// can't reliably finish more than that anyway when ingestLead runs
// dedup + deal-creation per row.
const MAX_ROWS = 5000

const CSV_TEMPLATE = `full_name,email,phone,notes
"Jane Smith","jane.smith@example.com","+447700900100","Wants whitening consultation"
"John Doe",,"+447700900200","Referral from existing patient"
"Aisha Patel","aisha.patel@example.com",,"Email enquiry only"
`

interface RowResult {
  row: number
  ok: boolean
  dedup_decision?: string
  contact_id?: string | null
  deal_id?: string | null
  error?: string
}

interface ImportSummary {
  total: number
  succeeded: number
  new_contacts: number
  matched_contacts: number
  review_required: number
  failed: number
  rows: RowResult[]
}

function normaliseHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_')
}

function pickField(
  row: Record<string, string>,
  candidates: readonly string[]
): string | null {
  for (const key of candidates) {
    const v = row[key]
    if (typeof v === 'string' && v.trim().length > 0) return v.trim()
  }
  return null
}

function rowToIngestInput(
  tenantId: string,
  row: Record<string, string>
): IngestLeadInput | { error: string } {
  const fullName =
    pickField(row, ['full_name', 'fullname', 'name']) ??
    (() => {
      const first = pickField(row, ['first_name', 'firstname', 'given_name'])
      const last = pickField(row, ['last_name', 'lastname', 'surname', 'family_name'])
      const combined = [first, last].filter(Boolean).join(' ').trim()
      return combined.length > 0 ? combined : null
    })()
  const email = pickField(row, ['email', 'email_address', 'e-mail'])
  const phone = pickField(row, ['phone', 'mobile', 'primary_phone', 'phone_number'])
  const notes = pickField(row, ['notes', 'note', 'description'])

  if (!email && !phone) {
    return { error: 'Row needs either email or phone' }
  }

  return {
    tenant_id: tenantId,
    source_channel: 'csv_import',
    contact: {
      full_name: fullName,
      email,
      phone,
    },
    treatment_intent_text: notes ?? undefined,
    raw_payload: row,
  } satisfies IngestLeadInput
}

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedTenantUser(request)
    return new NextResponse(CSV_TEMPLATE, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=contacts_import_template.csv',
      },
    })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedTenantUser(request)

    let file: File | null = null
    try {
      const form = await request.formData()
      const candidate = form.get('file')
      if (candidate instanceof File) file = candidate
    } catch {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Expected multipart/form-data with a file field' },
        { status: 400 }
      )
    }

    if (!file) {
      return NextResponse.json(
        { error: 'missing_file', message: 'No CSV file uploaded' },
        { status: 400 }
      )
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'invalid_file_type', message: 'File must be a .csv' },
        { status: 400 }
      )
    }

    const text = await file.text()
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: normaliseHeader,
    })

    if (parsed.errors.length > 0) {
      console.warn('[contacts-import] CSV parse warnings', {
        count: parsed.errors.length,
        first: parsed.errors[0],
      })
    }

    const rows = parsed.data.filter(
      (r: Record<string, string>) => r && Object.keys(r).length > 0
    )
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'empty_csv', message: 'No data rows found in CSV' },
        { status: 400 }
      )
    }
    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        {
          error: 'too_many_rows',
          message: `Max ${MAX_ROWS} rows per import. Split the file and try again.`,
        },
        { status: 413 }
      )
    }

    const supabase = createServiceClient()
    const summary: ImportSummary = {
      total: rows.length,
      succeeded: 0,
      new_contacts: 0,
      matched_contacts: 0,
      review_required: 0,
      failed: 0,
      rows: [],
    }

    // Sequential — ingestLead does multiple DB reads/writes per row and
    // parallelising would risk write contention on a single tenant. For
    // imports up to MAX_ROWS this finishes in well under the function
    // timeout (each row ~50-200ms).
    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 1 // CSV row number (1-indexed, header is row 0)
      const raw = rows[i] as Record<string, string>
      const built = rowToIngestInput(auth.tenantId, raw)

      if ('error' in built) {
        summary.failed += 1
        summary.rows.push({ row: rowNumber, ok: false, error: built.error })
        continue
      }

      try {
        const result = await ingestLead(built, supabase)
        summary.succeeded += 1
        if (result.dedup_decision === 'new') summary.new_contacts += 1
        else if (result.dedup_decision === 'matched') summary.matched_contacts += 1
        else if (result.dedup_decision === 'review_required') summary.review_required += 1
        summary.rows.push({
          row: rowNumber,
          ok: true,
          dedup_decision: result.dedup_decision,
          contact_id: result.contact_id,
          deal_id: result.deal_id,
        })
      } catch (err) {
        summary.failed += 1
        const message = err instanceof Error ? err.message : 'ingest_failed'
        summary.rows.push({ row: rowNumber, ok: false, error: message })
        console.error('[contacts-import] ingestLead failed for row', {
          row: rowNumber,
          tenantId: auth.tenantId,
          error: message,
        })
      }
    }

    return NextResponse.json({ ok: true, summary }, { status: 200 })
  } catch (err) {
    return authErrorResponse(err)
  }
}
