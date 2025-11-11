# AI Workflows and Automations

## Strategy Overview
Dental CRM blends deterministic automations with AI reasoning so front-office teams receive context, coaching, and follow-up plans without leaving the CRM.

## Context Assembly Pipeline
`buildDealContext`, `buildContactContext`, and `buildGlobalContext` gather pipeline, activity, AI artifact, and preference data before any model call.

```93:271:src/lib/ai-context-builder.ts
export async function buildDealContext(dealId: string, tenantId: string): Promise<AIContext> {
  const supabase = createServiceClient()
  const { data: deal } = await supabase
    .from('deals')
    .select(`
      *,
      contact:contacts(*),
      stage:pipeline_stages(*),
      pipeline:pipelines(*),
      owner:app_users(*)
    `)
    .eq('id', dealId)
    .single()
  // ... existing code ...
  const context: AIContext = {
    contextType: 'deal',
    timestamp: new Date().toISOString(),
    deal: {
      title: deal.title,
      tags: deal.treatment_tags || [],
      intelligence: {
        likelihoodScore,
        healthStatus: likelihoodScore > 70 ? 'good' : likelihoodScore > 40 ? 'fair' : 'poor',
        sentiment,
        urgency: lastContactDays < 3 ? 'high' : 'medium'
      }
    },
    contact: {
      fullName: deal.contact.full_name,
      lifetimeValue: lifetimeValue / 100,
      totalDeals: deals?.length || 0
    },
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
    userPreferences: await loadUserPreferences(tenantId)
  }
}
```

## Conversational Intelligence Extraction
Text and artifacts feed a rule-based analyzer that scores urgency, sentiment, engagement, and recommended actions for downstream prompts and dashboards.

```19:366:src/lib/conversation-analyzer.ts
export async function analyzeConversations(
  activities: Activity[],
  tenantId: string,
  aiArtifacts?: AIArtifact[]
): Promise<ConversationAnalysis> {
  const text = extractActivityText(activity, aiArtifacts)
  const keywords = analyzeText(text)
  allKeywords.urgency.push(...keywords.urgencyKeywords)
  allKeywords.positive.push(...keywords.positiveKeywords)
  // ... existing code ...
  const sentimentScore = totalSentiment === 0 ? 0 : (positiveCount - negativeCount) / totalSentiment
  const { score: engagementScore, daysSinceLastActivity } = calculateEngagementScore(activities)
  return {
    treatmentCategories,
    urgencyScore,
    sentimentScore,
    engagementScore,
    recommendedAction,
    keywordsFound: [...new Set([...allKeywords.urgency, ...allKeywords.highValue])],
    lastActivityDate: sortedActivities[0]?.occurred_at,
    daysSinceLastActivity
  }
}
```

## LLM Orchestration and Prompting
When users request AI support, the server route injects SMART prompts, context summaries, and conversation history before calling GPT-4 Turbo.

```6:92:src/app/api/ai-assistant/chat/route.ts
export async function POST(request: NextRequest) {
  const { context, contextId, question, messages, tenantId } = await request.json()
  // ... existing code ...
  const systemPrompt = buildSystemPrompt(aiContext)
  const contextSummary = buildContextSummary(aiContext)
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: aiMessages,
    temperature: 0.7,
    max_tokens: 1000
  })
  const suggestedActions = detectSuggestedActions(aiResponse, aiContext)
  return NextResponse.json({ response: aiResponse, suggestedActions })
}
```

## Proactive Monitoring & Suggestion Engine
Scheduled jobs scan the funnel, generate tasks, and emit events that kick off automations without waiting for a human prompt.

```12:128:src/lib/ai-proactive-monitor.ts
export async function monitorDealsForSuggestions(tenantId: string) {
  const supabase = createServiceClient()

  try {
    // Fetch all active deals
    const { data: deals } = await supabase
      .from('deals')
      .select(`
        *,
        contact:contacts(*),
        stage:pipeline_stages(*),
        pipeline:pipelines(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'open')
    // ... existing code ...
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
    if (deal.value_estimate_cents > 1000000 && daysSince < 3) {
      const suggestionId = crypto.randomUUID()
      suggestions.push({
        suggestion_type: 'high_value',
        suggestion_text: `High-value opportunity: "${deal.title}" (£${deal.value_estimate_cents / 100}) is active and engaged. Prioritize closing this week.`,
        priority: 'high',
        status: 'pending'
      })
      await events.aiSuggestionGenerated({
        suggestionId,
        suggestionType: 'high_value',
        tenantId,
        dealId: deal.id,
        contactId: deal.contact_id,
        priority: 'high'
      })
    }
  } catch (error) {
    console.error('[AI Monitor] Error monitoring deals:', error)
    return { suggestions: [], eventsEmitted: [] }
  }
}
```

## Event-Driven Automation Routing
A dedicated listener maps events onto automation triggers and launches journeys through the marketing automation engine.

```23:199:src/lib/automations/automation-event-listener.ts
const EVENT_TO_TRIGGER_MAP: Partial<Record<keyof EventMap, string>> = {
  'DEAL.CREATED': 'deal_created',
  'DEAL.AGING': 'deal_aging',
  'CONTACT.INACTIVE': 'contact_inactive',
  'AI.SUGGESTION_GENERATED': 'ai_suggestion',
  // ... existing code ...
}
export class AutomationEventListener {
  startListening(): void {
    Object.keys(EVENT_TO_TRIGGER_MAP).forEach(eventType => {
      const unsubscribe = eventService.on(
        eventType as keyof EventMap,
        async (data) => {
          await this.handleEvent(eventType as keyof EventMap, data)
        }
      )
      this.unsubscribers.push(unsubscribe)
    })
  }
  private async handleEvent<K extends keyof EventMap>(eventType: K, eventData: EventMap[K]): Promise<void> {
    const triggerType = EVENT_TO_TRIGGER_MAP[eventType]
    const matchingAutomations = await this.findMatchingAutomations(tenantId, triggerType, eventData)
    for (const automation of matchingAutomations) {
      const runId = await this.automationEngine.startJourney(
        automation.id,
        effectiveContactId,
        { eventType, eventData }
      )
      triggeredAutomationIds.push(automation.id)
      automationRunIds.push(runId)
    }
  }
}
```

## Workflow Execution Tracking
Each automation run captures state, wait conditions, and outcomes so product and AI teams can audit journeys.

```135:175:supabase/migrations/20250116_automations_standalone_tables.sql
CREATE TABLE IF NOT EXISTS automation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    state TEXT NOT NULL CHECK (state IN ('running', 'waiting', 'completed', 'failed', 'cancelled')) DEFAULT 'running',
    current_node_key TEXT,
    nodes_completed TEXT[] DEFAULT '{}',
    waiting_until TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    total_execution_time_ms INTEGER
);
```

## Insight Generation & Coaching
Local analytics produce actionable AI insights without external calls, meaning the system can coach staff daily even when LLM credits are exhausted.

```29:170:src/lib/ai-insights.ts
if (growth > 20) {
  insights.push({
    id: 'revenue-surge',
    type: 'success',
    title: '🚀 Revenue Surge Detected',
    description: `Revenue is up ${growth.toFixed(1)}% this month!`,
    impact: 'high',
    confidence: 95
  })
}
if (growth < -20) {
  insights.push({
    id: 'revenue-decline',
    type: 'warning',
    title: '⚠️ Revenue Decline Alert',
    description: `Revenue is down ${Math.abs(growth).toFixed(1)}% this month. Review pipeline and follow up with stalled deals.`,
    action: {
      label: 'View Pipeline',
      url: '/pipeline'
    },
    impact: 'high',
    confidence: 95
  })
}
```

## Workflow Narrative
1. Intake events (form submissions, missed calls, manual creation) emit unified events.
2. `buildDealContext` assembles the relevant patient story.
3. AI assistant or proactive monitor decides whether to respond immediately, create a suggestion, or trigger a template.
4. Automation journeys execute nodes (emails, tasks, waits) and log outcomes in `automation_runs`.
5. Local analytics summarize the impact and surface it back on dashboards for the next shift.

## Summary
The AI stack captures raw interactions, distills them into contextual insights, and executes consistent follow-up journeys. This loop gives every receptionist the situational awareness, scripts, and accountability typically reserved for seasoned treatment coordinators, fulfilling the mission to democratize sales excellence for dental practices.
