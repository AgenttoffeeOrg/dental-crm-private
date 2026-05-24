import { z } from 'zod'

export const TaskStatusEnum = z.enum(['open', 'in_progress', 'done', 'cancelled'])
export const TaskPriorityEnum = z.enum(['low', 'normal', 'high', 'urgent'])
// 2b.63 — extended to cover sms / whatsapp / note so the Edit form
// can pick the right channel-bucket (queue's channel-batch chip
// from 2b.65 reads this field).
export const TaskTypeEnum = z.enum([
  'call',
  'email',
  'meeting',
  'todo',
  'follow_up',
  'sms',
  'whatsapp',
  'note',
])

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
  // 2b.63 — group + everyone assignment (columns added in 2b.59).
  // Exactly one of these three should be set in practice; UI enforces.
  assigned_to_group_id: z.string().uuid('Invalid group id').nullable().optional(),
  assigned_to_everyone: z.boolean().optional(),
  // 2b.73 — snooze persistence. Hide-until timestamp; queue + dashboard
  // filter out tasks where snoozed_until > now(). Reschedule clears it.
  snoozed_until: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional(),
  // 2b.87 — recurring rule linkage. Caller (CreateTaskSlideOver) creates
  // a task_recurring_rules row first via POST /api/task-recurring-rules,
  // then passes its id here so the cron knows to spawn the next instance.
  recurring_rule_id: z.string().uuid('Invalid recurring rule id').nullable().optional(),
  is_recurring: z.boolean().optional(),
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

