/**
 * Subscription API
 * 
 * GET /api/billing/subscription - Get current subscription
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSubscription, getSeatUsage } from '@/lib/services/billing-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get user's tenant
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()
    
    if (!appUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Get subscription
    const subscription = await getSubscription(appUser.tenant_id)
    
    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }
    
    // Get seat usage
    const seatUsage = await getSeatUsage(appUser.tenant_id)
    
    return NextResponse.json({
      subscription,
      seatUsage,
    })
  } catch (error: any) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

