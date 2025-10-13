'use client'

import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Button } from './button'
import { Plus, Phone, Mail, MessageSquare, Calendar, Users } from 'lucide-react'

export function QuickActionsWidget() {
  const actions = [
    { icon: Users, label: 'New Contact', color: 'bg-blue-500' },
    { icon: Plus, label: 'New Deal', color: 'bg-purple-500' },
    { icon: Phone, label: 'Log Call', color: 'bg-green-500' },
    { icon: Mail, label: 'Send Email', color: 'bg-orange-500' },
    { icon: MessageSquare, label: 'Send SMS', color: 'bg-pink-500' },
    { icon: Calendar, label: 'Schedule Task', color: 'bg-indigo-500' }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
            >
              <div className={`p-2 rounded-lg ${action.color} bg-opacity-10`}>
                <action.icon className="h-5 w-5" style={{ color: action.color.replace('bg-', '') }} />
              </div>
              <span className="text-sm">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

