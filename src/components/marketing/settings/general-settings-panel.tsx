'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/lib/auth'
import { useFeatureFlags } from '@/hooks/use-feature-flags'
import { Rocket, TrendingUp, Users, Mail, CheckCircle, Power, Palette } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase-client'
import { authFetch } from '@/lib/auth-fetch'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function GeneralSettingsPanel() {
  const { appUser } = useAuth()
  const { tenantPlan } = useFeatureFlags()
  const [stats, setStats] = useState({ campaigns: 0, contacts: 0, sent: 0 })
  const [loading, setLoading] = useState(true)
  const [marketingEnabled, setMarketingEnabled] = useState<boolean | null>(null)
  const [toggling, setToggling] = useState(false)
  // 2b.28.2: per-tenant brand colours so embedded / hosted forms
  // can match the practice's site rather than render generic blue.
  const [brandPrimary, setBrandPrimary] = useState<string>('#2563eb')
  const [brandAccent, setBrandAccent] = useState<string>('#1d4ed8')
  const [brandSaving, setBrandSaving] = useState(false)
  const [brandLoaded, setBrandLoaded] = useState(false)

  useEffect(() => {
    loadStats()
    loadMarketingFlag()
    loadBrandColors()
  }, [appUser])

  const loadBrandColors = async () => {
    if (!appUser?.tenant_id) return
    const supabase = createClient()
    try {
      const { data } = await supabase
        .from('tenants')
        .select('primary_color, secondary_color')
        .eq('id', appUser.tenant_id)
        .maybeSingle()
      const row = data as { primary_color?: string | null; secondary_color?: string | null } | null
      if (row?.primary_color) setBrandPrimary(row.primary_color)
      if (row?.secondary_color) setBrandAccent(row.secondary_color)
      setBrandLoaded(true)
    } catch (err) {
      console.error('[brand-colors] load failed', err)
      setBrandLoaded(true)
    }
  }

  const handleSaveBrandColors = async () => {
    if (brandSaving) return
    setBrandSaving(true)
    try {
      const res = await authFetch('/api/org/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_color: brandPrimary,
          secondary_color: brandAccent,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body?.error || 'Failed to save brand colours')
        return
      }
      toast.success('Brand colours saved — they\'ll show on every form right away.')
    } catch (err) {
      console.error('[brand-colors] save failed', err)
      toast.error('Failed to save brand colours')
    } finally {
      setBrandSaving(false)
    }
  }

  const loadStats = async () => {
    if (!appUser?.tenant_id) return

    const supabase = createClient()
    try {
      const [campaigns, contacts, sends] = await Promise.all([
        supabase.from('marketing_campaigns').select('id', { count: 'exact', head: true }).eq('tenant_id', appUser.tenant_id),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', appUser.tenant_id),
        supabase.from('marketing_sends').select('id', { count: 'exact', head: true }),
      ])

      setStats({
        campaigns: campaigns.count || 0,
        contacts: contacts.count || 0,
        sent: sends.count || 0,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMarketingFlag = async () => {
    if (!appUser?.tenant_id) return
    const supabase = createClient()
    try {
      const { data } = await supabase
        .from('tenants')
        .select('marketing_enabled')
        .eq('id', appUser.tenant_id)
        .maybeSingle()
      setMarketingEnabled(Boolean((data as { marketing_enabled?: boolean } | null)?.marketing_enabled))
    } catch (err) {
      console.error('[marketing-toggle] flag load failed', err)
      setMarketingEnabled(false)
    }
  }

  const handleToggleMarketing = async (next: boolean) => {
    if (toggling) return
    setToggling(true)
    try {
      const res = await authFetch('/api/settings/marketing/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next ? { enabled: true } : { enabled: false }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(
          body?.message || (next ? 'Failed to enable marketing module' : 'Failed to disable marketing module')
        )
        return
      }
      setMarketingEnabled(next)
      toast.success(next ? 'Marketing module enabled' : 'Marketing module disabled')
    } catch (err) {
      console.error('[marketing-toggle] toggle failed', err)
      toast.error('Something went wrong toggling the marketing module')
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 2b.25.2 — Master enable toggle. Forms, campaigns and journeys
          all gate on tenants.marketing_enabled; without this UI a fresh
          practice gets 403 MARKETING_DISABLED on every form submission
          until someone hand-SQLs the flag. */}
      <Card className={cn('border-2', marketingEnabled ? 'border-green-200 bg-green-50/30' : 'border-amber-200 bg-amber-50/30')}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0', marketingEnabled ? 'bg-green-100' : 'bg-amber-100')}>
                <Power className={cn('h-5 w-5', marketingEnabled ? 'text-green-700' : 'text-amber-700')} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Marketing module — {marketingEnabled === null ? 'loading…' : marketingEnabled ? 'ON' : 'OFF'}
                </h3>
                <p className="text-sm text-gray-600 mt-1 max-w-xl">
                  Controls whether web forms, landing pages, campaigns, automations and SMS/email sends are active for this
                  practice. New form submissions are rejected with a 403 when this is off.
                </p>
              </div>
            </div>
            <div className="flex items-center pt-1">
              <Switch
                checked={Boolean(marketingEnabled)}
                disabled={marketingEnabled === null || toggling}
                onCheckedChange={handleToggleMarketing}
                aria-label="Toggle marketing module"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2b.28.2 — Brand colours. Applied to web-form submit buttons
          (iframe and hosted variants) so the form looks like an
          extension of the practice's site rather than a generic CRM
          widget. Stored on tenants.primary_color / secondary_color. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-pink-600" />
            Brand colours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 max-w-2xl">
            These colours appear on every web form, landing page and email so the practice's
            forms feel like part of the practice's site, not a generic CRM widget.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="brand-primary">Primary (main button colour)</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="brand-primary-picker"
                  type="color"
                  value={brandPrimary}
                  onChange={(e) => setBrandPrimary(e.target.value)}
                  className="h-10 w-14 p-1 cursor-pointer"
                  aria-label="Primary brand colour picker"
                />
                <Input
                  id="brand-primary"
                  type="text"
                  value={brandPrimary}
                  onChange={(e) => setBrandPrimary(e.target.value)}
                  className="font-mono text-sm"
                  placeholder="#2563eb"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-accent">Accent (focus rings, secondary)</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="brand-accent-picker"
                  type="color"
                  value={brandAccent}
                  onChange={(e) => setBrandAccent(e.target.value)}
                  className="h-10 w-14 p-1 cursor-pointer"
                  aria-label="Accent brand colour picker"
                />
                <Input
                  id="brand-accent"
                  type="text"
                  value={brandAccent}
                  onChange={(e) => setBrandAccent(e.target.value)}
                  className="font-mono text-sm"
                  placeholder="#1d4ed8"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              onClick={handleSaveBrandColors}
              disabled={brandSaving || !brandLoaded}
              style={{ backgroundColor: brandPrimary, borderColor: brandPrimary }}
            >
              {brandSaving ? 'Saving…' : 'Save brand colours'}
            </Button>
            <div
              className="rounded-md border px-4 py-2 text-sm"
              style={{ borderColor: brandAccent, color: brandAccent }}
            >
              Preview — this is your accent
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marketing Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Rocket className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Total Campaigns</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.campaigns}</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Contacts</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.contacts.toLocaleString()}</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Messages Sent</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.sent.toLocaleString()}</div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Current Plan</h4>
                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    'text-sm px-3 py-1',
                    tenantPlan === 'enterprise' && 'bg-purple-600 text-white',
                    tenantPlan === 'pro' && 'bg-blue-600 text-white',
                    tenantPlan === 'starter' && 'bg-gray-600 text-white'
                  )}>
                    {tenantPlan.toUpperCase()}
                  </Badge>
                  {tenantPlan === 'enterprise' && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      All Features Unlocked
                    </Badge>
                  )}
                </div>
              </div>
              {tenantPlan !== 'enterprise' && (
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                  Upgrade Plan
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

