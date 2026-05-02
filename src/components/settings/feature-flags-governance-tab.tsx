'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ShieldAlert, Loader2, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface GovernanceFlag {
  key: string
  name: string
  description?: string | null
  category: string
  rolloutType: string
  defaultEnabled: boolean
  allowTenantOverride: boolean
  effectiveEnabled: boolean
  variant?: string | null
  source: 'default' | 'global' | 'tenant'
  reason?: string | null
  updatedAt?: string | null
  metadata?: Record<string, any>
  lastAudit?: {
    action: string
    context?: Record<string, any> | null
    performed_at: string
    performed_by_user_id?: string | null
  } | null
}

interface FetchResponse {
  tenantId: string
  flags: GovernanceFlag[]
}

export function FeatureFlagsGovernanceTab() {
  const [flags, setFlags] = useState<GovernanceFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<Record<string, boolean>>({})

  const sourceBadgeColor: Record<GovernanceFlag['source'], string> = {
    default: 'bg-gray-100 text-gray-700',
    global: 'bg-blue-100 text-blue-700',
    tenant: 'bg-emerald-100 text-emerald-700',
  }

  const groupedFlags = useMemo(() => {
    const groups = new Map<string, GovernanceFlag[]>()
    flags.forEach((flag) => {
      const key = flag.category || 'general'
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(flag)
    })
    const sortedItems = Array.from(groups.entries())
      .map(([category, items]) => ({
        category,
        items: items.toSorted((a, b) => a.name.localeCompare(b.name)),
      }))
    return sortedItems.toSorted((a, b) => a.category.localeCompare(b.category))
  }, [flags])

  const loadFlags = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/system/feature-flags', {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(await response.text())
      }
      const data = (await response.json()) as FetchResponse
      setFlags(data.flags)
    } catch (error) {
      console.error('[FeatureFlags] Failed to load governance flags', error)
      toast.error('Failed to load feature flags')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFlags()
  }, [])

  const toggleFlag = async (flag: GovernanceFlag, nextState: boolean) => {
    if (!flag.allowTenantOverride) {
      toast.error('This feature flag cannot be overridden for your tenant.')
      return
    }

    setUpdating((prev) => ({ ...prev, [flag.key]: true }))
    try {
      const response = await fetch('/api/system/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          flagKey: flag.key,
          enabled: nextState,
          reason: 'Toggled via settings',
        }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody?.error || 'Failed to update flag')
      }

      const data = (await response.json()) as { flags: GovernanceFlag[] }
      setFlags(data.flags)
      toast.success(`${flag.name} ${nextState ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error('[FeatureFlags] Failed to toggle flag', error)
      toast.error('Failed to update flag')
    } finally {
      setUpdating((prev) => ({ ...prev, [flag.key]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          Loading feature flags…
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-indigo-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Feature Flag Governance</CardTitle>
            <CardDescription>
              Control phased rollouts, tenant overrides, and capture audit history for critical features.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadFlags}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">Active Flags</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {flags.filter((flag) => flag.effectiveEnabled).length}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              of {flags.length} flags currently enabled
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">Tenant Overrides</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {flags.filter((flag) => flag.source === 'tenant').length}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              overrides applied for this tenant
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">Audit Coverage</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {flags.filter((flag) => Boolean(flag.lastAudit)).length}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              flags with recorded audit entries
            </p>
          </div>
        </CardContent>
      </Card>

      {groupedFlags.map(({ category, items }) => (
        <Card key={category} className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base capitalize">{category.replace(/_/g, ' ')}</CardTitle>
            <CardDescription>
              Configure rollout strategy and visibility for {category.replace(/_/g, ' ')} features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead>Rollout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[140px] text-center">Override</TableHead>
                  <TableHead>Last Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((flag) => (
                  <TableRow key={flag.key}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{flag.name}</span>
                          <Badge className={sourceBadgeColor[flag.source]}>
                            {flag.source === 'tenant' ? 'Tenant override' : flag.source}
                          </Badge>
                          {flag.defaultEnabled && (
                            <Badge className="bg-indigo-100 text-indigo-700">Default ON</Badge>
                          )}
                          {flag.metadata?.requires_verification && (
                            <Badge className="bg-amber-100 text-amber-700 flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3" />
                              Sensitive
                            </Badge>
                          )}
                        </div>
                        {flag.description && (
                          <p className="text-xs text-gray-500">{flag.description}</p>
                        )}
                        {flag.reason && (
                          <p className="text-xs text-gray-400">
                            Reason: {flag.reason}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs text-gray-600">
                        <span className="font-medium uppercase tracking-wide text-gray-700">
                          {flag.rolloutType}
                        </span>
                        {flag.variant && (
                          <span className="text-gray-500">Variant: {flag.variant}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs text-gray-600">
                        <span className="font-medium text-gray-900">
                          {flag.effectiveEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <span className="text-gray-500">
                          {(flag.updatedAt &&
                            formatDistanceToNow(new Date(flag.updatedAt), { addSuffix: true })) ||
                            'Never'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={flag.effectiveEnabled}
                          onCheckedChange={(next) => toggleFlag(flag, next)}
                          disabled={!flag.allowTenantOverride || updating[flag.key]}
                        />
                        {updating[flag.key] && (
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {flag.lastAudit ? (
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-gray-600 underline decoration-dotted cursor-help">
                                {formatDistanceToNow(new Date(flag.lastAudit.performed_at), {
                                  addSuffix: true,
                                })}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="max-w-xs text-xs">
                                <p className="font-semibold text-gray-900">Last audit</p>
                                <p>Action: {flag.lastAudit.action}</p>
                                {flag.lastAudit.context?.reason && (
                                  <p>Reason: {flag.lastAudit.context.reason}</p>
                                )}
                                <p className="text-gray-500 mt-1">
                                  Recorded at {new Date(flag.lastAudit.performed_at).toLocaleString()}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-xs text-gray-400">No audits yet</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}





