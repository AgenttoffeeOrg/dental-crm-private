import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createClient();

    console.log('🧪 Testing database connectivity...');

    // Test 1: Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    console.log('Auth test:', { hasUser: !!user, authError: authError?.message });

    // Test 2: Try to query contacts table
    const { data: contacts, error: queryError } = await supabase
      .from('contacts')
      .select('id, full_name')
      .limit(5);

    console.log('Query test:', {
      contactCount: contacts?.length || 0,
      queryError: queryError?.message,
    });

    // Test 3: Try to insert a test contact. Requires an authenticated user
    // (tenant_id derived from their app_users row). We do NOT fall back to
    // the zero-UUID tenant for diagnostics because that historically polluted
    // production with cross-tenant rows that nobody could find later.
    let insertData: any = null;
    let insertError: { message?: string } | null = null;
    if (!user) {
      insertError = { message: 'no authenticated user; insert test skipped' };
    } else {
      const { data: appUser } = await supabase
        .from('app_users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      const tenantId = appUser?.tenant_id as string | undefined;
      if (!tenantId) {
        insertError = { message: 'authenticated user has no tenant_id; insert test skipped' };
      } else {
        const testData = {
          tenant_id: tenantId,
          full_name: 'Test Contact ' + Date.now(),
          primary_email: `test-${Date.now()}@example.com`,
          created_at: new Date().toISOString(),
        };
        const result = await supabase.from('contacts').insert(testData).select().single();
        insertData = result.data;
        insertError = result.error;
      }
    }

    console.log('Insert test:', {
      inserted: !!insertData,
      insertError: insertError?.message,
    });

    // Clean up test contact
    if (insertData) {
      await supabase.from('contacts').delete().eq('id', insertData.id);
    }

    return NextResponse.json({
      success: true,
      tests: {
        auth: { passed: !!user, error: authError?.message },
        query: { passed: !queryError, count: contacts?.length || 0, error: queryError?.message },
        insert: { passed: !!insertData, error: insertError?.message },
      },
    });
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
