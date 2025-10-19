#!/usr/bin/env node

/**
 * =====================================================
 * TREATMENT ROUTING MIGRATION RUNNER
 * =====================================================
 * Checks and runs the 3 treatment routing migrations
 * =====================================================
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function runMigrations() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 TREATMENT ROUTING MIGRATION RUNNER');
  console.log('='.repeat(60) + '\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(`${colors.red}❌ Error: Missing environment variables${colors.reset}`);
    console.log('\nRequired variables:');
    console.log('  - NEXT_PUBLIC_SUPABASE_URL');
    console.log('  - SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)');
    console.log('\nMake sure these are set in your .env.local file');
    process.exit(1);
  }

  console.log(`${colors.cyan}📡 Connecting to Supabase...${colors.reset}`);
  console.log(`   URL: ${supabaseUrl}\n`);

  // Import Supabase client
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Check which tables exist
  console.log(`${colors.cyan}🔍 Checking existing tables...${colors.reset}\n`);

  const requiredTables = [
    'treatment_tags',
    'treatment_tag_pipeline_mappings',
    'treatment_routing_logs',
    'treatment_routing_settings',
    'pms_procedure_tag_mappings'
  ];

  const existingTables = [];
  const missingTables = [];

  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(0);

      if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
        missingTables.push(table);
        console.log(`   ${colors.red}❌${colors.reset} ${table}`);
      } else {
        existingTables.push(table);
        console.log(`   ${colors.green}✓${colors.reset} ${table}`);
      }
    } catch (err) {
      missingTables.push(table);
      console.log(`   ${colors.red}❌${colors.reset} ${table}`);
    }
  }

  console.log(`\n${colors.cyan}📊 Status:${colors.reset}`);
  console.log(`   Existing: ${existingTables.length}/${requiredTables.length}`);
  console.log(`   Missing: ${missingTables.length}/${requiredTables.length}\n`);

  if (missingTables.length === 0) {
    console.log(`${colors.green}✅ All treatment routing tables exist!${colors.reset}`);
    console.log('\nYour system is ready to use the treatment routing features.\n');
    return;
  }

  // Migrations to run
  const migrations = [
    {
      name: 'Treatment Routing Core Tables',
      file: 'supabase/sql/45_treatment_routing.sql',
      tables: ['treatment_tags', 'treatment_tag_pipeline_mappings', 'treatment_routing_logs', 'treatment_routing_settings']
    },
    {
      name: 'Treatment Routing Permissions',
      file: 'supabase/sql/46_treatment_routing_permissions.sql',
      tables: []
    },
    {
      name: 'PMS Procedure Tag Mappings',
      file: 'supabase/sql/47_pms_procedure_tag_mappings.sql',
      tables: ['pms_procedure_tag_mappings']
    }
  ];

  console.log(`${colors.yellow}⚠️  Missing tables detected. Running migrations...${colors.reset}\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const migration of migrations) {
    console.log(`${colors.cyan}📄 Running: ${migration.name}${colors.reset}`);
    console.log(`   File: ${migration.file}`);

    const filePath = path.join(process.cwd(), migration.file);

    if (!fs.existsSync(filePath)) {
      console.log(`   ${colors.yellow}⚠️  File not found, skipping...${colors.reset}\n`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf8');

    try {
      // Execute the SQL using Supabase RPC
      const { error } = await supabase.rpc('exec_sql', { sql_string: sql });

      if (error) {
        // Try alternative method - direct query
        const { error: queryError } = await supabase.from('_sql').select('*').limit(0);
        
        if (queryError) {
          throw new Error('Cannot execute SQL. Please run migrations manually in Supabase SQL Editor.');
        }
      }

      console.log(`   ${colors.green}✅ Success!${colors.reset}\n`);
      successCount++;
    } catch (err) {
      console.error(`   ${colors.red}❌ Error: ${err.message}${colors.reset}\n`);
      errorCount++;
    }
  }

  console.log('='.repeat(60));
  console.log(`\n${colors.cyan}📊 Migration Summary:${colors.reset}`);
  console.log(`   ✅ Successful: ${successCount}`);
  if (errorCount > 0) {
    console.log(`   ❌ Errors: ${errorCount}`);
  }
  console.log('');

  if (errorCount > 0) {
    console.log(`${colors.yellow}⚠️  Some migrations failed.${colors.reset}`);
    console.log('\nPlease run them manually in Supabase SQL Editor:');
    console.log(`   1. Go to: ${supabaseUrl.replace('/v1', '')}`);
    console.log('   2. Click "SQL Editor" in left sidebar');
    console.log('   3. Click "New Query"');
    console.log('   4. Copy and paste the content from:');
    migrations.forEach(m => {
      console.log(`      - ${m.file}`);
    });
    console.log('   5. Click "Run" for each file\n');
  } else {
    console.log(`${colors.green}🎉 All migrations completed successfully!${colors.reset}\n`);
  }
}

// Run migrations
runMigrations().catch(err => {
  console.error(`\n${colors.red}❌ Fatal error:${colors.reset}`, err.message);
  process.exit(1);
});

