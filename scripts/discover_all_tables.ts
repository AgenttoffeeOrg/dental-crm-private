import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TENANT_ID = 'c128efd3-e2e8-4523-922f-22852b93d2d2';

async function discoverAllTables() {
  console.log('🔍 COMPLETE SYSTEM DISCOVERY FOR INVESTOR DEMO\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const allTables = [
    // Core CRM
    'contacts', 'deals', 'pipelines', 'pipeline_stages',
    // Activities & Tasks
    'activities', 'tasks', 'notes', 'emails', 'phone_calls', 'sms_messages',
    // Marketing
    'marketing_campaigns', 'marketing_campaign_sends', 'marketing_segments',
    'marketing_forms', 'marketing_form_submissions', 'marketing_templates',
    'marketing_email_sends', 'marketing_sms_sends', 'marketing_journeys',
    'marketing_landing_pages', 'marketing_attribution_logs',
    // Automations
    'automations', 'automation_rules', 'automation_triggers', 'automation_actions',
    'automation_runs', 'automation_logs',
    // Analytics
    'analytics_events', 'analytics_metrics', 'dashboard_widgets',
    // Integrations
    'integrations', 'integration_logs', 'webhooks',
    // Financial
    'invoices', 'payments', 'treatment_plans', 'procedures',
    // Appointments
    'appointments', 'appointment_types',
    // Social Media
    'social_media_accounts', 'social_media_posts', 'social_media_interactions'
  ];
  
  const discovered = {
    exists: [] as string[],
    hasData: [] as Array<{table: string, count: number}>,
    empty: [] as string[],
    missing: [] as string[]
  };
  
  for (const table of allTables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', TENANT_ID);
    
    if (error) {
      discovered.missing.push(table);
    } else {
      discovered.exists.push(table);
      if (count && count > 0) {
        discovered.hasData.push({ table, count });
      } else {
        discovered.empty.push(table);
      }
    }
  }
  
  console.log('✅ TABLES WITH DATA:');
  discovered.hasData.forEach(t => console.log(`   ${t.table}: ${t.count} records`));
  
  console.log('\n⚠️  EMPTY TABLES (Need Data):');
  discovered.empty.forEach(t => console.log(`   ${t}`));
  
  console.log('\n❌ TABLES NOT FOUND:');
  discovered.missing.forEach(t => console.log(`   ${t}`));
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`📊 Summary:`);
  console.log(`   Tables with data: ${discovered.hasData.length}`);
  console.log(`   Empty tables to fill: ${discovered.empty.length}`);
  console.log(`   Missing tables: ${discovered.missing.length}`);
  console.log('\n');
}

discoverAllTables().then(() => process.exit(0));
