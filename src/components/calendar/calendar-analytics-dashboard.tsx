'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  Calendar,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

interface CalendarAnalyticsDashboardProps {
  tenantId: string
  dateRange?: { start: Date; end: Date }
}

export function CalendarAnalyticsDashboard({
  tenantId,
  dateRange
}: CalendarAnalyticsDashboardProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    noShows: 0,
    completionRate: 0,
    noShowRate: 0,
    averageDuration: 0,
    providerUtilization: [] as any[],
    operatoryUtilization: [] as any[],
    appointmentsByType: [] as any[],
    appointmentsByDay: [] as any[],
    appointmentsByHour: [] as any[],
  })

  useEffect(() => {
    loadAnalytics()
  }, [tenantId, dateRange])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const start = dateRange?.start || subDays(new Date(), 30)
      const end = dateRange?.end || new Date()

      // Get all appointments in range
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          provider:providers(id, name),
          operatory:operatories(id, name),
          appointment_type:appointment_types(id, name)
        `)
        .eq('tenant_id', tenantId)
        .gte('start_at', startOfDay(start).toISOString())
        .lte('start_at', endOfDay(end).toISOString())

      if (error) throw error

      const apts = appointments || []

      // Calculate basic stats
      const total = apts.length
      const completed = apts.filter(a => a.status === 'completed').length
      const cancelled = apts.filter(a => a.status === 'cancelled').length
      const noShows = apts.filter(a => a.status === 'no_show').length

      // Provider utilization
      const providerMap = new Map()
      apts.forEach(apt => {
        if (apt.provider) {
          const key = apt.provider.name
          if (!providerMap.has(key)) {
            providerMap.set(key, { name: key, appointments: 0, hours: 0 })
          }
          const data = providerMap.get(key)
          data.appointments += 1
          data.hours += apt.duration_minutes / 60
        }
      })

      // Operatory utilization
      const operatoryMap = new Map()
      apts.forEach(apt => {
        if (apt.operatory) {
          const key = apt.operatory.name
          if (!operatoryMap.has(key)) {
            operatoryMap.set(key, { name: key, appointments: 0, hours: 0 })
          }
          const data = operatoryMap.get(key)
          data.appointments += 1
          data.hours += apt.duration_minutes / 60
        }
      })

      // Appointments by type
      const typeMap = new Map()
      apts.forEach(apt => {
        if (apt.appointment_type) {
          const key = apt.appointment_type.name
          typeMap.set(key, (typeMap.get(key) || 0) + 1)
        }
      })

      // Appointments by day of week
      const dayMap = new Map([
        ['Sunday', 0],
        ['Monday', 0],
        ['Tuesday', 0],
        ['Wednesday', 0],
        ['Thursday', 0],
        ['Friday', 0],
        ['Saturday', 0]
      ])
      apts.forEach(apt => {
        const day = format(new Date(apt.start_at), 'EEEE')
        dayMap.set(day, (dayMap.get(day) || 0) + 1)
      })

      // Appointments by hour
      const hourMap = new Map()
      for (let i = 7; i <= 19; i++) {
        hourMap.set(i, 0)
      }
      apts.forEach(apt => {
        const hour = new Date(apt.start_at).getHours()
        if (hour >= 7 && hour <= 19) {
          hourMap.set(hour, (hourMap.get(hour) || 0) + 1)
        }
      })

      // Average duration
      const avgDuration = apts.length > 0
        ? apts.reduce((sum, a) => sum + a.duration_minutes, 0) / apts.length
        : 0

      setStats({
        totalAppointments: total,
        completedAppointments: completed,
        cancelledAppointments: cancelled,
        noShows: noShows,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        noShowRate: total > 0 ? (noShows / total) * 100 : 0,
        averageDuration: avgDuration,
        providerUtilization: Array.from(providerMap.values()),
        operatoryUtilization: Array.from(operatoryMap.values()),
        appointmentsByType: Array.from(typeMap.entries()).map(([name, value]) => ({
          name,
          value
        })),
        appointmentsByDay: Array.from(dayMap.entries()).map(([name, value]) => ({
          name,
          appointments: value
        })),
        appointmentsByHour: Array.from(hourMap.entries()).map(([hour, count]) => ({
          hour: format(new Date().setHours(hour), 'ha'),
          appointments: count
        })),
      })
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalAppointments}
                </p>
              </div>
              <Calendar className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completionRate.toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">No-Show Rate</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.noShowRate.toFixed(1)}%
                </p>
              </div>
              <AlertCircle className="h-10 w-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Duration</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.averageDuration.toFixed(0)} min
                </p>
              </div>
              <Clock className="h-10 w-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Utilization */}
        <Card>
          <CardHeader>
            <CardTitle>Provider Utilization</CardTitle>
            <CardDescription>Appointments per provider</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.providerUtilization}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="appointments" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Appointments by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Appointments by Type</CardTitle>
            <CardDescription>Distribution of appointment types</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.appointmentsByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.appointmentsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Appointments by Day of Week */}
        <Card>
          <CardHeader>
            <CardTitle>Appointments by Day</CardTitle>
            <CardDescription>Weekly distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.appointmentsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="appointments" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Appointments by Hour */}
        <Card>
          <CardHeader>
            <CardTitle>Appointments by Hour</CardTitle>
            <CardDescription>Peak times</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.appointmentsByHour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="appointments" stroke="#8B5CF6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Operatory Utilization Table */}
      {stats.operatoryUtilization.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Operatory Utilization</CardTitle>
            <CardDescription>Usage by room</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Operatory</th>
                  <th className="text-right py-2">Appointments</th>
                  <th className="text-right py-2">Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {stats.operatoryUtilization.map((op, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2">{op.name}</td>
                    <td className="text-right">{op.appointments}</td>
                    <td className="text-right">{op.hours.toFixed(1)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

