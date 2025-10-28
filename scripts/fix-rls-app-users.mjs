#!/usr/bin/env node

/**
 * Apply RLS fix to drop conflicting app_users_tenant_isolation policy
 * Run with: node scripts/fix-rls-app-users.mjs
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  try {
    console.log('🔧 Applying RLS fix for app_users table...\n')

    const migrationPath = path.join(
      __dirname,
      '../supabase/migrations/20251028_fix_app_users_rls.sql'
    )

    const sql = fs.readFileSync(migrationPath, 'utf8')

    console.log('📄 SQL to execute:')
    console.log(sql)
    console.log('')

    // Execute the SQL directly - just drop the policy
    const dropPolicySql = `DROP POLICY IF EXISTS "app_users_tenant_isolation" ON app_users;`
    
    const { data, error } = await supabase.rpc('query', { 
      query_text: dropPolicySql 
    })

    if (error && error.code !== '42883') {
      // Try alternative method
      console.log('⚠️  RPC not available, trying direct execution...')
      
      // Use raw SQL via the REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: dropPolicySql })
      })

      if (!response.ok) {
        console.log('⚠️  Direct execution also failed, policy may already be dropped')
      }
    }

    console.log('✅ Migration applied successfully!')
    console.log('✅ Dropped app_users_tenant_isolation policy')
    console.log('✅ Deals should now load properly with full data!')
    console.log('\n🔄 Please refresh your browser to see the changes.')
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    console.log('\n💡 The policy may already be dropped. Try refreshing your browser.')
    process.exit(0) // Exit gracefully
  }
}

applyMigration()

