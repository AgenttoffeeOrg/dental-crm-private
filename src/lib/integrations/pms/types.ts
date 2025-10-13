// =====================================================
// PMS INTEGRATION TYPES
// =====================================================

export type PMSProvider = 'dentrix' | 'opendental' | 'eaglesoft' | 'curve' | 'generic'

export interface PMSPatient {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  dateOfBirth?: Date
  address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
  }
  insuranceInfo?: {
    provider?: string
    policyNumber?: string
  }
  metadata?: Record<string, any>
}

export interface PMSTreatmentPlan {
  id: string
  patientId: string
  treatmentType: string
  description: string
  procedureCodes: string[] // ADA/CDT codes
  toothNumbers?: string[]
  providerName?: string
  estimatedCost: number // In cents
  proposedAt: Date
  status: 'proposed' | 'accepted' | 'declined' | 'in_progress' | 'completed'
  acceptedAt?: Date
  declinedAt?: Date
  declineReason?: string
  completedAt?: Date
  metadata?: Record<string, any>
}

export interface PMSPayment {
  id: string
  patientId: string
  treatmentPlanId?: string
  amount: number // In cents
  paymentMethod: 'cash' | 'credit_card' | 'debit_card' | 'check' | 'insurance' | 'financing' | 'other'
  paymentDate: Date
  insurancePaid?: number
  patientPaid?: number
  metadata?: Record<string, any>
}

export interface PMSAppointment {
  id: string
  patientId: string
  appointmentDate: Date
  appointmentType: string
  providerName?: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
  metadata?: Record<string, any>
}

export interface SyncResult {
  success: boolean
  recordsProcessed: number
  recordsCreated: number
  recordsUpdated: number
  recordsFailed: number
  errors: Array<{
    recordId: string
    error: string
  }>
}

export interface PMSConnectionConfig {
  provider: PMSProvider
  apiEndpoint: string
  apiKey: string
  apiSecret?: string
  webhookSecret?: string
  settings?: Record<string, any>
}

