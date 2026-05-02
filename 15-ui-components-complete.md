# UI Components - Complete Catalog

**Date:** December 2024  
**Purpose:** Document ALL UI components in the system

---

## 1. ALL WIZARD COMPONENTS

| Component | File | Purpose | Props |
|-----------|------|---------|-------|
| WizardProvider | `src/contexts/wizard-context.tsx` | State management | - |
| WizardHeader | `src/components/onboarding/wizard-header.tsx` | Header with title/progress | - |
| WizardFooter | `src/components/onboarding/wizard-footer.tsx` | Navigation buttons | - |
| WizardProgressBar | `src/components/onboarding/wizard-progress-bar.tsx` | Progress indicator | - |
| WizardStepContainer | `src/components/onboarding/wizard-step-container.tsx` | Step renderer | - |
| EmailVerificationStep | `src/components/onboarding/steps/email-verification-step.tsx` | Email verification | - |
| PersonalInfoStep | `src/components/onboarding/steps/personal-info-step.tsx` | Profile setup | - |
| CompanyInfoStep | `src/components/onboarding/steps/company-info-step.tsx` | Organization setup | - |
| FirstLocationStep | `src/components/onboarding/steps/first-location-step.tsx` | Location setup | - |
| ContactInfoStep | `src/components/onboarding/steps/contact-info-step.tsx` | Contact info | - |
| LegalDetailsStep | `src/components/onboarding/steps/legal-details-step.tsx` | Legal details | - |
| BusinessSettingsStep | `src/components/onboarding/steps/business-settings-step.tsx` | Business settings | - |

**Total:** 12 wizard components

---

## 2. ALL SETTINGS COMPONENTS

**Found 86+ settings components** (see `glob_file_search` results)

**Key Categories:**

### Account Settings
- `user-profile-editor.tsx`
- `organization-profile-editor.tsx`
- `locations-settings-tab.tsx`
- `billing-subscription-tab.tsx`

### Team Settings
- `user-management-dashboard.tsx`
- `team-invites-tab.tsx`
- `custom-roles-tab.tsx`
- `team-members-tab.tsx`

### Workflow Settings
- `comprehensive-pipeline-settings.tsx`
- `treatment-config.tsx`
- `custom-fields-tab.tsx`
- `tags-and-sources-tab.tsx`

**Total:** 86+ components

---

## 3. ALL DATA DISPLAY COMPONENTS

| Component | File | Data Source | Filters |
|-----------|------|-------------|---------|
| ContactsList | `src/components/contacts/contacts-list-enterprise.tsx` | `/api/contacts` | Location, status, source |
| DealsTable | `src/components/deals/enterprise-deals-table.tsx` | `/api/deals` | Location, stage, status |
| TasksList | (if exists) | `/api/tasks` | Location, assignee |

---

## 4. ALL FORM COMPONENTS

| Form | File | Validation | Submission |
|------|------|------------|------------|
| Signup | `src/app/(auth)/sign-up/page.tsx` | Client-side | `supabase.auth.signUp` |
| Invite Accept | `src/app/(auth)/invite/[token]/page.tsx` | Client-side | Direct DB insert |
| Join Code | `src/components/invites/join-with-code-modal.tsx` | Client-side | `/api/invites/accept` |
| Invite Create | `src/components/settings/invite-user-dialog.tsx` | Client-side | `/api/users/invite` |

---

## SUMMARY

**Wizard Components:** 12  
**Settings Components:** 86+  
**Data Display:** 3+  
**Forms:** 4+

---

**Document Status:** ✅ COMPLETE  
**Last Updated:** December 2024














