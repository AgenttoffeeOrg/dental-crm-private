import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-server'
import { INTEGRATION_GROUPS } from '@/lib/integrations/unified-scopes'
import { getAllServiceStatuses } from '@/lib/integrations/scope-checker'

/**
 * Test integration system
 * GET /api/integrations/test
 */
// Helper functions to reduce cognitive complexity
async function testTableExists(serviceSupabase: ReturnType<typeof createServiceClient>): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: tableError } = await serviceSupabase
      .from('integration_connections')
      .select('id')
      .limit(1)

    if (tableError?.code === '42P01') {
      return { success: false, error: 'integration_connections table does not exist' }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: `Table check failed: ${error instanceof Error ? error.message : 'Unknown'}` }
  }
}

async function testConnectionsLoad(serviceSupabase: ReturnType<typeof createServiceClient>, tenantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: connError } = await serviceSupabase
      .from('integration_connections')
      .select('*')
      .eq('tenant_id', tenantId)

    if (connError) {
      return { success: false, error: `Failed to load connections: ${connError.message}` }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: `Connection load failed: ${error instanceof Error ? error.message : 'Unknown'}` }
  }
}

function testUnifiedScopes(): { success: boolean; error?: string } {
  try {
    const googleGroup = INTEGRATION_GROUPS.google
    if (!googleGroup) {
      return { success: false, error: 'Google integration group not found' }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: `Unified scopes test failed: ${error instanceof Error ? error.message : 'Unknown'}` }
  }
}

function testServiceStatus(): { success: boolean; error?: string } {
  try {
    const statuses = getAllServiceStatuses('google', [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/analytics.readonly',
    ])
    if (statuses.length > 0) {
      return { success: true }
    }
    return { success: false, error: 'No service statuses returned' }
  } catch (error) {
    return { success: false, error: `Service status test failed: ${error instanceof Error ? error.message : 'Unknown'}` }
  }
}

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

    // Run tests using helper functions
    const tableTest = await testTableExists(serviceSupabase)
    tests.tableExists = tableTest.success
    if (tableTest.error) tests.errors.push(tableTest.error)

    const connectionsTest = await testConnectionsLoad(serviceSupabase, tenantId)
    tests.connectionsLoaded = connectionsTest.success
    if (connectionsTest.error) tests.errors.push(connectionsTest.error)

    const scopesTest = testUnifiedScopes()
    tests.unifiedScopes = scopesTest.success
    if (scopesTest.error) tests.errors.push(scopesTest.error)

    const statusTest = testServiceStatus()
    tests.serviceStatus = statusTest.success
    if (statusTest.error) tests.errors.push(statusTest.error)

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

