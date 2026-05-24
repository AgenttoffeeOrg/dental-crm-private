import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getApiRequestContext } from '@/lib/api/context'
import { normalizeTrigger } from '@/lib/services/script-selector'

const createUsageSchema = z.object({
  scriptVersionId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  activityId: z.string().uuid().optional(),
  trigger: z.string().optional(),
  personaSnapshot: z.record(z.any()).optional(),
  context: z.record(z.any()).optional(),
  helpful: z.boolean().optional(),
  feedback: z.string().min(1).max(1000).optional(),
  metadata: z.record(z.any()).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parseResult = createUsageSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const payload = parseResult.data
    const apiContext = await getApiRequestContext(request)
    const supabase = apiContext.supabase

    const { data: version, error: versionError } = await supabase
      .from('sales_script_versions')
      .select('id, script_id, trigger_type, tenant_id')
      .eq('tenant_id', apiContext.tenantId)
      .eq('id', payload.scriptVersionId)
      .single()

    if (versionError || !version) {
      return NextResponse.json({ error: 'Script version not found' }, { status: 404 })
    }

    const trigger = payload.trigger ? normalizeTrigger(payload.trigger) : (version.trigger_type as string | null)

    const { data: usage, error: insertError } = await supabase
      .from('sales_script_usages')
      .insert({
        tenant_id: apiContext.tenantId,
        script_id: version.script_id,
        script_version_id: version.id,
        contact_id: payload.contactId ?? null,
        deal_id: payload.dealId ?? null,
        activity_id: payload.activityId ?? null,
        trigger_type: trigger ?? null,
        persona_snapshot: payload.personaSnapshot ?? {},
        context: payload.context ?? {},
        metadata: {
          ...payload.metadata,
          source: payload.metadata?.source ?? 'contact_detail_panel'
        },
        used_by: apiContext.user.id
      })
      .select('id')
      .single()

    if (insertError || !usage) {
      throw insertError
    }

    if (typeof payload.helpful === 'boolean' || (payload.feedback && payload.feedback.length > 0)) {
      const { error: updateError } = await supabase
        .from('sales_script_usages')
        .update({
          helpful: payload.helpful ?? null,
          helpful_recorded_at: new Date().toISOString(),
          feedback: payload.feedback ?? null
        })
        .eq('tenant_id', apiContext.tenantId)
        .eq('id', usage.id)

      if (updateError) {
        throw updateError
      }
    }

    return NextResponse.json(
      {
        data: {
          id: usage.id,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[scripts.usages] failed', error)
    return NextResponse.json(
      {
        error: 'Failed to log script usage',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

