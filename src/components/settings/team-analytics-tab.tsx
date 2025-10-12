'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { TrendingUp, Trophy, Target, Clock, DollarSign, RefreshCw } from 'lucide-react'

interface UserStats {
  userId: string
  userName: string
  role: string
  dealsOwned: number
  dealsWon: number
  dealsLost: number
  totalValue: number
  averageDealValue: number
  conversionRate: number
  activitiesLogged: number
}

export function TeamAnalyticsTab({ tenantId = '550e8400-e29b-41d4-a716-446655440000' }: { tenantId?: string }) {
  const [stats, setStats] = useState<UserStats[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadTeamStats()
  }, [tenantId])

  const loadTeamStats = async () => {
    try {
      setLoading(true)

      // Load all users
      const { data: users, error: usersError } = await supabase
        .from('app_users')
        .select('id, full_name, role')
        .eq('tenant_id', tenantId)

      if (usersError) throw usersError

      // Load all deals
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('id, owner_user_id, value_estimate_cents, stage:pipeline_stages(name)')
        .eq('tenant_id', tenantId)

      if (dealsError) throw dealsError

      // Calculate stats for each user
      const userStats: UserStats[] = (users || []).map(user => {
        const userDeals = (deals || []).filter(d => d.owner_user_id === user.id)
        const wonDeals = userDeals.filter(d => d.stage?.name?.toLowerCase().includes('won'))
        const lostDeals = userDeals.filter(d => d.stage?.name?.toLowerCase().includes('lost'))
        const totalValue = userDeals.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0)
        
        return {
          userId: user.id,
          userName: user.full_name,
          role: user.role,
          dealsOwned: userDeals.length,
          dealsWon: wonDeals.length,
          dealsLost: lostDeals.length,
          totalValue,
          averageDealValue: userDeals.length > 0 ? totalValue / userDeals.length : 0,
          conversionRate: userDeals.length > 0 ? (wonDeals.length / userDeals.length) * 100 : 0,
          activitiesLogged: 0 // TODO: Add activity count
        }
      })

      // Sort by total value (top performers first)
      userStats.sort((a, b) => b.totalValue - a.totalValue)

      setStats(userStats)
    } catch (error) {
      console.error('Error loading team stats:', error)
      setStats([])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(cents / 100)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner': return 'bg-purple-100 text-purple-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'staff': return 'bg-green-100 text-green-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const topPerformer = stats[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Team Performance
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Track individual and team performance metrics
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadTeamStats} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Top Performer */}
      {topPerformer && topPerformer.dealsOwned > 0 && (
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-xl bg-yellow-100 text-yellow-700 font-bold">
                  {topPerformer.userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-semibold text-lg">{topPerformer.userName}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getRoleBadgeColor(topPerformer.role)}>
                    {topPerformer.role}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {topPerformer.dealsOwned} deals • {formatCurrency(topPerformer.totalValue)} total value
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">
                  {topPerformer.conversionRate.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-600">Win Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
          <CardDescription>
            Individual performance breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-gray-300" />
              <p>Loading team stats...</p>
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No team members yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Invite team members to see performance metrics
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.map((user, index) => (
                <div
                  key={user.userId}
                  className="p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                      #{index + 1}
                    </div>

                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-purple-100 text-purple-700 font-semibold">
                            {user.userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-semibold">{user.userName}</div>
                          <Badge className={`${getRoleBadgeColor(user.role)} text-xs`}>
                            {user.role}
                          </Badge>
                        </div>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                            <Target className="h-3 w-3" />
                            <span>Deals</span>
                          </div>
                          <div className="text-xl font-bold text-gray-900">{user.dealsOwned}</div>
                          <div className="text-xs text-gray-500">
                            {user.dealsWon} won • {user.dealsLost} lost
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                            <DollarSign className="h-3 w-3" />
                            <span>Total Value</span>
                          </div>
                          <div className="text-xl font-bold text-green-600">
                            {formatCurrency(user.totalValue)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Avg: {formatCurrency(user.averageDealValue)}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                            <TrendingUp className="h-3 w-3" />
                            <span>Win Rate</span>
                          </div>
                          <div className="text-xl font-bold text-blue-600">
                            {user.conversionRate.toFixed(0)}%
                          </div>
                          <Progress 
                            value={user.conversionRate} 
                            className="h-1 mt-1"
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                            <Clock className="h-3 w-3" />
                            <span>Activity</span>
                          </div>
                          <div className="text-xl font-bold text-purple-600">
                            {user.activitiesLogged}
                          </div>
                          <div className="text-xs text-gray-500">
                            Actions logged
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Summary */}
      {stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team Summary</CardTitle>
            <CardDescription>Overall team performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.reduce((sum, s) => sum + s.dealsOwned, 0)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Deals</div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(stats.reduce((sum, s) => sum + s.totalValue, 0))}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Pipeline Value</div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  {stats.reduce((sum, s) => sum + s.dealsWon, 0)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Deals Won</div>
              </div>

              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-3xl font-bold text-orange-600">
                  {(stats.reduce((sum, s) => sum + s.conversionRate, 0) / stats.length).toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Average Win Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

