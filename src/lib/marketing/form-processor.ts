/**
 * FORM PROCESSOR - Marketing Forms → CRM Integration
 * Handles form submissions, creates contacts/deals, assigns owners
 * 
 * PHASE 9 ENHANCEMENT:
 * - Integrated Universal Treatment Tag Routing System
 * - Automatic AI-powered tag extraction from form data
 * - Dynamic pipeline routing based on treatment tags
 */

import { createClient } from '@/lib/supabase-client';
import { secureRandomInt } from '@/lib/utils/security';
import { quickRouteDeal } from '@/lib/treatment-routing';
import { extractTagsFromDealText } from '@/lib/treatment-routing/ai-extractor';

export interface FormSubmission {
  formId: string;
  formName: string;
  payload: Record<string, any>;
  sourceUrl?: string;
  tenantId: string;
}

export interface DealCreationRules {
  enabled: boolean;
  targetPipelineId?: string; // Now optional - can be overridden by routing
  defaultStageId?: string; // Now optional - can be overridden by routing
  dealValue?: number;
  autoAssignOwner: boolean;
  assignmentRule?: 'round_robin' | 'tag_based' | 'territory_based';
  assignmentConfig?: Record<string, any>;
  // NEW: Routing options
  enableAutoRouting?: boolean; // Default: true
  forceManualPipeline?: boolean; // If true, ignores routing and uses targetPipelineId
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
    type: 'form_submission',
    occurred_at: new Date().toISOString(),
    description: `Submitted form: ${submission.formName}`,
    marketing_campaign_id: submission.formId,
    marketing_event_type: 'form_filled',
  });

  // Create deal if enabled
  let dealId: string | undefined;
  if (dealRules?.enabled) {
    const assignedOwnerId = dealRules.autoAssignOwner
      ? await assignOwner(submission.tenantId, contactData, dealRules)
      : null;

    // ===== PHASE 9: UNIVERSAL TREATMENT TAG ROUTING =====
    
    // Step 1: Extract treatment tags from form payload
    let treatmentTags: string[] = [];
    
    // Check if form explicitly provides treatment tags
    if (submission.payload.treatment_tags && Array.isArray(submission.payload.treatment_tags)) {
      treatmentTags = submission.payload.treatment_tags;
      console.log(`[Form Processor] Using explicit treatment tags from form:`, treatmentTags);
    } else {
      // AI-powered tag extraction from form content
      const formText = [
        submission.formName,
        submission.payload.reason_for_inquiry,
        submission.payload.treatment_type,
        submission.payload.service_interest,
        submission.payload.message,
        submission.payload.notes,
      ]
        .filter(Boolean)
        .join(' ');
      
      if (formText.trim()) {
        try {
          const extractionResult = await extractTagsFromDealText(
            formText,
            submission.tenantId
          );
          treatmentTags = extractionResult.extractedTags.map(t => t.tagName);
          console.log(`[Form Processor] AI extracted ${treatmentTags.length} tags:`, treatmentTags);
        } catch (error) {
          console.error('[Form Processor] Tag extraction failed:', error);
          // Continue without tags - will route to unsorted
        }
      }
    }

    // ===== PHASE 12: ENHANCED ROUTING LOGIC =====
    // Step 2: Determine routing (pipeline + stage) with proper override handling
    let finalPipelineId: string;
    let finalStageId: string;
    let routingMethod: string;
    let routingLogId: string | undefined;
    
    if (dealRules.forceManualPipeline && dealRules.targetPipelineId && dealRules.defaultStageId) {
      // PRIORITY 1: Manual override - Completely bypass routing engine
      // Use case: User explicitly wants all form submissions to go to a specific pipeline
      finalPipelineId = dealRules.targetPipelineId;
      finalStageId = dealRules.defaultStageId;
      routingMethod = 'manual_override';
      console.log(`[Form Processor] Using manual pipeline override: ${finalPipelineId}`);
    } else if (dealRules.enableAutoRouting !== false) {
      // PRIORITY 2: Auto routing with optional target pipeline as suggestion
      // Use case: Use intelligent routing, but respect user's pipeline preference if provided
      try {
        const routingResult = await quickRouteDeal({
          dealTitle: `${contactData.full_name} - ${submission.formName}`,
          dealDescription: submission.payload.reason_for_inquiry || submission.payload.message,
          contactId,
          orgId: submission.tenantId,
          treatmentTags,
          userOverridePipeline: dealRules.targetPipelineId, // Pass as override to routing engine
          source: 'marketing_form',
        });
        
        finalPipelineId = routingResult.pipelineId;
        finalStageId = routingResult.stageId;
        routingMethod = routingResult.routingMethod;
        routingLogId = routingResult.routingLogId;
        
        console.log(`[Form Processor] Auto-routed to pipeline: ${finalPipelineId} (${routingMethod})`);
        
        // Log routing decision
        if (routingLogId) {
          console.log(`[Form Processor] Routing logged: ${routingLogId}`);
        }
      } catch (error) {
        console.error('[Form Processor] Routing failed, using fallback:', error);
        // Fallback to manual pipeline or unsorted
        if (dealRules.targetPipelineId && dealRules.defaultStageId) {
          finalPipelineId = dealRules.targetPipelineId;
          finalStageId = dealRules.defaultStageId;
          routingMethod = 'fallback_manual';
        } else {
          throw new Error('Routing failed and no fallback pipeline configured');
        }
      }
    } else {
      // PRIORITY 3: Routing disabled - Must have target pipeline specified
      // Use case: Organization doesn't want automatic routing
      if (!dealRules.targetPipelineId || !dealRules.defaultStageId) {
        throw new Error('Auto-routing is disabled but no target pipeline specified');
      }
      finalPipelineId = dealRules.targetPipelineId;
      finalStageId = dealRules.defaultStageId;
      routingMethod = 'routing_disabled';
      console.log(`[Form Processor] Using specified pipeline (routing disabled): ${finalPipelineId}`);
    }

    // Step 3: Create deal with routed pipeline, extracted tags, and full attribution data
    const { data: newDeal } = await supabase
      .from('deals')
      .insert({
        tenant_id: submission.tenantId,
        contact_id: contactId,
        pipeline_id: finalPipelineId,
        stage_id: finalStageId,
        title: `${contactData.full_name} - ${submission.formName}`,
        value_estimate_cents: dealRules.dealValue ? dealRules.dealValue * 100 : null,
        treatment_tags: treatmentTags, // Store extracted tags
        // ===== PHASE 12: PRESERVE ALL ATTRIBUTION DATA =====
        marketing_source_type: 'form',
        marketing_source_id: submission.formId,
        marketing_source_name: submission.formName,
        marketing_source_url: submission.sourceUrl, // Preserve source URL for attribution
        owner_user_id: assignedOwnerId,
        last_activity_at: new Date().toISOString(),
        // Custom fields for routing metadata
        custom_fields: {
          routing_log_id: routingLogId,
          routing_method: routingMethod,
          form_payload: submission.payload, // Preserve full form data for future analysis
          submission_timestamp: new Date().toISOString(),
        },
      })
      .select('id')
      .single();

    dealId = newDeal!.id;
    console.log(`[Form Processor] Created deal ${dealId} for contact ${contactId} with ${treatmentTags.length} tags (${routingMethod})`);

    // ===== PHASE 12: PRESERVE ATTRIBUTION =====
    // Track marketing attribution (first-touch already tracked for contact)
    if (submission.formId && submission.formName) {
      const { trackLastTouch } = await import('./attribution');
      await trackLastTouch(dealId, submission.formId, submission.formName);
      console.log(`[Form Processor] Tracked last-touch attribution for deal ${dealId}`);
    }

    // Create task for assigned owner with location inheritance
    if (assignedOwnerId && dealId) {
      // Get deal and contact locations for inheritance
      const [dealResult, contactResult] = await Promise.all([
        supabase.from('deals').select('location_id').eq('id', dealId).single(),
        supabase.from('contacts').select('location_id').eq('id', contactId).single(),
      ]);

      const deal = dealResult.data;
      const contact = contactResult.data;
      
      // Inherit location: deal > contact > null
      const locationId = deal?.location_id || contact?.location_id || null;

      await supabase.from('tasks').insert({
        tenant_id: submission.tenantId,
        title: `Follow up: ${submission.formName} lead`,
        description: `New form submission from ${contactData.full_name}${treatmentTags.length > 0 ? `\nTreatment interests: ${treatmentTags.join(', ')}` : ''}`,
        assignee_user_id: assignedOwnerId,
        contact_id: contactId,
        deal_id: dealId,
        location_id: locationId, // Inherit from deal or contact
        priority: 'high',
        task_type: 'follow_up',
        status: 'open',
        due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        auto_created: true,
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




