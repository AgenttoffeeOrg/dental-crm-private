/**
 * Phase 2b.28.2-fix — Public brand-colour lookup for hosted forms.
 *
 * Why this exists:
 *   The public form pages (`/f/[slug]` and `/forms/embed/[id]`)
 *   render on the visitor's browser with the anon supabase role.
 *   Anon can SELECT `marketing_forms` via existing RLS, but NOT
 *   `tenants` — so the client-side brand-colour fetch added in
 *   2b.28.2 returned null and the submit button stayed default-blue.
 *
 *   This server-side endpoint takes a form slug OR id, looks up
 *   the form's tenant via service-role, and returns just the two
 *   brand columns. Public — no auth — but ONLY returns colours for
 *   forms that are actually published (status='active' AND
 *   is_published=true), so it can't be used to enumerate arbitrary
 *   tenant brand data.
 *
 *   Returns: { primary: string | null, accent: string | null }
 *   404 when the slug/id doesn't match a published form (mirrors the
 *   404 a visitor would see on the form page itself).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function looksLikeUuid(s: string): boolean {
  return s.length === 36 && /^[0-9a-f-]{36}$/i.test(s)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const id = searchParams.get('id')

  if (!slug && !id) {
    return NextResponse.json(
      { error: 'missing_query', message: 'Provide ?slug=… or ?id=…' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  let formQuery = supabase
    .from('marketing_forms')
    .select('id, tenant_id')
    .eq('status', 'active')
    .eq('is_published', true)
    .limit(1)

  if (id) {
    formQuery = formQuery.eq('id', id)
  } else if (slug) {
    // Match the /f/[slug] page's lookup: try slug first, then id if it
    // looks like a UUID (some callers paste the form id directly).
    if (looksLikeUuid(slug)) {
      formQuery = formQuery.eq('id', slug)
    } else {
      formQuery = formQuery.eq('public_url_slug', slug)
    }
  }

  const { data: form, error: formErr } = await formQuery.maybeSingle()
  if (formErr) {
    console.error('[public/form-brand] form lookup failed', { slug, id, error: formErr.message })
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
  if (!form || !form.tenant_id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('primary_color, secondary_color')
    .eq('id', form.tenant_id)
    .maybeSingle()

  if (tenantErr) {
    // Tenant row should exist for any form with a tenant_id; log but
    // return nulls rather than 500 so the form still renders.
    console.warn('[public/form-brand] tenant lookup failed', {
      tenantId: form.tenant_id,
      error: tenantErr.message,
    })
    return NextResponse.json({ primary: null, accent: null })
  }

  return NextResponse.json({
    primary: (tenant as { primary_color?: string | null } | null)?.primary_color ?? null,
    accent: (tenant as { secondary_color?: string | null } | null)?.secondary_color ?? null,
  })
}
