/**
 * Phase 2b.13 — Practice Brain API.
 *
 * GET   /api/settings/practice-brain  → returns the current tenant's brain row
 *                                       (or the empty default if no row yet)
 * PATCH /api/settings/practice-brain  → upserts the row, writes an audit_trail
 *                                       entry under category 'setting'.
 *
 * Auth: requireAuthenticatedTenantUser. Tenant id always comes from the
 * authenticated session — request bodies must not pick another tenant.
 *
 * Audit-first: insert audit_trail BEFORE the upsert; if the upsert fails,
 * delete the audit row (compensating). If the audit insert itself fails,
 * 500 with `audit_log_failed` and skip the mutation. Mirrors the
 * canonical pattern from `audit_trail` RLS gotcha + dispatcher.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  assertBodyTenantMatches,
  authErrorResponse,
  requireAuthenticatedTenantUser,
} from '@/lib/auth/api-auth-helpers'
import { createServiceClient } from '@/lib/supabase-server'
import {
  AuditLogWriteError,
  deleteAuditRowServer,
  logAuditServer,
} from '@/lib/auto-audit'
import { loadPracticeBrain, type PracticeBrain } from '@/lib/automations/practice-brain'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const serviceOfferingSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().nullish(),
})

const pricingItemSchema = z.object({
  service: z.string().trim().min(1),
  price: z.string().trim().min(1),
  notes: z.string().nullish(),
})

const faqItemSchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
})

const hoursEntrySchema = z.union([
  z.object({
    open: z.string(),
    close: z.string(),
    closed: z.boolean().optional(),
  }),
  z.object({ closed: z.literal(true) }),
])

const openingHoursSchema = z.record(hoursEntrySchema)

const patchBodySchema = z.object({
  tenant_id: z.string().uuid().optional(),
  brand_voice: z.string().nullish(),
  practice_description: z.string().nullish(),
  services_offered: z.array(serviceOfferingSchema).optional(),
  pricing: z.array(pricingItemSchema).optional(),
  opening_hours: openingHoursSchema.optional(),
  faqs: z.array(faqItemSchema).optional(),
  escalation_rules: z.string().nullish(),
  additional_instructions: z.string().nullish(),
})

type PatchBody = z.infer<typeof patchBodySchema>

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedTenantUser(request)
    const brain = await loadPracticeBrain(auth.tenantId)
    return NextResponse.json({ ok: true, brain }, { status: 200 })
  } catch (err) {
    return authErrorResponse(err)
  }
}

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

function buildUpdateColumns(body: PatchBody): Record<string, unknown> {
  const cols: Record<string, unknown> = {}

  if ('brand_voice' in body) cols.brand_voice = body.brand_voice ?? null
  if ('practice_description' in body) cols.practice_description = body.practice_description ?? null
  if ('services_offered' in body) cols.services_offered = body.services_offered ?? []
  if ('pricing' in body) cols.pricing = body.pricing ?? []
  if ('opening_hours' in body) cols.opening_hours = body.opening_hours ?? {}
  if ('faqs' in body) cols.faqs = body.faqs ?? []
  if ('escalation_rules' in body) cols.escalation_rules = body.escalation_rules ?? null
  if ('additional_instructions' in body) {
    cols.additional_instructions = body.additional_instructions ?? null
  }

  return cols
}

function diffChangedFields(
  before: PracticeBrain,
  after: Record<string, unknown>
): string[] {
  return Object.keys(after).filter((key) => {
    const beforeVal = (before as unknown as Record<string, unknown>)[key]
    const afterVal = after[key]
    return JSON.stringify(beforeVal) !== JSON.stringify(afterVal)
  })
}

export async function PATCH(request: NextRequest) {
  let auditId: string | null = null
  let auth: Awaited<ReturnType<typeof requireAuthenticatedTenantUser>> | null = null

  try {
    auth = await requireAuthenticatedTenantUser(request)

    const rawBody = (await request.json()) as Record<string, unknown>

    if ('tenant_id' in rawBody) {
      assertBodyTenantMatches(
        typeof rawBody.tenant_id === 'string' ? rawBody.tenant_id : undefined,
        auth.tenantId
      )
    }

    const parsed = patchBodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updateCols = buildUpdateColumns(parsed.data)
    if (Object.keys(updateCols).length === 0) {
      return NextResponse.json({ error: 'no_changes' }, { status: 400 })
    }

    const before = await loadPracticeBrain(auth.tenantId)
    const changedFields = diffChangedFields(before, updateCols)

    if (changedFields.length === 0) {
      return NextResponse.json({ ok: true, brain: before, changed_fields: [] }, { status: 200 })
    }

    // Audit-first: write the audit row before mutating. If the audit
    // insert fails, abort with 500.
    try {
      auditId = await logAuditServer({
        userId: auth.userId,
        tenantId: auth.tenantId,
        actionType: 'update',
        category: 'setting',
        entityType: 'tenant_ai_context',
        entityName: 'Practice Brain',
        description: `Updated Practice Brain (${changedFields.join(', ')})`,
        beforeState: before as unknown as Record<string, unknown>,
        afterState: updateCols,
        changedFields,
        severity: 'info',
        tags: ['settings', 'practice_brain', 'ai'],
      })
    } catch (err) {
      if (err instanceof AuditLogWriteError) {
        return NextResponse.json(
          { error: 'audit_log_failed', internal_error_id: err.internalErrorId },
          { status: 500 }
        )
      }
      throw err
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('tenant_ai_context')
      .upsert(
        {
          tenant_id: auth.tenantId,
          ...updateCols,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' }
      )
      .select(
        'tenant_id, brand_voice, practice_description, services_offered, pricing, opening_hours, faqs, escalation_rules, additional_instructions, updated_at'
      )
      .single()

    if (error || !data) {
      console.error('[settings/practice-brain PATCH] db error', { tenantId: auth.tenantId, error })
      if (auditId) {
        await deleteAuditRowServer(auditId, auth.tenantId)
      }
      return NextResponse.json(
        { error: 'db_error', message: error?.message ?? 'upsert returned no row' },
        { status: 500 }
      )
    }

    const brain: PracticeBrain = {
      tenant_id: data.tenant_id as string,
      brand_voice: (data.brand_voice as string | null) ?? null,
      practice_description: (data.practice_description as string | null) ?? null,
      services_offered: Array.isArray(data.services_offered)
        ? (data.services_offered as PracticeBrain['services_offered'])
        : [],
      pricing: Array.isArray(data.pricing)
        ? (data.pricing as PracticeBrain['pricing'])
        : [],
      opening_hours:
        data.opening_hours && typeof data.opening_hours === 'object'
          ? (data.opening_hours as PracticeBrain['opening_hours'])
          : {},
      faqs: Array.isArray(data.faqs) ? (data.faqs as PracticeBrain['faqs']) : [],
      escalation_rules: (data.escalation_rules as string | null) ?? null,
      additional_instructions: (data.additional_instructions as string | null) ?? null,
      updated_at: (data.updated_at as string | null) ?? null,
    }

    return NextResponse.json(
      { ok: true, brain, changed_fields: changedFields, audit_id: auditId },
      { status: 200 }
    )
  } catch (err) {
    if (auditId && auth) {
      await deleteAuditRowServer(auditId, auth.tenantId)
    }
    return authErrorResponse(err)
  }
}
