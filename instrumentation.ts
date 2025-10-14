/**
 * Next.js Instrumentation
 * Runs once on server startup
 * Used for Sentry and other monitoring setup
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side instrumentation
    const { logger } = await import('./src/lib/logger')
    logger.info('Server instrumentation initialized')
    
    // TODO: Initialize Sentry server SDK when DSN is provided
    // if (process.env.SENTRY_DSN) {
    //   const Sentry = await import('@sentry/nextjs')
    //   Sentry.init({ dsn: process.env.SENTRY_DSN })
    // }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime instrumentation
  }
}

