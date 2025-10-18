/**
 * OpenAI Client - Lazy Initialization
 * 
 * Prevents build-time errors when OPENAI_API_KEY is not set.
 * Client is only created when actually needed (at request time).
 */

import OpenAI from 'openai'

let cachedClient: OpenAI | null = null

/**
 * Get OpenAI client instance
 * Lazy initialization - only creates client when first called
 */
export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not configured')
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  return cachedClient
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY
}

