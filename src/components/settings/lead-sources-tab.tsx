'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Edit, Trash2 } from 'lucide-react'

export function LeadSourcesTab() {
  const sources = [
    { id: 1, name: 'Website', count: 145, value: '$125,000' },
    { id: 2, name: 'Referral', count: 89, value: '$95,000' },
    { id: 3, name: 'Google Ads', count: 67, value: '$78,000' },
    { id: 4, name: 'Facebook', count: 34, value: '$42,000' },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lead Sources</CardTitle>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sources.map((source) => (
              <div key={source.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold">{source.name}</p>
                  <p className="text-sm text-gray-600">{source.count} contacts • {source.value} revenue</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

