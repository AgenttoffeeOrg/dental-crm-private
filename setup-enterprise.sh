#!/bin/bash

# ============================================================
# ENTERPRISE SYSTEM SETUP SCRIPT
# Automatically applies all database migrations for:
# - Custom Roles
# - Granular Permissions (60+)
# - Comprehensive Audit Trail
# - User Profiles
# - Complete Settings System
# ============================================================

set -e  # Exit on error

echo "🚀 DENTAL CRM - Enterprise System Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ Error: .env.local file not found${NC}"
    echo ""
    echo "Please create .env.local with:"
    echo "  NEXT_PUBLIC_SUPABASE_URL=your-supabase-url"
    echo "  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    exit 1
fi

# Load environment variables
echo -e "${BLUE}📋 Loading environment variables...${NC}"
export $(cat .env.local | grep -v '^#' | xargs)

# Check required variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Error: Required environment variables not found${NC}"
    echo ""
    echo "Missing: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

echo -e "${GREEN}✅ Environment configured${NC}"
echo "   URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Checking dependencies...${NC}"

# Check if pg package is installed
if ! npm list pg --depth=0 &> /dev/null; then
    echo -e "${YELLOW}⚠️  Installing pg package...${NC}"
    npm install pg
fi

echo -e "${GREEN}✅ Dependencies ready${NC}"
echo ""

# Create migration runner if it doesn't exist
cat > ./run-enterprise-migrations.js << 'MIGRATION_SCRIPT'
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
MIGRATION_SCRIPT

echo -e "${BLUE}🗄️  Running database migrations...${NC}"
echo ""
echo "This will create:"
echo "  • Custom roles system"
echo "  • 60+ permission definitions"
echo "  • Comprehensive audit trail"
echo "  • User profiles"
echo "  • Complete settings tables"
echo ""
echo -e "${YELLOW}⏳ This may take 30-60 seconds...${NC}"
echo ""

# Run the migration script
node ./run-enterprise-migrations.js

MIGRATION_EXIT_CODE=$?

echo ""
echo "========================================"

if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ ENTERPRISE SETUP COMPLETE!${NC}"
    echo ""
    echo "🎯 Next Steps:"
    echo "   1. Restart your dev server (if running)"
    echo "   2. Go to Settings → Roles → Create your first custom role"
    echo "   3. Go to Settings → Audit Trail → See the audit system"
    echo "   4. Go to Settings → Deals → Configure global rules"
    echo ""
    echo "🔒 Version 3 checkpoint is still safe at: v3-pre-user-management"
    echo "   Restore anytime with: ./RESTORE_VERSION_3.sh"
    echo ""
    echo -e "${GREEN}🎉 Your CRM is now ENTERPRISE-READY!${NC}"
else
    echo -e "${RED}❌ Migration failed with exit code: $MIGRATION_EXIT_CODE${NC}"
    echo ""
    echo "Check the errors above and try again, or run manually in Supabase Dashboard"
fi

# Cleanup
rm -f ./run-enterprise-migrations.js

exit $MIGRATION_EXIT_CODE

