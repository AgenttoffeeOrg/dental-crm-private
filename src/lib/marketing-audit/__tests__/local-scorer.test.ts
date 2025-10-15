/**
 * Local Scorer - Unit Tests
 */

import { LocalScorer } from '../scoring/local-scorer';
import type { LocalMetrics } from '../types';

describe('LocalScorer', () => {
  let scorer: LocalScorer;
  
  beforeEach(() => {
    scorer = new LocalScorer();
  });
  
  describe('calculateScore', () => {
    it('should score excellent local presence highly', () => {
      const excellentMetrics: LocalMetrics = {
        gbp_completeness: 100,
        reviews: {
          total_count: 500,
          avg_rating: 4.9,
          last_30_days: 30,
          response_rate: 100,
          avg_response_time_hours: 2,
        },
        nap_consistency: 100,
        citations: {
          total_found: 50,
          top_50_coverage: 100,
          inconsistent: 0,
        },
        local_pack_appearances: 10,
      };
      
      const score = scorer.calculateScore(excellentMetrics);
      expect(score).toBeGreaterThan(90);
    });
    
    it('should penalize low review count', () => {
      const fewReviews: LocalMetrics = {
        gbp_completeness: 80,
        reviews: {
          total_count: 10,
          avg_rating: 4.5,
          last_30_days: 1,
          response_rate: 50,
          avg_response_time_hours: 48,
        },
        nap_consistency: 70,
        citations: {
          total_found: 15,
          top_50_coverage: 30,
          inconsistent: 5,
        },
        local_pack_appearances: 2,
      };
      
      const score = scorer.calculateScore(fewReviews);
      expect(score).toBeLessThan(60);
    });
    
    it('should handle Phase 1 metrics (no BrightLocal data)', () => {
      const phase1Metrics: LocalMetrics = {
        gbp_completeness: 0,
        reviews: {
          total_count: 100,
          avg_rating: 4.5,
          last_30_days: 10,
          response_rate: 0,
          avg_response_time_hours: 0,
        },
        nap_consistency: 0,
        citations: {
          total_found: 0,
          top_50_coverage: 0,
          inconsistent: 0,
        },
        local_pack_appearances: 0,
      };
      
      const score = scorer.calculateScore(phase1Metrics);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });
  });
  
  describe('generateRecommendations', () => {
    it('should recommend increasing review velocity', () => {
      const metrics: LocalMetrics = {
        gbp_completeness: 80,
        reviews: {
          total_count: 50,
          avg_rating: 4.5,
          last_30_days: 5, // Low velocity
          response_rate: 80,
          avg_response_time_hours: 24,
        },
        nap_consistency: 80,
        citations: {
          total_found: 30,
          top_50_coverage: 60,
          inconsistent: 2,
        },
        local_pack_appearances: 5,
      };
      
      const recommendations = scorer.generateRecommendations(metrics, 70);
      const velocityRec = recommendations.find(r => r.title.includes('Velocity'));
      
      expect(velocityRec).toBeDefined();
      expect(velocityRec?.impact).toBe('high');
      expect(velocityRec?.current_value).toBe(5);
      expect(velocityRec?.target_value).toBe(25);
    });
  });
});

