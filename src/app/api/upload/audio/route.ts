import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const activityId = formData.get('activityId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!activityId) {
      return NextResponse.json({ error: 'No activity ID provided' }, { status: 400 })
    }

    console.log('Server-side audio upload started:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      activityId
    })

    // For development, be more permissive with mime types (updated)
    const allowedTypes = [
      'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/aac',
      'audio/ogg', 'audio/webm', 'audio/flac', 'audio/x-wav',
      'application/octet-stream' // Allow for testing
    ]
    
    const hasValidType = allowedTypes.includes(file.type)
    const hasValidExtension = file.name.match(/\.(mp3|wav|m4a|aac|ogg|webm|flac)$/i)
    
    console.log('File validation:', { 
      fileType: file.type, 
      fileName: file.name,
      hasValidType, 
      hasValidExtension 
    })
    
    if (!hasValidType && !hasValidExtension) {
      return NextResponse.json({ 
        success: false, 
        error: `File type ${file.type} with name ${file.name} is not supported` 
      }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Generate file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${activityId}-${Date.now()}.${fileExt}`
    const filePath = `audio/${fileName}`

    // Override mime type for Supabase Storage based on file extension
    let mimeType = file.type
    if (file.type === 'application/octet-stream' || !file.type) {
      // Infer mime type from file extension
      const ext = fileExt?.toLowerCase()
      switch (ext) {
        case 'mp3': mimeType = 'audio/mpeg'; break
        case 'wav': mimeType = 'audio/wav'; break
        case 'm4a': mimeType = 'audio/mp4'; break
        case 'aac': mimeType = 'audio/aac'; break
        case 'ogg': mimeType = 'audio/ogg'; break
        case 'webm': mimeType = 'audio/webm'; break
        case 'flac': mimeType = 'audio/flac'; break
        default: mimeType = 'audio/mpeg' // Default fallback
      }
    }

    console.log('Using mime type for storage (updated):', mimeType)

    // Upload to Supabase Storage with corrected mime type
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: mimeType
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ 
        success: false, 
        error: uploadError.message 
      }, { status: 500 })
    }

    console.log('File uploaded to storage successfully:', uploadData.path)

    // Create file record in database using service role client
    const fileData = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      storage_path: uploadData.path,
      mime_type: mimeType, // Use corrected mime type
      size_bytes: file.size,
      kind: 'audio'
    }

    console.log('Creating file record in database:', fileData)

    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert(fileData)
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      // Clean up uploaded file
      await supabase.storage.from('audio').remove([uploadData.path])
      return NextResponse.json({ 
        success: false, 
        error: `Database error: ${dbError.message}` 
      }, { status: 500 })
    }

    console.log('File record created successfully:', fileRecord)

    // Link file to activity
    console.log('Linking file to activity:', { activityId, fileId: fileRecord.id })
    
    const { error: linkError } = await supabase
      .from('activity_files')
      .insert({
        activity_id: activityId,
        file_id: fileRecord.id
      })
    
    if (linkError) {
      console.error('Activity files link error:', {
        message: linkError.message,
        code: linkError.code,
        details: linkError.details,
        hint: linkError.hint,
        activityId,
        fileId: fileRecord.id
      })
      // Don't fail the whole upload if linking fails
      console.warn('File uploaded successfully but could not link to activity')
    } else {
      console.log('File linked to activity successfully')
    }

    return NextResponse.json({
      success: true,
      data: uploadData.path,
      fileId: fileRecord.id,
      message: 'Audio uploaded successfully'
    })

  } catch (error) {
    console.error('Server upload error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
