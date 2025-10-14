/**
 * EXPORT TO AUDIENCE DIALOG
 * Export selected CRM contacts to Marketing audience
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportContactsToAudience } from '@/lib/marketing/contact-sync';
import { toast } from 'sonner';
import { Loader2, Users } from 'lucide-react';

interface ExportToAudienceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactIds: string[];
  tenantId: string;
}

export function ExportToAudienceDialog({
  open,
  onOpenChange,
  contactIds,
  tenantId,
}: ExportToAudienceDialogProps) {
  const [audiences, setAudiences] = useState<any[]>([]);
  const [selectedAudienceId, setSelectedAudienceId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (open) {
      fetchAudiences();
    }
  }, [open]);

  async function fetchAudiences() {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('marketing_audiences')
      .select('id, name, description')
      .eq('tenant_id', tenantId)
      .order('name');

    if (!error && data) {
      setAudiences(data);
    }
    
    setFetching(false);
  }

  async function handleExport() {
    if (!selectedAudienceId) {
      toast.error('Please select an audience');
      return;
    }

    setLoading(true);

    try {
      const result = await exportContactsToAudience(contactIds, selectedAudienceId, tenantId);
      
      if (result.success > 0) {
        toast.success(`Exported ${result.success} contact(s) to audience`);
        onOpenChange(false);
      } else {
        toast.error('Failed to export contacts');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export contacts');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Export to Marketing Audience
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-gray-600">
            Export <strong>{contactIds.length}</strong> contact(s) to a Marketing audience.
            They will receive future campaigns sent to this audience.
          </div>

          <div className="space-y-2">
            <Label htmlFor="audience">Select Audience</Label>
            {fetching ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading audiences...
              </div>
            ) : audiences.length === 0 ? (
              <div className="text-sm text-gray-500 p-4 border border-dashed rounded-md text-center">
                No audiences found. Create one in the Marketing module first.
              </div>
            ) : (
              <Select value={selectedAudienceId} onValueChange={setSelectedAudienceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an audience..." />
                </SelectTrigger>
                <SelectContent>
                  {audiences.map((audience) => (
                    <SelectItem key={audience.id} value={audience.id}>
                      {audience.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={loading || !selectedAudienceId || audiences.length === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}




