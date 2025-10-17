/**
 * Plan Comparison Component
 * 
 * Visual comparison of subscription plans with upgrade/downgrade functionality.
 * Accessible, responsive, and optimized for conversion.
 */

'use client'

import { useState, useEffect } from 'react'
import { Check, Loader2, Crown, Zap, Building2, Star } from 'lucide-react'

interface Plan {
  id: string
  name: string
  display_name: string
  description: string
  tier: string
  default_seat_limit: number
  max_seat_limit: number | null
  price_amount: number | null
  price_currency: string
  billing_interval: 'monthly' | 'yearly'
  is_featured: boolean
  features: string[]
  entitlements: Array<{
    key: string
    limit_value: number | null
    description: string | null
  }>
}

interface PlanComparisonProps {
  currentPlanId?: string
  currentTier?: string
  onSelectPlan?: (planId: string) => void
  className?: string
}

export function PlanComparison({
  currentPlanId,
  currentTier,
  onSelectPlan,
  className = '',
}: PlanComparisonProps) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [selecting, setSelecting] = useState<string | null>(null)

  useEffect(() => {
    loadPlans()
  }, [interval])

  const loadPlans = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/billing/plans?interval=${interval}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load plans')
      }

      // Sort by seat limit
      const sortedPlans = (data.plans || []).sort((a: Plan, b: Plan) => 
        a.default_seat_limit - b.default_seat_limit
      )

      setPlans(sortedPlans)
    } catch (err: any) {
      console.error('Error loading plans:', err)
      setError(err.message || 'Failed to load plans')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlan = async (planId: string) => {
    setSelecting(planId)
    
    try {
      await onSelectPlan?.(planId)
    } finally {
      setSelecting(null)
    }
  }

  const formatPrice = (amount: number | null, currency: string) => {
    if (amount === null) return 'Custom'
    
    const formatted = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100)
    
    return formatted
  }

  const getPlanIcon = (tier: string) => {
    switch (tier) {
      case 'solo':
        return <Zap className="w-6 h-6" />
      case 'tier1':
        return <Star className="w-6 h-6" />
      case 'tier2':
      case 'tier3':
        return <Crown className="w-6 h-6" />
      case 'enterprise':
        return <Building2 className="w-6 h-6" />
      default:
        return <Star className="w-6 h-6" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
        <p className="text-red-900 font-medium mb-2">Failed to Load Plans</p>
        <p className="text-sm text-red-700 mb-4">{error}</p>
        <button
          onClick={loadPlans}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Interval Toggle */}
      <div className="flex items-center justify-center mb-8">
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setInterval('monthly')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
              interval === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval('yearly')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
              interval === 'yearly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly
            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={plan.id === currentPlanId || plan.tier === currentTier}
            onSelect={() => handleSelectPlan(plan.id)}
            selecting={selecting === plan.id}
          />
        ))}
      </div>

      {/* FAQ or Additional Info */}
      <div className="mt-12 p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">
          Need Help Choosing?
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <span>All plans include full CRM features and email support</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <span>Upgrade or downgrade at any time - no contracts</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <span>14-day free trial on all paid plans</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

/**
 * Individual Plan Card
 */
interface PlanCardProps {
  plan: Plan
  isCurrent: boolean
  onSelect: () => void
  selecting: boolean
}

function PlanCard({ plan, isCurrent, onSelect, selecting }: PlanCardProps) {
  const formatPrice = (amount: number | null, currency: string) => {
    if (amount === null) return 'Custom Pricing'
    
    const formatted = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100)
    
    return formatted
  }

  return (
    <div className={`relative bg-white border-2 rounded-lg p-6 transition-all ${
      plan.is_featured
        ? 'border-blue-500 shadow-lg scale-105'
        : isCurrent
        ? 'border-green-500'
        : 'border-gray-200 hover:border-gray-300'
    }`}>
      {/* Featured Badge */}
      {plan.is_featured && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="px-4 py-1 bg-blue-600 text-white text-sm font-medium rounded-full shadow-lg">
            Most Popular
          </div>
        </div>
      )}

      {/* Current Badge */}
      {isCurrent && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="px-4 py-1 bg-green-600 text-white text-sm font-medium rounded-full shadow-lg">
            Current Plan
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <div className={`inline-flex p-3 rounded-full mb-3 ${
          plan.is_featured ? 'bg-blue-100' : 'bg-gray-100'
        }`}>
          <div className={plan.is_featured ? 'text-blue-600' : 'text-gray-600'}>
            {plan.tier === 'solo' && <Zap className="w-6 h-6" />}
            {plan.tier === 'tier1' && <Star className="w-6 h-6" />}
            {['tier2', 'tier3'].includes(plan.tier) && <Crown className="w-6 h-6" />}
            {plan.tier === 'enterprise' && <Building2 className="w-6 h-6" />}
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-1">
          {plan.display_name}
        </h3>
        <p className="text-sm text-gray-600">
          {plan.description}
        </p>
      </div>

      {/* Pricing */}
      <div className="text-center mb-6">
        <div className="text-3xl font-bold text-gray-900 mb-1">
          {formatPrice(plan.price_amount, plan.price_currency)}
        </div>
        <div className="text-sm text-gray-600">
          per {plan.billing_interval}
        </div>
      </div>

      {/* Seats */}
      <div className="p-3 bg-gray-50 rounded-lg mb-6 text-center">
        <div className="text-sm font-medium text-gray-900">
          {plan.max_seat_limit === null 
            ? 'Unlimited users'
            : `Up to ${plan.max_seat_limit} users`}
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-6">
        {plan.features.slice(0, 5).map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        onClick={onSelect}
        disabled={isCurrent || selecting}
        className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
          isCurrent
            ? 'bg-green-100 text-green-700 cursor-not-allowed'
            : plan.is_featured
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        } ${selecting ? 'opacity-50 cursor-wait' : ''}`}
      >
        {selecting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </span>
        ) : isCurrent ? (
          'Current Plan'
        ) : plan.price_amount === null ? (
          'Contact Sales'
        ) : (
          'Select Plan'
        )}
      </button>
    </div>
  )
}

