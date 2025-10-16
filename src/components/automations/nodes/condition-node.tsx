'use client'

/**
 * CONDITION NODE
 * Visual node for if/else branching
 */

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { GitBranch } from 'lucide-react'

export const ConditionNode = memo(({ data }: any) => {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600 text-white border-2 border-orange-700 min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-orange-700" />
      <div className="flex items-center gap-2 mb-1">
        <GitBranch className="h-4 w-4" />
        <div className="font-semibold text-sm">Condition</div>
      </div>
      <div className="text-xs font-medium">
        {data.label || 'Set condition...'}
      </div>
      <div className="flex justify-between mt-2">
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="true" 
          className="w-3 h-3 !bg-green-500"
          style={{ left: '25%' }}
        />
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="false" 
          className="w-3 h-3 !bg-red-500"
          style={{ left: '75%' }}
        />
      </div>
    </div>
  )
})

ConditionNode.displayName = 'ConditionNode'

