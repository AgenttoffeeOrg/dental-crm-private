'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Save, 
  Eye, 
  Monitor, 
  Smartphone, 
  Tablet,
  Undo,
  Redo,
  Code,
  Palette,
  Image as ImageIcon,
  Type,
  MousePointer,
  Layout,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

interface EmailBuilderProps {
  initialHtml?: string
  initialCss?: string
  onSave?: (html: string, css: string) => void
  templateId?: string
}

export function EmailBuilderAdvanced({ initialHtml, initialCss, onSave, templateId }: EmailBuilderProps) {
  const editorRef = useRef<any>(null)
  const [editor, setEditor] = useState<any>(null)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [showCode, setShowCode] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Dynamically import GrapesJS (client-side only)
    import('grapesjs').then((grapesjs) => {
      import('grapesjs-preset-newsletter').then((newsletter) => {
        const defaultHtml = initialHtml || `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 32px;">Welcome to Our Practice!</h1>
              <p style="color: white; margin: 10px 0 0; font-size: 16px;">Professional Dental Care</p>
            </div>
            
            <div style="padding: 40px 20px;">
              <h2 style="color: #333; font-size: 24px; margin: 0 0 20px;">Hi {{contact.first_name}},</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Thank you for choosing our dental practice. We're excited to help you achieve your best smile!
              </p>
              
              <div style="margin: 30px 0; text-align: center;">
                <a href="{{booking_url}}" style="background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px; font-weight: bold;">
                  Book Your Appointment
                </a>
              </div>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                If you have any questions, don't hesitate to reach out. We're here to help!
              </p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © 2025 Your Dental Practice. All rights reserved.
              </p>
              <p style="color: #999; font-size: 12px; margin: 10px 0 0;">
                <a href="{{unsubscribe_url}}" style="color: #667eea;">Unsubscribe</a> | 
                <a href="{{preference_center_url}}" style="color: #667eea; margin-left: 10px;">Update Preferences</a>
              </p>
            </div>
          </div>
        `

        const editorInstance = grapesjs.default.init({
          container: '#gjs-editor',
          fromElement: false,
          height: '650px',
          width: 'auto',
          storageManager: false,
          plugins: [newsletter.default],
          pluginsOpts: {
            [newsletter.default]: {
              // Newsletter preset options
            }
          },
          canvas: {
            styles: initialCss ? [initialCss] : [],
          },
          blockManager: {
            blocks: [
              {
                id: 'section',
                label: 'Section',
                attributes: { class: 'gjs-block-section' },
                content: '<section style="padding: 20px; background: #f8f9fa;"><h2>Section Title</h2><p>Section content</p></section>',
              },
              {
                id: 'text',
                label: 'Text',
                content: '<p style="padding: 10px; font-size: 16px; color: #666;">Insert your text here</p>',
              },
              {
                id: 'image',
                label: 'Image',
                select: true,
                content: { type: 'image', style: { width: '100%', padding: '10px' } },
                activate: true,
              },
              {
                id: 'button',
                label: 'Button',
                content: '<a href="#" style="background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Click Here</a>',
              },
              {
                id: 'divider',
                label: 'Divider',
                content: '<hr style="border: none; border-top: 1px solid #e9ecef; margin: 20px 0;">',
              },
              {
                id: '2-columns',
                label: '2 Columns',
                content: '<div style="display: flex; gap: 20px;"><div style="flex: 1; padding: 20px; background: #f8f9fa;">Column 1</div><div style="flex: 1; padding: 20px; background: #f8f9fa;">Column 2</div></div>',
              },
              {
                id: 'cta-box',
                label: 'CTA Box',
                content: '<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 10px; margin: 20px 0;"><h3 style="color: white; margin: 0 0 10px;">Special Offer!</h3><p style="color: white; margin: 0 0 20px;">Get 10% off your first visit</p><a href="#" style="background: white; color: #667eea; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Book Now</a></div>',
              },
              {
                id: 'testimonial',
                label: 'Testimonial',
                content: '<div style="background: #f8f9fa; padding: 30px; border-left: 4px solid #667eea; margin: 20px 0;"><p style="font-style: italic; color: #666; margin: 0 0 15px;">"Excellent service and care. Highly recommend!"</p><p style="color: #999; margin: 0; font-size: 14px;"><strong>- Patient Name</strong></p></div>',
              },
              {
                id: 'merge-tag',
                label: 'Merge Tag',
                content: '<span style="background: #fff3cd; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 14px;">{{contact.first_name}}</span>',
              }
            ]
          },
          layerManager: {
            appendTo: '#layers-container'
          },
          panels: {
            defaults: [
              {
                id: 'basic-actions',
                el: '.panel__basic-actions',
                buttons: [
                  {
                    id: 'visibility',
                    active: true,
                    className: 'btn-toggle-borders',
                    label: '<svg style="width:22px;height:22px" viewBox="0 0 24 24"><path fill="currentColor" d="M15,9H9V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H7A2,2 0 0,0 5,5V21L12,18L19,21V5C19,3.89 18.1,3 17,3Z" /></svg>',
                    command: 'sw-visibility',
                  },
                  {
                    id: 'export',
                    className: 'btn-open-export',
                    label: '<svg style="width:22px;height:22px" viewBox="0 0 24 24"><path fill="currentColor" d="M12.89,3L14.85,3.4L11.11,21L9.15,20.6L12.89,3M19.59,12L16,8.41V5.58L22.42,12L16,18.41V15.58L19.59,12M1.58,12L8,5.58V8.41L4.41,12L8,15.58V18.41L1.58,12Z" /></svg>',
                    command: 'export-template',
                  }
                ],
              },
            ]
          },
        })

        // Set initial content
        editorInstance.setComponents(defaultHtml)

        // Add custom commands
        editorInstance.Commands.add('export-template', {
          run(editor: any) {
            const html = editor.getHtml()
            const css = editor.getCss()
            if (onSave) {
              onSave(html, css)
            }
          }
        })

        setEditor(editorInstance)
      })
    })

    return () => {
      if (editor) {
        editor.destroy()
      }
    }
  }, [])

  const handleSave = () => {
    if (!editor) return
    
    setIsSaving(true)
    const html = editor.getHtml()
    const css = editor.getCss()
    
    if (onSave) {
      onSave(html, css)
    }
    
    toast.success('Email template saved!')
    setIsSaving(false)
  }

  const changePreviewMode = (mode: 'desktop' | 'tablet' | 'mobile') => {
    setPreviewMode(mode)
    if (editor) {
      const canvas = editor.Canvas
      switch (mode) {
        case 'desktop':
          canvas.setDevice('Desktop')
          break
        case 'tablet':
          canvas.setDevice('Tablet')
          break
        case 'mobile':
          canvas.setDevice('Mobile')
          break
      }
    }
  }

  const toggleCode = () => {
    setShowCode(!showCode)
    if (editor) {
      const codeEditor = editor.Commands.get('core:open-code')
      if (codeEditor) {
        editor.runCommand('core:open-code')
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-sm">
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template Name"
                  className="font-semibold"
                />
              </div>
              
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => changePreviewMode('desktop')}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewMode === 'tablet' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => changePreviewMode('tablet')}
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => changePreviewMode('mobile')}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={toggleCode} size="sm">
                <Code className="h-4 w-4 mr-2" />
                Code
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Test Send
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editor Container */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-12">
            {/* Blocks Panel */}
            <div className="col-span-2 border-r border-gray-200 p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Layout className="h-4 w-4" />
                Blocks
              </h3>
              <div className="panel__basic-actions mb-4"></div>
              <div id="blocks-container" className="space-y-2"></div>
              
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Merge Tags
                </h3>
                <div className="space-y-1">
                  <Badge variant="outline" className="w-full justify-start text-xs cursor-pointer hover:bg-gray-100">
                    {'{{contact.first_name}}'}
                  </Badge>
                  <Badge variant="outline" className="w-full justify-start text-xs cursor-pointer hover:bg-gray-100">
                    {'{{contact.email}}'}
                  </Badge>
                  <Badge variant="outline" className="w-full justify-start text-xs cursor-pointer hover:bg-gray-100">
                    {'{{contact.phone}}'}
                  </Badge>
                  <Badge variant="outline" className="w-full justify-start text-xs cursor-pointer hover:bg-gray-100">
                    {'{{unsubscribe_url}}'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Main Editor */}
            <div className="col-span-8">
              <div id="gjs-editor" ref={editorRef}></div>
            </div>

            {/* Layers Panel */}
            <div className="col-span-2 border-l border-gray-200 p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Layers</h3>
              <div id="layers-container"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Helper Text */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-1">Pro Tips:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Drag blocks from the left panel into your email</li>
                <li>• Click any element to edit text, colors, and styling</li>
                <li>• Use merge tags to personalize emails (e.g., {'{{contact.first_name}}'})</li>
                <li>• Switch between desktop/tablet/mobile to check responsive design</li>
                <li>• Save your template and reuse it for future campaigns</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



