# 📊 Observability & Monitoring Strategy

**Generated:** October 14, 2025  
**Status:** Implementation Plan  
**Priority:** High

---

## 🎯 Objectives

1. **Error Tracking** - Catch and diagnose production errors
2. **Performance Monitoring** - Track page load times, API latency
3. **User Analytics** - Understand user behavior and pain points
4. **Structured Logging** - Searchable, filterable logs
5. **Alerting** - Proactive notification of issues

---

## 🛠️ Tools & Stack

### **1. Error Tracking: Sentry**

**Why Sentry:**
- Industry standard
- React + Next.js integration
- Source map support
- Release tracking
- User context capture
- PII redaction built-in

**Implementation:**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Configuration:**
```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENV || 'development',
  tracesSampleRate: 0.1, // 10% of transactions
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of errors
  
  beforeSend(event, hint) {
    // Redact PII
    if (event.user) {
      delete event.user.email
      delete event.user.ip_address
    }
    return event
  },
  
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
})
```

---

### **2. Structured Logging: Pino**

**Why Pino:**
- Fast JSON logging
- Log levels
- Child loggers
- Browser + Node.js support

**Implementation:**
```typescript
// src/lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  browser: {
    asObject: true,
  },
  redact: ['email', 'password', 'token', '*.email', '*.password'],
})

// Usage
logger.info({ userId: '123', action: 'contact_created' }, 'Contact created successfully')
logger.error({ err, userId: '123' }, 'Failed to create contact')
```

---

### **3. Performance Monitoring: Web Vitals**

**Built-in Next.js Support:**

```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

**Custom Web Vitals:**
```typescript
// src/lib/vitals.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals'

export function reportWebVitals() {
  onCLS(metric => console.log('CLS:', metric))
  onFID(metric => console.log('FID:', metric))
  onFCP(metric => console.log('FCP:', metric))
  onLCP(metric => console.log('LCP:', metric))
  onTTFB(metric => console.log('TTFB:', metric))
}
```

---

### **4. OpenTelemetry (Future)**

**For distributed tracing across services:**

```typescript
// src/lib/telemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
})

sdk.start()
```

---

## 📝 Logging Standards

### **Log Levels:**
- `fatal` - Application crash
- `error` - Error that needs attention
- `warn` - Warning, but recoverable
- `info` - Important business events
- `debug` - Development debugging
- `trace` - Verbose tracing

### **Log Structure:**
```typescript
interface LogEntry {
  timestamp: string
  level: 'info' | 'error' | 'warn' | 'debug'
  message: string
  context: {
    userId?: string
    tenantId?: string
    action: string
    resource?: string
    metadata?: Record<string, unknown>
  }
  error?: {
    name: string
    message: string
    stack?: string
  }
}
```

### **PII Redaction:**
Always redact:
- Email addresses
- Phone numbers
- IP addresses
- Passwords/tokens
- Credit card numbers
- SSN/Tax IDs

---

## 🚨 Alerting Strategy

### **Critical Alerts (Immediate Response):**
- Error rate > 5% (5 min window)
- API latency p95 > 2s (5 min window)
- Database connection failures
- Auth service down
- Email service failures

### **Warning Alerts (Next Business Day):**
- Error rate > 1% (15 min window)
- Slow query detected (> 5s)
- High memory usage (> 80%)
- Disk usage > 85%

### **Info Alerts (Weekly Digest):**
- New error types discovered
- Performance degradation trends
- Usage spikes

---

## 📊 Metrics to Track

### **Application Metrics:**
- Request rate (requests/min)
- Error rate (%)
- Response time (p50, p95, p99)
- Active users (concurrent)

### **Business Metrics:**
- Contacts created/day
- Deals moved/day
- Email verification rate
- Sign-up conversion rate
- Feature adoption rates

### **Infrastructure Metrics:**
- CPU usage (%)
- Memory usage (%)
- Database connections (active/max)
- Queue depth
- Cache hit rate

---

## 🔍 Trace Context Propagation

**Pass context through the stack:**

```typescript
// API Route
export async function POST(req: Request) {
  const traceId = req.headers.get('x-trace-id') || generateTraceId()
  
  logger.info({ traceId, endpoint: '/api/contacts' }, 'Request received')
  
  try {
    const result = await createContact(data, { traceId })
    return Response.json(result)
  } catch (err) {
    logger.error({ traceId, err }, 'Contact creation failed')
    Sentry.captureException(err, { tags: { traceId } })
    throw err
  }
}
```

---

## 🎭 Development vs Production

### **Development:**
- Console logging enabled
- Verbose log level (debug/trace)
- No sampling
- Source maps included

### **Production:**
- Structured JSON logs
- Info log level
- 10% trace sampling
- PII redacted
- Source maps uploaded to Sentry

---

## 🚀 Implementation Phases

### **Phase 1: Foundation (Week 1)**
- [ ] Install Sentry
- [ ] Add Pino structured logging
- [ ] Create logger utility
- [ ] Add error boundaries with Sentry capture
- [ ] Set up basic alerting

### **Phase 2: Metrics (Week 2)**
- [ ] Add Web Vitals tracking
- [ ] Implement custom metrics
- [ ] Create performance dashboard
- [ ] Set up monitoring dashboards

### **Phase 3: Advanced (Week 3+)**
- [ ] OpenTelemetry distributed tracing
- [ ] Custom instrumentation
- [ ] User session replay
- [ ] Advanced analytics

---

## 📚 Best Practices

### **DO:**
- ✅ Log all errors with context
- ✅ Use structured logging
- ✅ Redact PII automatically
- ✅ Include trace IDs
- ✅ Set up alerts for critical paths
- ✅ Monitor performance budgets

### **DON'T:**
- ❌ Log sensitive data
- ❌ Over-log (log spam)
- ❌ Ignore warnings
- ❌ Set alerts without runbooks
- ❌ Sample too aggressively in prod

---

## 🔗 Integration Points

### **Key Files to Update:**

1. **Error Boundaries:**
   ```typescript
   // src/components/ui/error-boundary.tsx
   import * as Sentry from '@sentry/nextjs'
   
   componentDidCatch(error, errorInfo) {
     Sentry.captureException(error, { contexts: { react: errorInfo } })
   }
   ```

2. **API Routes:**
   ```typescript
   // src/app/api/contacts/route.ts
   import { logger } from '@/lib/logger'
   
   export async function POST(req) {
     logger.info({ endpoint: '/api/contacts' }, 'Creating contact')
     // ...
   }
   ```

3. **Auth Hook:**
   ```typescript
   // src/lib/auth.tsx
   import { logger } from '@/lib/logger'
   
   const handleSignIn = async () => {
     logger.info({ action: 'sign_in_attempt' }, 'User attempting sign-in')
     // ...
   }
   ```

---

## 📈 Success Metrics

**We'll know observability is working when:**
- 🎯 Mean time to detection (MTTD) < 5 minutes
- 🎯 Mean time to resolution (MTTR) < 30 minutes
- 🎯 Error rate baseline established
- 🎯 Performance budgets met 95% of the time
- 🎯 Zero blind spots in critical paths

---

**Status:** Ready for implementation  
**Owner:** Development Team  
**Timeline:** 3 weeks for complete rollout

