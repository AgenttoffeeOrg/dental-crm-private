# Authentication & User Signup Flow

## Overview

This document traces the complete authentication and user signup flow, from initial registration through database record creation and post-signup redirection.

---

## Signup Process

### Endpoint

**Route:** `/api/auth/signup` (handled by Supabase Auth, not a custom endpoint)

**Frontend Component:** `src/app/(auth)/sign-up/page.tsx`

**File Path:** `src/app/(auth)/sign-up/page.tsx`

---

## Step-by-Step Signup Flow

### Step 1: User Submits Signup Form

**Location:** `src/app/(auth)/sign-up/page.tsx` (line 90)

**Function:** `handleSignUp`

**Form Fields:**
- `fullName` (required)
- `email` (required)
- `password` (required, min 8 chars, must contain uppercase, lowercase, number)
- `confirmPassword` (required, must match password)
- `agreedToTerms` (required checkbox)

**Validation:** Client-side validation runs before submission (lines 53-88).

---

### Step 2: Create Auth User (Supabase)

**Location:** `src/app/(auth)/sign-up/page.tsx` (lines 103-112)

**Code Snippet:**
```typescript
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: formData.email.trim(),
  password: formData.password,
  options: {
    data: {
      full_name: formData.fullName.trim()
    }
  }
})
```

**What Happens:**
1. Supabase Auth creates a record in `auth.users` table
2. User ID is generated (UUID)
3. Password is hashed and stored
4. `email_confirmed_at` may be NULL (email verification not required for dashboard access)

**Error Handling:**
- If user already exists (lines 114-130), redirects to sign-in page with email pre-filled
- Other errors are thrown and displayed to user

---

### Step 3: Create `app_users` Record

**Location:** `src/app/(auth)/sign-up/page.tsx` (lines 141-194)

**Code Snippet:**
```typescript
// First check if app user already exists
const { data: existingAppUser } = await supabase
  .from('app_users')
  .select('*')
  .eq('id', authData.user.id)
  .single()

if (existingAppUser) {
  // User already exists - update their information
  await supabase
    .from('app_users')
    .update({
      full_name: formData.fullName.trim(),
      role: existingAppUser.role || 'owner'
    })
    .eq('id', authData.user.id)
} else {
  // Create new app user WITHOUT tenant_id initially
  const { error: appUserError } = await supabase
    .from('app_users')
    .insert({
      id: authData.user.id,
      full_name: formData.fullName.trim(),
      role: 'owner'
      // tenant_id is NOT set initially - will be set below for practice sign-ups
    })
}
```

**Critical Details:**

1. **When is `auth.users` created?**
   - Created during `supabase.auth.signUp()` call (Step 2)
   - Managed by Supabase Auth service

2. **When is `app_users` created?**
   - Created immediately after `auth.users` is created (Step 3, line 169-176)
   - Happens in the same signup handler function

3. **What values are set in `app_users` at signup?**
   - `id`: Same as `auth.users.id` (foreign key)
   - `full_name`: From form input
   - `role`: Set to `'owner'` by default
   - `tenant_id`: **NOT SET** (left as NULL, but schema may require it - see issue below)

4. **Is `tenant_id` set to NULL or left empty?**
   - **ISSUE:** The code comment says "tenant_id is NOT set initially" (line 175)
   - However, the database schema (`supabase/sql/01_initial_schema.sql` line 18) shows `tenant_id UUID NOT NULL`
   - This creates a constraint violation unless:
     - The migration has been updated to make `tenant_id` nullable, OR
     - There's a database trigger that auto-creates a tenant (see migration `20251027_003_auto_create_tenant_for_users.sql`)

**Error Handling:**
- If `tenant_id` constraint fails (lines 183-190), shows database configuration error message
- Suggests user contact support or use cleanup script

---

### Step 4: Post-Signup Redirect

**Location:** `src/app/(auth)/sign-up/page.tsx` (lines 209-213)

**Code Snippet:**
```typescript
// Always redirect to dashboard - enterprise workflow
setTimeout(() => {
  console.log('[SIGNUP] Redirecting to dashboard (email verified:', emailVerified, ')')
  window.location.href = '/dashboard'
}, 1500)
```

**What Happens:**
1. Success toast is shown (lines 204-207)
2. User is redirected to `/dashboard` after 1.5 seconds
3. Email verification is NOT required for dashboard access (enterprise workflow)

---

## Post-Signup Flow

### Dashboard Redirect

**Route:** `/dashboard`

**File:** `src/app/dashboard/page.tsx`

**What Checks Determine if User Has Org?**

**Location:** Dashboard likely checks `app_users.active_tenant_id` or `app_users.tenant_id`

**Code Pattern (from other files):**
```typescript
const { data: appUser } = await supabase
  .from('app_users')
  .select('tenant_id, active_tenant_id')
  .eq('id', user.id)
  .single()

const tenantId = appUser.active_tenant_id || appUser.tenant_id
```

**What Happens if `tenant_id` is NULL?**

1. **Wizard May Open:** If onboarding is not complete, wizard may open
2. **Org Creation Prompt:** User may see banner/prompt to create organization
3. **Limited Functionality:** Most CRM features require `tenant_id`, so user cannot:
   - Create contacts
   - Create deals
   - Access pipelines
   - Use location-based features

**What Actions Can User Perform Without an Org?**

- View dashboard (empty state)
- Access settings/profile
- Complete onboarding wizard (which may create org)
- Join existing organization via invite code

---

## Profile Settings

### What Fields Can User Edit Before Org Creation?

Based on `app_users` schema, users can edit:
- `full_name`
- `professional_title`
- `phone_mobile`
- `phone_office`
- `bio`
- `profile_photo_url`
- `timezone`

These are considered **"personal"** fields.

### What Endpoint Handles Profile Updates?

**Likely Route:** `/api/user/profile` or `/api/users/profile`

**Note:** The signup flow doesn't show explicit profile update endpoint, but the PersonalInfoStep component (`src/components/onboarding/steps/personal-info-step.tsx`) attempts to fetch from `/api/user/profile` (line 81).

### Personal vs Organizational Fields

**Personal Fields (stored in `app_users`):**
- `full_name`
- `professional_title`
- `phone_mobile`
- `phone_office`
- `bio`
- `profile_photo_url`
- `timezone`

**Organizational Fields (stored in `tenants`):**
- `name` (organization name)
- `description`
- `specialty`
- `website_url`
- `logo_url`

---

## Complete Signup Flow Diagram

```
┌─────────────────────────────────────────┐
│  User fills signup form                 │
│  - fullName, email, password            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Client-side validation                 │
│  - Email format                         │
│  - Password strength                    │
│  - Terms agreement                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  supabase.auth.signUp()                 │
│  Creates auth.users record              │
│  - id: UUID                             │
│  - email: string                        │
│  - encrypted_password: hash            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Check if app_users exists              │
│  (by auth.users.id)                     │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
   EXISTS          NOT EXISTS
   ┌──────┐        ┌─────────────┐
   │UPDATE│        │   INSERT    │
   │      │        │ - id        │
   │      │        │ - full_name │
   │      │        │ - role: 'owner'│
   │      │        │ - tenant_id: NOT SET│
   └──────┘        └─────────────┘
       │               │
       └───────┬───────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Show success toast                     │
│  "Account created! Create org or join"  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Redirect to /dashboard                  │
│  (after 1.5 seconds)                    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Dashboard checks:                      │
│  - active_tenant_id?                    │
│  - onboarding_completed?                │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
  HAS TENANT      NO TENANT
  ┌─────────┐     ┌──────────────┐
  │Show CRM │     │Show wizard/  │
  │features │     │org prompt    │
  └─────────┘     └──────────────┘
```

---

## Critical Issues Identified

### Issue 1: `tenant_id` Constraint Violation

**Problem:** 
- Signup code creates `app_users` without `tenant_id` (line 175)
- Database schema requires `tenant_id NOT NULL` (initial schema line 18)

**Potential Solutions:**
1. Database trigger auto-creates tenant (migration `20251027_003_auto_create_tenant_for_users.sql` exists)
2. Migration updated `tenant_id` to be nullable
3. Signup flow actually sets `tenant_id` in practice (code comment may be outdated)

**Evidence:** The error handler (lines 183-190) specifically handles `tenant_id` constraint failures, suggesting this is a known issue.

### Issue 2: Orphaned Auth Users

**Problem:**
If `app_users` creation fails after `auth.users` is created, the auth user remains orphaned (no app_users record).

**Impact:** User cannot sign in properly, or sign-in creates app_users on-the-fly (if implemented).

---

## Code Snippets Reference

### Signup Handler (Complete)

**File:** `src/app/(auth)/sign-up/page.tsx`

**Lines:** 90-253

**Key Sections:**
- **Line 103-112:** Create auth user
- **Line 146-150:** Check existing app_user
- **Line 152-166:** Update existing app_user
- **Line 168-176:** Create new app_user (WITHOUT tenant_id)
- **Line 178-194:** Handle app_user creation errors
- **Line 204-213:** Success redirect

### Redirect Logic

**File:** `src/app/(auth)/sign-up/page.tsx`

**Line 212:** `window.location.href = '/dashboard'`

**Note:** Always redirects to dashboard, regardless of email verification status.

---

## Middleware That Checks for Tenant

**Note:** This documentation doesn't show explicit middleware, but the pattern used throughout the codebase is:

```typescript
const { data: appUser } = await supabase
  .from('app_users')
  .select('tenant_id, active_tenant_id')
  .eq('id', user.id)
  .single()

const tenantId = appUser.active_tenant_id || appUser.tenant_id

if (!tenantId) {
  // Show org creation prompt or redirect to wizard
}
```

This check is likely performed in:
- Dashboard page component
- API routes that require tenant context
- Onboarding wizard initialization

---

## Summary

1. **Signup creates:** `auth.users` → `app_users` (in that order)
2. **`tenant_id` handling:** NOT set during signup (may violate NOT NULL constraint)
3. **Post-signup:** Redirects to `/dashboard`, which checks for org
4. **Without org:** User can edit profile, complete wizard, but cannot use CRM features
5. **Personal vs Org:** Personal fields in `app_users`, organizational in `tenants`

