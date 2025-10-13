'use client'

import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: ReactNode
  children?: ReactNode
}

export function PageHeader({ title, description, icon: Icon, actions, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          {Icon && <Icon className="h-8 w-8 text-indigo-600" />}
          {title}
        </h1>
        {description && <p className="text-gray-600 mt-1">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}

