'use client'

/**
 * Phase 2b.25.3 — CSV import dialog for the Contacts page.
 *
 * Simple two-step UX: pick a file → see the result. The server endpoint
 * (`/api/import/contacts`) parses the CSV, runs every row through
 * `ingestLead` (so contacts dedup correctly, deals land in the default
 * pipeline, attribution touchpoints get written), and returns a summary.
 *
 * Acceptable headers (any case): full_name | name OR first_name + last_name,
 * email | email_address, phone | mobile, notes.
 */

import { useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, Download, CheckCircle2, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react'
import { authFetch } from '@/lib/auth-fetch'
import { toast } from 'sonner'

interface ImportSummary {
  total: number
  succeeded: number
  new_contacts: number
  matched_contacts: number
  review_required: number
  failed: number
  rows: Array<{ row: number; ok: boolean; error?: string }>
}

interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

export function CsvImportDialog({ open, onOpenChange, onComplete }: CsvImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const reset = () => {
    setFile(null)
    setSummary(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a .csv file')
      return
    }
    setFile(f)
    setSummary(null)
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await authFetch('/api/import/contacts', { method: 'GET' })
      if (!res.ok) {
        toast.error('Could not download template')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'contacts_import_template.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[csv-import] template download failed', err)
      toast.error('Template download failed')
    }
  }

  const handleUpload = async () => {
    if (!file || uploading) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await authFetch('/api/import/contacts', {
        method: 'POST',
        body: form,
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body?.message || 'Import failed')
        return
      }
      const next = body.summary as ImportSummary
      setSummary(next)
      if (next.succeeded > 0) {
        toast.success(
          `Imported ${next.succeeded} of ${next.total} — ${next.new_contacts} new, ${next.matched_contacts} matched.`
        )
      }
      if (next.failed > 0) {
        toast.warning(`${next.failed} rows failed — see details in the dialog.`)
      }
      onComplete?.()
    } catch (err) {
      console.error('[csv-import] upload failed', err)
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Import contacts from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a .csv file with one contact per row. Each row needs at least an email or phone number.
            Existing contacts (matched by email or phone) get updated with any new fields — nothing is overwritten.
          </DialogDescription>
        </DialogHeader>

        {!summary && (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleSelect}
                className="hidden"
                id="csv-import-file"
              />
              <label
                htmlFor="csv-import-file"
                className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer font-medium"
              >
                {file ? file.name : 'Choose a CSV file'}
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Max 5,000 rows per upload. Accepts headers: full_name (or name / first_name + last_name),
                email, phone, notes.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                type="button"
              >
                <Download className="h-4 w-4 mr-2" />
                Download template
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleClose(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={!file || uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing…
                    </>
                  ) : (
                    'Import'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {summary && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-gray-900">Import complete</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>Total rows: <span className="font-semibold">{summary.total}</span></div>
                <div>Succeeded: <span className="font-semibold text-green-700">{summary.succeeded}</span></div>
                <div>New contacts: <span className="font-semibold">{summary.new_contacts}</span></div>
                <div>Matched existing: <span className="font-semibold">{summary.matched_contacts}</span></div>
                {summary.review_required > 0 && (
                  <div>Needs review: <span className="font-semibold text-amber-700">{summary.review_required}</span></div>
                )}
                {summary.failed > 0 && (
                  <div>Failed: <span className="font-semibold text-red-700">{summary.failed}</span></div>
                )}
              </div>
            </div>

            {summary.failed > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">Rows that didn't import</span>
                </div>
                <div className="text-xs max-h-40 overflow-y-auto space-y-1 font-mono">
                  {summary.rows.filter((r) => !r.ok).slice(0, 50).map((r) => (
                    <div key={r.row} className="text-amber-900">
                      Row {r.row}: {r.error ?? 'unknown error'}
                    </div>
                  ))}
                  {summary.rows.filter((r) => !r.ok).length > 50 && (
                    <div className="text-amber-700 italic">
                      … + {summary.rows.filter((r) => !r.ok).length - 50} more
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>
                Import another
              </Button>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
