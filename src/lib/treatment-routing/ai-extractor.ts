/**
 * =====================================================
 * AI TAG EXTRACTOR - INTELLIGENT TAG EXTRACTION
 * =====================================================
 * Version: 1.0.0
 * Date: October 19, 2025
 * Phase: 3 - Core Routing Engine
 * =====================================================
 * 
 * PURPOSE:
 * Intelligently extract relevant treatment tags from deal text
 * (title, description, AI conversation data) using keyword
 * matching, fuzzy matching, and confidence scoring.
 * 
 * FEATURES:
 * - Smart keyword matching with fuzzy logic
 * - Multi-keyword support (AND/OR logic)
 * - Confidence scoring per tag (0-100)
 * - Context-aware extraction
 * - Location-specific tag awareness
 * - Performance optimized
 * 
 * USAGE:
 * ```typescript
 * const result = await extractTreatmentTags(
 *   'Crown implant for John',
 *   'Patient needs full crown and possible implant',
 *   'tenant-uuid',
 *   'location-uuid'
 * )
 * // Returns: {
 * //   extractedTags: ['dental_implant', 'crown'],
 * //   confidence: { dental_implant: 95, crown: 90 },
 * //   keywords: { dental_implant: ['implant'], crown: ['crown'] }
 * // }
 * ```
 * 
 * =====================================================
 */

import { getTreatmentTags } from './routing-engine'

// =====================================================
// TYPES & INTERFACES
// =====================================================

/**
 * Result of AI tag extraction
 */
export interface ExtractionResult {
  // Extracted tags
  extractedTags: string[] // Tag names that matched
  
  // Confidence per tag (0-100)
  confidence: Record<string, number> // { tagName: confidenceScore }
  
  // Keywords that triggered each tag
  keywords: Record<string, string[]> // { tagName: [matchedKeywords] }
  
  // Overall extraction quality
  overallConfidence: number // 0-100
  
  // Debug information
  debug?: {
    processedText: string
    totalTagsChecked: number
    matchAttempts: number
    executionTimeMs: number
  }
}

/**
 * Extraction options for fine-tuning behavior
 */
export interface ExtractionOptions {
  // Minimum confidence threshold (only return tags with confidence >= this)
  minConfidence?: number // Default: 60
  
  // Maximum number of tags to return
  maxTags?: number // Default: 5
  
  // Enable fuzzy matching (allows slight misspellings)
  fuzzyMatch?: boolean // Default: true
  
  // Context weight (how much to consider surrounding words)
  contextWeight?: number // 0-1, Default: 0.3
  
  // Include debug information in result
  debug?: boolean // Default: false
}

// =====================================================
// FUZZY MATCHING UTILITIES
// =====================================================

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy keyword matching
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Check if two strings are similar (fuzzy match)
 * @param str1 - First string
 * @param str2 - Second string
 * @param threshold - Similarity threshold (0-1), default 0.8
 * @returns true if strings are similar enough
 */
function isFuzzyMatch(str1: string, str2: string, threshold = 0.8): boolean {
  const maxLength = Math.max(str1.length, str2.length)
  if (maxLength === 0) return true

  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  const similarity = 1 - distance / maxLength

  return similarity >= threshold
}

// =====================================================
// TEXT PROCESSING UTILITIES
// =====================================================

/**
 * Normalize and clean text for processing
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim()
}

/**
 * Extract meaningful words from text (remove stop words)
 */
function extractMeaningfulWords(text: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
    'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how'
  ])

  return normalizeText(text)
    .split(' ')
    .filter(word => word.length > 2 && !stopWords.has(word))
}

/**
 * Get context around a keyword (surrounding words)
 */
function getKeywordContext(text: string, keyword: string, windowSize = 3): string[] {
  const words = normalizeText(text).split(' ')
  const keywordIndex = words.findIndex(word => word.includes(keyword))

  if (keywordIndex === -1) return []

  const start = Math.max(0, keywordIndex - windowSize)
  const end = Math.min(words.length, keywordIndex + windowSize + 1)

  return words.slice(start, end)
}

// =====================================================
// KEYWORD MATCHING LOGIC
// =====================================================

/**
 * Check if a keyword matches in the text
 * Returns confidence score (0-100) and matched text
 */
function matchKeyword(
  keyword: string,
  text: string,
  options: ExtractionOptions
): { matched: boolean; confidence: number; matchedText?: string } {
  const normalizedText = normalizeText(text)
  const normalizedKeyword = normalizeText(keyword)

  // Exact match (highest confidence)
  if (normalizedText.includes(normalizedKeyword)) {
    return {
      matched: true,
      confidence: 100,
      matchedText: normalizedKeyword
    }
  }

  // Fuzzy match (if enabled)
  if (options.fuzzyMatch !== false) {
    const words = normalizedText.split(' ')
    
    for (const word of words) {
      // Check for partial match
      if (word.includes(normalizedKeyword) || normalizedKeyword.includes(word)) {
        const similarity = Math.min(word.length, normalizedKeyword.length) / Math.max(word.length, normalizedKeyword.length)
        return {
          matched: true,
          confidence: Math.round(similarity * 90), // 90% max for partial match
          matchedText: word
        }
      }

      // Check for fuzzy match
      if (isFuzzyMatch(word, normalizedKeyword, 0.85)) {
        return {
          matched: true,
          confidence: 80, // 80% for fuzzy match
          matchedText: word
        }
      }
    }
  }

  return { matched: false, confidence: 0 }
}

/**
 * Calculate confidence boost based on context
 * If surrounding words are related to dental/treatment, boost confidence
 */
function calculateContextBoost(context: string[], contextWeight: number): number {
  const dentalTerms = [
    'tooth', 'teeth', 'dental', 'dentist', 'mouth', 'gum', 'jaw',
    'bite', 'cavity', 'filling', 'treatment', 'procedure', 'patient'
  ]

  const matches = context.filter(word =>
    dentalTerms.some(term => word.includes(term))
  ).length

  const contextScore = (matches / Math.max(context.length, 1)) * 100
  return contextScore * contextWeight
}

// =====================================================
// MAIN EXTRACTION FUNCTION
// =====================================================

/**
 * Extract treatment tags from deal text using AI-powered keyword matching
 * 
 * @param title - Deal title
 * @param description - Deal description
 * @param tenantId - Tenant ID
 * @param locationId - Optional location ID for location-specific tags
 * @param options - Extraction options
 * @returns Promise<ExtractionResult>
 * 
 * @example
 * ```typescript
 * const result = await extractTreatmentTags(
 *   'Dental implant consultation',
 *   'Patient interested in implant and crown work',
 *   'tenant-uuid'
 * )
 * console.log('Tags:', result.extractedTags)
 * console.log('Confidence:', result.confidence)
 * ```
 */
export async function extractTreatmentTags(
  title: string,
  description: string,
  tenantId: string,
  locationId?: string,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  const startTime = Date.now()

  // Default options
  const opts: Required<ExtractionOptions> = {
    minConfidence: options.minConfidence ?? 60,
    maxTags: options.maxTags ?? 5,
    fuzzyMatch: options.fuzzyMatch ?? true,
    contextWeight: options.contextWeight ?? 0.3,
    debug: options.debug ?? false
  }

  try {
    // Combine title and description
    const combinedText = `${title} ${description}`.trim()
    if (!combinedText) {
      return {
        extractedTags: [],
        confidence: {},
        keywords: {},
        overallConfidence: 0
      }
    }

    // Get treatment tags from database
    const tags = await getTreatmentTags(tenantId, locationId)
    if (tags.length === 0) {
      console.warn('[AI Extractor] No treatment tags found for tenant')
      return {
        extractedTags: [],
        confidence: {},
        keywords: {},
        overallConfidence: 0
      }
    }

    // Score each tag
    const tagScores: Array<{
      tagName: string
      confidence: number
      matchedKeywords: string[]
    }> = []

    let matchAttempts = 0

    for (const tag of tags) {
      let bestConfidence = 0
      const matchedKeywords: string[] = []

      // Try to match each keyword
      for (const keyword of tag.keywords) {
        matchAttempts++
        
        const match = matchKeyword(keyword, combinedText, opts)
        
        if (match.matched) {
          matchedKeywords.push(match.matchedText || keyword)
          
          // Calculate confidence with context boost
          let confidence = match.confidence
          
          // Add context boost if contextWeight > 0
          if (opts.contextWeight > 0) {
            const context = getKeywordContext(combinedText, keyword)
            const contextBoost = calculateContextBoost(context, opts.contextWeight)
            confidence = Math.min(100, confidence + contextBoost)
          }
          
          bestConfidence = Math.max(bestConfidence, confidence)
        }
      }

      // If tag matched, add to results
      if (bestConfidence >= opts.minConfidence) {
        tagScores.push({
          tagName: tag.name,
          confidence: Math.round(bestConfidence),
          matchedKeywords
        })
      }
    }

    // Sort by confidence (highest first)
    tagScores.sort((a, b) => b.confidence - a.confidence)

    // Limit to maxTags
    const topTags = tagScores.slice(0, opts.maxTags)

    // Calculate overall confidence (average of top tags)
    const overallConfidence = topTags.length > 0
      ? Math.round(topTags.reduce((sum, tag) => sum + tag.confidence, 0) / topTags.length)
      : 0

    // Build result
    const result: ExtractionResult = {
      extractedTags: topTags.map(t => t.tagName),
      confidence: Object.fromEntries(topTags.map(t => [t.tagName, t.confidence])),
      keywords: Object.fromEntries(topTags.map(t => [t.tagName, t.matchedKeywords])),
      overallConfidence
    }

    // Add debug info if requested
    if (opts.debug) {
      result.debug = {
        processedText: normalizeText(combinedText),
        totalTagsChecked: tags.length,
        matchAttempts,
        executionTimeMs: Date.now() - startTime
      }
    }

    console.log(`[AI Extractor] Extracted ${result.extractedTags.length} tags in ${Date.now() - startTime}ms`)
    
    return result

  } catch (error) {
    console.error('[AI Extractor] Error extracting tags:', error)
    
    return {
      extractedTags: [],
      confidence: {},
      keywords: {},
      overallConfidence: 0
    }
  }
}

// =====================================================
// ADDITIONAL UTILITIES
// =====================================================

/**
 * Suggest tags for UI autocomplete (by partial name match)
 */
export async function suggestTags(
  partialName: string,
  tenantId: string,
  locationId?: string,
  limit = 5
): Promise<string[]> {
  if (!partialName || partialName.length < 2) return []

  try {
    const tags = await getTreatmentTags(tenantId, locationId)
    
    const matches = tags
      .filter(tag => tag.name.toLowerCase().includes(partialName.toLowerCase()))
      .sort((a, b) => {
        // Prioritize exact matches
        const aExact = a.name.toLowerCase() === partialName.toLowerCase()
        const bExact = b.name.toLowerCase() === partialName.toLowerCase()
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        
        // Then by priority
        return b.priority - a.priority
      })
      .slice(0, limit)
      .map(tag => tag.name)

    return matches
  } catch (error) {
    console.error('[AI Extractor] Error suggesting tags:', error)
    return []
  }
}

/**
 * Validate if a tag name exists
 */
export async function validateTagName(
  tagName: string,
  tenantId: string,
  locationId?: string
): Promise<boolean> {
  try {
    const tags = await getTreatmentTags(tenantId, locationId)
    return tags.some(tag => tag.name.toLowerCase() === tagName.toLowerCase())
  } catch (error) {
    console.error('[AI Extractor] Error validating tag:', error)
    return false
  }
}

/**
 * Get tag details by name
 */
export async function getTagByName(
  tagName: string,
  tenantId: string,
  locationId?: string
): Promise<{
  id: string
  name: string
  description: string | null
  keywords: string[]
  color: string
  icon: string
  category: string | null
} | null> {
  try {
    const tags = await getTreatmentTags(tenantId, locationId)
    const tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase())
    
    if (!tag) return null
    
    return {
      id: tag.id,
      name: tag.name,
      description: tag.description,
      keywords: tag.keywords,
      color: tag.color,
      icon: tag.icon,
      category: tag.category
    }
  } catch (error) {
    console.error('[AI Extractor] Error getting tag:', error)
    return null
  }
}

// =====================================================
// LEGACY COMPATIBILITY EXPORTS
// =====================================================

/**
 * Legacy alias for extractTreatmentTags
 * @deprecated Use extractTreatmentTags instead
 */
export const extractTagsFromDealText = extractTreatmentTags

