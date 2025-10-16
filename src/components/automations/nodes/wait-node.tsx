'use client'

/**
 * WAIT NODE
 * Visual node for delays/waits in automation
 */

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Clock } from 'lucide-react'

export const WaitNode = memo(({ data }: any) => {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 text-white border-2 border-gray-700 min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-gray-700" />
      <div className="flex items-center gap-2 mb-1">
        <Clock className="h-4 w-4" />
        <div className="font-semibold text-sm">Wait</div>
      </div>
      <div className="text-xs font-medium">
        {data.duration ? `${data.duration} ${data.unit || 'days'}` : 'Set duration...'}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-gray-700" />
    </div>
  )
})

WaitNode.displayName = 'WaitNode'

