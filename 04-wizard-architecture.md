# Onboarding Wizard - Architecture & Initialization

## Overview

This document analyzes the onboarding wizard architecture, including the WizardProvider context, initialization flow, configuration API, resume API, and step management.

---

## Wizard Provider

### Component Location

**File Path:** `src/contexts/wizard-context.tsx`

**Provider Component:** `WizardProvider` (line 80)

**Hook:** `useWizard()` (line 364)

---

## WizardProvider Component

### State Variables

**File:** `src/contexts/wizard-context.tsx` (lines 80-90)

```typescript
const [currentStep, setCurrentStep] = useState(1);
const [accountType, setAccountType] = useState<'organization' | 'solo'>('organization');
const [steps, setSteps] = useState<WizardStep[]>([]);
const [formData, setFormData] = useState<WizardFormData>({});
const [completedSteps, setCompletedSteps] = useState<string[]>([]);
const [skippedSteps, setSkippedSteps] = useState<string[]>([]);
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
```

**State Summary:**

- `currentStep`: Current step index (1-based)
- `accountType`: 'organization' or 'solo'
- `steps`: Array of wizard step configurations
- `formData`: Nested object: `{ [stepId]: { [fieldName]: value } }`
- `completedSteps`: Array of completed step IDs
- `skippedSteps`: Array of skipped step IDs
- `loading`: Whether wizard is initializing
- `saving`: Whether progress is being saved
- `hasUnsavedChanges`: Whether form has unsaved changes
- `validationErrors`: Array of validation errors

---

## Exposed Functions

### Context Interface

**File:** `src/contexts/wizard-context.tsx` (lines 41-76)

```typescript
export interface WizardContextType {
  // State (all state variables listed above)

  // Progress
  progressPercentage: number;
  currentStepId: string;
  currentStepData: WizardStep | null;

  // Actions
  setCurrentStep: (step: number) => void;
  goToNext: () => Promise<boolean>;
  goToPrevious: () => void;
  updateFieldValue: (fieldName: string, value: any) => void;
  saveStepData: (stepId: string, data: any, complete?: boolean) => Promise<boolean>;
  validateCurrentStep: () => Promise<boolean>;
  skipCurrentStep: () => Promise<boolean>;
  completeWizard: () => Promise<boolean>;
  resumeWizard: () => Promise<void>;

  // Utilities
  isStepCompleted: (stepId: string) => boolean;
  isStepSkipped: (stepId: string) => boolean;
  canGoNext: () => boolean;
  canSkipCurrent: () => boolean;
}
```

**Key Functions:**

- `updateFieldValue`: Updates form data for current step (line 156)
- `saveStepData`: Saves progress to API (line 168)
- `validateCurrentStep`: Validates current step (line 206)
- `goToNext`: Validates, saves, and moves to next step (line 238)
- `skipCurrentStep`: Marks current step as skipped (line 270)
- `completeWizard`: Marks wizard as complete (line 301)

---

## Initialization

### Initialize Function

**File:** `src/contexts/wizard-context.tsx` (lines 102-153)

**Trigger:** `useEffect` hook runs on mount (lines 98-100)

```typescript
useEffect(() => {
  initializeWizard();
}, []);
```

### Complete Initialization Code

```typescript
const initializeWizard = async () => {
  try {
    setLoading(true);

    console.log('[WIZARD] Initializing wizard...');

    // Load configuration
    const configResponse = await fetch('/api/onboarding/config');
    if (!configResponse.ok) {
      const errorText = await configResponse.text();
      console.error('[WIZARD] Config fetch failed:', configResponse.status, errorText);
      throw new Error('Failed to load configuration');
    }

    const configData = await configResponse.json();
    console.log('[WIZARD] Config loaded:', configData);
    console.log('[WIZARD] Steps count:', configData.steps?.length);
    console.log('[WIZARD] First step:', configData.steps?.[0]);

    setSteps(configData.steps || []);
    setAccountType(configData.accountType);

    // Load saved progress
    const resumeResponse = await fetch('/api/onboarding/resume');
    if (resumeResponse.ok) {
      const resumeData = await resumeResponse.json();
      console.log('[WIZARD] Resume data:', resumeData);

      if (resumeData.canResume) {
        setFormData(resumeData.savedData || {});
        setCompletedSteps(resumeData.completedSteps || []);
        setSkippedSteps(resumeData.skippedSteps || []);

        // Find resume step index
        const resumeIndex = configData.steps.findIndex(
          (s: WizardStep) => s.stepId === resumeData.resumeFromStep
        );
        if (resumeIndex >= 0) {
          setCurrentStep(resumeIndex + 1);
        }
      }
    }

    console.log('[WIZARD] Initialization complete');
  } catch (error) {
    console.error('[WIZARD] Error initializing wizard:', error);
    toast.error('Failed to load wizard configuration');
  } finally {
    setLoading(false);
  }
};
```

### Initialization Steps

**Step 1: Load Configuration (Line 109)**

- Calls `GET /api/onboarding/config`
- Sets `steps` array from response
- Sets `accountType` from response

**Step 2: Load Saved Progress (Line 125)**

- Calls `GET /api/onboarding/resume`
- If `canResume` is true:
  - Sets `formData` from `savedData`
  - Sets `completedSteps` from response
  - Sets `skippedSteps` from response
  - Finds resume step index and sets `currentStep`

**Step 3: Complete (Line 145)**

- Sets `loading` to false
- Wizard is ready to render

**Error Handling:**

- Shows toast error if initialization fails
- Sets `loading` to false in finally block

---

## Config API (`/api/onboarding/config`)

### Endpoint Details

**Route:** `GET /api/onboarding/config`

**File Path:** `src/app/api/onboarding/config/route.ts`

**Authentication:** Required

---

### Complete Code

**File:** `src/app/api/onboarding/config/route.ts` (lines 32-246)

```typescript
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's app_user record
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('tenant_id, active_tenant_id, onboarding_flow_type, full_name')
      .eq('id', user.id)
      .single();

    if (appUserError || !appUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Check if user has a tenant
    const tenantId = appUser.active_tenant_id || appUser.tenant_id;
    let tenant = null;
    let accountType: 'organization' | 'solo' = 'solo';

    if (tenantId) {
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('account_type')
        .eq('id', tenantId)
        .single();

      if (!tenantError && tenantData) {
        tenant = tenantData;
        accountType = (tenant.account_type as 'organization' | 'solo') || 'organization';
      }
    }

    // Determine account type
    accountType = appUser.onboarding_flow_type || accountType || 'solo';

    // ✅ SIMPLIFIED 4-STEP CONFIGURATION
    const steps = [];

    // STEP 1: Email Verification
    steps.push({
      stepId: 'email_verification',
      stepName: 'Email Verification',
      stepDescription: 'Verify your email address to secure your account',
      stepIcon: 'Mail',
      stepOrder: 1,
      stepCategory: 'email',
      isSkippable: false,
      fields: [],
    });

    // STEP 2: Profile Setup
    steps.push({
      stepId: 'profile_setup',
      stepName: 'Profile Setup',
      stepDescription: 'Complete your personal information',
      stepIcon: 'User',
      stepOrder: 2,
      stepCategory: 'profile',
      isSkippable: false,
      fields: [
        /* field definitions */
      ],
    });

    // STEP 3: Organization Setup (only if user has org)
    if (tenantId) {
      steps.push({
        stepId: 'organization_setup',
        stepName: 'Organization Setup',
        stepDescription: 'Configure your organization details',
        stepIcon: 'Building2',
        stepOrder: 3,
        stepCategory: 'organization',
        isSkippable: true,
        fields: [
          /* field definitions */
        ],
      });
    }

    // STEP 4: Location Setup (only if user has org)
    if (tenantId) {
      steps.push({
        stepId: 'location_setup',
        stepName: 'Location Setup',
        stepDescription: 'Set up your primary location',
        stepIcon: 'MapPin',
        stepOrder: 4,
        stepCategory: 'location',
        isSkippable: true,
        fields: [
          /* field definitions */
        ],
      });
    }

    // Format response
    const response = {
      accountType,
      tenantId: tenantId || null,
      userId: user.id,
      hasOrganization: !!tenantId,
      steps,
      totalSteps: steps.length,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API] Error in GET /api/onboarding/config:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
```

---

### Logic Explanation

**Database Queries:**

1. **Get user** (line 37): `supabase.auth.getUser()`
2. **Get app_user** (line 47): Query `app_users` table for `tenant_id`, `active_tenant_id`, `onboarding_flow_type`
3. **Get tenant** (line 66): If `tenantId` exists, query `tenants` table for `account_type`

**Checks Determine Which Steps to Show:**

- **Always shown:** `email_verification`, `profile_setup` (lines 89-140)
- **Conditional:** `organization_setup` (line 143) - Only if `tenantId` exists
- **Conditional:** `location_setup` (line 179) - Only if `tenantId` exists

**Exact Response Structure:**

```typescript
{
  accountType: 'organization' | 'solo',
  tenantId: string | null,
  userId: string,
  hasOrganization: boolean,
  steps: [
    {
      stepId: string,
      stepName: string,
      stepDescription: string,
      stepIcon: string,
      stepOrder: number,
      stepCategory: string,
      isSkippable: boolean,
      fields: [
        {
          fieldName: string,
          isRequired: boolean,
          displayOrder: number,
          helpText: string,
          validationRules: object
        }
      ]
    }
  ],
  totalSteps: number
}
```

**Does it return any pre-filled data?**

**No.** The config API only returns step configuration. Pre-filled data comes from the Resume API.

---

## Resume API (`/api/onboarding/resume`)

### Endpoint Details

**Route:** `GET /api/onboarding/resume`

**File Path:** `src/app/api/onboarding/resume/route.ts`

**Authentication:** Required

---

### Complete Code

**File:** `src/app/api/onboarding/resume/route.ts` (lines 21-157)

```typescript
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user onboarding state
    const { data: appUser } = await supabase
      .from('app_users')
      .select(
        `
        tenant_id,
        active_tenant_id,
        onboarding_flow_type,
        onboarding_current_step,
        onboarding_completed,
        onboarding_skipped_steps,
        onboarding_started_at
      `
      )
      .eq('id', user.id)
      .single();

    if (!appUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // If onboarding is already completed, can't resume
    if (appUser.onboarding_completed) {
      return NextResponse.json({
        canResume: false,
        message: 'Onboarding already completed',
      });
    }

    // If onboarding hasn't started yet
    if (!appUser.onboarding_started_at) {
      return NextResponse.json({
        canResume: false,
        resumeFromStep: 'email_verification',
        savedData: {},
        completedSteps: [],
        skippedSteps: [],
        message: 'Onboarding not started yet',
      });
    }

    const tenantId = appUser.active_tenant_id || appUser.tenant_id;

    // Get all progress data (if user has tenant)
    const savedData: Record<string, any> = {};
    const completedSteps: string[] = [];
    const skippedSteps: string[] = [];

    if (tenantId) {
      const { data: progressData } = await supabase
        .from('onboarding_progress')
        .select('step_name, completed, skipped, field_data')
        .eq('user_id', user.id);

      progressData?.forEach((progress) => {
        if (progress.field_data) {
          savedData[progress.step_name] = progress.field_data;
        }
        if (progress.completed) {
          completedSteps.push(progress.step_name);
        }
        if (progress.skipped) {
          skippedSteps.push(progress.step_name);
        }
      });
    } else {
      // User doesn't have tenant - load saved data from app_users fields
      const stepOrder = ['email_verification', 'profile_setup'];
      if (appUser.onboarding_current_step) {
        const currentIndex = stepOrder.findIndex((s) => s === appUser.onboarding_current_step);
        if (currentIndex > 0) {
          completedSteps.push(...stepOrder.slice(0, currentIndex));
        }
      }
    }

    // Add skipped steps from app_users
    if (appUser.onboarding_skipped_steps) {
      skippedSteps.push(...appUser.onboarding_skipped_steps);
    }

    // Determine resume step
    const stepOrder = [
      'email_verification',
      'profile_setup',
      'organization_setup',
      'location_setup',
    ];
    const availableSteps = stepOrder.filter((stepId) => {
      if (stepId === 'organization_setup' || stepId === 'location_setup') {
        return !!tenantId;
      }
      return true;
    });

    let resumeFromStep = appUser.onboarding_current_step || 'email_verification';

    // If current step is already completed, find next uncompleted step
    if (completedSteps.includes(resumeFromStep) || skippedSteps.includes(resumeFromStep)) {
      const nextUncompleted = availableSteps.find(
        (step) => !completedSteps.includes(step) && !skippedSteps.includes(step)
      );
      if (nextUncompleted) {
        resumeFromStep = nextUncompleted;
      }
    }

    return NextResponse.json({
      canResume: true,
      resumeFromStep,
      savedData,
      completedSteps,
      skippedSteps,
      startedAt: appUser.onboarding_started_at,
      message: 'Progress loaded successfully',
    });
  } catch (error: any) {
    console.error('[API] Error in GET /api/onboarding/resume:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
```

---

### Logic Explanation

**Where is progress stored?**

- **Table:** `onboarding_progress` (line 85)
- **Also:** `app_users.onboarding_current_step`, `app_users.onboarding_skipped_steps` (lines 36-45)

**What is saved?**

- `field_data` (JSONB): All form field values for each step (line 92)
- `completed`: Boolean flag (line 94)
- `skipped`: Boolean flag (line 97)
- `step_name`: Step ID (e.g., 'profile_setup', 'organization_setup')

**Exact Response Structure:**

```typescript
{
  canResume: boolean,
  resumeFromStep: string,  // Step ID to resume from
  savedData: {
    [stepId]: {
      [fieldName]: value
    }
  },
  completedSteps: string[],  // Array of step IDs
  skippedSteps: string[],    // Array of step IDs
  startedAt: string,         // ISO timestamp
  message: string
}
```

**When is progress saved?**

- When user clicks "Next" (via `saveStepData` with `complete: true`)
- When user types in form fields (auto-save debounced, 2 seconds)
- When user skips a step

**Query Details:**

- If user has tenant: Queries `onboarding_progress` table (line 85)
- If user has no tenant: Infers progress from `app_users.onboarding_current_step` (line 104)

---

## Wizard Trigger

### When does wizard open?

**Auto-open conditions:**

1. User navigates to `/onboarding` page
2. Dashboard detects `onboarding_completed = false` and redirects to wizard
3. User clicks "Complete Setup" banner

**Can it be dismissed?**

**Yes.** The wizard has a close button (`onClose` prop in `EnhancedOnboardingWizard`).

**File:** `src/components/onboarding/enhanced-onboarding-wizard.tsx` (line 21)

**Can user return to it later?**

**Yes.** If `onboarding_completed = false`, user can:

- Click "Complete Setup" banner on dashboard
- Navigate to `/onboarding` directly

**Where is the trigger code?**

**Likely in:**

- `src/app/onboarding/page.tsx`
- `src/app/dashboard/page.tsx` (checks `onboarding_completed`)
- `src/components/onboarding/setup-banner.tsx` (banner component)

---

## Current Step Logic

### How is `currentStepId` determined?

**File:** `src/contexts/wizard-context.tsx` (line 94)

```typescript
const currentStepId = steps[currentStep - 1]?.stepId || '';
```

**Logic:**

1. `currentStep` is 1-based index (state variable)
2. `steps` is array from config API
3. `currentStepId = steps[currentStep - 1]?.stepId`
4. Falls back to empty string if no step found

**What happens if `steps` array is empty?**

- `currentStepId` = `''` (empty string)
- `currentStepData` = `null`
- Wizard shows error: "No wizard steps configured" (from `WizardStepContainer`)

**File:** `src/components/onboarding/enhanced-onboarding-wizard.tsx` (lines 47-55)

```typescript
if (!currentStepData) {
  return (
    <div className="flex items-center justify-center h-full">
      <Card className="p-8">
        <p className="text-red-600">Error: No wizard steps configured</p>
      </Card>
    </div>
  )
}
```

---

## Initialization Sequence

```
1. WizardProvider mounts
   └─ useEffect runs initializeWizard()

2. Config API Call
   └─ GET /api/onboarding/config
   └─ Returns: { steps, accountType, tenantId }
   └─ setSteps(configData.steps)
   └─ setAccountType(configData.accountType)

3. Resume API Call
   └─ GET /api/onboarding/resume
   └─ Returns: { savedData, completedSteps, skippedSteps, resumeFromStep }
   └─ setFormData(resumeData.savedData)
   └─ setCompletedSteps(resumeData.completedSteps)
   └─ setSkippedSteps(resumeData.skippedSteps)
   └─ Find resume step index
   └─ setCurrentStep(resumeIndex + 1)

4. Wizard Ready
   └─ setLoading(false)
   └─ Wizard renders current step
```

---

## Race Conditions

### Is config guaranteed to load before steps mount?

**No.** The `steps` array is empty initially. Components that use `currentStepId` should check if it exists:

```typescript
const currentStepId = steps[currentStep - 1]?.stepId || '';
```

If `steps` is empty, `currentStepId` will be empty string, and components should handle this.

### Is `steps` array guaranteed before `currentStepId` is accessed?

**No.** See above. Components use optional chaining (`?.`) to handle empty arrays.

---

## Summary

1. **WizardProvider:** Manages all wizard state and provides context
2. **Initialization:** Calls config API, then resume API, sets state
3. **Config API:** Returns step configuration based on user's tenant status
4. **Resume API:** Returns saved progress from `onboarding_progress` table
5. **Trigger:** Wizard opens when `onboarding_completed = false`
6. **Current Step:** Determined by `steps[currentStep - 1]?.stepId`
7. **Race Conditions:** Possible if `steps` is empty - handled with optional chaining
