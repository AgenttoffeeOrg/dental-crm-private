const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  // Extract connection details from Supabase URL
  const projectRef = supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];
  
  if (!projectRef) {
    console.error('❌ Invalid Supabase URL format');
    process.exit(1);
  }

  const connectionString = `postgresql://postgres:${serviceKey}@db.${projectRef}.supabase.co:5432/postgres`;

  const client = new Client({ connectionString });

  try {
    console.log('🔌 Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // List of migrations to run
    const migrations = [
      {
        file: 'supabase/sql/15_user_invitations.sql',
        name: 'User Invitations & Activity Log'
      },
      {
        file: 'supabase/sql/16_enterprise_permissions.sql',
        name: 'Enterprise Permissions & Settings'
      }
    ];

    let successCount = 0;
    let errorCount = 0;

    for (const migration of migrations) {
      console.log(`\n📄 Running: ${migration.name}`);
      console.log(`   File: ${migration.file}`);

      const filePath = path.join(__dirname, migration.file);

      if (!fs.existsSync(filePath)) {
        console.log(`   ⚠️  File not found, skipping...`);
        continue;
      }

      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query(sql);
        console.log(`   ✅ Success!`);
        successCount++;
      } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
        errorCount++;
        
        // Don't stop - some errors are ok (like "already exists")
        if (!err.message.includes('already exists')) {
          console.error(`   Details: ${err.detail || 'No details'}`);
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   ⚠️  Errors: ${errorCount} (may be ok if tables already exist)`);
    }
    console.log('');

    // Verify tables were created
    console.log('🔍 Verifying database tables...\n');

    const tables = [
      'custom_roles',
      'permission_definitions',
      'role_permissions',
      'user_invitations',
      'user_activity_log',
      'user_preferences',
      'audit_trail',
      'pipeline_settings',
      'deal_settings',
      'user_profiles'
    ];

    let foundCount = 0;

    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);

      const exists = result.rows[0].exists;
      if (exists) {
        console.log(`   ✅ ${table}`);
        foundCount++;
      } else {
        console.log(`   ❌ ${table} - NOT FOUND`);
      }
    }

    console.log(`\n📊 Database Status: ${foundCount}/${tables.length} tables ready`);

    if (foundCount === tables.length) {
      console.log('\n🎉 ALL SYSTEMS GO! Enterprise features are ready!');
    } else {
      console.log('\n⚠️  Some tables missing. Check migration errors above.');
    }

    // Check permission count
    const permCount = await client.query('SELECT COUNT(*) FROM permission_definitions');
    console.log(`\n🔑 Permissions: ${permCount.rows[0].count} defined`);

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Disconnected from database');
  }
}

runMigrations().catch(console.error);
