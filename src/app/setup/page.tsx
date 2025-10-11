'use client'

import { useState } from 'react'
import { createServiceClient } from '@/lib/supabase-server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Database,
  Folder,
  Shield
} from 'lucide-react'
import { toast } from 'sonner'

export default function SetupPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{
    audioBucket?: { success: boolean; message: string }
    attachmentsBucket?: { success: boolean; message: string }
  }>({})

  const createStorageBuckets = async () => {
    setLoading(true)
    setResults({})
    
    try {
      const response = await fetch('/api/setup/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      
      if (response.ok) {
        setResults(data.results)
        toast.success('Storage setup completed!')
      } else {
        toast.error(data.error || 'Setup failed')
      }
    } catch (error) {
      console.error('Setup error:', error)
      toast.error('Failed to run setup')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Dental CRM Setup
          </h1>
          <p className="text-gray-600">
            Initialize your Supabase storage buckets and database configuration
          </p>
        </div>

        <div className="grid gap-6">
          {/* Storage Setup Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Storage Buckets Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Create the required Supabase storage buckets for audio files and attachments.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Folder className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">Audio Bucket</div>
                    <div className="text-sm text-gray-600">For call recordings (50MB limit)</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium">Attachments Bucket</div>
                    <div className="text-sm text-gray-600">For general files (100MB limit)</div>
                  </div>
                </div>
              </div>

              <Button 
                onClick={createStorageBuckets}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Buckets...
                  </>
                ) : (
                  'Create Storage Buckets'
                )}
              </Button>

              {/* Results */}
              {Object.keys(results).length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="font-medium">Setup Results:</h4>
                  
                  {results.audioBucket && (
                    <div className="flex items-center gap-2 p-2 rounded border">
                      {results.audioBucket.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm">
                        Audio Bucket: {results.audioBucket.message}
                      </span>
                    </div>
                  )}
                  
                  {results.attachmentsBucket && (
                    <div className="flex items-center gap-2 p-2 rounded border">
                      {results.attachmentsBucket.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm">
                        Attachments Bucket: {results.attachmentsBucket.message}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">✅</div>
                  <div className="text-sm font-medium">Database</div>
                  <div className="text-xs text-gray-600">Schema Ready</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {results.audioBucket?.success ? '✅' : '⏳'}
                  </div>
                  <div className="text-sm font-medium">Storage</div>
                  <div className="text-xs text-gray-600">
                    {results.audioBucket?.success ? 'Configured' : 'Pending'}
                  </div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">✅</div>
                  <div className="text-sm font-medium">App</div>
                  <div className="text-xs text-gray-600">Running</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">1</Badge>
                  <span className="text-sm">Run storage setup above</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">2</Badge>
                  <span className="text-sm">Test audio upload functionality</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">3</Badge>
                  <span className="text-sm">Configure OpenAI API for AI processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">4</Badge>
                  <span className="text-sm">Deploy to production</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

