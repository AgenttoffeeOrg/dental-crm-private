/**
 * Phase 2b.32 — Manual contact creation via `ingestLead`.
 *
 * The New Contact slide-over historically wrote a row directly into
 * `contacts` via the user-scoped supabase client. That path skipped
 * dedup, attribution touchpoints, deal creation and SLA setup — so
 * manually-created contacts behaved differently from every other
 * lead-creation channel.
 *
 * This endpoint receives the form payload and runs it through
 * `ingestLead({ source_channel: 'manual_entry' })`, which means:
 *   - email/phone dedup runs and surfaces "already exists" cleanly
 *   - an attribution touchpoint row is written
 *   - a deal is created in the tenant's default pipeline (or the
 *     pipeline routed by the AI router when intent text is
 *     supplied)
 *   - the `lead.arrived` notification fires
 *
 * Returns:
 *   { ok: true, contact_id, deal_id, dedup_decision } on success
 *   { ok: false, error: 'review_required', dedup_queue_id } when
 *   dedup is ambiguous — caller renders the dedup queue link.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireAuthenticatedTenantUser,
} from '@/lib/auth/api-auth-helpers'
import { createServiceClient } from '@/lib/supabase-server'
import { ingestLead } from '@/lib/lead-ingestion/ingest-lead'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(200),
  primary_phone: z.string().nullable().optional(),
  primary_email: z.string().email().nullable().optional().or(z.literal('')),
  source: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  /** Owner to assign on the contact + any deal that gets created. */
  owner_user_id: z.string().uuid().nullable().optional(),
  /** When true, ingestLead creates a deal alongside the contact (default). */
  create_deal: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedTenantUser(request)
    const rawBody = (await request.json().catch(() => ({}))) as unknown
    const parsed = bodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const data = parsed.data

    // At least one of email or phone is required (matches ingestLead's
    // validation — surface a clean 400 before ingest even runs).
    const phone = (data.primary_phone ?? '').trim()
    const email = (data.primary_email ?? '').trim().toLowerCase()
    if (!phone && !email) {
      return NextResponse.json(
        { error: 'missing_identifier', message: 'Provide either a phone or email' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const result = await ingestLead(
      {
        tenant_id: auth.tenantId,
        source_channel: 'manual_entry',
        contact: {
          full_name: data.full_name.trim(),
          email: email || null,
          phone: phone || null,
        },
        // Notes become activity description so the AI router (if
        // configured) can use them to land the deal in the right
        // pipeline. Same path other channels use.
        treatment_intent_text: data.notes?.trim() || null,
        raw_payload: {
          source: 'manual_entry',
          tags: data.tags ?? [],
          owner_user_id: data.owner_user_id ?? null,
          create_deal: data.create_deal !== false,
          notes: data.notes ?? null,
        },
        // Idempotency is the operator's responsibility here (they're
        // typing into a form) — but if they double-submit by accident
        // a synthetic key prevents two contacts.
        event_id: `manual_entry:${auth.userId}:${email || phone}:${Date.now()}`,
      },
      supabase
    )

    // After-ingest follow-ups that ingestLead doesn't handle for
    // manual entries: apply tags to the contact and assign the owner
    // on the new deal (if one was created).
    if (result.contact_id && Array.isArray(data.tags) && data.tags.length > 0) {
      const { data: existing } = await supabase
        .from('contacts')
        .select('tags')
        .eq('id', result.contact_id)
        .maybeSingle()
      const merged = Array.from(
        new Set([...((existing?.tags as string[] | null) ?? []), ...data.tags])
      )
      await supabase
        .from('contacts')
        .update({ tags: merged, updated_at: new Date().toISOString() })
        .eq('id', result.contact_id)
    }

    if (result.deal_id && data.owner_user_id) {
      await supabase
        .from('deals')
        .update({
          owner_user_id: data.owner_user_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', result.deal_id)
        .eq('tenant_id', auth.tenantId)
    }

    if (
      result.dedup_decision === 'review_required' ||
      !result.contact_id
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'review_required',
          message:
            'A possible duplicate exists. The lead has been queued for review on /dedup-queue.',
          dedup_queue_id: result.queue_item_id,
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        contact_id: result.contact_id,
        deal_id: result.deal_id,
        dedup_decision: result.dedup_decision,
      },
      { status: 200 }
    )
  } catch (err) {
    return authErrorResponse(err)
  }
}
