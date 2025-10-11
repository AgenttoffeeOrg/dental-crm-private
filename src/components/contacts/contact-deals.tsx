'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Plus, 
  TrendingUp, 
  DollarSign,
  Calendar,
  Tag,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { CreateDealDialog } from '@/components/pipeline/create-deal-dialog'
import { formatDate, getActivityAge } from '@/lib/dates'
import type { DealWithRelations } from '@/types/database'

interface ContactDealsProps {
  contactId: string
  onDealsChanged?: () => void
  tenantId?: string
}

export function ContactDeals({ 
  contactId, 
  onDealsChanged,
  tenantId = process.env.DEFAULT_TENANT_ID 
}: ContactDealsProps) {
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchDeals()
  }, [contactId])

  const fetchDeals = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          stage:pipeline_stages(*),
          owner:app_users(*)
        `)
        .eq('contact_id', contactId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setDeals(data as DealWithRelations[] || [])
    } catch (error) {
      console.error('Error fetching deals:', error)
      toast.error('Failed to load deals')
    } finally {
      setLoading(false)
    }
  }

  const handleDealCreated = () => {
    fetchDeals()
    onDealsChanged?.()
    setCreateDialogOpen(false)
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(cents / 100)
  }

  const getStageColor = (stageName: string) => {
    const colors: Record<string, string> = {
      'New Inquiry': 'bg-blue-100 text-blue-800',
      'Contacted': 'bg-yellow-100 text-yellow-800',
      'Consultation Booked': 'bg-purple-100 text-purple-800',
      'Treatment Planned': 'bg-orange-100 text-orange-800',
      'Treatment Accepted': 'bg-green-100 text-green-800',
      'Completed': 'bg-emerald-100 text-emerald-800',
      'Lost': 'bg-red-100 text-red-800',
    }
    return colors[stageName] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-gray-500">Loading deals...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Deals</h3>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Deal
        </Button>
      </div>

      {/* Deals List */}
      {deals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No deals yet</h3>
            <p className="text-gray-600 mb-4">
              Create the first deal for this contact to start tracking opportunities
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Deal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deals.map(deal => (
            <Card key={deal.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Deal Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link
                        href={`/deals/${deal.id}`}
                        className="text-lg font-semibold hover:text-blue-600 transition-colors flex items-center gap-2"
                      >
                        {deal.title}
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs ${getStageColor(deal.stage.name)}`}>
                          {deal.stage.name}
                        </Badge>
                        {deal.value_estimate_cents > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {formatCurrency(deal.value_estimate_cents)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Treatment Tags */}
                  {deal.treatment_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {deal.treatment_tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Deal Meta */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-4">
                      {deal.owner && (
                        <div className="flex items-center gap-1">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs">
                              {deal.owner.full_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          {deal.owner.full_name}
                        </div>
                      )}
                      {deal.source && (
                        <Badge variant="outline" className="text-xs">
                          {deal.source.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Last activity {getActivityAge(deal.last_activity_at)}
                      </div>
                      <div>
                        Created {formatDate(deal.created_at, 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {deals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Deal Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{deals.length}</div>
                <div className="text-sm text-gray-600">Total Deals</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(deals.reduce((sum, deal) => sum + (deal.value_estimate_cents || 0), 0))}
                </div>
                <div className="text-sm text-gray-600">Total Value</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {deals.filter(deal => ['Treatment Accepted', 'Completed'].includes(deal.stage.name)).length}
                </div>
                <div className="text-sm text-gray-600">Won Deals</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Deal Dialog */}
      <CreateDealDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onDealCreated={handleDealCreated}
        preselectedContactId={contactId}
      />
    </div>
  )
}
