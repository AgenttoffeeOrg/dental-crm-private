/**
 * Skeleton Loading Components for Dashboard Widgets
 * 
 * Provides smooth loading states that match actual content layout.
 * Improves perceived performance and user experience.
 */

export function KPICardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-5 w-24 bg-gray-200 rounded mb-2"></div>
      <div className="h-8 w-32 bg-gray-300 rounded mb-2"></div>
      <div className="h-4 w-40 bg-gray-200 rounded"></div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="animate-pulse h-80">
      <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>
      <div className="h-64 bg-gray-100 rounded flex items-end justify-around px-4 pb-4">
        {[40, 65, 45, 80, 55, 70].map((height, i) => (
          <div
            key={i}
            className="bg-gray-200 rounded-t w-12"
            style={{ height: `${height}%` }}
          ></div>
        ))}
      </div>
    </div>
  )
}

export function ActivityListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 w-1/2 bg-gray-100 rounded"></div>
          </div>
          <div className="h-3 w-16 bg-gray-100 rounded"></div>
        </div>
      ))}
    </div>
  )
}

export function TaskListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="animate-pulse flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="flex-1">
            <div className="h-3 w-full bg-gray-200 rounded mb-1"></div>
            <div className="h-2 w-2/3 bg-gray-100 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function InsightsCardSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="flex justify-between items-center">
            <div className="h-3 w-24 bg-gray-200 rounded"></div>
            <div className="h-4 w-16 bg-gray-300 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 p-8">
      {/* Header Skeleton */}
      <div className="animate-pulse">
        <div className="h-8 w-64 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-96 bg-gray-100 rounded"></div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border rounded-lg p-6">
            <KPICardSkeleton />
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6">
          <ChartSkeleton />
        </div>
        <div className="border rounded-lg p-6">
          <ChartSkeleton />
        </div>
      </div>

      {/* Activity Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border rounded-lg p-6">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
          <ActivityListSkeleton />
        </div>
        <div className="border rounded-lg p-6">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
          <TaskListSkeleton />
        </div>
      </div>
    </div>
  )
}

