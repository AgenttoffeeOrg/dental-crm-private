/**
 * Marketing Audit Module - Analytics Hygiene Scorer
 * 
 * Scores analytics setup quality based on:
 * - GA4 Setup (35%)
 * - GSC Setup (25%)
 * - UTM Discipline (20%)
 * - Consent & Compliance (20%)
 */

import { BaseScorer } from './base-scorer';
import type { AnalyticsMetrics, Recommendation } from '../types';

export class AnalyticsScorer extends BaseScorer {
  calculateScore(metrics: AnalyticsMetrics): number {
    let score = 0;
    
    // GA4 Setup (35 points)
    score += metrics.ga4.connected ? 15 : 0;
    score += Math.min((metrics.ga4.custom_events / 5) * 10, 10);
    score += Math.min((metrics.ga4.conversions / 2) * 10, 10);
    
    // GSC Setup (25 points)
    score += metrics.gsc.connected ? 15 : 0;
    score += metrics.gsc.data_months >= 3 ? 10 : 0;
    
    // UTM Discipline (20 points)
    score += (metrics.utm_usage_rate / 100) * 20;
    
    // Consent & Compliance (20 points)
    score += metrics.has_cookie_banner ? 10 : 0;
    score += metrics.privacy_policy ? 10 : 0;
    
    return Math.min(Math.round(score * 10) / 10, 100);
  }
  
  getDefaultWeights(): Record<string, number> {
    return {
      ga4_setup: 0.35,
      gsc_setup: 0.25,
      utm_discipline: 0.20,
      compliance: 0.20,
    };
  }
  
  generateRecommendations(metrics: AnalyticsMetrics, score: number): Recommendation[] {
    const recs: Partial<Recommendation>[] = [];
    
    // GA4 connection recommendation
    if (!metrics.ga4.connected) {
      recs.push({
        category: 'analytics_hygiene',
        title: `Connect Google Analytics 4 (GA4)`,
        description: `GA4 is not connected or not detecting data. Analytics are essential for measuring marketing ROI and understanding patient behavior.`,
        impact: 'high',
        effort: 'low',
        confidence: 'high',
        estimated_hours: 1,
        current_value: 0,
        target_value: 1,
        action_steps: [
          'Create GA4 property at analytics.google.com',
          'Add GA4 tracking code to website (gtag.js)',
          'Verify data is flowing (check Real-Time reports)',
          'Link GA4 to this CRM for audit access',
          'Set up basic goals (phone clicks, form submissions, bookings)',
        ],
        evidence: [this.createEvidence('ga4_connected', 'ga4', false)],
      });
    }
    
    // Custom events recommendation
    if (metrics.ga4.custom_events < 5) {
      recs.push({
        category: 'analytics_hygiene',
        title: `Set Up Custom Events in GA4`,
        description: `You have ${metrics.ga4.custom_events} custom events configured. Set up 5-10 custom events to track key patient actions (phone clicks, form submissions, booking clicks, etc.).`,
        impact: 'medium',
        effort: 'medium',
        confidence: 'high',
        estimated_hours: 3,
        current_value: metrics.ga4.custom_events,
        target_value: 8,
        action_steps: [
          'Identify key user actions to track',
          'Implement event tracking with gtag or Google Tag Manager',
          'Track: phone_click, form_submit, book_appointment, emergency_call',
          'Test events in GA4 DebugView',
          'Mark important events as conversions',
        ],
        evidence: [this.createEvidence('ga4_custom_events', 'ga4', metrics.ga4.custom_events)],
      });
    }
    
    // GSC connection recommendation
    if (!metrics.gsc.connected) {
      recs.push({
        category: 'analytics_hygiene',
        title: `Connect Google Search Console (GSC)`,
        description: `GSC is not connected. This tool is essential for monitoring search performance, indexation issues, and discovering search queries that bring patients to your site.`,
        impact: 'high',
        effort: 'low',
        confidence: 'high',
        estimated_hours: 1,
        current_value: 0,
        target_value: 1,
        action_steps: [
          'Go to search.google.com/search-console',
          'Add your website property',
          'Verify ownership (HTML tag, DNS, or Google Analytics)',
          'Submit sitemap',
          'Link GSC to this CRM for audit access',
        ],
        evidence: [this.createEvidence('gsc_connected', 'gsc', false)],
      });
    }
    
    // UTM usage recommendation
    if (metrics.utm_usage_rate < 70) {
      recs.push({
        category: 'analytics_hygiene',
        title: `Improve UTM Parameter Usage`,
        description: `Only ${metrics.utm_usage_rate.toFixed(1)}% of your campaign traffic is tagged with UTM parameters. This limits attribution accuracy. Target is 90-95%.`,
        impact: 'medium',
        effort: 'low',
        confidence: 'high',
        estimated_hours: 3,
        current_value: parseFloat(metrics.utm_usage_rate.toFixed(1)),
        target_value: 95,
        action_steps: [
          'Create UTM builder spreadsheet or use Campaign URL Builder',
          'Train marketing team on UTM tagging standards',
          'Tag ALL social media posts with UTMs',
          'Tag ALL email campaigns with UTMs',
          'Tag ALL paid ads with UTMs',
          'Set up GA4 report to monitor UTM compliance weekly',
        ],
        evidence: [this.createEvidence('utm_usage_rate', 'ga4', metrics.utm_usage_rate)],
      });
    }
    
    // Cookie banner recommendation
    if (!metrics.has_cookie_banner) {
      recs.push({
        category: 'analytics_hygiene',
        title: `Add Cookie Consent Banner`,
        description: `No cookie consent banner detected. This is required by GDPR (UK/EU visitors) and recommended for all visitors. Improves compliance and trust.`,
        impact: 'medium',
        effort: 'low',
        confidence: 'high',
        estimated_hours: 2,
        current_value: 0,
        target_value: 1,
        action_steps: [
          'Choose cookie consent tool (CookieYes, OneTrust, or custom)',
          'Implement consent banner on all pages',
          'Configure consent mode in GA4',
          'Create cookie policy page',
          'Test consent flow on all devices',
        ],
        evidence: [this.createEvidence('has_cookie_banner', 'manual', false)],
      });
    }
    
    // Calculate priority scores
    recs.forEach(rec => {
      rec.priority_score = this.calculatePriority(rec as any);
    });
    
    return recs.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)) as Recommendation[];
  }
}

