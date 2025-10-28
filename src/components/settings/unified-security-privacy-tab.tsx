'use client'

/**
 * Unified Security & Privacy Tab
 * 
 * Combines 2 tabs into one:
 * 1. SecuritySettingsTab
 * 2. DataPrivacyTab
 */

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lock, Shield } from 'lucide-react'
import { SecuritySettingsTab } from './security-settings-tab'
import { DataPrivacyTab } from './data-privacy-tab'

export function UnifiedSecurityPrivacyTab() {
  const [activeTab, setActiveTab] = useState('security')

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-xs font-semibold">Security & Privacy</h3>
        <p className="text-xs text-gray-600">
          Manage security settings and data privacy controls
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-3 w-3" />
            Security
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <Shield className="h-3 w-3" />
            Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-2">
          <SecuritySettingsTab />
        </TabsContent>

        <TabsContent value="privacy" className="space-y-2">
          <DataPrivacyTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

