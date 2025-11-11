import { createServiceClient } from '@/lib/supabase-server'
import { dispatchEmail, dispatchSms, dispatchWhatsApp } from '@/lib/communications/dispatcher'
import { evaluateConversationTurn } from '@/lib/engagement/conversation-state-machine'
import { enqueueEngagementEnrollment } from '@/lib/queues/engagement-queue'
import { isOpenAIConfigured, getOpenAIClient } from '@/lib/openai-client'
import type {
  BotChannel,
  BotSession,
  BotTurn,
  BotTurnRole,
  EngagementEnrollment,
  EngagementEnrollmentStatus,
} from '@/types/database'

interface CreateSessionInput {
  tenantId: string
  contactId?: string
  dealId?: string
  channel: BotChannel
  userId?: string
  metadata?: Record<string, any>
}

interface UserTurnInput {
  tenantId: string
  sessionId: string
  message: string
  metadata?: Record<string, any>
  userId?: string
}

interface EscalationInput {
  tenantId: string
  sessionId: string
  reason?: string
  userId?: string
}

export class BotService {
  private supabase = createServiceClient()

  async getOrCreateSession(input: CreateSessionInput): Promise<BotSession> {
    const { tenantId, contactId, channel } = input

    const { data: existing } = await this.supabase
      .from('bot_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('contact_id', contactId ?? null)
      .eq('channel', channel)
      .in('status', ['active', 'paused', 'handoff_pending'])
      .maybeSingle()

    if (existing) {
      return existing as BotSession
    }

    const context = {
      state: 'collecting_context',
      meta: input.metadata || {},
    }

    const { data, error } = await this.supabase
      .from('bot_sessions')
      .insert({
        tenant_id: tenantId,
        contact_id: contactId ?? null,
        deal_id: input.dealId ?? null,
        channel,
        status: 'active',
        context,
        automation_source: null,
        assigned_user_id: null,
        created_by_user_id: input.userId ?? null,
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        metadata: input.metadata || {},
      })
      .select()
      .single()

    if (error || !data) {
      throw error || new Error('Failed to create bot session')
    }

    return data as BotSession
  }

  async recordTurn(
    tenantId: string,
    sessionId: string,
    role: BotTurnRole,
    message: string,
    metadata?: Record<string, any>,
    intent?: string,
    confidence?: number
  ): Promise<BotTurn> {
    const { data, error } = await this.supabase
      .from('bot_turns')
      .insert({
        tenant_id: tenantId,
        session_id: sessionId,
        role,
        message,
        metadata: metadata || {},
        intent: intent ?? null,
        confidence_score: confidence ?? null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !data) {
      throw error || new Error('Failed to record bot turn')
    }

    await this.supabase
      .from('bot_sessions')
      .update({
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    return data as BotTurn
  }

  async handleUserTurn(input: UserTurnInput) {
    const session = await this.getSessionForUpdate(input.tenantId, input.sessionId)
    if (!session) {
      throw new Error('Session not found')
    }

    const userTurn = await this.recordTurn(input.tenantId, input.sessionId, 'patient', input.message, input.metadata)
    const contextSnapshot = await this.buildConversationSnapshot(session, userTurn)
    const evaluation = evaluateConversationTurn(contextSnapshot)

    await this.updateSessionState(session, evaluation.nextState)
    const results = await this.executeActions(session, evaluation.actions, input)

    return {
      sessionId: session.id,
      nextState: evaluation.nextState,
      actions: evaluation.actions,
      results,
      evaluation,
    }
  }

  async escalateSession(input: EscalationInput) {
    const session = await this.getSessionForUpdate(input.tenantId, input.sessionId)
    if (!session) {
      throw new Error('Session not found')
    }

    await this.supabase
      .from('bot_sessions')
      .update({
        status: 'escalated',
        last_activity_at: new Date().toISOString(),
        context: {
          ...(session.context || {}),
          state: 'escalated',
        },
      })
      .eq('id', session.id)

    await this.supabase.from('bot_escalations').insert({
      tenant_id: input.tenantId,
      session_id: session.id,
      reason: input.reason || 'Manual escalation requested',
      requested_by: input.userId ? 'human' : 'patient',
      status: 'pending',
      assigned_user_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return { sessionId: session.id, status: 'escalated' }
  }

  private async getSessionForUpdate(tenantId: string, sessionId: string): Promise<BotSession | null> {
    const { data } = await this.supabase
      .from('bot_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', sessionId)
      .single()

    return data as BotSession
  }

  private async buildConversationSnapshot(session: BotSession, latestTurn: BotTurn) {
    const { data: turns } = await this.supabase
      .from('bot_turns')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
      .limit(10)

    const { data: enrollments } = await this.supabase
      .from('engagement_enrollments')
      .select('id')
      .eq('tenant_id', session.tenant_id)
      .eq('contact_id', session.contact_id ?? null)
      .in('status', ['pending', 'active', 'waiting'])

    const snapshot = {
      state: (session.context?.state as any) || 'collecting_context',
      channel: session.channel,
      lastTurns: (turns || []).map((turn) => ({
        role: turn.role as BotTurnRole,
        message: turn.message,
        intent: turn.intent || undefined,
        confidence: turn.confidence_score || undefined,
        created_at: turn.created_at,
      })),
      sessionMetadata: session.context?.meta || {},
      sentiment: session.context?.sentiment,
      urgencyScore: session.context?.urgencyScore,
      activeCampaignIds: (enrollments || []).map((enrollment) => enrollment.id),
    }

    if (!snapshot.lastTurns.find((turn) => turn.created_at === latestTurn.created_at)) {
      snapshot.lastTurns.push({
        role: latestTurn.role,
        message: latestTurn.message,
        intent: latestTurn.intent || undefined,
        confidence: latestTurn.confidence_score || undefined,
        created_at: latestTurn.created_at,
      })
    }

    return snapshot
  }

  private async updateSessionState(session: BotSession, nextState: string) {
    const mergedContext = {
      ...(session.context || {}),
      state: nextState,
    }

    await this.supabase
      .from('bot_sessions')
      .update({
        context: mergedContext,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', session.id)
  }

  private async executeActions(
    session: BotSession,
    actions: ReturnType<typeof evaluateConversationTurn>['actions'],
    input: UserTurnInput
  ) {
    const results: Record<string, any>[] = []

    for (const action of actions) {
      switch (action.type) {
        case 'ai_reply': {
          const reply = await this.generateAiReply(session, action)
          const sendResult = await this.sendReply(session, reply, action.channel || session.channel, input)
          results.push({ action: 'ai_reply', reply, sendResult })
          break
        }
        case 'assign_human': {
          await this.escalateSession({
            tenantId: session.tenant_id,
            sessionId: session.id,
            reason: action.reason,
            userId: input.userId,
          })
          results.push({ action: 'assign_human' })
          break
        }
        case 'enqueue_campaign': {
          const enrollment = await this.enqueueCampaign(session, action.campaignId, action.metadata)
          results.push({ action: 'enqueue_campaign', enrollment })
          break
        }
        case 'schedule_follow_up': {
          const enrollment = await this.enqueueFollowUp(session, action.delayMinutes, action.metadata)
          results.push({ action: 'schedule_follow_up', enrollment })
          break
        }
        case 'close_session': {
          await this.closeSession(session.id, action.reason, action.status)
          results.push({ action: 'close_session' })
          break
        }
        default:
          results.push({ action: 'unknown' })
      }
    }

    return results
  }

  private async generateAiReply(session: BotSession, action: { prompt: string; tone?: string }) {
    if (!isOpenAIConfigured()) {
      return 'Thank you for contacting us. A member of our team will follow up shortly.'
    }

    const openai = getOpenAIClient()
    const toneInstruction =
      action.tone === 'empathetic'
        ? 'Respond warmly and reassure the patient.'
        : action.tone === 'concise'
        ? 'Respond with a concise professional tone.'
        : 'Respond with a professional yet friendly tone.'

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `${toneInstruction} Stay under 110 words.` },
        { role: 'user', content: action.prompt },
      ],
      temperature: 0.5,
      max_tokens: 280,
    })

    return completion.choices[0]?.message?.content?.trim() || 'Thank you for the update. We will stay in touch.'
  }

  private async sendReply(
    session: BotSession,
    message: string,
    channel: BotChannel,
    input: UserTurnInput
  ): Promise<Record<string, any>> {
    if (!session.contact_id) {
      return { skipped: true, reason: 'missing_contact' }
    }

    const { data: contact } = await this.supabase
      .from('contacts')
      .select('id, primary_email, primary_phone')
      .eq('id', session.contact_id)
      .single()

    if (channel === 'email' || channel === 'web') {
      if (!contact?.primary_email) {
        return { skipped: true, reason: 'missing_email' }
      }
      const result = await dispatchEmail({
        context: {
          tenantId: session.tenant_id,
          userId: input.userId,
          contactId: contact.id,
          dealId: session.deal_id ?? null,
        },
        to: [contact.primary_email],
        subject: 'Dental Sales Coach Follow-up',
        html: `<p>${message}</p>`,
      })

      await this.recordTurn(session.tenant_id, session.id, 'bot', message, { channel })
      return { channel, result }
    }

    if (channel === 'whatsapp') {
      if (!contact?.primary_phone) {
        return { skipped: true, reason: 'missing_phone' }
      }
      const result = await dispatchWhatsApp({
        context: {
          tenantId: session.tenant_id,
          userId: input.userId,
          contactId: session.contact_id,
          dealId: session.deal_id ?? null,
        },
        to: contact.primary_phone,
        message,
      })

      await this.recordTurn(session.tenant_id, session.id, 'bot', message, { channel })
      return { channel, result }
    }

    if (channel === 'sms' || channel === 'voice') {
      if (!contact?.primary_phone) {
        return { skipped: true, reason: 'missing_phone' }
      }
      const result = await dispatchSms({
        context: {
          tenantId: session.tenant_id,
          userId: input.userId,
          contactId: session.contact_id,
          dealId: session.deal_id ?? null,
        },
        to: contact.primary_phone,
        message,
      })

      await this.recordTurn(session.tenant_id, session.id, 'bot', message, { channel })
      return { channel, result }
    }

    return { skipped: true, reason: 'unsupported_channel' }
  }

  private async enqueueCampaign(session: BotSession, campaignId: string, metadata?: Record<string, any>) {
    const enrollment: Partial<EngagementEnrollment> = {
      tenant_id: session.tenant_id,
      campaign_id: campaignId,
      contact_id: session.contact_id ?? null,
      deal_id: session.deal_id ?? null,
      status: 'pending',
      context: metadata || {},
    }

    const { data, error } = await this.supabase
      .from('engagement_enrollments')
      .insert(enrollment)
      .select()
      .single()

    if (error || !data) {
      throw error || new Error('Failed to enroll contact into campaign')
    }

    await enqueueEngagementEnrollment(data.id, 0)

    return data
  }

  private async enqueueFollowUp(session: BotSession, delayMinutes: number, metadata?: Record<string, any>) {
    const followUpCampaignId = metadata?.campaignId || 'follow-up-default'

    const { data } = await this.supabase
      .from('engagement_enrollments')
      .insert({
        tenant_id: session.tenant_id,
        campaign_id: followUpCampaignId,
        contact_id: session.contact_id ?? null,
        deal_id: session.deal_id ?? null,
        status: 'waiting' as EngagementEnrollmentStatus,
        context: metadata || {},
        next_run_at: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (data) {
      await enqueueEngagementEnrollment(data.id, delayMinutes * 60 * 1000)
    }

    return data
  }

  private async closeSession(sessionId: string, reason: string, status?: string) {
    await this.supabase
      .from('bot_sessions')
      .update({
        status: status || 'closed',
        closed_at: new Date().toISOString(),
        context: {
          state: 'closed',
          reason,
        },
      })
      .eq('id', sessionId)
  }
}

export const botService = new BotService()


