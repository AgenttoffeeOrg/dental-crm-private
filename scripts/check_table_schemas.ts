import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchemas() {
  console.log('🔍 Checking Table Schemas\n');
  
  const tables = ['activities', 'tasks', 'marketing_campaigns'];
  
  for (const table of tables) {
    console.log(`\n📋 Table: ${table}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Try to get one record to see columns
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Hint: ${error.hint}`);
    } else if (data && data[0]) {
      const columns = Object.keys(data[0]);
      console.log(`✅ Columns: ${columns.join(', ')}`);
    } else {
      // Table exists but is empty - try to insert to see required columns
      console.log(`⚠️  Table is empty. Attempting test insert to see required columns...`);
      
      const testData: any = {
        tenant_id: 'c128efd3-e2e8-4523-922f-22852b93d2d2'
      };
      
      const { error: insertError } = await supabase
        .from(table)
        .insert(testData);
      
      if (insertError) {
        console.log(`   Error details: ${insertError.message}`);
        console.log(`   This helps us understand required columns`);
      }
    }
  }
}

checkSchemas().then(() => process.exit(0));
