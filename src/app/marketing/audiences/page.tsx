'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Target } from 'lucide-react'
import { AudiencesList } from '@/components/marketing/audiences-list'
import { SmartSegmentBuilder } from '@/components/marketing/smart-segment-builder'

export default function AudiencesPage() {
  const [showBuilder, setShowBuilder] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-green-50/30">
        <div className="p-8 max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Target className="h-8 w-8 text-green-600" />
                Audiences & Segments
              </h1>
              <p className="text-gray-600 mt-1">Create smart segments to target the right contacts</p>
            </div>
            <Button 
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              onClick={() => setShowBuilder(!showBuilder)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {showBuilder ? 'View Segments' : 'Create Segment'}
            </Button>
          </div>

          {showBuilder ? (
            <Card>
              <CardContent className="p-6">
                <SmartSegmentBuilder
                  onSave={() => {
                    setShowBuilder(false)
                    setRefreshTrigger(prev => prev + 1)
                  }}
                  onCancel={() => setShowBuilder(false)}
                />
              </CardContent>
            </Card>
          ) : (
            <AudiencesList key={refreshTrigger} />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
