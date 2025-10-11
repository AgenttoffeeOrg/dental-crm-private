# DentalCRM AI Edge Function Deployment Guide

## Overview

The `process-call-activity` Edge Function handles the complete AI workflow for processing call recordings:

1. **Audio Transcription** - Uses OpenAI Whisper API
2. **Content Analysis** - Uses GPT-4 for call analysis
3. **Data Extraction** - Extracts summary, intent, treatments, and next actions
4. **Task Creation** - Auto-creates follow-up tasks
5. **Database Updates** - Saves all AI artifacts and updates related records

## Prerequisites

1. **Supabase CLI installed:**
   ```bash
   npm install -g supabase
   ```

2. **OpenAI API Key** from [platform.openai.com](https://platform.openai.com/api-keys)

3. **Supabase project** with database schema deployed

## Deployment Steps

### 1. Initialize Supabase (if not already done)

```bash
# In your project root
supabase init
```

### 2. Link to your Supabase project

```bash
supabase link --project-ref YOUR_PROJECT_ID
```

### 3. Set Environment Variables

In your Supabase dashboard, go to **Settings → Edge Functions** and add:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. Deploy the Edge Function

```bash
supabase functions deploy process-call-activity
```

### 5. Test the Function

```bash
# Test with curl
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/process-call-activity' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"activity_id": "your-test-activity-id"}'
```

## Function Flow

### Input
```json
{
  "activity_id": "uuid-of-activity-with-audio-file"
}
```

### Process
1. Validates activity exists and has audio files
2. Downloads audio from Supabase Storage
3. Transcribes using OpenAI Whisper
4. Analyzes transcript using GPT-4 with structured prompt
5. Saves AI artifacts to database
6. Creates auto-generated tasks
7. Updates deal last_activity_at

### Output
```json
{
  "success": true,
  "message": "Call activity processed successfully",
  "data": {
    "transcript": "First 200 chars of transcript...",
    "analysis": {
      "summary_bullets": ["Key point 1", "Key point 2"],
      "intent": "new_lead",
      "treatments": ["whitening", "hygiene"],
      "confidence": 0.85,
      "next_actions": [
        {"title": "Call back today", "due_hours": 4}
      ]
    },
    "artifacts_created": 5,
    "tasks_created": 1
  }
}
```

## AI Prompt System

The function uses a carefully crafted system prompt that:

- **Summarizes** calls in 2-4 bullet points
- **Classifies intent** from predefined categories
- **Extracts treatments** from dental taxonomy
- **Suggests actions** with realistic timeframes
- **Provides confidence** scores for reliability

## Error Handling

The function includes comprehensive error handling:

- **Validation errors** - Missing activity_id, no audio files
- **Storage errors** - Failed to download audio
- **API errors** - OpenAI rate limits, invalid responses
- **Database errors** - Failed to save artifacts
- **Fallback responses** - Graceful degradation when AI fails

## Security

- Uses Supabase service role key for database access
- Validates activity ownership through tenant_id
- Creates signed URLs for secure audio access
- Sanitizes AI responses before database insertion

## Monitoring

Monitor function performance in:
- **Supabase Dashboard** → Functions → Logs
- **OpenAI Usage Dashboard** for API consumption
- **Database logs** for artifact creation

## Troubleshooting

### Common Issues

1. **"No audio files found"**
   - Ensure activity has linked files in activity_files table
   - Check file kind is 'audio'

2. **"OpenAI API error"**
   - Verify OPENAI_API_KEY is set correctly
   - Check API quota and billing status
   - Ensure audio file is supported format

3. **"Failed to save AI artifacts"**
   - Check database permissions
   - Verify tenant_id matches between activity and user

4. **"Transcription failed"**
   - Audio file may be corrupted
   - Unsupported audio format
   - File too large (>25MB for Whisper)

### Debug Steps

1. Check function logs in Supabase dashboard
2. Test with smaller audio files first
3. Verify environment variables are set
4. Test database connectivity separately

## Cost Optimization

- **Whisper API**: ~$0.006 per minute of audio
- **GPT-4 API**: ~$0.01-0.03 per call analysis
- **Storage**: Minimal cost for audio files
- **Edge Function**: Free tier covers most usage

## Future Enhancements

- Support for multiple languages
- Speaker identification
- Sentiment analysis
- Integration with calendar systems
- Real-time transcription for live calls
