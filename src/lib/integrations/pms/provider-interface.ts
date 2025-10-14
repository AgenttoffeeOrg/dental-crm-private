// =====================================================
// ABSTRACT PMS PROVIDER INTERFACE
// =====================================================
// All PMS providers must implement this interface
// =====================================================

import { 
  PMSPatient, 
  PMSTreatmentPlan, 
  PMSPayment, 
  PMSAppointment,
  PMSConnectionConfig,
  SyncResult 
} from './types'

export abstract class PMSProviderBase {
  protected config: PMSConnectionConfig
  protected tenantId: string

  constructor(config: PMSConnectionConfig, tenantId: string) {
    this.config = config
    this.tenantId = tenantId
  }

  // =====================================================
  // CONNECTION & AUTHENTICATION
  // =====================================================

  /**
   * Test if connection to PMS is working
   */
  abstract testConnection(): Promise<boolean>

  /**
   * Authenticate with PMS API
   * Returns access token or session ID
   */
  abstract authenticate(): Promise<string>

  // =====================================================
  // PATIENT OPERATIONS
  // =====================================================

  /**
   * Get single patient by ID
   */
  abstract getPatient(patientId: string): Promise<PMSPatient>

  /**
   * Get all patients, optionally since a date
   */
  abstract getAllPatients(since?: Date): Promise<PMSPatient[]>

  /**
   * Create new patient in PMS
   */
  abstract createPatient(patient: Partial<PMSPatient>): Promise<string>

  /**
   * Update existing patient
   */
  abstract updatePatient(patientId: string, data: Partial<PMSPatient>): Promise<void>

  /**
   * Search patients by criteria
   */
  abstract searchPatients(query: {
    email?: string
    phone?: string
    name?: string
  }): Promise<PMSPatient[]>

  // =====================================================
  // TREATMENT PLAN OPERATIONS
  // =====================================================

  /**
   * Get all treatment plans for a patient
   */
  abstract getTreatmentPlans(patientId: string): Promise<PMSTreatmentPlan[]>

  /**
   * Get single treatment plan by ID
   */
  abstract getTreatmentPlan(treatmentId: string): Promise<PMSTreatmentPlan>

  /**
   * Get all treatment plans created/updated since date
   */
  abstract getRecentTreatmentPlans(since: Date): Promise<PMSTreatmentPlan[]>

  // =====================================================
  // PAYMENT OPERATIONS
  // =====================================================

  /**
   * Get all payments for a patient
   */
  abstract getPayments(patientId: string): Promise<PMSPayment[]>

  /**
   * Get payments for a treatment plan
   */
  abstract getTreatmentPayments(treatmentId: string): Promise<PMSPayment[]>

  /**
   * Get recent payments since date
   */
  abstract getRecentPayments(since: Date): Promise<PMSPayment[]>

  // =====================================================
  // APPOINTMENT OPERATIONS
  // =====================================================

  /**
   * Get appointments for a patient
   */
  abstract getAppointments(patientId: string): Promise<PMSAppointment[]>

  /**
   * Get recent appointments since date
   */
  abstract getRecentAppointments(since: Date): Promise<PMSAppointment[]>

  /**
   * Create appointment in PMS
   */
  abstract createAppointment(appointment: Partial<PMSAppointment>): Promise<string>

  // =====================================================
  // HELPER METHODS (Common to all providers)
  // =====================================================

  /**
   * Normalize phone number format
   */
  protected normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '')
  }

  /**
   * Format patient name
   */
  protected formatPatientName(patient: PMSPatient): string {
    return `${patient.firstName} ${patient.lastName}`.trim()
  }

  /**
   * Handle API errors with retry logic
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        if (i < maxRetries - 1) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
        }
      }
    }
    
    throw lastError
  }

  /**
   * Log sync operation
   */
  protected async logSync(
    syncType: string,
    direction: 'pms_to_crm' | 'crm_to_pms',
    result: SyncResult
  ): Promise<void> {
    // Implementation will call Supabase to log
    console.log(`[PMS SYNC] ${syncType} ${direction}:`, result)
  }
}


