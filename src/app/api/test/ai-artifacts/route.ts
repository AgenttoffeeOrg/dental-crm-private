import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    // Get all AI artifacts with their kinds
    const { data: artifacts, error } = await supabase
      .from('ai_artifacts')
      .select('id, kind, activity_id, confidence, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get distinct kinds
    const { data: distinctKinds, error: kindsError } = await supabase
      .from('ai_artifacts')
      .select('kind')
      .order('kind')

    if (kindsError) {
      console.error('Kinds error:', kindsError)
      return NextResponse.json({ error: kindsError.message }, { status: 500 })
    }

    const kinds = [...new Set(distinctKinds?.map(k => k.kind) || [])]

    return NextResponse.json({
      success: true,
      artifacts: artifacts || [],
      distinctKinds: kinds,
      count: artifacts?.length || 0
    })
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

