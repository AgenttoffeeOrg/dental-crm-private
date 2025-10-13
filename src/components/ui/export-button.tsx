'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { CSVLink } from 'react-csv'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface ExportButtonProps {
  data: any[]
  filename?: string
  title?: string
  headers?: string[]
  formats?: ('csv' | 'excel' | 'pdf')[]
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function ExportButton({
  data,
  filename = 'export',
  title = 'Export Data',
  headers,
  formats = ['csv', 'excel', 'pdf'],
  variant = 'outline',
  size = 'sm',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  // Prepare data for export
  const prepareData = () => {
    if (!data || data.length === 0) return []
    
    // Extract headers if not provided
    const dataHeaders = headers || Object.keys(data[0])
    
    // Convert data to array of arrays
    return data.map(row => 
      dataHeaders.map(header => row[header] ?? '')
    )
  }

  const exportToExcel = async () => {
    setIsExporting(true)
    try {
      const dataHeaders = headers || Object.keys(data[0])
      const exportData = prepareData()
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet([dataHeaders, ...exportData])
      
      // Create workbook
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Data')
      
      // Save file
      XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Excel export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportToPDF = async () => {
    setIsExporting(true)
    try {
      const dataHeaders = headers || Object.keys(data[0])
      const exportData = prepareData()
      
      const doc = new jsPDF()
      
      // Add title
      doc.setFontSize(16)
      doc.text(title, 14, 15)
      
      // Add date
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22)
      
      // Add table
      autoTable(doc, {
        head: [dataHeaders],
        body: exportData,
        startY: 30,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [102, 126, 234], // Blue
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
      })
      
      doc.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('PDF export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // CSV export data
  const csvData = data.map(row => {
    const csvRow: any = {}
    const dataHeaders = headers || Object.keys(data[0])
    dataHeaders.forEach(header => {
      csvRow[header] = row[header] ?? ''
    })
    return csvRow
  })

  if (data.length === 0) {
    return (
      <Button variant={variant} size={size} disabled>
        <Download className="h-4 w-4 mr-2" />
        No data to export
      </Button>
    )
  }

  if (formats.length === 1) {
    // Single format - direct button
    const format = formats[0]
    
    if (format === 'csv') {
      return (
        <CSVLink
          data={csvData}
          filename={`${filename}-${new Date().toISOString().split('T')[0]}.csv`}
          className="inline-flex"
        >
          <Button variant={variant} size={size}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CSVLink>
      )
    }
    
    if (format === 'excel') {
      return (
        <Button 
          variant={variant} 
          size={size} 
          onClick={exportToExcel}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 mr-2" />
          )}
          Export Excel
        </Button>
      )
    }
    
    if (format === 'pdf') {
      return (
        <Button 
          variant={variant} 
          size={size} 
          onClick={exportToPDF}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileText className="h-4 w-4 mr-2" />
          )}
          Export PDF
        </Button>
      )
    }
  }

  // Multiple formats - dropdown menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {formats.includes('csv') && (
          <CSVLink
            data={csvData}
            filename={`${filename}-${new Date().toISOString().split('T')[0]}.csv`}
            className="w-full"
          >
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <FileText className="h-4 w-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
          </CSVLink>
        )}
        
        {formats.includes('excel') && (
          <DropdownMenuItem onClick={exportToExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export as Excel
          </DropdownMenuItem>
        )}
        
        {formats.includes('pdf') && (
          <DropdownMenuItem onClick={exportToPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Export as PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

