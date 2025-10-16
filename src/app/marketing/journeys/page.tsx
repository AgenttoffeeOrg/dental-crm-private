'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, GitBranch, Play, Pause } from 'lucide-react'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import Link from 'next/link'
import type { MarketingJourney } from '@/types/marketing'
import { useAuth } from '@/lib/auth'

export default function JourneysPage() {
  const { appUser, loading: authLoading } = useAuth()
  const [journeys, setJourneys] = useState<MarketingJourney[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (appUser?.tenant_id && !authLoading) {
      fetchJourneys()
    }
  }, [appUser?.tenant_id, authLoading])

  const fetchJourneys = async () => {
    if (!appUser?.tenant_id) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('marketing_journeys')
        .select('*')
        .eq('tenant_id', appUser.tenant_id) // ✅ SECURITY: Filter by org
        .order('created_at', { ascending: false })

      if (error) throw error
      setJourneys(data || [])
    } catch (error) {
      console.error('[JOURNEYS] Error fetching:', error)
      toast.error('Failed to load journeys')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      active: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      archived: 'bg-red-100 text-red-700',
    }
    return <Badge className={variants[status] || variants.draft}>{status}</Badge>
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading journeys...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <GitBranch className="h-8 w-8 text-orange-600" />
                Automation Journeys
              </h1>
              <p className="text-gray-600 mt-1">Build smart, automated customer journeys</p>
            </div>
            <Link href="/marketing/journeys/create">
              <Button className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700">
                <Plus className="h-4 w-4 mr-2" />
                New Journey
              </Button>
            </Link>
          </div>

          {journeys.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <GitBranch className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Journeys Yet</h3>
                <p className="text-gray-600 mb-6">
                  Create your first automated journey to nurture contacts
                </p>
                <Link href="/marketing/journeys/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Journey
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {journeys.map(journey => (
                <Card key={journey.id} className="hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <Link href={`/marketing/journeys/${journey.id}`}>
                          <h3 className="font-semibold text-lg text-gray-900 hover:text-blue-600 mb-2">
                            {journey.name}
                          </h3>
                        </Link>
                        {journey.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{journey.description}</p>
                        )}
                      </div>
                      {getStatusBadge(journey.status)}
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{journey.total_active}</p>
                        <p className="text-xs text-gray-600">Active</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{journey.total_completed}</p>
                        <p className="text-xs text-gray-600">Completed</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{journey.total_entered}</p>
                        <p className="text-xs text-gray-600">Total Entered</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/marketing/journeys/${journey.id}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full">
                          Edit Journey
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant={journey.status === 'active' ? 'secondary' : 'default'}
                        className="flex-1"
                      >
                        {journey.status === 'active' ? (
                          <>
                            <Pause className="h-3.5 w-3.5 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 mr-2" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

function getDefaultNodeData(type: string): any {
  switch (type) {
    case 'trigger':
      return { triggerType: 'contact_created' }
    case 'email':
      return { templateId: '', subject: '' }
    case 'sms':
      return { message: '' }
    case 'tag':
      return { action: 'add', tagName: '' }
    case 'wait':
      return { duration: 1, unit: 'days' }
    case 'branch':
      return { conditions: [] }
    default:
      return {}
  }
}


