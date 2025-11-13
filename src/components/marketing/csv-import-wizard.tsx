'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { 
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Users,
  ArrowRight,
  Download,
  X
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { toast } from 'sonner'

interface CSVRow {
  [key: string]: string
}

interface FieldMapping {
  csvColumn: string
  crmField: string
}

const CRM_FIELDS = [
  { value: 'first_name', label: 'First Name', required: true },
  { value: 'last_name', label: 'Last Name', required: false },
  { value: 'email', label: 'Email', required: true },
  { value: 'phone', label: 'Phone', required: false },
  { value: 'company', label: 'Company', required: false },
  { value: 'source', label: 'Source', required: false },
  { value: 'tags', label: 'Tags (comma-separated)', required: false },
  { value: 'notes', label: 'Notes', required: false },
]

function parseCSVRow(line: string, headers: string[]): CSVRow {
  const values = line.split(',').map(v => v.trim())
  const row: CSVRow = {}
  headers.forEach((header, index) => {
    row[header] = values[index] || ''
  })
  return row
}

export function CSVImportWizard({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{
    total: number
    imported: number
    duplicates: number
    errors: number
  }>({ total: 0, imported: 0, duplicates: 0, errors: 0 })

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (!uploadedFile) return

    if (!uploadedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    setFile(uploadedFile)

    // Parse CSV
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        toast.error('CSV file is empty or invalid')
        return
      }

      // Parse headers
      const headers = lines[0].split(',').map(h => h.trim())
      setCsvHeaders(headers)

      // Auto-map common fields
      const autoMappings: FieldMapping[] = headers.map(header => {
        const lowerHeader = header.toLowerCase()
        let crmField = 'skip'

        if (lowerHeader.includes('first') && lowerHeader.includes('name')) crmField = 'first_name'
        else if (lowerHeader.includes('last') && lowerHeader.includes('name')) crmField = 'last_name'
        else if (lowerHeader.includes('email')) crmField = 'email'
        else if (lowerHeader.includes('phone') || lowerHeader.includes('mobile')) crmField = 'phone'
        else if (lowerHeader.includes('company')) crmField = 'company'
        else if (lowerHeader.includes('source')) crmField = 'source'
        else if (lowerHeader.includes('tag')) crmField = 'tags'
        else if (lowerHeader.includes('note')) crmField = 'notes'

        return { csvColumn: header, crmField }
      })

      setFieldMappings(autoMappings)

      // Parse data rows
      const rows = lines.slice(1).map(line => parseCSVRow(line, headers))

      setCsvData(rows)
      setStep(2)
      toast.success(`Loaded ${rows.length} contacts from CSV`)
    }

    reader.readAsText(uploadedFile)
  }

  const updateFieldMapping = (csvColumn: string, crmField: string) => {
    setFieldMappings(fieldMappings.map(mapping =>
      mapping.csvColumn === csvColumn
        ? { ...mapping, crmField }
        : mapping
    ))
  }

  const handleImport = async () => {
    setImporting(true)
    setStep(3)

    try {
      const supabase = createClient()
      const tenantId

      let imported = 0
      let duplicates = 0
      let errors = 0

      for (const row of csvData) {
        try {
          // Map CSV row to contact object
          const contactData: any = { tenant_id: tenantId }
          
          fieldMappings.forEach(mapping => {
            if (mapping.crmField !== 'skip' && row[mapping.csvColumn]) {
              if (mapping.crmField === 'tags') {
                contactData.tags = row[mapping.csvColumn].split(',').map(t => t.trim())
              } else {
                contactData[mapping.crmField] = row[mapping.csvColumn]
              }
            }
          })

          // Check if required fields are present
          if (!contactData.email && !contactData.phone) {
            errors++
            continue
          }

          // Check for duplicates
          const { data: existing } = await supabase
            .from('contacts')
            .select('id')
            .eq('tenant_id', tenantId)
            .or(`email.eq.${contactData.email},phone.eq.${contactData.phone}`)
            .single()

          if (existing) {
            duplicates++
            continue
          }

          // Insert contact
          const { error } = await supabase
            .from('contacts')
            .insert(contactData)

          if (error) {
            errors++
          } else {
            imported++
          }
        } catch (error) {
          errors++
          console.error('[IMPORT] Error importing row:', error)
        }
      }

      setImportResults({
        total: csvData.length,
        imported,
        duplicates,
        errors
      })

      toast.success(`Import complete! ${imported} contacts imported`)
    } catch (error) {
      console.error('[IMPORT] Error:', error)
      toast.error('Import failed')
    } finally {
      setImporting(false)
      setStep(4)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress */}
      <div className="mb-6">
        <Progress value={(step / 4) * 100} className="h-2" />
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span className={step >= 1 ? 'font-semibold text-blue-600' : ''}>1. Upload</span>
          <span className={step >= 2 ? 'font-semibold text-blue-600' : ''}>2. Map Fields</span>
          <span className={step >= 3 ? 'font-semibold text-blue-600' : ''}>3. Import</span>
          <span className={step >= 4 ? 'font-semibold text-blue-600' : ''}>4. Complete</span>
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-gray-300 rounded-lg p-12 cursor-pointer hover:border-blue-400 transition-colors">
              <FileSpreadsheet className="h-16 w-16 text-gray-400" />
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 mb-1">Click to upload CSV</p>
                <p className="text-sm text-gray-600">or drag and drop</p>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Required Columns:</p>
              <p className="text-sm text-blue-800">
                Your CSV must include at least one of: <strong>email</strong> or <strong>phone</strong>
              </p>
              <p className="text-sm text-blue-800 mt-2">
                Optional columns: first_name, last_name, company, source, tags, notes
              </p>
            </div>

            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download Sample CSV Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Map Fields */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Map CSV Columns to CRM Fields
            </CardTitle>
            <p className="text-sm text-gray-600">
              Found {csvData.length} contacts. Map your CSV columns to CRM fields.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {fieldMappings.map(mapping => (
              <div key={mapping.csvColumn} className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium">{mapping.csvColumn}</Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Sample: {csvData[0]?.[mapping.csvColumn]?.slice(0, 50)}...
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <Select
                    value={mapping.crmField}
                    onValueChange={(value) => updateFieldMapping(mapping.csvColumn, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip (Don't Import)</SelectItem>
                      {CRM_FIELDS.map(field => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label} {field.required && '*'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleImport} className="flex-1">
                Import {csvData.length} Contacts
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Importing */}
      {step === 3 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Importing Contacts...</h3>
            <p className="text-gray-600">Please wait while we process your file</p>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Results */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              Import Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-blue-50 rounded-lg border border-blue-200 text-center">
                <p className="text-3xl font-bold text-blue-600">{importResults.imported}</p>
                <p className="text-sm text-gray-600 mt-1">Successfully Imported</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
                <p className="text-3xl font-bold text-gray-600">{importResults.total}</p>
                <p className="text-sm text-gray-600 mt-1">Total in File</p>
              </div>
            </div>

            {importResults.duplicates > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">
                    {importResults.duplicates} Duplicates Skipped
                  </p>
                  <p className="text-sm text-yellow-800">
                    These contacts already exist in your CRM
                  </p>
                </div>
              </div>
            )}

            {importResults.errors > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <X className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">
                    {importResults.errors} Errors
                  </p>
                  <p className="text-sm text-red-800">
                    Some rows couldn't be imported (missing required fields)
                  </p>
                </div>
              </div>
            )}

            <Button onClick={onComplete} className="w-full">
              <Users className="h-4 w-4 mr-2" />
              View Imported Contacts
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}



