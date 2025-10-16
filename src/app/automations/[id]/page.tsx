'use client'

/**
 * EDIT AUTOMATION PAGE
 * 
 * Edit existing automation of any category (Deal, Pipeline, Task, Marketing).
 * Loads automation from the new standalone automations table.
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Play, Pause, Trash2, History, Eye } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { AutomationCanvas } from '@/components/automations/automation-canvas'
import { useFeatureFlags } from '@/lib/hooks/use-feature-flags'

const CATEGORY_COLORS = {
  deal: 'bg-blue-100 text-blue-700',
  pipeline: 'bg-green-100 text-green-700',
  task: 'bg-orange-100 text-orange-700',
  marketing: 'bg-purple-100 text-purple-700',
}

export default function EditAutomationPage() {
  const router = useRouter()
  const params = useParams()
  const automationId = params.id as string
  const { featureFlags } = useFeatureFlags()
  
  const [automation, setAutomation] = useState<any>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    if (automationId) {
      fetchAutomation()
    }
  }, [automationId])

  const fetchAutomation = async () => {
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('id', automationId)
        .single()

      if (error) throw error

      // Check if marketing automation but marketing not enabled
      if (data.category === 'marketing' && !featureFlags?.marketing?.enabled) {
        toast.error('Marketing module is not enabled')
        router.push('/automations')
        return
      }

      setAutomation(data)
      setName(data.name)
      setDescription(data.description || '')
    } catch (error) {
      console.error('Error fetching automation:', error)
      toast.error('Failed to load automation')
      router.push('/automations')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (nodes: any[], edges: any[]) => {
    if (!name.trim()) {
      toast.error('Please enter an automation name')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('automations')
        .update({
          name,
          description,
          graph_json: {
            nodes,
            edges,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', automationId)

      if (error) throw error

      toast.success('Automation saved successfully!')
      fetchAutomation() // Refresh
    } catch (error) {
      console.error('Error saving automation:', error)
      toast.error('Failed to save automation')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!automation) return

    const newStatus = automation.status === 'active' ? 'paused' : 'active'
    
    try {
      const { error } = await supabase
        .from('automations')
        .update({
          status: newStatus,
          ...(newStatus === 'active' && { activated_at: new Date().toISOString() }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', automationId)

      if (error) throw error

      setAutomation({ ...automation, status: newStatus })
      toast.success(`Automation ${newStatus === 'active' ? 'activated' : 'paused'}`)
    } catch (error) {
      console.error('Error toggling status:', error)
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this automation? This cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', automationId)

      if (error) throw error

      toast.success('Automation deleted')
      router.push('/automations')
    } catch (error) {
      console.error('Error deleting automation:', error)
      toast.error('Failed to delete automation')
    }
  }

  const handleTest = () => {
    toast.info('Opening test mode...')
    // TODO: Open simulation modal
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (!automation) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <p className="text-gray-500">Automation not found</p>
          <Link href="/automations">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Automations
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-white p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/automations">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              
              <div className="flex-1 space-y-2">
                {/* Category Badge */}
                <div className="flex items-center gap-2">
                  <Badge className={CATEGORY_COLORS[automation.category as keyof typeof CATEGORY_COLORS]}>
                    {automation.category}
                  </Badge>
                  <Badge variant="outline">
                    {automation.trigger_type.replace(/_/g, ' ')}
                  </Badge>
                </div>

                {/* Name & Description */}
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Automation Name"
                  className="text-lg font-semibold"
                />
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="text-sm resize-none"
                  rows={2}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Test
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                >
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline"
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button 
                  onClick={handleToggleStatus}
                  className={automation.status === 'active' 
                    ? 'bg-yellow-600 hover:bg-yellow-700' 
                    : 'bg-green-600 hover:bg-green-700'
                  }
                >
                  {automation.status === 'active' ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <AutomationCanvas 
            automationId={automationId}
            category={automation.category}
            onSave={handleSave}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

