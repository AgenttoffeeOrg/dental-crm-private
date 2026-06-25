# Sales Enablement Systems

## Guiding Philosophy
Dental CRM treats every receptionist as a treatment coordinator by embedding coaching, scripts, and urgency signals directly inside day-to-day workflows.

## Real-Time Conversation Guidance
The AI assistant monitors context and provides instant quick actions—drafting emails, summarizing calls, or scheduling follow-ups with one click.

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

## Conversation Intelligence & Objection Handling
Automated analyses distill patient pain points, sentiment, budget concerns, and recommended actions so staff can respond empathetically and decisively.

```209:366:src/lib/conversation-analyzer.ts
const keywords = analyzeText(text)
allKeywords.urgency.push(...keywords.urgencyKeywords)
allKeywords.value.push(...keywords.valueKeywords)
const sentimentScore = totalSentiment === 0 ? 0 : (positiveCount - negativeCount) / totalSentiment
let recommendedAction: string | undefined
if (urgencyScore > 70) {
  recommendedAction = 'Call immediately - High urgency detected'
} else if (budgetConcerns) {
  recommendedAction = 'Discuss payment options'
}
// ... existing code ...
```

## Automated Follow-up & Objection Playbooks
Ready-made automation templates ensure every milestone triggers consistent outreach, reminders, and task creation.

```30:233:src/lib/automations/prebuilt-workflows.ts
export const DEAL_WORKFLOWS: WorkflowTemplate[] = [
  {
    id: 'deal_lost_feedback',
    description: 'When deal is lost, send feedback survey and add to re-engagement nurture',
    actions: [
      { type: 'send_email', config: { template_id: 'feedback_request' } },
      { type: 'add_to_segment', config: { segment_name: 'Lost - Re-engagement' } }
    ]
  },
  {
    id: 'deal_aging_reminder',
    description: 'When deal is inactive for 7+ days, send reminder to owner and create follow-up task',
    actions: [
      { type: 'send_notification', config: { message: 'Deal has been inactive for 7+ days', priority: 'high', to_user: 'owner' } },
      { type: 'create_task', config: { title: 'Follow up on inactive deal', priority: 'high', due_in_hours: 24 } }
    ]
  }
]
```

## Priority Surfacing and Win Coaching
Dashboards pair classic KPIs with AI-written insights so staff know which deals to recover, which highs to celebrate, and how to phrase outreach.

```22:186:src/components/dashboard/ai-insights-widget.tsx
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
```

```125:183:src/lib/dashboard-analytics.ts
const { count: totalDeals } = await supabase
  .from('deals')
  .select('id', { count: 'exact', head: true })
  .eq('tenant_id', tenantId)
const { count: wonDeals } = await supabase
  .from('deals')
  .select('id', { count: 'exact', head: true })
  .eq('tenant_id', tenantId)
  .in('stage_id', wonStageIds)
const rate = (wonDeals / totalDeals) * 100
return Math.round(rate * 10) / 10
```

## Communication Templates & Assistive Tools
Inside each contact, receptionists can launch dialers, AI-drafted SMS/emails, and deal creation without leaving context.

```188:248:src/components/contacts/contact-detail-view.tsx
<div className="flex items-center gap-3 flex-1 min-w-0">
  <Mail className="h-4 w-4 text-gray-400" />
  {contact.primary_email ? (
    <button onClick={() => setEmailComposerOpen(true)} className="text-sm text-blue-600">
      {contact.primary_email}
    </button>
  ) : (
    <span className="text-sm text-gray-400 italic">No email address</span>
  )}
</div>
<Button size="sm" variant="ghost" onClick={() => setEmailComposerOpen(true)}>
  <Mail className="h-3 w-3 mr-1" />
  Send
</Button>
<Button size="sm" variant="ghost" onClick={() => setCallDialerOpen(true)}>
  <PhoneCall className="h-3 w-3 mr-1" />
  Call
</Button>
```

## Pipeline Coaching & Referral Tracking
Deal cards highlight lead type, allow drag-and-drop stage movement, and expose quick actions to keep momentum.

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

## Outcomes Measurement
Automation events and AI monitors ensure leadership can inspect which scripts drive conversions and where opportunities stall.

```12:128:src/lib/ai-proactive-monitor.ts
if (stageAge > 14) {
  suggestions.push({
    suggestion_type: 'stuck_deal',
    suggestion_text: `Deal stuck in "${deal.stage?.name}" stage for ${stageAge} days.`,
    priority: 'medium',
    status: 'pending'
  })
  await events.pipelineStageSLABreached({
    pipelineId: deal.pipeline_id,
    stageId: deal.stage_id,
    dealId: deal.id,
    tenantId,
    maxDays: 14,
    actualDays: stageAge,
  })
}
```

## Summary
With contextual prompts, ready-made objection scripts, automated follow-ups, and metrics-driven coaching, Dental CRM brings enterprise-grade sales enablement to the dental front desk. Receptionists receive just-in-time intelligence and tooling to convert hesitant patients into confident treatment commitments.
