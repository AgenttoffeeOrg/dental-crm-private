/**
 * Progressive Profiling System
 * Hides fields that are already known about a contact
 *
 * Features:
 * - Detects returning visitors by email
 * - Hides fields already collected
 * - Shows new fields based on profile completeness
 * - Smart field ordering (most valuable first)
 */

import { createClient } from '@/lib/supabase-client';
import type { FormField } from '@/hooks/use-marketing-forms';

export interface ContactData {
  email?: string;
  phone?: string;
  full_name?: string;
  [key: string]: any;
}

/**
 * Get known contact data by email
 */
export async function getContactByEmail(
  email: string,
  tenantId: string
): Promise<ContactData | null> {
  if (!email) return null;

  const supabase = createClient();

  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('primary_email', email.toLowerCase().trim())
    .single();

  if (!contact) return null;

  return {
    email: contact.primary_email,
    phone: contact.primary_phone,
    full_name: contact.full_name,
    // Include any other contact fields
    ...contact,
  };
}

/**
 * Filter form fields based on known contact data
 * Returns fields that should be shown (hides known fields)
 */
export function filterFieldsForProgressiveProfiling(
  fields: FormField[],
  knownData: ContactData | null,
  enabled: boolean = true
): FormField[] {
  if (!enabled || !knownData) {
    return fields;
  }

  // Field mapping: form field name → contact field name
  const fieldMapping: Record<string, string> = {
    email: 'email',
    primary_email: 'email',
    phone: 'phone',
    primary_phone: 'phone',
    mobile: 'phone',
    name: 'full_name',
    full_name: 'full_name',
    fullname: 'full_name',
  };

  return fields.filter((field) => {
    // Never hide required fields
    if (field.required) {
      return true;
    }

    // Never hide hidden fields (they're meant to be hidden)
    if ((field as any).hidden) {
      return true;
    }

    // Check if field value is already known
    const fieldName = (field as any).field_name || field.id;
    const contactFieldName = fieldMapping[fieldName.toLowerCase()] || fieldName.toLowerCase();

    // If we have this data, hide the field
    if (knownData[contactFieldName] && knownData[contactFieldName].toString().trim() !== '') {
      return false;
    }

    return true;
  });
}

/**
 * Get field priority for progressive profiling
 * Higher priority = more valuable to collect
 */
export function getFieldPriority(field: FormField): number {
  // Required fields always have highest priority
  if (field.required) return 100;

  // Email and phone are high priority
  if (field.type === 'email' || field.type === 'phone') return 90;

  // Name fields are high priority
  if (field.id.includes('name') || (field as any).field_name?.includes('name')) return 85;

  // Contact info fields
  if (['text', 'textarea'].includes(field.type)) return 50;

  // Other fields
  return 10;
}

/**
 * Sort fields by priority (for progressive profiling)
 */
export function sortFieldsByPriority(fields: FormField[]): FormField[] {
  return [...fields].sort((a, b) => {
    const priorityA = getFieldPriority(a);
    const priorityB = getFieldPriority(b);
    return priorityB - priorityA;
  });
}

/**
 * Check if progressive profiling should be enabled for a form
 */
export function shouldEnableProgressiveProfiling(form: { fields_json: FormField[] }): boolean {
  // Enable if form has more than 3 fields (otherwise no point)
  return form.fields_json.length > 3;
}
