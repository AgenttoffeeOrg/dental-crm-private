import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * Test integration connection
 * POST /api/integrations/[type]/test
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { type } = params
    const body = await request.json()
    const { tenantId, credentials } = body

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify tenant access
    const { data: appUser } = await supabase
      .from('app_users')
      .select('active_tenant_id, tenant_id')
      .eq('id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userTenantId = appUser.active_tenant_id || appUser.tenant_id
    if (userTenantId !== tenantId) {
      return NextResponse.json({ error: 'Unauthorized tenant access' }, { status: 403 })
    }

    // Test connection based on type
    let testResult = false
    let errorMessage = ''

    if (type.startsWith('twilio_')) {
      // Test Twilio connection
      try {
        const twilio = require('twilio')
        const client = twilio(credentials.accountSid, credentials.authToken)
        
        // Try to fetch account info (lightweight test)
        await client.api.accounts(credentials.accountSid).fetch()
        testResult = true
      } catch (error: any) {
        errorMessage = error.message || 'Invalid credentials'
        testResult = false
      }
    } else if (type === 'sendgrid') {
      // Test SendGrid connection
      try {
        const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          testResult = true
        } else {
          const error = await response.json()
          errorMessage = error.errors?.[0]?.message || 'Invalid API key'
          testResult = false
        }
      } catch (error: any) {
        errorMessage = error.message || 'Connection failed'
        testResult = false
      }
    } else {
      return NextResponse.json(
        { error: `Testing not supported for ${type}` },
        { status: 400 }
      )
    }

    if (testResult) {
      return NextResponse.json({
        success: true,
        message: 'Connection test successful!',
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: errorMessage || 'Connection test failed',
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[Test Integration] Error:', error)
    return NextResponse.json(
      { error: 'Failed to test connection' },
      { status: 500 }
    )
  }
}

