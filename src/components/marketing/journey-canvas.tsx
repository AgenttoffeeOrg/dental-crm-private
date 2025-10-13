'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Zap,
  Mail,
  MessageSquare,
  Tag,
  Clock,
  GitBranch,
  Plus,
  Play,
  Pause,
  Save
} from 'lucide-react'
import type { JourneyGraph, JourneyNode } from '@/types/marketing'

interface JourneyCanvasProps {
  graph: JourneyGraph
  onChange: (graph: JourneyGraph) => void
  readonly?: boolean
}

const NODE_TYPES = [
  { type: 'trigger', icon: Zap, label: 'Trigger', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { type: 'email', icon: Mail, label: 'Send Email', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { type: 'sms', icon: MessageSquare, label: 'Send SMS', color: 'bg-green-100 text-green-700 border-green-300' },
  { type: 'tag', icon: Tag, label: 'Add/Remove Tag', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { type: 'wait', icon: Clock, label: 'Wait', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { type: 'branch', icon: GitBranch, label: 'If/Else Branch', color: 'bg-orange-100 text-orange-700 border-orange-300' },
]

export function JourneyCanvas({ graph, onChange, readonly = false }: JourneyCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const addNode = (type: string) => {
    const newNode: JourneyNode = {
      id: `node_${Date.now()}`,
      type: type as any,
      position: { x: 100, y: graph.nodes.length * 150 + 50 },
      data: getDefaultNodeData(type)
    }

    onChange({
      ...graph,
      nodes: [...graph.nodes, newNode]
    })
  }

  const deleteNode = (id: string) => {
    onChange({
      nodes: graph.nodes.filter(n => n.id !== id),
      edges: graph.edges.filter(e => e.source !== id && e.target !== id)
    })
  }

  return (
    <div className="grid grid-cols-12 gap-6 h-full">
      {/* Left: Node Palette */}
      <div className="col-span-3 space-y-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm text-gray-900 mb-3">Journey Nodes</h3>
            <div className="space-y-2">
              {NODE_TYPES.map(nodeType => {
                const Icon = nodeType.icon
                return (
                  <Button
                    key={nodeType.type}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => addNode(nodeType.type)}
                    disabled={readonly}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {nodeType.label}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm text-gray-900 mb-3">Journey Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Nodes:</span>
                <Badge variant="secondary">{graph.nodes.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Connections:</span>
                <Badge variant="secondary">{graph.edges.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Center: Canvas */}
      <div className="col-span-9">
        <Card className="h-full">
          <CardContent className="p-6">
            <div className="bg-gray-50 rounded-lg p-6 min-h-[600px] relative">
              {graph.nodes.length === 0 ? (
                <div className="text-center py-24">
                  <Zap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Start Building Your Journey</p>
                  <p className="text-sm text-gray-500 mt-1">Add nodes from the left to create your automation workflow</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {graph.nodes.map((node, index) => {
                    const nodeType = NODE_TYPES.find(t => t.type === node.type)
                    if (!nodeType) return null
                    const Icon = nodeType.icon

                    return (
                      <div key={node.id}>
                        <Card 
                          className={`max-w-md mx-auto cursor-pointer hover:shadow-lg transition-all border-2 ${
                            selectedNode === node.id ? 'ring-2 ring-blue-500' : ''
                          } ${nodeType.color}`}
                          onClick={() => setSelectedNode(node.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center">
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{nodeType.label}</p>
                                <p className="text-xs opacity-75">{getNodeDescription(node)}</p>
                              </div>
                              {!readonly && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteNode(node.id)
                                  }}
                                  className="h-6 w-6 p-0"
                                >
                                  ×
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        
                        {index < graph.nodes.length - 1 && (
                          <div className="flex justify-center py-2">
                            <div className="w-0.5 h-8 bg-gray-300"></div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function getDefaultNodeData(type: string): any {
  switch (type) {
    case 'trigger':
      return { triggerType: 'contact_created', config: {} }
    case 'email':
      return { templateId: null, subject: '' }
    case 'sms':
      return { message: '' }
    case 'tag':
      return { action: 'add', tagName: '' }
    case 'wait':
      return { duration: 1, unit: 'days' }
    case 'branch':
      return { condition: { field: '', operator: 'equals', value: '' } }
    default:
      return {}
  }
}

function getNodeDescription(node: JourneyNode): string {
  switch (node.type) {
    case 'trigger':
      return `When: ${node.data?.triggerType || 'Not configured'}`
    case 'email':
    case 'sms':
      return node.data?.subject || node.data?.message || 'Not configured'
    case 'tag':
      return `${node.data?.action || 'Add'} tag: ${node.data?.tagName || '...'}`
    case 'wait':
      return `Wait ${node.data?.duration || 1} ${node.data?.unit || 'days'}`
    case 'branch':
      return 'Conditional branch'
    default:
      return 'Configure this node'
  }
}

