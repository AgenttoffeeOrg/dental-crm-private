/**
 * Marketing Audit Module - Percentile Ranker
 * 
 * Calculates benchmarking metrics:
 * - Percentile rank vs peer group
 * - Absolute rank (1st, 2nd, 3rd...)
 * - Gap to median
 * - Gap to top 3 average
 */

export class PercentileRanker {
  /**
   * Calculate percentile rank (0-100)
   * Returns what percentage of peers you outperform
   */
  calculatePercentile(yourScore: number, peerScores: number[]): number {
    if (peerScores.length === 0) return 50; // No peers, assume median
    
    const sorted = [...peerScores].sort((a, b) => a - b);
    const countBelow = sorted.filter(score => score < yourScore).length;
    
    return (countBelow / sorted.length) * 100;
  }
  
  /**
   * Calculate absolute rank (1 = best)
   */
  calculateRank(yourScore: number, peerScores: number[]): number {
    const allScores = [...peerScores, yourScore];
    const sorted = allScores.sort((a, b) => b - a); // Descending
    return sorted.indexOf(yourScore) + 1;
  }
  
  /**
   * Calculate gap to median score
   */
  calculateGapToMedian(yourScore: number, peerScores: number[]): number {
    if (peerScores.length === 0) return 0;
    
    const median = this.calculateMedian(peerScores);
    return yourScore - median;
  }
  
  /**
   * Calculate gap to top 3 average
   */
  calculateGapToTop3(yourScore: number, peerScores: number[]): number {
    if (peerScores.length < 3) {
      // Not enough peers, use max peer score
      const maxPeer = Math.max(...peerScores, 0);
      return yourScore - maxPeer;
    }
    
    const top3 = [...peerScores].sort((a, b) => b - a).slice(0, 3);
    const top3Avg = top3.reduce((sum, score) => sum + score, 0) / top3.length;
    return yourScore - top3Avg;
  }
  
  /**
   * Calculate gap to specific percentile (e.g., 75th percentile)
   */
  calculateGapToPercentile(yourScore: number, peerScores: number[], targetPercentile: number): number {
    if (peerScores.length === 0) return 0;
    
    const sorted = [...peerScores].sort((a, b) => a - b);
    const index = Math.ceil((targetPercentile / 100) * sorted.length) - 1;
    const targetScore = sorted[Math.max(0, index)];
    
    return yourScore - targetScore;
  }
  
  /**
   * Get quartile (Q1, Q2, Q3, Q4)
   */
  getQuartile(yourScore: number, peerScores: number[]): 1 | 2 | 3 | 4 {
    const percentile = this.calculatePercentile(yourScore, peerScores);
    
    if (percentile <= 25) return 1; // Bottom quartile
    if (percentile <= 50) return 2; // Second quartile
    if (percentile <= 75) return 3; // Third quartile
    return 4; // Top quartile
  }
  
  /**
   * Calculate median of an array
   */
  private calculateMedian(scores: number[]): number {
    if (scores.length === 0) return 0;
    
    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }
  
  /**
   * Generate benchmark summary
   */
  generateSummary(yourScore: number, peerScores: number[]): {
    percentile: number;
    rank: number;
    totalPeers: number;
    gapToMedian: number;
    gapToTop3: number;
    quartile: 1 | 2 | 3 | 4;
    position: 'top' | 'above_average' | 'average' | 'below_average' | 'bottom';
  } {
    const percentile = this.calculatePercentile(yourScore, peerScores);
    
    let position: 'top' | 'above_average' | 'average' | 'below_average' | 'bottom';
    if (percentile >= 90) position = 'top';
    else if (percentile >= 60) position = 'above_average';
    else if (percentile >= 40) position = 'average';
    else if (percentile >= 20) position = 'below_average';
    else position = 'bottom';
    
    return {
      percentile,
      rank: this.calculateRank(yourScore, peerScores),
      totalPeers: peerScores.length,
      gapToMedian: this.calculateGapToMedian(yourScore, peerScores),
      gapToTop3: this.calculateGapToTop3(yourScore, peerScores),
      quartile: this.getQuartile(yourScore, peerScores),
      position,
    };
  }
}

