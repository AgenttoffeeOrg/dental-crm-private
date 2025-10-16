import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { buildDealContext, buildContactContext, buildGlobalContext } from '@/lib/ai-context-builder'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { context, contextId, question, messages, tenantId } = await request.json()

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    // Build rich context based on type
    let aiContext
    const tid = tenantId || appUser.tenant_id

    switch (context) {
      case 'deal':
        if (!contextId) throw new Error('Deal ID required')
        aiContext = await buildDealContext(contextId, tid)
        break
      case 'contact':
        if (!contextId) throw new Error('Contact ID required')
        aiContext = await buildContactContext(contextId, tid)
        break
      case 'global':
        aiContext = await buildGlobalContext(tid)
        break
      default:
        throw new Error('Invalid context type')
    }

    // Build SMART system prompt
    const systemPrompt = buildSystemPrompt(aiContext)

    // Build context summary for AI
    const contextSummary = buildContextSummary(aiContext)

    // Prepare messages for GPT-4 Turbo
    const aiMessages: any[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'system',
        content: `CURRENT CONTEXT:\n${contextSummary}`
      }
    ]

    // Add conversation history
    if (messages && messages.length > 1) {
      messages.slice(1).forEach((msg: any) => {
        if (msg.role !== 'system') {
          aiMessages.push({
            role: msg.role,
            content: msg.content
          })
        }
      })
    }

    // Add current question
    aiMessages.push({
      role: 'user',
      content: question
    })

    // Call GPT-4 Turbo
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: aiMessages,
      temperature: 0.7,
      max_tokens: 1000,
      presence_penalty: 0.6,
      frequency_penalty: 0.3
    })

    const aiResponse = completion.choices[0].message.content

    // Detect if AI should suggest actions
    const suggestedActions = detectSuggestedActions(aiResponse, aiContext)

    return NextResponse.json({
      response: aiResponse,
      suggestedActions,
      tokensUsed: completion.usage?.total_tokens,
      model: completion.model
    })

  } catch (error: any) {
    console.error('AI Assistant Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get AI response' },
      { status: 500 }
    )
  }
}

function buildSystemPrompt(context: any): string {
  const basePrompt = `You are an advanced AI assistant for a dental practice CRM system. You are EXTREMELY intelligent, detail-oriented, and proactive.

YOUR ROLE:
- Help dental practice staff manage deals, patients, and tasks
- Provide deep insights from conversation analysis
- Draft professional, empathetic emails
- Suggest smart next actions based on data
- Identify patterns and opportunities

YOUR CAPABILITIES:
- Access to complete conversation history (calls, emails, WhatsApp, notes)
- AI transcription and sentiment analysis
- Deal intelligence scoring (likelihood, health, sentiment)
- Patient history and lifetime value
- Practice-wide analytics

YOUR PERSONALITY:
- Professional yet warm
- Detail-oriented and thorough
- Proactive with suggestions
- Empathetic about patient concerns
- Data-driven but human-centered

USER PREFERENCES:
${JSON.stringify(context.userPreferences, null, 2)}

CUSTOM RULES (ALWAYS FOLLOW THESE):
${context.userPreferences.customRules.map((rule: string, i: number) => `${i + 1}. ${rule}`).join('\n')}

RESPONSE GUIDELINES:
1. Be specific and actionable
2. Reference actual conversation data when possible
3. Provide concrete next steps
4. Highlight important concerns or opportunities
5. Use emojis sparingly but effectively for clarity
6. Always be accurate - if you don't know, say so
7. Suggest drafts, tasks, or actions when appropriate
8. Consider deal value and likelihood in recommendations
9. Be empathetic when discussing patient concerns
10. Think like a top-performing treatment coordinator`

  return basePrompt
}

function buildContextSummary(context: any): string {
  let summary = ''

  if (context.deal) {
    summary += `DEAL INFORMATION:
- Title: ${context.deal.title}
- Value: £${context.deal.value.toLocaleString()}
- Stage: ${context.deal.stage} (in ${context.deal.pipeline} pipeline)
- Tags: ${context.deal.tags.join(', ')}
- Created: ${new Date(context.deal.created).toLocaleDateString()}
- Last Activity: ${context.deal.intelligence.lastContactDays} days ago

DEAL INTELLIGENCE:
- Likelihood to Close: ${context.deal.intelligence.likelihoodScore}%
- Health Status: ${context.deal.intelligence.healthStatus}
- Patient Sentiment: ${context.deal.intelligence.sentiment}
- Urgency: ${context.deal.intelligence.urgency}
- Total Conversations: ${context.deal.intelligence.conversationCount}

`
  }

  if (context.contact) {
    summary += `PATIENT INFORMATION:
- Name: ${context.contact.fullName}
- Email: ${context.contact.email}
- Phone: ${context.contact.phone}
- Lifetime Value: £${context.contact.lifetimeValue.toLocaleString()}
- Total Deals: ${context.contact.totalDeals} (${context.contact.activeDeals} active)
${context.contact.medicalHistory ? `- Medical Notes: ${context.contact.medicalHistory}` : ''}
${context.contact.dentalHistory ? `- Dental History: ${context.contact.dentalHistory}` : ''}

`
  }

  if (context.activities && context.activities.length > 0) {
    summary += `CONVERSATION HISTORY (Last ${Math.min(context.activities.length, 20)} interactions):

`
    context.activities.slice(0, 20).forEach((activity: any, i: number) => {
      summary += `${i + 1}. ${activity.type.toUpperCase()} - ${new Date(activity.occurredAt).toLocaleDateString()}
   Subject: ${activity.subject}
   ${activity.snippet ? `Notes: ${activity.snippet}` : ''}
   ${activity.aiAnalysis ? `
   AI Analysis:
   - Purpose: ${activity.aiAnalysis.callPurpose}
   - Sentiment: ${activity.aiAnalysis.sentiment}
   - Pain Points: ${activity.aiAnalysis.painPoints.join(', ')}
   - Actions Needed: ${activity.aiAnalysis.immediateActions.join(', ')}
   ` : ''}
   ${activity.transcription ? `Transcript: ${activity.transcription.substring(0, 500)}...` : ''}

`
    })
  }

  if (context.tasks && context.tasks.length > 0) {
    summary += `RELATED TASKS:
${context.tasks.map((task: any, i: number) => `${i + 1}. [${task.status}] ${task.title} - Due: ${task.due}`).join('\n')}

`
  }

  if (context.practiceStats) {
    summary += `PRACTICE STATISTICS:
- Total Active Deals: ${context.practiceStats.totalDeals}
- Total Pipeline Value: £${context.practiceStats.totalValue.toLocaleString()}
- Average Close Rate: ${context.practiceStats.averageCloseRate.toFixed(1)}%
- Top Pipeline: ${context.practiceStats.topPerformingPipeline}

`
  }

  return summary
}

function detectSuggestedActions(response: string, context: any): any[] {
  const actions = []

  // Detect if AI suggested drafting an email
  if (response.toLowerCase().includes('draft') && response.toLowerCase().includes('email')) {
    actions.push({
      type: 'draft_email',
      label: 'Draft Email',
      icon: 'mail',
      data: { suggestion: true }
    })
  }

  // Detect if AI suggested creating a task
  if (response.toLowerCase().includes('task') || response.toLowerCase().includes('follow up')) {
    actions.push({
      type: 'create_task',
      label: 'Create Task',
      icon: 'check-square'
    })
  }

  // Detect if AI suggested scheduling
  if (response.toLowerCase().includes('schedule') || response.toLowerCase().includes('appointment')) {
    actions.push({
      type: 'schedule',
      label: 'Schedule',
      icon: 'calendar'
    })
  }

  return actions
}


