/**
 * Marketing Audit Module - Custom Error Classes
 * 
 * Specialized error types for better error handling and debugging.
 */

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: string,
    public apiName?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public resetTime: Date,
    public apiName?: string
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class OAuthError extends Error {
  constructor(
    message: string,
    public code?: string,
    public description?: string
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}

export class AuditError extends Error {
  constructor(
    message: string,
    public auditId?: string,
    public phase?: string
  ) {
    super(message);
    this.name = 'AuditError';
  }
}

export class ConnectorError extends Error {
  constructor(
    message: string,
    public connectorName: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ConnectorError';
  }
}

