'use client'

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TreatmentConfig } from './treatment-config'
import { PipelinePreferencesTab } from './pipeline-preferences-tab'
import { TeamMembersTab } from './team-members-tab'
import { UserProfileEditor } from './user-profile-editor'
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
import { useTenant, useCurrentUser } from '@/lib/hooks/use-tenant'

export function SettingsTabs() {
  const { tenantId } = useTenant()
  const { userId: currentUserId } = useCurrentUser()

  // Get initial tab from URL to persist on reload
  const getInitialTab = () => {
    if (typeof window === 'undefined') return 'profile'
    const params = new URLSearchParams(window.location.search)
    return params.get('tab') || 'profile'
  }

  const [currentTab, setCurrentTab] = React.useState(getInitialTab())

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setCurrentTab(value)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', value)
      window.history.replaceState({}, '', url.toString())
    }
  }

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
      {/* Scrollable Tabs with emojis for visual clarity */}
      <div className="border-b border-gray-200 overflow-x-auto -mx-6 px-6">
        <TabsList className="inline-flex h-auto bg-transparent border-none p-0 space-x-1">
          <TabsTrigger 
            value="profile" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            👤 My Profile
          </TabsTrigger>
          <TabsTrigger 
            value="team" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            👥 Team
          </TabsTrigger>
          <TabsTrigger 
            value="roles" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            🛡️ Roles
          </TabsTrigger>
          <TabsTrigger 
            value="preferences" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            🔄 Pipeline Settings
          </TabsTrigger>
          <TabsTrigger 
            value="deals" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            💼 Deal Settings
          </TabsTrigger>
          <TabsTrigger 
            value="categorization" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            🏷️ Auto-Categorization
          </TabsTrigger>
          <TabsTrigger 
            value="ai" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            🤖 AI Assistant
          </TabsTrigger>
          <TabsTrigger 
            value="ai-analytics" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            📊 AI Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="integrations" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            📡 Integrations
          </TabsTrigger>
          <TabsTrigger 
            value="audit" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            📜 Audit Trail
          </TabsTrigger>
          <TabsTrigger value="branding" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            🎨 Branding
          </TabsTrigger>
          <TabsTrigger value="email-config" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            📧 Email
          </TabsTrigger>
          <TabsTrigger value="sms-config" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            💬 SMS
          </TabsTrigger>
          <TabsTrigger value="whatsapp-config" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            📱 WhatsApp
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            🔔 Notifications
          </TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            💳 Billing
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            📅 Calendar
          </TabsTrigger>
          <TabsTrigger value="custom-fields" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            🔧 Custom Fields
          </TabsTrigger>
          <TabsTrigger value="tags" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            🏷️ Tags
          </TabsTrigger>
          <TabsTrigger value="lead-sources" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            📊 Lead Sources
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            🔒 Security
          </TabsTrigger>
          <TabsTrigger value="api" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            💻 API
          </TabsTrigger>
          <TabsTrigger value="privacy" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            🛡️ Privacy
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Tab Content - Simple and clear */}
      <TabsContent value="profile" className="space-y-6">
        <UserProfileEditor userId={currentUserId} tenantId={tenantId} />
      </TabsContent>

      <TabsContent value="team" className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Team Management</h3>
            <p className="text-sm text-gray-600">Invite and manage your team members</p>
          </div>
          <TeamMembersTab />
        </div>
      </TabsContent>

      <TabsContent value="roles" className="space-y-6">
        <CustomRolesTab tenantId={tenantId} />
      </TabsContent>

      <TabsContent value="preferences" className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Pipeline Display Settings</h3>
            <p className="text-sm text-gray-600">Customize how you view pipelines and deals</p>
          </div>
          <PipelinePreferencesTab />
        </div>
      </TabsContent>

      <TabsContent value="deals" className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Deal Configuration</h3>
            <p className="text-sm text-gray-600">Set global rules for deals (required fields, validation, etc.)</p>
          </div>
          <ComprehensiveDealSettings tenantId={tenantId} />
        </div>
      </TabsContent>

      <TabsContent value="categorization" className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Auto-Categorization Rules</h3>
            <p className="text-sm text-gray-600">Configure automatic deal categorization based on treatments, keywords, and deal values</p>
          </div>
          <TreatmentConfig />
        </div>
      </TabsContent>

      <TabsContent value="ai" className="space-y-6">
        <AIAssistantSettingsTab tenantId={tenantId} />
      </TabsContent>

      <TabsContent value="ai-analytics" className="space-y-6">
        <AIAnalyticsTab tenantId={tenantId} />
      </TabsContent>

      <TabsContent value="integrations" className="space-y-6">
        <CommunicationsIntegrationsTab />
      </TabsContent>

      <TabsContent value="audit" className="space-y-6">
        <AuditTrailViewer tenantId={tenantId} isAdmin={true} />
      </TabsContent>

      <TabsContent value="branding" className="space-y-6">
        <BrandingSettingsTab />
      </TabsContent>

      <TabsContent value="email-config" className="space-y-6">
        <EmailConfigTab />
      </TabsContent>

      <TabsContent value="sms-config" className="space-y-6">
        <SMSConfigTab />
      </TabsContent>

      <TabsContent value="whatsapp-config" className="space-y-6">
        <WhatsAppConfigTab />
      </TabsContent>

      <TabsContent value="notifications" className="space-y-6">
        <NotificationsTab />
      </TabsContent>

      <TabsContent value="billing" className="space-y-6">
        <BillingSubscriptionTab />
      </TabsContent>

      <TabsContent value="calendar" className="space-y-6">
        <CalendarIntegrationTab />
      </TabsContent>

      <TabsContent value="custom-fields" className="space-y-6">
        <CustomFieldsTab />
      </TabsContent>

      <TabsContent value="tags" className="space-y-6">
        <TagsManagementTab />
      </TabsContent>

      <TabsContent value="lead-sources" className="space-y-6">
        <LeadSourcesTab />
      </TabsContent>

      <TabsContent value="security" className="space-y-6">
        <SecuritySettingsTab />
      </TabsContent>

      <TabsContent value="api" className="space-y-6">
        <APIDeveloperTab />
      </TabsContent>

      <TabsContent value="privacy" className="space-y-6">
        <DataPrivacyTab />
      </TabsContent>
    </Tabs>
  )
}

