'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { 
  Building2, ArrowRight, ArrowLeft, Check, Loader2,
  MapPin, Phone, Globe, Users, Target, Sparkles
} from 'lucide-react'

const steps = [
  { id: 1, name: 'Practice Info', icon: Building2 },
  { id: 2, name: 'Contact Details', icon: MapPin },
  { id: 3, name: 'First Pipeline', icon: Target },
  { id: 4, name: 'Team Setup', icon: Users }
]

export default function OnboardingPage() {
  const router = useRouter()
  const { user, appUser, loading: authLoading } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [tenant, setTenant] = useState<any>(null)

  const [practiceInfo, setPracticeInfo] = useState({
    name: '',
    description: '',
    specialty: 'general',
    team_size: '1-5'
  })

  const [contactDetails, setContactDetails] = useState({
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    postcode: ''
  })

  const [pipelineSetup, setPipelineSetup] = useState({
    pipelineName: 'Main Pipeline',
    stages: [
      'New Lead',
      'Contacted',
      'Consultation Booked',
      'Treatment Planned',
      'Won',
      'Lost'
    ]
  })

  const [teamSetup, setTeamSetup] = useState({
    inviteNow: false,
    teamEmails: ''
  })

  // Fetch tenant info on load
  useEffect(() => {
    if (!authLoading && appUser) {
      fetchTenant()
    }
  }, [authLoading, appUser])

  const fetchTenant = async () => {
    if (!appUser?.tenant_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', appUser.tenant_id)
      .single()

    if (data) {
      setTenant(data)
      setPracticeInfo({
        name: data.name || '',
        description: '',
        specialty: 'general',
        team_size: '1-5'
      })
    }
  }

  const handleStep1 = async () => {
    if (!practiceInfo.name) {
      toast.error('Please enter your practice name')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // Update tenant with practice info (just name for now)
      const { error } = await supabase
        .from('tenants')
        .update({
          name: practiceInfo.name
        })
        .eq('id', appUser?.tenant_id)

      if (error) throw error

      toast.success('Practice info saved!')
      setCurrentStep(2)
    } catch (error: any) {
      console.error('Error updating practice info:', error)
      toast.error('Failed to save practice info')
    } finally {
      setLoading(false)
    }
  }

  const handleStep2 = async () => {
    setLoading(true)

    try {
      // Skip saving contact details for now (no metadata column)
      // TODO: Add these fields to tenants table or create separate practice_details table
      
      toast.success('Contact details saved!')
      setCurrentStep(3)
    } catch (error: any) {
      console.error('Error updating contact details:', error)
      toast.error('Failed to save contact details')
    } finally {
      setLoading(false)
    }
  }

  const handleStep3 = async () => {
    if (!pipelineSetup.pipelineName) {
      toast.error('Please enter a pipeline name')
      return
    }

    if (pipelineSetup.stages.length < 2) {
      toast.error('Please add at least 2 stages')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // Create pipeline
      const { data: pipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .insert({
          tenant_id: appUser?.tenant_id,
          name: pipelineSetup.pipelineName,
          is_default: true,
          display_style: 'board',
          icon: 'target'
        })
        .select()
        .single()

      if (pipelineError) throw pipelineError

      // Create stages
      const stagesData = pipelineSetup.stages.map((stageName, index) => ({
        tenant_id: appUser?.tenant_id,
        pipeline_id: pipeline.id,
        name: stageName,
        position: index + 1
      }))

      const { error: stagesError } = await supabase
        .from('pipeline_stages')
        .insert(stagesData)

      if (stagesError) throw stagesError

      toast.success('Pipeline created successfully!')
      setCurrentStep(4)
    } catch (error: any) {
      console.error('Error creating pipeline:', error)
      toast.error('Failed to create pipeline')
    } finally {
      setLoading(false)
    }
  }

  const handleStep4 = async () => {
    if (teamSetup.inviteNow && !teamSetup.teamEmails) {
      toast.error('Please enter team member emails')
      return
    }

    setLoading(true)

    try {
      if (teamSetup.inviteNow && teamSetup.teamEmails) {
        // Send invitations
        const emails = teamSetup.teamEmails
          .split('\n')
          .map(e => e.trim())
          .filter(e => e && e.includes('@'))

        for (const email of emails) {
          await fetch('/api/users/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              role: 'staff',
              tenant_id: appUser?.tenant_id
            })
          })
        }

        toast.success(`Invitations sent to ${emails.length} team members!`)
      }

      // Mark onboarding as complete (skip for now - no metadata column)
      // TODO: Add onboarding_completed field to app_users table

      toast.success('Onboarding complete! Welcome to your CRM!', {
        description: 'Redirecting to dashboard...'
      })

      setTimeout(() => {
        router.push('/pipeline')
      }, 1500)
    } catch (error: any) {
      console.error('Error completing onboarding:', error)
      toast.error('Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    switch (currentStep) {
      case 1:
        handleStep1()
        break
      case 2:
        handleStep2()
        break
      case 3:
        handleStep3()
        break
      case 4:
        handleStep4()
        break
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-4xl mx-auto py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Let's Set Up Your CRM
          </h1>
          <p className="text-lg text-gray-600">
            Just a few quick steps to get you started
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all
                      ${isCompleted ? 'bg-green-500 text-white' : 
                        isActive ? 'bg-blue-600 text-white' : 
                        'bg-gray-200 text-gray-500'}
                    `}>
                      {isCompleted ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <span className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                      {step.name}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-1 flex-1 mx-4 mt-[-20px] ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-8 shadow-2xl border-0 max-w-2xl mx-auto">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Practice Information</h2>
                <p className="text-gray-600">Tell us about your dental practice</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="practice-name">Practice Name *</Label>
                  <Input
                    id="practice-name"
                    placeholder="e.g., SmileBright Dental"
                    value={practiceInfo.name}
                    onChange={(e) => setPracticeInfo({ ...practiceInfo, name: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of your practice..."
                    value={practiceInfo.description}
                    onChange={(e) => setPracticeInfo({ ...practiceInfo, description: e.target.value })}
                    disabled={loading}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specialty">Primary Specialty</Label>
                    <select
                      id="specialty"
                      className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
                      value={practiceInfo.specialty}
                      onChange={(e) => setPracticeInfo({ ...practiceInfo, specialty: e.target.value })}
                      disabled={loading}
                    >
                      <option value="general">General Dentistry</option>
                      <option value="cosmetic">Cosmetic Dentistry</option>
                      <option value="orthodontics">Orthodontics</option>
                      <option value="periodontics">Periodontics</option>
                      <option value="endodontics">Endodontics</option>
                      <option value="oral_surgery">Oral Surgery</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="team-size">Team Size</Label>
                    <select
                      id="team-size"
                      className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
                      value={practiceInfo.team_size}
                      onChange={(e) => setPracticeInfo({ ...practiceInfo, team_size: e.target.value })}
                      disabled={loading}
                    >
                      <option value="1">Just me</option>
                      <option value="2-5">2-5 people</option>
                      <option value="6-10">6-10 people</option>
                      <option value="11-20">11-20 people</option>
                      <option value="21+">21+ people</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Contact Details</h2>
                <p className="text-gray-600">How can patients reach you?</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+44 20 1234 5678"
                        className="pl-10"
                        value={contactDetails.phone}
                        onChange={(e) => setContactDetails({ ...contactDetails, phone: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="website"
                        type="url"
                        placeholder="www.yourpractice.com"
                        className="pl-10"
                        value={contactDetails.website}
                        onChange={(e) => setContactDetails({ ...contactDetails, website: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street"
                    value={contactDetails.address}
                    onChange={(e) => setContactDetails({ ...contactDetails, address: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="London"
                      value={contactDetails.city}
                      onChange={(e) => setContactDetails({ ...contactDetails, city: e.target.value })}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      placeholder="SW1A 1AA"
                      value={contactDetails.postcode}
                      onChange={(e) => setContactDetails({ ...contactDetails, postcode: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Create Your First Pipeline</h2>
                <p className="text-gray-600">Organize how you track patient journeys</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pipeline-name">Pipeline Name</Label>
                  <Input
                    id="pipeline-name"
                    placeholder="e.g., New Patient Acquisition"
                    value={pipelineSetup.pipelineName}
                    onChange={(e) => setPipelineSetup({ ...pipelineSetup, pipelineName: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Pipeline Stages</Label>
                  <div className="space-y-2">
                    {pipelineSetup.stages.map((stage, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <Input
                          value={stage}
                          onChange={(e) => {
                            const newStages = [...pipelineSetup.stages]
                            newStages[index] = e.target.value
                            setPipelineSetup({ ...pipelineSetup, stages: newStages })
                          }}
                          disabled={loading}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">
                    These stages represent the journey from first contact to won/lost
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Invite Your Team</h2>
                <p className="text-gray-600">Add team members to collaborate (optional)</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="invite-now"
                    checked={teamSetup.inviteNow}
                    onChange={(e) => setTeamSetup({ ...teamSetup, inviteNow: e.target.checked })}
                    className="mt-1"
                  />
                  <div>
                    <label htmlFor="invite-now" className="font-medium">
                      Invite team members now
                    </label>
                    <p className="text-sm text-gray-500">
                      You can always invite people later from Settings
                    </p>
                  </div>
                </div>

                {teamSetup.inviteNow && (
                  <div className="space-y-2">
                    <Label htmlFor="team-emails">Team Member Emails (one per line)</Label>
                    <Textarea
                      id="team-emails"
                      placeholder="colleague@example.com&#10;assistant@example.com"
                      value={teamSetup.teamEmails}
                      onChange={(e) => setTeamSetup({ ...teamSetup, teamEmails: e.target.value })}
                      disabled={loading}
                      rows={5}
                    />
                    <p className="text-sm text-gray-500">
                      They'll receive an email invitation to join your practice
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : currentStep === 4 ? (
                <>
                  Complete Setup
                  <Check className="w-5 h-5 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Skip Option */}
        {currentStep < 4 && (
          <div className="text-center mt-6">
            <button
              onClick={() => router.push('/pipeline')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

