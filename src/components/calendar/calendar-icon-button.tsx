'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import { CalendarDrawer } from './calendar-drawer'

export function CalendarIconButton() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDrawerOpen(true)}
        className="relative hover:bg-gray-100"
        aria-label="Open calendar"
      >
        <Calendar className="h-5 w-5 text-gray-600" />
      </Button>

      <CalendarDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  )
}

