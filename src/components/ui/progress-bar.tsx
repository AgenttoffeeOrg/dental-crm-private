'use client'

interface ProgressBarProps {
  value: number
  max?: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

export function ProgressBar({ 
  value, 
  max = 100, 
  showLabel = false,
  size = 'md',
  variant = 'default' 
}: ProgressBarProps) {
  const percentage = (value / max) * 100
  
  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-4'
  }
  
  const colors = {
    default: 'bg-indigo-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600'
  }

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${heights[size]}`}>
        <div 
          className={`${heights[size]} ${colors[variant]} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-sm text-gray-600 mt-1">{Math.round(percentage)}%</p>
      )}
    </div>
  )
}

