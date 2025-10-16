'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, Play } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { AutomationCanvas } from '@/components/automations/automation-canvas'

export default function CreateJourneyPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSave = async (nodes: any[], edges: any[]) => {
    if (!name.trim()) {
      toast.error('Please enter a journey name')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('marketing_journeys')
        .insert({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          name,
          description,
          status: 'draft',
          entry_trigger_type: 'manual', // Default, will be updated from canvas
          graph_json: {
            nodes,
            edges,
          },
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Automation created successfully!')
      router.push('/automations')
    } catch (error) {
      console.error('Error creating journey:', error)
      toast.error('Failed to create automation')
    } finally {
      setLoading(false)
    }
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
                  placeholder="Automation Name (e.g., Deal Won → Thank You Series)"
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
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={loading}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Save & Activate
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <AutomationCanvas 
            category="marketing"
            onSave={handleSave}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

