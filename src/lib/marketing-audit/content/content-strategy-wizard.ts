/**
 * Content Strategy Wizard
 * 
 * Phase 3: AI-powered content strategy recommendations.
 * Architecture: Analyzes gaps, competitors, keywords to suggest content plan.
 */

import type { Recommendation } from '../types';

export interface ContentStrategyInput {
  your_keywords: string[];
  competitor_keywords: Record<string, string[]>;
  content_gaps: Array<{
    keyword: string;
    search_volume: number;
    difficulty: number;
    opportunity_score: number;
  }>;
  current_content: Array<{
    url: string;
    title: string;
    word_count: number;
    last_updated: string;
  }>;
}

export interface ContentStrategyOutput {
  immediate_actions: Array<{
    title: string;
    description: string;
    keywords_to_target: string[];
    suggested_url: string;
    estimated_word_count: number;
    priority: 'high' | 'medium' | 'low';
  }>;
  content_calendar: Array<{
    week: number;
    topics: string[];
    focus_keywords: string[];
  }>;
  optimization_opportunities: Array<{
    existing_url: string;
    current_word_count: number;
    suggested_word_count: number;
    keywords_to_add: string[];
  }>;
}

export class ContentStrategyWizard {
  /**
   * Generate comprehensive content strategy
   */
  generate(input: ContentStrategyInput): ContentStrategyOutput {
    const immediateActions = this.identifyImmediateActions(input);
    const contentCalendar = this.generateContentCalendar(input);
    const optimizationOpportunities = this.findOptimizationOpportunities(input);
    
    return {
      immediate_actions: immediateActions,
      content_calendar: contentCalendar,
      optimization_opportunities: optimizationOpportunities,
    };
  }
  
  /**
   * Identify immediate content opportunities
   */
  private identifyImmediateActions(input: ContentStrategyInput) {
    // Find quick wins: high opportunity, low competition
    const quickWins = input.content_gaps
      .filter(gap => gap.opportunity_score > 70 && gap.difficulty < 40)
      .sort((a, b) => b.opportunity_score - a.opportunity_score)
      .slice(0, 5);
    
    return quickWins.map(gap => {
      const relatedKeywords = this.findRelatedKeywords(gap.keyword, input.content_gaps);
      const suggestedUrl = this.generateSuggestedURL(gap.keyword);
      const estimatedWordCount = this.estimateWordCount(gap.keyword, gap.difficulty);
      
      return {
        title: `Create comprehensive guide: "${gap.keyword}"`,
        description: `This keyword has ${gap.search_volume} monthly searches and ${Math.round(100 - gap.difficulty)}% chance of ranking. ${this.getCompetitorCount(gap.keyword, input.competitor_keywords)} competitors already rank for this.`,
        keywords_to_target: [gap.keyword, ...relatedKeywords.slice(0, 3)],
        suggested_url: suggestedUrl,
        estimated_word_count: estimatedWordCount,
        priority: gap.opportunity_score > 80 ? 'high' : 'medium' as 'high' | 'medium' | 'low',
      };
    });
  }
  
  /**
   * Generate 12-week content calendar
   */
  private generateContentCalendar(input: ContentStrategyInput) {
    const calendar = [];
    const gaps = [...input.content_gaps]
      .sort((a, b) => b.opportunity_score - a.opportunity_score);
    
    for (let week = 1; week <= 12; week++) {
      const weekTopics = gaps.slice((week - 1) * 2, week * 2);
      
      if (weekTopics.length > 0) {
        calendar.push({
          week,
          topics: weekTopics.map(t => this.generateTopicTitle(t.keyword)),
          focus_keywords: weekTopics.map(t => t.keyword),
        });
      }
    }
    
    return calendar;
  }
  
  /**
   * Find optimization opportunities in existing content
   */
  private findOptimizationOpportunities(input: ContentStrategyInput) {
    const opportunities = [];
    
    for (const content of input.current_content) {
      // Check if content is thin
      if (content.word_count < 800) {
        const relevantGaps = this.findRelevantGaps(content.url, input.content_gaps);
        
        if (relevantGaps.length > 0) {
          opportunities.push({
            existing_url: content.url,
            current_word_count: content.word_count,
            suggested_word_count: Math.max(1200, content.word_count * 1.5),
            keywords_to_add: relevantGaps.slice(0, 5).map(g => g.keyword),
          });
        }
      }
      
      // Check if content is stale
      const lastUpdated = new Date(content.last_updated);
      const monthsSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24 * 30);
      
      if (monthsSinceUpdate > 12) {
        opportunities.push({
          existing_url: content.url,
          current_word_count: content.word_count,
          suggested_word_count: content.word_count + 300,
          keywords_to_add: ['Update with current information and statistics'],
        });
      }
    }
    
    return opportunities.slice(0, 10);
  }
  
  /**
   * Find related keywords
   */
  private findRelatedKeywords(mainKeyword: string, allGaps: any[]): string[] {
    const mainWords = mainKeyword.toLowerCase().split(' ');
    
    return allGaps
      .filter(gap => {
        const gapWords = gap.keyword.toLowerCase().split(' ');
        return mainWords.some(word => gapWords.includes(word));
      })
      .filter(gap => gap.keyword !== mainKeyword)
      .map(gap => gap.keyword)
      .slice(0, 5);
  }
  
  /**
   * Generate URL slug from keyword
   */
  private generateSuggestedURL(keyword: string): string {
    return '/blog/' + keyword.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
  
  /**
   * Estimate word count needed based on keyword difficulty
   */
  private estimateWordCount(keyword: string, difficulty: number): number {
    // More competitive keywords need longer content
    if (difficulty > 70) return 2000;
    if (difficulty > 50) return 1500;
    if (difficulty > 30) return 1200;
    return 1000;
  }
  
  /**
   * Generate content title from keyword
   */
  private generateTopicTitle(keyword: string): string {
    // Convert "dental implants cost" to "Complete Guide to Dental Implants Cost in 2025"
    const capitalized = keyword.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    return `Complete Guide to ${capitalized} in ${new Date().getFullYear()}`;
  }
  
  /**
   * Find relevant gaps for existing content URL
   */
  private findRelevantGaps(url: string, gaps: any[]): any[] {
    // Extract topic from URL
    const urlParts = url.split('/').filter(p => p.length > 0);
    const topic = urlParts[urlParts.length - 1]?.replace(/-/g, ' ') || '';
    
    if (!topic) return [];
    
    // Find gaps that match this topic
    return gaps.filter(gap => 
      gap.keyword.toLowerCase().includes(topic.toLowerCase()) ||
      topic.toLowerCase().includes(gap.keyword.toLowerCase())
    ).slice(0, 5);
  }
  
  /**
   * Get count of competitors ranking for keyword
   */
  private getCompetitorCount(keyword: string, competitorKeywords: Record<string, string[]>): number {
    return Object.values(competitorKeywords)
      .filter(keywords => keywords.includes(keyword))
      .length;
  }
}

