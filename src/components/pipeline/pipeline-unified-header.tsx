'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TrendingUp,
  LayoutGrid,
  Plus,
  Pencil,
  Check,
  X,
  List,
  Settings,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LABELS } from '@/lib/constants/labels'
import { SettingsGearButton } from '@/components/ui/settings-gear-button'
import { PipelineTemplate } from '@/types/enterprise-deals-table'

interface Pipeline {
  id: string
  name: string
  is_default?: boolean
  stages_count?: number
}

interface UnifiedHeaderProps {
  selectedPipelineId: string
  pipelines: Pipeline[]
  filteredDealsCount: number
  totalValue: number
  viewMode: 'board' | 'list'
  loading?: boolean
  onPipelineChange: (id: string) => void
  onViewModeChange: (mode: 'board' | 'list') => void
  onCreatePipeline: () => void
  onCreateDeal: () => void
  onEditPipelineName: (name: string) => void
  onAutoCategorize?: () => void
  onOpenSettings?: () => void
  pipelineTemplates?: PipelineTemplate[]
  onCreateFromTemplate?: (template: PipelineTemplate) => void
}

export function PipelineUnifiedHeader({
  selectedPipelineId,
  pipelines,
  filteredDealsCount,
  totalValue,
  viewMode,
  loading = false,
  onPipelineChange,
  onViewModeChange,
  onCreatePipeline,
  onCreateDeal,
  onEditPipelineName,
  onAutoCategorize,
  onOpenSettings,
  pipelineTemplates = [],
  onCreateFromTemplate,
}: UnifiedHeaderProps) {
  const [editingPipelineName, setEditingPipelineName] = useState(false)
  const [tempPipelineName, setTempPipelineName] = useState('')

  const formatCurrency = (cents: number) => {
    const pounds = cents / 100
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(pounds)
  }

  const startEditingPipelineName = () => {
    const pipeline = pipelines.find(p => p.id === selectedPipelineId)
    if (pipeline) {
      setTempPipelineName(pipeline.name)
      setEditingPipelineName(true)
    }
  }

  const handleSavePipelineName = () => {
    if (tempPipelineName.trim()) {
      onEditPipelineName(tempPipelineName.trim())
      setEditingPipelineName(false)
    }
  }

  const handleSelectChange = (value: string) => {
    if (value === '_create_custom') {
      onCreatePipeline()
      return
    }

    if (value.startsWith('_template_')) {
      const templateName = value.replace('_template_', '')
      const template = pipelineTemplates.find(t => t.name === templateName)
      if (template && onCreateFromTemplate) {
        onCreateFromTemplate(template)
      }
      return
    }

    onPipelineChange(value)
  }

  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
      <div className="px-10 py-5">
        <div className="flex items-center justify-between gap-8 max-w-[1800px] mx-auto">
          {/* Left: Pipeline Selector Only */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {editingPipelineName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={tempPipelineName}
                  onChange={(e) => setTempPipelineName(e.target.value)}
                  className="h-11 w-[300px] text-base font-semibold border-2 border-blue-500 focus-visible:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSavePipelineName()
                    else if (e.key === 'Escape') {
                      setEditingPipelineName(false)
                      setTempPipelineName('')
                    }
                  }}
                  placeholder="Pipeline name..."
                />
                <Button
                  size="sm"
                  onClick={handleSavePipelineName}
                  className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                  disabled={!tempPipelineName.trim()}
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingPipelineName(false)
                    setTempPipelineName('')
                  }}
                  className="h-11 px-4"
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                {/* Pipeline Selector - Version 2: Soft Gradient Style (Apple/iCloud inspired) */}
                <Select value={selectedPipelineId} onValueChange={handleSelectChange}>
                  <SelectTrigger className="h-[60px] w-[420px] border border-gray-200/60 hover:border-blue-400/40 transition-all duration-300 ease-out shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(59,130,246,0.12)] pl-5 pr-4 bg-gradient-to-b from-white to-gray-50/30 backdrop-blur-sm">
                    <div className="flex items-center gap-4 w-full">
                      {selectedPipelineId === '_all_deals' ? (
                        <>
                          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-[0_2px_12px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-b before:from-white/10 before:to-transparent">
                            <TrendingUp className="h-5 w-5 text-white relative z-10 drop-shadow-sm" />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1 gap-0.5 pr-4">
                            <span className="font-semibold text-[15px] text-gray-900 tracking-tight">All Deals</span>
                            <span className="text-[11px] text-gray-500 font-medium">Across all pipelines</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-brand-navy-600 via-brand-navy-700 to-brand-navy-800 flex items-center justify-center flex-shrink-0 shadow-[0_2px_12px_rgba(13,30,64,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-b before:from-white/10 before:to-transparent">
                            <LayoutGrid className="h-5 w-5 text-white relative z-10 drop-shadow-sm" />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1 gap-0.5 pr-4">
                            <span className="font-semibold text-[15px] text-gray-900 tracking-tight">
                              {pipelines.find(p => p.id === selectedPipelineId)?.name || 'Select Pipeline'}
                            </span>
                            <span className="text-[11px] text-gray-500 font-medium">Active pipeline</span>
                          </div>
                        </>
                      )}
                    </div>
                  </SelectTrigger>
                  
                  <SelectContent className="w-[380px]">
                    {/* All Deals Overview */}
                    <SelectGroup>
                      <SelectLabel className="text-xs font-bold text-gray-700 uppercase tracking-wider px-3 py-2 bg-gray-50/50">
                        📊 Overview
                      </SelectLabel>
                      <SelectItem value="_all_deals" className="py-2.5 px-3 cursor-pointer focus:bg-blue-50">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <TrendingUp className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-gray-900">All Deals</span>
                            <span className="text-xs text-gray-500">View and manage all deals</span>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectGroup>

                    <SelectSeparator className="my-1.5" />

                    {/* User's Pipelines */}
                    <SelectGroup>
                      <SelectLabel className="text-xs font-bold text-gray-700 uppercase tracking-wider px-3 py-2 bg-gray-50/50">
                        🎯 Your Pipelines {pipelines.length > 0 && `(${pipelines.length})`}
                      </SelectLabel>
                      {pipelines.length === 0 ? (
                        <div className="px-4 py-4 text-center">
                          <p className="text-sm text-gray-500 mb-1">No pipelines yet</p>
                          <p className="text-xs text-gray-400">Create your first pipeline below!</p>
                        </div>
                      ) : (
                        pipelines.map((pipeline) => (
                          <SelectItem 
                            key={pipeline.id} 
                            value={pipeline.id} 
                            className="py-2.5 px-3 cursor-pointer focus:bg-purple-50"
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                                  <LayoutGrid className="h-4 w-4 text-white" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm text-gray-900">{pipeline.name}</span>
                                  <span className="text-xs text-gray-500">
                                    {pipeline.stages_count || 0} {pipeline.stages_count === 1 ? 'stage' : 'stages'}
                                  </span>
                                </div>
                              </div>
                              {pipeline.is_default && (
                                <Badge variant="secondary" className="text-xs font-medium">Default</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectGroup>

                    <SelectSeparator className="my-1.5" />

                    {/* Create New - Prominent CTA */}
                    <SelectGroup>
                      <SelectLabel className="text-xs font-bold text-gray-700 uppercase tracking-wider px-3 py-2 bg-gray-50/50">
                        ✨ Create New
                      </SelectLabel>
                      <SelectItem 
                        value="_create_custom" 
                        className="py-2.5 px-3 cursor-pointer bg-blue-50/50 hover:bg-blue-100/70 focus:bg-blue-100/70 border-l-4 border-l-blue-600"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-md">
                            <Plus className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-blue-700">Create Custom Pipeline</span>
                            <span className="text-xs text-blue-600">Build from scratch with your stages</span>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {/* Quick Rename Button */}
                {selectedPipelineId !== '_all_deals' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startEditingPipelineName}
                    className="h-11 w-11 p-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    title="Rename pipeline"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Right: View Toggle + Actions - Prevent Cutoff */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* View Toggle - Segmented Control */}
            <div className="flex border-2 border-gray-300 rounded-lg overflow-hidden shadow-sm bg-gray-50">
              <Button 
                variant={viewMode === 'board' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('board')}
                className={cn(
                  "rounded-none h-11 px-6 transition-all duration-200 font-medium",
                  viewMode === 'board' 
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md" 
                    : "hover:bg-white text-gray-700 hover:text-gray-900"
                )}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Board
              </Button>
              <div className="w-px bg-gray-300" />
              <Button 
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('list')}
                className={cn(
                  "rounded-none h-11 px-6 transition-all duration-200 font-medium",
                  viewMode === 'list' 
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md" 
                    : "hover:bg-white text-gray-700 hover:text-gray-900"
                )}
              >
                <List className="h-4 w-4 mr-2" />
                List
              </Button>
            </div>

            {/* Auto-Categorize - Smart Feature */}
            {selectedPipelineId === '_all_deals' && filteredDealsCount > 0 && onAutoCategorize && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onAutoCategorize}
                className="h-11 px-4 border-2 border-brand-navy-300 text-brand-navy-700 hover:bg-brand-navy-50 hover:border-brand-navy-400 transition-all duration-200 shadow-sm font-medium bg-white"
                disabled={loading}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Auto-Categorize
              </Button>
            )}

            {/* Pipeline Settings */}
            {selectedPipelineId !== '_all_deals' && onOpenSettings && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onOpenSettings}
                className="h-11 px-4 hover:bg-gray-50 transition-all duration-200 shadow-sm font-medium"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            )}

            {/* Global Preferences */}
            <div className="h-11 flex items-center">
              <SettingsGearButton tab="preferences" />
            </div>

            {/* New Deal - Primary CTA - More Prominent */}
            <Button 
              onClick={onCreateDeal} 
              className="h-11 px-6 bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-200 font-semibold whitespace-nowrap"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
              New {LABELS.DEAL.singular}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

