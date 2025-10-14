'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'

export function TagsManagementTab() {
  const [tags, setTags] = useState([
    { id: 1, name: 'VIP', color: '#f59e0b', count: 12 },
    { id: 2, name: 'Hot Lead', color: '#ef4444', count: 8 },
    { id: 3, name: 'Follow Up', color: '#3b82f6', count: 24 },
  ])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input placeholder="New tag name..." />
            <Input type="color" className="w-20" defaultValue="#6366f1" />
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded" style={{ backgroundColor: tag.color }} />
                  <span className="font-medium">{tag.name}</span>
                  <span className="text-sm text-gray-500">({tag.count} contacts)</span>
                </div>
                <Button variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


