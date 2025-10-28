# 🎯 CONFIRMED REQUIREMENTS & IMPLEMENTATION PLAN

**Date:** October 27, 2025  
**Status:** Requirements Confirmed, Ready to Implement  
**Principle:** Perfection Over Speed

---

## ✅ **CONFIRMED REQUIREMENTS**

### **1. Invite System**
- ✅ **Expiration:** 7 days
- ✅ **Code Format:** 6-character alphanumeric (e.g., "A3X7K9")
- ✅ **Role Assignment:** 
  - **When Inviting:** Admin sets role BEFORE sending invite
  - **When Accepting:** Admin assigns role BEFORE approving join request
  - ❌ **NO default "staff" role** - explicit assignment required

### **2. Onboarding Flow**
- ✅ **Existing System:** Full onboarding wizard exists (31 files found)
- ✅ **User Profile:** `user-profile-editor.tsx` exists in settings
- ✅ **Steps:** Multi-step wizard with personal info, business settings, etc.
- ⚠️ **Action Required:** Audit existing onboarding to determine if we modify or rebuild

### **3. Orphaned Users**
- ✅ **Approach:** Normal workflow (no special admin tool)
- ✅ **Flow:** Guide them through invite/create org like new users

---

## 🔍 **DISCOVERY: EXISTING ONBOARDING SYSTEM**

### **Components Found:**
```
src/components/onboarding/
├── enhanced-onboarding-wizard.tsx  ← Main wizard
├── multi-org-onboarding.tsx        ← Multi-org support
├── profile-setup-panel.tsx         ← Profile setup
├── organization-discovery.tsx      ← Org discovery
├── steps/
│   ├── personal-info-step.tsx
│   ├── business-settings-step.tsx
│   ├── company-info-step.tsx
│   ├── first-location-step.tsx
│   ├── email-verification-step.tsx
│   ├── contact-info-step.tsx
│   ├── work-preferences-step.tsx
│   ├── security-settings-step.tsx
│   ├── communication-settings-step.tsx
│   └── legal-details-step.tsx
└── setup-banner.tsx

src/app/onboarding/page.tsx         ← Main onboarding page
```

### **API Endpoints Found:**
```
/api/onboarding/status              ← Check onboarding status
/api/onboarding/config              ← Get onboarding configuration
/api/onboarding/validate-step       ← Validate step data
/api/onboarding/save-progress       ← Save progress
/api/onboarding/skip-step           ← Skip optional steps
/api/onboarding/resume              ← Resume onboarding
/api/onboarding/complete            ← Mark complete
/api/onboarding/admin/steps         ← Admin: manage steps
/api/onboarding/admin/field-config  ← Admin: field configuration
```

### **✅ VERDICT:**
**Existing onboarding is comprehensive!** We should:
1. **Audit** existing flow to understand current behavior
2. **Extend** it with org decision fork (not rebuild)
3. **Add** invite detection at the start
4. **Integrate** with new pending_invites system

---

## 📋 **REVISED IMPLEMENTATION PLAN**

### **PHASE 0: Discovery & Audit** ⏳ (FIRST)
**Goal:** Understand existing onboarding flow before modifying

#### **Tasks:**
1. ✅ Read `src/app/onboarding/page.tsx` - Main entry point
2. ✅ Read `enhanced-onboarding-wizard.tsx` - Core wizard logic
3. ✅ Read `multi-org-onboarding.tsx` - Multi-org integration
4. ✅ Read `/api/onboarding/status` - Status checking
5. ✅ Document current flow and identify integration points

**Deliverable:** `EXISTING_ONBOARDING_AUDIT.md` with:
- Current step sequence
- Where to inject invite detection
- Where to add org decision fork
- What to preserve vs modify

---

### **PHASE 1: Database Schema** ⏳
**Goal:** Create pending_invites table with role-based access

#### **Migration:** `20251027_004_pending_invites_system.sql`

**Schema Changes:**
```sql
CREATE TABLE pending_invites (
  id UUID PRIMARY KEY,
  invite_code TEXT UNIQUE NOT NULL,       -- 6-char code
  invited_email TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  
  -- ✅ NEW: Role assigned by inviter
  assigned_role TEXT NOT NULL CHECK (assigned_role IN ('owner', 'admin', 'manager', 'staff', 'viewer')),
  
  invited_by UUID REFERENCES app_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
  
  status TEXT CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  accepted_at TIMESTAMP,
  accepted_by UUID REFERENCES app_users(id)
);
```

**Key Points:**
- ✅ `assigned_role` is REQUIRED (not nullable)
- ✅ Role is set by inviter BEFORE sending
- ✅ No default role - explicit choice

---

### **PHASE 2: API Endpoints** ⏳

#### **2.1 POST /api/invites/create**
**Purpose:** Admin creates invite with explicit role

```typescript
Body: {
  email: string,
  role: 'owner' | 'admin' | 'manager' | 'staff' | 'viewer', // REQUIRED
  personal_message?: string
}

Validations:
- User must be admin/owner of tenant
- Email validation
- Role must be specified (no default)
- Generate unique 6-char code
- Set expiration to 7 days from now

Returns: {
  success: true,
  invite_code: "A3X7K9",
  expires_at: "2025-11-03T..."
}
```

#### **2.2 POST /api/invites/check-pending**
**Purpose:** Check for pending invites by email

```typescript
Body: { email: string }

Returns: {
  has_invite: boolean,
  invites: Array<{
    id: string,
    invite_code: string,
    tenant_name: string,
    assigned_role: string,  // ← Show role in UI
    invited_by_name: string,
    expires_at: string
  }>
}
```

#### **2.3 POST /api/invites/accept**
**Purpose:** Accept invite (creates membership with pre-assigned role)

```typescript
Body: { invite_id: string } OR { invite_code: string }

Process:
1. Validate invite not expired
2. Verify email matches
3. Create user_tenant_membership with assigned_role
4. Set active_tenant_id, active_location_id
5. Mark invite as accepted

Returns: {
  success: true,
  tenant_id: string,
  role: string  // ← The role they were assigned
}
```

#### **2.4 POST /api/invites/request-join**
**Purpose:** User requests to join org (admin approval required)

```typescript
Body: {
  tenant_id?: string,      // If they know the org
  invite_code?: string,     // Or have a code
  reason?: string          // Optional message
}

Creates: pending_join_request (new table needed?)

OR: Simpler approach - just use invite codes (no open requests)
```

**⚠️ DECISION NEEDED:** Do we want "request to join" feature or only invite-only?

#### **2.5 POST /api/orgs/create**
**Purpose:** Solo user creates their own organization

```typescript
Body: {
  name: string,
  location_name?: string
}

Process:
1. Create tenant
2. Create default location
3. Create membership (role: 'owner', all_locations: true)
4. Set active_tenant_id, active_location_id

Returns: {
  success: true,
  tenant_id: string,
  location_id: string
}
```

---

### **PHASE 3: UI Components** ⏳

#### **3.1 Invite Detection Banner**
**File:** `src/components/onboarding/invite-detection-banner.tsx`

**Features:**
- Shows pending invites on onboarding page
- Displays: org name, inviter name, **assigned role**
- Actions: "Accept" or "Decline & Create My Own"
- Multiple invites: show all, user picks one

**UI:**
```
┌────────────────────────────────────────────────────┐
│ 🎉 You've Been Invited!                            │
│                                                     │
│ John Smith invited you to join                     │
│ "Acme Dental Practice" as an Admin                 │
│                                                     │
│ "We'd love to have you on our team!"               │
│                                                     │
│ [Accept Invitation]  [Create My Own Organization]  │
└────────────────────────────────────────────────────┘
```

#### **3.2 Create Organization Modal**
**File:** `src/components/onboarding/create-org-modal.tsx`

**Triggers:**
- User clicks "Create My Own" from invite banner
- User clicks "Create Organization" from settings
- User has no active_tenant_id and no pending invites

**Fields:**
- Organization Name (required)
- Primary Location Name (default: "Main Office")

#### **3.3 Join with Code Modal**
**File:** `src/components/onboarding/join-with-code-modal.tsx`

**Features:**
- 6-character code input (auto-uppercase)
- Validates code on submit
- Shows org name and assigned role after validation
- "Confirm" button to accept

**UI:**
```
┌────────────────────────────────┐
│ Join with Invite Code          │
│                                 │
│ Enter 6-character code:         │
│ ┌─────────────────────────────┐│
│ │     A 3 X 7 K 9            ││
│ └─────────────────────────────┘│
│                                 │
│ [Join Organization] [Cancel]   │
└────────────────────────────────┘
```

#### **3.4 Onboarding Page Updates**
**File:** `src/app/onboarding/page.tsx` (modify existing)

**Flow:**
```typescript
1. Check for pending invites (via API)
2. IF has_invite:
     → Show InviteDetectionBanner
     → User accepts → join org → redirect to dashboard
     → User declines → continue to step 3
3. ELSE:
     → Show "Create Organization" prompt
     → OR "Enter Invite Code" option
4. User creates org OR joins with code
5. Redirect to dashboard
```

---

### **PHASE 4: Navigation Blocking** ⏳

#### **4.1 Middleware Update**
**File:** `src/middleware.ts`

```typescript
const ALLOWED_WITHOUT_ORG = [
  '/sign-in',
  '/sign-up',
  '/onboarding',
  '/settings',      // ← Allow settings
  '/api',
  '/_next',
]

export async function middleware(request: NextRequest) {
  // ... existing auth check
  
  // Check if user has active_tenant_id
  const { data: appUser } = await supabase
    .from('app_users')
    .select('active_tenant_id')
    .eq('id', user.id)
    .single()
  
  if (!appUser?.active_tenant_id) {
    // Redirect to onboarding if trying to access protected pages
    if (!ALLOWED_WITHOUT_ORG.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(
        new URL('/onboarding?reason=no-org', request.url)
      )
    }
  }
  
  return NextResponse.next()
}
```

#### **4.2 "Create Contact" Button Guard**
**Example:** `src/components/contacts/create-contact-button.tsx`

```typescript
export function CreateContactButton() {
  const { appUser } = useAuth()
  const [showOrgModal, setShowOrgModal] = useState(false)
  
  const handleClick = () => {
    if (!appUser?.active_tenant_id) {
      setShowOrgModal(true)
      return
    }
    // Normal create flow
  }
  
  return (
    <>
      <Button onClick={handleClick}>
        <Plus /> New Contact
      </Button>
      
      {showOrgModal && (
        <FriendlyOrgPromptModal
          isOpen={showOrgModal}
          onClose={() => setShowOrgModal(false)}
        />
      )}
    </>
  )
}
```

#### **4.3 Friendly Org Prompt Modal**
**File:** `src/components/modals/friendly-org-prompt-modal.tsx`

**UI:**
```
┌──────────────────────────────────────────────┐
│ Create Your Organization First               │
│                                               │
│ To start managing contacts and deals, you    │
│ need to create an organization.               │
│                                               │
│ [Create Organization]  [Join with Code]      │
│                                               │
│ [Cancel]                                      │
└──────────────────────────────────────────────┘
```

---

### **PHASE 5: Settings Integration** ⏳

#### **5.1 Settings → Organizations → Invite Members**
**File:** `src/app/settings/organizations/invite/page.tsx` (new)

**Features:**
- Enter email address
- **Select role** (dropdown: owner/admin/manager/staff/viewer) ← REQUIRED
- Optional personal message
- Generate invite code
- Copy code to clipboard
- Email invite (optional feature)

**UI:**
```
┌────────────────────────────────────────────────┐
│ Invite Team Member                             │
│                                                 │
│ Email Address:                                  │
│ ┌─────────────────────────────────────────────┐│
│ │ john@example.com                            ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ Assign Role: *                                  │
│ ┌─────────────────────────────────────────────┐│
│ │ [v] Staff                                   ││
│ │     Owner                                   ││
│ │     Admin                                   ││
│ │     Manager                                 ││
│ │     Staff                                   ││
│ │     Viewer                                  ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ Personal Message (optional):                    │
│ ┌─────────────────────────────────────────────┐│
│ │ Welcome to the team!                        ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ [Send Invitation]                               │
└────────────────────────────────────────────────┘

After sending:
┌────────────────────────────────────────────────┐
│ ✅ Invitation Sent!                             │
│                                                 │
│ Invite Code: A3X7K9                             │
│ [Copy Code]                                     │
│                                                 │
│ Share this code with john@example.com           │
│ Expires in 7 days                               │
└────────────────────────────────────────────────┘
```

---

### **PHASE 6: Cleanup** ⏳

#### **6.1 Deprecate Auto-Tenant Trigger**
**File:** `supabase/migrations/20251027_005_deprecate_auto_tenant.sql`

```sql
-- Remove auto-tenant creation trigger
DROP TRIGGER IF EXISTS trg_auto_create_tenant ON app_users;
DROP FUNCTION IF EXISTS handle_new_user_tenant_onboarding();

-- Add comment explaining why
COMMENT ON TABLE app_users IS 'Users sign up without tenant. Must explicitly create or join org via onboarding.';
```

#### **6.2 Guide Orphaned Users**
**Manual Task:**
1. Identify users with `active_tenant_id = NULL`
2. Send email: "Complete your setup - Create or join an organization"
3. They go through normal onboarding flow
4. No special treatment

---

## 🎯 **IMPLEMENTATION SEQUENCE**

### **Step 1: Audit Existing Onboarding** ← START HERE
- [ ] Read existing onboarding files
- [ ] Document current flow
- [ ] Identify integration points
- [ ] Create `EXISTING_ONBOARDING_AUDIT.md`

### **Step 2: Database**
- [ ] Create pending_invites table
- [ ] Add RLS policies
- [ ] Test code generation
- [ ] Test expiration trigger

### **Step 3: Core APIs**
- [ ] `/api/invites/create` (with role)
- [ ] `/api/invites/check-pending`
- [ ] `/api/invites/accept`
- [ ] `/api/orgs/create`

### **Step 4: UI Components**
- [ ] Invite detection banner
- [ ] Create org modal
- [ ] Join with code modal
- [ ] Friendly prompt modal

### **Step 5: Integration**
- [ ] Update onboarding page
- [ ] Add middleware guard
- [ ] Add button guards (contacts, deals, etc.)
- [ ] Settings invite flow

### **Step 6: Cleanup**
- [ ] Remove auto-tenant trigger
- [ ] Test with orphaned users
- [ ] Documentation

---

## ❓ **OPEN QUESTION FOR YOU**

**Join Requests:** Do you want users to be able to "request to join" an organization (requires admin approval), or should it be **invite-only**?

**Option A: Invite-Only** (Simpler)
- Users can ONLY join if they have an invite code or pending invite
- No "browse orgs" or "request to join" feature
- More controlled

**Option B: Request to Join** (More Complex)
- Users can search for organizations
- Send join request with message
- Admin approves/denies and assigns role
- More flexible, but needs approval workflow

**My Recommendation:** Start with **Option A (Invite-Only)** for simplicity and security. Add Option B later if needed.

---

## 📊 **NEXT IMMEDIATE ACTION**

1. **You confirm:** Invite-only vs request-to-join?
2. **I execute:** Phase 0 (audit existing onboarding)
3. **I provide:** Detailed audit report
4. **We proceed:** Phase 1-6 implementation

**Ready to start Phase 0 audit now! Shall I proceed?** 🚀

