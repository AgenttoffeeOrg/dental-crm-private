/**
 * Multi-Channel Conversation Analyzer
 * 
 * This utility analyzes communications across ALL channels:
 * - Call recordings (transcripts)
 * - Emails
 * - WhatsApp messages
 * - SMS/Text messages
 * - Manual notes
 * 
 * It extracts:
 * - Treatment keywords
 * - Urgency indicators
 * - Sentiment (positive, neutral, negative)
 * - Value indicators
 * - Engagement level
 */

import type { Activity, AIArtifact } from '@/types/database'

// Urgency indicators (emergency keywords)
const URGENCY_KEYWORDS = [
  'emergency', 'urgent', 'pain', 'bleeding', 'swelling', 'broken', 'fell out',
  'can\'t eat', 'can\'t sleep', 'severe', 'unbearable', 'asap', 'immediately',
  'today', 'now', 'help', 'accident', 'trauma', 'knocked out', 'throbbing'
]

// High-value treatment keywords
const HIGH_VALUE_TREATMENTS = [
  'implant', 'implants', 'all-on-4', 'all-on-6', 'full arch', 'full mouth',
  'veneer', 'veneers', 'smile makeover', 'reconstruction', 'cosmetic surgery',
  'bone graft', 'sinus lift', 'sedation', 'complex case', 'full rehab'
]

// Orthodontic keywords
const ORTHODONTIC_KEYWORDS = [
  'braces', 'invisalign', 'aligners', 'orthodontic', 'straighten', 'crooked teeth',
  'overbite', 'underbite', 'gap', 'spacing', 'retainer'
]

// Cosmetic keywords
const COSMETIC_KEYWORDS = [
  'whitening', 'bleaching', 'white smile', 'stains', 'discolored',
  'aesthetic', 'cosmetic', 'beautiful smile', 'veneers', 'bonding'
]

// General treatment keywords
const GENERAL_KEYWORDS = [
  'cleaning', 'checkup', 'exam', 'x-ray', 'hygiene', 'polish',
  'filling', 'cavity', 'routine', 'maintenance', 'preventive'
]

// Positive sentiment indicators
const POSITIVE_INDICATORS = [
  'excited', 'looking forward', 'ready', 'interested', 'want', 'need',
  'definitely', 'absolutely', 'great', 'perfect', 'love', 'appreciate',
  'thank you', 'thanks', 'helpful'
]

// Negative sentiment indicators
const NEGATIVE_INDICATORS = [
  'expensive', 'too much', 'can\'t afford', 'not sure', 'maybe later',
  'thinking about it', 'hesitant', 'worried', 'concerned', 'anxious',
  'nervous', 'scared', 'no thanks', 'not interested'
]

// Value/budget discussion indicators
const VALUE_INDICATORS = [
  'cost', 'price', 'payment plan', 'finance', 'insurance', 'coverage',
  'budget', 'affordable', 'investment', 'worth', '£', '$', 'money'
]

export interface ConversationAnalysis {
  // Treatment categories detected
  treatmentCategories: string[]
  
  // Urgency level (0-100)
  urgencyScore: number
  urgencyIndicators: string[]
  
  // Sentiment (-1 to 1, where -1 is negative, 0 is neutral, 1 is positive)
  sentimentScore: number
  sentimentIndicators: string[]
  
  // Engagement level (0-100) - how active/responsive is the patient
  engagementScore: number
  
  // Value discussion detected
  valueDiscussed: boolean
  budgetConcerns: boolean
  
  // Overall deal health (0-100)
  dealHealthScore: number
  
  // Recommended action
  recommendedAction?: string
  
  // All keywords found
  keywordsFound: string[]
  
  // Activity summary
  activityCount: number
  lastActivityDate?: string
  daysSinceLastActivity?: number
}

/**
 * Analyze text content for keywords
 */
function analyzeText(text: string): {
  urgencyKeywords: string[]
  highValueKeywords: string[]
  orthodonticKeywords: string[]
  cosmeticKeywords: string[]
  generalKeywords: string[]
  positiveKeywords: string[]
  negativeKeywords: string[]
  valueKeywords: string[]
} {
  const lowerText = text.toLowerCase()
  
  return {
    urgencyKeywords: URGENCY_KEYWORDS.filter(k => lowerText.includes(k)),
    highValueKeywords: HIGH_VALUE_TREATMENTS.filter(k => lowerText.includes(k)),
    orthodonticKeywords: ORTHODONTIC_KEYWORDS.filter(k => lowerText.includes(k)),
    cosmeticKeywords: COSMETIC_KEYWORDS.filter(k => lowerText.includes(k)),
    generalKeywords: GENERAL_KEYWORDS.filter(k => lowerText.includes(k)),
    positiveKeywords: POSITIVE_INDICATORS.filter(k => lowerText.includes(k)),
    negativeKeywords: NEGATIVE_INDICATORS.filter(k => lowerText.includes(k)),
    valueKeywords: VALUE_INDICATORS.filter(k => lowerText.includes(k))
  }
}

/**
 * Extract text content from an activity based on its type
 */
function extractActivityText(activity: Activity, aiArtifacts?: AIArtifact[]): string {
  const texts: string[] = []
  
  // Add subject and snippet
  if (activity.subject) texts.push(activity.subject)
  if (activity.snippet) texts.push(activity.snippet)
  
  // Add raw data if available
  if (activity.raw) {
    if (activity.raw.body) texts.push(String(activity.raw.body))
    if (activity.raw.content) texts.push(String(activity.raw.content))
    if (activity.raw.message) texts.push(String(activity.raw.message))
    if (activity.raw.text) texts.push(String(activity.raw.text))
  }
  
  // Add AI artifacts (transcripts, summaries, etc.)
  if (aiArtifacts) {
    for (const artifact of aiArtifacts) {
      if (artifact.activity_id === activity.id) {
        if (artifact.kind === 'transcript' && artifact.data.text) {
          texts.push(String(artifact.data.text))
        }
        if (artifact.kind === 'summary' && artifact.data.summary) {
          texts.push(String(artifact.data.summary))
        }
        if (artifact.kind === 'conversation_analysis' && artifact.data.text) {
          texts.push(String(artifact.data.text))
        }
      }
    }
  }
  
  return texts.join(' ')
}

/**
 * Calculate engagement score based on activity frequency and recency
 */
function calculateEngagementScore(activities: Activity[]): { score: number; daysSinceLastActivity?: number } {
  if (activities.length === 0) return { score: 0 }
  
  // Sort by occurred_at
  const sorted = [...activities].sort((a, b) => 
    new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  )
  
  const lastActivity = new Date(sorted[0].occurred_at)
  const now = new Date()
  const daysSince = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
  
  // Base score on recency
  let recencyScore = 100
  if (daysSince > 30) recencyScore = 20
  else if (daysSince > 14) recencyScore = 40
  else if (daysSince > 7) recencyScore = 60
  else if (daysSince > 3) recencyScore = 80
  
  // Boost score based on number of interactions
  const frequencyBoost = Math.min(20, activities.length * 5)
  
  return {
    score: Math.min(100, recencyScore + frequencyBoost),
    daysSinceLastActivity: daysSince
  }
}

/**
 * Analyze all conversations for a contact
 */
export function analyzeConversations(
  activities: Activity[],
  aiArtifacts?: AIArtifact[]
): ConversationAnalysis {
  if (activities.length === 0) {
    return {
      treatmentCategories: [],
      urgencyScore: 0,
      urgencyIndicators: [],
      sentimentScore: 0,
      sentimentIndicators: [],
      engagementScore: 0,
      valueDiscussed: false,
      budgetConcerns: false,
      dealHealthScore: 0,
      keywordsFound: [],
      activityCount: 0
    }
  }
  
  // Extract and analyze all text
  const allKeywords: {
    urgency: string[]
    highValue: string[]
    orthodontic: string[]
    cosmetic: string[]
    general: string[]
    positive: string[]
    negative: string[]
    value: string[]
  } = {
    urgency: [],
    highValue: [],
    orthodontic: [],
    cosmetic: [],
    general: [],
    positive: [],
    negative: [],
    value: []
  }
  
  for (const activity of activities) {
    const text = extractActivityText(activity, aiArtifacts)
    const keywords = analyzeText(text)
    
    allKeywords.urgency.push(...keywords.urgencyKeywords)
    allKeywords.highValue.push(...keywords.highValueKeywords)
    allKeywords.orthodontic.push(...keywords.orthodonticKeywords)
    allKeywords.cosmetic.push(...keywords.cosmeticKeywords)
    allKeywords.general.push(...keywords.generalKeywords)
    allKeywords.positive.push(...keywords.positiveKeywords)
    allKeywords.negative.push(...keywords.negativeKeywords)
    allKeywords.value.push(...keywords.valueKeywords)
  }
  
  // Determine treatment categories
  const treatmentCategories: string[] = []
  if (allKeywords.urgency.length > 0) treatmentCategories.push('Emergency')
  if (allKeywords.highValue.length > 0) treatmentCategories.push('High-Value')
  if (allKeywords.orthodontic.length > 0) treatmentCategories.push('Orthodontics')
  if (allKeywords.cosmetic.length > 0) treatmentCategories.push('Cosmetic')
  if (allKeywords.general.length > 0) treatmentCategories.push('General')
  
  // Calculate urgency score
  const urgencyScore = Math.min(100, allKeywords.urgency.length * 20)
  
  // Calculate sentiment score
  const positiveCount = allKeywords.positive.length
  const negativeCount = allKeywords.negative.length
  const totalSentiment = positiveCount + negativeCount
  const sentimentScore = totalSentiment === 0 ? 0 : (positiveCount - negativeCount) / totalSentiment
  
  // Calculate engagement
  const { score: engagementScore, daysSinceLastActivity } = calculateEngagementScore(activities)
  
  // Detect value discussion and budget concerns
  const valueDiscussed = allKeywords.value.length > 0
  const budgetConcerns = allKeywords.negative.some(k => 
    ['expensive', 'too much', 'can\'t afford', 'budget'].includes(k)
  )
  
  // Calculate deal health score
  let dealHealthScore = 50 // Base score
  dealHealthScore += sentimentScore * 20 // Sentiment impact (-20 to +20)
  dealHealthScore += engagementScore * 0.3 // Engagement impact (0 to 30)
  if (urgencyScore > 50) dealHealthScore += 10 // Urgency boost
  if (budgetConcerns) dealHealthScore -= 15 // Budget concerns penalty
  dealHealthScore = Math.max(0, Math.min(100, dealHealthScore))
  
  // Recommended action
  let recommendedAction: string | undefined
  if (urgencyScore > 70) {
    recommendedAction = 'Call immediately - High urgency detected'
  } else if (daysSinceLastActivity && daysSinceLastActivity > 7) {
    recommendedAction = 'Follow up - No recent contact'
  } else if (budgetConcerns) {
    recommendedAction = 'Discuss payment options'
  } else if (sentimentScore > 0.5) {
    recommendedAction = 'Send treatment proposal'
  }
  
  // Get last activity date
  const sortedActivities = [...activities].sort((a, b) => 
    new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  )
  
  return {
    treatmentCategories,
    urgencyScore,
    urgencyIndicators: [...new Set(allKeywords.urgency)],
    sentimentScore,
    sentimentIndicators: [...new Set([...allKeywords.positive, ...allKeywords.negative])],
    engagementScore,
    valueDiscussed,
    budgetConcerns,
    dealHealthScore,
    recommendedAction,
    keywordsFound: [
      ...new Set([
        ...allKeywords.urgency,
        ...allKeywords.highValue,
        ...allKeywords.orthodontic,
        ...allKeywords.cosmetic,
        ...allKeywords.general,
        ...allKeywords.value
      ])
    ],
    activityCount: activities.length,
    lastActivityDate: sortedActivities[0]?.occurred_at,
    daysSinceLastActivity
  }
}

/**
 * Get a simple health indicator for UI display
 */
export function getDealHealthIndicator(score: number): {
  color: string
  label: string
  icon: string
} {
  if (score >= 70) {
    return { color: 'green', label: 'Healthy', icon: '🟢' }
  } else if (score >= 40) {
    return { color: 'yellow', label: 'At Risk', icon: '🟡' }
  } else {
    return { color: 'red', label: 'Dying', icon: '🔴' }
  }
}

