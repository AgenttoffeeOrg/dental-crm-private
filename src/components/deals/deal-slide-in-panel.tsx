'use client'

import { useEffect, useState } from 'react'
import { X, DollarSign, Calendar, User, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/formatters'

interface DealSlideInPanelProps {
  dealId: string | null
  open: boolean
  onClose: () => void
  onDealUpdated?: () => void
}

export function DealSlideInPanel({ dealId, open, onClose, onDealUpdated }: DealSlideInPanelProps) {
  const [deal, setDeal] = useState<any>(null)
  const [stages, setStages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && dealId) {
      loadDeal()
    }
  }, [open, dealId])

  const loadDeal = async () => {
    setLoading(true)
    const supabase = createClient()
    
    const [dealRes, stagesRes] = await Promise.all([
      supabase.from('deals_with_contacts').select('*').eq('id', dealId).single(),
      supabase.from('pipeline_stages').select('*').eq('tenant_id', deal?.tenant_id).order('position')
    ])

    setDeal(dealRes.data)
    setStages(stagesRes.data || [])
    setLoading(false)
  }

  const handleStageChange = async (newStageId: string) => {
    if (!deal) return

    // Optimistic update
    const oldStage = deal.stage_id
    setDeal({ ...deal, stage_id: newStageId, stage_name: stages.find(s => s.id === newStageId)?.name })

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('deals')
        .update({ stage_id: newStageId })
        .eq('id', dealId)

      if (error) throw error

      toast.success('Deal stage updated!')
      onDealUpdated?.()
    } catch (error) {
      // Revert on error
      setDeal({ ...deal, stage_id: oldStage })
      toast.error('Failed to update stage')
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200" onClick={onClose} />
      
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold">{deal?.title || 'Loading...'}</h2>
              {deal?.contact_name && (
                <p className="text-gray-600 mt-1">For: {deal.contact_name}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ) : deal ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Value</label>
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="text-xl font-semibold">
                        {deal.value_estimate_cents ? formatCurrency(deal.value_estimate_cents) : 'Not set'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Stage</label>
                    <Select value={deal.stage_id} onValueChange={handleStageChange}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map(stage => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {deal.notes && (
                  <div>
                    <label className="text-sm text-gray-600">Notes</label>
                    <p className="mt-1 text-gray-900">{deal.notes}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Full Edit
            </Button>
            <Button size="sm">
              Add Activity
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}


