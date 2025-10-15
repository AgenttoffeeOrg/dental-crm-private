/**
 * Marketing Audit Module - Local Presence Scorer
 * 
 * Scores local SEO presence based on:
 * - GBP Completeness (25%) - Phase 2
 * - Reviews (30%) - Phase 1
 * - NAP Consistency (20%) - Phase 2
 * - Citations (15%) - Phase 2
 * - Local Pack Presence (10%) - Phase 2
 * 
 * Phase 1: Simplified scoring with just reviews data
 * Phase 2: Full scoring with BrightLocal data
 */

import { BaseScorer } from './base-scorer';
import type { LocalMetrics, Recommendation } from '../types';

export class LocalScorer extends BaseScorer {
  calculateScore(metrics: LocalMetrics): number {
    let score = 0;
    
    // GBP Completeness (25 points) - Phase 2 only
    if (metrics.gbp_completeness !== undefined) {
      score += (metrics.gbp_completeness / 100) * 25;
    } else {
      // Phase 1: Estimate based on review data (if we have reviews, assume partial completion)
      score += metrics.reviews.total_count > 0 ? 15 : 5;
    }
    
    // Reviews (30 points)
    // Review count (15 points) - diminishing returns after 200 reviews
    const reviewPoints = Math.min((metrics.reviews.total_count / 200) * 15, 15);
    score += reviewPoints;
    
    // Average rating (15 points) - on 3-5 scale (3 is minimum passing)
    if (metrics.reviews.avg_rating >= 3.0) {
      const ratingPoints = ((metrics.reviews.avg_rating - 3) / 2) * 15;
      score += ratingPoints;
    }
    
    // NAP Consistency (20 points) - Phase 2 only
    if (metrics.nap_consistency !== undefined) {
      score += (metrics.nap_consistency / 100) * 20;
    } else {
      // Phase 1: Assume 50% if no data
      score += 10;
    }
    
    // Citations (15 points) - Phase 2 only
    if (metrics.citations?.total_found !== undefined) {
      const citationPoints = Math.min((metrics.citations.total_found / 50) * 15, 15);
      score += citationPoints;
    } else {
      // Phase 1: Assume 50% if no data
      score += 7.5;
    }
    
    // Local Pack Presence (10 points) - Phase 2 only
    if (metrics.local_pack_appearances !== undefined) {
      const packPoints = Math.min((metrics.local_pack_appearances / 10) * 10, 10);
      score += packPoints;
    } else {
      // Phase 1: Assume 50% if no data
      score += 5;
    }
    
    return Math.min(Math.round(score * 10) / 10, 100);
  }
  
  getDefaultWeights(): Record<string, number> {
    return {
      gbp_completeness: 0.25,
      reviews: 0.30,
      nap_consistency: 0.20,
      citations: 0.15,
      local_pack: 0.10,
    };
  }
  
  generateRecommendations(metrics: LocalMetrics, score: number): Recommendation[] {
    const recs: Partial<Recommendation>[] = [];
    
    // Review velocity recommendation
    if (metrics.reviews.last_30_days < 15) {
      recs.push({
        category: 'local_presence',
        title: `Increase Google Reviews Velocity`,
        description: `You're receiving ${metrics.reviews.last_30_days} reviews per month. Best practices suggest 15-25+ reviews/month for strong local presence. Top dental practices average 25/month.`,
        impact: 'high',
        effort: 'medium',
        confidence: 'high',
        estimated_hours: 4,
        current_value: metrics.reviews.last_30_days,
        target_value: 25,
        action_steps: [
          'Set up automated email sequence post-appointment',
          'Train front desk staff on review requests',
          'Create SMS reminder 3 days after visit',
          'Add review request QR code to business cards',
          'Monitor and respond to ALL new reviews within 24 hours',
          'Consider review generation software',
        ],
        evidence: [this.createEvidence('reviews_last_30_days', 'places_api', metrics.reviews.last_30_days)],
      });
    }
    
    // Average rating recommendation
    if (metrics.reviews.avg_rating < 4.5) {
      recs.push({
        category: 'local_presence',
        title: `Improve Average Rating to 4.5+`,
        description: `Your average rating is ${metrics.reviews.avg_rating.toFixed(1)}/5. Top competitors have 4.7-4.9. Higher ratings improve local pack rankings and click-through rates.`,
        impact: 'high',
        effort: 'high',
        confidence: 'medium',
        estimated_hours: 20,
        current_value: parseFloat(metrics.reviews.avg_rating.toFixed(1)),
        target_value: 4.7,
        action_steps: [
          'Implement patient satisfaction surveys',
          'Address negative feedback proactively',
          'Improve patient experience (reduce wait times, etc.)',
          'Train staff on customer service excellence',
          'Follow up with unhappy patients before they leave reviews',
          'Respond professionally to negative reviews',
        ],
        evidence: [this.createEvidence('avg_rating', 'places_api', metrics.reviews.avg_rating)],
      });
    }
    
    // Review response rate recommendation
    if (metrics.reviews.response_rate < 80) {
      recs.push({
        category: 'local_presence',
        title: `Respond to More Google Reviews`,
        description: `You're responding to ${metrics.reviews.response_rate.toFixed(1)}% of reviews. Target is 90-100%. Responding shows engagement and improves local SEO.`,
        impact: 'medium',
        effort: 'low',
        confidence: 'high',
        estimated_hours: 2,
        current_value: parseFloat(metrics.reviews.response_rate.toFixed(1)),
        target_value: 95,
        action_steps: [
          'Set up Google Business Profile alerts for new reviews',
          'Assign team member to monitor reviews daily',
          'Create response templates for common feedback types',
          'Respond to all reviews within 24-48 hours',
          'Personalize each response (don\'t use templates verbatim)',
        ],
        evidence: [this.createEvidence('review_response_rate', 'places_api', metrics.reviews.response_rate)],
      });
    }
    
    // Total review count recommendation
    if (metrics.reviews.total_count < 100) {
      recs.push({
        category: 'local_presence',
        title: `Build Review Base to 100+ Reviews`,
        description: `You have ${metrics.reviews.total_count} total reviews. Practices with 100+ reviews get better local rankings and higher trust. You need ${100 - metrics.reviews.total_count} more reviews.`,
        impact: 'high',
        effort: 'high',
        confidence: 'high',
        estimated_hours: 40,
        current_value: metrics.reviews.total_count,
        target_value: 100,
        action_steps: [
          'Launch systematic review generation campaign',
          'Ask every happy patient (in person + follow-up)',
          'Make it easy (text link, QR code, email link)',
          'Incentivize participation (raffle, small gift)',
          'Be patient - aim for 15-25 reviews/month',
        ],
        evidence: [this.createEvidence('total_reviews', 'places_api', metrics.reviews.total_count)],
      });
    }
    
    // Calculate priority scores
    recs.forEach(rec => {
      rec.priority_score = this.calculatePriority(rec as any);
    });
    
    return recs.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)) as Recommendation[];
  }
}

