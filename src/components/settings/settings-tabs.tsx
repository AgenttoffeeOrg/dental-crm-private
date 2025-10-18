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
import { FormsSettingsTab } from './forms-settings-tab'
import { AnalyticsSettingsTab } from './analytics-settings-tab'
import { MarketingAuditSettingsTab } from './marketing-audit-settings-tab'
import { NotificationsPreferencesTab } from './notifications-preferences-tab'
import { NotificationsPoliciesTab } from './notifications-policies-tab'
import { LocationsSettingsTab } from './locations-settings-tab'
import { MultiLocationManagementTab } from './multi-location-management-tab'
import { useTenant, useCurrentUser } from '@/lib/hooks/use-tenant'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Rocket } from 'lucide-react'
import { SettingsSearch } from './settings-search'

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
    <div className="space-y-6">
      {/* Settings Search Bar */}
      <SettingsSearch onNavigate={handleTabChange} currentTab={currentTab} />
      
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
            value="multi-location" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            🏢 Multi-Location
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
          <TabsTrigger value="marketing" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            🚀 Marketing
          </TabsTrigger>
          <TabsTrigger value="forms-settings" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            📝 Forms
          </TabsTrigger>
          <TabsTrigger value="analytics-settings" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            📊 Analytics
          </TabsTrigger>
          <TabsTrigger value="marketing-audit-settings" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            🔍 Marketing Audit
          </TabsTrigger>
          <TabsTrigger value="notifications-preferences" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            🔔 Notifications
          </TabsTrigger>
          <TabsTrigger value="notifications-policies" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            👥 Notification Policies
          </TabsTrigger>
          <TabsTrigger value="locations" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap">
            📍 Locations
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

      <TabsContent value="multi-location" className="space-y-6">
        <MultiLocationManagementTab />
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

      <TabsContent value="marketing" className="space-y-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">Marketing Premium Settings</h3>
            <p className="text-sm text-gray-600">
              Configure feature flags, plan tiers, email settings, and premium marketing features
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Rocket className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">Marketing Settings</h4>
                <p className="text-sm text-gray-700 mb-4">
                  Access the dedicated Marketing Settings page to manage:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 mb-4">
                  <li>• <strong>Feature Flags:</strong> Toggle 10 premium features with black switches</li>
                  <li>• <strong>Plan Tiers:</strong> Starter, Pro ($29/mo), Enterprise ($99/mo)</li>
                  <li>• <strong>Email Configuration:</strong> DKIM/SPF, send domains, test emails</li>
                  <li>• <strong>SMS & WhatsApp:</strong> Twilio integration setup</li>
                  <li>• <strong>Integrations:</strong> Google Analytics, Facebook Pixel</li>
                  <li>• <strong>Compliance:</strong> GDPR controls, email footers</li>
                </ul>
                <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Link href="/settings/marketing">
                    <Rocket className="h-4 w-4 mr-2" />
                    Open Marketing Settings
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">🎯 Quick Access</h5>
              <p className="text-sm text-gray-600 mb-3">
                Jump directly to specific settings:
              </p>
              <div className="space-y-2">
                <Link href="/settings/marketing?tab=features" className="text-sm text-blue-600 hover:text-blue-700 block">
                  → Feature Flags & Toggle Switches
                </Link>
                <Link href="/settings/marketing?tab=email" className="text-sm text-blue-600 hover:text-blue-700 block">
                  → Email Configuration
                </Link>
                <Link href="/settings/marketing?tab=sms" className="text-sm text-blue-600 hover:text-blue-700 block">
                  → SMS & WhatsApp Setup
                </Link>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">💰 Monetization</h5>
              <p className="text-sm text-gray-600 mb-3">
                Premium features available:
              </p>
              <div className="space-y-1 text-sm text-gray-700">
                <div>• Email Warmup ($50/mo)</div>
                <div>• Click Heatmaps ($15/mo)</div>
                <div>• AI Send Time ($60/mo)</div>
                <div>• Dynamic Content ($20/mo)</div>
                <div className="text-xs text-gray-500 mt-2">+ 6 more features</div>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="forms-settings" className="space-y-6">
        <FormsSettingsTab />
      </TabsContent>

      <TabsContent value="analytics-settings" className="space-y-6">
        <AnalyticsSettingsTab />
      </TabsContent>

      <TabsContent value="marketing-audit-settings" className="space-y-6">
        <MarketingAuditSettingsTab />
      </TabsContent>

      <TabsContent value="notifications-preferences" className="space-y-6">
        <NotificationsPreferencesTab />
      </TabsContent>

      <TabsContent value="notifications-policies" className="space-y-6">
        <NotificationsPoliciesTab />
      </TabsContent>

      <TabsContent value="locations" className="space-y-6">
        <LocationsSettingsTab tenantId={tenantId} />
      </TabsContent>
    </Tabs>
    </div>
  )
}

