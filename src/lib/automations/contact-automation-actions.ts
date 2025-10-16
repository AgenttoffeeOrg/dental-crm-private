/**
 * CONTACT AUTOMATION ACTIONS
 * 
 * Specialized actions for contact automations:
 * - Inactive contact detection
 * - High-value contact identification
 * - Milestone celebrations
 * - Nurture sequences
 */

import { createClient } from '@/lib/supabase-client'
import { events } from '@/lib/events-unified'

// =====================================================
// CONTACT MONITORING
// =====================================================

/**
 * Check for inactive contacts and emit events
 */
export async function checkInactiveContacts(
  tenantId: string,
  inactiveDays: number = 30
): Promise<{ checked: number; inactive: number }> {
  try {
    const supabase = createClient()

    // Get all contacts
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, last_contacted_at, created_at')
      .eq('tenant_id', tenantId)

    if (!contacts || contacts.length === 0) {
      return { checked: 0, inactive: 0 }
    }

    const cutoffDate = Date.now() - inactiveDays * 24 * 60 * 60 * 1000
    let inactive = 0

    for (const contact of contacts) {
      const lastContact = contact.last_contacted_at
        ? new Date(contact.last_contacted_at).getTime()
        : new Date(contact.created_at).getTime()

      const daysSinceContact = Math.floor((Date.now() - lastContact) / (1000 * 60 * 60 * 24))

      if (daysSinceContact >= inactiveDays) {
        // Emit CONTACT.INACTIVE event
        await events.contactInactive({
          contactId: contact.id,
          tenantId,
          daysSinceLastActivity: daysSinceContact,
          lastActivityAt: new Date(lastContact).toISOString(),
        })

        inactive++
      }
    }

    console.log(`[Contact Monitor] Checked ${contacts.length} contacts, found ${inactive} inactive`)

    return { checked: contacts.length, inactive }
  } catch (error) {
    console.error('[Contact Monitor] Error checking inactive contacts:', error)
    return { checked: 0, inactive: 0 }
  }
}

/**
 * Identify high-value contacts
 */
export async function identifyHighValueContacts(tenantId: string): Promise<{
  identified: number
}> {
  try {
    const supabase = createClient()

    // Get contacts with total deal value
    const { data: contacts } = await supabase
      .from('contacts')
      .select(`
        id,
        deals!inner(value_estimate_cents, status)
      `)
      .eq('tenant_id', tenantId)

    if (!contacts || contacts.length === 0) {
      return { identified: 0 }
    }

    let identified = 0

    for (const contact of contacts) {
      // Calculate total deal value
      const deals = contact.deals as any[]
      const totalValue = deals
        .filter(d => d.status === 'won')
        .reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0)

      const dealCount = deals.filter(d => d.status === 'won').length

      // High-value threshold: £50k+ total or 3+ won deals
      if (totalValue >= 5000000 || dealCount >= 3) {
        // Emit CONTACT.HIGH_VALUE event
        await events.contactHighValue({
          contactId: contact.id,
          tenantId,
          totalDealValue: totalValue,
          dealCount,
        })

        identified++
      }
    }

    console.log(`[Contact Monitor] Identified ${identified} high-value contacts`)

    return { identified }
  } catch (error) {
    console.error('[Contact Monitor] Error identifying high-value contacts:', error)
    return { identified: 0 }
  }
}

/**
 * Check for contact milestones (birthdays, anniversaries)
 */
export async function checkContactMilestones(tenantId: string): Promise<{
  milestones: number
}> {
  try {
    const supabase = createClient()

    const today = new Date()
    const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    // Get contacts with birthdays today
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, date_of_birth')
      .eq('tenant_id', tenantId)
      .not('date_of_birth', 'is', null)

    if (!contacts || contacts.length === 0) {
      return { milestones: 0 }
    }

    let milestones = 0

    for (const contact of contacts) {
      if (!contact.date_of_birth) continue

      const birthDate = new Date(contact.date_of_birth)
      const birthMonthDay = `${String(birthDate.getMonth() + 1).padStart(2, '0')}-${String(birthDate.getDate()).padStart(2, '0')}`

      if (birthMonthDay === todayMonthDay) {
        // Emit CONTACT.MILESTONE event
        await events.contactMilestone({
          contactId: contact.id,
          tenantId,
          milestoneType: 'birthday',
          date: contact.date_of_birth,
        })

        milestones++
      }
    }

    console.log(`[Contact Monitor] Found ${milestones} milestone events`)

    return { milestones }
  } catch (error) {
    console.error('[Contact Monitor] Error checking milestones:', error)
    return { milestones: 0 }
  }
}

// =====================================================
// CONTACT ACTIONS
// =====================================================

/**
 * Assign contact to user (round-robin)
 */
export async function assignContactToUser(
  contactId: string,
  tenantId: string,
  userId?: string,
  mode: 'specific' | 'round_robin' = 'specific'
): Promise<{ success: boolean; assignedUserId?: string; error?: string }> {
  try {
    const supabase = createClient()

    let targetUserId = userId

    // Round-robin logic
    if (mode === 'round_robin' && !userId) {
      const { data: users } = await supabase
        .from('app_users')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role', 'staff')
        .order('id')

      if (!users || users.length === 0) {
        return { success: false, error: 'No available users' }
      }

      // Simple round-robin (can be enhanced)
      targetUserId = users[0].id
    }

    if (!targetUserId) {
      return { success: false, error: 'No user ID' }
    }

    // Get current owner
    const { data: contact } = await supabase
      .from('contacts')
      .select('owner_user_id')
      .eq('id', contactId)
      .single()

    const fromUserId = contact?.owner_user_id

    // Update owner
    const { error } = await supabase
      .from('contacts')
      .update({
        owner_user_id: targetUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Emit event
    await events.contactAssigned({
      contactId,
      tenantId,
      fromUserId,
      toUserId: targetUserId,
    })

    return { success: true, assignedUserId: targetUserId }
  } catch (error) {
    console.error('[Contact Actions] Error assigning contact:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Update contact fields
 */
export async function updateContactFields(
  contactId: string,
  tenantId: string,
  updates: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('contacts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Emit event
    await events.contactUpdated({
      contactId,
      tenantId,
      changes: updates,
    })

    return { success: true }
  } catch (error) {
    console.error('[Contact Actions] Error updating contact:', error)
    return { success: false, error: String(error) }
  }
}

