import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { buildDealContext, buildContactContext } from '@/lib/ai-context-builder'
import { createServiceClient } from '@/lib/supabase-server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { action, context, contextId, data, tenantId } = await request.json()

    const tid = tenantId || appUser.tenant_id
    let aiContext

    // Build context based on type
    switch (context) {
      case 'deal':
        aiContext = await buildDealContext(contextId, tid)
        break
      case 'contact':
        aiContext = await buildContactContext(contextId, tid)
        break
      default:
        return NextResponse.json({ error: 'Invalid context' }, { status: 400 })
    }

    let response = ''
    let nextActions = []

    // Execute action
    switch (action) {
      case 'draft_email':
        response = await generateEmailDraft(aiContext)
        nextActions = [
          { type: 'create_task', label: 'Create Follow-up Task', icon: 'check-square' },
          { type: 'schedule', label: 'Schedule Send', icon: 'calendar' }
        ]
        break

      case 'summarize':
        response = await generateDealSummary(aiContext)
        nextActions = [
          { type: 'draft_email', label: 'Draft Email', icon: 'mail' },
          { type: 'create_task', label: 'Create Task', icon: 'check-square' }
        ]
        break

      case 'create_task':
        response = await generateTaskSuggestions(aiContext)
        break

      case 'schedule':
        response = "I can help you schedule! Here are good times based on patient availability:\n\n" +
                   "• Tomorrow 2:00 PM - 4:00 PM\n" +
                   "• Wednesday 10:00 AM - 12:00 PM\n" +
                   "• Friday 3:00 PM - 5:00 PM\n\n" +
                   "Would you like me to send a booking link?"
        break

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    return NextResponse.json({
      response,
      nextActions
    })

  } catch (error: any) {
    console.error('Action error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to execute action' },
      { status: 500 }
    )
  }
}

async function generateEmailDraft(context: any): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `Draft a professional follow-up email based on this context:

Deal: ${context.deal?.title}
Value: £${context.deal?.value}
Stage: ${context.deal?.stage}
Sentiment: ${context.deal?.intelligence.sentiment}
Last Contact: ${context.deal?.intelligence.lastContactDays} days ago

Recent Conversations:
${context.activities.slice(0, 3).map((a: any) => `- ${a.subject}: ${a.snippet}`).join('\n')}

Draft a warm, professional email that:
1. References recent conversations
2. Addresses any concerns
3. Provides clear next steps
4. Includes a call-to-action
5. Mentions payment options if deal >£5k`
      }
    ],
    temperature: 0.7,
    max_tokens: 600
  })

  return completion.choices[0].message.content || 'Failed to generate draft'
}

async function generateDealSummary(context: any): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `Provide a comprehensive deal summary:

Deal: ${context.deal?.title}
Value: £${context.deal?.value}
Patient: ${context.contact?.fullName}
Conversations: ${context.deal?.intelligence.conversationCount}

All Activities:
${context.activities.map((a: any, i: number) => 
  `${i + 1}. ${a.type} - ${a.subject}
   ${a.snippet}
   ${a.aiAnalysis ? `Sentiment: ${a.aiAnalysis.sentiment}, Pain Points: ${a.aiAnalysis.painPoints.join(', ')}` : ''}`
).join('\n\n')}

Provide:
1. Executive summary
2. Patient sentiment and engagement level
3. Key concerns or pain points
4. What they want/need
5. Recommended next actions
6. Likelihood assessment with reasoning`
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  })

  return completion.choices[0].message.content || 'Failed to generate summary'
}

async function generateTaskSuggestions(context: any): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `Based on this deal context, suggest specific, actionable tasks:

Deal: ${context.deal?.title} (£${context.deal?.value})
Stage: ${context.deal?.stage}
Last Contact: ${context.deal?.intelligence.lastContactDays} days ago
Sentiment: ${context.deal?.intelligence.sentiment}

Suggest 3-5 specific tasks with:
- Task title
- Description
- Priority (high/medium/low)
- Why it's important
- When to do it (timing)`
      }
    ],
    temperature: 0.7,
    max_tokens: 600
  })

  return completion.choices[0].message.content || 'Failed to generate tasks'
}


