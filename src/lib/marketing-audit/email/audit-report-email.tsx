/**
 * Audit Report Email Template
 * 
 * Phase 2 Feature: Beautiful HTML email for scheduled audit results.
 * Architecture: React component rendered to HTML for email delivery.
 */

import { formatScore, formatOrdinal } from '../utils/format';
import type { AuditRun, Recommendation } from '../types';

interface AuditReportEmailProps {
  practice: {
    name: string;
    website: string;
  };
  audit: AuditRun;
  topRecommendations: Recommendation[];
  dashboardUrl: string;
}

export function AuditReportEmail({
  practice,
  audit,
  topRecommendations,
  dashboardUrl,
}: AuditReportEmailProps) {
  const scoreColor = audit.composite_score >= 80 ? '#10B981' : audit.composite_score >= 60 ? '#F59E0B' : '#EF4444';
  const trend = audit.score_change || 0;
  const trendIcon = trend > 0 ? '📈' : trend < 0 ? '📉' : '➖';
  
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Marketing Audit Report - {practice.name}</title>
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        backgroundColor: '#f9fafb',
      }}>
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#f9fafb' }} role="presentation">
          <thead>
            <tr>
              <th style={{ padding: '0', fontSize: '0', lineHeight: '0', height: '0' }} aria-hidden="true">Email Layout</th>
            </tr>
          </thead>
          <tbody>
          <tr>
            <td align="center" style={{ padding: '40px 20px' }}>
              <table width="600" cellPadding="0" cellSpacing="0" style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}>
                {/* Header */}
                <tr>
                  <td style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '40px',
                    textAlign: 'center',
                  }}>
                    <h1 style={{
                      margin: 0,
                      color: '#ffffff',
                      fontSize: '28px',
                      fontWeight: 'bold',
                    }}>
                      Marketing Audit Complete
                    </h1>
                    <p style={{
                      margin: '8px 0 0 0',
                      color: '#e5e7eb',
                      fontSize: '16px',
                    }}>
                      {practice.name}
                    </p>
                  </td>
                </tr>
                
                {/* Score */}
                <tr>
                  <td style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{
                      fontSize: '72px',
                      fontWeight: 'bold',
                      color: scoreColor,
                      lineHeight: 1,
                    }}>
                      {formatScore(audit.composite_score)}
                    </div>
                    <div style={{
                      fontSize: '18px',
                      color: '#6b7280',
                      marginTop: '8px',
                    }}>
                      Marketing Health Score
                    </div>
                    {trend !== 0 && (
                      <div style={{
                        marginTop: '16px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: trend > 0 ? '#10B981' : '#EF4444',
                      }}>
                        {trendIcon} {trend > 0 ? '+' : ''}{trend.toFixed(1)} from last audit
                      </div>
                    )}
                  </td>
                </tr>
                
                {/* Ranking */}
                {audit.your_rank && (
                  <tr>
                    <td style={{ padding: '0 40px 40px 40px' }}>
                      <table width="100%" cellPadding="20" style={{
                        backgroundColor: '#f3f4f6',
                        borderRadius: '8px',
                      }} role="presentation">
                        <thead>
                          <tr>
                            <th style={{ padding: '0 20px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6b7280' }}>Ranking</th>
                          </tr>
                        </thead>
                        <tbody>
                        <tr>
                          <td align="center">
                            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                              Your Competitive Ranking
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
                              {formatOrdinal(audit.your_rank)}
                            </div>
                            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                              out of {audit.peer_count || 'N/A'} practices
                            </div>
                          </td>
                        </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
                
                {/* Top Recommendations */}
                <tr>
                  <td style={{ padding: '0 40px 40px 40px' }}>
                    <h2 style={{
                      margin: '0 0 20px 0',
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: '#1f2937',
                    }}>
                      Top Recommendations
                    </h2>
                    
                    {topRecommendations.slice(0, 5).map((rec, index) => (
                      <div key={index} style={{
                        marginBottom: '16px',
                        padding: '16px',
                        backgroundColor: '#f9fafb',
                        borderLeft: `4px solid ${
                          rec.impact === 'high' ? '#ef4444' :
                          rec.impact === 'medium' ? '#f59e0b' :
                          '#3b82f6'
                        }`,
                        borderRadius: '4px',
                      }}>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: '#1f2937',
                          marginBottom: '8px',
                        }}>
                          {index + 1}. {rec.title}
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: '#6b7280',
                          lineHeight: '1.5',
                        }}>
                          {rec.description}
                        </div>
                        <div style={{
                          marginTop: '8px',
                          fontSize: '12px',
                          color: '#9ca3af',
                        }}>
                          Impact: {rec.impact} • Effort: {rec.effort} • {rec.estimated_hours || 0}h
                        </div>
                      </div>
                    ))}
                  </td>
                </tr>
                
                {/* CTA */}
                <tr>
                  <td style={{ padding: '0 40px 40px 40px', textAlign: 'center' }}>
                    <a href={dashboardUrl} style={{
                      display: 'inline-block',
                      padding: '16px 32px',
                      backgroundColor: '#667eea',
                      color: '#ffffff',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                    }}>
                      View Full Report →
                    </a>
                  </td>
                </tr>
                
                {/* Footer */}
                <tr>
                  <td style={{
                    padding: '20px 40px',
                    backgroundColor: '#f9fafb',
                    borderTop: '1px solid #e5e7eb',
                    textAlign: 'center',
                  }}>
                    <p style={{
                      margin: '0 0 8px 0',
                      fontSize: '12px',
                      color: '#6b7280',
                    }}>
                      This audit was automatically generated by Dental CRM
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: '12px',
                      color: '#9ca3af',
                    }}>
                      <a href={`${dashboardUrl}/settings/schedule`} style={{ color: '#667eea', textDecoration: 'none' }}>
                        Manage Schedule
                      </a>
                      {' • '}
                      <a href={`${dashboardUrl}/settings/notifications`} style={{ color: '#667eea', textDecoration: 'none' }}>
                        Email Preferences
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

/**
 * Render email to HTML string
 */
export function renderAuditReportEmail(props: AuditReportEmailProps): string {
  // In production, use a React email rendering library like @react-email/render
  // For now, return simple HTML string
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Marketing Audit Report</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <h1 style="color: #667eea;">Marketing Audit Complete</h1>
        <p style="font-size: 48px; font-weight: bold; color: #10B981;">${formatScore(props.audit.composite_score)}</p>
        <p>View full report: <a href="${props.dashboardUrl}">${props.dashboardUrl}</a></p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

