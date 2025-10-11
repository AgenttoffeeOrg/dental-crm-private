'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Settings, Users, Zap, Database } from 'lucide-react'
import { toast } from 'sonner'

export function SettingsTabs() {
  return (
    <Tabs defaultValue="pipeline" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        <TabsTrigger value="treatments">Treatments</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
      </TabsList>

      <TabsContent value="pipeline" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Stages</CardTitle>
            <CardDescription>
              Manage your sales pipeline stages and their order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                'New Inquiry',
                'Contacted',
                'Consultation Booked',
                'Treatment Planned',
                'Treatment Accepted',
                'Completed',
                'Lost'
              ].map((stage, index) => (
                <div key={stage} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium">{stage}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Active</Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        toast.info('Stage editing will be available in the Pipeline page')
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button 
                variant="outline"
                onClick={() => {
                  toast.info('To add stages, go to Pipeline page and click Settings')
                }}
              >
                Add Stage
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="treatments" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Treatment Tags</CardTitle>
            <CardDescription>
              Manage available treatment tags for deals and activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                'implants', 'invisalign', 'whitening', 'hygiene', 'emergency',
                'root_canal', 'extraction', 'veneers', 'crowns', 'bridges',
                'dentures', 'orthodontics', 'periodontics', 'endodontics',
                'oral_surgery', 'cosmetic', 'preventive', 'restorative'
              ].map(tag => (
                <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-gray-200">
                  {tag}
                </Badge>
              ))}
            </div>
            <Button 
              variant="outline"
              onClick={() => {
                toast.info('Treatment tag management will be available in a future update')
              }}
            >
              Add Treatment Tag
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="team" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage user accounts and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium">
                    DU
                  </div>
                  <div>
                    <div className="font-medium">Demo User</div>
                    <div className="text-sm text-gray-500">demo@dental.com</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>Owner</Badge>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      toast.info('User management will be available in a future update')
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Button 
                variant="outline"
                onClick={() => {
                  toast.info('Team member invitations will be available in a future update')
                }}
              >
                Invite Team Member
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="integrations" className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Telephony
              </CardTitle>
              <CardDescription>
                Connect your phone system for automatic call logging
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  Webhook URL (reserved):
                </div>
                <code className="block p-2 bg-gray-100 rounded text-xs break-all">
                  https://your-domain.vercel.app/api/webhooks/telephony
                </code>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                WhatsApp Business
              </CardTitle>
              <CardDescription>
                Integrate WhatsApp for patient communication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  Webhook URL (reserved):
                </div>
                <code className="block p-2 bg-gray-100 rounded text-xs break-all">
                  https://your-domain.vercel.app/api/webhooks/whatsapp
                </code>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Practice Management
              </CardTitle>
              <CardDescription>
                Sync with CareStack and other PMS systems
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  API Endpoint (reserved):
                </div>
                <code className="block p-2 bg-gray-100 rounded text-xs break-all">
                  https://your-domain.vercel.app/api/integrations/pms
                </code>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Email Integration
              </CardTitle>
              <CardDescription>
                Two-way email sync with Gmail/Outlook
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  OAuth Redirect (reserved):
                </div>
                <code className="block p-2 bg-gray-100 rounded text-xs break-all">
                  https://your-domain.vercel.app/api/auth/email/callback
                </code>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  )
}
