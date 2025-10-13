'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2 } from 'lucide-react'

export function CustomFieldsTab() {
  const fields = [
    { id: 1, name: 'Insurance Provider', type: 'text', entity: 'Contact' },
    { id: 2, name: 'Referral Source', type: 'dropdown', entity: 'Contact' },
    { id: 3, name: 'Treatment Category', type: 'dropdown', entity: 'Deal' },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Custom Fields</CardTitle>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {fields.map((field) => (
              <div key={field.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-semibold">{field.name}</p>
                  <p className="text-sm text-gray-600">{field.type} • {field.entity}</p>
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

