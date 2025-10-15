'use client'

/**
 * Inline Help Tooltip Component
 * 
 * Question mark icons with helpful tooltips
 * 
 * Usage:
 * ```typescript
 * <Label>
 *   Email Provider
 *   <InlineHelp content="Choose your email service provider for transactional emails" />
 * </Label>
 * ```
 */

import { HelpCircle, ExternalLink } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'

interface InlineHelpProps {
  content: string
  learnMoreUrl?: string
}

export function InlineHelp({ content, learnMoreUrl }: InlineHelpProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center ml-1 text-gray-400 hover:text-gray-600 transition"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{content}</p>
          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2"
            >
              Learn more
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

