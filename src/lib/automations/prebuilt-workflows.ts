/**
 * PRE-BUILT AUTOMATION WORKFLOWS
 * 
 * Ready-to-use automation templates that users can enable with one click.
 * These represent common, proven automation patterns.
 */

import { createClient } from '@/lib/supabase-client'

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'deal' | 'task' | 'contact' | 'pipeline' | 'marketing'
  icon: string
  trigger_type: string
  trigger_config: Record<string, any>
  actions: Array<{
    type: string
    config: Record<string, any>
    delay_minutes?: number
  }>
  is_premium?: boolean
}

// =====================================================
// DEAL WORKFLOW TEMPLATES
// =====================================================

export const DEAL_WORKFLOWS: WorkflowTemplate[] = [
  {
    id: 'deal_won_thank_you',
    name: 'Deal Won → Thank You & Review Request',
    description: 'When a deal is won, send immediate thank-you email, then request review after 3 days',
    category: 'deal',
    icon: 'CheckCircle',
    trigger_type: 'deal_won',
    trigger_config: {},
    actions: [
      {
        type: 'send_email',
        config: {
          template_id: 'thank_you_email',
          subject: 'Thank You for Choosing Us!',
        },
      },
      {
        type: 'wait',
        config: {
          duration: 3,
          unit: 'days',
        },
        delay_minutes: 4320, // 3 days
      },
      {
        type: 'send_email',
        config: {
          template_id: 'review_request',
          subject: 'How Was Your Experience?',
        },
      },
    ],
  },

  {
    id: 'deal_lost_feedback',
    name: 'Deal Lost → Collect Feedback',
    description: 'When deal is lost, send feedback survey and add to re-engagement nurture',
    category: 'deal',
    icon: 'XCircle',
    trigger_type: 'deal_lost',
    trigger_config: {},
    actions: [
      {
        type: 'send_email',
        config: {
          template_id: 'feedback_request',
          subject: 'We Value Your Feedback',
        },
      },
      {
        type: 'add_to_segment',
        config: {
          segment_id: 'lost_reengagement',
          segment_name: 'Lost - Re-engagement',
        },
      },
    ],
  },

  {
    id: 'deal_aging_reminder',
    name: 'Deal Aging → Send Reminder',
    description: 'When deal is inactive for 7+ days, send reminder to owner and create follow-up task',
    category: 'deal',
    icon: 'Clock',
    trigger_type: 'deal_aging',
    trigger_config: {
      days: 7,
    },
    actions: [
      {
        type: 'send_notification',
        config: {
          message: 'Deal has been inactive for 7+ days',
          priority: 'high',
          to_user: 'owner',
        },
      },
      {
        type: 'create_task',
        config: {
          title: 'Follow up on inactive deal',
          priority: 'high',
          due_in_hours: 24,
        },
      },
    ],
  },

  {
    id: 'high_value_deal_alert',
    name: 'High-Value Deal → Notify Senior Closer',
    description: 'When deal created with value >= £100k, notify senior closer and create urgent task',
    category: 'deal',
    icon: 'TrendingUp',
    trigger_type: 'deal_created',
    trigger_config: {
      min_value: 10000000, // £100k in cents
    },
    actions: [
      {
        type: 'send_notification',
        config: {
          message: 'High-value deal created (>= £100k)',
          priority: 'urgent',
          to_role: 'manager',
        },
      },
      {
        type: 'create_task',
        config: {
          title: '🔥 Review high-value deal',
          priority: 'urgent',
          due_in_hours: 2,
        },
      },
      {
        type: 'assign_deal',
        config: {
          to_role: 'senior_closer',
        },
      },
    ],
  },

  {
    id: 'deal_stage_proposal_sent',
    name: 'Deal Stage: Proposal Sent → Follow-up Sequence',
    description: 'When deal moves to "Proposal Sent", create follow-up task and schedule reminder',
    category: 'deal',
    icon: 'ArrowRight',
    trigger_type: 'deal_stage_change',
    trigger_config: {
      to_stage_name: 'Proposal Sent',
    },
    actions: [
      {
        type: 'send_email',
        config: {
          template_id: 'proposal_confirmation',
          subject: 'Proposal Sent - Next Steps',
        },
      },
      {
        type: 'create_task',
        config: {
          title: 'Follow up on proposal',
          priority: 'high',
          due_in_hours: 48,
        },
      },
      {
        type: 'wait',
        config: {
          duration: 3,
          unit: 'days',
        },
        delay_minutes: 4320,
      },
      {
        type: 'send_notification',
        config: {
          message: 'Check proposal status',
          priority: 'normal',
          to_user: 'owner',
        },
      },
    ],
  },

  {
    id: 'deal_created_welcome',
    name: 'New Deal → Welcome Sequence',
    description: 'When new deal is created, send welcome email and assign to rep (round-robin)',
    category: 'deal',
    icon: 'DollarSign',
    trigger_type: 'deal_created',
    trigger_config: {},
    actions: [
      {
        type: 'assign_deal',
        config: {
          mode: 'round_robin',
        },
      },
      {
        type: 'send_email',
        config: {
          template_id: 'deal_welcome',
          subject: "Welcome! Let's Get Started",
        },
      },
      {
        type: 'create_task',
        config: {
          title: 'Initial contact call',
          priority: 'high',
          due_in_hours: 2,
        },
      },
    ],
  },
]

// =====================================================
// TASK WORKFLOW TEMPLATES
// =====================================================

// 2b.62 — Playbook task-creation templates (Path 2 from the 2026-05-24
// product discussion). Eight templates that get installed via the
// existing POST /api/automations/install-template route. Each maps
// to a `create_task` action that the 2b.58-fixed automation engine
// now writes correctly. Templates carry a `default_on` hint the
// /automations cards UI uses to render the 3 ON-by-default templates
// as toggled-on (matches the spec — Practice Setup wizard can also
// install the ON defaults on first tenant boot).

export const PLAYBOOK_TASK_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'playbook_new_lead_call_within_1bd',
    name: 'New lead → Call within 1 business day',
    description:
      'When a new contact arrives via any lead source, create a "Call within 1 business day" task assigned per the tenant default-assignee policy.',
    category: 'task',
    icon: 'PhoneCall',
    trigger_type: 'contact_created',
    trigger_config: {},
    actions: [
      {
        type: 'create_task',
        config: {
          title: 'Call {contact.full_name} — new lead',
          task_type: 'call',
          priority: 'high',
          due_in_days: 1,
        },
      },
    ],
  },
  {
    id: 'playbook_deal_stalled_7d_check_in',
    name: 'No activity on deal for 7 days → check-in task',
    description:
      'When a deal has had no activity for 7 days, create a check-in task for the contact owner. Default OFF — flip on in /automations when you want this nudge.',
    category: 'task',
    icon: 'Hourglass',
    trigger_type: 'deal_aging',
    trigger_config: { days: 7 },
    actions: [
      {
        type: 'create_task',
        config: {
          title: 'Check in on {contact.full_name} — {deal.title} (7d quiet)',
          task_type: 'todo',
          priority: 'normal',
          due_in_days: 1,
        },
      },
    ],
  },
  {
    id: 'playbook_deal_lost_6mo_re_engage',
    name: 'Deal Closed Lost → re-engagement task in 6 months',
    description:
      'When a deal closes Lost, create a 6-month follow-up task to re-engage the contact. Sometimes they convert later.',
    category: 'task',
    icon: 'RotateCcw',
    trigger_type: 'deal_lost',
    trigger_config: {},
    actions: [
      {
        type: 'create_task',
        config: {
          title: 'Re-engage {contact.full_name} — was Lost in {deal.title}',
          task_type: 'call',
          priority: 'normal',
          due_in_days: 180,
        },
      },
    ],
  },
  {
    id: 'playbook_consult_booked_confirm_24h',
    name: 'Consult booked → confirm 24h before',
    description:
      'When a deal moves into a "Consult Booked" stage, create a task to confirm the appointment 24h before. Trigger fires on stage transition — practice configures which stage counts as "consult booked" in the rule.',
    category: 'task',
    icon: 'Calendar',
    trigger_type: 'deal_stage_change',
    trigger_config: {
      // Practice edits to match their pipeline's actual stage name —
      // e.g. "Consult Booked" / "Appointment Confirmed".
      to_stage_name: 'Consult Booked',
    },
    actions: [
      {
        type: 'create_task',
        config: {
          title: 'Confirm consult with {contact.full_name} — {deal.title}',
          task_type: 'call',
          priority: 'high',
          due_in_days: 1,
        },
      },
    ],
  },
  {
    id: 'playbook_quote_sent_follow_up_3d',
    name: 'Quote sent → follow up in 3 days',
    description:
      'When a deal moves into a "Quote Sent" stage, create a follow-up task 3 days later. Most quotes need a nudge.',
    category: 'task',
    icon: 'Send',
    trigger_type: 'deal_stage_change',
    trigger_config: {
      to_stage_name: 'Quote Sent',
    },
    actions: [
      {
        type: 'create_task',
        config: {
          title: 'Follow up on quote for {contact.full_name} ({deal.value})',
          task_type: 'call',
          priority: 'normal',
          due_in_days: 3,
        },
      },
    ],
  },
  {
    id: 'playbook_deposit_paid_fitting_reminder',
    name: 'Deposit paid → schedule fitting reminder',
    description:
      'When a deal moves into a "Deposit Paid" stage, create a task to schedule the fitting in 7 days.',
    category: 'task',
    icon: 'CheckSquare',
    trigger_type: 'deal_stage_change',
    trigger_config: {
      to_stage_name: 'Deposit Paid',
    },
    actions: [
      {
        type: 'create_task',
        config: {
          title: 'Schedule fitting for {contact.full_name} — {deal.title}',
          task_type: 'call',
          priority: 'high',
          due_in_days: 7,
        },
      },
    ],
  },
  {
    id: 'playbook_deal_stuck_in_stage_5d_nudge',
    name: 'Deal stalled in stage for 5 days → nudge patient',
    description:
      'When a deal has been stuck in the same stage for 5 days, create a nudge task. Default OFF — turn on once your team is in a rhythm and you trust the system.',
    category: 'task',
    icon: 'Bell',
    trigger_type: 'deal_aging',
    trigger_config: { days: 5 },
    actions: [
      {
        type: 'create_task',
        config: {
          title: 'Nudge {contact.full_name} — stuck in {stage.name} 5 days',
          task_type: 'sms',
          priority: 'normal',
          due_in_days: 1,
        },
      },
    ],
  },
  {
    id: 'playbook_vip_tag_call_within_1h',
    name: 'VIP-tagged contact arrives → call within 1 hour',
    description:
      'When a contact arrives with the "VIP" tag, create an URGENT call-back task due within the hour. Default OFF — only enable if you actively tag VIPs.',
    category: 'task',
    icon: 'Star',
    trigger_type: 'contact_created',
    trigger_config: {
      has_tag: 'VIP',
    },
    actions: [
      {
        type: 'create_task',
        config: {
          title: 'URGENT call — VIP contact {contact.full_name}',
          task_type: 'call',
          priority: 'urgent',
          due_in_days: 0,
        },
      },
    ],
  },
]

export const TASK_WORKFLOWS: WorkflowTemplate[] = [
  {
    id: 'task_overdue_escalation',
    name: 'Task Overdue → Escalate to Manager',
    description: 'When task is overdue for 24+ hours, notify assignee and escalate to manager',
    category: 'task',
    icon: 'AlertCircle',
    trigger_type: 'task_overdue',
    trigger_config: {
      hours_overdue: 24,
    },
    actions: [
      {
        type: 'send_notification',
        config: {
          message: 'Task is 24+ hours overdue',
          priority: 'urgent',
          to_user: 'assignee',
        },
      },
      {
        type: 'wait',
        config: {
          duration: 2,
          unit: 'hours',
        },
        delay_minutes: 120,
      },
      {
        type: 'send_notification',
        config: {
          message: 'Task still overdue - escalating',
          priority: 'urgent',
          to_role: 'manager',
        },
      },
    ],
  },

  {
    id: 'task_completed_next_task',
    name: 'Task Completed → Create Next Task',
    description: 'When "Send Proposal" task is completed, auto-create "Follow up on proposal" task',
    category: 'task',
    icon: 'Check',
    trigger_type: 'task_completed',
    trigger_config: {
      task_title_contains: 'Send Proposal',
    },
    actions: [
      {
        type: 'create_task',
        config: {
          title: 'Follow up on proposal',
          priority: 'high',
          due_in_hours: 48,
        },
      },
      {
        type: 'move_deal_stage',
        config: {
          to_stage_name: 'Proposal Sent',
        },
      },
    ],
  },
]

// =====================================================
// CONTACT WORKFLOW TEMPLATES
// =====================================================

export const CONTACT_WORKFLOWS: WorkflowTemplate[] = [
  {
    id: 'contact_created_nurture',
    name: 'New Contact → Welcome Nurture Sequence',
    description: 'When new contact is created from website, send 5-email nurture sequence',
    category: 'contact',
    icon: 'User',
    trigger_type: 'contact_created',
    trigger_config: {
      source: 'website',
    },
    actions: [
      {
        type: 'send_email',
        config: {
          template_id: 'welcome_email',
          subject: 'Welcome to Our Practice!',
        },
      },
      {
        type: 'wait',
        config: {
          duration: 2,
          unit: 'days',
        },
        delay_minutes: 2880,
      },
      {
        type: 'send_email',
        config: {
          template_id: 'value_proposition',
          subject: 'Why Patients Choose Us',
        },
      },
      {
        type: 'wait',
        config: {
          duration: 3,
          unit: 'days',
        },
        delay_minutes: 4320,
      },
      {
        type: 'send_email',
        config: {
          template_id: 'case_studies',
          subject: 'Real Patient Success Stories',
        },
      },
    ],
  },

  {
    id: 'contact_inactive_winback',
    name: 'Contact Inactive → Win-Back Campaign',
    description: 'When contact is inactive for 30+ days, send re-engagement sequence',
    category: 'contact',
    icon: 'UserMinus',
    trigger_type: 'contact_inactive',
    trigger_config: {
      days: 30,
    },
    actions: [
      {
        type: 'send_email',
        config: {
          template_id: 'we_miss_you',
          subject: "We'd Love to Hear From You",
        },
      },
      {
        type: 'wait',
        config: {
          duration: 7,
          unit: 'days',
        },
        delay_minutes: 10080,
      },
      {
        type: 'send_email',
        config: {
          template_id: 'special_offer',
          subject: 'Special Offer Just for You',
        },
      },
    ],
  },
]

// =====================================================
// ALL TEMPLATES COMBINED
// =====================================================

export const ALL_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  ...DEAL_WORKFLOWS,
  ...TASK_WORKFLOWS,
  ...PLAYBOOK_TASK_TEMPLATES, // 2b.62
  ...CONTACT_WORKFLOWS,
]

// 2b.62 — The subset of templates the Practice Setup wizard installs
// by default on first tenant boot. Matches the spec's "default ON?"
// column: 3 of the 8 playbook task templates ship as ready-to-fire.
// Practices flip the others on per their preference.
export const DEFAULT_ON_TASK_PLAYBOOK_TEMPLATE_IDS = [
  'playbook_new_lead_call_within_1bd',
  'playbook_consult_booked_confirm_24h',
  'playbook_quote_sent_follow_up_3d',
] as const

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get workflow templates by category
 */
export function getWorkflowTemplatesByCategory(
  category: 'deal' | 'task' | 'contact' | 'pipeline' | 'marketing'
): WorkflowTemplate[] {
  return ALL_WORKFLOW_TEMPLATES.filter(t => t.category === category)
}

/**
 * Get workflow template by ID
 */
export function getWorkflowTemplate(id: string): WorkflowTemplate | undefined {
  return ALL_WORKFLOW_TEMPLATES.find(t => t.id === id)
}

/**
 * Install a workflow template for a tenant
 */
export async function installWorkflowTemplate(
  templateId: string,
  tenantId: string,
  customizations?: {
    name?: string
    trigger_config?: Record<string, any>
  }
): Promise<{ success: boolean; journeyId?: string; error?: string }> {
  try {
    const template = getWorkflowTemplate(templateId)
    if (!template) {
      return { success: false, error: 'Template not found' }
    }

    const supabase = createClient()

    // Create journey from template
    const { data: journey, error } = await supabase
      .from('marketing_journeys')
      .insert({
        tenant_id: tenantId,
        name: customizations?.name || template.name,
        description: template.description,
        status: 'draft', // Start as draft
        entry_trigger_type: template.trigger_type,
        entry_trigger_config: customizations?.trigger_config || template.trigger_config,
        graph_json: {
          nodes: template.actions.map((action, index) => ({
            id: `node_${index}`,
            type: action.type,
            data: action.config,
            position: { x: 100, y: 100 + index * 100 },
          })),
          edges: template.actions.slice(0, -1).map((_, index) => ({
            id: `edge_${index}`,
            source: `node_${index}`,
            target: `node_${index + 1}`,
          })),
        },
      })
      .select('id')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, journeyId: journey.id }
  } catch (error) {
    console.error('[Workflow Templates] Error installing template:', error)
    return { success: false, error: String(error) }
  }
}

