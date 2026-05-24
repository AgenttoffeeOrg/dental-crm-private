/**
 * /api/users (Phase 2b.79 follow-up)
 *
 * GET ?in_tenant=1 — list active members of the current tenant.
 * Returns { users: [{ id, full_name, email }] }.
 *
 * Used by the Practice Groups admin tab to populate the "Add member"
 * dropdown and by the Default-assignee policy editor to populate the
 * "fallback user" picker.
 *
 * Auth: standard user session. Returns the caller's tenant's roster
 * only — no cross-tenant exposure.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getApiRequestContext(request)
    const url = new URL(request.url)
    const inTenant = url.searchParams.get('in_tenant')

    const service = createServiceClient()

    if (inTenant === '1') {
      // Roster of active members of the caller's tenant.
      const { data: memberships, error: mErr } = await service
        .from('user_tenant_memberships')
        .select('user_id')
        .eq('tenant_id', ctx.tenantId)
        .eq('status', 'active')

      if (mErr) {
        return NextResponse.json(
          { error: 'lookup_failed', message: mErr.message },
          { status: 500 }
        )
      }

      const userIds = ((memberships ?? []) as Array<{ user_id: string }>).map((m) => m.user_id)
      if (userIds.length === 0) {
        return NextResponse.json({ users: [] })
      }

      const { data: users, error: uErr } = await service
        .from('app_users')
        .select('id, full_name, email')
        .in('id', userIds)
        .order('full_name', { ascending: true })

      if (uErr) {
        return NextResponse.json(
          { error: 'lookup_failed', message: uErr.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ users: users ?? [] })
    }

    // Without ?in_tenant=1 we don't return a roster — caller must
    // narrow the scope. Guards against accidentally enumerating all
    // app_users via a bare GET.
    return NextResponse.json(
      { error: 'scope_required', message: 'Pass ?in_tenant=1 to list tenant members.' },
      { status: 400 }
    )
  } catch (error) {
    if (error instanceof ApiContextError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[API:users] Unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
