# Settings Redesign - Complete Implementation Plan

## 🎯 Overview
Complete restructuring of settings from 36 horizontal tabs to a 2-level navigation system:
- **Level 1:** Vertical sidebar with 7 main sections
- **Level 2:** Horizontal tabs within each section

## 📊 Current State (36 tabs)

### Existing Tabs:
1. profile - UserProfileEditor
2. organization - OrganizationProfileEditor
3. locations - LocationsSettingsTab
4. onboarding-admin - OnboardingFieldsAdmin
5. team - TeamMembersTab
6. roles - CustomRolesTab
7. preferences - PipelinePreferencesTab
8. deals - ComprehensiveDealSettings
9. **categorization - TreatmentConfig (LEGACY - TO BE DISABLED)**
10. treatment-tags - TreatmentTagsSettings
11. pipeline-mapping - PipelineMappingSettings
12. **routing-analytics - RoutingAnalytics (TO BE MERGED INTO treatment-tags)**
13. ai - AIAssistantSettingsTab
14. ai-analytics - AIAnalyticsTab
15. integrations - CommunicationsIntegrationsTab
16. audit - AuditTrailViewer
17. branding - BrandingSettingsTab
18. **email-config - EmailConfigTab (TO BE MERGED)**
19. **sms-config - SMSConfigTab (TO BE MERGED)**
20. **whatsapp-config - WhatsAppConfigTab (TO BE MERGED)**
21. notifications - NotificationsTab
22. billing - BillingSubscriptionTab
23. calendar - CalendarIntegrationTab
24. custom-fields - CustomFieldsTab
25. tags - TagsManagementTab
26. lead-sources - LeadSourcesTab
27. security - SecuritySettingsTab
28. api - APIDeveloperTab
29. privacy - DataPrivacyTab
30. marketing - Link to /settings/marketing
31. forms-settings - FormsSettingsTab
32. analytics-settings - AnalyticsSettingsTab
33. marketing-audit-settings - MarketingAuditSettingsTab
34. **notifications-preferences - NotificationsPreferencesTab (DUPLICATE - TO BE MERGED)**
35. **notifications-policies - NotificationsPoliciesTab (DUPLICATE - TO BE MERGED)**

## 🏗️ New Structure (7 sections, 27 tabs)

### 1. 👤 ACCOUNT (4 tabs)
- **Profile** → UserProfileEditor
- **Organization** → OrganizationProfileEditor
- **Locations** → LocationsSettingsTab
- **Billing** → BillingSubscriptionTab

### 2. 👥 TEAM (3 tabs)
- **Members** → TeamMembersTab
- **Roles** → CustomRolesTab
- **Onboarding Config** → OnboardingFieldsAdmin

### 3. 🔄 WORKFLOW (6 tabs)
- **Pipelines** → PipelinePreferencesTab
- **Deals** → ComprehensiveDealSettings
- **Treatment Tags** → TreatmentTagsSettings (+ routing analytics merged)
- **Pipeline Mapping** → PipelineMappingSettings
- **Custom Fields** → CustomFieldsTab
- **Tags & Sources** → Combined view (TagsManagementTab + LeadSourcesTab)

### 4. 💬 COMMUNICATIONS (5 tabs)
- **Email** → UnifiedEmailTab (EmailConfigTab merged)
- **SMS** → UnifiedSMSTab (SMSConfigTab merged)
- **WhatsApp** → UnifiedWhatsAppTab (WhatsAppConfigTab merged)
- **Notifications** → UnifiedNotificationsTab (3 notification tabs merged)
- **Calendar** → CalendarIntegrationTab

### 5. 🤖 AI & AUTOMATION (3 tabs)
- **AI Assistant** → AIAssistantSettingsTab
- **AI Analytics** → AIAnalyticsTab
- **Marketing & Forms** → UnifiedMarketingTab (marketing + forms + marketing-audit merged)

### 6. 🔗 INTEGRATIONS (3 tabs)
- **Connected Apps** → CommunicationsIntegrationsTab
- **API & Developers** → APIDeveloperTab
- **Branding** → BrandingSettingsTab

### 7. ⚙️ SYSTEM (3 tabs)
- **Security & Privacy** → UnifiedSecurityPrivacyTab (security + privacy merged)
- **Analytics** → AnalyticsSettingsTab
- **Audit Trail** → AuditTrailViewer

## ❌ Components to Disable

### Legacy (1):
- `categorization` (TreatmentConfig) - Replaced by Treatment Tags

### Duplicates (4):
- `routing-analytics` → Merged into Treatment Tags
- `notifications-preferences` → Merged into Notifications
- `notifications-policies` → Merged into Notifications
- Separate email/sms/whatsapp config tabs → Merged into unified tabs

## 🔧 Technical Implementation

### URL Structure:
- Old: `/settings?tab=profile`
- New: `/settings?section=account&tab=profile`

### State Management:
```typescript
{
  activeSection: 'account' | 'team' | 'workflow' | 'communications' | 'ai' | 'integrations' | 'system',
  activeTab: {
    account: 'profile' | 'organization' | 'locations' | 'billing',
    team: 'members' | 'roles' | 'onboarding-config',
    // ... etc
  }
}
```

### Components to Create:
1. `settings-sidebar.tsx` - Main vertical navigation
2. `unified-notifications-tab.tsx` - Merged notifications
3. `unified-email-tab.tsx` - Email configuration
4. `unified-sms-tab.tsx` - SMS configuration
5. `unified-whatsapp-tab.tsx` - WhatsApp configuration
6. `unified-marketing-tab.tsx` - Marketing, forms, and audit
7. `unified-security-privacy-tab.tsx` - Security and privacy
8. `tags-and-sources-tab.tsx` - Combined tags and lead sources

### Components to Enhance:
1. `treatment-tags-settings.tsx` - Add routing analytics section

## 🎨 Design Specifications

### Sidebar:
- Width: 240px desktop, full-width mobile
- Background: White with subtle shadow
- Active state: Blue accent (bg-blue-50, border-l-4 border-blue-600)
- Hover: bg-gray-50
- Icons: Lucide icons, 20px
- Typography: 14px font-medium

### Horizontal Tabs:
- Height: 48px
- Border bottom: 2px on active tab
- Active color: blue-600
- Inactive color: gray-600
- Spacing: px-4

### Transitions:
- Section change: 200ms ease
- Tab change: 150ms ease
- Hover effects: 100ms ease

## ✅ Success Criteria

1. All 27 tabs accessible and functional
2. No broken functionality
3. All data loads and saves correctly
4. Mobile responsive
5. Smooth transitions
6. Clean code (no console errors)
7. Proper URL management
8. Search still works
9. All merged tabs contain complete functionality
10. Legacy tabs disabled cleanly

## 📝 Testing Checklist

- [ ] Click all 7 sidebar sections
- [ ] Click all 27 tabs
- [ ] Test URL navigation
- [ ] Test browser back/forward
- [ ] Test page refresh
- [ ] Test on mobile
- [ ] Test all forms save data
- [ ] Test file uploads
- [ ] Verify no console errors
- [ ] Test with real database data
- [ ] Verify permissions work
- [ ] Test search functionality

---

**Implementation Date:** October 26, 2025
**Total Tasks:** 115
**Estimated Time:** 6-8 hours
**Priority:** Quality and perfection over speed

