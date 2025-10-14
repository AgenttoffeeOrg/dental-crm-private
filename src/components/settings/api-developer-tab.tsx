'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Code, Copy, Plus } from 'lucide-react'
import { toast } from 'sonner'

export function APIDeveloperTab() {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            API Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-mono text-sm">sk_live_••••••••••••1234</p>
                <p className="text-xs text-gray-500 mt-1">Created Oct 13, 2025</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleCopy('sk_live_1234')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="p-3 bg-gray-50 rounded border font-mono text-xs">
            {typeof window !== 'undefined' && window.location.origin}/api/webhooks/form-submission
          </div>
          <div className="p-3 bg-gray-50 rounded border font-mono text-xs">
            {typeof window !== 'undefined' && window.location.origin}/api/webhooks/email
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


