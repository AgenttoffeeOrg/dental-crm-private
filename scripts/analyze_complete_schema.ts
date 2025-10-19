import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TENANT_ID = 'c128efd3-e2e8-4523-922f-22852b93d2d2';

async function analyzeSchema() {
  console.log('🔍 Complete Database Schema Analysis for Investor Demo\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const tables = [
    'contacts',
    'deals', 
    'pipelines',
    'pipeline_stages',
    'tasks',
    'activities',
    'appointments',
    'appointment_types',
    'marketing_campaigns',
    'marketing_campaign_sends',
    'marketing_forms',
    'marketing_form_submissions',
    'treatment_plans',
    'invoices',
    'payments',
    'notes',
    'emails',
    'phone_calls',
    'sms_messages'
  ];
  
  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null);
    
    if (error) {
      console.log(`❌ ${table}: Table doesn't exist or error - ${error.code}`);
    } else {
      console.log(`✅ ${table}: ${count} records - TABLE EXISTS`);
      
      // Get one record to see schema
      if (count && count > 0) {
        const { data: sample } = await supabase
          .from(table)
          .select('*')
          .eq('tenant_id', TENANT_ID)
          .limit(1);
        
        if (sample && sample[0]) {
          const columns = Object.keys(sample[0]);
          console.log(`   Columns: ${columns.slice(0, 10).join(', ')}${columns.length > 10 ? '...' : ''}`);
        }
      }
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

analyzeSchema().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
