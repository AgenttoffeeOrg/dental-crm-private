'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

interface AreaChartWidgetProps {
  data: Array<{
    month: string
    value: number
  }>
  title: string
  color?: string
  gradientFrom?: string
  gradientTo?: string
}

/**
 * Area Chart Widget
 * 
 * Displays cumulative or trending data with filled area.
 * Great for showing growth over time with visual impact.
 */
export function AreaChartWidget({
  data,
  title,
  color = '#4F46E5',
  gradientFrom = '#4F46E5',
  gradientTo = '#4F46E510'
}: AreaChartWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={gradientFrom} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={gradientTo} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                tickFormatter={(value) => {
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                  return `$${value}`
                }}
              />
              <Tooltip 
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '8px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={color}
                strokeWidth={2}
                fill="url(#colorValue)"
                activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

