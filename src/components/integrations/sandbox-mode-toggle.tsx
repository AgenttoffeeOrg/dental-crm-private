'use client'

/**
 * Sandbox/Test Mode Toggle for Integrations
 * 
 * Allows switching between test and production credentials
 * 
 * Features:
 * - Visual toggle switch
 * - Separate test credentials input
 * - Test mode indicator badge
 * - Safe switching with confirmation
 * - Data isolation warning
 */

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle, TestTube, Globe } from 'lucide-react'
import { toast } from 'sonner'

interface SandboxModeToggleProps {
  connectionId: string
  integrationType: string
  isTestMode: boolean
  testCredentials: any
  productionCredentials: any
  onToggle: (isTestMode: boolean) => Promise<void>
  onUpdateTestCredentials: (credentials: any) => Promise<void>
}

export function SandboxModeToggle({
  connectionId,
  integrationType,
  isTestMode,
  testCredentials,
  productionCredentials,
  onToggle,
  onUpdateTestCredentials,
}: SandboxModeToggleProps) {
  const [localTestMode, setLocalTestMode] = useState(isTestMode)
  const [showTestCreds, setShowTestCreds] = useState(false)

  const handleToggle = async (checked: boolean) => {
    if (checked && !testCredentials) {
      toast.error('Configure test credentials first')
      return
    }
    
    if (!checked && !productionCredentials) {
      toast.error('Configure production credentials first')
      return
    }
    
    // Confirm switch
    const modeFrom = checked ? 'production' : 'test'
    const modeTo = checked ? 'test' : 'production'
    
    if (!confirm(
      `Switch from ${modeFrom} to ${modeTo} mode?\n\n` +
      `This will use ${modeTo} credentials for all API calls.`
    )) {
      return
    }
    
    try {
      await onToggle(checked)
      setLocalTestMode(checked)
      toast.success(`Switched to ${modeTo} mode`)
    } catch (error) {
      console.error('Error toggling sandbox mode:', error)
      toast.error('Failed to switch mode')
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {localTestMode ? (
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TestTube className="h-5 w-5 text-yellow-600" />
              </div>
            ) : (
              <div className="p-2 bg-blue-100 rounded-lg">
                <Globe className="h-5 w-5 text-blue-600" />
              </div>
            )}
            
            <div>
              <Label className="text-base font-semibold">
                {localTestMode ? 'Test Mode' : 'Production Mode'}
              </Label>
              <p className="text-xs text-gray-600 mt-1">
                {localTestMode 
                  ? 'Using test credentials - safe for testing without affecting live data'
                  : 'Using production credentials - live data and real API calls'
                }
              </p>
            </div>
          </div>
          
          <Switch
            checked={localTestMode}
            onCheckedChange={handleToggle}
          />
        </div>
      </Card>

      {/* Current Mode Indicator */}
      <div className={`p-3 rounded-lg border ${
        localTestMode 
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center gap-2">
          {localTestMode ? (
            <>
              <Badge className="bg-yellow-500">TEST MODE</Badge>
              <span className="text-sm text-yellow-800">
                All API calls will use test credentials and sandbox endpoints
              </span>
            </>
          ) : (
            <>
              <Badge className="bg-blue-500">PRODUCTION</Badge>
              <span className="text-sm text-blue-800">
                All API calls will use production credentials and live endpoints
              </span>
            </>
          )}
        </div>
      </div>

      {/* Test Credentials Configuration */}
      {localTestMode && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold">Test Credentials</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTestCreds(!showTestCreds)}
            >
              {showTestCreds ? 'Hide' : 'Show'}
            </Button>
          </div>
          
          {showTestCreds && (
            <div className="space-y-3">
              {getTestCredentialFields(integrationType).map((field) => (
                <div key={field.key}>
                  <Label className="text-xs">{field.label}</Label>
                  <Input
                    type={field.type === 'password' ? 'password' : 'text'}
                    value={testCredentials?.[field.key] || ''}
                    onChange={(e) => {
                      const newCreds = {
                        ...testCredentials,
                        [field.key]: e.target.value,
                      }
                      onUpdateTestCredentials(newCreds)
                    }}
                    placeholder={field.placeholder}
                    className="mt-1 text-xs"
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Warning for Test Mode */}
      {localTestMode && (
        <div className="flex items-start gap-2 text-xs text-yellow-800 bg-yellow-50 p-3 rounded border border-yellow-200">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Test Mode Active</p>
            <p className="mt-1">
              Data created in test mode will be marked and can be filtered out.
              Switch to production mode when ready to use live credentials.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function getTestCredentialFields(integrationType: string): Array<{
  key: string
  label: string
  type: 'text' | 'password'
  placeholder: string
}> {
  if (integrationType.startsWith('twilio_')) {
    return [
      { key: 'account_sid', label: 'Test Account SID', type: 'text', placeholder: 'ACtest...' },
      { key: 'auth_token', label: 'Test Auth Token', type: 'password', placeholder: 'test_token' },
      { key: 'phone_number', label: 'Test Phone Number', type: 'text', placeholder: '+15005550006' },
    ]
  }
  
  if (integrationType.startsWith('facebook_') || integrationType.startsWith('meta_')) {
    return [
      { key: 'app_id', label: 'Test App ID', type: 'text', placeholder: 'test_app_id' },
      { key: 'app_secret', label: 'Test App Secret', type: 'password', placeholder: 'test_secret' },
      { key: 'access_token', label: 'Test Access Token', type: 'password', placeholder: 'test_token' },
    ]
  }
  
  if (integrationType.startsWith('google_')) {
    return [
      { key: 'client_id', label: 'Test Client ID', type: 'text', placeholder: 'test_client_id' },
      { key: 'client_secret', label: 'Test Client Secret', type: 'password', placeholder: 'test_secret' },
      { key: 'refresh_token', label: 'Test Refresh Token', type: 'password', placeholder: 'test_refresh' },
    ]
  }
  
  return []
}

