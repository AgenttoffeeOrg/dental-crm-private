// Setup script to create Supabase storage buckets
// Run this in your browser console or as a Node.js script

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createStorageBuckets() {
  try {
    console.log('Creating storage buckets...')

    // Create audio bucket
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

    if (audioError && !audioError.message.includes('already exists')) {
      console.error('Error creating audio bucket:', audioError)
    } else {
      console.log('✅ Audio bucket created successfully')
    }

    // Create attachments bucket
    const { data: attachmentsBucket, error: attachmentsError } = await supabase.storage.createBucket('attachments', {
      public: false,
      fileSizeLimit: 104857600, // 100MB
    })

    if (attachmentsError && !attachmentsError.message.includes('already exists')) {
      console.error('Error creating attachments bucket:', attachmentsError)
    } else {
      console.log('✅ Attachments bucket created successfully')
    }

    console.log('Storage setup complete!')

  } catch (error) {
    console.error('Error setting up storage:', error)
  }
}

// Run the setup
createStorageBuckets()

export { createStorageBuckets }

