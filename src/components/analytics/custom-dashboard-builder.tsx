'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, GripVertical } from 'lucide-react'

interface Widget {
  id: string
  title: string
  type: 'metric' | 'chart' | 'table'
  size: 'small' | 'medium' | 'large'
}

export function CustomDashboardBuilder() {
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: '1', title: 'Total Revenue', type: 'metric', size: 'small' },
    { id: '2', title: 'Deals Pipeline', type: 'chart', size: 'medium' }
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Custom Dashboard</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Widget
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {widgets.map(widget => (
          <Card key={widget.id} className="col-span-4">
            <CardHeader className="cursor-move">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-gray-400" />
                <CardTitle className="text-sm">{widget.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                {widget.type} widget
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}


