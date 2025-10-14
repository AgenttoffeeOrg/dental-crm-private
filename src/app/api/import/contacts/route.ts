import { NextRequest, NextResponse } from 'next/server'
import { importService } from '@/lib/import-service'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const tenantId = formData.get('tenant_id') as string

    if (!file || !tenantId) {
      return NextResponse.json({ error: 'File and tenant_id required' }, { status: 400 })
    }

    // Parse CSV
    const contacts = await importService.parseCSV(file)

    // Import to database
    const result = await importService.importContacts(contacts, tenantId)

    return NextResponse.json({
      success: true,
      result,
      message: `Imported ${result.success} contacts. ${result.duplicates} duplicates skipped. ${result.failed} failed.`
    })
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  const template = importService.generateCSVTemplate()
  return new NextResponse(template, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=contacts_template.csv'
    }
  })
}


