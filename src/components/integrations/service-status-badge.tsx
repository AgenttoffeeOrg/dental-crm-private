'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Clock, XCircle, HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ServiceStatusBadgeProps {
  status: 'connected' | 'pending_verification' | 'missing_scopes' | 'available' | 'error'
  requiresVerification?: boolean
  missingScopes?: string[]
}

export function ServiceStatusBadge({ 
  status, 
  requiresVerification = false,
  missingScopes = []
}: ServiceStatusBadgeProps) {
  const getBadgeContent = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
          text: 'Connected',
          className: 'bg-green-50 text-green-700 border-green-200',
        }
      case 'pending_verification':
        return {
          icon: <Clock className="h-3 w-3 mr-1" />,
          text: 'Pending Verification',
          className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        }
      case 'missing_scopes':
        return {
          icon: <XCircle className="h-3 w-3 mr-1" />,
          text: 'Needs Permission',
          className: 'bg-orange-50 text-orange-700 border-orange-200',
        }
      case 'error':
        return {
          icon: <AlertCircle className="h-3 w-3 mr-1" />,
          text: 'Error',
          className: 'bg-red-50 text-red-700 border-red-200',
        }
      default:
        return {
          icon: <HelpCircle className="h-3 w-3 mr-1" />,
          text: 'Available',
          className: 'bg-gray-50 text-gray-700 border-gray-200',
        }
    }
  }

  const badgeContent = getBadgeContent()
  const tooltipText = (() => {
    if (status === 'pending_verification') {
      return 'This service requires app verification. It will be available after Google reviews our application (usually 2-6 weeks).'
    }
    if (status === 'missing_scopes') {
      const scopeText = missingScopes.slice(0, 2).join(', ')
      const ellipsis = missingScopes.length > 2 ? '...' : ''
      return `Missing permissions: ${scopeText}${ellipsis}. Click "Enable" to grant access.`
    }
    return ''
  })()

  const badge = (
    <Badge variant="outline" className={badgeContent.className}>
      {badgeContent.icon}
      {badgeContent.text}
    </Badge>
  )

  if (tooltipText) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return badge
}

