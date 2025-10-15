/**
 * Performance Monitor
 * 
 * Track and log performance metrics for the Marketing Audit system.
 * Architecture: Lightweight monitoring, minimal overhead.
 */

export interface PerformanceMetric {
  name: string;
  duration_ms: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private metrics: Map<string, number> = new Map();
  private static instance: PerformanceMonitor;
  
  private constructor() {}
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * Start tracking a performance metric
   */
  start(name: string): void {
    this.metrics.set(name, Date.now());
  }
  
  /**
   * End tracking and log the metric
   */
  end(name: string, metadata?: Record<string, any>): PerformanceMetric | null {
    const startTime = this.metrics.get(name);
    if (!startTime) {
      console.warn(`[PerformanceMonitor] No start time found for: ${name}`);
      return null;
    }
    
    const duration = Date.now() - startTime;
    this.metrics.delete(name);
    
    const metric: PerformanceMetric = {
      name,
      duration_ms: duration,
      timestamp: new Date(),
      metadata,
    };
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${duration}ms`, metadata || '');
    }
    
    // In production, send to monitoring service (Sentry, DataDog, etc.)
    if (process.env.NODE_ENV === 'production' && duration > 5000) {
      console.warn(`[Performance] Slow operation: ${name} took ${duration}ms`);
    }
    
    return metric;
  }
  
  /**
   * Measure async function execution time
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name);
    try {
      const result = await fn();
      this.end(name, metadata);
      return result;
    } catch (error) {
      this.end(name, { ...metadata, error: true });
      throw error;
    }
  }
  
  /**
   * Track API call performance
   */
  trackAPICall(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number
  ): void {
    const metric: PerformanceMetric = {
      name: `api.${method}.${endpoint}`,
      duration_ms: duration,
      timestamp: new Date(),
      metadata: {
        endpoint,
        method,
        statusCode,
      },
    };
    
    // Log slow API calls
    if (duration > 2000) {
      console.warn(`[Performance] Slow API call: ${endpoint} took ${duration}ms`);
    }
    
    // Track failed calls
    if (statusCode >= 400) {
      console.error(`[Performance] Failed API call: ${endpoint} - ${statusCode}`);
    }
  }
  
  /**
   * Track database query performance
   */
  trackQuery(
    table: string,
    operation: string,
    duration: number,
    rowCount?: number
  ): void {
    const metric: PerformanceMetric = {
      name: `db.${operation}.${table}`,
      duration_ms: duration,
      timestamp: new Date(),
      metadata: {
        table,
        operation,
        rowCount,
      },
    };
    
    // Log slow queries
    if (duration > 1000) {
      console.warn(
        `[Performance] Slow query: ${operation} on ${table} took ${duration}ms`
      );
    }
  }
  
  /**
   * Get performance summary
   */
  getSummary(): {
    total_metrics: number;
    avg_duration: number;
    max_duration: number;
    slow_operations: Array<{ name: string; duration: number }>;
  } {
    // This would aggregate metrics from a store
    // For now, return placeholder
    return {
      total_metrics: 0,
      avg_duration: 0,
      max_duration: 0,
      slow_operations: [],
    };
  }
}

/**
 * Convenience function for performance monitoring
 */
export const perf = PerformanceMonitor.getInstance();

/**
 * Decorator for measuring method performance
 */
export function measured(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function (...args: any[]) {
    const monitor = PerformanceMonitor.getInstance();
    const name = `${target.constructor.name}.${propertyKey}`;
    
    monitor.start(name);
    try {
      const result = await originalMethod.apply(this, args);
      monitor.end(name);
      return result;
    } catch (error) {
      monitor.end(name, { error: true });
      throw error;
    }
  };
  
  return descriptor;
}

