/**
 * Technical Scorer - Unit Tests
 * 
 * Tests for Technical SEO scoring logic and recommendation generation.
 */

import { TechnicalScorer } from '../scoring/technical-scorer';
import type { TechnicalMetrics } from '../types';

describe('TechnicalScorer', () => {
  let scorer: TechnicalScorer;
  
  beforeEach(() => {
    scorer = new TechnicalScorer();
  });
  
  describe('calculateScore', () => {
    it('should return 100 for perfect metrics', () => {
      const perfectMetrics: TechnicalMetrics = {
        core_web_vitals: {
          lcp: 1.5,
          fid: 50,
          cls: 0.05,
          assessment: 'good',
        },
        lighthouse: {
          performance: 100,
          accessibility: 100,
          bestPractices: 100,
          seo: 100,
        },
        indexation: {
          indexed_pages: 100,
          submitted_pages: 100,
          coverage_ratio: 100,
          errors: 0,
          warnings: 0,
        },
        https: true,
        mobile_friendly: true,
        has_sitemap: true,
      };
      
      const score = scorer.calculateScore(perfectMetrics);
      expect(score).toBe(100);
    });
    
    it('should penalize poor Core Web Vitals', () => {
      const poorCWV: TechnicalMetrics = {
        core_web_vitals: {
          lcp: 5.0, // Poor (>4.0)
          fid: 400, // Poor (>300)
          cls: 0.3, // Poor (>0.25)
          assessment: 'poor',
        },
        lighthouse: {
          performance: 100,
          accessibility: 100,
          bestPractices: 100,
          seo: 100,
        },
        indexation: {
          indexed_pages: 100,
          submitted_pages: 100,
          coverage_ratio: 100,
          errors: 0,
          warnings: 0,
        },
        https: true,
        mobile_friendly: true,
        has_sitemap: true,
      };
      
      const score = scorer.calculateScore(poorCWV);
      expect(score).toBeLessThan(70); // Lost 40 points from CWV
    });
    
    it('should handle zero/null values gracefully', () => {
      const emptyMetrics: TechnicalMetrics = {
        core_web_vitals: {
          lcp: 0,
          fid: 0,
          cls: 0,
          assessment: 'good',
        },
        lighthouse: {
          performance: 0,
          accessibility: 0,
          bestPractices: 0,
          seo: 0,
        },
        indexation: {
          indexed_pages: 0,
          submitted_pages: 0,
          coverage_ratio: 0,
          errors: 0,
          warnings: 0,
        },
        https: false,
        mobile_friendly: false,
        has_sitemap: false,
      };
      
      const score = scorer.calculateScore(emptyMetrics);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
  
  describe('generateRecommendations', () => {
    it('should generate LCP recommendation for slow pages', () => {
      const metrics: TechnicalMetrics = {
        core_web_vitals: {
          lcp: 3.8,
          fid: 50,
          cls: 0.05,
          assessment: 'needs_improvement',
        },
        lighthouse: {
          performance: 80,
          accessibility: 90,
          bestPractices: 95,
          seo: 100,
        },
        indexation: {
          indexed_pages: 100,
          submitted_pages: 100,
          coverage_ratio: 100,
          errors: 0,
          warnings: 0,
        },
        https: true,
        mobile_friendly: true,
        has_sitemap: true,
      };
      
      const recommendations = scorer.generateRecommendations(metrics, 85);
      const lcpRec = recommendations.find(r => r.title.includes('LCP'));
      
      expect(lcpRec).toBeDefined();
      expect(lcpRec?.impact).toBe('medium');
      expect(lcpRec?.action_steps).toBeDefined();
      expect(lcpRec?.action_steps.length).toBeGreaterThan(0);
    });
    
    it('should generate indexation error recommendation', () => {
      const metrics: TechnicalMetrics = {
        core_web_vitals: {
          lcp: 2.0,
          fid: 50,
          cls: 0.05,
          assessment: 'good',
        },
        lighthouse: {
          performance: 90,
          accessibility: 90,
          bestPractices: 95,
          seo: 100,
        },
        indexation: {
          indexed_pages: 93,
          submitted_pages: 100,
          coverage_ratio: 93,
          errors: 7,
          warnings: 2,
        },
        https: true,
        mobile_friendly: true,
        has_sitemap: true,
      };
      
      const recommendations = scorer.generateRecommendations(metrics, 88);
      const indexRec = recommendations.find(r => r.title.includes('Index Coverage'));
      
      expect(indexRec).toBeDefined();
      expect(indexRec?.impact).toBe('high');
      expect(indexRec?.effort).toBe('low');
    });
    
    it('should prioritize recommendations correctly', () => {
      const metrics: TechnicalMetrics = {
        core_web_vitals: {
          lcp: 5.0,
          fid: 400,
          cls: 0.3,
          assessment: 'poor',
        },
        lighthouse: {
          performance: 50,
          accessibility: 70,
          bestPractices: 80,
          seo: 90,
        },
        indexation: {
          indexed_pages: 80,
          submitted_pages: 100,
          coverage_ratio: 80,
          errors: 20,
          warnings: 5,
        },
        https: false,
        mobile_friendly: false,
        has_sitemap: false,
      };
      
      const recommendations = scorer.generateRecommendations(metrics, 45);
      
      // Should have multiple recommendations
      expect(recommendations.length).toBeGreaterThan(3);
      
      // First recommendation should have highest priority
      expect(recommendations[0].priority_score).toBeGreaterThanOrEqual(
        recommendations[recommendations.length - 1].priority_score
      );
    });
  });
});

