import type { NextRequest } from 'next/server'
import { getSupabaseAuthContext } from '@/lib/api/auth'
import { createServiceClient } from '@/lib/supabase-server'

interface MembershipRecord {
  id: string
  role: string
  status: string
  all_locations: boolean
}

export interface ApiRequestContext {
  supabase: ReturnType<typeof createClient>
  user: { id: string; email?: string | null }
  tenantId: string
  activeLocationId: string | null
  membership: MembershipRecord
  accessibleLocationIds: string[] | null
}

export class ApiContextError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiContextError'
  }
}

export async function getApiRequestContext(request: NextRequest): Promise<ApiRequestContext> {
  const { supabase, user, error: authError } = await getSupabaseAuthContext(request)

  if (authError || !user) {
    throw new ApiContextError(401, 'Unauthorized')
  }

  const serviceClient = createServiceClient()

  const { data: appUser, error: appUserError } = await supabase
    .from('app_users')
    .select('active_tenant_id, active_location_id')
    .eq('id', user.id)
    .single()

  if (appUserError || !appUser?.active_tenant_id) {
    throw new ApiContextError(403, 'Active organization context is required')
  }

  const tenantId = appUser.active_tenant_id as string
  const activeLocationId = appUser.active_location_id ?? null

  const { data: membership, error: membershipError } = await supabase
    .from('user_tenant_memberships')
    .select('id, role, status, all_locations')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single()

  if (membershipError || !membership) {
    throw new ApiContextError(403, 'Access denied for tenant')
  }

  let accessibleLocationIds: string[] | null = null

  if (!membership.all_locations) {
    const { data: locations, error: locationsError } = await serviceClient.rpc(
      'get_user_accessible_locations',
      {
        p_user_id: user.id,
        p_tenant_id: tenantId,
      }
    )

    if (locationsError) {
      throw new ApiContextError(500, 'Failed to determine accessible locations')
    }

    accessibleLocationIds = Array.isArray(locations)
      ? locations.map((loc: any) => loc.id)
      : []

    if (!accessibleLocationIds.length) {
      accessibleLocationIds = []
    }
  }

  return {
    supabase,
    user: { id: user.id, email: user.email },
    tenantId,
    activeLocationId,
    membership: membership as MembershipRecord,
    accessibleLocationIds,
  }
}



