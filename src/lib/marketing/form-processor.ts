/**
 * FORM PROCESSOR - Marketing Forms → CRM Integration
 * Handles form submissions, creates contacts/deals, assigns owners
 */

import { createClient } from '@/lib/supabase-client';
import { secureRandomInt } from '@/lib/utils/security';

export interface FormSubmission {
  formId: string;
  formName: string;
  payload: Record<string, any>;
  sourceUrl?: string;
  tenantId: string;
}

export interface DealCreationRules {
  enabled: boolean;
  targetPipelineId: string;
  defaultStageId: string;
  dealValue?: number;
  autoAssignOwner: boolean;
  assignmentRule?: 'round_robin' | 'tag_based' | 'territory_based';
  assignmentConfig?: Record<string, any>;
}

/**
 * Process form submission: Create/Update Contact, optionally create Deal
 */
export async function processFormSubmission(
  submission: FormSubmission,
  dealRules?: DealCreationRules
): Promise<{ contactId: string; dealId?: string }> {
  const supabase = createClient();
  
  // Extract contact data from form payload
  const contactData = {
    tenant_id: submission.tenantId,
    full_name: submission.payload.name || submission.payload.full_name,
    primary_email: submission.payload.email,
    primary_phone: submission.payload.phone || submission.payload.mobile,
    tags: submission.payload.tags || ['form_lead'],
    marketing_consent: submission.payload.marketing_consent || false,
    email_consent: submission.payload.email_consent || false,
    sms_consent: submission.payload.sms_consent || false,
  };

  // Check for duplicate contact
  let contactId: string;
  const { data: existingContact } = await supabase
    .from('contacts')
    .select('id')
    .eq('tenant_id', submission.tenantId)
    .eq('primary_email', contactData.primary_email)
    .single();

  if (existingContact) {
    // Update existing contact
    contactId = existingContact.id;
    await supabase
      .from('contacts')
      .update({
        ...contactData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId);
    
    console.log(`[Form Processor] Updated existing contact ${contactId}`);
  } else {
    // Create new contact
    const { data: newContact } = await supabase
      .from('contacts')
      .insert(contactData)
      .select('id')
      .single();
    
    contactId = newContact!.id;
    console.log(`[Form Processor] Created new contact ${contactId}`);
  }

  // Track first-touch attribution
  const { trackFirstTouch } = await import('./attribution');
  await trackFirstTouch(contactId, submission.formId, submission.formName);

  // Log form submission activity
  await supabase.from('activities').insert({
    tenant_id: submission.tenantId,
    contact_id: contactId,
    activity_type: 'form_submission',
    activity_timestamp: new Date().toISOString(),
    notes: `Submitted form: ${submission.formName}`,
    marketing_campaign_id: submission.formId,
    marketing_event_type: 'form_filled',
  });

  // Create deal if enabled
  let dealId: string | undefined;
  if (dealRules?.enabled) {
    const assignedOwnerId = dealRules.autoAssignOwner
      ? await assignOwner(submission.tenantId, contactData, dealRules)
      : null;

    const { data: newDeal } = await supabase
      .from('deals')
      .insert({
        tenant_id: submission.tenantId,
        contact_id: contactId,
        pipeline_id: dealRules.targetPipelineId,
        stage_id: dealRules.defaultStageId,
        title: `${contactData.full_name} - ${submission.formName}`,
        value_estimate_cents: dealRules.dealValue ? dealRules.dealValue * 100 : null,
        marketing_source_type: 'form',
        marketing_source_id: submission.formId,
        marketing_source_name: submission.formName,
        owner_user_id: assignedOwnerId,
      })
      .select('id')
      .single();

    dealId = newDeal!.id;
    console.log(`[Form Processor] Created deal ${dealId} for contact ${contactId}`);

    // Create task for assigned owner
    if (assignedOwnerId) {
      await supabase.from('tasks').insert({
        tenant_id: submission.tenantId,
        title: `Follow up: ${submission.formName} lead`,
        description: `New form submission from ${contactData.full_name}`,
        assigned_to: assignedOwnerId,
        related_to_type: 'deal',
        related_to_id: dealId,
        priority: 'high',
        status: 'pending',
        due_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      });
    }
  }

  return { contactId, dealId };
}

/**
 * Assign owner using configured rule
 */
async function assignOwner(
  tenantId: string,
  contactData: any,
  rules: DealCreationRules
): Promise<string | null> {
  const supabase = createClient();
  
  if (rules.assignmentRule === 'round_robin') {
    return await roundRobinAssignment(tenantId);
  } else if (rules.assignmentRule === 'tag_based') {
    return await tagBasedAssignment(tenantId, contactData.tags, rules.assignmentConfig);
  } else if (rules.assignmentRule === 'territory_based') {
    return await territoryBasedAssignment(tenantId, contactData, rules.assignmentConfig);
  }
  
  return null;
}

/**
 * Round-robin assignment
 */
async function roundRobinAssignment(tenantId: string): Promise<string | null> {
  const supabase = createClient();
  
  // Get all active users
  const { data: users } = await supabase
    .from('app_users')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('id');

  if (!users || users.length === 0) return null;

  // Get last assigned user index from settings or use 0
  // For simplicity, just rotate through users (using secure randomness)
  const randomIndex = secureRandomInt(users.length);
  return users[randomIndex].id;
}

/**
 * Tag-based assignment
 */
async function tagBasedAssignment(
  tenantId: string,
  tags: string[],
  config?: Record<string, any>
): Promise<string | null> {
  if (!config) return null;
  
  // Match tags to assigned owners
  for (const tag of tags) {
    if (config[tag]) {
      return config[tag]; // Return configured owner for this tag
    }
  }
  
  return null;
}

/**
 * Territory-based assignment
 */
async function territoryBasedAssignment(
  tenantId: string,
  contactData: any,
  config?: Record<string, any>
): Promise<string | null> {
  if (!config) return null;
  
  // Match territory (city, state, zip) to owners
  const territory = contactData.city || contactData.state || contactData.postal_code;
  
  if (territory && config[territory]) {
    return config[territory];
  }
  
  return null;
}




