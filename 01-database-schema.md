# Database Schema Analysis

## Overview

This document provides a comprehensive analysis of the database schema for the multi-tenant dental CRM system. The schema uses PostgreSQL with UUID primary keys and implements Row-Level Security (RLS) for data isolation.

---

## Core Tables

### 1. `auth.users` (Supabase Auth Table)

**Purpose:** Supabase-managed authentication table. Stores user credentials and authentication metadata.

**Location:** Managed by Supabase (schema: `auth`)

**Key Columns:**
- `id` (UUID, PRIMARY KEY) - User's unique identifier
- `email` (TEXT) - User's email address
- `email_confirmed_at` (TIMESTAMPTZ) - When email was verified
- `encrypted_password` (TEXT) - Encrypted password hash
- `created_at` (TIMESTAMPTZ) - Account creation timestamp
- `raw_user_meta_data` (JSONB) - Additional metadata from signup

**Note:** This table is managed by Supabase Auth and should not be modified directly. The `app_users` table references this table.

---

### 2. `app_users`

**Purpose:** Application-level user profile data. Links Supabase auth users to application features.

**File:** `supabase/sql/01_initial_schema.sql` (lines 16-22)

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | - | PRIMARY KEY, REFERENCES `auth.users(id)` ON DELETE CASCADE |
| `tenant_id` | UUID | NOT NULL | - | **Legacy field** - REFERENCES `tenants(id)` ON DELETE CASCADE |
| `active_tenant_id` | UUID | NULLABLE | NULL | **Current session context** - which org user is viewing |
| `default_tenant_id` | UUID | NULLABLE | NULL | User's preferred "home" organization |
| `active_location_id` | UUID | NULLABLE | NULL | Currently active location within active tenant |
| `default_location_id` | UUID | NULLABLE | NULL | User's preferred default location |
| `full_name` | TEXT | NOT NULL | - | User's full name |
| `email` | TEXT | NULLABLE | NULL | User's email (denormalized from auth.users) |
| `role` | TEXT | NOT NULL | - | CHECK: `role IN ('owner', 'manager', 'staff')` |
| `status` | TEXT | NULLABLE | 'active' | Account status |
| `professional_title` | TEXT | NULLABLE | NULL | e.g., "Dr.", "DDS" |
| `phone_mobile` | TEXT | NULLABLE | NULL | Mobile phone number |
| `phone_office` | TEXT | NULLABLE | NULL | Office phone number |
| `bio` | TEXT | NULLABLE | NULL | User biography |
| `profile_photo_url` | TEXT | NULLABLE | NULL | URL to profile photo |
| `avatar_url` | TEXT | NULLABLE | NULL | Alternative avatar URL |
| `timezone` | TEXT | NULLABLE | 'Europe/London' | User's timezone |
| `last_seen_at` | TIMESTAMPTZ | NULLABLE | NULL | Last activity timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | NULLABLE | NOW() | Last update timestamp |
| `onboarding_completed` | BOOLEAN | NULLABLE | FALSE | Whether onboarding wizard is complete |
| `onboarding_current_step` | TEXT | NULLABLE | NULL | Current step ID in onboarding wizard |
| `onboarding_started_at` | TIMESTAMPTZ | NULLABLE | NULL | When onboarding wizard was first opened |
| `onboarding_completed_at` | TIMESTAMPTZ | NULLABLE | NULL | When onboarding wizard was completed |
| `onboarding_flow_type` | TEXT | NULLABLE | NULL | CHECK: `IN ('organization', 'solo')` |
| `onboarding_skipped_steps` | TEXT[] | NULLABLE | ARRAY[] | Array of skipped step IDs |
| `last_context_switch_at` | TIMESTAMPTZ | NULLABLE | NULL | Last tenant/location switch timestamp |
| `metadata` | JSONB | NULLABLE | '{}' | Additional metadata |
| `preferences` | JSONB | NULLABLE | '{}' | User preferences |

**Primary Key:** `id` (references `auth.users(id)`)

**Foreign Keys:**
- `id` → `auth.users(id)` ON DELETE CASCADE
- `tenant_id` → `tenants(id)` ON DELETE CASCADE (legacy)
- `active_tenant_id` → `tenants(id)` ON DELETE SET NULL
- `default_tenant_id` → `tenants(id)` ON DELETE SET NULL
- `active_location_id` → `locations(id)` ON DELETE SET NULL
- `default_location_id` → `locations(id)` ON DELETE SET NULL

**Indexes:**
- `idx_app_users_tenant_id` ON `app_users(tenant_id)`
- `idx_app_users_active_tenant` ON `app_users(active_tenant_id)` WHERE `active_tenant_id IS NOT NULL`
- `idx_app_users_active_location` ON `app_users(active_location_id)` WHERE `active_location_id IS NOT NULL`
- `idx_app_users_onboarding_flow` ON `app_users(onboarding_flow_type)` WHERE `onboarding_completed = false`

**Constraints:**
- `role` must be one of: 'owner', 'manager', 'staff'
- `onboarding_flow_type` must be one of: 'organization', 'solo'

**Critical Analysis:**

**Q: Can `app_users.tenant_id` be NULL?**
**A:** In the original schema (line 18), `tenant_id` is `NOT NULL`. However, in newer migrations, the signup flow creates `app_users` records WITHOUT `tenant_id` initially. This creates a constraint violation unless the database migration has been updated to make `tenant_id` nullable.

**Q: Can `app_users.active_tenant_id` be NULL?**
**A:** Yes, `active_tenant_id` is nullable. This is intentional - users can sign up without immediately joining an organization. The wizard helps them create or join an org.

**Q: Difference between `tenant_id` and `active_tenant_id`?**
**A:**
- `tenant_id`: **Legacy field** - Originally meant to be the user's "primary" tenant. Now kept for backward compatibility. May be NULL for new signups.
- `active_tenant_id`: **Current session context** - Which organization the user is currently viewing. Updated when user switches orgs. This is the field used by RLS policies.

**Current State:** The codebase uses `active_tenant_id` as the primary field for multi-org support. The `tenant_id` field is a legacy remnant.

---

### 3. `tenants`

**Purpose:** Represents organizations/practices. Each tenant is an isolated organization with its own data.

**File:** `supabase/sql/01_initial_schema.sql` (lines 8-13)

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PRIMARY KEY |
| `name` | TEXT | NOT NULL | - | Organization name |
| `timezone` | TEXT | NOT NULL | 'Europe/London' | Organization timezone |
| `account_type` | TEXT | NULLABLE | NULL | CHECK: `IN ('organization', 'solo')` |
| `is_multi_location` | BOOLEAN | NULLABLE | FALSE | Whether org has multiple locations |
| `description` | TEXT | NULLABLE | NULL | Organization description |
| `specialty` | TEXT | NULLABLE | NULL | Practice specialty |
| `website_url` | TEXT | NULLABLE | NULL | Organization website |
| `logo_url` | TEXT | NULLABLE | NULL | Organization logo URL |
| `industry` | TEXT | NULLABLE | NULL | Industry type |
| `company_size` | TEXT | NULLABLE | NULL | Company size category |
| `founded_date` | DATE | NULLABLE | NULL | When organization was founded |
| `billing_email` | TEXT | NULLABLE | NULL | Email for billing |
| `currency_code` | TEXT | NULLABLE | 'GBP' | ISO 4217 currency code |
| `locale` | TEXT | NULLABLE | 'en-GB' | Locale for formatting |
| `billing_plan` | TEXT | NULLABLE | 'starter' | CHECK: `IN ('trial', 'starter', 'professional', 'enterprise')` |
| `subscription_status` | TEXT | NULLABLE | 'trial' | CHECK: `IN ('trial', 'active', 'suspended', 'cancelled', 'past_due')` |
| `max_users` | INTEGER | NULLABLE | 5 | Maximum users allowed |
| `max_locations` | INTEGER | NULLABLE | 1 | Maximum locations allowed |
| `feature_flags` | JSONB | NULLABLE | '{}' | Feature flags for this tenant |
| `metadata` | JSONB | NULLABLE | '{}' | Additional metadata |
| `dental_group_id` | UUID | NULLABLE | NULL | Parent group ID (for multi-location groups) |
| `location_name` | TEXT | NULLABLE | NULL | Location name within group |
| `subdomain` | TEXT | NULLABLE | NULL | Unique subdomain |
| `custom_domain` | TEXT | NULLABLE | NULL | Custom domain |
| `verified_at` | TIMESTAMPTZ | NULLABLE | NULL | Domain verification timestamp |
| `verification_method` | TEXT | NULLABLE | NULL | Verification method |
| `verified_by_user_id` | UUID | NULLABLE | NULL | REFERENCES `app_users(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NULLABLE | NOW() | Last update timestamp |

**Primary Key:** `id`

**Foreign Keys:**
- `dental_group_id` → `tenants(id)` (self-reference for groups)
- `verified_by_user_id` → `app_users(id)` ON DELETE SET NULL

**Indexes:**
- Unique index on `subdomain` (if exists)
- Unique index on `custom_domain` (if exists)

**Constraints:**
- `account_type` must be 'organization' or 'solo'
- `billing_plan` must be one of: 'trial', 'starter', 'professional', 'enterprise'
- `subscription_status` must be one of: 'trial', 'active', 'suspended', 'cancelled', 'past_due'

**Triggers:**
- `update_tenants_updated_at` - Auto-updates `updated_at` on UPDATE

---

### 4. `locations`

**Purpose:** Physical locations (branches, offices, clinics) within an organization.

**File:** `supabase/migrations/20251025_003a_locations_table.sql` (lines 49-74)

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY |
| `tenant_id` | UUID | NOT NULL | - | REFERENCES `tenants(id)` ON DELETE CASCADE |
| `name` | TEXT | NOT NULL | - | Location name (unique per tenant) |
| `display_name` | TEXT | NULLABLE | NULL | Display name for UI |
| `code` | TEXT | NULLABLE | NULL | Short code (e.g., "DT, WEST") |
| `address` | TEXT | NULLABLE | NULL | Street address |
| `address_line1` | TEXT | NULLABLE | NULL | Alternative address field |
| `address_line2` | TEXT | NULLABLE | NULL | Address line 2 |
| `city` | TEXT | NULLABLE | NULL | City |
| `state` | TEXT | NULLABLE | NULL | State/Province |
| `postal_code` | TEXT | NULLABLE | NULL | Postal/ZIP code |
| `country` | TEXT | NULLABLE | 'UK' | Country code |
| `phone` | TEXT | NULLABLE | NULL | Phone number |
| `phone_number` | TEXT | NULLABLE | NULL | Alternative phone field |
| `email` | TEXT | NULLABLE | NULL | Location email |
| `website_url` | TEXT | NULLABLE | NULL | Location website |
| `timezone` | TEXT | NOT NULL | 'Europe/London' | Location timezone |
| `currency` | TEXT | NULLABLE | 'GBP' | Currency code |
| `language` | TEXT | NULLABLE | 'en' | Language code |
| `location_type` | TEXT | NULLABLE | NULL | CHECK: `IN ('headquarters', 'branch', 'clinic', 'mobile')` |
| `is_active` | BOOLEAN | NOT NULL | TRUE | Whether location is active |
| `is_primary` | BOOLEAN | NOT NULL | FALSE | Whether this is the primary location |
| `operating_hours` | JSONB | NULLABLE | '{}' | Operating hours (structured) |
| `settings` | JSONB | NULLABLE | '{}' | Location-specific settings |
| `settings_overrides` | JSONB | NULLABLE | '{}' | Settings that override org defaults |
| `metadata` | JSONB | NULLABLE | '{}' | Additional metadata |
| `created_by` | UUID | NULLABLE | NULL | REFERENCES `app_users(id)` ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | NOW() | Last update timestamp |

**Primary Key:** `id`

**Foreign Keys:**
- `tenant_id` → `tenants(id)` ON DELETE CASCADE
- `created_by` → `app_users(id)` ON DELETE SET NULL

**Unique Constraints:**
- `locations_tenant_id_name_key`: UNIQUE(`tenant_id`, `name`) - One location name per tenant

**Check Constraints:**
- `locations_name_check`: `length(trim(name)) > 0` - Name cannot be empty
- `location_type` must be one of: 'headquarters', 'branch', 'clinic', 'mobile'

**Indexes:**
- `idx_locations_tenant` ON `locations(tenant_id)`
- `idx_locations_tenant_active` ON `locations(tenant_id, is_active)` WHERE `is_active = true`
- `idx_locations_tenant_primary_unique` ON `locations(tenant_id)` WHERE `is_primary = true` (UNIQUE)
- `idx_locations_name` ON `locations(tenant_id, name)`
- `idx_locations_code` ON `locations(tenant_id, code)` WHERE `code IS NOT NULL`
- `idx_locations_geo` ON `locations(country, city)` WHERE `is_active = true`
- `idx_locations_created_by` ON `locations(created_by)` WHERE `created_by IS NOT NULL`
- `idx_locations_created_at` ON `locations(created_at DESC)`

**Triggers:**
- `trigger_locations_updated_at` - Auto-updates `updated_at` on UPDATE

**Critical Analysis:**

**Q: What is the default location named?**
**A:** When an organization is created via `/api/orgs/create`, the default location is named "Main Office" (see `src/app/api/orgs/create/route.ts` line 243).

**Q: Is it marked as "default" anywhere?**
**A:** The location uses `is_primary = true` to mark it as the primary location. There is no explicit "default" flag, but the first location created is typically marked as `is_primary`.

**Q: Can it be deleted?**
**A:** Yes, locations can be deleted. RLS policy "Tenant owners can delete locations" allows owners to delete any location in their tenant.

---

### 5. `user_tenant_memberships`

**Purpose:** Many-to-many relationship between users and tenants. Enables multi-org membership (one user can belong to multiple organizations).

**File:** `supabase/migrations/20251025_001_user_tenant_memberships.sql` (lines 51-79)

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | UUID | NOT NULL | - | REFERENCES `auth.users(id)` ON DELETE CASCADE |
| `tenant_id` | UUID | NOT NULL | - | REFERENCES `tenants(id)` ON DELETE CASCADE |
| `role` | `membership_role` | NOT NULL | - | ENUM: `('owner', 'admin', 'manager', 'staff', 'viewer')` |
| `status` | `membership_status` | NOT NULL | 'active' | ENUM: `('active', 'inactive', 'suspended')` |
| `all_locations` | BOOLEAN | NULLABLE | NULL | Whether user has access to all locations |
| `invited_by` | UUID | NULLABLE | NULL | REFERENCES `app_users(id)` ON DELETE SET NULL |
| `invited_at` | TIMESTAMPTZ | NULLABLE | NULL | When invitation was sent |
| `joined_at` | TIMESTAMPTZ | NOT NULL | NOW() | When user joined the organization |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | NOW() | Last update timestamp |

**Primary Key:** `id`

**Foreign Keys:**
- `user_id` → `auth.users(id)` ON DELETE CASCADE
- `tenant_id` → `tenants(id)` ON DELETE CASCADE
- `invited_by` → `app_users(id)` ON DELETE SET NULL

**Unique Constraints:**
- UNIQUE(`user_id`, `tenant_id`) - User can only have one membership per organization

**Check Constraints:**
- `invited_at IS NULL OR joined_at >= invited_at` - User must join after invitation

**Custom Types:**
- `membership_role` ENUM: 'owner', 'admin', 'manager', 'staff', 'viewer'
- `membership_status` ENUM: 'active', 'inactive', 'suspended'

**Indexes:**
- `idx_memberships_user_id` ON `user_tenant_memberships(user_id)`
- `idx_memberships_tenant_id` ON `user_tenant_memberships(tenant_id)`
- `idx_memberships_user_tenant` ON `user_tenant_memberships(user_id, tenant_id)`
- `idx_memberships_user_active` ON `user_tenant_memberships(user_id, status)` WHERE `status = 'active'`
- `idx_memberships_invited_by` ON `user_tenant_memberships(invited_by)` WHERE `invited_by IS NOT NULL`
- `idx_memberships_joined_at` ON `user_tenant_memberships(joined_at DESC)`
- `idx_memberships_tenant_status` ON `user_tenant_memberships(tenant_id, status)`

**Triggers:**
- `trigger_memberships_updated_at` - Auto-updates `updated_at` on UPDATE

**Critical Analysis:**

**Q: How are multiple org memberships stored?**
**A:** Each membership is a separate row in `user_tenant_memberships`. A user with 3 organizations will have 3 rows, each with a different `tenant_id` but the same `user_id`.

**Q: How are location-specific roles stored?**
**A:** The `all_locations` boolean indicates if the user has access to all locations. For location-specific access, there is a separate `membership_locations` table (not documented here, but referenced in migrations).

**Q: What role is assigned to org creator?**
**A:** When an organization is created via `/api/orgs/create`, the creator is assigned role `'owner'` (see `src/app/api/orgs/create/route.ts` line 317).

---

### 6. `onboarding_progress`

**Purpose:** Tracks user progress through the onboarding wizard. Stores field data for each step to allow resuming.

**File:** `supabase/migrations/20251026_02_onboarding_field_config.sql` (lines 109-132)

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | UUID | NOT NULL | - | REFERENCES `app_users(id)` ON DELETE CASCADE |
| `tenant_id` | UUID | NOT NULL | - | REFERENCES `tenants(id)` ON DELETE CASCADE |
| `step_name` | TEXT | NOT NULL | - | Step ID (e.g., 'profile_setup', 'organization_setup') |
| `completed` | BOOLEAN | NOT NULL | FALSE | Whether step is marked complete |
| `completed_at` | TIMESTAMPTZ | NULLABLE | NULL | When step was completed |
| `skipped` | BOOLEAN | NOT NULL | FALSE | Whether user skipped this step |
| `skipped_at` | TIMESTAMPTZ | NULLABLE | NULL | When step was skipped |
| `is_required` | BOOLEAN | NOT NULL | TRUE | Whether step is required |
| `field_data` | JSONB | NOT NULL | '{}' | Saved field data for this step |
| `data` | JSONB | NOT NULL | '{}' | Legacy field (same as field_data) |
| `validation_errors` | JSONB | NOT NULL | '[]' | Validation errors for this step |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |

**Primary Key:** `id`

**Foreign Keys:**
- `user_id` → `app_users(id)` ON DELETE CASCADE
- `tenant_id` → `tenants(id)` ON DELETE CASCADE

**Unique Constraints:**
- UNIQUE(`user_id`, `step_name`) - One progress record per user per step

**Indexes:**
- `idx_onboarding_progress_user` ON `onboarding_progress(user_id)`

**Critical Analysis:**

**Q: Where is progress stored?**
**A:** Progress is stored in `onboarding_progress` table. Each step has its own row with `step_name`, `field_data` (JSONB), and completion status.

**Q: What is saved?**
**A:** The `field_data` JSONB column stores all form field values for that step. Example: `{"name": "ABC Dental", "description": "Dental practice"}` for `organization_setup` step.

**Q: Can users skip wizard?**
**A:** Yes, steps can be skipped if `isSkippable: true` is set in the step configuration. Skipped steps are marked with `skipped = true` and `skipped_at` timestamp.

---

## Relationships Diagram

```
┌─────────────────┐
│   auth.users    │
│  (Supabase)     │
└────────┬────────┘
         │
         │ 1:1 (id)
         │
         ▼
┌─────────────────┐
│   app_users     │
│  - tenant_id    │◄──────────┐ (legacy)
│  - active_tenant_id         │
└────────┬────────┘           │
         │                     │
         │ N:1                 │ N:1
         │                     │
         ▼                     │
┌─────────────────┐           │
│    tenants      │◄──────────┘
│  (organizations)│
└────────┬────────┘
         │
         │ 1:N
         │
         ▼
┌─────────────────┐
│   locations     │
└─────────────────┘

┌─────────────────┐      ┌──────────────────┐
│   auth.users    │      │     tenants       │
└────────┬────────┘      └────────┬──────────┘
         │                        │
         │                        │
         │ N                      │ N
         │                        │
         └──────────┬─────────────┘
                    │
                    │ N:M (via user_tenant_memberships)
                    │
                    ▼
     ┌──────────────────────────┐
     │ user_tenant_memberships  │
     │ - user_id                │
     │ - tenant_id              │
     │ - role                   │
     │ - status                 │
     └──────────────────────────┘

┌─────────────────┐      ┌──────────────────┐
│   app_users     │      │     tenants       │
└────────┬────────┘      └────────┬──────────┘
         │                        │
         │ N                      │ N
         │                        │
         └──────────┬─────────────┘
                    │
                    │ N:M (via onboarding_progress)
                    │
                    ▼
     ┌──────────────────────────┐
     │  onboarding_progress     │
     │ - user_id                │
     │ - tenant_id              │
     │ - step_name              │
     │ - field_data (JSONB)     │
     └──────────────────────────┘
```

---

## Circular Dependencies

**None identified.** The schema follows a clear hierarchy:
1. `auth.users` (top-level, no dependencies)
2. `app_users` (depends on `auth.users`)
3. `tenants` (independent)
4. `locations` (depends on `tenants`)
5. `user_tenant_memberships` (depends on `auth.users` and `tenants`)
6. `onboarding_progress` (depends on `app_users` and `tenants`)

---

## Additional Tables

### Invites/Invitations

There are multiple invitation-related tables mentioned in migrations:
- `user_invitations` - Pending invitations
- `pending_invites` - Alternative invitation tracking

These are not fully documented here but are part of the user onboarding flow.

---

## Key Insights

1. **Multi-Tenancy Model:** The system supports multiple organizations per user via `user_tenant_memberships`. The `active_tenant_id` field in `app_users` tracks the current session context.

2. **Legacy Fields:** The `app_users.tenant_id` field is legacy but still required (NOT NULL constraint). This can cause issues during signup if not handled properly.

3. **Location Hierarchy:** Locations belong to tenants. Users can have different roles in different locations via `membership_locations` table (referenced but not fully documented here).

4. **Onboarding State:** Onboarding progress is stored in `onboarding_progress` with JSONB field data. This allows resuming the wizard.

5. **RLS Enforcement:** All tenant-scoped tables use Row-Level Security (RLS) to enforce data isolation. Policies check `active_tenant_id` or membership status.

---

## Migration Notes

The schema has evolved through multiple migrations. Key changes:
- `app_users.tenant_id` was originally NOT NULL, but signup flow now creates users without tenant
- `active_tenant_id` was added later to support multi-org switching
- `user_tenant_memberships` was added to support multiple org memberships
- `onboarding_progress` was added to track wizard state














