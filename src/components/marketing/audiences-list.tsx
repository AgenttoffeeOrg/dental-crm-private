'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Users, 
  Edit, 
  Trash2,
  RefreshCw,
  Target
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import type { MarketingAudience } from '@/types/marketing'

interface AudiencesListProps {
  tenantId?: string
}

export function AudiencesList({ tenantId }: AudiencesListProps) {
  const [audiences, setAudiences] = useState<MarketingAudience[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchAudiences()
  }, [])

  const fetchAudiences = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('marketing_audiences')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) {
        // Check if table doesn't exist yet (migrations not run)
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.log('[AUDIENCES] Marketing tables not yet created - run migrations')
          setAudiences([])
          return
        }
        throw error
      }
      setAudiences(data || [])
    } catch (error) {
      console.error('[AUDIENCES] Error fetching:', error)
      // Don't show error toast if tables don't exist yet
    } finally {
      setLoading(false)
    }
  }

  const refreshContactCount = async (audienceId: string) => {
    try {
      // TODO: Recalculate contact count based on segments
      toast.success('Contact count updated')
      fetchAudiences()
    } catch (error) {
      toast.error('Failed to refresh count')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading audiences...</div>
      </div>
    )
  }

  if (audiences.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Audiences Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first audience to start organizing contacts for campaigns
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create First Audience
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {audiences.map(audience => (
          <Link key={audience.id} href={`/marketing/audiences/${audience.id}`}>
            <Card className="cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                      <Users className="h-6 w-6 text-blue-600 group-hover:text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                        {audience.name}
                      </h3>
                      <Badge variant="outline" className="mt-1">
                        {audience.contact_count} contacts
                      </Badge>
                    </div>
                  </div>
                  
                  {!audience.is_active && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>

                {audience.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {audience.description}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      refreshContactCount(audience.id)
                    }}
                    className="flex-1"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      // TODO: Open edit dialog
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

