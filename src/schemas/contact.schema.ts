/**
 * Contact Validation Schemas
 * 
 * Centralized validation for contact data across the application.
 * Used by both client-side forms and server-side API routes.
 * 
 * @module schemas/contact
 */

import { z } from 'zod'

/**
 * Base Contact Schema
 * Defines the core validation rules for contact data
 */
export const ContactSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .max(255, 'Full name must be less than 255 characters')
    .trim(),
  
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .toLowerCase()
    .optional()
    .or(z.literal('')),
  
  phone: z
    .string()
    .max(50, 'Phone number must be less than 50 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  company: z
    .string()
    .max(255, 'Company name must be less than 255 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  position: z
    .string()
    .max(255, 'Position must be less than 255 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  address: z
    .string()
    .max(500, 'Address must be less than 500 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  city: z
    .string()
    .max(100, 'City must be less than 100 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  state: z
    .string()
    .max(100, 'State must be less than 100 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  zip_code: z
    .string()
    .max(20, 'ZIP code must be less than 20 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  country: z
    .string()
    .max(100, 'Country must be less than 100 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  notes: z
    .string()
    .max(5000, 'Notes must be less than 5000 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  tags: z
    .array(z.string().max(50))
    .max(20, 'Maximum 20 tags allowed')
    .optional(),
  
  source: z
    .enum(['website', 'referral', 'social_media', 'advertising', 'direct', 'other'])
    .optional(),
  
  status: z
    .enum(['active', 'inactive', 'lead', 'prospect', 'customer'])
    .default('lead'),
  
  tenant_id: z
    .string()
    .uuid('Invalid tenant ID'),
})

/**
 * Contact Creation Schema
 * Used for creating new contacts (POST requests)
 */
export const ContactCreateSchema = ContactSchema.omit({ tenant_id: true })

/**
 * Contact Update Schema
 * Used for updating existing contacts (PATCH requests)
 * All fields are optional for partial updates
 */
export const ContactUpdateSchema = ContactSchema.omit({ tenant_id: true }).partial()

/**
 * Contact ID Schema
 * Validates contact ID format
 */
export const ContactIdSchema = z.object({
  id: z.string().uuid('Invalid contact ID'),
})

/**
 * Bulk Contact Import Schema
 * Validates bulk contact import data
 */
export const BulkContactImportSchema = z.object({
  contacts: z.array(ContactCreateSchema).min(1, 'At least one contact required').max(1000, 'Maximum 1000 contacts per import'),
  skip_duplicates: z.boolean().default(true),
  duplicate_check_field: z.enum(['email', 'phone', 'email_and_phone']).default('email'),
})

/**
 * Contact Search/Filter Schema
 * Validates search and filter parameters
 */
export const ContactSearchSchema = z.object({
  query: z.string().max(255).optional(),
  status: z.enum(['active', 'inactive', 'lead', 'prospect', 'customer']).optional(),
  source: z.enum(['website', 'referral', 'social_media', 'advertising', 'direct', 'other']).optional(),
  tags: z.array(z.string()).optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

// Type exports for TypeScript
export type ContactInput = z.infer<typeof ContactSchema>
export type ContactCreateInput = z.infer<typeof ContactCreateSchema>
export type ContactUpdateInput = z.infer<typeof ContactUpdateSchema>
export type ContactSearchInput = z.infer<typeof ContactSearchSchema>
export type BulkContactImportInput = z.infer<typeof BulkContactImportSchema>

/**
 * Validation helper function
 * 
 * @param data - Data to validate
 * @param schema - Zod schema to validate against
 * @returns Validation result with either data or errors
 */
export function validateContact<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error }
    }
    throw error
  }
}

/**
 * Safe validation helper (doesn't throw)
 * 
 * @param data - Data to validate
 * @param schema - Zod schema to validate against
 * @returns SafeParseReturnType from Zod
 */
export function safeValidateContact<T>(
  data: unknown,
  schema: z.ZodSchema<T>
) {
  return schema.safeParse(data)
}

