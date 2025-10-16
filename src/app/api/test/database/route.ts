import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    
    console.log('Testing database insert...')

    // Test if we can insert into files table
    const testFileData = {
      tenant_id: process.env.TEST_TENANT_ID || (await getFirstTenantId()),
      storage_path: 'audio/test-123.mp3',
      mime_type: 'audio/mpeg',
      size_bytes: 1024,
      kind: 'audio'
    }

    console.log('Attempting to insert test file record:', testFileData)

    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert(testFileData)
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', {
        message: dbError.message,
        code: dbError.code,
        details: dbError.details,
        hint: dbError.hint
      })
      return NextResponse.json({
        success: false,
        error: dbError.message,
        details: dbError
      })
    }

    console.log('Successfully inserted file record:', fileRecord)

    // Clean up test record
    if (fileRecord) {
      await supabase.from('files').delete().eq('id', fileRecord.id)
      console.log('Cleaned up test record')
    }

    return NextResponse.json({
      success: true,
      message: 'Database test passed',
      fileRecord
    })

  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json(
      { 
        error: 'Database test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
