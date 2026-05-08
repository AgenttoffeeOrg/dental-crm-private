'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { IntegrationsHubV2 } from '@/components/integrations/integrations-hub-v2'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
      <div className="container mx-auto py-8 space-y-8">
        {/* Phase 2b.1.b.2 — Self-serve Google Ads tile. Lives at the top of
            the existing integrations hub so it's the first thing a tenant
            admin sees on the page. Meta + WhatsApp tiles will appear here in
            phases 2b.2 / 2b.3 — keep the markup easy to extend. */}
        <section>
          <Link
            href="/settings/integrations/google"
            className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
            data-testid="google-ads-integration-tile"
          >
            <Card className="hover:border-blue-300 hover:shadow-md transition-all">
              <CardHeader>
                <CardTitle>Google Ads</CardTitle>
                <CardDescription>
                  Connect your Google Ads account to receive leads and send conversion data back.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm text-blue-700 underline">Manage Google Ads →</span>
              </CardContent>
            </Card>
          </Link>
        </section>

        <IntegrationsHubV2 />
      </div>
    </DashboardLayout>
  )
}

