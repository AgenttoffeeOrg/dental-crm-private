# Onboarding Analysis – Complete Report

## Table of Contents
1. Executive Summary
2. File Structure & Architecture
3. Current Workflow & User Journey
4. Database Schema & Data Model
5. Step-by-Step Component Analysis
6. API Endpoints & Data Flow
7. Current Issues & Bugs Found
8. Edge Cases & Error Handling
9. Recommendations & Questions
10. Appendix: Key Code Snippets

---

## 1. Executive Summary
- **Purpose:** The onboarding wizard guides new or invited users through verifying their email, completing personal profile information, and (when applicable) configuring organization and location details.
- **Current State:** Functional but inconsistent. The UI has been simplified to a four-step flow, while legacy components and database configuration still reflect a larger ten-step design. Auto-save and resume work, but several data-mapping issues exist (notably with organization description). Navigation is enforced by middleware to ensure users belong to an organization.
- **Critical Issues:**
  1. Organization/company description is not persisted because UI and API refer to `tenants.description` while the schema uses `company_description`.
  2. Multi-organization membership is unsupported; most API calls assume a single membership and use `.single()` queries.
  3. Users without a tenant do not have their form data stored anywhere—progress is lost on refresh.

---

## 2. File Structure & Architecture
```
/app/onboarding/
├── page.tsx

/components/onboarding/
├── enhanced-onboarding-wizard.tsx
├── integrated-onboarding-flow.tsx
├── wizard-header.tsx
├── wizard-footer.tsx
├── wizard-progress-bar.tsx
├── wizard-step-container.tsx
├── wizard-sub-tabs.tsx
├── wizard-field-wrapper.tsx
├── setup-banner.tsx
├── email-verification-banner.tsx
├── multi-org-onboarding.tsx (legacy)
├── profile-setup-panel.tsx
└── steps/
    ├── email-verification-step.tsx
    ├── personal-info-step.tsx
    ├── company-info-step.tsx
    ├── first-location-step.tsx
    ├── contact-info-step.tsx
    ├── legal-details-step.tsx
    ├── business-settings-step.tsx
    ├── work-preferences-step.tsx
    ├── communication-settings-step.tsx
    └── security-settings-step.tsx

/contexts/
├── wizard-context.tsx

/hooks/
├── use-wizard-hooks.ts

/components/invites/
├── invite-detection-banner.tsx
├── org-decision-modal.tsx
├── create-org-modal.tsx
├── join-with-code-modal.tsx
└── index.ts

/app/api/onboarding/
├── config/route.ts
├── resume/route.ts
├── save-progress/route.ts
├── validate-step/route.ts
├── skip-step/route.ts
├── complete/route.ts
├── status/route.ts
└── admin/
    ├── steps/route.ts
    └── field-config/route.ts
```
Supporting schema and utilities:
- `supabase/migrations/20251026_02_onboarding_field_config.sql`
- `supabase/migrations/20251026_03_onboarding_defaults_functions_rls.sql`
- `supabase/sql/36_auth_enhancements.sql`
- `src/components/guards/org-required-modal.tsx`
- `src/types/invites.ts`

---

## 3. Current Workflow & User Journey

### Entry paths
- **Direct visit to `/onboarding`:** Guarded by middleware. Users without an active membership are redirected to `/organization-setup`.
- **Initial signup:** After signup, the user is redirected to `/dashboard`, but guard logic forces them through `/organization-setup` then `/onboarding`.
- **Invited user:** Via `/invites/[token]`, they accept the invitation, creating an `app_users` row and membership, then proceed to onboarding (profile-only flow).

### New Organization Creator (e.g., Rob Stark with "Winterfell Dental")
1. **Step 1 – Email Verification:** UI confirms Supabase-auth email status. Already-verified users see a "Verified" badge but must still click “Continue”.
2. **Step 2 – Profile Setup:** Fields pre-populated from `app_users` and optional `/api/user/profile`. All fields editable.
3. **Step 3 – Organization Setup:** Loads tenant data (but currently uses `description` instead of `company_description`). Shows company, contact, legal, and business sub-tabs. Optional in current flow.
4. **Step 4 – Location Setup:** Pre-fills active location `North HQ` (address/phone from legacy columns). Optional; can edit but cannot add multiple locations.

### Invited User Flow
- Invite acceptance creates membership directly. When accessing onboarding, `integrated-onboarding-flow` usually goes straight to wizard since `active_tenant_id` is already set. In principle, invited users should only see profile step, but current config still fetches four steps.

---

## 4. Database Schema & Data Model
- **app_users:** Tracks onboarding metadata (`onboarding_current_step`, `onboarding_started_at`, `onboarding_completed`, etc.). Holds profile data (full_name, phone_mobile, bio, profile_photo_url).
- **tenants:** Organization record; relevant fields include `name`, `company_description`, `specialty`, `logo_url`, etc.
- **locations:** Organization locations; columns include `address`, `city`, `postal_code`, `phone`. (Future migration will rename to `address_line1`/`phone_number`.)
- **user_tenant_memberships:** Links users to organizations, includes role and status; wizard assumes a single active membership.
- **onboarding_progress:** Stores per-step JSON field data, completion flags, timestamps.
- **onboarding_field_config & onboarding_step_definitions:** Admin-configurable step/field metadata (10-step legacy model).
- **auth.users:** Canonical email/verification status used by email verification step.

Relationships:
- `onboarding_progress.user_id → app_users.id`
- `onboarding_progress.tenant_id → tenants.id`
- `app_users.active_location_id → locations.id`
- `user_tenant_memberships.user_id → app_users.id`

---

## 5. Step-by-Step Component Analysis

### Step 1 – Email Verification
- **File:** `src/components/onboarding/steps/email-verification-step.tsx`
- **Fields:** None (uses Supabase auth status); displays email, resend button.
- **Required Fields:** Email verification itself (outside wizard). No form inputs.
- **Behavior:** Auto-loads `supabase.auth.getUser()`. Marks `email_verified` in form data. Requires manual “Continue”.
- **Issues:** No auto-advance upon verification; user must refresh or press continue.
- **Snippet:**
  ```tsx
  const { data: { user } } = await supabase.auth.getUser()
  setEmailVerified(user.email_confirmed_at !== null)
  updateFieldValue('email', user.email)
  ```

### Step 2 – Profile Setup (Personal Info)
- **File:** `src/components/onboarding/steps/personal-info-step.tsx`
- **Fields:** full_name*, professional_title, phone_mobile, phone_office, bio, profile_photo_url, timezone, language, date_format, time_format, working_hours_json.
- **Required:** `full_name` (per `/api/onboarding/config`). Others optional.
- **Behavior:** Preloads from `app_users` and `/api/user/profile`. Offers photo upload to Supabase storage.
- **Issues:** None critical. Optional fields exist despite migrations marking some required.
- **Snippet:**
  ```tsx
  const { data: appUser } = await supabase
    .from('app_users')
    .select('full_name, professional_title, phone_mobile, phone_office, bio, profile_photo_url')
    .eq('id', user.id)
  ```

### Step 3 – Organization Setup (Company Info + Sub-tabs)
- **File:** `src/components/onboarding/steps/company-info-step.tsx`
- **Fields:** name, description (should map to `company_description`), specialty, logo_url, plus contact/legal/business tab fields.
- **Behavior:** Preloads tenant data using `active_tenant_id`. Optional; shows “No organization found” if none.
- **Issues:** Column mismatch—fetches `description`, `specialty` but schema uses `company_description`. `save-progress` writes to `description` as well, so updates never persist.
- **Snippet:**
  ```tsx
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, description, specialty, website_url, logo_url, industry, company_size, founded_date')
    .eq('id', tenantId)
  ```

### Step 4 – Location Setup
- **File:** `src/components/onboarding/steps/first-location-step.tsx`
- **Fields:** name, address_line1, city, postal_code, phone_number.
- **Behavior:** Pre-fills active location using `locations.address`/`phone`. If no location, suggests skipping. Only supports editing single location.
- **Issues:** Still references legacy column names; future rename must update API and component.
- **Snippet:**
  ```tsx
  const { data: location } = await supabase
    .from('locations')
    .select('name, address, city, postal_code, phone')
    .eq('id', appUser.active_location_id)
    .single()
  ```

### Legacy/Optional Steps
- Files exist for work preferences, communication, security, legal, business, contact info. They are unused in current four-step flow but remain in step container switch.

---

## 6. API Endpoints & Data Flow

### Data Loading Flow
1. Middleware ensures user is authenticated and has active membership; else redirect to `/organization-setup`.
2. `/app/onboarding/page.tsx` double-checks membership → pushes to `/dashboard` if already completed.
3. `integrated-onboarding-flow.tsx`
   - If `appUser.active_tenant_id` exists → start wizard.
   - Else show invite detection + org decision modals.
4. `wizard-context.tsx` initialization:
   - `GET /api/onboarding/config` → returns step list + accountType.
   - `GET /api/onboarding/resume` → loads saved field data (from `onboarding_progress`).

### Save Progress Flow
1. User edits fields → `useWizardAutoSave` triggers after debounce → `POST /api/onboarding/save-progress`.
2. Endpoint decides path:
   - With tenant: calls `update_onboarding_progress` (RPC), which upserts row in `onboarding_progress` and marks `completed` when `isComplete` true.
   - Without tenant: updates `app_users.onboarding_current_step`; no JSON data stored.
3. After marking complete, server updates `app_users.onboarding_current_step` to next step and writes specific entities (profile → `app_users`, organization → `tenants`, location → `locations`).

### Completion Flow
1. Wizard footer triggers `goToNext` on final step → `completeWizard` → `PUT /api/onboarding/complete`.
2. Endpoint verifies required steps (email, profile) via `onboarding_progress` or `app_users.onboarding_current_step`.
3. On success, sets `app_users.onboarding_completed = true`, `profile_completed = true`, clears current step.
4. Caller typically redirects to dashboard (handled outside API).

---

## 7. Current Issues & Bugs Found

### Critical Issues
1. **Organization description not saved**
   - **Location:** `company-info-step.tsx` Lines 74–98, `save-progress/route.ts` Lines 183–186
   - **Cause:** Uses `description` but tenants table column is `company_description`.

2. **Single-location limitation**
   - **Location:** `first-location-step.tsx` (no UI for multiple locations) and `/api/onboarding/save-progress` location branch.
   - **Cause:** Step only fetches active location; API only updates/creates one location.

3. **Wizard completion blocked when required steps not recorded**
   - **Location:** `/api/onboarding/complete/route.ts` Lines 46–94; relies on `onboarding_progress` entries. When save-progress is not called (e.g., user skipped or API error), required steps appear incomplete.

### Minor/Additional Issues
- Hard-coded 4-step config diverges from database-configured 10 steps; legacy components remain unused.
- Email verification step requires manual confirmation; no automatic completion triggers.
- No storage of profile/location data for users without tenant; refresh loses entries.
- Multiple memberships not supported (all `.single()` queries).
- Validation API uses static rules; does not consult `onboarding_field_config`.

---

## 8. Edge Cases & Error Handling
- **Refresh Mid-Wizard:** Auto-save stores JSON in `onboarding_progress`. On reload, `/api/onboarding/resume` restores form data and step index.
- **Already Completed Onboarding:** `/api/onboarding/resume` returns `canResume: false`; `/onboarding` page redirects to dashboard.
- **Multiple Organizations:** Not supported; queries assume single membership. If user has multiple `user_tenant_memberships`, `.single()` will error.
- **Browser Back Button:** No specific handling; wizard context maintains state while component mounted. Navigating away loses context; auto-save reduces data loss.
- **Network Errors:** `save-progress` and `validate-step` catch errors and return JSON with message; UI shows toast via `useWizardAutoSave` and `goToNext`. No retry logic.
- **Session Timeout:** Supabase client fetches will fail with `Not authenticated` → API returns 401; UI currently logs error/toast but no redirect.

---

## 9. Recommendations & Questions

### Questions Needing Clarification
1. Should users be able to edit organization name/details during onboarding if the organization already exists?
2. Is multi-location setup required during onboarding, or should additional locations be added post-onboarding?
3. Should invited users see organization/location steps if the invite already places them in a tenant?
4. Which fields are mandatory vs optional for each step? Should the legacy configuration (`onboarding_field_config`) be re-used?

### Technical Recommendations
1. **Align column names:** Update organization step and APIs to use `company_description` and other canonical tenant fields.
2. **Persist data for non-tenant users:** Store profile/location form data in `app_users` JSONB so they don’t lose progress before creating/joining an org.
3. **Support multiple memberships:** Refactor API queries (`.single()` → `.maybeSingle()` + handle arrays) and incorporate active tenant selection.
4. **Unify configuration:** Decide between 4-step or 10-step approach; remove unused legacy components or re-enable them via `onboarding_field_config`.
5. **Improve completion detection:** Ensure required steps mark completion even when skipped (intentional) and auto-complete when data already satisfied.

---

## 10. Appendix: Key Code Snippets

### Wizard Initialization (`wizard-context.tsx`)
```tsx
useEffect(() => {
  initializeWizard()
}, [])

const initializeWizard = async () => {
  const configResponse = await fetch('/api/onboarding/config')
  const configData = await configResponse.json()
  setSteps(configData.steps || [])

  const resumeResponse = await fetch('/api/onboarding/resume')
  if (resumeResponse.ok) {
    const resumeData = await resumeResponse.json()
    if (resumeData.canResume) {
      setFormData(resumeData.savedData || {})
      setCompletedSteps(resumeData.completedSteps || [])
      setSkippedSteps(resumeData.skippedSteps || [])
      const resumeIndex = configData.steps.findIndex(
        (s: WizardStep) => s.stepId === resumeData.resumeFromStep
      )
      if (resumeIndex >= 0) {
        setCurrentStep(resumeIndex + 1)
      }
    }
  }
}
```

### Save Progress & Database Writes (`/api/onboarding/save-progress`)
```tsx
if (tenantId) {
  const { data: rpcResult } = await supabase.rpc('update_onboarding_progress', {
    p_user_id: user.id,
    p_step_id: stepId,
    p_field_data: fieldData || {},
    p_is_complete: isComplete || false,
  })
  // ...
  if (stepId === 'organization_setup') {
    const orgUpdate: any = {}
    if (fieldData.name !== undefined) orgUpdate.name = fieldData.name || null
    if (fieldData.description !== undefined) orgUpdate.description = fieldData.description || null
    // TODO: switch to company_description
    await supabase.from('tenants').update(orgUpdate).eq('id', tenantId)
  }
}
```

### Middleware Guard (`src/middleware.ts`)
```ts
const PUBLIC_ROUTES = ['/sign-in', '/sign-up', '/auth', '/']
const AUTH_ONLY_ROUTES = ['/organization-setup', '/profile/settings']
const ORG_REQUIRED_ROUTES = ['/dashboard', '/contacts', '/deals', '/tasks', '/pipelines', '/settings', '/onboarding']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabase, supabaseResponse } = createMiddlewareClient(request)

  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return supabaseResponse
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const redirectUrl = new URL('/sign-in', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (AUTH_ONLY_ROUTES.some(route => pathname.startsWith(route))) {
    return supabaseResponse
  }

  const { data: membership } = await supabase
    .from('user_tenant_memberships')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership && ORG_REQUIRED_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/organization-setup', request.url))
  }

  return supabaseResponse
}
```

### Location Step Pre-fill (`first-location-step.tsx`)
```tsx
const { data: location } = await supabase
  .from('locations')
  .select('name, address, city, postal_code, phone')
  .eq('id', appUser.active_location_id)
  .eq('tenant_id', tenantId)
  .single()

if (location) {
  updateFieldValue('address_line1', location.address)
  updateFieldValue('phone_number', location.phone)
}
```

---

**End of Report – ONBOARDING_ANALYSIS_COMPLETE.md**









