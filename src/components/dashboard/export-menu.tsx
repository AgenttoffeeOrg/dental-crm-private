'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Download, 
  FileText, 
  Table, 
  Printer, 
  Share2,
  FileJson
} from 'lucide-react'
import { 
  exportToCSV, 
  exportToJSON, 
  exportToExcel, 
  printDashboard,
  shareDashboard,
  type ExportData
} from '@/lib/dashboard-export'
import { toast } from 'sonner'

interface ExportMenuProps {
  data: ExportData
  className?: string
}

/**
 * Export Menu Component
 * 
 * Provides multiple export options for dashboard data:
 * - CSV (universal compatibility)
 * - JSON (programmatic use)
 * - Excel (business users)
 * - Print (hard copy)
 * - Share (link copying)
 */
export function ExportMenu({ data, className = '' }: ExportMenuProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async (format: 'csv' | 'json' | 'excel' | 'print' | 'share') => {
    setExporting(true)
    
    try {
      switch (format) {
        case 'csv':
          exportToCSV(data)
          toast.success('Dashboard exported to CSV')
          break
        
        case 'json':
          exportToJSON(data)
          toast.success('Dashboard data exported to JSON')
          break
        
        case 'excel':
          exportToExcel(data)
          toast.success('Dashboard exported to Excel')
          break
        
        case 'print':
          printDashboard()
          break
        
        case 'share':
          const success = await shareDashboard(window.location.href)
          if (success) {
            toast.success('Dashboard link copied to clipboard')
          } else {
            toast.error('Failed to copy link')
          }
          break
      }
    } catch (error) {
      console.error('[Export] Error:', error)
      toast.error('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 ${className}`}
          disabled={exporting}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <Table className="h-4 w-4 mr-2" />
          Export to CSV
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleExport('json')}>
          <FileJson className="h-4 w-4 mr-2" />
          Export to JSON
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleExport('excel')}>
          <FileText className="h-4 w-4 mr-2" />
          Export to Excel
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleExport('print')}>
          <Printer className="h-4 w-4 mr-2" />
          Print Dashboard
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleExport('share')}>
          <Share2 className="h-4 w-4 mr-2" />
          Copy Share Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

