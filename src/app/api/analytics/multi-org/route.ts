/**
 * API Route: Multi-Org Adoption Metrics
 * 
 * Fetch system-wide multi-org adoption statistics
 */

import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch multi-org metrics from view
    const { data: metrics, error } = await supabase
      .from('multiorg_adoption_metrics')
      .select('*')
      .single()

    if (error) {
      console.error('[API] Error fetching multi-org metrics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch multi-org metrics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      metrics,
    })
  } catch (error: any) {
    console.error('[API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



