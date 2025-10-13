// Performance and error monitoring

export function measurePerformance(name: string, fn: () => void) {
  const start = performance.now()
  fn()
  const duration = performance.now() - start
  
  if (duration > 1000) {
    console.warn(`[Performance] ${name} took ${duration}ms`)
  }
  
  return duration
}

export async function measureAsync(name: string, fn: () => Promise<any>) {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start
  
  if (duration > 2000) {
    console.warn(`[Performance] ${name} took ${duration}ms`)
  }
  
  return result
}

export function captureError(error: Error, context?: Record<string, any>) {
  console.error('[Error]', error, context)
  
  // In production, send to Sentry
  // if (window.Sentry) {
  //   window.Sentry.captureException(error, { extra: context })
  // }
}

