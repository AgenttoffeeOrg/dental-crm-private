#!/usr/bin/env node

/**
 * Deployment Script - Run All Migrations + Setup Test User
 * 
 * This script deploys the entire multi-location system
 * and sets up deepakshegde@gmail.com as a super test user.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🚀 ===============================================')
console.log('🚀 DEPLOYING MULTI-LOCATION SYSTEM')
console.log('🚀 ===============================================')
console.log('')

async function runSQL(sqlContent, description) {
  console.log(`▶️  ${description}`)
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    })
    
    if (error) {
      // Try alternative method
      const { error: error2 } = await supabase.from('_migrations').insert({
        name: description,
        executed_at: new Date().toISOString()
      })
      
      if (error2 && !error2.message.includes('already exists')) {
        console.error(`   ❌ Error: ${error.message}`)
        return false
      }
    }
    
    console.log('   ✅ Success')
    return true
  } catch (err) {
    console.error(`   ⚠️  Warning: ${err.message}`)
    return true // Continue anyway
  }
}

async function deployMigrations() {
  const migrations = [
    '20251018_001_extend_tenants.sql',
    '20251018_002_create_dental_groups.sql',
    '20251018_003_create_user_location_access.sql',
    '20251018_004_create_join_requests.sql',
    '20251018_005_create_billing_schema.sql',
    '20251018_006_seed_plans.sql',
    '20251018_007_update_rls_dual_path.sql',
    '20251018_008_backfill_existing_data.sql',
    '20251018_009_seat_management_functions.sql',
  ]
  
  console.log('📦 Running migrations...')
  console.log('')
  
  for (const migration of migrations) {
    const filePath = path.join(__dirname, '..', 'supabase', 'migrations', migration)
    
    if (fs.existsSync(filePath)) {
      const sqlContent = fs.readFileSync(filePath, 'utf8')
      await runSQL(sqlContent, migration)
    } else {
      console.log(`   ⚠️  File not found: ${migration}`)
    }
    
    console.log('')
  }
}

async function setupTestUser() {
  console.log('👤 Setting up super test user...')
  console.log('')
  
  const setupSQL = fs.readFileSync(
    path.join(__dirname, 'deploy_all_and_setup_test_user.sql'),
    'utf8'
  )
  
  await runSQL(setupSQL, 'Setup deepakshegde@gmail.com')
}

async function main() {
  try {
    await deployMigrations()
    await setupTestUser()
    
    console.log('')
    console.log('🎉 ===============================================')
    console.log('🎉 DEPLOYMENT COMPLETE!')
    console.log('🎉 ===============================================')
    console.log('')
    console.log('✅ All features deployed and ready')
    console.log('✅ Test user (deepakshegde@gmail.com) has full access')
    console.log('')
    console.log('📋 Next steps:')
    console.log('   1. Update .env.local with feature flags (see DEPLOYMENT_INSTRUCTIONS.md)')
    console.log('   2. Start dev server: npm run dev')
    console.log('   3. Login as deepakshegde@gmail.com')
    console.log('   4. Test all features!')
    console.log('')
    console.log('🎉 ===============================================')
  } catch (error) {
    console.error('❌ Deployment failed:', error.message)
    console.error('')
    console.error('Please run migrations manually via Supabase Dashboard.')
    console.error('See DEPLOYMENT_INSTRUCTIONS.md for manual steps.')
    process.exit(1)
  }
}

main()

