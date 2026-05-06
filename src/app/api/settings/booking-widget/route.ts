/**
 * Phase 2a.3 — Admin API for the practice booking widget.
 *
 *   GET   /api/settings/booking-widget       → return the current tenant's widget
 *   PATCH /api/settings/booking-widget       → partial-update + jsonb-merge metadata
 *
 * Permission: `contacts.widget_manage` (granted to Owner/Admin/Manager by
 * default in Phase 2a.3 Checkpoint 1).
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import { adminUpdateWidgetSchema } from '@/lib/booking-widget/admin-schema'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PERMISSION_CODE = 'contacts.widget_manage'

async function requirePermission(
  supabase: { rpc: (name: string, args: unknown) => Promise<{ data: unknown; error: unknown }> },
  userId: string,
  tenantId: string
): Promise<NextResponse | null> {
  const { data, error } = await supabase.rpc('user_has_permission', {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_permission_code: PERMISSION_CODE,
  })
  if (error) {
    console.error('[settings/booking-widget] permission check failed', error)
    return NextResponse.json({ error: 'permission_check_failed' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'permission_denied' }, { status: 403 })
  }
  return null
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getApiRequestContext(req)
    const denied = await requirePermission(ctx.supabase, ctx.user.id, ctx.tenantId)
    if (denied) return denied

    const service = createServiceClient()
    let { data: widget, error } = await service
      .from('practice_booking_widgets')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[settings/booking-widget] read failed', error)
      return NextResponse.json({ error: 'read_failed' }, { status: 500 })
    }

    // Auto-seed if the tenant doesn't have one yet (e.g. tenant created
    // before phase 2a.3 deployed). Idempotent.
    if (!widget) {
      const { data: newId, error: rpcError } = await service.rpc(
        'seed_default_booking_widget',
        { p_tenant_id: ctx.tenantId }
      )
      if (rpcError || !newId) {
        console.error('[settings/booking-widget] seed failed', rpcError)
        return NextResponse.json({ error: 'seed_failed' }, { status: 500 })
      }
      const fresh = await service
        .from('practice_booking_widgets')
        .select('*')
        .eq('id', newId as string)
        .single()
      widget = fresh.data
    }

    // Resolve treatment offerings for the UI's treatment-picker.
    const { data: offerings } = await service
      .from('practice_treatment_offerings')
      .select(
        'id, custom_label, sort_order, is_active, treatment_type:treatment_types(id, key, display_name, category)'
      )
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })

    return NextResponse.json({
      widget,
      available_offerings: offerings ?? [],
    })
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[settings/booking-widget GET] unexpected', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getApiRequestContext(req)
    const denied = await requirePermission(ctx.supabase, ctx.user.id, ctx.tenantId)
    if (denied) return denied

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
    }

    const parsed = adminUpdateWidgetSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_failed', issues: parsed.error.issues },
        { status: 400 }
      )
    }
    const body = parsed.data

    const service = createServiceClient()
    const { data: widget, error: fetchError } = await service
      .from('practice_booking_widgets')
      .select('id, metadata')
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (fetchError || !widget) {
      return NextResponse.json({ error: 'widget_not_found' }, { status: 404 })
    }

    // Split body into first-class columns vs metadata-merged jsonb.
    const {
      webform_fields,
      webform_consent_text,
      webform_consent_required,
      trigger_mode,
      trigger_position,
      trigger_button_label,
      theme_hero_image_url,
      ...firstClass
    } = body

    const existingMeta = (widget.metadata ?? {}) as Record<string, unknown>
    const existingWebform = (existingMeta.webform ?? {}) as Record<string, unknown>
    const existingTrigger = (existingMeta.trigger ?? {}) as Record<string, unknown>
    const existingTheme = (existingMeta.theme ?? {}) as Record<string, unknown>

    const nextMeta: Record<string, unknown> = { ...existingMeta }

    if (
      webform_fields !== undefined ||
      webform_consent_text !== undefined ||
      webform_consent_required !== undefined
    ) {
      nextMeta.webform = {
        ...existingWebform,
        ...(webform_fields !== undefined && { fields: webform_fields }),
        ...(webform_consent_text !== undefined && { consent_text: webform_consent_text }),
        ...(webform_consent_required !== undefined && {
          consent_required: webform_consent_required,
        }),
      }
    }

    if (
      trigger_mode !== undefined ||
      trigger_position !== undefined ||
      trigger_button_label !== undefined
    ) {
      nextMeta.trigger = {
        ...existingTrigger,
        ...(trigger_mode !== undefined && { mode: trigger_mode }),
        ...(trigger_position !== undefined && { position: trigger_position }),
        ...(trigger_button_label !== undefined && { button_label: trigger_button_label }),
      }
    }

    if (theme_hero_image_url !== undefined) {
      nextMeta.theme = {
        ...existingTheme,
        hero_image_url: theme_hero_image_url,
      }
    }

    const patch: Record<string, unknown> = { ...firstClass }
    if (Object.keys(nextMeta).length > 0) patch.metadata = nextMeta
    patch.updated_at = new Date().toISOString()

    const { data: updated, error: updateError } = await service
      .from('practice_booking_widgets')
      .update(patch)
      .eq('id', widget.id)
      .select('*')
      .single()

    if (updateError || !updated) {
      console.error('[settings/booking-widget] update failed', updateError)
      return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    }

    return NextResponse.json({ widget: updated })
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[settings/booking-widget PATCH] unexpected', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
