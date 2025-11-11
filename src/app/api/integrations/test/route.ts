import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-server'
import { INTEGRATION_GROUPS } from '@/lib/integrations/unified-scopes'
import { getAllServiceStatuses } from '@/lib/integrations/scope-checker'

/**
 * Test integration system
 * GET /api/integrations/test
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const serviceSupabase = createServiceClient()

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

    // Test results
    const tests = {
      tableExists: false,
      connectionsLoaded: false,
      unifiedScopes: false,
      serviceStatus: false,
      errors: [] as string[],
    }

    // Test 1: Check if integration_connections table exists
    try {
      const { error: tableError } = await serviceSupabase
        .from('integration_connections')
        .select('id')
        .limit(1)

      if (tableError && tableError.code === '42P01') {
        tests.errors.push('integration_connections table does not exist')
      } else {
        tests.tableExists = true
      }
    } catch (error) {
      tests.errors.push(`Table check failed: ${error instanceof Error ? error.message : 'Unknown'}`)
    }

    // Test 2: Load connections
    try {
      const { data: connections, error: connError } = await serviceSupabase
        .from('integration_connections')
        .select('*')
        .eq('tenant_id', tenantId)

      if (connError) {
        tests.errors.push(`Failed to load connections: ${connError.message}`)
      } else {
        tests.connectionsLoaded = true
      }
    } catch (error) {
      tests.errors.push(`Connection load failed: ${error instanceof Error ? error.message : 'Unknown'}`)
    }

    // Test 3: Test unified scopes
    try {
      const googleGroup = INTEGRATION_GROUPS.google
      if (!googleGroup) {
        tests.errors.push('Google integration group not found')
      } else {
        tests.unifiedScopes = true
      }
    } catch (error) {
      tests.errors.push(`Unified scopes test failed: ${error instanceof Error ? error.message : 'Unknown'}`)
    }

    // Test 4: Test service status checking
    try {
      const statuses = getAllServiceStatuses('google', [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/analytics.readonly',
      ])
      if (statuses.length > 0) {
        tests.serviceStatus = true
      }
    } catch (error) {
      tests.errors.push(`Service status test failed: ${error instanceof Error ? error.message : 'Unknown'}`)
    }

    const allTestsPassed = tests.tableExists && tests.connectionsLoaded && tests.unifiedScopes && tests.serviceStatus

    return NextResponse.json({
      success: allTestsPassed,
      tests,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Integration Test] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

