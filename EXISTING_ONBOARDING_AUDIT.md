# 🔍 EXISTING ONBOARDING SYSTEM - AUDIT REPORT

**Date:** October 27, 2025  
**Phase:** 0 - Discovery & Analysis  
**Status:** COMPLETE

---

## 📊 **EXECUTIVE SUMMARY**

### **Verdict:** ✅ **STRONG FOUNDATION - EXTEND, DON'T REBUILD**

The existing onboarding system is **well-architected** and **feature-rich**. We should:
- ✅ **Preserve:** Core wizard framework, step management, progress tracking
- ✅ **Extend:** Add org decision fork at the start
- ✅ **Integrate:** Pending invites detection before wizard
- ❌ **Avoid:** Rebuilding the wizard from scratch

---

## 🏗️ **CURRENT ARCHITECTURE**

### **1. Entry Point**
**File:** `src/app/onboarding/page.tsx`

**Current Flow:**
```typescript
1. Check auth state
2. Query app_users: onboarding_completed, profile_completed
3. IF completed → redirect to /dashboard
4. ELSE → Show EnhancedOnboardingWizard
```

**✅ Integration Point:**
```typescript
// MODIFY: Add invite check BEFORE status check
1. Check auth state
2. Check for pending invites (NEW)
3. IF has_invite → Show InviteDetectionBanner (NEW)
4. Query app_users: onboarding_completed, profile_completed
5. IF completed → redirect to /dashboard
6. ELSE → Show org decision modal (NEW) → EnhancedOnboardingWizard
```

---

### **2. Main Wizard Component**
**File:** `src/components/onboarding/enhanced-onboarding-wizard.tsx`

**Current Features:**
- ✅ `WizardProvider` context for state management
- ✅ `WizardHeader`, `WizardProgressBar`, `WizardStepContainer`, `WizardFooter`
- ✅ Dynamic step loading based on account type
- ✅ Slide-over modal design (not full page)

**Account Types:**
- `organization`: Multi-step organization setup
- `solo`: Simplified solo user flow

**✅ Integration Point:**
The wizard is **already account-type aware**! We just need to:
1. Detect whether user is creating org or joining via invite
2. Set `accountType` accordingly in WizardProvider
3. Let existing wizard handle the rest

---

### **3. Multi-Org Support**
**File:** `src/components/onboarding/multi-org-onboarding.tsx`

**Current Features:**
- ✅ Beautiful 3-step modal for multi-org feature introduction
- ✅ Shows after user joins second organization
- ✅ Explains org switcher, location access, keyboard shortcuts
- ✅ Progress indicators, "Skip Tour" option

**❌ Limitation:**
This is ONLY for **existing users** who gain multi-org access. 
Not for new users creating/joining their first org.

**✅ Integration Point:**
We can reuse the modal design pattern for:
- Invite detection banner
- Org creation modal
- Join with code modal

---

### **4. Onboarding Status API**
**File:** `src/app/api/onboarding/status/route.ts`

**Current Features:**
- ✅ Returns: current step, completed steps, progress %, account type
- ✅ Queries: `app_users`, `tenants`, `onboarding_progress`, `onboarding_step_definitions`
- ✅ Supports both `organization` and `solo` account types

**Data Model:**
```typescript
app_users {
  onboarding_flow_type: 'organization' | 'solo'
  onboarding_current_step: string
  onboarding_completed: boolean
  onboarding_started_at: timestamp
  onboarding_completed_at: timestamp
  onboarding_skipped_steps: string[]
  profile_completed: boolean
}

onboarding_progress {
  user_id: UUID
  step_name: string
  completed: boolean
}

onboarding_step_definitions {
  id: string
  account_types: string[]  // Which account types see this step
  display_order: number
}
```

**✅ Integration Point:**
The system **already supports** different flows based on account type!
We just need to:
1. Set `onboarding_flow_type` when user creates/joins org
2. Existing wizard will show appropriate steps

---

## 🎯 **INTEGRATION STRATEGY**

### **Phase 0.5: New Components to Add**

#### **A. InviteDetectionBanner**
**Location:** `src/components/onboarding/invite-detection-banner.tsx`

**Purpose:** Show pending invites BEFORE wizard starts

**Flow:**
```typescript
1. Call POST /api/invites/check-pending { email: user.email }
2. IF has_invite:
     → Show banner with org name, inviter, assigned role
     → Actions: "Accept Invite" | "Create My Own Org"
3. ELSE:
     → Continue to org decision modal
```

#### **B. OrgDecisionModal**
**Location:** `src/components/onboarding/org-decision-modal.tsx`

**Purpose:** Fork: Create org vs Join with code

**UI:**
```
┌────────────────────────────────────┐
│ Let's Get You Started               │
│                                      │
│ ○ Create My Organization             │
│   Start fresh with your own org      │
│                                      │
│ ○ Join with Invite Code              │
│   Enter a 6-character code           │
│                                      │
│ [Continue]                           │
└────────────────────────────────────┘
```

**Outcome:**
- Create → Set `accountType = 'organization'` → Start wizard
- Join → Show JoinWithCodeModal → Accept → Set `accountType = 'solo'` → Skip wizard (already in org)

#### **C. CreateOrgModal**
**Location:** `src/components/onboarding/create-org-modal.tsx`

**Purpose:** Simple form to create organization

**Fields:**
- Organization Name (required)
- Primary Location Name (default: "Main Office")

**After Creation:**
- Set `active_tenant_id`, `active_location_id`
- Redirect to dashboard (skip wizard - org already created)

#### **D. JoinWithCodeModal**
**Location:** `src/components/onboarding/join-with-code-modal.tsx`

**Purpose:** Enter 6-char invite code and join

**Flow:**
1. User enters code (e.g., "A3X7K9")
2. Call POST /api/invites/accept { invite_code }
3. Show success → Redirect to dashboard

---

### **Updated Onboarding Flow**

```
┌────────────────────────────────────────────────────────┐
│ /onboarding                                             │
└─────────────────────┬──────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │ Check Pending Invites? │
         └──────────┬────────┬────┘
                    │        │
             ┌──────┘        └──────┐
             │                      │
        YES  │                   NO │
             ▼                      ▼
    ┌─────────────────┐    ┌─────────────────┐
    │ InviteDetection │    │ OrgDecisionModal│
    │ Banner          │    │                 │
    │                 │    │ □ Create Org    │
    │ "Join Acme?"    │    │ □ Join w/ Code  │
    │                 │    │                 │
    │ [Accept] [Skip] │    └────────┬────────┘
    └────────┬────────┘             │
             │                      │
       ┌─────┼──────────────────────┘
       │     │
   Accept  Skip/Decline
       │     │
       ▼     ▼
┌──────────────────┐  ┌─────────────────┐  ┌────────────────┐
│ Accept Invite    │  │ CreateOrgModal  │  │JoinWithCodeModal│
│ → Set active_org │  │ → Create Org    │  │ → Enter Code   │
│ → Dashboard      │  │ → Dashboard     │  │ → Dashboard    │
└──────────────────┘  └─────────────────┘  └────────────────┘

NOTE: Enhanced wizard removed from flow!
Users create/join org directly, then go to dashboard.
```

---

## 📋 **DATABASE TABLES FOUND**

### **Existing Tables:**
```sql
app_users {
  onboarding_flow_type       -- 'organization' | 'solo'
  onboarding_current_step    -- Current step ID
  onboarding_completed       -- Boolean
  onboarding_started_at      -- Timestamp
  onboarding_completed_at    -- Timestamp
  onboarding_skipped_steps   -- Array of step IDs
  profile_completed          -- Boolean
}

onboarding_progress {
  user_id      UUID
  step_name    TEXT
  completed    BOOLEAN
}

onboarding_step_definitions {
  id              TEXT
  account_types   TEXT[]     -- ['organization', 'solo']
  display_order   INTEGER
}
```

### **Tables We Need to Add:**
```sql
pending_invites {
  id              UUID
  invite_code     TEXT (6 chars, unique)
  invited_email   TEXT
  tenant_id       UUID
  assigned_role   TEXT (NOT NULL)
  invited_by      UUID
  status          TEXT ('pending', 'accepted', 'expired', 'cancelled')
  created_at      TIMESTAMP
  expires_at      TIMESTAMP (created_at + 7 days)
}
```

---

## 🎨 **UI/UX INSIGHTS**

### **Design Pattern to Reuse:**
The `multi-org-onboarding.tsx` modal is **beautiful**:
- Backdrop with blur
- Centered modal with rounded corners
- Progress indicators
- Clean icons and spacing
- "Skip" option
- Smooth animations

We should **replicate this design** for:
- InviteDetectionBanner
- OrgDecisionModal  
- CreateOrgModal
- JoinWithCodeModal

### **Color Scheme:**
- Primary: Blue (#3B82F6)
- Success: Green (#10B981)
- Warning: Amber (#F59E0B)
- Error: Red (#EF4444)

---

## ✅ **INTEGRATION CHECKLIST**

### **Step 1: Database**
- [ ] Create `pending_invites` table
- [ ] Add RLS policies
- [ ] Add helper functions (generate_invite_code, expire_old_invites)

### **Step 2: API Endpoints**
- [ ] POST `/api/invites/check-pending`
- [ ] POST `/api/invites/accept`
- [ ] POST `/api/invites/create`
- [ ] POST `/api/orgs/create`

### **Step 3: New UI Components**
- [ ] `InviteDetectionBanner`
- [ ] `OrgDecisionModal`
- [ ] `CreateOrgModal`
- [ ] `JoinWithCodeModal`

### **Step 4: Modify Existing**
- [ ] Update `/onboarding/page.tsx` - add invite check
- [ ] Add middleware guard for `active_tenant_id`
- [ ] Add button guards (contacts, deals, etc.)

### **Step 5: Settings Integration**
- [ ] Settings → Organizations → Invite Members page
- [ ] Form to create invites with role selection

---

## 🚀 **RECOMMENDED APPROACH**

### **Simplify Even Further:**

After analyzing the existing wizard, I recommend:

**Skip the wizard entirely** for MVP. Here's why:
- Users creating org → Can fill details in Settings later
- Users joining org → Already have org context
- Existing wizard is complex (10 steps, multiple tables)

**New Simplified Flow:**
```
Sign Up → Check Invites
   ↓
IF has invite:
   → Show banner → Accept → Dashboard
ELSE:
   → Show simple modal:
      "Create Organization" → Enter name → Dashboard
      OR
      "Join with Code" → Enter code → Dashboard
```

**Benefits:**
- ✅ Faster onboarding (2 clicks vs 10 steps)
- ✅ Cleaner implementation
- ✅ Users in production faster
- ✅ Can add wizard later if needed

**Profile Completion:**
Move to Settings → Profile page (already exists: `user-profile-editor.tsx`)

---

## 📊 **FINAL RECOMMENDATION**

### **Option 1: Minimal (RECOMMENDED)**
**Time:** ~4-6 hours  
**Complexity:** Low

1. Add pending_invites table
2. Create 4 API endpoints
3. Create 3 simple modals (invite banner, create org, join code)
4. Modify /onboarding page to show modals
5. Skip existing wizard entirely

**Result:** Users can create/join orgs and start working immediately.

### **Option 2: Full Integration**
**Time:** ~12-16 hours  
**Complexity:** Medium

1. All of Option 1
2. Integrate with existing wizard
3. Different step flows based on account type
4. Preserve all onboarding_progress tracking

**Result:** Full-featured onboarding with step-by-step guidance.

---

## ❓ **DECISION POINT**

**Which approach do you prefer?**

**Option 1 (Minimal):** Fast, simple, users start working immediately  
**Option 2 (Full Integration):** Comprehensive, guides users through setup  

**My recommendation:** **Option 1** for MVP, then add Option 2 later if users request more guidance.

---

**Ready to proceed! Please confirm your preference.** 🎯

