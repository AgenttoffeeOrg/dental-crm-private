/**
 * Structured Logger
 * Pino-based logging with PII redaction
 */

import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  browser: { asObject: true },
  redact: {
    paths: ['email', 'password', 'token', '*.email', '*.password', '*.token', 'req.headers.authorization'],
    remove: true,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
})

export default logger

