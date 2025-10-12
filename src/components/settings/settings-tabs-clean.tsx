'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TreatmentConfig } from './treatment-config'
import { PipelinePreferencesTab } from './pipeline-preferences-tab'
import { TeamMembersTab } from './team-members-tab'
import { ActivityFeedTab } from './activity-feed-tab'
import { TeamAnalyticsTab } from './team-analytics-tab'
import { UserProfileEditor } from './user-profile-editor'
import { CustomRolesTab } from './custom-roles-tab'
import { AuditTrailViewer } from './audit-trail-viewer'
import { ComprehensiveDealSettings } from './comprehensive-deal-settings'
import { UserProfilesTab } from './user-profiles-tab'

export function SettingsTabs() {
  const tenantId = '550e8400-e29b-41d4-a716-446655440000' // TODO: Get from auth context
  const currentUserId = '550e8400-e29b-41d4-a716-446655440000' // TODO: Get from auth context
  const isAdmin = true // TODO: Get from user role

  return (
    <Tabs defaultValue="profile" className="space-y-6">
      {/* Scrollable Tabs with emojis for visual clarity */}
      <div className="border-b border-gray-200 overflow-x-auto -mx-6 px-6">
        <TabsList className="inline-flex h-auto bg-transparent border-none p-0 space-x-1">
          <TabsTrigger 
            value="profile" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            👤 Profile
          </TabsTrigger>
          <TabsTrigger 
            value="preferences" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            ⚙️ Preferences
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
            value="profiles" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            📋 Profiles
          </TabsTrigger>
          <TabsTrigger 
            value="activity" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            📰 Activity
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            📊 Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="audit" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            🔒 Audit
          </TabsTrigger>
          <TabsTrigger 
            value="deals" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            💼 Deals
          </TabsTrigger>
          <TabsTrigger 
            value="categorization" 
            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap"
          >
            🤖 Smart AI
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Tab Content - All working features */}
      <TabsContent value="profile" className="space-y-6">
        <UserProfileEditor userId={currentUserId} tenantId={tenantId} />
      </TabsContent>

      <TabsContent value="preferences" className="space-y-6">
        <PipelinePreferencesTab />
      </TabsContent>

      <TabsContent value="team" className="space-y-6">
        <TeamMembersTab />
      </TabsContent>

      <TabsContent value="activity" className="space-y-6">
        <ActivityFeedTab />
      </TabsContent>

      <TabsContent value="analytics" className="space-y-6">
        <TeamAnalyticsTab />
      </TabsContent>

      <TabsContent value="roles" className="space-y-6">
        <CustomRolesTab tenantId={tenantId} />
      </TabsContent>

      <TabsContent value="profiles" className="space-y-6">
        <UserProfilesTab tenantId={tenantId} />
      </TabsContent>

      <TabsContent value="audit" className="space-y-6">
        <AuditTrailViewer tenantId={tenantId} isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="deals" className="space-y-6">
        <ComprehensiveDealSettings tenantId={tenantId} />
      </TabsContent>

      <TabsContent value="categorization" className="space-y-6">
        <TreatmentConfig />
      </TabsContent>
    </Tabs>
  )
}

