/**
 * Contact Validation Tests
 * Tests for Zod validation schemas
 */

import { describe, it, expect } from '@jest/globals'
import {
  ContactSchema,
  ContactCreateSchema,
  ContactUpdateSchema,
  validateContact,
  safeValidateContact,
} from '@/schemas/contact.schema'

describe('ContactSchema', () => {
  it('should validate a valid contact', () => {
    const validContact = {
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      company: 'Acme Inc',
      tenant_id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'lead' as const,
    }

    const result = safeValidateContact(validContact, ContactSchema)
    expect(result.success).toBe(true)
  })

  it('should require full_name', () => {
    const invalid = {
      email: 'john@example.com',
      tenant_id: '123e4567-e89b-12d3-a456-426614174000',
    }

    const result = safeValidateContact(invalid, ContactSchema)
    expect(result.success).toBe(false)
  })

  it('should validate email format', () => {
    const invalid = {
      full_name: 'John Doe',
      email: 'not-an-email',
      tenant_id: '123e4567-e89b-12d3-a456-426614174000',
    }

    const result = safeValidateContact(invalid, ContactSchema)
    expect(result.success).toBe(false)
  })

  it('should accept optional fields', () => {
    const minimal = {
      full_name: 'John Doe',
      tenant_id: '123e4567-e89b-12d3-a456-426614174000',
    }

    const result = safeValidateContact(minimal, ContactSchema)
    expect(result.success).toBe(true)
  })
})

