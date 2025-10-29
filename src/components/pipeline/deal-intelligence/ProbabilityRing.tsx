'use client'

/**
 * Probability Ring Component
 * 
 * Mini circular progress indicator showing deal probability (0-100%)
 * Color-coded: High (≥70%) green, Medium (40-69%) blue, Low (<40%) red
 */

import { getProbabilityColor } from '@/types/deal-intelligence'
import type { DealProbability } from '@/types/deal-intelligence'

interface ProbabilityRingProps {
  probability: DealProbability
  size?: number  // Diameter in pixels (default: 36)
  strokeWidth?: number  // Ring thickness (default: 3)
  showPercentage?: boolean  // Show % text inside (default: true)
  className?: string
}

export function ProbabilityRing({
  probability,
  size = 36,
  strokeWidth = 3,
  showPercentage = true,
  className = ''
}: ProbabilityRingProps) {
  const { percentage } = probability
  const { color, label } = getProbabilityColor(percentage)
  
  // SVG circle calculations
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (percentage / 100) * circumference
  const dashOffset = circumference - progress
  
  // Center coordinates
  const center = size / 2
  
  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`}
      title={`${percentage}% probability (${label})`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle (light gray) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200"
        />
        
        {/* Progress circle (colored based on percentage) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />
      </svg>
      
      {/* Percentage text (centered absolutely) */}
      {showPercentage && (
        <span 
          className="absolute text-[10px] font-bold tracking-tight"
          style={{ color }}
        >
          {percentage}
        </span>
      )}
    </div>
  )
}

/**
 * Mini version for compact display (24px)
 */
export function ProbabilityRingMini({ probability }: { probability: DealProbability }) {
  return (
    <ProbabilityRing
      probability={probability}
      size={24}
      strokeWidth={2}
      showPercentage={false}
      className="inline-block"
    />
  )
}


