/**
 * Plans API
 * 
 * GET /api/billing/plans - List all available plans
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAvailablePlans, getPlanEntitlements } from '@/lib/services/billing-service'

export async function GET(request: NextRequest) {
  try {
    // Get interval filter from query
    const url = new URL(request.url)
    const interval = url.searchParams.get('interval') as 'monthly' | 'yearly' | undefined
    
    // Fetch plans
    const plans = await getAvailablePlans(interval)
    
    // Fetch entitlements for each plan
    const plansWithEntitlements = await Promise.all(
      plans.map(async (plan) => {
        const entitlements = await getPlanEntitlements(plan.id)
        return {
          ...plan,
          entitlements,
        }
      })
    )
    
    return NextResponse.json({
      plans: plansWithEntitlements,
    })
  } catch (error: any) {
    console.error('Error fetching plans:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

