/**
 * Full PDF Generator with jsPDF
 * 
 * Phase 3: Complete PDF implementation with professional formatting.
 * Architecture: Production-ready PDF generation.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AuditRun, Recommendation } from '../types';

export interface PDFOptions {
  branding: {
    logo_url?: string;
    primary_color: string;
    secondary_color: string;
    company_name: string;
    tagline?: string;
  };
  includeEvidence: boolean;
  includeCompetitors: boolean;
  includeActionSteps: boolean;
}

export class FullPDFGenerator {
  private doc: jsPDF;
  private options: PDFOptions;
  private currentY: number = 20;
  private pageWidth: number = 210; // A4 width in mm
  private pageHeight: number = 297; // A4 height in mm
  private margin: number = 20;
  
  constructor(options: PDFOptions) {
    this.options = options;
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
  }
  
  /**
   * Generate complete PDF
   */
  async generate(
    audit: AuditRun,
    recommendations: Recommendation[],
    practice: any
  ): Promise<Buffer> {
    // 1. Cover Page
    this.addCoverPage(audit, practice);
    
    // 2. Executive Summary
    this.doc.addPage();
    this.addExecutiveSummary(audit, recommendations);
    
    // 3. Score Breakdown
    this.doc.addPage();
    this.addScoreBreakdown(audit);
    
    // 4. Recommendations
    this.doc.addPage();
    this.addRecommendations(recommendations);
    
    // 5. Competitors (if enabled)
    if (this.options.includeCompetitors && audit.competitors) {
      this.doc.addPage();
      this.addCompetitorAnalysis(audit);
    }
    
    // 6. Evidence (if enabled)
    if (this.options.includeEvidence) {
      this.doc.addPage();
      this.addEvidenceAppendix(recommendations);
    }
    
    // 7. Add footers to all pages
    this.addFooters();
    
    // 8. Return as Buffer
    const pdfBuffer = Buffer.from(this.doc.output('arraybuffer'));
    return pdfBuffer;
  }
  
  /**
   * Add cover page
   */
  private addCoverPage(audit: AuditRun, practice: any): void {
    const primaryColor = this.hexToRGB(this.options.branding.primary_color);
    
    // Header gradient background
    this.doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    this.doc.rect(0, 0, this.pageWidth, 80, 'F');
    
    // Logo (if available)
    if (this.options.branding.logo_url) {
      // TODO: Load and add logo image
      // this.doc.addImage(logoData, 'PNG', 20, 20, 40, 40);
    }
    
    // Title
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(32);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Marketing Audit Report', this.pageWidth / 2, 40, { align: 'center' });
    
    // Practice name
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(practice.name, this.pageWidth / 2, 55, { align: 'center' });
    
    // Date
    this.doc.setFontSize(12);
    this.doc.text(
      new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      this.pageWidth / 2,
      65,
      { align: 'center' }
    );
    
    // Score (large, centered)
    this.doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    this.doc.setFontSize(72);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(
      audit.composite_score.toFixed(1),
      this.pageWidth / 2,
      140,
      { align: 'center' }
    );
    
    this.doc.setFontSize(16);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text('Marketing Health Score', this.pageWidth / 2, 155, { align: 'center' });
    
    // Score label
    const label = this.getScoreLabel(audit.composite_score);
    this.doc.setFontSize(14);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text(label, this.pageWidth / 2, 165, { align: 'center' });
  }
  
  /**
   * Add executive summary
   */
  private addExecutiveSummary(audit: AuditRun, recommendations: Recommendation[]): void {
    this.currentY = this.margin;
    
    // Title
    this.addSectionTitle('Executive Summary');
    
    // Overview
    this.doc.setFontSize(11);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(
      `This comprehensive marketing audit analyzed your practice's online presence across five key categories. ` +
      `Your overall score of ${audit.composite_score.toFixed(1)} places you at the ${audit.percentile_rank?.toFixed(0) || '—'}th percentile ` +
      `among ${audit.peer_count || 0} local competitors.`,
      this.margin,
      this.currentY,
      { maxWidth: this.pageWidth - 2 * this.margin }
    );
    
    this.currentY += 20;
    
    // Key Findings
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Key Findings', this.margin, this.currentY);
    this.currentY += 8;
    
    // Strengths
    const strengths = this.identifyStrengths(audit);
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('✓ Strengths:', this.margin, this.currentY);
    this.currentY += 6;
    
    this.doc.setFont('helvetica', 'normal');
    strengths.forEach(strength => {
      this.doc.text(`• ${strength}`, this.margin + 5, this.currentY, { maxWidth: this.pageWidth - 2 * this.margin - 5 });
      this.currentY += 6;
    });
    
    this.currentY += 5;
    
    // Opportunities
    const opportunities = this.identifyOpportunities(audit, recommendations);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('⚡ Key Opportunities:', this.margin, this.currentY);
    this.currentY += 6;
    
    this.doc.setFont('helvetica', 'normal');
    opportunities.forEach(opp => {
      this.doc.text(`• ${opp}`, this.margin + 5, this.currentY, { maxWidth: this.pageWidth - 2 * this.margin - 5 });
      this.currentY += 6;
    });
  }
  
  /**
   * Add score breakdown
   */
  private addScoreBreakdown(audit: AuditRun): void {
    this.currentY = this.margin;
    
    this.addSectionTitle('Score Breakdown');
    
    // Create table
    const tableData = [
      ['Technical SEO & Performance', audit.technical_score.toFixed(1), this.getScoreLabel(audit.technical_score)],
      ['Local Presence & Reputation', audit.local_score.toFixed(1), this.getScoreLabel(audit.local_score)],
      ['Content & Authority', audit.content_score.toFixed(1), this.getScoreLabel(audit.content_score)],
      ['Analytics & Attribution', audit.analytics_score.toFixed(1), this.getScoreLabel(audit.analytics_score)],
      ['Conversion Experience', audit.conversion_score.toFixed(1), this.getScoreLabel(audit.conversion_score)],
    ];
    
    autoTable(this.doc, {
      head: [['Category', 'Score', 'Rating']],
      body: tableData,
      startY: this.currentY,
      theme: 'grid',
      headStyles: {
        fillColor: this.hexToRGB(this.options.branding.primary_color),
        fontSize: 11,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 10,
      },
      columnStyles: {
        1: { halign: 'center', fontStyle: 'bold' },
        2: { halign: 'center' },
      },
    });
  }
  
  /**
   * Add recommendations section
   */
  private addRecommendations(recommendations: Recommendation[]): void {
    this.currentY = this.margin;
    
    this.addSectionTitle('Top Recommendations');
    
    const topRecs = recommendations.slice(0, 10);
    
    topRecs.forEach((rec, index) => {
      // Check if we need a new page
      if (this.currentY > this.pageHeight - 60) {
        this.doc.addPage();
        this.currentY = this.margin;
      }
      
      // Recommendation box
      this.doc.setFillColor(245, 245, 245);
      this.doc.roundedRect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 35, 3, 3, 'F');
      
      // Number badge
      this.doc.setFillColor(...this.hexToRGB(this.options.branding.primary_color));
      this.doc.circle(this.margin + 5, this.currentY + 5, 4, 'F');
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text((index + 1).toString(), this.margin + 5, this.currentY + 6, { align: 'center' });
      
      // Title
      this.doc.setTextColor(0, 0, 0);
      this.doc.setFontSize(12);
      this.doc.text(rec.title, this.margin + 12, this.currentY + 6);
      
      // Description
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(60, 60, 60);
      this.doc.text(
        rec.description,
        this.margin + 12,
        this.currentY + 12,
        { maxWidth: this.pageWidth - 2 * this.margin - 15 }
      );
      
      // Impact/Effort badges
      this.doc.setFontSize(8);
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(
        `Impact: ${rec.impact.toUpperCase()} • Effort: ${rec.effort.toUpperCase()} • ${rec.estimated_hours || 0}h`,
        this.margin + 12,
        this.currentY + 28
      );
      
      this.currentY += 40;
    });
  }
  
  /**
   * Add competitor analysis
   */
  private addCompetitorAnalysis(audit: AuditRun): void {
    this.currentY = this.margin;
    
    this.addSectionTitle('Competitive Analysis');
    
    // Your position
    this.doc.setFontSize(11);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(
      `You rank #${audit.your_rank || '—'} out of ${audit.peer_count || '—'} practices (${audit.percentile_rank?.toFixed(0) || '—'}th percentile)`,
      this.margin,
      this.currentY
    );
    this.currentY += 10;
    
    // Competitors table
    const competitors = (audit.competitors || []).slice(0, 10);
    const tableData = competitors.map(comp => [
      comp.name,
      comp.rank?.toString() || '—',
      comp.score?.toFixed(1) || '—',
      comp.reviews_count?.toString() || '—',
      comp.avg_rating?.toFixed(1) || '—',
    ]);
    
    autoTable(this.doc, {
      head: [['Practice', 'Rank', 'Score', 'Reviews', 'Rating']],
      body: tableData,
      startY: this.currentY,
      theme: 'striped',
      headStyles: {
        fillColor: this.hexToRGB(this.options.branding.primary_color),
      },
    });
  }
  
  /**
   * Add evidence appendix
   */
  private addEvidenceAppendix(recommendations: Recommendation[]): void {
    this.currentY = this.margin;
    
    this.addSectionTitle('Evidence & Metrics');
    
    this.doc.setFontSize(10);
    this.doc.setTextColor(60, 60, 60);
    this.doc.text(
      'This section contains detailed evidence supporting each recommendation.',
      this.margin,
      this.currentY
    );
    this.currentY += 10;
    
    // Add evidence for each recommendation
    recommendations.slice(0, 10).forEach(rec => {
      if (rec.evidence && rec.evidence.length > 0) {
        this.doc.setFontSize(11);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(0, 0, 0);
        this.doc.text(rec.title, this.margin, this.currentY);
        this.currentY += 6;
        
        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(80, 80, 80);
        
        rec.evidence.forEach(ev => {
          this.doc.text(
            `• ${ev.metric}: ${ev.value} (Source: ${ev.source})`,
            this.margin + 5,
            this.currentY
          );
          this.currentY += 5;
        });
        
        this.currentY += 5;
        
        // Check for page break
        if (this.currentY > this.pageHeight - 40) {
          this.doc.addPage();
          this.currentY = this.margin;
        }
      }
    });
  }
  
  /**
   * Add section title
   */
  private addSectionTitle(title: string): void {
    const primaryColor = this.hexToRGB(this.options.branding.primary_color);
    
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    this.doc.text(title, this.margin, this.currentY);
    
    // Underline
    this.doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY + 2, this.pageWidth - this.margin, this.currentY + 2);
    
    this.currentY += 12;
  }
  
  /**
   * Add footers to all pages
   */
  private addFooters(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Page number
      this.doc.setFontSize(9);
      this.doc.setTextColor(150, 150, 150);
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      );
      
      // Branding footer
      if (this.options.branding.company_name) {
        this.doc.text(
          this.options.branding.company_name,
          this.margin,
          this.pageHeight - 10
        );
      }
      
      // Generated date
      this.doc.text(
        new Date().toLocaleDateString(),
        this.pageWidth - this.margin,
        this.pageHeight - 10,
        { align: 'right' }
      );
    }
  }
  
  /**
   * Helper: Convert hex color to RGB
   */
  private hexToRGB(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : { r: 139, g: 92, b: 246 }; // Default purple
  }
  
  /**
   * Helper: Get score label
   */
  private getScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Needs Work';
    return 'Poor';
  }
  
  /**
   * Helper: Identify strengths
   */
  private identifyStrengths(audit: AuditRun): string[] {
    const strengths = [];
    if (audit.technical_score >= 80) strengths.push('Strong technical SEO foundation');
    if (audit.local_score >= 80) strengths.push('Excellent local presence and reviews');
    if (audit.content_score >= 80) strengths.push('High-quality content and backlink profile');
    if (audit.analytics_score >= 80) strengths.push('Comprehensive analytics tracking');
    if (audit.conversion_score >= 80) strengths.push('Optimized conversion experience');
    return strengths.slice(0, 3);
  }
  
  /**
   * Helper: Identify opportunities
   */
  private identifyOpportunities(audit: AuditRun, recommendations: Recommendation[]): string[] {
    return recommendations
      .filter(r => r.impact === 'high')
      .slice(0, 3)
      .map(r => r.title);
  }
}

