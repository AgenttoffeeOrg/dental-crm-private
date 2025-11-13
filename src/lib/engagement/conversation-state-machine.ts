import type { BotChannel, BotSessionStatus, BotTurnRole } from '@/types/database'

export type ConversationState =
  | 'collecting_context'
  | 'qualifying'
  | 'booking'
  | 'handoff_pending'
  | 'escalated'
  | 'closed'

export type ConversationAction =
  | { type: 'ai_reply'; prompt: string; tone?: 'empathetic' | 'professional' | 'concise'; channel?: BotChannel }
  | { type: 'assign_human'; reason: string }
  | { type: 'enqueue_campaign'; campaignId: string; metadata?: Record<string, any> }
  | { type: 'schedule_follow_up'; delayMinutes: number; metadata?: Record<string, any> }
  | { type: 'close_session'; reason: string; status?: BotSessionStatus }

export interface ConversationTurn {
  role: BotTurnRole
  message: string
  intent?: string
  confidence?: number
  created_at: string
}

export interface ConversationContextSnapshot {
  state: ConversationState
  channel: BotChannel
  lastTurns: ConversationTurn[]
  sessionMetadata?: Record<string, any>
  sentiment?: 'positive' | 'neutral' | 'negative'
  urgencyScore?: number
  activeCampaignIds?: string[]
}

export interface ConversationEvaluation {
  nextState: ConversationState
  actions: ConversationAction[]
  confidence: number
  reasoning: string
}

const HUMAN_ESCALATION_KEYWORDS = [
  'speak to human',
  'human',
  'agent',
  'representative',
  'real person',
  'call me',
  'phone me',
  'talk to someone',
  'escalate',
]

const BOOKING_KEYWORDS = ['book', 'appointment', 'schedule', 'slot', 'visit', 'consult']
const URGENT_KEYWORDS = ['emergency', 'urgent', 'bleeding', 'pain', 'swelling', 'infection']
const NEGATIVE_SENTIMENT_KEYWORDS = ['upset', 'angry', 'frustrated', 'cancel', 'complaint']

function containsKeyword(message: string, keywords: string[]): boolean {
  const lower = message.toLowerCase()
  return keywords.some((keyword) => lower.includes(keyword))
}

function detectEscalationIntent(turn: ConversationTurn): boolean {
  return containsKeyword(turn.message, HUMAN_ESCALATION_KEYWORDS) || (turn.intent === 'human_escalation' && (turn.confidence || 0) > 0.6)
}

function detectBookingIntent(turn: ConversationTurn): boolean {
  return containsKeyword(turn.message, BOOKING_KEYWORDS) || (turn.intent === 'appointment_request' && (turn.confidence || 0) > 0.5)
}

function detectUrgency(turn: ConversationTurn): boolean {
  return containsKeyword(turn.message, URGENT_KEYWORDS)
}

function detectNegativeSentiment(turn: ConversationTurn): boolean {
  return containsKeyword(turn.message, NEGATIVE_SENTIMENT_KEYWORDS)
}

export function evaluateConversationTurn(context: ConversationContextSnapshot): ConversationEvaluation {
  const turns = [...context.lastTurns].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const latest = turns[turns.length - 1]

  const actions: ConversationAction[] = []
  let nextState: ConversationState = context.state
  const reasoning: string[] = []
  let confidence = 0.6

  if (!latest) {
    reasoning.push('No conversation turns yet, staying in collecting_context')
    return { nextState: 'collecting_context', actions, confidence: 0.4, reasoning: reasoning.join(' | ') }
  }

  if (latest.role === 'patient') {
    if (detectEscalationIntent(latest)) {
      actions.push({ type: 'assign_human', reason: 'Caller explicitly requested a human agent' })
      nextState = 'escalated'
      reasoning.push('Escalation keywords detected')
      confidence = Math.max(confidence, 0.85)
    } else if (detectUrgency(latest)) {
      actions.push({ type: 'assign_human', reason: 'Urgent or emergency keywords present' })
      nextState = 'handoff_pending'
      reasoning.push('Urgency keywords detected')
      confidence = Math.max(confidence, 0.8)
    } else if (detectNegativeSentiment(latest) || context.sentiment === 'negative') {
      actions.push({ type: 'assign_human', reason: 'Negative sentiment identified, safer to escalate' })
      nextState = 'handoff_pending'
      reasoning.push('Negative sentiment identified')
      confidence = Math.max(confidence, 0.75)
    } else if (detectBookingIntent(latest)) {
      nextState = 'booking'
      reasoning.push('Booking intent detected')
      confidence = Math.max(confidence, 0.7)
      actions.push({
        type: 'ai_reply',
        prompt:
          'The patient wants to schedule an appointment. Gather preferred date/time, treatment interest, and confirm contact details. Provide reassurance and next steps.',
        tone: 'professional',
        channel: context.channel,
      })
    } else if (context.state === 'collecting_context') {
      reasoning.push('Continuing context collection')
      actions.push({
        type: 'ai_reply',
        prompt:
          'Collect key information (patient name, concern, preferred contact method). Keep response concise and empathetic. Ask clarifying question if needed.',
        tone: 'empathetic',
        channel: context.channel,
      })
      nextState = 'qualifying'
      confidence = Math.max(confidence, 0.65)
    } else if (context.state === 'qualifying') {
      reasoning.push('Qualifying conversation, propose next step or reassure')
      actions.push({
        type: 'ai_reply',
        prompt:
          'Summarize understanding, offer suitable next step (schedule, send info, connect to coordinator). Ask for confirmation or additional details politely.',
        tone: 'professional',
        channel: context.channel,
      })
      confidence = Math.max(confidence, 0.6)
    } else {
      reasoning.push('Defaulting to context follow-up step')
      actions.push({
        type: 'ai_reply',
        prompt:
          'Provide a courteous follow-up, ask if further help is needed, and suggest human support if they prefer. Keep it short and warm.',
        tone: 'empathetic',
        channel: context.channel,
      })
      confidence = Math.max(confidence, 0.55)
    }
  }

  if (context.activeCampaignIds && context.activeCampaignIds.length === 0 && context.state === 'qualifying') {
    actions.push({
      type: 'enqueue_campaign',
      campaignId: 'follow-up-default',
      metadata: { reason: 'Qualifying conversation without existing nurture sequence' },
    })
    reasoning.push('No active campaign – enqueue default follow-up')
  }

  const shouldClose =
    context.state === 'closed' ||
    (latest.role === 'human' && context.state === 'escalated') ||
    (latest.role === 'bot' && containsKeyword(latest.message, ['thank you', 'that helps', 'all good']))

  if (shouldClose) {
    actions.push({ type: 'close_session', reason: 'Conversation resolved or human agent took over', status: 'closed' })
    nextState = 'closed'
    reasoning.push('Conditions met for graceful closure')
    confidence = Math.max(confidence, 0.7)
  }

  if (actions.length === 0) {
    reasoning.push('No specific action triggered; default to gentle AI reply')
    actions.push({
      type: 'ai_reply',
      prompt: 'Provide a concise, helpful response acknowledging the patient and offering next steps.',
      tone: 'empathetic',
      channel: context.channel,
    })
  }

  return {
    nextState,
    actions,
    confidence: Math.min(1, confidence),
    reasoning: reasoning.join(' | '),
  }
}





