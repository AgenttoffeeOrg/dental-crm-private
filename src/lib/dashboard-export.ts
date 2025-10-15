/**
 * Dashboard Export Service
 * 
 * Provides PDF and Excel export functionality for dashboard data.
 * Allows users to download reports and share insights.
 */

import { formatCurrency } from './utils/formatters'
import { format } from 'date-fns'

export interface ExportData {
  stats: {
    totalRevenue: number
    totalDeals: number
    totalContacts: number
    activeTasks: number
    conversionRate: number
    monthlyGrowth: number
  }
  revenueData: Array<{ month: string; revenue: number; deals: number }>
  dealsByStage: Array<{ stage: string; value: number }>
  priorities: Array<{ title: string; type: string; urgency: string }>
  metadata: {
    generatedAt: Date
    generatedBy: string
    period: string
  }
}

/**
 * Export dashboard to CSV format
 * Simple, universally compatible format
 */
export function exportToCSV(data: ExportData): void {
  const lines: string[] = []
  
  // Header
  lines.push('Dental CRM - Dashboard Export')
  lines.push(`Generated: ${format(data.metadata.generatedAt, 'yyyy-MM-dd HH:mm:ss')}`)
  lines.push(`Period: ${data.metadata.period}`)
  lines.push('')

  // KPI Summary
  lines.push('KEY METRICS')
  lines.push('Metric,Value')
  lines.push(`Total Revenue,${formatCurrency(data.stats.totalRevenue)}`)
  lines.push(`Total Deals,${data.stats.totalDeals}`)
  lines.push(`Total Contacts,${data.stats.totalContacts}`)
  lines.push(`Active Tasks,${data.stats.activeTasks}`)
  lines.push(`Conversion Rate,${data.stats.conversionRate}%`)
  lines.push(`Monthly Growth,${data.stats.monthlyGrowth}%`)
  lines.push('')

  // Revenue by Month
  lines.push('REVENUE BY MONTH')
  lines.push('Month,Revenue,Deals')
  data.revenueData.forEach(item => {
    lines.push(`${item.month},${item.revenue / 100},${item.deals}`)
  })
  lines.push('')

  // Deals by Stage
  lines.push('DEALS BY STAGE')
  lines.push('Stage,Count')
  data.dealsByStage.forEach(item => {
    lines.push(`${item.stage},${item.value}`)
  })
  lines.push('')

  // Priorities
  if (data.priorities.length > 0) {
    lines.push('TOP PRIORITIES')
    lines.push('Title,Type,Urgency')
    data.priorities.forEach(item => {
      lines.push(`${item.title},${item.type},${item.urgency}`)
    })
  }

  // Create and download CSV file
  const csvContent = lines.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `dashboard-export-${format(new Date(), 'yyyy-MM-dd')}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export dashboard to JSON format
 * Complete data export for programmatic use
 */
export function exportToJSON(data: ExportData): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `dashboard-data-${format(new Date(), 'yyyy-MM-dd')}.json`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Print dashboard (browser print dialog)
 * Provides printer-friendly layout
 */
export function printDashboard(): void {
  // Add print-specific styles
  const printStyles = `
    @media print {
      body * {
        visibility: hidden;
      }
      #dashboard-print-area,
      #dashboard-print-area * {
        visibility: visible;
      }
      #dashboard-print-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      .no-print {
        display: none !important;
      }
    }
  `
  
  const styleSheet = document.createElement('style')
  styleSheet.textContent = printStyles
  document.head.appendChild(styleSheet)
  
  window.print()
  
  // Clean up
  setTimeout(() => {
    document.head.removeChild(styleSheet)
  }, 1000)
}

/**
 * Export to Excel (using CSV with .xlsx extension)
 * For true Excel format, would need xlsx library
 */
export function exportToExcel(data: ExportData): void {
  // For now, export as CSV with Excel-compatible formatting
  // To implement full Excel features, install 'xlsx' package
  exportToCSV(data)
}

/**
 * Share dashboard link (copy to clipboard)
 */
export async function shareDashboard(dashboardUrl: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(dashboardUrl)
    return true
  } catch (error) {
    console.error('[Export] Error copying to clipboard:', error)
    return false
  }
}

