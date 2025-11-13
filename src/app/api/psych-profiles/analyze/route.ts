import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getApiRequestContext } from '@/lib/api/context'
import { analyzeContactPsychProfile } from '@/lib/services/psychological-analyzer'

const AnalyzeBodySchema = z.object({
  contactId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parseResult = AnalyzeBodySchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { contactId } = parseResult.data
    const apiContext = await getApiRequestContext()
    const { tenantId, user } = apiContext

    const result = await analyzeContactPsychProfile({
      contactId,
      tenantId,
      triggeredBy: user.id ?? null,
    })

    return NextResponse.json(
      {
        data: {
          profile: result.profile,
          snapshot: result.snapshot,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[psych-profiles.analyze] failed', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze psychological profile',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}




