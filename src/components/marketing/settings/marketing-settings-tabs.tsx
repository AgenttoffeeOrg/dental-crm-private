'use client'

/**
 * Marketing Settings - Comprehensive Settings Page
 * 6 Tabs: General, Features, Email, SMS/WhatsApp, Integrations, Compliance
 */

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { 
  Settings, 
  Sparkles, 
  Mail, 
  MessageSquare, 
  Zap, 
  Shield,
  TrendingUp,
  Brain
} from 'lucide-react'
import { GeneralSettingsPanel } from './general-settings-panel'
import { FeatureFlagsPanel } from './feature-flags-panel'
import { EmailSettingsPanel } from './email-settings-panel'
import { SMSSettingsPanel } from './sms-settings-panel'
import { IntegrationsPanel } from './integrations-panel'
import { CompliancePanel } from './compliance-panel'

export function MarketingSettingsTabs() {
  const [activeTab, setActiveTab] = useState('general')

  return (
    <div className="mt-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full max-w-[800px]">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Features</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">SMS</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Compliance</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <GeneralSettingsPanel />
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <FeatureFlagsPanel />
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <EmailSettingsPanel />
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          <SMSSettingsPanel />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <IntegrationsPanel />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <CompliancePanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

