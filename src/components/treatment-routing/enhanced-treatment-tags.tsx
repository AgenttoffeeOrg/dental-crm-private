'use client'

/**
 * Enhanced Treatment Tags Settings with Analytics
 * 
 * Combines:
 * 1. TreatmentTagsSettings (tag management)
 * 2. RoutingAnalytics (performance metrics)
 */

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tag, BarChart3 } from 'lucide-react'
import { TreatmentTagsSettings } from './treatment-tags-settings'
import { RoutingAnalytics } from './routing-analytics'

interface EnhancedTreatmentTagsProps {
  tenantId: string
}

export function EnhancedTreatmentTags({ tenantId }: EnhancedTreatmentTagsProps) {
  const [activeTab, setActiveTab] = useState('tags')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Treatment Tags & Routing</h3>
        <p className="text-sm text-gray-600">
          Manage tags and analyze routing performance
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="tags" className="gap-2">
            <Tag className="h-4 w-4" />
            Tags
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tags" className="space-y-6">
          <TreatmentTagsSettings tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <RoutingAnalytics tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

