'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function DataPrivacyTab() {
  const handleExport = () => {
    toast.success('Exporting data... Download will start shortly')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Data Export & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Export Your Data</h4>
            <p className="text-sm text-gray-600 mb-4">Download all your practice data in CSV format (GDPR compliant)</p>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export All Data
            </Button>
          </div>
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2 text-red-600">Danger Zone</h4>
            <p className="text-sm text-gray-600 mb-4">Permanently delete all practice data</p>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


