/**
 * Cron Endpoint: Scheduled Audits
 * 
 * GET /api/cron/scheduled-audits
 * 
 * Called hourly by cron service (Vercel Cron, Railway Cron, or external).
 * Runs all due scheduled audits.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ScheduledAuditJob } from '@/lib/marketing-audit/jobs/scheduled-audit-job';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'dev-secret';
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('[CronEndpoint] Unauthorized access attempt');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  console.log('[CronEndpoint] Starting scheduled audits job...');
  
  try {
    const job = new ScheduledAuditJob({
      maxConcurrent: 5,
      retryAttempts: 3,
      emailOnComplete: true,
    });
    
    await job.run();
    
    return NextResponse.json({
      success: true,
      message: 'Scheduled audits completed',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[CronEndpoint] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run scheduled audits',
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

