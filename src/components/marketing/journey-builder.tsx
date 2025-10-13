'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Play,
  Plus,
  Mail,
  MessageSquare,
  Phone,
  Clock,
  GitBranch,
  Zap,
  Users,
  Filter,
  Save,
  Eye
} from 'lucide-react'

interface JourneyNode {
  id: string
  type: 'trigger' | 'action' | 'wait' | 'condition'
  data: any
  position: { x: number; y: number }
}

export function JourneyBuilder() {
  const [journeyName, setJourneyName] = useState('')
  const [nodes, setNodes] = useState<JourneyNode[]>([
    {
      id: '1',
      type: 'trigger',
      data: { label: 'Form Submitted' },
      position: { x: 100, y: 50 }
    }
  ])

  const nodeTemplates = [
    { type: 'action', icon: Mail, label: 'Send Email', color: 'blue' },
    { type: 'action', icon: MessageSquare, label: 'Send SMS', color: 'green' },
    { type: 'action', icon: Phone, label: 'Send WhatsApp', color: 'purple' },
    { type: 'wait', icon: Clock, label: 'Wait', color: 'orange' },
    { type: 'condition', icon: GitBranch, label: 'If/Else Branch', color: 'pink' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <Input
                value={journeyName}
                onChange={(e) => setJourneyName(e.target.value)}
                placeholder="Journey Name (e.g., Welcome Series)"
                className="text-lg font-semibold"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button>
                <Save className="h-4 w-4 mr-2" />
                Save Journey
              </Button>
              <Button className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-2" />
                Activate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Builder Area */}
      <div className="grid grid-cols-12 gap-6">
        {/* Toolbox */}
        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Triggers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Zap className="h-4 w-4 mr-2 text-yellow-600" />
                Form Submitted
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Users className="h-4 w-4 mr-2 text-blue-600" />
                Contact Created
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Filter className="h-4 w-4 mr-2 text-purple-600" />
                Segment Entered
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {nodeTemplates.map((template) => {
                const Icon = template.icon
                return (
                  <Button
                    key={template.label}
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <Icon className={`h-4 w-4 mr-2 text-${template.color}-600`} />
                    {template.label}
                  </Button>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Canvas */}
        <div className="col-span-9">
          <Card className="min-h-[600px] bg-gradient-to-br from-gray-50 to-blue-50/20">
            <CardContent className="p-6">
              <div className="relative h-[560px] border-2 border-dashed border-gray-300 rounded-lg bg-white/50">
                {/* Visual Journey Flow */}
                <div className="flex flex-col items-center gap-6 p-8">
                  {/* Trigger Node */}
                  <div className="w-64">
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg p-4 shadow-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="h-6 w-6" />
                        <div>
                          <p className="font-semibold">Trigger</p>
                          <p className="text-sm opacity-90">Form Submitted</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Connector */}
                  <div className="w-0.5 h-12 bg-gradient-to-b from-gray-400 to-gray-300"></div>

                  {/* Action Node 1 */}
                  <div className="w-64">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4 shadow-lg">
                      <div className="flex items-center gap-3">
                        <Mail className="h-6 w-6" />
                        <div>
                          <p className="font-semibold">Send Email</p>
                          <p className="text-sm opacity-90">Welcome Email</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Connector */}
                  <div className="w-0.5 h-12 bg-gradient-to-b from-gray-400 to-gray-300"></div>

                  {/* Wait Node */}
                  <div className="w-64">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-4 shadow-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="h-6 w-6" />
                        <div>
                          <p className="font-semibold">Wait</p>
                          <p className="text-sm opacity-90">2 days</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Connector */}
                  <div className="w-0.5 h-12 bg-gradient-to-b from-gray-400 to-gray-300"></div>

                  {/* Action Node 2 */}
                  <div className="w-64">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4 shadow-lg">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-6 w-6" />
                        <div>
                          <p className="font-semibold">Send SMS</p>
                          <p className="text-sm opacity-90">Follow-up Reminder</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add Button */}
                  <Button variant="outline" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                </div>

                {/* Helper Text */}
                <div className="absolute bottom-4 left-4 right-4 text-center">
                  <p className="text-sm text-gray-500">
                    Drag actions from the left panel to build your journey
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Journey Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Total Entered</p>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Currently Active</p>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Completed</p>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
            <p className="text-2xl font-bold">-%</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

