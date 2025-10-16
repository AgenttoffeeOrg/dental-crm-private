/**
 * HARDENING PHASE 2.4: Entitlement Middleware for tRPC
 * Date: October 16, 2025
 * Purpose: Enforce feature entitlements at API layer
 */

import { TRPCError } from '@trpc/server'
import type { Context } from '../trpc'

/**
 * Middleware to require one or more entitlements
 * 
 * Usage:
 * ```typescript
 * export const marketingRouter = router({
 *   campaigns: router({
 *     list: protectedProcedure
 *       .use(requireEntitlements(['marketing']))
 *       .query(async ({ ctx }) => { ... }),
 *     
 *     createWithABTesting: protectedProcedure
 *       .use(requireEntitlements(['marketing', 'marketing_ab_testing']))
 *       .mutation(async ({ ctx, input }) => { ... }),
 *   })
 * })
 * ```
 */
export const requireEntitlements = (
  featureCodes: string | string[],
  requireAll: boolean = true
) => {
  const codes = Array.isArray(featureCodes) ? featureCodes : [featureCodes]

  return async (opts: { ctx: Context; next: () => Promise<any> }) => {
    const { ctx } = opts
    const { supabase, user } = ctx

    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      })
    }

    // Check entitlements using DB function
    // This calls the SECURE check_entitlement() that uses current_tenant_id()
    for (const code of codes) {
      const { data: hasAccess, error } = await supabase.rpc('check_entitlement', {
        p_feature_code: code,
        p_require_parent: true,
      })

      if (error) {
        console.error(`[Entitlement Check] Error checking ${code}:`, error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify entitlements',
          cause: error,
        })
      }

      if (!hasAccess) {
        if (requireAll) {
          // ALL mode: Fail immediately if any required entitlement is missing
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `This feature requires the '${code}' add-on. Please upgrade your plan.`,
            cause: {
              featureCode: code,
              missingEntitlement: true,
            },
          })
        }
      } else if (!requireAll) {
        // ANY mode: Success if any entitlement is present
        return opts.next({
          ctx: {
            ...ctx,
            entitledFeatures: [code],
          },
        })
      }
    }

    // If we reach here:
    // - ALL mode: all checks passed
    // - ANY mode: no checks passed (fail)
    if (requireAll) {
      return opts.next({
        ctx: {
          ...ctx,
          entitledFeatures: codes,
        },
      })
    } else {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `This feature requires one of: ${codes.join(', ')}. Please upgrade your plan.`,
        cause: {
          featureCodes: codes,
          missingEntitlement: true,
        },
      })
    }
  }
}

/**
 * Middleware to require automations entitlement
 * For marketing automations, also requires marketing entitlement
 * 
 * Usage:
 * ```typescript
 * create: protectedProcedure
 *   .input(z.object({ category: z.enum(['deal', 'pipeline', 'task', 'marketing']) }))
 *   .use(requireAutomationEntitlement())
 *   .mutation(async ({ ctx, input }) => { ... })
 * ```
 */
export const requireAutomationEntitlement = () => {
  return async (opts: { ctx: Context; input?: any; next: () => Promise<any> }) => {
    const { ctx, input } = opts
    const { supabase, user } = ctx

    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      })
    }

    // Always require automations entitlement
    const { data: hasAutomations, error: autoError } = await supabase.rpc('check_entitlement', {
      p_feature_code: 'automations',
      p_require_parent: false,
    })

    if (autoError || !hasAutomations) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This feature requires the Automations add-on. Please upgrade your plan.',
        cause: {
          featureCode: 'automations',
          missingEntitlement: true,
        },
      })
    }

    // If this is a marketing automation, also require marketing entitlement
    const category = input?.category || input?.data?.category

    if (category === 'marketing') {
      const { data: hasMarketing, error: mktError } = await supabase.rpc('check_entitlement', {
        p_feature_code: 'marketing',
        p_require_parent: false,
      })

      if (mktError || !hasMarketing) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Marketing automations require both Automations and Marketing add-ons.',
          cause: {
            featureCodes: ['automations', 'marketing'],
            missingEntitlement: true,
          },
        })
      }
    }

    return opts.next({
      ctx: {
        ...ctx,
        entitledFeatures: category === 'marketing' ? ['automations', 'marketing'] : ['automations'],
      },
    })
  }
}

/**
 * Helper to check entitlements in route handlers (non-tRPC)
 * 
 * Usage in API routes:
 * ```typescript
 * import { checkEntitlements } from '@/server/middleware/entitlements'
 * 
 * export async function POST(request: Request) {
 *   const supabase = createClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 *   
 *   await checkEntitlements(supabase, ['marketing'], true)
 *   
 *   // Continue with logic...
 * }
 * ```
 */
export async function checkEntitlements(
  supabase: any,
  featureCodes: string[],
  requireAll: boolean = true
): Promise<void> {
  for (const code of featureCodes) {
    const { data: hasAccess, error } = await supabase.rpc('check_entitlement', {
      p_feature_code: code,
      p_require_parent: true,
    })

    if (error) {
      throw new Error(`Failed to check entitlement for ${code}: ${error.message}`)
    }

    if (!hasAccess) {
      if (requireAll) {
        throw new Error(`Missing required entitlement: ${code}`)
      }
    } else if (!requireAll) {
      // ANY mode: Success if any entitlement is present
      return
    }
  }

  // If we reach here:
  // - ALL mode: all checks passed
  // - ANY mode: no checks passed (fail)
  if (!requireAll) {
    throw new Error(`Missing one of required entitlements: ${featureCodes.join(', ')}`)
  }
}

/**
 * Helper to get all user entitlements (for UI rendering)
 * 
 * Usage:
 * ```typescript
 * const entitlements = await getUserEntitlements(supabase)
 * console.log(entitlements) // [{ feature_code: 'marketing', is_enabled: true, ... }]
 * ```
 */
export async function getUserEntitlements(supabase: any) {
  const { data, error } = await supabase.rpc('get_user_entitlements')

  if (error) {
    console.error('[Entitlements] Failed to fetch:', error)
    return []
  }

  return data || []
}

