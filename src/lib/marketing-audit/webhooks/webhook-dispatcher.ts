/**
 * Webhook Dispatcher
 * 
 * Phase 2: Send webhooks for audit events.
 * Architecture: Reliable delivery with retry logic.
 */

export interface WebhookEvent {
  event: string;
  timestamp: string;
  data: any;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
}

export class WebhookDispatcher {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second
  
  /**
   * Dispatch webhook to endpoint
   */
  async dispatch(
    endpoint: WebhookEndpoint,
    event: WebhookEvent
  ): Promise<{ success: boolean; error?: string }> {
    // Check if endpoint subscribes to this event
    if (!endpoint.events.includes(event.event)) {
      return { success: false, error: 'Endpoint not subscribed to this event' };
    }
    
    if (!endpoint.active) {
      return { success: false, error: 'Endpoint is inactive' };
    }
    
    // Generate signature for verification
    const signature = this.generateSignature(event, endpoint.secret);
    
    // Try delivery with retries
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event.event,
            'X-Webhook-Timestamp': event.timestamp,
            'User-Agent': 'DentalCRM-Webhook/1.0',
          },
          body: JSON.stringify(event.data),
        });
        
        if (response.ok) {
          console.log(`[Webhook] Delivered to ${endpoint.url}: ${event.event}`);
          return { success: true };
        }
        
        // If not 2xx, retry
        console.warn(`[Webhook] Attempt ${attempt + 1} failed: ${response.status}`);
        
        if (attempt < this.maxRetries - 1) {
          await this.sleep(this.retryDelay * Math.pow(2, attempt));
        }
      } catch (error: any) {
        console.error('[Webhook] Attempt', attempt + 1, 'error:', error.message);
        
        if (attempt < this.maxRetries - 1) {
          await this.sleep(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }
    
    return { success: false, error: 'Failed after max retries' };
  }
  
  /**
   * Dispatch event to all subscribed endpoints
   */
  async dispatchToAll(
    endpoints: WebhookEndpoint[],
    event: WebhookEvent
  ): Promise<{ delivered: number; failed: number }> {
    const results = await Promise.allSettled(
      endpoints.map(endpoint => this.dispatch(endpoint, event))
    );
    
    const delivered = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - delivered;
    
    return { delivered, failed };
  }
  
  /**
   * Generate HMAC signature for verification
   */
  private generateSignature(event: WebhookEvent, secret: string): string {
    // In production, use crypto.createHmac
    // For now, return placeholder
    const payload = JSON.stringify(event);
    return `sha256=${Buffer.from(payload + secret).toString('base64')}`;
  }
  
  /**
   * Sleep helper for retries
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Verify webhook signature (for receiving webhooks)
   */
  static verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    // In production, use crypto.timingSafeEqual
    const expected = `sha256=${Buffer.from(payload + secret).toString('base64')}`;
    return signature === expected;
  }
}

/**
 * Predefined webhook events
 */
export const WebhookEvents = {
  AUDIT_STARTED: 'audit.started',
  AUDIT_COMPLETED: 'audit.completed',
  AUDIT_FAILED: 'audit.failed',
  SCORE_REGRESSION: 'score.regression_detected',
  NEW_COMPETITOR: 'competitor.new_detected',
  RECOMMENDATION_CREATED: 'recommendation.created',
  TASK_CREATED: 'task.created_from_recommendation',
} as const;

