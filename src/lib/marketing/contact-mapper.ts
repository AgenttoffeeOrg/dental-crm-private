/**
 * Contact Mapper Utilities
 * Maps marketing audiences/segments to existing CRM contacts
 */

import { createClient } from '@/lib/supabase-client'
import type { Contact } from '@/types/database'
import type { SegmentDefinition, SegmentCondition } from '@/types/marketing'

/**
 * Get all contacts that match a segment definition
 */
export async function getSegmentContacts(
  tenantId: string,
  segmentDefinition: SegmentDefinition
): Promise<Contact[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId)
  
  // Build WHERE clauses from segment conditions
  for (const condition of segmentDefinition.conditions) {
    query = applyConditionToQuery(query, condition)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('[SEGMENT] Error fetching contacts:', error)
    return []
  }
  
  return data || []
}

/**
 * Count contacts in a segment
 */
export async function countSegmentContacts(
  tenantId: string,
  segmentDefinition: SegmentDefinition
): Promise<number> {
  const contacts = await getSegmentContacts(tenantId, segmentDefinition)
  return contacts.length
}

/**
 * Apply a single condition to a Supabase query
 */
function applyConditionToQuery(query: any, condition: SegmentCondition): any {
  const { field, operator, value } = condition
  
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
      return query.is(field, null)
    
    case 'is_not_empty':
      return query.not(field, 'is', null)
    
    case 'in':
      return query.in(field, Array.isArray(value) ? value : [value])
    
    case 'not_in':
      return query.not(field, 'in', Array.isArray(value) ? value : [value])
    
    default:
      return query
  }
}

/**
 * Get contacts by tags
 */
export async function getContactsByTags(
  tenantId: string,
  tags: string[],
  matchAll = false // true = AND, false = OR
): Promise<Contact[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId)
    .contains('tags', tags) // PostgreSQL array contains operator
  
  if (error) {
    console.error('[CONTACT] Error fetching by tags:', error)
    return []
  }
  
  if (matchAll) {
    // Filter to ensure ALL tags are present
    return (data || []).filter(contact => 
      tags.every(tag => contact.tags?.includes(tag))
    )
  }
  
  return data || []
}

/**
 * Add tag to contact
 */
export async function addTagToContact(
  contactId: string,
  tag: string
): Promise<boolean> {
  const supabase = createClient()
  
  // Get current tags
  const { data: contact } = await supabase
    .from('contacts')
    .select('tags')
    .eq('id', contactId)
    .single()
  
  if (!contact) return false
  
  const currentTags = contact.tags || []
  if (currentTags.includes(tag)) return true // Already has tag
  
  // Add tag
  const { error } = await supabase
    .from('contacts')
    .update({ 
      tags: [...currentTags, tag],
      updated_at: new Date().toISOString()
    })
    .eq('id', contactId)
  
  return !error
}

/**
 * Remove tag from contact
 */
export async function removeTagFromContact(
  contactId: string,
  tag: string
): Promise<boolean> {
  const supabase = createClient()
  
  // Get current tags
  const { data: contact } = await supabase
    .from('contacts')
    .select('tags')
    .eq('id', contactId)
    .single()
  
  if (!contact) return false
  
  const currentTags = contact.tags || []
  const newTags = currentTags.filter(t => t !== tag)
  
  // Update tags
  const { error } = await supabase
    .from('contacts')
    .update({ 
      tags: newTags,
      updated_at: new Date().toISOString()
    })
    .eq('id', contactId)
  
  return !error
}

/**
 * Get all unique tags across contacts
 */
export async function getAllContactTags(tenantId: string): Promise<string[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('contacts')
    .select('tags')
    .eq('tenant_id', tenantId)
  
  if (error || !data) return []
  
  // Flatten and deduplicate
  const allTags = data
    .flatMap(c => c.tags || [])
    .filter((tag, index, self) => self.indexOf(tag) === index)
    .sort((a, b) => a.localeCompare(b))
  
  return allTags
}

/**
 * Import contacts from CSV
 */
export async function importContactsFromCSV(
  tenantId: string,
  csvData: string,
  fieldMapping: Record<string, string>, // CSV column -> Contact field
  autoTags: string[] = []
): Promise<{
  created: number
  updated: number
  errors: string[]
}> {
  const supabase = createClient()
  const results = {
    created: 0,
    updated: 0,
    errors: [] as string[]
  }
  
  // Parse CSV (simple implementation)
  const lines = csvData.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = lines[i].split(',').map(v => v.trim())
      const row: Record<string, string> = {}
      
      headers.forEach((header, idx) => {
        row[header] = values[idx]
      })
      
      // Map to Contact fields
      const contactData: any = {
        tenant_id: tenantId,
        tags: autoTags
      }
      
      Object.keys(fieldMapping).forEach(csvCol => {
        const contactField = fieldMapping[csvCol]
        if (row[csvCol]) {
          contactData[contactField] = row[csvCol]
        }
      })
      
      // Try to find existing contact by email or phone
      let existingContact = null
      if (contactData.primary_email) {
        const { data } = await supabase
          .from('contacts')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('primary_email', contactData.primary_email)
          .single()
        
        existingContact = data
      }
      
      if (existingContact) {
        // Update existing
        await supabase
          .from('contacts')
          .update({
            ...contactData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingContact.id)
        
        results.updated++
      } else {
        // Create new
        await supabase
          .from('contacts')
          .insert(contactData)
        
        results.created++
      }
      
    } catch (error) {
      results.errors.push(`Row ${i + 1}: ${error}`)
    }
  }
  
  return results
}

/**
 * Export segment contacts to CSV
 */
export async function exportSegmentToCSV(
  tenantId: string,
  segmentDefinition: SegmentDefinition,
  fields: string[] = ['full_name', 'primary_email', 'primary_phone']
): Promise<string> {
  const contacts = await getSegmentContacts(tenantId, segmentDefinition)
  
  // Build CSV
  const headers = fields.join(',')
  const rows = contacts.map(contact => 
    fields.map(field => {
      const value = (contact as any)[field] || ''
      // Escape commas and quotes
      return `"${String(value).replace(/"/g, '""')}"`
    }).join(',')
  )
  
  return [headers, ...rows].join('\n')
}




