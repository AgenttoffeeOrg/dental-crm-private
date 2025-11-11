# User Workflows and Journeys

## Receptionist Daily Flow
1. Login triggers Supabase session sync and tenant guard.
2. Dashboard loads real-time metrics, AI insights, and keyboard shortcuts for quick actions.
3. Receptionist opens prioritized deals/contacts and uses AI assistant for scripts.
4. Automations and tasks update as she logs activities; the system nudges next steps.

```27:186:src/lib/auth.tsx
const { data: { session } } = await supabase.auth.getSession()
if (session?.user) {
  const appUserData = await fetchAppUser(session.user.id, session.user)
  setAppUser(appUserData)
  void syncSessionWithServer('INITIAL_SESSION', session)
}
```

```5:142:src/app/dashboard/page.tsx
useDashboardRealtime(appUser?.active_tenant_id || appUser?.tenant_id, () => loadData(), true)
useKeyboardShortcuts({
  onCreateContact: () => {
    setCurrentAction('create this contact')
    requireOrg(() => setShowCreateContact(true))()
  },
  onCreateDeal: () => {
    setCurrentAction('create this deal')
    requireOrg(() => setShowCreateDeal(true))()
  },
  onCreateTask: () => {
    setCurrentAction('create this task')
    requireOrg(() => setShowCreateTask(true))()
  },
})
```

```22:186:src/components/dashboard/ai-insights-widget.tsx
const data = await generateDashboardInsights(tenantId)
setInsights(data)
{insights.map((insight) => (
  <div key={insight.id} className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}>
    <h4 className="font-semibold text-sm">{insight.title}</h4>
    <p className="text-sm mb-2">{insight.description}</p>
  </div>
))}
```

## Patient Journey: Inquiry → Appointment
1. Lead submits a marketing form or arrives via PMS webhook.
2. Contact POST endpoint validates, deduplicates, and attaches location + source.
3. Automations tag the lead, send welcome emails, and assign tasks.
4. Receptionist books an appointment; scheduling analytics track fulfilment.
5. AI assistant summarizes conversations before and after the visit.

```1:114:src/components/forms/form-builder.tsx
const handleSelectTemplate = async (template: any) => {
  const newForm = await createForm({
    name: template.name,
    description: template.description,
    status: 'draft',
    fields_json: template.fields,
    theme: 'light',
    button_text: 'Submit',
    success_message: 'Thank you! We\'ll be in touch soon.',
    redirect_url: '',
    auto_add_tags: [],
    enable_recaptcha: true,
    enable_honeypot: true,
    is_published: false,
    public_url_slug: '',
  })
  if (newForm) {
    toast.success('Form created from template!')
    loadForms()
  }
}
```

```196:314:src/app/api/contacts/route.ts
const contactData = {
  ...validation.data,
  tenant_id: appUser.active_tenant_id,
  location_id: appUser.active_location_id,
  created_by: user.id,
}
```

```30:233:src/lib/automations/prebuilt-workflows.ts
export const DEAL_WORKFLOWS: WorkflowTemplate[] = [
  {
    id: 'deal_created_welcome',
    actions: [
      { type: 'assign_deal', config: { mode: 'round_robin' } },
      { type: 'send_email', config: { template_id: 'deal_welcome' } },
      { type: 'create_task', config: { title: 'Initial contact call', due_in_hours: 2 } }
    ]
  }
]
```

```39:189:src/components/calendar/calendar-analytics-dashboard.tsx
setStats({
  totalAppointments: total,
  completedAppointments: completed,
  cancelledAppointments: cancelled,
  noShowRate: total > 0 ? (noShows / total) * 100 : 0,
  providerUtilization: Array.from(providerMap.values()),
  appointmentsByHour: Array.from(hourMap.entries()).map(([hour, count]) => ({
    hour: format(new Date().setHours(hour), 'ha'),
    appointments: count
  })),
})
```

```93:271:src/lib/ai-context-builder.ts
const context: AIContext = {
  activities: activities?.map(activity => ({
    type: activity.type,
    snippet: activity.snippet || '',
    aiAnalysis
  })) || [],
  tasks: tasks?.map(task => ({
    title: task.title,
    priority: task.priority,
    due: task.due_date || '',
    status: task.status
  })) || [],
}
```

## Follow-up Sequences and Task Escalation
Automations ensure no lead goes cold; overdue tasks escalate automatically and the AI monitor emits events when deals stall.

```240:305:src/lib/automations/prebuilt-workflows.ts
export const TASK_WORKFLOWS: WorkflowTemplate[] = [
  {
    id: 'task_overdue_escalation',
    trigger_type: 'task_overdue',
    actions: [
      { type: 'send_notification', config: { message: 'Task is 24+ hours overdue', to_user: 'assignee' } },
      { type: 'wait', config: { duration: 2, unit: 'hours' }, delay_minutes: 120 },
      { type: 'send_notification', config: { message: 'Task still overdue - escalating', to_role: 'manager' } }
    ]
  }
]
```

```12:128:src/lib/ai-proactive-monitor.ts
if (daysSince > 7) {
  suggestions.push({
    suggestion_type: 'cold_lead',
    suggestion_text: `Deal "${deal.title}" hasn't been contacted in ${daysSince} days.`,
    priority: daysSince > 14 ? 'urgent' : 'high',
    status: 'pending'
  })
  await events.dealAging({
    dealId: deal.id,
    contactId: deal.contact_id,
    tenantId,
    daysSinceLastActivity: daysSince,
    lastActivityAt: lastActivity.toISOString()
  })
}
```

## Re-engagement & Win-Back Campaigns
Inactive contacts automatically enter nurturing tracks, while AI insights flag warm opportunities.

```312:398:src/lib/automations/prebuilt-workflows.ts
export const CONTACT_WORKFLOWS: WorkflowTemplate[] = [
  {
    id: 'contact_inactive_winback',
    trigger_type: 'contact_inactive',
    actions: [
      { type: 'send_email', config: { template_id: 'we_miss_you' } },
      { type: 'wait', config: { duration: 7, unit: 'days' }, delay_minutes: 10080 },
      { type: 'send_email', config: { template_id: 'special_offer' } }
    ]
  }
]
```

## Referral and Pipeline Handling
Deals carry type badges (e.g., referrals) and link directly to patient records so staff can personalize outreach.

```74:139:src/components/pipeline/deal-card.tsx
const getDealTypeLabel = (dealType: string) => {
  switch (dealType) {
    case 'new_lead': return 'New Lead'
    case 'existing_patient': return 'Existing Patient'
    case 'pms_import': return 'PMS Import'
    case 'referral': return 'Referral'
    default: return 'Deal'
  }
}
<Link href={`/contacts/${deal.contact.id}`} className="text-xs text-gray-600">
  {deal.contact.full_name}
</Link>
```

## Scenario Walkthrough: Emergency Caller
1. Patient calls with severe pain; call logged as activity, transcription triggers analysis.
2. Conversation analyzer flags urgency and suggests immediate call-back plus sedation script.
3. Automation listener receives `DEAL.AGING` or urgency events and creates tasks.
4. Dashboard surfaces the case under AI insights, recommending same-day slot.

```12:128:src/lib/ai-proactive-monitor.ts
if (deal.value_estimate_cents > 1000000 && daysSince < 3) {
  const suggestionId = crypto.randomUUID()
  await events.aiSuggestionGenerated({
    suggestionId,
    suggestionType: 'high_value',
    tenantId,
    dealId: deal.id,
    contactId: deal.contact_id,
    priority: 'high'
  })
}
```

```209:366:src/lib/conversation-analyzer.ts
if (urgencyScore > 70) {
  recommendedAction = 'Call immediately - High urgency detected'
}
```

## Summary
Workflows stitch together intake, scheduling, communications, and coaching so that every patient journey—from first inquiry to reactivation—is handled consistently. Receptionists follow a guided path supported by AI checks, ensuring the organisation's promise of democratizing sales excellence becomes routine practice.
