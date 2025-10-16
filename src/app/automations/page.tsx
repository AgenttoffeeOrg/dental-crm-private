'use client'

/**
 * AUTOMATIONS HOME PAGE
 * 
 * Standalone automation hub with 4 category tabs:
 * 1. Deal Automations (always visible)
 * 2. Pipeline Automations (always visible)
 * 3. Task Automations (always visible)
 * 4. Marketing Automations (conditional - only if marketing feature enabled)
 * 
 * Each tab shows automations filtered by category.
 * This is NOT under Marketing - it's a standalone paid feature.
 */

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  DollarSign, 
  Workflow, 
  CheckSquare, 
  Mail,
  Play,
  Pause,
  TrendingUp,
  Lock
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import Link from 'next/link'
import { useFeatureFlags } from '@/lib/hooks/use-feature-flags'
import { CreateAutomationSlideOver } from '@/components/automations/create-automation-slide-over'
import { useAuth } from '@/lib/auth'

interface Automation {
  id: string
  name: string
  description: string
  category: 'deal' | 'pipeline' | 'task' | 'marketing'
  trigger_type: string
  status: 'draft' | 'active' | 'paused' | 'archived'
  total_runs: number
  successful_runs: number
  created_at: string
}

interface CategoryStats {
  category: string
  total_automations: number
  active_automations: number
  total_runs: number
  success_rate: number
}

export default function AutomationsPage() {
  const { appUser, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'deal' | 'pipeline' | 'task' | 'marketing'>('deal')
  const [automations, setAutomations] = useState<Automation[]>([])
  const [stats, setStats] = useState<CategoryStats[]>([])
  const [loading, setLoading] = useState(true)
  const [createSlideOverOpen, setCreateSlideOverOpen] = useState(false)
  const supabase = createClient()
  const { featureFlags } = useFeatureFlags()

  useEffect(() => {
    if (appUser?.tenant_id && !authLoading) {
      fetchAutomations()
      fetchStats()
    }
  }, [appUser?.tenant_id, authLoading])

  const fetchAutomations = async () => {
    if (!appUser?.tenant_id) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('tenant_id', appUser.tenant_id) // ✅ SECURITY: Filter by org
        .order('created_at', { ascending: false })

      if (error) throw error
      setAutomations(data || [])
    } catch (error) {
      console.error('[Automations] Error fetching:', error)
      toast.error('Failed to load automations')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!appUser?.tenant_id) return
    
    try {
      const { data, error } = await supabase
        .rpc('get_automation_stats_by_category', {
          p_tenant_id: appUser.tenant_id // ✅ SECURITY: Use authenticated user's org
        })

      if (error) throw error
      setStats(data || [])
    } catch (error) {
      console.error('[Automations] Error fetching stats:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      active: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      archived: 'bg-red-100 text-red-700',
    }
    return <Badge className={variants[status] || variants.draft}>{status}</Badge>
  }

  const getCategoryStats = (category: string) => {
    return stats.find(s => s.category === category)
  }

  const filteredAutomations = automations.filter(a => a.category === activeTab)

  // Check if marketing is enabled
  const isMarketingEnabled = featureFlags?.marketing?.enabled ?? false

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                🤖 Automations
              </h1>
              <Button 
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => setCreateSlideOverOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Automation
              </Button>
            </div>
            <p className="text-gray-600">
              Build intelligent workflows across your entire CRM
            </p>
          </div>

          {/* 4-Tab Interface */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-white border">
              {/* Deal Automations Tab - ALWAYS VISIBLE */}
              <TabsTrigger 
                value="deal" 
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Deal Automations
                {getCategoryStats('deal') && (
                  <Badge variant="secondary" className="ml-2">
                    {getCategoryStats('deal')!.active_automations}
                  </Badge>
                )}
              </TabsTrigger>

              {/* Pipeline Automations Tab - ALWAYS VISIBLE */}
              <TabsTrigger 
                value="pipeline"
                className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-b-2 data-[state=active]:border-green-600"
              >
                <Workflow className="h-4 w-4 mr-2" />
                Pipeline Automations
                {getCategoryStats('pipeline') && (
                  <Badge variant="secondary" className="ml-2">
                    {getCategoryStats('pipeline')!.active_automations}
                  </Badge>
                )}
              </TabsTrigger>

              {/* Task Automations Tab - ALWAYS VISIBLE */}
              <TabsTrigger 
                value="task"
                className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:border-b-2 data-[state=active]:border-orange-600"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Task Automations
                {getCategoryStats('task') && (
                  <Badge variant="secondary" className="ml-2">
                    {getCategoryStats('task')!.active_automations}
                  </Badge>
                )}
              </TabsTrigger>

              {/* Marketing Automations Tab - CONDITIONAL */}
              <TabsTrigger 
                value="marketing"
                disabled={!isMarketingEnabled}
                className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 disabled:opacity-50"
              >
                <Mail className="h-4 w-4 mr-2" />
                Marketing Automations
                {!isMarketingEnabled && <Lock className="h-3 w-3 ml-2" />}
                {isMarketingEnabled && getCategoryStats('marketing') && (
                  <Badge variant="secondary" className="ml-2">
                    {getCategoryStats('marketing')!.active_automations}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Deal Automations Content */}
            <TabsContent value="deal" className="space-y-4">
              <DealAutomationsTab automations={filteredAutomations} onRefresh={fetchAutomations} />
            </TabsContent>

            {/* Pipeline Automations Content */}
            <TabsContent value="pipeline" className="space-y-4">
              <PipelineAutomationsTab automations={filteredAutomations} onRefresh={fetchAutomations} />
            </TabsContent>

            {/* Task Automations Content */}
            <TabsContent value="task" className="space-y-4">
              <TaskAutomationsTab automations={filteredAutomations} onRefresh={fetchAutomations} />
            </TabsContent>

            {/* Marketing Automations Content */}
            <TabsContent value="marketing" className="space-y-4">
              {isMarketingEnabled ? (
                <MarketingAutomationsTab automations={filteredAutomations} onRefresh={fetchAutomations} />
              ) : (
                <MarketingAutomationsLockedState />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Create Automation Slide-Over */}
      <CreateAutomationSlideOver
        open={createSlideOverOpen}
        onClose={() => setCreateSlideOverOpen(false)}
        onAutomationCreated={() => {
          fetchAutomations()
          fetchStats()
        }}
        initialCategory={activeTab}
        tenantId="550e8400-e29b-41d4-a716-446655440000"
      />
    </DashboardLayout>
  )
}

// =====================================================
// TAB COMPONENTS (Each category has its own UI)
// =====================================================

function DealAutomationsTab({ automations, onRefresh }: { automations: Automation[]; onRefresh: () => void }) {
  if (automations.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <DollarSign className="h-16 w-16 text-blue-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Deal Automations Yet</h3>
          <p className="text-gray-600 mb-6">
            Automate deal workflows: auto-assign, stage transitions, win/loss follow-ups, SLA alerts
          </p>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setCreateSlideOverOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create First Deal Automation
          </Button>
        </div>
      </Card>
    )
  }

  return <AutomationsList automations={automations} categoryColor="blue" onRefresh={onRefresh} />
}

function PipelineAutomationsTab({ automations, onRefresh }: { automations: Automation[]; onRefresh: () => void }) {
  if (automations.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <Workflow className="h-16 w-16 text-green-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pipeline Automations Yet</h3>
          <p className="text-gray-600 mb-6">
            Automate pipeline management: capacity alerts, bottleneck detection, velocity tracking
          </p>
          <Button 
            className="bg-green-600 hover:bg-green-700"
            onClick={() => setCreateSlideOverOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create First Pipeline Automation
          </Button>
        </div>
      </Card>
    )
  }

  return <AutomationsList automations={automations} categoryColor="green" onRefresh={onRefresh} />
}

function TaskAutomationsTab({ automations, onRefresh }: { automations: Automation[]; onRefresh: () => void }) {
  if (automations.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <CheckSquare className="h-16 w-16 text-orange-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Task Automations Yet</h3>
          <p className="text-gray-600 mb-6">
            Automate task workflows: escalation chains, reminders, dependency sequences, auto-completion
          </p>
          <Button 
            className="bg-orange-600 hover:bg-orange-700"
            onClick={() => setCreateSlideOverOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create First Task Automation
          </Button>
        </div>
      </Card>
    )
  }

  return <AutomationsList automations={automations} categoryColor="orange" onRefresh={onRefresh} />
}

function MarketingAutomationsTab({ automations, onRefresh }: { automations: Automation[]; onRefresh: () => void }) {
  if (automations.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <Mail className="h-16 w-16 text-purple-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Marketing Automations Yet</h3>
          <p className="text-gray-600 mb-6">
            Automate marketing workflows: nurture sequences, form responses, campaign follow-ups
          </p>
          <Button 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => setCreateSlideOverOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create First Marketing Automation
          </Button>
        </div>
      </Card>
    )
  }

  return <AutomationsList automations={automations} categoryColor="purple" onRefresh={onRefresh} />
}

function MarketingAutomationsLockedState() {
  return (
    <Card className="p-12 border-2 border-dashed border-purple-200">
      <div className="text-center">
        <Lock className="h-16 w-16 text-purple-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Marketing Automations</h3>
        <p className="text-gray-600 mb-2">
          Premium Feature - Available with Marketing Module
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Enable the Marketing module to unlock marketing automation workflows
        </p>
        <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">
          <TrendingUp className="h-4 w-4 mr-2" />
          Upgrade to Enable Marketing
        </Button>
      </div>
    </Card>
  )
}

// =====================================================
// SHARED AUTOMATIONS LIST COMPONENT
// =====================================================

function AutomationsList({ 
  automations, 
  categoryColor,
  onRefresh 
}: { 
  automations: Automation[]
  categoryColor: string
  onRefresh: () => void
}) {
  const supabase = createClient()

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    
    try {
      const { error } = await supabase
        .from('automations')
        .update({ 
          status: newStatus,
          ...(newStatus === 'active' && { activated_at: new Date().toISOString() }),
        })
        .eq('id', id)

      if (error) throw error

      toast.success(`Automation ${newStatus === 'active' ? 'activated' : 'paused'}`)
      onRefresh()
    } catch (error) {
      console.error('Error toggling status:', error)
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {automations.map(automation => (
        <Card key={automation.id} className="hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <Link href={`/automations/${automation.id}`}>
                  <h3 className="font-semibold text-lg text-gray-900 hover:text-blue-600 mb-2">
                    {automation.name}
                  </h3>
                </Link>
                {automation.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{automation.description}</p>
                )}
              </div>
              {getStatusBadge(automation.status)}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{automation.total_runs}</p>
                <p className="text-xs text-gray-600">Total Runs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {automation.total_runs > 0 
                    ? Math.round((automation.successful_runs / automation.total_runs) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-gray-600">Success Rate</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Link href={`/automations/${automation.id}`} className="flex-1">
                <Button size="sm" variant="outline" className="w-full">
                  Edit
                </Button>
              </Link>
              <Button
                size="sm"
                variant={automation.status === 'active' ? 'secondary' : 'default'}
                className="flex-1"
                onClick={() => handleToggleStatus(automation.id, automation.status)}
              >
                {automation.status === 'active' ? (
                  <>
                    <Pause className="h-3.5 w-3.5 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 mr-2" />
                    Activate
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
