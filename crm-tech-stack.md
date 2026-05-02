# Dental CRM - Technical Stack Overview

**Version:** 1.0.0  
**Last Updated:** January 2025  
**Status:** Production Ready

---

## 1. Frontend Framework

### Core Framework
- **Next.js**: `14.2.18` (React Framework)
- **React**: `19.1.0` (UI Library)
- **TypeScript**: `5.x` (Type Safety)
- **Node.js**: `>=20.0.0` (Runtime)

### UI & Styling
- **TailwindCSS**: `4.0.0-beta.19` (Utility-first CSS)
- **Radix UI**: Comprehensive component primitives
  - `@radix-ui/react-dialog`
  - `@radix-ui/react-dropdown-menu`
  - `@radix-ui/react-select`
  - `@radix-ui/react-tabs`
  - `@radix-ui/react-toast`
  - And 10+ more primitives
- **Lucide React**: `0.309.0` (Icon library - 3000+ icons)
- **Framer Motion**: `11.18.2` (Animations)
- **shadcn/ui**: Custom component library built on Radix UI

### Build System
- **Turbopack**: Next.js build system (experimental)
- **PostCSS**: `8.x` (CSS processing)
- **Autoprefixer**: `10.4.16` (CSS vendor prefixes)

---

## 2. Backend Technology

### API Framework
- **Next.js API Routes**: Server-side API endpoints
  - 180+ API route handlers
  - RESTful architecture
  - Server-side rendering support

### Runtime & Language
- **Node.js**: `>=20.0.0`
- **TypeScript**: Full type safety across backend
- **Server Components**: Next.js App Router server components

### Key Backend Libraries
- **@supabase/supabase-js**: `2.39.1` (Database client)
- **@supabase/ssr**: `0.5.1` (SSR utilities)
- **pino**: `10.0.0` (Structured logging)
- **ioredis**: `5.4.1` (Redis client for caching/rate limiting)
- **bullmq**: `5.7.9` (Job queue management)

---

## 3. Database

### Primary Database
- **PostgreSQL**: `15+` (via Supabase)
- **Provider**: Supabase (Managed PostgreSQL)

### Database Features
- **Row Level Security (RLS)**: Enabled on all tables
- **Realtime Subscriptions**: WebSocket-based live updates
- **Connection Pooling**: Built-in via Supabase
- **Migrations**: 130+ SQL migration files
- **Functions**: PostgreSQL functions for business logic

### Key Tables (80+ total)
**Core CRM:**
- `tenants` - Organizations/practices
- `app_users` - User profiles and roles
- `contacts` - Patient/lead information
- `deals` - Treatment opportunities
- `tasks` - Follow-ups and reminders
- `activities` - Communication history
- `pipelines` - Sales process stages
- `pipeline_stages` - Individual stage definitions

**Marketing:**
- `marketing_campaigns` - Email/SMS campaigns
- `marketing_forms` - Lead capture forms
- `marketing_journeys` - Automation workflows
- `marketing_segments` - Audience segmentation
- `marketing_audit_runs` - Marketing audit results

**Analytics:**
- `analytics_events` - Event tracking
- `analytics_sessions` - User sessions
- `analytics_cohorts` - Cohort analysis data

**Other:**
- `user_tenant_memberships` - Multi-tenant access
- `practice_locations` - Multi-location support
- `integrations` - Third-party connections
- `automations` - Workflow automation rules

### Database Extensions
- `uuid-ossp` - UUID generation
- JSONB for flexible metadata storage
- Full-text search capabilities

---

## 4. Authentication

### Authentication Provider
- **Supabase Auth**: JWT-based authentication system

### Authentication Features
- **Email/Password**: Traditional login
- **Magic Links**: Passwordless authentication
- **Session Management**: Automatic token refresh
- **Multi-factor Authentication**: Optional (via Supabase)
- **Password Reset**: Secure token-based flow
- **Email Verification**: Required for account activation

### Implementation
- **Client**: `@supabase/ssr` for browser-side auth
- **Server**: `@supabase/supabase-js` for server-side verification
- **Middleware**: Route protection via Next.js middleware
- **Custom Hook**: `useAuth()` for React components

### Security
- **JWT Tokens**: Stateless authentication
- **Secure Cookies**: HttpOnly, Secure, SameSite flags
- **CSRF Protection**: Same-site cookie policy
- **Session Timeout**: Automatic after inactivity

---

## 5. State Management

### Primary Approach
- **React Hooks**: `useState`, `useEffect`, `useCallback`, `useMemo`
- **Context API**: Global state management
  - `AuthProvider` - User authentication state
  - `WizardProvider` - Onboarding wizard state

### No External State Libraries
- ❌ No Redux
- ❌ No Zustand
- ❌ No MobX
- ✅ Pure React hooks + Context API

### Custom Hooks
- `useAuth()` - Authentication state
- `useTenant()` - Current tenant context
- `useCurrentUser()` - Current user data
- `useFormValidation()` - Form validation
- `useAutoSave()` - Auto-save functionality
- `useKeyboardShortcuts()` - Keyboard navigation
- `useDataFreshness()` - Data staleness tracking
- `useDashboardRealtime()` - Real-time dashboard updates

### State Patterns
- **Component-level state**: For UI-only state
- **Context providers**: For shared global state
- **Server state**: Fetched via API routes
- **Local storage**: For user preferences

---

## 6. Form Handling

### Form Libraries
- **React Hook Form**: `7.65.0` (Form state management)
- **@hookform/resolvers**: `5.2.2` (Validation resolvers)
- **Zod**: `3.23.4` (Schema validation)

### Form Features
- **Type-safe forms**: Zod schemas with TypeScript
- **Field validation**: Client and server-side
- **Error handling**: Comprehensive error messages
- **Auto-save**: Draft saving functionality
- **Conditional fields**: Dynamic form logic
- **File uploads**: Signature capture, document uploads

### Additional Validation
- **email-validator**: `2.0.4` (Email validation)
- **libphonenumber-js**: `1.12.24` (Phone number validation)

### Form Components
- Custom form components built on Radix UI
- Form builder for marketing forms
- Signature capture with `react-signature-canvas`
- Rich text editing capabilities

---

## 7. API Structure

### API Architecture
- **REST API**: RESTful endpoints via Next.js API Routes
- **No GraphQL**: Pure REST implementation
- **No tRPC**: Standard REST endpoints

### API Route Structure
```
src/app/api/
├── activities/          # Activity tracking
├── ai/                # AI features (transcription, summarization)
├── analytics/          # Analytics endpoints
├── billing/           # Subscription management
├── communications/    # Email/SMS/WhatsApp
├── contacts/          # Contact CRUD
├── deals/             # Deal management
├── forms/             # Form submissions
├── integrations/      # Third-party integrations
├── marketing/         # Marketing campaigns
├── onboarding/       # Onboarding flow
├── pipelines/         # Pipeline management
├── search/            # Universal search
├── tasks/             # Task management
└── webhooks/          # Webhook handlers
```

### API Patterns
- **RESTful conventions**: GET, POST, PUT, DELETE
- **Error handling**: Standardized error responses
- **Authentication**: Middleware-based auth checks
- **Rate limiting**: Redis-based rate limiting
- **Validation**: Zod schemas for request validation

### API Features
- **180+ endpoints**: Comprehensive API coverage
- **Webhook support**: Incoming webhooks from integrations
- **Batch operations**: Bulk import/export
- **Real-time updates**: Supabase Realtime subscriptions

---

## 8. File Structure

### Project Structure
```
dental-crm/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # Auth routes (sign-in, sign-up)
│   │   ├── api/                # API routes (180+ endpoints)
│   │   ├── dashboard/          # Dashboard page
│   │   ├── contacts/           # Contacts management
│   │   ├── deals/              # Deals pipeline
│   │   ├── forms/              # Marketing forms
│   │   ├── marketing/          # Marketing campaigns
│   │   ├── analytics/          # Analytics dashboards
│   │   └── settings/           # Settings pages
│   ├── components/              # React components
│   │   ├── ui/                 # Reusable UI components (82 files)
│   │   ├── contacts/           # Contact-specific components
│   │   ├── deals/              # Deal-specific components
│   │   ├── dashboard/          # Dashboard widgets
│   │   ├── forms/              # Form builder components
│   │   ├── marketing/         # Marketing components (40 files)
│   │   ├── analytics/          # Analytics components (26 files)
│   │   └── settings/           # Settings components (72 files)
│   ├── lib/                    # Utilities and services
│   │   ├── hooks/              # Custom React hooks (19 files)
│   │   ├── services/           # Business logic services
│   │   ├── schemas/            # Zod validation schemas
│   │   ├── utils/              # Utility functions
│   │   └── supabase-*.ts       # Supabase client setup
│   ├── types/                  # TypeScript type definitions
│   ├── contexts/               # React Context providers
│   ├── hooks/                  # Global custom hooks
│   ├── schemas/                # Data schemas
│   └── middleware.ts           # Next.js middleware
├── supabase/
│   ├── migrations/             # Database migrations (130 files)
│   ├── functions/              # Edge functions
│   └── config.toml             # Supabase configuration
├── tests/                      # Test files
│   ├── e2e/                    # End-to-end tests
│   ├── unit/                   # Unit tests
│   └── integration/            # Integration tests
├── __tests__/                  # Additional test files
└── public/                     # Static assets
```

### Key Directories
- **`src/app/`**: Next.js pages and API routes
- **`src/components/`**: React components (400+ files)
- **`src/lib/`**: Business logic and utilities
- **`supabase/migrations/`**: Database schema migrations

---

## 9. Key Dependencies

### Core Dependencies
```json
{
  "next": "^14.2.18",
  "react": "19.1.0",
  "react-dom": "19.1.0",
  "typescript": "^5",
  "@supabase/supabase-js": "^2.39.1",
  "@supabase/ssr": "^0.5.1"
}
```

### UI & Styling
- `tailwindcss`: `^4.0.0-beta.19`
- `framer-motion`: `^11.18.2`
- `lucide-react`: `^0.309.0`
- `class-variance-authority`: `^0.7.0`
- `clsx`: `^2.1.0`
- `tailwind-merge`: `^2.2.0`

### Forms & Validation
- `react-hook-form`: `^7.65.0`
- `@hookform/resolvers`: `^5.2.2`
- `zod`: `^3.23.4`
- `email-validator`: `^2.0.4`
- `libphonenumber-js`: `^1.12.24`

### Data & Tables
- `@tanstack/react-table`: `^8.21.3` (Data tables)
- `recharts`: `^3.2.1` (Charts)
- `chart.js`: `^4.4.1` (Chart library)
- `react-chartjs-2`: `^5.2.0` (React wrapper)

### Drag & Drop
- `@dnd-kit/core`: `^6.3.1`
- `@dnd-kit/sortable`: `^10.0.0`
- `@dnd-kit/utilities`: `^3.2.2`

### Communications
- `@sendgrid/mail`: `^8.1.6` (Email)
- `resend`: `^3.2.0` (Email service)
- `twilio`: `^5.10.3` (SMS)
- `@aws-sdk/client-ses`: `^3.569.0` (AWS SES)

### Payments
- `stripe`: `^19.1.0`
- `@stripe/stripe-js`: `^8.1.0`
- `@stripe/react-stripe-js`: `^5.2.0`

### AI & Integrations
- `openai`: `^6.3.0` (OpenAI API)
- `googleapis`: `^140.0.1` (Google APIs)

### Utilities
- `date-fns`: `^3.0.6` (Date manipulation)
- `papaparse`: `^5.5.3` (CSV parsing)
- `xlsx`: `^0.18.5` (Excel files)
- `jspdf`: `^3.0.3` (PDF generation)
- `html2canvas`: `^1.4.1` (Screenshots)

### Job Queues & Caching
- `bullmq`: `^5.7.9` (Job queue)
- `ioredis`: `^5.4.1` (Redis client)

### Content Editing
- `grapesjs`: `^0.22.13` (Page builder)
- `grapesjs-preset-newsletter`: `^1.0.2`

### Dev Dependencies
- `@playwright/test`: `^1.40.1` (E2E testing)
- `jest`: `^29.7.0` (Unit testing)
- `@testing-library/react`: `^14.1.2`
- `eslint`: `^8` (Linting)
- `prettier`: `^3.1.1` (Formatting)
- `supabase`: `^2.54.11` (Supabase CLI)

---

## 10. Deployment

### Hosting Platform
- **Railway.app**: Primary hosting platform
- **Domain**: `dental-crm-private-production.up.railway.app`
- **Auto-deploy**: GitHub integration enabled

### Deployment Configuration
- **Build Command**: `npm install --legacy-peer-deps && npm run build`
- **Start Command**: `npm start`
- **Port**: `3000` (configurable via `PORT` env var)
- **Restart Policy**: `ON_FAILURE` (max 10 retries)

### Environment Variables
Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXT_PUBLIC_APP_URL` - Application URL
- `RESEND_API_KEY` - Email service API key
- `STRIPE_SECRET_KEY` - Payment processing
- `OPENAI_API_KEY` - AI features
- `TWILIO_ACCOUNT_SID` - SMS service
- `TWILIO_AUTH_TOKEN` - SMS authentication

### Deployment Features
- **Automatic deployments**: On push to main branch
- **Health checks**: Built-in Railway health monitoring
- **Auto-restart**: On failure with retry policy
- **SSL/TLS**: Automatic certificate management
- **CDN**: Railway CDN for static assets

### Alternative Deployment Options
- **Vercel**: Documented as alternative (native Next.js support)
- **Self-hosted**: Possible with Docker/Node.js

---

## 11. Existing Tests

### Test Framework
- **Jest**: `29.7.0` (Unit & Integration testing)
- **Playwright**: `1.40.1` (End-to-end testing)
- **React Testing Library**: `^14.1.2` (Component testing)

### Test Structure
```
tests/
├── e2e/                        # End-to-end tests
│   ├── baseline/              # Baseline flow tests
│   ├── crm/                   # CRM feature tests
│   └── multi-org-flows.spec.ts
├── unit/                       # Unit tests
│   └── contact-validation.test.ts
├── integration/                # Integration tests
│   └── multi-org-api.integration.test.ts
├── forms/                      # Form tests
├── accessibility/              # Accessibility tests
├── performance/               # Performance tests
└── visual/                    # Visual regression tests

__tests__/
├── regression.test.ts
├── routing-engine.test.ts
├── security/                  # Security tests
└── hardening/                 # Hardening tests
```

### Test Coverage
- **Unit Tests**: Component and utility function tests
- **Integration Tests**: API endpoint tests
- **E2E Tests**: Complete user flow tests
- **Security Tests**: Permission enforcement, tenant isolation
- **Performance Tests**: Load testing with Artillery

### Test Scripts
```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:e2e": "playwright test",
  "test:e2e:headed": "playwright test --headed",
  "test:visual": "playwright test tests/visual",
  "test:performance": "playwright test tests/performance",
  "test:accessibility": "playwright test tests/accessibility",
  "test:load": "artillery run artillery.yml"
}
```

### Test Files Found
- 31 test files identified
- Tests for API routes, components, security, and integrations
- Marketing audit module has comprehensive test coverage

---

## 12. CI/CD

### Continuous Integration
- **GitHub Integration**: Railway auto-deploys on push
- **GitHub Actions**: Limited (CodeQL, Dependabot)
  - `codeql.yml` - Security scanning
  - `dependabot-auto-merge.yml` - Dependency updates

### Deployment Pipeline
1. **Code Push**: Developer pushes to `main` branch
2. **Auto-build**: Railway triggers build
3. **Build Process**: 
   - Install dependencies (`npm install --legacy-peer-deps`)
   - Run build (`npm run build`)
4. **Deploy**: Start application (`npm start`)
5. **Health Check**: Railway monitors application health
6. **Auto-restart**: On failure, retry up to 10 times

### CI/CD Features
- ✅ **Automatic deployments**: On every push
- ✅ **Build caching**: Railway caches dependencies
- ✅ **Health monitoring**: Built-in health checks
- ✅ **Rollback capability**: Via Railway dashboard
- ⚠️ **Limited GitHub Actions**: Minimal CI/CD automation
- ⚠️ **No staging environment**: Direct production deployment

### Recommended Improvements
- Add staging environment
- Implement pre-deployment tests
- Add deployment notifications
- Set up monitoring and alerting

---

## 13. Main Features

### Core CRM Features

#### Contacts Management
- ✅ Contact list with 11-column layout
- ✅ Create, edit, delete contacts
- ✅ Contact detail view with tabs (Deals, Activities)
- ✅ Search and filter contacts
- ✅ Bulk operations
- ✅ Contact import/export (CSV, Excel)
- ✅ Custom fields support
- ✅ Contact tags and segmentation

#### Deals & Pipeline
- ✅ Deal pipeline management (Board & List views)
- ✅ 6 pre-configured dental templates
- ✅ Custom pipeline creation
- ✅ Drag-and-drop deal movement
- ✅ Deal detail view with intelligence
- ✅ Deal categorization (AI-powered)
- ✅ Conversion probability scoring
- ✅ Deal value tracking
- ✅ Pipeline analytics

#### Tasks & Activities
- ✅ Task management with queue workflow
- ✅ Task filters (All, Overdue, Today, etc.)
- ✅ Activity timeline (Call, Email, SMS, WhatsApp, Meeting, Note)
- ✅ Call recording uploads
- ✅ AI-powered activity analysis
- ✅ Activity purpose and outcome tracking

#### Calendar & Scheduling
- ✅ Calendar integration
- ✅ Appointment scheduling
- ✅ Calendar sync capabilities

### Marketing Features

#### Campaigns
- ✅ Email campaigns
- ✅ SMS campaigns
- ✅ WhatsApp campaigns
- ✅ Campaign scheduling
- ✅ A/B testing
- ✅ Campaign analytics

#### Forms & Landing Pages
- ✅ Form builder (drag-and-drop)
- ✅ Form submissions tracking
- ✅ Landing page builder
- ✅ Form analytics
- ✅ Lead capture automation

#### Automation
- ✅ Marketing journeys (workflow automation)
- ✅ Trigger-based automations
- ✅ Email sequences
- ✅ Lead nurturing workflows

#### Analytics
- ✅ Campaign performance tracking
- ✅ Channel attribution
- ✅ ROI calculation
- ✅ Marketing audit system

### Analytics & Reporting

#### Executive Dashboard
- ✅ Business health score
- ✅ AI-powered insights
- ✅ Key performance indicators
- ✅ Revenue forecasting

#### CRM Analytics
- ✅ Deal performance metrics
- ✅ Pipeline analytics
- ✅ Conversion tracking
- ✅ Revenue forecasting
- ✅ 5 view modes (deals table, performance, pipeline, forecasting)

#### Marketing Analytics
- ✅ Campaign performance
- ✅ Channel analytics
- ✅ Attribution tracking
- ✅ 4 view modes

#### Advanced Analytics
- ✅ Cohort analysis
- ✅ Predictive analytics
- ✅ 30+ interactive charts (Recharts)
- ✅ 15+ sortable data tables
- ✅ Export to CSV/Excel/PDF

### Enterprise Features

#### Multi-Tenancy
- ✅ Complete tenant isolation
- ✅ Row-level security (RLS)
- ✅ Multi-organization support
- ✅ Multi-location support
- ✅ Location-based access control

#### Team Management
- ✅ User invitations
- ✅ Role-based access control (Owner, Manager, Staff)
- ✅ Permission management
- ✅ Team member management

#### Integrations
- ✅ Email service (Resend, SendGrid, AWS SES)
- ✅ SMS service (Twilio)
- ✅ WhatsApp Business
- ✅ Payment processing (Stripe)
- ✅ Google APIs integration
- ✅ PMS integration capabilities

#### Settings & Configuration
- ✅ 23 configuration tabs
- ✅ Company settings
- ✅ Branding customization
- ✅ Email/SMS/WhatsApp settings
- ✅ Integration management
- ✅ Feature flags

### AI Features
- ✅ AI assistant (chat interface)
- ✅ Call transcription
- ✅ Call summarization
- ✅ Deal intelligence (conversion probability)
- ✅ Activity analysis
- ✅ Proactive monitoring

### Other Features
- ✅ Universal search
- ✅ Notifications system
- ✅ Onboarding wizard
- ✅ Treatment routing
- ✅ Call coaching
- ✅ Reception mode
- ✅ Billing & subscriptions

---

## 14. Known Problem Areas

### High Priority Issues

#### State Management Complexity
- **Issue**: Complex state synchronization between client and server
- **Location**: Location switching, tenant context
- **Impact**: 406 errors after location switch, stale state
- **Status**: Partially fixed (requires full page refresh)

#### Error Handling
- **Issue**: Silent failures, no user feedback on errors
- **Location**: Dashboard data loading, API calls
- **Impact**: Poor user experience, difficult debugging
- **Recommendation**: Implement error boundaries, retry mechanisms

#### Performance Optimization
- **Issue**: Multiple sequential database queries, no caching strategy
- **Location**: Dashboard, analytics pages
- **Impact**: Slow page loads, especially with large datasets
- **Recommendation**: Implement query optimization, caching layer

### Medium Priority Issues

#### TypeScript Strictness
- **Issue**: `ignoreBuildErrors: true` in Next.js config
- **Location**: `next.config.js`
- **Impact**: Type errors may slip into production
- **Recommendation**: Gradually fix TypeScript errors, enable strict mode

#### Test Coverage
- **Issue**: Limited test coverage across codebase
- **Location**: Many components lack tests
- **Impact**: Risk of regressions
- **Recommendation**: Increase test coverage, especially for critical paths

#### Code Duplication
- **Issue**: Some code duplication identified by SonarQube
- **Location**: SQL files, utility functions
- **Impact**: Maintenance burden
- **Recommendation**: Extract common patterns into utilities

### Low Priority / Technical Debt

#### Accessibility
- **Issue**: Limited ARIA labels, keyboard navigation gaps
- **Location**: Various components
- **Impact**: Poor accessibility for screen readers
- **Recommendation**: Audit and improve accessibility

#### Monitoring & Observability
- **Issue**: Limited production monitoring
- **Location**: No Sentry or comprehensive logging
- **Impact**: Difficult to debug production issues
- **Recommendation**: Implement error tracking, structured logging

#### Documentation
- **Issue**: Some components lack inline documentation
- **Location**: Complex business logic
- **Impact**: Onboarding difficulty
- **Recommendation**: Add JSDoc comments, improve README

### Architecture Concerns

#### Hydration Mismatches
- **Issue**: Server-rendered HTML doesn't match client in some cases
- **Location**: Pipeline, deals pages
- **Impact**: React hydration errors
- **Status**: Fixed with `ssr: false` for dynamic components

#### Database Query Optimization
- **Issue**: Some queries may not be optimized for large datasets
- **Location**: Analytics queries, dashboard metrics
- **Impact**: Performance degradation with scale
- **Recommendation**: Add database indexes, optimize queries

#### Real-time Updates
- **Issue**: Real-time subscriptions may cause performance issues
- **Location**: Dashboard, pipeline views
- **Impact**: High WebSocket connections
- **Recommendation**: Implement connection pooling, optimize subscriptions

---

## Summary

This Dental CRM is a **production-ready, enterprise-grade application** built with modern web technologies. It features:

- ✅ **Modern Stack**: Next.js 14, React 19, TypeScript
- ✅ **Scalable Architecture**: Multi-tenant, multi-location support
- ✅ **Comprehensive Features**: Full CRM + Marketing + Analytics
- ✅ **Security**: Row-level security, JWT auth, RBAC
- ✅ **Testing**: Jest + Playwright test suites
- ✅ **Deployment**: Railway.app with auto-deploy

**Known areas for improvement:**
- Error handling and user feedback
- Performance optimization and caching
- Test coverage expansion
- Production monitoring and observability

The codebase is well-structured and follows modern React/Next.js patterns, making it maintainable and extensible for future development.




