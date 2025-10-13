'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Type,
  Image as ImageIcon,
  MousePointer,
  Minus,
  AlignLeft,
  Layout,
  Plus,
  Eye,
  Code,
  Smartphone,
  Monitor,
  Sparkles,
  Trash2,
  GripVertical
} from 'lucide-react'
import type { EmailBlock } from '@/types/marketing'
import { cn } from '@/lib/utils'

interface TemplateEditorProps {
  blocks: EmailBlock[]
  onChange: (blocks: EmailBlock[]) => void
  onPreview?: () => void
}

const BLOCK_TYPES = [
  { type: 'header', icon: AlignLeft, label: 'Header', color: 'bg-blue-100 text-blue-700' },
  { type: 'text', icon: Type, label: 'Text', color: 'bg-gray-100 text-gray-700' },
  { type: 'image', icon: ImageIcon, label: 'Image', color: 'bg-purple-100 text-purple-700' },
  { type: 'button', icon: MousePointer, label: 'Button', color: 'bg-green-100 text-green-700' },
  { type: 'divider', icon: Minus, label: 'Divider', color: 'bg-gray-100 text-gray-700' },
  { type: 'spacer', icon: Layout, label: 'Spacer', color: 'bg-gray-100 text-gray-700' },
]

export function TemplateEditor({ blocks, onChange, onPreview }: TemplateEditorProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [showHTML, setShowHTML] = useState(false)

  const addBlock = (type: string) => {
    const newBlock: EmailBlock = {
      id: `block_${Date.now()}`,
      type: type as any,
      content: getDefaultContent(type),
      styles: {},
      settings: {}
    }
    
    onChange([...blocks, newBlock])
  }

  const updateBlock = (id: string, updates: Partial<EmailBlock>) => {
    onChange(blocks.map(block => 
      block.id === id ? { ...block, ...updates } : block
    ))
  }

  const removeBlock = (id: string) => {
    onChange(blocks.filter(block => block.id !== id))
  }

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id)
    if (index === -1) return
    
    if (direction === 'up' && index > 0) {
      const newBlocks = [...blocks]
      ;[newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]]
      onChange(newBlocks)
    } else if (direction === 'down' && index < blocks.length - 1) {
      const newBlocks = [...blocks]
      ;[newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]]
      onChange(newBlocks)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6 h-full">
      {/* Left: Block Palette */}
      <div className="col-span-3 space-y-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm text-gray-900 mb-3">Content Blocks</h3>
            <div className="space-y-2">
              {BLOCK_TYPES.map(blockType => (
                <Button
                  key={blockType.type}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => addBlock(blockType.type)}
                >
                  <blockType.icon className="h-4 w-4 mr-2" />
                  {blockType.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm text-gray-900 mb-3">AI Assistant</h3>
            <Button variant="outline" className="w-full mb-2">
              <Sparkles className="h-4 w-4 mr-2" />
              Suggest Content
            </Button>
            <Button variant="outline" className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              Optimize Copy
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Center: Canvas */}
      <div className="col-span-6">
        <Card className="h-full">
          <CardContent className="p-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={viewMode === 'desktop' ? 'default' : 'outline'}
                  onClick={() => setViewMode('desktop')}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Desktop
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'mobile' ? 'default' : 'outline'}
                  onClick={() => setViewMode('mobile')}
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowHTML(!showHTML)}
                >
                  <Code className="h-4 w-4 mr-2" />
                  {showHTML ? 'Visual' : 'HTML'}
                </Button>
                {onPreview && (
                  <Button size="sm" onClick={onPreview}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                )}
              </div>
            </div>

            {/* Canvas Area */}
            <div className={cn(
              "bg-gray-100 rounded-lg p-6 min-h-[600px]",
              viewMode === 'mobile' ? 'max-w-md mx-auto' : 'max-w-2xl mx-auto'
            )}>
              <div className="bg-white rounded shadow-lg">
                {blocks.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <Layout className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Drag blocks from the left to start building</p>
                    <p className="text-sm mt-1">Or click a block type to add it</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {blocks.map((block, index) => (
                      <div key={block.id} className="group hover:bg-blue-50 transition-colors">
                        <div className="p-4">
                          {/* Block Controls */}
                          <div className="flex items-center justify-between mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Badge variant="outline" className="text-xs">
                              {block.type}
                            </Badge>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => moveBlock(block.id, 'up')}
                                disabled={index === 0}
                              >
                                ↑
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => moveBlock(block.id, 'down')}
                                disabled={index === blocks.length - 1}
                              >
                                ↓
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => removeBlock(block.id)}
                              >
                                <Trash2 className="h-3 w-3 text-red-600" />
                              </Button>
                            </div>
                          </div>

                          {/* Block Content Preview */}
                          <BlockPreview block={block} onUpdate={(updates) => updateBlock(block.id, updates)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: Properties */}
      <div className="col-span-3">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm text-gray-900 mb-3">Merge Tags</h3>
            <div className="space-y-1 text-xs">
              <code className="block bg-gray-100 p-1 rounded">{'{{contact.first_name}}'}</code>
              <code className="block bg-gray-100 p-1 rounded">{'{{contact.email}}'}</code>
              <code className="block bg-gray-100 p-1 rounded">{'{{contact.city}}'}</code>
              <code className="block bg-gray-100 p-1 rounded">{'{{today.date}}'}</code>
              <code className="block bg-gray-100 p-1 rounded">{'{{link.unsubscribe}}'}</code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function getDefaultContent(type: string): any {
  switch (type) {
    case 'header':
      return { text: 'Header Text', level: 'h1' }
    case 'text':
      return { text: 'Add your content here...' }
    case 'image':
      return { url: '', alt: '', width: '100%' }
    case 'button':
      return { text: 'Click Here', url: '#', align: 'center' }
    case 'divider':
      return { style: 'solid', color: '#E5E7EB' }
    case 'spacer':
      return { height: '20px' }
    default:
      return {}
  }
}

function BlockPreview({ block, onUpdate }: { block: EmailBlock; onUpdate: (updates: Partial<EmailBlock>) => void }) {
  switch (block.type) {
    case 'header':
      return (
        <input
          type="text"
          value={block.content?.text || ''}
          onChange={(e) => onUpdate({ content: { ...block.content, text: e.target.value } })}
          className="text-2xl font-bold w-full bg-transparent border-none outline-none"
          placeholder="Header text..."
        />
      )
    
    case 'text':
      return (
        <textarea
          value={block.content?.text || ''}
          onChange={(e) => onUpdate({ content: { ...block.content, text: e.target.value } })}
          className="text-sm w-full bg-transparent border-none outline-none resize-none"
          placeholder="Your content here..."
          rows={3}
        />
      )
    
    case 'image':
      return (
        <div className="space-y-2">
          <input
            type="url"
            value={block.content?.url || ''}
            onChange={(e) => onUpdate({ content: { ...block.content, url: e.target.value } })}
            className="text-sm w-full bg-white border rounded px-2 py-1"
            placeholder="Image URL..."
          />
          {block.content?.url && (
            <img src={block.content.url} alt={block.content.alt || ''} className="max-w-full rounded" />
          )}
        </div>
      )
    
    case 'button':
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={block.content?.text || ''}
            onChange={(e) => onUpdate({ content: { ...block.content, text: e.target.value } })}
            className="text-sm w-full bg-white border rounded px-2 py-1"
            placeholder="Button text..."
          />
          <input
            type="url"
            value={block.content?.url || ''}
            onChange={(e) => onUpdate({ content: { ...block.content, url: e.target.value } })}
            className="text-sm w-full bg-white border rounded px-2 py-1"
            placeholder="Button URL..."
          />
          <div className="text-center">
            <button className="bg-blue-600 text-white px-6 py-2 rounded font-medium">
              {block.content?.text || 'Button'}
            </button>
          </div>
        </div>
      )
    
    case 'divider':
      return <hr className="border-gray-300" />
    
    case 'spacer':
      return (
        <div 
          className="bg-gray-100 border-2 border-dashed border-gray-300 rounded text-center text-xs text-gray-500 py-2"
          style={{ height: block.content?.height || '20px' }}
        >
          Spacer ({block.content?.height || '20px'})
        </div>
      )
    
    default:
      return <div className="text-sm text-gray-500">Unknown block type</div>
  }
}
