'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Shield, Key, Smartphone, Monitor, HelpCircle, AlertCircle } from 'lucide-react'
import type { AppUser } from '@/types/database'
import { toast } from 'sonner'

interface SecuritySectionProps {
  profile: AppUser
  onChange: (field: keyof AppUser, value: any) => void
  hasChanges: boolean
}

export function SecuritySection({
  profile,
  onChange,
  hasChanges
}: SecuritySectionProps) {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [show2FADialog, setShow2FADialog] = useState(false)
  const [showSessionsDialog, setShowSessionsDialog] = useState(false)

  const handleChangePassword = () => {
    // This will be implemented with Supabase auth
    toast.info('This will redirect to password change flow')
    setShowPasswordDialog(false)
  }

  const handle2FAToggle = (enabled: boolean) => {
    if (enabled) {
      setShow2FADialog(true)
    } else {
      // Disable 2FA
      onChange('two_factor_enabled', false)
      toast.success('Two-factor authentication disabled')
    }
  }

  const handleEnable2FA = () => {
    // This will be implemented with Supabase auth
    onChange('two_factor_enabled', true)
    setShow2FADialog(false)
    toast.success('Two-factor authentication enabled')
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-green-600" />
            Security & Privacy
            {hasChanges && (
              <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-300">
                Unsaved changes
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Manage your account security and privacy settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Password */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md border border-gray-200">
            <div className="flex items-start gap-3">
              <Key className="h-3.5 w-3.5 text-gray-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-xs">Password</p>
                <p className="text-[10px] text-gray-600">
                  Last changed: Never or Not available
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowPasswordDialog(true)}
            >
              Change Password
            </Button>
          </div>

          {/* Two-Factor Authentication */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md border border-gray-200">
            <div className="flex items-start gap-3 flex-1">
              <Smartphone className="h-3.5 w-3.5 text-gray-600 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-xs">Two-Factor Authentication (2FA)</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Add an extra layer of security by requiring a code from your phone when you sign in
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-[10px] text-gray-600">
                  {profile.two_factor_enabled 
                    ? '✅ Enabled - Your account is protected' 
                    : '⚠️ Not enabled - Consider enabling for better security'}
                </p>
              </div>
              <Switch
                checked={profile.two_factor_enabled || false}
                onCheckedChange={handle2FAToggle}
              />
            </div>
          </div>

          {/* Active Sessions */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md border border-gray-200">
            <div className="flex items-start gap-3">
              <Monitor className="h-3.5 w-3.5 text-gray-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-xs">Active Sessions</p>
                <p className="text-[10px] text-gray-600">
                  View and manage devices where you're signed in
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSessionsDialog(true)}
            >
              Manage
            </Button>
          </div>

          {/* Security Tips */}
          <div className="p-4 bg-amber-50 rounded-md border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-xs font-medium text-amber-900">Security Recommendations:</p>
                <ul className="text-sm text-amber-800 space-y-1">
                  {!profile.two_factor_enabled && (
                    <li>• Enable two-factor authentication for better security</li>
                  )}
                  <li>• Use a strong, unique password</li>
                  <li>• Change your password regularly</li>
                  <li>• Don't share your login credentials</li>
                  <li>• Review active sessions periodically</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              You'll be redirected to securely change your password
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              For security reasons, password changes are handled through a secure authentication flow.
              You'll receive an email with instructions to reset your password.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} className="bg-indigo-600 hover:bg-indigo-700">
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enable 2FA Dialog */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Add an extra layer of security to your account
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-gray-600">
              Two-factor authentication (2FA) requires you to enter a code from your phone
              in addition to your password when signing in.
            </p>
            <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
              <p className="text-xs font-medium text-blue-900 mb-2">What you'll need:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• An authenticator app (Google Authenticator, Authy, etc.)</li>
                <li>• Your mobile phone</li>
                <li>• A few minutes to set up</li>
              </ul>
            </div>
            <p className="text-xs text-gray-500">
              Note: This is a demonstration. Full 2FA implementation coming soon.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShow2FADialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEnable2FA} className="bg-green-600 hover:bg-green-700">
              Enable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active Sessions Dialog */}
      <Dialog open={showSessionsDialog} onOpenChange={setShowSessionsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Active Sessions</DialogTitle>
            <DialogDescription>
              Devices and browsers where you're currently signed in
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {/* Current Session */}
            <div className="p-4 bg-green-50 rounded-md border border-green-200">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Monitor className="h-3.5 w-3.5 text-green-600 mt-0.5" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-xs">Current Session</p>
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        Active Now
                      </Badge>
                    </div>
                    <p className="text-[10px] text-gray-600">
                      {typeof window !== 'undefined' ? window.navigator.userAgent.split('(')[1]?.split(')')[0] : 'Unknown Device'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Last active: Just now
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Demo: No other sessions */}
            <div className="p-8 text-center text-gray-500">
              <Monitor className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-xs font-medium">No other active sessions</p>
              <p className="text-xs mt-1">You're only signed in on this device</p>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Note: Session management is a demonstration. Full implementation coming soon.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSessionsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

