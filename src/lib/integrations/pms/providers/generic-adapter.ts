// =====================================================
// GENERIC PMS ADAPTER (Webhook-Based)
// =====================================================
// Works with any PMS that can send webhooks
// No direct API calls - receives data via webhooks
// =====================================================

import { PMSProviderBase } from '../provider-interface'
import {
  PMSPatient,
  PMSTreatmentPlan,
  PMSPayment,
  PMSAppointment,
  SyncResult
} from '../types'

export class GenericPMSAdapter extends PMSProviderBase {
  // =====================================================
  // CONNECTION (Webhook-based, always "connected")
  // =====================================================

  async testConnection(): Promise<boolean> {
    // For generic webhook adapter, we can't test connection
    // We'll mark as connected if webhook secret is configured
    return !!this.config.webhookSecret
  }

  async authenticate(): Promise<string> {
    // No authentication needed for webhook-based integration
    return 'webhook-authenticated'
  }

  // =====================================================
  // PATIENT OPERATIONS (Receive Only)
  // =====================================================

  async getPatient(patientId: string): Promise<PMSPatient> {
    throw new Error('Generic adapter is webhook-based. Patient data comes via webhooks.')
  }

  async getAllPatients(since?: Date): Promise<PMSPatient[]> {
    throw new Error('Generic adapter is webhook-based. Use manual import or webhooks.')
  }

  async createPatient(patient: Partial<PMSPatient>): Promise<string> {
    throw new Error('Generic adapter cannot push to PMS. Use PMS-specific adapter.')
  }

  async updatePatient(patientId: string, data: Partial<PMSPatient>): Promise<void> {
    throw new Error('Generic adapter cannot push to PMS. Use PMS-specific adapter.')
  }

  async searchPatients(query: any): Promise<PMSPatient[]> {
    throw new Error('Generic adapter is webhook-based. No search capability.')
  }

  // =====================================================
  // TREATMENT PLAN OPERATIONS (Receive Only)
  // =====================================================

  async getTreatmentPlans(patientId: string): Promise<PMSTreatmentPlan[]> {
    throw new Error('Generic adapter is webhook-based. Treatment plans come via webhooks.')
  }

  async getTreatmentPlan(treatmentId: string): Promise<PMSTreatmentPlan> {
    throw new Error('Generic adapter is webhook-based. Treatment plans come via webhooks.')
  }

  async getRecentTreatmentPlans(since: Date): Promise<PMSTreatmentPlan[]> {
    throw new Error('Generic adapter is webhook-based. Treatment plans come via webhooks.')
  }

  // =====================================================
  // PAYMENT OPERATIONS (Receive Only)
  // =====================================================

  async getPayments(patientId: string): Promise<PMSPayment[]> {
    throw new Error('Generic adapter is webhook-based. Payments come via webhooks.')
  }

  async getTreatmentPayments(treatmentId: string): Promise<PMSPayment[]> {
    throw new Error('Generic adapter is webhook-based. Payments come via webhooks.')
  }

  async getRecentPayments(since: Date): Promise<PMSPayment[]> {
    throw new Error('Generic adapter is webhook-based. Payments come via webhooks.')
  }

  // =====================================================
  // APPOINTMENT OPERATIONS (Receive Only)
  // =====================================================

  async getAppointments(patientId: string): Promise<PMSAppointment[]> {
    throw new Error('Generic adapter is webhook-based. Appointments come via webhooks.')
  }

  async getRecentAppointments(since: Date): Promise<PMSAppointment[]> {
    throw new Error('Generic adapter is webhook-based. Appointments come via webhooks.')
  }

  async createAppointment(appointment: Partial<PMSAppointment>): Promise<string> {
    throw new Error('Generic adapter cannot push to PMS. Use PMS-specific adapter.')
  }

  // =====================================================
  // WEBHOOK PROCESSING (Main functionality)
  // =====================================================

  /**
   * Process incoming webhook data
   * This is the main entry point for generic adapter
   */
  async processWebhook(
    eventType: string,
    payload: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      switch (eventType) {
        case 'patient.created':
        case 'patient.updated':
          return await this.handlePatientWebhook(payload)
        
        case 'treatment_plan.proposed':
          return await this.handleTreatmentProposedWebhook(payload)
        
        case 'treatment_plan.accepted':
          return await this.handleTreatmentAcceptedWebhook(payload)
        
        case 'treatment_plan.declined':
          return await this.handleTreatmentDeclinedWebhook(payload)
        
        case 'payment.received':
          return await this.handlePaymentWebhook(payload)
        
        case 'appointment.scheduled':
        case 'appointment.completed':
          return await this.handleAppointmentWebhook(payload)
        
        default:
          return {
            success: false,
            message: `Unknown event type: ${eventType}`
          }
      }
    } catch (error) {
      return {
        success: false,
        message: `Error processing webhook: ${error}`
      }
    }
  }

  /**
   * Verify webhook signature for security
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      return true // If no secret configured, allow all (for testing)
    }

    // Use HMAC SHA256 to verify
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex')

    return signature === expectedSignature
  }

  // =====================================================
  // WEBHOOK HANDLERS (To be implemented by specific needs)
  // =====================================================

  protected async handlePatientWebhook(payload: any): Promise<{ success: boolean; message: string }> {
    // Normalize payload to PMSPatient format
    // Will be handled by sync engine
    return { success: true, message: 'Patient webhook processed' }
  }

  protected async handleTreatmentProposedWebhook(payload: any): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Treatment proposed webhook processed' }
  }

  protected async handleTreatmentAcceptedWebhook(payload: any): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Treatment accepted webhook processed' }
  }

  protected async handleTreatmentDeclinedWebhook(payload: any): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Treatment declined webhook processed' }
  }

  protected async handlePaymentWebhook(payload: any): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Payment webhook processed' }
  }

  protected async handleAppointmentWebhook(payload: any): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Appointment webhook processed' }
  }
}


