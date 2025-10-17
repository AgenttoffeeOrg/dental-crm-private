/**
 * Billing Service
 * 
 * Handles subscription management, seat counting, limits enforcement,
 * and billing operations for both single-location and multi-location organizations.
 */

import { createServerClient } from '@/lib/supabase-server'
import { FeatureFlags } from '@/lib/feature-flags'
import { SeatRequirements } from '@/config/billing'

export interface SubscriptionInfo {
  id: string
  tenant_id: string | null
  dental_group_id: string | null
  plan: {
    id: string
    name: string
    display_name: string
    tier: string
    default_seat_limit: number
    max_seat_limit: number | null
  }
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'
  seat_limit: number
  active_seats: number
  available_seats: number
  current_period_start: string
  current_period_end: string
  trial_end: string | null
  cancel_at_period_end: boolean
}

export interface SeatUsage {
  total_seats: number
  active_seats: number
  available_seats: number
  seat_limit: number
  usage_percentage: number
  is_at_limit: boolean
  can_add_seats: boolean
  max_additional_seats: number | null
}

/**
 * Get subscription for a tenant
 */
export async function getSubscription(
  tenantId: string
): Promise<SubscriptionInfo | null> {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      id,
      tenant_id,
      dental_group_id,
      status,
      seat_limit,
      active_seats,
      current_period_start,
      current_period_end,
      trial_end,
      cancel_at_period_end,
      plan:plans (
        id,
        name,
        display_name,
        tier,
        default_seat_limit,
        max_seat_limit
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single()
  
  if (error || !data) {
    // Try trialing status
    const { data: trialData } = await supabase
      .from('subscriptions')
      .select(`
        id,
        tenant_id,
        dental_group_id,
        status,
        seat_limit,
        active_seats,
        current_period_start,
        current_period_end,
        trial_end,
        cancel_at_period_end,
        plan:plans (
          id,
          name,
          display_name,
          tier,
          default_seat_limit,
          max_seat_limit
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'trialing')
      .single()
    
    if (!trialData) {
      return null
    }
    
    const plan = Array.isArray(trialData.plan) ? trialData.plan[0] : trialData.plan
    
    return {
      ...trialData,
      plan,
      available_seats: trialData.seat_limit - trialData.active_seats,
    } as SubscriptionInfo
  }
  
  const plan = Array.isArray(data.plan) ? data.plan[0] : data.plan
  
  return {
    ...data,
    plan,
    available_seats: data.seat_limit - data.active_seats,
  } as SubscriptionInfo
}

/**
 * Get seat usage for a tenant
 */
export async function getSeatUsage(tenantId: string): Promise<SeatUsage | null> {
  const subscription = await getSubscription(tenantId)
  
  if (!subscription) {
    return null
  }
  
  const available_seats = subscription.seat_limit - subscription.active_seats
  const usage_percentage = (subscription.active_seats / subscription.seat_limit) * 100
  const is_at_limit = subscription.active_seats >= subscription.seat_limit
  
  // Check if more seats can be added
  const max_additional_seats = subscription.plan.max_seat_limit
    ? subscription.plan.max_seat_limit - subscription.active_seats
    : null // Unlimited for enterprise
  
  return {
    total_seats: subscription.seat_limit,
    active_seats: subscription.active_seats,
    available_seats,
    seat_limit: subscription.seat_limit,
    usage_percentage,
    is_at_limit,
    can_add_seats: max_additional_seats === null || max_additional_seats > 0,
    max_additional_seats,
  }
}

/**
 * Count active users for a tenant (real-time count)
 */
export async function countActiveSeats(tenantId: string): Promise<number> {
  const supabase = await createServerClient()
  
  const { count, error } = await supabase
    .from('app_users')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
  
  if (error) {
    console.error('Error counting active seats:', error)
    return 0
  }
  
  return count || 0
}

/**
 * Sync subscription seat count with actual user count
 */
export async function syncSeatCount(tenantId: string): Promise<void> {
  const supabase = await createServerClient()
  
  const actualCount = await countActiveSeats(tenantId)
  
  await supabase
    .from('subscriptions')
    .update({ active_seats: actualCount })
    .eq('tenant_id', tenantId)
}

/**
 * Check if seats are available before adding a user
 * Returns { available: boolean, reason?: string }
 */
export async function checkSeatAvailability(
  tenantId: string,
  seatsNeeded: number = 1
): Promise<{ available: boolean; reason?: string }> {
  // If seat enforcement is disabled, always allow
  if (!FeatureFlags.ENABLE_SEAT_ENFORCEMENT) {
    return { available: true }
  }
  
  const usage = await getSeatUsage(tenantId)
  
  if (!usage) {
    return {
      available: false,
      reason: 'No active subscription found',
    }
  }
  
  if (usage.available_seats < seatsNeeded) {
    return {
      available: false,
      reason: `Not enough seats available. Need ${seatsNeeded}, have ${usage.available_seats}.`,
    }
  }
  
  return { available: true }
}

/**
 * Reserve seats (increment active_seats count)
 * Used when inviting or adding users
 */
export async function reserveSeats(
  tenantId: string,
  count: number = 1
): Promise<{ success: boolean; error?: string }> {
  // Check availability first
  const check = await checkSeatAvailability(tenantId, count)
  
  if (!check.available) {
    return {
      success: false,
      error: check.reason,
    }
  }
  
  const supabase = await createServerClient()
  
  // Atomic increment
  const { error } = await supabase.rpc('increment_active_seats', {
    p_tenant_id: tenantId,
    p_count: count,
  })
  
  if (error) {
    // Fallback to manual update if function doesn't exist
    const subscription = await getSubscription(tenantId)
    
    if (!subscription) {
      return {
        success: false,
        error: 'No subscription found',
      }
    }
    
    const newCount = subscription.active_seats + count
    
    if (newCount > subscription.seat_limit) {
      return {
        success: false,
        error: 'Would exceed seat limit',
      }
    }
    
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ active_seats: newCount })
      .eq('id', subscription.id)
    
    if (updateError) {
      return {
        success: false,
        error: updateError.message,
      }
    }
  }
  
  return { success: true }
}

/**
 * Release seats (decrement active_seats count)
 * Used when removing or deactivating users
 */
export async function releaseSeats(
  tenantId: string,
  count: number = 1
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient()
  
  // Atomic decrement
  const { error } = await supabase.rpc('decrement_active_seats', {
    p_tenant_id: tenantId,
    p_count: count,
  })
  
  if (error) {
    // Fallback to manual update
    const subscription = await getSubscription(tenantId)
    
    if (!subscription) {
      return {
        success: false,
        error: 'No subscription found',
      }
    }
    
    const newCount = Math.max(0, subscription.active_seats - count)
    
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ active_seats: newCount })
      .eq('id', subscription.id)
    
    if (updateError) {
      return {
        success: false,
        error: updateError.message,
      }
    }
  }
  
  return { success: true }
}

/**
 * Calculate minimum seats required for multi-location
 * Each new location requires minimum additional seats
 */
export function calculateMinimumSeatsForLocations(
  locationCount: number
): number {
  if (locationCount <= 1) {
    return SeatRequirements.MINIMUM_SEATS_FIRST_LOCATION
  }
  
  return (
    SeatRequirements.MINIMUM_SEATS_FIRST_LOCATION +
    (locationCount - 1) * SeatRequirements.MINIMUM_SEATS_PER_NEW_LOCATION
  )
}

/**
 * Check if adding a new location is allowed (seat-wise)
 */
export async function canAddNewLocation(
  dentalGroupId: string
): Promise<{ allowed: boolean; reason?: string; minimumSeatsNeeded?: number }> {
  const supabase = await createServerClient()
  
  // Get subscription for dental group
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('seat_limit, active_seats')
    .eq('dental_group_id', dentalGroupId)
    .single()
  
  if (!subscription) {
    return {
      allowed: false,
      reason: 'No subscription found for this dental group',
    }
  }
  
  // Count existing locations
  const { count: locationCount } = await supabase
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .eq('dental_group_id', dentalGroupId)
  
  const currentLocations = locationCount || 0
  const newLocationCount = currentLocations + 1
  
  const minimumSeatsNeeded = calculateMinimumSeatsForLocations(newLocationCount)
  
  if (subscription.seat_limit < minimumSeatsNeeded) {
    return {
      allowed: false,
      reason: `Adding a new location requires at least ${minimumSeatsNeeded} total seats. Current limit: ${subscription.seat_limit}.`,
      minimumSeatsNeeded,
    }
  }
  
  // Check if enough available seats (at least MINIMUM_SEATS_PER_NEW_LOCATION)
  const availableSeats = subscription.seat_limit - subscription.active_seats
  
  if (availableSeats < SeatRequirements.MINIMUM_SEATS_PER_NEW_LOCATION) {
    return {
      allowed: false,
      reason: `Adding a new location requires at least ${SeatRequirements.MINIMUM_SEATS_PER_NEW_LOCATION} available seats. Available: ${availableSeats}.`,
      minimumSeatsNeeded: subscription.active_seats + SeatRequirements.MINIMUM_SEATS_PER_NEW_LOCATION,
    }
  }
  
  return { allowed: true }
}

/**
 * Get all plans (for plan selection UI)
 */
export async function getAvailablePlans(interval?: 'monthly' | 'yearly') {
  const supabase = await createServerClient()
  
  let query = supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('default_seat_limit', { ascending: true })
  
  if (interval) {
    query = query.eq('billing_interval', interval)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching plans:', error)
    return []
  }
  
  return data || []
}

/**
 * Get plan entitlements
 */
export async function getPlanEntitlements(planId: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('plan_entitlements')
    .select('*')
    .eq('plan_id', planId)
  
  if (error) {
    console.error('Error fetching plan entitlements:', error)
    return []
  }
  
  return data || []
}

/**
 * Check if tenant has a specific entitlement
 */
export async function hasEntitlement(
  tenantId: string,
  entitlementKey: string
): Promise<boolean> {
  const subscription = await getSubscription(tenantId)
  
  if (!subscription) {
    return false
  }
  
  const supabase = await createServerClient()
  
  const { data } = await supabase
    .from('plan_entitlements')
    .select('key')
    .eq('plan_id', subscription.plan.id)
    .eq('key', entitlementKey)
    .single()
  
  return !!data
}

