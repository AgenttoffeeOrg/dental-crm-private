/**
 * A/B Testing System for Forms
 * Test different variants and measure conversion rates
 */

import { createServiceClient } from '@/lib/supabase-server'

export interface FormVariant {
  id: string
  formId: string
  variantName: string
  variantLetter: 'A' | 'B' | 'C' | 'D'
  fieldsJson: any[]
  isControl: boolean
  trafficPercentage: number
  active: boolean
}

export interface ABTestResult {
  variantId: string
  variantName: string
  views: number
  submissions: number
  conversionRate: number
  isWinner: boolean
  statisticalSignificance: number
}

/**
 * Create A/B test variant
 */
export async function createVariant(params: {
  formId: string
  variantName: string
  variantLetter: FormVariant['variantLetter']
  fieldsJson: any[]
  trafficPercentage?: number
}): Promise<FormVariant | null> {
  const supabase = createServiceClient()

  try {
    const { data, error } = await supabase
      .from('form_variants')
      .insert({
        form_id: params.formId,
        variant_name: params.variantName,
        variant_letter: params.variantLetter,
        fields_json: params.fieldsJson,
        is_control: params.variantLetter === 'A',
        traffic_percentage: params.trafficPercentage || 50,
        active: true,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('[A/B Testing] Error creating variant:', error)
    return null
  }
}

/**
 * Assign user to variant (sticky session)
 */
export function assignToVariant(
  variants: FormVariant[],
  sessionId: string
): FormVariant {
  // Use session ID to deterministically assign variant
  // This ensures same user always sees same variant
  const hash = sessionId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)

  const totalPercentage = variants.reduce((sum, v) => sum + v.trafficPercentage, 0)
  const randomValue = (hash % 100) / 100 * totalPercentage

  let cumulative = 0
  for (const variant of variants) {
    cumulative += variant.trafficPercentage
    if (randomValue <= cumulative) {
      return variant
    }
  }

  return variants[0] // Fallback to first variant
}

/**
 * Track variant view
 */
export async function trackVariantView(variantId: string): Promise<void> {
  const supabase = createServiceClient()

  try {
    await supabase.rpc('increment_variant_views', { variant_id: variantId })
  } catch (error) {
    console.error('[A/B Testing] Error tracking view:', error)
  }
}

/**
 * Track variant submission
 */
export async function trackVariantSubmission(variantId: string): Promise<void> {
  const supabase = createServiceClient()

  try {
    await supabase.rpc('increment_variant_submissions', { variant_id: variantId })
  } catch (error) {
    console.error('[A/B Testing] Error tracking submission:', error)
  }
}

/**
 * Get A/B test results
 */
export async function getABTestResults(formId: string): Promise<ABTestResult[]> {
  const supabase = createServiceClient()

  try {
    const { data: variants } = await supabase
      .from('form_variants')
      .select('*')
      .eq('form_id', formId)
      .eq('active', true)

    if (!variants || variants.length === 0) {
      return []
    }

    const results: ABTestResult[] = variants.map((variant) => {
      const views = variant.total_views || 0
      const submissions = variant.total_submissions || 0
      const conversionRate = views > 0 ? (submissions / views) * 100 : 0

      return {
        variantId: variant.id,
        variantName: variant.variant_name,
        views,
        submissions,
        conversionRate,
        isWinner: false,
        statisticalSignificance: 0,
      }
    })

    // Calculate winner (if statistically significant)
    if (results.length >= 2) {
      const [variantA, variantB] = results

      // Chi-squared test for statistical significance
      const significance = calculateChiSquared(
        variantA.views,
        variantA.submissions,
        variantB.views,
        variantB.submissions
      )

      // If p-value < 0.05 and min 100 conversions, declare winner
      if (significance > 95 && variantA.submissions >= 50 && variantB.submissions >= 50) {
        const winnerIndex = variantA.conversionRate > variantB.conversionRate ? 0 : 1
        results[winnerIndex].isWinner = true
        results[winnerIndex].statisticalSignificance = significance
      }
    }

    return results
  } catch (error) {
    console.error('[A/B Testing] Error getting results:', error)
    return []
  }
}

/**
 * Calculate Chi-squared test for statistical significance
 */
function calculateChiSquared(
  viewsA: number,
  conversionsA: number,
  viewsB: number,
  conversionsB: number
): number {
  const totalViews = viewsA + viewsB
  const totalConversions = conversionsA + conversionsB

  if (totalViews === 0 || totalConversions === 0) {
    return 0
  }

  const expectedConversionRate = totalConversions / totalViews

  const expectedA = viewsA * expectedConversionRate
  const expectedB = viewsB * expectedConversionRate

  const chiSquared =
    Math.pow(conversionsA - expectedA, 2) / expectedA +
    Math.pow(conversionsB - expectedB, 2) / expectedB

  // Convert chi-squared to confidence percentage (simplified)
  // Chi-squared > 3.84 = 95% confidence
  // Chi-squared > 6.63 = 99% confidence
  if (chiSquared > 6.63) return 99
  if (chiSquared > 3.84) return 95
  if (chiSquared > 2.71) return 90
  return Math.min(chiSquared * 30, 90)
}

/**
 * Auto-declare winner and disable losing variants
 */
export async function autoDeclareWinner(formId: string): Promise<boolean> {
  const results = await getABTestResults(formId)

  const winner = results.find(r => r.isWinner)
  if (!winner) {
    return false
  }

  const supabase = createServiceClient()

  try {
    // Deactivate losing variants
    await supabase
      .from('form_variants')
      .update({ active: false })
      .eq('form_id', formId)
      .neq('id', winner.variantId)

    // Mark winner
    await supabase
      .from('form_variants')
      .update({ is_winner: true })
      .eq('id', winner.variantId)

    return true
  } catch (error) {
    console.error('[A/B Testing] Error declaring winner:', error)
    return false
  }
}

