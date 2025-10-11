import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { activity_id } = await request.json()

    if (!activity_id) {
      return NextResponse.json(
        { error: 'Missing activity_id' },
        { status: 400 }
      )
    }

    console.log('Starting direct OpenAI processing for activity:', activity_id)

    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured')
      return NextResponse.json({
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env.local file.',
        details: 'Missing OPENAI_API_KEY environment variable'
      }, { status: 500 })
    }

    const supabase = createServiceClient()

    // 1. Get the activity and associated files
    const { data: activities, error: activityError } = await supabase
      .from('activities')
      .select(`
        *,
        activity_files (
          file_id,
          files (*)
        )
      `)
      .eq('id', activity_id)

    if (activityError) {
      console.error('Failed to fetch activity:', activityError)
      return NextResponse.json({
        error: 'Failed to fetch activity',
        details: activityError.message
      }, { status: 500 })
    }

    if (!activities || activities.length === 0) {
      return NextResponse.json({
        error: 'Activity not found',
        details: `No activity found with ID: ${activity_id}`
      }, { status: 404 })
    }

    const activity = activities[0]

    if (!activity.activity_files || activity.activity_files.length === 0) {
      console.error('No audio files found for activity:', activity_id)
      return NextResponse.json({
        error: 'No audio files found for this activity',
        details: 'Activity has no associated audio files'
      }, { status: 400 })
    }

    // 2. Get the first audio file
    const audioFile = activity.activity_files[0].files
    if (!audioFile || audioFile.kind !== 'audio') {
      return NextResponse.json({
        error: 'No audio file found',
        details: 'Activity does not have a valid audio file'
      }, { status: 400 })
    }

    console.log(`Processing audio file: ${audioFile.storage_path}`)

    // 3. Get signed URL for the audio file
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('audio')
      .createSignedUrl(audioFile.storage_path, 3600)

    if (urlError) {
      console.error('Failed to get signed URL:', urlError)
      return NextResponse.json({
        error: 'Failed to get audio file URL',
        details: urlError.message
      }, { status: 500 })
    }

    // 4. Download the audio file
    console.log('Downloading audio file...')
    const audioResponse = await fetch(signedUrlData.signedUrl)
    if (!audioResponse.ok) {
      console.error('Failed to download audio file:', audioResponse.status, audioResponse.statusText)
      return NextResponse.json({
        error: 'Failed to download audio file',
        details: `HTTP ${audioResponse.status}: ${audioResponse.statusText}`
      }, { status: 500 })
    }

    const audioBuffer = await audioResponse.arrayBuffer()
    console.log(`Downloaded audio file: ${audioBuffer.byteLength} bytes`)

    // 5. Transcribe audio using OpenAI Whisper
    console.log('Starting transcription with OpenAI Whisper...')
    
    try {
      // Create a File-like object for OpenAI
      const audioFileForAI = new File([audioBuffer], 'audio.mp3', { 
        type: audioFile.mime_type || 'audio/mpeg' 
      })

      const transcription = await openai.audio.transcriptions.create({
        file: audioFileForAI,
        model: 'whisper-1',
        language: 'en',
        response_format: 'text'
      })

      console.log('Transcription completed:', transcription.length, 'characters')

      // 6. Analyze with ChatGPT
      console.log('Analyzing transcription with ChatGPT...')
      
      const analysisPrompt = `
You are an expert AI analyst for a dental practice CRM system. Perform a comprehensive, intelligent analysis of this patient call transcript with the sophistication of a senior dental practice consultant.

Analyze the transcript understanding:
- Patient psychology and communication patterns
- Dental treatment complexities and patient education needs  
- Practice operations and workflow optimization
- Revenue opportunities and patient lifetime value
- Risk assessment and compliance considerations

TRANSCRIPT TO ANALYZE:
${transcription}

Provide comprehensive JSON analysis with these fields:

{
  "executive_summary": "Professional 2-3 sentence summary of key outcomes",
  "call_purpose": "Primary reason for call (inquiry/complaint/follow-up/emergency/etc)",
  "patient_profile": {
    "communication_style": "direct/hesitant/inquisitive/anxious/etc",
    "decision_making_pattern": "quick/deliberate/price-sensitive/research-oriented/etc",
    "education_level": "estimated based on communication",
    "financial_indicators": "budget concerns/payment mentions/insurance status/etc"
  },
  "treatments_discussed": [
    {
      "name": "specific treatment name",
      "interest_level": "high/medium/low", 
      "concerns": ["specific concerns"],
      "education_needed": ["what patient needs to understand"]
    }
  ],
  "conversation_quality": {
    "score": 8,
    "reasoning": "How well was the call handled by staff"
  },
  "patient_sentiment": {
    "overall": "positive/neutral/negative/mixed",
    "reasoning": "Detailed assessment of patient mood and satisfaction"
  },
  "pain_points": ["Specific frustrations, fears, or barriers identified"],
  "opportunity_assessment": {
    "revenue_potential": "high/medium/low with reasoning",
    "upsell_opportunities": ["additional services that could be offered"],
    "referral_likelihood": "high/medium/low with reasoning"
  },
  "risk_factors": ["Any red flags, compliance issues, or potential problems"],
  "communication_gaps": ["Areas needing patient education or clarification"],
  "immediate_actions": [
    {
      "title": "Critical task description",
      "due_hours": 2,
      "priority": "urgent/high/medium/low",
      "reasoning": "Why this is important"
    }
  ],
  "follow_up_strategy": {
    "timeline": "suggested engagement schedule",
    "approach": "how to best communicate with this patient",
    "key_messages": ["important points to emphasize"]
  },
  "treatment_planning": {
    "presentation_approach": "how to present treatment options",
    "patient_education_focus": "what patient most needs to understand",
    "decision_timeline": "when patient likely to decide"
  },
  "internal_notes": ["Important details for staff handoff and future reference"],
  "urgency_score": 7,
  "conversion_probability": {
    "score": 0.75,
    "reasoning": "Likelihood patient will proceed with treatment and why"
  },
  "estimated_value": "Potential revenue range based on treatments discussed",
  "recommended_staff": ["Which team members should be involved"],
  "confidence_score": 0.95
}

Be thorough, insightful, and actionable. Provide the level of analysis you'd give if briefing the practice owner.`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',  // Using GPT-4o (latest model)
        messages: [
          {
            role: 'system',
            content: 'You are a dental practice AI assistant specializing in analyzing patient consultation calls.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.2, // Lower for more consistent analysis
        max_tokens: 4000  // Much higher for comprehensive analysis
      })

      const analysisText = completion.choices[0]?.message?.content
      if (!analysisText) {
        throw new Error('No analysis received from OpenAI')
      }

      console.log('ChatGPT analysis completed')

      // Parse the JSON response
      let analysis
      try {
        // Remove markdown code blocks if present
        let cleanedResponse = analysisText.trim()
        if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
          cleanedResponse = cleanedResponse.slice(7, -3).trim()
        } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
          cleanedResponse = cleanedResponse.slice(3, -3).trim()
        }
        
        analysis = JSON.parse(cleanedResponse)
        console.log('Successfully parsed ChatGPT response:', analysis)
      } catch (parseError) {
        console.error('Failed to parse ChatGPT response as JSON:', analysisText)
        // Fallback: create a basic analysis
        analysis = {
          summary: analysisText.slice(0, 200) + '...',
          treatments: [],
          next_actions: [{ title: 'Review call transcript', due_hours: 24 }],
          patient_concerns: [],
          urgency_level: 3,
          confidence: 0.5
        }
      }

      // 7. Save comprehensive AI artifacts using existing allowed kinds
      console.log('Saving comprehensive AI artifacts to database...')
      
      const artifacts = [
        // Core transcript
        {
          tenant_id: activity.tenant_id,
          activity_id: activity_id,
          kind: 'transcript',
          data: { text: transcription },
          confidence: 1.0
        },
        // Executive summary (saved as 'summary')
        {
          tenant_id: activity.tenant_id,
          activity_id: activity_id,
          kind: 'summary',
          data: { 
            executive_summary: analysis.executive_summary,
            call_purpose: analysis.call_purpose,
            patient_profile: analysis.patient_profile || {},
            conversation_quality: analysis.conversation_quality || {},
            patient_sentiment: analysis.patient_sentiment || {},
            pain_points: analysis.pain_points || [],
            communication_gaps: analysis.communication_gaps || []
          },
          confidence: analysis.confidence_score || 0.9
        },
        // Treatment analysis (saved as 'treatments')
        {
          tenant_id: activity.tenant_id,
          activity_id: activity_id,
          kind: 'treatments',
          data: { 
            treatments_discussed: analysis.treatments_discussed || [],
            opportunity_assessment: analysis.opportunity_assessment || {}
          },
          confidence: analysis.confidence_score || 0.8
        },
        // Strategic insights (saved as 'intent')
        {
          tenant_id: activity.tenant_id,
          activity_id: activity_id,
          kind: 'intent',
          data: {
            risk_factors: analysis.risk_factors || [],
            follow_up_strategy: analysis.follow_up_strategy || {},
            treatment_planning: analysis.treatment_planning || {},
            internal_notes: analysis.internal_notes || [],
            urgency_score: analysis.urgency_score || 5,
            conversion_probability: analysis.conversion_probability || {},
            estimated_value: analysis.estimated_value || 'Unknown',
            recommended_staff: analysis.recommended_staff || []
          },
          confidence: analysis.confidence_score || 0.8
        },
        // Immediate actions (saved as 'actions')
        {
          tenant_id: activity.tenant_id,
          activity_id: activity_id,
          kind: 'actions',
          data: { 
            immediate_actions: analysis.immediate_actions || []
          },
          confidence: analysis.confidence_score || 0.8
        }
      ]

      const { error: artifactsError } = await supabase
        .from('ai_artifacts')
        .insert(artifacts)

      if (artifactsError) {
        console.error('Failed to save AI artifacts:', artifactsError)
        // Don't fail the whole process if we can't save artifacts
      }

      // 8. Create intelligent follow-up tasks
      if (analysis.immediate_actions && analysis.immediate_actions.length > 0) {
        console.log('Creating intelligent follow-up tasks...')
        
        const tasks = analysis.immediate_actions.map((action: any) => ({
          tenant_id: activity.tenant_id,
          contact_id: activity.contact_id,
          deal_id: activity.deal_id,
          title: action.title,
          description: `${action.reasoning || 'Auto-generated from comprehensive call analysis'}\n\nCall: ${activity.subject || 'Patient Call'}\nPriority: ${action.priority || 'medium'}\nAnalysis confidence: ${Math.round((analysis.confidence_score || 0.8) * 100)}%`,
          due_at: new Date(Date.now() + (action.due_hours || 24) * 60 * 60 * 1000).toISOString(),
          priority: action.priority === 'urgent' ? 'urgent' : 
                   action.priority === 'high' ? 'high' : 
                   action.priority === 'low' ? 'low' : 'normal',
          status: 'open',
          assignee_user_id: activity.agent_user_id,
          auto_created: true
        }))

        const { error: tasksError } = await supabase
          .from('tasks')
          .insert(tasks)

        if (tasksError) {
          console.error('Failed to create intelligent tasks:', tasksError)
          // Don't fail the whole process if we can't create tasks
        } else {
          console.log(`Successfully created ${tasks.length} intelligent tasks`)
        }
      }

      console.log('AI processing completed successfully')

      return NextResponse.json({
        success: true,
        data: {
          transcript: transcription,
          analysis: analysis,
          artifacts_saved: !artifactsError,
          tasks_created: analysis.next_actions?.length || 0
        }
      })

    } catch (openaiError) {
      console.error('OpenAI processing error:', openaiError)
      return NextResponse.json({
        error: 'OpenAI processing failed',
        details: openaiError instanceof Error ? openaiError.message : 'Unknown OpenAI error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Direct AI processing error:', error)
    return NextResponse.json({
      error: 'AI processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
