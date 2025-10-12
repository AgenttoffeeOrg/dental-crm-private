/**
 * Smart Deal Categorization System
 * Automatically categorizes deals into appropriate pipelines based on:
 * - Treatment type
 * - Deal value
 * - Urgency indicators
 * - Keywords in title/description
 */

export interface CategoryResult {
  pipelineName: string
  pipelineType: 'high_value' | 'emergency' | 'general' | 'orthodontics' | 'cosmetic' | 'referral'
  confidence: number
  reason: string
  suggestedTags: string[]
}

// High-value treatment indicators
const HIGH_VALUE_TREATMENTS = [
  'implant', 'implants', 'full mouth', 'reconstruction', 'all-on-4', 'all on 4',
  'full arch', 'full denture', 'complex', 'extensive', 'major'
]

// Orthodontic treatment indicators
const ORTHODONTIC_TREATMENTS = [
  'invisalign', 'braces', 'orthodontic', 'orthodontics', 'aligner', 'aligners',
  'retainer', 'appliance', 'bite correction', 'malocclusion'
]

// Cosmetic treatment indicators
const COSMETIC_TREATMENTS = [
  'veneers', 'veneer', 'whitening', 'bleaching', 'smile makeover', 'smile design',
  'bonding', 'composite bonding', 'aesthetic', 'cosmetic', 'smile enhancement'
]

// Emergency indicators
const EMERGENCY_INDICATORS = [
  'emergency', 'urgent', 'pain', 'bleeding', 'swelling', 'trauma', 'broken tooth',
  'knocked out', 'abscess', 'infection', 'severe', 'immediate', 'same day'
]

// Referral indicators
const REFERRAL_INDICATORS = [
  'referral', 'referred', 'specialist', 'endodontist', 'periodontist', 
  'oral surgeon', 'prosthodontist'
]

// General practice treatments (routine)
const GENERAL_TREATMENTS = [
  'checkup', 'cleaning', 'hygiene', 'filling', 'fillings', 'extraction',
  'simple extraction', 'scale', 'polish', 'exam', 'examination', 'routine',
  'preventive', 'maintenance'
]

/**
 * Get user-configured treatment rules from localStorage
 */
function getUserTreatmentConfig(): any[] {
  if (typeof window === 'undefined') return []
  
  try {
    const saved = localStorage.getItem('treatment_config')
    return saved ? JSON.parse(saved) : []
  } catch (e) {
    return []
  }
}

/**
 * Categorize a deal into the appropriate pipeline
 * Now uses user-configured rules and AI conversation data
 */
export function categorizeDeal(
  title: string,
  description: string,
  treatmentTags: string[],
  valueInCents: number,
  source?: string,
  aiConversationData?: any
): CategoryResult {
  const titleLower = title.toLowerCase()
  const descriptionLower = description?.toLowerCase() || ''
  const tagsLower = treatmentTags.map(t => t.toLowerCase())
  let combinedText = `${titleLower} ${descriptionLower} ${tagsLower.join(' ')}`
  const valueInPounds = valueInCents / 100

  // Add AI conversation insights if available
  if (aiConversationData) {
    const aiTreatments = aiConversationData.treatments_discussed?.map((t: any) => t.name).join(' ').toLowerCase() || ''
    const aiSummary = aiConversationData.executive_summary?.toLowerCase() || ''
    combinedText += ` ${aiTreatments} ${aiSummary}`
  }

  // First, check user-configured treatments
  const userConfig = getUserTreatmentConfig()
  for (const config of userConfig) {
    const matchesKeywords = config.keywords?.some((kw: string) => 
      combinedText.includes(kw.toLowerCase())
    )
    const meetsMinValue = config.min_value ? valueInCents >= config.min_value : true
    
    if (matchesKeywords && meetsMinValue) {
      return {
        pipelineName: config.auto_pipeline,
        pipelineType: config.category,
        confidence: 0.95,
        reason: `Matches configured rule: "${config.name}" (min £${config.min_value ? (config.min_value / 100).toLocaleString() : 'N/A'})`,
        suggestedTags: [config.category, ...config.keywords.slice(0, 2)]
      }
    }
  }

  // Check for Emergency first (highest priority)
  if (hasAnyMatch(combinedText, EMERGENCY_INDICATORS)) {
    return {
      pipelineName: 'Emergency Treatment',
      pipelineType: 'emergency',
      confidence: 0.95,
      reason: 'Contains emergency keywords: pain, urgent, or immediate care needed',
      suggestedTags: ['urgent', 'priority', 'same_day']
    }
  }

  // Check for High-Value treatments
  if (hasAnyMatch(combinedText, HIGH_VALUE_TREATMENTS) || valueInPounds >= 5000) {
    return {
      pipelineName: 'High-Value Treatment',
      pipelineType: 'high_value',
      confidence: valueInPounds >= 5000 ? 0.9 : 0.85,
      reason: valueInPounds >= 5000 
        ? `High value (${formatCurrency(valueInCents)}) indicates premium treatment`
        : 'Treatment type indicates high-value procedure (implants, full mouth work)',
      suggestedTags: ['high_value', 'premium', 'complex']
    }
  }

  // Check for Orthodontics
  if (hasAnyMatch(combinedText, ORTHODONTIC_TREATMENTS)) {
    return {
      pipelineName: 'Orthodontics',
      pipelineType: 'orthodontics',
      confidence: 0.9,
      reason: 'Treatment involves orthodontic procedures (Invisalign, braces, aligners)',
      suggestedTags: ['orthodontic', 'long_term', 'specialty']
    }
  }

  // Check for Cosmetic
  if (hasAnyMatch(combinedText, COSMETIC_TREATMENTS) || (valueInPounds >= 1500 && valueInPounds < 5000)) {
    return {
      pipelineName: 'Cosmetic Dentistry',
      pipelineType: 'cosmetic',
      confidence: 0.85,
      reason: 'Elective cosmetic procedure (veneers, whitening, smile enhancement)',
      suggestedTags: ['cosmetic', 'elective', 'aesthetic']
    }
  }

  // Check for Referral
  if (hasAnyMatch(combinedText, REFERRAL_INDICATORS) || source?.toLowerCase().includes('referral')) {
    return {
      pipelineName: 'Referral Network',
      pipelineType: 'referral',
      confidence: 0.8,
      reason: 'Deal involves specialist referral or was referred from another practice',
      suggestedTags: ['referral', 'specialist', 'network']
    }
  }

  // Check for General Practice (routine care)
  if (hasAnyMatch(combinedText, GENERAL_TREATMENTS) || valueInPounds < 500) {
    return {
      pipelineName: 'General Practice',
      pipelineType: 'general',
      confidence: 0.9,
      reason: 'Routine dental care (checkups, cleanings, basic treatments)',
      suggestedTags: ['routine', 'general', 'maintenance']
    }
  }

  // Default to General Practice if no specific category
  return {
    pipelineName: 'General Practice',
    pipelineType: 'general',
    confidence: 0.6,
    reason: 'Default categorization - no specific treatment type identified',
    suggestedTags: ['general']
  }
}

/**
 * Check if text contains any of the indicator words
 */
function hasAnyMatch(text: string, indicators: string[]): boolean {
  return indicators.some(indicator => text.includes(indicator))
}

/**
 * Format currency
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(cents / 100)
}

/**
 * Get treatment category from tags
 */
export function getTreatmentCategory(tags: string[]): string {
  const tagsLower = tags.map(t => t.toLowerCase())
  const combined = tagsLower.join(' ')

  if (hasAnyMatch(combined, EMERGENCY_INDICATORS)) return 'Emergency'
  if (hasAnyMatch(combined, HIGH_VALUE_TREATMENTS)) return 'High-Value'
  if (hasAnyMatch(combined, ORTHODONTIC_TREATMENTS)) return 'Orthodontics'
  if (hasAnyMatch(combined, COSMETIC_TREATMENTS)) return 'Cosmetic'
  if (hasAnyMatch(combined, REFERRAL_INDICATORS)) return 'Referral'
  if (hasAnyMatch(combined, GENERAL_TREATMENTS)) return 'General'

  return 'General'
}

/**
 * Determine if a deal is high-value
 */
export function isHighValue(valueInCents: number, treatmentTags: string[]): boolean {
  const valueInPounds = valueInCents / 100
  const tagsLower = treatmentTags.map(t => t.toLowerCase())
  const combined = tagsLower.join(' ')

  return valueInPounds >= 5000 || hasAnyMatch(combined, HIGH_VALUE_TREATMENTS)
}

/**
 * Determine if a deal is emergency
 */
export function isEmergency(title: string, description: string, treatmentTags: string[]): boolean {
  const combined = `${title} ${description} ${treatmentTags.join(' ')}`.toLowerCase()
  return hasAnyMatch(combined, EMERGENCY_INDICATORS)
}

/**
 * Auto-tag a deal based on its characteristics
 */
export function autoTagDeal(
  title: string,
  description: string,
  treatmentTags: string[],
  valueInCents: number
): string[] {
  const category = categorizeDeal(title, description, treatmentTags, valueInCents)
  const autoTags: string[] = [...category.suggestedTags]

  // Add value-based tags
  const valueInPounds = valueInCents / 100
  if (valueInPounds >= 10000) autoTags.push('ultra_high_value')
  else if (valueInPounds >= 5000) autoTags.push('high_value')
  else if (valueInPounds >= 1500) autoTags.push('medium_value')
  else if (valueInPounds >= 500) autoTags.push('standard')
  else autoTags.push('low_value')

  // Add urgency tags
  if (isEmergency(title, description, treatmentTags)) {
    autoTags.push('urgent', 'priority')
  }

  return [...new Set(autoTags)] // Remove duplicates
}

