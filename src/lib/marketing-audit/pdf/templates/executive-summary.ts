/**
 * PDF Template: Executive Summary
 * 
 * Phase 3: First page of PDF report - high-level overview.
 * Architecture: Modular template system for easy customization.
 */

import type { AuditRun } from '../../types';

export interface ExecutiveSummaryData {
  practice: {
    name: string;
    website: string;
    logo?: string;
  };
  audit: AuditRun;
  branding: 'crm' | 'white_label';
}

export class ExecutiveSummaryTemplate {
  /**
   * Generate executive summary content
   * Returns structure for jsPDF to render
   */
  generate(data: ExecutiveSummaryData): any {
    const { practice, audit, branding } = data;
    
    return {
      header: this.generateHeader(practice, branding),
      scoreOverview: this.generateScoreOverview(audit),
      keyFindings: this.generateKeyFindings(audit),
      competitivePosition: this.generateCompetitivePosition(audit),
      nextSteps: this.generateNextSteps(audit),
    };
  }
  
  private generateHeader(practice: any, branding: string) {
    return {
      title: 'Marketing Audit Report',
      subtitle: practice.name,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      logo: branding === 'crm' ? '/logo-dental-crm.png' : practice.logo,
    };
  }
  
  private generateScoreOverview(audit: AuditRun) {
    const getLabel = (score: number) => {
      if (score >= 90) return 'Excellent';
      if (score >= 80) return 'Very Good';
      if (score >= 70) return 'Good';
      if (score >= 60) return 'Fair';
      if (score >= 40) return 'Needs Work';
      return 'Poor';
    };
    
    const getColor = (score: number) => {
      if (score >= 70) return '#10B981'; // green
      if (score >= 60) return '#F59E0B'; // yellow
      if (score >= 40) return '#F97316'; // orange
      return '#EF4444'; // red
    };
    
    return {
      compositeScore: audit.composite_score,
      compositeLabel: getLabel(audit.composite_score),
      compositeColor: getColor(audit.composite_score),
      trend: audit.score_change || 0,
      categories: [
        { 
          name: 'Technical SEO', 
          score: audit.technical_score, 
          label: getLabel(audit.technical_score),
          color: getColor(audit.technical_score),
        },
        { 
          name: 'Local Presence', 
          score: audit.local_score, 
          label: getLabel(audit.local_score),
          color: getColor(audit.local_score),
        },
        { 
          name: 'Content & Authority', 
          score: audit.content_score, 
          label: getLabel(audit.content_score),
          color: getColor(audit.content_score),
        },
        { 
          name: 'Analytics Hygiene', 
          score: audit.analytics_score, 
          label: getLabel(audit.analytics_score),
          color: getColor(audit.analytics_score),
        },
        { 
          name: 'Conversion UX', 
          score: audit.conversion_score, 
          label: getLabel(audit.conversion_score),
          color: getColor(audit.conversion_score),
        },
      ],
    };
  }
  
  private generateKeyFindings(audit: AuditRun) {
    const findings = [];
    
    // Strengths
    const strengths = [];
    if (audit.technical_score >= 80) strengths.push('Strong technical foundation with excellent Core Web Vitals');
    if (audit.local_score >= 80) strengths.push('Well-optimized local presence with strong reviews');
    if (audit.analytics_score >= 80) strengths.push('Comprehensive analytics tracking in place');
    if (audit.conversion_score >= 80) strengths.push('Excellent user experience and conversion optimization');
    
    // Opportunities
    const opportunities = [];
    if (audit.technical_score < 70) opportunities.push('Improve website performance and technical SEO');
    if (audit.local_score < 70) opportunities.push('Enhance local presence and Google Business Profile');
    if (audit.content_score < 70) opportunities.push('Create more authoritative content and build backlinks');
    if (audit.analytics_score < 70) opportunities.push('Improve analytics tracking and attribution');
    if (audit.conversion_score < 70) opportunities.push('Optimize conversion paths and user experience');
    
    return {
      strengths: strengths.slice(0, 3),
      opportunities: opportunities.slice(0, 3),
      criticalIssues: (audit.recommendations || [])
        .filter(r => r.impact === 'high')
        .slice(0, 3)
        .map(r => r.title),
    };
  }
  
  private generateCompetitivePosition(audit: AuditRun) {
    return {
      yourRank: audit.your_rank,
      totalPeers: audit.peer_count,
      percentile: audit.percentile_rank,
      interpretation: this.getCompetitiveInterpretation(audit.percentile_rank || 50),
    };
  }
  
  private getCompetitiveInterpretation(percentile: number): string {
    if (percentile >= 90) return 'Top 10% - Industry leader in your market';
    if (percentile >= 75) return 'Top 25% - Strong competitive position';
    if (percentile >= 50) return 'Above average - Good foundation with room to improve';
    if (percentile >= 25) return 'Below average - Significant opportunity for improvement';
    return 'Bottom 25% - Immediate action needed to remain competitive';
  }
  
  private generateNextSteps(audit: AuditRun) {
    const topRecommendations = (audit.recommendations || [])
      .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
      .slice(0, 5);
    
    return {
      immediate: topRecommendations.filter(r => r.impact === 'high' && r.effort === 'low').slice(0, 2),
      shortTerm: topRecommendations.filter(r => r.impact === 'high').slice(0, 3),
      longTerm: topRecommendations.filter(r => r.effort === 'high').slice(0, 2),
    };
  }
}

