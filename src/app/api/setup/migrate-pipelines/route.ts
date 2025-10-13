import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST() {
  try {
    const supabase = createServiceClient()

    // Read the migration SQL file
    const sqlPath = path.join(process.cwd(), 'supabase', 'sql', '14_add_pipeline_fields.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('Running pipeline migration...')

    // Execute the SQL directly
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_string: sql 
    })

    if (error) {
      // If the RPC doesn't exist, try executing statements one by one
      console.log('RPC method not available, trying individual statements...')
      
      // Split SQL into individual statements and execute
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))

      for (const statement of statements) {
        if (statement.includes('ALTER TABLE') || statement.includes('CREATE INDEX') || statement.includes('COMMENT ON')) {
          // These need to be executed via the Supabase SQL editor or CLI
          console.log('Statement needs manual execution:', statement.substring(0, 50))
        }
      }

      return NextResponse.json({
        success: false,
        message: 'Migration needs to be run manually via Supabase SQL editor',
        instructions: [
          '1. Go to your Supabase project dashboard',
          '2. Open the SQL Editor',
          '3. Copy the contents of supabase/sql/14_add_pipeline_fields.sql',
          '4. Paste and execute it',
          '',
          'Or run this command in your terminal:',
          'supabase db push',
          '',
          'Note: The system will work without this migration, but with limited features.',
          'Description and default pipeline features require this migration.'
        ]
      }, { status: 200 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Pipeline migration completed successfully'
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        instructions: [
          'To add description and is_default features to pipelines:',
          '1. Go to Supabase dashboard → SQL Editor',
          '2. Copy contents of supabase/sql/14_add_pipeline_fields.sql',
          '3. Execute the SQL',
          '',
          'The system works fine without this - it just won\'t have:',
          '- Pipeline descriptions',
          '- Default pipeline marking',
          '- updated_at tracking',
        ]
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    info: 'Pipeline Migration Endpoint',
    migration: '14_add_pipeline_fields.sql',
    purpose: 'Adds description, is_default, and updated_at columns to pipelines table',
    status: 'Ready to run',
    method: 'Send POST request to this endpoint to run migration',
    manual_instructions: [
      '1. Open Supabase Dashboard',
      '2. Go to SQL Editor',
      '3. Copy contents of supabase/sql/14_add_pipeline_fields.sql',
      '4. Execute',
    ],
    note: 'System works without this migration, but with limited pipeline features'
  })
}

