/**
 * Percentile Ranker - Unit Tests
 * 
 * Tests for benchmarking calculations.
 */

import { PercentileRanker } from '../scoring/percentile-ranker';

describe('PercentileRanker', () => {
  let ranker: PercentileRanker;
  
  beforeEach(() => {
    ranker = new PercentileRanker();
  });
  
  describe('calculatePercentile', () => {
    it('should calculate correct percentile', () => {
      const yourScore = 75;
      const peerScores = [50, 60, 70, 80, 90];
      
      const percentile = ranker.calculatePercentile(yourScore, peerScores);
      
      // 75 is better than 3 out of 5 peers = 60th percentile
      expect(percentile).toBe(60);
    });
    
    it('should return 100 if better than all peers', () => {
      const yourScore = 95;
      const peerScores = [50, 60, 70, 80, 90];
      
      const percentile = ranker.calculatePercentile(yourScore, peerScores);
      
      expect(percentile).toBe(100);
    });
    
    it('should return 0 if worse than all peers', () => {
      const yourScore = 40;
      const peerScores = [50, 60, 70, 80, 90];
      
      const percentile = ranker.calculatePercentile(yourScore, peerScores);
      
      expect(percentile).toBe(0);
    });
    
    it('should return 50 if no peers', () => {
      const percentile = ranker.calculatePercentile(75, []);
      expect(percentile).toBe(50);
    });
  });
  
  describe('calculateRank', () => {
    it('should calculate correct rank', () => {
      const yourScore = 75;
      const peerScores = [50, 60, 70, 80, 90];
      
      const rank = ranker.calculateRank(yourScore, peerScores);
      
      // 75 ranks 3rd (behind 90 and 80)
      expect(rank).toBe(3);
    });
    
    it('should return 1 for highest score', () => {
      const yourScore = 95;
      const peerScores = [50, 60, 70, 80, 90];
      
      const rank = ranker.calculateRank(yourScore, peerScores);
      
      expect(rank).toBe(1);
    });
  });
  
  describe('calculateGapToMedian', () => {
    it('should calculate correct gap', () => {
      const yourScore = 75;
      const peerScores = [50, 60, 70, 80, 90]; // Median = 70
      
      const gap = ranker.calculateGapToMedian(yourScore, peerScores);
      
      expect(gap).toBe(5);
    });
    
    it('should handle even number of peers', () => {
      const yourScore = 75;
      const peerScores = [50, 60, 80, 90]; // Median = (60+80)/2 = 70
      
      const gap = ranker.calculateGapToMedian(yourScore, peerScores);
      
      expect(gap).toBe(5);
    });
  });
  
  describe('calculateGapToTop3', () => {
    it('should calculate correct gap to top 3 average', () => {
      const yourScore = 75;
      const peerScores = [50, 60, 70, 80, 90, 95]; // Top 3 = 95, 90, 80 = avg 88.33
      
      const gap = ranker.calculateGapToTop3(yourScore, peerScores);
      
      expect(gap).toBeCloseTo(-13.33, 1);
    });
    
    it('should handle fewer than 3 peers', () => {
      const yourScore = 75;
      const peerScores = [80, 90]; // Only 2 peers
      
      const gap = ranker.calculateGapToTop3(yourScore, peerScores);
      
      // Should use max peer score (90)
      expect(gap).toBe(-15);
    });
  });
  
  describe('getQuartile', () => {
    it('should return correct quartile', () => {
      const peerScores = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      
      expect(ranker.getQuartile(15, peerScores)).toBe(1); // Bottom
      expect(ranker.getQuartile(35, peerScores)).toBe(2); // Second
      expect(ranker.getQuartile(65, peerScores)).toBe(3); // Third
      expect(ranker.getQuartile(95, peerScores)).toBe(4); // Top
    });
  });
  
  describe('generateSummary', () => {
    it('should generate complete benchmark summary', () => {
      const yourScore = 75;
      const peerScores = [50, 60, 70, 80, 90];
      
      const summary = ranker.generateSummary(yourScore, peerScores);
      
      expect(summary.percentile).toBe(60);
      expect(summary.rank).toBe(3);
      expect(summary.totalPeers).toBe(5);
      expect(summary.gapToMedian).toBe(5);
      expect(summary.quartile).toBe(3);
      expect(summary.position).toBe('above_average');
    });
  });
});

