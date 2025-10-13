'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Activity, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

interface PMSIntegration {
  id: string
  provider: string
  provider_name: string
  is_active: boolean
  connection_status: string
  last_sync_at: string | null
  auto_create_deals: boolean
  auto_close_deals: boolean
  min_deal_value_cents: number
  excluded_procedure_codes: string[]
}

export function PMSIntegrationSettings({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(true)
  const [integration, setIntegration] = useState<PMSIntegration | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadIntegration()
  }, [tenantId])

  const loadIntegration = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('pms_integrations')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    setIntegration(data)
    setLoading(false)
  }

  const handleSave = async () => {
    if (!integration) return

    setIsSaving(true)
    const supabase = createClient()

    await supabase
      .from('pms_integrations')
      .update({
        auto_create_deals: integration.auto_create_deals,
        auto_close_deals: integration.auto_close_deals,
        min_deal_value_cents: integration.min_deal_value_cents,
        excluded_procedure_codes: integration.excluded_procedure_codes
      })
      .eq('id', integration.id)

    setIsSaving(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'syncing':
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  if (loading) {
    return <div className="animate-pulse">Loading...</div>
  }

  if (!integration) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Practice Management Software Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Connect your practice management software to automatically sync patient data, treatment plans, and payments.
          </p>
          <Button>+ Connect PMS</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(integration.connection_status)}
            PMS Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-600">Provider</Label>
              <p className="text-lg font-semibold">{integration.provider_name}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Status</Label>
              <Badge className={
                integration.connection_status === 'connected' ? 'bg-green-600' :
                integration.connection_status === 'error' ? 'bg-red-600' : 'bg-gray-600'
              }>
                {integration.connection_status}
              </Badge>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Last Sync</Label>
              <p className="text-sm">
                {integration.last_sync_at 
                  ? new Date(integration.last_sync_at).toLocaleString()
                  : 'Never'}
              </p>
            </div>
            <div>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Create Deals</Label>
              <p className="text-sm text-gray-600">Automatically create deals when treatment plans are proposed</p>
            </div>
            <Switch
              checked={integration.auto_create_deals}
              onCheckedChange={(checked) => 
                setIntegration({ ...integration, auto_create_deals: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Close Deals</Label>
              <p className="text-sm text-gray-600">Automatically mark deals as won when treatment is accepted</p>
            </div>
            <Switch
              checked={integration.auto_close_deals}
              onCheckedChange={(checked) => 
                setIntegration({ ...integration, auto_close_deals: checked })
              }
            />
          </div>

          <div>
            <Label>Minimum Deal Value</Label>
            <p className="text-sm text-gray-600 mb-2">Only create deals for treatments above this value</p>
            <Input
              type="number"
              value={integration.min_deal_value_cents / 100}
              onChange={(e) => 
                setIntegration({ 
                  ...integration, 
                  min_deal_value_cents: Math.round(Number(e.target.value) * 100)
                })
              }
              placeholder="1000"
            />
          </div>

          <div>
            <Label>Excluded Procedure Codes</Label>
            <p className="text-sm text-gray-600 mb-2">Don't create deals for these procedures (comma-separated)</p>
            <Input
              value={integration.excluded_procedure_codes?.join(', ') || ''}
              onChange={(e) => 
                setIntegration({ 
                  ...integration, 
                  excluded_procedure_codes: e.target.value.split(',').map(c => c.trim())
                })
              }
              placeholder="D1110, D0150 (cleanings, exams)"
            />
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Label>Webhook URLs (Configure in your PMS)</Label>
          <div className="space-y-2 mt-2">
            <div className="p-3 bg-gray-50 rounded-md border">
              <code className="text-xs">
                {`${window.location.origin}/api/integrations/pms/webhooks/treatment-proposed`}
              </code>
            </div>
            <div className="p-3 bg-gray-50 rounded-md border">
              <code className="text-xs">
                {`${window.location.origin}/api/integrations/pms/webhooks/treatment-accepted`}
              </code>
            </div>
            <div className="p-3 bg-gray-50 rounded-md border">
              <code className="text-xs">
                {`${window.location.origin}/api/integrations/pms/webhooks/payment-received`}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

