import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { FormBuilder } from '@/components/forms/form-builder'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

export default function FormsPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <Breadcrumbs items={[{ label: "Forms" }]} />
          <FormBuilder />
        </div>
      </div>
    </DashboardLayout>
  )
}
