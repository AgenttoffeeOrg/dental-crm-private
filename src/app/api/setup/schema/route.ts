import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export async function POST() {
  try {
    const supabase = createServiceClient();

    console.log('Running schema fixes...');

    // Add missing columns to files table
    await supabase
      .rpc('exec_sql', {
        sql: `
        ALTER TABLE files ADD COLUMN IF NOT EXISTS file_name TEXT;
        ALTER TABLE files ADD COLUMN IF NOT EXISTS original_name TEXT;
      `,
      })
      .then(() => console.log('✅ Added missing columns to files table'))
      .catch((error) => console.log('Files table columns may already exist:', error.message));

    // Disable RLS for development
    const tablesToDisableRLS = [
      'files',
      'activity_files',
      'ai_artifacts',
      'tenants',
      'app_users',
      'contacts',
      'pipelines',
      'pipeline_stages',
      'deals',
      'tasks',
      'activities',
      'audits',
    ];

    for (const table of tablesToDisableRLS) {
      try {
        await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`,
        });
        console.log(`✅ Disabled RLS for ${table}`);
      } catch (error) {
        console.log(`RLS already disabled for ${table} or error:`, error);
      }
    }

    // Activities table structure: NO-OP.
    // Historic versions of this route renamed activities.type -> activity_type,
    // which is the OPPOSITE of what the live schema uses (canonical column is
    // `type`; see phase 0 reconciliation migration). Calling that rename today
    // would break every code path that writes activities. Block intentionally
    // emptied; live schema is the source of truth and is managed via
    // supabase/migrations/ going forward.
    console.log('⏭️  activities table fix: skipped (handled by phase 0 reconciliation migration)');

    return NextResponse.json({
      success: true,
      message: 'Schema fixes applied successfully',
    });
  } catch (error) {
    console.error('Schema fix error:', error);
    return NextResponse.json(
      {
        error: 'Failed to apply schema fixes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
