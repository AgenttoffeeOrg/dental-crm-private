#!/usr/bin/env node

/**
 * Run database migrations
 * Usage: node scripts/run-migration.js 14_add_pipeline_fields.sql
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
  console.error('   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration(filename) {
  try {
    const sqlPath = path.join(__dirname, '..', 'supabase', 'sql', filename)
    
    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ Migration file not found: ${sqlPath}`)
      process.exit(1)
    }

    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    console.log(`🔄 Running migration: ${filename}`)
    console.log(`📄 SQL file: ${sqlPath}`)
    console.log('')

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement) {
        console.log(`   Executing statement ${i + 1}/${statements.length}...`)
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
        
        if (error) {
          console.error(`   ❌ Error in statement ${i + 1}:`, error.message)
          // Continue with other statements
        } else {
          console.log(`   ✅ Statement ${i + 1} executed successfully`)
        }
      }
    }

    console.log('')
    console.log(`✅ Migration completed: ${filename}`)
    console.log('')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

// Get migration file from command line
const migrationFile = process.argv[2] || '14_add_pipeline_fields.sql'

runMigration(migrationFile)

