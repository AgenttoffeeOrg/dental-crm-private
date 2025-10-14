import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  task_type: z.enum(['call', 'email', 'meeting', 'todo', 'follow_up']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  status: z.enum(['pending', 'in_progress', 'done', 'cancelled']).default('pending'),
  due_at: z.string().optional(),
  contact_id: z.string().uuid().optional(),
  deal_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional()
})

export type TaskFormData = z.infer<typeof taskSchema>


