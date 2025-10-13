export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportToExcel(data: any[], filename: string) {
  // Would use library like xlsx in production
  exportToCSV(data, filename)
}

export function exportToPDF(data: any[], filename: string) {
  // Would use library like jsPDF in production
  console.log('PDF export', data, filename)
}

