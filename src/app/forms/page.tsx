import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { FormBuilder } from '@/components/forms/form-builder'

export default function FormsPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <FormBuilder />
        </div>
      </div>
    </DashboardLayout>
  )
}
