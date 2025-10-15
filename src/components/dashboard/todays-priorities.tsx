'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  AlertCircle, 
  CheckCircle, 
  Target, 
  Users, 
  Clock,
  TrendingUp,
  RefreshCw
} from 'lucide-react'
import { getTodaysPriorities, type PriorityItem } from '@/lib/dashboard-priorities'
import Link from 'next/link'

interface TodaysPrioritiesProps {
  tenantId: string
  onRefresh?: () => void
}

export function TodaysPriorities({ tenantId, onRefresh }: TodaysPrioritiesProps) {
  const [priorities, setPriorities] = useState<PriorityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (tenantId) {
      loadPriorities()
    }
  }, [tenantId])

  const loadPriorities = async () => {
    setLoading(true)
    try {
      const items = await getTodaysPriorities(tenantId, 7)
      setPriorities(items)
    } catch (error) {
      console.error('[Priorities] Error loading:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadPriorities()
    if (onRefresh) onRefresh()
    setRefreshing(false)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'task': return CheckCircle
      case 'deal': return Target
      case 'contact': return Users
      default: return AlertCircle
    }
  }

  const getUrgencyVariant = (urgency: string): any => {
    switch (urgency) {
      case 'critical': return 'destructive'
      case 'high': return 'default'
      case 'medium': return 'secondary'
      default: return 'outline'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-600'
      case 'high': return 'bg-orange-100 text-orange-600'
      case 'medium': return 'bg-yellow-100 text-yellow-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            Today's Priorities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 w-1/2 bg-gray-100 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (priorities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Today's Priorities
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="rounded-full bg-green-100 p-4 w-fit mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900">All caught up! 🎉</p>
            <p className="text-sm text-gray-600 mt-1">
              No urgent items need your attention right now
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            Today's Priorities
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {priorities.length} {priorities.length === 1 ? 'item' : 'items'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh priorities"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {priorities.map((item) => {
            const Icon = getIcon(item.type)
            return (
              <div
                key={`${item.type}-${item.id}`}
                className="group relative flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all"
              >
                {/* Icon */}
                <div className={`rounded-full p-2 shrink-0 ${getUrgencyColor(item.urgency)}`}>
                  <Icon className="h-4 w-4" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {item.subtitle}
                      </p>
                    </div>
                    <Badge 
                      variant={getUrgencyVariant(item.urgency)} 
                      className="shrink-0 text-xs"
                    >
                      {item.urgency}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-2">
                    {item.reason}
                  </p>
                  
                  <Link href={item.actionUrl}>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 text-xs"
                    >
                      {item.actionLabel}
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

