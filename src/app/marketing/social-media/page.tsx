'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  Plus, 
  Share2,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  Twitter,
  Linkedin,
  Youtube,
  TrendingUp,
  Users,
  Heart,
  MessageCircle,
  Eye,
  MousePointerClick,
  DollarSign,
  Settings,
  Link as LinkIcon
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'

interface SocialAccount {
  id: string
  platform: string
  account_name: string
  account_username: string
  profile_image_url: string
  is_active: boolean
  follower_count: number
  post_count: number
}

interface SocialStats {
  totalPosts: number
  totalReach: number
  totalEngagement: number
  totalClicks: number
  dealsGenerated: number
  revenueGenerated: number
}

export default function SocialMediaPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [stats, setStats] = useState<SocialStats>({
    totalPosts: 0,
    totalReach: 0,
    totalEngagement: 0,
    totalClicks: 0,
    dealsGenerated: 0,
    revenueGenerated: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSocialData()
  }, [])

  const loadSocialData = async () => {
    try {
      const supabase = createClient()
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'

      // Load connected accounts
      const { data: accountsData } = await supabase
        .from('social_media_accounts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)

      setAccounts(accountsData || [])

      // Load performance stats (would come from view)
      // For now, placeholder data
      setStats({
        totalPosts: 42,
        totalReach: 5240,
        totalEngagement: 487,
        totalClicks: 89,
        dealsGenerated: 12,
        revenueGenerated: 8400
      })
    } catch (error) {
      console.error('[SOCIAL] Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return <FacebookIcon className="h-5 w-5" />
      case 'instagram': return <InstagramIcon className="h-5 w-5" />
      case 'twitter': return <Twitter className="h-5 w-5" />
      case 'linkedin': return <Linkedin className="h-5 w-5" />
      case 'youtube': return <Youtube className="h-5 w-5" />
      default: return <Share2 className="h-5 w-5" />
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'facebook': return 'from-blue-600 to-blue-700'
      case 'instagram': return 'from-pink-600 to-purple-600'
      case 'twitter': return 'from-sky-500 to-blue-600'
      case 'linkedin': return 'from-blue-700 to-blue-800'
      case 'youtube': return 'from-red-600 to-red-700'
      default: return 'from-gray-600 to-gray-700'
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-pink-50/30">
        <div className="p-8 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Share2 className="h-8 w-8 text-pink-600" />
                Social Media Marketing
              </h1>
              <p className="text-gray-600 mt-1">Manage posts across Facebook, Instagram, TikTok & more</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/marketing/social-media/connect">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Connect Account
                </Link>
              </Button>
              <Button className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700" asChild>
                <Link href="/marketing/social-media/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Post
                </Link>
              </Button>
            </div>
          </div>

          {/* Connected Accounts */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Connected Accounts</h2>
            
            {accounts.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="p-12 text-center">
                  <Share2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Social Media Accounts Connected</h3>
                  <p className="text-gray-600 mb-6">Connect your Facebook, Instagram, TikTok, or other social accounts to start posting</p>
                  <Button asChild>
                    <Link href="/marketing/social-media/connect">
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Connect Your First Account
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {accounts.map((account) => (
                  <Card key={account.id} className="hover:shadow-lg transition-all">
                    <CardContent className="p-6">
                      <div className={`h-16 w-16 bg-gradient-to-br ${getPlatformColor(account.platform)} rounded-2xl flex items-center justify-center mx-auto mb-3 text-white`}>
                        {getPlatformIcon(account.platform)}
                      </div>
                      <h3 className="font-semibold text-center text-gray-900 mb-1">{account.account_name}</h3>
                      <p className="text-xs text-gray-600 text-center mb-3">@{account.account_username}</p>
                      <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
                        <div className="text-center">
                          <p className="font-semibold text-gray-900">{account.follower_count.toLocaleString()}</p>
                          <p>Followers</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-gray-900">{account.post_count}</p>
                          <p>Posts</p>
                        </div>
                      </div>
                      <Badge className="w-full mt-3 bg-green-100 text-green-700 border-green-200 justify-center">
                        ✓ Connected
                      </Badge>
                    </CardContent>
                  </Card>
                ))}

                {/* Add More Account Card */}
                <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-all cursor-pointer" asChild>
                  <Link href="/marketing/social-media/connect">
                    <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                      <div className="h-16 w-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Plus className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="font-semibold text-gray-600 text-center">Connect Another Account</p>
                    </CardContent>
                  </Link>
                </Card>
              </div>
            )}
          </div>

          {/* Performance Stats */}
          {accounts.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h2>
              
              <div className="grid grid-cols-6 gap-4 mb-8">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Total Posts</p>
                      <TrendingUp className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalPosts}</p>
                    <p className="text-xs text-green-600 mt-1">+8 this week</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Reach</p>
                      <Eye className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalReach.toLocaleString()}</p>
                    <p className="text-xs text-green-600 mt-1">+12.5%</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Engagement</p>
                      <Heart className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalEngagement}</p>
                    <p className="text-xs text-green-600 mt-1">+18.2%</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Clicks</p>
                      <MousePointerClick className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalClicks}</p>
                    <p className="text-xs text-green-600 mt-1">+5.8%</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Leads</p>
                      <Users className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.dealsGenerated}</p>
                    <p className="text-xs text-green-600 mt-1">+3 new</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Revenue</p>
                      <DollarSign className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">${(stats.revenueGenerated / 1000).toFixed(1)}k</p>
                    <p className="text-xs text-green-600 mt-1">ROI: 4.2x</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="hover:shadow-md transition-all cursor-pointer" asChild>
                  <Link href="/marketing/social-media/create">
                    <CardContent className="p-6">
                      <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                        <Plus className="h-6 w-6 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">Create Post</h3>
                      <p className="text-sm text-gray-600">Post to multiple platforms at once</p>
                    </CardContent>
                  </Link>
                </Card>

                <Card className="hover:shadow-md transition-all cursor-pointer" asChild>
                  <Link href="/marketing/social-media/schedule">
                    <CardContent className="p-6">
                      <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                        <Calendar className="h-6 w-6 text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">Content Calendar</h3>
                      <p className="text-sm text-gray-600">View and manage scheduled posts</p>
                    </CardContent>
                  </Link>
                </Card>

                <Card className="hover:shadow-md transition-all cursor-pointer" asChild>
                  <Link href="/marketing/social-media/inbox">
                    <CardContent className="p-6">
                      <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                        <MessageCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">Social Inbox</h3>
                      <p className="text-sm text-gray-600">Respond to comments and DMs</p>
                    </CardContent>
                  </Link>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}



