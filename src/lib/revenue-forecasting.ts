/**
 * Revenue Forecasting System
 * 
 * Predicts future revenue using linear regression and historical patterns.
 * Provides confidence intervals for predictions.
 */

import { createClient } from './supabase-client'
import { startOfMonth, addMonths, format, subMonths } from 'date-fns'

export interface ForecastData {
  month: string
  predictedRevenue: number
  lowerBound: number
  upperBound: number
  confidence: number
  isActual: boolean
}

/**
 * Simple linear regression for trend prediction
 */
function linearRegression(xValues: number[], yValues: number[]): { slope: number; intercept: number } {
  const n = xValues.length
  if (n === 0) return { slope: 0, intercept: 0 }

  const sumX = xValues.reduce((a, b) => a + b, 0)
  const sumY = yValues.reduce((a, b) => a + b, 0)
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0)
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  return { slope, intercept }
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length
  
  return Math.sqrt(variance)
}

/**
 * Forecast revenue for next N months
 */
export async function forecastRevenue(
  tenantId: string,
  monthsToForecast: number = 3,
  historicalMonths: number = 6
): Promise<ForecastData[]> {
  const supabase = createClient()
  
  try {
    // Get historical revenue data
    const startDate = startOfMonth(subMonths(new Date(), historicalMonths))
    
    const { data: deals, error } = await supabase
      .from('deals')
      .select('value_estimate_cents, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())

    if (error) throw error
    if (!deals || deals.length === 0) {
      return []
    }

    // Group by month
    const monthlyRevenue = new Map<string, number>()
    
    deals.forEach(deal => {
      const month = format(new Date(deal.created_at), 'yyyy-MM')
      const current = monthlyRevenue.get(month) || 0
      monthlyRevenue.set(month, current + (deal.value_estimate_cents || 0))
    })

    // Prepare data for regression
    const months: string[] = []
    const revenues: number[] = []
    
    for (let i = historicalMonths - 1; i >= 0; i--) {
      const month = format(subMonths(new Date(), i), 'yyyy-MM')
      months.push(month)
      revenues.push(monthlyRevenue.get(month) || 0)
    }

    // Calculate regression
    const xValues = months.map((_, i) => i)
    const { slope, intercept } = linearRegression(xValues, revenues)

    // Calculate confidence (based on standard deviation)
    const stdDev = standardDeviation(revenues)
    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length
    const confidence = Math.max(0, Math.min(100, 100 - (stdDev / avgRevenue) * 100))

    // Generate forecast
    const forecast: ForecastData[] = []

    // Add historical data
    months.forEach((month, i) => {
      forecast.push({
        month: format(new Date(month + '-01'), 'MMM yyyy'),
        predictedRevenue: revenues[i],
        lowerBound: revenues[i],
        upperBound: revenues[i],
        confidence: 100,
        isActual: true
      })
    })

    // Add predictions
    for (let i = 1; i <= monthsToForecast; i++) {
      const monthIndex = months.length + i - 1
      const predicted = slope * monthIndex + intercept
      const margin = stdDev * 1.96 // 95% confidence interval
      
      const nextMonth = addMonths(new Date(), i - 1)
      
      forecast.push({
        month: format(nextMonth, 'MMM yyyy'),
        predictedRevenue: Math.max(0, predicted),
        lowerBound: Math.max(0, predicted - margin),
        upperBound: Math.max(0, predicted + margin),
        confidence: Math.round(confidence),
        isActual: false
      })
    }

    return forecast

  } catch (error) {
    console.error('[Forecasting] Error generating forecast:', error)
    return []
  }
}

/**
 * Get forecast summary
 */
export async function getForecastSummary(
  tenantId: string
): Promise<{
  nextMonthPrediction: number
  trend: 'up' | 'down' | 'stable'
  confidence: number
  message: string
} | null> {
  try {
    const forecast = await forecastRevenue(tenantId, 1, 6)
    if (forecast.length === 0) return null

    const lastActual = forecast.filter(f => f.isActual).pop()
    const nextPrediction = forecast.find(f => !f.isActual)

    if (!lastActual || !nextPrediction) return null

    const change = ((nextPrediction.predictedRevenue - lastActual.predictedRevenue) / lastActual.predictedRevenue) * 100
    const trend = change > 5 ? 'up' : change < -5 ? 'down' : 'stable'

    let message = ''
    if (trend === 'up') {
      message = `Revenue forecasted to increase by ${change.toFixed(1)}% next month`
    } else if (trend === 'down') {
      message = `Revenue forecasted to decrease by ${Math.abs(change).toFixed(1)}% next month`
    } else {
      message = 'Revenue forecasted to remain stable next month'
    }

    return {
      nextMonthPrediction: nextPrediction.predictedRevenue,
      trend,
      confidence: nextPrediction.confidence,
      message
    }

  } catch (error) {
    console.error('[Forecasting] Error getting summary:', error)
    return null
  }
}

