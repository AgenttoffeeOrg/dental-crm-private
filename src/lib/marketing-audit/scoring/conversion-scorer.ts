/**
 * Marketing Audit Module - Conversion UX Scorer
 * 
 * Scores conversion-focused user experience based on heuristic analysis:
 * - Online Booking Widget (25%)
 * - Click-to-Call (20%)
 * - Phone in Header (15%)
 * - Contact Form Accessible (15%)
 * - Mobile Responsive (15%)
 * - Trust Signals (10%)
 */

import { BaseScorer } from './base-scorer';
import type { ConversionMetrics, Recommendation } from '../types';

export class ConversionScorer extends BaseScorer {
  calculateScore(metrics: ConversionMetrics): number {
    let score = 0;
    
    score += metrics.has_online_booking ? 25 : 0;
    score += metrics.has_click_to_call ? 20 : 0;
    score += metrics.phone_in_header ? 15 : 0;
    score += metrics.contact_form_accessible ? 15 : 0;
    score += metrics.mobile_responsive ? 15 : 0;
    score += metrics.has_trust_signals ? 10 : 0;
    
    // Bonus for multiple CTAs above fold
    if (metrics.ctas_above_fold >= 2) {
      score += 5;
    }
    
    return Math.min(Math.round(score * 10) / 10, 100);
  }
  
  getDefaultWeights(): Record<string, number> {
    return {
      online_booking: 0.25,
      click_to_call: 0.20,
      phone_header: 0.15,
      contact_form: 0.15,
      mobile: 0.15,
      trust_signals: 0.10,
    };
  }
  
  generateRecommendations(metrics: ConversionMetrics, score: number): Recommendation[] {
    const recs: Partial<Recommendation>[] = [];
    
    // Online booking recommendation
    if (!metrics.has_online_booking) {
      recs.push({
        category: 'conversion_ux',
        title: `Add Online Booking Widget`,
        description: `No online booking widget detected. 60%+ of patients prefer to book online, especially for routine appointments. This is a major conversion opportunity.`,
        impact: 'high',
        effort: 'medium',
        confidence: 'high',
        estimated_hours: 4,
        current_value: 0,
        target_value: 1,
        action_steps: [
          'Choose booking software (Calendly, Acuity, Doctify, NHS e-Referral)',
          'Embed booking widget prominently on homepage',
          'Add booking CTAs on service pages',
          'Make booking widget mobile-friendly',
          'Test complete booking flow',
        ],
        evidence: [this.createEvidence('has_online_booking', 'manual', false)],
      });
    }
    
    // Click-to-call recommendation
    if (!metrics.has_click_to_call) {
      recs.push({
        category: 'conversion_ux',
        title: `Enable Click-to-Call on Mobile`,
        description: `No click-to-call functionality detected. 40%+ of website visitors are on mobile. Make it one tap to call your practice.`,
        impact: 'high',
        effort: 'low',
        confidence: 'high',
        estimated_hours: 0.5,
        current_value: 0,
        target_value: 1,
        action_steps: [
          'Add tel: links to phone numbers (e.g., <a href="tel:+442012345678">)',
          'Ensure phone number is prominent on mobile (header, sticky footer)',
          'Test on iOS and Android devices',
          'Track phone clicks as GA4 events',
        ],
        evidence: [this.createEvidence('has_click_to_call', 'manual', false)],
      });
    }
    
    // Phone in header recommendation
    if (!metrics.phone_in_header) {
      recs.push({
        category: 'conversion_ux',
        title: `Add Phone Number to Header`,
        description: `Phone number not visible in website header. This is a primary conversion path for dental practices - make it obvious!`,
        impact: 'medium',
        effort: 'low',
        confidence: 'high',
        estimated_hours: 0.5,
        current_value: 0,
        target_value: 1,
        action_steps: [
          'Add phone number to top-right of header (desktop)',
          'Make phone number sticky on mobile (floating button or header)',
          'Use large, easy-to-read font',
          'Add call icon next to number',
        ],
        evidence: [this.createEvidence('phone_in_header', 'manual', false)],
      });
    }
    
    // Contact form recommendation
    if (!metrics.contact_form_accessible) {
      recs.push({
        category: 'conversion_ux',
        title: `Make Contact Form Easily Accessible`,
        description: `Contact form is not easily accessible (should be ≤3 clicks from any page). Reduce friction for patient inquiries.`,
        impact: 'medium',
        effort: 'low',
        confidence: 'high',
        estimated_hours: 1,
        current_value: 0,
        target_value: 1,
        action_steps: [
          'Add "Contact Us" to main navigation',
          'Add contact form to footer',
          'Add floating "Get in Touch" button',
          'Keep form simple (name, email, phone, message only)',
          'Ensure form works on mobile',
        ],
        evidence: [this.createEvidence('contact_form_accessible', 'manual', false)],
      });
    }
    
    // Trust signals recommendation
    if (!metrics.has_trust_signals) {
      recs.push({
        category: 'conversion_ux',
        title: `Add Trust Signals to Homepage`,
        description: `No visible trust signals detected (review widgets, certifications, associations). Trust signals increase conversion rates by 20-40%.`,
        impact: 'medium',
        effort: 'low',
        confidence: 'high',
        estimated_hours: 2,
        current_value: 0,
        target_value: 1,
        action_steps: [
          'Add Google Reviews widget showing star rating',
          'Display professional certifications (GDC, BDA, etc.)',
          'Add "As seen in" media logos if applicable',
          'Show years of experience prominently',
          'Add patient testimonials with photos',
        ],
        evidence: [this.createEvidence('has_trust_signals', 'manual', false)],
      });
    }
    
    // Calculate priority scores
    recs.forEach(rec => {
      rec.priority_score = this.calculatePriority(rec as any);
    });
    
    return recs.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)) as Recommendation[];
  }
}

