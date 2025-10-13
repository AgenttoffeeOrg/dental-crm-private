'use client'

import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Avatar, AvatarFallback } from './avatar'
import { formatDistanceToNow } from 'date-fns'
import { Phone, Mail, MessageSquare, CheckCircle } from 'lucide-react'

interface Activity {
  id: string
  type: 'call' | 'email' | 'sms' | 'task'
  user: string
  description: string
  time: Date
}

const activities: Activity[] = [
  {
    id: '1',
    type: 'call',
    user: 'John Smith',
    description: 'Called Jane Doe about dental implants',
    time: new Date(Date.now() - 1000 * 60 * 15)
  },
  {
    id: '2',
    type: 'email',
    user: 'Sarah Davis',
    description: 'Sent follow-up email to Michael Brown',
    time: new Date(Date.now() - 1000 * 60 * 45)
  },
  {
    id: '3',
    type: 'task',
    user: 'Emily White',
    description: 'Completed task: Schedule consultation',
    time: new Date(Date.now() - 1000 * 60 * 120)
  }
]

const icons = {
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  task: CheckCircle
}

export function ActivityFeedWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = icons[activity.type]
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-full">
                  <Icon className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.user}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(activity.time, { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

