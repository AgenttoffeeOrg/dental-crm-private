import { createServiceClient } from '@/lib/supabase-server'
import type { Deal, Contact, Activity, AIArtifact, Task } from '@/types/database'

export interface AIContext {
  contextType: 'deal' | 'contact' | 'global'
  timestamp: string
  
  // Deal Context
  deal?: {
    id: string
    title: string
    value: number
    valueCurrency: string
    stage: string
    pipeline: string
    tags: string[]
    created: string
    lastActivity: string
    intelligence: {
      likelihoodScore: number
      healthStatus: string
      sentiment: string
      urgency: string
      conversationCount: number
      lastContactDays: number
    }
  }
  
  // Contact Context
  contact?: {
    id: string
    fullName: string
    email: string
    phone: string
    address: string
    medicalHistory: string
    dentalHistory: string
    lifetimeValue: number
    totalDeals: number
    activeDeals: number
  }
  
  // Activities (ALL conversations)
  activities: {
    type: string
    subject: string
    snippet: string
    occurredAt: string
    direction: string
    agentName: string
    hasAudio: boolean
    transcription?: string
    aiAnalysis?: {
      executiveSummary: string
      callPurpose: string
      sentiment: string
      painPoints: string[]
      immediateActions: string[]
    }
  }[]
  
  // Related Tasks
  tasks: {
    title: string
    description: string
    priority: string
    due: string
    status: string
  }[]
  
  // Practice-wide Context (for global assistant)
  practiceStats?: {
    totalDeals: number
    totalValue: number
    averageCloseRate: number
    topPerformingPipeline: string
  }
  
  // User Preferences (from settings)
  userPreferences: {
    responseStyle: string
    autoActions: string[]
    focusAreas: string[]
    customRules: string[]
    emailDraftStyle: {
      opening: string
      closing: string
      tone: string
    }
  }
}

export async function buildDealContext(dealId: string, tenantId: string): Promise<AIContext> {
  const supabase = createServiceClient()

  try {
    // Fetch deal with all relations
    const { data: deal, error: dealError } = await supabase
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

    if (dealError) throw dealError

    // Fetch ALL activities for this deal
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        *,
        agent:app_users!activities_agent_user_id_fkey(*),
        activity_files(
          file_id,
          files(*)
        )
      `)
      .eq('deal_id', dealId)
      .order('occurred_at', { ascending: false })
      .limit(50)

    if (activitiesError) throw activitiesError

    // Fetch ALL AI artifacts for these activities
    const activityIds = activities?.map(a => a.id) || []
    let aiArtifacts: AIArtifact[] = []

    if (activityIds.length > 0) {
      const { data: artifacts } = await supabase
        .from('ai_artifacts')
        .select('*')
        .in('activity_id', activityIds)

      aiArtifacts = artifacts || []
    }

    // Fetch related tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('related_to_entity_id', dealId)
      .eq('related_to_entity_type', 'deal')
      .limit(20)

    // Build intelligence metrics
    const lastActivity = activities?.[0]
    const lastContactDays = lastActivity
      ? Math.floor((Date.now() - new Date(lastActivity.occurred_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999

    // Calculate sentiment from AI artifacts
    const sentiments = aiArtifacts.filter(a => a.kind === 'sentiment')
    const positiveSentiments = sentiments.filter(s =>
      s.content.toLowerCase().includes('positive') ||
      s.content.toLowerCase().includes('enthusiastic')
    ).length
    const negativeSentiments = sentiments.filter(s =>
      s.content.toLowerCase().includes('negative') ||
      s.content.toLowerCase().includes('hesitant')
    ).length

    let sentiment = 'neutral'
    if (positiveSentiments > negativeSentiments) sentiment = 'positive'
    else if (negativeSentiments > positiveSentiments) sentiment = 'negative'

    // Calculate likelihood score (simplified version)
    let likelihoodScore = 50
    if (sentiment === 'positive') likelihoodScore += 20
    if (activities && activities.length > 5) likelihoodScore += 10
    if (lastContactDays < 3) likelihoodScore += 15
    if (sentiment === 'negative') likelihoodScore -= 20
    if (lastContactDays > 14) likelihoodScore -= 20
    likelihoodScore = Math.max(0, Math.min(100, likelihoodScore))

    // Build rich context for AI
    const context: AIContext = {
      contextType: 'deal',
      timestamp: new Date().toISOString(),
      
      deal: {
        id: deal.id,
        title: deal.title,
        value: deal.value_estimate_cents / 100,
        valueCurrency: 'GBP',
        stage: deal.stage?.name || 'Unknown',
        pipeline: deal.pipeline?.name || 'Unknown',
        tags: deal.treatment_tags || [],
        created: deal.created_at,
        lastActivity: lastActivity?.occurred_at || deal.created_at,
        intelligence: {
          likelihoodScore,
          healthStatus: likelihoodScore > 70 ? 'good' : likelihoodScore > 40 ? 'fair' : 'poor',
          sentiment,
          urgency: lastContactDays < 3 ? 'high' : 'medium',
          conversationCount: activities?.length || 0,
          lastContactDays
        }
      },
      
      contact: {
        id: deal.contact.id,
        fullName: deal.contact.full_name,
        email: deal.contact.email || '',
        phone: deal.contact.phone || '',
        address: deal.contact.address || '',
        medicalHistory: deal.contact.medical_history || '',
        dentalHistory: deal.contact.dental_history || '',
        lifetimeValue: 0, // TODO: Calculate from all deals
        totalDeals: 0, // TODO: Count
        activeDeals: 0 // TODO: Count active
      },
      
      activities: activities?.map(activity => {
        // Find AI analysis for this activity
        const analysis = aiArtifacts.find(a =>
          a.activity_id === activity.id &&
          a.kind === 'conversation_analysis'
        )
        
        const transcription = aiArtifacts.find(a =>
          a.activity_id === activity.id &&
          a.kind === 'transcription'
        )

        let aiAnalysis = undefined
        if (analysis) {
          try {
            const parsed = typeof analysis.content === 'string'
              ? JSON.parse(analysis.content)
              : analysis.content
            
            aiAnalysis = {
              executiveSummary: parsed.executive_summary || '',
              callPurpose: parsed.call_purpose || '',
              sentiment: parsed.patient_sentiment || '',
              painPoints: parsed.pain_points || [],
              immediateActions: parsed.immediate_actions || []
            }
          } catch (e) {
            // Parsing error, skip
          }
        }

        return {
          type: activity.type,
          subject: activity.subject || '',
          snippet: activity.snippet || '',
          occurredAt: activity.occurred_at,
          direction: activity.direction || '',
          agentName: activity.agent?.full_name || 'Unknown',
          hasAudio: activity.activity_files?.some(af => af.files.kind === 'audio') || false,
          transcription: transcription?.content,
          aiAnalysis
        }
      }) || [],
      
      tasks: tasks?.map(task => ({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        due: task.due_date || '',
        status: task.status
      })) || [],
      
      userPreferences: await loadUserPreferences(tenantId)
    }

    return context
  } catch (error) {
    console.error('Error building deal context:', error)
    throw error
  }
}

export async function buildContactContext(contactId: string, tenantId: string): Promise<AIContext> {
  const supabase = createServiceClient()

  try {
    // Fetch contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single()

    if (contactError) throw contactError

    // Fetch ALL deals for this contact
    const { data: deals } = await supabase
      .from('deals')
      .select(`
        *,
        stage:pipeline_stages(*),
        pipeline:pipelines(*)
      `)
      .eq('contact_id', contactId)

    // Fetch ALL activities for this contact
    const { data: activities } = await supabase
      .from('activities')
      .select(`
        *,
        agent:app_users!activities_agent_user_id_fkey(*)
      `)
      .eq('contact_id', contactId)
      .order('occurred_at', { ascending: false })
      .limit(100)

    // Calculate lifetime value
    const lifetimeValue = deals?.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0) || 0
    const activeDeals = deals?.filter(d => d.status === 'open').length || 0

    const context: AIContext = {
      contextType: 'contact',
      timestamp: new Date().toISOString(),
      
      contact: {
        id: contact.id,
        fullName: contact.full_name,
        email: contact.email || '',
        phone: contact.phone || '',
        address: contact.address || '',
        medicalHistory: contact.medical_history || '',
        dentalHistory: contact.dental_history || '',
        lifetimeValue: lifetimeValue / 100,
        totalDeals: deals?.length || 0,
        activeDeals
      },
      
      activities: activities?.map(activity => ({
        type: activity.type,
        subject: activity.subject || '',
        snippet: activity.snippet || '',
        occurredAt: activity.occurred_at,
        direction: activity.direction || '',
        agentName: activity.agent?.full_name || 'Unknown',
        hasAudio: false
      })) || [],
      
      tasks: [],
      
      userPreferences: await loadUserPreferences(tenantId)
    }

    return context
  } catch (error) {
    console.error('Error building contact context:', error)
    throw error
  }
}

export async function buildGlobalContext(tenantId: string): Promise<AIContext> {
  const supabase = createServiceClient()

  try {
    // Fetch practice stats
    const { data: deals } = await supabase
      .from('deals')
      .select('value_estimate_cents, status')
      .eq('tenant_id', tenantId)

    const totalValue = deals?.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0) || 0
    const wonDeals = deals?.filter(d => d.status === 'won').length || 0
    const totalDeals = deals?.length || 0

    const context: AIContext = {
      contextType: 'global',
      timestamp: new Date().toISOString(),
      
      activities: [],
      tasks: [],
      
      practiceStats: {
        totalDeals,
        totalValue: totalValue / 100,
        averageCloseRate: totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0,
        topPerformingPipeline: 'High-Value Treatment' // TODO: Calculate actual
      },
      
      userPreferences: await loadUserPreferences(tenantId)
    }

    return context
  } catch (error) {
    console.error('Error building global context:', error)
    throw error
  }
}

async function loadUserPreferences(tenantId: string) {
  // Load from database or return defaults
  // TODO: Implement user_preferences table query
  
  return {
    responseStyle: 'friendly',
    autoActions: ['draft_emails', 'suggest_tasks', 'detect_cold_leads'],
    focusAreas: ['closing_deals', 'patient_satisfaction'],
    customRules: [
      "For deals over £5,000, always mention payment plan options",
      "If patient mentions anxiety, emphasize sedation and comfort options"
    ],
    emailDraftStyle: {
      opening: 'warm',
      closing: 'warm_regards',
      tone: 'professional_friendly'
    }
  }
}

