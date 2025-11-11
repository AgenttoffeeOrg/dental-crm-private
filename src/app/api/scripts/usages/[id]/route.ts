import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getApiRequestContext } from '@/lib/api/context'

const updateUsageSchema = z.object({
  helpful: z.boolean().optional(),
  feedback: z.string().min(1).max(1000).optional(),
  personaSnapshot: z.record(z.any()).optional(),
  context: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
})

interface RouteParams {
  params: {
    id: string
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const usageId = params.id
    if (!usageId) {
      return NextResponse.json({ error: 'Usage id is required' }, { status: 400 })
    }

    const body = await request.json()
    const parseResult = updateUsageSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const payload = parseResult.data
    const apiContext = await getApiRequestContext()
    const supabase = apiContext.supabase

    const updatePayload: Record<string, any> = {}

    if (payload.helpful !== undefined) {
      updatePayload.helpful = payload.helpful
      updatePayload.helpful_recorded_at = new Date().toISOString()
    }

    if (payload.feedback !== undefined) {
      updatePayload.feedback = payload.feedback
    }

    if (payload.personaSnapshot) {
      updatePayload.persona_snapshot = payload.personaSnapshot
    }

    if (payload.context) {
      updatePayload.context = payload.context
    }

    if (payload.metadata) {
      updatePayload.metadata = payload.metadata
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('sales_script_usages')
      .update(updatePayload)
      .eq('tenant_id', apiContext.tenantId)
      .eq('id', usageId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[scripts.usages.update] failed', error)
    return NextResponse.json(
      {
        error: 'Failed to update script usage',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}


