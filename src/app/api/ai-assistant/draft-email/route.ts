import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase-server'
import { buildDealContext } from '@/lib/ai-context-builder'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { activityId, dealId, contactId, tenantId, incomingEmailContent } = await request.json()

    const supabase = createServiceClient()

    // Build rich context
    let context
    if (dealId) {
      context = await buildDealContext(dealId, tenantId)
    }

    // Build prompt for email draft
    const systemPrompt = `You are a professional dental practice assistant drafting email responses.

GUIDELINES:
1. Be warm, professional, and empathetic
2. Address patient concerns directly
3. Provide clear next steps
4. Include payment plan options for deals over £5,000
5. Mention sedation/comfort options if patient expresses anxiety
6. Keep it concise but thorough
7. Always end with a clear call-to-action
8. Use the practice's professional tone

CONTEXT:
${context ? `
Deal: ${context.deal?.title}
Value: £${context.deal?.value}
Stage: ${context.deal?.stage}
Patient Sentiment: ${context.deal?.intelligence.sentiment}
Likelihood: ${context.deal?.intelligence.likelihoodScore}%

Recent Conversations:
${context.activities.slice(0, 5).map((a: any) => `- ${a.type}: ${a.subject} (${a.snippet})`).join('\n')}

Key Patient Concerns:
${context.activities
  .filter((a: any) => a.aiAnalysis?.painPoints)
  .flatMap((a: any) => a.aiAnalysis.painPoints)
  .slice(0, 5)
  .join(', ')}
` : ''}

INCOMING EMAIL:
${incomingEmailContent}

Draft a professional, empathetic response that:
1. Acknowledges their email
2. Addresses any questions or concerns
3. Provides helpful information
4. Suggests next steps
5. Includes a clear call-to-action

Format:
Subject: [Suggested subject line]

[Email body]

[Professional closing]`

    // Generate draft with GPT-4 Turbo
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    })

    const aiDraft = completion.choices[0].message.content || ''

    // Parse subject and body
    const subjectMatch = aiDraft.match(/Subject:\s*(.+?)$/m)
    const subject = subjectMatch ? subjectMatch[1].trim() : 'Re: Your Inquiry'
    
    // Remove subject line from body
    const body = aiDraft.replace(/Subject:.*$/m, '').trim()

    // Save draft to database
    const { data: draft, error: draftError } = await supabase
      .from('ai_email_drafts')
      .insert({
        tenant_id: tenantId,
        activity_id: activityId,
        deal_id: dealId,
        contact_id: contactId,
        draft_subject: subject,
        draft_body: body,
        generated_by_ai: true,
        status: 'pending'
      })
      .select()
      .single()

    if (draftError) {
      console.error('Error saving draft:', draftError)
      // Don't fail - still return draft even if not saved
    }

    return NextResponse.json({
      success: true,
      draft: {
        id: draft?.id,
        subject,
        body
      },
      tokensUsed: completion.usage?.total_tokens
    })

  } catch (error: any) {
    console.error('Draft email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate draft' },
      { status: 500 }
    )
  }
}


