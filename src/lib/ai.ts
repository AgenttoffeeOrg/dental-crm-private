import { z } from 'zod'
import type { AICallSummary } from '@/types/database'

// Zod schema for AI response validation
const AICallSummarySchema = z.object({
  summary_bullets: z.array(z.string()).min(1).max(5),
  intent: z.enum(['new_lead', 'existing_patient', 'complaint', 'appointment_request', 'treatment_enquiry']),
  treatments: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  next_actions: z.array(
    z.object({
      title: z.string(),
      due_hours: z.number().min(1).max(168), // Max 1 week
    })
  ).max(2),
})

export class AIService {
  private apiKey: string
  private baseUrl = 'https://api.openai.com/v1'

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required')
    }
    this.apiKey = process.env.OPENAI_API_KEY
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  async transcribeAudio(audioBuffer: ArrayBuffer, mimeType: string): Promise<string> {
    try {
      const formData = new FormData()
      const audioBlob = new Blob([audioBuffer], { type: mimeType })
      formData.append('file', audioBlob, 'audio.mp3')
      formData.append('model', 'whisper-1')
      formData.append('language', 'en')

      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`)
      }

      const result = await response.json()
      return result.text || ''
    } catch (error) {
      console.error('AIService.transcribeAudio error:', error)
      throw error
    }
  }

  /**
   * Analyze call transcript and extract summary, intent, treatments, and next actions
   */
  async analyzeCall(transcript: string): Promise<AICallSummary> {
    try {
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

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
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
        throw new Error(`AI analysis failed: ${response.statusText}`)
      }

      const result = await response.json()
      const content = result.choices?.[0]?.message?.content

      if (!content) {
        throw new Error('No content returned from AI analysis')
      }

      // Parse and validate the JSON response
      const parsed = JSON.parse(content)
      const validated = AICallSummarySchema.parse(parsed)

      return validated
    } catch (error) {
      console.error('AIService.analyzeCall error:', error)
      
      // Return a fallback response if AI analysis fails
      return {
        summary_bullets: ['Call analysis failed - manual review required'],
        intent: 'treatment_enquiry',
        treatments: [],
        confidence: 0.0,
        next_actions: [{ title: 'Review call manually', due_hours: 24 }],
      }
    }
  }

  /**
   * Generate a summary for any text content
   */
  async generateSummary(content: string, maxBullets = 3): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Summarize the following content in ${maxBullets} concise bullet points. Focus on key information and actionable items.`,
            },
            { role: 'user', content },
          ],
          temperature: 0.3,
          max_tokens: 300,
        }),
      })

      if (!response.ok) {
        throw new Error(`Summary generation failed: ${response.statusText}`)
      }

      const result = await response.json()
      const summary = result.choices?.[0]?.message?.content || ''

      // Split into bullet points and clean up
      return summary
        .split('\n')
        .filter((line: string) => line.trim().length > 0)
        .map((line: string) => line.replace(/^[•\-\*]\s*/, '').trim())
        .slice(0, maxBullets)
    } catch (error) {
      console.error('AIService.generateSummary error:', error)
      return ['Summary generation failed - manual review required']
    }
  }

  /**
   * Extract treatments from text content
   */
  async extractTreatments(content: string): Promise<string[]> {
    const treatmentTaxonomy = [
      'implants', 'invisalign', 'whitening', 'hygiene', 'emergency',
      'root_canal', 'extraction', 'veneers', 'crowns', 'bridges',
      'dentures', 'orthodontics', 'periodontics', 'endodontics',
      'oral_surgery', 'cosmetic', 'preventive', 'restorative'
    ]

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Extract dental treatments mentioned in the text. Only return treatments from this exact list: ${treatmentTaxonomy.join(', ')}. Return as a JSON array of strings.`,
            },
            { role: 'user', content },
          ],
          temperature: 0.1,
          max_tokens: 200,
        }),
      })

      if (!response.ok) {
        throw new Error(`Treatment extraction failed: ${response.statusText}`)
      }

      const result = await response.json()
      const content_response = result.choices?.[0]?.message?.content || '[]'
      
      const treatments = JSON.parse(content_response)
      return Array.isArray(treatments) ? treatments : []
    } catch (error) {
      console.error('AIService.extractTreatments error:', error)
      return []
    }
  }
}

// Export singleton instance
export const aiService = new AIService()
