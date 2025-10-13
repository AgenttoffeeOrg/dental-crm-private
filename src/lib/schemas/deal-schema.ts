import { z } from 'zod'

export const dealSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  contact_id: z.string().uuid('Invalid contact').optional(),
  stage_id: z.string().uuid('Stage is required'),
  value_estimate_cents: z.number().min(0, 'Value must be positive').optional(),
  expected_close_date: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  notes: z.string().optional(),
  treatment_type: z.string().optional()
})

export type DealFormData = z.infer<typeof dealSchema>

