/**
 * Resend Email Integration
 * 
 * Email delivery for audit reports and alerts.
 * Architecture: Reliable email delivery with templates.
 */

import type { AuditRun, Recommendation } from '../types';
import { renderAuditReportEmail } from './audit-report-email';

// NOTE: In production, install Resend:
// npm install resend
// import { Resend } from 'resend';

export interface EmailOptions {
  to: string | string[];
  from?: string;
  replyTo?: string;
  attachPDF?: boolean;
}

export class ResendIntegration {
  private apiKey: string;
  private fromEmail: string;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.RESEND_API_KEY || '';
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'audits@dentalcrm.com';
  }
  
  /**
   * Send audit complete email
   */
  async sendAuditCompleteEmail(
    audit: AuditRun,
    practice: any,
    options: EmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.apiKey) {
      console.warn('[Resend] API key not configured, skipping email');
      return { success: false, error: 'API key not configured' };
    }
    
    const topRecommendations = (audit.recommendations || []).slice(0, 5);
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/marketing-audit`;
    
    const htmlContent = renderAuditReportEmail({
      practice: {
        name: practice.name,
        website: practice.website,
      },
      audit,
      topRecommendations,
      dashboardUrl,
    });
    
    try {
      // TODO: Actual Resend implementation
      // const resend = new Resend(this.apiKey);
      // const { data, error } = await resend.emails.send({
      //   from: this.fromEmail,
      //   to: Array.isArray(options.to) ? options.to : [options.to],
      //   subject: `Marketing Audit Complete: Score ${audit.composite_score.toFixed(1)} ${this.getTrendEmoji(audit.score_change)}`,
      //   html: htmlContent,
      // });
      
      // if (error) {
      //   return { success: false, error: error.message };
      // }
      
      // return { success: true, messageId: data.id };
      
      // Placeholder
      console.log('[Resend] Would send email to:', options.to);
      console.log('  Subject: Marketing Audit Complete');
      console.log('  Score:', audit.composite_score);
      
      return { success: true, messageId: 'placeholder-id' };
    } catch (error: any) {
      console.error('[Resend] Error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Send regression alert email
   */
  async sendRegressionAlert(
    audit: AuditRun,
    previousScore: number,
    practice: any,
    options: EmailOptions
  ): Promise<{ success: boolean }> {
    const scoreDrop = previousScore - audit.composite_score;
    
    const html = `
      <h2>⚠️ Marketing Score Regression Alert</h2>
      <p>Your marketing health score has dropped by <strong>${scoreDrop.toFixed(1)} points</strong>.</p>
      <p>Previous: ${previousScore.toFixed(1)} → Current: ${audit.composite_score.toFixed(1)}</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/marketing-audit">View Full Report →</a></p>
    `;
    
    try {
      // TODO: Implement with Resend
      console.log('[Resend] Would send regression alert to:', options.to);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }
  
  /**
   * Send weekly summary email
   */
  async sendWeeklySummary(
    practice: any,
    summary: {
      audits_this_week: number;
      avg_score: number;
      score_change: number;
      new_recommendations: number;
    },
    options: EmailOptions
  ): Promise<{ success: boolean }> {
    const html = `
      <h2>📊 Weekly Marketing Summary</h2>
      <p><strong>Audits run:</strong> ${summary.audits_this_week}</p>
      <p><strong>Average score:</strong> ${summary.avg_score.toFixed(1)}</p>
      <p><strong>Change:</strong> ${summary.score_change > 0 ? '+' : ''}${summary.score_change.toFixed(1)} points</p>
      <p><strong>New recommendations:</strong> ${summary.new_recommendations}</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/marketing-audit">View Dashboard →</a></p>
    `;
    
    try {
      console.log('[Resend] Would send weekly summary to:', options.to);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }
  
  /**
   * Send monthly report email
   */
  async sendMonthlyReport(
    audit: AuditRun,
    practice: any,
    pdfBuffer: Buffer,
    options: EmailOptions
  ): Promise<{ success: boolean }> {
    try {
      // TODO: Implement with PDF attachment
      // const resend = new Resend(this.apiKey);
      // await resend.emails.send({
      //   from: this.fromEmail,
      //   to: options.to,
      //   subject: `Monthly Marketing Report - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      //   html: monthlyReportTemplate,
      //   attachments: [{
      //     filename: `marketing-report-${practice.name}.pdf`,
      //     content: pdfBuffer,
      //   }],
      // });
      
      console.log('[Resend] Would send monthly report with PDF to:', options.to);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }
  
  /**
   * Get trend emoji
   */
  private getTrendEmoji(change?: number): string {
    if (!change) return '';
    if (change > 0) return '📈';
    if (change < 0) return '📉';
    return '➖';
  }
}

