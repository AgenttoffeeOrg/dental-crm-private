'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  Mail, 
  Users, 
  FileText, 
  GitBranch, 
  BarChart3,
  Send,
  Target,
  TrendingUp,
  Plus,
  Layout,
  Sparkles
} from 'lucide-react'

export default function MarketingDashboard() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Marketing</h1>
              <p className="text-gray-600 mt-1">Mailchimp-style campaigns, automation & analytics</p>
            </div>
            <Badge className="bg-purple-600 text-white px-4 py-2 text-sm">
              <Sparkles className="h-4 w-4 mr-2" />
              Full-Featured Module
            </Badge>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Contacts</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Campaigns</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Send className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">This Month</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
                    <p className="text-xs text-gray-500 mt-1">emails sent</p>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Mail className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Open Rate</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
                  </div>
                  <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Modules */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Marketing Tools</h2>
            <div className="grid grid-cols-2 gap-6">
              {/* Audiences */}
              <Link href="/marketing/audiences">
                <Card className="cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all group">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                          <Target className="h-6 w-6 text-blue-600 group-hover:text-white" />
                        </div>
                        <div>
                          <CardTitle>Audiences & Segments</CardTitle>
                          <CardDescription>Organize and target your contacts</CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary">0 segments</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Create dynamic segments, manage tags, and build targeted contact lists for your campaigns.
                    </p>
                  </CardContent>
                </Card>
              </Link>

              {/* Templates */}
              <Link href="/marketing/templates">
                <Card className="cursor-pointer hover:shadow-lg hover:border-purple-300 transition-all group">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                          <Layout className="h-6 w-6 text-purple-600 group-hover:text-white" />
                        </div>
                        <div>
                          <CardTitle>Email Templates</CardTitle>
                          <CardDescription>Design beautiful emails</CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary">0 templates</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Drag-and-drop email builder with AI assistance, merge tags, and pre-made templates.
                    </p>
                  </CardContent>
                </Card>
              </Link>

              {/* Campaigns */}
              <Link href="/marketing/campaigns">
                <Card className="cursor-pointer hover:shadow-lg hover:border-green-300 transition-all group">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-600 transition-colors">
                          <Send className="h-6 w-6 text-green-600 group-hover:text-white" />
                        </div>
                        <div>
                          <CardTitle>Campaigns</CardTitle>
                          <CardDescription>Send emails & SMS at scale</CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary">0 campaigns</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Create email broadcasts, A/B tests, and SMS campaigns with advanced tracking and analytics.
                    </p>
                  </CardContent>
                </Card>
              </Link>

              {/* Journeys */}
              <Link href="/marketing/journeys">
                <Card className="cursor-pointer hover:shadow-lg hover:border-orange-300 transition-all group">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-600 transition-colors">
                          <GitBranch className="h-6 w-6 text-orange-600 group-hover:text-white" />
                        </div>
                        <div>
                          <CardTitle>Automation Journeys</CardTitle>
                          <CardDescription>Build smart workflows</CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary">0 journeys</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Visual journey builder with triggers, actions, waits, and branches for automated marketing.
                    </p>
                  </CardContent>
                </Card>
              </Link>

              {/* Forms */}
              <Link href="/marketing/forms-landing">
                <Card className="cursor-pointer hover:shadow-lg hover:border-pink-300 transition-all group">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-pink-100 rounded-lg flex items-center justify-center group-hover:bg-pink-600 transition-colors">
                          <FileText className="h-6 w-6 text-pink-600 group-hover:text-white" />
                        </div>
                        <div>
                          <CardTitle>Forms & Landing Pages</CardTitle>
                          <CardDescription>Capture leads everywhere</CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary">0 forms</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Build signup forms and landing pages with form builder and hosted URLs.
                    </p>
                  </CardContent>
                </Card>
              </Link>

              {/* Reports */}
              <Link href="/marketing/reports">
                <Card className="cursor-pointer hover:shadow-lg hover:border-indigo-300 transition-all group">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                          <BarChart3 className="h-6 w-6 text-indigo-600 group-hover:text-white" />
                        </div>
                        <div>
                          <CardTitle>Reports & Analytics</CardTitle>
                          <CardDescription>Track performance</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Campaign analytics, journey funnels, audience insights, and export to CSV.
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="flex gap-4">
              <Link href="/marketing/campaigns/create">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
              </Link>
              <Link href="/marketing/templates/create">
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </Link>
              <Link href="/marketing/journeys/create">
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  New Journey
                </Button>
              </Link>
            </div>
          </div>

          {/* Setup Notice */}
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Marketing Module Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-800 mb-4">
                The Marketing module is ready! Run the database migrations to activate all features:
              </p>
              <div className="bg-white rounded-lg p-4 border border-amber-200">
                <code className="text-xs text-gray-700">
                  20_marketing_core_tables.sql<br />
                  21_marketing_campaigns.sql<br />
                  22_marketing_automation.sql<br />
                  23_marketing_forms.sql<br />
                  24_marketing_collaboration.sql
                </code>
              </div>
              <p className="text-xs text-amber-700 mt-3">
                Run these in your Supabase SQL Editor, then refresh this page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

