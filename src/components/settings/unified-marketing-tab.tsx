'use client'

/**
 * Unified Marketing & Forms Tab
 * 
 * Combines 3 tabs into one:
 * 1. Marketing (link to /settings/marketing)
 * 2. FormsSettingsTab
 * 3. MarketingAuditSettingsTab
 */

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Rocket, FileText, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { FormsSettingsTab } from './forms-settings-tab'
import { MarketingAuditSettingsTab } from './marketing-audit-settings-tab'

export function UnifiedMarketingTab() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-xs font-semibold">Marketing & Forms</h3>
        <p className="text-xs text-gray-600">
          Marketing campaigns, form builder, and performance audits
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="overview" className="gap-2">
            <Rocket className="h-3 w-3" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="forms" className="gap-2">
            <FileText className="h-3 w-3" />
            Forms
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <Search className="h-3 w-3" />
            Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-2">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-md p-2.5">
            <div className="flex items-start gap-2">
              <div className="h-8 w-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-md flex items-center justify-center flex-shrink-0">
                <Rocket className="h-3 w-3 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">Marketing Settings</h4>
                <p className="text-xs text-gray-700 mb-1.5">
                  Access the dedicated Marketing Settings page to manage:
                </p>
                <ul className="text-xs text-gray-600 space-y-1 mb-1.5">
                  <li>• <strong>Feature Flags:</strong> Toggle 10 premium features with black switches</li>
                  <li>• <strong>Plan Tiers:</strong> Starter, Pro ($29/mo), Enterprise ($99/mo)</li>
                  <li>• <strong>Email Configuration:</strong> DKIM/SPF, send domains, test emails</li>
                  <li>• <strong>SMS & WhatsApp:</strong> Twilio integration setup</li>
                  <li>• <strong>Integrations:</strong> Google Analytics, Facebook Pixel</li>
                  <li>• <strong>Compliance:</strong> GDPR controls, email footers</li>
                </ul>
                <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Link href="/settings/marketing">
                    <Rocket className="h-3 w-3 mr-2" />
                    Open Marketing Settings
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white border border-gray-200 rounded-md p-2">
              <h5 className="font-medium text-gray-900 mb-2">🎯 Quick Access</h5>
              <p className="text-xs text-gray-600 mb-1">
                Jump directly to specific settings:
              </p>
              <div className="space-y-2">
                <Link href="/settings/marketing?tab=features" className="text-xs text-blue-600 hover:text-blue-700 block">
                  → Feature Flags & Toggle Switches
                </Link>
                <Link href="/settings/marketing?tab=email" className="text-xs text-blue-600 hover:text-blue-700 block">
                  → Email Configuration
                </Link>
                <Link href="/settings/marketing?tab=sms" className="text-xs text-blue-600 hover:text-blue-700 block">
                  → SMS & WhatsApp Setup
                </Link>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-md p-2">
              <h5 className="font-medium text-gray-900 mb-2">💰 Monetization</h5>
              <p className="text-xs text-gray-600 mb-1">
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
        </TabsContent>

        <TabsContent value="forms" className="space-y-2">
          <FormsSettingsTab />
        </TabsContent>

        <TabsContent value="audit" className="space-y-2">
          <MarketingAuditSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

