'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Mail, Users, MousePointer, Target } from 'lucide-react'

export function MarketingReportsDashboard() {
  const stats = [
    { label: 'Total Sends (30d)', value: '0', change: '+0%', icon: Mail, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Avg Open Rate', value: '0%', change: '+0%', icon: Target, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Avg Click Rate', value: '0%', change: '+0%', icon: MousePointer, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Active Contacts', value: '0', change: '+0%', icon: Users, color: 'text-orange-600', bg: 'bg-orange-100' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-6">
        {stats.map(stat => {
          const Icon = stat.icon
          const isPositive = stat.change.startsWith('+')
          
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  {isPositive ? (
                    <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                  )}
                  <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-gray-500">vs last month</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>Chart placeholder - Connect to campaigns data</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audience Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>Chart placeholder - Connect to contacts data</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


