'use client'

/**
 * AUTOMATION CANVAS - Visual Workflow Builder
 * 
 * Drag-and-drop visual automation builder using React Flow.
 * Supports all automation types: Deal, Task, Contact, Pipeline, Marketing
 */

import { useCallback, useState } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Save, 
  Play, 
  Pause, 
  Eye, 
  Undo, 
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react'
import { toast } from 'sonner'

// Custom node types
import { TriggerNode } from './nodes/trigger-node'
import { ActionNode } from './nodes/action-node'
import { ConditionNode } from './nodes/condition-node'
import { WaitNode } from './nodes/wait-node'

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  wait: WaitNode,
}

interface AutomationCanvasProps {
  automationId?: string
  category: 'deal' | 'task' | 'contact' | 'pipeline' | 'marketing'
  onSave?: (nodes: Node[], edges: Edge[]) => void
}

export function AutomationCanvas({ 
  automationId, 
  category,
  onSave 
}: AutomationCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  // Connect nodes
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  // Handle save
  const handleSave = () => {
    if (nodes.length === 0) {
      toast.error('Add at least one trigger node')
      return
    }

    // Validate workflow
    const hasTrigger = nodes.some(n => n.type === 'trigger')
    if (!hasTrigger) {
      toast.error('Workflow must have at least one trigger')
      return
    }

    // Check for orphan nodes
    const orphans = nodes.filter(node => {
      const hasIncoming = edges.some(e => e.target === node.id)
      const hasOutgoing = edges.some(e => e.source === node.id)
      return node.type !== 'trigger' && !hasIncoming && !hasOutgoing
    })

    if (orphans.length > 0) {
      toast.error(`${orphans.length} orphan node(s) detected. Connect all nodes.`)
      return
    }

    // Save
    onSave?.(nodes, edges)
    toast.success('Automation saved successfully')
  }

  // Handle test
  const handleTest = () => {
    toast.info('Test mode coming soon!')
    // TODO: Implement simulation mode
  }

  // Add node from palette (called by NodePalette component)
  const addNode = (type: string, nodeData: any) => {
    const newNode: Node = {
      id: `${type}_${Date.now()}`,
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: nodeData,
    }
    setNodes((nds) => [...nds, newNode])
  }

  return (
    <div className="flex h-full">
      {/* Main Canvas */}
      <div className="flex-1 relative">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-lg p-2">
            <Button size="sm" variant="outline" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleTest}>
              <Eye className="h-4 w-4 mr-2" />
              Test
            </Button>
            <div className="h-6 w-px bg-gray-200 mx-2" />
            <Button size="sm" variant="ghost">
              <Undo className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost">
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 bg-white rounded-lg shadow-lg p-2">
            <Button size="sm" variant="outline">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* React Flow Canvas */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedNode(node)}
          fitView
          className="bg-gray-50"
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <Controls />
          <MiniMap />
        </ReactFlow>

        {/* Empty State */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Card className="p-8 text-center bg-white/90 backdrop-blur pointer-events-auto">
              <h3 className="text-lg font-semibold mb-2">Start Building Your Automation</h3>
              <p className="text-gray-600 mb-4">
                Drag a trigger from the left panel to begin
              </p>
            </Card>
          </div>
        )}
      </div>

      {/* Node Palette - Left Sidebar */}
      <NodePalette category={category} onAddNode={addNode} />

      {/* Node Properties - Right Panel */}
      {selectedNode && (
        <NodePropertiesPanel
          node={selectedNode}
          onUpdate={(updates) => {
            setNodes(nds => 
              nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, ...updates } } : n)
            )
          }}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  )
}

// Placeholder components (will be built separately)
function NodePalette({ category, onAddNode }: any) {
  return (
    <div className="w-64 bg-white border-l p-4 overflow-y-auto">
      <h3 className="font-semibold mb-4">Nodes</h3>
      <p className="text-sm text-gray-500">Node palette coming soon</p>
    </div>
  )
}

function NodePropertiesPanel({ node, onUpdate, onClose }: any) {
  return (
    <div className="w-96 bg-white border-l p-4 overflow-y-auto">
      <h3 className="font-semibold mb-4">Node Properties</h3>
      <p className="text-sm text-gray-500">Properties panel coming soon</p>
    </div>
  )
}

