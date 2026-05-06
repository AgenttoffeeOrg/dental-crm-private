/**
 * Phase 2a.8 — Shared Zod schemas for the treatment-offerings settings UI.
 *
 * Used by:
 *   - /api/settings/treatment-offerings/{route.ts, [id]/route.ts, toggle/route.ts}
 *   - components/settings/treatment-offerings-tab.tsx (drawer form validation)
 *
 * Field shape mirrors `practice_treatment_offerings` minus tenant/owner/audit
 * columns. We accept POUNDS-as-decimal in the API surface and translate to
 * integer pence (`*_cents`) in the route handlers, which is the storage shape
 * `deal-creation.ts` reads.
 */

import { z } from 'zod'

// 100 chars matches the practical UI/notification template limit; the column
// itself is `text` so this is purely product-side validation.
const customLabelSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters')

// Pounds (decimal). Stored as integer pence in DB.
const moneyPoundsSchema = z
  .number({ invalid_type_error: 'Must be a number' })
  .nonnegative('Must be \u2265 0')
  .max(1_000_000, 'Must be \u2264 \u00a31,000,000')

const uuid = z.string().uuid()

export const offeringTogglePayloadSchema = z.object({
  treatment_type_id: uuid,
  is_active: z.boolean(),
})
export type OfferingTogglePayload = z.infer<typeof offeringTogglePayloadSchema>

/**
 * Body accepted by POST /api/settings/treatment-offerings.
 *
 * Either `treatment_type_id` (canonical) or `custom_label` (custom) — the API
 * route enforces XOR semantics on top of this. The DB CHECK constraint
 * `practice_treatment_offerings_canonical_or_custom_chk` adds a hard floor.
 */
export const offeringCreatePayloadSchema = z
  .object({
    treatment_type_id: uuid.nullable().optional(),
    custom_label: customLabelSchema.nullable().optional(),
    pipeline_id: uuid,
    stage_id: uuid.nullable().optional(),
    custom_lead_value_pounds_min: moneyPoundsSchema.nullable().optional(),
    custom_lead_value_pounds_max: moneyPoundsSchema.nullable().optional(),
  })
  .refine(
    (v) => Boolean(v.treatment_type_id) || Boolean(v.custom_label?.trim()),
    {
      message: 'Either treatment_type_id (canonical) or custom_label (custom) is required',
      path: ['custom_label'],
    }
  )
  .refine(
    (v) => {
      if (v.custom_lead_value_pounds_min == null || v.custom_lead_value_pounds_max == null) {
        return true
      }
      return v.custom_lead_value_pounds_max >= v.custom_lead_value_pounds_min
    },
    {
      message: 'Maximum value must be \u2265 minimum',
      path: ['custom_lead_value_pounds_max'],
    }
  )
export type OfferingCreatePayload = z.infer<typeof offeringCreatePayloadSchema>

/**
 * Body accepted by PATCH /api/settings/treatment-offerings/[id].
 *
 * All fields optional; we only apply what the caller sends. `custom_label` is
 * editable on canonical offerings (overrides display) and on custom offerings
 * (their primary name). Sending `null` explicitly clears the override.
 */
export const offeringUpdatePayloadSchema = z
  .object({
    custom_label: customLabelSchema.nullable().optional(),
    pipeline_id: uuid.optional(),
    stage_id: uuid.nullable().optional(),
    custom_lead_value_pounds_min: moneyPoundsSchema.nullable().optional(),
    custom_lead_value_pounds_max: moneyPoundsSchema.nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (v) => {
      if (v.custom_lead_value_pounds_min == null || v.custom_lead_value_pounds_max == null) {
        return true
      }
      return v.custom_lead_value_pounds_max >= v.custom_lead_value_pounds_min
    },
    {
      message: 'Maximum value must be \u2265 minimum',
      path: ['custom_lead_value_pounds_max'],
    }
  )
export type OfferingUpdatePayload = z.infer<typeof offeringUpdatePayloadSchema>

/**
 * Convert a pounds-decimal value (or null) to integer pence (or null).
 * Returns the same null when null/undefined. We round to the nearest pence
 * to avoid float drift from the JSON wire (e.g. 12.345 \u2192 1235).
 */
export function poundsToPence(pounds: number | null | undefined): number | null {
  if (pounds == null) return null
  return Math.round(pounds * 100)
}

/** Inverse of `poundsToPence` for round-tripping in the UI. */
export function penceToPounds(pence: number | null | undefined): number | null {
  if (pence == null) return null
  return Math.round(pence) / 100
}
