/**
 * Lead Deduplication System
 * Prevents duplicate contacts and identifies repeat submissions
 */

import { createServiceClient } from '@/lib/supabase-server'

export interface DuplicateCheckResult {
  isDuplicate: boolean
  existingContactId?: string
  matchedOn: ('email' | 'phone')[]
  confidence: 'high' | 'medium' | 'low'
  recentSubmission?: boolean
}

/**
 * Check if a contact already exists by email or phone
 */
export async function checkForDuplicateContact(
  tenantId: string,
  email?: string,
  phone?: string
): Promise<DuplicateCheckResult> {
  const supabase = createServiceClient()

  const matchedOn: ('email' | 'phone')[] = []
  let existingContactId: string | undefined
  let confidence: 'high' | 'medium' | 'low' = 'low'

  try {
    // Check by email (exact match)
    if (email && email.trim() !== '') {
      const { data: emailMatch } = await supabase
        .from('contacts')
        .select('id, primary_email')
        .eq('tenant_id', tenantId)
        .eq('primary_email', email.trim().toLowerCase())
        .maybeSingle()

      if (emailMatch) {
        matchedOn.push('email')
        existingContactId = emailMatch.id
        confidence = 'high'
      }
    }

    // Check by phone (exact match)
    if (phone && phone.trim() !== '') {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
      
      const { data: phoneMatch } = await supabase
        .from('contacts')
        .select('id, primary_phone')
        .eq('tenant_id', tenantId)
        .or(`primary_phone.eq.${cleanPhone},primary_phone.eq.${phone}`)
        .maybeSingle()

      if (phoneMatch) {
        matchedOn.push('phone')
        if (!existingContactId) {
          existingContactId = phoneMatch.id
        }
        confidence = matchedOn.length > 1 ? 'high' : 'medium'
      }
    }

    // Check for recent submission (within 24 hours)
    let recentSubmission = false
    if (existingContactId) {
      const twentyFourHoursAgo = new Date()
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

      const { data: recentSubs } = await supabase
        .from('marketing_form_submissions')
        .select('id')
        .eq('contact_id', existingContactId)
        .gte('submitted_at', twentyFourHoursAgo.toISOString())
        .limit(1)

      recentSubmission = (recentSubs?.length || 0) > 0
    }

    return {
      isDuplicate: matchedOn.length > 0,
      existingContactId,
      matchedOn,
      confidence,
      recentSubmission,
    }
  } catch (error) {
    console.error('[Deduplication] Error:', error)
    return {
      isDuplicate: false,
      matchedOn: [],
      confidence: 'low',
    }
  }
}

/**
 * Merge new submission data with existing contact
 */
export async function mergeContactData(
  contactId: string,
  newData: Record<string, any>
): Promise<boolean> {
  const supabase = createServiceClient()

  try {
    // Get existing contact
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single()

    if (!existingContact) {
      return false
    }

    // Merge tags
    const existingTags = existingContact.tags || []
    const newTags = newData.tags || []
    const mergedTags = Array.from(new Set([...existingTags, ...newTags]))

    // Update contact with new/updated fields
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    // Only update if new data is provided and different
    if (newData.full_name && newData.full_name !== existingContact.full_name) {
      updateData.full_name = newData.full_name
    }

    if (newData.primary_phone && newData.primary_phone !== existingContact.primary_phone) {
      updateData.primary_phone = newData.primary_phone
    }

    // Always merge tags
    updateData.tags = mergedTags

    const { error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', contactId)

    if (error) {
      console.error('[Deduplication] Error merging:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Deduplication] Merge error:', error)
    return false
  }
}

/**
 * Flag duplicate submission
 */
export async function flagDuplicateSubmission(
  submissionId: string
): Promise<void> {
  const supabase = createServiceClient()

  try {
    await supabase
      .from('marketing_form_submissions')
      .update({
        duplicate_submission: true,
      })
      .eq('id', submissionId)
  } catch (error) {
    console.error('[Deduplication] Error flagging duplicate:', error)
  }
}

/**
 * Get duplicate submission report
 */
export async function getDuplicateStats(
  formId: string,
  days: number = 30
): Promise<{
  totalSubmissions: number
  duplicateCount: number
  duplicateRate: number
}> {
  const supabase = createServiceClient()

  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data: submissions } = await supabase
      .from('marketing_form_submissions')
      .select('id, duplicate_submission')
      .eq('form_id', formId)
      .gte('submitted_at', startDate.toISOString())

    const totalSubmissions = submissions?.length || 0
    const duplicateCount = submissions?.filter(s => s.duplicate_submission).length || 0
    const duplicateRate = totalSubmissions > 0 ? (duplicateCount / totalSubmissions) * 100 : 0

    return {
      totalSubmissions,
      duplicateCount,
      duplicateRate,
    }
  } catch (error) {
    console.error('[Deduplication] Error getting stats:', error)
    return {
      totalSubmissions: 0,
      duplicateCount: 0,
      duplicateRate: 0,
    }
  }
}

