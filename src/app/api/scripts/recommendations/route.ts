import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getApiRequestContext } from '@/lib/api/context'
import { normalizeTrigger, selectScripts } from '@/lib/services/script-selector'

const querySchema = z.object({
  trigger: z.string().optional(),
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(10).optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parseResult = querySchema.safeParse({
      trigger: searchParams.get('trigger') ?? undefined,
      contactId: searchParams.get('contactId') ?? undefined,
      dealId: searchParams.get('dealId') ?? undefined,
      limit: searchParams.get('limit') ?? undefined
    })

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { trigger, contactId, dealId, limit } = parseResult.data
    const apiContext = await getApiRequestContext(request)
    const supabase = apiContext.supabase

    const personaTags: string[] = []
    const personaProfile: {
      anxietyLevel?: number | null
      trustScore?: number | null
      decisionStyle?: string | null
      communicationStyle?: string | null
    } = {}

    if (contactId) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, tags')
        .eq('tenant_id', apiContext.tenantId)
        .eq('id', contactId)
        .maybeSingle()

      if (contact?.tags?.length) {
        personaTags.push(...contact.tags)
      }

      const { data: profile } = await supabase
        .from('contact_psych_profiles')
        .select('anxiety_level, trust_score, decision_style, communication_style, snapshot')
        .eq('tenant_id', apiContext.tenantId)
        .eq('contact_id', contactId)
        .maybeSingle()

      if (profile) {
        personaProfile.anxietyLevel = profile.anxiety_level
        personaProfile.trustScore = profile.trust_score
        personaProfile.decisionStyle = profile.decision_style
        personaProfile.communicationStyle = profile.communication_style
        const snapshotTags = (profile.snapshot as Record<string, any> | null)?.persona_tags
        if (Array.isArray(snapshotTags)) {
          personaTags.push(...snapshotTags.map((tag: string) => tag.toString()))
        }
      }
    }

    const selectedTrigger = normalizeTrigger(trigger ?? null)

    const recommendations = await selectScripts({
      tenantId: apiContext.tenantId,
      trigger: selectedTrigger,
      personaTags,
      personaProfile,
      contactId: contactId ?? undefined,
      dealId: dealId ?? undefined,
      limit: limit ?? 3
    })

    return NextResponse.json({
      data: recommendations,
      meta: {
        trigger: selectedTrigger,
        personaTags
      }
    })
  } catch (error) {
    console.error('[scripts.recommendations] failed', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch script recommendations',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}


