import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { DealUpdateSchema, safeValidateDeal } from '@/schemas/deal.schema'
import { SCRIPT_OUTCOME_TYPES } from '@/lib/services/script-outcome-metadata'

const DealIdSchema = z.object({
  id: z.string().uuid('Invalid deal id'),
})

function handleContextError(error: unknown) {
  if (error instanceof ApiContextError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  console.error('[API:deal:id] Unexpected error', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validation = DealIdSchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid deal id' }, { status: 400 })
    }

    const context = await getApiRequestContext(request)
    const { supabase, tenantId, membership, accessibleLocationIds } = context

    const { data: deal, error } = await supabase
      .from('deals')
      .select(
        `
          *,
          contact:contacts(*),
          pipeline:pipelines(*),
          stage:pipeline_stages(*),
          tasks:tasks(id, title, status, due_at),
          activities:activities(id, type, occurred_at)
        `
      )
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('Row not found')) {
        return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
      }
      console.error('[API:deal:id] Failed to fetch deal', error)
      return NextResponse.json({ error: 'Failed to fetch deal' }, { status: 500 })
    }

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    if (!membership.all_locations) {
      const locationId = deal.location_id ?? null
      if (locationId && !accessibleLocationIds?.includes(locationId)) {
        return NextResponse.json({ error: 'Location access denied' }, { status: 403 })
      }
    }

    return NextResponse.json({ deal })
  } catch (error) {
    return handleContextError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idValidation = DealIdSchema.safeParse(params)
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid deal id' }, { status: 400 })
    }

    const body = await request.json()
    const validation = safeValidateDeal(body, DealUpdateSchema)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data
    const { script_outcome: scriptOutcome, ...dealPayload } = data
    const context = await getApiRequestContext(request)
    const { supabase, tenantId, membership, accessibleLocationIds } = context

    const { data: existing, error: existingError } = await supabase
      .from('deals')
      .select('id, tenant_id, location_id, pipeline_id, status, contact_id, stage_id, value_estimate_cents')
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single()

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    if (!membership.all_locations) {
      const targetLocation = data.location_id ?? existing.location_id
      if (targetLocation && !accessibleLocationIds?.includes(targetLocation)) {
        return NextResponse.json(
          { error: 'Location access denied' },
          { status: 403 }
        )
      }
    }

    if (data.contact_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', data.contact_id)
        .eq('tenant_id', tenantId)
        .single()

      if (!contact) {
        return NextResponse.json({ error: 'Contact not found for tenant' }, { status: 404 })
      }
    }

    if (data.pipeline_id || data.stage_id) {
      const pipelineId = data.pipeline_id ?? existing.pipeline_id

      const { data: pipeline } = await supabase
        .from('pipelines')
        .select('id')
        .eq('id', pipelineId)
        .eq('tenant_id', tenantId)
        .single()

      if (!pipeline) {
        return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
      }

      if (data.stage_id) {
        const { data: stage } = await supabase
          .from('pipeline_stages')
          .select('id')
          .eq('id', data.stage_id)
          .eq('pipeline_id', pipelineId)
          .eq('tenant_id', tenantId)
          .single()

        if (!stage) {
          return NextResponse.json({ error: 'Stage not valid for pipeline' }, { status: 400 })
        }
      }
    }

    if (data.owner_user_id) {
      const { data: owner } = await supabase
        .from('user_tenant_memberships')
        .select('id')
        .eq('user_id', data.owner_user_id)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .single()

      if (!owner) {
        return NextResponse.json({ error: 'Owner not in tenant' }, { status: 400 })
      }
    }

    const updatePayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(dealPayload)) {
      if (value !== undefined) {
        updatePayload[key] = value
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('deals')
      .update(updatePayload)
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single()

    if (updateError) {
      console.error('[API:deal:id] Failed to update deal', updateError)
      return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 })
    }

    if (scriptOutcome) {
      const { data: usage, error: usageError } = await supabase
        .from('sales_script_usages')
        .select('id, tenant_id, contact_id, deal_id, activity_id')
        .eq('tenant_id', tenantId)
        .eq('id', scriptOutcome.usage_id)
        .single()

      if (usageError || !usage) {
        return NextResponse.json(
          { error: 'Script usage not found for tenant' },
          { status: 400 }
        )
      }

      const outcomeType = scriptOutcome.outcome_type ?? 'deal_won'
      if (!SCRIPT_OUTCOME_TYPES.includes(outcomeType)) {
        return NextResponse.json({ error: 'Invalid outcome type' }, { status: 400 })
      }

      const contactId = usage.contact_id ?? updated.contact_id ?? null

      const { error: outcomeError } = await supabase
        .from('conversation_outcomes')
        .insert({
          tenant_id: tenantId,
          usage_id: usage.id,
          contact_id: contactId,
          deal_id: usage.deal_id ?? updated.id,
          activity_id: usage.activity_id ?? null,
          outcome_type: outcomeType,
          notes: scriptOutcome.notes ?? null,
          revenue_cents:
            scriptOutcome.revenue_cents ??
            updated.value_estimate_cents ??
            existing.value_estimate_cents ??
            0,
          recorded_by: context.user.id,
        })

      if (outcomeError) {
        console.error('[API:deal:id] Failed to record script outcome', outcomeError)
        return NextResponse.json(
          { error: 'Deal updated but failed to record script outcome' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ deal: updated })
  } catch (error) {
    return handleContextError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validation = DealIdSchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid deal id' }, { status: 400 })
    }

    const context = await getApiRequestContext(request)
    const { supabase, tenantId, membership, accessibleLocationIds } = context

    const { data: deal } = await supabase
      .from('deals')
      .select('id, location_id')
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single()

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    if (!membership.all_locations && deal.location_id) {
      if (!accessibleLocationIds?.includes(deal.location_id)) {
        return NextResponse.json({ error: 'Location access denied' }, { status: 403 })
      }
    }

    const { error: deleteError } = await supabase
      .from('deals')
      .update({ status: 'archived', deleted_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('tenant_id', tenantId)

    if (deleteError) {
      console.error('[API:deal:id] Failed to archive deal', deleteError)
      return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleContextError(error)
  }
}

