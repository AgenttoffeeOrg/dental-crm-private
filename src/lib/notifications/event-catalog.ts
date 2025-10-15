/**
 * Notification Event Catalog
 * 
 * Complete registry of all 60+ notification events across the platform
 * 
 * Each event defines:
 * - Event key (unique identifier)
 * - Module source
 * - Default severity & priority
 * - Default channels
 * - Quick actions
 * - Audience resolution logic
 */

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error' | 'critical'
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'
export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push'
export type NotificationModule = 
  | 'deals' 
  | 'contacts' 
  | 'tasks' 
  | 'marketing' 
  | 'marketing_audit'
  | 'analytics' 
  | 'forms' 
  | 'integrations' 
  | 'settings'
  | 'ai'
  | 'system'

export interface QuickAction {
  action_key: string
  label: string
  type: 'primary' | 'secondary' | 'destructive'
  endpoint?: string
  navigation_url?: string
}

export interface NotificationEventDefinition {
  event_key: string
  module: NotificationModule
  title_template: string
  body_template?: string
  severity: NotificationSeverity
  priority: NotificationPriority
  default_channels: NotificationChannel[]
  quick_actions: QuickAction[]
  // Audience can be: specific user_ids, roles, or 'creator' / 'assignee' / 'owner' / 'manager'
  default_audience: string[] | 'creator' | 'assignee' | 'owner' | 'manager' | 'team'
  group_by?: 'entity_type' | 'entity_id'  // For threading similar notifications
  throttle_minutes?: number  // Prevent duplicate notifications within timeframe
}

// =====================================================
// DEALS & PIPELINE EVENTS
// =====================================================

export const DEAL_EVENTS: NotificationEventDefinition[] = [
  {
    event_key: 'deal.assigned',
    module: 'deals',
    title_template: 'Deal assigned to you',
    body_template: '{{triggered_by_name}} assigned "{{deal_title}}" to you',
    severity: 'info',
    priority: 'high',
    default_channels: ['in_app', 'email'],
    quick_actions: [
      { action_key: 'open_deal', label: 'Open Deal', type: 'primary', navigation_url: '/deals/{{entity_id}}' },
      { action_key: 'accept', label: 'Accept', type: 'secondary', endpoint: '/api/deals/{{entity_id}}/accept' },
    ],
    default_audience: 'assignee',
    group_by: 'entity_id',
  },
  {
    event_key: 'deal.created',
    module: 'deals',
    title_template: 'New deal created',
    body_template: '{{triggered_by_name}} created "{{deal_title}}" ({{deal_value}})',
    severity: 'info',
    priority: 'medium',
    default_channels: ['in_app'],
    quick_actions: [
      { action_key: 'open_deal', label: 'Open Deal', type: 'primary', navigation_url: '/deals/{{entity_id}}' },
    ],
    default_audience: 'manager',
  },
  {
    event_key: 'deal.stage_changed',
    module: 'deals',
    title_template: 'Deal moved to {{stage_name}}',
    body_template: '"{{deal_title}}" moved from {{from_stage}} → {{to_stage}}',
    severity: 'info',
    priority: 'medium',
    default_channels: ['in_app'],
    quick_actions: [
      { action_key: 'open_deal', label: 'Open Deal', type: 'primary', navigation_url: '/deals/{{entity_id}}' },
    ],
    default_audience: 'owner',
    group_by: 'entity_id',
  },
  {
    event_key: 'deal.won',
    module: 'deals',
    title_template: '🎉 Deal won!',
    body_template: '"{{deal_title}}" marked as won ({{deal_value}})',
    severity: 'success',
    priority: 'high',
    default_channels: ['in_app', 'email'],
    quick_actions: [
      { action_key: 'view_report', label: 'View Report', type: 'primary', navigation_url: '/analytics?filter=deal-{{entity_id}}' },
      { action_key: 'celebrate', label: 'Celebrate 🎉', type: 'secondary', endpoint: '/api/deals/{{entity_id}}/celebrate' },
    ],
    default_audience: 'team',
  },
  {
    event_key: 'deal.lost',
    module: 'deals',
    title_template: 'Deal lost',
    body_template: '"{{deal_title}}" marked as lost. Reason: {{reason}}',
    severity: 'warning',
    priority: 'medium',
    default_channels: ['in_app'],
    quick_actions: [
      { action_key: 'open_deal', label: 'Review', type: 'primary', navigation_url: '/deals/{{entity_id}}' },
    ],
    default_audience: 'manager',
  },
  {
    event_key: 'deal.aging',
    module: 'deals',
    title_template: '⚠️ Deal stuck in stage',
    body_template: '"{{deal_title}}" in {{stage_name}} for {{days}} days',
    severity: 'warning',
    priority: 'high',
    default_channels: ['in_app', 'email'],
    quick_actions: [
      { action_key: 'open_deal', label: 'Open Deal', type: 'primary', navigation_url: '/deals/{{entity_id}}' },
      { action_key: 'move_stage', label: 'Move Stage', type: 'secondary', navigation_url: '/deals/{{entity_id}}#stages' },
    ],
    default_audience: 'owner',
    throttle_minutes: 1440,  // Once per day
  },
  {
    event_key: 'deal.sla_breach',
    module: 'deals',
    title_template: '🚨 Deal SLA breached',
    body_template: '"{{deal_title}}" exceeded {{sla_hours}}h SLA',
    severity: 'error',
    priority: 'urgent',
    default_channels: ['in_app', 'email', 'sms'],
    quick_actions: [
      { action_key: 'open_deal', label: 'Open Now', type: 'destructive', navigation_url: '/deals/{{entity_id}}' },
      { action_key: 'escalate', label: 'Escalate', type: 'secondary', endpoint: '/api/deals/{{entity_id}}/escalate' },
    ],
    default_audience: 'manager',
  },
  {
    event_key: 'deal.note_mention',
    module: 'deals',
    title_template: '{{triggered_by_name}} mentioned you',
    body_template: 'In note on "{{deal_title}}": {{note_preview}}',
    severity: 'info',
    priority: 'high',
    default_channels: ['in_app', 'email'],
    quick_actions: [
      { action_key: 'open_deal', label: 'View Note', type: 'primary', navigation_url: '/deals/{{entity_id}}#notes' },
      { action_key: 'reply', label: 'Reply', type: 'secondary', navigation_url: '/deals/{{entity_id}}#notes' },
    ],
    default_audience: 'assignee',  // Mentioned user
    group_by: 'entity_id',
  },
]

// =====================================================
// CONTACTS EVENTS
// =====================================================

export const CONTACT_EVENTS: NotificationEventDefinition[] = [
  {
    event_key: 'contact.created',
    module: 'contacts',
    title_template: 'New contact added',
    body_template: '{{contact_name}} added from {{source}}',
    severity: 'info',
    priority: 'low',
    default_channels: ['in_app'],
    quick_actions: [
      { action_key: 'open_contact', label: 'Open Contact', type: 'primary', navigation_url: '/contacts/{{entity_id}}' },
    ],
    default_audience: 'creator',
  },
  {
    event_key: 'contact.assigned',
    module: 'contacts',
    title_template: 'Contact assigned to you',
    body_template: '{{triggered_by_name}} assigned {{contact_name}} to you',
    severity: 'info',
    priority: 'medium',
    default_channels: ['in_app', 'email'],
    quick_actions: [
      { action_key: 'open_contact', label: 'Open Contact', type: 'primary', navigation_url: '/contacts/{{entity_id}}' },
    ],
    default_audience: 'assignee',
  },
  {
    event_key: 'contact.high_intent_detected',
    module: 'contacts',
    title_template: '🔥 High-intent activity detected',
    body_template: '{{contact_name}} clicked "{{clicked_url}}" - likely ready to convert',
    severity: 'info',
    priority: 'urgent',
    default_channels: ['in_app', 'email', 'sms'],
    quick_actions: [
      { action_key: 'call_now', label: 'Call Now', type: 'primary', endpoint: '/api/contacts/{{entity_id}}/call' },
      { action_key: 'open_contact', label: 'Open Contact', type: 'secondary', navigation_url: '/contacts/{{entity_id}}' },
    ],
    default_audience: 'owner',
  },
]

// =====================================================
// TASKS EVENTS
// =====================================================

export const TASK_EVENTS: NotificationEventDefinition[] = [
  {
    event_key: 'task.assigned',
    module: 'tasks',
    title_template: 'Task assigned to you',
    body_template: '{{triggered_by_name}} assigned "{{task_title}}"',
    severity: 'info',
    priority: 'high',
    default_channels: ['in_app', 'email'],
    quick_actions: [
      { action_key: 'open_task', label: 'Open Task', type: 'primary', navigation_url: '/tasks?task={{entity_id}}' },
      { action_key: 'accept', label: 'Accept', type: 'secondary', endpoint: '/api/tasks/{{entity_id}}/accept' },
    ],
    default_audience: 'assignee',
  },
  {
    event_key: 'task.due_soon',
    module: 'tasks',
    title_template: '⏰ Task due soon',
    body_template: '"{{task_title}}" due in {{hours}}h',
    severity: 'warning',
    priority: 'high',
    default_channels: ['in_app', 'email'],
    quick_actions: [
      { action_key: 'complete', label: 'Complete Now', type: 'primary', endpoint: '/api/tasks/{{entity_id}}/complete' },
      { action_key: 'snooze', label: 'Snooze', type: 'secondary', endpoint: '/api/tasks/{{entity_id}}/snooze' },
    ],
    default_audience: 'assignee',
    throttle_minutes: 60,
  },
  {
    event_key: 'task.overdue',
    module: 'tasks',
    title_template: '🚨 Task overdue',
    body_template: '"{{task_title}}" overdue by {{days}} day(s)',
    severity: 'error',
    priority: 'urgent',
    default_channels: ['in_app', 'email', 'sms'],
    quick_actions: [
      { action_key: 'complete', label: 'Complete Now', type: 'destructive', endpoint: '/api/tasks/{{entity_id}}/complete' },
      { action_key: 'reassign', label: 'Reassign', type: 'secondary', navigation_url: '/tasks?task={{entity_id}}' },
    ],
    default_audience: 'assignee',
    throttle_minutes: 1440,  // Once per day
  },
  {
    event_key: 'task.completed',
    module: 'tasks',
    title_template: '✅ Task completed',
    body_template: '{{completed_by_name}} completed "{{task_title}}"',
    severity: 'success',
    priority: 'low',
    default_channels: ['in_app'],
    quick_actions: [
      { action_key: 'view_task', label: 'View', type: 'secondary', navigation_url: '/tasks?task={{entity_id}}' },
    ],
    default_audience: 'creator',
  },
]

// =====================================================
// MARKETING (CAMPAIGNS) EVENTS
// =====================================================

export const MARKETING_CAMPAIGN_EVENTS: NotificationEventDefinition[] = [
  {
    event_key: 'campaign.sent',
    module: 'marketing',
    title_template: '📧 Campaign sent successfully',
    body_template: '"{{campaign_name}}" sent to {{recipient_count}} recipients',
    severity: 'success',
    priority: 'medium',
    default_channels: ['in_app', 'email'],
    quick_actions: [
      { action_key: 'view_report', label: 'View Report', type: 'primary', navigation_url: '/marketing/campaigns/{{entity_id}}/analytics' },
    ],
    default_audience: 'creator',
  },
  {
    event_key: 'campaign.failed',
    module: 'marketing',
    title_template: '❌ Campaign send failed',
    body_template: '"{{campaign_name}}" failed: {{error_message}}',
    severity: 'error',
    priority: 'urgent',
    default_channels: ['in_app', 'email', 'sms'],
    quick_actions: [
      { action_key: 'retry', label: 'Retry', type: 'destructive', endpoint: '/api/marketing/campaigns/{{entity_id}}/retry' },
      { action_key: 'view_logs', label: 'View Logs', type: 'secondary', navigation_url: '/marketing/campaigns/{{entity_id}}/logs' },
    ],
    default_audience: 'creator',
  },
  {
    event_key: 'campaign.domain_auth_issue',
    module: 'marketing',
    title_template: '⚠️ Domain authentication issue',
    body_template: 'SPF/DKIM not configured for {{domain}}. Deliverability at risk.',
    severity: 'error',
    priority: 'urgent',
    default_channels: ['in_app', 'email'],
    quick_actions: [
      { action_key: 'fix_dns', label: 'Fix DNS', type: 'primary', navigation_url: '/settings?tab=email-config&section=domain-auth' },
    ],
    default_audience: ['admin', 'owner'],
  },
]

// =====================================================
// INTEGRATIONS EVENTS
// =====================================================

export const INTEGRATION_EVENTS: NotificationEventDefinition[] = [
  {
    event_key: 'integration.token_expiring',
    module: 'integrations',
    title_template: '⚠️ Integration token expiring soon',
    body_template: '{{integration_name}} OAuth token expires in {{days}} days',
    severity: 'warning',
    priority: 'high',
    default_channels: ['in_app', 'email'],
    quick_actions: [
      { action_key: 'reconnect', label: 'Reconnect Now', type: 'primary', navigation_url: '/settings?tab=integrations&section={{integration_type}}' },
    ],
    default_audience: ['admin'],
    throttle_minutes: 1440,
  },
  {
    event_key: 'integration.token_expired',
    module: 'integrations',
    title_template: '🚨 Integration disconnected',
    body_template: '{{integration_name}} OAuth token expired. Data sync stopped.',
    severity: 'error',
    priority: 'urgent',
    default_channels: ['in_app', 'email', 'sms'],
    quick_actions: [
      { action_key: 'reconnect', label: 'Reconnect Now', type: 'destructive', navigation_url: '/settings?tab=integrations&section={{integration_type}}' },
    ],
    default_audience: ['admin'],
  },
  {
    event_key: 'integration.sync_failed',
    module: 'integrations',
    title_template: '❌ Data sync failed',
    body_template: '{{integration_name}} sync failed: {{error_message}}',
    severity: 'error',
    priority: 'high',
    default_channels: ['in_app', 'email'],
    quick_actions: [
      { action_key: 'retry', label: 'Retry Sync', type: 'primary', endpoint: '/api/integrations/{{integration_type}}/retry' },
      { action_key: 'view_logs', label: 'View Logs', type: 'secondary', navigation_url: '/settings?tab=integrations&section={{integration_type}}' },
    ],
    default_audience: ['admin'],
    throttle_minutes: 60,
  },
]

// =====================================================
// SYSTEM EVENTS
// =====================================================

export const SYSTEM_EVENTS: NotificationEventDefinition[] = [
  {
    event_key: 'system.maintenance_scheduled',
    module: 'system',
    title_template: '🔧 Scheduled maintenance',
    body_template: 'System maintenance on {{date}} from {{start_time}} to {{end_time}}',
    severity: 'info',
    priority: 'medium',
    default_channels: ['in_app', 'email'],
    quick_actions: [
      { action_key: 'view_schedule', label: 'View Schedule', type: 'secondary', navigation_url: '/system/status' },
    ],
    default_audience: 'team',
  },
]

// =====================================================
// COMPLETE EVENT CATALOG
// =====================================================

export const ALL_NOTIFICATION_EVENTS: NotificationEventDefinition[] = [
  ...DEAL_EVENTS,
  ...CONTACT_EVENTS,
  ...TASK_EVENTS,
  ...MARKETING_CAMPAIGN_EVENTS,
  ...INTEGRATION_EVENTS,
  ...SYSTEM_EVENTS,
]

// Event lookup by key
export const EVENT_CATALOG_MAP = new Map(
  ALL_NOTIFICATION_EVENTS.map(e => [e.event_key, e])
)

export function getEventDefinition(event_key: string): NotificationEventDefinition | undefined {
  return EVENT_CATALOG_MAP.get(event_key)
}

// Get all events for a module
export function getModuleEvents(module: NotificationModule): NotificationEventDefinition[] {
  return ALL_NOTIFICATION_EVENTS.filter(e => e.module === module)
}

// Validate event key exists
export function isValidEventKey(event_key: string): boolean {
  return EVENT_CATALOG_MAP.has(event_key)
}

