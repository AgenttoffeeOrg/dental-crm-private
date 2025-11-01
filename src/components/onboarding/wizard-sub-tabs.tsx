'use client'

import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

/**
 * WizardSubTabs
 * 
 * Horizontal sub-tabs within a main wizard step
 * Allows users to navigate through different sections within a step
 */

export interface SubTab {
  id: string
  label: string
  icon?: React.ReactNode
  content: React.ReactNode
  isCompleted?: boolean
  isRequired?: boolean
}

interface WizardSubTabsProps {
  tabs: SubTab[]
  defaultTab?: string
  onChange?: (tabId: string) => void
  className?: string
}

export function WizardSubTabs({ tabs, defaultTab, onChange, className }: WizardSubTabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id)

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (onChange) {
      onChange(value)
    }
  }

  if (!tabs || tabs.length === 0) {
    return null
  }

  // If only one tab, don't show tabs at all
  if (tabs.length === 1) {
    return <div className={className}>{tabs[0].content}</div>
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className={cn('w-full', className)}>
      <TabsList className="w-full justify-start mb-4 bg-gray-50 border border-gray-200 rounded-md p-1 h-auto">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm',
              'transition-all duration-150',
              'relative data-[state=active]:bg-white data-[state=active]:shadow-sm',
              // Completed tab styling
              tab.isCompleted && 'text-green-700'
            )}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span className="font-medium">{tab.label}</span>
            {tab.isCompleted && (
              <Check className="h-3.5 w-3.5 ml-0.5 text-green-600 flex-shrink-0" />
            )}
            {tab.isRequired && !tab.isCompleted && (
              <span className="ml-0.5 text-red-500">*</span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-0">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}

