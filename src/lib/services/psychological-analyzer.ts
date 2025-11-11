import { z } from 'zod'

import { getOpenAIClient } from '@/lib/openai-client'
import { createServiceClient } from '@/lib/supabase-server'

const PsychologicalProfileSchema = z.object({
  anxietyLevel: z.number().min(0).max(100),
  trustScore: z.number().min(0).max(100),
  decisionStyle: z.string().min(2).max(200).optional(),
  communicationStyle: z.string().min(2).max(200).optional(),
  personaTags: z.array(z.string().min(2).max(80)).max(12).optional(),
  primaryConcerns: z.array(z.string().min(2).max(200)).max(8).optional(),
  recommendedApproach: z.string().min(2).max(500).optional(),
  confidence: z.number().min(0).max(1).optional(),
})

export type PsychologicalProfileResult = z.infer<typeof PsychologicalProfileSchema>

export interface AnalyzeContactPsychProfileOptions {
  contactId: string
  tenantId: string
  triggeredBy?: string | null
  sampleSize?: number
}

function buildConversationDigest(messages: Array<{
  occurred_at: string
  direction?: string | null
  message_type?: string | null
  content?: string | null
  content_json?: Record<string, any> | null
  sentiment?: string | null
  snippet?: string | null
  subject?: string | null
}>) {
  return messages
    .map((message) => {
      const baseDirection = message.direction ? message.direction.toUpperCase() : 'NEUTRAL'
      const messageType = message.message_type ? message.message_type.toUpperCase() : 'NOTE'
      const timestamp = new Date(message.occurred_at).toISOString()
      const sentiment = message.sentiment ? `Sentiment: ${message.sentiment}. ` : ''

      const text =
        message.content ??
        message.snippet ??
        (typeof message.content_json === 'object' && message.content_json !== null
          ? JSON.stringify(message.content_json)
          : '') ??
        ''

      const trimmed = text.trim()

      return `[${timestamp}] (${baseDirection}/${messageType}) ${sentiment}${trimmed}`.slice(0, 600)
    })
    .filter(Boolean)
    .join('\n')
}

function buildMockAnalysis(contact: {
  full_name?: string | null
  tags?: string[] | null
}) {
  const nameLength = contact.full_name?.length ?? 8
  const tagFactor = contact.tags?.length ?? 0

  const anxietyBase = 45 + (nameLength % 25)
  const trustBase = 55 - Math.min(20, tagFactor * 3)

  return {
    anxietyLevel: Math.max(15, Math.min(90, anxietyBase)),
    trustScore: Math.max(25, Math.min(95, trustBase)),
    decisionStyle: tagFactor > 2 ? 'Analytical researcher' : 'Fast-moving pragmatist',
    communicationStyle: nameLength % 2 === 0 ? 'Detail-oriented' : 'Story-driven',
    personaTags: contact.tags && contact.tags.length > 0 ? contact.tags.slice(0, 6) : ['warm_lead'],
    primaryConcerns: ['Clarify pricing structure', 'Build trust through consistent follow-up'],
    recommendedApproach:
      tagFactor > 1
        ? 'Lead with specifics, provide comparisons, and earn trust with transparent next steps.'
        : 'Provide reassurance, reinforce value, and keep interactions concise and upbeat.',
    confidence: 0.55,
  } satisfies PsychologicalProfileResult
}

export async function analyzeContactPsychProfile(
  options: AnalyzeContactPsychProfileOptions
): Promise<{
  profile: PsychologicalProfileResult
  snapshot: Record<string, any>
}> {
  const supabase = createServiceClient()
  const sampleSize = Math.min(Math.max(options.sampleSize ?? 12, 3), 25)

  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('id, tenant_id, full_name, tags')
    .eq('id', options.contactId)
    .single()

  if (contactError || !contact) {
    throw new Error('Contact not found for psychological analysis')
  }

  if (contact.tenant_id !== options.tenantId) {
    throw new Error('Contact does not belong to tenant')
  }

  const { data: messages } = await supabase
    .from('conversation_messages')
    .select('occurred_at, direction, message_type, content, content_json, sentiment, snippet')
    .eq('tenant_id', options.tenantId)
    .eq('contact_id', options.contactId)
    .order('occurred_at', { ascending: false })
    .limit(sampleSize)

  const { data: activityFallback } = await supabase
    .from('activities')
    .select('occurred_at, direction, snippet, subject, type')
    .eq('tenant_id', options.tenantId)
    .eq('contact_id', options.contactId)
    .order('occurred_at', { ascending: false })
    .limit(sampleSize)

  const combinedMessages =
    messages && messages.length > 0
      ? messages
      : (activityFallback ?? []).map((activity) => ({
          occurred_at: activity.occurred_at,
          direction: activity.direction,
          message_type: activity.type,
          content: activity.snippet ?? activity.subject ?? '',
          content_json: null,
          sentiment: null,
          snippet: activity.snippet ?? activity.subject ?? '',
          subject: activity.subject,
        }))

  const conversationDigest = buildConversationDigest(combinedMessages)

  const shouldMock =
    process.env.PSYCH_ANALYZER_MODE === 'mock' || process.env.NODE_ENV === 'test' || conversationDigest.length === 0

  let analysis: PsychologicalProfileResult

  if (shouldMock) {
    analysis = buildMockAnalysis(contact)
  } else {
    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: process.env.PSYCH_ANALYZER_MODEL ?? 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a behavioral psychology analyst for a dental sales team. Analyze the patient conversation transcript and return calibrated scores. Anxiety and trust scores must be numbers between 0 and 100. Provide concise text for decisionStyle, communicationStyle, and recommendedApproach. Include personaTags array with lowercase snake_case values.',
        },
        {
          role: 'user',
          content: [
            `Contact Name: ${contact.full_name ?? 'Unknown'}`,
            `Existing Tags: ${(contact.tags ?? []).join(', ') || 'none'}`,
            '',
            'Conversation Transcript:',
            conversationDigest || 'No conversation content available.',
            '',
            'Return JSON matching this schema:',
            JSON.stringify({
              anxietyLevel: 72,
              trustScore: 48,
              decisionStyle: 'Consensus-driven, needs reassurance',
              communicationStyle: 'Prefers structured, empathetic explanations',
              personaTags: ['cost_sensitive', 'quality_focused'],
              primaryConcerns: ['Worried about treatment pain', 'Needs clarity on financing'],
              recommendedApproach:
                'Lead with reassurance, restate pain management plan, provide transparent financing comparison.',
              confidence: 0.72,
            }),
          ].join('\n'),
        },
      ],
    })

    const content = completion.choices[0]?.message?.content

    if (!content) {
      throw new Error('OpenAI psychological analysis returned empty content')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch (error) {
      throw new Error('Failed to parse psychological analysis response')
    }

    const parseResult = PsychologicalProfileSchema.safeParse(parsed)
    if (!parseResult.success) {
      throw new Error('Psychological analysis response did not match expected schema')
    }

    analysis = parseResult.data
  }

  const snapshot = {
    source: shouldMock ? 'mocked' : 'ai',
    analyzed_at: new Date().toISOString(),
    conversation_sample_size: combinedMessages.length,
    conversation_digest: conversationDigest.slice(0, 4000),
    persona_tags: analysis.personaTags ?? [],
    primary_concerns: analysis.primaryConcerns ?? [],
    recommended_approach: analysis.recommendedApproach ?? '',
    confidence: analysis.confidence ?? (shouldMock ? 0.5 : 0.7),
    anxiety_level: Math.round(analysis.anxietyLevel),
    trust_score: Math.round(analysis.trustScore),
    decision_style: analysis.decisionStyle ?? null,
    communication_style: analysis.communicationStyle ?? null,
  }

  const profilePayload = {
    tenant_id: options.tenantId,
    contact_id: options.contactId,
    snapshot,
    anxiety_level: Math.round(analysis.anxietyLevel),
    trust_score: Math.round(analysis.trustScore),
    decision_style: analysis.decisionStyle ?? null,
    communication_style: analysis.communicationStyle ?? null,
    recorded_at: snapshot.analyzed_at,
    created_by: options.triggeredBy ?? null,
  }

  const { data: existingProfile } = await supabase
    .from('contact_psych_profiles')
    .select('id')
    .eq('tenant_id', options.tenantId)
    .eq('contact_id', options.contactId)
    .maybeSingle()

  let profileId = existingProfile?.id ?? null

  if (existingProfile?.id) {
    const { data: updatedProfile, error: updateError } = await supabase
      .from('contact_psych_profiles')
      .update({
        snapshot: profilePayload.snapshot,
        anxiety_level: profilePayload.anxiety_level,
        trust_score: profilePayload.trust_score,
        decision_style: profilePayload.decision_style,
        communication_style: profilePayload.communication_style,
        recorded_at: profilePayload.recorded_at,
        updated_at: profilePayload.recorded_at,
        created_by: profilePayload.created_by,
      })
      .eq('id', existingProfile.id)
      .select('id')
      .single()

    if (updateError) {
      throw updateError
    }

    profileId = updatedProfile?.id ?? existingProfile.id
  } else {
    const { data: insertedProfile, error: insertError } = await supabase
      .from('contact_psych_profiles')
      .insert({
        ...profilePayload,
        created_at: profilePayload.recorded_at,
        updated_at: profilePayload.recorded_at,
      })
      .select('id')
      .single()

    if (insertError) {
      throw insertError
    }

    profileId = insertedProfile?.id ?? null
  }

  await supabase.from('contact_psych_profile_history').insert({
    tenant_id: options.tenantId,
    contact_id: options.contactId,
    profile_id: profileId,
    snapshot: profilePayload.snapshot,
    recorded_at: profilePayload.recorded_at,
    recorded_by: options.triggeredBy ?? null,
  })

  return {
    profile: analysis,
    snapshot,
  }
}

