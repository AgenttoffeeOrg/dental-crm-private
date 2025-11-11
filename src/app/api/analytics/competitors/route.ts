import { NextResponse } from 'next/server'

import { getApiRequestContext } from '@/lib/api/context'
import { getCompetitorInsights } from '@/lib/services/competitor-insights'

export async function GET(request: NextRequest) {
  try {
    const context = await getApiRequestContext(request)
    const data = await getCompetitorInsights(context.supabase, context.tenantId)

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[analytics.competitors] failed', error)
    return NextResponse.json({ error: 'Failed to load competitor insights' }, { status: 500 })
  }
}

