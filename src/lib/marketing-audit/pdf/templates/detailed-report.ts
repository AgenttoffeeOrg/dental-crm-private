/**
 * PDF Template: Detailed Report
 * 
 * Phase 3: Complete detailed report with all evidence and recommendations.
 * Architecture: Structured data for jsPDF rendering.
 */

import type { AuditRun, Recommendation } from '../../types';

export class DetailedReportTemplate {
  /**
   * Generate complete detailed report structure
   */
  generate(audit: AuditRun, recommendations: Recommendation[]): any {
    return {
      sections: [
        this.generateTechnicalSection(audit),
        this.generateLocalSection(audit),
        this.generateContentSection(audit),
        this.generateAnalyticsSection(audit),
        this.generateConversionSection(audit),
        this.generateRecommendationsSection(recommendations),
        this.generateCompetitorSection(audit),
        this.generateActionPlan(recommendations),
      ],
    };
  }
  
  private generateTechnicalSection(audit: AuditRun) {
    return {
      title: 'Technical SEO & Performance',
      score: audit.technical_score,
      subsections: [
        {
          title: 'Core Web Vitals',
          metrics: [
            { label: 'Largest Contentful Paint (LCP)', value: '—', target: '< 2.5s' },
            { label: 'First Input Delay (FID)', value: '—', target: '< 100ms' },
            { label: 'Cumulative Layout Shift (CLS)', value: '—', target: '< 0.1' },
          ],
        },
        {
          title: 'Lighthouse Scores',
          metrics: [
            { label: 'Performance', value: '—', target: '90+' },
            { label: 'Accessibility', value: '—', target: '90+' },
            { label: 'Best Practices', value: '—', target: '90+' },
            { label: 'SEO', value: '—', target: '90+' },
          ],
        },
        {
          title: 'Indexation',
          metrics: [
            { label: 'Indexed Pages', value: '—' },
            { label: 'Coverage Errors', value: '—', target: '0' },
            { label: 'Mobile Friendly', value: '—', target: 'Yes' },
          ],
        },
      ],
    };
  }
  
  private generateLocalSection(audit: AuditRun) {
    return {
      title: 'Local Presence & Reputation',
      score: audit.local_score,
      subsections: [
        {
          title: 'Google Business Profile',
          metrics: [
            { label: 'Profile Completeness', value: '—', target: '100%' },
            { label: 'Photos', value: '—', target: '10+' },
            { label: 'Posts (Last 30 Days)', value: '—', target: '4+' },
          ],
        },
        {
          title: 'Reviews',
          metrics: [
            { label: 'Total Reviews', value: '—', target: '100+' },
            { label: 'Average Rating', value: '—', target: '4.5+' },
            { label: 'Recent Reviews (30 days)', value: '—', target: '10+' },
            { label: 'Response Rate', value: '—', target: '90%+' },
          ],
        },
        {
          title: 'Citations & NAP Consistency',
          metrics: [
            { label: 'Total Citations', value: '—', target: '50+' },
            { label: 'Top 50 Coverage', value: '—', target: '80%+' },
            { label: 'Consistent NAP', value: '—', target: '95%+' },
          ],
        },
      ],
    };
  }
  
  private generateContentSection(audit: AuditRun) {
    return {
      title: 'Content & Authority',
      score: audit.content_score,
      subsections: [
        {
          title: 'Backlink Profile',
          metrics: [
            { label: 'Total Backlinks', value: '—' },
            { label: 'Referring Domains', value: '—', target: '100+' },
            { label: 'DoFollow Ratio', value: '—', target: '60%+' },
            { label: 'Authority Score', value: '—', target: '40+' },
          ],
        },
        {
          title: 'Content Quality',
          metrics: [
            { label: 'Content Freshness', value: '—', target: 'Updated monthly' },
            { label: 'Content Depth', value: '—', target: '1000+ words' },
            { label: 'Topical Authority', value: '—' },
          ],
        },
      ],
    };
  }
  
  private generateAnalyticsSection(audit: AuditRun) {
    return {
      title: 'Analytics & Attribution',
      score: audit.analytics_score,
      subsections: [
        {
          title: 'Tracking Setup',
          metrics: [
            { label: 'GA4 Configured', value: '—', target: 'Yes' },
            { label: 'GSC Connected', value: '—', target: 'Yes' },
            { label: 'Conversion Events', value: '—', target: '5+' },
            { label: 'UTM Discipline', value: '—', target: '90%+' },
          ],
        },
      ],
    };
  }
  
  private generateConversionSection(audit: AuditRun) {
    return {
      title: 'Conversion Experience',
      score: audit.conversion_score,
      subsections: [
        {
          title: 'User Experience',
          metrics: [
            { label: 'Clear CTAs', value: '—', target: 'Yes' },
            { label: 'Online Booking', value: '—', target: 'Yes' },
            { label: 'Mobile UX', value: '—', target: 'Excellent' },
            { label: 'Form Friction', value: '—', target: 'Low' },
          ],
        },
      ],
    };
  }
  
  private generateRecommendationsSection(recommendations: Recommendation[]) {
    const prioritized = recommendations
      .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
      .slice(0, 10);
    
    return {
      title: 'Top 10 Recommendations',
      recommendations: prioritized.map(rec => ({
        title: rec.title,
        description: rec.description,
        impact: rec.impact,
        effort: rec.effort,
        estimatedHours: rec.estimated_hours,
        actionSteps: rec.action_steps,
      })),
    };
  }
  
  private generateCompetitorSection(audit: AuditRun) {
    const competitors = (audit.competitors || []).slice(0, 10);
    
    return {
      title: 'Competitive Analysis',
      yourRank: audit.your_rank,
      totalPeers: audit.peer_count,
      percentile: audit.percentile_rank,
      topCompetitors: competitors.map(comp => ({
        name: comp.name,
        rank: comp.rank,
        score: comp.score,
        reviews: comp.reviews_count,
        rating: comp.avg_rating,
      })),
    };
  }
  
  private generateActionPlan(recommendations: Recommendation[]) {
    const quickWins = recommendations.filter(r => r.impact === 'high' && r.effort === 'low');
    const majorProjects = recommendations.filter(r => r.impact === 'high' && r.effort === 'high');
    
    return {
      title: 'Implementation Roadmap',
      quickWins: quickWins.slice(0, 3).map(r => ({
        title: r.title,
        estimatedHours: r.estimated_hours,
      })),
      shortTerm: recommendations.slice(0, 5).map(r => ({
        title: r.title,
        timeline: this.getTimeline(r.estimated_hours || 0),
      })),
      longTerm: majorProjects.slice(0, 3).map(r => ({
        title: r.title,
        timeline: this.getTimeline(r.estimated_hours || 0),
      })),
    };
  }
  
  private getTimeline(hours: number): string {
    if (hours <= 2) return '1 day';
    if (hours <= 8) return '1 week';
    if (hours <= 40) return '1 month';
    return '2-3 months';
  }
}

