'use client'

import { Badge } from './badge'
import { LucideIcon } from 'lucide-react'

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled' | 'won' | 'lost'
  icon?: LucideIcon
}

export function StatusBadge({ status, icon: Icon }: StatusBadgeProps) {
  const variants = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    won: 'bg-green-100 text-green-800',
    lost: 'bg-red-100 text-red-800'
  }

  return (
    <Badge className={variants[status]}>
      {Icon && <Icon className="h-3 w-3 mr-1" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}


