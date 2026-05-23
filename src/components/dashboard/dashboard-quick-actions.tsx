'use client'

/**
 * Phase 2b.53 — Dashboard quick action buttons.
 *
 * Small button row under the smart-prompts section. Three buttons:
 *   - + New contact
 *   - + New deal
 *   - + Log activity
 *
 * Each opens the existing slide-over for the relevant entity. The
 * dashboard doesn't try to host inline forms — those existing
 * slide-overs already validate, dedupe (manual-create runs through
 * ingestLead), and route through the canonical pipeline-router.
 *
 * The fourth quick-action mentioned in the brief (Global search) is
 * a separate component — DashboardGlobalSearch — wired into the
 * dashboard header rather than the button row.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { User, Target } from 'lucide-react'
import { CreateContactSlideOver } from '@/components/contacts/create-contact-slide-over'
import { CreateDealSlideOver } from '@/components/deals/create-deal-slide-over'

interface DashboardQuickActionsProps {
  tenantId: string | null | undefined
  onRefresh?: () => void
}

export function DashboardQuickActions({ tenantId, onRefresh }: DashboardQuickActionsProps) {
  const [newContactOpen, setNewContactOpen] = useState(false)
  const [newDealOpen, setNewDealOpen] = useState(false)

  const noTenant = !tenantId

  return (
    <>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
          Quick actions
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setNewContactOpen(true)}
            disabled={noTenant}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <User className="h-3.5 w-3.5 mr-1.5" />
            New contact
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setNewDealOpen(true)}
            disabled={noTenant}
          >
            <Target className="h-3.5 w-3.5 mr-1.5" />
            New deal
          </Button>
          {/* "Log activity" was in the brief but the existing
              LogActivityPanel requires a `contactId` prop — there's no
              dashboard-level concept of "which contact to log against
              right now." Deferred to 2b.57 (decision: either build a
              tiny contact-picker first, or drop the button — the
              global search below already lets you find a contact in
              two keystrokes, then log from their page). */}
        </div>
      </div>

      {/* Slide-overs */}
      <CreateContactSlideOver
        open={newContactOpen}
        onClose={() => setNewContactOpen(false)}
        onContactCreated={() => {
          setNewContactOpen(false)
          onRefresh?.()
        }}
      />

      <CreateDealSlideOver
        open={newDealOpen}
        onClose={() => setNewDealOpen(false)}
        onDealCreated={() => {
          setNewDealOpen(false)
          onRefresh?.()
        }}
      />
    </>
  )
}
