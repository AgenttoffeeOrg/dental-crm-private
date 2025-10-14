'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { 
  Split,
  TrendingUp,
  Users,
  Eye,
  MousePointerClick,
  Trophy,
  BarChart3
} from 'lucide-react'

interface ABTestConfig {
  variantA: {
    name: string
    subject: string
    content: string
  }
  variantB: {
    name: string
    subject: string
    content: string
  }
  splitPercentage: number
  winnerCriteria: 'open_rate' | 'click_rate' | 'conversion_rate'
  sampleSize: number
  autoSelectWinner: boolean
  sendToRemaining: boolean
}

export function ABTestBuilder({ onSave }: { onSave?: (config: ABTestConfig) => void }) {
  const [config, setConfig] = useState<ABTestConfig>({
    variantA: {
      name: 'Variant A',
      subject: '',
      content: ''
    },
    variantB: {
      name: 'Variant B',
      subject: '',
      content: ''
    },
    splitPercentage: 50,
    winnerCriteria: 'open_rate',
    sampleSize: 20,
    autoSelectWinner: true,
    sendToRemaining: true
  })

  return (
    <div className="space-y-6">
      {/* A/B Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Split className="h-5 w-5" />
            A/B Test Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Split Configuration */}
          <div>
            <Label className="mb-3 block">Test Sample Size</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[config.sampleSize]}
                onValueChange={(value) => setConfig({ ...config, sampleSize: value[0] })}
                min={10}
                max={50}
                step={5}
                className="flex-1"
              />
              <Badge variant="outline" className="w-16 justify-center">
                {config.sampleSize}%
              </Badge>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Send test to {config.sampleSize}% of audience, then send winner to remaining {100 - config.sampleSize}%
            </p>
          </div>

          {/* Traffic Split */}
          <div>
            <Label className="mb-3 block">Traffic Split (A/B)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[config.splitPercentage]}
                onValueChange={(value) => setConfig({ ...config, splitPercentage: value[0] })}
                min={20}
                max={80}
                step={10}
                className="flex-1"
              />
              <Badge variant="outline" className="w-24 justify-center">
                {config.splitPercentage}/{100 - config.splitPercentage}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Variant A: {config.splitPercentage}%, Variant B: {100 - config.splitPercentage}%
            </p>
          </div>

          {/* Winner Criteria */}
          <div>
            <Label className="mb-3 block">Winner Selection Criteria</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setConfig({ ...config, winnerCriteria: 'open_rate' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  config.winnerCriteria === 'open_rate'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Eye className={`h-6 w-6 mx-auto mb-2 ${config.winnerCriteria === 'open_rate' ? 'text-blue-600' : 'text-gray-400'}`} />
                <p className="font-semibold text-sm">Open Rate</p>
              </button>

              <button
                onClick={() => setConfig({ ...config, winnerCriteria: 'click_rate' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  config.winnerCriteria === 'click_rate'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <MousePointerClick className={`h-6 w-6 mx-auto mb-2 ${config.winnerCriteria === 'click_rate' ? 'text-green-600' : 'text-gray-400'}`} />
                <p className="font-semibold text-sm">Click Rate</p>
              </button>

              <button
                onClick={() => setConfig({ ...config, winnerCriteria: 'conversion_rate' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  config.winnerCriteria === 'conversion_rate'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <TrendingUp className={`h-6 w-6 mx-auto mb-2 ${config.winnerCriteria === 'conversion_rate' ? 'text-purple-600' : 'text-gray-400'}`} />
                <p className="font-semibold text-sm">Conversions</p>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variant A */}
      <Card className="border-blue-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Variant A</CardTitle>
            <Badge className="bg-blue-600">Control</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Subject Line A</Label>
            <Input
              value={config.variantA.subject}
              onChange={(e) => setConfig({
                ...config,
                variantA: { ...config.variantA, subject: e.target.value }
              })}
              placeholder="Subject line for variant A"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Content A</Label>
            <Textarea
              value={config.variantA.content}
              onChange={(e) => setConfig({
                ...config,
                variantA: { ...config.variantA, content: e.target.value }
              })}
              placeholder="Email content for variant A"
              rows={4}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Variant B */}
      <Card className="border-green-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Variant B</CardTitle>
            <Badge className="bg-green-600">Test</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Subject Line B</Label>
            <Input
              value={config.variantB.subject}
              onChange={(e) => setConfig({
                ...config,
                variantB: { ...config.variantB, subject: e.target.value }
              })}
              placeholder="Subject line for variant B"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Content B</Label>
            <Textarea
              value={config.variantB.content}
              onChange={(e) => setConfig({
                ...config,
                variantB: { ...config.variantB, content: e.target.value }
              })}
              placeholder="Email content for variant B"
              rows={4}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Test Summary */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center">
              <Trophy className="h-8 w-8 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 mb-1">A/B Test Summary</p>
              <p className="text-sm text-gray-600">
                Send to {config.sampleSize}% of audience ({config.splitPercentage}% variant A, {100 - config.splitPercentage}% variant B).
                Winner selected by {config.winnerCriteria.replace('_', ' ')}, then sent to remaining {100 - config.sampleSize}%.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => onSave?.(config)} className="w-full">
        <BarChart3 className="h-4 w-4 mr-2" />
        Create A/B Test Campaign
      </Button>
    </div>
  )
}



