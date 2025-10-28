'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { BackButton } from '@/components/ui/back-button'
import { User, Mail, Phone, Calendar, Edit } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { SkeletonCard } from '@/components/ui/skeleton-loader'
import { formatDistanceToNow } from 'date-fns'

export default function UserProfilePage() {
  const params = useParams()
  const userId = params.id as string
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({ deals: 0, tasks: 0, activities: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [userId])

  const loadUser = async () => {
    const supabase = createClient()

    try {
      // Load user details
      const { data: userData } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', userId)
        .single()

      setUser(userData)

      // Load user stats
      if (userData) {
        const [dealsRes, tasksRes, activitiesRes] = await Promise.all([
          supabase.from('deals').select('id').eq('assigned_to', userId),
          supabase.from('tasks').select('id').eq('assigned_to', userId),
          supabase.from('activities').select('id').eq('agent_user_id', userId)
        ])

        setStats({
          deals: dealsRes.data?.length || 0,
          tasks: tasksRes.data?.length || 0,
          activities: activitiesRes.data?.length || 0
        })
      }
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <SkeletonCard />
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <p className="text-gray-600">User not found</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-8 max-w-5xl mx-auto">
          <BackButton href="/settings?tab=team" label="Back to Team" />
          
          <Breadcrumbs 
            items={[
              { label: 'Settings', href: '/settings' },
              { label: 'Team', href: '/settings?tab=team' },
              { label: user.full_name }
            ]} 
          />

          <div className="mt-6 space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                      {user.full_name?.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900">{user.full_name}</h1>
                        <p className="text-gray-600 mt-1">{user.role}</p>
                      </div>
                      <div className="flex gap-3">
                        <Badge className={user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {user.status}
                        </Badge>
                        <Button>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="h-4 w-4" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</span>
                      </div>
                      {user.last_seen_at && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="h-4 w-4" />
                          <span>Last active {formatDistanceToNow(new Date(user.last_seen_at), { addSuffix: true })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-gray-600">Deals Assigned</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.deals}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-gray-600">Active Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.tasks}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-gray-600">Activities Logged</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.activities}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

