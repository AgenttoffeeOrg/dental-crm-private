/**
 * Structured Logging for Integrations using Pino
 * 
 * Replaces console.log with structured, searchable logs
 * 
 * Features:
 * - JSON structured output
 * - Log levels (trace, debug, info, warn, error, fatal)
 * - Correlation ID tracking
 * - Performance metrics
 * - Production-ready formatting
 * 
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/integrations/logger'
 * 
 * logger.info({ integrationId: 'twilio_sms', messageId: 'SM123' }, 'SMS sent successfully')
 * logger.error({ err, correlationId }, 'Failed to process webhook')
 * ```
 */

import pino from 'pino'

// Create base logger
const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV === 'development' 
    ? {
        // Pretty print in development
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        // JSON in production
        formatters: {
          level: (label) => {
            return { level: label }
          },
        },
      }
  ),
})

/**
 * Integration Logger
 * 
 * Wraps Pino with integration-specific context
 */
export class IntegrationLogger {
  private logger: pino.Logger
  private defaultContext: Record<string, any>
  
  constructor(integrationType: string, context: Record<string, any> = {}) {
    this.logger = pinoLogger.child({
      integration_type: integrationType,
      ...context,
    })
    this.defaultContext = context
  }
  
  /**
   * Trace level (detailed debugging)
   */
  trace(context: Record<string, any>, message: string) {
    this.logger.trace({ ...this.defaultContext, ...context }, message)
  }
  
  /**
   * Debug level (development debugging)
   */
  debug(context: Record<string, any>, message: string) {
    this.logger.debug({ ...this.defaultContext, ...context }, message)
  }
  
  /**
   * Info level (normal operations)
   */
  info(context: Record<string, any>, message: string) {
    this.logger.info({ ...this.defaultContext, ...context }, message)
  }
  
  /**
   * Warn level (unexpected but handled)
   */
  warn(context: Record<string, any>, message: string) {
    this.logger.warn({ ...this.defaultContext, ...context }, message)
  }
  
  /**
   * Error level (errors that need attention)
   */
  error(context: Record<string, any> & { err?: Error }, message: string) {
    this.logger.error({ ...this.defaultContext, ...context }, message)
  }
  
  /**
   * Fatal level (critical errors, app might crash)
   */
  fatal(context: Record<string, any> & { err?: Error }, message: string) {
    this.logger.fatal({ ...this.defaultContext, ...context }, message)
  }
  
  /**
   * Create child logger with additional context
   */
  child(context: Record<string, any>): IntegrationLogger {
    const childLogger = new IntegrationLogger(this.defaultContext.integration_type, {
      ...this.defaultContext,
      ...context,
    })
    return childLogger
  }
}

/**
 * Create logger for a specific integration
 * 
 * @param integrationType - Type of integration (e.g., 'twilio_sms', 'meta_lead_ads')
 * @param correlationId - Optional correlation ID for request tracing
 * @returns Integration logger instance
 */
export function createIntegrationLogger(
  integrationType: string,
  correlationId?: string
): IntegrationLogger {
  return new IntegrationLogger(integrationType, {
    correlation_id: correlationId,
  })
}

/**
 * Log integration API call
 * 
 * @param integrationType - Integration type
 * @param operation - Operation name
 * @param correlationId - Correlation ID
 * @param context - Additional context
 */
export function logIntegrationCall(
  integrationType: string,
  operation: string,
  correlationId: string,
  context: Record<string, any> = {}
) {
  const logger = createIntegrationLogger(integrationType, correlationId)
  logger.info({ operation, ...context }, `Integration API call: ${operation}`)
}

/**
 * Log integration error
 * 
 * @param integrationType - Integration type
 * @param operation - Operation name
 * @param correlationId - Correlation ID
 * @param error - Error object
 * @param context - Additional context
 */
export function logIntegrationError(
  integrationType: string,
  operation: string,
  correlationId: string,
  error: Error,
  context: Record<string, any> = {}
) {
  const logger = createIntegrationLogger(integrationType, correlationId)
  logger.error({ err: error, operation, ...context }, `Integration error: ${error.message}`)
}

/**
 * Log webhook received
 */
export function logWebhookReceived(
  integrationType: string,
  correlationId: string,
  externalId: string,
  signatureVerified: boolean
) {
  const logger = createIntegrationLogger(integrationType, correlationId)
  logger.info(
    { external_id: externalId, signature_verified: signatureVerified },
    'Webhook received'
  )
}

/**
 * Log webhook processed
 */
export function logWebhookProcessed(
  integrationType: string,
  correlationId: string,
  externalId: string,
  resultEntityId: string,
  durationMs: number
) {
  const logger = createIntegrationLogger(integrationType, correlationId)
  logger.info(
    { 
      external_id: externalId,
      result_entity_id: resultEntityId,
      duration_ms: durationMs,
    },
    'Webhook processed successfully'
  )
}

// Export default logger for non-integration logs
export const logger = pinoLogger

