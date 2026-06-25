# Features and Modules

## Patient Management Workspace
The contact workspace surfaces the entire patient record—including primary channels, tags, value contribution, and next steps—without forcing receptionists to context-switch.
- Purpose: unify profile editing, deals, and communications.
- Interaction: interactive tabs to open AI assistant, create deals, log activities.
- Problem solved: eliminates spreadsheet sprawl and ensures receptionists always see current lead score and follow-up tasks.

```53:205:src/components/contacts/contact-detail-view.tsx
export function ContactDetailView({ contactId }: ContactDetailViewProps) {
  const { data: contactData } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single()
  // ... existing code ...
  <div className="space-y-3">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <Phone className="h-4 w-4 text-gray-400" />
      {contact.primary_phone ? (
        <button onClick={() => setCallDialerOpen(true)} className="text-sm text-blue-600">
          {contact.primary_phone}
        </button>
      ) : (
        <span className="text-sm text-gray-400 italic">No phone number</span>
      )}
    </div>
    // ... existing code ...
```

## Appointment Scheduling & Capacity Planning
The scheduling suite layers analytics on top of the appointment book so coordinators can quickly see gaps, no-shows, and chair utilization.
- Purpose: translate schedule data into actions (e.g., fill operatory gaps).
- Interaction: filterable charts for providers, operatories, day/hour distribution.
- Problem solved: helps practices balance high-value treatments with hygiene load.

```39:189:src/components/calendar/calendar-analytics-dashboard.tsx
export function CalendarAnalyticsDashboard({ tenantId, dateRange }: CalendarAnalyticsDashboardProps) {
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      *,
      provider:providers(id, name),
      operatory:operatories(id, name),
      appointment_type:appointment_types(id, name)
    `)
    .eq('tenant_id', tenantId)
    .gte('start_at', startOfDay(start).toISOString())
    .lte('start_at', endOfDay(end).toISOString())
  // ... existing code ...
  setStats({
    totalAppointments: total,
    completionRate: total > 0 ? (completed / total) * 100 : 0,
    providerUtilization: Array.from(providerMap.values()),
    appointmentsByType: Array.from(typeMap.entries()).map(([name, value]) => ({ name, value })),
    appointmentsByHour: Array.from(hourMap.entries()).map(([hour, count]) => ({
      hour: format(new Date().setHours(hour), 'ha'),
      appointments: count
    })),
  })
}
```

## Communication & Conversation Support
Every communication channel is centralized, with the AI assistant guiding next actions and offering instant scripts.
- Purpose: offload note-taking, task creation, and email drafting to automations.
- Interaction: interactive chat UI with quick actions for summaries, drafts, and scheduling.
- Problem solved: ensures even new receptionists can respond like seasoned coordinators.

```40:175:src/components/ai/ai-assistant-chat.tsx
export function AIAssistantChat({ context, contextId }: AIAssistantChatProps) {
  const response = await fetch('/api/ai-assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context,
      contextId,
      messages: [...messages, userMessage],
      question: input.trim()
    })
  })
  setMessages(prev => [...prev, {
    role: 'assistant',
    content: data.response,
    actions: data.suggestedActions || []
  }])
  // ... existing code ...
  {message.actions && message.actions.length > 0 && (
    <div className="flex flex-wrap gap-2 mt-2">
      {message.actions.map((action, i) => (
        <button key={i} onClick={() => handleQuickAction(action)}>
          {action.label}
        </button>
      ))}
    </div>
  )}
}
```

## Reporting, Priorities, and Coaching
Dashboards highlight revenue, conversion trends, pending tasks, and AI-generated prompts so teammates know exactly where to focus.
- Purpose: give receptionists a daily briefing that blends metrics with recommendations.
- Interaction: refreshing AI insight cards that link to pipeline screens.
- Problem solved: removes ambiguity about which deals or patients need attention today.

```22:186:src/components/dashboard/ai-insights-widget.tsx
export function AIInsightsWidget({ tenantId }: AIInsightsWidgetProps) {
  const data = await generateDashboardInsights(tenantId)
  setInsights(data)
  // ... existing code ...
  {insights.map((insight) => (
    <div key={insight.id} className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}>
      <h4 className="font-semibold text-sm">{insight.title}</h4>
      <p className="text-sm mb-2">{insight.description}</p>
      {insight.action && (
        <Link href={insight.action.url}>
          <Button size="sm" variant="outline">{insight.action.label}</Button>
        </Link>
      )}
    </div>
  ))}
}
```

## Billing, Seat Management, and Plan Controls
Subscription tooling keeps practice administrators aware of seat usage and entitlements so they can scale teams without invisible overages.
- Purpose: enforce seat usage, flag limits, and surface available upgrades.
- Interaction: plan APIs feed billing UI tabs and lock premium features when limits hit.
- Problem solved: prevents surprise billing and ensures compliance with practice group contracts.

```12:157:src/lib/services/billing-service.ts
export async function getSubscription(tenantId: string): Promise<SubscriptionInfo | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select(`
      id,
      tenant_id,
      status,
      seat_limit,
      active_seats,
      plan:plans (
        id,
        name,
        display_name,
        tier,
        default_seat_limit,
        max_seat_limit
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single()
  // ... existing code ...
}
```

## Automations, Playbooks, and Campaigns
Pre-built workflows ship with best-practice triggers and actions so receptionists always have a follow-up plan.
- Purpose: automate thank-you notes, proposal follow-ups, task escalations, and nurture flows.
- Interaction: enable templates per category (deal, task, contact) and customize wait durations or notification channels.
- Problem solved: replaces manual sticky notes with consistent, AI-ready pipelines.

```30:233:src/lib/automations/prebuilt-workflows.ts
export const DEAL_WORKFLOWS: WorkflowTemplate[] = [
  {
    id: 'deal_stage_proposal_sent',
    name: 'Deal Stage: Proposal Sent → Follow-up Sequence',
    trigger_type: 'deal_stage_change',
    actions: [
      { type: 'send_email', config: { template_id: 'proposal_confirmation' } },
      { type: 'create_task', config: { title: 'Follow up on proposal', due_in_hours: 48 } },
      { type: 'wait', config: { duration: 3, unit: 'days' }, delay_minutes: 4320 },
      { type: 'send_notification', config: { message: 'Check proposal status', to_user: 'owner' } }
    ]
  },
  {
    id: 'deal_created_welcome',
    name: 'New Deal → Welcome Sequence',
    trigger_type: 'deal_created',
    actions: [
      { type: 'assign_deal', config: { mode: 'round_robin' } },
      { type: 'send_email', config: { template_id: 'deal_welcome' } },
      { type: 'create_task', config: { title: 'Initial contact call', due_in_hours: 2 } }
    ]
  }
]

export const CONTACT_WORKFLOWS: WorkflowTemplate[] = [
  {
    id: 'contact_inactive_winback',
    name: 'Contact Inactive → Win-Back Campaign',
    trigger_type: 'contact_inactive',
    actions: [
      { type: 'send_email', config: { template_id: 'we_miss_you' } },
      { type: 'wait', config: { duration: 7, unit: 'days' }, delay_minutes: 10080 },
      { type: 'send_email', config: { template_id: 'special_offer' } }
    ]
  }
]
```

## Onboarding and Workspace Setup
The dashboard surfaces setup banners, verification steps, and quick actions so new practices can self-launch.

```35:64:src/app/dashboard/page.tsx
import { SetupBanner } from '@/components/onboarding/setup-banner'
import { EnhancedOnboardingWizard } from '@/components/onboarding/enhanced-onboarding-wizard'
const [showSetupPanel, setShowSetupPanel] = useState(false)
const [showCreateContact, setShowCreateContact] = useState(false)
const [showCreateDeal, setShowCreateDeal] = useState(false)
```

## Summary
By shipping guided workspaces, analytics-infused scheduling, and automation-heavy communications, the CRM arms dental receptionists with the same structured process, follow-up cadences, and contextual intelligence that high-performing sales organizations rely on. The feature set keeps the vision of democratizing treatment coordination front and center.
