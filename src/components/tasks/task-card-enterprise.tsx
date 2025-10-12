'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Phone, 
  Mail, 
  CheckSquare, 
  Calendar,
  MoreVertical,
  Clock,
  Link2,
  MessageSquare,
  Repeat
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface TaskCardProps {
  task: {
    id: string
    title: string
    description?: string
    status: 'open' | 'in_progress' | 'done' | 'cancelled'
    priority: 'low' | 'normal' | 'high' | 'urgent'
    task_type: 'call' | 'email' | 'todo' | 'meeting' | 'follow_up'
    due_at?: string
    contact_id?: string
    deal_id?: string
    assignee_user_id?: string
    is_recurring?: boolean
    subtask_count?: number
    comment_count?: number
    contact_name?: string
    deal_title?: string
    assignee_name?: string
  }
  onComplete?: (taskId: string) => void
  onClick?: (taskId: string) => void
  onQuickAction?: (taskId: string, action: string) => void
}

const PRIORITY_CONFIG = {
  urgent: { color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200', label: 'Urgent' },
  high: { color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', label: 'High' },
  normal: { color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', label: 'Normal' },
  low: { color: 'bg-gray-500', textColor: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', label: 'Low' }
}

const TASK_TYPE_ICONS = {
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  todo: <CheckSquare className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
  follow_up: <Repeat className="h-4 w-4" />
}

export function TaskCardEnterprise({ task, onComplete, onClick, onQuickAction }: TaskCardProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const priorityConfig = PRIORITY_CONFIG[task.priority]
  const isOverdue = task.due_at && new Date(task.due_at) < new Date() && task.status !== 'done'
  const isDueToday = task.due_at && new Date(task.due_at).toDateString() === new Date().toDateString()

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (task.status === 'done') return
    
    setIsCompleting(true)
    try {
      await onComplete?.(task.id)
    } finally {
      setIsCompleting(false)
    }
  }

  const handleCardClick = () => {
    onClick?.(task.id)
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "group relative bg-white rounded-lg border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer",
        priorityConfig.borderColor,
        task.status === 'done' && "opacity-60",
        isOverdue && "border-red-500"
      )}
    >
      {/* Priority Indicator Bar */}
      <div className={cn("absolute top-0 left-0 w-1 h-full rounded-l", priorityConfig.color)} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Checkbox */}
          <div className="flex-shrink-0 mt-0.5">
            <Checkbox
              checked={task.status === 'done'}
              disabled={isCompleting}
              onClick={handleComplete}
              className="h-5 w-5"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="flex items-center gap-2 mb-1">
              <div className={cn("flex-shrink-0 p-1.5 rounded", priorityConfig.bgColor)}>
                <span className={priorityConfig.textColor}>
                  {TASK_TYPE_ICONS[task.task_type]}
                </span>
              </div>
              <h4 className={cn(
                "font-medium text-sm text-gray-900 truncate",
                task.status === 'done' && "line-through text-gray-500"
              )}>
                {task.title}
              </h4>
              {task.is_recurring && (
                <Repeat className="h-3 w-3 text-gray-400 flex-shrink-0" />
              )}
            </div>

            {/* Description (if exists) */}
            {task.description && (
              <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                {task.description}
              </p>
            )}

            {/* Associations */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {task.deal_title && (
                <Badge variant="secondary" className="text-xs font-normal">
                  <Link2 className="h-3 w-3 mr-1" />
                  {task.deal_title}
                </Badge>
              )}
              {task.contact_name && (
                <Badge variant="outline" className="text-xs font-normal">
                  👤 {task.contact_name}
                </Badge>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              {/* Due Date & Meta */}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {task.due_at && (
                  <div className={cn(
                    "flex items-center gap-1",
                    isOverdue && "text-red-600 font-medium",
                    isDueToday && "text-orange-600 font-medium"
                  )}>
                    <Clock className="h-3 w-3" />
                    {isDueToday ? 'Today' : formatDistanceToNow(new Date(task.due_at), { addSuffix: true })}
                  </div>
                )}
                {task.subtask_count! > 0 && (
                  <div className="flex items-center gap-1">
                    <CheckSquare className="h-3 w-3" />
                    {task.subtask_count}
                  </div>
                )}
                {task.comment_count! > 0 && (
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {task.comment_count}
                  </div>
                )}
              </div>

              {/* Assignee Avatar */}
              {task.assignee_name && (
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {getInitials(task.assignee_name)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>

          {/* More Menu */}
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onQuickAction?.(task.id, 'menu')
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>

        {/* Priority Badge (bottom right) */}
        {(task.priority === 'urgent' || task.priority === 'high') && (
          <div className="absolute bottom-2 right-2">
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs font-semibold",
                priorityConfig.textColor,
                priorityConfig.bgColor
              )}
            >
              {priorityConfig.label}
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}

