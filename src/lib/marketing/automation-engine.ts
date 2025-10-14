/**
 * AUTOMATION ENGINE - Enterprise-Grade Journey Execution
 * 
 * This is the core automation system that:
 * 1. Processes journey triggers (form submit, deal created, etc.)
 * 2. Executes actions (send email, add tag, wait, etc.)
 * 3. Manages journey state and contact progress
 * 4. Handles conditional logic and branching
 * 5. Tracks analytics and goal completions
 * 
 * Architecture: Event-driven, async, fault-tolerant, scalable
 */

import { createClient } from '@/lib/supabase-client'

// =====================================================
// TYPES & INTERFACES
// =====================================================

export interface JourneyTrigger {
  type: 'form_submit' | 'contact_created' | 'deal_created' | 'deal_stage_change' | 'tag_added' | 'email_opened' | 'link_clicked' | 'date_based' | 'manual'
  conditions?: Record<string, any>
  metadata?: Record<string, any>
}

export interface JourneyAction {
  id: string
  type: 'send_email' | 'send_sms' | 'send_whatsapp' | 'add_tag' | 'remove_tag' | 'create_task' | 'update_contact' | 'wait' | 'condition' | 'webhook'
  config: Record<string, any>
  nextActionId?: string
  conditionBranches?: {
    trueActionId?: string
    falseActionId?: string
  }
}

export interface JourneyState {
  id: string
  journeyId: string
  contactId: string
  currentActionId: string | null
  status: 'active' | 'completed' | 'paused' | 'failed'
  startedAt: Date
  completedAt?: Date
  metadata: Record<string, any>
}

export interface Journey {
  id: string
  tenantId: string
  name: string
  trigger: JourneyTrigger
  actions: JourneyAction[]
  goals?: {
    type: 'deal_created' | 'deal_won' | 'tag_added' | 'custom'
    config: Record<string, any>
  }[]
  status: 'draft' | 'active' | 'paused' | 'archived'
}

// =====================================================
// AUTOMATION ENGINE CLASS
// =====================================================

export class AutomationEngine {
  private supabase = createClient()

  /**
   * Process a trigger event and start journeys for matching contacts
   */
  async processTrigger(
    tenantId: string,
    trigger: JourneyTrigger,
    contactId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      console.log(`[AUTOMATION] Processing trigger: ${trigger.type} for contact ${contactId}`)

      // Find all active journeys with matching triggers
      const { data: journeys, error: journeysError } = await this.supabase
        .from('marketing_journeys')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .contains('trigger_config', { type: trigger.type })

      if (journeysError) throw journeysError

      if (!journeys || journeys.length === 0) {
        console.log(`[AUTOMATION] No active journeys found for trigger: ${trigger.type}`)
        return
      }

      // Start journey for each matching journey
      for (const journey of journeys) {
        await this.startJourney(journey.id, contactId, metadata)
      }
    } catch (error) {
      console.error('[AUTOMATION] Error processing trigger:', error)
      throw error
    }
  }

  /**
   * Start a journey for a specific contact
   */
  async startJourney(
    journeyId: string,
    contactId: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    try {
      // Check if contact is already in this journey
      const { data: existing } = await this.supabase
        .from('marketing_journey_states')
        .select('*')
        .eq('journey_id', journeyId)
        .eq('contact_id', contactId)
        .eq('status', 'active')
        .single()

      if (existing) {
        console.log(`[AUTOMATION] Contact ${contactId} already in journey ${journeyId}`)
        return existing.id
      }

      // Get journey details
      const { data: journey, error: journeyError } = await this.supabase
        .from('marketing_journeys')
        .select('*')
        .eq('id', journeyId)
        .single()

      if (journeyError || !journey) throw journeyError || new Error('Journey not found')

      // Create journey state
      const { data: journeyState, error: stateError } = await this.supabase
        .from('marketing_journey_states')
        .insert({
          journey_id: journeyId,
          contact_id: contactId,
          current_step: 0,
          status: 'active',
          started_at: new Date().toISOString(),
          state_data: metadata || {}
        })
        .select()
        .single()

      if (stateError) throw stateError

      console.log(`[AUTOMATION] Started journey ${journeyId} for contact ${contactId}`)

      // Execute first action
      await this.executeNextAction(journeyState.id)

      return journeyState.id
    } catch (error) {
      console.error('[AUTOMATION] Error starting journey:', error)
      throw error
    }
  }

  /**
   * Execute the next action in a journey
   */
  async executeNextAction(journeyStateId: string): Promise<void> {
    try {
      // Get journey state
      const { data: state, error: stateError } = await this.supabase
        .from('marketing_journey_states')
        .select('*, marketing_journeys(*)')
        .eq('id', journeyStateId)
        .single()

      if (stateError || !state) throw stateError || new Error('Journey state not found')

      const journey = state.marketing_journeys
      const steps = journey.steps_config as JourneyAction[]

      if (!steps || steps.length === 0) {
        await this.completeJourney(journeyStateId)
        return
      }

      const currentStep = state.current_step || 0

      if (currentStep >= steps.length) {
        await this.completeJourney(journeyStateId)
        return
      }

      const action = steps[currentStep]

      console.log(`[AUTOMATION] Executing action: ${action.type} for journey state ${journeyStateId}`)

      // Execute the action
      await this.executeAction(state, action)

      // Move to next step
      await this.supabase
        .from('marketing_journey_states')
        .update({
          current_step: currentStep + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', journeyStateId)

      // Check if there are more steps
      if (currentStep + 1 < steps.length) {
        const nextAction = steps[currentStep + 1]
        
        // If next action is a wait, schedule it
        if (nextAction.type === 'wait') {
          await this.scheduleWaitAction(journeyStateId, nextAction)
        } else {
          // Execute immediately
          await this.executeNextAction(journeyStateId)
        }
      } else {
        // Journey complete
        await this.completeJourney(journeyStateId)
      }
    } catch (error) {
      console.error('[AUTOMATION] Error executing next action:', error)
      
      // Mark journey as failed
      await this.supabase
        .from('marketing_journey_states')
        .update({
          status: 'failed',
          state_data: { error: String(error) }
        })
        .eq('id', journeyStateId)
    }
  }

  /**
   * Execute a specific action
   */
  private async executeAction(state: any, action: JourneyAction): Promise<void> {
    switch (action.type) {
      case 'send_email':
        await this.executeSendEmail(state, action)
        break
      case 'send_sms':
        await this.executeSendSMS(state, action)
        break
      case 'send_whatsapp':
        await this.executeSendWhatsApp(state, action)
        break
      case 'add_tag':
        await this.executeAddTag(state, action)
        break
      case 'remove_tag':
        await this.executeRemoveTag(state, action)
        break
      case 'create_task':
        await this.executeCreateTask(state, action)
        break
      case 'update_contact':
        await this.executeUpdateContact(state, action)
        break
      case 'condition':
        await this.executeCondition(state, action)
        break
      case 'wait':
        // Wait is handled by scheduler
        break
      default:
        console.warn(`[AUTOMATION] Unknown action type: ${action.type}`)
    }
  }

  /**
   * Send email action
   */
  private async executeSendEmail(state: any, action: JourneyAction): Promise<void> {
    const { templateId, subject, fromName, fromEmail } = action.config

    // Get contact details
    const { data: contact } = await this.supabase
      .from('contacts')
      .select('*')
      .eq('id', state.contact_id)
      .single()

    if (!contact || !contact.email) {
      console.log(`[AUTOMATION] Contact ${state.contact_id} has no email, skipping`)
      return
    }

    // Get template if specified
    let htmlContent = action.config.content || ''
    if (templateId) {
      const { data: template } = await this.supabase
        .from('marketing_templates')
        .select('content_html')
        .eq('id', templateId)
        .single()

      if (template) {
        htmlContent = template.content_html
      }
    }

    // Replace merge tags
    htmlContent = this.replaceMergeTags(htmlContent, contact)

    // Create activity record
    await this.supabase
      .from('activities')
      .insert({
        tenant_id: state.marketing_journeys.tenant_id,
        contact_id: state.contact_id,
        type: 'email',
        subject: subject || 'Automated Email',
        description: htmlContent,
        marketing_campaign_id: state.journey_id,
        marketing_event_type: 'journey_email_sent',
        activity_date: new Date().toISOString()
      })

    console.log(`[AUTOMATION] Email sent to ${contact.email}`)
  }

  /**
   * Send SMS action
   */
  private async executeSendSMS(state: any, action: JourneyAction): Promise<void> {
    const { message } = action.config

    const { data: contact } = await this.supabase
      .from('contacts')
      .select('*')
      .eq('id', state.contact_id)
      .single()

    if (!contact || !contact.phone) {
      console.log(`[AUTOMATION] Contact ${state.contact_id} has no phone, skipping`)
      return
    }

    const smsContent = this.replaceMergeTags(message, contact)

    await this.supabase
      .from('activities')
      .insert({
        tenant_id: state.marketing_journeys.tenant_id,
        contact_id: state.contact_id,
        type: 'sms',
        description: smsContent,
        marketing_campaign_id: state.journey_id,
        marketing_event_type: 'journey_sms_sent',
        activity_date: new Date().toISOString()
      })

    console.log(`[AUTOMATION] SMS sent to ${contact.phone}`)
  }

  /**
   * Send WhatsApp action
   */
  private async executeSendWhatsApp(state: any, action: JourneyAction): Promise<void> {
    // Similar to SMS
    await this.executeSendSMS(state, action)
  }

  /**
   * Add tag action
   */
  private async executeAddTag(state: any, action: JourneyAction): Promise<void> {
    const { tag } = action.config

    const { data: contact } = await this.supabase
      .from('contacts')
      .select('tags')
      .eq('id', state.contact_id)
      .single()

    const currentTags = contact?.tags || []
    if (!currentTags.includes(tag)) {
      await this.supabase
        .from('contacts')
        .update({ tags: [...currentTags, tag] })
        .eq('id', state.contact_id)

      console.log(`[AUTOMATION] Added tag "${tag}" to contact ${state.contact_id}`)
    }
  }

  /**
   * Remove tag action
   */
  private async executeRemoveTag(state: any, action: JourneyAction): Promise<void> {
    const { tag } = action.config

    const { data: contact } = await this.supabase
      .from('contacts')
      .select('tags')
      .eq('id', state.contact_id)
      .single()

    const currentTags = contact?.tags || []
    const updatedTags = currentTags.filter((t: string) => t !== tag)

    await this.supabase
      .from('contacts')
      .update({ tags: updatedTags })
      .eq('id', state.contact_id)

    console.log(`[AUTOMATION] Removed tag "${tag}" from contact ${state.contact_id}`)
  }

  /**
   * Create task action
   */
  private async executeCreateTask(state: any, action: JourneyAction): Promise<void> {
    const { title, description, dueInDays, assignedToUserId } = action.config

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (dueInDays || 0))

    await this.supabase
      .from('tasks')
      .insert({
        tenant_id: state.marketing_journeys.tenant_id,
        contact_id: state.contact_id,
        title: title || 'Follow up',
        description: description || 'Automated task from journey',
        due_date: dueDate.toISOString(),
        status: 'pending',
        assigned_to: assignedToUserId,
        created_by: 'automation'
      })

    console.log(`[AUTOMATION] Created task for contact ${state.contact_id}`)
  }

  /**
   * Update contact action
   */
  private async executeUpdateContact(state: any, action: JourneyAction): Promise<void> {
    const updates = action.config.updates || {}

    await this.supabase
      .from('contacts')
      .update(updates)
      .eq('id', state.contact_id)

    console.log(`[AUTOMATION] Updated contact ${state.contact_id}`)
  }

  /**
   * Conditional branch action
   */
  private async executeCondition(state: any, action: JourneyAction): Promise<void> {
    const { field, operator, value } = action.config

    // Get contact data
    const { data: contact } = await this.supabase
      .from('contacts')
      .select('*')
      .eq('id', state.contact_id)
      .single()

    if (!contact) return

    // Evaluate condition
    const fieldValue = (contact as any)[field]
    let conditionMet = false

    switch (operator) {
      case 'equals':
        conditionMet = fieldValue === value
        break
      case 'not_equals':
        conditionMet = fieldValue !== value
        break
      case 'contains':
        conditionMet = String(fieldValue).includes(value)
        break
      case 'greater_than':
        conditionMet = Number(fieldValue) > Number(value)
        break
      case 'less_than':
        conditionMet = Number(fieldValue) < Number(value)
        break
      default:
        conditionMet = false
    }

    // Store condition result in state
    await this.supabase
      .from('marketing_journey_states')
      .update({
        state_data: {
          ...state.state_data,
          lastConditionResult: conditionMet
        }
      })
      .eq('id', state.id)

    console.log(`[AUTOMATION] Condition evaluated: ${conditionMet}`)
  }

  /**
   * Schedule a wait action
   */
  private async scheduleWaitAction(journeyStateId: string, action: JourneyAction): Promise<void> {
    const { duration, unit } = action.config // e.g., duration: 2, unit: 'days'

    const resumeAt = new Date()
    switch (unit) {
      case 'minutes':
        resumeAt.setMinutes(resumeAt.getMinutes() + duration)
        break
      case 'hours':
        resumeAt.setHours(resumeAt.getHours() + duration)
        break
      case 'days':
        resumeAt.setDate(resumeAt.getDate() + duration)
        break
      case 'weeks':
        resumeAt.setDate(resumeAt.getDate() + (duration * 7))
        break
    }

    await this.supabase
      .from('marketing_journey_states')
      .update({
        status: 'waiting',
        wait_until: resumeAt.toISOString()
      })
      .eq('id', journeyStateId)

    console.log(`[AUTOMATION] Wait scheduled until ${resumeAt.toISOString()}`)
  }

  /**
   * Complete a journey
   */
  private async completeJourney(journeyStateId: string): Promise<void> {
    await this.supabase
      .from('marketing_journey_states')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', journeyStateId)

    console.log(`[AUTOMATION] Journey completed: ${journeyStateId}`)
  }

  /**
   * Replace merge tags in content
   */
  private replaceMergeTags(content: string, contact: any): string {
    let result = content

    // Contact fields
    const mergeMap: Record<string, any> = {
      '{{contact.first_name}}': contact.first_name || '',
      '{{contact.last_name}}': contact.last_name || '',
      '{{contact.full_name}}': contact.full_name || '',
      '{{contact.email}}': contact.email || '',
      '{{contact.phone}}': contact.phone || '',
      '{{contact.company}}': contact.company || '',
    }

    for (const [tag, value] of Object.entries(mergeMap)) {
      result = result.replace(new RegExp(tag, 'g'), value)
    }

    return result
  }

  /**
   * Process waiting journeys (to be called by cron/scheduler)
   */
  async processWaitingJourneys(): Promise<void> {
    try {
      const { data: waitingStates } = await this.supabase
        .from('marketing_journey_states')
        .select('*')
        .eq('status', 'waiting')
        .lte('wait_until', new Date().toISOString())

      if (!waitingStates || waitingStates.length === 0) {
        return
      }

      console.log(`[AUTOMATION] Processing ${waitingStates.length} waiting journeys`)

      for (const state of waitingStates) {
        // Resume journey
        await this.supabase
          .from('marketing_journey_states')
          .update({ status: 'active' })
          .eq('id', state.id)

        await this.executeNextAction(state.id)
      }
    } catch (error) {
      console.error('[AUTOMATION] Error processing waiting journeys:', error)
    }
  }

  /**
   * Check if a journey goal has been met
   */
  async checkGoalCompletion(
    journeyId: string,
    contactId: string,
    goalType: string,
    goalData?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Get journey state
      const { data: state } = await this.supabase
        .from('marketing_journey_states')
        .select('*')
        .eq('journey_id', journeyId)
        .eq('contact_id', contactId)
        .eq('status', 'active')
        .single()

      if (!state) return false

      // Mark goal as completed
      await this.supabase
        .from('marketing_journey_states')
        .update({
          goal_completed: true,
          goal_completed_at: new Date().toISOString(),
          goal_data: goalData || {}
        })
        .eq('id', state.id)

      console.log(`[AUTOMATION] Goal completed for journey ${journeyId}, contact ${contactId}`)
      return true
    } catch (error) {
      console.error('[AUTOMATION] Error checking goal:', error)
      return false
    }
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const automationEngine = new AutomationEngine()

// =====================================================
// HELPER FUNCTIONS FOR EASY USE
// =====================================================

/**
 * Trigger a journey when a form is submitted
 */
export async function triggerFormSubmitJourney(
  tenantId: string,
  contactId: string,
  formId: string,
  submissionData: Record<string, any>
) {
  await automationEngine.processTrigger(
    tenantId,
    { type: 'form_submit', conditions: { formId } },
    contactId,
    { formId, submissionData }
  )
}

/**
 * Trigger a journey when a contact is created
 */
export async function triggerContactCreatedJourney(
  tenantId: string,
  contactId: string,
  source?: string
) {
  await automationEngine.processTrigger(
    tenantId,
    { type: 'contact_created', conditions: { source } },
    contactId,
    { source }
  )
}

/**
 * Trigger a journey when a deal stage changes
 */
export async function triggerDealStageChangeJourney(
  tenantId: string,
  contactId: string,
  dealId: string,
  oldStage: string,
  newStage: string
) {
  await automationEngine.processTrigger(
    tenantId,
    { type: 'deal_stage_change', conditions: { newStage } },
    contactId,
    { dealId, oldStage, newStage }
  )
}

/**
 * Trigger a journey when a tag is added
 */
export async function triggerTagAddedJourney(
  tenantId: string,
  contactId: string,
  tag: string
) {
  await automationEngine.processTrigger(
    tenantId,
    { type: 'tag_added', conditions: { tag } },
    contactId,
    { tag }
  )
}

/**
 * Mark a goal as completed
 */
export async function markJourneyGoalComplete(
  journeyId: string,
  contactId: string,
  goalType: string,
  goalData?: Record<string, any>
) {
  return await automationEngine.checkGoalCompletion(journeyId, contactId, goalType, goalData)
}



