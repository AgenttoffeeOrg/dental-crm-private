'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { 
  User, 
  Mail, 
  Save, 
  Camera, 
  Phone,
  MapPin,
  Briefcase,
  Clock,
  Globe,
  Shield,
  Bell,
  Activity,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Key,
  Smartphone,
  Lock,
  LogOut,
  Trash2,
  Download,
  Eye,
  EyeOff,
  Settings,
  Award,
  Target,
  BarChart3
} from 'lucide-react'

interface UserProfileProps {
  userId: string
  tenantId: string
}

interface UserProfile {
  id: string
  tenant_id: string
  active_tenant_id?: string
  active_location_id?: string
  full_name: string
  email: string
  phone?: string
  mobile_phone?: string
  job_title?: string
  department?: string
  bio?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  timezone?: string
  language?: string
  date_format?: string
  time_format?: string
  working_hours_start?: string
  working_hours_end?: string
  working_days?: string[]
  avatar_url?: string
  role?: string
  created_at: string
  updated_at?: string
  last_login_at?: string
}

interface ActivityStats {
  totalDeals: number
  activeDeals: number
  completedDeals: number
  totalContacts: number
  tasksCompleted: number
  totalTasks: number
  responseRate: number
  avgResponseTime: string
}

interface NotificationPreferences {
  emailNotifications: boolean
  smsNotifications: boolean
  pushNotifications: boolean
  dealUpdates: boolean
  taskReminders: boolean
  teamMentions: boolean
  weeklyDigest: boolean
  marketingEmails: boolean
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Dubai',
  'Australia/Sydney',
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
]

const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function UserProfileEditor({ userId, tenantId }: UserProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('personal')
  const [showPassword, setShowPassword] = useState(false)
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null)
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    dealUpdates: true,
    taskReminders: true,
    teamMentions: true,
    weeklyDigest: true,
    marketingEmails: false,
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  
  const supabase = createClient()

  useEffect(() => {
    loadUserProfile()
    loadActivityStats()
  }, [userId])

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.info('👤 New user detected')
          setProfile({
            id: userId,
            tenant_id: tenantId,
            full_name: '',
            email: '',
            created_at: new Date().toISOString(),
          })
        } else {
          console.error('Error loading user:', error)
        }
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadActivityStats = async () => {
    try {
      // Load deals stats
      const { data: deals } = await supabase
        .from('deals')
        .select('id, stage_id')
        .eq('owner_user_id', userId)
        .is('deleted_at', null)

      // Load contacts stats
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id')
        .eq('owner_user_id', userId)
        .is('deleted_at', null)

      // Load tasks stats
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('assigned_to_user_id', userId)

      setActivityStats({
        totalDeals: deals?.length || 0,
        activeDeals: deals?.filter(d => d.stage_id).length || 0,
        completedDeals: 0, // Would need pipeline stage status
        totalContacts: contacts?.length || 0,
        tasksCompleted: tasks?.filter(t => t.status === 'completed').length || 0,
        totalTasks: tasks?.length || 0,
        responseRate: 92, // Mock data - would calculate from actual response data
        avgResponseTime: '2.3 hours', // Mock data
      })
    } catch (error) {
      console.error('Error loading activity stats:', error)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile?.full_name?.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase
        .from('app_users')
        .update({
          full_name: profile.full_name.trim(),
          email: profile.email?.trim() || null,
          phone: profile.phone?.trim() || null,
          mobile_phone: profile.mobile_phone?.trim() || null,
          job_title: profile.job_title?.trim() || null,
          department: profile.department?.trim() || null,
          bio: profile.bio?.trim() || null,
          address: profile.address?.trim() || null,
          city: profile.city?.trim() || null,
          state: profile.state?.trim() || null,
          zip_code: profile.zip_code?.trim() || null,
          country: profile.country?.trim() || null,
          timezone: profile.timezone || null,
          language: profile.language || null,
          date_format: profile.date_format || null,
          time_format: profile.time_format || null,
          working_hours_start: profile.working_hours_start || null,
          working_hours_end: profile.working_hours_end || null,
          working_days: profile.working_days || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      toast.success('Profile updated successfully')
      loadUserProfile()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    try {
      setSaving(true)
      
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      toast.success('Password changed successfully')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      console.error('Error changing password:', error)
      toast.error(error.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = () => {
    toast.info('Data export initiated', {
      description: 'You will receive an email with your data within 24 hours'
    })
  }

  const handleDeleteAccount = () => {
    toast.error('Account deletion requires admin approval', {
      description: 'Please contact your organization administrator'
    })
  }

  const getProfileCompleteness = () => {
    if (!profile) return 0
    
    const fields = [
      profile.full_name,
      profile.email,
      profile.phone,
      profile.job_title,
      profile.department,
      profile.bio,
      profile.timezone,
      profile.working_hours_start,
      profile.working_hours_end,
    ]
    
    const filled = fields.filter(f => f && f.trim()).length
    return Math.round((filled / fields.length) * 100)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">Loading profile...</div>
        </CardContent>
      </Card>
    )
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">User not found</div>
        </CardContent>
      </Card>
    )
  }

  const profileCompleteness = getProfileCompleteness()

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                <AvatarFallback className="text-3xl bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                  {profile.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">{profile.full_name || 'Unnamed User'}</h2>
                  {profile.role && (
                    <Badge className="bg-purple-100 text-purple-800 px-3 py-1">
                      {profile.role}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {profile.job_title && (
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      {profile.job_title}
                    </div>
                  )}
                  {profile.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {profile.email}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Profile Completeness</span>
                  <div className="flex items-center gap-2">
                    <Progress value={profileCompleteness} className="w-32 h-2" />
                    <span className="text-sm font-semibold">{profileCompleteness}%</span>
                  </div>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Camera className="h-4 w-4 mr-2" />
              Change Photo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Profile Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={profile.full_name || ''}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email || ''}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="john.doe@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Office Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobilePhone">Mobile Phone</Label>
                  <Input
                    id="mobilePhone"
                    type="tel"
                    value={profile.mobile_phone || ''}
                    onChange={(e) => setProfile({ ...profile, mobile_phone: e.target.value })}
                    placeholder="+1 (555) 987-6543"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={profile.job_title || ''}
                    onChange={(e) => setProfile({ ...profile, job_title: e.target.value })}
                    placeholder="Sales Manager"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={profile.department || ''}
                    onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                    placeholder="Sales & Marketing"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
                <p className="text-xs text-gray-500">Brief description for your profile. Maximum 500 characters.</p>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location Details
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={profile.address || ''}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={profile.city || ''}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      placeholder="San Francisco"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State / Province</Label>
                    <Input
                      id="state"
                      value={profile.state || ''}
                      onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      placeholder="California"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP / Postal Code</Label>
                    <Input
                      id="zipCode"
                      value={profile.zip_code || ''}
                      onChange={(e) => setProfile({ ...profile, zip_code: e.target.value })}
                      placeholder="94102"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={profile.country || ''}
                      onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                      placeholder="United States"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => loadUserProfile()}>
                  Cancel
                </Button>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Work Preferences
              </CardTitle>
              <CardDescription>
                Configure your working hours, timezone, and regional preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={profile.timezone || ''} 
                    onValueChange={(value) => setProfile({ ...profile, timezone: value })}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select 
                    value={profile.language || ''} 
                    onValueChange={(value) => setProfile({ ...profile, language: value })}
                  >
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(lang => (
                        <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select 
                    value={profile.date_format || ''} 
                    onValueChange={(value) => setProfile({ ...profile, date_format: value })}
                  >
                    <SelectTrigger id="dateFormat">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (EU)</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeFormat">Time Format</Label>
                  <Select 
                    value={profile.time_format || ''} 
                    onValueChange={(value) => setProfile({ ...profile, time_format: value })}
                  >
                    <SelectTrigger id="timeFormat">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                      <SelectItem value="24h">24-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-4">Working Hours</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="workStart">Start Time</Label>
                    <Input
                      id="workStart"
                      type="time"
                      value={profile.working_hours_start || ''}
                      onChange={(e) => setProfile({ ...profile, working_hours_start: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workEnd">End Time</Label>
                    <Input
                      id="workEnd"
                      type="time"
                      value={profile.working_hours_end || ''}
                      onChange={(e) => setProfile({ ...profile, working_hours_end: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Working Days</h3>
                <div className="flex flex-wrap gap-2">
                  {WORKING_DAYS.map(day => {
                    const isSelected = profile.working_days?.includes(day)
                    return (
                      <Button
                        key={day}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          const currentDays = profile.working_days || []
                          const newDays = isSelected
                            ? currentDays.filter(d => d !== day)
                            : [...currentDays, day]
                          setProfile({ ...profile, working_days: newDays })
                        }}
                      >
                        {day.substring(0, 3)}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => loadUserProfile()}>
                  Cancel
                </Button>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Password & Authentication
              </CardTitle>
              <CardDescription>
                Manage your password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Use a strong password with at least 8 characters, including uppercase, lowercase, numbers, and symbols.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Enter new password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <Button onClick={handleChangePassword} disabled={saving}>
                <Key className="h-4 w-4 mr-2" />
                Update Password
              </Button>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-3">Two-Factor Authentication</h3>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium">Authenticator App</p>
                      <p className="text-sm text-gray-600">Use an app to generate verification codes</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-gray-600">Not Configured</Badge>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Active Sessions</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Current Session</p>
                        <p className="text-sm text-gray-600">Last activity: Just now</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions that affect your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                <div>
                  <p className="font-medium">Export Your Data</p>
                  <p className="text-sm text-gray-600">Download a copy of all your personal data</p>
                </div>
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                <div>
                  <p className="font-medium text-red-600">Delete Account</p>
                  <p className="text-sm text-gray-600">Permanently delete your account and all data</p>
                </div>
                <Button variant="destructive" onClick={handleDeleteAccount}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Control how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-4">Channels</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.emailNotifications}
                      onCheckedChange={(checked) => 
                        setNotificationPrefs({ ...notificationPrefs, emailNotifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">SMS Notifications</p>
                      <p className="text-sm text-gray-600">Receive urgent alerts via SMS</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.smsNotifications}
                      onCheckedChange={(checked) => 
                        setNotificationPrefs({ ...notificationPrefs, smsNotifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Push Notifications</p>
                      <p className="text-sm text-gray-600">Get real-time updates in browser</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.pushNotifications}
                      onCheckedChange={(checked) => 
                        setNotificationPrefs({ ...notificationPrefs, pushNotifications: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-4">Activity Types</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Deal Updates</p>
                      <p className="text-sm text-gray-600">Notify when deals are updated or moved</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.dealUpdates}
                      onCheckedChange={(checked) => 
                        setNotificationPrefs({ ...notificationPrefs, dealUpdates: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Task Reminders</p>
                      <p className="text-sm text-gray-600">Get reminders for upcoming tasks</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.taskReminders}
                      onCheckedChange={(checked) => 
                        setNotificationPrefs({ ...notificationPrefs, taskReminders: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Team Mentions</p>
                      <p className="text-sm text-gray-600">Notify when someone mentions you</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.teamMentions}
                      onCheckedChange={(checked) => 
                        setNotificationPrefs({ ...notificationPrefs, teamMentions: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Weekly Digest</p>
                      <p className="text-sm text-gray-600">Summary of your weekly activity</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.weeklyDigest}
                      onCheckedChange={(checked) => 
                        setNotificationPrefs({ ...notificationPrefs, weeklyDigest: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Marketing Emails</p>
                      <p className="text-sm text-gray-600">Product updates and announcements</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.marketingEmails}
                      onCheckedChange={(checked) => 
                        setNotificationPrefs({ ...notificationPrefs, marketingEmails: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline">
                  Cancel
                </Button>
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity & Stats Tab */}
        <TabsContent value="activity" className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Deals</p>
                    <p className="text-2xl font-bold">{activityStats?.totalDeals || 0}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Deals</p>
                    <p className="text-2xl font-bold">{activityStats?.activeDeals || 0}</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Contacts</p>
                    <p className="text-2xl font-bold">{activityStats?.totalContacts || 0}</p>
                  </div>
                  <User className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tasks Done</p>
                    <p className="text-2xl font-bold">
                      {activityStats?.tasksCompleted || 0}/{activityStats?.totalTasks || 0}
                    </p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
              <CardDescription>
                Your activity and performance over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Response Rate</span>
                    <span className="text-sm font-semibold">{activityStats?.responseRate || 0}%</span>
                  </div>
                  <Progress value={activityStats?.responseRate || 0} className="h-2" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Task Completion Rate</span>
                    <span className="text-sm font-semibold">
                      {activityStats?.totalTasks 
                        ? Math.round(((activityStats.tasksCompleted || 0) / activityStats.totalTasks) * 100)
                        : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={activityStats?.totalTasks 
                      ? ((activityStats.tasksCompleted || 0) / activityStats.totalTasks) * 100
                      : 0} 
                    className="h-2" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-600">Avg Response Time</span>
                    </div>
                    <p className="text-xl font-bold">{activityStats?.avgResponseTime || 'N/A'}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-600">Last Login</span>
                    </div>
                    <p className="text-xl font-bold">
                      {profile.last_login_at 
                        ? new Date(profile.last_login_at).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Achievements
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg text-center">
                    <div className="text-3xl mb-2">🎯</div>
                    <p className="text-sm font-medium">Deal Closer</p>
                    <p className="text-xs text-gray-600">Closed 10+ deals</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center opacity-50">
                    <div className="text-3xl mb-2">🏆</div>
                    <p className="text-sm font-medium">Top Performer</p>
                    <p className="text-xs text-gray-600">Top 10% this month</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center opacity-50">
                    <div className="text-3xl mb-2">⚡</div>
                    <p className="text-sm font-medium">Speed Demon</p>
                    <p className="text-xs text-gray-600">Fastest response time</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">User ID</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{profile.id}</code>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Active Tenant ID</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                  {profile.active_tenant_id || 'None'}
                </code>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Active Location ID</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                  {profile.active_location_id || 'None'}
                </code>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Member Since</span>
                <span className="text-gray-900">
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Last Updated</span>
                <span className="text-gray-900">
                  {profile.updated_at 
                    ? new Date(profile.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Never'}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
