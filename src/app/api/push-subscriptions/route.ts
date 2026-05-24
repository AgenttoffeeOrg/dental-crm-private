/**
 * /api/push-subscriptions (Phase 2b.70)
 *
 * POST   — store a Web Push subscription returned by the browser.
 *          Body: { subscription: PushSubscriptionJSON, user_agent?: string }
 *
 * DELETE — remove a subscription by endpoint.
 *          Body: { endpoint: string }
 *
 * Auth: standard user session via getApiRequestContext.
 *
 * Writes use the service-role client because push_subscriptions has
 * RLS INSERT/UPDATE/DELETE blocked for everyone except service_role
 * (per migration 2b.59).
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import { z } from 'zod'

const SubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().min(20),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: z.string().min(10),
      auth: z.string().min(10),
    }),
  }),
  user_agent: z.string().max(500).optional(),
})

const DeleteSchema = z.object({
  endpoint: z.string().min(20),
})

export async function POST(request: NextRequest) {
  try {
    const context = await getApiRequestContext(request)
    const body = await request.json().catch(() => ({}))
    const parsed = SubscriptionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_subscription', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const service = createServiceClient()
    const sub = parsed.data.subscription

    // Upsert by (user_id, endpoint) — same browser re-registering
    // shouldn't create duplicates.
    const { error: upsertErr } = await service
      .from('push_subscriptions')
      .upsert(
        {
          tenant_id: context.tenantId,
          user_id: context.user.id,
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
          user_agent: parsed.data.user_agent ?? null,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,endpoint' }
      )

    if (upsertErr) {
      console.error('[push-subscriptions/POST] upsert failed', upsertErr)
      return NextResponse.json(
        { error: 'persist_failed', message: upsertErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[push-subscriptions/POST] unexpected', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getApiRequestContext(request)
    const body = await request.json().catch(() => ({}))
    const parsed = DeleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_endpoint', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const service = createServiceClient()
    const { error: deleteErr } = await service
      .from('push_subscriptions')
      .delete()
      .eq('user_id', context.user.id)
      .eq('endpoint', parsed.data.endpoint)

    if (deleteErr) {
      return NextResponse.json(
        { error: 'delete_failed', message: deleteErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[push-subscriptions/DELETE] unexpected', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

/** GET — return whether the current user has any push subscriptions. */
export async function GET(request: NextRequest) {
  try {
    const context = await getApiRequestContext(request)
    const service = createServiceClient()
    const { data, error } = await service
      .from('push_subscriptions')
      .select('id, endpoint, user_agent, created_at, last_used_at')
      .eq('user_id', context.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
    }
    return NextResponse.json({ subscriptions: data ?? [] }, { status: 200 })
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[push-subscriptions/GET] unexpected', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
