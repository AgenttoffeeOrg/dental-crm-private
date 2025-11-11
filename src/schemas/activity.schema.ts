import { z } from 'zod'

export const ActivityTypeEnum = z.enum(['call', 'email', 'whatsapp', 'sms', 'note', 'meeting'])
export const ActivityDirectionEnum = z.enum(['inbound', 'outbound'])

export const ActivityCreateSchema = z.object({
  type: ActivityTypeEnum,
  direction: ActivityDirectionEnum.optional(),
  contact_id: z.string().uuid('Invalid contact id'),
  deal_id: z.string().uuid('Invalid deal id').nullable().optional(),
  location_id: z.string().uuid('Invalid location id').nullable().optional(),
  occurred_at: z
    .string()
    .datetime({ offset: true })
    .optional(),
  subject: z.string().max(255).optional(),
  snippet: z.string().max(2000).optional(),
  script_version_id: z.string().uuid('Invalid script version id').nullable().optional(),
  conversation_session_id: z
    .string()
    .uuid('Invalid conversation session id')
    .nullable()
    .optional(),
  outcome: z
    .enum(['connected', 'voicemail', 'no_answer', 'busy', 'wrong_number', 'completed', 'cancelled'])
    .nullable()
    .optional(),
  duration_seconds: z.number().int().min(0).nullable().optional(),
  attendees: z.array(z.string().uuid()).optional(),
  mentions: z.array(z.string().uuid()).optional(),
  parent_activity_id: z.string().uuid('Invalid parent activity id').nullable().optional(),
  is_edited: z.boolean().optional(),
  edited_at: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional(),
  edited_by_user_id: z.string().uuid('Invalid editor id').nullable().optional(),
  rich_content: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  raw: z.record(z.any()).optional(),
})

export const ActivityUpdateSchema = ActivityCreateSchema.partial()

export const ActivityQuerySchema = z.object({
  type: ActivityTypeEnum.optional(),
  direction: ActivityDirectionEnum.optional(),
  contact_id: z.string().uuid().optional(),
  deal_id: z.string().uuid().optional(),
  location_id: z.string().uuid().optional(),
  script_version_id: z.string().uuid().optional(),
  conversation_session_id: z.string().uuid().optional(),
  occurred_before: z
    .string()
    .datetime({ offset: true })
    .optional(),
  occurred_after: z
    .string()
    .datetime({ offset: true })
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type ActivityCreateInput = z.infer<typeof ActivityCreateSchema>
export type ActivityUpdateInput = z.infer<typeof ActivityUpdateSchema>
export type ActivityQueryInput = z.infer<typeof ActivityQuerySchema>

export function safeValidateActivity<T>(data: unknown, schema: z.ZodSchema<T>) {
  return schema.safeParse(data)
}

