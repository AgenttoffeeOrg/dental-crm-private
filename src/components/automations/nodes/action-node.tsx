'use client'

/**
 * ACTION NODE
 * Visual node for automation actions
 */

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Play } from 'lucide-react'

export const ActionNode = memo(({ data }: any) => {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white border-2 border-blue-700 min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-blue-700" />
      <div className="flex items-center gap-2 mb-1">
        <Play className="h-4 w-4" />
        <div className="font-semibold text-sm">Action</div>
      </div>
      <div className="text-xs font-medium">
        {data.label || 'Configure action...'}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-blue-700" />
    </div>
  )
})

ActionNode.displayName = 'ActionNode'

