import { z } from 'zod'
import { SCRIPT_OUTCOME_TYPES } from '@/lib/services/script-outcome-metadata'

export const DealStatusEnum = z.enum(['open', 'won', 'lost', 'archived'])

export const DealSourceEnum = z.enum([
  'web_form',
  'phone',
  'referral',
  'walk_in',
  'email',
  'campaign',
  'other'
])

export const DealCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  contact_id: z.string().uuid('Invalid contact id'),
  pipeline_id: z.string().uuid('Invalid pipeline id'),
  stage_id: z.string().uuid('Invalid stage id'),
  status: DealStatusEnum.default('open'),
  source: DealSourceEnum.optional(),
  owner_user_id: z.string().uuid('Invalid owner id').nullable().optional(),
  value_estimate_cents: z.number().int().min(0).max(50_000_000).nullable().optional(),
  location_id: z.string().uuid('Invalid location id').nullable().optional(),
  treatment_tags: z.array(z.string().max(100)).max(25).optional(),
})

const DealScriptOutcomeSchema = z.object({
  usage_id: z.string().uuid('Invalid script usage id'),
  outcome_type: z.enum(SCRIPT_OUTCOME_TYPES).default('deal_won'),
  notes: z.string().max(500).optional(),
  revenue_cents: z.number().int().min(0).max(50_000_000).optional(),
})

export const DealUpdateSchema = DealCreateSchema.partial().extend({
  status: DealStatusEnum.optional(),
  script_outcome: DealScriptOutcomeSchema.optional(),
})

export const DealQuerySchema = z.object({
  stage_id: z.string().uuid().optional(),
  pipeline_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  status: DealStatusEnum.optional(),
  owner_user_id: z.string().uuid().optional(),
  search: z.string().max(255).optional(),
  location_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  include_archived: z
    .union([z.string(), z.boolean()])
    .transform((value) => (typeof value === 'string' ? value === 'true' : value))
    .optional(),
})

export type DealCreateInput = z.infer<typeof DealCreateSchema>
export type DealUpdateInput = z.infer<typeof DealUpdateSchema>
export type DealQueryInput = z.infer<typeof DealQuerySchema>

export function safeValidateDeal<T>(data: unknown, schema: z.ZodSchema<T>) {
  return schema.safeParse(data)
}

