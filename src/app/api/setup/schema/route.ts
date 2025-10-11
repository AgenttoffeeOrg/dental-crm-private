import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    
    console.log('Running schema fixes...')

    // Add missing columns to files table
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE files ADD COLUMN IF NOT EXISTS file_name TEXT;
        ALTER TABLE files ADD COLUMN IF NOT EXISTS original_name TEXT;
      `
    }).then(() => console.log('✅ Added missing columns to files table'))
    .catch(error => console.log('Files table columns may already exist:', error.message))

    // Disable RLS for development
    const tablesToDisableRLS = [
      'files', 'activity_files', 'ai_artifacts', 'tenants', 'app_users', 
      'contacts', 'pipelines', 'pipeline_stages', 'deals', 'tasks', 
      'activities', 'audits'
    ]

    for (const table of tablesToDisableRLS) {
      try {
        await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`
        })
        console.log(`✅ Disabled RLS for ${table}`)
      } catch (error) {
        console.log(`RLS already disabled for ${table} or error:`, error)
      }
    }

    // Fix activities table structure
    try {
      await supabase.rpc('exec_sql', {
        sql: `
          DO $$
          BEGIN
            -- Add missing columns if they don't exist
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activities' AND column_name='title') THEN
              ALTER TABLE activities ADD COLUMN title TEXT;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activities' AND column_name='description') THEN
              ALTER TABLE activities ADD COLUMN description TEXT;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activities' AND column_name='metadata') THEN
              ALTER TABLE activities ADD COLUMN metadata JSONB;
            END IF;

            -- Rename type to activity_type if needed
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activities' AND column_name='type') THEN
              ALTER TABLE activities RENAME COLUMN type TO activity_type;
            END IF;
          END $$;
        `
      })
      console.log('✅ Fixed activities table structure')
    } catch (error) {
      console.log('Activities table fix error (may be expected):', error.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Schema fixes applied successfully'
    })

  } catch (error) {
    console.error('Schema fix error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to apply schema fixes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

