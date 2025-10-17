/**
 * Billing Configuration
 * 
 * Centralized configuration for subscription plans, seat limits,
 * and billing rules. Values can be overridden by database.
 */

/**
 * Minimum seat requirements
 */
export const SeatRequirements = {
  /**
   * Minimum seats for first location/organization
   * Default: 2 (owner + 1 employee minimum)
   */
  MINIMUM_SEATS_FIRST_LOCATION: 2,
  
  /**
   * Minimum additional seats required when adding a new location
   * Ensures each location has at least 2 staff
   */
  MINIMUM_SEATS_PER_NEW_LOCATION: 2,
  
  /**
   * Default seat limit for trial/free tier
   */
  DEFAULT_TRIAL_SEATS: 2,
} as const

/**
 * Plan Tier Definitions
 * These are default values - actual plans stored in database
 */
export const PlanTiers = {
  SOLO: {
    tier: 'solo' as const,
    name: 'Solo',
    description: 'For individual practitioners',
    defaultSeats: 2,
    maxSeats: 2,
    priceMonthly: 0, // Free
    priceYearly: 0,
    features: [
      'Basic CRM features',
      'Up to 2 users',
      'Contact management',
      'Basic pipeline',
      'Email support',
    ],
  },
  
  TIER1: {
    tier: 'tier1' as const,
    name: 'Starter',
    description: 'For small practices',
    defaultSeats: 5,
    maxSeats: 5,
    priceMonthly: 4900, // £49/month in pence
    priceYearly: 49900, // £499/year (2 months free)
    features: [
      'All Solo features',
      'Up to 5 users',
      'Advanced pipeline',
      'Basic marketing',
      'Calendar integration',
      'Priority support',
    ],
  },
  
  TIER2: {
    tier: 'tier2' as const,
    name: 'Professional',
    description: 'For growing practices',
    defaultSeats: 10,
    maxSeats: 15,
    priceMonthly: 9900, // £99/month
    priceYearly: 99900, // £999/year
    features: [
      'All Starter features',
      'Up to 15 users',
      'Advanced marketing',
      'Automation workflows',
      'Custom roles',
      'API access',
      'Phone support',
    ],
  },
  
  TIER3: {
    tier: 'tier3' as const,
    name: 'Business',
    description: 'For established practices',
    defaultSeats: 20,
    maxSeats: 30,
    priceMonthly: 19900, // £199/month
    priceYearly: 199900, // £1999/year
    features: [
      'All Professional features',
      'Up to 30 users',
      'Multi-location support',
      'Advanced analytics',
      'Custom integrations',
      'Dedicated support',
      'Onboarding assistance',
    ],
  },
  
  ENTERPRISE: {
    tier: 'enterprise' as const,
    name: 'Enterprise',
    description: 'For large organizations',
    defaultSeats: 50,
    maxSeats: null, // Unlimited
    priceMonthly: null, // Custom pricing
    priceYearly: null,
    features: [
      'All Business features',
      'Unlimited users',
      'Unlimited locations',
      'White-label options',
      'Custom SLA',
      'Dedicated account manager',
      'Custom development',
    ],
  },
} as const

/**
 * Default currency settings
 */
export const CurrencyDefaults = {
  DEFAULT_CURRENCY: 'GBP',
  DEFAULT_LOCALE: 'en-GB',
  
  SUPPORTED_CURRENCIES: [
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
  ] as const,
} as const

/**
 * Billing intervals
 */
export const BillingIntervals = {
  MONTHLY: 'monthly' as const,
  YEARLY: 'yearly' as const,
} as const

/**
 * Subscription statuses
 */
export const SubscriptionStatus = {
  TRIALING: 'trialing' as const,
  ACTIVE: 'active' as const,
  PAST_DUE: 'past_due' as const,
  CANCELED: 'canceled' as const,
  INCOMPLETE: 'incomplete' as const,
} as const

/**
 * Trial period configuration
 */
export const TrialConfig = {
  /**
   * Trial period in days
   */
  TRIAL_PERIOD_DAYS: 14,
  
  /**
   * Trial includes full feature access
   */
  TRIAL_FULL_FEATURES: true,
  
  /**
   * Trial seat limit (uses plan's default seats)
   */
  TRIAL_USES_PLAN_SEATS: true,
} as const

/**
 * Seat enforcement rules
 */
export const SeatEnforcement = {
  /**
   * Block invitations when at seat limit (hard enforcement)
   */
  BLOCK_INVITE_AT_LIMIT: true,
  
  /**
   * Warn when approaching seat limit (80% threshold)
   */
  WARN_AT_PERCENTAGE: 0.8,
  
  /**
   * Grace period for over-limit (days to upgrade before blocking)
   * Set to 0 for immediate enforcement
   */
  GRACE_PERIOD_DAYS: 0,
} as const

/**
 * Get plan configuration by tier
 */
export function getPlanConfig(tier: keyof typeof PlanTiers) {
  return PlanTiers[tier]
}

/**
 * Calculate price for additional seats
 * Some plans allow adding seats beyond default (e.g., Tier2: 10 default, up to 15 max)
 */
export function calculateAdditionalSeatPrice(
  tier: keyof typeof PlanTiers,
  additionalSeats: number,
  interval: 'monthly' | 'yearly'
): number {
  const plan = PlanTiers[tier]
  
  // Free and Enterprise don't charge for additional seats
  if (tier === 'SOLO' || tier === 'ENTERPRISE') {
    return 0
  }
  
  // Calculate per-seat price (base price / default seats)
  const basePrice = interval === 'monthly' ? plan.priceMonthly : plan.priceYearly
  if (!basePrice) return 0
  
  const pricePerSeat = Math.ceil(basePrice / plan.defaultSeats)
  
  return pricePerSeat * additionalSeats
}

/**
 * Check if seats can be added to plan
 */
export function canAddSeats(
  tier: keyof typeof PlanTiers,
  currentSeats: number,
  additionalSeats: number
): { allowed: boolean; reason?: string } {
  const plan = PlanTiers[tier]
  
  // Solo tier cannot add seats
  if (tier === 'SOLO') {
    return {
      allowed: false,
      reason: 'Solo plan does not support additional users. Please upgrade to Starter.',
    }
  }
  
  // Enterprise has no limits
  if (tier === 'ENTERPRISE') {
    return { allowed: true }
  }
  
  // Check max seats
  if (plan.maxSeats && currentSeats + additionalSeats > plan.maxSeats) {
    return {
      allowed: false,
      reason: `${plan.name} plan supports up to ${plan.maxSeats} seats. Please upgrade to the next tier.`,
    }
  }
  
  return { allowed: true }
}

