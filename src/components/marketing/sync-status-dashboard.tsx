/**
 * MARKETING SYNC STATUS DASHBOARD
 * Shows sync health and provides manual re-sync control
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { checkSyncHealth, resyncAllContacts, type SyncStatus } from '@/lib/marketing/sync-monitor';
import { RefreshCw, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SyncStatusDashboardProps {
  tenantId: string;
}

export function SyncStatusDashboard({ tenantId }: SyncStatusDashboardProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [resyncing, setResyncing] = useState(false);

  useEffect(() => {
    checkStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [tenantId]);

  async function checkStatus() {
    const health = await checkSyncHealth(tenantId);
    setStatus(health);
    setLoading(false);
  }

  async function handleResync() {
    setResyncing(true);
    toast.info('Starting contact re-sync...');

    try {
      const result = await resyncAllContacts(tenantId);
      
      toast.success(`Re-synced ${result.synced} contacts successfully!`);
      await checkStatus(); // Refresh status
    } catch (error) {
      toast.error('Failed to re-sync contacts');
    } finally {
      setResyncing(false);
    }
  }

  if (loading || !status) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {status.healthy ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            )}
            Marketing Sync Status
          </span>
          <Badge 
            variant="outline" 
            className={status.healthy 
              ? "bg-green-50 text-green-700 border-green-200" 
              : "bg-yellow-50 text-yellow-700 border-yellow-200"
            }
          >
            {status.healthy ? 'Healthy' : 'Needs Attention'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sync Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{status.contactsInSync}</div>
            <div className="text-xs text-gray-600 mt-1">In Sync</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{status.contactsOutOfSync}</div>
            <div className="text-xs text-gray-600 mt-1">Out of Sync</div>
          </div>
        </div>

        {/* Last Sync Time */}
        {status.lastSyncAt && (
          <div className="text-sm text-gray-600 text-center">
            Last synced: {new Date(status.lastSyncAt).toLocaleString()}
          </div>
        )}

        {/* Errors */}
        {status.errors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm font-medium text-red-800 mb-1">Sync Errors:</div>
            {status.errors.map((error, idx) => (
              <div key={idx} className="text-xs text-red-600">{error}</div>
            ))}
          </div>
        )}

        {/* Manual Re-sync */}
        <Button 
          onClick={handleResync} 
          disabled={resyncing}
          className="w-full"
          variant="outline"
        >
          {resyncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Re-syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Manual Re-sync All Contacts
            </>
          )}
        </Button>

        <div className="text-xs text-gray-500 text-center">
          This will recalculate engagement scores and update all Marketing data.
        </div>
      </CardContent>
    </Card>
  );
}

