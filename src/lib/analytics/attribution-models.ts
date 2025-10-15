/**
 * Advanced Attribution Models
 * 
 * Beyond first-touch and last-touch attribution
 * 
 * Supported Models:
 * 1. **Position-Based (U-Shaped):** 40% first, 20% middle, 40% last
 * 2. **Time-Decay:** Recent touches weighted more (exponential decay)
 * 3. **Linear:** Equal credit to all touches
 * 4. **Data-Driven (ML-based):** Algorithmic weighting (future)
 * 
 * References:
 * - HubSpot: https://knowledge.hubspot.com/reports/analyze-your-marketing-attribution
 * - Google Analytics: https://support.google.com/analytics/answer/1662518
 * - Salesforce: https://help.salesforce.com/s/articleView?id=sf.campaigns_influence_attribution_models.htm
 */

export type AttributionModel = 
  | 'first_touch'
  | 'last_touch'
  | 'linear'
  | 'position_based'
  | 'time_decay'
  | 'data_driven'

export interface TouchPoint {
  campaignId: string
  campaignName: string
  channel: string
  timestamp: Date
  cost: number
}

export interface AttributionResult {
  campaignId: string
  campaignName: string
  channel: string
  credit: number // Revenue credit assigned
  creditPercentage: number
}

/**
 * Calculate attribution using selected model
 * 
 * @param touches - Array of touch points (ordered chronologically)
 * @param revenue - Total revenue to attribute
 * @param model - Attribution model to use
 * @returns Attribution results per campaign
 */
export function calculateAttribution(
  touches: TouchPoint[],
  revenue: number,
  model: AttributionModel
): AttributionResult[] {
  if (touches.length === 0) return []
  
  switch (model) {
    case 'first_touch':
      return firstTouchAttribution(touches, revenue)
    case 'last_touch':
      return lastTouchAttribution(touches, revenue)
    case 'linear':
      return linearAttribution(touches, revenue)
    case 'position_based':
      return positionBasedAttribution(touches, revenue)
    case 'time_decay':
      return timeDecayAttribution(touches, revenue)
    case 'data_driven':
      return dataDrivenAttribution(touches, revenue)
    default:
      return firstTouchAttribution(touches, revenue)
  }
}

/**
 * First-Touch Attribution
 * 100% credit to first campaign
 */
function firstTouchAttribution(touches: TouchPoint[], revenue: number): AttributionResult[] {
  const first = touches[0]
  
  return [{
    campaignId: first.campaignId,
    campaignName: first.campaignName,
    channel: first.channel,
    credit: revenue,
    creditPercentage: 100,
  }]
}

/**
 * Last-Touch Attribution
 * 100% credit to last campaign
 */
function lastTouchAttribution(touches: TouchPoint[], revenue: number): AttributionResult[] {
  const last = touches[touches.length - 1]
  
  return [{
    campaignId: last.campaignId,
    campaignName: last.campaignName,
    channel: last.channel,
    credit: revenue,
    creditPercentage: 100,
  }]
}

/**
 * Linear Attribution
 * Equal credit to all touches
 */
function linearAttribution(touches: TouchPoint[], revenue: number): AttributionResult[] {
  const creditPerTouch = revenue / touches.length
  const percentagePerTouch = 100 / touches.length
  
  // Group by campaign (in case same campaign appears multiple times)
  const grouped = groupByCampaign(touches)
  
  return Object.values(grouped).map(touch => ({
    campaignId: touch.campaignId,
    campaignName: touch.campaignName,
    channel: touch.channel,
    credit: creditPerTouch * touch.count,
    creditPercentage: percentagePerTouch * touch.count,
  }))
}

/**
 * Position-Based Attribution (U-Shaped)
 * 40% first, 20% middle touches, 40% last
 * 
 * Reference: HubSpot Position-Based model
 */
function positionBasedAttribution(touches: TouchPoint[], revenue: number): AttributionResult[] {
  if (touches.length === 1) {
    return [{
      campaignId: touches[0].campaignId,
      campaignName: touches[0].campaignName,
      channel: touches[0].channel,
      credit: revenue,
      creditPercentage: 100,
    }]
  }
  
  if (touches.length === 2) {
    // 50% each
    return touches.map(touch => ({
      campaignId: touch.campaignId,
      campaignName: touch.campaignName,
      channel: touch.channel,
      credit: revenue * 0.5,
      creditPercentage: 50,
    }))
  }
  
  // 3+ touches
  const first = touches[0]
  const last = touches[touches.length - 1]
  const middle = touches.slice(1, -1)
  
  const firstCredit = revenue * 0.4
  const lastCredit = revenue * 0.4
  const middleCredit = revenue * 0.2
  const middleCreditPerTouch = middle.length > 0 ? middleCredit / middle.length : 0
  
  const results: AttributionResult[] = []
  
  // First touch
  results.push({
    campaignId: first.campaignId,
    campaignName: first.campaignName,
    channel: first.channel,
    credit: firstCredit,
    creditPercentage: 40,
  })
  
  // Middle touches
  middle.forEach(touch => {
    results.push({
      campaignId: touch.campaignId,
      campaignName: touch.campaignName,
      channel: touch.channel,
      credit: middleCreditPerTouch,
      creditPercentage: (20 / middle.length),
    })
  })
  
  // Last touch
  results.push({
    campaignId: last.campaignId,
    campaignName: last.campaignName,
    channel: last.channel,
    credit: lastCredit,
    creditPercentage: 40,
  })
  
  return aggregateResults(results)
}

/**
 * Time-Decay Attribution
 * More recent touches get more credit (exponential decay)
 * 
 * Formula: weight = e^(-decay_rate × days_before_conversion)
 * Decay rate: 0.1 (configurable)
 * 
 * Reference: Google Analytics Time Decay model
 */
function timeDecayAttribution(touches: TouchPoint[], revenue: number): AttributionResult[] {
  const conversionDate = touches[touches.length - 1].timestamp
  const decayRate = 0.1 // Half-life ~7 days
  
  // Calculate weights for each touch
  const weights = touches.map(touch => {
    const daysBefore = (conversionDate.getTime() - touch.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    return Math.exp(-decayRate * daysBefore)
  })
  
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  
  // Assign credit proportional to weight
  const results: AttributionResult[] = touches.map((touch, index) => {
    const creditPercentage = (weights[index] / totalWeight) * 100
    
    return {
      campaignId: touch.campaignId,
      campaignName: touch.campaignName,
      channel: touch.channel,
      credit: revenue * (weights[index] / totalWeight),
      creditPercentage,
    }
  })
  
  return aggregateResults(results)
}

/**
 * Data-Driven Attribution (ML-based)
 * 
 * Uses historical conversion data to determine optimal weighting
 * 
 * Simplified implementation:
 * - Analyze historical conversions
 * - Calculate conversion probability after each touch type
 * - Assign credit based on incremental lift
 * 
 * Full implementation would use ML (logistic regression, random forest)
 */
function dataDrivenAttribution(touches: TouchPoint[], revenue: number): AttributionResult[] {
  // Simplified: Use position-based as proxy
  // Full implementation would require:
  // 1. Historical data analysis
  // 2. ML model training
  // 3. Conversion probability calculation
  // 4. Incremental lift attribution
  
  return positionBasedAttribution(touches, revenue)
}

/**
 * Helper: Group touches by campaign
 */
function groupByCampaign(touches: TouchPoint[]): Record<string, TouchPoint & { count: number }> {
  const grouped: Record<string, TouchPoint & { count: number }> = {}
  
  touches.forEach(touch => {
    if (!grouped[touch.campaignId]) {
      grouped[touch.campaignId] = { ...touch, count: 1 }
    } else {
      grouped[touch.campaignId].count++
    }
  })
  
  return grouped
}

/**
 * Helper: Aggregate results by campaign (sum credit)
 */
function aggregateResults(results: AttributionResult[]): AttributionResult[] {
  const aggregated: Record<string, AttributionResult> = {}
  
  results.forEach(result => {
    if (!aggregated[result.campaignId]) {
      aggregated[result.campaignId] = result
    } else {
      aggregated[result.campaignId].credit += result.credit
      aggregated[result.campaignId].creditPercentage += result.creditPercentage
    }
  })
  
  return Object.values(aggregated)
}

/**
 * Compare attribution models side-by-side
 * 
 * @param touches - Touch points
 * @param revenue - Revenue to attribute
 * @returns Results for all models
 */
export function compareAttributionModels(
  touches: TouchPoint[],
  revenue: number
): Record<AttributionModel, AttributionResult[]> {
  return {
    first_touch: firstTouchAttribution(touches, revenue),
    last_touch: lastTouchAttribution(touches, revenue),
    linear: linearAttribution(touches, revenue),
    position_based: positionBasedAttribution(touches, revenue),
    time_decay: timeDecayAttribution(touches, revenue),
    data_driven: dataDrivenAttribution(touches, revenue),
  }
}

