/**
 * Marketing Audit Module - Content & Authority Scorer
 * 
 * Phase 1 (Simplified): Based on indexed pages and organic traffic
 * Phase 3 (Full): Includes backlinks, domain authority, keywords
 * 
 * Scoring:
 * - Authority Score (40%) - Phase 3 (Semrush)
 * - Referring Domains (25%) - Phase 3
 * - Content Freshness (20%) - Phase 1 (proxy)
 * - Organic Keywords (15%) - Phase 3
 */

import { BaseScorer } from './base-scorer';
import type { ContentMetrics, Recommendation } from '../types';

export class ContentScorer extends BaseScorer {
  calculateScore(metrics: ContentMetrics): number {
    let score = 0;
    
    // Authority Score (40 points) - Phase 3
    if (metrics.authority_score !== undefined) {
      score += (metrics.authority_score / 100) * 40;
    } else {
      // Phase 1: Estimate based on indexed pages
      score += Math.min((metrics.indexed_pages / 100) * 40, 40);
    }
    
    // Referring Domains (25 points) - Phase 3
    if (metrics.referring_domains !== undefined) {
      score += Math.min((metrics.referring_domains / 100) * 25, 25);
    } else {
      // Phase 1: No data, assume average
      score += 12.5;
    }
    
    // Content Freshness (20 points) - Proxy via indexed pages growth
    score += Math.min((metrics.content_freshness_score / 100) * 20, 20);
    
    // Organic Keywords (15 points) - Phase 3
    if (metrics.organic_keywords !== undefined) {
      score += Math.min((metrics.organic_keywords / 200) * 15, 15);
    } else {
      // Phase 1: No data, assume average
      score += 7.5;
    }
    
    return Math.min(Math.round(score * 10) / 10, 100);
  }
  
  getDefaultWeights(): Record<string, number> {
    return {
      authority: 0.40,
      referring_domains: 0.25,
      freshness: 0.20,
      keywords: 0.15,
    };
  }
  
  generateRecommendations(metrics: ContentMetrics, score: number): Recommendation[] {
    const recs: Partial<Recommendation>[] = [];
    
    // Indexed pages recommendation (Phase 1)
    if (metrics.indexed_pages < 50) {
      recs.push({
        category: 'content_authority',
        title: `Expand Website Content to 50+ Pages`,
        description: `You have ${metrics.indexed_pages} indexed pages. Dental practices with 50-100+ pages rank better for diverse keywords and build more authority.`,
        impact: 'high',
        effort: 'high',
        confidence: 'medium',
        estimated_hours: 40,
        current_value: metrics.indexed_pages,
        target_value: 50,
        action_steps: [
          'Create service pages for each treatment type',
          'Write blog posts on dental health topics (20-30 articles)',
          'Add FAQ pages for common patient questions',
          'Create location pages if multi-location',
          'Add dentist bio pages',
          'Create patient education resources',
        ],
        evidence: [this.createEvidence('indexed_pages', 'gsc', metrics.indexed_pages)],
      });
    }
    
    // Backlinks recommendation (Phase 3)
    if (metrics.referring_domains !== undefined && metrics.referring_domains < 50) {
      recs.push({
        category: 'content_authority',
        title: `Build 50 High-Quality Backlinks`,
        description: `You have ${metrics.referring_domains} referring domains. Top dental practices have 100-200+. Quality backlinks are crucial for domain authority and rankings.`,
        impact: 'high',
        effort: 'high',
        confidence: 'medium',
        estimated_hours: 60,
        current_value: metrics.referring_domains,
        target_value: 50,
        action_steps: [
          'List 100 target websites (dental directories, health blogs, local news)',
          'Create linkable content (dental health guides, infographics, research)',
          'Outreach campaign to 20 sites per week',
          'Guest post on 2-3 health blogs per month',
          'Partner with local businesses for mutual links',
          'Get listed in dental association directories',
        ],
        evidence: [this.createEvidence('referring_domains', 'semrush', metrics.referring_domains)],
      });
    }
    
    // Toxic backlinks recommendation (Phase 3)
    if (metrics.toxic_backlinks_percent !== undefined && metrics.toxic_backlinks_percent > 5) {
      recs.push({
        category: 'content_authority',
        title: `Disavow Toxic Backlinks`,
        description: `${metrics.toxic_backlinks_percent.toFixed(1)}% of your backlinks are toxic (spam sites). This can harm your rankings. Disavow these links in Google Search Console.`,
        impact: 'medium',
        effort: 'low',
        confidence: 'high',
        estimated_hours: 2,
        current_value: parseFloat(metrics.toxic_backlinks_percent.toFixed(1)),
        target_value: 2,
        action_steps: [
          'Export toxic backlinks report from Semrush',
          'Review each toxic link manually',
          'Create disavow file (disavow.txt)',
          'Submit disavow file in Google Search Console',
          'Monitor rankings after 30-60 days',
        ],
        evidence: [this.createEvidence('toxic_backlinks_percent', 'semrush', metrics.toxic_backlinks_percent)],
      });
    }
    
    // Calculate priority scores
    recs.forEach(rec => {
      rec.priority_score = this.calculatePriority(rec as any);
    });
    
    return recs.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)) as Recommendation[];
  }
}

