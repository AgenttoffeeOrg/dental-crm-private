'use client'

/**
 * =====================================================
 * SETTINGS - 2-LEVEL NAVIGATION SYSTEM
 * =====================================================
 * 
 * Restructured from 36 horizontal tabs to:
 * - Level 1: 7 vertical sidebar sections
 * - Level 2: Horizontal tabs within each section
 * 
 * Total: 27 accessible tabs (9 disabled/merged)
 * 
 * DISABLED COMPONENTS:
 * - categorization (legacy)
 * - routing-analytics (merged into treatment-tags)
 * - notifications-preferences (merged into notifications)
 * - notifications-policies (merged into notifications)
 * 
 * =====================================================
 */

import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Layout Components
import { SettingsSidebar } from './settings-sidebar'
import { SettingsSearch } from './settings-search'

// Account Section Components
import { UserProfileEditor } from './user-profile-editor'
import { OrganizationProfileEditor } from './organization-profile-editor'
import { LocationsSettingsTab } from './locations-settings-tab'
import { BillingSubscriptionTab } from './billing-subscription-tab'

// Team Section Components
import { TeamMembersTab } from './team-members-tab'
import { CustomRolesTab } from './custom-roles-tab'
import { TeamInvitesTab } from './team-invites-tab'
// import { OnboardingFieldsAdmin } from './onboarding-fields-admin' // Removed earlier

// Workflow Section Components
import { PipelinePreferencesTab } from './pipeline-preferences-tab'
import { ComprehensiveDealSettings } from './comprehensive-deal-settings'
import { EnhancedTreatmentTags } from '../treatment-routing/enhanced-treatment-tags'
import { PipelineMappingSettings } from '../treatment-routing/pipeline-mapping-settings'
import { CustomFieldsTab } from './custom-fields-tab'
import { TagsAndSourcesTab } from './tags-and-sources-tab'

// Communications Section Components
import { EmailConfigTab } from './email-config-tab'
import { SMSConfigTab } from './sms-config-tab'
import { WhatsAppConfigTab } from './whatsapp-config-tab'
import { UnifiedNotificationsTab } from './unified-notifications-tab'
import { CalendarIntegrationTab } from './calendar-integration-tab'

// AI & Automation Section Components
import { AIAssistantSettingsTab } from './ai-assistant-settings-tab'
import { AIAnalyticsTab } from './ai-analytics-tab'
import { UnifiedMarketingTab } from './unified-marketing-tab'

// Integrations Section Components
import { CommunicationsIntegrationsTab } from './communications-integrations-tab'
import { IntegrationsHubV2 } from '@/components/integrations/integrations-hub-v2'
import { APIDeveloperTab } from './api-developer-tab'
import { BrandingSettingsTab } from './branding-settings-tab'

// System Section Components
import { UnifiedSecurityPrivacyTab } from './unified-security-privacy-tab'
import { AnalyticsSettingsTab } from './analytics-settings-tab'
import { AuditTrailViewer } from './audit-trail-viewer'
import { FeatureFlagsGovernanceTab } from './feature-flags-governance-tab'
import { SystemReliabilityTab } from './system-reliability-tab'

// Hooks
import { useTenant, useCurrentUser } from '@/lib/hooks/use-tenant'
import { useAuth } from '@/lib/auth'
import { NoOrgEmptyState } from '@/components/guards'

// Section configuration
const SECTION_TABS = {
  account: [
    { id: 'profile', label: 'My Profile' },
    { id: 'organization', label: 'Organization' },
    { id: 'locations', label: 'Locations' },
    { id: 'billing', label: 'Billing' },
  ],
  team: [
    { id: 'members', label: 'Team Members' },
    { id: 'roles', label: 'Roles & Permissions' },
    { id: 'invites', label: 'Team Invites' },
    // { id: 'onboarding-config', label: 'Onboarding Config' }, // Removed - component doesn't exist
  ],
  workflow: [
    { id: 'pipelines', label: 'Pipelines' },
    { id: 'deals', label: 'Deals' },
    { id: 'treatment-tags', label: 'Treatment Tags' },
    { id: 'pipeline-mapping', label: 'Pipeline Mapping' },
    { id: 'custom-fields', label: 'Custom Fields' },
    { id: 'tags-sources', label: 'Tags & Sources' },
  ],
  communications: [
    { id: 'email', label: 'Email' },
    { id: 'sms', label: 'SMS' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'calendar', label: 'Calendar' },
  ],
  ai: [
    { id: 'ai-assistant', label: 'AI Assistant' },
    { id: 'ai-analytics', label: 'AI Analytics' },
    { id: 'marketing', label: 'Marketing & Forms' },
  ],
  integrations: [
    { id: 'integrations', label: 'Integrations' },
    { id: 'connected-apps', label: 'Connected Apps' },
    { id: 'api', label: 'API & Developers' },
    { id: 'branding', label: 'Branding' },
  ],
  system: [
    { id: 'security-privacy', label: 'Security & Privacy' },
    { id: 'reliability', label: 'Reliability' },
    { id: 'feature-flags', label: 'Feature Flags' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'audit', label: 'Audit Trail' },
  ],
}

export function SettingsTabs() {
  const { tenantId } = useTenant()
  const { userId: currentUserId } = useCurrentUser()
  const { appUser } = useAuth()
  const hasTenant = Boolean(appUser?.active_tenant_id || appUser?.tenant_id)
  
  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  
  // Get initial state from URL
  const getInitialState = () => {
    if (typeof window === 'undefined') {
      return { section: 'account', tab: 'profile' }
    }
    
    const params = new URLSearchParams(window.location.search)
    const section = params.get('section') || 'account'
    const tab = params.get('tab') || SECTION_TABS[section as keyof typeof SECTION_TABS]?.[0]?.id || 'profile'
    
    // If no tenant and trying to access non-profile tab, force profile
    if (!hasTenant && (section !== 'account' || tab !== 'profile')) {
      return { section: 'account', tab: 'profile' }
    }
    
    return { section, tab }
  }
  
  const [activeSection, setActiveSection] = useState(getInitialState().section)
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({
    account: getInitialState().section === 'account' ? getInitialState().tab : 'profile',
    team: 'members',
    workflow: 'pipelines',
    communications: 'email',
    ai: 'ai-assistant',
    integrations: 'integrations',
    system: 'security-privacy',
  })

  // Handle section change with org check
  const handleSectionChange = (sectionId: string) => {
    // If no tenant, only allow account section
    if (!hasTenant && sectionId !== 'account') {
      return // Block navigation
    }
    setActiveSection(sectionId)
    setIsMobileSidebarOpen(false)
  }
  
  // Handle tab change with org check
  const handleTabChange = (tabId: string) => {
    // If no tenant and not on profile tab, block
    if (!hasTenant && activeSection === 'account' && tabId !== 'profile') {
      return // Block navigation
    }
    setActiveTabs({
      ...activeTabs,
      [activeSection]: tabId
    })
  }
  
  // Update URL when section/tab changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('section', activeSection)
      url.searchParams.set('tab', activeTabs[activeSection])
      window.history.replaceState({}, '', url.toString())
    }
  }, [activeSection, activeTabs])
  
  // Force profile tab if no tenant
  useEffect(() => {
    if (!hasTenant && (activeSection !== 'account' || activeTabs.account !== 'profile')) {
      setActiveSection('account')
      setActiveTabs({ ...activeTabs, account: 'profile' })
    }
  }, [hasTenant])
  
  // Handle search navigation
  const handleSearchNavigate = (section: string, tab: string) => {
    setActiveSection(section)
    setActiveTabs({
      ...activeTabs,
      [section]: tab
    })
  }
  
  // Get current tab for active section
  const currentTab = activeTabs[activeSection]
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Vertical Sidebar */}
      <SettingsSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        hasTenant={hasTenant}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Settings</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          >
            {isMobileSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
        
        {/* Settings Search */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <SettingsSearch
            onNavigate={handleSearchNavigate}
            currentSection={activeSection}
            currentTab={currentTab}
          />
        </div>
        
        {/* Content with Horizontal Tabs */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
              {/* Horizontal Tabs */}
              <div className="border-b border-gray-200 overflow-x-auto">
                <TabsList className="inline-flex h-auto bg-transparent border-none p-0 space-x-1">
                  {SECTION_TABS[activeSection as keyof typeof SECTION_TABS]?.map((tab) => {
                    // Disable non-profile tabs if no tenant
                    const isDisabled = !hasTenant && activeSection === 'account' && tab.id !== 'profile'
                    return (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        disabled={isDisabled}
                        className={cn(
                          "data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap",
                          isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {tab.label}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </div>
              
              {/* Tab Contents */}
              {renderTabContents(activeSection, currentTab, tenantId, currentUserId)}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}

// Render tab contents based on section and tab
function renderTabContents(
  section: string,
  tab: string,
  tenantId: string | null,
  currentUserId: string | null
) {
  switch (section) {
    case 'account':
      return renderAccountTabs(tab, currentUserId, tenantId)
    case 'team':
      return renderTeamTabs(tab, tenantId)
    case 'workflow':
      return renderWorkflowTabs(tab, tenantId)
    case 'communications':
      return renderCommunicationsTabs(tab)
    case 'ai':
      return renderAITabs(tab, tenantId)
    case 'integrations':
      return renderIntegrationsTabs(tab)
    case 'system':
      return renderSystemTabs(tab, tenantId)
    default:
      return null
  }
}

// Account Section Tabs
function renderAccountTabs(tab: string, currentUserId: string | null, tenantId: string | null) {
  return (
    <>
      <TabsContent value="profile" className="space-y-6">
        <UserProfileEditor userId={currentUserId} tenantId={tenantId} />
      </TabsContent>
      
      <TabsContent value="organization" className="space-y-6">
        <OrganizationProfileEditor />
      </TabsContent>
      
      <TabsContent value="locations" className="space-y-6">
        <LocationsSettingsTab tenantId={tenantId} />
      </TabsContent>
      
      <TabsContent value="billing" className="space-y-6">
        <BillingSubscriptionTab />
      </TabsContent>
    </>
  )
}

// Team Section Tabs
function renderTeamTabs(tab: string, tenantId: string | null) {
  return (
    <>
      <TabsContent value="members" className="space-y-6">
        <TeamMembersTab />
      </TabsContent>
      
      <TabsContent value="roles" className="space-y-6">
        <CustomRolesTab tenantId={tenantId} />
      </TabsContent>
      
      <TabsContent value="invites" className="space-y-6">
        <TeamInvitesTab />
      </TabsContent>
      
      {/* Removed - OnboardingFieldsAdmin component doesn't exist
      <TabsContent value="onboarding-config" className="space-y-6">
        <OnboardingFieldsAdmin />
      </TabsContent>
      */}
    </>
  )
}

// Workflow Section Tabs
function renderWorkflowTabs(tab: string, tenantId: string | null) {
  return (
    <>
      <TabsContent value="pipelines" className="space-y-6">
        <PipelinePreferencesTab />
      </TabsContent>
      
      <TabsContent value="deals" className="space-y-6">
        <ComprehensiveDealSettings tenantId={tenantId} />
      </TabsContent>
      
      <TabsContent value="treatment-tags" className="space-y-6">
        <EnhancedTreatmentTags tenantId={tenantId || ''} />
      </TabsContent>
      
      <TabsContent value="pipeline-mapping" className="space-y-6">
        <PipelineMappingSettings tenantId={tenantId || ''} />
      </TabsContent>
      
      <TabsContent value="custom-fields" className="space-y-6">
        <CustomFieldsTab />
      </TabsContent>
      
      <TabsContent value="tags-sources" className="space-y-6">
        <TagsAndSourcesTab />
      </TabsContent>
    </>
  )
}

// Communications Section Tabs
function renderCommunicationsTabs(tab: string) {
  return (
    <>
      <TabsContent value="email" className="space-y-6">
        <EmailConfigTab />
      </TabsContent>
      
      <TabsContent value="sms" className="space-y-6">
        <SMSConfigTab />
      </TabsContent>
      
      <TabsContent value="whatsapp" className="space-y-6">
        <WhatsAppConfigTab />
      </TabsContent>
      
      <TabsContent value="notifications" className="space-y-6">
        <UnifiedNotificationsTab />
      </TabsContent>
      
      <TabsContent value="calendar" className="space-y-6">
        <CalendarIntegrationTab />
      </TabsContent>
    </>
  )
}

// AI & Automation Section Tabs
function renderAITabs(tab: string, tenantId: string | null) {
  return (
    <>
      <TabsContent value="ai-assistant" className="space-y-6">
        <AIAssistantSettingsTab tenantId={tenantId} />
      </TabsContent>
      
      <TabsContent value="ai-analytics" className="space-y-6">
        <AIAnalyticsTab tenantId={tenantId} />
      </TabsContent>
      
      <TabsContent value="marketing" className="space-y-6">
        <UnifiedMarketingTab />
      </TabsContent>
    </>
  )
}

// Integrations Section Tabs
function renderIntegrationsTabs(tab: string) {
  return (
    <>
      <TabsContent value="connected-apps" className="space-y-6">
        <CommunicationsIntegrationsTab />
      </TabsContent>
      
      <TabsContent value="api" className="space-y-6">
        <APIDeveloperTab />
      </TabsContent>
      
      <TabsContent value="branding" className="space-y-6">
        <BrandingSettingsTab />
      </TabsContent>
    </>
  )
}

// System Section Tabs
function renderSystemTabs(tab: string, tenantId: string | null) {
  return (
    <>
      <TabsContent value="security-privacy" className="space-y-6">
        <UnifiedSecurityPrivacyTab />
      </TabsContent>

      <TabsContent value="reliability" className="space-y-6">
        <SystemReliabilityTab />
      </TabsContent>

      <TabsContent value="feature-flags" className="space-y-6">
        <FeatureFlagsGovernanceTab />
      </TabsContent>
      
      <TabsContent value="analytics" className="space-y-6">
        <AnalyticsSettingsTab />
      </TabsContent>
      
      <TabsContent value="audit" className="space-y-6">
        <AuditTrailViewer tenantId={tenantId} isAdmin={true} />
      </TabsContent>
    </>
  )
}

