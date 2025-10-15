/**
 * Scheduled Audit Job
 * 
 * Phase 2 Feature: Runs audits automatically on schedule.
 * Architecture: Cron-compatible job with error recovery.
 */

import { createClient } from '@/lib/supabase-server';
import { AuditOrchestrator } from '../orchestrator';

export interface ScheduledAuditJobConfig {
  maxConcurrent?: number;
  retryAttempts?: number;
  emailOnComplete?: boolean;
}

export class ScheduledAuditJob {
  private config: ScheduledAuditJobConfig;
  private running: boolean = false;
  
  constructor(config: ScheduledAuditJobConfig = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent || 5,
      retryAttempts: config.retryAttempts || 3,
      emailOnComplete: config.emailOnComplete !== false,
    };
  }
  
  /**
   * Run scheduled audits
   * 
   * Called by cron job every hour. Checks for due audits and runs them.
   */
  async run(): Promise<void> {
    if (this.running) {
      console.log('[ScheduledAuditJob] Already running, skipping...');
      return;
    }
    
    this.running = true;
    
    try {
      console.log('[ScheduledAuditJob] Starting scheduled audit check...');
      
      const supabase = createClient();
      
      // Get all active schedules that are due
      const now = new Date();
      const dueSchedules = await this.getDueSchedules(supabase, now);
      
      console.log(`[ScheduledAuditJob] Found ${dueSchedules.length} due audits`);
      
      if (dueSchedules.length === 0) {
        return;
      }
      
      // Run audits in batches
      const batches = this.createBatches(dueSchedules, this.config.maxConcurrent!);
      
      for (const batch of batches) {
        await Promise.all(
          batch.map(schedule => this.runScheduledAudit(supabase, schedule))
        );
      }
      
      console.log('[ScheduledAuditJob] Completed all scheduled audits');
    } catch (error) {
      console.error('[ScheduledAuditJob] Error:', error);
    } finally {
      this.running = false;
    }
  }
  
  /**
   * Get schedules that are due to run
   */
  private async getDueSchedules(supabase: any, now: Date): Promise<any[]> {
    const currentHour = now.getUTCHours();
    const currentDayOfWeek = now.getUTCDay();
    const currentDayOfMonth = now.getUTCDate();
    
    const { data, error } = await supabase
      .from('marketing_audit_schedules')
      .select('*, practice:practices(*)')
      .eq('active', true)
      .eq('hour', currentHour)
      .or(`and(frequency.eq.weekly,day_of_week.eq.${currentDayOfWeek}),and(frequency.eq.monthly,day_of_month.eq.${currentDayOfMonth})`);
    
    if (error) {
      console.error('[ScheduledAuditJob] Error fetching schedules:', error);
      return [];
    }
    
    // Filter out schedules that already ran today
    return (data || []).filter(schedule => {
      if (!schedule.last_run_at) return true;
      
      const lastRun = new Date(schedule.last_run_at);
      const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);
      
      // Must be at least 23 hours since last run (prevent duplicates)
      return hoursSinceLastRun >= 23;
    });
  }
  
  /**
   * Run a single scheduled audit
   */
  private async runScheduledAudit(supabase: any, schedule: any): Promise<void> {
    const { practice } = schedule;
    
    console.log(`[ScheduledAuditJob] Running audit for practice: ${practice.name}`);
    
    try {
      // Create orchestrator
      const orchestrator = new AuditOrchestrator();
      
      // Run audit
      const auditRun = await orchestrator.runAudit(practice);
      
      // Update schedule
      await supabase
        .from('marketing_audit_schedules')
        .update({
          last_run_at: new Date().toISOString(),
          last_audit_id: auditRun.id,
        })
        .eq('id', schedule.id);
      
      // Send email if enabled
      if (this.config.emailOnComplete && schedule.email_report) {
        await this.sendEmailReport(supabase, practice, auditRun);
      }
      
      console.log(`[ScheduledAuditJob] ✅ Completed audit for: ${practice.name}`);
    } catch (error) {
      console.error(`[ScheduledAuditJob] ❌ Failed audit for: ${practice.name}`, error);
      
      // Log error
      await supabase
        .from('marketing_audit_schedules')
        .update({
          last_error: (error as Error).message,
          error_count: schedule.error_count + 1,
        })
        .eq('id', schedule.id);
      
      // Disable schedule if too many errors
      if (schedule.error_count >= this.config.retryAttempts!) {
        await supabase
          .from('marketing_audit_schedules')
          .update({ active: false })
          .eq('id', schedule.id);
        
        console.log(`[ScheduledAuditJob] Disabled schedule due to errors: ${schedule.id}`);
      }
    }
  }
  
  /**
   * Send email report
   */
  private async sendEmailReport(supabase: any, practice: any, auditRun: any): Promise<void> {
    // Get practice owner email
    const { data: owner } = await supabase
      .from('app_users')
      .select('email')
      .eq('tenant_id', practice.tenant_id)
      .eq('role', 'owner')
      .single();
    
    if (!owner?.email) {
      console.log('[ScheduledAuditJob] No owner email found, skipping email');
      return;
    }
    
    // TODO: Send email via email service (Resend, SendGrid, etc.)
    // For now, just log
    console.log(`[ScheduledAuditJob] Would send email to: ${owner.email}`);
    console.log(`  Audit ID: ${auditRun.id}`);
    console.log(`  Score: ${auditRun.composite_score}`);
    console.log(`  Recommendations: ${auditRun.recommendations?.length || 0}`);
  }
  
  /**
   * Create batches for concurrent execution
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}

