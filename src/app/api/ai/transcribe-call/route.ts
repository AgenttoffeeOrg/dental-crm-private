import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * CALL TRANSCRIPTION ENDPOINT (OpenAI Whisper)
 * 
 * This endpoint transcribes call recordings using OpenAI's Whisper API
 * Can be triggered manually or automatically after a call completes
 * 
 * POST /api/ai/transcribe-call
 * Body: { activity_id, recording_url, tenant_id }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { activity_id, recording_url, tenant_id } = body

    if (!activity_id || !recording_url || !tenant_id) {
      return NextResponse.json(
        { error: 'Missing required fields: activity_id, recording_url, tenant_id' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 1. Load activity
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', activity_id)
      .single()

    if (activityError || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    console.log(`[TRANSCRIBE] Starting transcription for activity ${activity_id}`)
    console.log(`[TRANSCRIBE] Recording URL: ${recording_url}`)

    // 2. TRANSCRIBE USING WHISPER API
    // TODO: Integrate OpenAI Whisper API
    let transcript = ''
    
    try {
      // Example Whisper API integration:
      // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      // const audioResponse = await fetch(recording_url)
      // const audioBlob = await audioResponse.blob()
      // const audioFile = new File([audioBlob], 'recording.mp3', { type: 'audio/mpeg' })
      // 
      // const transcription = await openai.audio.transcriptions.create({
      //   file: audioFile,
      //   model: 'whisper-1',
      //   language: 'en', // or auto-detect
      //   response_format: 'verbose_json', // includes timestamps
      //   timestamp_granularities: ['segment']
      // })
      // 
      // transcript = transcription.text
      
      // MOCK TRANSCRIPT (replace with real Whisper API)
      transcript = `[Simulated Transcript]

Agent: Hi, this is calling from the dental practice. How can I help you today?

Patient: Hi, I'm interested in getting information about orthodontic treatment.

Agent: Absolutely! We offer several orthodontic options including traditional braces and Invisalign. Have you had a consultation before?

Patient: No, this would be my first time. I'm concerned about the cost though.

Agent: I understand. Our prices typically range from $3,000 to $5,000 depending on the treatment plan. We also offer flexible payment plans to make it more affordable.

Patient: That's helpful. Can I schedule a consultation?

Agent: Of course! Let me check our calendar. Are you available next week?

Patient: Yes, Tuesday or Thursday would work best for me.

Agent: Perfect! I'll get you scheduled for Thursday at 2 PM. You'll receive a confirmation email shortly.

Patient: Great, thank you!

Agent: You're welcome! See you Thursday!`
      
      console.log(`[TRANSCRIBE] Generated transcript: ${transcript.substring(0, 100)}...`)

    } catch (transcriptionError) {
      console.error('[TRANSCRIBE] Whisper API error:', transcriptionError)
      return NextResponse.json(
        { error: 'Transcription failed', details: transcriptionError },
        { status: 500 }
      )
    }

    // 3. Store transcript in ai_artifacts table
    const { data: artifact, error: artifactError } = await supabase
      .from('ai_artifacts')
      .insert({
        tenant_id,
        contact_id: activity.contact_id,
        activity_id,
        kind: 'transcript',
        content: transcript,
        metadata: {
          word_count: transcript.split(' ').length,
          duration: activity.duration_seconds,
          language: 'en',
          model: 'whisper-1'
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (artifactError) {
      console.error('[TRANSCRIBE] Error storing transcript:', artifactError)
      return NextResponse.json(
        { error: 'Transcription succeeded but failed to store', details: artifactError },
        { status: 500 }
      )
    }

    console.log(`[TRANSCRIBE] ✅ Transcript stored as artifact ${artifact.id}`)

    // 4. Trigger summarization
    console.log(`[TRANSCRIBE] Triggering AI summarization...`)
    
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/summarize-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id,
          transcript,
          tenant_id
        })
      })
    } catch (summaryError) {
      console.error('[TRANSCRIBE] Failed to trigger summary:', summaryError)
      // Non-fatal, transcription still succeeded
    }

    return NextResponse.json({
      success: true,
      transcript_artifact_id: artifact.id,
      transcript_length: transcript.length,
      word_count: transcript.split(' ').length,
      message: 'Call transcribed successfully!'
    })

  } catch (error: unknown) {
    console.error('[TRANSCRIBE] Error:', error)
    return NextResponse.json(
      { error: 'Transcription failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}


