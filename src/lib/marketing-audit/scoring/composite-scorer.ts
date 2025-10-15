/**
 * Marketing Audit Module - Composite Scorer
 * 
 * Calculates the overall composite score as a weighted average of 5 sub-scores:
 * - Technical SEO (25%)
 * - Local Presence (30%)
 * - Content & Authority (20%)
 * - Analytics Hygiene (15%)
 * - Conversion UX (10%)
 */

import { BaseScorer } from './base-scorer';
import type { Scores } from '../types';

export class CompositeScorer extends BaseScorer {
  calculateScore(metrics: any): number {
    // Not used - use calculateCompositeScore instead
    return 0;
  }
  
  getDefaultWeights(): Record<string, number> {
    return {
      technical: 0.25,
      local: 0.30,
      content: 0.20,
      analytics: 0.15,
      conversion: 0.10,
    };
  }
  
  generateRecommendations(metrics: any, score: number): any[] {
    // Not used - recommendations come from individual scorers
    return [];
  }
  
  /**
   * Calculate composite score from sub-scores
   */
  calculateCompositeScore(scores: Omit<Scores, 'composite'>): number {
    const weights = this.getDefaultWeights();
    
    const composite = 
      (scores.technical * weights.technical) +
      (scores.local * weights.local) +
      (scores.content * weights.content) +
      (scores.analytics * weights.analytics) +
      (scores.conversion * weights.conversion);
    
    return Math.min(Math.round(composite * 10) / 10, 100);
  }
  
  /**
   * Calculate contribution of each sub-score to composite
   */
  calculateContributions(scores: Omit<Scores, 'composite'>): Record<string, number> {
    const weights = this.getDefaultWeights();
    
    return {
      technical: scores.technical * weights.technical,
      local: scores.local * weights.local,
      content: scores.content * weights.content,
      analytics: scores.analytics * weights.analytics,
      conversion: scores.conversion * weights.conversion,
    };
  }
  
  /**
   * Get score assessment label
   */
  getScoreLabel(score: number): { label: string; color: string } {
    if (score >= 90) return { label: 'Excellent', color: 'green' };
    if (score >= 80) return { label: 'Very Good', color: 'green' };
    if (score >= 70) return { label: 'Good', color: 'green' };
    if (score >= 60) return { label: 'Fair', color: 'yellow' };
    if (score >= 40) return { label: 'Needs Work', color: 'orange' };
    return { label: 'Poor', color: 'red' };
  }
}

