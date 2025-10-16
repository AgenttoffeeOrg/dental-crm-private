'use client'

/**
 * TRIGGER NODE
 * Visual node for automation triggers
 */

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Zap } from 'lucide-react'

export const TriggerNode = memo(({ data }: any) => {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white border-2 border-purple-700 min-w-[200px]">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="h-4 w-4" />
        <div className="font-semibold text-sm">Trigger</div>
      </div>
      <div className="text-xs font-medium">
        {data.label || 'Select trigger...'}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-purple-700" />
    </div>
  )
})

TriggerNode.displayName = 'TriggerNode'

