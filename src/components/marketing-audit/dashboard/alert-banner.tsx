/**
 * Alert Banner Component
 * 
 * Displays critical alerts and regressions at the top of the dashboard.
 */

'use client';

import { AlertTriangle, X, TrendingDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Alert } from '@/lib/marketing-audit/types';

interface AlertBannerProps {
  alerts: Alert[];
  onAcknowledge?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
}

export function AlertBanner({ alerts, onAcknowledge, onDismiss }: AlertBannerProps) {
  if (!alerts || alerts.length === 0) {
    return null;
  }
  
  const getSeverityStyles = (severity: string) => {
    const styles = {
      critical: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-900 dark:text-red-100',
        icon: 'text-red-600 dark:text-red-400',
      },
      error: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-900 dark:text-red-100',
        icon: 'text-red-600 dark:text-red-400',
      },
      warning: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-800',
        text: 'text-yellow-900 dark:text-yellow-100',
        icon: 'text-yellow-600 dark:text-yellow-400',
      },
      info: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-900 dark:text-blue-100',
        icon: 'text-blue-600 dark:text-blue-400',
      },
    };
    return styles[severity as keyof typeof styles] || styles.info;
  };
  
  const getAlertIcon = (alertType: string) => {
    if (alertType === 'regression') return TrendingDown;
    if (alertType === 'critical') return AlertTriangle;
    return Info;
  };
  
  return (
    <div className="space-y-3">
      {alerts.slice(0, 3).map((alert) => {
        const styles = getSeverityStyles(alert.severity);
        const Icon = getAlertIcon(alert.alert_type);
        
        return (
          <div
            key={alert.id}
            className={`rounded-lg border p-4 ${styles.bg} ${styles.border}`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`} />
              
              <div className="flex-1 min-w-0">
                <h4 className={`font-semibold ${styles.text} mb-1`}>
                  {alert.title}
                </h4>
                <p className={`text-sm ${styles.text} opacity-90`}>
                  {alert.description}
                </p>
                
                {alert.delta !== undefined && (
                  <div className="mt-2 text-xs font-medium">
                    <span className={styles.text}>
                      Change: {alert.delta > 0 ? '+' : ''}{alert.delta.toFixed(1)} 
                      ({alert.previous_value?.toFixed(1)} → {alert.current_value?.toFixed(1)})
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0 flex items-center gap-2">
                {onAcknowledge && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAcknowledge(alert.id)}
                    className="h-8"
                  >
                    Acknowledge
                  </Button>
                )}
                {onDismiss && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDismiss(alert.id)}
                    className="h-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
      
      {alerts.length > 3 && (
        <div className="text-center">
          <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
            View all {alerts.length} alerts
          </button>
        </div>
      )}
    </div>
  );
}

