import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AICallSummary {
  summary_bullets: string[]
  intent: 'new_lead' | 'existing_patient' | 'complaint' | 'appointment_request' | 'treatment_enquiry'
  treatments: string[]
  confidence: number
  next_actions: {
    title: string
    due_hours: number
  }[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { activity_id } = await req.json()

    if (!activity_id) {
      throw new Error('activity_id is required')
    }

    console.log(`Processing call activity: ${activity_id}`)

    // 1. Get the activity and associated files
    const { data: activity, error: activityError } = await supabaseClient
      .from('activities')
      .select(`
        *,
        activity_files (
          file_id,
          files (*)
        )
      `)
      .eq('id', activity_id)
      .single()

    if (activityError) {
      throw new Error(`Failed to fetch activity: ${activityError.message}`)
    }

    if (!activity.activity_files || activity.activity_files.length === 0) {
      throw new Error('No audio files found for this activity')
    }

    // 2. Get the first audio file
    const audioFile = activity.activity_files[0].files
    if (!audioFile || audioFile.kind !== 'audio') {
      throw new Error('No audio file found')
    }

    console.log(`Processing audio file: ${audioFile.storage_path}`)

    // 3. Get signed URL for the audio file
    const { data: signedUrlData, error: urlError } = await supabaseClient.storage
      .from('audio')
      .createSignedUrl(audioFile.storage_path, 3600)

    if (urlError) {
      throw new Error(`Failed to get signed URL: ${urlError.message}`)
    }

    // 4. Download the audio file
    const audioResponse = await fetch(signedUrlData.signedUrl)
    if (!audioResponse.ok) {
      throw new Error('Failed to download audio file')
    }

    const audioBuffer = await audioResponse.arrayBuffer()

    // 5. Transcribe audio using OpenAI Whisper
    console.log('Starting transcription...')
    const transcript = await transcribeAudio(audioBuffer, audioFile.mime_type || 'audio/mpeg')

    if (!transcript) {
      throw new Error('Transcription failed or returned empty result')
    }

    console.log(`Transcription completed: ${transcript.substring(0, 100)}...`)

    // 6. Analyze the transcript using GPT
    console.log('Starting AI analysis...')
    const analysis = await analyzeCall(transcript)

    console.log('AI analysis completed:', analysis)

    // 7. Save AI artifacts to database
    const artifacts = [
      {
        activity_id,
        tenant_id: activity.tenant_id,
        kind: 'transcript',
        data: { transcript },
        confidence: 1.0,
      },
      {
        activity_id,
        tenant_id: activity.tenant_id,
        kind: 'summary',
        data: { summary_bullets: analysis.summary_bullets },
        confidence: analysis.confidence,
      },
      {
        activity_id,
        tenant_id: activity.tenant_id,
        kind: 'intent',
        data: { intent: analysis.intent },
        confidence: analysis.confidence,
      },
      {
        activity_id,
        tenant_id: activity.tenant_id,
        kind: 'treatments',
        data: { treatments: analysis.treatments },
        confidence: analysis.confidence,
      },
      {
        activity_id,
        tenant_id: activity.tenant_id,
        kind: 'actions',
        data: { next_actions: analysis.next_actions },
        confidence: analysis.confidence,
      },
    ]

    const { error: artifactsError } = await supabaseClient
      .from('ai_artifacts')
      .insert(artifacts)

    if (artifactsError) {
      throw new Error(`Failed to save AI artifacts: ${artifactsError.message}`)
    }

    // 8. Create auto-generated tasks from next actions
    const tasks = analysis.next_actions.map(action => ({
      tenant_id: activity.tenant_id,
      title: action.title,
      description: `Auto-generated from call analysis`,
      status: 'open',
      priority: 'normal',
      contact_id: activity.contact_id,
      deal_id: activity.deal_id,
      auto_created: true,
      due_at: new Date(Date.now() + action.due_hours * 60 * 60 * 1000).toISOString(),
    }))

    if (tasks.length > 0) {
      const { error: tasksError } = await supabaseClient
        .from('tasks')
        .insert(tasks)

      if (tasksError) {
        console.error('Failed to create auto tasks:', tasksError.message)
        // Don't throw here - tasks are nice-to-have
      } else {
        console.log(`Created ${tasks.length} auto-generated tasks`)
      }
    }

    // 9. Update deal last_activity_at if associated with a deal
    if (activity.deal_id) {
      const { error: dealError } = await supabaseClient
        .from('deals')
        .update({ 
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', activity.deal_id)

      if (dealError) {
        console.error('Failed to update deal:', dealError.message)
        // Don't throw - this is not critical
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Call activity processed successfully',
        data: {
          transcript: transcript.substring(0, 200) + '...',
          analysis,
          artifacts_created: artifacts.length,
          tasks_created: tasks.length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error processing call activity:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

/**
 * Transcribe audio using OpenAI Whisper API
 */
async function transcribeAudio(audioBuffer: ArrayBuffer, mimeType: string): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required')
  }

  // Create form data for the API request
  const formData = new FormData()
  const audioBlob = new Blob([audioBuffer], { type: mimeType })
  formData.append('file', audioBlob, 'audio.mp3')
  formData.append('model', 'whisper-1')
  formData.append('language', 'en')
  formData.append('response_format', 'text')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI Whisper API error: ${response.status} ${errorText}`)
  }

  const transcript = await response.text()
  return transcript.trim()
}

/**
 * Analyze call transcript using OpenAI GPT
 */
async function analyzeCall(transcript: string): Promise<AICallSummary> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required')
  }

  const systemPrompt = `You are an assistant for a dental CRM system. Your job is to analyze call transcripts and extract key information.

Instructions:
1. Summarize the call in 2-4 concise bullet points focusing on key discussion points
2. Classify the caller's intent from these options: new_lead, existing_patient, complaint, appointment_request, treatment_enquiry
3. Extract any dental treatments mentioned from this taxonomy: implants, invisalign, whitening, hygiene, emergency, root_canal, extraction, veneers, crowns, bridges, dentures, orthodontics, periodontics, endodontics, oral_surgery, cosmetic, preventive, restorative
4. Suggest up to 2 next actions with short, actionable titles and recommended due times in hours (1-168 hours)
5. Provide a confidence score (0.0-1.0) for your analysis

Return your response as valid JSON matching this exact structure:
{
  "summary_bullets": ["bullet 1", "bullet 2", "bullet 3"],
  "intent": "new_lead",
  "treatments": ["whitening", "hygiene"],
  "confidence": 0.85,
  "next_actions": [
    {"title": "Call back today", "due_hours": 4},
    {"title": "Send price list", "due_hours": 24}
  ]
}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this call transcript:\n\n${transcript}` },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI GPT API error: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  const content = result.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('No content returned from AI analysis')
  }

  try {
    const parsed = JSON.parse(content)
    
    // Validate the response structure
    if (!parsed.summary_bullets || !Array.isArray(parsed.summary_bullets)) {
      throw new Error('Invalid summary_bullets in AI response')
    }
    
    if (!parsed.intent) {
      throw new Error('Invalid intent in AI response')
    }
    
    if (!parsed.treatments || !Array.isArray(parsed.treatments)) {
      throw new Error('Invalid treatments in AI response')
    }
    
    if (typeof parsed.confidence !== 'number') {
      throw new Error('Invalid confidence in AI response')
    }
    
    if (!parsed.next_actions || !Array.isArray(parsed.next_actions)) {
      throw new Error('Invalid next_actions in AI response')
    }

    return parsed as AICallSummary
  } catch (parseError) {
    console.error('Failed to parse AI response:', content)
    
    // Return fallback response
    return {
      summary_bullets: ['Call analysis failed - manual review required'],
      intent: 'treatment_enquiry',
      treatments: [],
      confidence: 0.0,
      next_actions: [{ title: 'Review call manually', due_hours: 24 }],
    }
  }
}

/* To deploy this function, you'll need to:

1. Install Supabase CLI:
   npm install -g supabase

2. Initialize Supabase in your project:
   supabase init

3. Link to your project:
   supabase link --project-ref your-project-id

4. Deploy the function:
   supabase functions deploy process-call-activity

5. Set environment variables in Supabase dashboard:
   - OPENAI_API_KEY
   - Any other required variables

6. The function will be available at:
   https://your-project.supabase.co/functions/v1/process-call-activity
*/
