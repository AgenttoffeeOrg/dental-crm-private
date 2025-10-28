import { NextResponse } from 'next/server'

// Lazy-load storage service to avoid build-time initialization errors
async function getStorageService() {
  // Check if environment variables are available
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase credentials not configured')
  }
  
  const { storageService } = await import('@/lib/storage')
  return storageService
}

export async function POST(request: Request) {
  try {
    // Check environment first
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { 
          error: 'Test route unavailable',
          message: 'Supabase credentials not configured. This is a development/test route.'
        },
        { status: 503 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('Test upload started for file:', file.name)

    // Lazy-load storage service to avoid build-time errors
    const storageService = await getStorageService()

    // Test upload with a dummy activity ID
    const result = await storageService.uploadAudio(file, 'test-activity-id', {
      onProgress: (progress) => console.log(`Upload progress: ${progress}%`)
    })

    console.log('Test upload result:', result)

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Upload test successful' : 'Upload test failed',
      error: result.error,
      data: result.data
    })

  } catch (error) {
    console.error('Test upload error:', error)
    return NextResponse.json(
      { 
        error: 'Test upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

