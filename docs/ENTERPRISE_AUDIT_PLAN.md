# 🏢 Enterprise Audit & Upgrade - Implementation Plan

**Generated:** October 14, 2025  
**Duration:** 4-6 weeks  
**Status:** Planning Complete - Ready for Implementation  
**Environment:** **LOCAL DEV ONLY** (No production changes without explicit approval)

---

## ⚠️ **CRITICAL: Development-Only Policy**

**ALL changes will be:**
- ✅ Developed and tested locally (`localhost:3000`)
- ✅ Committed to git with clear branch strategy
- ✅ Documented with before/after comparisons
- ✅ Reviewed and approved before any deployment
- ❌ **NEVER auto-deployed to production without explicit user approval**

---

## 📋 Phase 0: Foundation & Safety Net

### **Deliverables:**
1. ✅ Repo Map (`/docs/repo-map.md`) - COMPLETE
2. ✅ Observability Plan (`/docs/observability.md`) - COMPLETE
3. 🔄 Testing Infrastructure Setup - IN PROGRESS
4. 🔄 Baseline Non-Regression Suite - IN PROGRESS

### **Testing Infrastructure Tasks:**

```bash
# Install Playwright
npm install -D @playwright/test
npx playwright install

# Install Testing Library
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Install MSW for API mocking
npm install -D msw

# Add test scripts to package.json
{
  "scripts": {
    "test": "jest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:coverage": "jest --coverage"
  }
}
```

---

## 🐛 Phase 1: High-Impact Bug Fixes

### **A) Fix CreateContact Crash**

**Issue:** User-reported app crash when creating contacts

**Root Cause Analysis (Hypothesis):**
1. Missing null/undefined checks
2. No input validation
3. Database constraint violations not handled
4. No error boundary

**Implementation Plan:**

#### **1.1 Add Input Validation Schema**
```typescript
// src/schemas/contact.schema.ts
import { z } from 'zod'

export const ContactSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  tenant_id: z.string().uuid(),
})

export type ContactInput = z.infer<typeof ContactSchema>
```

#### **1.2 Add Error Boundary**
```typescript
// src/components/contacts/contact-form-error-boundary.tsx
'use client'

import { Component, ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'

export class ContactFormErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    Sentry.captureException(error, { contexts: { react: errorInfo } })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h3>Something went wrong</h3>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

#### **1.3 Add API Idempotency**
```typescript
// src/app/api/contacts/route.ts
export async function POST(req: Request) {
  const idempotencyKey = req.headers.get('x-idempotency-key')
  
  // Check if this request was already processed
  if (idempotencyKey) {
    const cached = await checkIdempotencyCache(idempotencyKey)
    if (cached) return Response.json(cached)
  }
  
  // Process request...
}
```

#### **1.4 Tests Required**
- ✅ Valid contact creation
- ✅ Invalid email format
- ✅ Missing required fields
- ✅ Duplicate contact (same email)
- ✅ Network retry on 5xx error
- ✅ UI doesn't crash on error

**Files to Modify:**
- `src/components/contacts/contact-form.tsx`
- `src/app/api/contacts/route.ts`
- `src/lib/supabase-client.ts` (add retry logic)

**PR Title:** `fix: Add error handling and validation to contact creation`

---

### **B) Fix VerifyEmail Not Sending**

**Issue:** Email verification emails are not being sent

**Root Cause Analysis:**

1. Check Resend API configuration
2. Check email service implementation
3. Check database token persistence
4. Check link generation

**Investigation Steps:**

#### **1. Debug Email Service**
```typescript
// src/lib/email-service.ts - Add detailed logging
async send(options) {
  logger.info({ to: options.to, subject: options.subject }, 'Attempting to send email')
  
  try {
    const result = await resend.emails.send(...)
    logger.info({ messageId: result.id }, 'Email sent successfully')
    return result
  } catch (err) {
    logger.error({ err, to: options.to }, 'Email send failed')
    throw err
  }
}
```

#### **2. Add Retry Mechanism**
```typescript
// src/lib/email-queue.ts (NEW)
import { Queue, Worker } from 'bullmq'

const emailQueue = new Queue('emails', {
  connection: redis,
})

export async function queueEmail(data: EmailData) {
  await emailQueue.add('send', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  })
}
```

#### **3. Add Email Status Tracking**
```sql
-- migration: add email_logs table
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  email_type VARCHAR(50) NOT NULL,
  to_email VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL, -- pending, sent, failed, bounced
  provider_id VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ
);
```

#### **4. Improve UX**
```typescript
// src/components/onboarding/email-verification-status.tsx
export function EmailVerificationStatus() {
  const [status, setStatus] = useState<'pending' | 'sent' | 'verified'>('pending')
  const [countdown, setCountdown] = useState(60) // Resend cooldown
  
  return (
    <div>
      {status === 'sent' && (
        <>
          <p>Verification email sent to {email}</p>
          <button disabled={countdown > 0} onClick={resend}>
            Resend {countdown > 0 ? `(${countdown}s)` : ''}
          </button>
        </>
      )}
    </div>
  )
}
```

**Files to Modify:**
- `src/lib/email-service.ts`
- `src/app/api/auth/verify/route.ts`
- `src/components/onboarding/email-verification-banner.tsx`

**PR Title:** `fix: Implement reliable email verification with retry and tracking`

---

### **C) Fix Pipeline Reordering**

**Issue:** "View All Pipelines" cannot sort/reorder boards

**Implementation Plan:**

#### **1. Create User Preferences Table**
```sql
-- migration: add user_pipeline_preferences
CREATE TABLE user_pipeline_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  pipeline_order JSONB DEFAULT '[]'::jsonb, -- [pipeline_id1, pipeline_id2, ...]
  last_selected_pipeline_id UUID,
  default_view VARCHAR(20) DEFAULT 'board', -- 'board' | 'list'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

#### **2. Add Drag-and-Drop Reordering**
```typescript
// src/components/pipeline/pipeline-list-view.tsx
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove } from '@dnd-kit/sortable'

export function PipelineListView() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  
  const handleDragEnd = async (event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    
    const oldIndex = pipelines.findIndex(p => p.id === active.id)
    const newIndex = pipelines.findIndex(p => p.id === over.id)
    
    const newOrder = arrayMove(pipelines, oldIndex, newIndex)
    setPipelines(newOrder)
    
    // Persist to database
    await savePipelineOrder(newOrder.map(p => p.id))
  }
  
  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={pipelines.map(p => p.id)}>
        {pipelines.map(pipeline => (
          <SortablePipelineCard key={pipeline.id} pipeline={pipeline} />
        ))}
      </SortableContext>
    </DndContext>
  )
}
```

#### **3. Keyboard Accessibility**
```typescript
// Add keyboard handlers
const handleKeyDown = (e: KeyboardEvent, index: number) => {
  if (e.key === 'ArrowUp' && index > 0) {
    // Move up
    const newOrder = arrayMove(pipelines, index, index - 1)
    setPipelines(newOrder)
  } else if (e.key === 'ArrowDown' && index < pipelines.length - 1) {
    // Move down
    const newOrder = arrayMove(pipelines, index, index + 1)
    setPipelines(newOrder)
  }
}
```

**Files to Modify:**
- `src/components/pipeline/pipeline-board.tsx`
- `src/app/api/pipelines/preferences/route.ts` (NEW)
- Database migration

**PR Title:** `feat: Add user-level pipeline reordering with persistence`

---

## ⚙️ Phase 2: Settings Registry

### **Implementation:**

#### **1. Create Settings Registry**
```typescript
// src/config/settings-registry.ts
export interface SettingDefinition {
  key: string
  label: string
  description: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'json'
  scope: 'org' | 'user' | 'system'
  category: string
  defaultValue: unknown
  validationSchema: z.ZodSchema
  required: boolean
  visible: boolean
  editable: boolean
}

export const SETTINGS_REGISTRY: Record<string, SettingDefinition> = {
  'email.provider': {
    key: 'email.provider',
    label: 'Email Provider',
    description: 'Email service provider for transactional emails',
    type: 'select',
    scope: 'org',
    category: 'Email Configuration',
    defaultValue: 'resend',
    validationSchema: z.enum(['resend', 'sendgrid', 'ses']),
    required: true,
    visible: true,
    editable: true,
  },
  'email.verification_ttl': {
    key: 'email.verification_ttl',
    label: 'Verification Link TTL',
    description: 'Time-to-live for email verification links (in hours)',
    type: 'number',
    scope: 'org',
    category: 'Email Configuration',
    defaultValue: 24,
    validationSchema: z.number().min(1).max(168),
    required: true,
    visible: true,
    editable: true,
  },
  // ... more settings
}
```

#### **2. Centralized Config Module**
```typescript
// src/config/index.ts
import { SETTINGS_REGISTRY } from './settings-registry'

export class ConfigService {
  private cache = new Map<string, unknown>()
  
  async get<T>(key: string, scope?: { userId?: string; tenantId?: string }): Promise<T> {
    // Check cache
    const cached = this.cache.get(key)
    if (cached !== undefined) return cached as T
    
    // Fetch from database
    const value = await this.fetchSetting(key, scope)
    
    // Validate against schema
    const definition = SETTINGS_REGISTRY[key]
    if (definition) {
      const validated = definition.validationSchema.parse(value ?? definition.defaultValue)
      this.cache.set(key, validated)
      return validated as T
    }
    
    return value as T
  }
  
  async set(key: string, value: unknown, scope?: { userId?: string; tenantId?: string }): Promise<void> {
    // Validate
    const definition = SETTINGS_REGISTRY[key]
    if (!definition?.editable) {
      throw new Error(`Setting ${key} is not editable`)
    }
    
    const validated = definition.validationSchema.parse(value)
    
    // Save to database
    await this.saveSetting(key, validated, scope)
    
    // Invalidate cache
    this.cache.delete(key)
  }
}

export const config = new ConfigService()
```

---

## 🔒 Phase 3: Enterprise Hardening

### **Security Checklist:**

- [ ] Add CSRF protection to all API routes
- [ ] Implement rate limiting (express-rate-limit or upstash-ratelimit)
- [ ] Add input sanitization (DOMPurify for HTML)
- [ ] Audit all permission checks
- [ ] Implement audit logging for privileged actions
- [ ] Add security headers (helmet or next-secure-headers)
- [ ] Rotate secrets regularly
- [ ] Implement IP whitelisting for admin actions

### **Performance Checklist:**

- [ ] Add database indexes on frequently queried columns
- [ ] Implement pagination on all list views
- [ ] Add React.lazy() for code splitting
- [ ] Virtualize long lists (react-window or @tanstack/virtual)
- [ ] Add loading skeletons
- [ ] Implement SWR or React Query for data fetching
- [ ] Add CDN for static assets
- [ ] Optimize images (next/image)

### **Accessibility Checklist:**

- [ ] Audit with axe DevTools
- [ ] Add focus management
- [ ] Ensure keyboard navigation on all interactive elements
- [ ] Add ARIA labels where needed
- [ ] Test with screen reader
- [ ] Ensure sufficient color contrast (4.5:1)
- [ ] Add skip links
- [ ] Make all modals trap focus

---

## 📚 Documentation Requirements

For each PR:
- [ ] README updates if public API changes
- [ ] Inline code comments for complex logic
- [ ] Migration guide if breaking changes
- [ ] Changelog entry
- [ ] Screenshots for UI changes

---

## ✅ Definition of Done

A task is complete when:
- ✅ Code passes linter (ESLint)
- ✅ Code passes type check (TypeScript strict mode)
- ✅ Unit tests written and passing (>80% coverage)
- ✅ Integration tests written and passing
- ✅ E2E test for critical path updated
- ✅ Accessibility audit passed
- ✅ Performance budget met
- ✅ Security review completed
- ✅ Documentation updated
- ✅ PR approved by 1+ reviewer
- ✅ Tested locally by developer
- ✅ **User approval before any production deployment**

---

## 🚦 Risk Mitigation

### **Low Risk Changes:**
- Documentation updates
- Adding new optional features behind flags
- Adding tests
- Adding logging/monitoring

### **Medium Risk Changes:**
- Refactoring existing code
- Adding validation
- UI updates
- Performance optimizations

### **High Risk Changes:**
- Database schema changes
- Authentication/authorization changes
- Payment processing changes
- Data migration

**For high-risk changes:**
- Create detailed RFC
- Get explicit user approval
- Implement feature flag
- Test on staging
- Gradual rollout

---

## 📊 Progress Tracking

### **Week 1:**
- [x] Repo map created
- [x] Observability plan created
- [ ] Testing infrastructure set up
- [ ] Baseline E2E suite created
- [ ] Phase 1A (CreateContact) started

### **Week 2:**
- [ ] Phase 1A complete
- [ ] Phase 1B (VerifyEmail) started
- [ ] Phase 1C (Pipeline reordering) started

### **Week 3:**
- [ ] Phase 1B complete
- [ ] Phase 1C complete
- [ ] Phase 2 (Settings registry) started

### **Week 4:**
- [ ] Phase 2 complete
- [ ] Phase 3 (Security) started

### **Week 5-6:**
- [ ] Phase 3 complete
- [ ] Documentation complete
- [ ] Final audit report

---

**Next Steps:**
1. Set up testing infrastructure
2. Create baseline E2E suite
3. Start Phase 1A: Fix CreateContact crash

**Status:** Ready to begin implementation  
**All work will be done locally with git commits**  
**No production deployment without explicit approval**

