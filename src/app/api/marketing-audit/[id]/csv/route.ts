/**
 * API Route: Export Audit as CSV
 * 
 * GET /api/marketing-audit/[id]/csv
 * 
 * Architecture: Server-side CSV generation, streaming response.
 * UX: Quick export for Excel/Sheets analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, errorResponse } from '../../middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request);
  if ('error' in auth) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status });
  }
  
  const { supabase, appUser } = auth;
  const auditId = params.id;
  
  // Get audit with all related data
  const { data: audit, error: auditError } = await supabase
    .from('marketing_audit_runs')
    .select(`
      *,
      practice:practices(*),
      recommendations:marketing_audit_recommendations(*),
      metrics:marketing_audit_metrics(*),
      competitors:marketing_audit_competitors(*)
    `)
    .eq('id', auditId)
    .eq('tenant_id', appUser.tenant_id)
    .single();
  
  if (auditError || !audit) {
    return NextResponse.json(errorResponse('Audit not found'), { status: 404 });
  }
  
  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const exportType = searchParams.get('type') || 'summary'; // summary, full, recommendations
  
  // Generate CSV
  const csv = generateCSV(audit, exportType);
  
  // Return as downloadable file
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="marketing-audit-${audit.practice.name}-${new Date(audit.completed_at || audit.created_at).toISOString().split('T')[0]}.csv"`,
    },
  });
}

/**
 * Generate CSV from audit data
 */
function generateCSV(audit: any, type: string): string {
  if (type === 'summary') {
    return generateSummaryCSV(audit);
  } else if (type === 'recommendations') {
    return generateRecommendationsCSV(audit);
  } else {
    return generateFullCSV(audit);
  }
}

/**
 * Generate summary CSV (scores + basic info)
 */
function generateSummaryCSV(audit: any): string {
  const rows = [
    ['Marketing Audit Summary'],
    [''],
    ['Practice', audit.practice?.name || ''],
    ['Website', audit.practice?.website || ''],
    ['Audit Date', audit.completed_at || audit.created_at],
    [''],
    ['Scores'],
    ['Category', 'Score', 'Rating'],
    ['Overall', audit.composite_score, getScoreLabel(audit.composite_score)],
    ['Technical SEO', audit.technical_score, getScoreLabel(audit.technical_score)],
    ['Local Presence', audit.local_score, getScoreLabel(audit.local_score)],
    ['Content & Authority', audit.content_score, getScoreLabel(audit.content_score)],
    ['Analytics Hygiene', audit.analytics_score, getScoreLabel(audit.analytics_score)],
    ['Conversion UX', audit.conversion_score, getScoreLabel(audit.conversion_score)],
    [''],
    ['Competitive Position'],
    ['Your Rank', audit.your_rank || 'N/A'],
    ['Peer Count', audit.peer_count || 'N/A'],
    ['Percentile', audit.percentile_rank ? `${audit.percentile_rank.toFixed(0)}%` : 'N/A'],
  ];
  
  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

/**
 * Generate recommendations CSV
 */
function generateRecommendationsCSV(audit: any): string {
  const rows = [
    ['Recommendations Export'],
    ['Practice', audit.practice?.name || ''],
    ['Audit Date', audit.completed_at || audit.created_at],
    [''],
    ['Title', 'Category', 'Impact', 'Effort', 'Priority Score', 'Status', 'Estimated Hours', 'Description'],
  ];
  
  (audit.recommendations || []).forEach((rec: any) => {
    rows.push([
      rec.title,
      rec.category,
      rec.impact,
      rec.effort,
      rec.priority_score,
      rec.status,
      rec.estimated_hours || '',
      rec.description,
    ]);
  });
  
  return rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

/**
 * Generate full CSV (everything)
 */
function generateFullCSV(audit: any): string {
  // Combine summary + recommendations + competitors + metrics
  let csv = generateSummaryCSV(audit);
  
  // Add competitors
  csv += '\n\n' + generateCompetitorsCSV(audit);
  
  // Add recommendations
  csv += '\n\n';
  const recRows = [
    ['Recommendations'],
    ['Title', 'Category', 'Impact', 'Effort', 'Status', 'Description'],
  ];
  
  (audit.recommendations || []).forEach((rec: any) => {
    recRows.push([
      rec.title,
      rec.category,
      rec.impact,
      rec.effort,
      rec.status,
      rec.description,
    ]);
  });
  
  csv += recRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  
  return csv;
}

/**
 * Generate competitors CSV
 */
function generateCompetitorsCSV(audit: any): string {
  const rows = [
    ['Competitors'],
    ['Name', 'Rank', 'Score', 'Reviews', 'Rating', 'Distance (km)'],
  ];
  
  (audit.competitors || []).forEach((comp: any) => {
    rows.push([
      comp.name,
      comp.rank || '',
      comp.score || '',
      comp.reviews_count || '',
      comp.avg_rating || '',
      comp.distance_km?.toFixed(1) || '',
    ]);
  });
  
  return rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

/**
 * Get score label
 */
function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Needs Work';
  return 'Poor';
}

