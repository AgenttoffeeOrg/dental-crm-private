'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Building2, User, ArrowRight, Check, Loader2 } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [accountType, setAccountType] = useState<'individual' | 'practice'>('practice')
  
  // Practice Sign-up Form
  const [practiceData, setPracticeData] = useState({
    practiceName: '',
    ownerName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    specialty: 'general',
    agreedToTerms: false
  })

  // Individual Sign-up Form
  const [individualData, setIndividualData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    specialty: 'general',
    agreedToTerms: false
  })

  const specialties = [
    { value: 'general', label: 'General Dentistry' },
    { value: 'cosmetic', label: 'Cosmetic Dentistry' },
    { value: 'orthodontics', label: 'Orthodontics' },
    { value: 'periodontics', label: 'Periodontics' },
    { value: 'endodontics', label: 'Endodontics' },
    { value: 'oral_surgery', label: 'Oral Surgery' },
    { value: 'pediatric', label: 'Pediatric Dentistry' },
    { value: 'prosthodontics', label: 'Prosthodontics' }
  ]

  const validateForm = () => {
    const data = accountType === 'practice' ? practiceData : individualData
    
    if (!data.agreedToTerms) {
      toast.error('Please agree to Terms of Service and Privacy Policy')
      return false
    }

    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match')
      return false
    }

    if (data.password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return false
    }

    if (!data.email.includes('@')) {
      toast.error('Please enter a valid email address')
      return false
    }

    if (accountType === 'practice' && !practiceData.practiceName) {
      toast.error('Practice name is required')
      return false
    }

    if (!data.fullName && accountType === 'individual') {
      toast.error('Full name is required')
      return false
    }

    if (accountType === 'practice' && !practiceData.ownerName) {
      toast.error('Owner name is required')
      return false
    }

    return true
  }

  const handleSignUp = async () => {
    if (!validateForm()) return

    setLoading(true)
    const supabase = createClient()

    try {
      const data = accountType === 'practice' ? practiceData : individualData
      
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: accountType === 'practice' ? practiceData.ownerName : individualData.fullName,
            account_type: accountType
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      // Step 2: Create tenant (practice/organization)
      const tenantName = accountType === 'practice' 
        ? practiceData.practiceName 
        : `${individualData.fullName}'s Practice`

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: tenantName,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          metadata: {
            account_type: accountType,
            specialty: data.specialty,
            phone: accountType === 'practice' ? practiceData.phone : null,
            address: accountType === 'practice' ? practiceData.address : null
          }
        })
        .select()
        .single()

      if (tenantError) throw tenantError

      // Step 3: Create app_user record
      const { error: appUserError } = await supabase
        .from('app_users')
        .insert({
          id: authData.user.id,
          tenant_id: tenant.id,
          full_name: accountType === 'practice' ? practiceData.ownerName : individualData.fullName,
          email: data.email,
          role: 'owner',
          status: 'active'
        })

      if (appUserError) throw appUserError

      // Step 4: Create default pipeline
      const { error: pipelineError } = await supabase
        .from('pipelines')
        .insert({
          tenant_id: tenant.id,
          name: 'Main Pipeline',
          is_default: true,
          display_style: 'board',
          icon: 'target'
        })

      if (pipelineError) console.error('Pipeline creation error:', pipelineError)

      toast.success('Account created successfully!', {
        description: 'Redirecting to onboarding...'
      })

      // Redirect to onboarding
      setTimeout(() => {
        router.push('/onboarding')
      }, 1000)

    } catch (error: any) {
      console.error('Sign-up error:', error)
      toast.error('Failed to create account', {
        description: error.message || 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Create Your Account
          </h1>
          <p className="text-lg text-gray-600">
            Join thousands of dental professionals managing their practice with ease
          </p>
        </div>

        {/* Main Card */}
        <Card className="p-8 shadow-2xl border-0">
          <Tabs value={accountType} onValueChange={(v) => setAccountType(v as any)} className="w-full">
            {/* Account Type Toggle */}
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="practice" className="text-base py-3">
                <Building2 className="w-5 h-5 mr-2" />
                Practice / Clinic
              </TabsTrigger>
              <TabsTrigger value="individual" className="text-base py-3">
                <User className="w-5 h-5 mr-2" />
                Individual Practitioner
              </TabsTrigger>
            </TabsList>

            {/* Practice Sign-up Form */}
            <TabsContent value="practice" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="practice-name">Practice Name *</Label>
                  <Input
                    id="practice-name"
                    placeholder="e.g., SmileBright Dental"
                    value={practiceData.practiceName}
                    onChange={(e) => setPracticeData({ ...practiceData, practiceName: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner-name">Owner / Director Name *</Label>
                  <Input
                    id="owner-name"
                    placeholder="e.g., Dr. Sarah Mitchell"
                    value={practiceData.ownerName}
                    onChange={(e) => setPracticeData({ ...practiceData, ownerName: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="practice-email">Email Address *</Label>
                  <Input
                    id="practice-email"
                    type="email"
                    placeholder="admin@yourpractice.com"
                    value={practiceData.email}
                    onChange={(e) => setPracticeData({ ...practiceData, email: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="practice-phone">Phone Number</Label>
                  <Input
                    id="practice-phone"
                    type="tel"
                    placeholder="+44 20 1234 5678"
                    value={practiceData.phone}
                    onChange={(e) => setPracticeData({ ...practiceData, phone: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="practice-address">Practice Address</Label>
                  <Input
                    id="practice-address"
                    placeholder="123 Main Street, London, UK"
                    value={practiceData.address}
                    onChange={(e) => setPracticeData({ ...practiceData, address: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="practice-specialty">Primary Specialty</Label>
                  <select
                    id="practice-specialty"
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
                    value={practiceData.specialty}
                    onChange={(e) => setPracticeData({ ...practiceData, specialty: e.target.value })}
                    disabled={loading}
                  >
                    {specialties.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="practice-password">Password *</Label>
                  <Input
                    id="practice-password"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={practiceData.password}
                    onChange={(e) => setPracticeData({ ...practiceData, password: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="practice-confirm-password">Confirm Password *</Label>
                  <Input
                    id="practice-confirm-password"
                    type="password"
                    placeholder="Re-enter password"
                    value={practiceData.confirmPassword}
                    onChange={(e) => setPracticeData({ ...practiceData, confirmPassword: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex items-start space-x-3 pt-4">
                <Checkbox
                  id="practice-terms"
                  checked={practiceData.agreedToTerms}
                  onCheckedChange={(checked) => 
                    setPracticeData({ ...practiceData, agreedToTerms: checked as boolean })
                  }
                  disabled={loading}
                />
                <label htmlFor="practice-terms" className="text-sm text-gray-600 leading-relaxed">
                  I agree to the{' '}
                  <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                </label>
              </div>

              <Button
                onClick={handleSignUp}
                disabled={loading}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Practice Account
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Individual Sign-up Form */}
            <TabsContent value="individual" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="individual-name">Full Name *</Label>
                  <Input
                    id="individual-name"
                    placeholder="e.g., Dr. John Smith"
                    value={individualData.fullName}
                    onChange={(e) => setIndividualData({ ...individualData, fullName: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="individual-email">Email Address *</Label>
                  <Input
                    id="individual-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={individualData.email}
                    onChange={(e) => setIndividualData({ ...individualData, email: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="individual-specialty">Specialty</Label>
                  <select
                    id="individual-specialty"
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
                    value={individualData.specialty}
                    onChange={(e) => setIndividualData({ ...individualData, specialty: e.target.value })}
                    disabled={loading}
                  >
                    {specialties.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="individual-password">Password *</Label>
                  <Input
                    id="individual-password"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={individualData.password}
                    onChange={(e) => setIndividualData({ ...individualData, password: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="individual-confirm-password">Confirm Password *</Label>
                  <Input
                    id="individual-confirm-password"
                    type="password"
                    placeholder="Re-enter password"
                    value={individualData.confirmPassword}
                    onChange={(e) => setIndividualData({ ...individualData, confirmPassword: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex items-start space-x-3 pt-4">
                <Checkbox
                  id="individual-terms"
                  checked={individualData.agreedToTerms}
                  onCheckedChange={(checked) => 
                    setIndividualData({ ...individualData, agreedToTerms: checked as boolean })
                  }
                  disabled={loading}
                />
                <label htmlFor="individual-terms" className="text-sm text-gray-600 leading-relaxed">
                  I agree to the{' '}
                  <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                </label>
              </div>

              <Button
                onClick={handleSignUp}
                disabled={loading}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>

          {/* Features List */}
          <div className="mt-8 pt-8 border-t">
            <p className="text-sm font-medium text-gray-900 mb-4">What you'll get:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                'Unlimited contacts & deals',
                'Complete pipeline management',
                'Email & WhatsApp integration',
                'Marketing automation',
                'Team collaboration',
                'Advanced analytics & reports'
              ].map((feature) => (
                <div key={feature} className="flex items-center space-x-2">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-600">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sign In Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </Card>

        {/* Trust Signals */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Trusted by 5,000+ dental practices worldwide 🌍
          </p>
        </div>
      </div>
    </div>
  )
}

