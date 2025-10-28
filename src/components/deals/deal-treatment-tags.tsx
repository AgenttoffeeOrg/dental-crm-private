'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Tag, X, Pencil, Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/dates'

interface TreatmentTag {
  id: string
  name: string
  color: string
  icon: string
  keywords: string[]
}

interface RoutingLog {
  id: string
  routing_method: string
  confidence: number
  explanation: string
  matched_tag_ids: string[]
  created_at: string
  user: {
    full_name: string
  } | null
}

interface DealTreatmentTagsProps {
  dealId: string
  dealTags: string[] // Array of tag names from deal.treatment_tags
  orgId: string
  onTagsChange?: (newTags: string[]) => void
  showHistory?: boolean
  editable?: boolean
  compact?: boolean // For smaller displays like cards
}

export function DealTreatmentTags({
  dealId,
  dealTags,
  orgId,
  onTagsChange,
  showHistory = true,
  editable = true,
  compact = false
}: DealTreatmentTagsProps) {
  const [treatmentTags, setTreatmentTags] = useState<TreatmentTag[]>([])
  const [availableTags, setAvailableTags] = useState<TreatmentTag[]>([])
  const [routingHistory, setRoutingHistory] = useState<RoutingLog[]>([])
  const [editingTags, setEditingTags] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (orgId) {
      loadTreatmentTagsData()
      if (showHistory) {
        loadRoutingHistory()
      }
    }
  }, [orgId, dealTags])

  const loadTreatmentTagsData = async () => {
    try {
      setLoading(true)

      // Load all available tags for this tenant
      const { data: allTags, error: allTagsError } = await supabase
        .from('treatment_tags')
        .select('id, name, color, icon, keywords')
        .eq('tenant_id', orgId)
        .eq('is_active', true)
        .order('usage_count', { ascending: false })

      if (allTagsError) throw allTagsError
      setAvailableTags(allTags || [])

      // Filter to get only the tags assigned to this deal
      if (dealTags && dealTags.length > 0) {
        const selectedTags = (allTags || []).filter(tag => 
          dealTags.includes(tag.name)
        )
        setTreatmentTags(selectedTags)
      } else {
        setTreatmentTags([])
      }
    } catch (error) {
      console.error('Error loading treatment tags:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRoutingHistory = async () => {
    try {
      // Fetch routing history with explicit foreign key reference
      // Fixed: Use correct column name 'routed_by_user_id' from treatment_routing_logs table
      const { data, error } = await supabase
        .from('treatment_routing_logs')
        .select(`
          id,
          routing_method,
          confidence_score,
          routing_reason,
          matched_tag_ids,
          routed_at,
          user:app_users!routed_by_user_id(full_name)
        `)
        .eq('tenant_id', orgId)
        .eq('deal_id', dealId)
        .order('routed_at', { ascending: false})
        .limit(3)

      if (error) {
        // Silently handle if table doesn't exist - this is an optional feature
        if (error.code === '42P01' || error.code === 'PGRST116') {
          console.info('[TreatmentTags] Routing history table not available')
        } else {
          console.error('Error loading routing history:', error)
        }
        setRoutingHistory([])
        return
      }

      setRoutingHistory((data as any) || [])
    } catch (error: any) {
      // Gracefully handle any errors without breaking the UI
      if (error?.code === '42P01' || error?.code === 'PGRST116') {
        console.info('[TreatmentTags] Routing history feature not available')
      } else {
        console.error('Error loading routing history:', error)
      }
      setRoutingHistory([])
    }
  }

  const handleTagToggle = async (tagName: string) => {
    const newTags = dealTags.includes(tagName)
      ? dealTags.filter(t => t !== tagName)
      : [...dealTags, tagName]

    try {
      const { error } = await supabase
        .from('deals')
        .update({
          treatment_tags: newTags,
          updated_at: new Date().toISOString()
        })
        .eq('id', dealId)

      if (error) throw error

      toast.success(dealTags.includes(tagName) ? 'Tag removed' : 'Tag added')

      // Reload tag data
      await loadTreatmentTagsData()
      if (showHistory) {
        await loadRoutingHistory()
      }

      // Notify parent component
      if (onTagsChange) {
        onTagsChange(newTags)
      }

      // Show re-routing suggestion if tags changed
      if (newTags.length > 0 && newTags.length !== dealTags.length) {
        toast.info('💡 Tags updated - deal routing may need adjustment', {
          action: {
            label: 'Review',
            onClick: () => {
              window.location.href = '/settings?tab=routing-analytics'
            }
          }
        })
      }
    } catch (error) {
      console.error('Error updating tags:', error)
      toast.error('Failed to update tags')
    }
  }

  // Compact view for cards (Mobile-optimized)
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {/* On mobile, show only 2 tags to prevent overflow */}
        {treatmentTags.slice(0, window.innerWidth < 768 ? 2 : 3).map(tag => (
          <TooltipProvider key={tag.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  style={{ backgroundColor: tag.color }}
                  className="text-white text-[10px] px-2 py-0.5 transition-all hover:scale-105"
                >
                  <span className="mr-0.5">{tag.icon}</span>
                  <span className="hidden sm:inline">{tag.name}</span>
                  <span className="sm:hidden">{tag.name.slice(0, 8)}{tag.name.length > 8 ? '...' : ''}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">{tag.name}</p>
                {tag.keywords.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    {tag.keywords.slice(0, 3).join(', ')}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {treatmentTags.length > (window.innerWidth < 768 ? 2 : 3) && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 cursor-pointer hover:bg-gray-200">
                  +{treatmentTags.length - (window.innerWidth < 768 ? 2 : 3)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-semibold text-xs">More tags:</p>
                  {treatmentTags.slice(window.innerWidth < 768 ? 2 : 3).map(tag => (
                    <p key={tag.id} className="text-xs">
                      {tag.icon} {tag.name}
                    </p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    )
  }

  // Full view for detail pages (Mobile-optimized)
  return (
    <div>
      {/* Header - Mobile responsive */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center gap-2">
          <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
          <span className="hidden sm:inline">Treatment Tags</span>
          <span className="sm:hidden">Tags</span>
        </h3>
        {editable && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTags(!editingTags)}
                  className="h-7 px-2 text-xs sm:text-sm"
                  disabled={loading}
                >
                  {editingTags ? (
                    <><X className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Cancel</span></>
                  ) : (
                    <><Pencil className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Edit</span></>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to add or remove treatment tags</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Selected Tags - Mobile responsive */}
      {treatmentTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
          {treatmentTags.map(tag => (
            <TooltipProvider key={tag.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    style={{ backgroundColor: tag.color }}
                    className="text-white px-2 py-1 sm:px-3 sm:py-1.5 cursor-pointer hover:opacity-80 transition-all text-xs sm:text-sm active:scale-95"
                    onClick={() => editable && editingTags && handleTagToggle(tag.name)}
                  >
                    <span className="mr-1 text-sm sm:text-base">{tag.icon}</span>
                    <span className="truncate max-w-[100px] sm:max-w-none">{tag.name}</span>
                    {editingTags && <X className="h-3 w-3 ml-1 sm:ml-2 flex-shrink-0" />}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="text-xs">
                    <p className="font-semibold">{tag.name}</p>
                    {tag.keywords.length > 0 && (
                      <p className="text-gray-400 mt-1">
                        Keywords: {tag.keywords.slice(0, 3).join(', ')}
                      </p>
                    )}
                    {editingTags && (
                      <p className="text-blue-400 mt-1">Tap to remove</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      )}

      {/* Available Tags (when editing) - Mobile scrollable */}
      {editingTags && editable && (
        <div className="space-y-2">
          <p className="text-xs sm:text-sm text-gray-600 font-medium">Add more tags:</p>
          {/* Mobile: Scrollable horizontal list, Desktop: Flex wrap */}
          <div className="sm:hidden overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-max">
              {availableTags
                .filter(tag => !dealTags.includes(tag.name))
                .map(tag => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    style={{ borderColor: tag.color, color: tag.color }}
                    className="cursor-pointer hover:bg-opacity-10 transition-all px-2 py-1 text-xs whitespace-nowrap active:scale-95"
                    onClick={() => handleTagToggle(tag.name)}
                  >
                    <span className="mr-1">{tag.icon}</span>
                    {tag.name}
                    <Plus className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
            </div>
          </div>
          {/* Desktop: Flex wrap */}
          <div className="hidden sm:flex flex-wrap gap-2">
            {availableTags
              .filter(tag => !dealTags.includes(tag.name))
              .map(tag => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  style={{ borderColor: tag.color, color: tag.color }}
                  className="cursor-pointer hover:bg-opacity-10 transition-all px-3 py-1.5"
                  onClick={() => handleTagToggle(tag.name)}
                >
                  <span className="mr-1">{tag.icon}</span>
                  {tag.name}
                  <Plus className="h-3 w-3 ml-2" />
                </Badge>
              ))}
          </div>
        </div>
      )}

      {/* No Tags - Mobile responsive text */}
      {treatmentTags.length === 0 && !editingTags && (
        <p className="text-xs sm:text-sm text-gray-500 italic">
          {editable
            ? 'No treatment tags assigned. Tap "Edit" to add tags.'
            : 'No treatment tags assigned.'}
        </p>
      )}

      {/* Routing History - Mobile responsive */}
      {showHistory && routingHistory.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
            Routing History
          </h4>
          <div className="space-y-2">
            {routingHistory.map((log) => (
              <div
                key={log.id}
                className="text-xs sm:text-sm bg-purple-50 rounded p-2 sm:p-3 border border-purple-100"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 font-medium text-xs sm:text-sm">
                      {log.routing_method === 'user_override' && '👤 Manual routing'}
                      {log.routing_method === 'tag_mapping' && '🏷️ Tag-based routing'}
                      {log.routing_method === 'ai_keyword_match' && '🤖 AI routing'}
                      {log.routing_method === 'value_based' && '💰 Value-based routing'}
                      {log.routing_method === 'unsorted_fallback' && '📂 Default routing'}
                    </p>
                    <p className="text-gray-600 mt-0.5 text-xs truncate sm:whitespace-normal">{log.explanation}</p>
                    {log.confidence > 0 && (
                      <p className="text-purple-600 mt-1 text-xs">
                        {Math.round(log.confidence * 100)}% confidence
                      </p>
                    )}
                  </div>
                  <span className="text-gray-500 text-[10px] sm:text-xs whitespace-nowrap self-start sm:self-auto">
                    {formatDate(log.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

