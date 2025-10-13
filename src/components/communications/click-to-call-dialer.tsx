'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  X, 
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Circle,
  Sparkles,
  Target,
  AlertCircle,
  CheckCircle2,
  TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase-client'

interface ClickToCallDialerProps {
  isOpen: boolean
  onClose: () => void
  phoneNumber: string
  contactName?: string
  contactId?: string
  dealId?: string
  tenantId?: string
  userId?: string
}

export function ClickToCallDialer({
  isOpen,
  onClose,
  phoneNumber,
  contactName = 'Unknown',
  contactId,
  dealId,
  tenantId = '550e8400-e29b-41d4-a716-446655440000',
  userId = '550e8400-e29b-41d4-a716-446655440000'
}: ClickToCallDialerProps) {
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle')
  const [callDuration, setCallDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [speakerOn, setSpeakerOn] = useState(false)
  const [recording, setRecording] = useState(true)
  const [dealIntelligence, setDealIntelligence] = useState<any>(null)
  const [loadingIntelligence, setLoadingIntelligence] = useState(false)

  // Load deal intelligence when panel opens
  useEffect(() => {
    if (isOpen && dealId) {
      loadDealIntelligence()
    }
  }, [isOpen, dealId])

  const loadDealIntelligence = async () => {
    if (!dealId) return
    
    setLoadingIntelligence(true)
    const supabase = createClient()

    try {
      const { data: deal } = await supabase
        .from('deals')
        .select(`
          *,
          stage:pipeline_stages(name),
          contact:contacts(full_name, primary_phone, primary_email)
        `)
        .eq('id', dealId)
        .single()

      if (deal) {
        setDealIntelligence({
          dealTitle: deal.title,
          dealValue: deal.value_estimate_cents,
          stage: deal.stage?.name,
          treatmentTags: deal.treatment_tags || [],
          contactName: deal.contact?.full_name
        })
      }
    } catch (error) {
      console.error('Error loading deal intelligence:', error)
    } finally {
      setLoadingIntelligence(false)
    }
  }

  const initiateCall = async () => {
    setCallStatus('calling')
    
    try {
      const response = await fetch('/api/communications/initiate-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          contact_id: contactId,
          deal_id: dealId,
          tenant_id: tenantId,
          user_id: userId,
          record: recording
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || 'Call initiated!')
        setCallStatus('connected')
        
        // Simulate call timer
        const interval = setInterval(() => {
          setCallDuration(prev => prev + 1)
        }, 1000)

        // Cleanup on unmount
        return () => clearInterval(interval)
      } else {
        toast.error(data.error || 'Failed to initiate call')
        setCallStatus('idle')
      }
    } catch (error) {
      console.error('Error initiating call:', error)
      toast.error('Failed to initiate call')
      setCallStatus('idle')
    }
  }

  const endCall = () => {
    setCallStatus('ended')
    toast.success(`Call ended. Duration: ${formatDuration(callDuration)}`)
    
    // Close dialer after 2 seconds
    setTimeout(() => {
      onClose()
      setCallStatus('idle')
      setCallDuration(0)
    }, 2000)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50" 
        onClick={callStatus === 'idle' ? onClose : undefined}
      />
      
      {/* Slide-in Panel from Right - Split View */}
      <div className="fixed inset-y-0 right-0 w-full max-w-3xl bg-white shadow-2xl z-50 flex">
        {/* LEFT SIDE: Dialer & Controls (40%) */}
        <div className="w-[40%] bg-gradient-to-br from-blue-500 to-blue-700 text-white flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Call</h2>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-white hover:bg-white/20"
              disabled={callStatus === 'calling' || callStatus === 'connected'}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Contact Info */}
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="w-24 h-24 mb-4 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-4xl font-bold">
                {contactName?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-1">{contactName || 'Unknown'}</h2>
            <p className="text-blue-100 text-lg mb-2">{phoneNumber}</p>
            
            <Badge className={cn("mt-2",
              callStatus === 'calling' && 'bg-yellow-500 animate-pulse',
              callStatus === 'connected' && 'bg-green-500',
              callStatus === 'ended' && 'bg-red-500',
              callStatus === 'idle' && 'bg-blue-400'
            )}>
              {callStatus === 'calling' && '📞 Calling...'}
              {callStatus === 'connected' && '✅ Connected'}
              {callStatus === 'ended' && '📴 Call Ended'}
              {callStatus === 'idle' && '🎯 Ready to Call'}
            </Badge>
            
            {/* Call Duration */}
            {(callStatus === 'connected' || callStatus === 'ended') && (
              <div className="mt-6 text-5xl font-mono font-bold">
                {formatDuration(callDuration)}
              </div>
            )}

            {/* Recording Indicator */}
            {callStatus === 'connected' && recording && (
              <div className="mt-4 flex items-center gap-2 text-sm text-blue-100">
                <Circle className="h-3 w-3 fill-red-500 text-red-500 animate-pulse" />
                Recording in progress
              </div>
            )}
          </div>

          {/* Call Controls */}
          <div className="p-6 space-y-4">
            {callStatus === 'idle' && (
              <>
                <Button
                  onClick={initiateCall}
                  className="w-full h-14 bg-green-500 hover:bg-green-600 text-white text-lg font-semibold rounded-full shadow-lg"
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Call Now
                </Button>
                <div className="text-center text-sm text-blue-100">
                  <p className="flex items-center justify-center gap-2">
                    {recording ? <Circle className="h-2 w-2 fill-red-500 text-red-500" /> : <Circle className="h-2 w-2" />}
                    {recording ? 'Call will be recorded' : 'Recording disabled'}
                  </p>
                </div>
              </>
            )}

            {callStatus === 'calling' && (
              <div className="text-center py-8">
                <div className="animate-pulse">
                  <Phone className="h-16 w-16 mx-auto mb-4" />
                </div>
                <p className="text-xl">Connecting...</p>
              </div>
            )}

            {callStatus === 'connected' && (
              <>
                {/* Control Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setMuted(!muted)}
                    className={cn(
                      "h-20 flex-col gap-2 rounded-xl",
                      muted ? "bg-red-500/30 hover:bg-red-500/40" : "bg-white/10 hover:bg-white/20"
                    )}
                  >
                    {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    <span className="text-xs font-medium">{muted ? 'Unmute' : 'Mute'}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => setSpeakerOn(!speakerOn)}
                    className={cn(
                      "h-20 flex-col gap-2 rounded-xl",
                      speakerOn ? "bg-blue-400/30 hover:bg-blue-400/40" : "bg-white/10 hover:bg-white/20"
                    )}
                  >
                    {speakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
                    <span className="text-xs font-medium">Speaker</span>
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => setRecording(!recording)}
                    className={cn(
                      "h-20 flex-col gap-2 rounded-xl",
                      recording ? "bg-red-500/30 hover:bg-red-500/40" : "bg-white/10 hover:bg-white/20"
                    )}
                  >
                    <Circle className={cn("h-6 w-6", recording && "fill-red-500 animate-pulse")} />
                    <span className="text-xs font-medium">{recording ? 'Recording' : 'Record'}</span>
                  </Button>
                </div>

                {/* End Call Button */}
                <Button
                  onClick={endCall}
                  className="w-full h-14 bg-red-500 hover:bg-red-600 text-white text-lg font-semibold rounded-full shadow-lg"
                >
                  <PhoneOff className="h-5 w-5 mr-2" />
                  End Call
                </Button>
              </>
            )}

            {callStatus === 'ended' && (
              <div className="text-center py-8">
                <PhoneOff className="h-16 w-16 mx-auto mb-4 text-red-300" />
                <p className="text-xl font-semibold">Call Ended</p>
                <p className="text-sm text-blue-100 mt-3">
                  Duration: {formatDuration(callDuration)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE: AI Intelligence (60%) */}
        <div className="w-[60%] bg-gray-50 flex flex-col">
          {/* Intelligence Header */}
          <div className="p-4 border-b bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Call Briefing</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} disabled={callStatus === 'connected' || callStatus === 'calling'}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            {loadingIntelligence ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading call briefing...</p>
              </div>
            ) : dealIntelligence ? (
              <div className="space-y-4">
                {/* Deal Context */}
                <div className="p-4 bg-white rounded-lg border border-blue-100">
                  <h4 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    Deal Context
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Deal:</span>
                      <span className="font-medium text-gray-900 truncate ml-2">{dealIntelligence.dealTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stage:</span>
                      <Badge variant="secondary" className="text-xs">{dealIntelligence.stage}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Value:</span>
                      <span className="font-semibold text-green-700">
                        ${(dealIntelligence.dealValue / 100).toLocaleString()}
                      </span>
                    </div>
                    {dealIntelligence.treatmentTags.length > 0 && (
                      <div>
                        <span className="text-gray-600 block mb-1">Treatments:</span>
                        <div className="flex flex-wrap gap-1">
                          {dealIntelligence.treatmentTags.map((tag: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Talking Points */}
                <div className="p-4 bg-white rounded-lg border border-green-100">
                  <h4 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-green-600" />
                    Suggested Talking Points
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Open with: "Hi {dealIntelligence.contactName}, this is calling from [Practice]. How are you today?"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Reference: Following up on {dealIntelligence.dealTitle}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Address: Answer questions about {dealIntelligence.treatmentTags[0] || 'treatment'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Goal: {dealIntelligence.stage?.toLowerCase().includes('quote') ? 'Get quote approval' : 'Schedule next appointment'}</span>
                    </li>
                  </ul>
                </div>

                {/* Call Checklist */}
                <div className="p-4 bg-white rounded-lg border border-purple-100">
                  <h4 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-purple-600" />
                    Call Checklist
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded border-2 border-gray-300"></div>
                      Confirm contact details
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded border-2 border-gray-300"></div>
                      Discuss treatment options
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded border-2 border-gray-300"></div>
                      Address pricing questions
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded border-2 border-gray-300"></div>
                      Schedule next step
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded border-2 border-gray-300"></div>
                      Log call outcome
                    </li>
                  </ul>
                </div>

                {/* Quick Tips */}
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-800">
                    <strong>💡 Tip:</strong> After the call, click "Add Call Outcome" on the activity card to log what happened!
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="p-4 bg-white rounded-lg border border-gray-200 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">
                    No deal context available
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    This is a general outbound call
                  </p>
                </div>

                {/* General Call Tips */}
                <div className="p-4 bg-white rounded-lg border border-blue-100">
                  <h4 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    General Call Tips
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>Introduce yourself and your practice</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>Ask how you can help them today</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>Listen actively and take notes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>Schedule a follow-up if needed</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </>
  )
}
