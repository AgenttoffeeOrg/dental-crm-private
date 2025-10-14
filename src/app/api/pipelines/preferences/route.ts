/**
 * Pipeline Preferences API
 * Handles user-specific pipeline preferences (ordering, views, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'
import logger from '@/lib/logger'

const PreferencesSchema = z.object({
  pipeline_order: z.array(z.string().uuid()).optional(),
  last_selected_pipeline_id: z.string().uuid().nullable().optional(),
  default_view: z.enum(['board', 'list', 'timeline']).optional(),
  show_archived: z.boolean().optional(),
  compact_view: z.boolean().optional(),
  visible_columns: z.array(z.string()).optional(),
})

/**
 * GET /api/pipelines/preferences
 * Get user's pipeline preferences
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: preferences, error } = await supabase
      .from('user_pipeline_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error({ error, userId: user.id }, 'Error fetching pipeline preferences')
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    // Return empty preferences if none exist
    if (!preferences) {
      return NextResponse.json({
        preferences: {
          pipeline_order: [],
          default_view: 'board',
          show_archived: false,
          compact_view: false,
          visible_columns: ['name', 'stage', 'value', 'owner', 'updated_at'],
        }
      })
    }

    return NextResponse.json({ preferences })

  } catch (error) {
    logger.error({ error }, 'Unexpected error in GET /api/pipelines/preferences')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST/PUT /api/pipelines/preferences
 * Create or update user's pipeline preferences
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = PreferencesSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.errors
      }, { status: 400 })
    }

    // Upsert preferences
    const { data: preferences, error } = await supabase
      .from('user_pipeline_preferences')
      .upsert([{
        user_id: user.id,
        ...validation.data,
      }], {
        onConflict: 'user_id',
      })
      .select()
      .single()

    if (error) {
      logger.error({ error, userId: user.id }, 'Error saving pipeline preferences')
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
    }

    logger.info({ userId: user.id, preferences: validation.data }, 'Pipeline preferences saved')

    return NextResponse.json({ preferences, saved: true })

  } catch (error) {
    logger.error({ error }, 'Unexpected error in POST /api/pipelines/preferences')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const PUT = POST // PUT and POST do the same (upsert)

