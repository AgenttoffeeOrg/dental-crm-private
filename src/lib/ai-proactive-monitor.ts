import { createServiceClient } from '@/lib/supabase-server'
import OpenAI from 'openai'
import { events } from '@/lib/events-unified'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Proactive AI Monitor
 * Runs in background to detect patterns and generate suggestions
 * NOW WIRED TO AUTOMATION SYSTEM - Emits events that trigger automations
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
    const eventsEmitted = []

    for (const deal of deals) {
      // Calculate days since last activity
      const lastActivity = deal.last_activity_at
        ? new Date(deal.last_activity_at)
        : new Date(deal.created_at)
      const daysSince = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))

      // Cold Lead Detection → Emit DEAL.AGING event
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

        // 🔥 EMIT EVENT - This triggers automations!
        await events.dealAging({
          dealId: deal.id,
          contactId: deal.contact_id,
          tenantId,
          daysSinceLastActivity: daysSince,
          lastActivityAt: lastActivity.toISOString(),
        })
        eventsEmitted.push({ type: 'DEAL.AGING', dealId: deal.id, days: daysSince })
      }

      // High-Value Opportunity Detection → Emit AI.SUGGESTION_GENERATED
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

        // 🔥 EMIT EVENT - Triggers high-value automations!
        const suggestionId = crypto.randomUUID()
        await events.aiSuggestionGenerated({
          suggestionId,
          suggestionType: 'high_value',
          tenantId,
          dealId: deal.id,
          contactId: deal.contact_id,
          priority: 'high',
        })
        eventsEmitted.push({ type: 'AI.SUGGESTION_GENERATED', dealId: deal.id, suggestionType: 'high_value' })
      }

      // Stuck in Stage Detection → Emit PIPELINE.STAGE_SLA_BREACHED
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

        // 🔥 EMIT EVENT - Triggers stage escalation automations!
        if (deal.stage_id && deal.pipeline_id) {
          await events.pipelineStageSLABreached({
            pipelineId: deal.pipeline_id,
            stageId: deal.stage_id,
            dealId: deal.id,
            tenantId,
            maxDays: 14,
            actualDays: stageAge,
          })
          eventsEmitted.push({ type: 'PIPELINE.STAGE_SLA_BREACHED', dealId: deal.id, days: stageAge })
        }
      }
    }

    // Save suggestions to database
    if (suggestions.length > 0) {
      await supabase
        .from('ai_suggestions')
        .insert(suggestions)
    }

    console.log(`[AI Monitor] Processed ${deals.length} deals, created ${suggestions.length} suggestions, emitted ${eventsEmitted.length} automation events`)

    return { suggestions, eventsEmitted }
  } catch (error) {
    console.error('[AI Monitor] Error monitoring deals:', error)
    return { suggestions: [], eventsEmitted: [] }
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


