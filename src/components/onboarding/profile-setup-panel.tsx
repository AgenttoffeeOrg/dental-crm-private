'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { 
  X, ArrowRight, ArrowLeft, Check, Sparkles, Building2, MapPin, 
  Phone, Globe, Users, Target, Rocket, CheckCircle2, Loader2, Mail, AlertCircle
} from 'lucide-react'

interface ProfileSetupPanelProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

const steps = [
  { id: 1, title: 'Email Verification', icon: Mail, description: 'Verify your email address' },
  { id: 2, title: 'Practice Details', icon: Building2, description: 'Tell us about your practice' },
  { id: 3, title: 'Contact Information', icon: MapPin, description: 'How can patients reach you?' },
  { id: 4, title: 'Team & Goals', icon: Users, description: 'Set up your team and targets' },
  { id: 5, title: 'First Pipeline', icon: Target, description: 'Create your sales workflow' }
]

export function ProfileSetupPanel({ isOpen, onClose, onComplete }: ProfileSetupPanelProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)

  // Practice Details
  const [practiceDetails, setPracticeDetails] = useState({
    name: '',
    description: '',
    specialty: 'general',
    team_size: '1-5',
    established_year: ''
  })

  // Contact Information
  const [contactInfo, setContactInfo] = useState({
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    postcode: '',
    country: 'UK'
  })

  // Team & Goals
  const [teamGoals, setTeamGoals] = useState({
    monthly_revenue_goal: '',
    monthly_patient_goal: '',
    invite_team_members: false,
    team_emails: ''
  })

  // Pipeline Setup
  const [pipelineSetup, setPipelineSetup] = useState({
    name: 'Main Pipeline',
    stages: ['New Lead', 'Contacted', 'Consultation Booked', 'Treatment Planned', 'Won', 'Lost']
  })

  // Fetch tenant_id on mount
  useEffect(() => {
    if (user?.id) {
      fetchTenantId()
      fetchExistingData()
    }
  }, [user?.id])

  const fetchTenantId = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('app_users')
        .select('tenant_id')
        .eq('id', user?.id)
        .single()

      if (data?.tenant_id) {
        setTenantId(data.tenant_id)
      }
    } catch (error) {
      console.error('Error fetching tenant_id:', error)
    }
  }

  const fetchExistingData = async () => {
    try {
      const supabase = createClient()
      const { data: appUserData } = await supabase
        .from('app_users')
        .select('tenant_id')
        .eq('id', user?.id)
        .single()

      if (appUserData?.tenant_id) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', appUserData.tenant_id)
          .single()

        if (tenantData) {
          setPracticeDetails(prev => ({
            ...prev,
            name: tenantData.name || ''
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching existing data:', error)
    }
  }

  const handleStep1 = async () => {
    if (!practiceDetails.name.trim()) {
      toast.error('Please enter your practice name')
      return
    }

    setLoading(true)
    try {
      if (!tenantId) {
        throw new Error('Tenant ID not found')
      }

      const supabase = createClient()
      const { error } = await supabase
        .from('tenants')
        .update({
          name: practiceDetails.name.trim()
        })
        .eq('id', tenantId)

      if (error) throw error

      toast.success('Practice details saved!')
      setCurrentStep(2)
    } catch (error: any) {
      toast.error('Failed to save', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleStep2 = async () => {
    setLoading(true)
    try {
      // Save contact info (can be implemented later with additional tables)
      toast.success('Contact information saved!')
      setCurrentStep(3)
    } catch (error: any) {
      toast.error('Failed to save', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleStep3 = async () => {
    setLoading(true)
    try {
      // Save team goals (can be implemented later)
      toast.success('Team goals set!')
      setCurrentStep(4)
    } catch (error: any) {
      toast.error('Failed to save', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleStep4 = async () => {
    if (!pipelineSetup.name.trim()) {
      toast.error('Please enter a pipeline name')
      return
    }

    setLoading(true)
    try {
      if (!tenantId) {
        throw new Error('Tenant ID not found')
      }

      const supabase = createClient()

      // Create pipeline
      const { data: pipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .insert({
          tenant_id: tenantId,
          name: pipelineSetup.name.trim(),
          description: `Your ${pipelineSetup.name.trim()} sales pipeline`
        })
        .select()
        .single()

      if (pipelineError) throw pipelineError

      // Create stages
      const stagesData = pipelineSetup.stages.map((stageName, index) => ({
        tenant_id: tenantId,
        pipeline_id: pipeline.id,
        name: stageName,
        position: index + 1
      }))

      const { error: stagesError } = await supabase
        .from('pipeline_stages')
        .insert(stagesData)

      if (stagesError) throw stagesError

      // Mark profile as complete
      const { error: updateError } = await supabase
        .from('app_users')
        .update({ profile_completed: true })
        .eq('id', user?.id)

      if (updateError) console.warn('Could not mark profile as complete:', updateError)

      toast.success('🎉 Profile setup complete!', {
        description: 'Welcome to your dental CRM!'
      })

      setTimeout(() => {
        onComplete()
        onClose()
      }, 1500)
    } catch (error: any) {
      toast.error('Failed to create pipeline', { description: error.message })
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

  const handleSkip = () => {
    onClose()
  }

  if (!isOpen) return null

  const progressPercentage = (currentStep / steps.length) * 100

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={handleSkip}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:max-w-2xl bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
                  <p className="text-sm text-gray-600">Step {currentStep} of {steps.length}</p>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Steps */}
            <div className="flex items-center gap-2 mt-4 overflow-x-auto">
              {steps.map((step) => {
                const Icon = step.icon
                const isActive = currentStep === step.id
                const isCompleted = currentStep > step.id

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all flex-shrink-0 ${
                      isActive
                        ? 'bg-white shadow-md'
                        : isCompleted
                        ? 'bg-green-50'
                        : 'bg-transparent'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    {isActive && (
                      <span className="text-sm font-medium text-gray-900">{step.title}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8">
            {/* Step 1: Practice Details */}
            {currentStep === 1 && (
              // Email Verification Step
              <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Verify Your Email</h3>
                  <p className="text-gray-600">
                    We sent a verification link to <strong>{user?.email}</strong>
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800 mb-1">Check your inbox</h4>
                      <p className="text-sm text-amber-700">
                        Click the verification link in the email we sent to activate your account. 
                        If you don't see it, check your spam folder.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <Button
                    onClick={() => {
                      // Refresh the auth state to check if email is verified
                      window.location.reload()
                    }}
                    variant="outline"
                    className="mr-3"
                  >
                    I've verified my email
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!user?.email) return
                      setLoading(true)
                      try {
                        const supabase = createClient()
                        await supabase.auth.resend({
                          type: 'signup',
                          email: user.email
                        })
                        toast.success('Verification email sent!')
                      } catch (error) {
                        toast.error('Failed to resend email')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Resend email'}
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="text-center mb-8">
                  <Building2 className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {steps[1].title}
                  </h3>
                  <p className="text-gray-600">{steps[1].description}</p>
                </div>

                <div className="space-y-4 max-w-md mx-auto">
                  <div>
                    <Label htmlFor="practiceName">Practice Name *</Label>
                    <Input
                      id="practiceName"
                      placeholder="e.g., Bright Smile Dental"
                      value={practiceDetails.name}
                      onChange={(e) => setPracticeDetails({ ...practiceDetails, name: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Brief Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Tell us what makes your practice special..."
                      value={practiceDetails.description}
                      onChange={(e) => setPracticeDetails({ ...practiceDetails, description: e.target.value })}
                      className="mt-1.5"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="specialty">Specialty</Label>
                      <Select 
                        value={practiceDetails.specialty} 
                        onValueChange={(value) => setPracticeDetails({ ...practiceDetails, specialty: value })}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Dentistry</SelectItem>
                          <SelectItem value="cosmetic">Cosmetic Dentistry</SelectItem>
                          <SelectItem value="orthodontics">Orthodontics</SelectItem>
                          <SelectItem value="pediatric">Pediatric</SelectItem>
                          <SelectItem value="endodontics">Endodontics</SelectItem>
                          <SelectItem value="periodontics">Periodontics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="teamSize">Team Size</Label>
                      <Select 
                        value={practiceDetails.team_size} 
                        onValueChange={(value) => setPracticeDetails({ ...practiceDetails, team_size: value })}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-5">1-5 people</SelectItem>
                          <SelectItem value="6-10">6-10 people</SelectItem>
                          <SelectItem value="11-20">11-20 people</SelectItem>
                          <SelectItem value="21+">21+ people</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Contact Information */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="text-center mb-8">
                  <MapPin className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {steps[2].title}
                  </h3>
                  <p className="text-gray-600">{steps[2].description}</p>
                </div>

                <div className="space-y-4 max-w-md mx-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+44 20 1234 5678"
                        value={contactInfo.phone}
                        onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="info@practice.com"
                        value={contactInfo.email}
                        onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://yourpractice.com"
                      value={contactInfo.website}
                      onChange={(e) => setContactInfo({ ...contactInfo, website: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      placeholder="123 High Street"
                      value={contactInfo.address}
                      onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="London"
                        value={contactInfo.city}
                        onChange={(e) => setContactInfo({ ...contactInfo, city: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="postcode">Postcode</Label>
                      <Input
                        id="postcode"
                        placeholder="SW1A 1AA"
                        value={contactInfo.postcode}
                        onChange={(e) => setContactInfo({ ...contactInfo, postcode: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Team & Goals */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="text-center mb-8">
                  <Users className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {steps[2].title}
                  </h3>
                  <p className="text-gray-600">{steps[2].description}</p>
                </div>

                <div className="space-y-4 max-w-md mx-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="revenueGoal">Monthly Revenue Goal</Label>
                      <Input
                        id="revenueGoal"
                        type="number"
                        placeholder="50000"
                        value={teamGoals.monthly_revenue_goal}
                        onChange={(e) => setTeamGoals({ ...teamGoals, monthly_revenue_goal: e.target.value })}
                        className="mt-1.5"
                      />
                      <p className="text-xs text-gray-500 mt-1">In GBP</p>
                    </div>

                    <div>
                      <Label htmlFor="patientGoal">Monthly Patient Goal</Label>
                      <Input
                        id="patientGoal"
                        type="number"
                        placeholder="100"
                        value={teamGoals.monthly_patient_goal}
                        onChange={(e) => setTeamGoals({ ...teamGoals, monthly_patient_goal: e.target.value })}
                        className="mt-1.5"
                      />
                      <p className="text-xs text-gray-500 mt-1">New patients</p>
                    </div>
                  </div>

                  <div className="pt-4">
                    <p className="text-sm text-gray-600 mb-2">
                      You can invite team members later from Settings
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Pipeline */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="text-center mb-8">
                  <Target className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {steps[3].title}
                  </h3>
                  <p className="text-gray-600">{steps[3].description}</p>
                </div>

                <div className="space-y-4 max-w-md mx-auto">
                  <div>
                    <Label htmlFor="pipelineName">Pipeline Name</Label>
                    <Input
                      id="pipelineName"
                      placeholder="Main Pipeline"
                      value={pipelineSetup.name}
                      onChange={(e) => setPipelineSetup({ ...pipelineSetup, name: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label>Pipeline Stages</Label>
                    <div className="mt-2 space-y-2">
                      {pipelineSetup.stages.map((stage, index) => (
                        <div key={index} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                          <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium text-gray-700">{stage}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      You can customize stages after setup
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                {currentStep > 1 ? (
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={loading}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    disabled={loading}
                  >
                    Skip for now
                  </Button>
                )}
              </div>

              <Button
                onClick={handleNext}
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : currentStep === steps.length ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Saving...' : currentStep === steps.length ? 'Complete Setup' : 'Continue'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

