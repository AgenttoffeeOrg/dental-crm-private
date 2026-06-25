# Settings Structure Backup - October 26, 2025

## Original Component Imports

```typescript
import { TreatmentConfig } from './treatment-config'
import { PipelinePreferencesTab } from './pipeline-preferences-tab'
import { TeamMembersTab } from './team-members-tab'
import { UserProfileEditor } from './user-profile-editor'
import { OrganizationProfileEditor } from './organization-profile-editor'
import { CustomRolesTab } from './custom-roles-tab'
import { ComprehensiveDealSettings } from './comprehensive-deal-settings'
import { AIAssistantSettingsTab } from './ai-assistant-settings-tab'
import { AIAnalyticsTab } from './ai-analytics-tab'
import { CommunicationsIntegrationsTab } from './communications-integrations-tab'
import { AuditTrailViewer } from './audit-trail-viewer'
import { BrandingSettingsTab } from './branding-settings-tab'
import { EmailConfigTab } from './email-config-tab'
import { SMSConfigTab } from './sms-config-tab'
import { WhatsAppConfigTab } from './whatsapp-config-tab'
import { NotificationsTab } from './notifications-tab'
import { DataPrivacyTab } from './data-privacy-tab'
import { APIDeveloperTab } from './api-developer-tab'
import { SecuritySettingsTab } from './security-settings-tab'
import { BillingSubscriptionTab } from './billing-subscription-tab'
import { CalendarIntegrationTab } from './calendar-integration-tab'
import { CustomFieldsTab } from './custom-fields-tab'
import { TagsManagementTab } from './tags-management-tab'
import { LeadSourcesTab } from './lead-sources-tab'
import { FormsSettingsTab } from './forms-settings-tab'
import { AnalyticsSettingsTab } from './analytics-settings-tab'
import { MarketingAuditSettingsTab } from './marketing-audit-settings-tab'
import { NotificationsPreferencesTab } from './notifications-preferences-tab'
import { NotificationsPoliciesTab } from './notifications-policies-tab'
import { LocationsSettingsTab } from './locations-settings-tab'
import { TreatmentTagsSettings } from '../treatment-routing/treatment-tags-settings'
import { PipelineMappingSettings } from '../treatment-routing/pipeline-mapping-settings'
import { RoutingAnalytics } from '../treatment-routing/routing-analytics'
import { OnboardingFieldsAdmin } from './onboarding-fields-admin'
```

## Original Tab Structure (36 tabs)

1. profile
2. organization
3. locations
4. onboarding-admin
5. team
6. roles
7. preferences
8. deals
9. categorization (LEGACY)
10. treatment-tags
11. pipeline-mapping
12. routing-analytics
13. ai
14. ai-analytics
15. integrations
16. audit
17. branding
18. email-config
19. sms-config
20. whatsapp-config
21. notifications
22. billing
23. calendar
24. custom-fields
25. tags
26. lead-sources
27. security
28. api
29. privacy
30. marketing (link to /settings/marketing)
31. forms-settings
32. analytics-settings
33. marketing-audit-settings
34. notifications-preferences (DUPLICATE)
35. notifications-policies (DUPLICATE)

## File Locations

- Main settings file: `src/components/settings/settings-tabs.tsx`
- Settings search: `src/components/settings/settings-search.tsx`
- Settings directory: `src/components/settings/`
- Treatment routing: `src/components/treatment-routing/`

## Rollback Instructions

If the redesign needs to be reverted:

1. Replace `settings-tabs.tsx` with the backed up version
2. Remove new unified components
3. Remove `settings-sidebar.tsx`
4. Restore original URL parameter handling
5. Clear browser cache
6. Restart dev server

## Original URL Format

- `/settings?tab=profile`
- `/settings?tab=organization`
- etc.

No section parameter existed.

