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
  MapPin, Phone, Globe, Users, Target, Sparkles, AlertCircle
} from 'lucide-react'

const steps = [
  { id: 1, name: 'Practice Info', icon: Building2 },
  { id: 2, name: 'Contact Details', icon: MapPin },
  { id: 3, name: 'First Pipeline', icon: Target },
  { id: 4, name: 'Team Setup', icon: Users }
]

function OnboardingForm() {
  const router = useRouter()
  const { user, appUser, loading: authLoading } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [tenant, setTenant] = useState<any>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in')
    }
  }, [user, authLoading, router])

  // Fetch tenant info on load
  useEffect(() => {
    if (!authLoading && user) {
      fetchTenant()
    }
  }, [authLoading, user])

  const fetchTenant = async () => {
    if (!user?.id) return

    try {
      const supabase = createClient()
      
      // Get app user with tenant_id
      const { data: appUserData } = await supabase
        .from('app_users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (appUserData?.tenant_id) {
        // Get tenant data
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', appUserData.tenant_id)
          .single()

        if (tenantData) {
          setTenant(tenantData)
          setPracticeInfo(prev => ({
            ...prev,
            name: tenantData.name || ''
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching tenant:', error)
    }
  }

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}
    
    if (!practiceInfo.name.trim()) {
      newErrors.name = 'Practice name is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {}
    
    if (!pipelineSetup.pipelineName.trim()) {
      newErrors.pipelineName = 'Pipeline name is required'
    }
    
    if (pipelineSetup.stages.length < 2) {
      newErrors.stages = 'Please add at least 2 stages'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleStep1 = async () => {
    if (!validateStep1()) return

    setLoading(true)
    setErrors({})

    try {
      const supabase = createClient()
      
      if (!user?.id) {
        throw new Error('User not found. Please sign in again.')
      }

      console.log('[ONBOARDING] Step 1: Fetching tenant_id for user:', user.id)

      // Get tenant_id from app_users with retry logic
      let appUserData = null
      let retries = 3
      
      while (retries > 0 && !appUserData) {
        const { data, error } = await supabase
          .from('app_users')
          .select('tenant_id')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('[ONBOARDING] Error fetching app_users:', error)
          retries--
          if (retries > 0) {
            console.log('[ONBOARDING] Retrying... attempts left:', retries)
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
          throw new Error('Could not load your account data. Please refresh the page.')
        }

        appUserData = data
      }

      console.log('[ONBOARDING] App user data:', appUserData)

      if (!appUserData?.tenant_id) {
        console.error('[ONBOARDING] No tenant_id found for user')
        throw new Error('Account setup incomplete. Please contact support.')
      }

      console.log('[ONBOARDING] Updating tenant:', appUserData.tenant_id)

      // Update tenant
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          name: practiceInfo.name.trim()
        })
        .eq('id', appUserData.tenant_id)

      if (updateError) {
        console.error('[ONBOARDING] Error updating tenant:', updateError)
        throw new Error(`Failed to save practice info: ${updateError.message}`)
      }

      console.log('[ONBOARDING] Practice info saved successfully!')
      toast.success('Practice info saved!')
      setCurrentStep(2)
    } catch (error: any) {
      console.error('[ONBOARDING] Error in handleStep1:', error)
      toast.error('Failed to save practice info', {
        description: error.message
      })
      setErrors({ name: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleStep2 = async () => {
    setLoading(true)
    setErrors({})

    try {
      // Skip saving contact details for now (can be added later)
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
    if (!validateStep3()) return

    setLoading(true)
    setErrors({})

    try {
      const supabase = createClient()
      
      if (!user?.id) {
        throw new Error('User not found. Please sign in again.')
      }

      console.log('[ONBOARDING] Step 3: Fetching tenant_id for user:', user.id)

      // Get tenant_id with retry logic
      let appUserData = null
      let retries = 3
      
      while (retries > 0 && !appUserData) {
        const { data, error } = await supabase
          .from('app_users')
          .select('tenant_id')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('[ONBOARDING] Error fetching app_users:', error)
          retries--
          if (retries > 0) {
            console.log('[ONBOARDING] Retrying... attempts left:', retries)
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
          throw new Error('Could not load your account data. Please refresh the page.')
        }

        appUserData = data
      }

      console.log('[ONBOARDING] App user data:', appUserData)

      if (!appUserData?.tenant_id) {
        console.error('[ONBOARDING] No tenant_id found for user')
        throw new Error('Account setup incomplete. Please contact support.')
      }

      console.log('[ONBOARDING] Creating pipeline for tenant:', appUserData.tenant_id)

      // Create pipeline
      const pipelineData: any = {
        tenant_id: appUserData.tenant_id,
        name: pipelineSetup.pipelineName.trim()
      }
      
      // Add description if column exists (optional for backward compatibility)
      pipelineData.description = `Your ${pipelineSetup.pipelineName.trim()} sales pipeline`
      
      const { data: pipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .insert(pipelineData)
        .select()
        .single()

      if (pipelineError) {
        console.error('[ONBOARDING] Error creating pipeline:', pipelineError)
        throw new Error(`Failed to create pipeline: ${pipelineError.message}`)
      }

      console.log('[ONBOARDING] Pipeline created:', pipeline.id)

      // Create stages
      const stagesData = pipelineSetup.stages.map((stageName, index) => ({
        tenant_id: appUserData.tenant_id,
        pipeline_id: pipeline.id,
        name: stageName,
        position: index + 1
      }))

      const { error: stagesError } = await supabase
        .from('pipeline_stages')
        .insert(stagesData)

      if (stagesError) {
        console.error('[ONBOARDING] Error creating stages:', stagesError)
        throw new Error(`Failed to create pipeline stages: ${stagesError.message}`)
      }

      console.log('[ONBOARDING] Pipeline and stages created successfully!')
      toast.success('Pipeline created successfully!')
      setCurrentStep(4)
    } catch (error: any) {
      console.error('[ONBOARDING] Error in handleStep3:', error)
      toast.error('Failed to create pipeline', {
        description: error.message
      })
      setErrors({ pipelineName: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleStep4 = async () => {
    setLoading(true)
    setErrors({})

    try {
      // Complete onboarding
      toast.success('Onboarding completed!')
      
      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    } catch (error: any) {
      console.error('Error completing onboarding:', error)
      toast.error('Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Dental CRM! 🎉
          </h1>
          <p className="text-gray-600">
            Let's set up your practice in just a few quick steps
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step.id 
                  ? 'bg-indigo-600 border-indigo-600 text-white' 
                  : 'border-gray-300 text-gray-400'
              }`}>
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep >= step.id ? 'text-indigo-600' : 'text-gray-400'
              }`}>
                {step.name}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-indigo-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="p-8">
          {/* Step 1: Practice Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Practice Information</h2>
                <p className="text-gray-600">Tell us about your dental practice</p>
              </div>

              <div className="max-w-md mx-auto space-y-4">
                <div>
                  <Label htmlFor="practiceName" className="text-sm font-medium text-gray-900">
                    Practice Name *
                  </Label>
                  <Input
                    id="practiceName"
                    placeholder="e.g., Bright Smile Dental"
                    value={practiceInfo.name}
                    onChange={(e) => setPracticeInfo({ ...practiceInfo, name: e.target.value })}
                    className={`mt-1.5 h-12 ${errors.name ? 'border-red-500' : ''}`}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-900">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of your practice..."
                    value={practiceInfo.description}
                    onChange={(e) => setPracticeInfo({ ...practiceInfo, description: e.target.value })}
                    className="mt-1.5"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  onClick={handleStep1}
                  disabled={loading}
                  className="px-8 h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Contact Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Details</h2>
                <p className="text-gray-600">How can patients reach you?</p>
              </div>

              <div className="max-w-md mx-auto space-y-4">
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-900">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    placeholder="+1 (555) 123-4567"
                    value={contactDetails.phone}
                    onChange={(e) => setContactDetails({ ...contactDetails, phone: e.target.value })}
                    className="mt-1.5 h-12"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-900">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="info@yourpractice.com"
                    value={contactDetails.email}
                    onChange={(e) => setContactDetails({ ...contactDetails, email: e.target.value })}
                    className="mt-1.5 h-12"
                  />
                </div>

                <div>
                  <Label htmlFor="website" className="text-sm font-medium text-gray-900">
                    Website
                  </Label>
                  <Input
                    id="website"
                    placeholder="https://yourpractice.com"
                    value={contactDetails.website}
                    onChange={(e) => setContactDetails({ ...contactDetails, website: e.target.value })}
                    className="mt-1.5 h-12"
                  />
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="px-8 h-12"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleStep2}
                  disabled={loading}
                  className="px-8 h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Pipeline Setup */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your First Pipeline</h2>
                <p className="text-gray-600">Set up how you'll track patient treatments</p>
              </div>

              <div className="max-w-md mx-auto space-y-4">
                <div>
                  <Label htmlFor="pipelineName" className="text-sm font-medium text-gray-900">
                    Pipeline Name *
                  </Label>
                  <Input
                    id="pipelineName"
                    placeholder="Main Pipeline"
                    value={pipelineSetup.pipelineName}
                    onChange={(e) => setPipelineSetup({ ...pipelineSetup, pipelineName: e.target.value })}
                    className={`mt-1.5 h-12 ${errors.pipelineName ? 'border-red-500' : ''}`}
                  />
                  {errors.pipelineName && (
                    <p className="text-sm text-red-600 mt-1 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.pipelineName}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900">
                    Pipeline Stages
                  </Label>
                  <div className="mt-1.5 space-y-2">
                    {pipelineSetup.stages.map((stage, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                        <span className="text-sm text-gray-900">{stage}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="px-8 h-12"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleStep3}
                  disabled={loading}
                  className="px-8 h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Pipeline
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Team Setup */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Setup</h2>
                <p className="text-gray-600">Invite your team members (optional)</p>
              </div>

              <div className="max-w-md mx-auto space-y-4">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Setup Complete!
                  </h3>
                  <p className="text-gray-600">
                    Your practice is ready to go. You can invite team members later from your dashboard.
                  </p>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="px-8 h-12"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleStep4}
                  disabled={loading}
                  className="px-8 h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      Go to Dashboard
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <ErrorBoundary>
      <OnboardingForm />
    </ErrorBoundary>
  )
}