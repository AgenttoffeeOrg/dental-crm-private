/**
 * =====================================================
 * TREATMENT TAGS BULK OPERATIONS
 * =====================================================
 * Version: 1.0.0
 * Date: October 19, 2025
 * Phase: 4 - Settings UI
 * =====================================================
 * 
 * PURPOSE:
 * Bulk import/export operations for treatment tags
 * 
 * FEATURES:
 * - CSV import with validation
 * - CSV export with current tags
 * - Excel-compatible format
 * - Error handling and validation
 * - Template download
 * 
 * CSV FORMAT:
 * name, keywords (semicolon-separated), category, color, icon, min_value, priority, scope, description
 * 
 * =====================================================
 */

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Download, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { invalidateRoutingCache } from '@/lib/treatment-routing'

interface TreatmentTag {
  name: string
  keywords: string[]
  category?: string
  color?: string
  icon?: string
  min_value_cents?: number
  priority?: number
  scope?: 'organization' | 'location'
  description?: string
}

interface BulkImportExportProps {
  tenantId: string
  onImportComplete: () => void
}

export function BulkImportExport({ tenantId, onImportComplete }: BulkImportExportProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importErrors, setImportErrors] = useState<string[]>([])

  const supabase = createClient()

  // =====================================================
  // EXPORT FUNCTIONS
  // =====================================================

  const exportToCSV = async () => {
    try {
      toast.info('Preparing export...')

      // Fetch all tags
      const { data: tags, error } = await supabase
        .from('treatment_tags')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name')

      if (error) throw error

      if (!tags || tags.length === 0) {
        toast.error('No tags to export')
        return
      }

      // Create CSV content
      const headers = [
        'Name',
        'Keywords (semicolon-separated)',
        'Category',
        'Color',
        'Icon',
        'Min Value (£)',
        'Priority',
        'Scope',
        'Description'
      ]

      const rows = tags.map(tag => [
        tag.name,
        tag.keywords.join(';'),
        tag.category || '',
        tag.color || '#3b82f6',
        tag.icon || '🦷',
        tag.min_value_cents ? (tag.min_value_cents / 100).toString() : '',
        tag.priority?.toString() || '50',
        tag.scope || 'organization',
        tag.description || ''
      ])

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `treatment-tags-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Exported ${tags.length} tags successfully`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export tags')
    }
  }

  const downloadTemplate = () => {
    const template = [
      ['Name', 'Keywords (semicolon-separated)', 'Category', 'Color', 'Icon', 'Min Value (£)', 'Priority', 'Scope', 'Description'],
      ['Dental Implant', 'implant;implants;dental implant', 'high_value', '#9333ea', '🦷', '5000', '80', 'organization', 'High-value implant treatment'],
      ['Invisalign', 'invisalign;clear aligners', 'orthodontics', '#3b82f6', '😁', '3000', '70', 'organization', 'Clear aligner orthodontics'],
      ['Emergency', 'emergency;urgent;pain', 'emergency', '#ef4444', '🚨', '', '100', 'organization', 'Emergency dental care']
    ]

    const csv = template.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'treatment-tags-template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('Template downloaded')
  }

  // =====================================================
  // IMPORT FUNCTIONS
  // =====================================================

  const parseCSV = (text: string): TreatmentTag[] => {
    const lines = text.split('\n').filter(line => line.trim())
    const tags: TreatmentTag[] = []
    const errors: string[] = []

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      
      // Parse CSV (handle quoted values)
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
      if (!matches || matches.length < 2) {
        errors.push(`Row ${i + 1}: Invalid format`)
        continue
      }

      const cells = matches.map(cell => cell.replace(/(^"|"$)/g, '').trim())

      const name = cells[0]
      const keywordsStr = cells[1]

      if (!name) {
        errors.push(`Row ${i + 1}: Missing name`)
        continue
      }

      if (!keywordsStr) {
        errors.push(`Row ${i + 1}: Missing keywords`)
        continue
      }

      const keywords = keywordsStr.split(';').map(k => k.trim().toLowerCase()).filter(k => k)

      if (keywords.length === 0) {
        errors.push(`Row ${i + 1}: No valid keywords`)
        continue
      }

      const tag: TreatmentTag = {
        name,
        keywords,
        category: cells[2] || 'general',
        color: cells[3] || '#3b82f6',
        icon: cells[4] || '🦷',
        min_value_cents: cells[5] ? Math.round(parseFloat(cells[5]) * 100) : undefined,
        priority: cells[6] ? parseInt(cells[6]) : 50,
        scope: (cells[7] as 'organization' | 'location') || 'organization',
        description: cells[8] || undefined
      }

      tags.push(tag)
    }

    if (errors.length > 0) {
      setImportErrors(errors)
    }

    return tags
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImporting(true)
      setImportErrors([])

      // Read file
      const text = await file.text()
      const tags = parseCSV(text)

      if (tags.length === 0) {
        toast.error('No valid tags found in file')
        return
      }

      // Import tags
      const tagsToInsert = tags.map(tag => ({
        tenant_id: tenantId,
        location_id: null,
        name: tag.name,
        keywords: tag.keywords,
        category: tag.category || 'general',
        color: tag.color || '#3b82f6',
        icon: tag.icon || '🦷',
        min_value_cents: tag.min_value_cents || null,
        priority: tag.priority || 50,
        scope: tag.scope || 'organization',
        description: tag.description || null,
        is_active: true,
        is_system_tag: false
      }))

      const { error } = await supabase
        .from('treatment_tags')
        .insert(tagsToInsert)

      if (error) throw error

      // Clear cache
      invalidateRoutingCache(tenantId)

      toast.success(`Successfully imported ${tags.length} tags`)
      setImportDialogOpen(false)
      onImportComplete()
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import tags')
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={exportToCSV}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>

        <Button
          variant="outline"
          onClick={downloadTemplate}
          className="flex-1"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Download Template
        </Button>

        <Button
          variant="outline"
          onClick={() => setImportDialogOpen(true)}
          className="flex-1"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </div>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Treatment Tags</DialogTitle>
            <DialogDescription>
              Upload a CSV file with treatment tags. Download the template to see the expected format.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {importErrors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-red-800">Import Errors:</p>
                    <ul className="list-disc list-inside text-red-700 mt-1">
                      {importErrors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="file">Select CSV File</Label>
              <input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={importing}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  cursor-pointer"
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Imported tags will be added to your existing tags. 
                Duplicate tag names will be created as separate entries.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={downloadTemplate}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

