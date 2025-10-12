import { createServiceClient } from '@/lib/supabase-server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Proactive AI Monitor
 * Runs in background to detect patterns and generate suggestions
 */

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

    if (!deals) return

    const suggestions = []

    for (const deal of deals) {
      // Calculate days since last activity
      const lastActivity = deal.last_activity_at
        ? new Date(deal.last_activity_at)
        : new Date(deal.created_at)
      const daysSince = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))

      // Cold Lead Detection
      if (daysSince > 7) {
        suggestions.push({
          tenant_id: tenantId,
          deal_id: deal.id,
          contact_id: deal.contact_id,
          suggestion_type: 'cold_lead',
          suggestion_text: `Deal "${deal.title}" hasn't been contacted in ${daysSince} days. High risk of losing this ${deal.value_estimate_cents > 500000 ? 'high-value ' : ''}lead.`,
          priority: daysSince > 14 ? 'urgent' : 'high',
          status: 'pending'
        })
      }

      // High-Value Opportunity Detection
      if (deal.value_estimate_cents > 1000000 && daysSince < 3) {
        suggestions.push({
          tenant_id: tenantId,
          deal_id: deal.id,
          contact_id: deal.contact_id,
          suggestion_type: 'high_value',
          suggestion_text: `High-value opportunity: "${deal.title}" (£${deal.value_estimate_cents / 100}) is active and engaged. Prioritize closing this week.`,
          priority: 'high',
          status: 'pending'
        })
      }

      // Stuck in Stage Detection
      const stageAge = deal.pipeline_stage_updated_at
        ? Math.floor((Date.now() - new Date(deal.pipeline_stage_updated_at).getTime()) / (1000 * 60 * 60 * 24))
        : daysSince

      if (stageAge > 14) {
        suggestions.push({
          tenant_id: tenantId,
          deal_id: deal.id,
          contact_id: deal.contact_id,
          suggestion_type: 'stuck_deal',
          suggestion_text: `Deal stuck in "${deal.stage?.name}" stage for ${stageAge} days. Consider moving forward or addressing blockers.`,
          priority: 'medium',
          status: 'pending'
        })
      }
    }

    // Save suggestions to database
    if (suggestions.length > 0) {
      await supabase
        .from('ai_suggestions')
        .insert(suggestions)
    }

    return suggestions
  } catch (error) {
    console.error('Error monitoring deals:', error)
    return []
  }
}

export async function generateDailyBriefing(tenantId: string, userId: string): Promise<string> {
  const supabase = createServiceClient()

  try {
    // Fetch user's deals
    const { data: deals } = await supabase
      .from('deals')
      .select(`
        *,
        contact:contacts(*),
        stage:pipeline_stages(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('owner_user_id', userId)
      .eq('status', 'open')

    if (!deals || deals.length === 0) {
      return "You have no active deals at the moment. Great time to follow up on past leads or prospect for new patients!"
    }

    // Analyze with GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Generate a smart daily briefing for a dental practice team member.

They have ${deals.length} active deals:
${deals.map(d => `- ${d.title}: £${d.value_estimate_cents / 100}, Stage: ${d.stage?.name}`).join('\n')}

Provide:
1. Quick overview (total deals, total value)
2. Top 3-5 priority deals to focus on today (with reasoning)
3. Any urgent actions needed
4. Deals at risk of going cold
5. Motivational insight

Be specific, actionable, and encouraging!`
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    })

    return completion.choices[0].message.content || 'Briefing unavailable'
  } catch (error) {
    console.error('Error generating briefing:', error)
    return 'Failed to generate daily briefing'
  }
}

