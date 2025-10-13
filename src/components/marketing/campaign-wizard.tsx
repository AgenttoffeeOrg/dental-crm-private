'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, Send, Check } from 'lucide-react'

interface CampaignWizardProps {
  onComplete: (campaignData: any) => void
  onCancel: () => void
}

export function CampaignWizard({ onComplete, onCancel }: CampaignWizardProps) {
  const [step, setStep] = useState(1)
  const [campaignData, setCampaignData] = useState({
    name: '',
    type: 'email',
    segmentId: '',
    templateId: '',
    subject: '',
    fromName: '',
    fromEmail: '',
    scheduleType: 'now'
  })

  const steps = [
    { number: 1, title: 'Campaign Basics', description: 'Name and type' },
    { number: 2, title: 'Audience', description: 'Who to send to' },
    { number: 3, title: 'Content', description: 'Template selection' },
    { number: 4, title: 'Settings', description: 'From, subject, etc.' },
    { number: 5, title: 'Review & Send', description: 'Final check' },
  ]

  const progress = (step / steps.length) * 100

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-700">
            Step {step} of {steps.length}: {steps[step - 1].title}
          </h2>
          <Badge variant="outline">{Math.round(progress)}% Complete</Badge>
        </div>
        <Progress value={progress} className="h-2" />
        
        {/* Step Indicators */}
        <div className="flex justify-between mt-4">
          {steps.map(s => (
            <div key={s.number} className="flex flex-col items-center flex-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                s.number < step ? 'bg-green-600 text-white' :
                s.number === step ? 'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                {s.number < step ? <Check className="h-4 w-4" /> : s.number}
              </div>
              <p className="text-xs text-gray-600 mt-1 text-center">{s.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[step - 1].title}</CardTitle>
          <p className="text-sm text-gray-600">{steps[step - 1].description}</p>
        </CardHeader>
        <CardContent className="min-h-[400px]">
          {step === 1 && <Step1Basics data={campaignData} onChange={setCampaignData} />}
          {step === 2 && <Step2Audience data={campaignData} onChange={setCampaignData} />}
          {step === 3 && <Step3Content data={campaignData} onChange={setCampaignData} />}
          {step === 4 && <Step4Settings data={campaignData} onChange={setCampaignData} />}
          {step === 5 && <Step5Review data={campaignData} />}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={() => step === 1 ? onCancel() : setStep(step - 1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>
        <Button onClick={() => step === 5 ? onComplete(campaignData) : setStep(step + 1)}>
          {step === 5 ? (
            <>
              <Send className="h-4 w-4 mr-2" />
              Create Campaign
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

function Step1Basics({ data, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium block mb-2">Campaign Name</label>
        <Input
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="e.g., Spring Promotion 2024"
        />
      </div>
      <div>
        <label className="text-sm font-medium block mb-2">Campaign Type</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'email', label: 'Email Broadcast', desc: 'Single email to audience' },
            { value: 'email_ab', label: 'A/B Test', desc: 'Test subject/content variants' },
            { value: 'sms', label: 'SMS Campaign', desc: 'Text message blast' }
          ].map(type => (
            <Card
              key={type.value}
              className={`cursor-pointer transition-all ${
                data.type === type.value ? 'border-blue-600 bg-blue-50' : 'hover:border-gray-400'
              }`}
              onClick={() => onChange({ ...data, type: type.value })}
            >
              <CardContent className="p-4 text-center">
                <p className="font-medium text-sm">{type.label}</p>
                <p className="text-xs text-gray-600 mt-1">{type.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function Step2Audience({ data, onChange }: any) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Select the audience segment to send this campaign to</p>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <p className="text-gray-500">Segment selector will load here</p>
        <p className="text-xs text-gray-400 mt-2">Connect to marketing_segments table</p>
      </div>
    </div>
  )
}

function Step3Content({ data, onChange }: any) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Choose an email template or create new</p>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <p className="text-gray-500">Template selector will load here</p>
        <p className="text-xs text-gray-400 mt-2">Connect to marketing_templates table</p>
      </div>
    </div>
  )
}

function Step4Settings({ data, onChange }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium block mb-2">From Name</label>
          <Input
            value={data.fromName}
            onChange={(e) => onChange({ ...data, fromName: e.target.value })}
            placeholder="Your Practice Name"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">From Email</label>
          <Input
            type="email"
            value={data.fromEmail}
            onChange={(e) => onChange({ ...data, fromEmail: e.target.value })}
            placeholder="hello@yourpractice.com"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium block mb-2">Subject Line</label>
        <Input
          value={data.subject}
          onChange={(e) => onChange({ ...data, subject: e.target.value })}
          placeholder="e.g., Special Offer Just for You!"
        />
      </div>
    </div>
  )
}

function Step5Review({ data }: any) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Review Your Campaign</h4>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Name:</dt>
            <dd className="font-medium">{data.name || 'Not set'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Type:</dt>
            <dd className="font-medium">{data.type}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Subject:</dt>
            <dd className="font-medium">{data.subject || 'Not set'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">From:</dt>
            <dd className="font-medium">{data.fromName || data.fromEmail || 'Not set'}</dd>
          </div>
        </dl>
      </div>
      <p className="text-sm text-gray-600">
        Click "Create Campaign" to save as draft. You can send it later from the campaign detail page.
      </p>
    </div>
  )
}

