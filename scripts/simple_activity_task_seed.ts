import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TENANT_ID = 'c128efd3-e2e8-4523-922f-22852b93d2d2';
const USER_ID = 'a0901598-6cc5-49bc-9234-db90b9af3444';

async function simpleSeed() {
  console.log('🎯 Creating Activities and Tasks\n');
  
  // Get contacts and deals
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, full_name')
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null)
    .limit(60);
  
  const { data: deals } = await supabase
    .from('deals')
    .select('id')
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null)
    .limit(120);
  
  if (!contacts || contacts.length === 0) {
    console.error('No contacts found');
    return;
  }
  
  console.log(`Found ${contacts.length} contacts and ${deals?.length || 0} deals\n`);
  
  // Create activities using PostgREST's RPC or minimal required fields
  console.log('Creating activities...');
  let activityCount = 0;
  
  for (let i = 0; i < 150; i++) {
    const contact = contacts[i % contacts.length];
    const deal = deals && deals.length > 0 && Math.random() > 0.3 ? deals[Math.floor(Math.random() * deals.length)] : null;
    
    const types = ['note', 'email', 'phone_call'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const { data, error } = await supabase
      .from('activities')
      .insert({
        tenant_id: TENANT_ID,
        type: type,
        direction: 'outbound',
        contact_id: contact.id,
        deal_id: deal?.id,
        agent_user_id: USER_ID,
        occurred_at: new Date().toISOString(),
        subject: `${type} with ${contact.full_name}`,
        snippet: `Follow up activity with ${contact.full_name}`
      })
      .select()
      .single();
    
    if (error) {
      if (i < 3) { // Only log first few errors
        console.error(`Error creating activity:`, error.message, error.details, error.hint);
      }
    } else {
      activityCount++;
    }
  }
  
  console.log(`✅ Created ${activityCount} activities\n`);
  
  // Create tasks
  console.log('Creating tasks...');
  let taskCount = 0;
  
  for (let i = 0; i < 100; i++) {
    const contact = contacts[i % contacts.length];
    const deal = deals && deals.length > 0 && Math.random() > 0.5 ? deals[Math.floor(Math.random() * deals.length)] : null;
    
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        tenant_id: TENANT_ID,
        title: `Follow up with ${contact.full_name}`,
        description: `Task for ${contact.full_name}`,
        status: Math.random() > 0.7 ? 'completed' : 'pending',
        priority: 'medium',
        contact_id: contact.id,
        deal_id: deal?.id,
        assignee_user_id: USER_ID,
        owner_user_id: USER_ID,
        due_at: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();
    
    if (error) {
      if (i < 3) { // Only log first few errors
        console.error(`Error creating task:`, error.message, error.details, error.hint);
      }
    } else {
      taskCount++;
    }
  }
  
  console.log(`✅ Created ${taskCount} tasks\n`);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Final: ${activityCount} activities, ${taskCount} tasks`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

simpleSeed().then(() => process.exit(0));
