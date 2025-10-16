'use client'

import { SimpleDealDialog } from '@/components/deals/simple-deal-dialog'

interface CreateDealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDealCreated: () => void
  preselectedContactId?: string
}

export function CreateDealDialog({ 
  open, 
  onOpenChange, 
  onDealCreated, 
  preselectedContactId
}: CreateDealDialogProps) {
  return (
    <SimpleDealDialog
      open={open}
      onOpenChange={onOpenChange}
      onDealUpdated={onDealCreated}
      mode="create"
      preselectedContactId={preselectedContactId}
    />
  )
}