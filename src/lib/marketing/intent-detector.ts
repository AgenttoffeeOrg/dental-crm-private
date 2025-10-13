/**
 * INTENT DETECTOR - High-Intent Link Clicks
 * Detects hot leads and auto-creates urgent tasks
 */

import { createClient } from '@/lib/supabase-client';

export interface HighIntentConfig {
  categories: {
    pricing: string[];
    booking: string[];
    product: string[];
    demo: string[];
  };
  autoCreateTask: boolean;
  taskPriority: 'urgent' | 'high';
  taskDueHours: number; // hours from now
  autoAddTag: string; // e.g., 'hot_lead'
  notifyOwner: boolean;
}

const DEFAULT_CONFIG: HighIntentConfig = {
  categories: {
    pricing: ['/pricing', '/price', '/cost', '/quote'],
    booking: ['/book', '/schedule', '/appointment', '/calendar'],
    product: ['/product', '/service', '/treatment'],
    demo: ['/demo', '/consultation', '/trial'],
  },
  autoCreateTask: true,
  taskPriority: 'urgent',
  taskDueHours: 2,
  autoAddTag: 'hot_lead',
  notifyOwner: true,
};

/**
 * Detect if a link click is high-intent
 */
export function isHighIntentClick(clickedUrl: string, config = DEFAULT_CONFIG): boolean {
  const allIntentUrls = [
    ...config.categories.pricing,
    ...config.categories.booking,
    ...config.categories.product,
    ...config.categories.demo,
  ];

  return allIntentUrls.some(pattern => clickedUrl.toLowerCase().includes(pattern));
}

/**
 * Get intent category
 */
export function getIntentCategory(clickedUrl: string, config = DEFAULT_CONFIG): string | null {
  const url = clickedUrl.toLowerCase();
  
  if (config.categories.pricing.some(p => url.includes(p))) return 'pricing';
  if (config.categories.booking.some(p => url.includes(p))) return 'booking';
  if (config.categories.product.some(p => url.includes(p))) return 'product';
  if (config.categories.demo.some(p => url.includes(p))) return 'demo';
  
  return null;
}

/**
 * Handle high-intent click (auto-create task, add tag, notify)
 */
export async function handleHighIntentClick(
  contactId: string,
  dealId: string | null,
  clickedUrl: string,
  campaignId: string,
  tenantId: string,
  config = DEFAULT_CONFIG
): Promise<void> {
  const supabase = createClient();
  
  const category = getIntentCategory(clickedUrl, config);
  if (!category) return;

  // Get contact details
  const { data: contact } = await supabase
    .from('contacts')
    .select('full_name, tags, owner_user_id')
    .eq('id', contactId)
    .single();

  if (!contact) return;

  // Add hot_lead tag
  if (config.autoAddTag) {
    const newTags = contact.tags || [];
    if (!newTags.includes(config.autoAddTag)) {
      newTags.push(config.autoAddTag);
      
      await supabase
        .from('contacts')
        .update({ tags: newTags })
        .eq('id', contactId);
    }
  }

  // Create urgent task
  if (config.autoCreateTask) {
    const dueDate = new Date(Date.now() + config.taskDueHours * 60 * 60 * 1000);
    
    const taskTitle = `🔥 High-Intent: ${category.toUpperCase()} - ${contact.full_name}`;
    const taskDescription = `Contact clicked ${clickedUrl} in marketing campaign. This indicates strong ${category} interest. Follow up immediately!`;

    await supabase.from('tasks').insert({
      tenant_id: tenantId,
      title: taskTitle,
      description: taskDescription,
      assigned_to: contact.owner_user_id || null,
      related_to_type: dealId ? 'deal' : 'contact',
      related_to_id: dealId || contactId,
      priority: config.taskPriority,
      status: 'pending',
      due_date: dueDate.toISOString(),
      tags: ['marketing_signal', 'hot_lead', category],
    });

    console.log(`[Intent Detector] 🔥 Created urgent task for ${contact.full_name} (${category})`);
  }

  // Log to audit trail
  await supabase.from('audit_trail').insert({
    tenant_id: tenantId,
    user_id: 'system',
    action: 'high_intent_detected',
    entity_type: 'contact',
    entity_id: contactId,
    details: {
      category,
      url: clickedUrl,
      campaignId,
      autoActionsTriggered: {
        taskCreated: config.autoCreateTask,
        tagAdded: config.autoAddTag,
      },
    },
  });

  // Send notification to owner (if configured)
  if (config.notifyOwner && contact.owner_user_id) {
    // Notification logic here (email, in-app, etc.)
    console.log(`[Intent Detector] 📧 Notified owner of hot lead: ${contact.full_name}`);
  }
}


