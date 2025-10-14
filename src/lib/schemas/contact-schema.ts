import { z } from 'zod'

export const contactSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  primary_email: z.string().email('Invalid email').optional().or(z.literal('')),
  primary_phone: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(['lead', 'patient', 'inactive']).default('lead'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  date_of_birth: z.string().optional(),
  notes: z.string().optional()
})

export type ContactFormData = z.infer<typeof contactSchema>


