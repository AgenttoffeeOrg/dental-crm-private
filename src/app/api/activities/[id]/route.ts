import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import {
  AuditLogWriteError,
  deleteAuditRowServer,
  logAuditServer,
} from '@/lib/auto-audit'
import { ActivityUpdateSchema, safeValidateActivity } from '@/schemas/activity.schema'

const ActivityIdSchema = z.object({ id: z.string().uuid('Invalid activity id') })

const DealIdPatchSchema = z.object({
  deal_id: z.string().uuid('Invalid deal id').nullable(),
})

const PERMISSION_DEAL_EDIT = 'deals.edit'

function handleError(error: unknown) {
  if (error instanceof ApiContextError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  console.error('[API:activity:id] Unexpected error', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

async function requireDealsEditPermission(
  supabase: { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
  userId: string,
  tenantId: string
): Promise<NextResponse | null> {
  const { data, error } = await supabase.rpc('user_has_permission', {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_permission_code: PERMISSION_DEAL_EDIT,
  })
  if (error) {
    console.error('[API:activity:id] permission check failed', error)
    return NextResponse.json({ error: 'permission_check_failed' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'permission_denied' }, { status: 403 })
  }
  return null
}

function auditLogFailedResponse(err: AuditLogWriteError) {
  return NextResponse.json(
    {
      ok: false,
      error: 'audit_log_failed',
      message:
        'Reassignment was rolled back because the audit trail could not be written. Please try again or contact support.',
      internal_error_id: err.internalErrorId,
    },
    { status: 500 }
  )
}

async function writeDealReassignmentAudit(params: {
  tenantId: string
  userId: string
  activityId: string
  beforeDealId: string | null
  afterDealId: string | null
}): Promise<string> {
  return logAuditServer({
    tenantId: params.tenantId,
    userId: params.userId,
    actionType: 'update',
    category: 'deal',
    entityType: 'activity',
    entityId: params.activityId,
    description: 'Activity deal association changed',
    beforeState: { deal_id: params.beforeDealId },
    afterState: { deal_id: params.afterDealId },
    changedFields: ['deal_id'],
    severity: 'info',
    tags: ['activity', 'deal_id', 'reassignment'],
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validation = ActivityIdSchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid activity id' }, { status: 400 })
    }

    const context = await getApiRequestContext(request)
    const { supabase, tenantId, membership, accessibleLocationIds } = context

    const { data: activity, error } = await supabase
      .from('activities')
      .select(
        `
          *,
          contact:contacts(*),
          deal:deals(*),
          agent:app_users(id, full_name, email)
        `
      )
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
      }
      console.error('[API:activity:id] Failed to fetch activity', error)
      return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
    }

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    if (!membership.all_locations && activity.location_id) {
      if (!accessibleLocationIds?.includes(activity.location_id)) {
        return NextResponse.json({ error: 'Location access denied' }, { status: 403 })
      }
    }

    return NextResponse.json({ activity })
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idValidation = ActivityIdSchema.safeParse(params)
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid activity id' }, { status: 400 })
    }

    const payload = await request.json()
    const context = await getApiRequestContext(request)
    const { supabase, tenantId, user, membership, accessibleLocationIds } = context

    const isDealOnlyPatch =
      payload &&
      typeof payload === 'object' &&
      Object.keys(payload).length === 1 &&
      'deal_id' in payload

    if (isDealOnlyPatch) {
      const dealPatch = DealIdPatchSchema.safeParse(payload)
      if (!dealPatch.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: dealPatch.error.errors },
          { status: 400 }
        )
      }

      const permDenied = await requireDealsEditPermission(supabase, user.id, tenantId)
      if (permDenied) return permDenied

      const { data: existing, error: existingError } = await supabase
        .from('activities')
        .select('id, deal_id, contact_id, location_id, tenant_id, metadata')
        .eq('id', params.id)
        .eq('tenant_id', tenantId)
        .single()

      if (existingError || !existing) {
        return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
      }

      if (!membership.all_locations && existing.location_id) {
        if (!accessibleLocationIds?.includes(existing.location_id)) {
          return NextResponse.json({ error: 'Location access denied' }, { status: 403 })
        }
      }

      const newDealId = dealPatch.data.deal_id

      if (newDealId) {
        const { data: targetDeal, error: dealError } = await supabase
          .from('deals')
          .select('id, contact_id, deleted_at')
          .eq('id', newDealId)
          .eq('tenant_id', tenantId)
          .single()

        if (dealError || !targetDeal) {
          return NextResponse.json({ error: 'Deal not found for tenant' }, { status: 400 })
        }
        if (targetDeal.deleted_at) {
          return NextResponse.json({ error: 'Deal is deleted' }, { status: 400 })
        }
        if (targetDeal.contact_id !== existing.contact_id) {
          return NextResponse.json(
            { error: 'Deal belongs to a different contact than this activity' },
            { status: 400 }
          )
        }
      }

      const beforeDealId = existing.deal_id as string | null

      if (beforeDealId === newDealId) {
        const { data: current } = await supabase
          .from('activities')
          .select('*')
          .eq('id', params.id)
          .eq('tenant_id', tenantId)
          .single()
        return NextResponse.json({ activity: current })
      }

      let auditId: string | null = null
      try {
        auditId = await writeDealReassignmentAudit({
          tenantId,
          userId: user.id,
          activityId: params.id,
          beforeDealId,
          afterDealId: newDealId,
        })
      } catch (err) {
        if (err instanceof AuditLogWriteError) {
          return auditLogFailedResponse(err)
        }
        throw err
      }

      // 2b.24.3: when the operator reassigns the activity, the "AI wasn't
      // sure" marker is no longer meaningful — the operator just made the
      // decision themselves. Strip the flag from metadata so the UI marker
      // disappears and the activity is no longer flagged as pending review.
      const updatePatch: Record<string, unknown> = { deal_id: newDealId }
      const existingMetadata =
        (existing.metadata as Record<string, unknown> | null) ?? null
      if (existingMetadata && existingMetadata.ai_attachment_uncertain) {
        const { ai_attachment_uncertain: _stripped, ...rest } = existingMetadata
        updatePatch.metadata = rest
      }

      const { data: updated, error: updateError } = await supabase
        .from('activities')
        .update(updatePatch)
        .eq('id', params.id)
        .eq('tenant_id', tenantId)
        .select('*')
        .single()

      if (updateError || !updated) {
        console.error('[API:activity:id] Failed to update activity deal_id', {
          activity_id: params.id,
          user_id: user.id,
          before_deal_id: beforeDealId,
          after_deal_id: newDealId,
          error: updateError,
        })
        if (auditId) {
          await deleteAuditRowServer(auditId, tenantId)
        }
        return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 })
      }

      return NextResponse.json({ activity: updated })
    }

    const validation = safeValidateActivity(payload, ActivityUpdateSchema)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    const { data: existing, error: existingError } = await supabase
      .from('activities')
      .select('id, deal_id, location_id, contact_id')
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single()

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const targetLocation = data.location_id ?? existing.location_id ?? null

    if (targetLocation && !membership.all_locations) {
      if (!accessibleLocationIds?.includes(targetLocation)) {
        return NextResponse.json({ error: 'Location access denied' }, { status: 403 })
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

    if (data.deal_id !== undefined) {
      const permDenied = await requireDealsEditPermission(supabase, user.id, tenantId)
      if (permDenied) return permDenied

      if (data.deal_id) {
        const { data: deal } = await supabase
          .from('deals')
          .select('id, contact_id, deleted_at')
          .eq('id', data.deal_id)
          .eq('tenant_id', tenantId)
          .single()

        if (!deal || deal.deleted_at) {
          return NextResponse.json({ error: 'Deal not found for tenant' }, { status: 400 })
        }
        const activityContactId = data.contact_id ?? existing.contact_id
        if (deal.contact_id !== activityContactId) {
          return NextResponse.json(
            { error: 'Deal belongs to a different contact than this activity' },
            { status: 400 }
          )
        }
      }
    }

    const updatePayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updatePayload[key] = value
      }
    }

    const beforeDealId = existing.deal_id as string | null
    const afterDealId =
      data.deal_id !== undefined ? (data.deal_id as string | null) : beforeDealId
    const dealIdChanging =
      data.deal_id !== undefined && beforeDealId !== afterDealId

    let auditId: string | null = null
    if (dealIdChanging) {
      try {
        auditId = await writeDealReassignmentAudit({
          tenantId,
          userId: user.id,
          activityId: params.id,
          beforeDealId,
          afterDealId,
        })
      } catch (err) {
        if (err instanceof AuditLogWriteError) {
          return auditLogFailedResponse(err)
        }
        throw err
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('activities')
      .update(updatePayload)
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single()

    if (updateError || !updated) {
      console.error('[API:activity:id] Failed to update activity', {
        activity_id: params.id,
        user_id: user.id,
        error: updateError,
      })
      if (auditId) {
        await deleteAuditRowServer(auditId, tenantId)
      }
      return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 })
    }

    return NextResponse.json({ activity: updated })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validation = ActivityIdSchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid activity id' }, { status: 400 })
    }

    const context = await getApiRequestContext(request)
    const { supabase, tenantId, membership, accessibleLocationIds } = context

    const { data: activity } = await supabase
      .from('activities')
      .select('id, location_id')
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single()

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    if (!membership.all_locations && activity.location_id) {
      if (!accessibleLocationIds?.includes(activity.location_id)) {
        return NextResponse.json({ error: 'Location access denied' }, { status: 403 })
      }
    }

    const { error } = await supabase
      .from('activities')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('[API:activity:id] Failed to delete activity', error)
      return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
