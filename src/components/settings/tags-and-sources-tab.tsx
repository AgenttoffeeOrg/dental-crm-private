'use client'

/**
 * Tags & Lead Sources Combined Tab
 * 
 * Combines 2 related tabs into one view:
 * 1. TagsManagementTab
 * 2. LeadSourcesTab
 */

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tag, TrendingUp } from 'lucide-react'
import { TagsManagementTab } from './tags-management-tab'
import { LeadSourcesTab } from './lead-sources-tab'

export function TagsAndSourcesTab() {
  const [activeTab, setActiveTab] = useState('tags')

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-xs font-semibold">Tags & Lead Sources</h3>
        <p className="text-xs text-gray-600">
          Organize contacts with tags and track lead sources
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="tags" className="gap-2">
            <Tag className="h-3 w-3" />
            Tags
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-2">
            <TrendingUp className="h-3 w-3" />
            Lead Sources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tags" className="space-y-2">
          <TagsManagementTab />
        </TabsContent>

        <TabsContent value="sources" className="space-y-2">
          <LeadSourcesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

