import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { migrateToUnifiedOAuth } from '@/lib/integrations/migration-helper'

/**
 * Migrate existing connections to unified OAuth
 * POST /api/integrations/migrate
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant ID
    const { data: appUser } = await supabase
      .from('app_users')
      .select('active_tenant_id, tenant_id')
      .eq('id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const tenantId = appUser.active_tenant_id || appUser.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
    }

    // Run migration
    const result = await migrateToUnifiedOAuth(tenantId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Migration] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Migration failed',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      },
      { status: 500 }
    )
  }
}

