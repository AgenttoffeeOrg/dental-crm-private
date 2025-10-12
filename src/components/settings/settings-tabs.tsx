'use client'

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TreatmentConfig } from './treatment-config'
import { PipelinePreferencesTab } from './pipeline-preferences-tab'
import { TeamMembersTab } from './team-members-tab'
import { UserProfileEditor } from './user-profile-editor'
import { CustomRolesTab } from './custom-roles-tab'
import { ComprehensiveDealSettings } from './comprehensive-deal-settings'

export function SettingsTabs() {
  const tenantId = '550e8400-e29b-41d4-a716-446655440000' // TODO: Get from auth context
  const currentUserId = '550e8400-e29b-41d4-a716-446655440000' // TODO: Get from auth context

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
    </Tabs>
  )
}

