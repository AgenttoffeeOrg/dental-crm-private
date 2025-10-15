'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth'
import { useFeatureFlags } from '@/hooks/use-feature-flags'
import { Rocket, TrendingUp, Users, Mail, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { cn } from '@/lib/utils'

export function GeneralSettingsPanel() {
  const { appUser } = useAuth()
  const { tenantPlan } = useFeatureFlags()
  const [stats, setStats] = useState({ campaigns: 0, contacts: 0, sent: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [appUser])

  const loadStats = async () => {
    if (!appUser?.tenant_id) return
    
    const supabase = createClient()
    try {
      const [campaigns, contacts, sends] = await Promise.all([
        supabase.from('marketing_campaigns').select('id', { count: 'exact', head: true }).eq('tenant_id', appUser.tenant_id),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', appUser.tenant_id),
        supabase.from('marketing_sends').select('id', { count: 'exact', head: true }),
      ])
      
      setStats({
        campaigns: campaigns.count || 0,
        contacts: contacts.count || 0,
        sent: sends.count || 0,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Marketing Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Rocket className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Total Campaigns</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.campaigns}</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Contacts</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.contacts.toLocaleString()}</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Messages Sent</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.sent.toLocaleString()}</div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Current Plan</h4>
                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    'text-sm px-3 py-1',
                    tenantPlan === 'enterprise' && 'bg-purple-600 text-white',
                    tenantPlan === 'pro' && 'bg-blue-600 text-white',
                    tenantPlan === 'starter' && 'bg-gray-600 text-white'
                  )}>
                    {tenantPlan.toUpperCase()}
                  </Badge>
                  {tenantPlan === 'enterprise' && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      All Features Unlocked
                    </Badge>
                  )}
                </div>
              </div>
              {tenantPlan !== 'enterprise' && (
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                  Upgrade Plan
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

