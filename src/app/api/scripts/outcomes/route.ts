import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getApiRequestContext } from '@/lib/api/context'
import {
  SCRIPT_OUTCOME_LABELS,
  SCRIPT_OUTCOME_TYPES,
} from '@/lib/services/script-outcome-metadata'

const CreateOutcomeSchema = z.object({
  usageId: z.string().uuid(),
  outcomeType: z.enum(SCRIPT_OUTCOME_TYPES).default('appointment_booked'),
  notes: z.string().max(1000).optional(),
  revenueCents: z.number().int().min(0).max(50_000_000).optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parseResult = CreateOutcomeSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const payload = parseResult.data
    const apiContext = await getApiRequestContext()
    const { supabase, tenantId, user } = apiContext

    const { data: usage, error: usageError } = await supabase
      .from('sales_script_usages')
      .select('id, tenant_id, contact_id, deal_id, activity_id')
      .eq('tenant_id', tenantId)
      .eq('id', payload.usageId)
      .single()

    if (usageError || !usage) {
      return NextResponse.json(
        { error: 'Script usage not found for tenant' },
        { status: 404 }
      )
    }

    const occurredAt = payload.occurredAt
      ? new Date(payload.occurredAt).toISOString()
      : new Date().toISOString()

    const { data: inserted, error: outcomeError } = await supabase
      .from('conversation_outcomes')
      .insert({
        tenant_id: tenantId,
        usage_id: usage.id,
        contact_id: usage.contact_id,
        deal_id: usage.deal_id,
        activity_id: usage.activity_id,
        outcome_type: payload.outcomeType,
        notes: payload.notes ?? null,
        revenue_cents: payload.revenueCents ?? 0,
        occurred_at: occurredAt,
        recorded_by: user.id,
        metadata: {
          label: SCRIPT_OUTCOME_LABELS[payload.outcomeType],
        },
      })
      .select('id')
      .single()

    if (outcomeError || !inserted) {
      console.error('[scripts.outcomes] insert failed', outcomeError)
      return NextResponse.json(
        { error: 'Failed to record outcome' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { data: { id: inserted.id } },
      { status: 201 }
    )
  } catch (error) {
    console.error('[scripts.outcomes] errored', error)
    return NextResponse.json(
      {
        error: 'Failed to record outcome',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}




