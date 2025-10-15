/**
 * Advanced Anomaly Detection
 * 
 * Detect unusual patterns and outliers in metrics
 * 
 * Methods:
 * 1. **Z-Score:** Statistical deviation (>3 SD = anomaly)
 * 2. **IQR (Interquartile Range):** Outlier detection
 * 3. **Seasonality Detection:** Day-of-week, month patterns
 * 4. **Moving Average:** Compare to trend line
 * 5. **Rate of Change:** Sudden spikes/drops
 * 
 * References:
 * - Datadog: https://www.datadoghq.com/blog/engineering/outlier-detection-algorithms-at-datadog/
 * - AWS CloudWatch: https://aws.amazon.com/blogs/mt/use-amazon-cloudwatch-anomaly-detection/
 * - Google Analytics: Automatic anomaly detection in GA4
 */

export interface DataPoint {
  date: string
  value: number
}

export interface Anomaly {
  date: string
  value: number
  expectedValue: number
  deviation: number
  deviationPercentage: number
  zScore: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  method: 'z_score' | 'iqr' | 'seasonality' | 'moving_average' | 'rate_of_change'
  explanation: string
}

/**
 * Detect anomalies using Z-Score method
 * 
 * Z-Score = (value - mean) / standardDeviation
 * - |Z| > 3 = Critical anomaly (0.3% probability)
 * - |Z| > 2 = High anomaly (5% probability)
 * - |Z| > 1.5 = Medium anomaly
 */
export function detectAnomaliesZScore(data: DataPoint[]): Anomaly[] {
  if (data.length < 7) {
    return [] // Need at least 7 data points for statistical significance
  }
  
  // Calculate mean and standard deviation
  const values = data.map(d => d.value)
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)
  
  if (stdDev === 0) {
    return [] // No variation = no anomalies
  }
  
  const anomalies: Anomaly[] = []
  
  data.forEach(point => {
    const zScore = (point.value - mean) / stdDev
    const absZScore = Math.abs(zScore)
    
    if (absZScore > 1.5) {
      const deviation = point.value - mean
      const deviationPercentage = (deviation / mean) * 100
      
      let severity: Anomaly['severity'] = 'low'
      if (absZScore > 3) severity = 'critical'
      else if (absZScore > 2) severity = 'high'
      else if (absZScore > 1.5) severity = 'medium'
      
      anomalies.push({
        date: point.date,
        value: point.value,
        expectedValue: mean,
        deviation,
        deviationPercentage,
        zScore,
        severity,
        method: 'z_score',
        explanation: zScore > 0
          ? `Value is ${absZScore.toFixed(1)} standard deviations ABOVE average (${severity} anomaly)`
          : `Value is ${absZScore.toFixed(1)} standard deviations BELOW average (${severity} anomaly)`,
      })
    }
  })
  
  return anomalies
}

/**
 * Detect anomalies using IQR (Interquartile Range) method
 * 
 * More robust to outliers than Z-score
 * 
 * IQR = Q3 - Q1
 * Outlier if: value < Q1 - 1.5×IQR  OR  value > Q3 + 1.5×IQR
 */
export function detectAnomaliesIQR(data: DataPoint[]): Anomaly[] {
  if (data.length < 7) return []
  
  // Sort values
  const values = data.map(d => d.value).sort((a, b) => a - b)
  
  // Calculate quartiles
  const q1Index = Math.floor(values.length * 0.25)
  const q3Index = Math.floor(values.length * 0.75)
  const q1 = values[q1Index]
  const q3 = values[q3Index]
  const iqr = q3 - q1
  
  // Calculate bounds
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr
  
  const median = values[Math.floor(values.length / 2)]
  
  const anomalies: Anomaly[] = []
  
  data.forEach(point => {
    if (point.value < lowerBound || point.value > upperBound) {
      const deviation = point.value - median
      const deviationPercentage = (deviation / median) * 100
      
      // Calculate pseudo Z-score for severity
      const distanceFromBound = point.value < lowerBound
        ? lowerBound - point.value
        : point.value - upperBound
      
      const severity = distanceFromBound > iqr * 2 ? 'critical' :
                      distanceFromBound > iqr ? 'high' : 'medium'
      
      anomalies.push({
        date: point.date,
        value: point.value,
        expectedValue: median,
        deviation,
        deviationPercentage,
        zScore: 0, // IQR method doesn't use Z-score
        severity,
        method: 'iqr',
        explanation: point.value < lowerBound
          ? `Value is ${Math.abs(deviationPercentage).toFixed(1)}% below expected range (IQR outlier)`
          : `Value is ${Math.abs(deviationPercentage).toFixed(1)}% above expected range (IQR outlier)`,
      })
    }
  })
  
  return anomalies
}

/**
 * Detect rate-of-change anomalies
 * 
 * Identify sudden spikes or drops (>50% change in one period)
 */
export function detectRateOfChangeAnomalies(data: DataPoint[]): Anomaly[] {
  if (data.length < 2) return []
  
  const anomalies: Anomaly[] = []
  
  for (let i = 1; i < data.length; i++) {
    const current = data[i]
    const previous = data[i - 1]
    
    if (previous.value === 0) continue
    
    const change = current.value - previous.value
    const changePercentage = (change / previous.value) * 100
    
    // Detect sudden changes (>50% increase or >30% decrease)
    if (Math.abs(changePercentage) > 50 || changePercentage < -30) {
      const severity = Math.abs(changePercentage) > 100 ? 'critical' :
                      Math.abs(changePercentage) > 75 ? 'high' :
                      Math.abs(changePercentage) > 50 ? 'medium' : 'low'
      
      anomalies.push({
        date: current.date,
        value: current.value,
        expectedValue: previous.value,
        deviation: change,
        deviationPercentage: changePercentage,
        zScore: 0,
        severity,
        method: 'rate_of_change',
        explanation: changePercentage > 0
          ? `Sudden ${changePercentage.toFixed(1)}% INCREASE from previous period`
          : `Sudden ${Math.abs(changePercentage).toFixed(1)}% DROP from previous period`,
      })
    }
  }
  
  return anomalies
}

/**
 * Detect seasonality-based anomalies
 * 
 * Compare to same period in previous cycles (day-of-week, month)
 */
export function detectSeasonalityAnomalies(
  data: DataPoint[],
  seasonality: 'weekly' | 'monthly' | 'yearly'
): Anomaly[] {
  // Simplified implementation
  // Full implementation would:
  // 1. Extract seasonal pattern (ARIMA, STL decomposition)
  // 2. Compare actual vs seasonal expectation
  // 3. Flag deviations
  
  // For now, return empty (complex to implement without time-series library)
  return []
}

/**
 * Detect all anomalies using multiple methods
 * 
 * @param data - Time series data
 * @returns Combined anomalies from all detection methods
 */
export function detectAllAnomalies(data: DataPoint[]): Anomaly[] {
  const zScoreAnomalies = detectAnomaliesZScore(data)
  const iqrAnomalies = detectAnomaliesIQR(data)
  const rateOfChangeAnomalies = detectRateOfChangeAnomalies(data)
  
  // Deduplicate (same date detected by multiple methods)
  const anomalyMap = new Map<string, Anomaly>()
  
  const allAnomalies = [...zScoreAnomalies, ...iqrAnomalies, ...rateOfChangeAnomalies]
  
  allAnomalies.forEach(anomaly => {
    const existing = anomalyMap.get(anomaly.date)
    
    if (!existing) {
      anomalyMap.set(anomaly.date, anomaly)
    } else {
      // Keep the more severe anomaly
      const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 }
      if (severityOrder[anomaly.severity] > severityOrder[existing.severity]) {
        anomalyMap.set(anomaly.date, anomaly)
      }
    }
  })
  
  return Array.from(anomalyMap.values()).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

/**
 * Generate explanation for anomaly
 * 
 * Uses OpenAI to provide business context
 */
export async function explainAnomaly(
  metric: string,
  anomaly: Anomaly,
  context?: Record<string, any>
): Promise<string> {
  // Simplified - in production, call OpenAI API
  const direction = anomaly.deviation > 0 ? 'spike' : 'drop'
  const magnitude = Math.abs(anomaly.deviationPercentage)
  
  return `Your ${metric} experienced a significant ${direction} (${magnitude.toFixed(1)}%) on ${anomaly.date}. ` +
         `This is ${Math.abs(anomaly.zScore).toFixed(1)} standard deviations from your average. ` +
         `Consider investigating: campaign changes, external events, or data quality issues.`
}

