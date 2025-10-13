/**
 * Merge Tag Resolver
 * Replaces {{merge_tags}} in templates with actual contact data
 */

import type { Contact } from '@/types/database'
import { format } from 'date-fns'

/**
 * Available merge tags
 */
export const MERGE_TAGS = {
  // Basic Info
  'contact.full_name': 'Full Name',
  'contact.first_name': 'First Name',
  'contact.last_name': 'Last Name',
  'contact.preferred_name': 'Preferred Name',
  'contact.title': 'Title (Mr/Mrs/etc)',
  
  // Contact Info
  'contact.email': 'Email Address',
  'contact.phone': 'Phone Number',
  'contact.secondary_email': 'Secondary Email',
  'contact.secondary_phone': 'Secondary Phone',
  
  // Address
  'contact.address': 'Street Address',
  'contact.city': 'City',
  'contact.postal_code': 'Postal Code',
  'contact.country': 'Country',
  'contact.full_address': 'Full Address (formatted)',
  
  // Personal
  'contact.date_of_birth': 'Date of Birth',
  'contact.age': 'Age (calculated)',
  'contact.gender': 'Gender',
  'contact.occupation': 'Occupation',
  
  // Dates
  'today.date': 'Today\'s Date',
  'today.day': 'Day of Week',
  'today.month': 'Month Name',
  'today.year': 'Year',
  
  // Practice Info
  'practice.name': 'Practice Name',
  'practice.phone': 'Practice Phone',
  'practice.email': 'Practice Email',
  'practice.address': 'Practice Address',
  
  // Links
  'link.unsubscribe': 'Unsubscribe Link',
  'link.preferences': 'Email Preferences Link',
  'link.view_in_browser': 'View in Browser Link'
}

/**
 * Resolve all merge tags in content
 */
export function resolveMergeTags(
  content: string,
  contact: Contact,
  practiceInfo?: any,
  campaignId?: string
): string {
  let resolved = content
  
  // Contact fields
  resolved = resolved.replace(/\{\{contact\.full_name\}\}/g, contact.full_name || '')
  resolved = resolved.replace(/\{\{contact\.first_name\}\}/g, getFirstName(contact.full_name) || '')
  resolved = resolved.replace(/\{\{contact\.last_name\}\}/g, getLastName(contact.full_name) || '')
  resolved = resolved.replace(/\{\{contact\.preferred_name\}\}/g, (contact as any).preferred_name || getFirstName(contact.full_name) || '')
  resolved = resolved.replace(/\{\{contact\.title\}\}/g, (contact as any).title || '')
  
  // Contact info
  resolved = resolved.replace(/\{\{contact\.email\}\}/g, contact.primary_email || '')
  resolved = resolved.replace(/\{\{contact\.phone\}\}/g, contact.primary_phone || '')
  resolved = resolved.replace(/\{\{contact\.secondary_email\}\}/g, (contact as any).secondary_email || '')
  resolved = resolved.replace(/\{\{contact\.secondary_phone\}\}/g, (contact as any).secondary_phone || '')
  
  // Address
  resolved = resolved.replace(/\{\{contact\.address\}\}/g, (contact as any).address || '')
  resolved = resolved.replace(/\{\{contact\.city\}\}/g, (contact as any).city || '')
  resolved = resolved.replace(/\{\{contact\.postal_code\}\}/g, (contact as any).postal_code || '')
  resolved = resolved.replace(/\{\{contact\.country\}\}/g, (contact as any).country || '')
  resolved = resolved.replace(/\{\{contact\.full_address\}\}/g, formatFullAddress(contact))
  
  // Personal
  if ((contact as any).date_of_birth) {
    const dob = new Date((contact as any).date_of_birth)
    resolved = resolved.replace(/\{\{contact\.date_of_birth\}\}/g, format(dob, 'MMMM d, yyyy'))
    resolved = resolved.replace(/\{\{contact\.age\}\}/g, calculateAge(dob).toString())
  }
  resolved = resolved.replace(/\{\{contact\.gender\}\}/g, (contact as any).gender || '')
  resolved = resolved.replace(/\{\{contact\.occupation\}\}/g, (contact as any).occupation || '')
  
  // Dates
  const today = new Date()
  resolved = resolved.replace(/\{\{today\.date\}\}/g, format(today, 'MMMM d, yyyy'))
  resolved = resolved.replace(/\{\{today\.day\}\}/g, format(today, 'EEEE'))
  resolved = resolved.replace(/\{\{today\.month\}\}/g, format(today, 'MMMM'))
  resolved = resolved.replace(/\{\{today\.year\}\}/g, format(today, 'yyyy'))
  
  // Practice info
  if (practiceInfo) {
    resolved = resolved.replace(/\{\{practice\.name\}\}/g, practiceInfo.name || '')
    resolved = resolved.replace(/\{\{practice\.phone\}\}/g, practiceInfo.phone || '')
    resolved = resolved.replace(/\{\{practice\.email\}\}/g, practiceInfo.email || '')
    resolved = resolved.replace(/\{\{practice\.address\}\}/g, practiceInfo.address || '')
  }
  
  // Links (will be replaced with actual tracking URLs later)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  resolved = resolved.replace(/\{\{link\.unsubscribe\}\}/g, `${baseUrl}/marketing/unsubscribe/${contact.id}/${campaignId || 'general'}`)
  resolved = resolved.replace(/\{\{link\.preferences\}\}/g, `${baseUrl}/marketing/preferences/${contact.id}`)
  resolved = resolved.replace(/\{\{link\.view_in_browser\}\}/g, `${baseUrl}/marketing/view/${campaignId}/${contact.id}`)
  
  // Custom fields (from JSONB)
  const customFields = (contact as any).custom_fields || {}
  Object.keys(customFields).forEach(key => {
    const regex = new RegExp(`\\{\\{contact\\.custom\\.${key}\\}\\}`, 'g')
    resolved = resolved.replace(regex, customFields[key] || '')
  })
  
  // Clean up any remaining unreplaced tags (show fallback)
  resolved = resolved.replace(/\{\{[^}]+\}\}/g, '')
  
  return resolved
}

/**
 * Get first name from full name
 */
function getFirstName(fullName: string): string {
  return fullName?.split(' ')[0] || ''
}

/**
 * Get last name from full name
 */
function getLastName(fullName: string): string {
  const parts = fullName?.split(' ') || []
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

/**
 * Format full address
 */
function formatFullAddress(contact: Contact): string {
  const parts = [
    (contact as any).address,
    (contact as any).city,
    (contact as any).postal_code,
    (contact as any).country
  ].filter(Boolean)
  
  return parts.join(', ')
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dob: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  
  return age
}

/**
 * Preview merge tags with sample data
 */
export function previewMergeTags(
  content: string,
  sampleContact?: Partial<Contact>
): string {
  const sample = sampleContact || {
    full_name: 'John Smith',
    primary_email: 'john.smith@example.com',
    primary_phone: '+44 20 1234 5678',
    ...sampleContact
  }
  
  return resolveMergeTags(content, sample as Contact)
}

/**
 * Extract all merge tags from content
 */
export function extractMergeTags(content: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g
  const matches = []
  let match
  
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1])
  }
  
  return matches.filter((tag, index, self) => self.indexOf(tag) === index)
}

/**
 * Validate merge tags in content
 */
export function validateMergeTags(content: string): {
  valid: boolean
  invalidTags: string[]
  warnings: string[]
} {
  const tags = extractMergeTags(content)
  const validTags = Object.keys(MERGE_TAGS)
  
  const invalidTags = tags.filter(tag => !validTags.includes(tag))
  const warnings: string[] = []
  
  if (tags.length === 0) {
    warnings.push('No personalization tags found. Consider adding {{contact.first_name}} or other merge tags.')
  }
  
  return {
    valid: invalidTags.length === 0,
    invalidTags,
    warnings
  }
}

