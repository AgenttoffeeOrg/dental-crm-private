/**
 * IF MARKETING - Conditional Rendering Component
 * Only shows children when Marketing is enabled
 */

'use client';

import { ReactNode } from 'react';
import { useMarketingEnabled } from '@/lib/marketing/feature-flags';

interface IfMarketingProps {
  children: ReactNode;
  tenantId: string | null;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

export function IfMarketing({ 
  children, 
  tenantId, 
  fallback = null,
  loadingFallback = null 
}: IfMarketingProps) {
  const { enabled, loading } = useMarketingEnabled(tenantId);

  if (loading) {
    return <>{loadingFallback}</>;
  }

  if (!enabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * UNLESS MARKETING - Inverse conditional
 * Shows children ONLY when Marketing is disabled
 */
export function UnlessMarketing({
  children,
  tenantId,
  fallback = null,
}: {
  children: ReactNode;
  tenantId: string | null;
  fallback?: ReactNode;
}) {
  const { enabled, loading } = useMarketingEnabled(tenantId);

  if (loading) return null;

  if (enabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}


