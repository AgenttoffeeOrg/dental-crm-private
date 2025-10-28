import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { FormBuilder } from '@/components/forms/form-builder'

export default function FormsPage() {
  return (
    <DashboardLayout>
      <div className="h-full">
        <FormBuilder />
      </div>
    </DashboardLayout>
  )
}
