import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TENANT_ID = 'c128efd3-e2e8-4523-922f-22852b93d2d2';

async function verify() {
  console.log('🔍 Investor Meeting Demo Data Verification\n');
  console.log('Organization: Smile');
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Count pipelines
  const { data: pipelines, count: pipelineCount } = await supabase
    .from('pipelines')
    .select('name', { count: 'exact' })
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null);
  
  console.log(`✅ Pipelines: ${pipelineCount}`);
  if (pipelines) {
    pipelines.forEach(p => console.log(`   - ${p.name}`));
  }
  
  // Count stages
  const { count: stageCount } = await supabase
    .from('pipeline_stages')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null);
  
  console.log(`\n✅ Pipeline Stages: ${stageCount}`);
  
  // Count contacts
  const { count: contactCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null);
  
  console.log(`\n✅ Patient Contacts: ${contactCount}`);
  
  // Count deals
  const { data: deals, count: dealCount } = await supabase
    .from('deals')
    .select('value_estimate_cents', { count: 'exact' })
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null);
  
  console.log(`\n✅ Deals: ${dealCount}`);
  
  // Calculate total pipeline value
  if (deals && deals.length > 0) {
    const totalValue = deals.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0) / 100;
    console.log(`   Total Pipeline Value: $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Demo environment is ready for your investor meeting!');
  console.log('\n🔑 Login: deepakshegde@gmail.com');
  console.log('🌐 URL: http://localhost:3000');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

verify().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
