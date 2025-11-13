# Integrations & AI Workflows

## External Systems & Sync Directions

| Provider                                      | Direction        | Purpose & Notes                                                                                                                                                    |
| --------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Supabase Storage & Edge Functions             | Push/Pull        | Audio artifacts stored in Supabase buckets; edge function `process-call-activity` fetches signed URLs, transcribes, summarises, and writes AI artifacts + tasks.   |
| OpenAI (Whisper, GPT-4o-mini, GPT-4 Turbo)    | Push (API calls) | Transcription, call summarisation, AI suggestions, treatment tag extraction, daily briefings. Fallback responses ensure resilience when models fail.               |
| Twilio SMS                                    | Push             | SMS service initialises Twilio client and emits transactional/bulk messages from configured number with error handling.                                            |
| Resend Email                                  | Push             | Email service sends transactional emails (invites, onboarding, password reset, verification) with graceful degradation when API key absent.                        |
| Stripe Payments                               | Push             | Payment intent endpoint creates intents with automatic payment methods for dental service billing.                                                                 |
| PMS Integrations (generic adapter)            | Pull/Push        | Sync engine maps PMS patients/treatment plans/payments into CRM contacts, deals, and treatment plans with idempotent upserts, AI tag extraction, and routing logs. |
| Marketing APIs (Google, BrightLocal, Semrush) | Pull             | Feature flags + env keys configure marketing audit ingestion phases (phased enablement).                                                                           |
| Internal Automations                          | Push             | Events emitted to unified event bus after AI insights (deal aging, stage SLA, AI suggestions) trigger downstream automations.                                      |

## AI / LLM Usage Inventory

- `AIService` wraps OpenAI chat completions for call analysis, summaries, treatment extraction with schema validation and fallback payloads.
- `ai-context-builder` assembles rich context (deal intelligence, contact history, tasks, AI artifacts) before invoking models.
- Supabase Edge function performs full pipeline: fetch audio → Whisper → GPT summary → artifact inserts → auto-task creation → deal refresh.
- `ai-proactive-monitor` continuously scans deals for cold leads/high value/stage stagnation, emits events, and records suggestions.
- `conversation-analyzer` tags keywords, urgency, and treatment categories, calling extraction engine for tenant-specific treatment tags.
- AI tables (`ai_chat_sessions`, `ai_email_drafts`, `ai_usage_analytics`, `ai_suggestions`) persist prompts, outputs, cost metrics, and human feedback.

## Call & Chat AI Pipelines

1. **Recording ingestion:** Activity with audio file triggers Supabase Edge function.
2. **Transcription:** Edge function downloads signed audio URL and calls Whisper via OpenAI.
3. **Analysis:** GPT summarises call, classifies intent, extracts treatments/next actions.
4. **Persistence:** Inserts multiple `ai_artifacts`, updates activity metadata, creates auto-generated tasks, updates deals.
5. **Follow-up:** Summaries feed UI, automation engine, and dashboards; suggestions stored for review.
6. **Manual AI tooling:** Agents can call `/api/ai/summarize-call` or `/api/ai/transcribe-call` for targeted runs; failure returns actionable errors.

## Prompt Strategy, Observability & Fallbacks

- Prompts include explicit JSON schemas, taxonomy lists, and instructions for bullet summaries, due-hours windows, and treatment vocab.
- `ai_usage_analytics` records tokens, latency, helpfulness, and action outcomes for cost observability and quality tracking.
- Feature flags gate AI routing, suggestions, and treatment extraction per tenant/environment, allowing gradual rollouts + experimentation.
- Logging utilities redact sensitive fields (emails/tokens) before console output; AI service returns deterministic fallback responses if API failure occurs.

## Privacy & Safety

- Privacy DSR routines (`erase_contact_pii`) anonymize contact PII, redact notes, erase transcripts, and log tombstones while preserving business records.
- PMS sync respects tenant scoping and uses AI extraction constrained to tenant tag taxonomy to avoid cross-tenant leakage.
- Supabase RLS + service-role clients ensure AI functions run server-side with least privilege and rely on `tenant_id` checks before updates.
- Environment configuration keeps API keys in env variables with defaults disabled (marketing audit phases, communications, billing) to avoid accidental outbound traffic.

## Evidence

- supabase/functions/process-call-activity/index.ts:20-221
- src/app/api/ai/transcribe-call/route.ts:14-158
- src/app/api/ai/summarize-call/route.ts:15-166
- src/lib/ai.ts:18-226
- src/lib/ai-context-builder.ts:93-412
- src/lib/ai-proactive-monitor.ts:12-188
- src/lib/conversation-analyzer.ts:1-366
- supabase/sql/17_ai_assistant_tables.sql:7-88
- src/lib/openai-client.ts:16-35
- src/lib/treatment-routing/ai-extractor.ts:1-398
- src/lib/integrations/pms/sync-engine.ts:22-372
- src/lib/email-service.ts:1-215
- src/lib/sms-service.ts:1-49
- src/app/api/payments/create-intent/route.ts:1-51
- env.example:7-84
- supabase/migrations/20251016_hardening_012_privacy_dsr.sql:150-375
