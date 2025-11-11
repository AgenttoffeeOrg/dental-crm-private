'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { IntegrationsHubV2 } from '@/components/integrations/integrations-hub-v2'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export default function IntegrationsPage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const error = searchParams.get('error')
    const success = searchParams.get('success')

    if (error) {
      toast.error('Integration Error', {
        description: error === 'missing_code_or_state' 
          ? 'OAuth callback missing required parameters'
          : error === 'user_not_found'
          ? 'User account not found'
          : error === 'no_organization'
          ? 'Please select an organization first'
          : error === 'storage_failed'
          ? 'Failed to store integration credentials'
          : error === 'callback_failed'
          ? 'OAuth callback failed'
          : 'An error occurred',
      })
    }

    if (success === 'connected') {
      toast.success('🎉 Connected Successfully!', {
        description: 'Your integration is now active and ready to use. You can start using it right away!',
        duration: 5000,
      })
    }
  }, [searchParams])

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <IntegrationsHubV2 />
      </div>
    </DashboardLayout>
  )
}

