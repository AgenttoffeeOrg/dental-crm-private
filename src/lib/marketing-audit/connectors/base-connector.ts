/**
 * Marketing Audit Module - Base API Connector
 * 
 * Abstract base class for all API connectors.
 * Provides common functionality: rate limiting, retry logic, error handling.
 */

import { rateLimiter } from '../utils/rate-limiter';
import { APIError, ConnectorError } from '../utils/errors';

export abstract class BaseAPIConnector {
  protected apiKey: string;
  protected baseUrl: string;
  
  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }
  
  /**
   * Make an HTTP request with rate limiting and error handling
   */
  protected async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Check rate limit before making request
    await rateLimiter.throttle(this.constructor.name);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        throw new APIError(
          `${this.constructor.name} API error: ${response.statusText}`,
          response.status,
          errorBody,
          this.constructor.name
        );
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new ConnectorError(
        `${this.constructor.name} request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.constructor.name,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Retry a function with exponential backoff
   */
  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    initialDelay = 1000
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error instanceof APIError && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
          throw error;
        }
        
        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          console.log(`[${this.constructor.name}] Retry attempt ${attempt + 1} after ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }
    
    throw new ConnectorError(
      `${this.constructor.name} failed after ${maxRetries} attempts`,
      this.constructor.name,
      lastError
    );
  }
  
  /**
   * Sleep for a given duration
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Log errors (override in subclasses for custom logging)
   */
  protected logError(error: Error, context?: any): void {
    console.error(`[${this.constructor.name} Error]`, {
      message: error.message,
      name: error.name,
      context,
    });
  }
  
  /**
   * Validate required configuration
   */
  protected validateConfig(): void {
    if (!this.apiKey) {
      throw new ConnectorError(
        `${this.constructor.name}: API key is required`,
        this.constructor.name
      );
    }
  }
}

