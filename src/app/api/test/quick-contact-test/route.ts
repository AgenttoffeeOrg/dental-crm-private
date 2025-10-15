import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createClient()
    
    console.log('🧪 Testing database connectivity...')
    
    // Test 1: Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth test:', { hasUser: !!user, authError: authError?.message })
    
    // Test 2: Try to query contacts table
    const { data: contacts, error: queryError } = await supabase
      .from('contacts')
      .select('id, full_name')
      .limit(5)
    
    console.log('Query test:', { 
      contactCount: contacts?.length || 0, 
      queryError: queryError?.message 
    })
    
    // Test 3: Try to insert a test contact
    const testData = {
      tenant_id: user?.id || '00000000-0000-0000-0000-000000000000',
      full_name: 'Test Contact ' + Date.now(),
      primary_email: `test-${Date.now()}@example.com`,
      created_at: new Date().toISOString(),
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('contacts')
      .insert(testData)
      .select()
      .single()
    
    console.log('Insert test:', { 
      inserted: !!insertData, 
      insertError: insertError?.message 
    })
    
    // Clean up test contact
    if (insertData) {
      await supabase.from('contacts').delete().eq('id', insertData.id)
    }
    
    return NextResponse.json({
      success: true,
      tests: {
        auth: { passed: !!user, error: authError?.message },
        query: { passed: !queryError, count: contacts?.length || 0, error: queryError?.message },
        insert: { passed: !!insertData, error: insertError?.message }
      }
    })
    
  } catch (error: any) {
    console.error('❌ Test failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

