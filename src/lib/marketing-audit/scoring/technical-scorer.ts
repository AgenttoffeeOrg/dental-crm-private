/**
 * Marketing Audit Module - Technical SEO Scorer
 * 
 * Scores technical SEO health based on:
 * - Core Web Vitals (LCP, FID, CLS) - 40%
 * - Lighthouse Performance - 20%
 * - Mobile-Friendly - 15%
 * - HTTPS - 10%
 * - Sitemap - 5%
 * - Index Coverage - 10%
 */

import { BaseScorer } from './base-scorer';
import type { TechnicalMetrics, Recommendation } from '../types';

export class TechnicalScorer extends BaseScorer {
  calculateScore(metrics: TechnicalMetrics): number {
    let score = 0;
    
    // Core Web Vitals (40 points)
    // LCP (Largest Contentful Paint) - 15 points
    if (metrics.core_web_vitals.lcp <= 2.5) {
      score += 15;
    } else if (metrics.core_web_vitals.lcp <= 4.0) {
      score += 8;
    } else {
      score += 0;
    }
    
    // FID (First Input Delay) - 10 points
    if (metrics.core_web_vitals.fid <= 100) {
      score += 10;
    } else if (metrics.core_web_vitals.fid <= 300) {
      score += 5;
    } else {
      score += 0;
    }
    
    // CLS (Cumulative Layout Shift) - 15 points
    if (metrics.core_web_vitals.cls <= 0.1) {
      score += 15;
    } else if (metrics.core_web_vitals.cls <= 0.25) {
      score += 8;
    } else {
      score += 0;
    }
    
    // Lighthouse Performance (20 points)
    score += (metrics.lighthouse.performance / 100) * 20;
    
    // Mobile-Friendly (15 points)
    score += metrics.mobile_friendly ? 15 : 0;
    
    // HTTPS (10 points)
    score += metrics.https ? 10 : 0;
    
    // Sitemap (5 points)
    score += metrics.has_sitemap ? 5 : 0;
    
    // Index Coverage (10 points)
    if (metrics.indexation.submitted_pages > 0) {
      const coverageRatio = metrics.indexation.indexed_pages / metrics.indexation.submitted_pages;
      score += coverageRatio * 10;
    }
    
    return Math.min(Math.round(score * 10) / 10, 100); // Round to 1 decimal
  }
  
  getDefaultWeights(): Record<string, number> {
    return {
      cwv: 0.40,
      lighthouse: 0.20,
      mobile: 0.15,
      https: 0.10,
      sitemap: 0.05,
      indexation: 0.10,
    };
  }
  
  generateRecommendations(metrics: TechnicalMetrics, score: number): Recommendation[] {
    const recs: Partial<Recommendation>[] = [];
    
    // LCP recommendation
    if (metrics.core_web_vitals.lcp > 2.5) {
      recs.push({
        category: 'technical_seo',
        title: `Improve Largest Contentful Paint (LCP)`,
        description: `Your LCP is ${metrics.core_web_vitals.lcp.toFixed(2)}s. Google's threshold for "Good" is ≤2.5s. This affects user-perceived loading performance and SEO rankings.`,
        impact: metrics.core_web_vitals.lcp > 4.0 ? 'high' : 'medium',
        effort: 'medium',
        confidence: 'high',
        estimated_hours: 4,
        current_value: parseFloat(metrics.core_web_vitals.lcp.toFixed(2)),
        target_value: 2.5,
        action_steps: [
          'Optimize and compress hero images (use WebP format)',
          'Implement lazy loading for below-the-fold images',
          'Use a CDN for static assets',
          'Minimize render-blocking JavaScript and CSS',
          'Preload critical resources (fonts, hero image)',
          'Consider server-side rendering or static generation',
        ],
        evidence: [this.createEvidence('lcp', 'psi', metrics.core_web_vitals.lcp)],
      });
    }
    
    // CLS recommendation
    if (metrics.core_web_vitals.cls > 0.1) {
      recs.push({
        category: 'technical_seo',
        title: `Fix Cumulative Layout Shift (CLS)`,
        description: `Your CLS is ${metrics.core_web_vitals.cls.toFixed(3)}. Google's threshold for "Good" is ≤0.1. Layout shifts hurt user experience and SEO.`,
        impact: metrics.core_web_vitals.cls > 0.25 ? 'high' : 'medium',
        effort: 'medium',
        confidence: 'high',
        estimated_hours: 3,
        current_value: parseFloat(metrics.core_web_vitals.cls.toFixed(3)),
        target_value: 0.1,
        action_steps: [
          'Add explicit width and height to all images',
          'Reserve space for ads and embeds',
          'Avoid inserting content above existing content',
          'Use CSS aspect-ratio for responsive images',
          'Preload web fonts to avoid FOIT/FOUT',
        ],
        evidence: [this.createEvidence('cls', 'psi', metrics.core_web_vitals.cls)],
      });
    }
    
    // Index coverage recommendation
    if (metrics.indexation.errors > 0) {
      recs.push({
        category: 'technical_seo',
        title: `Fix ${metrics.indexation.errors} Index Coverage Error${metrics.indexation.errors > 1 ? 's' : ''}`,
        description: `Google Search Console reports ${metrics.indexation.errors} page${metrics.indexation.errors > 1 ? 's' : ''} with indexation errors. These pages are not appearing in search results, reducing your online visibility.`,
        impact: 'high',
        effort: 'low',
        confidence: 'high',
        estimated_hours: 2,
        current_value: metrics.indexation.indexed_pages,
        target_value: metrics.indexation.submitted_pages,
        action_steps: [
          'Review error report in Google Search Console',
          'Fix redirect chains (simplify to single 301)',
          'Address soft 404 pages (add real content or remove)',
          'Resolve crawl errors and blocked resources',
          'Submit sitemap after fixes',
          'Verify indexation within 7-14 days',
        ],
        evidence: [
          this.createEvidence('gsc_coverage_errors', 'gsc', metrics.indexation.errors),
          this.createEvidence('indexed_pages', 'gsc', metrics.indexation.indexed_pages),
        ],
      });
    }
    
    // Accessibility recommendation
    if (metrics.lighthouse.accessibility < 90) {
      recs.push({
        category: 'technical_seo',
        title: `Improve Accessibility Score to 95+`,
        description: `Your accessibility score is ${metrics.lighthouse.accessibility}/100. Target is ≥95 for WCAG 2.1 AA compliance. Better accessibility improves SEO and user experience for all visitors.`,
        impact: 'medium',
        effort: 'medium',
        confidence: 'high',
        estimated_hours: 6,
        current_value: metrics.lighthouse.accessibility,
        target_value: 95,
        action_steps: [
          'Add ARIA labels to all interactive elements',
          'Ensure sufficient color contrast (4.5:1 for text)',
          'Implement full keyboard navigation',
          'Add alt text to all images',
          'Test with screen readers (NVDA, JAWS, VoiceOver)',
          'Fix heading hierarchy (proper h1, h2, h3 structure)',
        ],
        evidence: [this.createEvidence('lighthouse_accessibility', 'psi', metrics.lighthouse.accessibility)],
      });
    }
    
    // Performance recommendation
    if (metrics.lighthouse.performance < 80) {
      recs.push({
        category: 'technical_seo',
        title: `Improve Performance Score to 90+`,
        description: `Your performance score is ${metrics.lighthouse.performance}/100. Target is ≥90. Better performance improves rankings, conversions, and user satisfaction.`,
        impact: 'high',
        effort: 'high',
        confidence: 'medium',
        estimated_hours: 12,
        current_value: metrics.lighthouse.performance,
        target_value: 90,
        action_steps: [
          'Minify and compress all JavaScript and CSS',
          'Enable gzip/brotli compression on server',
          'Optimize all images (compress, resize, use modern formats)',
          'Implement code splitting and lazy loading',
          'Remove unused JavaScript and CSS',
          'Use a CDN for static assets',
          'Reduce server response times (TTFB < 600ms)',
        ],
        evidence: [this.createEvidence('lighthouse_performance', 'psi', metrics.lighthouse.performance)],
      });
    }
    
    // HTTPS recommendation
    if (!metrics.https) {
      recs.push({
        category: 'technical_seo',
        title: `Enable HTTPS (SSL Certificate)`,
        description: `Your website is not using HTTPS. This is a major security and SEO issue. Google penalizes non-HTTPS sites in rankings.`,
        impact: 'critical' as any,
        effort: 'low',
        confidence: 'high',
        estimated_hours: 1,
        current_value: 0,
        target_value: 1,
        action_steps: [
          'Purchase or get free SSL certificate (Let\'s Encrypt)',
          'Install certificate on server',
          'Update all internal links to HTTPS',
          'Set up 301 redirects from HTTP to HTTPS',
          'Update Google Search Console property to HTTPS version',
        ],
        evidence: [this.createEvidence('https_enabled', 'manual', false)],
      });
    }
    
    // Sitemap recommendation
    if (!metrics.has_sitemap) {
      recs.push({
        category: 'technical_seo',
        title: `Create and Submit XML Sitemap`,
        description: `Your website doesn't have an XML sitemap or it's not registered in Google Search Console. Sitemaps help search engines discover and index your pages.`,
        impact: 'high',
        effort: 'low',
        confidence: 'high',
        estimated_hours: 1,
        current_value: 0,
        target_value: 1,
        action_steps: [
          'Generate XML sitemap (use sitemap generator or CMS plugin)',
          'Upload sitemap to website root (/sitemap.xml)',
          'Submit sitemap URL in Google Search Console',
          'Add sitemap reference to robots.txt',
          'Set up automatic sitemap updates when content changes',
        ],
        evidence: [this.createEvidence('has_sitemap', 'gsc', false)],
      });
    }
    
    // Calculate priority scores
    recs.forEach(rec => {
      rec.priority_score = this.calculatePriority(rec as any);
    });
    
    // Sort by priority
    return recs.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)) as Recommendation[];
  }
}

