'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, Play, Pause, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { AutomationCanvas } from '@/components/automations/automation-canvas'

export default function EditJourneyPage() {
  const router = useRouter()
  const params = useParams()
  const journeyId = params.id as string
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('draft')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (journeyId) {
      fetchJourney()
    }
  }, [journeyId])

  const fetchJourney = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_journeys')
        .select('*')
        .eq('id', journeyId)
        .single()

      if (error) throw error

      setName(data.name)
      setDescription(data.description || '')
      setStatus(data.status)
    } catch (error) {
      console.error('Error fetching journey:', error)
      toast.error('Failed to load automation')
      router.push('/automations')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (nodes: any[], edges: any[]) => {
    if (!name.trim()) {
      toast.error('Please enter a journey name')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('marketing_journeys')
        .update({
          name,
          description,
          graph_json: {
            nodes,
            edges,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', journeyId)

      if (error) throw error

      toast.success('Automation saved successfully!')
    } catch (error) {
      console.error('Error saving journey:', error)
      toast.error('Failed to save automation')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    const newStatus = status === 'active' ? 'paused' : 'active'
    
    try {
      const { error } = await supabase
        .from('marketing_journeys')
        .update({
          status: newStatus,
          ...(newStatus === 'active' && { activated_at: new Date().toISOString() }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', journeyId)

      if (error) throw error

      setStatus(newStatus)
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
        .from('marketing_journeys')
        .delete()
        .eq('id', journeyId)

      if (error) throw error

      toast.success('Automation deleted')
      router.push('/automations')
    } catch (error) {
      console.error('Error deleting journey:', error)
      toast.error('Failed to delete automation')
    }
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
              <div className="flex-1">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Automation Name"
                  className="text-lg font-semibold border-0 focus-visible:ring-0 px-0"
                />
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="text-sm text-gray-600 border-0 focus-visible:ring-0 px-0 mt-1 resize-none"
                  rows={1}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
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
                  className={status === 'active' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}
                >
                  {status === 'active' ? (
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
            automationId={journeyId}
            category="marketing"
            onSave={handleSave}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

