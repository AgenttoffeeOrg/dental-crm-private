/**
 * Anthropic (Claude) client — lazy init.
 *
 * Pattern mirrors `lib/openai-client.ts` (we keep both: OpenAI for
 * Whisper / existing AI Assistant routes; Anthropic for the
 * automations AI surfaces from 2b.15 onwards — reply drafter,
 * pipeline router, FAQ responder).
 *
 * Default model is Claude Haiku 4.5 (`claude-haiku-4-5-20251001`):
 * fast, cheap, and good enough for short drafted patient replies,
 * intent classification, and FAQ matching. Callers can pass a
 * different model id if they need bigger reasoning (e.g.
 * `claude-sonnet-4-6` for the drafter at premium tiers).
 *
 * Build-time safety: the client is only constructed at request time,
 * so the missing env var on a build does not crash Next.js.
 */

import Anthropic from '@anthropic-ai/sdk'

export const DEFAULT_CLAUDE_MODEL = 'claude-haiku-4-5-20251001'

let cachedClient: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is not configured. Add it in Vercel project settings → Environment Variables (Production) for the automation AI features to work.'
    )
  }
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return cachedClient
}

export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

/**
 * Convenience: ask Claude a single user message with a system prompt,
 * return the assistant's text. Returns null on empty/blocked output.
 *
 * Use for the small text generation paths (reply drafter, FAQ
 * matcher). For tool-using or multi-turn agent work, call the SDK
 * directly.
 */
export async function claudeOneShot(options: {
  system: string
  user: string
  model?: string
  maxTokens?: number
  temperature?: number
}): Promise<string | null> {
  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: options.model ?? DEFAULT_CLAUDE_MODEL,
    max_tokens: options.maxTokens ?? 600,
    temperature: options.temperature ?? 0.4,
    system: options.system,
    messages: [{ role: 'user', content: options.user }],
  })

  const block = response.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') return null
  const text = block.text.trim()
  return text.length > 0 ? text : null
}
