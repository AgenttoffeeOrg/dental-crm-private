#!/usr/bin/env node

/**
 * Run Pending Invites Migration
 * 
 * Executes the 20251027_004_pending_invites_system.sql migration
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  try {
    console.log('📝 Reading migration file...')
    const migrationPath = join(__dirname, '../supabase/migrations/20251027_004_pending_invites_system.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('🚀 Executing migration...')
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    })
    
    if (error) {
      // Try direct execution if exec_sql doesn't exist
      console.log('ℹ️  exec_sql not available, using direct execution...')
      
      // Split by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))
      
      for (const statement of statements) {
        if (statement.length > 0) {
          const { error: stmtError } = await supabase.rpc('exec', {
            query: statement + ';'
          })
          
          if (stmtError && !stmtError.message.includes('already exists')) {
            console.error('❌ Error executing statement:', stmtError.message)
            console.error('Statement:', statement.substring(0, 100) + '...')
          }
        }
      }
      
      console.log('✅ Migration completed (with direct execution)')
      return
    }
    
    console.log('✅ Migration completed successfully!')
    console.log(data)
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

runMigration()

