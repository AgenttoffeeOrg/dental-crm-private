# Phase 9: Lead Capture Forms & Webhooks

**Objective:** Integrate the Universal Treatment Tag Routing System into all lead capture and webhook entry points to enable automatic deal routing based on treatment tags.

---

## Entry Points Identified

### 1. Form Submission Webhook
- **File:** `src/app/api/webhooks/form-submission/route.ts`
- **Current:** Creates deals with hardcoded treatment keywords extraction (lines 28, 198)
- **Action:** Replace with AI tag extraction + universal routing

### 2. Marketing Form Submit API
- **File:** `src/app/api/marketing/forms/submit/route.ts`
- **Current:** Uses `processFormSubmission` from `form-processor.ts`
- **Action:** Integrate routing into the form processor

### 3. Form Processor (Core Logic)
- **File:** `src/lib/marketing/form-processor.ts`
- **Current:** Creates deals with fixed pipeline_id and stage_id (lines 103-118)
- **Action:** Replace with universal routing adapter

### 4. Lead Intake Webhook
- **File:** `src/app/api/webhooks/lead-intake/route.ts`
- **Current:** Generic lead processing
- **Action:** Add treatment tag extraction and routing

---

## Phase 9 Tasks

### ✅ Task 9.1: Update Form Processor Core
**File:** `src/lib/marketing/form-processor.ts`
- Import universal routing adapter
- Extract treatment tags from form payload
- Use `quickRouteDeal` to determine pipeline and stage
- Pass extracted tags to deal creation
- Update deal creation logic to use routed pipeline

### ✅ Task 9.2: Update Form Submission Webhook
**File:** `src/app/api/webhooks/form-submission/route.ts`
- Remove hardcoded treatment keyword extraction
- Import AI extractor service
- Use AI to extract tags from form data
- Use universal routing to determine pipeline
- Create deal with routed pipeline + extracted tags

### ✅ Task 9.3: Update Lead Intake Webhook
**File:** `src/app/api/webhooks/lead-intake/route.ts`
- Add treatment tag extraction from lead data
- Integrate universal routing
- Pass extracted tags through to deal creation

### ✅ Task 9.4: Form Builder Integration
**File:** `src/components/marketing/forms-builder.tsx` or `src/components/forms/form-builder.tsx`
- Add treatment tag field option to form builder
- Allow admins to add "Treatment Type" dropdown/multi-select
- Pre-populate with available treatment tags from database

### ✅ Task 9.5: Form CRM Settings Enhancement
**File:** `src/components/marketing/form-crm-settings.tsx`
- Add option to enable/disable automatic routing
- Show preview of routing rules
- Allow override: "Always route to [specific pipeline]" option

### ✅ Task 9.6: Testing & Documentation
- Test all form submission flows
- Verify treatment tags are extracted correctly
- Confirm deals route to correct pipelines
- Update API documentation

---

## Implementation Strategy

### Step 1: Core Integration (Tasks 9.1-9.3)
1. Update `form-processor.ts` with routing adapter
2. Update both webhook endpoints
3. Ensure backward compatibility

### Step 2: Form Builder (Task 9.4)
1. Add treatment tag field component
2. Fetch available tags from database
3. Allow multi-select in forms

### Step 3: Settings UI (Task 9.5)
1. Add routing toggle in form CRM settings
2. Show routing preview
3. Allow manual pipeline override

### Step 4: Testing (Task 9.6)
1. Create test form with treatment tags
2. Submit and verify routing
3. Test edge cases (no tags, multiple tags, unmapped tags)

---

## Key Considerations

### Backward Compatibility
- Forms without treatment tag fields continue to work
- Falls back to "Unsorted" pipeline if no tags provided
- Existing form submissions are not affected

### AI Tag Extraction
- Use `extractTagsFromDealText` from `ai-extractor.ts`
- Extract from: form title, reason for inquiry, treatment selection
- Fallback to manual tags if provided in form

### Error Handling
- If routing fails, log error and route to default pipeline
- Never block form submission due to routing issues
- Provide clear error messages in logs

### Performance
- Keep tag extraction async and non-blocking
- Cache available tags in form builder
- Minimize database queries

---

## Success Criteria

- ✅ All form submissions automatically route to correct pipelines
- ✅ Treatment tags are extracted from form data
- ✅ Fallback to "Unsorted" pipeline works correctly
- ✅ No existing functionality is broken
- ✅ Form builder allows adding treatment tag fields
- ✅ Settings UI shows routing configuration
- ✅ All tests pass

---

## Files to Modify (6 files)

1. ✅ `src/lib/marketing/form-processor.ts`
2. ✅ `src/app/api/webhooks/form-submission/route.ts`
3. ✅ `src/app/api/webhooks/lead-intake/route.ts`
4. ✅ `src/components/marketing/forms-builder.tsx`
5. ✅ `src/components/marketing/form-crm-settings.tsx`
6. ✅ Documentation

---

**Let's build a world-class lead capture system! 🚀**

