'use client'

import { SimpleDealDialog } from '@/components/deals/simple-deal-dialog'

interface CreateDealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDealCreated: () => void
  preselectedContactId?: string
  tenantId?: string
}

export function CreateDealDialog({ 
  open, 
  onOpenChange, 
  onDealCreated, 
  preselectedContactId,
  tenantId = '550e8400-e29b-41d4-a716-446655440000'
}: CreateDealDialogProps) {
  return (
    <SimpleDealDialog
      open={open}
      onOpenChange={onOpenChange}
      onDealUpdated={onDealCreated}
      mode="create"
      preselectedContactId={preselectedContactId}
      tenantId={tenantId}
    />
  )
}