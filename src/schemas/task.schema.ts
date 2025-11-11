import { z } from 'zod'

export const TaskStatusEnum = z.enum(['open', 'in_progress', 'done', 'cancelled'])
export const TaskPriorityEnum = z.enum(['low', 'normal', 'high', 'urgent'])
export const TaskTypeEnum = z.enum(['call', 'email', 'meeting', 'todo', 'follow_up'])

export const TaskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(5000).nullable().optional(),
  status: TaskStatusEnum.default('open'),
  priority: TaskPriorityEnum.default('normal'),
  task_type: TaskTypeEnum.default('todo'),
  due_at: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional(),
  contact_id: z.string().uuid('Invalid contact id').nullable().optional(),
  deal_id: z.string().uuid('Invalid deal id').nullable().optional(),
  location_id: z.string().uuid('Invalid location id').nullable().optional(),
  assignee_user_id: z.string().uuid('Invalid assignee id').nullable().optional(),
})

export const TaskUpdateSchema = TaskCreateSchema.partial().extend({
  status: TaskStatusEnum.optional(),
})

export const TaskQuerySchema = z.object({
  status: TaskStatusEnum.optional(),
  priority: TaskPriorityEnum.optional(),
  task_type: TaskTypeEnum.optional(),
  assignee_user_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  deal_id: z.string().uuid().optional(),
  location_id: z.string().uuid().optional(),
  due_before: z
    .string()
    .datetime({ offset: true })
    .optional(),
  due_after: z
    .string()
    .datetime({ offset: true })
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
})

export type TaskCreateInput = z.infer<typeof TaskCreateSchema>
export type TaskUpdateInput = z.infer<typeof TaskUpdateSchema>
export type TaskQueryInput = z.infer<typeof TaskQuerySchema>

export function safeValidateTask<T>(data: unknown, schema: z.ZodSchema<T>) {
  return schema.safeParse(data)
}

