# 🗺️ Repository Architecture Map

**Generated:** October 14, 2025  
**CRM Version:** 1.0.0  
**Stack:** Next.js 15.5.4 + React 19 + Supabase + TypeScript

---

## 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  Next.js App Router + React 19 + TailwindCSS 4                 │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTP/HTTPS
┌───────────────────────┴─────────────────────────────────────────┐
│                   NEXT.JS SERVER (Middleware)                    │
│  - Route protection (middleware.ts)                             │
│  - API Routes (/api/*)                                          │
│  - Server Components                                            │
└───────────────────────┬─────────────────────────────────────────┘
                        │ Supabase Client SDK
┌───────────────────────┴─────────────────────────────────────────┐
│                    SUPABASE (Backend as a Service)              │
│  - PostgreSQL Database                                          │
│  - Authentication (Row Level Security)                          │
│  - Real-time subscriptions                                      │
│  - Edge Functions (if any)                                      │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│  - Resend (Email)                                               │
│  - OpenAI (AI Features)                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Module Boundaries

### **1. Authentication & Authorization**
**Location:** `src/lib/auth.tsx`, `src/app/(auth)/`

**Components:**
- `AuthProvider` - Global auth context
- `useAuth()` - Auth hook for components
- Sign-in page (`/sign-in`)
- Sign-up page (`/sign-up`)
- Password reset flow

**Database Tables:**
- `auth.users` (Supabase managed)
- `app_users` (CRM user profiles)
- `tenants` (Multi-tenancy)

**Current Issues:**
- ⚠️ No email verification banner (file exists but not deployed)
- ⚠️ Session state can get stuck in loading
- ⚠️ No refresh token rotation
- ⚠️ Missing RBAC enforcement in some routes

---

### **2. Core CRM Modules**

#### **2.1 Contacts** (`src/components/contacts/`, `/contacts`)
- Contact CRUD operations
- Search and filtering
- Import/Export capabilities
- **Known Issue:** CreateContact can crash (user-reported)

#### **2.2 Pipeline/Deals** (`src/components/pipeline/`, `/pipeline`)
- Kanban board view (drag-and-drop via @dnd-kit)
- Multiple pipelines support
- Deal stages and progression
- **Known Issue:** "View All Pipelines" cannot sort/reorder boards (user-reported)

#### **2.3 Tasks** (`src/components/tasks/`, `/tasks`)
- Task management
- Assignment and due dates
- Status tracking

#### **2.4 Marketing** (`src/app/marketing/`, `src/components/marketing/`)
- Campaign management
- Email templates
- Social media integration
- Analytics

#### **2.5 Forms** (`src/app/forms/`)
- Dynamic form builder
- Lead capture
- Submissions tracking

#### **2.6 Analytics** (`src/app/analytics/`)
- Dashboard metrics
- Revenue tracking
- Conversion funnels
- Deal velocity

---

### **3. Settings Module** (`src/app/settings/`)

**Current Tabs (23 total):**
1. General
2. Organization
3. Team & Users
4. Roles & Permissions
5. Billing & Subscription
6. Integrations
7. Email Configuration
8. Notifications
9. Security
10. Data & Privacy
11. Pipelines & Stages
12. Custom Fields
13. Automation Rules
14. Templates
15. Forms Configuration
16. Marketing Settings
17. API Keys
18. Webhooks
19. Import/Export
20. Audit Log
21. Appearance
22. Localization
23. Advanced

**Current Issues:**
- ⚠️ No centralized settings registry
- ⚠️ Hard-coded defaults scattered across codebase
- ⚠️ No validation schemas for settings
- ⚠️ Settings changes not always reflected without page reload

---

### **4. Email Subsystem**

**Location:** `src/lib/email-service.ts`, `src/api/email/`

**Provider:** Resend API

**Current Issues:**
- ⚠️ **VerifyEmail sends no verification email** (user-reported)
- ⚠️ No retry mechanism for failed sends
- ⚠️ No queue system (direct API calls)
- ⚠️ Hard-coded email templates
- ⚠️ No email preview in Settings
- ⚠️ No rate limiting or throttling

**Email Types:**
- Verification emails
- Password reset
- Notifications
- Campaign emails

---

### **5. Database Schema**

**Core Tables:**
- `app_users` - User profiles
- `tenants` - Organizations
- `contacts` - CRM contacts
- `deals` - Pipeline deals
- `tasks` - Task management
- `pipelines` - Pipeline configurations
- `stages` - Deal stages
- `campaigns` - Marketing campaigns
- `email_templates` - Email templates
- `forms` - Form definitions
- `form_submissions` - Form responses
- `integrations` - External integrations
- `settings` - Application settings
- `audit_logs` - Activity tracking

**Issues:**
- ⚠️ Missing indexes on frequently queried columns
- ⚠️ No user_pipeline_preferences table (needed for sorting)
- ⚠️ Some tables lack proper constraints
- ⚠️ No data retention policies

---

### **6. External Integrations**

**Current Integrations:**
- ✅ Resend (Email)
- ✅ OpenAI (AI features)
- ⚠️ PMS Systems (partially implemented)
- ⚠️ Social Media APIs (basic implementation)

**Integration Architecture:**
- Location: `src/lib/integrations/`
- No standardized integration interface
- Hard-coded API keys (should be in settings)
- No webhook handling infrastructure

---

## 🔐 Security & Authentication Flow

### **Current Auth Flow:**

```
1. User visits protected route
   ↓
2. Middleware checks session (middleware.ts)
   ↓
3. If no session → redirect to /sign-in
   ↓
4. User signs in → Supabase Auth
   ↓
5. Session created → app_users lookup
   ↓
6. AuthProvider sets user + appUser state
   ↓
7. Dashboard accessible
```

### **Current Security Measures:**
- ✅ Supabase Row Level Security (RLS)
- ✅ Session-based authentication
- ✅ HTTPS enforced
- ⚠️ No CSRF tokens
- ⚠️ No rate limiting on API routes
- ⚠️ No audit logging for privileged actions
- ⚠️ Missing permission checks on some routes

---

## 🎯 Critical Paths (for Non-Regression Suite)

### **P0 - Must Work:**
1. **User Login** → Sign-in → Dashboard
2. **User Signup** → Email verification → Dashboard
3. **Create Contact** → Save → View in list
4. **Pipeline Board Load** → View deals → Drag to move stage
5. **Settings Read** → View settings → No errors

### **P1 - Important:**
6. **Email Verification** → Receive email → Click link → Verified
7. **Create Deal** → Add to pipeline → Visible in board
8. **Task Creation** → Assign → Appears in task list
9. **Campaign Creation** → Save → Visible in marketing
10. **Form Submission** → Submit → Recorded

---

## 🧪 Testing Infrastructure

### **Current State:**
- ✅ Jest configured (`jest.setup.js`)
- ✅ Test directory exists (`__tests__/`)
- ⚠️ Limited test coverage
- ❌ No E2E tests (Playwright/Cypress)
- ❌ No visual regression tests
- ❌ No integration tests with DB

### **Needed:**
- Playwright for E2E
- Testing Library for component tests
- MSW for API mocking
- Dockerized test database

---

## 📊 Observability & Monitoring

### **Current State:**
- ✅ Console logging in dev
- ⚠️ No structured logging
- ❌ No error tracking (Sentry)
- ❌ No performance monitoring
- ❌ No OpenTelemetry traces
- ❌ No metrics collection

### **Needed:**
- Sentry integration
- Winston/Pino for structured logs
- OpenTelemetry setup
- Performance budgets
- Health check endpoints

---

## 🚀 Deployment Architecture

### **Current Deployment:**
- **Production:** Railway.app (`dental-crm-private-production.up.railway.app`)
- **Local Dev:** `localhost:3000`
- **Database:** Supabase Cloud
- **Email:** Resend API

### **Missing:**
- ❌ Staging environment
- ❌ Preview deployments for PRs
- ❌ Blue/green deployment
- ❌ Canary releases
- ❌ Rollback strategy

---

## 📁 Key Files & Their Purpose

### **Configuration:**
- `next.config.ts` - Next.js configuration
- `middleware.ts` - Route protection
- `tailwind.config.mobile.js` - Mobile-specific styles
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies

### **Core Library:**
- `src/lib/auth.tsx` - Authentication provider
- `src/lib/supabase-client.ts` - Supabase client
- `src/lib/email-service.ts` - Email service
- `src/lib/utils.ts` - Utility functions

### **Types:**
- `src/types/database.ts` - Database types
- `src/types/*.ts` - Various type definitions

---

## 🔴 Known Issues Summary

### **High Priority (User-Reported):**
1. ❌ **CreateContact crashes app**
2. ❌ **VerifyEmail doesn't send emails**
3. ❌ **Pipeline "View All" cannot sort/reorder**

### **Medium Priority:**
4. ⚠️ No centralized settings registry
5. ⚠️ Hard-coded values throughout codebase
6. ⚠️ Missing error boundaries in many components
7. ⚠️ No retry mechanism for API failures

### **Low Priority (Technical Debt):**
8. ⚠️ Limited test coverage
9. ⚠️ No monitoring/observability
10. ⚠️ Missing staging environment

---

## 📈 Next Steps (Phase 1)

1. Set up baseline E2E test suite
2. Fix CreateContact crash with proper error handling
3. Debug and fix VerifyEmail flow
4. Implement pipeline reordering with persistence
5. Create settings registry
6. Add Sentry for error tracking
7. Implement structured logging

---

**Last Updated:** October 14, 2025  
**Maintainer:** Development Team

