'use client'

/**
 * Unified Notifications Tab
 * 
 * Combines 3 separate notification tabs into one cohesive experience:
 * 1. NotificationsTab (basic settings)
 * 2. NotificationsPreferencesTab (detailed per-event preferences)
 * 3. NotificationsPoliciesTab (admin policies)
 * 
 * Uses sub-tabs for better organization
 */

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bell, Settings, Shield } from 'lucide-react'
import { NotificationsTab } from './notifications-tab'
import { NotificationsPreferencesTab } from './notifications-preferences-tab'
import { NotificationsPoliciesTab } from './notifications-policies-tab'
import { useAuth } from '@/lib/auth'

export function UnifiedNotificationsTab() {
  const { appUser } = useAuth()
  const [activeTab, setActiveTab] = useState('basic')
  
  // 2b.78 — AppUser doesn't carry a role field. Show the tab heading
  // for any signed-in user; the Policies tab itself gates access via
  // a user_tenant_memberships role lookup.
  const isAdmin = Boolean(appUser)

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-xs font-semibold">Notifications</h3>
        <p className="text-xs text-gray-600">
          Control how and when you receive notifications
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="basic" className="gap-2">
            <Bell className="h-3 w-3" />
            Basic
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <Settings className="h-3 w-3" />
            Advanced
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="policies" className="gap-2">
              <Shield className="h-3 w-3" />
              Policies
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="basic" className="space-y-2">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="advanced" className="space-y-2">
          <NotificationsPreferencesTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="policies" className="space-y-2">
            <NotificationsPoliciesTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

