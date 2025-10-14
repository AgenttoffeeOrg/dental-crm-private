/**
 * Segment Query Engine
 * Builds and executes SQL queries from segment definitions
 */

import { createServiceClient } from '@/lib/supabase-server'
import type { SegmentDefinition, SegmentCondition } from '@/types/marketing'
import type { Contact } from '@/types/database'

/**
 * Execute a segment query and return matching contacts
 */
export async function executeSegmentQuery(
  tenantId: string,
  segmentDefinition: SegmentDefinition
): Promise<Contact[]> {
  const supabase = createServiceClient()
  
  // Build the query
  let query = supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId)
  
  // Apply conditions based on operator
  if (segmentDefinition.operator === 'AND') {
    // All conditions must match
    for (const condition of segmentDefinition.conditions) {
      query = applyCondition(query, condition)
    }
  } else {
    // OR logic - need to use PostgreSQL or() function
    // For now, we'll fetch all and filter in memory (optimize later)
    const { data } = await query
    
    if (!data) return []
    
    return data.filter(contact => 
      segmentDefinition.conditions.some(condition => 
        evaluateCondition(contact, condition)
      )
    )
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('[SEGMENT] Query error:', error)
    return []
  }
  
  return data || []
}

/**
 * Count contacts matching a segment
 */
export async function countSegmentContacts(
  tenantId: string,
  segmentDefinition: SegmentDefinition
): Promise<number> {
  const contacts = await executeSegmentQuery(tenantId, segmentDefinition)
  return contacts.length
}

/**
 * Apply a condition to Supabase query builder
 */
function applyCondition(query: any, condition: SegmentCondition): any {
  const { field, operator, value } = condition
  
  // Handle special field types
  if (condition.type === 'tag') {
    // Tag conditions use array operators
    switch (operator) {
      case 'equals':
      case 'contains':
        return query.contains('tags', [value])
      case 'not_equals':
      case 'not_contains':
        return query.not('tags', 'cs', `{${value}}`)
      default:
        return query
    }
  }
  
  // Handle date fields
  if (condition.type === 'date' || field.includes('date') || field.includes('_at')) {
    const dateValue = new Date(value).toISOString()
    
    switch (operator) {
      case 'equals':
        // Same day
        const startOfDay = new Date(value)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(value)
        endOfDay.setHours(23, 59, 59, 999)
        return query.gte(field, startOfDay.toISOString()).lte(field, endOfDay.toISOString())
      
      case 'greater_than':
        return query.gt(field, dateValue)
      
      case 'less_than':
        return query.lt(field, dateValue)
      
      default:
        return query
    }
  }
  
  // Standard field conditions
  switch (operator) {
    case 'equals':
      return query.eq(field, value)
    
    case 'not_equals':
      return query.neq(field, value)
    
    case 'contains':
      return query.ilike(field, `%${value}%`)
    
    case 'not_contains':
      return query.not(field, 'ilike', `%${value}%`)
    
    case 'greater_than':
      return query.gt(field, value)
    
    case 'less_than':
      return query.lt(field, value)
    
    case 'is_empty':
      return query.is(field, null).or(`${field}.eq.`)
    
    case 'is_not_empty':
      return query.not(field, 'is', null).not(field, 'eq', '')
    
    case 'in':
      const inValues = Array.isArray(value) ? value : [value]
      return query.in(field, inValues)
    
    case 'not_in':
      const notInValues = Array.isArray(value) ? value : [value]
      return query.not(field, 'in', notInValues)
    
    default:
      console.warn(`[SEGMENT] Unknown operator: ${operator}`)
      return query
  }
}

/**
 * Evaluate a condition against a contact (in-memory)
 */
function evaluateCondition(contact: any, condition: SegmentCondition): boolean {
  const { field, operator, value, type } = condition
  
  // Get field value
  let fieldValue = contact[field]
  
  // Handle custom fields
  if (field.startsWith('custom.')) {
    const customFieldName = field.replace('custom.', '')
    fieldValue = contact.custom_fields?.[customFieldName]
  }
  
  // Handle tags
  if (type === 'tag' || field === 'tags') {
    const tags = contact.tags || []
    switch (operator) {
      case 'equals':
      case 'contains':
        return tags.includes(value)
      case 'not_equals':
      case 'not_contains':
        return !tags.includes(value)
      default:
        return false
    }
  }
  
  // Handle standard operators
  switch (operator) {
    case 'equals':
      return fieldValue === value
    
    case 'not_equals':
      return fieldValue !== value
    
    case 'contains':
      return String(fieldValue || '').toLowerCase().includes(String(value).toLowerCase())
    
    case 'not_contains':
      return !String(fieldValue || '').toLowerCase().includes(String(value).toLowerCase())
    
    case 'greater_than':
      return Number(fieldValue) > Number(value)
    
    case 'less_than':
      return Number(fieldValue) < Number(value)
    
    case 'is_empty':
      return !fieldValue || fieldValue === ''
    
    case 'is_not_empty':
      return !!fieldValue && fieldValue !== ''
    
    case 'in':
      const inValues = Array.isArray(value) ? value : [value]
      return inValues.includes(fieldValue)
    
    case 'not_in':
      const notInValues = Array.isArray(value) ? value : [value]
      return !notInValues.includes(fieldValue)
    
    default:
      return false
  }
}

/**
 * Build human-readable description of segment
 */
export function describeSegment(definition: SegmentDefinition): string {
  const descriptions = definition.conditions.map(condition => {
    const fieldLabel = condition.field.replace(/_/g, ' ').replace('contact.', '')
    const operatorLabel = {
      'equals': 'is',
      'not_equals': 'is not',
      'contains': 'contains',
      'not_contains': 'does not contain',
      'greater_than': 'is greater than',
      'less_than': 'is less than',
      'is_empty': 'is empty',
      'is_not_empty': 'is not empty',
      'in': 'is one of',
      'not_in': 'is not one of'
    }[condition.operator] || condition.operator
    
    return `${fieldLabel} ${operatorLabel} ${condition.value}`
  })
  
  return descriptions.join(` ${definition.operator} `)
}

/**
 * Validate segment definition
 */
export function validateSegmentDefinition(definition: SegmentDefinition): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (!definition.conditions || definition.conditions.length === 0) {
    errors.push('Segment must have at least one condition')
  }
  
  definition.conditions.forEach((condition, index) => {
    if (!condition.field) {
      errors.push(`Condition ${index + 1}: Field is required`)
    }
    if (!condition.operator) {
      errors.push(`Condition ${index + 1}: Operator is required`)
    }
    if (condition.value === undefined || condition.value === null) {
      errors.push(`Condition ${index + 1}: Value is required`)
    }
  })
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Common pre-defined segments
 */
export const PREDEFINED_SEGMENTS = {
  all_contacts: {
    conditions: [],
    operator: 'AND' as const
  },
  marketing_opted_in: {
    conditions: [{
      field: 'marketing_consent',
      operator: 'equals' as const,
      value: true,
      type: 'field' as const
    }],
    operator: 'AND' as const
  },
  has_email: {
    conditions: [{
      field: 'primary_email',
      operator: 'is_not_empty' as const,
      value: '',
      type: 'field' as const
    }],
    operator: 'AND' as const
  },
  has_phone: {
    conditions: [{
      field: 'primary_phone',
      operator: 'is_not_empty' as const,
      value: '',
      type: 'field' as const
    }],
    operator: 'AND' as const
  },
  new_leads: {
    conditions: [{
      field: 'tags',
      operator: 'contains' as const,
      value: 'new_lead',
      type: 'tag' as const
    }],
    operator: 'AND' as const
  }
}




