/**
 * Phase 2a.3 — Admin API: rotate the widget slug.
 *
 *   POST /api/settings/booking-widget/regenerate-slug
 *
 * Generates a fresh slug for the tenant's widget. Useful after a rebrand or
 * a widget-abuse incident where a practice wants to invalidate the old URL.
 *
 * Permission: `contacts.widget_manage`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PERMISSION_CODE = 'contacts.widget_manage'

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/

function buildSlug(seed: string): string {
  const base = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'practice'
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getApiRequestContext(req)

    const { data: hasPerm, error: permError } = await ctx.supabase.rpc('user_has_permission', {
      p_user_id: ctx.user.id,
      p_tenant_id: ctx.tenantId,
      p_permission_code: PERMISSION_CODE,
    })
    if (permError) {
      return NextResponse.json({ error: 'permission_check_failed' }, { status: 500 })
    }
    if (!hasPerm) {
      return NextResponse.json({ error: 'permission_denied' }, { status: 403 })
    }

    const service = createServiceClient()
    const { data: widget, error: fetchError } = await service
      .from('practice_booking_widgets')
      .select('id, tenant_id, display_name')
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (fetchError || !widget) {
      return NextResponse.json({ error: 'widget_not_found' }, { status: 404 })
    }

    const { data: tenantRow } = await service
      .from('tenants')
      .select('slug, name')
      .eq('id', widget.tenant_id)
      .single()

    const seed = (tenantRow?.slug as string) || (tenantRow?.name as string) || (widget.display_name as string) || 'practice'

    let newSlug = ''
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = buildSlug(seed)
      if (!SLUG_REGEX.test(candidate)) continue
      const { data: existing } = await service
        .from('practice_booking_widgets')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle()
      if (!existing) {
        newSlug = candidate
        break
      }
    }

    if (!newSlug) {
      return NextResponse.json({ error: 'could_not_generate_slug' }, { status: 500 })
    }

    const { data: updated, error: updateError } = await service
      .from('practice_booking_widgets')
      .update({ slug: newSlug, updated_at: new Date().toISOString() })
      .eq('id', widget.id)
      .select('id, slug, embed_script_secret')
      .single()

    if (updateError || !updated) {
      console.error('[regenerate-slug] update failed', updateError)
      return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    }

    return NextResponse.json({ widget: updated })
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[regenerate-slug] unexpected', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
