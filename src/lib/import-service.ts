// CSV Import Service using papaparse

import Papa from 'papaparse'
import { createClient } from './supabase-client'

export interface ImportResult {
  success: number
  failed: number
  duplicates: number
  errors: Array<{ row: number; error: string }>
}

export interface ContactImportRow {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  source?: string
  status?: string
  notes?: string
}

export class ImportService {
  async parseCSV(file: File): Promise<ContactImportRow[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data as ContactImportRow[])
        },
        error: (error) => {
          reject(error)
        }
      })
    })
  }

  async importContacts(data: ContactImportRow[], tenantId: string): Promise<ImportResult> {
    const supabase = createClient()
    const result: ImportResult = {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: []
    }

    // Get existing contacts to check for duplicates
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('primary_email, primary_phone')
      .eq('tenant_id', tenantId)

    const existingEmails = new Set(existingContacts?.map(c => c.primary_email?.toLowerCase()))
    const existingPhones = new Set(existingContacts?.map(c => c.primary_phone))

    for (let i = 0; i < data.length; i++) {
      const row = data[i]

      try {
        // Validate required fields
        if (!row.first_name || !row.last_name) {
          result.errors.push({ row: i + 1, error: 'Missing first or last name' })
          result.failed++
          continue
        }

        // Check for duplicates
        const isDuplicate = 
          (row.email && existingEmails.has(row.email.toLowerCase())) ||
          (row.phone && existingPhones.has(row.phone))

        if (isDuplicate) {
          result.duplicates++
          continue
        }

        // Insert contact
        const { error } = await supabase
          .from('contacts')
          .insert({
            tenant_id: tenantId,
            first_name: row.first_name.trim(),
            last_name: row.last_name.trim(),
            primary_email: row.email?.trim() || null,
            primary_phone: row.phone?.trim() || null,
            source: row.source || 'import',
            status: row.status as any || 'lead',
            notes: row.notes || null
          })

        if (error) {
          result.errors.push({ row: i + 1, error: error.message })
          result.failed++
        } else {
          result.success++
          
          // Add to existing sets
          if (row.email) existingEmails.add(row.email.toLowerCase())
          if (row.phone) existingPhones.add(row.phone)
        }
      } catch (error: any) {
        result.errors.push({ row: i + 1, error: error.message })
        result.failed++
      }
    }

    return result
  }

  generateCSVTemplate(): string {
    return `first_name,last_name,email,phone,source,status,notes
John,Doe,john@example.com,+15551234567,website,lead,Interested in whitening
Jane,Smith,jane@example.com,+15559876543,referral,patient,Existing patient`
  }
}

export const importService = new ImportService()

