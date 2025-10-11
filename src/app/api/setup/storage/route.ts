import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    
    const results = {
      audioBucket: { success: false, message: '' },
      attachmentsBucket: { success: false, message: '' }
    }

    // Create audio bucket
    try {
      const { data: audioBucket, error: audioError } = await supabase.storage.createBucket('audio', {
        public: false,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: [
          'audio/mpeg', 
          'audio/wav', 
          'audio/mp3', 
          'audio/mp4', 
          'audio/m4a', 
          'audio/webm', 
          'audio/ogg'
        ]
      })

      if (audioError) {
        if (audioError.message.includes('already exists')) {
          results.audioBucket = { success: true, message: 'Already exists' }
        } else {
          results.audioBucket = { success: false, message: audioError.message }
        }
      } else {
        results.audioBucket = { success: true, message: 'Created successfully' }
      }
    } catch (error) {
      results.audioBucket = { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Create attachments bucket
    try {
      const { data: attachmentsBucket, error: attachmentsError } = await supabase.storage.createBucket('attachments', {
        public: false,
        fileSizeLimit: 104857600, // 100MB
      })

      if (attachmentsError) {
        if (attachmentsError.message.includes('already exists')) {
          results.attachmentsBucket = { success: true, message: 'Already exists' }
        } else {
          results.attachmentsBucket = { success: false, message: attachmentsError.message }
        }
      } else {
        results.attachmentsBucket = { success: true, message: 'Created successfully' }
      }
    } catch (error) {
      results.attachmentsBucket = { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Check if at least one bucket was created successfully
    const success = results.audioBucket.success || results.attachmentsBucket.success

    return NextResponse.json({
      success,
      results,
      message: success ? 'Storage setup completed' : 'Storage setup failed'
    })

  } catch (error) {
    console.error('Storage setup error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to setup storage',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

