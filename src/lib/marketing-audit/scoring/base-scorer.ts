/**
 * Marketing Audit Module - Base Scorer
 * 
 * Abstract base class for all scoring engines.
 * Each category (Technical, Local, Content, Analytics, Conversion) extends this.
 */

import type { Recommendation, Evidence } from '../types';

export abstract class BaseScorer {
  protected weights: Record<string, number>;
  
  constructor(weights?: Record<string, number>) {
    this.weights = weights || this.getDefaultWeights();
  }
  
  /**
   * Calculate score for a category (0-100)
   */
  abstract calculateScore(metrics: any): number;
  
  /**
   * Get default weights for scoring components
   */
  abstract getDefaultWeights(): Record<string, number>;
  
  /**
   * Generate actionable recommendations based on metrics and score
   */
  abstract generateRecommendations(metrics: any, score: number): Recommendation[];
  
  /**
   * Normalize a value to 0-100 scale
   */
  protected normalize(value: number, min: number, max: number): number {
    if (value <= min) return 0;
    if (value >= max) return 100;
    return ((value - min) / (max - min)) * 100;
  }
  
  /**
   * Inverse normalize (lower is better)
   */
  protected inverseNormalize(value: number, min: number, max: number): number {
    if (value <= min) return 100;
    if (value >= max) return 0;
    return ((max - value) / (max - min)) * 100;
  }
  
  /**
   * Calculate recommendation priority
   */
  protected calculatePriority(rec: Pick<Recommendation, 'impact' | 'effort' | 'confidence'>): number {
    const impactScore = rec.impact === 'high' ? 90 : rec.impact === 'medium' ? 60 : 30;
    const effortScore = rec.effort === 'low' ? 100 : rec.effort === 'medium' ? 60 : 30;
    const confidenceMultiplier = rec.confidence === 'high' ? 1.0 : rec.confidence === 'medium' ? 0.8 : 0.6;
    
    return Math.round(((impactScore + effortScore) / 2) * confidenceMultiplier);
  }
  
  /**
   * Create evidence object
   */
  protected createEvidence(
    metric: string,
    source: string,
    value: number | string,
    url?: string
  ): Evidence {
    return {
      metric,
      source,
      value,
      url,
      timestamp: new Date().toISOString(),
    };
  }
}

