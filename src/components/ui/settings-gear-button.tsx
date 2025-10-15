/**
 * Settings Gear Button
 * 
 * Reusable gear icon that deep-links to specific settings tab
 * 
 * Usage:
 * ```typescript
 * <SettingsGearButton tab="pipeline" />
 * <SettingsGearButton tab="deals" section="validation" />
 * <SettingsGearButton tab="integrations" section="twilio" label="Configure Twilio" />
 * ```
 */

'use client'

import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SettingsGearButtonProps {
  tab: string
  section?: string
  label?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function SettingsGearButton({
  tab,
  section,
  label,
  variant = 'ghost',
  size = 'icon',
  className,
}: SettingsGearButtonProps) {
  const router = useRouter()
  
  const handleClick = () => {
    let url = `/settings?tab=${tab}`
    if (section) {
      url += `&section=${section}`
    }
    router.push(url)
  }
  
  const tooltipText = label || `${tab.charAt(0).toUpperCase() + tab.slice(1)} Settings`
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            className={className}
            aria-label={tooltipText}
          >
            <Settings className="h-4 w-4" />
            {size !== 'icon' && label && (
              <span className="ml-2">{label}</span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

