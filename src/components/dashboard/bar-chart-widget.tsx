'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

interface BarChartWidgetProps {
  data: Array<{
    name: string
    value: number
    comparison?: number
  }>
  title: string
  valueLabel?: string
  comparisonLabel?: string
  color?: string
  comparisonColor?: string
}

/**
 * Bar Chart Widget
 * 
 * Displays comparative data in bar chart format.
 * Useful for side-by-side comparisons (this month vs last month, etc.)
 */
export function BarChartWidget({
  data,
  title,
  valueLabel = 'Current',
  comparisonLabel = 'Previous',
  color = '#4F46E5',
  comparisonColor = '#9CA3AF'
}: BarChartWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="name" 
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
                formatter={(value: number) => [`$${value.toLocaleString()}`, valueLabel]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '8px'
                }}
              />
              <Legend />
              <Bar 
                dataKey="value" 
                fill={color} 
                name={valueLabel}
                radius={[8, 8, 0, 0]}
              />
              {data.some(d => d.comparison !== undefined) && (
                <Bar 
                  dataKey="comparison" 
                  fill={comparisonColor} 
                  name={comparisonLabel}
                  radius={[8, 8, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

