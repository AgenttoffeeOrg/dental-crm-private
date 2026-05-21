/**
 * Next.js Instrumentation
 * Runs once on server startup
 * Used for Sentry and other monitoring setup
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side instrumentation
    // Temporarily disabled logger to fix startup issue
    // const { logger } = await import('./src/lib/logger')
    // logger.info('Server instrumentation initialized')
    console.log('Server instrumentation initialized')

    // Phase 2b.14: bootstrap the automation event listener so unified
    // events emitted from server code (e.g. ingestLead) actually reach
    // the automation engine in this Node process. Lazy-imported so the
    // service-role supabase client isn't pulled in until runtime.
    // Idempotent — safe across cold-starts.
    try {
      const { initializeAutomationEventListener } = await import(
        './src/lib/automations/automation-event-listener'
      )
      initializeAutomationEventListener()
    } catch (err) {
      console.error('[instrumentation] automation listener init failed (non-fatal):', err)
    }

    // Phase 2b.17: bootstrap stop-conditions listener (notes / calls /
    // patient replies → mark active automation_runs stopped).
    try {
      const { initializeStopConditionsListener } = await import(
        './src/lib/automations/stop-conditions'
      )
      initializeStopConditionsListener()
    } catch (err) {
      console.error('[instrumentation] stop-conditions init failed (non-fatal):', err)
    }

    // Phase 2b.18: bootstrap the always-on FAQ responder.
    try {
      const { initializeFaqResponder } = await import('./src/lib/automations/faq-responder')
      initializeFaqResponder()
    } catch (err) {
      console.error('[instrumentation] faq-responder init failed (non-fatal):', err)
    }

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

