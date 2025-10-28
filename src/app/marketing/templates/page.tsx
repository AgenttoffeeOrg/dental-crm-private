'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Plus, Layout as LayoutIcon } from 'lucide-react'
import Link from 'next/link'
import { TemplateLibrary } from '@/components/marketing/template-library'

export default function TemplatesPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-purple-50/30">
        <div className="p-8 max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <LayoutIcon className="h-8 w-8 text-purple-600" />
                Template Library
              </h1>
              <p className="text-gray-600 mt-1">Design beautiful, reusable templates for all channels</p>
            </div>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" asChild>
              <Link href="/marketing/templates/create">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Link>
            </Button>
          </div>

          <TemplateLibrary />
        </div>
      </div>
    </DashboardLayout>
  )
}
