import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET: Fetch user's column preferences for a specific page
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get page from query params
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page')
    
    if (!page) {
      return NextResponse.json({ error: 'Page parameter required' }, { status: 400 })
    }

    // Fetch preferences
    const { data: preferences, error } = await supabase
      .from('user_column_preferences')
      .select('visible_columns')
      .eq('user_id', user.id)
      .eq('page', page)
      .maybeSingle()

    if (error) {
      console.error('[ColumnPreferences] Error fetching preferences:', error)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    // Return preferences or null if not found
    return NextResponse.json({
      visibleColumns: preferences?.visible_columns || null
    })
  } catch (error) {
    console.error('[ColumnPreferences] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Save user's column preferences for a specific page
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { page, visibleColumns } = body

    if (!page || !visibleColumns || !Array.isArray(visibleColumns)) {
      return NextResponse.json(
        { error: 'Page and visibleColumns (array) are required' },
        { status: 400 }
      )
    }

    // Upsert preferences
    const { data, error } = await supabase
      .from('user_column_preferences')
      .upsert(
        {
          user_id: user.id,
          page,
          visible_columns: visibleColumns,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,page'
        }
      )
      .select()
      .single()

    if (error) {
      console.error('[ColumnPreferences] Error saving preferences:', error)
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      visibleColumns: data.visible_columns
    })
  } catch (error) {
    console.error('[ColumnPreferences] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

